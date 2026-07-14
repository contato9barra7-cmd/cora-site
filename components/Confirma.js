'use client';

// ═══════════════════════════════════════════════════════════
//  Confirma — o aviso antes de destruir
//
//  `confirm()` do navegador não serve: ele é feio, não segue o tema, e em
//  alguns navegadores pode ser bloqueado. Este é o mesmo modal do plugin.
// ═══════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';
import { useEffect } from 'react';

export default function Confirma({ texto, ok = 'Continuar', aoOk, aoCancelar }) {
  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') aoCancelar();
      if (e.key === 'Enter')  aoOk();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoOk, aoCancelar]);

  return createPortal(
    <div className="cf-fundo" onClick={aoCancelar}>
      <div className="cf" onClick={(e) => e.stopPropagation()}>
        <p className="cf-txt">{texto}</p>

        <div className="cf-botoes">
          <button className="ps-b" onClick={aoCancelar}>Cancelar</button>
          <button className="cf-perigo" onClick={aoOk}>{ok}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
