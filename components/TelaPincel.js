'use client';

// ═══════════════════════════════════════════════════════════
//  TelaPincel — preenchimento e expansão generativos
//
//  Copia o plugin, inclusive nos detalhes que não são óbvios:
//
//    · A cor do pincel é SÓLIDA. A transparência vem do `opacity` do canvas.
//      Com rgba() a tinta acumula: passar duas vezes no mesmo lugar escurece,
//      e a máscara fica com bordas duras onde não deveria.
//
//    · O cursor é um círculo do tamanho do pincel, seguindo o mouse. Sem ele
//      não dá para saber onde a tinta vai cair.
//
//    · Cada ponto pinta um CÍRCULO além da linha — senão um clique parado
//      não marca nada.
//
//  A imagem ocupa todo o feed: pintar máscara num painel de 380px seria
//  impossível. É o mesmo motivo pelo qual o plugin dá 70vh a ela.
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';

// ── Dilatação binária ──
//
//  A borda pintada nunca é exata: sobra um halo de pixels meio-transparentes
//  onde o traço esmaeceu. Sem dilatar, esse halo vira uma costura visível
//  entre o que foi gerado e o que foi preservado.
//
//  Separável (linhas, depois colunas) — O(W·H·r) em vez de O(W·H·r²).
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

export default function TelaPincel({ modo, base, onGerar }) {
  const wrapRef   = useRef(null);
  const pilhaRef  = useRef(null);
  const baseRef   = useRef(null);   // a imagem
  const drawRef   = useRef(null);   // a máscara pintada
  const cursorRef = useRef(null);   // o alvo que segue o mouse

  const [ferramenta, setFerr] = useState('pincel');
  const [tamanho, setTamanho] = useState(38);
  const [zoom, setZoom]       = useState(100);
  const [pintou, setPintou]   = useState(false);
  const [margem, setMargem]   = useState({ cima: 0, baixo: 0, esq: 0, dir: 0 });

  // Em refs: os ouvintes de evento são ligados uma vez e leriam o valor
  // velho se dependessem do estado.
  const ferrRef = useRef('pincel');
  const tamRef  = useRef(38);
  const zoomRef = useRef(100);
  const panRef  = useRef({ x: 0, y: 0 });
  const nativo  = useRef({ w: 0, h: 0 });

  const ehExpansao = modo === 'expansao';

  useEffect(() => { ferrRef.current = ferramenta; }, [ferramenta]);
  useEffect(() => { tamRef.current = tamanho; }, [tamanho]);

  // ── A transformação (zoom + pan) ──
  function aplicarTransform() {
    const p = pilhaRef.current;
    if (!p) return;
    const { x, y } = panRef.current;
    p.style.transform =
      `translate(${x}px, ${y}px) scale(${zoomRef.current / 100})`;
  }

  function mudarZoom(v) {
    const z = Math.max(100, Math.min(400, v));
    zoomRef.current = z;
    setZoom(z);

    // Voltando ao tamanho normal, o pan não faz mais sentido
    if (z <= 100) panRef.current = { x: 0, y: 0 };

    aplicarTransform();
  }

  // ── Carrega a imagem ──
  useEffect(() => {
    const img = new Image();

    img.onload = () => {
      const wrap = wrapRef.current;
      const bc = baseRef.current;
      const dc = drawRef.current;
      if (!wrap || !bc || !dc) return;

      nativo.current = { w: img.width, h: img.height };

      // Cabe inteira, mantendo a proporção
      const maxW = wrap.clientWidth  - 32;
      const maxH = wrap.clientHeight - 32;
      const esc  = Math.min(1, maxW / img.width, maxH / img.height);

      const w = Math.round(img.width  * esc);
      const h = Math.round(img.height * esc);

      bc.width = dc.width = w;
      bc.height = dc.height = h;
      bc.style.width = dc.style.width = w + 'px';
      bc.style.height = dc.style.height = h + 'px';

      bc.getContext('2d').drawImage(img, 0, 0, w, h);
    };

    img.src = 'data:image/png;base64,' + base;
  }, [base]);

  // ── Pintar, o cursor-alvo, o zoom e o pan ──
  useEffect(() => {
    const dc = drawRef.current;
    const wrap = wrapRef.current;
    if (!dc || !wrap || ehExpansao) return;

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
      if (e.button !== 0) return;      // o do meio é pan
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
      if (zoomRef.current <= 100) return;      // sem zoom, não há o que mover
      arrastando = true;
      sx = e.clientX; sy = e.clientY;
      ox = panRef.current.x; oy = panRef.current.y;
      wrap.style.cursor = 'grabbing';
      e.preventDefault();
    }

    function move(e) {
      if (!arrastando) return;
      panRef.current = {
        x: ox + (e.clientX - sx),
        y: oy + (e.clientY - sy)
      };
      aplicarTransform();
    }

    function up() {
      arrastando = false;
      wrap.style.cursor = '';
    }

    function menu(e) { e.preventDefault(); }

    wrap.addEventListener('mousedown', down);
    wrap.addEventListener('contextmenu', menu);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);

    return () => {
      wrap.removeEventListener('wheel', roda);
      if (pilha) pilha.removeEventListener('wheel', roda);
      wrap.removeEventListener('mousedown', down);
      wrap.removeEventListener('contextmenu', menu);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  function limpar() {
    const dc = drawRef.current;
    if (!dc) return;
    dc.getContext('2d').clearRect(0, 0, dc.width, dc.height);
    setPintou(false);
  }

  // ── A máscara que vai para o servidor ──
  //
  //  Preto-e-branco, no tamanho NATIVO: o modelo trabalha na resolução
  //  original, não na que coube na tela.
  function montarMascara() {
    const { w: W, h: H } = nativo.current;
    if (!W || !H) return null;

    const out = document.createElement('canvas');
    const oc = out.getContext('2d');

    if (ehExpansao) {
      // O inverso do preenchimento: a imagem original fica PRETA (preservada),
      // a moldura ao redor, BRANCA (a criar).
      const mx = Math.round(W * (margem.esq  / 100));
      const my = Math.round(H * (margem.cima / 100));
      const mw = Math.round(W * ((margem.esq  + margem.dir)   / 100));
      const mh = Math.round(H * ((margem.cima + margem.baixo) / 100));

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
    for (let k = 0, m = 0; k < dil.length; k++, m += 4) {
      const v = dil[k] ? 255 : 0;
      img.data[m] = img.data[m + 1] = img.data[m + 2] = v;
      img.data[m + 3] = 255;
    }
    oc.putImageData(img, 0, 0);

    return out.toDataURL('image/png').split(',')[1];
  }

  // Na expansão a imagem base também cresce: a original, dentro da moldura.
  function montarBase() {
    if (!ehExpansao) return base;

    const { w: W, h: H } = nativo.current;
    const mx = Math.round(W * (margem.esq  / 100));
    const my = Math.round(H * (margem.cima / 100));
    const mw = Math.round(W * ((margem.esq  + margem.dir)   / 100));
    const mh = Math.round(H * ((margem.cima + margem.baixo) / 100));

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

  // A página chama isto ao clicar em Gerar
  useEffect(() => {
    if (!onGerar) return;
    onGerar.current = () => ({
      imagem:  montarBase(),
      mascara: montarMascara(),
      pronto:  ehExpansao
        ? (margem.cima + margem.baixo + margem.esq + margem.dir) > 0
        : pintou
    });
  });

  const temMargem = margem.cima + margem.baixo + margem.esq + margem.dir > 0;

  return (
    <div className="pn-tela">

      <div className="pn-topo">
        {!ehExpansao ? (
          <>
            <button
              className={'cr-chip' + (ferramenta === 'pincel' ? ' cr-chip--on' : '')}
              onClick={() => setFerr('pincel')}
            >Pincel</button>
            <button
              className={'cr-chip' + (ferramenta === 'borracha' ? ' cr-chip--on' : '')}
              onClick={() => setFerr('borracha')}
            >Borracha</button>

            <span className="pn-rot">Tamanho</span>
            <input
              type="range" min="8" max="90" value={tamanho}
              onChange={(e) => setTamanho(+e.target.value)}
              className="pn-range"
            />

            <button className="pn-limpar" onClick={limpar} disabled={!pintou}>
              Limpar
            </button>
          </>
        ) : (
          <span className="pn-dica">
            Arraste as bordas para fora. O que sobrar ao redor é o que a IA
            vai criar.
          </span>
        )}

        <span className="pn-rot pn-rot--fim">Zoom</span>
        <input
          type="range" min="100" max="400" value={zoom}
          onChange={(e) => mudarZoom(+e.target.value)}
          className="pn-range"
        />
        <span className="pn-zoom">{zoom}%</span>
      </div>

      <div className="pn-area" ref={wrapRef}>
        <div className="pn-pilha" ref={pilhaRef}>
          {ehExpansao && (
            <div
              className="pn-moldura"
              style={{
                top:    `-${margem.cima}%`,
                bottom: `-${margem.baixo}%`,
                left:   `-${margem.esq}%`,
                right:  `-${margem.dir}%`
              }}
            />
          )}

          <canvas ref={baseRef} className="pn-canvas" />
          <canvas
            ref={drawRef}
            className={'pn-canvas pn-draw' + (ehExpansao ? ' pn-draw--off' : '')}
          />
        </div>
      </div>

      <div className="pn-pe">
        {ehExpansao ? (
          <div className="pn-lados">
            {[['cima', 'Cima'], ['baixo', 'Baixo'], ['esq', 'Esquerda'], ['dir', 'Direita']].map(
              ([k, rotulo]) => (
                <div key={k} className="pn-lado">
                  <span>{rotulo}</span>
                  <input
                    type="range" min="0" max="100" value={margem[k]}
                    onChange={(e) => setMargem((m) => ({ ...m, [k]: +e.target.value }))}
                  />
                  <em>{margem[k]}%</em>
                </div>
              )
            )}
            {temMargem && (
              <button
                className="pn-limpar"
                onClick={() => setMargem({ cima: 0, baixo: 0, esq: 0, dir: 0 })}
              >Resetar</button>
            )}
          </div>
        ) : (
          <span className="pn-dica">
            Scroll = zoom · botão do meio = mover
          </span>
        )}
      </div>

      {/* O alvo: um círculo do tamanho do pincel, seguindo o mouse */}
      {!ehExpansao && <div className="pn-cursor" ref={cursorRef} />}
    </div>
  );
}
