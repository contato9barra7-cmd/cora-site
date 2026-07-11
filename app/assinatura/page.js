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
  const [modalRecarga, setModalRecarga] = useState(false);
  const [recargaSel, setRecargaSel] = useState('g');
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
      const guia = typeof window !== 'undefined' ? window.open('', '_blank') : null;
      // se for dono, direciona ao assento escolhido; senão, recarga na própria conta
      const assento = conta.eh_dono_equipe ? assentoSel : null;
      await iniciarCheckout(priceId, guia, assento);
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
          <div className="conta-card">
            <h2 className="conta-h2">Plano atual</h2>
            <p className="conta-p">
              {ehAdmin ? 'Você é administrador (acesso ilimitado).'
                : `Você está no plano ${NOME_PLANO[conta.plano] || conta.plano}.`}
            </p>

            {ehPago ? (
              <button className="btn btn--ink" style={{ width: 'auto', marginTop: 6, padding: '11px 24px' }} onClick={gerenciar} disabled={abrindo}>
                {abrindo ? 'Abrindo...' : 'Gerenciar assinatura'}
              </button>
            ) : !ehAdmin ? (
              <Link href="/precos" className="btn btn--verde" style={{ width: 'auto', marginTop: 6, padding: '11px 24px', display: 'inline-block' }}>
                Ver planos
              </Link>
            ) : null}
          </div>
        )}

        {(ehPago || conta.eh_dono_equipe) && (
          <div className="conta-card">
            <h2 className="conta-h2">Precisa de mais créditos?</h2>
            <p className="conta-p">
              {conta.eh_dono_equipe
                ? 'Compre recargas avulsas e direcione para um membro da equipe. Valem por 1 ano.'
                : 'Compre recargas avulsas que valem por 1 ano.'}
            </p>
            <button className="btn btn--roxo" style={{ width: 'auto', marginTop: 6, padding: '11px 24px' }} onClick={() => setModalRecarga(true)}>
              Comprar créditos
            </button>
          </div>
        )}
      </div>

      {modalRecarga && (
        <div className="foto-overlay" onClick={() => setModalRecarga(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
            <div className="foto-titulo">Comprar créditos</div>
            <div className="foto-orient">Recargas avulsas valem por 1 ano e são usadas depois que os créditos do plano acabam.</div>

            {conta.eh_dono_equipe && (
              <div style={{ marginBottom: 16 }}>
                <label className="login-label">Enviar créditos para</label>
                {membros.length ? (
                  <select className="login-input" value={assentoSel} onChange={(e) => setAssentoSel(e.target.value)}>
                    {membros.map(m => <option key={m.id} value={m.id}>{m.email}{m.eh_dono ? ' (você)' : ''}</option>)}
                  </select>
                ) : (
                  <p className="conta-p" style={{ color: 'var(--alerta)' }}>Nenhum membro ativo. Convide alguém primeiro.</p>
                )}
              </div>
            )}

            <label className="login-label">Tamanho da recarga</label>
            <div className="recarga-opcoes">
              {recargas.map(r => (
                <button key={r.id}
                  className={'recarga-op' + (recargaSel === r.id ? ' ativa' : '')}
                  onClick={() => setRecargaSel(r.id)}>
                  <span className="recarga-op-cred">{r.creditos.toLocaleString('pt-BR')}</span>
                  <span className="recarga-op-preco">R$ {r.preco}</span>
                </button>
              ))}
            </div>

            <button className="btn btn--verde" style={{ width: '100%', marginTop: 18, padding: '12px' }}
              onClick={comprarRecarga}
              disabled={comprando || (conta.eh_dono_equipe && !membros.length)}>
              {comprando ? 'Abrindo...' : 'Ir para o pagamento'}
            </button>
            <div className="foto-cancelar" onClick={() => setModalRecarga(false)}>Cancelar</div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
