'use client';

import { useState } from 'react';
import Link from 'next/link';
import { esqueciSenha } from '../../lib/auth';
import { useIdioma } from '../../lib/i18n';
import LoginSplit from '../../components/LoginSplit';

export default function EsqueciSenha() {
  const { t } = useIdioma();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro('');
    if (!email || !email.includes('@')) { setErro(t('esq_email_valido')); return; }
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
    <LoginSplit>
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>

        {enviado ? (
          <>
            <h1 className="login-titulo">{t('esq_verifique')}</h1>
            <p className="login-sub">
              {t('esq_enviado1')} <strong>{email}</strong>{t('esq_enviado2')}
            </p>
            <p className="login-sub" style={{ marginTop: 16 }}>
              {t('esq_nao_recebeu')}{' '}
              <button
                className="link-inline"
                onClick={() => { setEnviado(false); }}
              >
                {t('esq_tente_outro')}
              </button>.
            </p>
            <p className="login-rodape" style={{ marginTop: 22 }}>
              <Link href="/login">{t('esq_voltar_login')}</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="login-titulo">{t('login_esqueci')}</h1>
            <p className="login-sub">{t('esq_sub')}</p>

            <label className="login-label">{t('login_email')}</label>
            <input
              className="login-input" type="email" placeholder={t('login_ph_email')}
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
            />

            {erro && <p className="login-erro">{erro}</p>}

            <button className="btn btn--roxo" style={{ marginTop: 18 }} onClick={enviar} disabled={carregando}>
              {carregando ? t('esq_enviando') : t('esq_enviar_link')}
            </button>

            <p className="login-rodape">
              {t('esq_lembrou')} <Link href="/login">{t('login_entrar')}</Link>
            </p>
          </>
        )}
      </div>
    </LoginSplit>
  );
}
