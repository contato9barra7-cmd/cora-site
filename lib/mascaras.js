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

// ── Máscara automática (seletiva por cor) ──
//
// A partir de um ponto clicado, seleciona os pixels de cor/luminância parecida
// num raio — como a "seleção rápida". Preenche o bitmap do componente pincel.
export function automascara(comp, base, w, h, cx, cy, tolerancia, w2, h2) {
  if (!comp.bitmap) {
    comp.bitmap = document.createElement('canvas');
    comp.bitmap.width = w; comp.bitmap.height = h;
  }
  const ctx = comp.bitmap.getContext('2d');
  const saida = ctx.getImageData(0, 0, w, h);
  const sd = saida.data;

  const idx = (cy * w + cx) * 4;
  const lr = base[idx], lg = base[idx + 1], lb = base[idx + 2];
  const tol = tolerancia * 2.2;   // ganho empírico

  for (let i = 0, j = 0; i < base.length; i += 4, j++) {
    const dr = base[i] - lr, dg = base[i + 1] - lg, db = base[i + 2] - lb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= tol) {
      // quanto mais perto da cor, mais opaco
      const a = Math.round(255 * (1 - dist / tol));
      sd[i + 3] = Math.max(sd[i + 3], a);
      sd[i] = sd[i + 1] = sd[i + 2] = 255;
    }
  }
  ctx.putImageData(saida, 0, 0);
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
