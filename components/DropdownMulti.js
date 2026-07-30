'use client';

// ═══════════════════════════════════════════════════════════
//  DropdownMulti — igual ao DropdownCora, mas de MÚLTIPLA escolha
//
//  Espelha o `.pl-multi` do plugin (Planta 2D: Mood, Paleta, Tratamento).
//  O gatilho mostra os rótulos escolhidos juntos (", ") ou o placeholder.
//  Clicar numa opção ALTERNA a seleção e NÃO fecha a lista — dá pra marcar
//  vários. A lista abre num portal fixed, como o DropdownCora, então nunca
//  é cortada por um contêiner com overflow.
//
//  Props:
//    valores     — array dos `v` marcados (PT canônico)
//    opcoes      — [{ v, n }]
//    onToggle    — (v) => void   (alterna um valor)
//    placeholder — texto quando nada está marcado
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function DropdownMulti({ valores, opcoes, onToggle, placeholder = 'Selecione…' }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const listaRef = useRef(null);

  const marcados = opcoes.filter((o) => valores.includes(o.v));
  const rotulo = marcados.length ? marcados.map((o) => o.n).join(', ') : placeholder;

  function medir() {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 5, width: r.width });
  }

  function alternar() {
    if (!aberto) medir();
    setAberto((a) => !a);
  }

  useEffect(() => {
    if (!aberto) return;
    function fora(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      if (listaRef.current && listaRef.current.contains(e.target)) return;
      setAberto(false);
    }
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
    <div className={'cora-dd' + (aberto ? ' cora-dd--aberto' : '')} ref={ref}>
      <button type="button" className="cora-dd-btn" onClick={alternar}>
        <span className={marcados.length ? '' : 'cora-dd-ph'}>{rotulo}</span>
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
          {opcoes.map((o) => {
            const on = valores.includes(o.v);
            return (
              <div
                key={o.v}
                className={'cora-dd-opt cora-dd-opt--multi' + (on ? ' cora-dd-opt--sel' : '')}
                onClick={() => onToggle(o.v)}
              >
                <span className="cora-dd-check" aria-hidden="true">
                  {on && (
                    <svg viewBox="0 0 16 16" width="10" height="10" fill="none"
                         stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2,8 6,12 14,4" />
                    </svg>
                  )}
                </span>
                {o.n}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
