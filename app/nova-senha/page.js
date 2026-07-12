'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { validarTokenReset, definirNovaSenha } from '../../lib/auth';

function NovaSenhaConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [validando, setValidando] = useState(true);
  const [valido, setValido] = useState(false);
  const [emailConta, setEmailConta] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!token) { setValidando(false); setValido(false); return; }
    validarTokenReset(token)
      .then((email) => { setEmailConta(email); setValido(true); })
      .catch(() => { setValido(false); })
      .finally(() => setValidando(false));
  }, [token]);

  async function salvar() {
    setErro('');
    if (senha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres.'); return; }
    if (senha !== senha2) { setErro('As senhas não coincidem.'); return; }
    setSalvando(true);
    try {
      await definirNovaSenha(token, senha);
      setPronto(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (validando) {
    return (
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <p className="login-sub">Verificando o link...</p>
      </div>
    );
  }

  if (!valido) {
    return (
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">Link inválido</h1>
        <p className="login-sub">
          Este link expirou ou já foi usado. Peça um novo para redefinir sua senha.
        </p>
        <Link href="/esqueci-senha" className="btn btn--roxo" style={{ marginTop: 18, display: 'block', textAlign: 'center' }}>
          Pedir novo link
        </Link>
        <p className="login-rodape">
          <Link href="/login">Voltar para o login</Link>
        </p>
      </div>
    );
  }

  if (pronto) {
    return (
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">Senha alterada</h1>
        <p className="login-sub">Sua nova senha foi salva. Redirecionando para o login...</p>
        <Link href="/login" className="btn btn--verde" style={{ marginTop: 18, display: 'block', textAlign: 'center' }}>
          Entrar agora
        </Link>
      </div>
    );
  }

  return (
    <div className="login-card">
      <Link href="/" className="login-logo">Cora Render</Link>
      <h1 className="login-titulo">Criar nova senha</h1>
      <p className="login-sub">Definindo uma nova senha para <strong>{emailConta}</strong>.</p>

      <label className="login-label">Nova senha</label>
      <div className="senha-campo">
        <input
          className="login-input" type={verSenha ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
          value={senha} onChange={(e) => setSenha(e.target.value)}
        />
        <button type="button" className="senha-olho" onClick={() => setVerSenha(!verSenha)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}>
          {verSenha ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>

      <label className="login-label">Repetir a senha</label>
      <input
        className="login-input" type={verSenha ? 'text' : 'password'} placeholder="Digite de novo"
        value={senha2} onChange={(e) => setSenha2(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && salvar()}
      />

      {erro && <p className="login-erro">{erro}</p>}

      <button className="btn btn--verde" style={{ marginTop: 18 }} onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando...' : 'Salvar nova senha'}
      </button>
    </div>
  );
}

export default function NovaSenha() {
  return (
    <div className="login-wrap">
      <Suspense fallback={<div className="login-card"><p className="login-sub">Carregando...</p></div>}>
        <NovaSenhaConteudo />
      </Suspense>
    </div>
  );
}
