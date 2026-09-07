'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import ModalFiscal from '../../components/ModalFiscal';
import DropdownCora from '../../components/DropdownCora';
import { lerConta, abrirPortal, lerEquipe, iniciarCheckout, lerCobranca } from '../../lib/auth';
import { recargas } from '../../lib/planos';
import { itemDaRecarga } from '../../lib/stripe-prices';
import { useIdioma, tOpt, localeDeIdioma } from '../../lib/i18n';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

export default function Assinatura() {
  const { t, idioma } = useIdioma();
  const router = useRouter();
  const [conta, setConta] = useState(null);
  const [equipe, setEquipe] = useState(null);
  const [membros, setMembros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abrindo, setAbrindo] = useState(false);
  // modal de recarga
  const [recargaSel, setRecargaSel] = useState('g');   // o popular, por padrão

  // O pacote escolhido, para o botão poder dizer o que vai comprar
  const recargaEscolhida = recargas.find((r) => r.id === recargaSel);
  const [assentoSel, setAssentoSel] = useState('');
  const [comprando, setComprando] = useState(false);
  // Janela de CPF/CNPJ: abre quando o servidor recusa o checkout por falta de
  // dados fiscais (428), e a compra segue sozinha assim que a pessoa salva.
  const [modalFiscal, setModalFiscal] = useState(false);

  // O cartão que paga e a lista do que já foi cobrado. Falha em silêncio: uma
  // conta sem assinatura ainda não tem customer no Stripe, e isso não é erro.
  const [cobranca, setCobranca] = useState(null);
  const [fatura, setFatura] = useState(null);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setCarregando(false);
    if (c.eh_dono_equipe) {
      lerEquipe().then((d) => {
        if (d && d.equipe) setEquipe(d.equipe);
        if (d && d.membros) {
          const ativos = d.membros.filter(m => m.status === 'ativo');
          setMembros(ativos);
          if (ativos.length) setAssentoSel(String(ativos[0].id));
        }
      }).catch(() => {});
    }
  }, [router]);

  // Cada cartão compra a si mesmo. Antes existia um `recargaSel` e um botão
  // solto embaixo: dois gestos para uma decisão que já estava tomada quando a
  // pessoa olhou o preço. O id agora vem do cartão que foi clicado.
  useEffect(() => {
    let vivo = true;
    lerCobranca().then((d) => { if (vivo) setCobranca(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  async function comprarRecarga(qual) {
    const id = qual || recargaSel;
    setRecargaSel(id);
    setErro(''); setComprando(true);
    try {
      const priceId = itemDaRecarga(id);
      // se for dono, direciona ao assento escolhido; senão, recarga na própria conta
      const assento = conta.eh_dono_equipe ? assentoSel : null;
      await iniciarCheckout(priceId, null, assento);
    } catch (e) {
      // Sem CPF/CNPJ na conta, o servidor recusa o checkout (428). Antes isso
      // virava só a mensagem "Dados fiscais necessários" e a pessoa ficava sem
      // saída — o campo para preencher só existia na página de preços. Agora a
      // janela abre aqui também, e a compra segue sozinha depois de salvar.
      if (e.precisaCpf) {
        setModalFiscal(true);
        return;
      }
      // Recarga sem plano ativo: o aviso sozinho deixaria a pessoa parada numa
      // tela sem botão de assinar. Mostra o motivo e leva para os planos, que é
      // o que ela precisa fazer para poder comprar.
      if (e.precisaPlano) {
        setErro(t('recarga_precisa_plano'));
        setTimeout(() => router.push('/precos'), 1800);
        return;
      }
      setErro(e.message);
    } finally {
      setComprando(false);
      // (havia um `setModalRecarga(false)` aqui, chamando uma função que nunca
      //  foi declarada — a escolha de recarga é inline nesta tela, não um
      //  modal. Todo clique em "Comprar" jogava um ReferenceError, invisível
      //  porque a página navegava logo em seguida.)
    }
  }

  async function gerenciar() {
    setErro('');
    const guia = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    setAbrindo(true);
    try {
      await abrirPortal(guia);
    } catch (e) {
      setErro(e.message);
    } finally {
      setAbrindo(false);
    }
  }

  if (carregando) return <AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;
  if (!conta) return null;

  const ehAdmin = conta.is_admin === true;
  const ehPago = conta.plano && conta.plano !== 'free' && !ehAdmin;

  // "renova em 11 de agosto" é uma data; "29 dias" é o que a pessoa sente.
  const dataRenov = conta.eh_dono_equipe ? conta.equipe_renova_em : conta.expira_em;
  const diasAte = dataRenov
    ? Math.max(0, Math.ceil((new Date(dataRenov) - new Date()) / 86400000))
    : null;
  const ehDonoEquipe = conta.eh_dono_equipe === true;
  const loc = localeDeIdioma(idioma);

  // Bandeira: o Stripe manda 'mastercard', 'visa', 'amex'. A sigla é o que cabe
  // no quadradinho, e o nome por extenso é o que a pessoa lê na frase.
  const BANDEIRAS = {
    visa: ['VISA', 'Visa'], mastercard: ['MC', 'Mastercard'], amex: ['AMEX', 'American Express'],
    elo: ['ELO', 'Elo'], hipercard: ['HIPER', 'Hipercard'], diners: ['DINERS', 'Diners Club'],
    discover: ['DISC', 'Discover'], jcb: ['JCB', 'JCB'], unionpay: ['UP', 'UnionPay'],
  };
  const siglaDaBandeira = (m) => (BANDEIRAS[m] || [String(m || '').slice(0, 4).toUpperCase() || '···'])[0];
  const nomeDaBandeira = (m) => (BANDEIRAS[m] || [null, m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Cartão'])[1];

  const dataLonga = (iso) => new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' });
  const dinheiro = (centavos, moeda) => new Intl.NumberFormat(loc, {
    style: 'currency', currency: (moeda || 'brl').toUpperCase(),
  }).format((centavos || 0) / 100);

  return (
    <AppShell>
      <div className="admin-wrap">
        <div className="conta-cabeca">
          <div
            className="conta-cabeca__foto"
            style={conta.foto_url ? { backgroundImage: `url(${conta.foto_url})`, color: 'transparent' } : undefined}
          >{conta.foto_url ? '' : (conta.nome || conta.email || '?').charAt(0).toUpperCase()}</div>
          <div className="conta-cabeca__txt">
            <p className="eyebrow">{t('pn_sua_conta')}</p>
            <h1 className="conta-cabeca__nome">{t('assinatura_titulo')}</h1>
            <p className="conta-cabeca__email">{t('assinatura_recibos_stripe')}</p>
          </div>
        </div>
        {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

        {ehDonoEquipe && equipe ? (
          <div className="conta-card">
            <h2 className="conta-h2">{t('assinatura_titulo_equipe')}</h2>
            <p className="conta-p">
              {t('assinatura_equipe_pre')}<strong>{NOME_PLANO[equipe.plano] || equipe.plano}</strong>{t('assinatura_equipe_mid')}{equipe.assentos}{t('assinatura_equipe_pos')}
            </p>
            <button className="as-btn-cta" style={{ marginTop: 16 }} onClick={gerenciar} disabled={abrindo}>
              {abrindo ? t('assinatura_abrindo') : t('assinatura_gerenciar')}
            </button>
          </div>
        ) : (
          <div className="as-plano">
            <div className="as-plano-topo">
              <div>
                <div className="as-plano-rot">
                  <span>{t('assinatura_plano_atual')}</span>
                  {conta.status === 'ativo' && <em>{t('assinatura_ativo')}</em>}
                </div>
                <strong className="as-plano-nome">
                  {ehAdmin ? 'Admin' : (NOME_PLANO[conta.plano] || conta.plano)}
                </strong>
                <span className="as-plano-sub">
                  {ehAdmin ? t('assinatura_acesso_ilimitado')
                    : <>
                        {(conta.creditos_total ?? 0).toLocaleString(localeDeIdioma(idioma))} {t('assinatura_creditos_mes')}
                        {diasAte != null && <> · {t('assinatura_renova_em')}{diasAte}{t('assinatura_dias')}</>}
                      </>}
                </span>
              </div>

              {!ehAdmin && conta.valor_centavos > 0 && (
                <div className="as-plano-preco">
                  <strong>
                    R$ {((conta.valor_centavos || 0) / 100).toLocaleString(localeDeIdioma(idioma), { minimumFractionDigits: 2 })}
                    <em>{t('assinatura_por_mes')}</em>
                  </strong>
                  {conta.assinou_em && (
                    <span>
                      {t('assinatura_cliente_desde')}{' '}
                      {new Date(conta.assinou_em).toLocaleDateString(localeDeIdioma(idioma), { month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="as-plano-pe">
              {ehPago ? (
                /* Mudar de plano acontece dentro do portal do Stripe. Um botão
                   levando a /precos era um desvio: a pessoa ia ver a tabela e
                   voltava para clicar aqui de qualquer jeito. */
                <button className="as-btn-cta" onClick={gerenciar} disabled={abrindo}>
                  {abrindo ? t('assinatura_abrindo') : t('assinatura_gerenciar')}
                </button>
              ) : !ehAdmin ? (
                <Link href="/precos" className="as-btn-cta">{t('assinatura_ver_planos')}</Link>
              ) : null}
            </div>
          </div>
        )}

        {(ehPago || conta.eh_dono_equipe) && (
          <div className="conta-card">
            <h2 className="conta-h2">{t('assinatura_mais_creditos')}</h2>
            <p className="conta-p">
              {t('assinatura_recarga_info')}
            </p>

            {/* O dono escolhe para QUEM vai a recarga: numa equipe, comprar
                crédito sem dizer o destino não quer dizer nada. */}
            {conta.eh_dono_equipe && (
              membros.length ? (
                <div className="rec-destino">
                  <label className="perfil-lbl">{t('assinatura_enviar_para')}</label>
                  <DropdownCora
                    valor={assentoSel}
                    onEscolher={(v) => setAssentoSel(v)}
                    opcoes={membros.map((m) => ({
                      v: String(m.id),
                      n: m.email + (m.eh_dono ? t('assinatura_voce') : ''),
                    }))}
                  />
                </div>
              ) : (
                <p className="conta-p" style={{ color: 'var(--alerta)' }}>
                  {t('assinatura_sem_membros')}
                </p>
              )
            )}

            {/* Um botão por cartão, como os planos na página de preços. O
                cartão não é mais um <button>, porque agora ele tem um dentro,
                e botão dentro de botão não é HTML válido. */}
            <div className="rec-grade">
              {recargas.map((r) => (
                <div key={r.id} className={'rec-op' + (r.popular ? ' rec-op--pop' : '')}>
                  {r.popular && <em className="rec-tag">{t('assinatura_popular')}</em>}
                  <span className="rec-nome">{t(r.nomeKey)}</span>
                  <strong>{r.creditos.toLocaleString(localeDeIdioma(idioma))}</strong>
                  <span className="rec-preco">{t('pn_creditos_min')}</span>
                  {/* O preço mora no botão, e não no corpo do cartão: é no
                      clique que a pessoa assume o valor, e ali ele também
                      preenche uma pílula que com um "Comprar" sozinho ficava
                      oca. */}
                  <button
                    className="rec-comprar"
                    onClick={() => comprarRecarga(r.id)}
                    disabled={comprando || (conta.eh_dono_equipe && !membros.length)}
                  >
                    {comprando && recargaSel === r.id
                      ? t('assinatura_abrindo_pagamento')
                      : `${t('pn_comprar_por')} R$ ${r.preco}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FORMA DE PAGAMENTO ──
            O número do cartão nunca passa por aqui: o Stripe guarda ele, e a
            gente só mostra bandeira e os quatro últimos, que é o que a pessoa
            usa para reconhecer qual cartão é. Trocar abre o portal. */}
        <div className="conta-card">
          <h2 className="conta-h2">{t('pn_pagamento')}</h2>
          <p className="conta-p">{t('pn_pagamento_sub')}</p>
          {cobranca?.cartao ? (
            <div className="pag-linha">
              <span className="pag-bandeira">{siglaDaBandeira(cobranca.cartao.marca)}</span>
              <div className="pag-txt">
                <strong>
                  {nomeDaBandeira(cobranca.cartao.marca)} {t('pn_pagamento_termina')} {cobranca.cartao.fim}
                </strong>
                {cobranca.cartao.mes && cobranca.cartao.ano && (
                  <span>
                    {t('pn_pagamento_vence')} {String(cobranca.cartao.mes).padStart(2, '0')}/{cobranca.cartao.ano}
                  </span>
                )}
              </div>
              <button className="pag-btn" onClick={gerenciar} disabled={abrindo}>
                {abrindo ? t('assinatura_abrindo') : t('pn_atualizar')}
              </button>
            </div>
          ) : (
            <p className="pag-vazio">{t('pn_pagamento_sem')}</p>
          )}
        </div>

        {/* ── FATURAS ── */}
        <div className="conta-card">
          <h2 className="conta-h2">{t('pn_faturas')}</h2>
          <p className="conta-p">{t('pn_faturas_sub')}</p>
          {(cobranca?.faturas || []).length ? (
            <div className="fat-rolo">
              <table className="fat">
                <thead>
                  <tr>
                    <th>{t('pn_col_data')}</th>
                    <th>{t('pn_col_desc')}</th>
                    <th style={{ textAlign: 'right' }}>{t('pn_col_total')}</th>
                    <th>{t('pn_col_status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cobranca.faturas.map((f) => (
                    <tr key={f.id}>
                      <td className="fat__data">{dataLonga(f.data)}</td>
                      <td className="fat__desc">{f.descricao}</td>
                      <td className="fat__total">{dinheiro(f.total_centavos, f.moeda)}</td>
                      <td>
                        <span className={'fat-selo' + (f.status === 'paga' ? '' : ' fat-selo--aberta')}>
                          {f.status === 'paga' ? t('pn_paga') : t('pn_aberta')}
                        </span>
                      </td>
                      <td className="fat__acao">
                        <button className="fat-ver" onClick={() => setFatura(f)}>{t('pn_ver')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="fat-vazio">{t('pn_faturas_sem')}</p>
          )}
        </div>
      </div>

      {/* ── A FATURA ABERTA ──
          Mesma casca do e-mail: faixa no alto, marca, cartão. Quem recebe o
          recibo por e-mail e depois abre este aqui reconhece os dois como a
          mesma empresa. */}
      {fatura && (
        <div className="doc-fundo" onClick={() => setFatura(null)}>
          <div className="doc" onClick={(e) => e.stopPropagation()}>
            <div className="doc__faixa" aria-hidden="true" />
            <div className="doc__miolo">
              <div className="doc__marca" role="img" aria-label="Cora Render" />

              <div className="doc__topo">
                <div>
                  <div className="doc__tit">{t('pn_fatura')}</div>
                  <div className="doc__num">
                    {fatura.numero ? `Nº ${fatura.numero} · ` : ''}{dataLonga(fatura.data)}
                  </div>
                </div>
                <span className={'fat-selo' + (fatura.status === 'paga' ? '' : ' fat-selo--aberta')}>
                  {fatura.status === 'paga' ? t('pn_paga') : t('pn_aberta')}
                </span>
              </div>

              <div className="doc__quem">
                <div className="doc__bloco">
                  <span>{t('pn_de')}</span>
                  <p><b>9BARRA7 Academy</b><br />contato@corarender.com</p>
                </div>
                <div className="doc__bloco">
                  <span>{t('pn_para')}</span>
                  <p><b>{conta.nome || conta.email}</b><br />{conta.email}</p>
                </div>
              </div>

              <table className="doc__itens">
                <thead>
                  <tr><th>{t('pn_col_desc')}</th><th>{t('pn_valor')}</th></tr>
                </thead>
                <tbody>
                  {(fatura.itens && fatura.itens.length ? fatura.itens : [{
                    descricao: fatura.descricao, valor_centavos: fatura.total_centavos,
                  }]).map((it, i) => (
                    <tr key={i}>
                      <td>{it.descricao}</td>
                      <td>{dinheiro(it.valor_centavos, fatura.moeda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="doc__total">
                <span>{t('pn_total_pago')}</span>
                <strong>{dinheiro(fatura.total_centavos, fatura.moeda)}</strong>
              </div>

              <p className="doc__pe">
                {fatura.status === 'paga' && (
                  <>
                    {t('pn_pago_em')} {dataLonga(fatura.data)}
                    {cobranca?.cartao
                      ? ` ${t('pn_no_cartao')} ${nomeDaBandeira(cobranca.cartao.marca)} ${t('pn_pagamento_termina')} ${cobranca.cartao.fim}.`
                      : '.'}
                    {' '}
                  </>
                )}
                {t('pn_fatura_pe')}
              </p>

              <div className="doc__acoes">
                <button className="doc__bt" onClick={() => window.print()}>{t('pn_imprimir')}</button>
                <button className="doc__bt doc__bt--linha" onClick={() => setFatura(null)}>{t('fechar')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalFiscal
        aberto={modalFiscal}
        onFechar={() => setModalFiscal(false)}
        onSalvo={() => { setModalFiscal(false); comprarRecarga(); }}
      />
    </AppShell>
  );
}
