// ============================================================================
//  DADOS DA PÁGINA DE PREÇOS DO CORA RENDER
//  Números/preços ficam aqui. Os TEXTOS ficam em lib/i18n.js (chaves pl_*).
//  Para trocar um texto, edite a chave correspondente em lib/i18n.js.
//  Depois de editar, suba pro GitHub e o Vercel republica sozinho.
// ============================================================================

export const planos = [
  {
    id: 'free',
    nome: 'Free',
    descKey: 'pl_free_desc',
    mensal: 0,
    creditosTxtKey: 'pl_free_ct',
    creditosSubKey: 'pl_free_cs',
    ctaKey: 'pl_cta_testar',
    ctaEstilo: 'ghost',
    destaque: false,
    feats: [
      [true, 'pl_f_interface'],
      [true, 'pl_f_textura'],
      [true, 'pl_f_matid'],
      [true, 'pl_f_otimizar'],
      [true, 'pl_f_pos7'],
      [false, 'pl_f_qualquer_ia'],
    ],
  },
  {
    id: 'starter',
    nome: 'Starter',
    descKey: 'pl_starter_desc',
    mensal: 97,
    creditosTxtKey: 'pl_starter_ct',
    creditosSubKey: 'pl_starter_cs',
    ctaKey: 'assinar',
    ctaEstilo: 'roxo',
    destaque: false,
    feats: [
      [true, 'pl_f_render_batch'],
      [true, 'pl_f_mat_blocos'],
      [true, 'pl_f_render4k'],
      [true, 'pl_f_upscale4k'],
      [false, 'pl_f_animacao'],
      [false, 'pl_f_pos'],
      [false, 'pl_f_generativa'],
      [false, 'pl_f_timelapse_dir'],
    ],
  },
  {
    id: 'pro',
    nome: 'Pro',
    descKey: 'pl_pro_desc',
    mensal: 297,
    creditosTxtKey: 'pl_pro_ct',
    creditosSubKey: 'pl_pro_cs',
    ctaKey: 'assinar',
    ctaEstilo: 'verde',
    destaque: true,
    tagKey: 'pl_tag_escolhido',
    feats: [
      [true, 'pl_f_tudo_starter'],
      [true, 'pl_f_animacao'],
      [true, 'pl_f_pos'],
      [true, 'pl_f_generativa'],
      [true, 'pl_f_timelapse_dir'],
      [true, 'pl_f_upscale16k'],
      [false, 'pl_f_prioridade'],
    ],
  },
  {
    id: 'studio',
    nome: 'Studio',
    descKey: 'pl_studio_desc',
    mensal: 697,
    creditosTxtKey: 'pl_studio_ct',
    creditosSubKey: 'pl_studio_cs',
    ctaKey: 'assinar',
    ctaEstilo: 'roxo',
    destaque: false,
    feats: [
      [true, 'pl_f_tudo_pro'],
      [true, 'pl_f_prioridade'],
      [true, 'pl_f_suporte_prio'],
    ],
  },
];

export const recargas = [
  { id: 'p', nomeKey: 'pl_rec_p', creditos: 2000, preco: 30, popular: false },
  { id: 'm', nomeKey: 'pl_rec_m', creditos: 5000, preco: 65, popular: false },
  { id: 'g', nomeKey: 'pl_rec_g', creditos: 12000, preco: 140, popular: true },
  { id: 'gg', nomeKey: 'pl_rec_gg', creditos: 30000, preco: 320, popular: false },
];

export const descontoAnual = 0.17;

// ----------------------------------------------------------------------------
//  TABELA "O QUE VEM EM CADA PLANO" — Colunas: Free, Starter, Pro, Studio.
//  Strings que começam com 'pl_' são traduzidas; '4K', '—' são universais.
// ----------------------------------------------------------------------------
export const comparacao = [
  ['grupo', 'pl_g_geracao'],
  ['pl_c_render', false, '4K', '4K', '4K'],
  ['pl_c_batch', false, true, true, true],
  ['pl_c_editar', false, true, true, true],
  ['360°', false, true, true, true],
  ['pl_c_preench', false, false, true, true],
  ['pl_c_expansao', false, false, true, true],

  ['grupo', 'pl_g_video'],
  ['pl_f_animacao', false, false, true, true],
  ['pl_c_timelapse', false, false, true, true],
  ['pl_c_diretor', false, false, true, true],

  ['grupo', 'pl_g_pos_upscale'],
  ['pl_f_pos', 'pl_v_7dias', false, true, true],
  ['pl_c_upscale', false, 'pl_v_ate4k', 'pl_v_ate16k', 'pl_v_ate16k'],

  ['grupo', 'pl_g_ferramentas'],
  ['pl_f_mat_blocos', true, true, true, true],
  ['pl_f_matid', true, true, true, true],
  ['pl_f_otimizar', true, true, true, true],
  ['pl_c_luzes', true, true, true, true],

  ['grupo', 'pl_g_conta'],
  ['pl_c_creditos_mes', '—', 'pl_v_5000', 'pl_v_20000', 'pl_v_60000'],
  ['pl_f_prioridade', false, false, false, true],
  ['pl_f_suporte_prio', false, false, false, true],
];

// ----------------------------------------------------------------------------
//  CUSTO POR GERAÇÃO (em créditos) — 4 abas.
//  labelKey/colunas: strings 'pl_' são traduzidas. Nas linhas de animação,
//  {pl_sem_audio}/{pl_com_audio} são substituídos no render.
// ----------------------------------------------------------------------------
export const custos = {
  imagens: {
    labelKey: 'pl_cu_imagens',
    colunas: ['pl_cu_geracao', '1K', '2K', '4K'],
    linhas: [
      ['pl_c_render', 142, 164, 239],
      ['pl_cu_batch_cena', 135, 155, 231],
      ['pl_cu_edicao', 127, 147, 223],
      ['pl_cu_ambientacao', 127, 147, 223],
      ['pl_cu_mood', 127, 147, 223],
      ['pl_cu_pessoa', 127, 147, 223],
      ['pl_cu_closeups', 127, 147, 223],
      ['pl_cu_maquete', 127, 147, 223],
      ['pl_c_preench', 52, 60, 72],
      ['pl_c_expansao', 52, 60, 72],
      ['360°', 127, 147, 223],
      ['pl_c_diretor', 15, '—', '—'],
    ],
  },
  timelapse: {
    labelKey: 'Timelapse',
    colunas: ['pl_cu_geracao', '1K', '2K', '4K'],
    linhas: [
      ['pl_cu_tl_ext_full', 968, 1113, 1736],
      ['pl_cu_tl_ext_step', 120, 138, 216],
      ['pl_cu_tl_int_full', 968, 1113, 1736],
      ['pl_cu_tl_int_step', 120, 138, 216],
    ],
  },
  upscale: {
    labelKey: 'Upscale',
    colunas: ['pl_cu_res_final', 'pl_cu_creditos'],
    linhas: [
      ['2K', 45],
      ['4K', 72],
      ['8K', 135],
      ['16K', 225],
    ],
  },
  animacao: {
    labelKey: 'pl_f_animacao',
    colunas: ['pl_cu_modelo', '1s', '5s', '10s'],
    linhas: [
      ['Kling 2.1 (720p)', 96, 450, 892],
      ['Kling 2.1 (1080p)', 110, 517, 1026],
      ['Kling 2.5 (720p)', 70, 322, 638],
      ['Kling 2.5 (1080p)', 81, 371, 733],
      ['Kling 2.6 (720p, {pl_sem_audio})', 70, 322, 638],
      ['Kling 2.6 (1080p, {pl_sem_audio})', 81, 371, 733],
      ['Kling 2.6 (720p, {pl_com_audio})', 134, 638, 1268],
      ['Kling 2.6 (1080p, {pl_com_audio})', 154, 733, 1458],
      ['Kling 3.0 (720p, {pl_sem_audio})', 108, 510, 1013],
      ['Kling 3.0 (720p, {pl_com_audio})', 159, 765, 1523],
      ['Kling 3.0 (1080p, {pl_sem_audio})', 124, 586, 1164],
      ['Kling 3.0 (1080p, {pl_com_audio})', 183, 880, 1751],
      ['Kling 3.0 (4K)', 385, 1898, 3788],
    ],
  },
};

// ----------------------------------------------------------------------------
//  PERGUNTAS FREQUENTES — pares [chave da pergunta, chave da resposta]
// ----------------------------------------------------------------------------
export const faq = [
  ['pl_faq_q1', 'pl_faq_a1'],
  ['pl_faq_q2', 'pl_faq_a2'],
  ['pl_faq_q3', 'pl_faq_a3'],
  ['pl_faq_q4', 'pl_faq_a4'],
  ['pl_faq_q5', 'pl_faq_a5'],
  ['pl_faq_q6', 'pl_faq_a6'],
  ['pl_faq_q7', 'pl_faq_a7'],
  ['pl_faq_q8', 'pl_faq_a8'],
];

// ----------------------------------------------------------------------------
//  CORA TEAMS — tabelas de assentos. Primeira coluna = chave 'pl_seat_*'.
//  [faixa, desconto (0-1), preço por assento, total no mínimo]
// ----------------------------------------------------------------------------
export const teamsPro = [
  ['pl_seat_min', 0.05, 282, 564],
  ['pl_seat_3', 0.10, 267, null],
  ['pl_seat_5', 0.15, 252, null],
  ['pl_seat_10', 0.20, 238, null],
];

export const teamsStudio = [
  ['pl_seat_min', 0.05, 662, 1324],
  ['pl_seat_3', 0.10, 627, null],
  ['pl_seat_5', 0.15, 592, null],
  ['pl_seat_10', 0.20, 558, null],
];

// ----------------------------------------------------------------------------
//  CORA TEAMS — helper de cálculo de preço por faixa de assentos
// ----------------------------------------------------------------------------
export const teamsBase = { pro: 297, studio: 697 };
export const teamsBaseAnual = { pro: 2958.12, studio: 6942.12 };

export function descontoAssentos(qtd) {
  if (qtd >= 10) return 0.20;
  if (qtd >= 5) return 0.15;
  if (qtd >= 3) return 0.10;
  return 0.05;
}

export function calcularTeams(planoId, qtd, ciclo = 'mensal') {
  const tabela = ciclo === 'anual' ? teamsBaseAnual : teamsBase;
  const base = tabela[planoId] || tabela.pro;
  const desconto = descontoAssentos(qtd);
  const porAssento = Math.round(base * (1 - desconto));
  const total = porAssento * qtd;
  const semDesconto = base * qtd;
  const economia = semDesconto - total;
  return { porAssento, total, desconto, economia, semDesconto, ciclo };
}
