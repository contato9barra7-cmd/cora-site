// ═══════════════════════════════════════════════════════════════════════════
//  PÁGINA DE PREÇOS (ES)
//
//  Server Component que entrega a casca, os metadados com canônica e
//  apontamentos de idioma (hreflang) e renderiza a página de preços em ES.
// ═══════════════════════════════════════════════════════════════════════════

import PaginaPrecos from '../../../components/PaginaPrecos';

export const metadata = {
  title: 'Planes y Precios · Cora Render',
  description:
    'Conoce los planes de Cora Render. Suscripciones mensuales y anuales para estudios y profesionales independientes.',
  alternates: {
    canonical: 'https://corarender.com/es/precos',
    languages: {
      'pt-BR': 'https://corarender.com/precos',
      'es': 'https://corarender.com/es/precos',
      'en': 'https://corarender.com/en/precos',
      'x-default': 'https://corarender.com/precos',
    },
  },
};

export default function PrecosPageEs() {
  return <PaginaPrecos idioma="es" />;
}
