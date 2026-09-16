import { prisma } from '../lib/prisma'
import { isMockMode, mockOutcomes, publishToAccounts, selectPublishAccounts, type PublishPost } from '../services/publish.service'

// 20s: o worker agora também atende o "publicar agora", onde alguém está
// olhando a tela. Com tick de 60s uma retentativa demorava até um minuto
// só para ser percebida.
const TICK_MS = 20_000
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

// A rota de publicar agora chama esta função direto, além do tick periódico.
// Sem a trava, os dois poderiam pegar o mesmo post ao mesmo tempo — o claim
// atômico lá embaixo evitaria a publicação dupla, mas só depois de já ter
// enviado para a rede, que é tarde demais.
let rodando = false

export async function publishDuePosts() {
  if (rodando) return
  rodando = true
  try {
    await processarPendentes()
  } finally {
    rodando = false
  }
}

async function processarPendentes() {
  const now = new Date()
  const due = await prisma.post.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    include: { media: true },
  })

  for (const post of due) {
    const meta = (post.publishResults ?? {}) as PublishMeta
    if (meta.nextAttemptAt && new Date(meta.nextAttemptAt) > now) continue

    try {
      // mesma regra da publicação manual — uma função só, para não divergirem de novo
      const accounts = await selectPublishAccounts(post)

      const payload: PublishPost = {
        id: post.id,
        title: post.title,
        format: post.format,
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
        // 20s e depois 90s. Era 2 e 4 minutos, dimensionado para post agendado;
        // para publicação imediata isso é uma eternidade, e a falha do Instagram
        // que estamos tratando é sorteio — repetir cedo resolve.
        const espera = attempts === 1 ? 20_000 : 90_000
        const nextAttemptAt = new Date(now.getTime() + espera).toISOString()
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
  console.log(`[publish.worker] Agendador ativo — verificação a cada ${TICK_MS / 1000}s`)
}
