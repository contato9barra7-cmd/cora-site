'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoginSplit from '../../components/LoginSplit';
import { estaLogado, aceitarConvite, infoConvite } from '../../lib/auth';
import { useIdioma } from '../../lib/i18n';

function ConviteConteudo() {
  const router = useRouter();
  const { t } = useIdioma();
  const params = useSearchParams();
  const [estado, setEstado] = useState('carregando'); // carregando | ok | erro | precisa_login
  const [msg, setMsg] = useState('');
  const token = params.get('token');

  useEffect(() => {
    (async () => {
      if (!token) { setEstado('erro'); setMsg(t('conv_invalido')); return; }
      const jwt = estaLogado();
      if (!jwt) {
        // guarda o token e o email convidado; manda logar/cadastrar.
        // sessionStorage (não localStorage): o token de convite é uma CREDENCIAL
        // (quem o tem ocupa o assento). Ele só precisa sobreviver ao ida-e-volta
        // do login na MESMA aba — não a reinícios do navegador. Assim a capability
        // não fica largada num storage persistente (o JWT já ficou fora dele de
        // propósito; este segue a mesma regra). O link do e-mail regrava se preciso.
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('cora_convite_token', token);
          const em = await infoConvite(token);
          if (em) sessionStorage.setItem('cora_convite_email', em);
        }
        setEstado('precisa_login');
        return;
      }
      try {
        await aceitarConvite(token);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('cora_convite_token');
          sessionStorage.removeItem('cora_convite_email');
        }
        setEstado('ok');
      } catch (e) {
        // Convite inválido/expirado: limpa o token guardado, senão o site fica
        // redirecionando pra cá em todo login/verificação (loop do "Convite indisponível").
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('cora_convite_token');
          sessionStorage.removeItem('cora_convite_email');
        }
        setEstado('erro');
        setMsg(e.message);
      }
    })();
    /* eslint-disable-next-line */
  }, []);

  return (
    <LoginSplit>
      <div className="login-card">
        <Link href="/" className="login-logo">
          <img src="/img/logo-cora.png" alt="Cora Render" width="266" height="64" />
        </Link>

        {estado === 'carregando' && <p className="login-sub">{t('conv_processando')}</p>}

        {estado === 'ok' && (
          <>
            <h1 className="login-titulo">{t('conv_bemvindo')}</h1>
            <p className="login-sub">{t('conv_ativado')}</p>
            <button className="btn btn--verde" onClick={() => router.push('/conta')}>
              {t('conv_ir_conta')}
            </button>
          </>
        )}

        {/* DOIS BOTOES, E O DE CRIAR CONTA E O PRINCIPAL: quem chega por um
            convite quase nunca tem conta. Quem ja tem entra pelo elo de baixo,
            no mesmo lugar onde o login poe o "criar conta" e o cadastro poe o
            "entrar" — a tela nao inventa um caminho que o fluxo ja tem. */}
        {estado === 'precisa_login' && (
          <>
            <h1 className="login-titulo">{t('conv_aceite')}</h1>
            <p className="login-sub">{t('conv_login_cadastro')}</p>
            <button className="btn btn--verde" onClick={() => router.push('/cadastro')}>
              {t('cad_criar')}
            </button>
            <p className="login-rodape">
              {t('conv_ja_tem_conta')}{' '}
              <button className="link-botao" onClick={() => router.push('/login')}>
                {t('conv_fazer_login')}
              </button>
            </p>
          </>
        )}

        {estado === 'erro' && (
          <>
            <h1 className="login-titulo">{t('conv_indisponivel')}</h1>
            <p className="login-sub">
              {msg || t('conv_nao_processar')} {t('conv_ja_aceito')}
            </p>
            <button className="btn btn--verde" onClick={() => router.push('/conta')}>
              {t('conv_ir_conta')}
            </button>
          </>
        )}
      </div>
    </LoginSplit>
  );
}

export default function Convite() {
  const { t } = useIdioma();
  return (
    <Suspense fallback={<LoginSplit><div className="login-card"><p className="login-sub">{t('comum_carregando')}</p></div></LoginSplit>}>
      <ConviteConteudo />
    </Suspense>
  );
}
