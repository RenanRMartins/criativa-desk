/**
 * Teste de fumaça do fluxo de publicação, contra um backend real.
 *
 * Cobre o encadeamento que falhou silenciosamente em 15/09/2026:
 * upload de mídia → post criado COM PostMedia → publicação → outcomes.
 *
 * ATENÇÃO: contra um backend com SOCIAL_MOCK_MODE=false isto PUBLICA DE VERDADE
 * nas contas conectadas do projeto. O post é removido do nosso banco no fim,
 * mas continua no ar na rede social — o script imprime os IDs para apagar.
 *
 * Uso:  npm run smoke              (localhost:4000)
 *       SMOKE_BASE_URL=https://... SMOKE_PROJECT=sasuke SMOKE_NETWORKS=INSTAGRAM npm run smoke
 *
 * SMOKE_PROJECT  trecho do nome do projeto (sem ele, pega o primeiro da lista)
 * SMOKE_NETWORKS redes separadas por vírgula (padrão: INSTAGRAM)
 */

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4000'
const EMAIL = process.env.SMOKE_EMAIL ?? 'admin@criativadesk.com'
const SENHA = process.env.SMOKE_PASSWORD ?? 'admin123'
// sem isto o teste pega lista[0], que pode ser o projeto de um cliente
const PROJETO = process.env.SMOKE_PROJECT
const REDES = (process.env.SMOKE_NETWORKS ?? 'INSTAGRAM').split(',').map(s => s.trim()).filter(Boolean)
// pula o upload e usa esta URL como mídia — serve para separar "nossa imagem é
// o problema" de "a rede é o problema", trocando uma variável de cada vez
const IMAGEM_URL = process.env.SMOKE_IMAGE_URL

// PNG 1x1 — evita depender de arquivo no disco
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

// O Instagram recusa imagem abaixo de 320px, então o 1x1 faria o teste falhar
// por tamanho e não por defeito nosso. O Cloudinary já está no caminho: pedimos
// a mesma imagem esticada para 1080x1080 na entrega.
function em1080(url: string) {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url
  return url.replace('/image/upload/', '/image/upload/w_1080,h_1080,c_pad,b_rgb:6B2D3E/')
}

let token = ''
let falhas = 0
const criados: string[] = []

function ok(passo: string, detalhe = '') {
  console.log(`  ✓ ${passo}${detalhe ? ` — ${detalhe}` : ''}`)
}

function falhou(passo: string, motivo: unknown): never {
  falhas++
  console.error(`  ✗ ${passo}`)
  console.error(`    ${typeof motivo === 'string' ? motivo : JSON.stringify(motivo)}`)
  throw new Error(passo)
}

// O corpo da resposta é o que diz a causa — nunca descartar
async function req(caminho: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  })
  const texto = await res.text()
  let corpo: unknown = texto
  try { corpo = JSON.parse(texto) } catch { /* mantém texto */ }
  return { status: res.status, ok: res.ok, corpo }
}

async function main() {
  console.log(`\nFluxo de publicação — ${BASE}\n`)

  // 1. autenticação
  const login = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: SENHA }),
  })
  if (!login.ok) falhou('login', login.corpo)
  token = (login.corpo as { token?: string }).token ?? ''
  if (!token) falhou('login', 'resposta sem token')
  ok('login')

  // 2. projeto onde o usuário é membro
  const projetos = await req('/api/projects')
  if (!projetos.ok) falhou('listar projetos', projetos.corpo)
  const lista = projetos.corpo as { id: string; name: string }[]
  if (lista.length === 0) falhou('listar projetos', 'usuário não é membro de nenhum projeto')
  const projeto = PROJETO
    ? lista.find(p => p.name.toLowerCase().includes(PROJETO.toLowerCase()))
    : lista[0]
  if (!projeto) {
    falhou('escolher projeto', `SMOKE_PROJECT="${PROJETO}" não bateu com nenhum de: ${lista.map(p => p.name).join(', ')}`)
  }
  ok('projeto escolhido', projeto.name)

  // Sem conta conectada o teste percorre tudo e não exercita nada — e antes
  // disso ele ainda dizia "Fluxo íntegro". Falhar aqui, antes de criar post.
  const contas = await req(`/api/social/accounts?projectId=${projeto.id}`)
  if (!contas.ok) falhou('listar contas conectadas', contas.corpo)
  const conectadas = contas.corpo as { provider: string; profileName: string }[]
  const alvo = conectadas.filter(c => REDES.includes(c.provider))
  if (alvo.length === 0) {
    falhou('contas conectadas',
      `nenhuma conta de ${REDES.join('/')} no projeto "${projeto.name}". ` +
      `Conectadas aqui: ${conectadas.length ? conectadas.map(c => `${c.provider}/${c.profileName}`).join(', ') : 'nenhuma'}. ` +
      `A conexão é por projeto — verifique se você conectou com o projeto certo ativo.`)
  }
  ok('contas conectadas', alvo.map(c => `${c.provider}/${c.profileName}`).join(', '))

  // 3. upload — foi aqui que a falta de credencial do Cloudinary passou despercebida
  let urlMidia: string
  let publicId: string | undefined
  if (IMAGEM_URL) {
    urlMidia = IMAGEM_URL
    ok('upload de mídia', `pulado — usando SMOKE_IMAGE_URL`)
  } else {
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(PNG_1X1)], { type: 'image/png' }), 'smoke.png')
    const upload = await req('/api/upload', { method: 'POST', body: form })
    if (!upload.ok) falhou('upload de mídia', upload.corpo)
    const arquivo = upload.corpo as { url?: string; publicId?: string }
    if (!arquivo.url) falhou('upload de mídia', 'resposta sem url')
    urlMidia = em1080(arquivo.url)
    publicId = arquivo.publicId
    ok('upload de mídia', urlMidia === arquivo.url ? arquivo.url.slice(0, 60) : '1080x1080 via Cloudinary')
  }

  // 4. criação do post COM mídia — a rota ignorava mídia por completo
  const criar = await req('/api/posts', {
    method: 'POST',
    body: JSON.stringify({
      projectId: projeto.id,
      title: `[smoke] ${new Date().toISOString()}`,
      format: 'FEED_INSTAGRAM',
      networks: REDES,
      status: 'APPROVED',
      caption: 'teste automatizado',
      hashtags: ['#smoke'],
      media: [{ url: urlMidia, publicId, type: 'IMAGE' }],
    }),
  })
  if (criar.status !== 201) falhou('criar post', criar.corpo)
  const post = criar.corpo as { id: string; media?: unknown[] }
  criados.push(post.id)
  ok('post criado', post.id)

  // 5. a mídia precisa ter sido PERSISTIDA, não só aceita
  const lido = await req(`/api/posts/${post.id}`)
  if (!lido.ok) falhou('reler post', lido.corpo)
  const midias = (lido.corpo as { media?: { url: string }[] }).media ?? []
  if (midias.length !== 1) {
    falhou('mídia persistida', `esperava 1 PostMedia, encontrou ${midias.length}`)
  }
  if (midias[0]!.url !== urlMidia) {
    falhou('mídia persistida', `url divergente: ${midias[0]!.url}`)
  }
  ok('mídia persistida', '1 PostMedia')

  // 6. publicação
  const publicar = await req(`/api/scheduling/${post.id}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  if (!publicar.ok) falhou('publicar', publicar.corpo)
  const publicado = publicar.corpo as {
    status?: string
    publishResults?: { mock?: boolean; outcomes?: { ok: boolean; provider: string; error?: string; externalId?: string }[] }
  }
  if (publicado.status !== 'PUBLISHED') falhou('publicar', `status ficou ${publicado.status}`)

  const resultados = publicado.publishResults
  if (!resultados) falhou('publicar', 'post publicado sem publishResults')
  const outcomes = resultados.outcomes ?? []
  const reprovados = outcomes.filter(o => !o.ok)
  if (reprovados.length > 0) {
    falhou('publicar', reprovados.map(o => `${o.provider}: ${o.error}`).join(' | '))
  }
  // publicar sem nenhum outcome não é sucesso: é o teste não ter feito nada
  if (outcomes.length === 0) {
    falhou('publicar', 'post marcado como PUBLISHED sem nenhum outcome — nada foi enviado a rede alguma')
  }
  ok('publicado', `${outcomes.length} conta(s), modo ${resultados.mock ? 'mock' : 'real'}`)

  // a limpeza remove o post do NOSSO banco; na rede social ele continua no ar
  if (!resultados.mock && outcomes.length) {
    console.log('\n  Publicações reais criadas — apagar na mão em cada rede:')
    for (const o of outcomes) console.log(`    ${o.provider}: ${o.externalId ?? '(sem id)'}`)
  }
}

async function limpar() {
  for (const id of criados) {
    const r = await req(`/api/posts/${id}`, { method: 'DELETE' })
    console.log(r.ok ? `  ✓ post de teste removido` : `  ! não removeu o post ${id}: ${JSON.stringify(r.corpo)}`)
  }
}

main()
  .then(() => console.log('\nFluxo íntegro.\n'))
  .catch(() => { falhas ||= 1 })
  .finally(async () => {
    await limpar()
    process.exit(falhas > 0 ? 1 : 0)
  })
