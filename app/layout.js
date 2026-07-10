import './globals.css';

export const metadata = {
  title: 'Cora Render — Render com IA para SketchUp',
  description:
    'Gere imagens, vídeos e apresentações a partir do seu modelo 3D no SketchUp, com IA. Planos a partir de R$97/mês.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
