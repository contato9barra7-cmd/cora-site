'use client';

// ═══════════════════════════════════════════════════════════
//  Enviar e-mail aos assinantes (admin) — composição livre + prévia.
//  Público: assinantes ativos / todos os cadastrados / alunos.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { adminContarPublicos, adminEnviarEmail, adminContarPublicosPromptador, adminEnviarEmailPromptador } from '../lib/auth';
import { useIdioma } from '../lib/i18n';
import DropdownCora from './DropdownCora';

const PUBLICOS_ASSIN = [
  { v: 'ativos', k: 'emailassinantes_pub_assin_ativos' },
  { v: 'todos', k: 'emailassinantes_pub_todos_cad' },
  { v: 'alunos', k: 'emailassinantes_pub_alunos_prompt' },
];
const PUBLICOS_CURSO = [
  { v: 'ativos', k: 'emailassinantes_pub_alunos_ativo' },
  { v: 'vencidos', k: 'emailassinantes_pub_alunos_vencido' },
  { v: 'todos', k: 'emailassinantes_pub_todos_alunos' },
];
// Logos (versão branca) no R2 público — usados na prévia, igual ao e-mail enviado.
const R2_ASSETS = 'https://pub-aa535595a631449683ed641002707fa4.r2.dev';
const LOGOS_CURSO = {
  ia_studio: `${R2_ASSETS}/Logo%20IA%20Studio%20Branco.png`,
  prompthub: `${R2_ASSETS}/Logo%20PromptHub%20Branco.png`,
};

// Modo curso: passe `curso` ('ia_studio'|'prompthub') e `cursoLabel`. Aí o e-mail
// sai como 9barra7 e o público são os alunos daquele curso.
export default function EmailAssinantes({ onClose, curso, cursoLabel }) {
  const { t } = useIdioma();
  const modoCurso = !!curso;
  const PUBLICOS = modoCurso ? PUBLICOS_CURSO : PUBLICOS_ASSIN;
  const [publico, setPublico] = useState('ativos');
  const [assunto, setAssunto] = useState('');
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [botaoTexto, setBotaoTexto] = useState('');
  const [botaoLink, setBotaoLink] = useState('');
  const [vista, setVista] = useState('compor');       // compor | previa
  const [contagens, setContagens] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const fn = modoCurso ? () => adminContarPublicosPromptador(curso) : adminContarPublicos;
    fn().then(setContagens).catch(() => {});
  }, [modoCurso, curso]);

  const qtd = contagens ? (contagens[publico] ?? 0) : null;

  function podeEnviar() { return assunto.trim() && mensagem.trim(); }

  async function enviar() {
    if (!podeEnviar()) { setErro(t('emailassinantes_erro_preencha')); return; }
    setEnviando(true); setErro('');
    try {
      const payload = {
        publico, assunto: assunto.trim(), titulo: titulo.trim(), mensagem: mensagem.trim(),
        botao_texto: botaoTexto.trim(), botao_link: botaoLink.trim(),
      };
      const r = modoCurso
        ? await adminEnviarEmailPromptador({ ...payload, curso })
        : await adminEnviarEmail(payload);
      setResultado(r);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="ea-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ea-modal">
        {/* ── resultado ── */}
        {resultado ? (
          <div className="ea-result">
            <div className="ea-check"><svg viewBox="0 0 24 24" fill="none" stroke="#0d2b06" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></div>
            <h3>{t('emailassinantes_enviado')}</h3>
            <p>{resultado.enviados} {t('emailassinantes_enviados_suffix')}{resultado.falhas ? `, ${resultado.falhas} ${t('emailassinantes_falhas_suffix')}` : ''}{resultado.sem_resend ? ` — ${t('emailassinantes_sem_resend')}` : ''}.</p>
            <button className="ea-btn ea-enviar" onClick={onClose}>{t('fechar')}</button>
          </div>
        ) : vista === 'compor' ? (
          <>
            <div className="ea-mh">
              <h3>{modoCurso ? `${t('emailassinantes_titulo_alunos')}${cursoLabel ? ' · ' + cursoLabel : ''}` : t('emailassinantes_titulo_assin')}</h3>
              <p>{modoCurso ? t('emailassinantes_sub_alunos') : t('emailassinantes_sub_assin')}</p>
            </div>
            <div className="ea-mb">
              <div className="ea-fld">
                <label>{t('emailassinantes_para')}</label>
                <DropdownCora
                  valor={publico}
                  onEscolher={setPublico}
                  opcoes={PUBLICOS.map(p => ({ v: p.v, n: `${t(p.k)}${contagens ? ` (${contagens[p.v] ?? 0})` : ''}` }))}
                />
              </div>
              <div className="ea-fld"><label>{t('emailassinantes_assunto')}</label>
                <input className="ea-inp" value={assunto} onChange={e => setAssunto(e.target.value)} placeholder={t('emailassinantes_ph_assunto')} /></div>
              <div className="ea-fld"><label>{t('emailassinantes_titulo_label')} <span className="ea-opc">{t('emailassinantes_titulo_hint')}</span></label>
                <input className="ea-inp" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={t('emailassinantes_ph_titulo')} /></div>
              <div className="ea-fld"><label>{t('emailassinantes_mensagem')}</label>
                <textarea className="ea-inp ea-txt" value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder={t('emailassinantes_ph_mensagem')} /></div>
              <div className="ea-duo">
                <div className="ea-fld"><label>{t('emailassinantes_btn_texto')} <span className="ea-opc">{t('emailassinantes_opcional')}</span></label>
                  <input className="ea-inp" value={botaoTexto} onChange={e => setBotaoTexto(e.target.value)} placeholder={t('emailassinantes_ph_btn_texto')} /></div>
                <div className="ea-fld"><label>{t('emailassinantes_btn_link')} <span className="ea-opc">{t('emailassinantes_opcional')}</span></label>
                  <input className="ea-inp" value={botaoLink} onChange={e => setBotaoLink(e.target.value)} placeholder="https://..." /></div>
              </div>
              <div className="ea-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="#6d6ae0" strokeWidth="1.8"><path d="M4 4h16v12H7l-3 3V4z" /></svg>
                {t('emailassinantes_sera_enviado')} <b>&nbsp;{qtd == null ? '…' : qtd} {qtd === 1 ? t('emailassinantes_pessoa') : t('emailassinantes_pessoas')}</b>.
              </div>
              {erro && <p className="ea-erro">{erro}</p>}
            </div>
            <div className="ea-mf">
              <button className="ea-btn ea-cancelar" onClick={onClose}>{t('comum_cancelar')}</button>
              <div className="ea-dir">
                <button className="ea-btn ea-previa" onClick={() => setVista('previa')} disabled={!podeEnviar()}>{t('emailassinantes_ver_previa')}</button>
                <button className="ea-btn ea-enviar" onClick={enviar} disabled={enviando || !podeEnviar()}>{enviando ? t('emailassinantes_enviando') : t('emailassinantes_enviar')}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="ea-mh">
              <button className="ea-back" onClick={() => setVista('compor')}>← {t('emailassinantes_voltar_editar')}</button>
              <h3>{t('emailassinantes_previa_titulo')}</h3>
            </div>
            <div className="ea-assunto">{t('emailassinantes_assunto')}: <b>{assunto || t('emailassinantes_sem_assunto')}</b></div>
            <div className="ea-mb">
              <div className="ea-prev">
                <div className="ea-prev-top">{modoCurso && LOGOS_CURSO[curso]
                  ? <img src={LOGOS_CURSO[curso]} alt="9barra7 Academy" style={{ height: 30, width: 'auto', display: 'block' }} />
                  : (modoCurso ? '9barra7 Academy' : 'Cora Render')}</div>
                <div className="ea-prev-body">
                  {titulo && <h4>{titulo}</h4>}
                  <p>{mensagem.split('\n').map((linha, i) => <span key={i}>{linha}<br /></span>)}</p>
                  {botaoTexto && botaoLink && <span className="ea-prev-cta">{botaoTexto}</span>}
                </div>
                <div className="ea-prev-rod">9barra7 Academy</div>
              </div>
              {erro && <p className="ea-erro">{erro}</p>}
            </div>
            <div className="ea-mf">
              <button className="ea-btn ea-cancelar" onClick={onClose}>{t('comum_cancelar')}</button>
              <div className="ea-dir">
                <button className="ea-btn ea-enviar" onClick={enviar} disabled={enviando}>{enviando ? t('emailassinantes_enviando') : `${t('emailassinantes_enviar_para')} ${qtd == null ? '' : qtd} ${qtd === 1 ? t('emailassinantes_pessoa') : t('emailassinantes_pessoas')}`}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
