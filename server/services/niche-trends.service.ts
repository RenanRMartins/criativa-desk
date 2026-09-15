import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../lib/prisma'
import { getGoogleTrends } from './trends.service'

const MODEL = 'claude-sonnet-5'
const MIN_VALID_TRENDS = 5
const VALID_DAYS = 7

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// uma geração por projeto de cada vez — evita gastar tokens em chamadas simultâneas
const generating = new Set<string>()
// após uma falha (sem créditos, rate limit), espera antes de tentar de novo:
// sem isso cada visita à página dispararia uma nova chamada que falha igual
const FAILURE_COOLDOWN_MS = 10 * 60_000
const failedAt = new Map<string, number>()

export function isGeneratingFor(projectId: string) {
  return generating.has(projectId)
}

// O SDK instalado (0.39) não tem structured outputs; tool use com schema
// é o jeito confiável de receber os campos já no formato do TrendItem.
const SAVE_TOOL: Anthropic.Tool = {
  name: 'salvar_tendencias',
  description: 'Registra as tendências de nicho geradas para o projeto.',
  input_schema: {
    type: 'object',
    properties: {
      tendencias: {
        type: 'array',
        minItems: 6,
        maxItems: 8,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Título curto e específico da tendência' },
            description: { type: 'string', description: 'O que é a tendência, em 1-2 frases' },
            niche: { type: 'string', description: 'O nicho do projeto ao qual a tendência pertence' },
            trendScore: { type: 'integer', minimum: 55, maximum: 100 },
            reelsIdea: { type: 'string', description: 'Ideia concreta de Reels sobre o tema' },
            carouselIdea: { type: 'string', description: 'Ideia concreta de carrossel sobre o tema' },
            storiesIdea: { type: 'string', description: 'Ideia concreta de stories sobre o tema' },
            suggestedCaption: { type: 'string', description: 'Legenda pronta, no tom de voz do projeto' },
            whyItMatters: { type: 'string', description: 'Por que vale postar sobre isso agora' },
          },
          required: [
            'title', 'description', 'niche', 'trendScore',
            'reelsIdea', 'carouselIdea', 'storiesIdea', 'suggestedCaption', 'whyItMatters',
          ],
        },
      },
    },
    required: ['tendencias'],
  },
}

type GeneratedTrend = {
  title: string
  description: string
  niche: string
  trendScore: number
  reelsIdea: string
  carouselIdea: string
  storiesIdea: string
  suggestedCaption: string
  whyItMatters: string
}

type ProjectContext = {
  name: string
  niche: string | null
  niches: string[]
  segment: string | null
  toneOfVoice: string | null
  targetAudience: string | null
  contentPillars: string[]
  brandKeywords: string[]
  forbiddenWords: string[]
  forbiddenTopics: string[]
}

function buildPrompt(project: ProjectContext, brazilTrends: string[]) {
  return `Você é a TrendDesk, a IA de tendências do CrIAtiva Desk.

PROJETO: ${project.name}
NICHO PRINCIPAL: ${project.niche ?? 'Não definido'}
NICHOS ESCOLHIDOS PARA O TRENDDESK: ${project.niches.join(', ') || 'Nenhum — use o nicho principal'}
SEGMENTO: ${project.segment ?? 'Não definido'}
PÚBLICO-ALVO: ${project.targetAudience ?? 'Não definido'}
TOM DE VOZ: ${project.toneOfVoice ?? 'Profissional e direto'}
PILARES DE CONTEÚDO: ${project.contentPillars.join(', ') || 'Não definidos'}
PALAVRAS-CHAVE DA MARCA: ${project.brandKeywords.join(', ') || 'Nenhuma'}
PALAVRAS/TÓPICOS PROIBIDOS: ${[...project.forbiddenWords, ...project.forbiddenTopics].join(', ') || 'Nenhum'}

ASSUNTOS EM ALTA NO BRASIL HOJE (use só como contexto do momento, não copie):
${brazilTrends.length ? brazilTrends.map(t => `- ${t}`).join('\n') : '- (sem dados do Google Trends agora)'}

Gere de 6 a 8 tendências de conteúdo REALMENTE do nicho deste projeto, para a social media usar nos próximos 7 dias.

Regras:
- Se há nichos escolhidos para o TrendDesk, distribua as tendências entre eles e preencha o campo "niche" com o nicho a que cada uma pertence.
- Específicas do nicho, não genéricas de marketing. Nada de "poste com consistência".
- Cada uma precisa ter ideias concretas e executáveis de Reels, carrossel e stories.
- A legenda sugerida deve já estar no tom de voz do projeto e em português brasileiro.
- trendScore: 55-100, refletindo o quão quente está o assunto agora.
- Se o nicho for saúde, use linguagem segura: sem promessa de cura e sem sensacionalismo.
- Respeite as palavras e tópicos proibidos.

Chame a ferramenta salvar_tendencias com o resultado.`
}

async function generate(project: ProjectContext): Promise<GeneratedTrend[]> {
  const brazilTrends = (await getGoogleTrends()).slice(0, 15).map(t => t.title)

  // O Sonnet 5 raciocina por padrão e esses tokens contam no max_tokens; com um
  // teto baixo a resposta é cortada antes de completar a chamada da ferramenta
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    tools: [SAVE_TOOL],
    tool_choice: { type: 'tool', name: SAVE_TOOL.name },
    messages: [{ role: 'user', content: buildPrompt(project, brazilTrends) }],
  })

  const toolUse = message.content.find(block => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`Modelo não retornou tendências (stop_reason: ${message.stop_reason})`)
  }

  return extractTrends(toolUse.input)
}

// O schema pede um array, mas o modelo nem sempre entrega exatamente isso —
// já veio como objeto indexado. Sem normalizar aqui, o .map estoura lá na frente.
function extractTrends(input: unknown): GeneratedTrend[] {
  const candidate = Array.isArray(input)
    ? input
    : input && typeof input === 'object'
      ? (input as Record<string, unknown>).tendencias
      : undefined

  if (Array.isArray(candidate)) return candidate as GeneratedTrend[]
  if (candidate && typeof candidate === 'object') return Object.values(candidate) as GeneratedTrend[]

  throw new Error(`Formato inesperado na resposta do modelo: ${JSON.stringify(input).slice(0, 200)}`)
}

// Gera em background e salva no banco. Não lança — a rota não deve falhar por isso.
export async function generateNicheTrends(projectId: string) {
  if (generating.has(projectId)) return
  generating.add(projectId)

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        name: true, niche: true, niches: true, segment: true, toneOfVoice: true,
        targetAudience: true, contentPillars: true, brandKeywords: true,
        forbiddenWords: true, forbiddenTopics: true,
      },
    })
    if (!project) return

    // campos obrigatórios no schema — item incompleto derruba o createMany inteiro
    const trends = (await generate(project)).filter(t => t?.title && t?.description)
    if (trends.length === 0) {
      failedAt.set(projectId, Date.now())
      return
    }

    const validUntil = new Date(Date.now() + VALID_DAYS * 24 * 60 * 60_000)
    await prisma.trendItem.createMany({
      data: trends.map(t => ({
        projectId,
        title: t.title,
        description: t.description,
        niche: t.niche || project.niche || 'Meu nicho',
        trendScore: typeof t.trendScore === 'number' ? t.trendScore : 70,
        source: 'CrIAtiva IA',
        reelsIdea: t.reelsIdea,
        carouselIdea: t.carouselIdea,
        storiesIdea: t.storiesIdea,
        suggestedCaption: t.suggestedCaption,
        whyItMatters: t.whyItMatters,
        validUntil,
      })),
    })
    failedAt.delete(projectId)
    console.log(`[niche-trends] ${trends.length} tendências geradas para o projeto ${projectId}`)
  } catch (err) {
    failedAt.set(projectId, Date.now())
    const message = err instanceof Error ? err.message : String(err)
    const friendly = message.includes('credit balance')
      ? 'Saldo insuficiente na conta Anthropic — adicione créditos para gerar tendências de nicho.'
      : message
    console.error(`[niche-trends] Falha ao gerar para o projeto ${projectId}:`, friendly)
  } finally {
    generating.delete(projectId)
  }
}

// Dispara a geração se o projeto está sem tendências de nicho válidas.
// Retorna true quando há geração em andamento (a rota usa isso para avisar a UI).
export async function ensureNicheTrends(projectId: string) {
  if (generating.has(projectId)) return true

  const lastFailure = failedAt.get(projectId)
  if (lastFailure && Date.now() - lastFailure < FAILURE_COOLDOWN_MS) return false

  const valid = await prisma.trendItem.count({
    where: { projectId, validUntil: { gte: new Date() } },
  })
  if (valid >= MIN_VALID_TRENDS) return false

  void generateNicheTrends(projectId)
  return true
}
