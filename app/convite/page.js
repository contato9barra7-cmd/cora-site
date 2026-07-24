'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '../../components/Nav';
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
        // guarda o token e o email convidado; manda logar/cadastrar
        if (typeof window !== 'undefined') {
          localStorage.setItem('cora_convite_token', token);
          const em = await infoConvite(token);
          if (em) localStorage.setItem('cora_convite_email', em);
        }
        setEstado('precisa_login');
        return;
      }
      try {
        await aceitarConvite(token);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cora_convite_token');
          localStorage.removeItem('cora_convite_email');
        }
        setEstado('ok');
      } catch (e) {
        // Convite inválido/expirado: limpa o token guardado, senão o site fica
        // redirecionando pra cá em todo login/verificação (loop do "Convite indisponível").
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cora_convite_token');
          localStorage.removeItem('cora_convite_email');
        }
        setEstado('erro');
        setMsg(e.message);
      }
    })();
    /* eslint-disable-next-line */
  }, []);

  return (
    <>
      <Nav />
      <div className="container">
        <div className="tm-wrap" style={{ maxWidth: 520, textAlign: 'center' }}>
          {estado === 'carregando' && <p>{t('conv_processando')}</p>}
          {estado === 'ok' && (
            <>
              <h1 className="tm-h1">{t('conv_bemvindo')}</h1>
              <p className="tm-lead" style={{ margin: '0 auto 24px' }}>{t('conv_ativado')}</p>
              <button className="btn btn--verde" style={{ padding: '12px 28px' }} onClick={() => router.push('/conta')}>{t('conv_ir_conta')}</button>
            </>
          )}
          {estado === 'precisa_login' && (
            <>
              <h1 className="tm-h1">{t('conv_aceite')}</h1>
              <p className="tm-lead" style={{ margin: '0 auto 24px' }}>{t('conv_login_cadastro')}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn--verde" style={{ padding: '12px 24px' }} onClick={() => router.push('/login')}>{t('conv_fazer_login')}</button>
                <button className="btn btn--ink" style={{ padding: '12px 24px' }} onClick={() => router.push('/cadastro')}>{t('cad_criar')}</button>
              </div>
            </>
          )}
          {estado === 'erro' && (
            <>
              <h1 className="tm-h1">{t('conv_indisponivel')}</h1>
              <p className="tm-lead" style={{ margin: '0 auto 24px' }}>
                {msg || t('conv_nao_processar')} {t('conv_ja_aceito')}
              </p>
              <button className="btn btn--verde" style={{ padding: '12px 28px' }} onClick={() => router.push('/conta')}>{t('conv_ir_conta')}</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Convite() {
  const { t } = useIdioma();
  return (
    <Suspense fallback={<div className="container"><p>{t('comum_carregando')}</p></div>}>
      <ConviteConteudo />
    </Suspense>
  );
}
