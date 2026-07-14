'use client';

// ═══════════════════════════════════════════════════════════
//  Masonry — a grade contínua do feed
//
//  O CSS Grid alinhava as células em LINHAS rígidas: como cada card tem uma
//  proporção diferente, a linha inteira ficava com a altura do card mais alto
//  e sobravam buracos. É o que se via ao lado de uma imagem vertical.
//
//  Aqui não há linhas. Há COLUNAS: cada card entra na coluna que está mais
//  curta naquele instante. Os buracos somem e a leitura continua da esquerda
//  para a direita, na ordem cronológica — que é o que o `column-count` do CSS
//  não consegue fazer (ele preenche uma coluna inteira antes de passar à
//  seguinte, e a ordem vira vertical).
//
//  A altura de cada card vem da proporção REAL da imagem, medida no onload.
//  A proporção declarada (`it.proporcao`) é só o valor pedido: nos upscales e
//  nas gerações 'auto' ela não existe, e chutar 4/3 desencaixaria o card.
//  Enquanto a medida não chega, usa-se a declarada como estimativa — e ao
//  chegar, a coluna reflui. É o mesmo que o Magnific faz.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// A largura mínima de coluna de cada tamanho — os mesmos números que estavam
// nos minmax() do CSS, para que P/M/G/GG continuem significando o mesmo.
const MIN_COL = { p: 150, m: 230, g: 330, gg: 460 };

const GAP = 10;   // o mesmo gap de .cr-cards

export default function Masonry({ itens, tamanho, children }) {
  const ref = useRef(null);
  const [larg, setLarg] = useState(0);

  // As proporções medidas de verdade, por id: { [id]: ratio }
  // Fica em ref TAMBÉM porque o onload de várias imagens dispara em rajada;
  // sem o ref, cada setState partiria de um estado velho e as medidas se
  // sobrescreveriam.
  const medidasRef = useRef({});
  const [medidas, setMedidas] = useState({});

  // ── A largura do contêiner ──
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ob = new ResizeObserver(([e]) => {
      setLarg(e.contentRect.width);
    });
    ob.observe(el);
    setLarg(el.getBoundingClientRect().width);

    return () => ob.disconnect();
  }, []);

  // ── Quantas colunas cabem ──
  const cols = useMemo(() => {
    if (!larg) return 1;
    const min = MIN_COL[tamanho] || MIN_COL.g;
    // Quantas colunas de largura `min` (com os gaps entre elas) cabem em `larg`
    const n = Math.floor((larg + GAP) / (min + GAP));
    return Math.max(1, n);
  }, [larg, tamanho]);

  const colLarg = cols ? (larg - GAP * (cols - 1)) / cols : 0;

  // ── Medir uma imagem ──
  // Chamada pelo card quando a imagem carrega. Guarda a proporção real.
  const medir = useCallback((id, ratio) => {
    if (!id || !ratio || !isFinite(ratio)) return;
    if (medidasRef.current[id] === ratio) return;

    medidasRef.current[id] = ratio;
    setMedidas({ ...medidasRef.current });
  }, []);

  // ── A distribuição ──
  // Cada item vai para a coluna mais curta. A altura é a estimada: a largura
  // da coluna dividida pela proporção (largura/altura).
  const colunas = useMemo(() => {
    const balde  = Array.from({ length: cols }, () => []);
    const alturas = Array(cols).fill(0);

    itens.forEach((it, i) => {
      const r = medidas[it.id] || razaoDeclarada(it.proporcao);
      const h = colLarg / r;

      // A coluna mais curta neste instante
      let alvo = 0;
      for (let c = 1; c < cols; c++) {
        if (alturas[c] < alturas[alvo] - 0.5) alvo = c;
      }

      balde[alvo].push({ it, i });
      alturas[alvo] += h + GAP;
    });

    return balde;
  }, [itens, cols, colLarg, medidas]);

  return (
    <div
      ref={ref}
      className="cr-mas"
      style={{ gap: GAP + 'px' }}
    >
      {colunas.map((col, c) => (
        <div key={c} className="cr-mas-col" style={{ gap: GAP + 'px' }}>
          {col.map(({ it, i }) => children(it, i, medir, medidas[it.id]))}
        </div>
      ))}
    </div>
  );
}

// "4:5" -> 0.8 (largura/altura). Sem proporção, 4/3 é a estimativa — mas ela
// só vale até a imagem carregar e a medida real chegar.
function razaoDeclarada(p) {
  if (!p || p === 'auto' || !/^\d+:\d+$/.test(p)) return 4 / 3;
  const [w, h] = p.split(':').map(Number);
  if (!w || !h) return 4 / 3;
  return w / h;
}
