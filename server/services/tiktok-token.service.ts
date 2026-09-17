import { prisma } from '../lib/prisma'

/**
 * O token de acesso do TikTok dura 24 horas.
 *
 * O callback não guardava o refresh_token e nada renovava: a conta funcionava
 * no dia da conexão e parava no seguinte, sem aviso. Apareceu primeiro nos
 * relatórios (`access_token_invalid`), mas atingia também a publicação.
 */
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'

type Conta = {
  id: string
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

/**
 * Devolve um token válido, renovando quando perto de vencer. Renova com 5
 * minutos de folga: token que expira no meio da requisição falha igual.
 */
export async function tokenTiktokValido(conta: Conta): Promise<{ token: string; erro?: string }> {
  const folga = 5 * 60_000
  const aindaVale = conta.expiresAt && conta.expiresAt.getTime() - folga > Date.now()
  if (aindaVale) return { token: conta.accessToken }

  if (!conta.refreshToken) {
    return {
      token: conta.accessToken,
      erro: 'Conta conectada antes de guardarmos o token de renovação. Desconecte e conecte o TikTok novamente.',
    }
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env['TT_KEY'] ?? '',
      client_secret: process.env['TT_SEC'] ?? '',
      grant_type: 'refresh_token',
      refresh_token: conta.refreshToken,
    }),
  })
  const texto = await res.text()
  if (!res.ok) {
    return { token: conta.accessToken, erro: `Falha ao renovar o token do TikTok (HTTP ${res.status}): ${texto.slice(0, 200)}` }
  }

  const d = JSON.parse(texto) as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!d.access_token) return { token: conta.accessToken, erro: `Renovação não devolveu token: ${texto.slice(0, 200)}` }

  await prisma.socialAccount.update({
    where: { id: conta.id },
    data: {
      accessToken: d.access_token,
      ...(d.refresh_token ? { refreshToken: d.refresh_token } : {}),
      ...(d.expires_in ? { expiresAt: new Date(Date.now() + d.expires_in * 1000) } : {}),
    },
  })
  console.log(`[tiktok] token renovado para a conta ${conta.id}`)
  return { token: d.access_token }
}
