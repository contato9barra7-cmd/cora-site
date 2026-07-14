// ═══════════════════════════════════════════════════════════
//  Os filtros inteligentes
//
//  Um filtro comum DESTRÓI: ele reescreve os pixels da camada, e o que estava
//  ali some. Desfocou demais? Só o Ctrl+Z salva — e se você fechou o arquivo,
//  nem ele.
//
//  Num objeto inteligente é diferente. O filtro não toca no pixel virgem: ele é
//  ANOTADO numa lista, e o que se vê é o resultado de reaplicar essa lista sobre
//  o original, do zero, toda vez.
//
//  É por isso que se pode voltar num desfoque de ontem, mudar o raio de 8 para
//  4, e o resto do trabalho continuar de pé.
//
//  ── Como isso vive na camada ──
//
//     l.original  o pixel virgem, nunca tocado
//     l.filtros   a receita: uma lista de { id, tipo, ...params }
//     l.canvas    o RESULTADO de aplicar a receita ao original
//
//  A composição continua lendo `l.canvas`, sem saber de nada disso. Quando um
//  filtro muda, quem recalcula é o painel — e escreve o resultado de volta em
//  `l.canvas`.
//
//  Essa escolha evita um ciclo de imports: `pos.js` não precisa conhecer os
//  filtros, e os filtros podem usar `pos.js` à vontade.
//
//  ── O custo ──
//
//  Reaplicar a pilha inteira a cada mudança é mais caro que carimbar o pixel uma
//  vez. É o preço da reversibilidade, e é o mesmo que o Photoshop paga.
// ═══════════════════════════════════════════════════════════

import { canvasVazio, clonarCanvas } from './pos';
import { aplicarEmCanvas } from './ajustes';
import { desfocar, desfoqueMovimento } from './selecao';

export const NOMES = {
  desfGauss: 'Desfoque gaussiano',
  desfMov:   'Desfoque de movimento',
  ajustes:   'Ajustes'
};

export function nomeDoFiltro(f) {
  return NOMES[f.tipo] || 'Filtro';
}

export function novoIdFiltro() {
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Um filtro, sobre um canvas ──
//
// A máscara é opcional. Quando existe, o filtro só age dentro dela: é a seleção
// que estava ativa quando ele foi criado, congelada junto.
function aplicarUm(canvas, f) {
  const m = f.mascara || null;

  if (f.tipo === 'desfGauss') {
    desfocar(canvas, f.raio, m);
    return canvas;
  }

  if (f.tipo === 'desfMov') {
    desfoqueMovimento(canvas, f.raio, f.angulo || 0, m);
    return canvas;
  }

  if (f.tipo === 'ajustes') {
    const saida = aplicarEmCanvas(canvas, f.params);
    if (!m) return saida;

    // Com máscara, o ajustado entra só onde ela deixa; o resto fica como estava.
    const sc = saida.getContext('2d');
    sc.globalCompositeOperation = 'destination-in';
    sc.drawImage(m, 0, 0, saida.width, saida.height);
    sc.globalCompositeOperation = 'source-over';

    const fim = clonarCanvas(canvas);
    fim.getContext('2d').drawImage(saida, 0, 0);
    return fim;
  }

  return canvas;
}

// ── A pilha inteira, a partir do original ──
//
// A ordem IMPORTA: desfocar e depois clarear não dá o mesmo que clarear e depois
// desfocar. Por isso a lista é percorrida sempre de cima a baixo.
export function aplicarFiltros(original, filtros) {
  if (!original) return null;
  if (!filtros?.length) return clonarCanvas(original);

  let atual = clonarCanvas(original);

  for (const f of filtros) {
    if (f.desligado) continue;      // o olho fechado do filtro
    atual = aplicarUm(atual, f);
  }

  return atual;
}

// ── A seleção vira a máscara do filtro ──
//
// A seleção vive em coordenadas do DOCUMENTO; o filtro age no canvas da CAMADA.
// A conversão é feita UMA vez, na criação, e congelada — mover a camada depois
// não deve arrastar o filtro junto.
export function mascaraDoFiltro(selecao, l, larg, alt) {
  if (!selecao) return null;

  const m = canvasVazio(l.canvas.width, l.canvas.height);
  const mc = m.getContext('2d');

  mc.save();
  mc.scale(l.canvas.width / larg, l.canvas.height / alt);
  mc.translate(-l.x, -l.y);
  mc.drawImage(selecao, 0, 0);
  mc.restore();

  return m;
}
