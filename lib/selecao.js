// ═══════════════════════════════════════════════════════════
//  O motor de seleção
//
//  Uma seleção NÃO é uma lista de pontos: é um canvas em tons de alfa, do
//  tamanho do documento. Branco/opaco = dentro, transparente = fora.
//
//  Essa escolha é o que torna tudo o mais possível. Um retângulo, um laço, uma
//  varinha mágica e uma pincelada produzem coisas geometricamente
//  incomparáveis — mas todas sabem pintar num canvas. Somar e subtrair viram
//  `source-over` e `destination-out`. E o meio-tom sai de graça: um pixel com
//  alfa 128 está meio-selecionado, que é o que dá a borda suave.
// ═══════════════════════════════════════════════════════════

// ── A máscara de seleção ──
export function novaSelecao(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function selecaoVazia(sel) {
  if (!sel) return true;
  const d = sel.getContext('2d').getImageData(0, 0, sel.width, sel.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return false;
  return true;
}

// ── Compor uma forma na seleção ──
//
// `novo` limpa antes. `somar` desenha por cima. `subtrair` usa
// `destination-out`: onde a forma nova pinta, a antiga é apagada.
export function comporSelecao(sel, modo, desenhar) {
  const cx = sel.getContext('2d');

  if (modo === 'novo') cx.clearRect(0, 0, sel.width, sel.height);

  cx.save();
  if (modo === 'subtrair') cx.globalCompositeOperation = 'destination-out';
  cx.fillStyle = '#fff';
  cx.strokeStyle = '#fff';
  desenhar(cx);
  cx.restore();
}

// As teclas mandam mais que o botão: é o gesto do Photoshop, e a mão já sabe.
export function modoEfetivo(e, modoBotao) {
  if (e && (e.ctrlKey || e.metaKey)) return 'somar';
  if (e && e.altKey) return 'subtrair';
  return modoBotao || 'novo';
}

// ── As formas ──
export function retangulo(sel, modo, r) {
  const x = Math.min(r.x0, r.x1);
  const y = Math.min(r.y0, r.y1);
  const w = Math.abs(r.x1 - r.x0);
  const h = Math.abs(r.y1 - r.y0);
  if (w < 2 || h < 2) return false;

  comporSelecao(sel, modo, (cx) => cx.fillRect(x, y, w, h));
  return true;
}

export function elipse(sel, modo, r) {
  const cx0 = (r.x0 + r.x1) / 2;
  const cy0 = (r.y0 + r.y1) / 2;
  const rx = Math.abs(r.x1 - r.x0) / 2;
  const ry = Math.abs(r.y1 - r.y0) / 2;
  if (rx < 2 || ry < 2) return false;

  comporSelecao(sel, modo, (cx) => {
    cx.beginPath();
    cx.ellipse(cx0, cy0, rx, ry, 0, 0, Math.PI * 2);
    cx.fill();
  });
  return true;
}

export function poligono(sel, modo, pts) {
  if (pts.length < 3) return false;

  comporSelecao(sel, modo, (cx) => {
    cx.beginPath();
    cx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i].x, pts[i].y);
    cx.closePath();
    cx.fill();
  });
  return true;
}

// O laço à mão livre treme. Uma média móvel de três pontos tira o serrilhado
// sem cortar cantos de verdade.
export function suavizar(pts) {
  if (pts.length < 4) return pts;

  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    out.push({
      x: (pts[i - 1].x + pts[i].x + pts[i + 1].x) / 3,
      y: (pts[i - 1].y + pts[i].y + pts[i + 1].y) / 3
    });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ── A varinha mágica ──
//
// Flood fill a partir do clique. A métrica não é "a cor é igual?" — é
// luminância E croma, pesados. Comparar só o RGB cru faria a varinha parar numa
// sombra do mesmo objeto e atravessar para outro objeto de brilho parecido.
//
// A borda ganha alfa parcial perto do limiar: sem isso o recorte teria degrau
// de serra.
export function varinha(sel, modo, pixels, w, h, p, tolerancia) {
  const px = Math.round(p.x);
  const py = Math.round(p.y);
  if (px < 0 || py < 0 || px >= w || py >= h) return false;

  const i0 = (py * w + px) * 4;
  const r0 = pixels[i0], g0 = pixels[i0 + 1], b0 = pixels[i0 + 2];
  const refLum = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;

  const limiar = 8 + tolerancia * 1.2;

  const visto = new Uint8Array(w * h);
  const forma = document.createElement('canvas');
  forma.width = w; forma.height = h;
  const fd = forma.getContext('2d').createImageData(w, h);

  const pilha = [px + py * w];

  while (pilha.length) {
    const idx = pilha.pop();
    if (visto[idx]) continue;
    visto[idx] = 1;

    const ii = idx * 4;
    const pr = pixels[ii], pg = pixels[ii + 1], pb = pixels[ii + 2];
    const pLum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;

    const difLum = Math.abs(pLum - refLum);
    const difCroma =
      Math.abs((pr - pLum) - (r0 - refLum)) +
      Math.abs((pg - pLum) - (g0 - refLum)) +
      Math.abs((pb - pLum) - (b0 - refLum));

    const d = difLum + difCroma * 0.6;
    if (d > limiar) continue;

    // Antialias: perto do limiar, meio-selecionado
    const a = d < limiar * 0.75
      ? 255
      : Math.round(255 * (1 - (d - limiar * 0.75) / (limiar * 0.25)));

    fd.data[ii] = 255; fd.data[ii + 1] = 255; fd.data[ii + 2] = 255;
    fd.data[ii + 3] = a;

    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0)     pilha.push(idx - 1);
    if (x < w - 1) pilha.push(idx + 1);
    if (y > 0)     pilha.push(idx - w);
    if (y < h - 1) pilha.push(idx + w);
  }

  forma.getContext('2d').putImageData(fd, 0, 0);
  comporSelecao(sel, modo, (cx) => cx.drawImage(forma, 0, 0));
  return true;
}

// ── A seleção rápida ──
//
// Como a varinha, mas limitada a uma janela ao redor da pincelada — e ela PARA
// em bordas. O gradiente local alto significa "aqui muda de coisa": a
// propagação não atravessa. É isso que faz a pincelada respeitar o contorno do
// objeto em vez de vazar para o fundo.
export function selecaoRapida(sel, modo, pixels, w, h, p, tolerancia, raio) {
  const px = Math.round(p.x);
  const py = Math.round(p.y);
  if (px < 0 || py < 0 || px >= w || py >= h) return;

  const i0 = (py * w + px) * 4;
  const r0 = pixels[i0], g0 = pixels[i0 + 1], b0 = pixels[i0 + 2];
  const refLum = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;

  const limiar = 8 + tolerancia * 1.3;
  const bordaLimiar = 26 + (100 - Math.min(100, tolerancia)) * 0.25;

  const x0 = Math.max(0, px - raio), x1 = Math.min(w - 1, px + raio);
  const y0 = Math.max(0, py - raio), y1 = Math.min(h - 1, py + raio);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

  const lum = (ii) => 0.2126 * pixels[ii] + 0.7152 * pixels[ii + 1] + 0.0722 * pixels[ii + 2];

  const grad = (ii) => {
    const L = lum(ii);
    const gx = Math.abs(lum(ii + 4) - L) + Math.abs(L - lum(ii - 4));
    const gy = Math.abs(lum(ii + w * 4) - L) + Math.abs(L - lum(ii - w * 4));
    return gx + gy;
  };

  const cx = sel.getContext('2d');
  const buf = cx.getImageData(x0, y0, bw, bh);
  const bd = buf.data;
  const sub = modo === 'subtrair';

  const visto = new Uint8Array(bw * bh);
  const pilha = [(px - x0) + (py - y0) * bw];

  while (pilha.length) {
    const bi = pilha.pop();
    if (bi < 0 || bi >= bw * bh || visto[bi]) continue;
    visto[bi] = 1;

    const lx = bi % bw, ly = (bi / bw) | 0;
    const gxp = x0 + lx, gyp = y0 + ly;

    const dd = Math.hypot(gxp - px, gyp - py);
    if (dd > raio) continue;

    const ii = (gyp * w + gxp) * 4;
    const pr = pixels[ii], pg = pixels[ii + 1], pb = pixels[ii + 2];
    const pLum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;

    const difLum = Math.abs(pLum - refLum);
    const difCroma =
      Math.abs((pr - pLum) - (r0 - refLum)) +
      Math.abs((pg - pLum) - (g0 - refLum)) +
      Math.abs((pb - pLum) - (b0 - refLum));

    if (difLum + difCroma * 0.6 > limiar) continue;

    const bo = bi * 4;
    if (sub) {
      bd[bo + 3] = 0;
    } else {
      bd[bo] = 255; bd[bo + 1] = 255; bd[bo + 2] = 255; bd[bo + 3] = 255;
    }

    // Só atravessa se NÃO houver borda forte entre os vizinhos
    const g = grad(ii);
    if (g < bordaLimiar) {
      if (gxp > x0) pilha.push(bi - 1);
      if (gxp < x1) pilha.push(bi + 1);
      if (gyp > y0) pilha.push(bi - bw);
      if (gyp < y1) pilha.push(bi + bw);
    }
  }

  cx.putImageData(buf, x0, y0);
}

// ── Tudo e nada ──
export function tudo(sel) {
  comporSelecao(sel, 'novo', (cx) => cx.fillRect(0, 0, sel.width, sel.height));
}

export function inverter(sel) {
  const cx = sel.getContext('2d');
  const img = cx.getImageData(0, 0, sel.width, sel.height);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
    d[i + 3] = 255 - d[i + 3];
  }
  cx.putImageData(img, 0, 0);
}

// ── As formiguinhas ──
//
// O contorno é traçado como POLILINHAS conectadas, não como pixels soltos. É a
// única forma de o tracejado "andar": um dash precisa de um caminho contínuo
// para correr por cima. Pintar pixel a pixel daria uma borda estática.
export function tracarContornos(sel, w, h) {
  const md = sel.getContext('2d').getImageData(0, 0, w, h).data;

  // Numa imagem de 4000px, traçar cada pixel produziria centenas de milhares de
  // segmentos — e a animação morreria. A amostragem mantém o contorno fiel o
  // bastante para o olho e leve o bastante para os 60fps.
  const passo = Math.max(1, Math.round(Math.max(w, h) / 900));
  const gw = Math.floor(w / passo) + 1;
  const gh = Math.floor(h / passo) + 1;

  const grade = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const sx = Math.min(w - 1, gx * passo);
      const sy = Math.min(h - 1, gy * passo);
      grade[gy * gw + gx] = md[(sy * w + sx) * 4 + 3] >= 128 ? 1 : 0;
    }
  }

  const dentro = (gx, gy) => {
    if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) return 0;
    return grade[gy * gw + gx];
  };

  // Cada aresta onde o dentro vira fora é um segmento da borda
  const segs = [];
  for (let y = 0; y <= gh; y++) {
    for (let x = 0; x <= gw; x++) {
      if (dentro(x, y - 1) !== dentro(x, y)) segs.push([x, y, x + 1, y]);
      if (dentro(x - 1, y) !== dentro(x, y)) segs.push([x, y, x, y + 1]);
    }
  }

  // Liga os segmentos pelas pontas que compartilham
  const mapa = {};
  const chave = (x, y) => x + ',' + y;

  segs.forEach((s, i) => {
    const a = chave(s[0], s[1]);
    const b = chave(s[2], s[3]);
    (mapa[a] = mapa[a] || []).push({ i, pt: [s[2], s[3]] });
    (mapa[b] = mapa[b] || []).push({ i, pt: [s[0], s[1]] });
  });

  const usado = new Uint8Array(segs.length);
  const paths = [];

  for (let si = 0; si < segs.length; si++) {
    if (usado[si]) continue;

    const s = segs[si];
    usado[si] = 1;

    const path = [[s[0] * passo, s[1] * passo], [s[2] * passo, s[3] * passo]];
    let atual = chave(s[2], s[3]);
    let guarda = 0;

    while (guarda++ < 200000) {
      const lista = mapa[atual] || [];
      let prox = null;
      for (const it of lista) {
        if (!usado[it.i]) { prox = it; break; }
      }
      if (!prox) break;

      usado[prox.i] = 1;
      path.push([prox.pt[0] * passo, prox.pt[1] * passo]);
      atual = chave(prox.pt[0], prox.pt[1]);
    }

    if (path.length > 1) paths.push(path);
  }

  return paths;
}

// ── O pincel ──
//
// Um pincel não é um ponto: é um RASTRO. O mouse dispara eventos esparsos, e
// desenhar só onde ele reportou deixaria uma trilha de bolinhas. Os pontos
// intermediários são interpolados — é isso que faz o traço ser contínuo.
export function pincelada(alvo, de, para, opts) {
  const cx = alvo.getContext('2d');
  const { raio, dureza, opacidade, fluxo, cor, apagar } = opts;

  const pts = [];
  if (de) {
    const dist = Math.hypot(para.x - de.x, para.y - de.y);
    const passo = Math.max(1, raio * 0.2);
    const n = Math.max(1, Math.floor(dist / passo));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      pts.push({ x: de.x + (para.x - de.x) * t, y: de.y + (para.y - de.y) * t });
    }
  } else {
    pts.push(para);
  }

  cx.save();
  cx.globalAlpha = (opacidade / 100) * (fluxo / 100);

  // A borracha não pinta de branco: ela REMOVE. `destination-out` apaga o alfa
  // onde o pincel passa — pintar de branco só deixaria uma mancha branca.
  if (apagar) cx.globalCompositeOperation = 'destination-out';

  for (const pt of pts) {
    // A dureza é o raio do miolo sólido. O resto é o esfumado — e é o que
    // separa um carimbo de um pincel.
    const g = cx.createRadialGradient(pt.x, pt.y, raio * (dureza / 100), pt.x, pt.y, raio);
    const c = apagar ? '0,0,0' : cor;

    g.addColorStop(0, `rgba(${c},1)`);
    g.addColorStop(1, `rgba(${c},0)`);

    cx.fillStyle = g;
    cx.beginPath();
    cx.arc(pt.x, pt.y, raio, 0, Math.PI * 2);
    cx.fill();
  }

  cx.restore();
}

// Converte "#ffffff" -> "255,255,255"
export function hexParaRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// ── Desfoque gaussiano (para a ferramenta de desfoque) ──
// Reusa o box blur: três passadas de box aproximam uma gaussiana bem o
// bastante, e são muito mais baratas.
export function desfocar(canvas, raio, sel) {
  const cx = canvas.getContext('2d');
  const img = cx.getImageData(0, 0, canvas.width, canvas.height);

  const original = sel ? new Uint8ClampedArray(img.data) : null;

  for (let i = 0; i < 3; i++) {
    boxBlurAlfa(img.data, canvas.width, canvas.height, Math.max(1, Math.round(raio / 3)));
  }

  // Com seleção: só dentro dela. O resto volta ao que era.
  if (sel && original) {
    const sd = sel.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const d = img.data;

    for (let i = 0; i < d.length; i += 4) {
      const a = sd[i + 3] / 255;
      d[i]     = d[i]     * a + original[i]     * (1 - a);
      d[i + 1] = d[i + 1] * a + original[i + 1] * (1 - a);
      d[i + 2] = d[i + 2] * a + original[i + 2] * (1 - a);
      d[i + 3] = d[i + 3] * a + original[i + 3] * (1 - a);
    }
  }

  cx.putImageData(img, 0, 0);
}

// Desfoque de movimento: a média corre numa direção só.
export function desfoqueMovimento(canvas, dist, angulo, sel) {
  const cx = canvas.getContext('2d');
  const img = cx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width, h = canvas.height;
  const d = img.data;
  const orig = new Uint8ClampedArray(d);

  const rad = (angulo * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const n = Math.max(1, Math.round(dist));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, cont = 0;

      for (let k = -n; k <= n; k++) {
        const sx = Math.round(x + dx * k);
        const sy = Math.round(y + dy * k);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;

        const ii = (sy * w + sx) * 4;
        r += orig[ii]; g += orig[ii + 1]; b += orig[ii + 2]; a += orig[ii + 3];
        cont++;
      }

      if (!cont) continue;
      const i = (y * w + x) * 4;
      d[i] = r / cont; d[i + 1] = g / cont; d[i + 2] = b / cont; d[i + 3] = a / cont;
    }
  }

  if (sel) {
    const sd = sel.getContext('2d').getImageData(0, 0, w, h).data;
    for (let i = 0; i < d.length; i += 4) {
      const t = sd[i + 3] / 255;
      d[i]     = d[i]     * t + orig[i]     * (1 - t);
      d[i + 1] = d[i + 1] * t + orig[i + 1] * (1 - t);
      d[i + 2] = d[i + 2] * t + orig[i + 2] * (1 - t);
      d[i + 3] = d[i + 3] * t + orig[i + 3] * (1 - t);
    }
  }

  cx.putImageData(img, 0, 0);
}

// Box blur que também borra o ALFA — necessário para desfocar camadas com
// transparência sem deixar franja dura na borda.
function boxBlurAlfa(d, w, h, raio) {
  const src = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) src[i] = d[i];

  const tmp = new Float32Array(d.length);
  const win = raio * 2 + 1;

  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 4; c++) {
      let soma = 0;
      for (let x = -raio; x <= raio; x++) {
        soma += src[(y * w + Math.max(0, Math.min(w - 1, x))) * 4 + c];
      }
      for (let x = 0; x < w; x++) {
        tmp[(y * w + x) * 4 + c] = soma / win;
        const ent = Math.min(w - 1, x + raio + 1);
        const sai = Math.max(0, x - raio);
        soma += src[(y * w + ent) * 4 + c] - src[(y * w + sai) * 4 + c];
      }
    }
  }

  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      let soma = 0;
      for (let y = -raio; y <= raio; y++) {
        soma += tmp[(Math.max(0, Math.min(h - 1, y)) * w + x) * 4 + c];
      }
      for (let y = 0; y < h; y++) {
        d[(y * w + x) * 4 + c] = soma / win;
        const ent = Math.min(h - 1, y + raio + 1);
        const sai = Math.max(0, y - raio);
        soma += tmp[(ent * w + x) * 4 + c] - tmp[(sai * w + x) * 4 + c];
      }
    }
  }
}
