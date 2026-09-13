'use client';

import { usePathname } from 'next/navigation';
import RodapeCora from './RodapeCora';
import RodapeLegal from './RodapeLegal';

// As páginas do painel usam o AppShell, que já mostra o RodapeLegal DENTRO do
// conteúdo (respeitando a barra lateral fixa). Aqui cobrimos só as páginas
// públicas, para não duplicar o rodapé.
//
// `/em-construcao` está na lista mas NÃO é atendida por ela, e é bom saber por
// quê: o middleware REESCREVE os endereços para lá, e reescrita mantém a URL
// do navegador. `usePathname()` devolve "/" nessas visitas, nunca
// "/em-construcao". Quem tira o rodapé daquela tela é uma regra de CSS na
// própria página. O caminho continua listado porque visitar `/em-construcao`
// direto, sem reescrita, também não deve trazer rodapé.
const PREFIXOS_APP = [
  '/conta', '/app', '/admin', '/gerente', '/teams', '/workspace',
  '/assinatura', '/aprender', '/promptadores', '/em-construcao'
];

function combina(pathname, lista) {
  return lista.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function RodapeGlobal() {
  const pathname = usePathname() || '';
  if (combina(pathname, PREFIXOS_APP)) return null;
  // O rodapé de quatro colunas é exclusivo da Home.
  if (pathname === '/') return <RodapeCora />;
  // Nas demais páginas públicas (preços, suporte, termos, login, etc.), o rodapé fino padrão.
  return <RodapeLegal />;
}
