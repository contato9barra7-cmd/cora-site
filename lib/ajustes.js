// ═══════════════════════════════════════════════════════════
//  O motor de ajustes — Camera Raw
//
//  Portado do plugin (posAjAplicarPixels e cia), pixel a pixel, para que a
//  mesma foto ajustada nos dois lugares saia igual. Mudar a matemática aqui
//  seria fazer o web mentir sobre o que o plugin faz.
//
//  A ordem das operações NÃO é arbitrária: white balance antes do tonal (senão
//  o ganho de luminância seria calculado sobre a cor errada), o tonal antes da
//  saturação (senão saturar-se-ia uma imagem que ainda vai clarear), e os
//  efeitos espaciais por último — eles leem a vizinhança, e precisam dela já
//  corrigida.
// ═══════════════════════════════════════════════════════════

// ── Os parâmetros, com os nomes do plugin ──
export function paramsPadrao() {
  return {
    luz:     { exposicao: 0, contraste: 0, realces: 0, sombras: 0, brancos: 0, pretos: 0 },
    cor:     { temp: 0, tint: 0, vibracao: 0, saturacao: 0 },
    efeitos: {
      textura: 0, clareza: 0, dehaze: 0,
      vinheta: 0, vinhetaPonto: 50, vinhetaArred: 0, vinhetaDifusao: 50,
      grao: 0, graoTam: 25, graoAsp: 50
    },
    detalhe: { nitidez: 0, ruido: 0 },
    curva: {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      r:   [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      g:   [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      b:   [{ x: 0, y: 0 }, { x: 255, y: 255 }]
    },
    mixer: {
      vermelho: { h: 0, s: 0, l: 0 }, laranja:  { h: 0, s: 0, l: 0 },
      amarelo:  { h: 0, s: 0, l: 0 }, verde:    { h: 0, s: 0, l: 0 },
      ciano:    { h: 0, s: 0, l: 0 }, azul:     { h: 0, s: 0, l: 0 },
      roxo:     { h: 0, s: 0, l: 0 }, magenta:  { h: 0, s: 0, l: 0 }
    }
  };
}

// Vale a pena processar? Percorrer milhões de pixels para aplicar zero é
// desperdício — e faz o preview piscar à toa.
export function temAjuste(p) {
  const q = (o) => Object.values(o).some((v) => v !== 0);

  if (q(p.luz) || q(p.cor) || q(p.detalhe)) return true;

  // Nos efeitos, nem todo campo em zero significa "sem efeito": vinhetaPonto,
  // graoTam e graoAsp têm padrão diferente de zero e não valem sozinhos.
  const e = p.efeitos;
  if (e.textura || e.clareza || e.dehaze || e.vinheta || e.grao) return true;

  if (mixerTemAjuste(p.mixer)) return true;
  if (curvaMexida(p.curva)) return true;

  return false;
}

function curvaMexida(c) {
  return ['rgb', 'r', 'g', 'b'].some((k) => {
    const p = c[k];
    if (p.length !== 2) return true;   // ganhou pontos
    return !(p[0].x === 0 && p[0].y === 0 && p[1].x === 255 && p[1].y === 255);
  });
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const c255 = (v) => { v = v | 0; return v < 0 ? 0 : v > 255 ? 255 : v; };

// ── A curva ──
// ── A LUT da curva, suave ──
//
// Antes era interpolação LINEAR: os pontos eram ligados por retas, e a "curva"
// saía com quinas. Agora usa uma spline monotônica (Fritsch–Carlson): a linha
// passa por todos os pontos com tangentes suaves, mas NUNCA ultrapassa os
// valores dos pontos — o que evita as ondulações que uma spline comum criaria
// (e que, numa curva tonal, viram faixas de brilho artificiais).
//
// Consultar uma tabela de 256 entradas é o que torna a curva barata: a conta é
// feita 256 vezes, não uma por pixel.
export function curvaLUT(pts) {
  const lut = new Array(256);
  const s = [...pts].sort((a, b) => a.x - b.x);
  const n = s.length;

  if (n < 2) {
    const y = n ? s[0].y : 0;
    for (let x = 0; x < 256; x++) lut[x] = Math.max(0, Math.min(255, Math.round(y)));
    return lut;
  }

  // Inclinações dos segmentos (delta) e das tangentes em cada ponto (m).
  const dx = [], dy = [], delta = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = s[i + 1].x - s[i].x || 1;
    dy[i] = s[i + 1].y - s[i].y;
    delta[i] = dy[i] / dx[i];
  }

  const m = new Array(n);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    // Se a curva muda de direção no ponto, a tangente é 0 (evita ultrapassar).
    if (delta[i - 1] * delta[i] <= 0) {
      m[i] = 0;
    } else {
      m[i] = (delta[i - 1] + delta[i]) / 2;
    }
  }

  // Condição de monotonicidade (Fritsch–Carlson): limita as tangentes para a
  // interpolação não criar picos.
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }

  // Preenche a LUT avaliando o polinômio de Hermite em cada x.
  for (let x = 0; x < 256; x++) {
    // Antes/depois das pontas: mantém o valor da ponta (curva plana fora).
    if (x <= s[0].x) { lut[x] = clampByte(s[0].y); continue; }
    if (x >= s[n - 1].x) { lut[x] = clampByte(s[n - 1].y); continue; }

    let i = 0;
    while (i < n - 1 && x > s[i + 1].x) i++;

    const t = (x - s[i].x) / dx[i];
    const t2 = t * t, t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const y = h00 * s[i].y + h10 * dx[i] * m[i]
            + h01 * s[i + 1].y + h11 * dx[i] * m[i + 1];

    lut[x] = clampByte(y);
  }

  return lut;
}

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

// ── O misturador HSL ──
const FAIXAS = [
  ['vermelho', 0], ['laranja', 30], ['amarelo', 60], ['verde', 120],
  ['ciano', 180], ['azul', 240], ['roxo', 280], ['magenta', 320]
];

function mixerTemAjuste(mix) {
  return Object.values(mix).some((a) => a.h || a.s || a.l);
}

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h, s;
  const l = (mx + mn) / 2;

  if (mx === mn) { h = s = 0; }
  else {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r)      h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else               h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hsl2rgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];

  const f = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}

// O ajuste só vale PERTO da faixa: o peso cai com a distância do matiz. Sem
// isso, mexer no "azul" mudaria o ciano e o roxo junto, e a imagem inteira
// escorregaria de cor.
function mixerPixel(r, g, b, mix) {
  const hsl = rgb2hsl(r, g, b);
  const hh = hsl[0] * 360;

  let melhor = null;
  let dist = 999;

  for (const [nome, ang] of FAIXAS) {
    const d = Math.min(Math.abs(hh - ang), 360 - Math.abs(hh - ang));
    if (d < dist) { dist = d; melhor = nome; }
  }

  const aj = mix[melhor];
  if (!aj || (!aj.h && !aj.s && !aj.l)) return [r, g, b];

  const peso = Math.max(0, 1 - dist / 40);

  hsl[0] = (hsl[0] + (aj.h / 100) * 0.1 * peso + 1) % 1;
  hsl[1] = Math.max(0, Math.min(1, hsl[1] * (1 + (aj.s / 100) * peso)));
  hsl[2] = Math.max(0, Math.min(1, hsl[2] * (1 + (aj.l / 100) * peso)));

  return hsl2rgb(hsl[0], hsl[1], hsl[2]);
}

// ═══════════════════════════════════════════════════════════
//  O núcleo — os pixels
// ═══════════════════════════════════════════════════════════
export function aplicarPixels(d, w, h, p) {
  const lutRGB = curvaLUT(p.curva.rgb);
  const lutR   = curvaLUT(p.curva.r);
  const lutG   = curvaLUT(p.curva.g);
  const lutB   = curvaLUT(p.curva.b);

  const exposicao = p.luz.exposicao / 100;
  const contraste = p.luz.contraste / 100;
  const realces   = p.luz.realces   / 100;
  const sombras   = p.luz.sombras   / 100;
  const brancos   = p.luz.brancos   / 100;
  const pretos    = p.luz.pretos    / 100;

  const temp = p.cor.temp / 100;
  const tint = p.cor.tint / 100;
  const vib  = p.cor.vibracao / 100;
  const sat  = p.cor.saturacao / 100;

  const dehaze   = p.efeitos.dehaze / 100;
  const hslAtivo = mixerTemAjuste(p.mixer);

  // A exposição é em STOPS, não em porcentagem: dobrar a luz é somar um stop.
  // Por isso a potência de 2 — e não uma soma linear, que clarearia as sombras
  // muito mais do que as luzes.
  const expGain = Math.pow(2, exposicao * 1.6);

  // Temperatura e tinte como escala de canal — o que um white balance de
  // verdade faz. Quente = R sobe, B desce.
  const rT = 1 + temp * 0.35;
  const bT = 1 - temp * 0.35;
  const gT = 1 - tint * 0.30;

  // ── A LUT tonal ──
  // Exposição, contraste, realces, sombras, brancos e pretos são todos função
  // da LUMINÂNCIA. Pré-computá-los em 256 passos e depois aplicar o resultado
  // como GANHO sobre o pixel é o que preserva a cor: multiplicar os três canais
  // pelo mesmo fator muda o brilho sem torcer o matiz.
  const tone = new Float32Array(256);

  for (let v = 0; v < 256; v++) {
    const x = v / 255;
    let y = x * expGain;

    y += pretos  * 0.16 * (1 - smooth01(y * 2));
    y += brancos * 0.16 * smooth01((y - 0.5) * 2);

    const wSombra = Math.pow(1 - clamp01(y), 2.2);
    const wRealce = Math.pow(clamp01(y), 2.2);

    y += sombras * 0.22 * wSombra;
    y += realces * 0.22 * wRealce;

    if (contraste) {
      const c = contraste * 0.55;
      y = (y - 0.5) * (1 + c) + 0.5;
      y += c * 0.10 * Math.sin((clamp01(y) - 0.5) * Math.PI);
    }

    tone[v] = clamp01(y);
  }

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

    // 1) White balance
    r *= rT; g *= gT; b *= bT;

    // 2) Tonal, preservando a cor
    const lum  = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const lum0 = clamp01(lum / 255);
    const nova = tone[Math.max(0, Math.min(255, lum | 0))];
    const ganho = lum0 > 0.001 ? (nova / lum0) : 1;

    r *= ganho; g *= ganho; b *= ganho;

    // 3) Dehaze
    if (dehaze) {
      r = ((r / 255 - 0.5) * (1 + dehaze * 0.5) + 0.5) * 255;
      g = ((g / 255 - 0.5) * (1 + dehaze * 0.5) + 0.5) * 255;
      b = ((b / 255 - 0.5) * (1 + dehaze * 0.5) + 0.5) * 255;
    }

    // 4) Saturação e vibração
    //
    // A vibração não é uma saturação mais fraca: ela dá MAIS ganho onde a cor
    // já é fraca, e poupa a pele. É por isso que ela não deixa o rosto laranja
    // — coisa que a saturação faz.
    const avg = (r + g + b) / 3;
    const mx  = Math.max(r, g, b);
    const mn  = Math.min(r, g, b);
    const curSat = (mx - mn) / 255;

    let fSat = 1 + sat;

    if (vib) {
      const ehPele = (r > g && g > b) ? 0.5 : 1.0;
      fSat += vib * (1 - curSat) * 1.2 * ehPele;
    }

    r = avg + (r - avg) * fSat;
    g = avg + (g - avg) * fSat;
    b = avg + (b - avg) * fSat;

    // 5) Curva: a mestre primeiro, depois cada canal
    r = lutRGB[c255(r)]; g = lutRGB[c255(g)]; b = lutRGB[c255(b)];
    r = lutR[c255(r)];   g = lutG[c255(g)];   b = lutB[c255(b)];

    // 6) Misturador
    if (hslAtivo) {
      const o = mixerPixel(r, g, b, p.mixer);
      r = o[0]; g = o[1]; b = o[2];
    }

    d[i] = c255(r); d[i + 1] = c255(g); d[i + 2] = c255(b);
  }

  // ── Os efeitos espaciais ──
  // Vêm por último porque leem a VIZINHANÇA: cada pixel depende dos outros, e
  // eles precisam já estar corrigidos.
  if (p.efeitos.clareza)  claridade(d, w, h, p.efeitos.clareza / 100);
  if (p.efeitos.textura)  textura(d, w, h, p.efeitos.textura / 100);
  if (p.detalhe.nitidez)  nitidez(d, w, h, p.detalhe.nitidez / 100);
  if (p.detalhe.ruido)    reduzRuido(d, w, h, p.detalhe.ruido / 100);
  if (p.efeitos.vinheta)  vinheta(d, w, h, p.efeitos);
  if (p.efeitos.grao)     grao(d, w, h, p.efeitos);
}

// ── Nitidez (unsharp mask) ──
// O limiar existe para não amplificar ruído: diferenças mínimas entre vizinhos
// são grão, não borda.
function nitidez(d, w, h, amt) {
  const o = new Uint8ClampedArray(d);
  const k = amt * 1.1;
  const lim = 3;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const cen = o[i + c];
        const viz = (o[i - 4 + c] + o[i + 4 + c] + o[i - w * 4 + c] + o[i + w * 4 + c]) / 4;
        const dif = cen - viz;
        if (Math.abs(dif) > lim) d[i + c] = c255(cen + dif * k * 1.6);
      }
    }
  }
}

// ── Textura: micro-detalhe, raio menor e mais suave que a nitidez ──
function textura(d, w, h, amt) {
  const o = new Uint8ClampedArray(d);
  const k = amt * 0.6;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const cen = o[i + c];
        const viz = (
          o[i - 4 + c] + o[i + 4 + c] +
          o[i - w * 4 + c] + o[i + w * 4 + c] +
          o[i - w * 4 - 4 + c] + o[i - w * 4 + 4 + c] +
          o[i + w * 4 - 4 + c] + o[i + w * 4 + 4 + c]
        ) / 8;
        d[i + c] = c255(cen + (cen - viz) * k);
      }
    }
  }
}

// ── Redução de ruído com preservação de borda ──
// Onde a variação local é grande há uma BORDA, não ruído — ali se suaviza
// menos. Sem isso, reduzir ruído derreteria os contornos.
function reduzRuido(d, w, h, amt) {
  const o = new Uint8ClampedArray(d);
  const limiteBorda = 28;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const cen = o[i + c];
        const soma = cen +
          o[i - 4 + c] + o[i + 4 + c] +
          o[i - w * 4 + c] + o[i + w * 4 + c] +
          o[i - w * 4 - 4 + c] + o[i - w * 4 + 4 + c] +
          o[i + w * 4 - 4 + c] + o[i + w * 4 + 4 + c];

        const media = soma / 9;
        const variacao = Math.abs(cen - media);
        const peso = amt * (1 - Math.min(1, variacao / limiteBorda));

        d[i + c] = c255(cen * (1 - peso) + media * peso);
      }
    }
  }
}

// ── Claridade: contraste local de raio grande, nos meios-tons ──
// É o que o Camera Raw chama de Clarity. Protege os extremos: puxar o contraste
// nas luzes estouraria, e nas sombras entupiria.
function claridade(d, w, h, amt) {
  const blur = boxBlur(d, w, h, Math.max(3, Math.round(Math.min(w, h) * 0.03)));
  const k = amt * 0.7;

  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    let mid = 1 - Math.abs(lum - 0.5) * 1.6;
    if (mid < 0) mid = 0;

    const f = k * mid;
    d[i]     = c255(d[i]     + (d[i]     - blur[i])     * f);
    d[i + 1] = c255(d[i + 1] + (d[i + 1] - blur[i + 1]) * f);
    d[i + 2] = c255(d[i + 2] + (d[i + 2] - blur[i + 2]) * f);
  }
}

// Box blur separável: a soma corre numa janela deslizante, então o custo não
// cresce com o raio. Um blur ingênuo de raio 30 seria lento demais para um
// preview ao vivo.
function boxBlur(d, w, h, raio) {
  const src = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) src[i] = d[i];

  const tmp = new Float32Array(d.length);
  const win = raio * 2 + 1;

  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 3; c++) {
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

  const out = new Float32Array(d.length);

  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let soma = 0;
      for (let y = -raio; y <= raio; y++) {
        soma += tmp[(Math.max(0, Math.min(h - 1, y)) * w + x) * 4 + c];
      }
      for (let y = 0; y < h; y++) {
        out[(y * w + x) * 4 + c] = soma / win;
        const ent = Math.min(h - 1, y + raio + 1);
        const sai = Math.max(0, y - raio);
        soma += tmp[(ent * w + x) * 4 + c] - tmp[(sai * w + x) * 4 + c];
      }
    }
  }

  return out;
}

// ── Vinheta ──
// Negativa escurece, positiva clareia. O arredondamento é o expoente de uma
// SUPERELIPSE: 2 dá uma elipse, e quanto maior, mais o contorno vira um
// retângulo de cantos redondos — que é o que se quer numa foto 16:9.
function vinheta(d, w, h, ef) {
  const amt     = ef.vinheta / 100;
  const ponto   = (ef.vinhetaPonto   != null ? ef.vinhetaPonto   : 50) / 100;
  const arred   = (ef.vinhetaArred   != null ? ef.vinhetaArred   : 0)  / 100;
  const difusao = (ef.vinhetaDifusao != null ? ef.vinhetaDifusao : 50) / 100;

  const cx = w / 2, cy = h / 2;
  const expo = arred < 0 ? 2 : 2 + Math.max(0, arred) * 4;
  const raioInt = 0.30 + ponto * 0.65;
  const forca = Math.abs(amt);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      const nx = Math.abs((x - cx) / cx);
      const ny = Math.abs((y - cy) / cy);
      const dist = Math.pow(Math.pow(nx, expo) + Math.pow(ny, expo), 1 / expo);

      let t = clamp01((dist - raioInt) / Math.max(0.001, 1.30 - raioInt));

      if (difusao <= 0.001) {
        t = t > 0 ? 1 : 0;
      } else {
        const e = 1 / Math.max(0.05, difusao * 1.6);
        t = Math.pow(t * t * (3 - 2 * t), e);
      }

      const efeito = forca * t;

      if (amt < 0) {
        const f = 1 - efeito;
        d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
      } else if (amt > 0) {
        const a = efeito * 255;
        d[i] = c255(d[i] + a); d[i + 1] = c255(d[i + 1] + a); d[i + 2] = c255(d[i + 2] + a);
      }
    }
  }
}

// ── Granulado ──
// O ruído é por CÉLULA, não por pixel: um grão de 1px some ao redimensionar a
// imagem. O tamanho da célula é o que dá a textura de filme.
function grao(d, w, h, ef) {
  const amt = ef.grao / 100;
  const tam = 1 + Math.round((ef.graoTam != null ? ef.graoTam : 25) / 100 * 4);
  const asp = 0.4 + (ef.graoAsp != null ? ef.graoAsp : 50) / 100 * 1.2;

  for (let y = 0; y < h; y += tam) {
    for (let x = 0; x < w; x += tam) {
      const n = (Math.random() - 0.5) * amt * 70 * asp;

      for (let yy = y; yy < Math.min(h, y + tam); yy++) {
        for (let xx = x; xx < Math.min(w, x + tam); xx++) {
          const i = (yy * w + xx) * 4;
          d[i] += n; d[i + 1] += n; d[i + 2] += n;
        }
      }
    }
  }
}

// ── A porta de entrada ──
// Recebe um canvas, devolve outro com os ajustes aplicados. O original não é
// tocado: os ajustes precisam ser reversíveis enquanto a janela está aberta.
export function aplicarEmCanvas(origem, p) {
  const c = document.createElement('canvas');
  c.width = origem.width;
  c.height = origem.height;

  const cx = c.getContext('2d');
  cx.drawImage(origem, 0, 0);

  if (!temAjuste(p)) return c;

  const img = cx.getImageData(0, 0, c.width, c.height);
  aplicarPixels(img.data, c.width, c.height, p);
  cx.putImageData(img, 0, 0);

  return c;
}

// ── Os sliders de cada aba ──
// (chave, rótulo, mínimo, máximo). Os que vão de -100 a 100 têm o zero no meio;
// os de 0 a 100 só somam.
export const ABAS_AJUSTE = [
  {
    id: 'luz', nome: 'Luz', grupo: 'luz',
    sliders: [
      { k: 'exposicao', nome: 'Exposição', min: -100, max: 100 },
      { k: 'contraste', nome: 'Contraste', min: -100, max: 100 },
      { k: 'realces',   nome: 'Realces',   min: -100, max: 100 },
      { k: 'sombras',   nome: 'Sombras',   min: -100, max: 100 },
      { k: 'brancos',   nome: 'Brancos',   min: -100, max: 100 },
      { k: 'pretos',    nome: 'Pretos',    min: -100, max: 100 }
    ]
  },
  {
    id: 'cor', nome: 'Cor', grupo: 'cor',
    sliders: [
      { k: 'temp',      nome: 'Temperatura', min: -100, max: 100 },
      { k: 'tint',      nome: 'Colorir',     min: -100, max: 100 },
      { k: 'vibracao',  nome: 'Vibração',    min: -100, max: 100 },
      { k: 'saturacao', nome: 'Saturação',   min: -100, max: 100 }
    ]
  },
  {
    id: 'efeitos', nome: 'Efeitos', grupo: 'efeitos',
    sliders: [
      { k: 'textura',        nome: 'Textura',    min: -100, max: 100 },
      { k: 'clareza',        nome: 'Claridade',  min: -100, max: 100 },
      { k: 'dehaze',         nome: 'Desembaçar', min: -100, max: 100 },
      { k: 'vinheta',        nome: 'Vinheta',    min: -100, max: 100 },
      { k: 'vinhetaPonto',   nome: 'Ponto médio',    min: 0, max: 100, filho: 'vinheta' },
      { k: 'vinhetaArred',   nome: 'Arredondamento', min: -100, max: 100, filho: 'vinheta' },
      { k: 'vinhetaDifusao', nome: 'Difusão',        min: 0, max: 100, filho: 'vinheta' },
      { k: 'grao',    nome: 'Granulado', min: 0, max: 100 },
      { k: 'graoTam', nome: 'Tamanho',   min: 0, max: 100, filho: 'grao' },
      { k: 'graoAsp', nome: 'Aspereza',  min: 0, max: 100, filho: 'grao' }
    ]
  },
  {
    id: 'detalhe', nome: 'Detalhe', grupo: 'detalhe',
    sliders: [
      { k: 'nitidez', nome: 'Nitidez',           min: 0, max: 100 },
      { k: 'ruido',   nome: 'Redução de ruído',  min: 0, max: 100 }
    ]
  }
];

// As oito cores do misturador, com o tom que as representa no botão
export const CORES_MIXER = [
  { k: 'vermelho', nome: 'Vermelho', hex: '#E24B4A' },
  { k: 'laranja',  nome: 'Laranja',  hex: '#EF9F27' },
  { k: 'amarelo',  nome: 'Amarelo',  hex: '#E8CF3A' },
  { k: 'verde',    nome: 'Verde',    hex: '#639922' },
  { k: 'ciano',    nome: 'Ciano',    hex: '#3FBFB4' },
  { k: 'azul',     nome: 'Azul',     hex: '#378ADD' },
  { k: 'roxo',     nome: 'Roxo',     hex: '#7F77DD' },
  { k: 'magenta',  nome: 'Magenta',  hex: '#D4537E' }
];

export const CANAIS_CURVA = [
  { k: 'rgb', nome: 'RGB',      cor: '#8E8E88' },
  { k: 'r',   nome: 'Vermelho', cor: '#E24B4A' },
  { k: 'g',   nome: 'Verde',    cor: '#639922' },
  { k: 'b',   nome: 'Azul',     cor: '#378ADD' }
];
