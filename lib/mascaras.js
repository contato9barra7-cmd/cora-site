// ═══════════════════════════════════════════════════════════════════════
//  mascaras.js — o subsistema de máscaras dos Ajustes
//
//  Uma máscara tem seus PRÓPRIOS parâmetros de ajuste (luz, cor, curva...) e um
//  canvas ALPHA (0 = fora, 255 = dentro). O ajuste da máscara só afeta a imagem
//  onde o alpha é > 0, misturado proporcionalmente.
//
//  O alpha é a soma de COMPONENTES desenhados na ordem:
//    pincel: um bitmap pintado à mão
//    linear: um degradê reto (A = 100%, B = 0%)
//    radial: um degradê elíptico do centro para fora
//  Cada componente pode Adicionar (soma) ou Subtrair (apaga) do alpha.
//
//  Espelha a lógica do plugin (posAj*) para os dois ficarem idênticos.
// ═══════════════════════════════════════════════════════════════════════

import { paramsPadrao, aplicarPixels, temAjuste } from './ajustes';

// ── Criar uma máscara nova, vazia ──
export function novaMascara(w, h, n) {
  return {
    nome: 'Máscara ' + n,
    params: paramsPadrao(),
    componentes: [],      // {tipo, modo:'add'|'sub', ...}
    visivel: true,
    w, h
  };
}

// ── O pincel: escreve num bitmap alpha ──
//
// Pinta um círculo macio no ponto (x,y). `dureza`/difusão controlam a borda,
// `fluxo` a intensidade de cada toque. Acumula no canvas do componente.
export function pincelar(comp, x, y, tamanho, difusao, fluxo, w, h) {
  if (!comp.bitmap) {
    comp.bitmap = document.createElement('canvas');
    comp.bitmap.width = w;
    comp.bitmap.height = h;
  }
  const ctx = comp.bitmap.getContext('2d');
  const raio = Math.max(1, tamanho / 2);

  // O degradê radial dá a borda suave. difusao=0 → borda dura; 100 → bem esfumada.
  const dur = Math.max(0, Math.min(1, 1 - difusao / 100));
  const inicio = dur * 0.98;   // até onde é 100% opaco

  const g = ctx.createRadialGradient(x, y, raio * inicio, x, y, raio);
  const a = Math.max(0.02, fluxo / 100);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI * 2);
  ctx.fill();
}

// ── Renderiza UM componente como um canvas branco-com-alpha ──
function renderComponente(comp, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');

  if (comp.tipo === 'pincel') {
    if (comp.bitmap) x.drawImage(comp.bitmap, 0, 0, w, h);
    return c;
  }
  if (comp.tipo === 'linear') {
    const g = x.createLinearGradient(comp.ax, comp.ay, comp.bx, comp.by);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    return c;
  }
  if (comp.tipo === 'radial') {
    x.save();
    x.translate(comp.cx, comp.cy);
    x.rotate(comp.ang || 0);
    x.scale(comp.rx, comp.ry);
    const fin = Math.max(0, 1 - (comp.feather != null ? comp.feather : 0.5));
    const g = x.createRadialGradient(0, 0, fin, 0, 0, 1);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(0, 0, 1, 0, Math.PI * 2);
    x.fill();
    x.restore();
    return c;
  }
  return null;
}

// ── Compõe o alpha final da máscara ──
//
// Soma os componentes 'add' (lighter) e apaga os 'sub' (destination-out), na
// ordem em que foram criados. Retorna um canvas alpha (branco onde há máscara).
export function comporAlpha(m) {
  const c = document.createElement('canvas');
  c.width = m.w; c.height = m.h;
  const ctx = c.getContext('2d');

  (m.componentes || []).forEach((comp) => {
    const camada = renderComponente(comp, m.w, m.h);
    if (!camada) return;
    ctx.globalCompositeOperation = (comp.modo === 'sub') ? 'destination-out' : 'lighter';
    ctx.drawImage(camada, 0, 0);
  });
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

// ── Aplica os ajustes das máscaras sobre os pixels da base ──
//
// Para cada máscara com ajuste: aplica os params numa cópia e mistura de volta
// na base pela transparência do alpha. É o que faz o ajuste valer só na região.
export function aplicarMascaras(base, w, h, mascaras) {
  (mascaras || []).forEach((m) => {
    if (m.visivel === false) return;
    if (!temAjuste(m.params)) return;

    const alpha = comporAlpha(m);
    // Escala o alpha para o tamanho dos pixels sendo processados.
    let av;
    if (alpha.width === w && alpha.height === h) {
      av = alpha.getContext('2d').getImageData(0, 0, w, h).data;
    } else {
      const esc = document.createElement('canvas');
      esc.width = w; esc.height = h;
      esc.getContext('2d').drawImage(alpha, 0, 0, w, h);
      av = esc.getContext('2d').getImageData(0, 0, w, h).data;
    }

    const copia = new Uint8ClampedArray(base);
    aplicarPixels(copia, w, h, m.params);

    for (let i = 0, j = 3; i < base.length; i += 4, j += 4) {
      const a = av[j] / 255;   // o canal alpha do bitmap branco
      if (a <= 0) continue;
      base[i]     = base[i]     + (copia[i]     - base[i])     * a;
      base[i + 1] = base[i + 1] + (copia[i + 1] - base[i + 1]) * a;
      base[i + 2] = base[i + 2] + (copia[i + 2] - base[i + 2]) * a;
    }
  });
}

// ── Pincel confinado (máscara automática) ──
//
// NÃO seleciona a imagem toda: é um pincel que, dentro do seu raio, só marca os
// pixels de cor parecida com a do PONTO DE REFERÊNCIA (o começo da pincelada).
// Assim você pinta "por cima" de uma parede e só a parede é pega, sem vazar para
// o teto ou o móvel ao lado. Espelha posAjPincelAuto do plugin.
export function pincelarAuto(comp, base, w, h, x, y, ref, tamanho, difusao, fluxo, densidade) {
  if (!comp.bitmap) {
    comp.bitmap = document.createElement('canvas');
    comp.bitmap.width = w; comp.bitmap.height = h;
  }
  const ctx = comp.bitmap.getContext('2d');
  const raio = Math.max(1, tamanho / 2);
  const dif = Math.max(0, Math.min(1, difusao / 100));
  const alphaMax = (densidade != null ? densidade : 100) / 100;
  const passo = (fluxo / 100) * 0.6;

  const refLum = 0.2126 * ref[0] + 0.7152 * ref[1] + 0.0722 * ref[2];

  const x0 = Math.max(0, Math.floor(x - raio));
  const x1 = Math.min(w - 1, Math.ceil(x + raio));
  const y0 = Math.max(0, Math.floor(y - raio));
  const y1 = Math.min(h - 1, Math.ceil(y + raio));
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw <= 0 || bh <= 0) return;

  const buf = ctx.getImageData(x0, y0, bw, bh);
  const bd = buf.data;
  const rint = raio * (1 - dif);

  for (let yy = 0; yy < bh; yy++) {
    for (let xx = 0; xx < bw; xx++) {
      const px = x0 + xx, py = y0 + yy;
      const dd = Math.hypot(px - x, py - y);
      if (dd > raio) continue;

      const wRad = dd <= rint ? 1 : Math.max(0, 1 - (dd - rint) / Math.max(1, raio - rint));

      const ii = (py * w + px) * 4;
      const pr = base[ii], pg = base[ii + 1], pb = base[ii + 2];
      const pLum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;

      const difLum = Math.abs(pLum - refLum);
      const difCroma = Math.abs((pr - pLum) - (ref[0] - refLum))
                     + Math.abs((pg - pLum) - (ref[1] - refLum))
                     + Math.abs((pb - pLum) - (ref[2] - refLum));
      const dColor = difLum * 1.0 + difCroma * 0.6;

      // corte suave (sigmoide): confina à cor parecida, reduz vazamento
      const limiar = 38, suavidade = 10;
      const wCor = 1 / (1 + Math.exp((dColor - limiar) / suavidade));

      const wt = wRad * wCor;
      if (wt <= 0.02) continue;

      const bi = (yy * bw + xx) * 4;
      const atual = bd[bi + 3] / 255;
      const novo = Math.min(alphaMax, atual + passo * wt);
      bd[bi] = 255; bd[bi + 1] = 255; bd[bi + 2] = 255;
      bd[bi + 3] = Math.round(novo * 255);
    }
  }
  ctx.putImageData(buf, x0, y0);
}

// ── Um alpha de prévia para o overlay vermelho ──
//
// Mostra onde a máscara ativa incide, pintando de vermelho translúcido sobre a
// imagem enquanto se edita.
export function overlayVermelho(m, w, h) {
  const alpha = comporAlpha(m);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  // Usa o alpha como recorte e pinta vermelho por dentro.
  const esc = document.createElement('canvas');
  esc.width = w; esc.height = h;
  esc.getContext('2d').drawImage(alpha, 0, 0, w, h);

  ctx.drawImage(esc, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = 'rgba(232, 75, 74, 0.5)';
  ctx.fillRect(0, 0, w, h);
  return c;
}

export const BRUSH_PADRAO = { tamanho: 40, difusao: 50, fluxo: 80, densidade: 100, automatica: false };
