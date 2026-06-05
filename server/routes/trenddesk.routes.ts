import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId, niche } = req.query
  const trends = await prisma.trendItem.findMany({
    where: {
      project: { members: { some: { userId: req.userId } } },
      ...(projectId ? { projectId: projectId as string } : {}),
      ...(niche ? { niche: { contains: niche as string, mode: 'insensitive' } } : {}),
      validUntil: { gte: new Date() },
    },
    orderBy: { trendScore: 'desc' },
    take: 20,
  })
  res.json(trends)
})

export default router
