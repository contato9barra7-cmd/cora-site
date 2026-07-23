'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { calcularTeams, descontoAssentos } from '../../lib/planos';
import { iniciarCheckoutEquipe, salvarCPF, lerEquipePendente, limparEquipePendente } from '../../lib/auth';

function brl(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }

export default function Teams() {
  const router = useRouter();
  const [plano, setPlano] = useState('pro');
  const [assentos, setAssentos] = useState(2);
  const [ciclo, setCiclo] = useState('mensal'); // mensal | anual
  const [erro, setErro] = useState('');
  const [modalCpf, setModalCpf] = useState(false);
  const [cpf, setCpf] = useState('');
  const [cpfErro, setCpfErro] = useState('');
  const [salvandoCpf, setSalvandoCpf] = useState(false);

  // Se a pessoa voltou de login/cadastro com uma escolha pendente, restaura e retoma.
  useEffect(() => {
    const pend = lerEquipePendente();
    const logada = typeof window !== 'undefined' && localStorage.getItem('cora_conta');
    if (pend && logada) {
      setPlano(pend.plano === 'studio' ? 'studio' : 'pro');
      setAssentos(Math.max(2, Math.min(100, pend.assentos || 2)));
      if (pend.ciclo) setCiclo(pend.ciclo === 'anual' ? 'anual' : 'mensal');
      limparEquipePendente();
      // retoma o checkout (vai pedir CPF se precisar, ou abrir o pagamento)
      const guia = null;
      assinar(guia);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calc = calcularTeams(plano, assentos, ciclo);

  function mudarAssentos(delta) {
    setAssentos((a) => Math.max(2, Math.min(100, a + delta)));
  }

  function formatarCpf(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  async function assinar(guia) {
    setErro('');
    try {
      await iniciarCheckoutEquipe(plano, assentos, guia, ciclo);
    } catch (e) {
      if (e.precisaCpf) { setModalCpf(true); return; }
      if (e.jaTemEquipe) { setErro('Você já tem uma equipe ativa. Veja na página da sua equipe.'); return; }
      setErro(e.message);
    }
  }

  function clicarAssinar() {
    // Só abre a guia nova SE já estiver logada (senão vira about:blank).
    // Sem login, iniciarCheckoutEquipe guarda a escolha e manda pro cadastro.
    const logada = typeof window !== 'undefined' && localStorage.getItem('cora_conta');
    const guia = null;
    assinar(guia);
  }

  async function confirmarCpf() {
    setCpfErro('');
    setSalvandoCpf(true);
    try {
      await salvarCPF(cpf);
      const guia = null;
      setModalCpf(false);
      setCpf('');
      await assinar(guia);
    } catch (e) {
      setCpfErro(e.message);
    } finally {
      setSalvandoCpf(false);
    }
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

          <div className="tm-toggle">
            <button className={'tm-toggle-op' + (ciclo === 'mensal' ? ' ativo' : '')} onClick={() => setCiclo('mensal')}>Mensal</button>
            <button className={'tm-toggle-op' + (ciclo === 'anual' ? ' ativo' : '')} onClick={() => setCiclo('anual')}>
              Anual <span className="tm-toggle-tag">2 meses grátis</span>
            </button>
          </div>

          <div className="tm-planos">
            <button
              className={'tm-plano' + (plano === 'pro' ? ' ativo' : '')}
              onClick={() => setPlano('pro')}
            >
              <div className="tm-plano-nome">Pro</div>
              <div className="tm-plano-desc">20.000 créditos por assento / mês</div>
              <div className="tm-plano-preco">{brl(ciclo === 'anual' ? 2970 : 297)}<span>/assento{ciclo === 'anual' ? '/ano' : ''}</span></div>
            </button>
            <button
              className={'tm-plano' + (plano === 'studio' ? ' ativo' : '')}
              onClick={() => setPlano('studio')}
            >
              <div className="tm-plano-nome">Studio</div>
              <div className="tm-plano-desc">60.000 créditos por assento / mês</div>
              <div className="tm-plano-preco">{brl(ciclo === 'anual' ? 6970 : 697)}<span>/assento{ciclo === 'anual' ? '/ano' : ''}</span></div>
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
                <span>{brl(calc.total)}<small>/{ciclo === 'anual' ? 'ano' : 'mês'}</small></span>
              </div>
              {calc.economia > 0 && (
                <div className="tm-resumo-linha tm-economia">
                  <span>Você economiza</span>
                  <span>{brl(calc.economia)}/{ciclo === 'anual' ? 'ano' : 'mês'}</span>
                </div>
              )}
            </div>

            <button className="btn btn--verde" style={{ width: '100%', marginTop: 20, padding: '13px' }} onClick={clicarAssinar}>
              Assinar equipe — {brl(calc.total)}/{ciclo === 'anual' ? 'ano' : 'mês'}
            </button>
            {erro && <p className="tm-erro">{erro}</p>}
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

      {modalCpf && (
        <div className="foto-overlay" onClick={() => setModalCpf(false)}>
          <div className="modal-cpf" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">Informe seu CPF</div>
            <p className="tm-sub" style={{ marginBottom: 14 }}>
              Precisamos do CPF para emitir a nota fiscal da assinatura.
            </p>
            <input
              className="tm-input"
              value={cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
            {cpfErro && <p className="tm-erro">{cpfErro}</p>}
            <button className="btn btn--verde" style={{ width: '100%', marginTop: 16, padding: '12px' }} onClick={confirmarCpf} disabled={salvandoCpf}>
              {salvandoCpf ? 'Salvando...' : 'Continuar'}
            </button>
            <div className="foto-cancelar" onClick={() => setModalCpf(false)} style={{ marginTop: 12 }}>Cancelar</div>
          </div>
        </div>
      )}
    </>
  );
}
