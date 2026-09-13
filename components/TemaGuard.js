'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { aplicarTema } from '../lib/auth';

// Rotas internas do app onde o modo escuro e permitido
const PREFIXOS_APP = [
  '/conta', '/app', '/admin', '/gerente', '/teams', '/workspace',
  '/assinatura', '/aprender', '/promptadores'
];

function ehRotaDentro(pathname) {
  if (!pathname) return false;
  return PREFIXOS_APP.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function TemaGuard() {
  const pathname = usePathname() || '';

  useEffect(() => {
    if (!ehRotaDentro(pathname)) {
      // Home, precos, suporte, login, cadastro, termos, privacidade, etc.: SEMPRE CLARO
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // Rotas internas do app: respeita a preferencia do usuario (escuro/claro/sistema)
      try {
        const c = JSON.parse(localStorage.getItem('cora_conta') || '{}');
        const tema = (c && c.tema) || localStorage.getItem('cora_tema') || 'sistema';
        aplicarTema(tema);
      } catch (e) {}
    }
  }, [pathname]);

  return null;
}
