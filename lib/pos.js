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
    img.crossOrigin = 'anonymous';   // o R2 devolve CORS; sem isto o canvas suja
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
export function largura(l) { return l.canvas.width  * l.escala; }
export function altura(l)  { return l.canvas.height * (l.escalaY != null ? l.escalaY : l.escala); }

// ── A fonte de uma camada ──
//
// Se a camada tem máscara, o pixel que vai para a tela não é o dela: é ela
// RECORTADA pela máscara. `destination-in` faz esse recorte usando o alfa da
// máscara — por isso a máscara precisa virar alfa antes.
export function fonteDaCamada(l) {
  if (!l.mascara) return l.canvas;

  const fora = canvasVazio(l.canvas.width, l.canvas.height);
  const cx   = fora.getContext('2d');

  cx.drawImage(l.canvas, 0, 0);

  // A máscara é cinza; o recorte precisa de alfa. Converte-se um no outro:
  // o brilho de cada pixel vira a sua opacidade.
  const alfa = canvasVazio(l.canvas.width, l.canvas.height);
  const ax   = alfa.getContext('2d');
  ax.drawImage(l.mascara, 0, 0, l.canvas.width, l.canvas.height);

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
