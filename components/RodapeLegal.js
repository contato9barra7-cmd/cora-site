'use client';
import Link from 'next/link';
import { useIdioma } from '../lib/i18n';

// Rodapé único do site: © + links legais. Usado nas páginas públicas
// (via RodapeGlobal, no layout raiz) e nas páginas do painel (dentro do AppShell).
//
// `noFeed` é a versão da Prancheta, que mora no fim da lista de gerações em
// vez de atravessar a tela embaixo das duas colunas: fio recuado, mais ar e
// um tom mais claro, para ele terminar a galeria sem disputar com ela.
export default function RodapeLegal({ noFeed = false }) {
  const { t } = useIdioma();
  return (
    <footer className={'rodape-legal' + (noFeed ? ' rodape-legal--feed' : '')}>
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
