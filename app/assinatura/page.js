'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, abrirPortal, lerEquipe, iniciarCheckout } from '../../lib/auth';
import { recargas } from '../../lib/planos';
import { STRIPE_PRICES } from '../../lib/stripe-prices';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

export default function Assinatura() {
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

  async function comprarRecarga() {
    setErro(''); setComprando(true);
    try {
      const priceId = STRIPE_PRICES.recargas[recargaSel];
      // se for dono, direciona ao assento escolhido; senão, recarga na própria conta
      const assento = conta.eh_dono_equipe ? assentoSel : null;
      await iniciarCheckout(priceId, null, assento);
    } catch (e) {
      setErro(e.message);
    } finally {
      setComprando(false);
      setModalRecarga(false);
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

  if (carregando) return <AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>;
  if (!conta) return null;

  const ehAdmin = conta.is_admin === true;
  const ehPago = conta.plano && conta.plano !== 'free' && !ehAdmin;

  // "renova em 11 de agosto" é uma data; "29 dias" é o que a pessoa sente.
  const dataRenov = conta.eh_dono_equipe ? conta.equipe_renova_em : conta.expira_em;
  const diasAte = dataRenov
    ? Math.max(0, Math.ceil((new Date(dataRenov) - new Date()) / 86400000))
    : null;
  const ehDonoEquipe = conta.eh_dono_equipe === true;

  return (
    <AppShell>
      <div className="admin-wrap">
        <h1 className="conta-ola">Assinatura</h1>
        {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

        {ehDonoEquipe && equipe ? (
          <div className="conta-card" style={{ borderColor: 'var(--roxo)' }}>
            <h2 className="conta-h2">Assinatura de equipe</h2>
            <p className="conta-p">
              Você tem uma equipe no plano <strong>{NOME_PLANO[equipe.plano] || equipe.plano}</strong> com {equipe.assentos} assentos.
              Gerencie os membros e a foto na aba Equipe.
            </p>
            <button className="btn btn--ink" style={{ width: 'auto', marginTop: 6, padding: '11px 24px' }} onClick={gerenciar} disabled={abrindo}>
              {abrindo ? 'Abrindo...' : 'Gerenciar assinatura'}
            </button>
          </div>
        ) : (
          <div className="as-plano">
            <div className="as-plano-topo">
              <div>
                <div className="as-plano-rot">
                  <span>Plano atual</span>
                  {conta.status === 'ativo' && <em>ATIVO</em>}
                </div>
                <strong className="as-plano-nome">
                  {ehAdmin ? 'Admin' : (NOME_PLANO[conta.plano] || conta.plano)}
                </strong>
                <span className="as-plano-sub">
                  {ehAdmin ? 'Acesso ilimitado'
                    : <>
                        {(conta.creditos_total ?? 0).toLocaleString('pt-BR')} créditos por mês
                        {diasAte != null && <> · renova em {diasAte} dias</>}
                      </>}
                </span>
              </div>

              {!ehAdmin && conta.valor_centavos > 0 && (
                <div className="as-plano-preco">
                  <strong>
                    R$ {((conta.valor_centavos || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    <em>/mês</em>
                  </strong>
                  {conta.assinou_em && (
                    <span>
                      Cliente desde{' '}
                      {new Date(conta.assinou_em).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
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
                  {abrindo ? 'Abrindo...' : 'Gerenciar assinatura'}
                </button>
              ) : !ehAdmin ? (
                <Link href="/precos" className="as-btn-cta">Ver planos</Link>
              ) : null}
            </div>
          </div>
        )}

        {(ehPago || conta.eh_dono_equipe) && (
          <div className="conta-card">
            <h2 className="conta-h2">Precisa de mais créditos?</h2>
            <p className="conta-p">
              Recargas avulsas valem por 1 ano e são usadas depois que os
              créditos do plano acabam.
            </p>

            {/* O dono escolhe para QUEM vai a recarga: numa equipe, comprar
                crédito sem dizer o destino não quer dizer nada. */}
            {conta.eh_dono_equipe && (
              membros.length ? (
                <div className="rec-destino">
                  <label className="login-label">Enviar para</label>
                  <select
                    className="login-input"
                    value={assentoSel}
                    onChange={(e) => setAssentoSel(e.target.value)}
                  >
                    {membros.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.email}{m.eh_dono ? ' (você)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="conta-p" style={{ color: 'var(--alerta)' }}>
                  Nenhum membro ativo. Convide alguém primeiro.
                </p>
              )
            )}

            <div className="rec-grade">
              {recargas.map((r) => (
                <button
                  key={r.id}
                  className={'rec-op' + (recargaSel === r.id ? ' rec-op--on' : '')}
                  onClick={() => setRecargaSel(r.id)}
                >
                  {r.popular && <em className="rec-tag">POPULAR</em>}
                  <span className="rec-nome">{r.n}</span>
                  <strong>{r.creditos.toLocaleString('pt-BR')}</strong>
                  <span className="rec-preco">R$ {r.preco}</span>
                </button>
              ))}
            </div>

            {/* Botão compacto, alinhado à esquerda (mesmo padrão do "Gerenciar
                assinatura"). Quantidade e preço já aparecem no card selecionado. */}
            <button
              className="rec-btn"
              onClick={comprarRecarga}
              disabled={comprando || (conta.eh_dono_equipe && !membros.length)}
            >
              {comprando ? 'Abrindo o pagamento...' : 'Comprar'}
            </button>
          </div>
        )}
      </div>

    </AppShell>
  );
}
