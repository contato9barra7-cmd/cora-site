// ============================================================================
//  IDs DOS PREÇOS NO STRIPE (modo TESTE)
//  Cada plano/período e cada recarga tem seu price_id.
//  Quando for para produção, troque por outro arquivo com os IDs live.
// ============================================================================

export const STRIPE_PRICES = {
  // Planos — assinatura (recorrente)
  starter: {
    mensal: 'price_1TrhZZB1LXbAbhH8v1yMNqIx',
    anual:  'price_1TrhbOB1LXbAbhH8R5Rker1W',
  },
  pro: {
    mensal: 'price_1TrhcOB1LXbAbhH8CSmJGXKI',
    anual:  'price_1TrhcuB1LXbAbhH8oyM57Zoe',
  },
  studio: {
    mensal: 'price_1TrhdJB1LXbAbhH8aMFoBPSA',
    anual:  'price_1TrhdZB1LXbAbhH8lXu3xa8x',
  },

  // Recargas — compra única (one-time)
  recargas: {
    p:  'price_1TrhikB1LXbAbhH8WwfAmjui',
    m:  'price_1Trhj7B1LXbAbhH8XSPsfyC2',
    g:  'price_1TrhjNB1LXbAbhH8dmXVfOle',
    gg: 'price_1TrhjwB1LXbAbhH8vFrl4Nc5',
  },
};
