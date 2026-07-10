'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { lerConta } from '../lib/auth';

export default function Nav() {
  const [conta, setConta] = useState(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setConta(lerConta());
    setPronto(true);
  }, []);

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="nav__logo">Cora Render</Link>
        <div className="nav__links">
          <Link href="/precos">Planos e preços</Link>

          {/* Só decide o que mostrar depois de checar a sessão no navegador,
              para não "piscar" o menu errado. */}
          {pronto && conta ? (
            <Link
              href="/conta"
              className="btn btn--roxo"
              style={{ margin: 0, width: 'auto', padding: '9px 20px' }}
            >
              Minha conta
            </Link>
          ) : pronto ? (
            <>
              <Link href="/login" className="nav__entrar">Entrar</Link>
              <Link
                href="/login"
                className="btn btn--roxo"
                style={{ margin: 0, width: 'auto', padding: '9px 20px' }}
              >
                Testar grátis
              </Link>
            </>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
