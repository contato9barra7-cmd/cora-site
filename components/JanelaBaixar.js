'use client';

// ═══════════════════════════════════════════════════════════
//  A janela de download
//
//  Baixar não é só "joga um PNG na pasta Downloads". A pessoa escolhe o formato
//  — PNG quando quer o máximo e a transparência, JPEG quando quer um arquivo
//  leve — e ONDE salvar, como em qualquer programa de verdade.
//
//  O "onde" vem do `showSaveFilePicker`: no Chrome e no Edge, ele abre o
//  Salvar-como do sistema, com a árvore de pastas. Onde ele não existe (Firefox,
//  Safari), cai no download comum — o arquivo vai para Downloads, e não há como
//  contornar isso pela web.
// ═══════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export default function JanelaBaixar({ aoBaixar, aoFechar }) {
  const [formato, setFormato] = useState('png');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); aoFechar(); }
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [aoFechar]);

  async function baixar() {
    setSalvando(true);
    try {
      await aoBaixar(formato);
      aoFechar();
    } finally {
      setSalvando(false);
    }
  }

  return createPortal(
    <div className="cf-fundo" onClick={aoFechar}>
      <div className="bx" onClick={(e) => e.stopPropagation()}>

        <div className="bx-topo">
          <span className="bx-tit">Baixar imagem</span>
          <button className="df-x" onClick={aoFechar} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="bx-corpo">

          {/* ── PNG ── */}
          <button
            className={'bx-fmt' + (formato === 'png' ? ' bx-fmt--on' : '')}
            onClick={() => setFormato('png')}
          >
            <span className="bx-fmt-nome">PNG</span>
            <span className="bx-fmt-sub">Qualidade máxima, com transparência</span>
          </button>

          {/* ── JPEG ── */}
          <button
            className={'bx-fmt' + (formato === 'jpeg' ? ' bx-fmt--on' : '')}
            onClick={() => setFormato('jpeg')}
          >
            <span className="bx-fmt-nome">JPEG</span>
            <span className="bx-fmt-sub">Arquivo mais leve, fundo branco</span>
          </button>

        </div>

        <div className="bx-pe">
          <button className="ps-b" onClick={aoFechar}>Cancelar</button>
          <button className="ps-b ps-b--on" onClick={baixar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Escolher pasta'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
