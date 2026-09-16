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
 * SMOKE_FORMAT   FEED_INSTAGRAM | STORIES_INSTAGRAM | CAROUSEL_INSTAGRAM | REELS_INSTAGRAM
 * SMOKE_IMAGE_URL usa esta URL em vez de subir imagem (isola mídia de rede)
 * SMOKE_VIDEO    caminho de um vídeo local, para exercitar Reels/vídeo
 */

import zlib from 'node:zlib'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4000'
const EMAIL = process.env.SMOKE_EMAIL ?? 'admin@criativadesk.com'
const SENHA = process.env.SMOKE_PASSWORD ?? 'admin123'
// sem isto o teste pega lista[0], que pode ser o projeto de um cliente
const PROJETO = process.env.SMOKE_PROJECT
const REDES = (process.env.SMOKE_NETWORKS ?? 'INSTAGRAM').split(',').map(s => s.trim()).filter(Boolean)
// pula o upload e usa esta URL como mídia — serve para separar "nossa imagem é
// o problema" de "a rede é o problema", trocando uma variável de cada vez
const IMAGEM_URL = process.env.SMOKE_IMAGE_URL
// cada formato segue um caminho diferente em publishInstagram(): STORIES não
// aceita legenda, CAROUSEL cria um container por item antes do container pai
const FORMATO = process.env.SMOKE_FORMAT ?? 'FEED_INSTAGRAM'
// caminho de um vídeo local; troca a mídia do teste de imagem para vídeo,
// que é outro caminho inteiro em publishInstagram (REELS, processamento assíncrono)
const VIDEO = process.env.SMOKE_VIDEO

/**
 * PNG de cor sólida no tamanho pedido, gerado aqui mesmo.
 *
 * Antes o teste subia um PNG de 1x1 e mandava o Cloudinary esticar na entrega,
 * porque o Instagram recusa imagem abaixo de 320px. Só que URL de transformação
 * é justamente o que o Instagram não busca — o teste passou a medir a
 * transformação em vez do fluxo. Gerar a imagem já no tamanho certo tira essa
 * variável, e sem carregar um blob base64 no meio do arquivo.
 */
function pngSolido(largura: number, altura: number, [r, g, b]: [number, number, number]) {
  const pixels = Buffer.alloc(largura * 3)
  for (let i = 0; i < largura; i++) pixels.set([r, g, b], i * 3)
  const linha = Buffer.concat([Buffer.from([0]), pixels])   // byte de filtro por linha
  const raw = Buffer.concat(Array.from({ length: altura }, () => linha))

  const pedaco = (tipo: string, dados: Buffer) => {
    const t = Buffer.from(tipo, 'ascii')
    const cab = Buffer.alloc(4); cab.writeUInt32BE(dados.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, dados])) >>> 0)
    return Buffer.concat([cab, t, dados, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4)
  ihdr[8] = 8; ihdr[9] = 2                                  // 8 bits por canal, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ])
}

// Stories é retrato 9:16; feed e carrossel são quadrados
const RETRATO = FORMATO.startsWith('STORIES') || FORMATO.startsWith('REELS')
const [LARGURA, ALTURA] = RETRATO ? [1080, 1920] : [1080, 1080]
// carrossel com uma imagem só cai no ramo do feed — precisa de mais de uma
// para de fato exercitar o caminho do carrossel
const QUANTIDADE = FORMATO.startsWith('CAROUSEL') ? 3 : 1
// SMOKE_UMA_COR gera as três iguais: se o carrossel continuar falhando na
// mesma posição com imagens idênticas, a causa é a posição, não a imagem
const CORES: [number, number, number][] = process.env.SMOKE_UMA_COR
  ? [[0x6B, 0x2D, 0x3E]]
  : [
      [0x6B, 0x2D, 0x3E],   // vinho
      [0xC9, 0xA9, 0x6E],   // dourado
      [0x0F, 0x0F, 0x0F],   // preto
    ]

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
  const midiasEnviadas: { url: string; publicId?: string; type: 'IMAGE' | 'VIDEO'; order: number }[] = []
  if (IMAGEM_URL) {
    midiasEnviadas.push({ url: IMAGEM_URL, type: 'IMAGE', order: 0 })
    ok('upload de mídia', 'pulado — usando SMOKE_IMAGE_URL')
  } else if (VIDEO) {
    const bytes = readFileSync(VIDEO)
    const nome = basename(VIDEO)
    const tipo = nome.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4'
    console.log(`  … enviando ${nome} (${(bytes.length / 1048576).toFixed(1)}MB), pode demorar`)
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(bytes)], { type: tipo }), nome)
    const upload = await req('/api/upload', { method: 'POST', body: form })
    if (!upload.ok) falhou('upload de vídeo', upload.corpo)
    const arq = upload.corpo as { url?: string; publicId?: string; format?: string; width?: number; height?: number }
    if (!arq.url) falhou('upload de vídeo', 'resposta sem url')
    midiasEnviadas.push({ url: arq.url, publicId: arq.publicId, type: 'VIDEO', order: 0 })
    ok('upload de vídeo', `${arq.width}x${arq.height} ${arq.format} — ${arq.url.split('/').pop()}`)

    // HEAD para não baixar o arquivo inteiro só para saber se está servindo
    const r = await fetch(arq.url, { method: 'HEAD' })
    if (!r.ok) falhou('vídeo acessível', `HTTP ${r.status} em ${arq.url}`)
    ok('vídeo acessível', `HTTP ${r.status} ${r.headers.get('content-type')} ${r.headers.get('content-length')}B`)
  } else {
    for (let i = 0; i < QUANTIDADE; i++) {
      const form = new FormData()
      const bytes = pngSolido(LARGURA, ALTURA, CORES[i % CORES.length]!)
      form.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), `smoke-${i}.png`)
      const upload = await req('/api/upload', { method: 'POST', body: form })
      if (!upload.ok) falhou('upload de mídia', upload.corpo)
      const arquivo = upload.corpo as { url?: string; publicId?: string; format?: string; width?: number; height?: number }
      if (!arquivo.url) falhou('upload de mídia', 'resposta sem url')
      // o upload converte para JPEG; se voltar png o Instagram vai recusar adiante
      if (arquivo.format !== 'jpg') {
        falhou('upload de mídia', `esperava format=jpg (Instagram só aceita JPEG), veio "${arquivo.format}"`)
      }
      midiasEnviadas.push({ url: arquivo.url, publicId: arquivo.publicId, type: 'IMAGE', order: i })
      ok(`upload ${i + 1}/${QUANTIDADE}`, `${arquivo.width}x${arquivo.height} ${arquivo.format} — ${arquivo.url.split('/').pop()}`)
    }

    // A rede social vai buscar estas URLs. Se alguma não estiver servindo agora,
    // a recusa dela adiante não diz nada sobre o nosso código.
    for (const [i, m] of midiasEnviadas.entries()) {
      const t0 = Date.now()
      const r = await fetch(m.url)
      const ms = Date.now() - t0
      if (!r.ok) falhou('mídia acessível', `imagem ${i + 1} devolveu HTTP ${r.status} em ${m.url}`)
      ok(`mídia ${i + 1} acessível`, `HTTP ${r.status} ${r.headers.get('content-type')} em ${ms}ms`)
    }
  }

  // 4. criação do post COM mídia — a rota ignorava mídia por completo
  const criar = await req('/api/posts', {
    method: 'POST',
    body: JSON.stringify({
      projectId: projeto.id,
      title: `[smoke ${FORMATO}] ${new Date().toISOString()}`,
      format: FORMATO,
      networks: REDES,
      status: 'APPROVED',
      caption: 'teste automatizado',
      hashtags: ['#smoke'],
      media: midiasEnviadas,
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
  // carrossel com 1 item cai no ramo do feed lá no publish.service e o teste
  // passaria sem exercitar carrossel nenhum
  if (midias.length !== midiasEnviadas.length) {
    falhou('mídia persistida', `esperava ${midiasEnviadas.length} PostMedia, encontrou ${midias.length}`)
  }
  const urlMidia = midiasEnviadas[0]!.url
  if (!midias.some(m => m.url === urlMidia)) {
    falhou('mídia persistida', `url divergente: ${midias.map(m => m.url).join(', ')}`)
  }
  ok('mídia persistida', `${midias.length} PostMedia`)

  // 6. publicação — a rota enfileira e devolve 202; quem publica é o worker
  const publicar = await req(`/api/scheduling/${post.id}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  if (publicar.status !== 202) falhou('enfileirar publicação', publicar.corpo)
  ok('publicação enfileirada')

  // acompanha até o post sair de SCHEDULED; o worker tem backoff de minutos,
  // então aqui esperamos só a primeira rodada
  type PostFinal = {
    status?: string
    publishResults?: {
      mock?: boolean
      lastError?: string
      outcomes?: { ok: boolean; provider: string; error?: string; externalId?: string }[]
    }
  }
  let publicado: PostFinal = {}
  // o worker repete em 20s e depois 90s; a janela precisa cobrir as três tentativas.
  // Vídeo ainda passa pelo processamento do Instagram, que leva minutos.
  const limite = Date.now() + (VIDEO ? 600_000 : 240_000)
  while (Date.now() < limite) {
    await new Promise(r => setTimeout(r, 3000))
    const atual = await req(`/api/posts/${post.id}`)
    if (!atual.ok) continue
    publicado = atual.corpo as PostFinal
    if (publicado.status && publicado.status !== 'SCHEDULED') break
    process.stdout.write('.')
  }
  process.stdout.write('\n')

  if (publicado.status === 'FAILED') {
    const o = publicado.publishResults?.outcomes?.filter(x => !x.ok) ?? []
    falhou('publicar', o.length ? o.map(x => `${x.provider}: ${x.error}`).join(' | ')
                                : publicado.publishResults?.lastError ?? 'sem motivo registrado')
  }
  if (publicado.status !== 'PUBLISHED') falhou('publicar', `status ficou ${publicado.status} após ${VIDEO ? 10 : 4} minutos`)

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
