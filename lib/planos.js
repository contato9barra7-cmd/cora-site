// ============================================================================
//  DADOS DA PÁGINA DE PREÇOS DO CORA RENDER
//  Edite este arquivo para mudar preços, créditos, textos, comparação e FAQ.
//  Depois de editar, suba pro GitHub e o Vercel republica sozinho.
// ============================================================================

export const planos = [
  {
    id: 'free',
    nome: 'Free',
    desc: 'Para conhecer a interface completa antes de assinar.',
    mensal: 0,
    creditosTxt: 'Sem créditos de IA',
    creditosSub: '7 dias de teste. Ferramentas de IA bloqueadas.',
    cta: 'Testar 7 dias',
    ctaEstilo: 'ghost',
    destaque: false,
    feats: [
      [true, 'Interface completa do plugin'],
      [true, 'Ferramentas de textura e material'],
      [true, 'Material ID, espelho, vidro fumê'],
      [true, 'Otimizar modelo e purge'],
      [false, 'Qualquer geração com IA'],
    ],
  },
  {
    id: 'starter',
    nome: 'Starter',
    desc: 'Para quem está começando a renderizar com IA.',
    mensal: 97,
    creditosTxt: '5.000 créditos por mês',
    creditosSub: '~35 renders em 1K',
    cta: 'Assinar',
    ctaEstilo: 'roxo',
    destaque: false,
    feats: [
      [true, 'Render, Batch, Editar, 360°'],
      [true, 'Materiais e Blocos'],
      [true, 'Render em até 4K'],
      [true, 'Upscale até 4K'],
      [false, 'Animação'],
      [false, 'Pós-produção'],
      [false, 'Preenchimento e expansão generativa'],
      [false, 'Timelapse e Diretor de Narrativa'],
    ],
  },
  {
    id: 'pro',
    nome: 'Pro',
    desc: 'O plano completo para o dia a dia do arquiteto.',
    mensal: 297,
    creditosTxt: '20.000 créditos por mês',
    creditosSub: '~140 renders em 1K',
    cta: 'Assinar',
    ctaEstilo: 'verde',
    destaque: true,
    tag: 'Mais escolhido',
    feats: [
      [true, 'Tudo do Starter, mais:'],
      [true, 'Animação'],
      [true, 'Pós-produção'],
      [true, 'Preenchimento e expansão generativa'],
      [true, 'Timelapse e Diretor de Narrativa'],
      [true, 'Upscale até 16K'],
      [false, 'Prioridade de fila'],
    ],
  },
  {
    id: 'studio',
    nome: 'Studio',
    desc: 'Para estúdios e grande volume de produção.',
    mensal: 697,
    creditosTxt: '60.000 créditos por mês',
    creditosSub: '~420 renders em 1K',
    cta: 'Assinar',
    ctaEstilo: 'roxo',
    destaque: false,
    feats: [
      [true, 'Tudo do Pro, mais:'],
      [true, 'Prioridade de fila'],
      [true, 'Suporte prioritário'],
    ],
  },
];

export const recargas = [
  { n: 'Recarga P', creditos: 2000, preco: 30, popular: false },
  { n: 'Recarga M', creditos: 5000, preco: 65, popular: false },
  { n: 'Recarga G', creditos: 12000, preco: 140, popular: true },
  { n: 'Recarga GG', creditos: 30000, preco: 320, popular: false },
];

export const descontoAnual = 0.17;

// ----------------------------------------------------------------------------
//  TABELA "O QUE VEM EM CADA PLANO"
//  Colunas: Free, Starter, Pro, Studio.
//  true = tem · false = não tem · texto = aparece na célula
//  ['grupo', 'Título'] cria um cabeçalho de seção.
// ----------------------------------------------------------------------------
export const comparacao = [
  ['grupo', 'Geração de imagem'],
  ['Render', false, '4K', '4K', '4K'],
  ['Batch (várias cenas)', false, true, true, true],
  ['Editar', false, true, true, true],
  ['360°', false, true, true, true],
  ['Preenchimento generativo', false, false, true, true],
  ['Expansão generativa', false, false, true, true],

  ['grupo', 'Vídeo e sequências'],
  ['Animação', false, false, true, true],
  ['Timelapse externo e interno', false, false, true, true],
  ['Diretor de Narrativa', false, false, true, true],

  ['grupo', 'Pós e upscale'],
  ['Pós-produção', false, false, true, true],
  ['Upscale', false, 'até 4K', 'até 16K', 'até 16K'],

  ['grupo', 'Ferramentas do plugin'],
  ['Materiais e Blocos', true, true, true, true],
  ['Material ID, espelho, vidro fumê', true, true, true, true],
  ['Otimizar modelo e purge', true, true, true, true],
  ['Luzes (linear, spot, plafon)', true, true, true, true],

  ['grupo', 'Conta'],
  ['Créditos por mês', '—', '5.000', '20.000', '60.000'],
  ['Prioridade de fila', false, false, false, true],
  ['Suporte prioritário', false, false, false, true],
];

// ----------------------------------------------------------------------------
//  CUSTO POR GERAÇÃO (em créditos) — colunas: Starter, Pro, Studio
// ----------------------------------------------------------------------------
export const custoImagens = [
  ['Render', 142, 164, 239],
  ['Batch (por cena)', 135, 155, 231],
  ['Edição', 127, 147, 223],
  ['Ambientação', 127, 147, 223],
  ['Mudar mood', 127, 147, 223],
  ['Adicionar pessoa/animal', 127, 147, 223],
  ['Close-ups', 127, 147, 223],
  ['Maquete física', 127, 147, 223],
  ['Preenchimento generativo', 52, 60, 72],
  ['Expansão generativa', 52, 60, 72],
  ['360°', 127, 147, 223],
  ['Diretor de Narrativa', 15, '—', '—'],
];

export const custoUpscale = [
  ['2K', 45],
  ['4K', 72],
  ['8K', 135],
  ['16K', 225],
];

// ----------------------------------------------------------------------------
//  PERGUNTAS FREQUENTES — textos provisórios, reescreva com suas palavras.
// ----------------------------------------------------------------------------
export const faq = [
  ['Como funcionam os créditos?',
   'Cada geração que usa IA consome uma quantidade de créditos que depende da operação e da resolução. Operações locais do SketchUp não consomem nada.'],
  ['Os créditos acumulam de um mês para o outro?',
   'Os créditos do plano renovam todo mês. (Texto provisório — revisar.)'],
  ['O que acontece no plano anual?',
   'Você paga o ano com desconto e recebe os créditos mensalmente, igual ao plano mensal.'],
  ['O que dá para fazer no plano Free?',
   'Você usa a interface e todas as ferramentas que não dependem de IA por 7 dias. Qualquer geração com IA fica bloqueada.'],
  ['Posso comprar créditos extras?',
   'Sim. As recargas valem por 1 ano e só são consumidas depois que os créditos do plano acabam.'],
  ['Posso cancelar quando quiser?',
   'Sim, sem fidelidade. (Texto provisório — revisar.)'],
  ['Posso usar as imagens comercialmente?',
   'Sim. (Texto provisório — revisar.)'],
  ['O plugin funciona em qual versão do SketchUp?',
   'SketchUp 2025. (Texto provisório — revisar.)'],
];
