'use client';

// ═══════════════════════════════════════════════════════════
//  DropdownCora — um select com a cara do Cora
//
//  O <select> nativo abre uma lista desenhada pelo sistema: bordas retas e
//  seleção azul, impossível de reestilizar. Este a substitui por uma lista
//  própria — bordas arredondadas, hover e seleção na cor da marca (roxo no
//  claro, verde no escuro).
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';

export default function DropdownCora({ valor, opcoes, onEscolher }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  const atual = opcoes.find((o) => o.v === valor) || opcoes[0];

  useEffect(() => {
    if (!aberto) return;
    function fora(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  return (
    <div className={'cora-dd' + (aberto ? ' cora-dd--aberto' : '')} ref={ref}>
      <button type="button" className="cora-dd-btn" onClick={() => setAberto((a) => !a)}>
        <span>{atual ? atual.n : ''}</span>
        <svg className="cora-dd-seta" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && (
        <div className="cora-dd-lista">
          {opcoes.map((o) => (
            <div
              key={o.v}
              className={'cora-dd-opt' + (o.v === valor ? ' cora-dd-opt--sel' : '')}
              onClick={() => { onEscolher(o.v); setAberto(false); }}
            >{o.n}</div>
          ))}
        </div>
      )}
    </div>
  );
}
