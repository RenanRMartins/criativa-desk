# CrIAtiva Desk — CLAUDE.md

## O que é este projeto
Plataforma completa de gestão de redes sociais para social medias e agências.
"Do briefing ao post publicado, tudo em um só lugar."

## Stack
- **Frontend:** Vite + React + TypeScript, Tailwind CSS v4, Framer Motion (motion), Lucide React, Zustand, React Router v7, Recharts, React Big Calendar
- **Backend:** Node.js + Express + Prisma + PostgreSQL
- **IA:** Anthropic SDK (claude-sonnet-4-6) via CopyDesk
- **Design System:** `design-system/MASTER.md` — paleta vinho (#6B2D3E), cream (#FAF7F2), fontes Playfair Display + Inter

## Estrutura de pastas
```
/src               — Frontend (Vite)
/server            — Backend (Express + Prisma)
/design-system     — MASTER.md + pages/
```

## Comandos essenciais
```bash
# Frontend
npm run dev           # porta 3000
npm run build
npx tsc -p tsconfig.app.json --noEmit  # type check

# Backend (em /server)
npm run dev           # porta 4000
npm run build
npm run db:push       # sync schema com banco
npm run db:seed       # popular com dados iniciais
```

## Variáveis de ambiente
Copiar `.env.example` → `.env` e preencher:
- `DATABASE_URL` — PostgreSQL
- `JWT_SECRET` — segredo JWT
- `ANTHROPIC_API_KEY` — para CopyDesk funcionar
- `SOCIAL_MOCK_MODE=true` — publica via mock (sem OAuth real)

## Grupos visuais de páginas (OBRIGATÓRIO manter)
| Grupo | Fundo | Páginas |
|-------|-------|---------|
| A | Vinho `#6B2D3E` | Login, Register, Onboarding, CopyDesk, TrendDesk |
| B | Cream `#FAF7F2` | Dashboard, Projects, Calendar, Reports, Settings |
| C | Branco + acentos vinho | Post Creator, Library, SearchDesk, DesignDesk |
| D | Neutro alternado | Approvals, Scheduling, Videos |

## Dados mock
Todos os dados mock estão em `src/lib/mockData.ts`. O frontend usa mock enquanto o backend não está conectado. Para conectar ao backend real, substituir as chamadas de mock pelas do `src/lib/api.ts`.

## Motion (Framer Motion v12)
Usar sempre variantes de `src/lib/motionVariants.ts`. Não criar variantes locais com `ease: 'easeOut'` (quebra o TypeScript). Usar `ease: [0,0,0.2,1]` ou importar do arquivo central.

## CopyDesk (Anthropic SDK)
- Rota: `POST /api/copydesk/generate`
- Resposta: SSE stream
- O system prompt é montado em `server/services/copydesk.service.ts` com dados do projeto ativo
- Modelo: `claude-sonnet-4-6`

## Usuários de demonstração (após seed)
- `admin@criativadesk.com` / `admin123` → OWNER
- `social@criativadesk.com` / `demo123` → SOCIAL_MEDIA

## Links públicos (sem autenticação)
- `/gravar/:token` — portal do profissional gravar vídeo
- `/aprovar/:token` — aprovação do cliente
- Portal demo: `/gravar/portal-ana-habitus`

## Adicionando novas páginas
1. Criar em `src/pages/`
2. Verificar o grupo visual (A/B/C/D) no MASTER.md
3. Usar `variants={pageVariants}` importado de `@/lib/motionVariants`
4. Adicionar rota em `src/App.tsx`
5. Adicionar item no `Sidebar.tsx` se necessário
