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

// ── quem tem o quê ──────────────────────────────────────────────────────────
// As seções que existem DENTRO de cada página, conferidas no DOM. A home tem
// as quatro: antes disso não estar escrito em lugar nenhum, "Planos" e
// "Perguntas frequentes" mandavam quem estava na home para /precos, ou seja,
// saíam de uma página que tinha a resposta para outra que também tinha,
// fazendo a pessoa perder o lugar. Página nova entra com uma linha aqui.
const ANCORAS = {
  home: ['passos', 'ferramentas', 'planos', 'faq'],
  precos: ['planos', 'faq'],
  suporte: ['faq'],
};

// `fora` é para onde ir quando a seção não está na página atual.
const NAV = [
  { id: 'passos', fora: '/#passos', chave: 'nav_como_funciona' },
  { id: 'ferramentas', fora: '/#ferramentas', chave: 'nav_ferramentas' },
  { id: 'planos', fora: '/precos', chave: 'nav_planos' },
  { id: 'faq', fora: '/precos#faq', chave: 'nav_faq' },
];

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

  // Cada item tem dois destinos: a âncora, quando a seção está NESTA página, e
  // o caminho de fora, quando não está.
  const daqui = ANCORAS[aqui] || [];
  const elos = NAV.map((n) => ({
    href: daqui.includes(n.id) ? '#' + n.id : n.fora,
    rotulo: t(n.chave),
  }));

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
