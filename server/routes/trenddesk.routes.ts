import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { getGoogleTrends } from '../services/trends.service'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId, niche } = req.query

  const [googleTrends, dbTrends] = await Promise.all([
    getGoogleTrends(),
    prisma.trendItem.findMany({
      where: {
        project: { members: { some: { userId: req.userId } } },
        ...(projectId ? { projectId: projectId as string } : {}),
        ...(niche ? { niche: { contains: niche as string, mode: 'insensitive' } } : {}),
        validUntil: { gte: new Date() },
      },
      orderBy: { trendScore: 'desc' },
      take: 20,
    }),
  ])

  // tendências reais do dia primeiro; itens curados do banco em seguida
  const google = niche
    ? googleTrends.filter(t =>
        t.title.toLowerCase().includes((niche as string).toLowerCase()) ||
        t.description.toLowerCase().includes((niche as string).toLowerCase()))
    : googleTrends
  res.json([
    ...google.map(t => ({ ...t, projectId: (projectId as string) ?? '' })),
    ...dbTrends,
  ])
})

export default router
