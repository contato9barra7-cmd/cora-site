'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registrar } from '../../lib/auth';

export default function Cadastro() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function criarConta() {
    setErro('');
    if (!email || !senha) { setErro('Preencha email e senha.'); return; }
    if (senha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres.'); return; }
    setCarregando(true);
    try {
      await registrar({ email, senha, nome });
      router.push('/conta');
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
        <h1 className="login-titulo">Criar conta</h1>
        <p className="login-sub">7 dias grátis para conhecer o Cora Render.</p>

        <label className="login-label">Nome</label>
        <input
          className="login-input" type="text" placeholder="Seu nome"
          value={nome} onChange={(e) => setNome(e.target.value)}
        />

        <label className="login-label">E-mail</label>
        <input
          className="login-input" type="email" placeholder="voce@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />

        <label className="login-label">Senha</label>
        <input
          className="login-input" type="password" placeholder="mínimo 6 caracteres"
          value={senha} onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && criarConta()}
        />

        {erro && <p className="login-erro">{erro}</p>}

        <button className="btn btn--verde" style={{ marginTop: 18 }} onClick={criarConta} disabled={carregando}>
          {carregando ? 'Criando...' : 'Criar conta grátis'}
        </button>

        <p className="login-rodape">
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
