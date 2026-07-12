'use client';

import { useState } from 'react';
import Link from 'next/link';
import { esqueciSenha } from '../../lib/auth';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro('');
    if (!email || !email.includes('@')) { setErro('Digite um email válido.'); return; }
    setCarregando(true);
    try {
      await esqueciSenha(email);
      setEnviado(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>

        {enviado ? (
          <>
            <h1 className="login-titulo">Verifique seu email</h1>
            <p className="login-sub">
              Se existir uma conta com <strong>{email}</strong>, enviamos um link para você criar uma nova senha.
              O link vale por 1 hora.
            </p>
            <p className="login-sub" style={{ marginTop: 16 }}>
              Não recebeu? Confira a caixa de spam ou{' '}
              <button
                className="link-inline"
                onClick={() => { setEnviado(false); }}
              >
                tente outro email
              </button>.
            </p>
            <p className="login-rodape" style={{ marginTop: 22 }}>
              <Link href="/login">Voltar para o login</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="login-titulo">Esqueci minha senha</h1>
            <p className="login-sub">Digite seu email e enviaremos um link para criar uma nova senha.</p>

            <label className="login-label">E-mail</label>
            <input
              className="login-input" type="email" placeholder="voce@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
            />

            {erro && <p className="login-erro">{erro}</p>}

            <button className="btn btn--roxo" style={{ marginTop: 18 }} onClick={enviar} disabled={carregando}>
              {carregando ? 'Enviando...' : 'Enviar link'}
            </button>

            <p className="login-rodape">
              Lembrou a senha? <Link href="/login">Entrar</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
