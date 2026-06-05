import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: req.userId } }, isActive: true },
    include: { _count: { select: { posts: true, professionals: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json(projects)
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, members: { some: { userId: req.userId } } },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } }, socialAccounts: true },
  })
  if (!project) { res.status(404).json({ message: 'Projeto não encontrado' }); return }
  res.json(project)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    niche: z.string().optional(),
    segment: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos' }); return }

  const slug = body.data.slug ?? body.data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const project = await prisma.project.create({
    data: {
      ...body.data,
      slug,
      members: { create: { userId: req.userId!, role: 'OWNER' } },
    },
    include: { _count: { select: { posts: true, professionals: true } } },
  })
  res.status(201).json(project)
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const member = await prisma.projectMember.findFirst({
    where: { projectId: req.params.id, userId: req.userId, role: { in: ['OWNER', 'ADMIN'] } },
  })
  if (!member) { res.status(403).json({ message: 'Sem permissão' }); return }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(project)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const member = await prisma.projectMember.findFirst({
    where: { projectId: req.params.id, userId: req.userId, role: 'OWNER' },
  })
  if (!member) { res.status(403).json({ message: 'Sem permissão' }); return }

  await prisma.project.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ message: 'Projeto desativado' })
})

export default router
