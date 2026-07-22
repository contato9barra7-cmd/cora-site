'use client';
import Link from 'next/link';
import { useIdioma } from '../lib/i18n';

// Rodapé único do site: © + links legais. Usado nas páginas públicas
// (via RodapeGlobal, no layout raiz) e nas páginas do painel (dentro do AppShell).
export default function RodapeLegal() {
  const { t } = useIdioma();
  return (
    <footer className="rodape-legal">
      <span>© {new Date().getFullYear()} Cora Render · 9BARRA7 Academy</span>
      <span className="rl-sep">·</span>
      <Link href="/suporte" className="rl-link">{t('rodapelegal_suporte')}</Link>
      <span className="rl-sep">·</span>
      <Link href="/termos" className="rl-link">{t('rodapelegal_termos')}</Link>
      <span className="rl-sep">·</span>
      <Link href="/privacidade" className="rl-link">{t('rodapelegal_privacidade')}</Link>
    </footer>
  );
}
