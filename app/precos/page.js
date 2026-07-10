'use client';

import { useState } from 'react';
import Nav from '../../components/Nav';
import {
  planos, recargas, descontoAnual,
  comparacao, custoImagens, custoUpscale, faq,
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
              <button className="btn btn--ink" style={{ marginTop: 24 }}>Falar com a gente</button>
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

      {/* QUANTO CUSTA CADA GERAÇÃO */}
      <div className="sec sec--wash">
        <div className="container">
          <h2>Quanto custa cada geração</h2>
          <p className="sub">Créditos consumidos por operação, em cada plano.</p>
          <div className="grid2">
            <div className="bloco">
              <h3>Imagens e cenas</h3>
              <table className="custo">
                <thead>
                  <tr><td>Operação</td><td>Starter</td><td>Pro</td><td>Studio</td></tr>
                </thead>
                <tbody>
                  {custoImagens.map((r, i) => (
                    <tr key={i}>
                      <td>{r[0]}</td><td>{num(r[1])}</td><td>{num(r[2])}</td><td>{num(r[3])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bloco">
              <h3>Upscale</h3>
              <table className="custo">
                <thead><tr><td>Resolução</td><td>Créditos</td></tr></thead>
                <tbody>
                  {custoUpscale.map((r, i) => (
                    <tr key={i}><td>{r[0]}</td><td>{num(r[1])}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </>
  );
}
