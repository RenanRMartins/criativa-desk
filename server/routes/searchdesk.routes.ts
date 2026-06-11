import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { getSearchSuggestions } from '../services/search.service'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId, q } = req.query as { projectId?: string; q?: string }

  const [dbTerms, project] = await Promise.all([
    prisma.searchTerm.findMany({
      where: {
        project: { members: { some: { userId: req.userId } } },
        ...(projectId ? { projectId } : {}),
        ...(q ? { term: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { monthlySearches: 'desc' }],
      take: 50,
    }),
    projectId ? prisma.project.findUnique({ where: { id: projectId }, select: { niche: true, segment: true } }) : null,
  ])

  // sem busca digitada, usa o nicho do projeto como semente das sugestões reais
  const seed = q?.trim() || project?.niche || project?.segment || ''
  const suggestions = seed ? await getSearchSuggestions(seed) : []

  const known = new Set(dbTerms.map(t => t.term.toLowerCase()))
  const now = new Date().toISOString()
  const googleTerms = suggestions
    .filter(s => !known.has(s.toLowerCase()))
    .map((term, i) => ({
      id: `gsuggest-${i}-${term.replace(/\W+/g, '-')}`,
      projectId: projectId ?? '',
      term,
      niche: seed,
      isFeatured: false,
      reelsIdea: `Reels respondendo à busca: "${term}"`,
      carouselIdea: `Carrossel educativo sobre "${term}"`,
      source: 'Google Autocomplete',
      createdAt: now,
      updatedAt: now,
    }))

  res.json([...dbTerms, ...googleTerms])
})

export default router
