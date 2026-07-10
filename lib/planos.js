// ============================================================================
//  DADOS DOS PLANOS DO CORA RENDER
//  Este é o único arquivo que você precisa editar para mudar preços, créditos,
//  textos e o que cada plano inclui. Depois de editar, é só subir pro GitHub
//  e o Vercel republica sozinho.
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

// desconto do plano anual (ex.: 0.17 = 17% off)
export const descontoAnual = 0.17;
