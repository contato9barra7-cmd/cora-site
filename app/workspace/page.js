'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta } from '../../lib/auth';

function WorkspaceConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const [carregando, setCarregando] = useState(true);
  const criada = params.get('criada') === '1';

  useEffect(() => {
    (async () => {
      const c = await lerConta();
      if (!c) { router.push('/login'); return; }
      setCarregando(false);
    })();
  }, [router]);

  if (carregando) return <div className="admin-wrap"><p>Carregando...</p></div>;

  return (
    <div className="admin-wrap">
      <h1 className="conta-ola">Sua equipe</h1>

      {criada && (
        <div className="conta-card" style={{ borderColor: 'var(--roxo)' }}>
          <h2 className="conta-h2">Equipe criada com sucesso! 🎉</h2>
          <p className="conta-p">
            Sua assinatura de equipe está ativa. Em breve você poderá convidar as pessoas
            por email e gerenciar os assentos aqui nesta página.
          </p>
        </div>
      )}

      <div className="conta-card">
        <h2 className="conta-h2">Gestão de assentos</h2>
        <p className="conta-p">
          A área de convites e gestão da equipe está sendo finalizada e ficará disponível aqui.
        </p>
      </div>
    </div>
  );
}

export default function Workspace() {
  return (
    <AppShell>
      <Suspense fallback={<div className="admin-wrap"><p>Carregando...</p></div>}>
        <WorkspaceConteudo />
      </Suspense>
    </AppShell>
  );
}
