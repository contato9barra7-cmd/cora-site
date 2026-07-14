// ═══════════════════════════════════════════════════════════
//  O motor de transformação
//
//  Mover e redimensionar uma camada direto na tela. Sem isto, mexer numa camada
//  exigiria escolher uma ferramenta antes — e quem arrasta uma imagem espera
//  que ela simplesmente venha.
// ═══════════════════════════════════════════════════════════

import { largura, altura } from './pos';

// ── Qual camada está debaixo do cursor ──
//
// Não basta o retângulo: uma camada com transparência (um PNG recortado, uma
// máscara) tem buracos, e clicar num buraco deveria pegar o que está ATRÁS.
// Por isso o teste lê o pixel.
//
// A busca é de cima para baixo — a camada visualmente na frente ganha.
export function camadaNoPonto(camadas, p) {
  for (const l of camadas) {
    if (!l.visivel || l.tipo === 'grupo') continue;

    const w = largura(l);
    const h = altura(l);

    if (p.x < l.x || p.y < l.y || p.x > l.x + w || p.y > l.y + h) continue;

    // Dentro do retângulo. Mas o pixel ali é opaco?
    //
    // Isto NÃO passa por `fonteDaCamada`. Ela reconstrói a camada inteira
    // recortada pela máscara — dois canvas novos e uma varredura de todos os
    // pixels. Rodar isso a cada movimento do mouse travaria a interface: numa
    // imagem 4K, são 12 milhões de iterações por quadro.
    //
    // Para saber se UM ponto é opaco basta ler UM pixel do canvas e UM da
    // máscara.
    const cx = Math.floor(((p.x - l.x) / w) * l.canvas.width);
    const cy = Math.floor(((p.y - l.y) / h) * l.canvas.height);

    try {
      const d = l.canvas.getContext('2d').getImageData(cx, cy, 1, 1).data;
      if (d[3] <= 8) continue;          // transparente: passa para a de baixo

      // A máscara esconde? O preto dela apaga o pixel, e clicar ali deveria
      // pegar o que está atrás — não esta camada.
      if (l.mascara) {
        const mx = Math.floor((cx / l.canvas.width)  * l.mascara.width);
        const my = Math.floor((cy / l.canvas.height) * l.mascara.height);

        const m = l.mascara.getContext('2d').getImageData(mx, my, 1, 1).data;
        const luz = m[0] * 0.299 + m[1] * 0.587 + m[2] * 0.114;
        if (luz <= 8) continue;
      }

      return l;
    } catch (e) {
      return l;                          // na dúvida, aceita o retângulo
    }
  }

  return null;
}

// ── As alças de transformação ──
//
// Oito, como em qualquer editor: quatro cantos e quatro meios. Os cantos
// escalam proporcionalmente; os meios esticam num eixo só.
export const ALCAS = ['no', 'n', 'ne', 'l', 'se', 's', 'so', 'o'];

export function pontosDasAlcas(l) {
  const w = largura(l);
  const h = altura(l);
  const x = l.x;
  const y = l.y;

  return {
    no: [x,         y],
    n:  [x + w / 2, y],
    ne: [x + w,     y],
    l:  [x + w,     y + h / 2],
    se: [x + w,     y + h],
    s:  [x + w / 2, y + h],
    so: [x,         y + h],
    o:  [x,         y + h / 2]
  };
}

// Qual alça está sob o cursor. A tolerância é dividida pelo zoom: a 20%, uma
// alça de 10px do documento teria 2px na tela, e ninguém a acertaria.
export function alcaNoPonto(l, p, zoom) {
  const tol = 9 / zoom;
  const pts = pontosDasAlcas(l);

  for (const a of ALCAS) {
    const [hx, hy] = pts[a];
    if (Math.abs(p.x - hx) < tol && Math.abs(p.y - hy) < tol) return a;
  }

  return null;
}

// ── As travas magnéticas ──
//
// Elas existem porque alinhar "no olho" é impossível: a mão sempre erra por um
// ou dois pixels, e um render com a imagem 2px fora do centro parece torto sem
// que se saiba por quê.
//
// Os alvos são os que importam numa composição: as bordas do documento, o
// centro dele, e as bordas e centros das OUTRAS camadas.
export function alvosDeEncaixe(camadas, ativa, docW, docH) {
  const vx = [0, docW / 2, docW];      // verticais: x
  const vy = [0, docH / 2, docH];      // horizontais: y

  for (const l of camadas) {
    if (l.id === ativa.id || l.tipo === 'grupo' || !l.visivel) continue;

    const w = largura(l);
    const h = altura(l);

    vx.push(l.x, l.x + w / 2, l.x + w);
    vy.push(l.y, l.y + h / 2, l.y + h);
  }

  return { vx, vy };
}

// Encaixa um valor no alvo mais próximo, se estiver perto o bastante.
// Devolve o valor e QUAL alvo pegou — o segundo é o que permite desenhar a
// linha-guia, sem a qual a trava seria mágica e inexplicável.
function encaixar(val, alvos, tol) {
  let melhor = null;
  let dist = tol;

  for (const a of alvos) {
    const d = Math.abs(val - a);
    if (d < dist) { dist = d; melhor = a; }
  }

  return melhor;
}

// Move uma camada com encaixe. Testa três pontos de referência dela — borda
// inicial, centro e borda final — contra todos os alvos.
export function moverComEncaixe(l, x, y, camadas, docW, docH, zoom) {
  const tol = 7 / zoom;
  const { vx, vy } = alvosDeEncaixe(camadas, l, docW, docH);

  const w = largura(l);
  const h = altura(l);

  const guias = [];
  let nx = x;
  let ny = y;

  // Horizontal: a esquerda, o centro ou a direita da camada podem encaixar
  const candX = [
    { ponto: x,         desloca: 0 },
    { ponto: x + w / 2, desloca: -w / 2 },
    { ponto: x + w,     desloca: -w }
  ];

  for (const c of candX) {
    const alvo = encaixar(c.ponto, vx, tol);
    if (alvo != null) {
      nx = alvo + c.desloca;
      guias.push({ eixo: 'x', em: alvo });
      break;                      // um encaixe por eixo basta
    }
  }

  const candY = [
    { ponto: y,         desloca: 0 },
    { ponto: y + h / 2, desloca: -h / 2 },
    { ponto: y + h,     desloca: -h }
  ];

  for (const c of candY) {
    const alvo = encaixar(c.ponto, vy, tol);
    if (alvo != null) {
      ny = alvo + c.desloca;
      guias.push({ eixo: 'y', em: alvo });
      break;
    }
  }

  return { x: nx, y: ny, guias };
}

// ── Redimensionar pela alça ──
//
// Os CANTOS mantêm a proporção. Esticar uma foto na diagonal e deformá-la nunca
// é o que se quer — se fosse, haveria os meios, que esticam num eixo só.
//
// Shift inverte: nos cantos, libera a deformação.
export function redimensionar(l, alca, p, inicio, livre) {
  const x0 = inicio.x;
  const y0 = inicio.y;
  const w0 = inicio.w;
  const h0 = inicio.h;

  const canto = alca.length === 2;    // 'no','ne','se','so'

  // A âncora é o ponto que NÃO se move: o oposto da alça puxada.
  const ancora = {
    no: [x0 + w0, y0 + h0],
    ne: [x0,      y0 + h0],
    se: [x0,      y0],
    so: [x0 + w0, y0],
    n:  [x0,      y0 + h0],
    s:  [x0,      y0],
    o:  [x0 + w0, y0],
    l:  [x0,      y0]
  }[alca];

  const [ax, ay] = ancora;

  let w = w0;
  let h = h0;

  const mexeX = alca.includes('o') || alca.includes('l') || canto;
  const mexeY = alca.includes('n') || alca.includes('s') || canto;

  if (mexeX) w = Math.abs(p.x - ax);
  if (mexeY) h = Math.abs(p.y - ay);

  // Proporção: nos cantos, por padrão. A escala é a do eixo que mais mudou —
  // seguir só um eixo faria a imagem "escapar" do cursor na diagonal.
  if (canto && !livre) {
    const sx = w / w0;
    const sy = h / h0;
    const s = Math.abs(sx - 1) > Math.abs(sy - 1) ? sx : sy;
    w = w0 * s;
    h = h0 * s;
  }

  // Uma camada de tamanho zero desapareceria e não haveria como recuperá-la
  w = Math.max(12, w);
  h = Math.max(12, h);

  // Onde fica o canto superior esquerdo, dado que a âncora não se mexe
  const nx = (alca.includes('o') || alca === 'no' || alca === 'so') ? ax - w
           : (mexeX ? ax : x0);
  const ny = (alca.includes('n') || alca === 'no' || alca === 'ne') ? ay - h
           : (mexeY ? ay : y0);

  return {
    x: mexeX ? nx : x0,
    y: mexeY ? ny : y0,
    escala:  w / l.canvas.width,
    escalaY: h / l.canvas.height
  };
}

// ── Centralizar ──
// Uma camada nova entra no MEIO do documento, e não no canto. Entrar em (0,0)
// esconderia metade dela atrás da borda quando fosse maior que a base.
export function centralizar(canvas, docW, docH) {
  // Se a imagem é maior que o documento, ela entra reduzida para caber —
  // colar uma foto de 6000px sobre um render de 1800px deixaria só um pedaço
  // do céu dela visível, e pareceria que nada aconteceu.
  const cabe = Math.min(1, docW / canvas.width, docH / canvas.height);

  const w = canvas.width * cabe;
  const h = canvas.height * cabe;

  return {
    x: (docW - w) / 2,
    y: (docH - h) / 2,
    escala: cabe,
    escalaY: cabe
  };
}
