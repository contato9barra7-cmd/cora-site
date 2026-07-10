'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lerConta, sair } from '../../lib/auth';

export default function Conta() {
  const router = useRouter();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setCarregando(false);
  }, [router]);

  function fazerLogout() {
    sair();
    router.push('/');
  }

  if (carregando) return <div className="conta-wrap"><p>Carregando...</p></div>;
  if (!conta) return null;

  return (
    <div className="conta-wrap">
      <div className="conta-topo">
        <Link href="/" className="login-logo">Cora Render</Link>
        <button className="btn btn--ghost" style={{ width: 'auto', margin: 0, padding: '8px 18px' }} onClick={fazerLogout}>
          Sair
        </button>
      </div>

      <div className="conta-card">
        <h1>Olá, {conta.nome || conta.email}</h1>
        <div className="conta-linha"><span>Plano</span><strong>{conta.plano}</strong></div>
        <div className="conta-linha"><span>Status</span><strong>{conta.status}</strong></div>
        <div className="conta-linha">
          <span>Créditos</span>
          <strong>{conta.creditos_total === -1 ? 'Ilimitado' : (conta.creditos_restantes ?? 0)}</strong>
        </div>
        {conta.expira_em && (
          <div className="conta-linha">
            <span>Válido até</span>
            <strong>{new Date(conta.expira_em).toLocaleDateString('pt-BR')}</strong>
          </div>
        )}
      </div>

      <div className="conta-card">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Próximos passos</h2>
        <p style={{ color: 'var(--ink2)', fontSize: 15 }}>
          Aqui vão entrar: download do plugin, cobrança e gerenciamento da assinatura.
          (Em construção — próximas etapas.)
        </p>
        <Link href="/precos" className="btn btn--roxo" style={{ width: 'auto', marginTop: 16, padding: '10px 22px', display: 'inline-block' }}>
          Ver planos
        </Link>
      </div>
    </div>
  );
}
