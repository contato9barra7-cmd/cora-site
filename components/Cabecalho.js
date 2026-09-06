'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  CABEÇALHO DO SITE PÚBLICO
//
//  O do artefato aprovado: logo à esquerda, navegação no meio, "Entrar" e
//  "Criar conta" à direita, e um menu de gaveta no celular.
//
//  ── Por que ele não substituiu o Nav ainda ──
//  O `Nav` antigo continua servindo a home, que ainda está no desenho
//  provisório. Trocar os dois de uma vez deixaria a home sem estilo, porque o
//  CSS aprovado fala outro vocabulário de classes. Quando a home for portada,
//  ela passa a usar este e o `Nav` sai.
//
//  Ele depende do CSS de `precos-pagina.css`, que é escopado em `.pr`, então
//  precisa ficar DENTRO do elemento que carrega essa classe.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useIdioma } from '../lib/i18n';

export default function Cabecalho({ aqui = 'precos' }) {
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);

  // Esc fecha a gaveta. Sem isto ela vira uma armadilha para quem navega pelo
  // teclado: abre e não tem como sair sem achar o botão de novo.
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto]);

  const elos = [
    { href: '/#passos', rotulo: t('nav_como_funciona') },
    { href: '/#ferramentas', rotulo: t('nav_ferramentas') },
    { href: aqui === 'precos' ? '#planos' : '/precos', rotulo: t('nav_planos') },
    { href: aqui === 'precos' ? '#faq' : '/precos#faq', rotulo: t('nav_faq') },
  ];

  return (
    <header className="cabecalho">
      <div className="env cabecalho__interno">
        <Link className="cabecalho__marca" href="/" aria-label="Cora Render">
          <img src="/img/logo-cora.png" alt="Cora Render" width="266" height="64" />
        </Link>

        <nav className="cabecalho__nav" aria-label={t('nav_principal')}>
          {elos.map((e) => (
            <Link key={e.href} href={e.href}>{e.rotulo}</Link>
          ))}
        </nav>

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
