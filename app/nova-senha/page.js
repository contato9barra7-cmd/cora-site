'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { validarTokenReset, definirNovaSenha } from '../../lib/auth';
import CampoSenha, { senhaForte } from '../../components/CampoSenha';

function NovaSenhaConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [validando, setValidando] = useState(true);
  const [valido, setValido] = useState(false);
  const [emailConta, setEmailConta] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaValida, setSenhaValida] = useState(false);
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
    if (!senhaForte(senha)) { setErro('A senha ainda não cumpre todos os requisitos.'); return; }
    if (!senhaValida) { setErro('Confirme a senha corretamente (os dois campos precisam ser iguais).'); return; }
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

      <CampoSenha senha={senha} setSenha={setSenha} onValidez={setSenhaValida} labelSenha="Nova senha" />

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
