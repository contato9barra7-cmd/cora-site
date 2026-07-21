'use client';

// ═══════════════════════════════════════════════════════════
//  Enviar e-mail aos assinantes (admin) — composição livre + prévia.
//  Público: assinantes ativos / todos os cadastrados / alunos.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { adminContarPublicos, adminEnviarEmail } from '../lib/auth';

const PUBLICOS = [
  { v: 'ativos', l: 'Assinantes ativos' },
  { v: 'todos', l: 'Todos os cadastrados' },
  { v: 'alunos', l: 'Alunos (promptadores)' },
];

export default function EmailAssinantes({ onClose }) {
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
    adminContarPublicos().then(setContagens).catch(() => {});
  }, []);

  const qtd = contagens ? (contagens[publico] ?? 0) : null;

  function podeEnviar() { return assunto.trim() && mensagem.trim(); }

  async function enviar() {
    if (!podeEnviar()) { setErro('Preencha assunto e mensagem.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await adminEnviarEmail({
        publico, assunto: assunto.trim(), titulo: titulo.trim(), mensagem: mensagem.trim(),
        botao_texto: botaoTexto.trim(), botao_link: botaoLink.trim(),
      });
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
            <h3>E-mail enviado!</h3>
            <p>{resultado.enviados} enviado(s){resultado.falhas ? `, ${resultado.falhas} falha(s)` : ''}{resultado.sem_resend ? ' — servidor de e-mail não configurado.' : ''}.</p>
            <button className="ea-btn ea-enviar" onClick={onClose}>Fechar</button>
          </div>
        ) : vista === 'compor' ? (
          <>
            <div className="ea-mh">
              <h3>Enviar e-mail aos assinantes</h3>
              <p>Escreva o que quiser e envie para o público escolhido.</p>
            </div>
            <div className="ea-mb">
              <div className="ea-fld">
                <label>Para</label>
                <select className="ea-sel" value={publico} onChange={e => setPublico(e.target.value)}>
                  {PUBLICOS.map(p => <option key={p.v} value={p.v}>{p.l}{contagens ? ` (${contagens[p.v] ?? 0})` : ''}</option>)}
                </select>
              </div>
              <div className="ea-fld"><label>Assunto</label>
                <input className="ea-inp" value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Assunto do e-mail" /></div>
              <div className="ea-fld"><label>Título <span className="ea-opc">(aparece no e-mail)</span></label>
                <input className="ea-inp" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título grande do e-mail" /></div>
              <div className="ea-fld"><label>Mensagem</label>
                <textarea className="ea-inp ea-txt" value={mensagem} onChange={e => setMensagem(e.target.value)} placeholder="Escreva sua mensagem..." /></div>
              <div className="ea-duo">
                <div className="ea-fld"><label>Texto do botão <span className="ea-opc">(opcional)</span></label>
                  <input className="ea-inp" value={botaoTexto} onChange={e => setBotaoTexto(e.target.value)} placeholder="Ex: Ver novidades" /></div>
                <div className="ea-fld"><label>Link do botão <span className="ea-opc">(opcional)</span></label>
                  <input className="ea-inp" value={botaoLink} onChange={e => setBotaoLink(e.target.value)} placeholder="https://..." /></div>
              </div>
              <div className="ea-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="#6d6ae0" strokeWidth="1.8"><path d="M4 4h16v12H7l-3 3V4z" /></svg>
                Será enviado para <b>&nbsp;{qtd == null ? '…' : qtd} {qtd === 1 ? 'pessoa' : 'pessoas'}</b>.
              </div>
              {erro && <p className="ea-erro">{erro}</p>}
            </div>
            <div className="ea-mf">
              <button className="ea-btn ea-cancelar" onClick={onClose}>Cancelar</button>
              <div className="ea-dir">
                <button className="ea-btn ea-previa" onClick={() => setVista('previa')} disabled={!podeEnviar()}>Ver prévia</button>
                <button className="ea-btn ea-enviar" onClick={enviar} disabled={enviando || !podeEnviar()}>{enviando ? 'Enviando...' : 'Enviar'}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="ea-mh">
              <button className="ea-back" onClick={() => setVista('compor')}>← Voltar a editar</button>
              <h3>Prévia do e-mail</h3>
            </div>
            <div className="ea-assunto">Assunto: <b>{assunto || '(sem assunto)'}</b></div>
            <div className="ea-mb">
              <div className="ea-prev">
                <div className="ea-prev-top">Cora Render</div>
                <div className="ea-prev-body">
                  {titulo && <h4>{titulo}</h4>}
                  <p>{mensagem.split('\n').map((linha, i) => <span key={i}>{linha}<br /></span>)}</p>
                  {botaoTexto && botaoLink && <span className="ea-prev-cta">{botaoTexto}</span>}
                </div>
                <div className="ea-prev-rod">9barra7 Academy · corarender.com</div>
              </div>
              {erro && <p className="ea-erro">{erro}</p>}
            </div>
            <div className="ea-mf">
              <button className="ea-btn ea-cancelar" onClick={onClose}>Cancelar</button>
              <div className="ea-dir">
                <button className="ea-btn ea-enviar" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando...' : `Enviar para ${qtd == null ? '' : qtd} ${qtd === 1 ? 'pessoa' : 'pessoas'}`}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
