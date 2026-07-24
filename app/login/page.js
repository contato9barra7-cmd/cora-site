'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { entrar, lerConta, retomarCheckoutPendente } from '../../lib/auth';
import { useIdioma } from '../../lib/i18n';

export default function Login() {
  const router = useRouter();
  const { t } = useIdioma();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  // Se veio de um convite, o email fica travado (não pode trocar).
  const [emailTravado, setEmailTravado] = useState(false);

  // Se já está logada, vai direto pra conta (não mostra login de novo).
  useEffect(() => {
    if (lerConta()) { router.push('/conta'); return; }
    if (typeof window !== 'undefined') {
      const em = localStorage.getItem('cora_convite_email');
      if (em) { setEmail(em); setEmailTravado(true); }
    }
  }, [router]);

  async function fazerLogin() {
    setErro('');
    if (!email || !senha) { setErro(t('login_preencha')); return; }
    setCarregando(true);
    try {
      await entrar({ email, senha });
      // Retoma convite de equipe pendente, se houver.
      const convite = typeof window !== 'undefined' && localStorage.getItem('cora_convite_token');
      if (convite) { router.push('/convite?token=' + convite); return; }
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
        <h1 className="login-titulo">{t('login_entrar')}</h1>
        <p className="login-sub">{t('login_sub')}</p>

        <label className="login-label">{t('login_email')}</label>
        <input
          className="login-input" type="email" placeholder={t('login_ph_email')}
          value={email} onChange={(e) => setEmail(e.target.value)}
          readOnly={emailTravado} title={emailTravado ? t('login_email_travado') : undefined}
          onKeyDown={(e) => e.key === 'Enter' && fazerLogin()}
        />

        <label className="login-label">{t('login_senha')}</label>
        <div className="senha-campo">
          <input
            className="login-input" type={verSenha ? 'text' : 'password'} placeholder="••••••••"
            value={senha} onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fazerLogin()}
          />
          <button type="button" className="senha-olho" onClick={() => setVerSenha(!verSenha)} aria-label={verSenha ? t('camposenha_esconder') : t('camposenha_mostrar')}>
            {verSenha ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {erro && <p className="login-erro">{erro}</p>}

        <button className="btn btn--roxo" style={{ marginTop: 18 }} onClick={fazerLogin} disabled={carregando}>
          {carregando ? t('login_entrando') : t('login_entrar')}
        </button>

        <p className="login-rodape" style={{ marginTop: 14 }}>
          <Link href="/esqueci-senha">{t('login_esqueci')}</Link>
        </p>

        <p className="login-rodape">
          {t('login_sem_conta')} <Link href="/cadastro">{t('login_criar_conta')}</Link>
        </p>
      </div>
    </div>
  );
}
