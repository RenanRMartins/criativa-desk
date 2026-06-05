import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()

// Public — no auth needed
router.get('/public/:token', async (req: Request, res: Response) => {
  const approval = await prisma.postApproval.findFirst({
    where: { publicToken: req.params.token as string, expiresAt: { gte: new Date() } },
    include: { post: { include: { media: true } }, project: { select: { name: true, logo: true } }, comments: true },
  })
  if (!approval) { res.status(404).json({ message: 'Aprovação não encontrada ou expirada' }); return }
  res.json(approval)
})

router.post('/public/:token/action', async (req: Request, res: Response) => {
  const { action, comment, authorName } = req.body
  const approval = await prisma.postApproval.findFirst({
    where: { publicToken: req.params.token as string, expiresAt: { gte: new Date() } },
  })
  if (!approval) { res.status(404).json({ message: 'Aprovação não encontrada' }); return }

  const updates: Record<string, unknown> = {}
  if (action === 'approve') updates.status = 'APPROVED'
  if (action === 'request_changes') updates.status = 'CHANGES_REQUESTED'

  const [updatedApproval] = await prisma.$transaction([
    prisma.postApproval.update({ where: { id: approval.id }, data: updates }),
    ...(comment ? [prisma.approvalComment.create({ data: { approvalId: approval.id, text: comment, authorName: authorName ?? 'Cliente', authorType: 'client' } })] : []),
  ])

  await prisma.post.update({ where: { id: approval.postId }, data: { status: action === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED' } })
  res.json(updatedApproval)
})

// Protected
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const approvals = await prisma.postApproval.findMany({
    where: { project: { members: { some: { userId: req.userId } } } },
    include: { post: { include: { media: true } }, comments: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(approvals)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const { postId, projectId, clientName } = req.body
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const existing = await prisma.postApproval.findUnique({ where: { postId } })
  if (existing) { res.json(existing); return }

  const approval = await prisma.postApproval.create({
    data: { postId, projectId, requestedBy: req.userId!, clientName, expiresAt },
  })
  await prisma.post.update({ where: { id: postId }, data: { status: 'PENDING_APPROVAL' } })
  res.status(201).json(approval)
})

export default router
