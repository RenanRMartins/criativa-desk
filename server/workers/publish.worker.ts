import { prisma } from '../lib/prisma'
import { isMockMode, mockOutcomes, publishToAccounts, type PublishPost } from '../services/publish.service'

const TICK_MS = 60_000
const MAX_ATTEMPTS = 3

type PublishMeta = {
  attempts?: number
  lastError?: string
  nextAttemptAt?: string
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
    include: { media: true },
  })

  for (const post of due) {
    const meta = (post.publishResults ?? {}) as PublishMeta
    if (meta.nextAttemptAt && new Date(meta.nextAttemptAt) > now) continue

    try {
      // contas escolhidas na criação do post; sem escolha, todas as conectadas das redes do post
      const accounts = await prisma.socialAccount.findMany({
        where: {
          projectId: post.projectId,
          status: 'CONNECTED',
          ...(post.targetAccountIds.length
            ? { id: { in: post.targetAccountIds } }
            : { provider: { in: post.networks } }),
        },
        select: {
          id: true, provider: true, profileName: true,
          accessToken: true, refreshToken: true, profileId: true,
        },
      })

      const payload: PublishPost = {
        id: post.id,
        title: post.title,
        caption: post.caption,
        hashtags: post.hashtags,
        link: post.link,
        media: post.media.map(m => ({ url: m.url, type: m.type, order: m.order })),
      }
      const outcomes = isMockMode()
        ? mockOutcomes(accounts)
        : await publishToAccounts(payload, accounts)

      const published = outcomes.filter(o => o.ok)
      // nenhuma rede aceitou: trata como falha para entrar no retry/backoff
      if (outcomes.length > 0 && published.length === 0) {
        throw new Error(outcomes.map(o => `${o.provider}: ${o.error}`).join(' | '))
      }

      // claim atômico — se outra instância já publicou, count vem 0
      const claimed = await prisma.post.updateMany({
        where: { id: post.id, status: 'SCHEDULED' },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishResults: { mock: isMockMode(), auto: true, outcomes },
        },
      })
      if (claimed.count === 0) continue

      const failed = outcomes.filter(o => !o.ok)
      await notifyMembers(post.projectId, 'Post publicado!',
        [
          published.length
            ? `"${post.title}" foi publicado automaticamente em ${published.map(o => o.profileName).join(', ')}.`
            : `"${post.title}" foi publicado automaticamente.`,
          failed.length ? `Falhou em: ${failed.map(o => o.profileName).join(', ')}.` : '',
        ].filter(Boolean).join(' '))
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
