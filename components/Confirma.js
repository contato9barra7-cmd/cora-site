'use client';

// ═══════════════════════════════════════════════════════════
//  Confirma — o aviso antes de destruir
//
//  `confirm()` do navegador não serve: ele é feio, não segue o tema, e em
//  alguns navegadores pode ser bloqueado. Este é o mesmo modal do plugin.
// ═══════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import { useIdioma } from '../lib/i18n';

/* `perigo` diz se o botao de confirmar e vermelho. Ele nasceu para apagar
   coisa, e por isso o vermelho era fixo. Mover credito entre assentos tambem
   pede confirmacao (nao da para desfazer com um clique), mas nao destroi nada:
   o vermelho ali seria alarme onde nao ha alarme, e alarme gasto em acao comum
   e o que faz o vermelho parar de significar perigo no dia em que significar. */
export default function Confirma({ texto, ok, aoOk, aoCancelar, perigo = true }) {
  const { t } = useIdioma();
  const okLabel = ok ?? t('confirma_btn_continuar');
  // Enter confirma — mas não o Enter que veio JUNTO do gesto que abriu o
  // modal (tecla segurada gerando repeat, ou o Enter da ação anterior ainda
  // no ar). Como aoOk é a ação de PERIGO, um respiro curto separa a intenção
  // do resíduo. Escape cancela sempre, sem espera.
  const armado = useRef(false);
  useEffect(() => {
    const tm = setTimeout(() => { armado.current = true; }, 250);
    return () => clearTimeout(tm);
  }, []);
  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') aoCancelar();
      if (e.key === 'Enter' && armado.current && !e.repeat) aoOk();
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
          <button className={perigo ? "cf-perigo" : "cf-ok"} onClick={aoOk}>{okLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
