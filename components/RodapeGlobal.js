'use client';

import { usePathname } from 'next/navigation';
import RodapeLegal from './RodapeLegal';

// As páginas do painel usam o AppShell, que já mostra o RodapeLegal DENTRO do
// conteúdo (respeitando a barra lateral fixa). Aqui cobrimos só as páginas
// públicas, para não duplicar o rodapé.
// (/em-construcao não é do painel, mas também fica sem rodapé: é só o aviso.)
const PREFIXOS_APP = ['/conta', '/app', '/admin', '/workspace', '/assinatura', '/promptadores', '/em-construcao'];

export default function RodapeGlobal() {
  const pathname = usePathname() || '';
  const noPainel = PREFIXOS_APP.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (noPainel) return null;
  return <RodapeLegal />;
}
