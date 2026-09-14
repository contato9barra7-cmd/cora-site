// ═══════════════════════════════════════════════════════════════════════════
//  PAÍSES POR IDIOMA E BOTS DE BUSCA
//
//  Usado pelo middleware para geolocalização e roteamento internacional.
// ═══════════════════════════════════════════════════════════════════════════

// 21 países de língua espanhola
export const PAISES_ES = [
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GQ',
  'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'ES', 'UY', 'VE',
];

// 8 países de língua portuguesa
export const PAISES_PT = [
  'BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL',
];

// Bots de busca comuns que não devem ser redirecionados por IP
export const REGEX_BOTS = /(googlebot|bingbot|yandexbot|duckduckbot|baiduspider|slurp|facebot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator)/i;
