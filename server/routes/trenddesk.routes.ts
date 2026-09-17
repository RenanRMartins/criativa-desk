import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { getGoogleTrends } from '../services/trends.service'
import { ensureNicheTrends } from '../services/niche-trends.service'
import { exigirPermissao, exigirPermissaoDoPost } from '../middleware/permissao.middleware'
import { escopoDeProjeto } from '../middleware/permissao.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', exigirPermissao('trenddesk'), async (req: AuthRequest, res: Response) => {
  const { projectId, niche } = req.query

  // projeto sem tendências do próprio nicho dispara a geração por IA em background
  const generating = projectId ? await ensureNicheTrends(projectId as string) : false

  const [googleTrends, dbTrends] = await Promise.all([
    getGoogleTrends(),
    prisma.trendItem.findMany({
      where: {
        project: await escopoDeProjeto(req.userId!),
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
  res.json({
    items: [
      ...google.map(t => ({ ...t, projectId: (projectId as string) ?? '' })),
      ...dbTrends,
    ],
    generating,
  })
})

export default router
