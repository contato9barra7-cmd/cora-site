'use client';

// ═══════════════════════════════════════════════════════════
//  Banner de cookies (LGPD) — opção A (barra inferior).
//
//  Como funciona junto do GTM/Consent Mode:
//  - No layout, o consentimento nasce NEGADO (nada de GA/Pixel/Ads dispara).
//  - "Aceitar" → grava a escolha e chama gtag('consent','update', ...granted).
//  - "Recusar" → grava a escolha e mantém tudo negado.
//  - A escolha fica no navegador (localStorage); o banner só reaparece se ainda
//    não houver escolha.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useIdioma } from '../lib/i18n';

export default function CookieConsent() {
  const { t } = useIdioma();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('cora_cookie_consent')) setMostrar(true);
    } catch (e) {}
  }, []);

  function decidir(aceitou) {
    try {
      localStorage.setItem('cora_cookie_consent', aceitou ? 'accepted' : 'rejected');
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          ad_storage: aceitou ? 'granted' : 'denied',
          ad_user_data: aceitou ? 'granted' : 'denied',
          ad_personalization: aceitou ? 'granted' : 'denied',
          analytics_storage: aceitou ? 'granted' : 'denied',
        });
        // avisa o GTM que a escolha foi feita (útil para gatilhos lá dentro)
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: aceitou ? 'cookie_consent_accept' : 'cookie_consent_reject' });
      }
    } catch (e) {}
    setMostrar(false);
  }

  if (!mostrar) return null;

  return (
    <div className="cookie-bar" role="dialog" aria-label={t('cookieconsent_aria')}>
      <div className="cookie-txt">
        {t('cookieconsent_texto')}<br />
        {t('cookieconsent_veja')} <Link href="/privacidade">{t('cookieconsent_link_privacidade')}</Link>.
      </div>
      <div className="cookie-acoes">
        <button className="cookie-btn cookie-btn--ghost" onClick={() => decidir(false)}>{t('cookieconsent_recusar')}</button>
        <button className="cookie-btn cookie-btn--verde" onClick={() => decidir(true)}>{t('cookieconsent_aceitar')}</button>
      </div>
    </div>
  );
}
