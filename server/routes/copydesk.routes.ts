import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { streamCopyGeneration } from '../services/copydesk.service'

const router = Router()
router.use(authMiddleware)

router.post('/generate', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    projectId: z.string(),
    type: z.string(),
    context: z.string().min(1),
    postId: z.string().optional(),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos' }); return }

  const project = await prisma.project.findFirst({
    where: { id: body.data.projectId, members: { some: { userId: req.userId } } },
  })
  if (!project) { res.status(404).json({ message: 'Projeto não encontrado' }); return }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ message: 'ANTHROPIC_API_KEY não configurada' })
    return
  }

  await streamCopyGeneration(project, body.data.type, body.data.context, res)
})

export default router
