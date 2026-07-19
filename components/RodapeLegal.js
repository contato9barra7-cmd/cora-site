import Link from 'next/link';

// Rodapé único do site: © + links legais. Usado nas páginas públicas
// (via RodapeGlobal, no layout raiz) e nas páginas do painel (dentro do AppShell).
export default function RodapeLegal() {
  return (
    <footer className="rodape-legal">
      <span>© {new Date().getFullYear()} Cora Render · 9BARRA7 Academy</span>
      <span className="rl-sep">·</span>
      <Link href="/termos" className="rl-link">Termos de Uso</Link>
      <span className="rl-sep">·</span>
      <Link href="/privacidade" className="rl-link">Política de Privacidade</Link>
    </footer>
  );
}
