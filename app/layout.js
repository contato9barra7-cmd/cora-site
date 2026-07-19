import './globals.css';
import RodapeGlobal from '../components/RodapeGlobal';

export const metadata = {
  title: 'Cora Render — Render com IA para SketchUp',
  description:
    'Gere imagens, vídeos e apresentações a partir do seu modelo 3D no SketchUp, com IA. Planos a partir de R$97/mês.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('cora_menu_recolhido') === '1') {
                  document.documentElement.classList.add('menu-recolhido');
                }
              } catch (e) {}
            `
          }}
        />
      </head>
      <body>{children}<RodapeGlobal /></body>
    </html>
  );
}
