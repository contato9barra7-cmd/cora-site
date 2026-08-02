'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { verificar, reenviarCodigo } from '../../lib/auth';
import { useIdioma } from '../../lib/i18n';
import LoginSplit from '../../components/LoginSplit';

function VerificarConteudo() {
  const router = useRouter();
  const { t } = useIdioma();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const e = params.get('email');
    if (e) setEmail(e);
  }, [params]);

  async function confirmar() {
    setErro(''); setAviso('');
    if (!codigo || codigo.length < 6) { setErro(t('ver_codigo6')); return; }
    setCarregando(true);
    try {
      await verificar({ email, codigo });
      // Convite de equipe pendente?
      const convite = typeof window !== 'undefined' && localStorage.getItem('cora_convite_token');
      if (convite) { router.push('/convite?token=' + convite); return; }
      // Se a pessoa tinha escolhido algo antes de criar conta, retoma.
      const temEquipe = typeof window !== 'undefined' && localStorage.getItem('cora_equipe_pendente');
      if (temEquipe) { router.push('/teams'); return; }
      // Checkout de plano/recarga pendente → volta pra preços, que tem o modal de CPF.
      const temCheckout = typeof window !== 'undefined' && localStorage.getItem('cora_checkout_pendente');
      if (temCheckout) { router.push('/precos?retomar=1'); return; }
      router.push('/conta');
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  // Limpa PRIMEIRO, corta DEPOIS.
  //
  // Antes o input tinha maxLength={6}, e o navegador aplica esse corte no texto
  // colado antes de qualquer código nosso rodar. Como o e-mail mandava o código
  // com espaço no meio ("254 016", 7 caracteres), sobrava "254 01" — que o
  // replace virava "25401". Cinco dígitos: faltava o último, e a pessoa tinha
  // que digitar na mão.
  //
  // O e-mail já não manda espaço, mas o campo não pode depender disso: as
  // pessoas colam com espaço no fim, com hífen, com o texto inteiro da linha.
  // Tirando os não-dígitos antes de limitar a 6, qualquer um desses entra certo.
  function digitarCodigo(e) {
    setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6));
  }

  async function reenviar() {
    setErro(''); setAviso('');
    await reenviarCodigo(email);
    setAviso(t('ver_reenviado'));
  }

  return (
    <LoginSplit>
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">{t('ver_confirme')}</h1>
        <p className="login-sub">
          {t('ver_enviamos')}<br /><strong>{email || t('ver_seu_email')}</strong>.
        </p>

        <label className="login-label">{t('ver_codigo_label')}</label>
        <input
          className="login-input" type="text" inputMode="numeric"
          placeholder="000000" value={codigo}
          onChange={digitarCodigo}
          onKeyDown={(e) => e.key === 'Enter' && confirmar()}
          style={{ letterSpacing: '6px', textAlign: 'center', fontSize: 20 }}
        />

        {erro && <p className="login-erro">{erro}</p>}
        {aviso && <p className="login-aviso">{aviso}</p>}

        <button className="btn btn--verde" style={{ marginTop: 18 }} onClick={confirmar} disabled={carregando}>
          {carregando ? t('ver_confirmando') : t('ver_confirmar_entrar')}
        </button>

        <p className="login-rodape">
          {t('ver_nao_recebeu')} <button className="link-botao" onClick={reenviar}>{t('ver_reenviar')}</button>
        </p>
      </div>
    </LoginSplit>
  );
}

export default function Verificar() {
  const { t } = useIdioma();
  return (
    <Suspense fallback={<LoginSplit><p>{t('comum_carregando')}</p></LoginSplit>}>
      <VerificarConteudo />
    </Suspense>
  );
}
