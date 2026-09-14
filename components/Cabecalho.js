'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  CABEÇALHO DO SITE PÚBLICO COM SELETOR DE IDIOMA (MUNDINHO)
//
//  Logo à esquerda, navegação no meio, seletor de idioma (mundinho),
//  ações "Entrar" e "Criar conta", e menu gaveta no celular.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useIdioma } from '../lib/i18n';

const ANCORAS = {
  home: ['passos', 'ferramentas', 'planos', 'faq'],
  precos: ['planos', 'faq'],
  suporte: ['faq'],
};

const NAV = [
  { id: 'passos', fora: '/#passos', chave: 'nav_como_funciona' },
  { id: 'ferramentas', fora: '/#ferramentas', chave: 'nav_ferramentas' },
  { id: 'planos', fora: '/precos', chave: 'nav_planos' },
  { id: 'faq', fora: '/precos#faq', chave: 'nav_faq' },
];

export default function Cabecalho({ aqui = 'precos', idioma: propIdioma }) {
  const { t, idioma: ctxIdioma, trocarIdioma } = useIdioma();
  const idioma = propIdioma || ctxIdioma || 'pt';

  const [aberto, setAberto] = useState(false);
  const [menuIdiomaAberto, setMenuIdiomaAberto] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  // Prefixo de idioma para as rotas da home e preços
  const prefixo = idioma === 'pt' ? '' : '/' + idioma;
  const logoHref = prefixo || '/';

  // Fecha gaveta e seletor com Esc
  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') {
        if (menuIdiomaAberto) {
          setMenuIdiomaAberto(false);
          btnRef.current?.focus();
        }
        if (aberto) setAberto(false);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto, menuIdiomaAberto]);

  // Fecha menu de idioma ao clicar fora ou rolar
  useEffect(() => {
    if (!menuIdiomaAberto) return;
    const cliqueFora = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMenuIdiomaAberto(false);
      }
    };
    const aoRolar = () => setMenuIdiomaAberto(false);

    document.addEventListener('pointerdown', cliqueFora);
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', cliqueFora);
      window.removeEventListener('scroll', aoRolar);
    };
  }, [menuIdiomaAberto]);

  // Ação de seleção de idioma
  const selecionarIdioma = (novo) => {
    setMenuIdiomaAberto(false);

    try {
      document.cookie = `cora_idioma=${novo}; max-age=31536000; path=/; SameSite=Lax`;
    } catch (e) {}

    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname || '';
    const hash = window.location.hash || '';

    // É Home?
    const ehHome = pathname === '/' || pathname === '/es' || pathname === '/en';
    if (ehHome) {
      const destino = (novo === 'pt' ? '/' : `/${novo}`) + hash;
      window.location.href = destino;
      return;
    }

    // É Preços?
    const ehPrecos = pathname === '/precos' || pathname === '/es/precos' || pathname === '/en/precos';
    if (ehPrecos) {
      const base = novo === 'pt' ? '/precos' : `/${novo}/precos`;
      window.location.href = base + hash;
      return;
    }

    // Outras páginas (mantém URL e atualiza estado)
    trocarIdioma(novo);
  };

  // Links da navegação adaptados com prefixo quando fora da página
  const daqui = ANCORAS[aqui] || [];
  const elos = NAV.map((n) => {
    let destinoFora = n.fora;
    if (prefixo) {
      if (n.fora.startsWith('/#')) destinoFora = prefixo + n.fora.slice(1);
      else destinoFora = prefixo + n.fora;
    }
    return {
      href: daqui.includes(n.id) ? '#' + n.id : destinoFora,
      rotulo: t(n.chave),
    };
  });

  const sigla = idioma.toUpperCase();
  const ariaBtn = idioma === 'en' ? 'Change language' : idioma === 'es' ? 'Cambiar idioma' : 'Mudar idioma';
  const rotuloLista = idioma === 'en' ? 'Language' : 'Idioma';

  return (
    <header className="cabecalho">
      <div className="env cabecalho__interno">
        <Link className="cabecalho__marca" href={logoHref} aria-label="Cora Render">
          <img src="/img/logo-cora.png" alt="Cora Render" width="266" height="64" />
        </Link>

        <nav className="cabecalho__nav" aria-label={t('nav_principal')}>
          {elos.map((e) => (
            <Link key={e.href} href={e.href}>{e.rotulo}</Link>
          ))}
        </nav>

        {/* Mundinho - Seletor de Idioma */}
        <div className="cabecalho__idioma-wrap" ref={wrapRef}>
          <button
            ref={btnRef}
            className="cab-idioma"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={menuIdiomaAberto}
            aria-label={ariaBtn}
            title={ariaBtn}
            onClick={() => setMenuIdiomaAberto(!menuIdiomaAberto)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
            </svg>
            <span className="sigla">{sigla}</span>
          </button>

          {menuIdiomaAberto && (
            <div className="pop" role="listbox" aria-label={rotuloLista}>
              <div className="pop__rot">{rotuloLista}</div>
              <div className="pop__lista">
                <button
                  className="pop__item"
                  role="option"
                  type="button"
                  data-lang="pt"
                  lang="pt-BR"
                  aria-selected={idioma === 'pt'}
                  onClick={() => selecionarIdioma('pt')}
                >
                  Português <span className="pop__cod">PT</span>
                  <span className="pop__check" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                </button>
                <button
                  className="pop__item"
                  role="option"
                  type="button"
                  data-lang="en"
                  lang="en"
                  aria-selected={idioma === 'en'}
                  onClick={() => selecionarIdioma('en')}
                >
                  English <span className="pop__cod">EN</span>
                  <span className="pop__check" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                </button>
                <button
                  className="pop__item"
                  role="option"
                  type="button"
                  data-lang="es"
                  lang="es"
                  aria-selected={idioma === 'es'}
                  onClick={() => selecionarIdioma('es')}
                >
                  Español <span className="pop__cod">ES</span>
                  <span className="pop__check" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="cabecalho__acoes">
          <Link className="btn btn--claro" href="/login">{t('nav_entrar')}</Link>
          <Link className="btn btn--escuro" href="/cadastro">{t('nav_criar_conta')}</Link>
        </div>

        <button
          className="burger"
          type="button"
          aria-expanded={aberto}
          aria-controls="menu-gaveta"
          onClick={() => setAberto(!aberto)}
        >
          <span className="sr-only">{t('nav_abrir_menu')}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
      </div>

      <div className="menu" id="menu-gaveta" hidden={!aberto}>
        {elos.map((e) => (
          <Link key={e.href} href={e.href} onClick={() => setAberto(false)}>{e.rotulo}</Link>
        ))}
        <div className="menu__acoes">
          <Link className="btn btn--lima btn--largo" href="/cadastro">{t('nav_criar_conta')}</Link>
          <Link className="btn btn--linha btn--largo" href="/login">{t('nav_entrar')}</Link>
        </div>
      </div>
    </header>
  );
}
