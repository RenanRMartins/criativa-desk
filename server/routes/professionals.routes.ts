import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()

// Public portal — no auth
router.get('/portal/:token', async (req: Request, res: Response) => {
  const professional = await prisma.professional.findUnique({
    where: { accessToken: req.params.token },
    include: {
      videoTasks: {
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { deadline: 'asc' },
      },
    },
  })
  if (!professional) { res.status(404).json({ message: 'Link inválido' }); return }
  res.json(professional)
})

router.post('/submit-video', async (req: Request, res: Response) => {
  const { token, taskId, videoUrl, videoPublicId, note } = req.body
  const professional = await prisma.professional.findUnique({ where: { accessToken: token } })
  if (!professional) { res.status(404).json({ message: 'Link inválido' }); return }

  const task = await prisma.videoTask.update({
    where: { id: taskId, professionalId: professional.id },
    data: { videoUrl, videoPublicId, professionalNote: note, status: 'SENT' },
  })

  if (task.postId) {
    await prisma.post.update({ where: { id: task.postId }, data: { status: 'VIDEO_RECEIVED' } })
  }

  res.json(task)
})

router.post('/cant-record', async (req: Request, res: Response) => {
  const { token, taskId, reason } = req.body
  const professional = await prisma.professional.findUnique({ where: { accessToken: token } })
  if (!professional) { res.status(404).json({ message: 'Link inválido' }); return }

  const task = await prisma.videoTask.update({
    where: { id: taskId, professionalId: professional.id },
    data: { cantRecordReason: reason, status: 'CANT_RECORD' },
  })
  res.json(task)
})

// Protected routes
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query
  const professionals = await prisma.professional.findMany({
    where: projectId
      ? { projectId: projectId as string }
      : { project: { members: { some: { userId: req.userId } } } },
    include: { videoTasks: { orderBy: { deadline: 'asc' } } },
  })
  res.json(professionals)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    projectId: z.string(),
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    bio: z.string().optional(),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos' }); return }

  const professional = await prisma.professional.create({ data: body.data })
  res.status(201).json(professional)
})

export default router
