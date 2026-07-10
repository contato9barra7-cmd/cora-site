'use client';

import Link from 'next/link';

export default function Login() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">Entrar</h1>
        <p className="login-sub">Acesse sua conta para usar o Cora Render.</p>

        {/* Formulário visual — ainda não conecta em nada.
            A autenticação de verdade entra na próxima etapa (com o servidor). */}
        <label className="login-label">E-mail</label>
        <input className="login-input" type="email" placeholder="voce@email.com" disabled />

        <label className="login-label">Senha</label>
        <input className="login-input" type="password" placeholder="••••••••" disabled />

        <button className="btn btn--roxo" style={{ marginTop: 18 }} disabled>
          Entrar
        </button>

        <p className="login-aviso">
          Tela em construção — o login ainda não está ativo. Em breve.
        </p>

        <p className="login-rodape">
          Ainda não tem conta? <Link href="/precos">Ver planos</Link>
        </p>
      </div>
    </div>
  );
}
