'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, atualizarConta, baixarPlugin } from '../../lib/auth';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

function ContaConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    setErro('');
    try {
      const url = await baixarPlugin();
      // dispara o download
      window.location.href = url;
    } catch (e) {
      setErro(e.message);
    } finally {
      setTimeout(() => setBaixando(false), 1500);
    }
  }

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setCarregando(false);

    if (params.get('pagamento') === 'sucesso') {
      setAviso('Pagamento recebido! Atualizando sua conta...');
      atualizarConta().then((fresca) => {
        if (fresca) setConta(fresca);
        setAviso('Pagamento confirmado. Plano atualizado!');
        setTimeout(() => setAviso(''), 5000);
      });
    }
  }, [router, params]);

  if (carregando) return <AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>;
  if (!conta) return null;

  const ehAdmin = conta.is_admin === true;
  const ehPago = conta.plano && conta.plano !== 'free';
  const nomePlano = ehAdmin ? 'Admin' : (NOME_PLANO[conta.plano] || conta.plano);
  const creditos = (conta.creditos_total === -1 || ehAdmin) ? 'Ilimitado'
    : (conta.creditos_restantes ?? 0).toLocaleString('pt-BR');
  const totalCreditos = (conta.creditos_total === -1 || ehAdmin) ? null
    : (conta.creditos_total ?? 0).toLocaleString('pt-BR');

  return (
    <AppShell>
    <div className="admin-wrap">
      {aviso && <div className="conta-aviso">{aviso}</div>}
      {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

      <h1 className="conta-ola">Olá, {conta.nome || conta.email}</h1>

      {/* Plano + créditos */}
      <div className="dash-grid">
        <div className="dash-card">
          <span className="dash-rotulo">Seu plano</span>
          <span className="dash-valor">{nomePlano}</span>
          <span className={'dash-badge ' + (conta.status === 'ativo' ? 'ok' : 'off')}>
            {conta.status}
          </span>
        </div>

        <div className="dash-card">
          <span className="dash-rotulo">Créditos disponíveis</span>
          <span className="dash-valor">{creditos}</span>
          {totalCreditos && <span className="dash-sub">de {totalCreditos} no ciclo</span>}
        </div>

        <div className="dash-card">
          <span className="dash-rotulo">{ehPago ? 'Renova em' : 'Válido até'}</span>
          <span className="dash-valor">
            {conta.expira_em && !ehAdmin ? new Date(conta.expira_em).toLocaleDateString('pt-BR') : '—'}
          </span>
        </div>
      </div>

      {/* Download do plugin */}
      <div className="conta-card">
        <h2 className="conta-h2">Plugin para o SketchUp</h2>
        <p className="conta-p">Baixe o Cora Render e instale no seu SketchUp. Funciona no SketchUp 2023 em diante.</p>
        <button className="btn btn--roxo" style={{ width: 'auto', marginTop: 6, padding: '11px 24px' }} onClick={baixar} disabled={baixando}>
          {baixando ? 'Preparando...' : 'Download'}
        </button>
        <p className="dash-sub" style={{ marginTop: 10 }}>Depois de baixar, instale pelo Extension Manager do SketchUp.</p>
      </div>
    </div>
    </AppShell>
  );
}

export default function Conta() {
  return (
    <Suspense fallback={<AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>}>
      <ContaConteudo />
    </Suspense>
  );
}
