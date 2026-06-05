import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query
  const terms = await prisma.searchTerm.findMany({
    where: {
      project: { members: { some: { userId: req.userId } } },
      ...(projectId ? { projectId: projectId as string } : {}),
    },
    orderBy: [{ isFeatured: 'desc' }, { monthlySearches: 'desc' }],
    take: 50,
  })
  res.json(terms)
})

export default router
