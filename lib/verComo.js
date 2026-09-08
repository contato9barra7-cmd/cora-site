// ═══════════════════════════════════════════════════════════════════════════
//  VER O PAINEL COMO OUTRA PESSOA
//
//  O admin tem um seletor no topo do painel para olhar a tela como uma conta
//  normal, uma dona de equipe ou um membro convidado enxergam. Ele existe
//  porque essas três telas são diferentes e ninguém tem três contas para
//  conferir cada mudança.
//
//  ── O QUE ESTAVA ERRADO ──
//  O modo morava só no `app/conta/page.js`, então ele trocava o MIOLO e não a
//  MOLDURA: escolhendo "Dono de equipe", o menu lateral continuava sem a aba
//  Equipe e continuava COM a aba Admin. A tela dizia ser de outra pessoa com
//  o menu de quem estava olhando, que é a pior das duas: não é a visão de
//  ninguém.
//
//  Agora o modo mora aqui, e as duas pontas leem daqui. Quem quiser saber
//  "quem é esta pessoa" chama `contaVista(conta, modo)` e usa a resposta, em
//  vez de olhar a conta crua.
//
//  ── DUAS GUARDAS ──
//  1. `contaVista` devolve a conta INTACTA para quem não é admin. Um modo
//     escrito à mão no sessionStorage por uma conta comum não muda nada.
//  2. Isto é maquiagem de tela, e só. Quem decide se a pessoa pode gerar
//     continua sendo o servidor, no `pode_gerar` do `GET /conta`. Nada aqui
//     libera nada: só desenha.
//
//  Fica no `sessionStorage` para o modo sobreviver ao ir até /workspace e
//  voltar, e morrer quando a aba fechar.
// ═══════════════════════════════════════════════════════════════════════════

export const CHAVE_VER_COMO = 'cora_ver_como';
export const EVENTO_VER_COMO = 'cora:ver-como';

/* real = eu mesmo. Os outros três são as contas que o painel sabe desenhar. */
export const MODOS = ['real', 'normal', 'dono', 'membro'];

/* O crédito das visões de demonstração. Ele é inventado, e por isso mora num
   lugar só: o número grande, o total, a barra do cartão e o anel do avatar
   contam a mesma história. Quando cada um inventava o seu, a tela mostrava
   14.320 e escrevia "Você não tem créditos" logo abaixo. */
export const DEMO_TOTAL = 20000;
export const DEMO_RESTANTES = 14320;

export function lerModo() {
  if (typeof window === 'undefined') return 'real';
  try {
    const m = window.sessionStorage.getItem(CHAVE_VER_COMO);
    return MODOS.includes(m) ? m : 'real';
  } catch (e) {
    // Aba anônima, ou armazenamento bloqueado. Sem modo salvo, é 'real'.
    return 'real';
  }
}

export function gravarModo(modo) {
  const m = MODOS.includes(modo) ? modo : 'real';
  if (typeof window === 'undefined') return m;
  try {
    if (m === 'real') window.sessionStorage.removeItem(CHAVE_VER_COMO);
    else window.sessionStorage.setItem(CHAVE_VER_COMO, m);
  } catch (e) {}
  // O evento é o que avisa a moldura. Sem ele, o menu só mudaria na próxima
  // navegação, e o seletor pareceria não fazer nada.
  window.dispatchEvent(new CustomEvent(EVENTO_VER_COMO, { detail: m }));
  return m;
}

/* A conta como aquela pessoa a enxerga.
   Devolve a MESMA referência quando não há nada a fingir, para o React não
   redesenhar à toa. */
export function contaVista(conta, modo) {
  if (!conta || conta.is_admin !== true) return conta;
  if (!modo || modo === 'real' || !MODOS.includes(modo)) return conta;

  /* O admin some nas três visões: nenhuma delas tem a aba Admin, e é
     justamente isso que estava faltando. */
  const base = {
    ...conta,
    is_admin: false,
    eh_dono_equipe: false,
    eh_membro_equipe: false,
    /* O anel do avatar mede `total - usados`, então os dois vão juntos. Sem o
       `usados`, o anel do admin (que é ilimitado) ficaria cheio ao lado de um
       cartão que diz 14.320 de 20.000. */
    creditos_total: DEMO_TOTAL,
    creditos_usados: DEMO_TOTAL - DEMO_RESTANTES,
    creditos_restantes: DEMO_RESTANTES,
    ilimitado: false,
  };

  if (modo === 'dono') {
    return {
      ...base,
      eh_dono_equipe: true,
      /* A dona de equipe lê o crédito DA EQUIPE, não o dela. Se a conta real
         não tem equipe, os campos não existem, e a tela mostraria zero num
         lugar onde ela quer mostrar uma equipe funcionando. */
      equipe_creditos_total: conta.equipe_creditos_total ?? DEMO_TOTAL,
      equipe_renova_em: conta.equipe_renova_em ?? conta.expira_em ?? null,
    };
  }

  if (modo === 'membro') return { ...base, eh_membro_equipe: true };

  /* 'normal': uma conta paga comum, sem equipe de lado nenhum. */
  return base;
}
