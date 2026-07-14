// ═══════════════════════════════════════════════════════════
//  O motor da Pós-produção
//
//  Aqui não há React. São canvas e pixels — a parte que o plugin faz em
//  `posCompor`, `posFonteCamada`, `posRasterizar`. Trazer isto para um
//  arquivo próprio mantém o componente sendo só o que ele deve ser: a tela.
//
//  Uma CAMADA é:
//    { id, tipo, nome, canvas, x, y, escala, escalaY, blend, opacidade,
//      visivel, mascara, grupo }
//
//  `canvas` é um <canvas> de verdade, com a imagem já desenhada. Guardar o
//  pixel em vez da <img> é o que permite pintar, apagar e mesclar — e é o
//  que o plugin faz.
//
//  Um GRUPO é uma camada de tipo 'grupo': não tem pixel próprio, só reúne
//  as que apontam para ele em `grupo`.
// ═══════════════════════════════════════════════════════════

let seq = 0;
export function novoId() { return 'l' + (++seq) + '_' + Date.now().toString(36); }

// ── Criar ──

// Do <img> para o canvas. É aqui que a imagem deixa de ser um arquivo e
// passa a ser pixel manipulável.
export function canvasDaImagem(img) {
  const c = document.createElement('canvas');
  c.width  = img.naturalWidth  || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

export function canvasVazio(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function clonarCanvas(src) {
  const c = canvasVazio(src.width, src.height);
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

// Carrega uma dataURL/URL e devolve o canvas. Toda entrada de imagem passa
// por aqui — do picker, do arquivo, do feed.
export function carregarCanvas(src) {
  return new Promise((ok, erro) => {
    const img = new Image();

    // `crossOrigin` só faz sentido para uma URL de outra origem — e é uma
    // aposta: se o servidor NÃO responder com CORS, o carregamento falha de
    // vez. Numa dataURL não há origem nenhuma, e pedir CORS só atrapalharia.
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';

    img.onload  = () => ok(canvasDaImagem(img));
    img.onerror = () => erro(new Error('Não foi possível abrir a imagem'));
    img.src = src;
  });
}

export function novaCamada(canvas, nome, extra = {}) {
  return {
    id: novoId(),
    tipo: 'imagem',
    nome,
    canvas,
    x: 0, y: 0,
    escala: 1,
    escalaY: null,          // null = mantém a proporção (usa `escala`)
    blend: 'source-over',
    opacidade: 100,
    visivel: true,
    mascara: null,          // canvas em tons de cinza: branco mostra, preto esconde
    grupo: null,
    ...extra
  };
}

export function novoGrupo(nome) {
  return {
    id: novoId(),
    tipo: 'grupo',
    nome,
    canvas: null,
    blend: 'source-over',
    opacidade: 100,
    visivel: true,
    aberto: true,
    grupo: null
  };
}

// ── Medidas ──
// ── O tamanho de uma camada na tela ──
//
// Um objeto inteligente CORTADO guarda o canvas inteiro, mas só exibe a
// `moldura`. O tamanho na tela é o da moldura — não o do canvas —, senão a
// caixa de transformação envolveria pixels que ninguém vê.
export function areaVisivel(l) {
  return l.moldura || { x: 0, y: 0, w: l.canvas.width, h: l.canvas.height };
}

export function largura(l) { return areaVisivel(l).w * l.escala; }
export function altura(l)  { return areaVisivel(l).h * (l.escalaY != null ? l.escalaY : l.escala); }

// ── A fonte de uma camada ──
//
// Se a camada tem máscara, o pixel que vai para a tela não é o dela: é ela
// RECORTADA pela máscara. `destination-in` faz esse recorte usando o alfa da
// máscara — por isso a máscara precisa virar alfa antes.
export function fonteDaCamada(l) {
  const m = l.moldura;

  // Sem máscara nem moldura, o canvas já é a fonte: nada a fazer.
  if (!l.mascara && !m) return l.canvas;

  // Com moldura (objeto inteligente cortado), a fonte é só o RECORTE dela. O
  // resto do canvas continua guardado — é o que torna o corte reversível — mas
  // não vai para a tela.
  const lw = m ? m.w : l.canvas.width;
  const lh = m ? m.h : l.canvas.height;

  const fora = canvasVazio(lw, lh);
  const cx   = fora.getContext('2d');

  if (m) cx.drawImage(l.canvas, m.x, m.y, m.w, m.h, 0, 0, lw, lh);
  else   cx.drawImage(l.canvas, 0, 0);

  if (!l.mascara) return fora;

  // A máscara é cinza; o recorte precisa de alfa. Converte-se um no outro:
  // o brilho de cada pixel vira a sua opacidade.
  //
  // Ela é montada no tamanho da MOLDURA, não do canvas: a fonte já foi recortada
  // acima, e uma máscara do tamanho do canvas inteiro sairia deslocada.
  const alfa = canvasVazio(lw, lh);
  const ax   = alfa.getContext('2d');

  if (m) {
    // A parte da máscara que corresponde à moldura
    const ex = l.mascara.width  / l.canvas.width;
    const ey = l.mascara.height / l.canvas.height;

    ax.drawImage(
      l.mascara,
      m.x * ex, m.y * ey, m.w * ex, m.h * ey,
      0, 0, lw, lh
    );
  } else {
    ax.drawImage(l.mascara, 0, 0, lw, lh);
  }

  const d = ax.getImageData(0, 0, alfa.width, alfa.height);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    // Luminância (a mesma fórmula do plugin)
    const luz = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114);
    p[i] = p[i + 1] = p[i + 2] = 0;
    p[i + 3] = luz;
  }
  ax.putImageData(d, 0, 0);

  cx.globalCompositeOperation = 'destination-in';
  cx.drawImage(alfa, 0, 0);
  cx.globalCompositeOperation = 'source-over';

  return fora;
}

// ── Compor ──
//
// Desenha todas as camadas visíveis, de baixo para cima, no canvas de saída.
// A ordem do array é de CIMA para baixo (como na coluna), então percorre-se
// ao contrário — quem está no fim do array é o fundo.
//
// Um grupo aplica a sua opacidade e o seu blend ao conjunto: para isso os
// filhos são compostos primeiro num canvas à parte, e só então esse canvas
// entra na tela. É o que dá ao grupo o mesmo poder de uma camada.
export function compor(camadas, w, h, destino) {
  const saida = destino || canvasVazio(w, h);
  saida.width = w; saida.height = h;

  const cx = saida.getContext('2d');
  cx.clearRect(0, 0, w, h);

  // De baixo para cima
  const ordem = [...camadas].reverse();

  // Os filhos de cada grupo, já na ordem certa
  const filhos = new Map();
  ordem.forEach((l) => {
    if (!l.grupo) return;
    if (!filhos.has(l.grupo)) filhos.set(l.grupo, []);
    filhos.get(l.grupo).push(l);
  });

  ordem.forEach((l) => {
    if (l.grupo) return;          // já será desenhada dentro do grupo dela
    if (!l.visivel) return;

    if (l.tipo === 'grupo') {
      const dentro = filhos.get(l.id) || [];
      if (!dentro.length) return;

      // O grupo é composto à parte, e só depois entra na tela — é assim que
      // a opacidade dele vale para o conjunto, e não para cada filho.
      const buf  = canvasVazio(w, h);
      const bx   = buf.getContext('2d');

      dentro.forEach((f) => {
        if (!f.visivel) return;
        desenhar(bx, f);
      });

      cx.globalAlpha = l.opacidade / 100;
      cx.globalCompositeOperation = l.blend;
      cx.drawImage(buf, 0, 0);
      cx.globalAlpha = 1;
      cx.globalCompositeOperation = 'source-over';
      return;
    }

    desenhar(cx, l);
  });

  return saida;
}

function desenhar(cx, l) {
  if (!l.canvas) return;

  cx.globalAlpha = l.opacidade / 100;
  cx.globalCompositeOperation = l.blend;

  cx.drawImage(
    fonteDaCamada(l),
    l.x, l.y,
    largura(l), altura(l)
  );

  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'source-over';
}

// ── A miniatura da coluna ──
export function thumb(l, lado = 80) {
  if (!l.canvas) return null;

  const c  = canvasVazio(lado, lado);
  const cx = c.getContext('2d');

  const r = Math.min(lado / l.canvas.width, lado / l.canvas.height);
  const w = l.canvas.width * r;
  const h = l.canvas.height * r;

  cx.drawImage(l.canvas, (lado - w) / 2, (lado - h) / 2, w, h);
  return c.toDataURL('image/png');
}

export function thumbMascara(l, lado = 80) {
  if (!l.mascara) return null;

  const c  = canvasVazio(lado, lado);
  const cx = c.getContext('2d');
  cx.fillStyle = '#000';
  cx.fillRect(0, 0, lado, lado);

  const r = Math.min(lado / l.mascara.width, lado / l.mascara.height);
  const w = l.mascara.width * r;
  const h = l.mascara.height * r;

  cx.drawImage(l.mascara, (lado - w) / 2, (lado - h) / 2, w, h);
  return c.toDataURL('image/png');
}

// ── Máscara ──
//
// Branco = mostra tudo. É o estado neutro: adicionar máscara não deve mudar
// nada na tela até que se pinte de preto.
export function mascaraBranca(w, h) {
  const c  = canvasVazio(w, h);
  const cx = c.getContext('2d');
  cx.fillStyle = '#fff';
  cx.fillRect(0, 0, w, h);
  return c;
}

// ── Rasterizar ──
//
// Achata a camada: aplica a máscara, a escala e a posição no pixel, e devolve
// uma camada nova, limpa, do tamanho da tela. Depois disto não há mais o que
// desfazer — o efeito virou imagem.
export function rasterizar(l, w, h) {
  const c  = canvasVazio(w, h);
  const cx = c.getContext('2d');

  cx.globalAlpha = l.opacidade / 100;
  cx.drawImage(fonteDaCamada(l), l.x, l.y, largura(l), altura(l));
  cx.globalAlpha = 1;

  return novaCamada(c, l.nome, {
    blend: l.blend,
    visivel: l.visivel,
    grupo: l.grupo
  });
}

// ── Mesclar numa cópia ──
// Tudo o que se vê vira UMA camada nova, no topo. As originais ficam.
export function mesclarCopia(camadas, w, h) {
  const c = compor(camadas, w, h);
  return novaCamada(c, 'Mesclada');
}

// ── Exportar ──
export function exportar(camadas, w, h, formato = 'image/png', qualidade = 1) {
  return compor(camadas, w, h).toDataURL(formato, qualidade);
}

// ── Os modos de mesclagem, com os nomes do plugin ──
export const BLENDS = [
  { val: 'source-over',  rotulo: 'Normal' },
  { val: 'multiply',     rotulo: 'Multiplicar' },
  { val: 'screen',       rotulo: 'Tela' },
  { val: 'overlay',      rotulo: 'Sobrepor' },
  { val: 'darken',       rotulo: 'Escurecer' },
  { val: 'lighten',      rotulo: 'Clarear' },
  { val: 'color-dodge',  rotulo: 'Subexposição de cor' },
  { val: 'color-burn',   rotulo: 'Superexposição de cor' },
  { val: 'hard-light',   rotulo: 'Luz direta' },
  { val: 'soft-light',   rotulo: 'Luz suave' },
  { val: 'difference',   rotulo: 'Diferença' },
  { val: 'exclusion',    rotulo: 'Exclusão' },
  { val: 'hue',          rotulo: 'Matiz' },
  { val: 'saturation',   rotulo: 'Saturação' },
  { val: 'color',        rotulo: 'Cor' },
  { val: 'luminosity',   rotulo: 'Luminosidade' }
];

// ── As proporções do crop (as mesmas do plugin) ──
export const RATIOS_CROP = [
  'livre', '1:1', '16:9', '9:16', '4:3', '3:4',
  '3:2', '2:3', '21:9', '4:5', '5:4'
];


// ── Cortar uma camada de verdade ──
//
// Cortar NÃO é só encolher o documento. Se os pixels de fora continuarem no
// canvas da camada, arrastá-la os traz de volta — e o corte era mentira.
//
// Mas o corte só é destrutivo numa camada RASTERIZADA. Num objeto inteligente
// o pixel é preservado por definição: ele só passa a ser exibido dentro de uma
// moldura menor. É a diferença entre cortar o papel e cobrir parte dele.
export function cortarCamada(l, x, y, w, h) {
  // O grupo não tem pixel próprio: só os filhos são cortados.
  if (l.tipo === 'grupo') return l;

  // ── Objeto inteligente: guarda tudo, mostra menos ──
  //
  // O canvas fica intacto. O que muda é a MOLDURA: um retângulo, em coordenadas
  // da camada, que diz o que aparece. Assim o corte é reversível — e escalar a
  // camada depois não perde a resolução que ficou de fora.
  if (l.smart) {
    const ew = largura(l);
    const eh = altura(l);

    // A área do corte, no espaço da camada
    const cx = ((x - l.x) / ew) * l.canvas.width;
    const cy = ((y - l.y) / eh) * l.canvas.height;
    const cw = (w / ew) * l.canvas.width;
    const ch = (h / eh) * l.canvas.height;

    // Compõe com a moldura que já existia: cortar duas vezes corta o que sobrou
    // da primeira, não a imagem inteira de novo.
    const m = l.moldura || { x: 0, y: 0, w: l.canvas.width, h: l.canvas.height };

    const nx = Math.max(m.x, cx);
    const ny = Math.max(m.y, cy);
    const nw = Math.min(m.x + m.w, cx + cw) - nx;
    const nh = Math.min(m.y + m.h, cy + ch) - ny;

    // A camada saiu inteira da área cortada: some.
    if (nw <= 0 || nh <= 0) return { ...l, visivel: false };

    return {
      ...l,
      moldura: { x: nx, y: ny, w: nw, h: nh },
      // Reposiciona: o canto de cima-esquerda passa a ser o da moldura nova.
      x: Math.max(0, l.x - x),
      y: Math.max(0, l.y - y)
    };
  }

  // ── Rasterizada: corta o pixel mesmo ──
  //
  // Um canvas novo, do tamanho da parte que ficou visível. O que estava fora é
  // jogado fora de verdade.
  const ew = largura(l);
  const eh = altura(l);

  // A interseção entre a camada e a área do corte, em coordenadas do documento
  const ix0 = Math.max(l.x, x);
  const iy0 = Math.max(l.y, y);
  const ix1 = Math.min(l.x + ew, x + w);
  const iy1 = Math.min(l.y + eh, y + h);

  const iw = ix1 - ix0;
  const ih = iy1 - iy0;

  // Não sobrou nada da camada dentro do corte
  if (iw <= 0 || ih <= 0) return null;

  // O novo canvas tem a resolução ORIGINAL da parte que sobrou — não a do
  // documento. Uma camada de 4K exibida a 30% não deve virar 30% de pixels ao
  // ser cortada; ela seria destruída sem que ninguém pedisse.
  const escX = l.canvas.width  / ew;
  const escY = l.canvas.height / eh;

  const rw = Math.max(1, Math.round(iw * escX));
  const rh = Math.max(1, Math.round(ih * escY));

  const c  = canvasVazio(rw, rh);
  const cx = c.getContext('2d');

  // De onde, no canvas da camada, começa o pedaço que sobrou
  const sx = (ix0 - l.x) * escX;
  const sy = (iy0 - l.y) * escY;
  const sw = iw * escX;
  const sh = ih * escY;

  cx.drawImage(l.canvas, sx, sy, sw, sh, 0, 0, rw, rh);

  // A máscara acompanha o mesmo corte, ou deixaria de bater com o pixel.
  let masc = null;
  if (l.mascara) {
    const mEscX = l.mascara.width  / l.canvas.width;
    const mEscY = l.mascara.height / l.canvas.height;

    masc = canvasVazio(Math.max(1, Math.round(rw * mEscX)),
                       Math.max(1, Math.round(rh * mEscY)));

    masc.getContext('2d').drawImage(
      l.mascara,
      sx * mEscX, sy * mEscY, sw * mEscX, sh * mEscY,
      0, 0, masc.width, masc.height
    );
  }

  return {
    ...l,
    canvas: c,
    mascara: masc,
    original: null,          // o pixel virgem foi cortado junto: já não vale
    // A camada passa a começar onde a parte visível começava, já no novo doc
    x: ix0 - x,
    y: iy0 - y,
    // A escala na tela não muda: o pedaço ocupa o mesmo espaço de antes
    escala:  iw / rw,
    escalaY: ih / rh
  };
}
