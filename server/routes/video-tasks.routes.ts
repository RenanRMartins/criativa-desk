import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId, professionalId } = req.query
  const tasks = await prisma.videoTask.findMany({
    where: {
      ...(professionalId ? { professionalId: professionalId as string } : {}),
      professional: projectId
        ? { projectId: projectId as string }
        : { project: { members: { some: { userId: req.userId } } } },
    },
    include: { professional: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { deadline: 'asc' },
  })
  res.json(tasks)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    professionalId: z.string(),
    postId: z.string().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    recordingGuide: z.string().optional(),
    suggestedDuration: z.number().optional(),
    toneOfVoice: z.string().optional(),
    observations: z.string().optional(),
    deadline: z.string(),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos' }); return }

  const task = await prisma.videoTask.create({
    data: { ...body.data, deadline: new Date(body.data.deadline) },
    include: { professional: { select: { id: true, name: true } } },
  })
  res.status(201).json(task)
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const task = await prisma.videoTask.findFirst({
    where: {
      id: req.params.id,
      professional: { project: { members: { some: { userId: req.userId } } } },
    },
  })
  if (!task) { res.status(404).json({ message: 'Não encontrada' }); return }

  const updated = await prisma.videoTask.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(updated)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const task = await prisma.videoTask.findFirst({
    where: {
      id: req.params.id,
      professional: { project: { members: { some: { userId: req.userId } } } },
    },
  })
  if (!task) { res.status(404).json({ message: 'Não encontrada' }); return }
  await prisma.videoTask.delete({ where: { id: req.params.id } })
  res.json({ message: 'Removida' })
})

export default router
