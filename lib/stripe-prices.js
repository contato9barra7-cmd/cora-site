// ============================================================================
//  O QUE SE PODE COMPRAR — por NOME, não por ID do Stripe
//
//  Este arquivo tinha os price_id escritos à mão, em modo teste, com um aviso
//  de "quando for para produção, troque pelos IDs live". O problema é que os
//  mesmos IDs também viviam no cora-auth, espalhados em quatro mapas: virar o
//  modo exigia editar os DOIS projetos e fazer dois deploys, sem esquecer
//  nenhum lugar. Um esquecido = o cliente paga e não recebe nada, porque o
//  webhook não reconhece o preço.
//
//  Agora o site pede pelo NOME ("plano:pro:anual", "recarga:g") e quem traduz
//  para o price_id é o servidor, que lê os IDs de variáveis de ambiente. O site
//  não conhece ID nenhum — trocar teste↔produção não exige mais deploy daqui.
//
//  Os nomes abaixo têm que existir no `ITENS` do cora-auth/index.js.
// ============================================================================

// Planos — assinatura recorrente.
export const ITEM_PLANO = {
  starter: { mensal: 'plano:starter:mensal', anual: 'plano:starter:anual' },
  pro:     { mensal: 'plano:pro:mensal',     anual: 'plano:pro:anual'     },
  studio:  { mensal: 'plano:studio:mensal',  anual: 'plano:studio:anual'  },
};

// Recargas — compra única.
export const ITEM_RECARGA = {
  p:  'recarga:p',
  m:  'recarga:m',
  g:  'recarga:g',
  gg: 'recarga:gg',
};

/** Nome do item de um plano. `ciclo` é 'mensal' ou 'anual'. */
export function itemDoPlano(planoId, ciclo) {
  const g = ITEM_PLANO[planoId];
  if (!g) return null;
  return ciclo === 'anual' ? g.anual : g.mensal;
}

/** Nome do item de uma recarga ('p' | 'm' | 'g' | 'gg'). */
export function itemDaRecarga(tamanho) {
  return ITEM_RECARGA[tamanho] || null;
}
