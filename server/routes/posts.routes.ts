import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId, status, format, from, to } = req.query
  const where: Record<string, unknown> = {
    project: { members: { some: { userId: req.userId } } },
  }
  if (projectId) where.projectId = projectId
  if (status) where.status = status
  if (format) where.format = format
  if (from || to) {
    where.publishDate = {}
    if (from) (where.publishDate as Record<string, unknown>).gte = new Date(from as string)
    if (to) (where.publishDate as Record<string, unknown>).lte = new Date(to as string)
  }

  const posts = await prisma.post.findMany({
    where,
    include: { media: true, approval: true, videoTasks: true },
    orderBy: { publishDate: 'asc' },
  })
  res.json(posts)
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: { id: req.params.id, project: { members: { some: { userId: req.userId } } } },
    include: { media: true, approval: { include: { comments: true } }, videoTasks: true, author: { select: { id: true, name: true, email: true } } },
  })
  if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }
  res.json(post)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    projectId: z.string(),
    title: z.string().min(1),
    format: z.string(),
    networks: z.array(z.string()).default([]),
    status: z.string().optional(),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).default([]),
    publishDate: z.string().optional(),
    theme: z.string().optional(),
    observations: z.string().optional(),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos' }); return }

  const { projectId, title, format, networks, status, caption, hashtags, publishDate, theme, observations } = body.data
  const post = await prisma.post.create({
    data: {
      projectId, title, format: format as never, networks: networks as never,
      status: (status ?? 'IDEA') as never, caption, hashtags, publishDate: publishDate ? new Date(publishDate) : undefined,
      theme, observations, authorId: req.userId!,
    },
    include: { media: true },
  })
  res.status(201).json(post)
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: { id: req.params.id, project: { members: { some: { userId: req.userId } } } },
  })
  if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }

  const updated = await prisma.post.update({ where: { id: req.params.id }, data: req.body })
  res.json(updated)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findFirst({
    where: { id: req.params.id, project: { members: { some: { userId: req.userId } } } },
  })
  if (!post) { res.status(404).json({ message: 'Post não encontrado' }); return }

  await prisma.post.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } })
  res.json({ message: 'Post cancelado' })
})

export default router
