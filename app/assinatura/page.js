'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, abrirPortal } from '../../lib/auth';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

export default function Assinatura() {
  const router = useRouter();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abrindo, setAbrindo] = useState(false);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setCarregando(false);
  }, [router]);

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

  return (
    <AppShell>
      <div className="admin-wrap">
        <h1 className="conta-ola">Assinatura</h1>
        {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

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

        {ehPago && (
          <div className="conta-card">
            <h2 className="conta-h2">Precisa de mais créditos?</h2>
            <p className="conta-p">Compre recargas avulsas que valem por 1 ano.</p>
            <Link href="/precos#recargas" className="btn btn--roxo" style={{ width: 'auto', marginTop: 6, padding: '11px 24px', display: 'inline-block' }}>
              Comprar créditos
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
