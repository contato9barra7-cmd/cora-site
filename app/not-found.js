'use client';

import { useIdioma } from '../lib/i18n';
import { useRouter } from 'next/navigation';

/* ── Página não encontrada ──
   O Next serve esta tela para todo endereço que não bate com rota nenhuma.
   Antes dela, o visitante recebia a 404 crua do framework: em inglês, com a
   cara de outro produto e sem saída.

   O desenho é o mesmo de `cora-promptadores/public/404.html`, e é de
   propósito que ele não tenha cor de marca nem ilustração (decisão do dono,
   05/09/2026): tinta, papel e cinza servem o Cora Render e os Promptadores
   sem uma decisão por site. Os estilos moram no globals.css, com os mesmos
   nomes de classe dos dois lados — quem mexer num, mexe no outro.

   O rodapé não vem aqui: o layout do site já põe o dele em volta.

   `href="/"` é relativo ao domínio, então esta mesma página manda para a
   raiz do site que a serviu, sem endereço fixo em lugar nenhum. */
export default function NaoEncontrada() {
  const { t } = useIdioma();
  const router = useRouter();

  /* Volta para onde a pessoa estava. Sem histórico (link colado, aba nova),
     não há para onde voltar — aí o botão leva ao início, que é a única saída
     honesta. */
  const voltar = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <main className="p404">
      <div className="p404__miolo">
        <p className="p404__n">404</p>
        <h1 className="p404__t">{t('nf_titulo')}</h1>
        <p className="p404__sub">{t('nf_sub')}</p>
        <div className="p404__acoes">
          <a className="p404__bt" href="/">{t('nf_inicio')}</a>
          <button className="p404__voltar" type="button" onClick={voltar}>
            {t('nf_voltar')}
          </button>
        </div>
      </div>
    </main>
  );
}
