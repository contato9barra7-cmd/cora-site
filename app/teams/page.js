'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta } from '../../lib/auth';
import { calcularTeams, descontoAssentos } from '../../lib/planos';

function brl(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }

export default function Teams() {
  const router = useRouter();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [plano, setPlano] = useState('pro');
  const [assentos, setAssentos] = useState(2);

  useEffect(() => {
    (async () => {
      const c = await lerConta();
      if (!c) { router.push('/login'); return; }
      setConta(c);
      setCarregando(false);
    })();
  }, [router]);

  const calc = calcularTeams(plano, assentos);

  function mudarAssentos(delta) {
    setAssentos((a) => Math.max(2, Math.min(100, a + delta)));
  }

  function assinar() {
    // Etapa 2: aqui vai o checkout de equipe (Stripe com quantidade).
    // Por ora, leva para a página de preços/checkout.
    alert('Em breve: checkout de equipe com ' + assentos + ' assentos do plano ' + (plano === 'pro' ? 'Pro' : 'Studio') + '.');
  }

  if (carregando) return <AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>;

  return (
    <AppShell>
      <div className="admin-wrap" style={{ maxWidth: 860 }}>
        <h1 className="conta-ola">Montar equipe</h1>
        <p className="conta-p" style={{ marginBottom: 28 }}>
          Escolha o plano e a quantidade de assentos. Quanto mais assentos, maior o desconto por pessoa.
          Você gerencia todos por aqui, com faturamento único.
        </p>

        {/* Escolha do plano */}
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

        {/* Seletor de assentos */}
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
            Após assinar, você poderá convidar as pessoas por email na página de gestão da equipe.
          </p>
        </div>

        {/* Faixas de desconto */}
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
    </AppShell>
  );
}
