'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  SUPORTE
//
//  A aposta da página: boa parte do que chega no suporte já está respondido.
//  Ela abre com as dúvidas que mais aparecem e só depois oferece o formulário.
//  Quem se resolve na lista não abre chamado, e quem abre já chega com a
//  dúvida filtrada.
//
//  O desenho é o do artefato aprovado, e a folha (suporte-pagina.css) é
//  gerada a partir dele, escopada em `.sp`. Mudança de aparência vai no
//  artefato e volta pelo gerador, senão os dois desencontram.
//
//  As perguntas moram em lib/faq-suporte.js, nos três idiomas.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { lerConta, enviarSuporte } from '../../lib/auth';
import { useIdioma, tOpt } from '../../lib/i18n';
import Cabecalho from '../../components/Cabecalho';
import { GRUPOS, TUDO, PERGUNTAS, contar, noIdioma } from '../../lib/faq-suporte';

// O valor que viaja para o servidor é sempre esta string em português: é ela
// que vai no assunto do e-mail do suporte. `tOpt` só traduz o rótulo na tela.
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

const MAIS = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14" /><path d="M5 12h14" />
  </svg>
);

const SETA = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// ── o dropdown da marca ─────────────────────────────────────────────────────
// O <select> do sistema pinta a lista com o azul do Windows, que não é nossa
// cor e não respeita nem a fonte nem o raio dos outros campos. Este é o mesmo
// desenho do CoraSelect do painel, com as classes do artefato, para a página
// e o artefato continuarem idênticos.
function Assunto({ valor, aoTrocar, rotuloVazio, invalido }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  return (
    <div className="sel" ref={caixa}>
      <button
        type="button"
        className={'gat' + (valor ? '' : ' vazio') + (aberto ? ' aberto' : '') + (invalido ? ' erro' : '')}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
      >
        <span className="gat__rot">{valor ? tOpt(valor) : rotuloVazio}</span>
        <span className="gat__seta">{SETA}</span>
      </button>
      <div className="pop" role="listbox" hidden={!aberto}>
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            type="button"
            role="option"
            aria-selected={valor === c}
            className="op"
            onClick={() => { aoTrocar(c); setAberto(false); }}
          >
            <span className="op__mira" aria-hidden="true" />
            <span>{tOpt(c)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Suporte() {
  const { t, idioma } = useIdioma();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [faltando, setFaltando] = useState({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  // O servidor diz se o recibo saiu mesmo. A frase "uma confirmacao acabou de
  // sair" so aparece quando ele confirma: o envio do recibo tem try proprio la,
  // entao ele pode falhar sem derrubar o chamado, e afirmar sem saber deixaria
  // a pessoa esperando um e-mail que nunca vem.
  const [recibo, setRecibo] = useState(false);

  const [grupo, setGrupo] = useState('tudo');
  const [aberta, setAberta] = useState(0);

  // Quem já está logado não precisa digitar nome e e-mail de novo.
  useEffect(() => {
    const c = lerConta();
    if (c) {
      if (c.nome) setNome(c.nome);
      if (c.email) setEmail(c.email);
    }
  }, []);

  const lista = PERGUNTAS.filter((p) => grupo === 'tudo' || p.g === grupo);

  // Trocar de grupo abre a primeira do grupo novo. Sem isso a lista trocava e
  // ficava toda fechada, ou pior, com uma resposta aberta no meio do nada.
  function filtrar(id) {
    setGrupo(id);
    setAberta(0);
  }

  async function enviar(e) {
    e.preventDefault();
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
      const r = await enviarSuporte({ nome, email, assunto, mensagem });
      setRecibo(r && r.recibo === true);
      setEnviado(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const cls = (campo) => (faltando[campo] ? ' erro' : '');

  return (
    /* `sp` é a classe da página. Todo o CSS aprovado depende dela, e é por ela
       que ele ganha do molde antigo sem precisar apagar nada do globals. */
    <div className="sp">
      <Cabecalho aqui="suporte" />

      <main id="conteudo">
        <section className="env" id="faq" style={{ paddingBottom: 'clamp(48px,6vw,88px)' }}>
          <div className="faq-grade">
            <div className="faq-lado">
              <span className="olho">{t('sup_eyebrow')}</span>
              <h1>{t('sup_titulo')}</h1>
              <p>{t('sup_lead')}</p>

              <div className="indice" role="group" aria-label={t('sup_filtrar')}>
                <button
                  type="button"
                  aria-pressed={grupo === 'tudo'}
                  onClick={() => filtrar('tudo')}
                >
                  <span>{noIdioma(TUDO, idioma)}</span>
                  <span className="qt">{PERGUNTAS.length}</span>
                </button>
                {GRUPOS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={grupo === g.id}
                    onClick={() => filtrar(g.id)}
                  >
                    <span>{noIdioma(g, idioma)}</span>
                    <span className="qt">{contar(g.id)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="faq-lista">
              {lista.map((p, i) => {
                const txt = noIdioma(p, idioma);
                return (
                  <div className="faq-item" key={p.pt.q}>
                    <button
                      className="faq-gat"
                      type="button"
                      aria-expanded={aberta === i}
                      onClick={() => setAberta(aberta === i ? -1 : i)}
                    >
                      <span>{txt.q}</span>
                      <span className="faq-ic">{MAIS}</span>
                    </button>
                    <div className="faq-resp">
                      <div>
                        {/* HTML nosso, do lib/faq-suporte.js. Nada aqui
                            interpola entrada de usuário. */}
                        <div className="faq-txt" dangerouslySetInnerHTML={{ __html: txt.r }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="faixa" aria-hidden="true" />

        <section className="secao sup-virada">
          <div className="env sup-form">
            {enviado ? (
              <div className="sup-ok">
                <span className="sup-ok__marca" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <h2>{t('sup_enviada')}</h2>
                <p>
                  {t('sup_recebemos1')} <strong>{email}</strong> {t('sup_recebemos2')}
                </p>
                {recibo && <p className="miudo">{t('sup_recibo')}</p>}
                <a className="btn btn--linha" href="#faq">{t('sup_ver_faq')}</a>
              </div>
            ) : (
              <>
                <div className="sup-form__cab">
                  <span className="olho">{t('sup_nao_achou')}</span>
                  <h2>{t('sup_escreve')}</h2>
                  <p>{t('sup_sub')}</p>
                </div>

                <form onSubmit={enviar} noValidate>
                  {erro && <p className="sup-erro" role="alert">{erro}</p>}

                  <div className="dupla">
                    <div className="campo">
                      <label htmlFor="sup-nome">{t('perfil_nome')}</label>
                      <input
                        id="sup-nome"
                        className={cls('nome')}
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                      />
                    </div>
                    <div className="campo">
                      <label htmlFor="sup-email">{t('sup_email')}</label>
                      <input
                        id="sup-email"
                        type="email"
                        className={cls('email')}
                        value={email}
                        placeholder={t('login_ph_email')}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="campo">
                    <label id="sup-rot-assunto">{t('sup_assunto')}</label>
                    <Assunto
                      valor={assunto}
                      aoTrocar={setAssunto}
                      rotuloVazio={t('sup_selecione_cat')}
                      invalido={!!faltando.assunto}
                    />
                  </div>

                  <div className="campo">
                    <label htmlFor="sup-msg">{t('sup_mensagem')}</label>
                    <textarea
                      id="sup-msg"
                      className={cls('mensagem')}
                      value={mensagem}
                      placeholder={t('sup_ph_mensagem')}
                      onChange={(e) => setMensagem(e.target.value)}
                    />
                  </div>

                  <button className="btn btn--lima btn--largo" type="submit" disabled={enviando}>
                    {enviando ? t('esq_enviando') : t('sup_enviar')}
                  </button>
                </form>

                <p className="sup-pe">
                  {t('sup_prefere')}{' '}
                  <a href="mailto:cora@corarender.com">cora@corarender.com</a>
                </p>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
