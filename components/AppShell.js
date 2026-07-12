'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { lerConta, sair, aplicarTema, salvarPerfil, atualizarConta } from '../lib/auth';

// Ícones simples em SVG (sem dependência externa)
const Icone = {
  studio: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  ),
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  conta: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  equipe: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M9 21v-2a4 4 0 0 1 3-3.87"/>
      <circle cx="9" cy="7" r="3"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
    const c = lerConta();
    setConta(c);
    // busca dados frescos pra ter campos novos (ex: eh_dono_equipe, para a aba Equipe)
    atualizarConta().then((fresca) => { if (fresca) setConta(fresca); }).catch(() => {});
    // aplica o tema salvo (da conta ou do navegador)
    if (typeof window !== 'undefined') {
      setRecolhido(localStorage.getItem('cora_menu_recolhido') === '1');
      const tema = (c && c.tema) || localStorage.getItem('cora_tema') || 'sistema';
      aplicarTema(tema);
    }
  }, [pathname]);

  function toggleMenu() {
    const novo = !recolhido;
    setRecolhido(novo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cora_menu_recolhido', novo ? '1' : '0');
    }
  }

  // troca rápida de tema/idioma direto no menu do avatar
  async function trocarPref(campo, valor) {
    const nova = { ...conta, [campo]: valor };
    setConta(nova);
    if (campo === 'tema') aplicarTema(valor);
    try { await salvarPerfil({ [campo]: valor }); } catch (e) { /* silencioso */ }
  }

  function logout() {
    sair();
    router.push('/');
  }

  const itens = [
    { href: '/conta', rotulo: 'Dashboard', icone: Icone.dashboard, admin: false },
    { href: '/app', rotulo: 'Cora Render', icone: Icone.studio, admin: false },
    { href: '/conta/perfil', rotulo: 'Minha conta', icone: Icone.conta, admin: false },
    { href: '/workspace', rotulo: 'Equipe', icone: Icone.equipe, admin: false, soDono: true },
    { href: '/assinatura', rotulo: 'Assinatura', icone: Icone.assinatura, admin: false, soPagante: true },
    { href: '/admin', rotulo: 'Admin', icone: Icone.admin, admin: true },
  ].filter(i => (!i.admin || (conta && conta.is_admin)) && (!i.soDono || (conta && conta.eh_dono_equipe)) && (!i.soPagante || !(conta && conta.eh_membro_equipe)));

  // créditos para o anel do avatar (mostra o quanto RESTA)
  const ilimitado = conta && (conta.creditos_total === -1 || conta.is_admin);
  const total = conta?.creditos_total ?? 0;
  const usados = conta?.creditos_usados ?? 0;
  const pctRestante = ilimitado || total === 0 ? 0 : Math.max(0, Math.min(100, Math.round(((total - usados) / total) * 100)));

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
          <div className="app-user-wrap">
            <button className="app-user-btn" onClick={() => setMenuUser(!menuUser)} title="Minha conta">
              {/* anel de créditos ao redor do avatar (estilo Magnific) */}
              {!ilimitado && conta && total > 0 && (
                <svg className="app-anel" width="46" height="46" viewBox="0 0 46 46">
                  <circle className="app-anel-bg" cx="23" cy="23" r="21" />
                  <circle
                    className="app-anel-fill"
                    cx="23" cy="23" r="21"
                    strokeDasharray={2 * Math.PI * 21}
                    strokeDashoffset={(2 * Math.PI * 21) * (1 - pctRestante / 100)}
                    transform="rotate(-90 23 23)"
                  />
                </svg>
              )}
              <span
                className="app-avatar"
                style={conta?.foto_url ? { backgroundImage: `url(${conta.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
              >
                {conta?.foto_url ? '' : inicial}
              </span>
            </button>
            {menuUser && (
              <div className="app-user-menu" onMouseLeave={() => setMenuUser(false)}>
                <div className="app-user-nome">
                  {conta?.nome || conta?.email}
                  {!ilimitado && conta && total > 0 && (
                    <div className="app-user-creditos">
                      {Math.max(0, total - usados).toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')} créditos
                    </div>
                  )}
                  {ilimitado && conta && <div className="app-user-creditos">Créditos ilimitados</div>}
                </div>
                <Link href="/conta/perfil" className="app-user-link" onClick={() => setMenuUser(false)}>Minha conta</Link>

                <div className="app-user-pref">
                  <label>Idioma</label>
                  <select value={conta?.idioma || 'pt'} onChange={(e) => trocarPref('idioma', e.target.value)}>
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div className="app-user-pref">
                  <label>Tema</label>
                  <select value={conta?.tema || 'sistema'} onChange={(e) => trocarPref('tema', e.target.value)}>
                    <option value="claro">Claro</option>
                    <option value="escuro">Escuro</option>
                    <option value="sistema">Sistema</option>
                  </select>
                </div>

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
