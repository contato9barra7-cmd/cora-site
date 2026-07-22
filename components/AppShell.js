'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { lerConta, sair, aplicarTema, salvarPerfil, atualizarConta , EVENTO_CREDITOS } from '../lib/auth';
import RodapeLegal from './RodapeLegal';
import PopupCreditos from './PopupCreditos';
import PopupUpgrade from './PopupUpgrade';
import { useIdioma, IDIOMAS, localeDeIdioma } from '../lib/i18n';

// Ícones simples em SVG (sem dependência externa)
function rotuloPlano(c, t) {
  if (!c) return '';
  if (c.is_admin) return 'Admin';
  const nomes = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };
  const p = nomes[c.plano] || c.plano;
  if (c.eh_dono_equipe || c.eh_membro_equipe) return `Teams (${p})`;
  return `${t('plano_label')} ${p}`;
}

const Icone = {
  studio: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z" strokeLinejoin="round"/>
      <path d="M12 12l8.5-4.7M12 12v9.5M12 12L3.5 7.3" strokeLinejoin="round"/>
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
  // Robozinho — aba Promptadores (distinto do ícone "pessoa" de Minha conta).
  promptadores: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="8" width="14" height="11" rx="3"/>
      <path d="M12 8V4M9 4h6"/>
      <circle cx="9.5" cy="13" r="1"/><circle cx="14.5" cy="13" r="1"/>
      <path d="M3 12v3M21 12v3"/>
    </svg>
  ),
  // A barra lateral, desenhada. A seta aponta para onde o clique leva: para
  // dentro quando vai recolher, para fora quando vai abrir.
  recolher: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="16" rx="2.5"/>
      <path d="M9 4v16" strokeLinecap="round"/>
      <path d="M15.5 9.5L13 12l2.5 2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  expandir: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="16" rx="2.5"/>
      <path d="M9 4v16" strokeLinecap="round"/>
      <path d="M13 9.5l2.5 2.5L13 14.5" strokeLinecap="round" strokeLinejoin="round"/>
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
  const { t, idioma, trocarIdioma } = useIdioma();
  const [conta, setConta] = useState(null);
  // Lê o localStorage ANTES da primeira pintura: sem isso o menu nascia
  // expandido e recolhia logo depois — o flash que se via a cada troca de aba.
  const [recolhido, setRecolhido] = useState(() => {
    if (typeof window === 'undefined') return false;   // no servidor não há localStorage
    return localStorage.getItem('cora_menu_recolhido') === '1';
  });
  const [menuUser, setMenuUser] = useState(false);
  const [credCardVisivel, setCredCardVisivel] = useState(false);

  useEffect(() => {
    const c = lerConta();
    setConta(c);
    // busca dados frescos pra ter campos novos (ex: eh_dono_equipe, para a aba Equipe)
    atualizarConta().then((fresca) => {
      if (fresca) setConta(fresca);
      // Tínhamos cache mas a sessão morreu (401 sem cookie): desloga na hora.
      else if (c && typeof window !== 'undefined' && !localStorage.getItem('cora_conta')) setConta(null);
    }).catch(() => {});
    // aplica o tema salvo (da conta ou do navegador)
    if (typeof window !== 'undefined') {
      // (o recolhido já veio no useState, acima — reler aqui causava o flash)
      const tema = (c && c.tema) || localStorage.getItem('cora_tema') || 'sistema';
      aplicarTema(tema);
    }
  }, [pathname]);

  // Alguém gastou crédito (uma geração no /app)? Atualiza o número, o anel
  // e tudo mais — sem precisar de F5.
  useEffect(() => {
    function onCreditos(e) {
      if (e.detail) setConta(e.detail);
    }
    window.addEventListener(EVENTO_CREDITOS, onCreditos);
    return () => window.removeEventListener(EVENTO_CREDITOS, onCreditos);
  }, []);

  // Sincroniza o idioma da UI com o salvo na conta (segue o usuário entre
  // dispositivos). O localStorage cobre a troca imediata; isto cobre o login.
  useEffect(() => {
    if (conta?.idioma && IDIOMAS.includes(conta.idioma) && conta.idioma !== idioma) {
      trocarIdioma(conta.idioma);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conta?.idioma]);

  function toggleMenu() {
    const novo = !recolhido;
    setRecolhido(novo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cora_menu_recolhido', novo ? '1' : '0');
      // A classe no <html> é o que o script do layout.js lê na próxima
      // carga — é ela que evita o flash antes do React entrar.
      document.documentElement.classList.toggle('menu-recolhido', novo);
    }
  }

  // troca rápida de tema/idioma direto no menu do avatar
  async function trocarPref(campo, valor) {
    const nova = { ...conta, [campo]: valor };
    setConta(nova);
    if (campo === 'tema') aplicarTema(valor);
    if (campo === 'idioma') trocarIdioma(valor);   // troca a UI ao vivo
    try { await salvarPerfil({ [campo]: valor }); } catch (e) { /* silencioso */ }
  }

  function logout() {
    sair();
    router.push('/');
  }

  // `divisor` separa o TRABALHO (o que a pessoa faz) da CONTA (o que ela
  // administra). Sem isso, tudo vira uma lista indiferenciada.
  const itens = [
    { href: '/conta', rotulo: t('nav_dashboard'), icone: Icone.dashboard, admin: false },
    { href: '/app', rotulo: 'Cora Render', icone: Icone.studio, admin: false },
    { href: '/promptadores/ia-studio', rotulo: 'Promptadores IA Studio', icone: Icone.promptadores, admin: false, soCurso: 'ia_studio' },
    { href: '/promptadores/prompthub', rotulo: 'Promptadores PromptHub', icone: Icone.promptadores, admin: false, soCurso: 'prompthub' },
    { href: '/conta/perfil', rotulo: t('nav_minhaconta'), icone: Icone.conta, admin: false, divisor: true },
    { href: '/workspace', rotulo: t('nav_equipe'), icone: Icone.equipe, admin: false, soDono: true },
    { href: '/assinatura', rotulo: t('nav_assinatura'), icone: Icone.assinatura, admin: false, soPagante: true },
    { href: '/admin', rotulo: 'Admin', icone: Icone.admin, admin: true },
  ].filter(i => (!i.admin || (conta && conta.is_admin))
    && (!i.soDono || (conta && conta.eh_dono_equipe))
    && (!i.soPagante || !(conta && conta.eh_membro_equipe))
    && (!i.soCurso || (conta && conta.promptador_cursos && conta.promptador_cursos[i.soCurso]
        && (conta.promptador_cursos[i.soCurso].acesso || conta.promptador_cursos[i.soCurso].expirado))));

  // créditos para o anel do avatar (mostra o quanto RESTA)
  const ilimitado = conta && (conta.creditos_total === -1 || conta.is_admin);
  const total = conta?.creditos_total ?? 0;
  const usados = conta?.creditos_usados ?? 0;
  const pctRestante = ilimitado || total === 0 ? 0 : Math.max(0, Math.min(100, Math.round(((total - usados) / total) * 100)));

  const restantes = Math.max(0, total - usados);
  const acabando  = !ilimitado && total > 0 && pctRestante <= 10;   // usado só p/ cor da barra no menu

  // Card de crédito baixo: aparece quando restarem 1000 créditos ou menos
  // (número fixo, vale para qualquer plano).
  const LIMIAR_CRED_CARD = 1000;
  const credBaixo = !ilimitado && total > 0 && restantes <= LIMIAR_CRED_CARD;

  // Quantos dias até renovar? (só mostra quando faz sentido)
  const dataRenov = conta?.eh_dono_equipe ? conta?.equipe_renova_em : conta?.expira_em;
  const diasRenov = (() => {
    if (!dataRenov) return null;
    const d = Math.ceil((new Date(dataRenov) - new Date()) / 86400000);
    return (d >= 0 && d <= 60) ? d : null;
  })();

  const inicial = (conta?.nome || conta?.email || '?').charAt(0).toUpperCase();

  // Trial: conta free de até 7 dias. Mostra o contador; ao expirar, bloqueia a tela.
  const ehTrial = conta?.eh_trial === true;
  const trialExpirado = conta?.trial_expirado === true;
  const trialDiaAtual = Math.min(7, Math.max(1, 8 - (conta?.trial_dias_restantes ?? 7)));

  // Plano pago vencido / cartão falhou: o servidor marca status != 'ativo'.
  // Bloqueia SÓ o /app (onde se gera); minha conta e assinatura seguem abertas
  // para a pessoa poder renovar. Trial e free não entram aqui (status 'ativo').
  const planoExpirado = !!(conta && !conta.is_admin && !ehTrial
    && conta.status && conta.status !== 'ativo');

  // Card de crédito baixo (mesmo canto do "Dia X de 7"). NÃO fica fixo: aparece
  // no máximo 1x a cada 6h. Só para conta paga (não trial, não ilimitada) com
  // saldo <= 10%. Ao zerar, vira o estado "acabaram".
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ehTrial || ilimitado || !(total > 0) || !credBaixo || planoExpirado) {
      setCredCardVisivel(false);
      return;
    }
    const SEIS_H = 6 * 60 * 60 * 1000;
    let ultimo = 0;
    try { ultimo = parseInt(localStorage.getItem('cora_cred_card_visto') || '0', 10) || 0; } catch (e) {}
    if (Date.now() - ultimo > SEIS_H) setCredCardVisivel(true);
  }, [conta, credBaixo, ehTrial, ilimitado, total, planoExpirado]);

  function fecharCredCard() {
    setCredCardVisivel(false);
    try { localStorage.setItem('cora_cred_card_visto', String(Date.now())); } catch (e) {}
  }
  const naApp = pathname === '/app';

  return (
    <div className={'app-shell' + (recolhido ? ' recolhido' : '')}>
      {/* MENU LATERAL FIXO */}
      <aside className="app-side">
        <div className="app-side-topo">
          {recolhido ? (
            <button
              className="app-side-toggle app-side-toggle--so"
              onClick={toggleMenu}
              title={t('expandir_menu')}
              aria-label={t('expandir_menu')}
            >
              <span className="app-side-c">C</span>
              <span className="app-side-seta">{Icone.expandir}</span>
            </button>
          ) : (
            <>
              {/* O logo leva à landing (corarender.com). Para voltar ao painel,
                  o caminho é o item "Cora Render" do menu. */}
              <Link href="/" className="app-logo">Cora Render</Link>

              <button
                className="app-side-toggle"
                onClick={toggleMenu}
                title={t('recolher_menu')}
                aria-label={t('recolher_menu')}
              >
                {Icone.recolher}
              </button>
            </>
          )}
        </div>
        <nav className="app-nav">
          {itens.map(i => (
            <div key={i.href}>
              {i.divisor && <div className="app-nav-div" />}

              <Link
                href={i.href}
                className={'app-nav-item' + (pathname === i.href ? ' ativo' : '')}
                title={i.rotulo}
              >
                <span className="app-nav-ic">{i.icone}</span>
                {!recolhido && <span className="app-nav-lbl">{i.rotulo}</span>}
              </Link>
            </div>
          ))}
        </nav>
      </aside>

      {/* HEADER FIXO */}
      <header className="app-header">
        <div className="app-header-dir">
          <div className="app-user-wrap">
            <button className="app-user-btn" onClick={() => setMenuUser(!menuUser)} title={t('nav_minhaconta')}>
              {/* anel de créditos ao redor do avatar (estilo Magnific).
                  Admin/ilimitado mostra o anel SEMPRE CHEIO. */}
              {conta && (ilimitado || total > 0) && (
                <svg className="app-anel" width="46" height="46" viewBox="0 0 46 46">
                  <circle className="app-anel-bg" cx="23" cy="23" r="21" />
                  <circle
                    className="app-anel-fill"
                    cx="23" cy="23" r="21"
                    strokeDasharray={2 * Math.PI * 21}
                    strokeDashoffset={ilimitado ? 0 : (2 * Math.PI * 21) * (1 - pctRestante / 100)}
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
                {/* Irmãos, não aninhados: aninhado, o padding do plano
                    somava ao do nome e ele saía 12px mais à direita. */}
                <div className="app-user-nome">
                  {conta?.nome || conta?.email}
                </div>

                {conta?.plano && (
                  <div className="app-user-plano">{rotuloPlano(conta, t)}</div>
                )}

                {!ilimitado && conta && total > 0 && (
                  <div className="cred-card">
                    <div className="cred-rot">{t('cred_restantes')}</div>
                    <div className="cred-num">{restantes.toLocaleString(localeDeIdioma(idioma))}</div>
                    <div className="cred-barra">
                      <div
                        className={'cred-fill' + (acabando ? ' cred-fill--alerta' : '')}
                        style={{ width: pctRestante + '%' }}
                      />
                    </div>
                    <div className="cred-pe">
                      <span>{t('cred_de')} {total.toLocaleString(localeDeIdioma(idioma))}</span>
                      {diasRenov !== null && (
                        <span>{t('cred_renova_em')} {diasRenov} {diasRenov === 1 ? t('dia') : t('dias')}</span>
                      )}
                    </div>
                  </div>
                )}

                {ilimitado && conta && (
                  <div className="cred-card cred-card--ilim">
                    <div className="cred-rot">{t('creditos')}</div>
                    <div className="cred-num">{t('ilimitados')}</div>
                  </div>
                )}
                <Link href="/conta/perfil" className="app-user-link" onClick={() => setMenuUser(false)}>
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="10" cy="6.5" r="3"/>
                    <path d="M3.5 17a6.5 6.5 0 0113 0" strokeLinecap="round"/>
                  </svg>
                  {t('nav_minhaconta')}
                </Link>

                <div className="app-user-pref">
                  <label>{t('idioma_label')}</label>
                  <select value={idioma} onChange={(e) => trocarPref('idioma', e.target.value)}>
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div className="app-user-pref">
                  <label>{t('tema_label')}</label>
                  <select value={conta?.tema || 'sistema'} onChange={(e) => trocarPref('tema', e.target.value)}>
                    <option value="claro">{t('tema_claro')}</option>
                    <option value="escuro">{t('tema_escuro')}</option>
                    <option value="sistema">{t('tema_sistema')}</option>
                  </select>
                </div>

                <button className="app-user-link app-user-sair" onClick={logout}>
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 17H4.5A1.5 1.5 0 013 15.5v-11A1.5 1.5 0 014.5 3H8" strokeLinecap="round"/>
                    <path d="M13 13.5L16.5 10 13 6.5M16.5 10H7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('sair')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="app-main">
        <div className="app-main-conteudo">{children}</div>
        <RodapeLegal />
      </main>

      {/* Contador do trial (enquanto ativo). Escondido nas abas de Promptadores:
          lá o teste é do Cora e confundiria com o acesso dos promptadores. */}
      {ehTrial && !trialExpirado && !pathname.startsWith('/promptadores') && (
        <div className="trial-card">
          <div className="trial-card-info">
            <span className="trial-card-txt"><strong>{t('trial_dia')} {trialDiaAtual} {t('trial_de7')}</strong> <small>{t('trial_teste_gratis')}</small></span>
            <div className="trial-card-prog"><i style={{ width: (trialDiaAtual / 7 * 100) + '%' }} /></div>
          </div>
          <button className="trial-card-btn" onClick={() => router.push('/precos')}>{t('assinar')}</button>
        </div>
      )}

      {/* Card de crédito baixo/zerado — mesmo canto do trial, aparece de 6 em 6h */}
      {credCardVisivel && !ehTrial && !ilimitado && total > 0 && credBaixo && !planoExpirado && (
        <div className="trial-card cred-nudge">
          <button className="cred-nudge-x" onClick={fecharCredCard} aria-label={t('fechar')}>×</button>
          <div className="trial-card-info">
            {restantes <= 0 ? (
              <span className="trial-card-txt"><strong>{t('cred_acabaram')}</strong> <small>{t('cred_recarregue')}</small></span>
            ) : (
              <span className="trial-card-txt"><strong>{restantes.toLocaleString(localeDeIdioma(idioma))} {t('cred_restantes_txt')}</strong> <small>{t('cred_de')} {total.toLocaleString(localeDeIdioma(idioma))}</small></span>
            )}
            <div className="trial-card-prog">
              <i className={restantes <= 0 ? 'cred-bar-zero' : 'cred-bar-baixo'}
                 style={{ width: (restantes <= 0 ? 100 : Math.max(4, pctRestante)) + '%' }} />
            </div>
          </div>
          <button className="trial-card-btn" onClick={() => router.push('/assinatura')}>
            {restantes <= 0 ? t('recarregar') : t('comprar_creditos')}
          </button>
        </div>
      )}

      {/* Bloqueio de tela cheia (trial expirado) */}
      {ehTrial && trialExpirado && (
        <div className="trial-bloqueio">
          <div className="trial-bloqueio-card">
            <span className="trial-bloqueio-eb">{t('teste_encerrado')}</span>
            <h1>{t('teste_terminou_h1')}</h1>
            <p>{t('teste_terminou_p')}</p>
            <button className="btn btn--verde" style={{ width: 'auto', padding: '13px 30px' }} onClick={() => router.push('/precos')}>{t('ver_planos_assinar')}</button>
            <button className="trial-bloqueio-sair" onClick={logout}>{t('sair')}</button>
          </div>
        </div>
      )}

      {/* Bloqueio do /app quando o plano vence / cartão falha (conta e
          assinatura continuam acessíveis pela navegação lateral) */}
      {planoExpirado && naApp && (
        <div className="trial-bloqueio">
          <div className="trial-bloqueio-card">
            <span className="trial-bloqueio-eb">{t('plano_inativo')}</span>
            <h1>{t('plano_expirou_h1')}</h1>
            <p>{t('plano_expirou_p')}</p>
            <button className="btn btn--verde" style={{ width: 'auto', padding: '13px 30px' }} onClick={() => router.push('/assinatura')}>{t('renovar_assinatura')}</button>
            <button className="trial-bloqueio-sair" onClick={() => router.push('/conta')}>{t('sair')}</button>
          </div>
        </div>
      )}

      {/* Popup "créditos acabaram" — dispara ao receber 402 de uma geração */}
      <PopupCreditos />

      {/* Popup "recurso do Pro/Studio" — dispara em 'cora:sem-acesso' */}
      <PopupUpgrade />
    </div>
  );
}
