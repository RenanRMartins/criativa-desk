import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

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

// Publicar agora (mock — sem OAuth real)
router.post('/:postId/publish', async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: {
      id: req.params.postId,
      project: { members: { some: { userId: req.userId } } },
    },
  })
  if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }

  const updated = await prisma.post.update({
    where: { id: req.params.postId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      publishResults: { mock: true, message: 'Publicado via mock (SOCIAL_MOCK_MODE=true)' },
    },
  })

  await prisma.notification.create({
    data: {
      userId: req.userId!,
      type: 'scheduled',
      title: 'Post publicado!',
      message: `"${post.title}" foi publicado com sucesso.`,
    },
  })

  res.json(updated)
})

// Cancelar agendamento
router.delete('/:postId', async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: {
      id: req.params.postId,
      project: { members: { some: { userId: req.userId } } },
    },
  })
  if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }

  const updated = await prisma.post.update({
    where: { id: req.params.postId },
    data: { status: 'APPROVED', scheduledAt: null },
  })
  res.json(updated)
})

export default router
