'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { iniciarCheckout, salvarCPF, salvarDadosFiscais, lerConta, abrirPortal } from '../../lib/auth';
import { STRIPE_PRICES } from '../../lib/stripe-prices';
import Nav from '../../components/Nav';
import { useIdioma } from '../../lib/i18n';
import {
  planos, recargas, descontoAnual,
  comparacao, custos, faq,
  teamsPro, teamsStudio,
} from '../../lib/planos';

function brl(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }
function brlInt(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }
function num(v) { return typeof v === 'number' ? v.toLocaleString('pt-BR') : v; }

function Check({ on }) {
  return on ? (
    <svg className="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13 4.5 6.5 11 3 7.5" stroke="var(--verde-esc)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg className="ic" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="var(--ink3)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Celula({ v }) {
  if (v === true) return <span className="tick-sim">✓</span>;
  if (v === false) return <span className="tick-nao">✕</span>;
  return <span className="cel-txt">{v}</span>;
}

// Traduz strings que são chaves 'pl_*' ou que contêm tokens {pl_*}.
function traduzir(t, s) {
  if (typeof s !== 'string') return s;
  if (s.startsWith('pl_')) return t(s);
  if (s.includes('{pl_')) return s.replace(/\{(pl_\w+)\}/g, (_, k) => t(k));
  return s;
}

function TabelaTeams({ titulo, dados, t }) {
  return (
    <div className="teams__tabela">
      <h4>{titulo}</h4>
      <div className="tab">
        <table>
          <thead>
            <tr>
              <th>{t('precos_assentos')}</th>
              <th className="num">{t('precos_desconto')}</th>
              <th className="num">{t('precos_por_assento')}</th>
              <th className="num">{t('precos_total_mes')}</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((l, i) => (
              <tr key={i}>
                <th scope="row">{t(l[0])}</th>
                <td className="num">{Math.round(l[1] * 100)}%</td>
                <td className="num">{brlInt(l[2])}</td>
                <td className="num">{l[3] === null ? '—' : brlInt(l[3])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Precos() {
  const { t } = useIdioma();
  const tr = (s) => traduzir(t, s);
  const [anual, setAnual] = useState(false);
  const [abaCusto, setAbaCusto] = useState('imagens');
  const [erroCheckout, setErroCheckout] = useState('');
  const [modalCpf, setModalCpf] = useState(false);
  const [fiscalTipo, setFiscalTipo] = useState('br');   // 'br' (CPF) | 'intl'
  const [cpf, setCpf] = useState('');
  const [docIntl, setDocIntl] = useState('');
  const [paisIntl, setPaisIntl] = useState('');
  const [cpfErro, setCpfErro] = useState('');
  const [priceIdPendente, setPriceIdPendente] = useState(null);
  const [salvandoCpf, setSalvandoCpf] = useState(false);
  const [conta, setConta] = useState(null);
  const [modalUpgrade, setModalUpgrade] = useState(false);
  const [avisoRecarga, setAvisoRecarga] = useState(false);
  const [planoAlvo, setPlanoAlvo] = useState('');
  const router = useRouter();

  useEffect(() => {
    setConta(lerConta());
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const priceId = localStorage.getItem('cora_checkout_pendente');
      if (params.get('retomar') === '1' && priceId) {
        localStorage.removeItem('cora_checkout_pendente');
        setTimeout(() => comprar(priceId, null), 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatarCpf(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  async function comprar(priceId, guia) {
    setErroCheckout('');
    try {
      await iniciarCheckout(priceId, guia);
    } catch (e) {
      if (e.precisaCpf) {
        setPriceIdPendente(priceId);
        setModalCpf(true);
        return;
      }
      if (e.jaTemPlano) {
        setModalUpgrade(true);
        return;
      }
      setErroCheckout(e.message);
    }
  }

  async function confirmarCpf() {
    setCpfErro('');
    setSalvandoCpf(true);
    try {
      if (fiscalTipo === 'intl') {
        if (!docIntl.trim()) { setCpfErro(t('precos_inf_doc')); setSalvandoCpf(false); return; }
        if (!paisIntl.trim()) { setCpfErro(t('precos_inf_pais')); setSalvandoCpf(false); return; }
        await salvarDadosFiscais({ internacional: true, documento: docIntl.trim(), pais: paisIntl.trim() });
      } else {
        await salvarDadosFiscais({ cpf });
      }
      const guia = null;
      setModalCpf(false);
      setCpf(''); setDocIntl(''); setPaisIntl('');
      if (priceIdPendente) await comprar(priceIdPendente, guia);
    } catch (e) {
      setCpfErro(e.message);
    } finally {
      setSalvandoCpf(false);
    }
  }

  const temPlanoAtivo = conta && conta.plano && conta.plano !== 'free'
                        && conta.status === 'ativo';

  async function comprarRecarga(recargaId) {
    const priceId = STRIPE_PRICES.recargas[recargaId];
    if (!priceId) return;
    const logada = typeof window !== 'undefined' && localStorage.getItem('cora_conta');
    if (!logada) { router.push('/cadastro'); return; }
    if (!temPlanoAtivo) {
      setAvisoRecarga(true);
      return;
    }
    await comprar(priceId, null);
  }

  async function assinarPlano(planoId) {
    if (planoId === 'free') { router.push('/cadastro'); return; }
    const temPlanoPago = conta && conta.plano && conta.plano !== 'free' && conta.status === 'ativo';
    if (temPlanoPago) {
      if (conta.plano === planoId) {
        setPlanoAlvo(planoId);
        setModalUpgrade(true);
        return;
      }
      setPlanoAlvo(planoId);
      setModalUpgrade(true);
      return;
    }
    const grupo = STRIPE_PRICES[planoId];
    if (!grupo) return;
    const priceId = anual ? grupo.anual : grupo.mensal;
    const logada = typeof window !== 'undefined' && localStorage.getItem('cora_conta');
    const guia = null;
    await comprar(priceId, guia);
  }

  async function irParaPortal() {
    const guia = null;
    setModalUpgrade(false);
    try {
      await abrirPortal(guia);
    } catch (e) {
      setErroCheckout(e.message);
    }
  }
  const colunas = ['Free', 'Starter', 'Pro', 'Studio'];

  return (
    <>
      <Nav />

      {/* CABEÇALHO + PLANOS */}
      <div className="container">
        <div className="head">
          <h1>{t('precos_h1')}</h1>
          <p>{t('precos_sub')}</p>
          <div className="toggle">
            <button className={!anual ? 'ativo' : ''} onClick={() => setAnual(false)}>{t('precos_mensal')}</button>
            <button className={anual ? 'ativo' : ''} onClick={() => setAnual(true)}>
              {t('precos_anual')}{Math.round(descontoAnual * 100)}%
            </button>
          </div>
        </div>

        <div className="planos">
          {planos.map((p) => {
            let preco, cobranca = '', risco = '';
            if (p.mensal === 0) {
              preco = t('precos_gratis');
              cobranca = t('precos_7dias');
            } else if (anual) {
              const mes = p.mensal * (1 - descontoAnual);
              preco = brl(mes);
              cobranca = brlInt(Math.round(mes * 12)) + ' ' + t('precos_cobrado_ano');
              risco = brlInt(p.mensal);
            } else {
              preco = brlInt(p.mensal);
              cobranca = t('precos_por_mes');
            }
            return (
              <div key={p.id} className={'plano' + (p.destaque ? ' plano--destaque' : '')}>
                <div className="plano__topo">
                  {p.tagKey && <span className="plano__tag">{t(p.tagKey)}</span>}
                  <h3 className="plano__nome">{p.nome}</h3>
                  <p className="plano__desc">{t(p.descKey)}</p>
                  <div className="plano__preco">
                    {risco && <span className="plano__risco">{risco}</span>}
                    <span className="plano__valor">{preco}</span>
                    {p.mensal > 0 && <span className="plano__mes">{t('conta_mes')}</span>}
                  </div>
                  <p className="plano__cobranca">{cobranca}</p>
                  <div className="plano__cred">
                    <div className="plano__credtxt">{t(p.creditosTxtKey)}</div>
                    <div className="plano__credsub">{t(p.creditosSubKey)}</div>
                  </div>
                </div>
                <button className={'btn btn--' + p.ctaEstilo} onClick={() => assinarPlano(p.id)}>{t(p.ctaKey)}</button>
                <ul className="feats">
                  {p.feats.map((f, i) => (
                    <li key={i} className={f[0] ? '' : 'off'}>
                      <Check on={f[0]} />{t(f[1])}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* CORA TEAMS */}
      <div className="sec sec--wash">
        <div className="container">
          <div className="teams">
            <div className="teams__lado">
              <h2 className="teams__titulo">Cora Teams</h2>
              <p className="teams__lead">
                {t('precos_teams_lead')}
              </p>
              <ul className="teams__feats">
                <li>✓ {t('precos_tf1')}</li>
                <li>✓ {t('precos_tf2')}</li>
                <li>✓ {t('precos_tf3')}</li>
                <li>✓ {t('precos_tf4')}</li>
                <li>✓ {t('precos_tf5')}</li>
              </ul>
              <button className="btn btn--ink" style={{ width: '100%', marginTop: 24 }} onClick={() => router.push('/teams')}>{t('precos_criar_equipe')}</button>
            </div>
            <div className="teams__tabelas">
              <TabelaTeams titulo={t('precos_teams_pro')} dados={teamsPro} t={t} />
              <TabelaTeams titulo={t('precos_teams_studio')} dados={teamsStudio} t={t} />
            </div>
          </div>
        </div>
      </div>

      {/* O QUE VEM EM CADA PLANO */}
      <div className="sec">
        <div className="container">
          <h2>{t('precos_oque_vem')}</h2>
          <p className="sub">{t('precos_compare')}</p>
          <div className="tabela-wrap">
            <table className="cmp">
              <thead>
                <tr>
                  <th></th>
                  {colunas.map((c) => (
                    <th key={c} className={c === 'Pro' ? 'dest' : ''}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparacao.map((linha, i) => {
                  if (linha[0] === 'grupo') {
                    return <tr key={i} className="grupo"><td colSpan={5}>{t(linha[1])}</td></tr>;
                  }
                  return (
                    <tr key={i}>
                      <td>{tr(linha[0])}</td>
                      {linha.slice(1).map((v, j) => (
                        <td key={j}><Celula v={tr(v)} /></td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUANTO CUSTA CADA GERAÇÃO */}
      <div className="sec sec--wash">
        <div className="container">
          <h2>{t('precos_quanto_custa')}</h2>
          <p className="sub">{t('precos_custa_sub')}</p>

          <div className="custo-abas">
            {Object.keys(custos).map((key) => (
              <button
                key={key}
                className={'custo-aba' + (abaCusto === key ? ' ativa' : '')}
                onClick={() => setAbaCusto(key)}
              >
                {tr(custos[key].labelKey)}
              </button>
            ))}
          </div>

          <div className="custo-bloco">
            <table className="custo">
              <thead>
                <tr>
                  {custos[abaCusto].colunas.map((c, i) => (
                    <td key={i} className={i === 0 ? '' : 'num'}>{tr(c)}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {custos[abaCusto].linhas.map((linha, i) => (
                  <tr key={i}>
                    {linha.map((v, j) => (
                      <td key={j} className={j === 0 ? '' : 'num'}>{j === 0 ? tr(v) : num(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECARGAS */}
      <div className="sec">
        <div className="container">
          <h2>{t('precos_acabaram')}</h2>
          <p className="sub">
            {t('precos_recarga_sub')}
          </p>
          <div className="recargas">
            {recargas.map((r) => (
              <div key={r.id} className={'recarga' + (r.popular ? ' recarga--pop' : '')}>
                <div className="recarga__n">{t(r.nomeKey)}</div>
                <div className="recarga__cred">{r.creditos.toLocaleString('pt-BR')} {t('precos_creditos')}</div>
                <div className="recarga__p">{brlInt(r.preco)}</div>
                <div className="recarga__u">{brl(r.preco / r.creditos)} {t('precos_por_credito')}</div>
                <div
                  style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#8a8a8a', textAlign: 'center' }}
                >
                  {t('precos_comprar_conta')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="sec sec--wash">
        <div className="container">
          <h2>{t('precos_faq_titulo')}</h2>
          <div className="faq">
            {faq.map((item, i) => (
              <details key={i}>
                <summary>{t(item[0])}</summary>
                <p>{t(item[1])}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {avisoRecarga && (
        <div className="foto-overlay" onClick={() => setAvisoRecarga(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <div className="foto-titulo">{t('precos_recarga_titulo')}</div>
            <div className="foto-orient">
              {t('precos_recarga_modal')}
            </div>
            <button
              className="btn btn--verde"
              style={{ width: '100%', marginTop: 18, padding: '12px' }}
              onClick={() => {
                setAvisoRecarga(false);
                document.querySelector('.planos')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('precos_ver_planos')}
            </button>
            <div className="foto-cancelar" onClick={() => setAvisoRecarga(false)}>{t('precos_agora_nao')}</div>
          </div>
        </div>
      )}

      {modalUpgrade && (
        <div className="modal-overlay" onClick={() => setModalUpgrade(false)}>
          <div className="modal-cpf" onClick={(e) => e.stopPropagation()}>
            <h3>{t('precos_ja_plano')}</h3>
            <p>
              {t('precos_ja_plano_p1')} <strong style={{ textTransform: 'capitalize' }}>{conta?.plano}</strong>{t('precos_ja_plano_p2')}
              {conta?.plano === planoAlvo
                ? ' ' + t('precos_ja_plano_gerenciar')
                : ' ' + t('precos_ja_plano_mudar')}
            </p>
            <div className="modal-acoes">
              <button className="btn btn--ghost" onClick={() => setModalUpgrade(false)}>
                {t('comum_cancelar')}
              </button>
              <button className="btn btn--verde" onClick={irParaPortal}>
                {conta?.plano === planoAlvo ? t('precos_gerenciar') : t('precos_mudar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCpf && (
        <div className="modal-overlay" onClick={() => !salvandoCpf && setModalCpf(false)}>
          <div className="modal-cpf" onClick={(e) => e.stopPropagation()}>
            <h3>{t('precos_nota')}</h3>

            <div className="modal-seg">
              <button
                className={'modal-seg-btn' + (fiscalTipo === 'br' ? ' on' : '')}
                onClick={() => { setFiscalTipo('br'); setCpfErro(''); }}
              >{t('precos_brasil')}</button>
              <button
                className={'modal-seg-btn' + (fiscalTipo === 'intl' ? ' on' : '')}
                onClick={() => { setFiscalTipo('intl'); setCpfErro(''); }}
              >{t('precos_outro_pais')}</button>
            </div>

            {fiscalTipo === 'br' ? (
              <>
                <p className="modal-cpf-desc">{t('precos_cpf_desc')}</p>
                <div className="modal-campo-rot">CPF</div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  className="modal-input"
                  autoFocus
                />
              </>
            ) : (
              <>
                <p className="modal-cpf-desc">{t('precos_intl_desc')}</p>
                <div className="modal-cpf-dupla">
                  <div style={{ flex: 2 }}>
                    <div className="modal-campo-rot">{t('precos_doc_label')}</div>
                    <input
                      type="text"
                      placeholder={t('precos_doc_ph')}
                      value={docIntl}
                      onChange={(e) => setDocIntl(e.target.value)}
                      className="modal-input"
                      autoFocus
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="modal-campo-rot">{t('precos_pais')}</div>
                    <input
                      type="text"
                      placeholder={t('precos_pais_ph')}
                      value={paisIntl}
                      onChange={(e) => setPaisIntl(e.target.value)}
                      className="modal-input"
                    />
                  </div>
                </div>
              </>
            )}

            {cpfErro && <div className="modal-erro">{cpfErro}</div>}
            <div className="modal-acoes">
              <button className="btn btn--ghost" onClick={() => setModalCpf(false)} disabled={salvandoCpf}>
                {t('comum_cancelar')}
              </button>
              <button className="btn btn--verde" onClick={confirmarCpf} disabled={salvandoCpf}>
                {salvandoCpf ? t('comum_salvando') : t('confirma_btn_continuar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
