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
//  Como ela nasce em document.body, o CSS dela mora no globals.css: nenhuma
//  folha escopada de página alcança o fim do documento.
//
//  `rotulo` é opcional. Com ele, o nome do campo fica DENTRO do controle, em
//  cima do valor escolhido. Numa fila de sete filtros é isso que impede a
//  pessoa de esquecer o que cada caixa é depois de escolher.
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function DropdownCora({ valor, opcoes, onEscolher, rotulo }) {
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
    // Fecha ao rolar a PÁGINA/painel (a lista é fixed e não acompanharia).
    // Mas NÃO fecha quando o scroll é dentro da própria lista (rolar as opções).
    function fecharAoRolar(e) {
      if (listaRef.current && listaRef.current.contains(e.target)) return;
      setAberto(false);
    }
    function aoRedimensionar() { setAberto(false); }
    document.addEventListener('mousedown', fora);
    window.addEventListener('scroll', fecharAoRolar, true);
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('scroll', fecharAoRolar, true);
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, [aberto]);

  return (
    <div className={'cora-dd' + (aberto ? ' cora-dd--aberto' : '') + (rotulo ? ' cora-dd--rotulo' : '')} ref={ref}>
      <button
        type="button"
        className="cora-dd-btn"
        onClick={alternar}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <span className="cora-dd-mio">
          {rotulo && <span className="cora-dd-rot">{rotulo}</span>}
          <span className="cora-dd-val">{atual ? atual.n : ''}</span>
        </span>
        <svg className="cora-dd-seta" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={listaRef}
          className="cora-dd-lista cora-dd-lista--portal"
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width, right: 'auto' }}
          role="listbox"
        >
          {opcoes.map((o) => (
            <div
              key={o.v}
              className={'cora-dd-opt' + (o.v === valor ? ' cora-dd-opt--sel' : '')}
              role="option"
              aria-selected={o.v === valor}
              onClick={() => { onEscolher(o.v); setAberto(false); }}
            >
              <span>{o.n}</span>
              {/* O tique diz o mesmo que a cor. Cor sozinha some para quem não
                  distingue bem as duas. */}
              <svg className="cora-dd-tique" viewBox="0 0 16 16" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 8.5 3.5 3.5L13 5" />
              </svg>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
