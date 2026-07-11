'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '../../components/Nav';
import { lerToken, aceitarConvite } from '../../lib/auth';

function ConviteConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const [estado, setEstado] = useState('carregando'); // carregando | ok | erro | precisa_login
  const [msg, setMsg] = useState('');
  const token = params.get('token');

  useEffect(() => {
    (async () => {
      if (!token) { setEstado('erro'); setMsg('Convite inválido.'); return; }
      const jwt = lerToken();
      if (!jwt) {
        // guarda o token e manda logar/cadastrar
        if (typeof window !== 'undefined') localStorage.setItem('cora_convite_token', token);
        setEstado('precisa_login');
        return;
      }
      try {
        await aceitarConvite(token);
        if (typeof window !== 'undefined') localStorage.removeItem('cora_convite_token');
        setEstado('ok');
      } catch (e) {
        setEstado('erro');
        setMsg(e.message);
      }
    })();
    /* eslint-disable-next-line */
  }, []);

  return (
    <>
      <Nav />
      <div className="container">
        <div className="tm-wrap" style={{ maxWidth: 520, textAlign: 'center' }}>
          {estado === 'carregando' && <p>Processando convite...</p>}
          {estado === 'ok' && (
            <>
              <h1 className="tm-h1">Bem-vindo à equipe</h1>
              <p className="tm-lead" style={{ margin: '0 auto 24px' }}>Seu acesso foi ativado. Agora você pode usar o Cora Render.</p>
              <button className="btn btn--verde" style={{ padding: '12px 28px' }} onClick={() => router.push('/conta')}>Ir para minha conta</button>
            </>
          )}
          {estado === 'precisa_login' && (
            <>
              <h1 className="tm-h1">Aceite seu convite</h1>
              <p className="tm-lead" style={{ margin: '0 auto 24px' }}>Faça login ou crie uma conta para ativar seu acesso à equipe.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn--verde" style={{ padding: '12px 24px' }} onClick={() => router.push('/login')}>Fazer login</button>
                <button className="btn btn--ink" style={{ padding: '12px 24px' }} onClick={() => router.push('/cadastro')}>Criar conta</button>
              </div>
            </>
          )}
          {estado === 'erro' && (
            <>
              <h1 className="tm-h1">Convite indisponível</h1>
              <p className="tm-lead" style={{ margin: '0 auto 24px' }}>
                {msg || 'Não foi possível processar o convite.'} Se você já aceitou antes, seu acesso já está ativo — é só entrar na sua conta.
              </p>
              <button className="btn btn--verde" style={{ padding: '12px 28px' }} onClick={() => router.push('/conta')}>Ir para minha conta</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Convite() {
  return (
    <Suspense fallback={<div className="container"><p>Carregando...</p></div>}>
      <ConviteConteudo />
    </Suspense>
  );
}
