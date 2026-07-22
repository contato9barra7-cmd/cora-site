'use client';

// ═══════════════════════════════════════════════════════════
//  Confirma — o aviso antes de destruir
//
//  `confirm()` do navegador não serve: ele é feio, não segue o tema, e em
//  alguns navegadores pode ser bloqueado. Este é o mesmo modal do plugin.
// ═══════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useIdioma } from '../lib/i18n';

export default function Confirma({ texto, ok, aoOk, aoCancelar }) {
  const { t } = useIdioma();
  const okLabel = ok ?? t('confirma_btn_continuar');
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
          <button className="ps-b" onClick={aoCancelar}>{t('comum_cancelar')}</button>
          <button className="cf-perigo" onClick={aoOk}>{okLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
