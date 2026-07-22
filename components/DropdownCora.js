'use client';

// ═══════════════════════════════════════════════════════════
//  DropdownCora — um select com a cara do Cora
//
//  O <select> nativo abre uma lista desenhada pelo sistema: bordas retas e
//  seleção azul, impossível de reestilizar. Este a substitui por uma lista
//  própria — bordas arredondadas, hover e seleção na cor da marca (roxo no
//  claro, verde no escuro).
//
//  A lista abre num PORTAL com posição fixed (medida na hora), então nunca é
//  cortada por um contêiner com overflow (ex.: o painel de filtros do admin).
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function DropdownCora({ valor, opcoes, onEscolher }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const listaRef = useRef(null);

  const atual = opcoes.find((o) => o.v === valor) || opcoes[0];

  function medir() {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 5, width: r.width });
  }

  function alternar() {
    if (!aberto) medir();     // mede ANTES de abrir (sem piscar)
    setAberto((a) => !a);
  }

  useEffect(() => {
    if (!aberto) return;
    function fora(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      if (listaRef.current && listaRef.current.contains(e.target)) return;
      setAberto(false);
    }
    function fecharAoRolar() { setAberto(false); }  // scroll/resize fecham a lista
    document.addEventListener('mousedown', fora);
    window.addEventListener('scroll', fecharAoRolar, true);
    window.addEventListener('resize', fecharAoRolar);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('scroll', fecharAoRolar, true);
      window.removeEventListener('resize', fecharAoRolar);
    };
  }, [aberto]);

  return (
    <div className={'cora-dd' + (aberto ? ' cora-dd--aberto' : '')} ref={ref}>
      <button type="button" className="cora-dd-btn" onClick={alternar}>
        <span>{atual ? atual.n : ''}</span>
        <svg className="cora-dd-seta" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={listaRef}
          className="cora-dd-lista cora-dd-lista--portal"
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width, right: 'auto' }}
        >
          {opcoes.map((o) => (
            <div
              key={o.v}
              className={'cora-dd-opt' + (o.v === valor ? ' cora-dd-opt--sel' : '')}
              onClick={() => { onEscolher(o.v); setAberto(false); }}
            >{o.n}</div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
