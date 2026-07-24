'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { validarTokenReset, definirNovaSenha } from '../../lib/auth';
import CampoSenha, { senhaForte } from '../../components/CampoSenha';
import { useIdioma } from '../../lib/i18n';

function NovaSenhaConteudo() {
  const router = useRouter();
  const { t } = useIdioma();
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
    if (!senhaForte(senha)) { setErro(t('nova_req')); return; }
    if (!senhaValida) { setErro(t('nova_confirme')); return; }
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
        <p className="login-sub">{t('nova_verificando')}</p>
      </div>
    );
  }

  if (!valido) {
    return (
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">{t('nova_link_invalido')}</h1>
        <p className="login-sub">
          {t('nova_expirado')}
        </p>
        <Link href="/esqueci-senha" className="btn btn--roxo" style={{ marginTop: 18, display: 'block', textAlign: 'center' }}>
          {t('nova_pedir')}
        </Link>
        <p className="login-rodape">
          <Link href="/login">{t('esq_voltar_login')}</Link>
        </p>
      </div>
    );
  }

  if (pronto) {
    return (
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">{t('nova_alterada')}</h1>
        <p className="login-sub">{t('nova_salva')}</p>
        <Link href="/login" className="btn btn--verde" style={{ marginTop: 18, display: 'block', textAlign: 'center' }}>
          {t('nova_entrar_agora')}
        </Link>
      </div>
    );
  }

  return (
    <div className="login-card">
      <Link href="/" className="login-logo">Cora Render</Link>
      <h1 className="login-titulo">{t('nova_criar')}</h1>
      <p className="login-sub">{t('nova_definindo1')} <strong>{emailConta}</strong>.</p>

      <CampoSenha senha={senha} setSenha={setSenha} onValidez={setSenhaValida} labelSenha={t('nova_label')} />

      {erro && <p className="login-erro">{erro}</p>}

      <button className="btn btn--verde" style={{ marginTop: 18 }} onClick={salvar} disabled={salvando}>
        {salvando ? t('comum_salvando') : t('nova_salvar')}
      </button>
    </div>
  );
}

export default function NovaSenha() {
  const { t } = useIdioma();
  return (
    <div className="login-wrap">
      <Suspense fallback={<div className="login-card"><p className="login-sub">{t('comum_carregando')}</p></div>}>
        <NovaSenhaConteudo />
      </Suspense>
    </div>
  );
}
