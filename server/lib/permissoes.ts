/**
 * Controle de acesso do CrIAtiva Desk.
 *
 * Antes disto os papéis existiam no banco mas não eram consultados em lugar
 * nenhum: `req.userRole` era preenchido pelo authMiddleware e nunca lido, e
 * qualquer pessoa autenticada fazia qualquer coisa.
 *
 * O modelo é papel-como-base + ajuste fino por pessoa, sempre dentro de um
 * projeto: a mesma pessoa pode ser Social Media num cliente e não existir em
 * outro. O backend é a única fonte da verdade — o frontend consome as
 * permissões já calculadas e usa isso só para esconder o que não serve.
 */

export const PERMISSOES = [
  { chave: 'dashboard',     rotulo: 'Dashboard',      grupo: 'Visão geral' },
  { chave: 'projetos',      rotulo: 'Projetos',       grupo: 'Visão geral' },
  { chave: 'calendario',    rotulo: 'Calendário',     grupo: 'Produção' },
  { chave: 'posts.criar',   rotulo: 'Criar e editar posts', grupo: 'Produção' },
  { chave: 'posts.publicar', rotulo: 'Publicar e agendar',  grupo: 'Produção' },
  { chave: 'videos',        rotulo: 'Vídeos recebidos', grupo: 'Produção' },
  { chave: 'aprovacoes',    rotulo: 'Aprovações',     grupo: 'Produção' },
  { chave: 'biblioteca',    rotulo: 'Biblioteca',     grupo: 'Produção' },
  { chave: 'copydesk',      rotulo: 'CopyDesk (IA)',  grupo: 'Inteligência' },
  { chave: 'trenddesk',     rotulo: 'TrendDesk',      grupo: 'Inteligência' },
  { chave: 'searchdesk',    rotulo: 'SearchDesk',     grupo: 'Inteligência' },
  { chave: 'designdesk',    rotulo: 'DesignDesk',     grupo: 'Inteligência' },
  { chave: 'relatorios',    rotulo: 'Relatórios',     grupo: 'Gestão' },
  { chave: 'contas.sociais', rotulo: 'Conectar redes sociais', grupo: 'Gestão' },
  { chave: 'equipe',        rotulo: 'Gerenciar equipe e acessos', grupo: 'Gestão' },
] as const

export type Permissao = typeof PERMISSOES[number]['chave']

const TODAS = PERMISSOES.map(p => p.chave) as Permissao[]

/**
 * O que cada papel traz por padrão. É ponto de partida, não gaiola: o ajuste
 * fino por pessoa soma ou tira daqui.
 */
export const PADRAO_POR_PAPEL: Record<string, Permissao[]> = {
  OWNER: TODAS,
  ADMIN: TODAS,
  SOCIAL_MEDIA: [
    'dashboard', 'projetos', 'calendario', 'posts.criar', 'posts.publicar',
    'videos', 'aprovacoes', 'biblioteca', 'copydesk', 'trenddesk', 'searchdesk', 'designdesk',
  ],
  DESIGNER: ['dashboard', 'calendario', 'biblioteca', 'designdesk', 'videos'],
  APPROVER: ['dashboard', 'calendario', 'aprovacoes'],
  CLIENT: ['aprovacoes'],
  VIEWER: ['dashboard', 'calendario'],
}

/**
 * Permissões efetivas de alguém num projeto.
 *
 * OWNER e ADMIN do sistema (o Renan e a esposa) passam por cima de tudo: são
 * donos da ferramenta, não membros de um cliente. Sem esta porta, apagar o
 * próprio acesso por engano trancaria a casa com a chave dentro.
 */
export function permissoesEfetivas(opcoes: {
  papelNoSistema?: string | null
  papelNoProjeto?: string | null
  extras?: string[]
  negadas?: string[]
}): Permissao[] {
  const { papelNoSistema, papelNoProjeto, extras = [], negadas = [] } = opcoes

  if (papelNoSistema === 'OWNER' || papelNoSistema === 'ADMIN') return TODAS
  if (!papelNoProjeto) return []

  const base = PADRAO_POR_PAPEL[papelNoProjeto] ?? []
  const somadas = new Set<string>([...base, ...extras])
  for (const n of negadas) somadas.delete(n)
  // filtra pelo catálogo: chave inventada ou removida do produto não vira acesso
  return TODAS.filter(c => somadas.has(c))
}

export function temPermissao(permissoes: Permissao[], exigida: Permissao) {
  return permissoes.includes(exigida)
}
