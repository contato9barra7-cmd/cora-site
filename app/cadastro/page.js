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
  const [profissao, setProfissao] = useState('');
  const [origem, setOrigem] = useState('');
  const [usaRender, setUsaRender] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function criarConta() {
    setErro('');
    if (!email || !senha) { setErro('Preencha email e senha.'); return; }
    if (senha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres.'); return; }
    setCarregando(true);
    try {
      await registrar({ email, senha, nome, profissao, origem, usa_render: usaRender });
      router.push('/verificar?email=' + encodeURIComponent(email));
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

        <label className="login-label">Profissão</label>
        <select className="login-input" value={profissao} onChange={(e) => setProfissao(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="arquiteto">Arquiteto(a)</option>
          <option value="designer_interiores">Designer de interiores</option>
          <option value="engenheiro">Engenheiro(a)</option>
          <option value="estudante">Estudante</option>
          <option value="paisagista">Paisagista</option>
          <option value="outro">Outro</option>
        </select>

        <label className="login-label">Como conheceu o Cora Render?</label>
        <select className="login-input" value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="google">Google / Busca</option>
          <option value="indicacao">Indicação de amigo</option>
          <option value="tiktok">TikTok</option>
          <option value="anuncio">Anúncio</option>
          <option value="outro">Outro</option>
        </select>

        <label className="login-label">Já usa algum render?</label>
        <select className="login-input" value={usaRender} onChange={(e) => setUsaRender(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="nao">Não uso nenhum</option>
          <option value="vray">V-Ray</option>
          <option value="enscape">Enscape</option>
          <option value="lumion">Lumion</option>
          <option value="dhistudio">D5 / outro IA</option>
          <option value="outro">Outro</option>
        </select>

        <label className="login-label">Senha</label>
        <div className="senha-campo">
          <input
            className="login-input" type={verSenha ? 'text' : 'password'} placeholder="mínimo 6 caracteres"
            value={senha} onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && criarConta()}
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
