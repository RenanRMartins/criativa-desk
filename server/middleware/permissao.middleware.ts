import type { Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { permissoesEfetivas, type Permissao } from '../lib/permissoes'
import type { AuthRequest } from './auth.middleware'

/**
 * Calcula o que a pessoa pode fazer NESTE projeto.
 *
 * O papel no sistema vem do banco, não do token: token é de longa duração, e
 * rebaixar alguém não pode depender de ela sair e entrar de novo.
 */
export async function permissoesNoProjeto(userId: string, projectId: string): Promise<Permissao[]> {
  const [usuario, membro] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.projectMember.findFirst({
      where: { projectId, userId },
      select: { role: true, extras: true, negadas: true },
    }),
  ])

  return permissoesEfetivas({
    papelNoSistema: usuario?.role,
    papelNoProjeto: membro?.role,
    extras: membro?.extras,
    negadas: membro?.negadas,
  })
}

/**
 * Barra a rota quando falta a permissão. O projeto vem do corpo, da query ou
 * do parâmetro — as rotas do sistema o passam de formas diferentes.
 */
export function exigirPermissao(permissao: Permissao) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const projectId =
      (req.body?.projectId as string) ??
      (req.query?.projectId as string) ??
      (req.params?.projectId as string) ??
      (req.params?.id as string)

    if (!projectId) { res.status(400).json({ message: 'projectId obrigatório' }); return }

    const permissoes = await permissoesNoProjeto(req.userId!, projectId)
    if (!permissoes.includes(permissao)) {
      // dizer QUAL permissão falta evita o suporte adivinhando
      res.status(403).json({
        message: `Seu acesso neste projeto não inclui "${permissao}". Peça a um administrador.`,
        permissaoFaltante: permissao,
      })
      return
    }
    next()
  }
}

/**
 * Para rotas que recebem o post e não o projeto (PATCH /posts/:id,
 * /scheduling/:postId/publish). O projeto vem do próprio post — confiar num
 * projectId enviado pelo cliente aqui deixaria escolher o projeto onde se tem
 * acesso e agir noutro.
 */
export function exigirPermissaoDoPost(permissao: Permissao) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const postId = (req.params?.postId ?? req.params?.id) as string | undefined
    if (!postId) { res.status(400).json({ message: 'post não informado' }); return }

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { projectId: true } })
    if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }

    const permissoes = await permissoesNoProjeto(req.userId!, post.projectId)
    if (!permissoes.includes(permissao)) {
      res.status(403).json({
        message: `Seu acesso neste projeto não inclui "${permissao}". Peça a um administrador.`,
        permissaoFaltante: permissao,
      })
      return
    }
    next()
  }
}

/**
 * Filtro de projetos visíveis. Dono e administrador do sistema enxergam todos:
 * uma conta de admin recém-criada não é membro de nada, e sem isto ela entraria
 * num sistema aparentemente vazio — falha silenciosa e confusa.
 */
export async function escopoDeProjeto(userId: string) {
  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (usuario?.role === 'OWNER' || usuario?.role === 'ADMIN') return {}
  return { members: { some: { userId } } }
}

/** Só quem é dono ou administrador do sistema — usado para gerir acessos. */
export async function exigirAdminDoSistema(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const usuario = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } })
  if (usuario?.role !== 'OWNER' && usuario?.role !== 'ADMIN') {
    res.status(403).json({ message: 'Apenas administradores podem gerenciar acessos.' })
    return
  }
  next()
}
