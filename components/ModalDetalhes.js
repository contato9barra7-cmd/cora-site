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

          {/* ── Como foi feita ──
              A ferramenta primeiro, destacada: é a informação que diz o que
              esta imagem É. Depois as configurações. */}
          <div className="dt-sec">Como foi feita</div>
          <div className="dt-pills">
            {lote.ferramenta && (
              <span className="dt-pill dt-pill--forte">
                {ROTULO_FERRAMENTA[lote.ferramenta] || lote.ferramenta}
              </span>
            )}
            {lote.plataforma === 'plugin' && <span className="dt-pill dt-pill--plugin">Plugin</span>}
            {lote.proporcao && <span className="dt-pill">{lote.proporcao}</span>}
            {lote.resolucao && <span className="dt-pill">{lote.resolucao.toUpperCase()}</span>}
            {lote.duracaoSeg && <span className="dt-pill">{lote.duracaoSeg}s</span>}
          </div>

          {dataCompleta && <p className="dt-data">{dataCompleta}</p>}

          {/* ── O que foi usado ──
              Tudo o que entrou nesta geração: o print de origem e as
              referências de estilo. Meses depois, ninguém lembra. */}
          {lote.original && (
            <>
              <div className="dt-sec">Imagem de origem</div>
              <div className="dt-imgs">
                <img className="dt-img" src={lote.original} alt="" />
              </div>
            </>
          )}

          {lote.refs?.length > 0 && (
            <>
              <div className="dt-sec">Referências ({lote.refs.length})</div>
              <div className="dt-imgs">
                {lote.refs.map((u, i) => (
                  <img key={i} className="dt-img" src={u} alt="" />
                ))}
              </div>
            </>
          )}

          {!lote.original && !lote.refs?.length && (
            <p className="dt-vazio">
              Esta geração não guardou as imagens que a originaram.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
