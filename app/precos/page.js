'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { iniciarCheckout, lerConta } from '../../lib/auth';
import { itemDoPlano, itemDaRecarga } from '../../lib/stripe-prices';
import Cabecalho from '../../components/Cabecalho';
import ModalFiscal from '../../components/ModalFiscal';
import { useIdioma } from '../../lib/i18n';
import {
  planos, recargas, descontoAnual,
  comparacao, custos, faq,
  teamsPro, teamsStudio,
} from '../../lib/planos';

function brl(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }
function brlInt(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }
function num(v) { return typeof v === 'number' ? v.toLocaleString('pt-BR') : v; }

// O mesmo cheque do artefato: traco de 2.2, ponta redonda, herdando a cor do
// item. O item apagado leva um X mais fino, pra ele nao competir com os que
// estao ligados.
function Check({ on }) {
  return on ? (
    <svg className="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ) : (
    <svg className="ic-check ic-check--nao" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
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
  // A janela de CPF/CNPJ virou componente (ModalFiscal) — campos, formatação e
  // salvamento moram lá, e /assinatura e /teams usam a mesma. Aqui fica só se
  // ela está aberta e qual compra retomar quando a pessoa terminar.
  const [modalCpf, setModalCpf] = useState(false);
  const [priceIdPendente, setPriceIdPendente] = useState(null);
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

  async function comprar(priceId, guia) {
    setErroCheckout('');
    try {
      await iniciarCheckout(priceId, guia);
    } catch (e) {
      // Ocupa assento de equipe: a saida e sair da equipe, nao renovar nada.
      if (e.jaNaEquipe) { setErroCheckout(t('equipe_ja_ocupa')); return; }
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

  const temPlanoAtivo = conta && conta.plano && conta.plano !== 'free'
                        && conta.status === 'ativo';

  async function comprarRecarga(recargaId) {
    const priceId = itemDaRecarga(recargaId);
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
      // Mesmo plano ou troca: o modal decide o texto (conta?.plano === planoAlvo).
      setPlanoAlvo(planoId);
      setModalUpgrade(true);
      return;
    }
    const priceId = itemDoPlano(planoId, anual ? 'anual' : 'mensal');
    if (!priceId) return;
    const logada = typeof window !== 'undefined' && localStorage.getItem('cora_conta');
    const guia = null;
    await comprar(priceId, guia);
  }

  // Quem já tem plano vai para a própria página de assinatura, onde estão o
  // plano atual, os créditos, a renovação e os botões de gerenciar e comprar.
  //
  // Antes isto chamava `abrirPortal(null)`, que termina num `window.open` — e
  // como ele roda DEPOIS do await, fora do gesto do clique, o navegador
  // bloqueava como pop-up. O botão simplesmente não fazia nada, sem erro
  // nenhum na tela. Navegação interna não tem esse problema.
  function irParaAssinatura() {
    setModalUpgrade(false);
    router.push('/assinatura');
  }
  const colunas = ['Free', 'Starter', 'Pro', 'Studio'];

  return (
    /* `pr` e a classe da pagina. Todo o CSS aprovado (precos-pagina.css)
       depende dela, e e por ela que ele ganha do molde antigo sem precisar
       apagar nada do globals. */
    <main className="pr">
      <Cabecalho aqui="precos" />

      {/* PLANOS */}
      <section className="secao precos-hero" id="planos">
        <div className="env">
          <div className="precos-hero__topo">
            <h1 className="hero__titulo">{t('precos_sub')}</h1>
            <div className="toggle-wrap" role="group" aria-label={t('precos_mensal')}>
              <button type="button" className={'toggle-btn' + (!anual ? ' ativo' : '')}
                      aria-pressed={!anual} onClick={() => setAnual(false)}>{t('precos_mensal')}</button>
              <button type="button" className={'toggle-btn' + (anual ? ' ativo' : '')}
                      aria-pressed={anual} onClick={() => setAnual(true)}>{t('precos_anual')}</button>
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
              <article key={p.id} className={'plano' + (p.destaque ? ' plano--destaque' : '')}>
                {p.tagKey && <span className="plano__selo">{t(p.tagKey)}</span>}
                <div className="plano__cab">
                  <h2 className="plano__nome">{p.nome}</h2>
                  <p className="plano__desc">{t(p.descKey)}</p>
                </div>
                <div className="plano__preco-bloco">
                  <div className="plano__preco">
                    {risco && <span className="plano__risco">{risco}</span>}
                    <span className="plano__valor">{preco}</span>
                    {p.mensal > 0 && <span className="plano__per">{t('conta_mes')}</span>}
                  </div>
                  <p className="plano__cobranca">{cobranca}</p>
                </div>
                <div className="plano__cred">
                  <p className="plano__credtxt">{t(p.creditosTxtKey)}</p>
                  <p className="plano__credsub">{t(p.creditosSubKey)}</p>
                </div>
                <div className="plano__cta">
                  {/* O artefato escreve o nome do plano no botao: "Assinar Pro",
                      nao so "Assinar". Com quatro cartoes lado a lado isso
                      importa, porque o botao passa a dizer sozinho o que faz. O
                      Free fica de fora, o rotulo dele e "Testar 7 dias". */}
                  <button type="button" className={'btn btn--largo btn--' + p.ctaEstilo}
                          onClick={() => assinarPlano(p.id)}>
                    {p.mensal === 0
                      ? t(p.ctaKey)
                      : t('assinar_plano').replace('{plano}', p.nome)}
                  </button>
                </div>
                <ul className="plano__beneficios">
                  {p.feats.map((f, i) => (
                    <li key={i} className={f[0] ? '' : 'esta-fora'}>
                      <Check on={f[0]} />
                      <span className={i === 0 && /mais:/.test(t(f[1])) ? 'plano__beneficio-topo' : ''}>{t(f[1])}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
          </div>
        </div>
      </section>

      {/* CORA TEAMS */}
      <section className="secao secao--wash">
        <div className="env">
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
      </section>

      {/* O QUE VEM EM CADA PLANO */}
      <section className="secao secao--papel">
        <div className="env">
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
      </section>

      {/* QUANTO CUSTA CADA GERAÇÃO */}
      <section className="secao secao--wash">
        <div className="env">
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
      </section>

      {/* RECARGAS */}
      <section className="secao secao--papel">
        <div className="env">
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
      </section>

      {/* FAQ */}
      <section className="secao secao--wash">
        <div className="env">
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
      </section>

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
              <button className="btn btn--verde" onClick={irParaAssinatura}>
                {conta?.plano === planoAlvo ? t('precos_gerenciar') : t('precos_mudar')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalFiscal
        aberto={modalCpf}
        onFechar={() => setModalCpf(false)}
        onSalvo={() => {
          setModalCpf(false);
          if (priceIdPendente) comprar(priceIdPendente, null);
        }}
      />
    </main>
  );
}
