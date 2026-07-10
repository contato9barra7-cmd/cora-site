'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { lerConta, sair } from '../lib/auth';

// Ícones simples em SVG (sem dependência externa)
const Icone = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  assinatura: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
    </svg>
  ),
  admin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"/>
    </svg>
  ),
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18"/>
    </svg>
  ),
  config: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [conta, setConta] = useState(null);
  const [recolhido, setRecolhido] = useState(false);
  const [menuUser, setMenuUser] = useState(false);

  useEffect(() => {
    setConta(lerConta());
    // lembra preferência de menu recolhido
    if (typeof window !== 'undefined') {
      setRecolhido(localStorage.getItem('cora_menu_recolhido') === '1');
    }
  }, [pathname]);

  function toggleMenu() {
    const novo = !recolhido;
    setRecolhido(novo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cora_menu_recolhido', novo ? '1' : '0');
    }
  }

  function logout() {
    sair();
    router.push('/');
  }

  const itens = [
    { href: '/conta', rotulo: 'Dashboard', icone: Icone.dashboard, admin: false },
    { href: '/assinatura', rotulo: 'Assinatura', icone: Icone.assinatura, admin: false },
    { href: '/admin', rotulo: 'Admin', icone: Icone.admin, admin: true },
  ].filter(i => !i.admin || (conta && conta.is_admin));

  // créditos para a barrinha do header
  const ilimitado = conta && (conta.creditos_total === -1 || conta.is_admin);
  const total = conta?.creditos_total ?? 0;
  const usados = conta?.creditos_usados ?? 0;
  const pct = ilimitado || total === 0 ? 0 : Math.min(100, Math.round((usados / total) * 100));

  const inicial = (conta?.nome || conta?.email || '?').charAt(0).toUpperCase();

  return (
    <div className={'app-shell' + (recolhido ? ' recolhido' : '')}>
      {/* MENU LATERAL FIXO */}
      <aside className="app-side">
        <div className="app-side-topo">
          <Link href="/conta" className="app-logo">
            {recolhido ? 'C' : 'Cora Render'}
          </Link>
          <button className="app-side-toggle" onClick={toggleMenu} title={recolhido ? 'Expandir' : 'Recolher'}>
            {Icone.menu}
          </button>
        </div>
        <nav className="app-nav">
          {itens.map(i => (
            <Link
              key={i.href}
              href={i.href}
              className={'app-nav-item' + (pathname === i.href ? ' ativo' : '')}
              title={i.rotulo}
            >
              <span className="app-nav-ic">{i.icone}</span>
              {!recolhido && <span className="app-nav-lbl">{i.rotulo}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* HEADER FIXO */}
      <header className="app-header">
        <div className="app-header-dir">
          {!ilimitado && conta && (
            <div className="app-creditos" title={`${usados} de ${total} créditos usados`}>
              <div className="app-creditos-barra">
                <div className="app-creditos-fill" style={{ width: pct + '%' }} />
              </div>
              <span className="app-creditos-txt">
                {Math.max(0, total - usados).toLocaleString('pt-BR')} créditos
              </span>
            </div>
          )}
          {ilimitado && conta && <span className="app-creditos-txt">Créditos ilimitados</span>}

          <div className="app-user-wrap">
            <button className="app-user-btn" onClick={() => setMenuUser(!menuUser)}>
              <span className="app-avatar">{inicial}</span>
            </button>
            {menuUser && (
              <div className="app-user-menu" onMouseLeave={() => setMenuUser(false)}>
                <div className="app-user-nome">{conta?.nome || conta?.email}</div>
                <Link href="/conta" className="app-user-link" onClick={() => setMenuUser(false)}>Minha conta</Link>
                <Link href="/assinatura" className="app-user-link" onClick={() => setMenuUser(false)}>Assinatura</Link>
                <button className="app-user-link app-user-sair" onClick={logout}>Sair</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="app-main">{children}</main>
    </div>
  );
}
