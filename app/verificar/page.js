'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { verificar, reenviarCodigo, retomarCheckoutPendente } from '../../lib/auth';

function VerificarConteudo() {
  const router = useRouter();
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
    if (!codigo || codigo.length < 6) { setErro('Digite o código de 6 dígitos.'); return; }
    setCarregando(true);
    try {
      await verificar({ email, codigo });
      // Convite de equipe pendente?
      const convite = typeof window !== 'undefined' && localStorage.getItem('cora_convite_token');
      if (convite) { router.push('/convite?token=' + convite); return; }
      // Se a pessoa tinha escolhido algo antes de criar conta, retoma.
      const temEquipe = typeof window !== 'undefined' && localStorage.getItem('cora_equipe_pendente');
      if (temEquipe) { router.push('/teams'); return; }
      const foiPraCheckout = await retomarCheckoutPendente();
      if (!foiPraCheckout) router.push('/conta');
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  async function reenviar() {
    setErro(''); setAviso('');
    await reenviarCodigo(email);
    setAviso('Enviamos um novo código para o seu email.');
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <Link href="/" className="login-logo">Cora Render</Link>
        <h1 className="login-titulo">Confirme seu email</h1>
        <p className="login-sub">
          Enviamos um código de 6 dígitos para<br /><strong>{email || 'seu email'}</strong>.
        </p>

        <label className="login-label">Código</label>
        <input
          className="login-input" type="text" inputMode="numeric" maxLength={6}
          placeholder="000000" value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && confirmar()}
          style={{ letterSpacing: '6px', textAlign: 'center', fontSize: 20 }}
        />

        {erro && <p className="login-erro">{erro}</p>}
        {aviso && <p className="login-aviso">{aviso}</p>}

        <button className="btn btn--verde" style={{ marginTop: 18 }} onClick={confirmar} disabled={carregando}>
          {carregando ? 'Confirmando...' : 'Confirmar e entrar'}
        </button>

        <p className="login-rodape">
          Não recebeu? <button className="link-botao" onClick={reenviar}>Reenviar código</button>
        </p>
      </div>
    </div>
  );
}

export default function Verificar() {
  return (
    <Suspense fallback={<div className="login-wrap"><p>Carregando...</p></div>}>
      <VerificarConteudo />
    </Suspense>
  );
}
