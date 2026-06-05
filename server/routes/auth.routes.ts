import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET ?? 'criativa-desk-secret-dev'
const JWT_EXPIRES = '7d'

function makeToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

router.post('/register', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos' }); return }

  const { name, email, password } = body.data
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) { res.status(409).json({ message: 'E-mail já cadastrado' }); return }

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hash },
    select: { id: true, name: true, email: true, role: true, plan: true, onboardingCompleted: true, createdAt: true },
  })
  const token = makeToken(user.id, user.role)
  res.status(201).json({ user, token })
})

router.post('/login', async (req: Request, res: Response) => {
  const schema = z.object({ email: z.string().email(), password: z.string() })
  const body = schema.safeParse(req.body)
  if (!body.success) { res.status(400).json({ message: 'Dados inválidos' }); return }

  const { email, password } = body.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { res.status(401).json({ message: 'Credenciais inválidas' }); return }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) { res.status(401).json({ message: 'Credenciais inválidas' }); return }

  const { password: _, ...safeUser } = user
  const token = makeToken(user.id, user.role)
  res.json({ user: safeUser, token })
})

router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const allowed = ['name', 'avatar', 'onboardingCompleted']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key]
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: updates,
    select: { id: true, name: true, email: true, role: true, plan: true, onboardingCompleted: true },
  })
  res.json(user)
})

export default router
