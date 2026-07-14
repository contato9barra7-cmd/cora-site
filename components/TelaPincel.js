'use client';
// ═══════════════════════════════════════════════════════════
//  TelaPincel — a área de trabalho do preenchimento e da expansão
//
//  Só a imagem e o que se faz DIRETAMENTE sobre ela. Os controles moram no
//  painel esquerdo (PainelPincel), onde a pessoa já procura tudo — sobre a
//  imagem, comiam o espaço do trabalho.
//
//  PREENCHIMENTO — pinta-se a área a trocar. A máscara vai preto-e-branco:
//  branco = regenerar, preto = preservar.
//
//  EXPANSÃO — arrasta-se uma moldura para FORA da imagem. O que sobra ao
//  redor é o que a IA cria. A máscara é o inverso.
// ═══════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react';
// ── Dilatação binária ──
//
//  A borda pintada nunca é exata: sobra um halo de pixels meio-transparentes
//  onde o traço esmaeceu. Sem dilatar, esse halo vira uma costura visível
//  entre o gerado e o preservado.
function dilatar(on, W, H, r) {
  if (r <= 0) return on;
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const linha = y * W;
    for (let x = 0; x < W; x++) {
      let hit = 0;
      for (let dx = -r; dx <= r && !hit; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < W && on[linha + xx]) hit = 1;
      }
      tmp[linha + x] = hit;
    }
  }
  const out = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let hit = 0;
      for (let dy = -r; dy <= r && !hit; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < H && tmp[yy * W + x]) hit = 1;
      }
      out[y * W + x] = hit;
    }
  }
  return out;
}
export default function TelaPincel({
  modo, base,
  ferramenta, tamanho,        // do painel: pincel | borracha, e o calibre
  proporcao,                  // da expansão: 'livre' | '16:9' | ...
  setProporcao,               // o inverter troca o rótulo também
  aoLimpar,                   // o painel pede para limpar
  aoMudarMoldura,             // devolve as dimensões ao painel
  onGerar                     // a página pede os bytes
}) {
  const wrapRef   = useRef(null);
  const pilhaRef  = useRef(null);
  const baseRef   = useRef(null);
  const drawRef   = useRef(null);
  const cursorRef = useRef(null);
  const [zoom, setZoom]     = useState(100);
  const [pintou, setPintou] = useState(false);
  // A moldura da expansão, em % de cada lado (0 = encostada na imagem)
  const [m, setM] = useState({ cima: 0, baixo: 0, esq: 0, dir: 0 });
  // A imagem pode sair do centro: arrastá-la escolhe o que a IA vai inventar
  // de cada lado. Em % do tamanho da imagem, relativo ao centro da moldura.
  const [desl, setDesl] = useState({ x: 0, y: 0 });

  // ── Desfazer (Ctrl+Z) ──
  //
  //  A pilha guarda o estado ANTES de cada gesto — não durante. Empilhar a
  //  cada pixel arrastado faria um Ctrl+Z desfazer meio pixel, e seriam
  //  centenas de passos para voltar um arraste.
  const historico = useRef([]);

  function empilhar() {
    historico.current.push({ m: { ...m }, desl: { ...desl } });
    if (historico.current.length > 50) historico.current.shift();
  }

  useEffect(() => {
    if (!ehExpansao) return;

    const tecla = (e) => {
      const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z';
      if (!z) return;

      // Se o foco está num campo de texto, o Ctrl+Z é dele.
      const alvo = e.target;
      if (alvo && /^(INPUT|TEXTAREA)$/.test(alvo.tagName)) return;

      const ant = historico.current.pop();
      if (!ant) return;

      e.preventDefault();
      setM(ant.m);
      setDesl(ant.desl);
    };

    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ehExpansao]);
  const [imanado, setImanado] = useState(false);   // grudou no centro?
  const ferrRef = useRef(ferramenta);
  const tamRef  = useRef(tamanho);
  const zoomRef = useRef(100);
  const panRef  = useRef({ x: 0, y: 0 });
  const nativo  = useRef({ w: 0, h: 0 });
  const ehExpansao = modo === 'expansao';
  useEffect(() => { ferrRef.current = ferramenta; }, [ferramenta]);
  useEffect(() => { tamRef.current = tamanho; }, [tamanho]);
  // ── Zoom e pan ──
  function aplicarTransform() {
    const p = pilhaRef.current;
    if (!p) return;
    const { x, y } = panRef.current;
    p.style.transform = `translate(${x}px, ${y}px) scale(${zoomRef.current / 100})`;
  }
  function mudarZoom(v) {
    const z = Math.max(100, Math.min(400, v));
    zoomRef.current = z;
    setZoom(z);
    if (z <= 100) panRef.current = { x: 0, y: 0 };
    aplicarTransform();
  }
  const imgRef = useRef(null);
  // ── O ajuste ao palco ──
  //
  //  Isto é o `edExpFit` do plugin. Sem ele, arrastar uma alça faz a moldura
  //  crescer para FORA da tela e sumir de vista.
  //
  //  A conta: o bounding box é a UNIÃO da imagem com a moldura. Tudo é
  //  reescalado para caber no palco — a moldura cresce, e a imagem encolhe
  //  junto. Assim nada sai de vista, por mais que se puxe.
  function ajustar() {
    const wrap = wrapRef.current;
    const bc = baseRef.current;
    const img = imgRef.current;
    if (!wrap || !bc || !img) return;
    const { w: W, h: H } = nativo.current;
    if (!W) return;
    // O bounding box, em pixels nativos
    const bbW = W * (1 + (m.esq  + m.dir)   / 100);
    const bbH = H * (1 + (m.cima + m.baixo) / 100);
    const folga = ehExpansao ? 90 : 32;
    const maxW = Math.max(80, wrap.clientWidth  - folga);
    const maxH = Math.max(80, wrap.clientHeight - folga);
    // A escala que faz TUDO caber
    const esc = Math.min(maxW / bbW, maxH / bbH, 1);
    const w = Math.max(1, Math.round(W * esc));
    const h = Math.max(1, Math.round(H * esc));
    bc.width = w;
    bc.height = h;
    bc.style.width = w + 'px';
    bc.style.height = h + 'px';
    bc.getContext('2d').drawImage(img, 0, 0, w, h);
    const dc = drawRef.current;
    if (dc && !ehExpansao) {
      // Preserva o que já foi pintado ao redimensionar
      const pintado = dc.width ? dc.toDataURL() : null;
      dc.width = w;
      dc.height = h;
      dc.style.width = w + 'px';
      dc.style.height = h + 'px';
      if (pintado) {
        const p = new Image();
        p.onload = () => dc.getContext('2d').drawImage(p, 0, 0, w, h);
        p.src = pintado;
      }
    }
  }
  // ── Carrega a imagem ──
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      nativo.current = { w: img.width, h: img.height };
      ajustar();
    };
    img.src = 'data:image/png;base64,' + base;
  }, [base, ehExpansao]);
  // A moldura mudou (ou a janela): reescala tudo para caber
  useEffect(() => {
    ajustar();
  }, [m, ehExpansao]);
  useEffect(() => {
    const r = () => ajustar();
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  });
  // ── Pintar (só no preenchimento) ──
  useEffect(() => {
    const dc = drawRef.current;
    if (!dc || ehExpansao) return;
    const ctx = dc.getContext('2d');
    let desenhando = false;
    let ultimo = null;
    function ponto(e) {
      const r = dc.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (dc.width  / r.width),
        y: (e.clientY - r.top)  * (dc.height / r.height)
      };
    }
    function traco(a, b) {
      // SÓLIDA. A transparência vem do CSS (opacity do canvas) — com rgba()
      // a tinta acumularia a cada passada.
      const cor = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent').trim() || '#A4A1F3';
      ctx.globalCompositeOperation =
        ferrRef.current === 'borracha' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = cor;
      ctx.fillStyle = cor;
      ctx.lineWidth = tamRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // O círculo: sem ele, um clique parado não marca nada.
      ctx.beginPath();
      ctx.arc(b.x, b.y, tamRef.current / 2, 0, Math.PI * 2);
      ctx.fill();
      if (a) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      setPintou(true);
    }
    function down(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      desenhando = true;
      ultimo = ponto(e);
      traco(null, ultimo);
    }
    function move(e) {
      // O alvo segue o mouse, no tamanho real do pincel na tela
      const cur = cursorRef.current;
      if (cur) {
        const r = dc.getBoundingClientRect();
        const d = tamRef.current * (r.width / dc.width);
        cur.style.width = d + 'px';
        cur.style.height = d + 'px';
        cur.style.left = e.clientX + 'px';
        cur.style.top = e.clientY + 'px';
        cur.style.display = 'block';
      }
      if (!desenhando) return;
      e.preventDefault();
      const p = ponto(e);
      traco(ultimo, p);
      ultimo = p;
    }
    function up() { desenhando = false; ultimo = null; }
    function sair() {
      const cur = cursorRef.current;
      if (cur) cur.style.display = 'none';
    }
    dc.addEventListener('mousedown', down);
    dc.addEventListener('mousemove', move);
    dc.addEventListener('mouseleave', sair);
    window.addEventListener('mouseup', up);
    return () => {
      dc.removeEventListener('mousedown', down);
      dc.removeEventListener('mousemove', move);
      dc.removeEventListener('mouseleave', sair);
      window.removeEventListener('mouseup', up);
      sair();
    };
  }, [ehExpansao]);
  // ── Zoom com a roda, pan com o botão do meio ──
  useEffect(() => {
    const wrap = wrapRef.current;
    const pilha = pilhaRef.current;
    if (!wrap) return;
    function roda(e) {
      e.preventDefault();
      mudarZoom(zoomRef.current + (e.deltaY < 0 ? 15 : -15));
    }
    // No wrap E na pilha: com o cursor sobre a imagem, o evento nasce nela.
    wrap.addEventListener('wheel', roda, { passive: false });
    if (pilha) pilha.addEventListener('wheel', roda, { passive: false });
    let arrastando = false;
    let sx = 0, sy = 0, ox = 0, oy = 0;
    function down(e) {
      if (e.button !== 1) return;              // só o botão do meio
      if (zoomRef.current <= 100) return;
      arrastando = true;
      sx = e.clientX; sy = e.clientY;
      ox = panRef.current.x; oy = panRef.current.y;
      wrap.style.cursor = 'grabbing';
      e.preventDefault();
    }
    function move(e) {
      if (!arrastando) return;
      panRef.current = { x: ox + (e.clientX - sx), y: oy + (e.clientY - sy) };
      aplicarTransform();
    }
    function up() { arrastando = false; wrap.style.cursor = ''; }
    wrap.addEventListener('mousedown', down);
    wrap.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      wrap.removeEventListener('wheel', roda);
      if (pilha) pilha.removeEventListener('wheel', roda);
      wrap.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);
  // ── As alças da moldura (expansão) ──
  //
  //  Arrastar a borda é como se pensa em enquadramento. Sliders de "42% para
  //  cima" não são — ninguém pensa assim.
  // ── Arrastar a imagem dentro da moldura ──
  //
  //  A moldura diz o TAMANHO do resultado; a posição da imagem dentro dela diz
  //  o que a IA vai inventar de cada lado. Encostar a imagem à esquerda pede
  //  muito cenário à direita e pouco à esquerda.
  //
  //  O centro tem ímã: é para onde se volta, e acertá-lo no olho é impossível.
  function pegarImagem(e) {
    if (!ehExpansao) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    empilhar();
    const bc = baseRef.current;
    if (!bc) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const d0 = { ...desl };
    const larg = bc.clientWidth;
    const alt  = bc.clientHeight;
    function mover(ev) {
      const dx = (ev.clientX - x0) / larg * 100;
      const dy = (ev.clientY - y0) / alt  * 100;
      // O quanto a imagem pode andar: metade da folga de cada eixo
      const folgaX = (m.esq  + m.dir)   / 2;
      const folgaY = (m.cima + m.baixo) / 2;
      let x = Math.max(-folgaX, Math.min(folgaX, d0.x + dx));
      let y = Math.max(-folgaY, Math.min(folgaY, d0.y + dy));
      // O ímã do centro: dentro de 2% ele gruda
      const IMA = 2;
      const noX = Math.abs(x) < IMA;
      const noY = Math.abs(y) < IMA;
      if (noX) x = 0;
      if (noY) y = 0;
      setImanado(noX && noY);
      setDesl({ x, y });
    }
    function soltar() {
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
    }
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
  }
  // ── Puxar uma alça expande por igual, com a imagem no centro ──
  //
  //  Antes cada lado crescia sozinho: puxar a esquerda deixava a imagem
  //  encostada na direita. Mas o resultado de uma expansão é uma moldura
  //  ao redor da imagem — o normal é querer o mesmo tanto de cada lado.
  //
  //  Quem quiser a imagem fora do centro, arrasta a imagem depois.
  function pegarAlca(e, lados) {
    e.preventDefault();
    e.stopPropagation();
    empilhar();
    const bc = baseRef.current;
    if (!bc) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const m0 = { ...m };
    const larg = bc.clientWidth;
    const alt  = bc.clientHeight;
    function mover(ev) {
      const dx = (ev.clientX - x0) / larg * 100;
      const dy = (ev.clientY - y0) / alt  * 100;
      // O quanto a alça pediu para crescer, no seu próprio eixo
      let cresceH = 0;
      let cresceV = 0;
      if (lados.includes('esq'))   cresceH = -dx;
      if (lados.includes('dir'))   cresceH =  dx;
      if (lados.includes('cima'))  cresceV = -dy;
      if (lados.includes('baixo')) cresceV =  dy;
      // Simétrico: o que se pede de um lado vale para o oposto.
      const h = Math.max(0, (lados.includes('esq') || lados.includes('dir'))
        ? (m0.esq + m0.dir) / 2 + cresceH
        : (m0.esq + m0.dir) / 2);
      const v = Math.max(0, (lados.includes('cima') || lados.includes('baixo'))
        ? (m0.cima + m0.baixo) / 2 + cresceV
        : (m0.cima + m0.baixo) / 2);
      setM(travar({ esq: h, dir: h, cima: v, baixo: v }, lados));
    }
    function soltar() {
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
    }
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
  }
  // ── A proporção manda: o eixo livre acompanha o que se arrasta ──
  //
  //  A versão anterior recalculava SEMPRE o eixo vertical a partir da largura.
  //  Duas consequências ruins:
  //
  //    1. Puxar a alça de cima não fazia nada — o valor arrastado era
  //       sobrescrito na mesma hora.
  //    2. A conta só crescia o vertical. Puxar a esquerda numa imagem 4:3
  //       travada em 16:9 dava 1760x1200, que não é 16:9.
  //
  //  Agora: quem arrasta manda no seu eixo, e o OUTRO eixo é calculado para
  //  fechar a proporção. Puxar a lateral ajusta a altura; puxar o topo ajusta
  //  a largura.
  function travar(novo, lados = []) {
    if (!proporcao || proporcao === 'livre') return novo;
    const [pw, ph] = proporcao.split(':').map(Number);
    if (!pw || !ph) return novo;
    const { w: W, h: H } = nativo.current;
    if (!W) return novo;
    const alvo = pw / ph;
    // Qual eixo a pessoa está movendo?
    const mexeH = lados.includes('esq')  || lados.includes('dir');
    const mexeV = lados.includes('cima') || lados.includes('baixo');
    // Num canto, os dois se movem: a largura manda, e a altura acompanha.
    if (mexeH || (!mexeH && !mexeV)) {
      let larg = W * (1 + (novo.esq + novo.dir) / 100);
      let alt  = larg / alvo;
      // A moldura não corta a imagem: ela só cresce. Se a altura que a
      // proporção pede for menor que a imagem, é a LARGURA que precisa
      // crescer para fechar a conta.
      if (alt < H) {
        alt = H;
        larg = H * alvo;
        const sobraW = (larg - W) / W * 100;
        return { ...novo, esq: sobraW / 2, dir: sobraW / 2, cima: 0, baixo: 0 };
      }
      const sobra = (alt - H) / H * 100;
      return { ...novo, cima: sobra / 2, baixo: sobra / 2 };
    }
    // Puxou o topo ou a base: a altura manda, e a largura acompanha.
    let alt  = H * (1 + (novo.cima + novo.baixo) / 100);
    let larg = alt * alvo;
    if (larg < W) {
      larg = W;
      alt  = W / alvo;
      const sobraH = (alt - H) / H * 100;
      return { ...novo, cima: sobraH / 2, baixo: sobraH / 2, esq: 0, dir: 0 };
    }
    const sobra = (larg - W) / W * 100;
    return { ...novo, esq: sobra / 2, dir: sobra / 2 };
  }
  // ── Escolher a proporção já monta a moldura ──
  //
  //  Escolher "16:9" e nada acontecer na tela é um controle morto. A
  //  proporção define a FORMA; os pixels saem dela e do tamanho da imagem.
  //
  //  A moldura cresce apenas no eixo que precisa: uma imagem 4:3 virando
  //  16:9 ganha largura, não altura. O outro eixo fica como está — expandir
  //  os dois seria pedir à IA que inventasse mais do que o necessário.
  useEffect(() => {
    if (!ehExpansao) return;
    const { w: W, h: H } = nativo.current;
    if (!W || !proporcao || proporcao === 'livre') return;
    const [pw, ph] = proporcao.split(':').map(Number);
    if (!pw || !ph) return;
    const atual = W / H;
    const alvo  = pw / ph;
    if (Math.abs(atual - alvo) < 0.01) {
      setM({ cima: 0, baixo: 0, esq: 0, dir: 0 });   // já está na proporção
      return;
    }
    if (alvo > atual) {
      // Mais larga: cresce nas laterais
      const sobra = ((H * alvo) - W) / W * 100;
      setM({ cima: 0, baixo: 0, esq: sobra / 2, dir: sobra / 2 });
    } else {
      // Mais alta: cresce em cima e embaixo
      const sobra = ((W / alvo) - H) / H * 100;
      setM({ cima: sobra / 2, baixo: sobra / 2, esq: 0, dir: 0 });
    }
  }, [proporcao, ehExpansao, base]);
  // O painel manda limpar
  useEffect(() => {
    if (!aoLimpar) return;
    aoLimpar.current = () => {
      if (ehExpansao) {
        setM({ cima: 0, baixo: 0, esq: 0, dir: 0 });
      } else {
        const dc = drawRef.current;
        if (dc) dc.getContext('2d').clearRect(0, 0, dc.width, dc.height);
        setPintou(false);
      }
    };
  });
  // O painel mostra as dimensões da moldura
  useEffect(() => {
    if (!aoMudarMoldura || !ehExpansao) return;
    const { w: W, h: H } = nativo.current;
    if (!W) return;
    aoMudarMoldura({
      w: Math.round(W * (1 + (m.esq + m.dir) / 100)),
      h: Math.round(H * (1 + (m.cima + m.baixo) / 100))
    });
  }, [m, ehExpansao, aoMudarMoldura]);
  // ── Os bytes que vão para o servidor ──
  function montarMascara() {
    const { w: W, h: H } = nativo.current;
    if (!W || !H) return null;
    const out = document.createElement('canvas');
    const oc = out.getContext('2d');
    if (ehExpansao) {
      // O inverso do preenchimento: a imagem original fica PRETA (preservada),
      // a moldura ao redor, BRANCA (a criar).
      const mw = Math.round(W * ((m.esq  + m.dir)   / 100));
      const mh = Math.round(H * ((m.cima + m.baixo) / 100));
      // Onde a imagem cai dentro da moldura. O deslocamento entra aqui: sem
      // isto, arrastá-la na tela não mudaria nada no resultado — a IA
      // receberia a imagem centrada de qualquer jeito.
      const mx = Math.round(W * ((m.esq  + desl.x) / 100));
      const my = Math.round(H * ((m.cima + desl.y) / 100));
      out.width  = W + mw;
      out.height = H + mh;
      oc.fillStyle = '#FFF';
      oc.fillRect(0, 0, out.width, out.height);
      oc.fillStyle = '#000';
      oc.fillRect(mx, my, W, H);
      return out.toDataURL('image/png').split(',')[1];
    }
    out.width = W;
    out.height = H;
    // 1. Escala o que foi pintado para o tamanho nativo
    const esc = document.createElement('canvas');
    esc.width = W;
    esc.height = H;
    const ec = esc.getContext('2d');
    const dc = drawRef.current;
    ec.drawImage(dc, 0, 0, dc.width, dc.height, 0, 0, W, H);
    // 2. Binariza no alpha
    const a = ec.getImageData(0, 0, W, H).data;
    const on = new Uint8Array(W * H);
    for (let p = 0, j = 0; p < a.length; p += 4, j++) {
      on[j] = a[p + 3] > 8 ? 1 : 0;
    }
    // 3. Dilata — mata o halo da borda
    const raio = Math.max(6, Math.round(Math.min(W, H) * 0.018));
    const dil = dilatar(on, W, H, raio);
    // 4. Preto-e-branco
    const img = oc.createImageData(W, H);
    for (let k = 0, m2 = 0; k < dil.length; k++, m2 += 4) {
      const v = dil[k] ? 255 : 0;
      img.data[m2] = img.data[m2 + 1] = img.data[m2 + 2] = v;
      img.data[m2 + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    return out.toDataURL('image/png').split(',')[1];
  }
  // Na expansão a imagem base também cresce: a original, dentro da moldura.
  function montarBase() {
    if (!ehExpansao) return base;
    const { w: W, h: H } = nativo.current;
    const mw = Math.round(W * ((m.esq  + m.dir)   / 100));
    const mh = Math.round(H * ((m.cima + m.baixo) / 100));
    // O MESMO offset da máscara. Se os dois divergirem, a IA preserva um
    // pedaço deslocado do que a máscara mandou preservar.
    const mx = Math.round(W * ((m.esq  + desl.x) / 100));
    const my = Math.round(H * ((m.cima + desl.y) / 100));
    const out = document.createElement('canvas');
    out.width  = W + mw;
    out.height = H + mh;
    const oc = out.getContext('2d');
    oc.fillStyle = '#7F7F7F';           // cinza neutro na área a criar
    oc.fillRect(0, 0, out.width, out.height);
    const bc = baseRef.current;
    oc.drawImage(bc, 0, 0, bc.width, bc.height, mx, my, W, H);
    return out.toDataURL('image/png').split(',')[1];
  }
  useEffect(() => {
    if (!onGerar) return;
    onGerar.current = () => ({
      imagem:  montarBase(),
      mascara: montarMascara(),
      pronto:  ehExpansao
        ? (m.cima + m.baixo + m.esq + m.dir) > 0
        : pintou
    });
  });
  const { w: W, h: H } = nativo.current;
  const molW = W ? Math.round(W * (1 + (m.esq + m.dir) / 100)) : 0;
  const molH = H ? Math.round(H * (1 + (m.cima + m.baixo) / 100)) : 0;
  // As oito alças: quatro cantos, quatro bordas
  const ALCAS = [
    ['cima',  ['cima']],
    ['baixo', ['baixo']],
    ['esq',   ['esq']],
    ['dir',   ['dir']],
    ['ce',    ['cima', 'esq']],
    ['cd',    ['cima', 'dir']],
    ['be',    ['baixo', 'esq']],
    ['bd',    ['baixo', 'dir']]
  ];
  return (
    <div className="pn-tela">
      <div className="pn-area" ref={wrapRef}>
        <div className="pn-pilha" ref={pilhaRef}>
          {/* A moldura da expansão cresce ao redor da imagem */}
          {ehExpansao && (
            <div
              className="pn-moldura"
              style={{
                top:    `-${m.cima}%`,
                bottom: `-${m.baixo}%`,
                left:   `-${m.esq}%`,
                right:  `-${m.dir}%`
              }}
            >
              {ALCAS.map(([nome, lados]) => (
                <span
                  key={nome}
                  className={'pn-alca pn-alca--' + nome}
                  onMouseDown={(e) => pegarAlca(e, lados)}
                />
              ))}
              {molW > 0 && (
                <span className="pn-medida">
                  {molW} × {molH}
                  {proporcao && proporcao !== 'livre' ? ' · ' + proporcao : ''}
                </span>
              )}
            </div>
          )}
          <canvas
            ref={baseRef}
            className={'pn-canvas' + (ehExpansao ? ' pn-canvas--move' : '')}
            style={ehExpansao
              ? { transform: `translate(${desl.x}%, ${desl.y}%)` }
              : undefined}
            onMouseDown={pegarImagem}
          />
          {/* As guias do centro: aparecem só quando a imagem grudou nele.
              Sem elas, o ímã age sem dizer que agiu. */}
          {ehExpansao && imanado && (m.esq + m.dir + m.cima + m.baixo) > 0 && (
            <>
              <span className="pn-guia pn-guia--v" />
              <span className="pn-guia pn-guia--h" />
            </>
          )}
          {!ehExpansao && (
            <canvas ref={drawRef} className="pn-canvas pn-draw" />
          )}
        </div>
        {/* O zoom flutua: não come espaço do trabalho */}
        <div className="pn-zoombar">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
               stroke="currentColor" strokeWidth="1.5">
            <circle cx="8.5" cy="8.5" r="5"/>
            <path d="M12.5 12.5L17 17M6.5 8.5h4M8.5 6.5v4" strokeLinecap="round"/>
          </svg>
          <input
            type="range" min="100" max="400" value={zoom}
            onChange={(e) => mudarZoom(+e.target.value)}
          />
          <span>{zoom}%</span>
        </div>
      </div>
      {/* O alvo: um círculo do tamanho do pincel, seguindo o mouse */}
      {!ehExpansao && <div className="pn-cursor" ref={cursorRef} />}
    </div>
  );
}
