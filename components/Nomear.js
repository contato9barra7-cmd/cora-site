'use client';

// ═══════════════════════════════════════════════════════════
//  Nomear — o nome do arquivo, quando o navegador não pergunta
//
//  O Chrome e o Edge abrem a janela de "Salvar como" do sistema, que já pede
//  pasta e nome. O Firefox e o Safari não têm isso: o arquivo cairia direto em
//  Downloads com o nome que nós escolhêssemos.
//
//  Este modal cobre esse caso. Só ele.
// ═══════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { useIdioma } from '../lib/i18n';

export default function Nomear({ inicial, aoSalvar, aoCancelar }) {
  const { t } = useIdioma();
  const [nome, setNome] = useState(inicial || 'trabalho');
  const campo = useRef(null);

  useEffect(() => {
    const el = campo.current;
    if (!el) return;

    el.focus();
    el.select();     // o nome sugerido já vem marcado: digitar o substitui
  }, []);

  function confirmar() {
    const n = nome.trim();
    if (n) aoSalvar(n);
  }

  return createPortal(
    <div className="cf-fundo" onClick={aoCancelar}>
      <div className="cf" onClick={(e) => e.stopPropagation()}>
        <p className="cf-txt">{t('nomear_titulo')}</p>

        <div className="nm-linha">
          <input
            ref={campo}
            className="nm-campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  confirmar();
              if (e.key === 'Escape') aoCancelar();
              e.stopPropagation();
            }}
            aria-label={t('nomear_aria_nome')}
          />
          <span className="nm-ext">.crd</span>
        </div>

        <p className="nm-nota">{t('nomear_nota')}</p>

        <div className="cf-botoes">
          <button className="ps-b" onClick={aoCancelar}>{t('comum_cancelar')}</button>
          <button className="ps-b ps-b--on" onClick={confirmar} disabled={!nome.trim()}>
            {t('comum_salvar')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
