'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { lerConta } from '../lib/auth';
import { useIdioma } from '../lib/i18n';

export default function Nav() {
  const { t } = useIdioma();
  const pathname = usePathname();
  const [conta, setConta] = useState(null);
  const [pronto, setPronto] = useState(false);
  // No celular os links vivem atrás do hambúrguer. No desktop este estado não
  // faz diferença nenhuma: lá o CSS mostra a fila inteira de qualquer jeito.
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    setConta(lerConta());
    setPronto(true);
  }, []);

  // Trocou de página? O menu fecha. Um menu que fica aberto por cima do
  // conteúdo novo é uma porta que ninguém lembrou de encostar.
  useEffect(() => { setAberto(false); }, [pathname]);

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="nav__logo">Cora Render</Link>

        <button
          className="nav__burger"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          aria-label={aberto ? t('fechar') : 'Menu'}
        >
          <span /><span /><span />
        </button>

        <div className={'nav__links' + (aberto ? ' nav__links--aberto' : '')}>
          <Link href="/precos">{t('nav_planos_precos')}</Link>

          {/* Só decide o que mostrar depois de checar a sessão no navegador,
              para não "piscar" o menu errado. */}
          {pronto && conta ? (
            <Link
              href="/conta"
              className="btn btn--roxo"
              style={{ margin: 0, width: 'auto', padding: '9px 20px' }}
            >
              {t('nav_minha_conta')}
            </Link>
          ) : pronto ? (
            <>
              <Link href="/login" className="nav__entrar">{t('nav_entrar')}</Link>
              <Link
                href="/login"
                className="btn btn--roxo"
                style={{ margin: 0, width: 'auto', padding: '9px 20px' }}
              >
                {t('nav_testar_gratis')}
              </Link>
            </>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
