'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { entrar, lerConta, retomarCheckoutPendente } from '../../lib/auth';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Se já está logada, vai direto pra conta (não mostra login de novo).
  useEffect(() => {
    if (lerConta()) router.push('/conta');
  }, [router]);

  async function fazerLogin() {
    setErro('');
    if (!email || !senha) { setErro('Preencha email e senha.'); return; }
    setCarregando(true);
    try {
      await entrar({ email, senha });
      // Retoma compra pendente (equipe ou plano/recarga individual), se houver.
      // Só considera o pendente de equipe se tiver dados válidos (evita lixo antigo).
      let equipePend = null;
      try { equipePend = JSON.parse(localStorage.getItem('cora_equipe_pendente') || 'null'); } catch (x) {}
      const temCheckout = typeof window !== 'undefined' && localStorage.getItem('cora_checkout_pendente');
      if (equipePend && equipePend.plano && equipePend.assentos) { router.push('/teams'); return; }
      // pendente de equipe inválido/vazio → limpa
      if (typeof window !== 'undefined') localStorage.removeItem('cora_equipe_pendente');
      if (temCheckout) {
        const foi = await retomarCheckoutPendente();
        if (foi) return;
      }
      router.push('/conta');
    } catch (e) {
      if (e.precisaVerificar) {
        router.push('/verificar?email=' + encodeURIComponent(e.email || email));
        return;
      }
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">Entrar</h1>
        <p className="login-sub">Acesse sua conta para usar o Cora Render.</p>

        <label className="login-label">E-mail</label>
        <input
          className="login-input" type="email" placeholder="voce@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fazerLogin()}
        />

        <label className="login-label">Senha</label>
        <div className="senha-campo">
          <input
            className="login-input" type={verSenha ? 'text' : 'password'} placeholder="••••••••"
            value={senha} onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fazerLogin()}
          />
          <button type="button" className="senha-olho" onClick={() => setVerSenha(!verSenha)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}>
            {verSenha ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {erro && <p className="login-erro">{erro}</p>}

        <button className="btn btn--roxo" style={{ marginTop: 18 }} onClick={fazerLogin} disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="login-rodape">
          Ainda não tem conta? <Link href="/cadastro">Criar conta grátis</Link>
        </p>
      </div>
    </div>
  );
}
