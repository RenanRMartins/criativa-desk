import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'
import { escopoDeProjeto } from '../middleware/permissao.middleware'
import { cloudinary } from '../services/cloudinary.service'

/**
 * Biblioteca de mídia do projeto.
 *
 * O modelo MediaAsset já existia no schema — com pasta, categoria e tags — e
 * nenhuma rota jamais o usou: a Biblioteca e a galeria do DesignDesk mostravam
 * arquivos inventados no código. Isto liga o que já estava desenhado.
 */
const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const { projectId, folder, category } = req.query as Record<string, string | undefined>

  const assets = await prisma.mediaAsset.findMany({
    where: {
      project: await escopoDeProjeto(req.userId!),
      ...(projectId ? { projectId } : {}),
      ...(folder && folder !== 'todos' ? { folder } : {}),
      ...(category ? { category: category as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  // as pastas vêm do que existe, não de uma lista fixa: assim a tela reflete
  // o que a pessoa realmente criou
  const pastas = [...new Set(assets.map(a => a.folder))].sort()
  res.json({ assets, pastas })
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    projectId: z.string(),
    url: z.string().url(),
    publicId: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']).default('IMAGE'),
    category: z.enum(['LOGO', 'PHOTO', 'VIDEO', 'TEMPLATE', 'CAPTION', 'CTA', 'REFERENCE']).default('PHOTO'),
    name: z.string().min(1),
    folder: z.string().default('geral'),
    size: z.number().int().nonnegative().default(0),
    tags: z.array(z.string()).default([]),
    isTemplate: z.boolean().default(false),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos', detalhes: body.error.issues }); return }

  const asset = await prisma.mediaAsset.create({ data: { ...body.data, type: body.data.type as never, category: body.data.category as never } })
  res.status(201).json(asset)
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    folder: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.enum(['LOGO', 'PHOTO', 'VIDEO', 'TEMPLATE', 'CAPTION', 'CTA', 'REFERENCE']).optional(),
    isTemplate: z.boolean().optional(),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos', detalhes: body.error.issues }); return }

  const asset = await prisma.mediaAsset.update({
    where: { id: req.params.id as string },
    data: body.data as never,
  })
  res.json(asset)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id as string } })
  if (!asset) { res.status(404).json({ message: 'Arquivo não encontrado' }); return }

  // some do Cloudinary também: guardar arquivo órfão custa e ninguém o acha
  if (asset.publicId) {
    try {
      await cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.type === 'VIDEO' ? 'video' : 'image',
      })
    } catch (err) {
      // o registro sai mesmo assim; ficar preso por falha no Cloudinary é pior
      console.error('[media] falha ao remover do Cloudinary:', err)
    }
  }

  await prisma.mediaAsset.delete({ where: { id: asset.id } })
  res.json({ message: 'Arquivo removido' })
})

export default router
