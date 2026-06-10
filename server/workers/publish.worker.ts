import { prisma } from '../lib/prisma'

const TICK_MS = 60_000
const MAX_ATTEMPTS = 3

type PublishMeta = {
  attempts?: number
  lastError?: string
  nextAttemptAt?: string
}

type PublishAccount = {
  id: string
  provider: string
  profileName: string
}

// Ponto de integração: quando SOCIAL_MOCK_MODE for desligado, a chamada real
// às APIs das redes (YouTube, Meta, TikTok, LinkedIn) entra aqui
async function publishToNetworks(_postId: string, accounts: PublishAccount[]) {
  return {
    mock: true,
    auto: true,
    message: 'Publicado automaticamente pelo agendador (SOCIAL_MOCK_MODE=true)',
    accounts,
  }
}

async function notifyMembers(projectId: string, title: string, message: string) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  })
  if (members.length === 0) return
  await prisma.notification.createMany({
    data: members.map(m => ({ userId: m.userId, type: 'scheduled', title, message })),
  })
}

async function publishDuePosts() {
  const now = new Date()
  const due = await prisma.post.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
  })

  for (const post of due) {
    const meta = (post.publishResults ?? {}) as PublishMeta
    if (meta.nextAttemptAt && new Date(meta.nextAttemptAt) > now) continue

    try {
      const accounts = await prisma.socialAccount.findMany({
        where: { projectId: post.projectId, status: 'CONNECTED', provider: { in: post.networks } },
        select: { id: true, provider: true, profileName: true },
      })
      const results = await publishToNetworks(post.id, accounts)

      // claim atômico — se outra instância já publicou, count vem 0
      const claimed = await prisma.post.updateMany({
        where: { id: post.id, status: 'SCHEDULED' },
        data: { status: 'PUBLISHED', publishedAt: new Date(), publishResults: results },
      })
      if (claimed.count === 0) continue

      await notifyMembers(post.projectId, 'Post publicado!',
        accounts.length
          ? `"${post.title}" foi publicado automaticamente em ${accounts.map(a => a.profileName).join(', ')}.`
          : `"${post.title}" foi publicado automaticamente.`)
    } catch (err) {
      const attempts = (meta.attempts ?? 0) + 1
      const lastError = err instanceof Error ? err.message : String(err)
      console.error(`[publish.worker] Falha ao publicar post ${post.id} (tentativa ${attempts}/${MAX_ATTEMPTS}):`, lastError)

      if (attempts >= MAX_ATTEMPTS) {
        await prisma.post.update({
          where: { id: post.id },
          data: { status: 'FAILED', publishResults: { ...meta, attempts, lastError } },
        }).catch(() => {})
        await notifyMembers(post.projectId, 'Falha ao publicar',
          `"${post.title}" falhou após ${attempts} tentativas. Publique manualmente em Agendamentos.`).catch(() => {})
      } else {
        // backoff exponencial: 2, 4 minutos até esgotar as tentativas
        const nextAttemptAt = new Date(now.getTime() + 2 ** attempts * 60_000).toISOString()
        await prisma.post.update({
          where: { id: post.id },
          data: { publishResults: { ...meta, attempts, lastError, nextAttemptAt } },
        }).catch(() => {})
      }
    }
  }
}

export function startPublishWorker() {
  // tick imediato cobre posts vencidos durante restart/deploy
  publishDuePosts().catch(err => console.error('[publish.worker] tick error:', err))
  setInterval(() => {
    publishDuePosts().catch(err => console.error('[publish.worker] tick error:', err))
  }, TICK_MS)
  console.log('[publish.worker] Agendador ativo — posts agendados publicam sozinhos (verificação a cada 60s)')
}
