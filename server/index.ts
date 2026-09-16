import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import authRoutes from './routes/auth.routes'
import projectsRoutes from './routes/projects.routes'
import postsRoutes from './routes/posts.routes'
import approvalsRoutes from './routes/approvals.routes'
import professionalsRoutes from './routes/professionals.routes'
import copydeskRoutes from './routes/copydesk.routes'
import notificationsRoutes from './routes/notifications.routes'
import videoTasksRoutes from './routes/video-tasks.routes'
import schedulingRoutes from './routes/scheduling.routes'
import trenddeskRoutes from './routes/trenddesk.routes'
import searchdeskRoutes from './routes/searchdesk.routes'
import uploadRoutes from './routes/upload.routes'
import socialRoutes from './routes/social.routes'
import musicRoutes from './routes/music.routes'
import canvaRoutes from './routes/canva.routes'
import acessosRoutes from './routes/acessos.routes'
import { startPublishWorker } from './workers/publish.worker'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(helmet())
// FRONTEND_URL é o endereço canônico (também usado nos redirects de OAuth).
// EXTRA_CORS_ORIGINS mantém o domínio antigo funcionando durante a troca.
const allowedOrigins = [
  process.env.FRONTEND_URL ?? 'http://localhost:3000',
  ...(process.env.EXTRA_CORS_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean),
]
app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '10mb' }))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 500 })
app.use(limiter)

app.use('/api/auth', authRoutes)
app.use('/api/acessos', acessosRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/posts', postsRoutes)
app.use('/api/approvals', approvalsRoutes)
app.use('/api/professionals', professionalsRoutes)
app.use('/api/copydesk', copydeskRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/video-tasks', videoTasksRoutes)
app.use('/api/scheduling', schedulingRoutes)
app.use('/api/trenddesk', trenddeskRoutes)
app.use('/api/searchdesk', searchdeskRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/music', musicRoutes)
app.use('/api/canva', canvaRoutes)

// o commit vem do Railway: sem ele não dá para saber se um deploy já subiu,
// e "health 200" é a mesma resposta antes e depois de qualquer mudança
app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  ts: new Date().toISOString(),
  commit: process.env['RAILWAY_GIT_COMMIT_SHA']?.slice(0, 7) ?? 'local',
}))

app.listen(PORT, () => {
  console.log(`CrIAtiva Desk API running on http://localhost:${PORT}`)
  startPublishWorker()
})

export default app
