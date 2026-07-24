'use client';

// ═══════════════════════════════════════════════════════════
//  PopupUpgrade — "Recurso do Pro e Studio"
//
//  Aparece quando a pessoa clica numa ferramenta que o plano dela não tem
//  (Pós-produção, Animação, Preenchimento/Expansão generativa). Qualquer parte
//  da interface dispara o evento `cora:sem-acesso`; o detalhe opcional
//  `recurso` personaliza a mensagem.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIdioma } from '../lib/i18n';

export default function PopupUpgrade() {
  const { t } = useIdioma();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [recurso, setRecurso] = useState('');

  useEffect(() => {
    function onSemAcesso(e) {
      setRecurso((e && e.detail && e.detail.recurso) || '');
      setAberto(true);
    }
    window.addEventListener('cora:sem-acesso', onSemAcesso);
    return () => window.removeEventListener('cora:sem-acesso', onSemAcesso);
  }, []);

  if (!aberto) return null;

  return (
    <div className="cred-overlay" onClick={() => setAberto(false)}>
      <div className="cred-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cred-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#A4A1F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
        </div>
        <div className="cred-tit">{recurso ? recurso : t('popupupgrade_titulo')}</div>
        <div className="cred-sub">
          {recurso ? `“${recurso}”` : t('popupupgrade_este_recurso')} {t('popupupgrade_disp1')} <b>Pro</b> {t('popupupgrade_e')} <b>Studio</b>{t('popupupgrade_disp2')} {t('popupupgrade_upgrade')}
        </div>
        <button className="cred-btn cred-btn--verde" onClick={() => router.push('/assinatura')}>
          {t('popupupgrade_ver_planos')}
        </button>
        <div className="cred-agora" onClick={() => setAberto(false)}>{t('popupupgrade_agora_nao')}</div>
      </div>
    </div>
  );
}
