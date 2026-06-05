import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(notifications)
})

router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId!, read: false },
    data: { read: true },
  })
  res.json({ message: 'Todas marcadas como lidas' })
})

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  })
  if (!notification) { res.status(404).json({ message: 'Não encontrado' }); return }
  const updated = await prisma.notification.update({
    where: { id: req.params.id as string },
    data: { read: true },
  })
  res.json(updated)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  })
  if (!notification) { res.status(404).json({ message: 'Não encontrado' }); return }
  await prisma.notification.delete({ where: { id: req.params.id as string } })
  res.json({ message: 'Removida' })
})

export default router
