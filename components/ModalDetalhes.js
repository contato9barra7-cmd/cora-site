'use client';

// ═══════════════════════════════════════════════════════════
//  ModalDetalhes — o que foi usado nesta geração
//
//  Meses depois, olhando uma imagem no histórico, a pessoa não lembra: que
//  resolução era? quantas referências? qual foi o prompt?
//
//  Esta janela responde. É o mesmo que o plugin mostra — configurações e
//  referências — mais o prompt, quando ele existe.
// ═══════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { ROTULO_FERRAMENTA } from '../lib/geracoes';

export default function ModalDetalhes({ aberto, lote, item, onFechar }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto, onFechar]);

  if (!aberto || !lote) return null;

  const quando = item?.criadoEm || lote.criadoEm;

  const dataCompleta = quando
    ? new Date(quando).toLocaleString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : null;

  return (
    <div className="cr-overlay cr-overlay--alto" onClick={onFechar}>
      <div className="dt" onClick={(e) => e.stopPropagation()}>

        <header className="dt-cab">
          <h3>Detalhes</h3>
          <button className="dt-x" onClick={onFechar} aria-label="Fechar">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" strokeLinecap="round"/>
            </svg>
          </button>
        </header>

        <div className="dt-corpo">

          {/* ── Configurações ── */}
          <div className="dt-sec">Configurações</div>
          <div className="dt-pills">
            {lote.ferramenta && (
              <span className="dt-pill">
                {ROTULO_FERRAMENTA[lote.ferramenta] || lote.ferramenta}
              </span>
            )}
            {lote.proporcao && <span className="dt-pill">{lote.proporcao}</span>}
            {lote.resolucao && <span className="dt-pill">{lote.resolucao.toUpperCase()}</span>}
            {lote.duracaoSeg && <span className="dt-pill">{lote.duracaoSeg}s</span>}
          </div>

          {dataCompleta && <p className="dt-data">{dataCompleta}</p>}

          {/* ── A imagem de origem (o print do SketchUp) ── */}
          {lote.original && (
            <>
              <div className="dt-sec">Imagem de origem</div>
              <img className="dt-origem" src={lote.original} alt="" />
            </>
          )}

          {/* ── O prompt ──
              Só para quem gerou (e para o admin). É o que a IA recebeu. */}
          {lote.observacoes && (
            <>
              <div className="dt-sec">Prompt</div>
              <div className="dt-prompt">{lote.observacoes}</div>
            </>
          )}

          {!lote.original && !lote.observacoes && (
            <p className="dt-vazio">
              Esta geração não guardou a imagem de origem nem o prompt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
