import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { exigirPermissao } from '../middleware/permissao.middleware'
import { coletarInsights, guardarSnapshot, historico } from '../services/insights.service'

const router = Router()
router.use(authMiddleware)

/**
 * GET /api/reports?projectId=&dias=30
 *
 * Devolve o que cada rede conseguiu responder AGORA, o histórico guardado, e
 * a contagem de posts publicados pelo sistema. Rede que não pôde responder vem
 * com o motivo — a tela mostra isso em vez de um zero que parece medição.
 */
router.get('/', exigirPermissao('relatorios'), async (req: AuthRequest, res: Response) => {
  const projectId = req.query.projectId as string
  const dias = Math.min(Number(req.query.dias ?? 30) || 30, 365)

  const [contas, serie, publicados] = await Promise.all([
    coletarInsights(projectId),
    historico(projectId, dias),
    prisma.post.findMany({
      where: {
        projectId,
        status: 'PUBLISHED',
        publishedAt: { gte: new Date(Date.now() - dias * 86400000) },
      },
      select: { id: true, title: true, networks: true, publishedAt: true, format: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    }),
  ])

  // guardar é o que permite falar em crescimento depois; as APIs só dizem "agora"
  guardarSnapshot(contas).catch(err => console.error('[reports] snapshot:', err))

  const comDados = contas.filter(c => c.ok)
  res.json({
    contas,
    serie,
    publicados,
    totais: {
      seguidores: comDados.reduce((s, c) => s + (c.seguidores ?? 0), 0),
      publicacoes: comDados.reduce((s, c) => s + (c.publicacoes ?? 0), 0),
      visualizacoes: comDados.reduce((s, c) => s + (c.visualizacoes ?? 0), 0),
      publicadosPeloSistema: publicados.length,
      // quantas redes responderam de fato — a tela avisa quando é parcial
      redesComDados: comDados.length,
      redesConectadas: contas.length,
    },
  })
})

export default router
