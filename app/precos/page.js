'use client';

import { useState } from 'react';
import Nav from '../../components/Nav';
import { planos, recargas, descontoAnual } from '../../lib/planos';

function brl(n) {
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}
function brlInt(n) {
  return 'R$ ' + n.toLocaleString('pt-BR');
}

function Check({ on }) {
  return (
    <span className="ic" aria-hidden="true">
      {on ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13 4.5 6.5 11 3 7.5" stroke="var(--verde)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="var(--texto3)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

export default function Precos() {
  const [anual, setAnual] = useState(false);

  return (
    <>
      <Nav />
      <div className="container">
        <div className="head">
          <h1>Escolha como você quer renderizar</h1>
          <p>Planos mensais, sem fidelidade. Cancele quando quiser.</p>

          <div className="toggle">
            <button className={!anual ? 'ativo' : ''} onClick={() => setAnual(false)}>
              Mensal
            </button>
            <button className={anual ? 'ativo' : ''} onClick={() => setAnual(true)}>
              Anual · -{Math.round(descontoAnual * 100)}%
            </button>
          </div>
        </div>

        <div className="planos">
          {planos.map((p) => {
            let preco;
            if (p.mensal === 0) preco = 'Grátis';
            else if (anual) preco = brl(p.mensal * (1 - descontoAnual));
            else preco = brlInt(p.mensal);

            return (
              <div key={p.id} className={'plano' + (p.destaque ? ' plano--destaque' : '')}>
                {p.tag && <span className="plano__tag">{p.tag}</span>}
                <h3 className="plano__nome">{p.nome}</h3>
                <p className="plano__desc">{p.desc}</p>

                <div className="plano__preco">
                  <span className="plano__valor">{preco}</span>
                  {p.mensal > 0 && <span className="plano__mes">/mês</span>}
                </div>

                <div className="plano__cred">
                  <div className="plano__credtxt">{p.creditosTxt}</div>
                  <div className="plano__credsub">{p.creditosSub}</div>
                </div>

                <button className={'btn btn--' + p.ctaEstilo}>{p.cta}</button>

                <ul className="feats">
                  {p.feats.map((f, i) => (
                    <li key={i} className={f[0] ? '' : 'off'}>
                      <Check on={f[0]} />
                      {f[1]}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="sec">
          <h2>Acabaram os créditos no meio do projeto?</h2>
          <p className="sub">Compre uma recarga avulsa. Os créditos não expiram enquanto seu plano estiver ativo.</p>
          <div className="recargas">
            {recargas.map((r) => (
              <div key={r.n} className={'recarga' + (r.popular ? ' recarga--pop' : '')}>
                <div className="recarga__n">{r.n}</div>
                <div className="recarga__cred">{r.creditos.toLocaleString('pt-BR')} créditos</div>
                <div className="recarga__p">{brlInt(r.preco)}</div>
                <div className="recarga__u">{brl(r.preco / r.creditos)} por crédito</div>
              </div>
            ))}
          </div>
        </div>

        <div className="foot">© {new Date().getFullYear()} Cora Render · 9barra7 Academy</div>
      </div>
    </>
  );
}
