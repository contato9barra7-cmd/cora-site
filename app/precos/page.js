'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { iniciarCheckout, salvarCPF, lerConta, abrirPortal } from '../../lib/auth';
import { STRIPE_PRICES } from '../../lib/stripe-prices';
import Nav from '../../components/Nav';
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

function TabelaTeams({ titulo, dados }) {
  return (
    <div className="teams__tabela">
      <h4>{titulo}</h4>
      <div className="tab">
        <table>
          <thead>
            <tr>
              <th>Assentos</th>
              <th className="num">Desconto</th>
              <th className="num">Por assento</th>
              <th className="num">Total por mês</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((l, i) => (
              <tr key={i}>
                <th scope="row">{l[0]}</th>
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
  const [anual, setAnual] = useState(false);
  const [abaCusto, setAbaCusto] = useState('imagens');
  const [erroCheckout, setErroCheckout] = useState('');
  const [modalCpf, setModalCpf] = useState(false);
  const [cpf, setCpf] = useState('');
  const [cpfErro, setCpfErro] = useState('');
  const [priceIdPendente, setPriceIdPendente] = useState(null);
  const [salvandoCpf, setSalvandoCpf] = useState(false);
  const [conta, setConta] = useState(null);
  const [modalUpgrade, setModalUpgrade] = useState(false);
  const [planoAlvo, setPlanoAlvo] = useState('');
  const router = useRouter();

  useEffect(() => {
    setConta(lerConta());
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
      await salvarCPF(cpf);
      // abre a guia a partir DESTE clique (evita bloqueio de popup)
      const guia = typeof window !== 'undefined' ? window.open('', '_blank') : null;
      setModalCpf(false);
      setCpf('');
      if (priceIdPendente) await comprar(priceIdPendente, guia);
    } catch (e) {
      setCpfErro(e.message);
    } finally {
      setSalvandoCpf(false);
    }
  }

  async function comprarRecarga(recargaId) {
    const priceId = STRIPE_PRICES.recargas[recargaId];
    if (!priceId) return;
    const guia = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    await comprar(priceId, guia);
  }

  async function assinarPlano(planoId) {
    if (planoId === 'free') { router.push('/cadastro'); return; }

    // Já tem plano pago ativo? Não deixa comprar de novo — oferece upgrade/troca.
    const temPlanoPago = conta && conta.plano && conta.plano !== 'free' && conta.status === 'ativo';
    if (temPlanoPago) {
      if (conta.plano === planoId) {
        // mesmo plano que já tem
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
    const guia = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    await comprar(priceId, guia);
  }

  async function irParaPortal() {
    setModalUpgrade(false);
    try {
      await abrirPortal();
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
          <h1>Escolha como você quer renderizar</h1>
          <p>Planos mensais, sem fidelidade. Cancele quando quiser.</p>
          <div className="toggle">
            <button className={!anual ? 'ativo' : ''} onClick={() => setAnual(false)}>Mensal</button>
            <button className={anual ? 'ativo' : ''} onClick={() => setAnual(true)}>
              Anual · -{Math.round(descontoAnual * 100)}%
            </button>
          </div>
        </div>

        <div className="planos">
          {planos.map((p) => {
            let preco, cobranca = '', risco = '';
            if (p.mensal === 0) {
              preco = 'Grátis';
              cobranca = '7 dias';
            } else if (anual) {
              const mes = p.mensal * (1 - descontoAnual);
              preco = brl(mes);
              cobranca = brlInt(Math.round(mes * 12)) + ' cobrados por ano';
              risco = brlInt(p.mensal);
            } else {
              preco = brlInt(p.mensal);
              cobranca = 'por mês, cobrado mensalmente';
            }
            return (
              <div key={p.id} className={'plano' + (p.destaque ? ' plano--destaque' : '')}>
                <div className="plano__topo">
                  {p.tag && <span className="plano__tag">{p.tag}</span>}
                  <h3 className="plano__nome">{p.nome}</h3>
                  <p className="plano__desc">{p.desc}</p>
                  <div className="plano__preco">
                    {risco && <span className="plano__risco">{risco}</span>}
                    <span className="plano__valor">{preco}</span>
                    {p.mensal > 0 && <span className="plano__mes">/mês</span>}
                  </div>
                  <p className="plano__cobranca">{cobranca}</p>
                  <div className="plano__cred">
                    <div className="plano__credtxt">{p.creditosTxt}</div>
                    <div className="plano__credsub">{p.creditosSub}</div>
                  </div>
                </div>
                <button className={'btn btn--' + p.ctaEstilo} onClick={() => assinarPlano(p.id)}>{p.cta}</button>
                <ul className="feats">
                  {p.feats.map((f, i) => (
                    <li key={i} className={f[0] ? '' : 'off'}>
                      <Check on={f[0]} />{f[1]}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* CORA TEAMS — logo abaixo dos planos */}
      <div className="sec sec--wash">
        <div className="container">
          <div className="teams">
            <div className="teams__lado">
              <h2 className="teams__titulo">Cora Teams</h2>
              <p className="teams__lead">
                Painel de administração para distribuir assentos e acompanhar o
                consumo da equipe. Quanto mais assentos, maior o desconto.
              </p>
              <ul className="teams__feats">
                <li>✓ Painel de administração</li>
                <li>✓ Convide e remova pessoas da equipe</li>
                <li>✓ Acompanhe o consumo de créditos por pessoa</li>
                <li>✓ Faturamento único</li>
                <li>✓ Mínimo de 2 assentos</li>
              </ul>
              <button className="btn btn--ink" style={{ width: '100%', marginTop: 24 }}>Falar com a gente</button>
            </div>
            <div className="teams__tabelas">
              <TabelaTeams titulo="Teams sobre o Pro" dados={teamsPro} />
              <TabelaTeams titulo="Teams sobre o Studio" dados={teamsStudio} />
            </div>
          </div>
        </div>
      </div>

      {/* O QUE VEM EM CADA PLANO */}
      <div className="sec">
        <div className="container">
          <h2>O que vem em cada plano</h2>
          <p className="sub">Compare tudo lado a lado.</p>
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
                    return <tr key={i} className="grupo"><td colSpan={5}>{linha[1]}</td></tr>;
                  }
                  return (
                    <tr key={i}>
                      <td>{linha[0]}</td>
                      {linha.slice(1).map((v, j) => (
                        <td key={j}><Celula v={v} /></td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUANTO CUSTA CADA GERAÇÃO — com abas */}
      <div className="sec sec--wash">
        <div className="container">
          <h2>Quanto custa cada geração</h2>
          <p className="sub">Cada operação com IA consome créditos. O que não usa IA — material, espelho, otimizar o modelo — é sempre grátis.</p>

          <div className="custo-abas">
            {Object.keys(custos).map((key) => (
              <button
                key={key}
                className={'custo-aba' + (abaCusto === key ? ' ativa' : '')}
                onClick={() => setAbaCusto(key)}
              >
                {custos[key].label}
              </button>
            ))}
          </div>

          <div className="custo-bloco">
            <table className="custo">
              <thead>
                <tr>
                  {custos[abaCusto].colunas.map((c, i) => (
                    <td key={i} className={i === 0 ? '' : 'num'}>{c}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {custos[abaCusto].linhas.map((linha, i) => (
                  <tr key={i}>
                    {linha.map((v, j) => (
                      <td key={j} className={j === 0 ? '' : 'num'}>{num(v)}</td>
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
          <h2>Acabaram os créditos no meio do projeto?</h2>
          <p className="sub">Compre uma recarga avulsa. Elas valem por 1 ano e só são usadas depois que os créditos do plano acabam.</p>
          <div className="recargas">
            {recargas.map((r) => (
              <div key={r.n} className={'recarga' + (r.popular ? ' recarga--pop' : '')}>
                <div className="recarga__n">{r.n}</div>
                <div className="recarga__cred">{r.creditos.toLocaleString('pt-BR')} créditos</div>
                <div className="recarga__p">{brlInt(r.preco)}</div>
                <div className="recarga__u">{brl(r.preco / r.creditos)} por crédito</div>
                <button className="btn btn--roxo" style={{ marginTop: 14 }} onClick={() => comprarRecarga(r.id)}>Comprar</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="sec sec--wash">
        <div className="container">
          <h2>Perguntas frequentes</h2>
          <div className="faq">
            {faq.map((item, i) => (
              <details key={i}>
                <summary>{item[0]}</summary>
                <p>{item[1]}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="foot">© {new Date().getFullYear()} Cora Render · 9barra7 Academy</div>
      </div>

      {modalUpgrade && (
        <div className="modal-overlay" onClick={() => setModalUpgrade(false)}>
          <div className="modal-cpf" onClick={(e) => e.stopPropagation()}>
            <h3>Você já tem um plano ativo</h3>
            <p>
              Sua conta já está no plano <strong style={{ textTransform: 'capitalize' }}>{conta?.plano}</strong>.
              {conta?.plano === planoAlvo
                ? ' Para gerenciar sua assinatura, use o portal.'
                : ' Para mudar de plano, faça a alteração no portal — o valor é ajustado proporcionalmente ao tempo restante.'}
            </p>
            <div className="modal-acoes">
              <button className="btn btn--ghost" onClick={() => setModalUpgrade(false)}>
                Cancelar
              </button>
              <button className="btn btn--verde" onClick={irParaPortal}>
                {conta?.plano === planoAlvo ? 'Gerenciar assinatura' : 'Mudar de plano'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCpf && (
        <div className="modal-overlay" onClick={() => !salvandoCpf && setModalCpf(false)}>
          <div className="modal-cpf" onClick={(e) => e.stopPropagation()}>
            <h3>Confirme seu CPF</h3>
            <p>Precisamos do seu CPF para emitir a nota fiscal da sua compra.</p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              className="modal-input"
              autoFocus
            />
            {cpfErro && <div className="modal-erro">{cpfErro}</div>}
            <div className="modal-acoes">
              <button className="btn btn--ghost" onClick={() => setModalCpf(false)} disabled={salvandoCpf}>
                Cancelar
              </button>
              <button className="btn btn--verde" onClick={confirmarCpf} disabled={salvandoCpf}>
                {salvandoCpf ? 'Salvando...' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
