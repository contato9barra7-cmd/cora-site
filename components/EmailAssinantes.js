'use client';

// ═══════════════════════════════════════════════════════════
//  Enviar e-mail aos assinantes (admin) — composição livre + prévia.
//  Público: assinantes ativos / todos os cadastrados do Cora.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { adminContarPublicos, adminEnviarEmail } from '../lib/auth';
import { useIdioma } from '../lib/i18n';
import DropdownCora from './DropdownCora';

const PUBLICOS_ASSIN = [
  { v: 'ativos', k: 'emailassinantes_pub_assin_ativos' },
  { v: 'todos', k: 'emailassinantes_pub_todos_cad' },
];

function formatarLinhaHtml(linha) {
  let s = String(linha || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, '<strong>$1</strong>')
       .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>')
       .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gi, '<em>$1</em>')
       .replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/gi, '<em>$1</em>')
       .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u style="text-decoration:underline;">$1</u>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/~~(.+?)~~/g, '<s>$1</s>');
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s\)]+)\)/g, '<a href="$2" style="color:#111111;text-decoration:underline;" target="_blank" rel="noreferrer">$1</a>');
  return s;
}

function renderizarPreviaCorpo(texto) {
  if (!texto) return null;
  const blocos = texto.split(/\n\n+/);
  return blocos.map((bloco, bi) => {
    const limpo = bloco.trim();
    if (!limpo) return null;
    const linhas = limpo.split('\n').map(l => l.trim()).filter(Boolean);
    if (!linhas.length) return null;

    let grupoTipo = null;
    let grupoLinhas = [];
    const elementos = [];

    function fechar() {
      if (!grupoLinhas.length) return;
      if (grupoTipo === 'ul') {
        elementos.push(
          <ul key={elementos.length} style={{ margin: '0 0 14px 20px', padding: 0 }}>
            {grupoLinhas.map((l, li) => (
              <li key={li} style={{ marginBottom: 4 }}>
                <span dangerouslySetInnerHTML={{ __html: formatarLinhaHtml(l.replace(/^[•\-\*]\s+/, '')) }} />
              </li>
            ))}
          </ul>
        );
      } else if (grupoTipo === 'ol') {
        elementos.push(
          <ol key={elementos.length} style={{ margin: '0 0 14px 20px', padding: 0 }}>
            {grupoLinhas.map((l, li) => (
              <li key={li} style={{ marginBottom: 4 }}>
                <span dangerouslySetInnerHTML={{ __html: formatarLinhaHtml(l.replace(/^\d+[\.\)]\s+/, '')) }} />
              </li>
            ))}
          </ol>
        );
      } else {
        elementos.push(
          <p key={elementos.length} style={{ margin: '0 0 14px' }}>
            {grupoLinhas.map((l, li) => (
              <span key={li}>
                <span dangerouslySetInnerHTML={{ __html: formatarLinhaHtml(l) }} />
                {li < grupoLinhas.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      }
      grupoLinhas = [];
      grupoTipo = null;
    }

    for (const l of linhas) {
      const tipo = /^[•\-\*]\s+/.test(l) ? 'ul' : (/^\d+[\.\)]\s+/.test(l) ? 'ol' : 'p');
      if (tipo !== grupoTipo) {
        fechar();
        grupoTipo = tipo;
      }
      grupoLinhas.push(l);
    }
    fechar();

    return <div key={bi}>{elementos}</div>;
  });
}

export default function EmailAssinantes({ onClose }) {
  const { t } = useIdioma();
  const PUBLICOS = PUBLICOS_ASSIN;
  const txtRef = useRef(null);
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
    const fn = adminContarPublicos;
    fn().then(setContagens).catch(() => {});
  }, []);

  const qtd = contagens ? (contagens[publico] ?? 0) : null;

  function podeEnviar() { return assunto.trim() && mensagem.trim(); }

  function formatar(cmd) {
    const el = txtRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = mensagem;
    const sel = val.substring(start, end);
    let novoTexto = '';
    let novoStart = start;
    let novoEnd = end;

    if (cmd === 'bold') {
      if (sel.length > 0) {
        if (sel.startsWith('**') && sel.endsWith('**') && sel.length >= 4) {
          novoTexto = sel.slice(2, -2);
          novoStart = start;
          novoEnd = start + novoTexto.length;
        } else {
          novoTexto = '**' + sel + '**';
          novoStart = start;
          novoEnd = start + novoTexto.length;
        }
      } else {
        const ph = t('adm_au_negrito').toLowerCase();
        novoTexto = '**' + ph + '**';
        novoStart = start + 2;
        novoEnd = start + 2 + ph.length;
      }
      const prox = val.slice(0, start) + novoTexto + val.slice(end);
      setMensagem(prox);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(novoStart, novoEnd);
      }, 0);
    } else if (cmd === 'italic') {
      if (sel.length > 0) {
        if (sel.startsWith('*') && sel.endsWith('*') && sel.length >= 2 && !sel.startsWith('**')) {
          novoTexto = sel.slice(1, -1);
          novoStart = start;
          novoEnd = start + novoTexto.length;
        } else {
          novoTexto = '*' + sel + '*';
          novoStart = start;
          novoEnd = start + novoTexto.length;
        }
      } else {
        const ph = t('adm_au_italico').toLowerCase();
        novoTexto = '*' + ph + '*';
        novoStart = start + 1;
        novoEnd = start + 1 + ph.length;
      }
      const prox = val.slice(0, start) + novoTexto + val.slice(end);
      setMensagem(prox);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(novoStart, novoEnd);
      }, 0);
    } else if (cmd === 'underline') {
      if (sel.length > 0) {
        if (sel.startsWith('<u>') && sel.endsWith('</u>') && sel.length >= 7) {
          novoTexto = sel.slice(3, -4);
          novoStart = start;
          novoEnd = start + novoTexto.length;
        } else {
          novoTexto = '<u>' + sel + '</u>';
          novoStart = start;
          novoEnd = start + novoTexto.length;
        }
      } else {
        const ph = t('adm_au_sublinhado').toLowerCase();
        novoTexto = '<u>' + ph + '</u>';
        novoStart = start + 3;
        novoEnd = start + 3 + ph.length;
      }
      const prox = val.slice(0, start) + novoTexto + val.slice(end);
      setMensagem(prox);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(novoStart, novoEnd);
      }, 0);
    } else if (cmd === 'link') {
      const url = window.prompt(t('adm_au_link_pede'), 'https://');
      if (url && url.trim()) {
        const u = url.trim();
        const txtLink = sel || 'link';
        novoTexto = '[' + txtLink + '](' + u + ')';
        const prox = val.slice(0, start) + novoTexto + val.slice(end);
        setMensagem(prox);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start, start + novoTexto.length);
        }, 0);
      }
    } else if (cmd === 'bullet' || cmd === 'number') {
      const inicioLinha = val.lastIndexOf('\n', start - 1) + 1;
      let fimLinha = val.indexOf('\n', end);
      if (fimLinha === -1) fimLinha = val.length;
      const bloco = val.substring(inicioLinha, fimLinha);
      const linhas = bloco.split('\n');
      const novasLinhas = [];

      if (cmd === 'bullet') {
        const todasComBul = linhas.every((l) => /^[•\-\*]\s+/.test(l));
        linhas.forEach((l) => {
          if (todasComBul) novasLinhas.push(l.replace(/^[•\-\*]\s+/, ''));
          else novasLinhas.push('• ' + l.replace(/^(?:[•\-\*]|\d+[\.\)])\s+/, ''));
        });
      } else {
        const todasComNum = linhas.every((l) => /^\d+[\.\)]\s+/.test(l));
        linhas.forEach((l, i) => {
          if (todasComNum) novasLinhas.push(l.replace(/^\d+[\.\)]\s+/, ''));
          else novasLinhas.push((i + 1) + '. ' + l.replace(/^(?:[•\-\*]|\d+[\.\)])\s+/, ''));
        });
      }
      const substituicao = novasLinhas.join('\n');
      const prox = val.slice(0, inicioLinha) + substituicao + val.slice(fimLinha);
      setMensagem(prox);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(inicioLinha, inicioLinha + substituicao.length);
      }, 0);
    }
  }

  async function enviar() {
    if (!podeEnviar()) { setErro(t('emailassinantes_erro_preencha')); return; }
    setEnviando(true); setErro('');
    try {
      const payload = {
        publico, assunto: assunto.trim(), titulo: titulo.trim(), mensagem: mensagem.trim(),
        botao_texto: botaoTexto.trim(), botao_link: botaoLink.trim(),
      };
      const r = await adminEnviarEmail(payload);
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
              <h3>{t('emailassinantes_titulo_assin')}</h3>
              <p>{t('emailassinantes_sub_assin')}</p>
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
              <div className="ea-fld">
                <label>{t('emailassinantes_mensagem')}</label>
                <div className="ea-editor">
                  <div className="ea-barra-txt">
                    <button type="button" data-dica={t('adm_au_negrito')} onMouseDown={(e) => e.preventDefault()} onClick={() => formatar('bold')}><b>B</b></button>
                    <button type="button" data-dica={t('adm_au_italico')} onMouseDown={(e) => e.preventDefault()} onClick={() => formatar('italic')}><i>I</i></button>
                    <button type="button" data-dica={t('adm_au_sublinhado')} onMouseDown={(e) => e.preventDefault()} onClick={() => formatar('underline')}><u>S</u></button>
                    <hr />
                    <button type="button" data-dica={t('adm_au_link')} onMouseDown={(e) => e.preventDefault()} onClick={() => formatar('link')}>
                      <svg viewBox="0 0 24 24"><path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" /><path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" /></svg>
                    </button>
                    <hr />
                    <button type="button" data-dica={t('adm_au_lista')} onMouseDown={(e) => e.preventDefault()} onClick={() => formatar('bullet')}>&bull;</button>
                    <button type="button" data-dica={t('adm_au_lista_n')} onMouseDown={(e) => e.preventDefault()} onClick={() => formatar('number')}>1.</button>
                  </div>
                  <textarea
                    ref={txtRef}
                    className="ea-inp ea-txt"
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    onKeyDown={e => {
                      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
                        e.preventDefault();
                        formatar('bold');
                      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
                        e.preventDefault();
                        formatar('italic');
                      }
                    }}
                    placeholder={t('emailassinantes_ph_mensagem')}
                  />
                </div>
              </div>
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
                <div className="ea-prev-faixa">
                  <img src="/img/email-faixa.png" alt="" />
                </div>
                <div className="ea-prev-logo">
                  <img src="/img/email-logo.png" alt="Cora Render" width="108" height="26" />
                </div>
                <div className="ea-prev-body">
                  {titulo && <h4>{titulo}</h4>}
                  <div>{renderizarPreviaCorpo(mensagem)}</div>
                  {botaoTexto && botaoLink && <span className="ea-prev-cta">{botaoTexto}</span>}
                </div>
                <div className="ea-prev-rod">
                  9barra7 Academy · <a href="https://corarender.com" target="_blank" rel="noreferrer">corarender.com</a>
                </div>
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
