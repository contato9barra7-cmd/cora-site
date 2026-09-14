'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { aplicarTema } from '../lib/auth';

// Rotas internas do app onde o modo escuro e permitido
const PREFIXOS_APP = [
  '/conta', '/app', '/admin', '/gerente', '/teams', '/workspace',
  '/assinatura', '/aprender', '/promptadores'
];

// ── As páginas de ponte: suporte, termos e privacidade ──
// São públicas, mas quem está no painel chega nelas pelo rodapé e pelo
// perfil. Pedido do dono (14/09/2026): quem vem de dentro do app com o modo
// escuro continua no escuro, e quem vem da home ou de outra página pública vê
// claro, como o resto do site.
//
// Quem lembra de onde a pessoa veio é o sessionStorage da aba. Toda rota
// interna marca `cora_veio_de_dentro`, e toda página pública que não é ponte
// apaga a marca. Ela sobrevive a recarregar a página e a ir de termos para
// privacidade, e some quando a pessoa passa pela home.
//
// Link com target="_blank" (o de privacidade, no perfil) abre uma aba que
// nasce sem o sessionStorage da outra. Para esse caso o clique no painel deixa
// a hora no localStorage, e a aba nova aceita o carimbo por 15 segundos.
//
// O script do <head> em app/layout.js repete esta conta antes da pintura, para
// a página não piscar clara antes de escurecer. Mudou aqui, muda lá.
const PONTES = ['/suporte', '/termos', '/privacidade'];
const MARCA_DENTRO = 'cora_veio_de_dentro';
const CARIMBO_PONTE = 'cora_ponte_em';
const CARIMBO_VALE_MS = 15000;

function combina(pathname, lista) {
  if (!pathname) return false;
  return lista.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function temaDaConta() {
  const c = JSON.parse(localStorage.getItem('cora_conta') || '{}');
  return (c && c.tema) || localStorage.getItem('cora_tema') || 'sistema';
}

function claro() {
  document.documentElement.setAttribute('data-theme', 'light');
}

export default function TemaGuard() {
  const pathname = usePathname() || '';

  useEffect(() => {
    try {
      if (combina(pathname, PREFIXOS_APP)) {
        // Rotas internas do app: respeita a preferencia do usuario (escuro/claro/sistema)
        sessionStorage.setItem(MARCA_DENTRO, '1');
        aplicarTema(temaDaConta());
        return;
      }
      if (!combina(pathname, PONTES)) {
        // Home, precos, login, cadastro, etc.: SEMPRE CLARO
        sessionStorage.removeItem(MARCA_DENTRO);
        claro();
        return;
      }
      const carimbo = Number(localStorage.getItem(CARIMBO_PONTE) || 0);
      if (carimbo) {
        localStorage.removeItem(CARIMBO_PONTE);
        if (Date.now() - carimbo < CARIMBO_VALE_MS) sessionStorage.setItem(MARCA_DENTRO, '1');
      }
      if (sessionStorage.getItem(MARCA_DENTRO) === '1') aplicarTema(temaDaConta());
      else claro();
    } catch (e) {
      claro();
    }
  }, [pathname]);

  // O carimbo da aba nova. Só escuta dentro do app, que é de onde a ponte
  // escura pode sair. `auxclick` cobre o botão do meio, que também abre aba.
  useEffect(() => {
    if (!combina(pathname, PREFIXOS_APP)) return undefined;
    const aoClicar = (e) => {
      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      try {
        const destino = new URL(a.href, window.location.href);
        if (destino.origin === window.location.origin && combina(destino.pathname, PONTES)) {
          localStorage.setItem(CARIMBO_PONTE, String(Date.now()));
        }
      } catch (err) {}
    };
    document.addEventListener('click', aoClicar, true);
    document.addEventListener('auxclick', aoClicar, true);
    return () => {
      document.removeEventListener('click', aoClicar, true);
      document.removeEventListener('auxclick', aoClicar, true);
    };
  }, [pathname]);

  return null;
}
