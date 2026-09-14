// ═══════════════════════════════════════════════════════════════════════════
//  A HOME (EN)
//
//  Server Component que entrega a marcação com os textos em inglês e os
//  metadados da página, com canônica e apontamentos de idioma (hreflang).
// ═══════════════════════════════════════════════════════════════════════════

import HomeCora from '../../components/HomeCora';

export const metadata = {
  title: 'Cora Render · From 3D model to final render',
  description:
    'Render with artificial intelligence directly from SketchUp or in your browser. Images faithful to your scene materials and light.',
  alternates: {
    canonical: 'https://corarender.com/en',
    languages: {
      'pt-BR': 'https://corarender.com',
      'es': 'https://corarender.com/es',
      'en': 'https://corarender.com/en',
      'x-default': 'https://corarender.com',
    },
  },
};

export default function HomeEn() {
  return <HomeCora idioma="en" />;
}
