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
const PREFIXOS_APP = ['/conta', '/app', '/admin', '/workspace', '/assinatura', '/promptadores', '/em-construcao'];

// As telas de entrar e criar conta seguem com a tira fina que já tinham. Elas
// ocupam a janela inteira, painel de imagem de um lado e cartão do outro, e o
// rodapé de quatro colunas ali embaixo viraria uma segunda página inteira
// depois de um formulário de dois campos.
const TIRA_FINA = ['/login', '/cadastro', '/esqueci-senha', '/nova-senha', '/verificar', '/convite'];

function combina(pathname, lista) {
  return lista.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function RodapeGlobal() {
  const pathname = usePathname() || '';
  if (combina(pathname, PREFIXOS_APP)) return null;
  if (combina(pathname, TIRA_FINA)) return <RodapeLegal />;
  // Nas páginas de conteúdo, o rodapé de quatro colunas do artefato. Ele
  // esteve fora do ar desde que a home foi portada, e o que aparecia no lugar
  // era a tira fina, que nasceu para caber ao lado da barra do painel.
  return <RodapeCora />;
}
