'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  QUAL TELA DO ADMIN ESTÁ ABERTA
//
//  O admin tem três telas: Dinheiro, Contas e Registros. Elas moram no menu
//  lateral, e não numa fila de oito abas em cima da tabela, porque cada uma
//  carrega só os seus controles: o seletor de colunas só existe em Contas, o
//  seletor de período só em Dinheiro.
//
//  ── POR QUE O HASH, E NÃO ROTAS SEPARADAS ──
//  As três compartilham a mesma consulta de contas, o mesmo cabeçalho e a
//  mesma janela de e-mail. Como rotas separadas, cada troca de tela refaria a
//  chamada que traz todas as contas, e o admin passaria a esperar por dados
//  que ele já tem na mão.
//
//  ── E POR QUE NÃO `?tela=` ──
//  `useSearchParams` obriga a embrulhar quem o usa em `<Suspense>`, e quem o
//  usa aqui é o menu lateral, que envolve o produto inteiro. O hash resolve
//  o mesmo com um ouvinte, dá links de verdade (`/admin#dinheiro`), e o botão
//  de voltar do navegador funciona sozinho.
//
//  Dinheiro é a primeira: quem abre o admin quer saber quanto entrou, e não
//  quem está cadastrado.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

/* Aulas entrou em 10/09/2026. Ela e a unica que nao fala de dinheiro nem de
   conta: fala do curso. Nasceu so com a moderacao dos comentarios, e o nome
   e o do ASSUNTO e nao o da primeira aba, para o resto do controle do curso
   caber dentro dela sem trocar de endereco. */
/* Plugin entrou em 10/09/2026. Ela nao fala de dinheiro, de conta nem do
   curso: fala do arquivo que as pessoas instalam. Publicar uma versao era
   entrar no painel da Cloudflare e trocar dois arquivos na mao. */
export const TELAS_ADMIN = ['dinheiro', 'contas', 'registros', 'aulas', 'plugin'];
export const TELA_PADRAO = 'dinheiro';

export function telaDoHash(hash) {
  const t = String(hash || '').replace(/^#/, '');
  return TELAS_ADMIN.includes(t) ? t : TELA_PADRAO;
}

/** A tela aberta agora, acompanhando o hash da barra de endereço.
 *
 *  Começa sempre em `TELA_PADRAO` e só olha o endereço depois de montar: no
 *  servidor não existe `window`, e chutar diferente entre servidor e cliente
 *  é o que o React chama de erro de hidratação. */
export function usarTelaAdmin() {
  const [tela, setTela] = useState(TELA_PADRAO);

  useEffect(() => {
    const ler = () => setTela(telaDoHash(window.location.hash));
    ler();
    window.addEventListener('hashchange', ler);
    return () => window.removeEventListener('hashchange', ler);
  }, []);

  return tela;
}

/** Troca de tela. Escreve no hash, e quem estiver ouvindo se atualiza.
 *
 *  `hashchange` não dispara quando o hash já é aquele, então a troca também
 *  avisa na mão: sem isso, clicar duas vezes na tela aberta não fazia nada,
 *  o que está certo, mas clicar nela vindo de um link igual também não. */
export function irParaTelaAdmin(qual) {
  const alvo = TELAS_ADMIN.includes(qual) ? qual : TELA_PADRAO;
  if (window.location.hash === '#' + alvo) return;
  window.location.hash = alvo;
}
