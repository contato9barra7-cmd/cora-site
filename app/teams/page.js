'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { calcularTeams, descontoAssentos } from '../../lib/planos';

function brl(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }

export default function Teams() {
  const router = useRouter();
  const [plano, setPlano] = useState('pro');
  const [assentos, setAssentos] = useState(2);

  const calc = calcularTeams(plano, assentos);

  function mudarAssentos(delta) {
    setAssentos((a) => Math.max(2, Math.min(100, a + delta)));
  }

  function assinar() {
    // Etapa 2: aqui vai o checkout de equipe (login + CPF -> Stripe com quantidade).
    alert('Em breve: checkout de equipe com ' + assentos + ' assentos do plano ' + (plano === 'pro' ? 'Pro' : 'Studio') + '.');
  }

  return (
    <>
      <Nav />

      <div className="container">
        <div className="tm-wrap">
          <h1 className="tm-h1">Montar equipe</h1>
          <p className="tm-lead">
            Escolha o plano e a quantidade de assentos. Quanto mais assentos, maior o desconto por pessoa.
            Você gerencia todos por aqui, com faturamento único.
          </p>

          <div className="tm-planos">
            <button
              className={'tm-plano' + (plano === 'pro' ? ' ativo' : '')}
              onClick={() => setPlano('pro')}
            >
              <div className="tm-plano-nome">Pro</div>
              <div className="tm-plano-desc">20.000 créditos por assento / mês</div>
              <div className="tm-plano-preco">{brl(297)}<span>/assento</span></div>
            </button>
            <button
              className={'tm-plano' + (plano === 'studio' ? ' ativo' : '')}
              onClick={() => setPlano('studio')}
            >
              <div className="tm-plano-nome">Studio</div>
              <div className="tm-plano-desc">60.000 créditos por assento / mês</div>
              <div className="tm-plano-preco">{brl(697)}<span>/assento</span></div>
            </button>
          </div>

          <div className="tm-card">
            <div className="tm-linha">
              <div>
                <div className="tm-lbl">Assentos</div>
                <div className="tm-sub">Mínimo de 2. Você pode ajustar depois.</div>
              </div>
              <div className="tm-stepper">
                <button onClick={() => mudarAssentos(-1)} disabled={assentos <= 2} aria-label="Menos um assento">−</button>
                <span className="tm-qtd">{assentos}</span>
                <button onClick={() => mudarAssentos(1)} disabled={assentos >= 100} aria-label="Mais um assento">+</button>
              </div>
            </div>

            <div className="tm-resumo">
              <div className="tm-resumo-linha">
                <span>Preço por assento</span>
                <span>{brl(calc.porAssento)} <small>({Math.round(calc.desconto * 100)}% off)</small></span>
              </div>
              <div className="tm-resumo-linha">
                <span>{assentos} assentos</span>
                <span>{brl(calc.total)}<small>/mês</small></span>
              </div>
              {calc.economia > 0 && (
                <div className="tm-resumo-linha tm-economia">
                  <span>Você economiza</span>
                  <span>{brl(calc.economia)}/mês</span>
                </div>
              )}
            </div>

            <button className="btn btn--verde" style={{ width: '100%', marginTop: 20, padding: '13px' }} onClick={assinar}>
              Assinar equipe — {brl(calc.total)}/mês
            </button>
            <p className="tm-obs">
              Ao assinar, você faz login (ou cria uma conta) e informa o CPF. Depois é só convidar as pessoas por email.
            </p>
          </div>

          <div className="tm-faixas">
            <div className="tm-faixas-tit">Descontos por quantidade</div>
            <div className="tm-faixas-grid">
              {[['2 assentos', '5%'], ['3 a 4', '10%'], ['5 a 9', '15%'], ['10 ou mais', '20%']].map((f, i) => (
                <div key={i} className={'tm-faixa' + (descontoAssentos(assentos) === [0.05, 0.10, 0.15, 0.20][i] ? ' ativa' : '')}>
                  <div className="tm-faixa-q">{f[0]}</div>
                  <div className="tm-faixa-d">{f[1]} off</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
