import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { selectPublishAccounts } from '../services/publish.service'
import { publishDuePosts } from '../workers/publish.worker'
import { exigirPermissao, exigirPermissaoDoPost } from '../middleware/permissao.middleware'
import { escopoDeProjeto } from '../middleware/permissao.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query
  const posts = await prisma.post.findMany({
    where: {
      status: { in: ['APPROVED', 'SCHEDULED'] },
      project: await escopoDeProjeto(req.userId!),
      ...(projectId ? { projectId: projectId as string } : {}),
    },
    include: { media: true, approval: true },
    orderBy: { scheduledAt: 'asc' },
  })
  res.json(posts)
})

// Publicar agora — real quando SOCIAL_MOCK_MODE=false
// Body opcional: { accountIds: string[] } — contas escolhidas para a publicação
router.post('/:postId/publish', exigirPermissaoDoPost('posts.publicar'), async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: {
      id: req.params.postId as string,
      project: await escopoDeProjeto(req.userId!),
    },
    include: { media: true },
  })
  if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }

  const { accountIds } = (req.body ?? {}) as { accountIds?: string[] }
  const accounts = await selectPublishAccounts(post, accountIds)

  // marcar como PUBLISHED sem ter enviado a lugar nenhum é a pior saída possível:
  // o post some da fila e ninguém fica sabendo que nada foi ao ar
  if (accounts.length === 0) {
    res.status(422).json({
      message: post.networks.length
        ? `Nenhuma conta conectada em ${post.networks.join(', ')} neste projeto.`
        : 'O post não tem nenhuma rede selecionada.',
    })
    return
  }

  // Publicar dentro da requisição HTTP é frágil por natureza: o envio pode levar
  // minutos (vídeo do TikTok em blocos, retry do carrossel) e o proxy do Railway
  // já devolveu "upstream error" E REPETIU o pedido, rodando a publicação duas
  // vezes — se a primeira tivesse dado certo, seriam dois posts iguais na conta
  // do cliente. Então a rota só enfileira: quem publica é o worker, que já tem
  // claim atômico, backoff e notificação.
  // Recusa só quem já está na fila para agora. Post agendado para mais tarde
  // pode ser antecipado — é justamente o que o botão "publicar agora" faz.
  const claim = await prisma.post.updateMany({
    where: {
      id: post.id,
      OR: [
        { status: { not: 'SCHEDULED' } },
        { status: 'SCHEDULED', scheduledAt: { gt: new Date() } },
      ],
    },
    data: {
      status: 'SCHEDULED',
      scheduledAt: new Date(),
      ...(accountIds?.length ? { targetAccountIds: accountIds } : {}),
      publishResults: {},          // zera tentativas de uma falha anterior
    },
  })
  if (claim.count === 0) {
    res.status(409).json({ message: 'Este post já está na fila de publicação.' })
    return
  }

  // acorda o worker em vez de esperar o tick de 60s; ele é reentrante
  void publishDuePosts().catch(err => console.error('[scheduling] worker:', err))

  res.status(202).json({
    status: 'SCHEDULED',
    message: 'Publicação iniciada. O resultado aparece em instantes.',
  })
})

router.delete('/:postId', exigirPermissaoDoPost('posts.publicar'), async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: {
      id: req.params.postId as string,
      project: await escopoDeProjeto(req.userId!),
    },
  })
  if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }

  const updated = await prisma.post.update({
    where: { id: req.params.postId as string },
    data: { status: 'APPROVED', scheduledAt: null },
  })
  res.json(updated)
})

export default router
