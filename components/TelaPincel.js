'use client';

// ═══════════════════════════════════════════════════════════
//  TelaPincel — preenchimento e expansão generativos
//
//  Dois modos, uma tela:
//
//    PREENCHIMENTO — você pinta a área a trocar. A máscara é preto-e-branco:
//    branco = regenerar, preto = preservar.
//
//    EXPANSÃO — você arrasta a moldura para FORA da imagem. O que sobra ao
//    redor é o que a IA cria. A máscara é o inverso: a imagem original fica
//    preta (preservada), a área nova fica branca.
//
//  A imagem ocupa todo o feed — pintar detalhe num painel de 380px seria
//  impossível. É o que o plugin faz, com os mesmos passos.
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react';

// ── Dilatação binária ──
//
//  A borda pintada nunca é exata: sobra um halo de pixels meio-transparentes
//  onde o pincel esmaeceu. Sem dilatar, esse halo vira uma costura visível
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

export default function TelaPincel({ modo, base, previa, onGerar, ocupado }) {
  const wrapRef  = useRef(null);
  const baseRef  = useRef(null);   // a imagem
  const drawRef  = useRef(null);   // a máscara pintada

  const [ferramenta, setFerr] = useState('pincel');   // pincel | borracha
  const [tamanho, setTamanho] = useState(38);
  const [zoom, setZoom]       = useState(100);
  const [pintou, setPintou]   = useState(false);

  // A moldura da expansão, em % de cada lado
  const [margem, setMargem] = useState({ cima: 0, baixo: 0, esq: 0, dir: 0 });

  const nativo = useRef({ w: 0, h: 0 });
  const desenhando = useRef(false);
  const ultimo = useRef(null);

  const ehExpansao = modo === 'expansao';

  // ── Carrega a imagem nos dois canvas ──
  useEffect(() => {
    const img = new Image();

    img.onload = () => {
      const wrap = wrapRef.current;
      const bc = baseRef.current;
      const dc = drawRef.current;
      if (!wrap || !bc || !dc) return;

      nativo.current = { w: img.width, h: img.height };

      // Cabe inteira na área, mantendo a proporção
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

  // ── Pintar ──
  const ponto = useCallback((e) => {
    const dc = drawRef.current;
    const r = dc.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (dc.width  / r.width),
      y: (e.clientY - r.top)  * (dc.height / r.height)
    };
  }, []);

  function comecar(e) {
    if (ehExpansao) return;
    desenhando.current = true;
    ultimo.current = ponto(e);
    pintar(e);
  }

  function pintar(e) {
    if (!desenhando.current || ehExpansao) return;

    const dc = drawRef.current;
    const ctx = dc.getContext('2d');
    const p = ponto(e);

    // O tamanho é em pixels de TELA — converte para os do canvas
    const r = dc.getBoundingClientRect();
    const escala = dc.width / r.width;

    ctx.lineWidth = tamanho * escala;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // A borracha apaga de verdade: destination-out tira o alpha.
    ctx.globalCompositeOperation =
      ferramenta === 'borracha' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = 'rgba(127, 119, 221, .55)';

    ctx.beginPath();
    ctx.moveTo(ultimo.current.x, ultimo.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ultimo.current = p;
    setPintou(true);
  }

  function parar() {
    desenhando.current = false;
    ultimo.current = null;
  }

  function limpar() {
    const dc = drawRef.current;
    if (!dc) return;
    dc.getContext('2d').clearRect(0, 0, dc.width, dc.height);
    setPintou(false);
  }

  // ── A máscara que vai para o servidor ──
  //
  //  Preto-e-branco, no tamanho NATIVO da imagem: o modelo trabalha na
  //  resolução original, não na que coube na tela.
  function montarMascara() {
    const { w: W, h: H } = nativo.current;
    if (!W || !H) return null;

    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const oc = out.getContext('2d');

    if (ehExpansao) {
      // A imagem original é PRETA (preservada); a moldura ao redor, BRANCA.
      // É o inverso do preenchimento.
      const mx = Math.round(W * (margem.esq  / 100));
      const my = Math.round(H * (margem.cima / 100));
      const mw = Math.round(W * ((margem.esq + margem.dir)   / 100));
      const mh = Math.round(H * ((margem.cima + margem.baixo) / 100));

      out.width  = W + mw;
      out.height = H + mh;

      oc.fillStyle = '#FFF';
      oc.fillRect(0, 0, out.width, out.height);
      oc.fillStyle = '#000';
      oc.fillRect(mx, my, W, H);

      return out.toDataURL('image/png').split(',')[1];
    }

    // ── Preenchimento ──
    const dc = drawRef.current;

    // 1. Escala o que foi pintado para o tamanho nativo
    const esc = document.createElement('canvas');
    esc.width = W;
    esc.height = H;
    esc.getContext('2d').drawImage(dc, 0, 0, dc.width, dc.height, 0, 0, W, H);

    // 2. Binariza no alpha
    const a = esc.getContext('2d').getImageData(0, 0, W, H).data;
    const on = new Uint8Array(W * H);
    for (let p = 0, j = 0; p < a.length; p += 4, j++) {
      on[j] = a[p + 3] > 8 ? 1 : 0;
    }

    // 3. Dilata — mata o halo da borda do pincel
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

  // A imagem base da expansão também cresce: a original, centrada na moldura.
  function montarBase() {
    if (!ehExpansao) return base;

    const { w: W, h: H } = nativo.current;
    const mx = Math.round(W * (margem.esq  / 100));
    const my = Math.round(H * (margem.cima / 100));
    const mw = Math.round(W * ((margem.esq + margem.dir)   / 100));
    const mh = Math.round(H * ((margem.cima + margem.baixo) / 100));

    const out = document.createElement('canvas');
    out.width  = W + mw;
    out.height = H + mh;

    const oc = out.getContext('2d');
    oc.fillStyle = '#7F7F7F';                 // cinza neutro na área nova
    oc.fillRect(0, 0, out.width, out.height);
    oc.drawImage(baseRef.current, 0, 0, baseRef.current.width, baseRef.current.height,
                 mx, my, W, H);

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
            Arraste as bordas para fora da imagem. O que sobrar ao redor é o
            que a IA vai criar.
          </span>
        )}

        <span className="pn-rot pn-rot--fim">Zoom</span>
        <input
          type="range" min="50" max="300" value={zoom}
          onChange={(e) => setZoom(+e.target.value)}
          className="pn-range pn-range--zoom"
        />
      </div>

      <div className="pn-area" ref={wrapRef}>
        <div
          className="pn-pilha"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {/* A moldura da expansão cresce ao redor da imagem */}
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
            className={'pn-canvas pn-canvas--draw' + (ehExpansao ? ' pn-canvas--off' : '')}
            onMouseDown={comecar}
            onMouseMove={pintar}
            onMouseUp={parar}
            onMouseLeave={parar}
          />
        </div>
      </div>

      {/* Os controles da expansão: um por lado */}
      {ehExpansao && (
        <div className="pn-lados">
          {[
            ['cima',  'Cima'],
            ['baixo', 'Baixo'],
            ['esq',   'Esquerda'],
            ['dir',   'Direita']
          ].map(([k, rotulo]) => (
            <div key={k} className="pn-lado">
              <span>{rotulo}</span>
              <input
                type="range" min="0" max="100" value={margem[k]}
                onChange={(e) => setMargem((m) => ({ ...m, [k]: +e.target.value }))}
              />
              <em>{margem[k]}%</em>
            </div>
          ))}

          {temMargem && (
            <button
              className="pn-limpar"
              onClick={() => setMargem({ cima: 0, baixo: 0, esq: 0, dir: 0 })}
            >Resetar</button>
          )}
        </div>
      )}
    </div>
  );
}
