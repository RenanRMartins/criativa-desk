import Anthropic from '@anthropic-ai/sdk'
import type { Response } from 'express'

type Project = {
  name: string; niche: string | null; segment: string | null
  toneOfVoice: string | null; copyPersonality: string | null
  forbiddenWords: string[]; forbiddenTopics: string[]
  defaultCTAs: string[]; defaultHashtags: string[]
  contentPillars: string[]; targetAudience: string | null
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(project: Project, type: string): string {
  return `Você é a CopyDesk, a IA de criação de conteúdo do CrIAtiva Desk.

PROJETO ATIVO: ${project.name}
NICHO: ${project.niche ?? 'Não definido'}
SEGMENTO: ${project.segment ?? 'Não definido'}

TOM DE VOZ: ${project.toneOfVoice ?? 'Profissional e direto'}
PERSONALIDADE: ${project.copyPersonality ?? 'Não definida'}

PALAVRAS/TÓPICOS PROIBIDOS: ${[...project.forbiddenWords, ...project.forbiddenTopics].join(', ') || 'Nenhum'}
CTAs PADRÃO: ${project.defaultCTAs.join(' | ') || 'Nenhum'}
HASHTAGS PADRÃO: ${project.defaultHashtags.join(' ') || 'Nenhuma'}
PILARES DE CONTEÚDO: ${project.contentPillars.join(', ') || 'Não definidos'}
PÚBLICO-ALVO: ${project.targetAudience ?? 'Não definido'}

Tipo de copy solicitado: ${type}

Sempre adapte o texto ao tom e restrições do projeto.
Seja criativo, humanizado e evite linguagem genérica ou de IA.
Para saúde: use linguagem segura, sem promessas de cura ou termos sensacionalistas.
Escreva sempre em português brasileiro.`
}

export async function streamCopyGeneration(
  project: Project,
  type: string,
  context: string,
  res: Response
): Promise<void> {
  const systemPrompt = buildSystemPrompt(project, type)

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: context }],
    })

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`)
    })

    await stream.finalMessage()
    res.write('data: [DONE]\n\n')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar conteúdo'
    const isCredits = message.includes('credit balance')
    const friendlyMsg = isCredits
      ? 'Saldo insuficiente na conta Anthropic. Adicione créditos em console.anthropic.com/settings/billing.'
      : message
    res.write(`data: ${JSON.stringify({ type: 'error', message: friendlyMsg })}\n\n`)
  } finally {
    res.end()
  }
}
