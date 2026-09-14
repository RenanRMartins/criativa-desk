import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { isMockMode, mockOutcomes, publishToAccounts } from '../services/publish.service'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query
  const posts = await prisma.post.findMany({
    where: {
      status: { in: ['APPROVED', 'SCHEDULED'] },
      project: { members: { some: { userId: req.userId } } },
      ...(projectId ? { projectId: projectId as string } : {}),
    },
    include: { media: true, approval: true },
    orderBy: { scheduledAt: 'asc' },
  })
  res.json(posts)
})

// Publicar agora — real quando SOCIAL_MOCK_MODE=false
// Body opcional: { accountIds: string[] } — contas escolhidas para a publicação
router.post('/:postId/publish', async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: {
      id: req.params.postId as string,
      project: { members: { some: { userId: req.userId } } },
    },
    include: { media: true },
  })
  if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }

  const { accountIds } = (req.body ?? {}) as { accountIds?: string[] }
  // sem escolha explícita no modal, usa as contas definidas na criação do post
  const ids = accountIds?.length ? accountIds : post.targetAccountIds
  const accounts = ids.length
    ? await prisma.socialAccount.findMany({
        where: { id: { in: ids }, projectId: post.projectId, status: 'CONNECTED' },
        select: {
          id: true, provider: true, profileName: true,
          accessToken: true, refreshToken: true, profileId: true,
        },
      })
    : []

  const outcomes = isMockMode()
    ? mockOutcomes(accounts)
    : await publishToAccounts(
        {
          id: post.id,
          title: post.title,
          caption: post.caption,
          hashtags: post.hashtags,
          link: post.link,
          media: post.media.map(m => ({ url: m.url, type: m.type, order: m.order })),
        },
        accounts,
      )

  const published = outcomes.filter(o => o.ok)
  const failed = outcomes.filter(o => !o.ok)

  // nenhuma rede aceitou: mantém o post publicável em vez de marcar como publicado
  if (outcomes.length > 0 && published.length === 0) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'FAILED', publishResults: { mock: isMockMode(), outcomes } },
    })
    res.status(502).json({
      message: 'Nenhuma rede aceitou a publicação',
      outcomes,
    })
    return
  }

  const updated = await prisma.post.update({
    where: { id: req.params.postId as string },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      publishResults: { mock: isMockMode(), outcomes },
    },
  })

  await prisma.notification.create({
    data: {
      userId: req.userId!,
      type: 'scheduled',
      title: 'Post publicado!',
      message: [
        published.length
          ? `"${post.title}" foi publicado em ${published.map(o => o.profileName).join(', ')}.`
          : `"${post.title}" foi publicado com sucesso.`,
        failed.length ? `Falhou em: ${failed.map(o => o.profileName).join(', ')}.` : '',
      ].filter(Boolean).join(' '),
    },
  })

  res.json(updated)
})

// Cancelar agendamento
router.delete('/:postId', async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: {
      id: req.params.postId as string,
      project: { members: { some: { userId: req.userId } } },
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
