// ═══════════════════════════════════════════════════════════════════════════
//  PÁGINA DE PREÇOS (EN)
//
//  Server Component que entrega a casca, os metadados com canônica e
//  apontamentos de idioma (hreflang) e renderiza a página de preços em EN.
// ═══════════════════════════════════════════════════════════════════════════

import PaginaPrecos from '../../../components/PaginaPrecos';

export const metadata = {
  title: 'Plans and Pricing · Cora Render',
  description:
    'Explore Cora Render plans. Monthly and annual subscriptions for studios and independent professionals.',
  alternates: {
    canonical: 'https://corarender.com/en/precos',
    languages: {
      'pt-BR': 'https://corarender.com/precos',
      'es': 'https://corarender.com/es/precos',
      'en': 'https://corarender.com/en/precos',
      'x-default': 'https://corarender.com/precos',
    },
  },
};

export default function PrecosPageEn() {
  return <PaginaPrecos idioma="en" />;
}
