import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { exigirAdminDoSistema, permissoesNoProjeto } from '../middleware/permissao.middleware'
import { PERMISSOES, PADRAO_POR_PAPEL } from '../lib/permissoes'

const router = Router()
router.use(authMiddleware)

// O catálogo vive no servidor para não haver duas listas divergindo. O frontend
// consome; nunca inventa chave própria.
router.get('/catalogo', (_req: AuthRequest, res: Response) => {
  res.json({ permissoes: PERMISSOES, padraoPorPapel: PADRAO_POR_PAPEL })
})

// O que EU posso neste projeto — o frontend usa para esconder o que não serve.
// Esconder é conveniência; quem barra de verdade é o backend.
router.get('/minhas', async (req: AuthRequest, res: Response) => {
  const projectId = req.query.projectId as string
  if (!projectId) { res.json({ permissoes: [] }); return }
  const [permissoes, usuario] = await Promise.all([
    permissoesNoProjeto(req.userId!, projectId),
    prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } }),
  ])
  res.json({ permissoes, papelNoSistema: usuario?.role ?? null })
})

// ─── Gestão (só dono/administrador do sistema) ───────────────────────────────

router.get('/usuarios', exigirAdminDoSistema, async (_req: AuthRequest, res: Response) => {
  const usuarios = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, avatar: true, createdAt: true,
      projects: { select: { projectId: true, role: true, extras: true, negadas: true, project: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
  res.json(usuarios)
})

router.post('/usuarios', exigirAdminDoSistema, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6, 'A senha precisa de ao menos 6 caracteres'),
    role: z.enum(['OWNER', 'ADMIN', 'SOCIAL_MEDIA', 'DESIGNER', 'CLIENT', 'VIEWER']).default('SOCIAL_MEDIA'),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos', detalhes: body.error.issues }); return }

  const existente = await prisma.user.findUnique({ where: { email: body.data.email } })
  if (existente) { res.status(409).json({ message: 'Já existe uma conta com este e-mail.' }); return }

  const usuario = await prisma.user.create({
    data: {
      name: body.data.name,
      email: body.data.email,
      password: await bcrypt.hash(body.data.password, 10),
      role: body.data.role as never,
      onboardingCompleted: true,
    },
    select: { id: true, name: true, email: true, role: true },
  })
  res.status(201).json(usuario)
})

router.patch('/usuarios/:id', exigirAdminDoSistema, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['OWNER', 'ADMIN', 'SOCIAL_MEDIA', 'DESIGNER', 'CLIENT', 'VIEWER']).optional(),
    password: z.string().min(6).optional(),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos', detalhes: body.error.issues }); return }

  const alvo = req.params.id as string
  // rebaixar a si mesmo tranca a casa com a chave dentro
  if (alvo === req.userId && body.data.role && body.data.role !== 'OWNER' && body.data.role !== 'ADMIN') {
    res.status(400).json({ message: 'Você não pode remover o próprio acesso de administrador.' }); return
  }

  const usuario = await prisma.user.update({
    where: { id: alvo },
    data: {
      ...(body.data.name ? { name: body.data.name } : {}),
      ...(body.data.role ? { role: body.data.role as never } : {}),
      ...(body.data.password ? { password: await bcrypt.hash(body.data.password, 10) } : {}),
    },
    select: { id: true, name: true, email: true, role: true },
  })
  res.json(usuario)
})

router.delete('/usuarios/:id', exigirAdminDoSistema, async (req: AuthRequest, res: Response) => {
  const alvo = req.params.id as string
  if (alvo === req.userId) { res.status(400).json({ message: 'Você não pode apagar a própria conta.' }); return }

  const admins = await prisma.user.count({ where: { role: { in: ['OWNER', 'ADMIN'] } } })
  const vitima = await prisma.user.findUnique({ where: { id: alvo }, select: { role: true } })
  if (!vitima) { res.status(404).json({ message: 'Conta não encontrada' }); return }
  // sem esta guarda dá para apagar o último administrador e ninguém mais entra na gestão
  if ((vitima.role === 'OWNER' || vitima.role === 'ADMIN') && admins <= 1) {
    res.status(400).json({ message: 'Esta é a última conta de administrador — crie outra antes de apagar.' }); return
  }

  // O User tem seis relações. Apagar só o vínculo com projetos deixava as
  // outras cinco barrarem a exclusão por chave estrangeira, e o erro do Prisma
  // virava página HTML de 500 — que chegava na tela como "Request failed".
  try {
    const posts = await prisma.post.count({ where: { authorId: alvo } })

    await prisma.$transaction([
      // Post é conteúdo do cliente e não pode sumir junto com quem o escreveu.
      // A autoria passa para quem está apagando, que é quem responde por ele agora.
      prisma.post.updateMany({ where: { authorId: alvo }, data: { authorId: req.userId! } }),
      // o resto é rastro pessoal e vai junto
      prisma.copySession.deleteMany({ where: { userId: alvo } }),
      prisma.notification.deleteMany({ where: { userId: alvo } }),
      prisma.musicConnection.deleteMany({ where: { userId: alvo } }),
      prisma.appConnection.deleteMany({ where: { userId: alvo } }),
      prisma.projectMember.deleteMany({ where: { userId: alvo } }),
      prisma.user.delete({ where: { id: alvo } }),
    ])

    res.json({
      message: posts > 0
        ? `Conta removida. ${posts} post(s) dessa conta passaram para você.`
        : 'Conta removida.',
      postsTransferidos: posts,
    })
  } catch (err) {
    // sem isto o motivo real morria como 500 genérico
    const detalhe = err instanceof Error ? err.message : String(err)
    console.error('[acessos] falha ao apagar conta:', detalhe)
    res.status(500).json({ message: `Não foi possível apagar a conta: ${detalhe.slice(0, 300)}` })
  }
})

// ─── Acesso por projeto ──────────────────────────────────────────────────────

router.put('/projeto/:projectId/membro/:userId', exigirAdminDoSistema, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    role: z.enum(['OWNER', 'ADMIN', 'SOCIAL_MEDIA', 'DESIGNER', 'CLIENT', 'APPROVER', 'VIEWER']),
    extras: z.array(z.string()).default([]),
    negadas: z.array(z.string()).default([]),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos', detalhes: body.error.issues }); return }

  const chaves = new Set(PERMISSOES.map(p => p.chave as string))
  const invalidas = [...body.data.extras, ...body.data.negadas].filter(c => !chaves.has(c))
  if (invalidas.length) {
    res.status(400).json({ message: `Permissões desconhecidas: ${invalidas.join(', ')}` }); return
  }

  const { projectId, userId } = req.params as { projectId: string; userId: string }
  const dados = { role: body.data.role as never, extras: body.data.extras, negadas: body.data.negadas }
  const membro = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, ...dados },
    update: dados,
  })
  res.json(membro)
})

router.delete('/projeto/:projectId/membro/:userId', exigirAdminDoSistema, async (req: AuthRequest, res: Response) => {
  const { projectId, userId } = req.params as { projectId: string; userId: string }
  await prisma.projectMember.deleteMany({ where: { projectId, userId } })
  res.json({ message: 'Acesso removido deste projeto' })
})

export default router
