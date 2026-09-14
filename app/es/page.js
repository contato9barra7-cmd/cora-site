// ═══════════════════════════════════════════════════════════════════════════
//  A HOME (ES)
//
//  Server Component que entrega a marcação com os textos em espanhol e os
//  metadados da página, com canônica e apontamentos de idioma (hreflang).
// ═══════════════════════════════════════════════════════════════════════════

import HomeCora from '../../components/HomeCora';

export const metadata = {
  title: 'Cora Render · Del modelo 3D al render final',
  description:
    'Renderiza con inteligencia artificial directo desde SketchUp o en el navegador. Imágenes fieles a los materiales y a la luz de tu escena.',
  alternates: {
    canonical: 'https://corarender.com/es',
    languages: {
      'pt-BR': 'https://corarender.com',
      'es': 'https://corarender.com/es',
      'en': 'https://corarender.com/en',
      'x-default': 'https://corarender.com',
    },
  },
};

export default function HomeEs() {
  return <HomeCora idioma="es" />;
}
