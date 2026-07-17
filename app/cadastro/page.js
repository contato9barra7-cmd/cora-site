'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registrar } from '../../lib/auth';

export default function Cadastro() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [genero, setGenero] = useState('');
  const [profissao, setProfissao] = useState('');
  const [origem, setOrigem] = useState('');
  const [usaRender, setUsaRender] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [volume, setVolume] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [faltando, setFaltando] = useState({});
  // Se veio de um convite, trava o email (a conta tem que ser desse email).
  const [emailTravado, setEmailTravado] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const em = localStorage.getItem('cora_convite_email');
      if (em) { setEmail(em); setEmailTravado(true); }
    }
  }, []);

  async function criarConta() {
    setErro('');
    const falta = {};
    if (!nome.trim()) falta.nome = true;
    if (!email) falta.email = true;
    if (!genero) falta.genero = true;
    if (!profissao) falta.profissao = true;
    if (!origem) falta.origem = true;
    if (!usaRender) falta.usaRender = true;
    if (!tamanho) falta.tamanho = true;
    if (!volume) falta.volume = true;
    if (!senha || senha.length < 6) falta.senha = true;

    if (Object.keys(falta).length) {
      setFaltando(falta);
      setErro(!senha || senha.length < 6
        ? 'Preencha todos os campos. A senha precisa de ao menos 6 caracteres.'
        : 'Preencha todos os campos obrigatórios.');
      return;
    }
    setFaltando({});
    setCarregando(true);
    try {
      await registrar({ email, senha, nome, genero, profissao, origem, usa_render: usaRender, tamanho, volume });
      router.push('/verificar?email=' + encodeURIComponent(email));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  const cls = (campo) => 'login-input' + (faltando[campo] ? ' campo-erro' : '');

  return (
    <div className="login-wrap">
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">Criar conta</h1>
        <p className="login-sub">7 dias grátis para conhecer o Cora Render.</p>

        <label className="login-label">Nome <span className="obrig">*</span></label>
        <input
          className={cls('nome')} type="text" placeholder="Seu nome"
          value={nome} onChange={(e) => setNome(e.target.value)}
        />

        <label className="login-label">E-mail <span className="obrig">*</span></label>
        <input
          className={cls('email')} type="email" placeholder="voce@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          readOnly={emailTravado} title={emailTravado ? 'Este é o email do convite e não pode ser alterado' : undefined}
        />

        <label className="login-label">Gênero <span className="obrig">*</span></label>
        <select className={cls('genero')} value={genero} onChange={(e) => setGenero(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="feminino">Feminino</option>
          <option value="masculino">Masculino</option>
          <option value="nao_binario">Não-binário</option>
          <option value="nao_informar">Prefiro não informar</option>
        </select>

        <label className="login-label">Profissão <span className="obrig">*</span></label>
        <select className={cls('profissao')} value={profissao} onChange={(e) => setProfissao(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="arquiteto">Arquiteto(a)</option>
          <option value="designer_interiores">Designer de interiores</option>
          <option value="archviz">Archviz</option>
          <option value="engenheiro">Engenheiro(a)</option>
          <option value="estudante">Estudante</option>
          <option value="paisagista">Paisagista</option>
          <option value="outro">Outro</option>
        </select>

        <label className="login-label">Como conheceu o Cora Render? <span className="obrig">*</span></label>
        <select className={cls('origem')} value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="google">Google / Busca</option>
          <option value="indicacao">Indicação de amigo</option>
          <option value="tiktok">TikTok</option>
          <option value="anuncio">Anúncio</option>
          <option value="outro">Outro</option>
        </select>

        <label className="login-label">Já usa algum renderizador? <span className="obrig">*</span></label>
        <select className={cls('usaRender')} value={usaRender} onChange={(e) => setUsaRender(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="nao">Não uso nenhum</option>
          <option value="vray">V-Ray</option>
          <option value="corona">Corona</option>
          <option value="enscape">Enscape</option>
          <option value="lumion">Lumion</option>
          <option value="dhistudio">D5 / outro IA</option>
          <option value="outro">Outro</option>
        </select>

        <label className="login-label">Tamanho da equipe <span className="obrig">*</span></label>
        <select className={cls('tamanho')} value={tamanho} onChange={(e) => setTamanho(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="autonomo">Só eu (autônomo)</option>
          <option value="2a5">2 a 5 pessoas</option>
          <option value="6a20">6 a 20 pessoas</option>
          <option value="20mais">Mais de 20 pessoas</option>
        </select>

        <label className="login-label">Projetos por ano <span className="obrig">*</span></label>
        <select className={cls('volume')} value={volume} onChange={(e) => setVolume(e.target.value)}>
          <option value="">Selecione...</option>
          <option value="menos10">Menos de 10</option>
          <option value="10a20">Entre 10 e 20</option>
          <option value="mais20">Mais de 20</option>
        </select>

        <label className="login-label">Senha <span className="obrig">*</span></label>
        <div className="senha-campo">
          <input
            className={cls('senha')} type={verSenha ? 'text' : 'password'} placeholder="mínimo 6 caracteres"
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
