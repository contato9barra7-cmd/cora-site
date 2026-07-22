'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { calcularTeams, descontoAssentos } from '../../lib/planos';
import { iniciarCheckoutEquipe, salvarCPF, lerEquipePendente, limparEquipePendente } from '../../lib/auth';
import { useIdioma } from '../../lib/i18n';

function brl(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }

export default function Teams() {
  const router = useRouter();
  const { t } = useIdioma();
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
      if (e.jaTemEquipe) { setErro(t('teams_ja_equipe')); return; }
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
          <h1 className="tm-h1">{t('teams_h1')}</h1>
          <p className="tm-lead">
            {t('teams_lead')}
          </p>

          <div className="tm-toggle">
            <button className={'tm-toggle-op' + (ciclo === 'mensal' ? ' ativo' : '')} onClick={() => setCiclo('mensal')}>{t('teams_mensal')}</button>
            <button className={'tm-toggle-op' + (ciclo === 'anual' ? ' ativo' : '')} onClick={() => setCiclo('anual')}>
              {t('teams_anual')} <span className="tm-toggle-tag">{t('teams_2meses')}</span>
            </button>
          </div>

          <div className="tm-planos">
            <button
              className={'tm-plano' + (plano === 'pro' ? ' ativo' : '')}
              onClick={() => setPlano('pro')}
            >
              <div className="tm-plano-nome">Pro</div>
              <div className="tm-plano-desc">{t('teams_pro_desc')}</div>
              <div className="tm-plano-preco">{brl(ciclo === 'anual' ? 2970 : 297)}<span>{t('teams_por_assento')}{ciclo === 'anual' ? t('teams_por_ano') : ''}</span></div>
            </button>
            <button
              className={'tm-plano' + (plano === 'studio' ? ' ativo' : '')}
              onClick={() => setPlano('studio')}
            >
              <div className="tm-plano-nome">Studio</div>
              <div className="tm-plano-desc">{t('teams_studio_desc')}</div>
              <div className="tm-plano-preco">{brl(ciclo === 'anual' ? 6970 : 697)}<span>{t('teams_por_assento')}{ciclo === 'anual' ? t('teams_por_ano') : ''}</span></div>
            </button>
          </div>

          <div className="tm-card">
            <div className="tm-linha">
              <div>
                <div className="tm-lbl">{t('teams_assentos_tit')}</div>
                <div className="tm-sub">{t('teams_assentos_sub')}</div>
              </div>
              <div className="tm-stepper">
                <button onClick={() => mudarAssentos(-1)} disabled={assentos <= 2} aria-label={t('teams_menos')}>−</button>
                <span className="tm-qtd">{assentos}</span>
                <button onClick={() => mudarAssentos(1)} disabled={assentos >= 100} aria-label={t('teams_mais')}>+</button>
              </div>
            </div>

            <div className="tm-resumo">
              <div className="tm-resumo-linha">
                <span>{t('teams_preco_assento')}</span>
                <span>{brl(calc.porAssento)} <small>({Math.round(calc.desconto * 100)}% {t('teams_off_l')})</small></span>
              </div>
              <div className="tm-resumo-linha">
                <span>{assentos} {t('teams_assentos_l')}</span>
                <span>{brl(calc.total)}<small>/{ciclo === 'anual' ? t('teams_ano_l') : t('teams_mes_l')}</small></span>
              </div>
              {calc.economia > 0 && (
                <div className="tm-resumo-linha tm-economia">
                  <span>{t('teams_economiza')}</span>
                  <span>{brl(calc.economia)}/{ciclo === 'anual' ? t('teams_ano_l') : t('teams_mes_l')}</span>
                </div>
              )}
            </div>

            <button className="btn btn--verde" style={{ width: '100%', marginTop: 20, padding: '13px' }} onClick={clicarAssinar}>
              {t('teams_assinar_equipe')} — {brl(calc.total)}/{ciclo === 'anual' ? t('teams_ano_l') : t('teams_mes_l')}
            </button>
            {erro && <p className="tm-erro">{erro}</p>}
            <p className="tm-obs">
              {t('teams_obs')}
            </p>
          </div>

          <div className="tm-faixas">
            <div className="tm-faixas-tit">{t('teams_faixas_tit')}</div>
            <div className="tm-faixas-grid">
              {[['teams_fx1', '5%'], ['pl_seat_3', '10%'], ['pl_seat_5', '15%'], ['pl_seat_10', '20%']].map((f, i) => (
                <div key={i} className={'tm-faixa' + (descontoAssentos(assentos) === [0.05, 0.10, 0.15, 0.20][i] ? ' ativa' : '')}>
                  <div className="tm-faixa-q">{t(f[0])}</div>
                  <div className="tm-faixa-d">{f[1]} {t('teams_off_l')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modalCpf && (
        <div className="foto-overlay" onClick={() => setModalCpf(false)}>
          <div className="modal-cpf" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">{t('teams_cpf_titulo')}</div>
            <p className="tm-sub" style={{ marginBottom: 14 }}>
              {t('teams_cpf_desc')}
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
              {salvandoCpf ? t('comum_salvando') : t('confirma_btn_continuar')}
            </button>
            <div className="foto-cancelar" onClick={() => setModalCpf(false)} style={{ marginTop: 12 }}>{t('comum_cancelar')}</div>
          </div>
        </div>
      )}
    </>
  );
}
