import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding CrIAtiva Desk...')

  // Users
  const adminPw = await bcrypt.hash('admin123', 10)
  const demoPw = await bcrypt.hash('demo123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@criativadesk.com' },
    update: {},
    create: { name: 'Admin CrIAtiva Desk', email: 'admin@criativadesk.com', password: adminPw, role: 'OWNER', plan: 'AGENCY', onboardingCompleted: true },
  })

  const social = await prisma.user.upsert({
    where: { email: 'social@criativadesk.com' },
    update: {},
    create: { name: 'Social Media Demo', email: 'social@criativadesk.com', password: demoPw, role: 'SOCIAL_MEDIA', plan: 'PROFESSIONAL', onboardingCompleted: true },
  })

  // Project 1 — Clínica Habitus
  const habitus = await prisma.project.upsert({
    where: { slug: 'clinica-habitus' },
    update: {},
    create: {
      name: 'Clínica Habitus',
      slug: 'clinica-habitus',
      description: 'Clínica de saúde integrativa com foco em medicina preventiva',
      niche: 'Saúde integrativa',
      segment: 'Saúde',
      primaryColor: '#6B2D3E',
      secondaryColor: '#FAF7F2',
      accentColor: '#C9A96E',
      toneOfVoice: 'Acolhedor, profissional e integrativo',
      copyPersonality: 'Educativo e empático',
      forbiddenWords: ['cura garantida', 'milagre', 'cure'],
      defaultCTAs: ['Agende sua consulta', 'Saiba mais', 'Reserve sua vaga'],
      defaultHashtags: ['#saudeintegrativa', '#clinicahabitus', '#bemestar'],
      contentPillars: ['Saúde integrativa', 'Nutrição', 'Ozonioterapia', 'Bem-estar'],
      targetAudience: 'Adultos de 30-55 anos interessados em saúde preventiva',
      niches: ['saúde integrativa', 'nutrição', 'ozonioterapia', 'estética'],
      members: { create: { userId: admin.id, role: 'OWNER' } },
    },
  })

  // Project 2 — Odília Mello
  const odilia = await prisma.project.upsert({
    where: { slug: 'odilia-mello' },
    update: {},
    create: {
      name: 'Odília Mello Nutricionista',
      slug: 'odilia-mello',
      description: 'Nutricionista especializada em emagrecimento saudável',
      niche: 'Nutrição',
      segment: 'Saúde',
      primaryColor: '#2D6B5A',
      secondaryColor: '#F0FAF7',
      accentColor: '#A8D5C5',
      toneOfVoice: 'Educativo, empático e motivador',
      copyPersonality: 'Próxima e encorajadora',
      defaultCTAs: ['Fale comigo', 'Agende sua consulta', 'Saiba mais'],
      defaultHashtags: ['#nutrição', '#emagrecimento', '#alimentacaosaudavel'],
      contentPillars: ['Nutrição', 'Emagrecimento', 'Receitas', 'Educação alimentar'],
      targetAudience: 'Mulheres de 25-50 anos querendo emagrecer com saúde',
      niches: ['nutrição', 'emagrecimento', 'alimentação saudável'],
      members: { create: [{ userId: admin.id, role: 'OWNER' }, { userId: social.id, role: 'SOCIAL_MEDIA' }] },
    },
  })

  // Professionals
  const profAna = await prisma.professional.upsert({
    where: { accessToken: 'portal-ana-habitus' },
    update: {},
    create: {
      projectId: habitus.id,
      name: 'Dra. Ana Paula',
      email: 'ana@habitus.com',
      accessToken: 'portal-ana-habitus',
      bio: 'Médica integrativa especializada em ozonioterapia',
    },
  })

  const profOdilia = await prisma.professional.upsert({
    where: { accessToken: 'portal-odilia-nutri' },
    update: {},
    create: {
      projectId: odilia.id,
      name: 'Dra. Odília Mello',
      email: 'odilia@nutriodilia.com',
      accessToken: 'portal-odilia-nutri',
      bio: 'Nutricionista CRN-9999',
    },
  })

  // Video tasks
  const deadline1 = new Date(Date.now() + 3 * 86400000)
  const deadline2 = new Date(Date.now() + 2 * 86400000)

  await prisma.videoTask.upsert({
    where: { id: 'seed-task-1' },
    update: {},
    create: {
      id: 'seed-task-1',
      professionalId: profAna.id,
      title: 'Estresse e queda de cabelo',
      description: 'Explique a relação entre cortisol elevado e queda capilar.',
      recordingGuide: 'Grave em pé, fundo neutro ou consultório. Luz natural. Roupa profissional.',
      suggestedDuration: 60,
      toneOfVoice: 'Educativo e acolhedor',
      deadline: deadline1,
    },
  })

  await prisma.videoTask.upsert({
    where: { id: 'seed-task-2' },
    update: {},
    create: {
      id: 'seed-task-2',
      professionalId: profOdilia.id,
      title: 'Como montar um prato equilibrado',
      description: 'Mostre na prática como dividir o prato entre proteínas, carboidratos e vegetais.',
      recordingGuide: 'Grave na cozinha com os alimentos em mãos.',
      suggestedDuration: 45,
      toneOfVoice: 'Didático e animado',
      deadline: deadline2,
    },
  })

  // Sample posts
  const samplePosts = [
    { projectId: habitus.id, title: 'Benefícios da vitamina D na imunidade', format: 'REELS_INSTAGRAM' as const, networks: ['INSTAGRAM' as const], status: 'PENDING_APPROVAL' as const, publishDate: new Date(Date.now() + 3 * 86400000), caption: 'Você sabia que a vitamina D é essencial para seu sistema imunológico?', hashtags: ['#vitaminaD', '#imunidade'] },
    { projectId: habitus.id, title: 'O que é Ozonioterapia?', format: 'CAROUSEL_INSTAGRAM' as const, networks: ['INSTAGRAM' as const], status: 'APPROVED' as const, publishDate: new Date(Date.now() + 86400000), caption: 'A ozonioterapia é um tratamento que utiliza o ozônio medicinal...', hashtags: ['#ozonioterapia'] },
    { projectId: odilia.id, title: '5 alimentos que aceleram o metabolismo', format: 'CAROUSEL_INSTAGRAM' as const, networks: ['INSTAGRAM' as const, 'FACEBOOK' as const], status: 'SCHEDULED' as const, publishDate: new Date(Date.now() + 2 * 86400000), scheduledAt: new Date(Date.now() + 2 * 86400000), caption: 'Conheça os alimentos que vão te ajudar a emagrecer...', hashtags: ['#metabolismo'] },
  ]

  for (const post of samplePosts) {
    await prisma.post.create({ data: { ...post, authorId: admin.id } }).catch(() => {})
  }

  // Trends
  await prisma.trendItem.createMany({
    skipDuplicates: true,
    data: [
      { projectId: habitus.id, title: 'Queda de cabelo por deficiência de vitaminas', description: 'Buscas sobre queda de cabelo relacionadas a vitaminas bateram recorde esta semana.', niche: 'Saúde integrativa', trendScore: 87, source: 'Google Trends', reelsIdea: '"Você sabia que a falta de vitamina D pode causar queda de cabelo?"', carouselIdea: '"5 vitaminas que previnem a queda de cabelo"', whyItMatters: 'Tópico em alta com potencial de viralização.', validUntil: new Date(Date.now() + 7 * 86400000) },
      { projectId: habitus.id, title: 'Ozonioterapia para dores crônicas', description: 'Interesse crescente em terapias alternativas para dor.', niche: 'Ozonioterapia', trendScore: 74, source: 'TikTok Trending', reelsIdea: '"Ozonioterapia funciona para artrose?"', whyItMatters: 'Tendência crescente em medicina integrativa.', validUntil: new Date(Date.now() + 14 * 86400000) },
      { projectId: odilia.id, title: 'Alimentação anti-inflamatória', description: 'Busca por dietas anti-inflamatórias cresceu 45% na última semana.', niche: 'Nutrição', trendScore: 92, source: 'Google Trends', reelsIdea: '"O que comer para reduzir a inflamação em 7 dias"', carouselIdea: '"10 alimentos anti-inflamatórios"', whyItMatters: 'Alto volume de busca, fácil de produzir conteúdo educativo.', validUntil: new Date(Date.now() + 5 * 86400000) },
    ],
  })

  // Search Terms
  await prisma.searchTerm.createMany({
    skipDuplicates: true,
    data: [
      { projectId: habitus.id, term: 'queda de cabelo pode ser falta de vitamina', niche: 'Saúde integrativa', monthlySearches: 40500, difficulty: 32, isFeatured: true, reelsIdea: 'Explique a conexão em 60s.', carouselIdea: '"5 vitaminas que investigar"', captionSuggestion: 'A queda de cabelo nem sempre tem causa genética.' },
      { projectId: habitus.id, term: 'por que sinto cansaço mesmo dormindo bem', niche: 'Saúde integrativa', monthlySearches: 27200, difficulty: 28, isFeatured: false, reelsIdea: '"Por que você se cansa mesmo dormindo 8h?"' },
      { projectId: odilia.id, term: 'como emagrecer sem passar fome', niche: 'Nutrição', monthlySearches: 60500, difficulty: 45, isFeatured: true, reelsIdea: '"O método que faz você emagrecer sem ficar com fome"', captionSuggestion: 'Emagrecer não precisa ser sinônimo de sofrer.' },
    ],
  })

  console.log('✅ Seed completo!')
  console.log('   📧 admin@criativadesk.com / admin123')
  console.log('   📧 social@criativadesk.com / demo123')
  console.log(`   🔗 Portal profissional: /gravar/portal-ana-habitus`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
