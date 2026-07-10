'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { lerConta, sair, atualizarConta, abrirPortal } from '../../lib/auth';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

function ContaConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [abrindoPortal, setAbrindoPortal] = useState(false);

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

  function fazerLogout() {
    sair();
    router.push('/');
  }

  async function gerenciar() {
    setErro('');
    const guia = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    setAbrindoPortal(true);
    try {
      await abrirPortal(guia);
    } catch (e) {
      setErro(e.message);
    } finally {
      setAbrindoPortal(false);
    }
  }

  if (carregando) return <div className="conta-wrap"><p>Carregando...</p></div>;
  if (!conta) return null;

  const ehPago = conta.plano && conta.plano !== 'free';
  const creditos = conta.creditos_total === -1 ? 'Ilimitado'
    : (conta.creditos_restantes ?? 0).toLocaleString('pt-BR');
  const totalCreditos = conta.creditos_total === -1 ? null
    : (conta.creditos_total ?? 0).toLocaleString('pt-BR');

  return (
    <div className="conta-wrap">
      <div className="conta-topo">
        <Link href="/" className="login-logo">Cora Render</Link>
        <button className="btn btn--ghost" style={{ width: 'auto', margin: 0, padding: '8px 18px' }} onClick={fazerLogout}>
          Sair
        </button>
      </div>

      {aviso && <div className="conta-aviso">{aviso}</div>}
      {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

      {conta.is_admin && (
        <Link href="/admin" className="btn btn--ink" style={{ width: 'auto', display: 'inline-block', padding: '9px 20px', marginBottom: 18 }}>
          Painel de administração
        </Link>
      )}

      <h1 className="conta-ola">Olá, {conta.nome || conta.email}</h1>

      {/* Plano + créditos */}
      <div className="dash-grid">
        <div className="dash-card">
          <span className="dash-rotulo">Seu plano</span>
          <span className="dash-valor">{NOME_PLANO[conta.plano] || conta.plano}</span>
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
            {conta.expira_em ? new Date(conta.expira_em).toLocaleDateString('pt-BR') : '—'}
          </span>
        </div>
      </div>

      {/* Gerenciar assinatura */}
      <div className="conta-card">
        <h2 className="conta-h2">Assinatura</h2>
        {ehPago ? (
          <>
            <p className="conta-p">Gerencie sua assinatura: trocar de plano, atualizar o cartão, ver faturas ou cancelar.</p>
            <button className="btn btn--ink" style={{ width: 'auto', marginTop: 6, padding: '11px 24px' }} onClick={gerenciar} disabled={abrindoPortal}>
              {abrindoPortal ? 'Abrindo...' : 'Gerenciar assinatura'}
            </button>
          </>
        ) : (
          <>
            <p className="conta-p">Você está no plano Free. Assine para desbloquear a geração com IA.</p>
            <Link href="/precos" className="btn btn--verde" style={{ width: 'auto', marginTop: 6, padding: '11px 24px', display: 'inline-block' }}>
              Ver planos
            </Link>
          </>
        )}
      </div>

      {/* Download do plugin */}
      <div className="conta-card">
        <h2 className="conta-h2">Plugin para o SketchUp</h2>
        <p className="conta-p">Baixe o Cora Render e instale no seu SketchUp 2025.</p>
        <button className="btn btn--roxo" style={{ width: 'auto', marginTop: 6, padding: '11px 24px' }} disabled>
          Download em breve
        </button>
        <p className="dash-sub" style={{ marginTop: 10 }}>O link de download será disponibilizado aqui.</p>
      </div>
    </div>
  );
}

export default function Conta() {
  return (
    <Suspense fallback={<div className="conta-wrap"><p>Carregando...</p></div>}>
      <ContaConteudo />
    </Suspense>
  );
}
