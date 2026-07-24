'use client';

import { useState, useEffect } from 'react';
import { lerConta, enviarSuporte } from '../../lib/auth';
import { useIdioma, tOpt } from '../../lib/i18n';

const CATEGORIAS = [
  'Cobrança e assinatura',
  'Créditos',
  'Plugin do SketchUp',
  'Problema técnico (bug)',
  'Resultado da IA / render',
  'Conta e acesso',
  'Dúvida de uso',
  'Sugestão / feedback',
  'Privacidade e meus dados',
  'Outro',
];

export default function Suporte() {
  const { t } = useIdioma();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [faltando, setFaltando] = useState({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Se a pessoa estiver logada, já preenche nome e e-mail.
  useEffect(() => {
    const c = lerConta();
    if (c) {
      if (c.nome) setNome(c.nome);
      if (c.email) setEmail(c.email);
    }
  }, []);

  async function enviar() {
    setErro('');
    const falta = {};
    if (!nome.trim()) falta.nome = true;
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) falta.email = true;
    if (!assunto) falta.assunto = true;
    if (!mensagem.trim()) falta.mensagem = true;

    if (Object.keys(falta).length) {
      setFaltando(falta);
      setErro(t('sup_preencha'));
      return;
    }
    setFaltando({});
    setEnviando(true);
    try {
      await enviarSuporte({ nome, email, assunto, mensagem });
      setEnviado(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const cls = (campo) => 'sup-campo' + (faltando[campo] ? ' sup-campo--erro' : '');

  return (
    <div className="sup-wrap">
      <div className="sup-card">
        <div className="sup-banda">
          <span className="sup-eyebrow">{t('sup_eyebrow')}</span>
          <h1 className="sup-titulo">{t('sup_titulo')}</h1>
          <p className="sup-sub">{t('sup_sub')}</p>
        </div>

        <div className="sup-body">
          {enviado ? (
            <div className="sup-ok">
              <div className="sup-ok-ic">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#14141a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h2 className="sup-ok-tit">{t('sup_enviada')}</h2>
              <p className="sup-ok-txt">
                {t('sup_recebemos1')} <strong>{email}</strong> {t('sup_recebemos2')}
              </p>
            </div>
          ) : (
            <>
              {erro && <p className="sup-erro">{erro}</p>}

              <div className="sup-row2">
                <div>
                  <label className="sup-label">{t('perfil_nome')}</label>
                  <input className={cls('nome')} value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div>
                  <label className="sup-label">{t('sup_email')}</label>
                  <input className={cls('email')} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login_ph_email')} />
                </div>
              </div>

              <label className="sup-label">{t('sup_assunto')}</label>
              <select className={cls('assunto')} value={assunto} onChange={(e) => setAssunto(e.target.value)}>
                <option value="">{t('sup_selecione_cat')}</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{tOpt(c)}</option>)}
              </select>

              <label className="sup-label">{t('sup_mensagem')}</label>
              <textarea className={cls('mensagem')} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder={t('sup_ph_mensagem')} />

              <button className="sup-btn" onClick={enviar} disabled={enviando}>
                {enviando ? t('esq_enviando') : t('sup_enviar')}
              </button>

              <p className="sup-foot">
                {t('sup_prefere')} <a href="mailto:cora@corarender.com">cora@corarender.com</a>
                {' '}· {t('sup_veja')} <a href="/#faq">{t('sup_faq')}</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
