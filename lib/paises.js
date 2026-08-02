// ============================================================================
//  PAÍSES — só os códigos ISO 3166-1 alfa-2.
//
//  O NOME não está aqui de propósito. `Intl.DisplayNames`, do próprio
//  navegador, traduz o código para o idioma pedido: 'DE' vira "Alemanha",
//  "Germany" ou "Alemania" conforme quem está olhando. Guardar 200 nomes em
//  três idiomas seria uma lista para manter à mão, e ela ficaria desatualizada
//  no dia em que um país mudasse de nome.
//
//  Usado na janela de nota fiscal (components/ModalFiscal.js): o país escolhido
//  decide se pedimos CPF/CNPJ (Brasil) ou um documento fiscal genérico.
// ============================================================================

export const BRASIL = 'BR';

// ISO 3166-1 alfa-2. Ordem aqui não importa — a tela ordena pelo nome já
// traduzido, com o Brasil fixado no topo.
export const PAISES = [
  'AD', 'AE', 'AF', 'AG', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BN', 'BO', 'BR', 'BS',
  'BT', 'BW', 'BY', 'BZ',
  'CA', 'CD', 'CF', 'CG', 'CH', 'CI', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV',
  'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FM', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GH', 'GM', 'GN', 'GQ', 'GR', 'GT', 'GW', 'GY',
  'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IN', 'IQ', 'IR', 'IS', 'IT',
  'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MR', 'MT', 'MU',
  'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NE', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NZ',
  'OM',
  'PA', 'PE', 'PG', 'PH', 'PK', 'PL', 'PT', 'PW', 'PY',
  'QA',
  'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR',
  'SS', 'ST', 'SV', 'SY', 'SZ',
  'TD', 'TG', 'TH', 'TJ', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VN', 'VU',
  'WS',
  'YE',
  'ZA', 'ZM', 'ZW',
];

// Nome do país no idioma pedido. Se o navegador não tiver `Intl.DisplayNames`
// (versões antigas), devolve o próprio código — feio, mas nunca quebra a tela.
export function nomeDoPais(codigo, idioma = 'pt') {
  try {
    const nomes = new Intl.DisplayNames([idioma], { type: 'region' });
    return nomes.of(codigo) || codigo;
  } catch (e) {
    return codigo;
  }
}

// A lista pronta para o dropdown: Brasil primeiro (é a maioria das compras),
// o resto em ordem alfabética do nome JÁ TRADUZIDO — ordenar pelo código
// deixaria a lista embaralhada aos olhos de quem lê.
export function opcoesDePais(idioma = 'pt') {
  const outros = PAISES
    .filter((c) => c !== BRASIL)
    .map((c) => ({ v: c, n: nomeDoPais(c, idioma) }))
    .sort((a, b) => a.n.localeCompare(b.n, idioma));
  return [{ v: BRASIL, n: nomeDoPais(BRASIL, idioma) }, ...outros];
}
