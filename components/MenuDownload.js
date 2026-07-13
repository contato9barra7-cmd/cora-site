'use client';

// ═══════════════════════════════════════════════════════════
//  MenuDownload — o botão de baixar, com o formato ali mesmo
//
//  Antes abria um modal. Mas escolher entre PNG e JPEG não é uma decisão
//  que mereça tomar a tela inteira — e o modal tapava justamente a imagem
//  que a pessoa estava avaliando.
//
//  O que decide entre os dois é o PESO. "Sem perdas" não diz se são 500 KB
//  ou 8 MB, então o peso estimado aparece em cada opção.
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { baixarGeracao } from '../lib/geracoes';

// Uma estimativa, não uma medida: medir exigiria baixar os bytes ANTES de a
// pessoa escolher — que é justamente o que se quer evitar.
//
// PNG de render costuma dar ~1,2 byte por pixel; JPEG a 80%, ~0,22.
function pesar(w, h, formato) {
  if (!w || !h) return null;
  const px = w * h;
  const bytes = formato === 'png' ? px * 1.2 : px * 0.22;

  return bytes > 1048576
    ? (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB'
    : Math.round(bytes / 1024) + ' KB';
}

export default function MenuDownload({ item, className = 'vz-ico' }) {
  const [aberto, setAberto]   = useState(false);
  const [baixando, setBaixando] = useState('');
  const [erro, setErro]       = useState('');
  const [dim, setDim]         = useState(null);

  const wrapRef = useRef(null);

  // Mede a imagem para estimar o peso
  useEffect(() => {
    if (!aberto || dim || !item?.url) return;
    const img = new Image();
    img.onload = () => setDim({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = item.thumb || item.url;
  }, [aberto, dim, item]);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;

    function fora(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false);
    }
    function esc(e) { if (e.key === 'Escape') setAberto(false); }

    window.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', fora);
      window.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  async function baixar(formato) {
    setBaixando(formato);
    setErro('');
    try {
      await baixarGeracao(item.id, formato);
      setAberto(false);
    } catch (e) {
      setErro(e.message);
    } finally {
      setBaixando('');
    }
  }

  return (
    <div className="dl-wrap" ref={wrapRef}>
      <button
        className={className + (aberto ? ' vz-ico--on' : '')}
        onClick={() => setAberto((v) => !v)}
        data-tip="Baixar"
        aria-label="Baixar"
      >
        <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
             stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.5 15v1.5h13V15" strokeLinecap="round"/>
        </svg>
      </button>

      {aberto && (
        <div className="dl-menu">
          <button
            className="dl-op"
            onClick={() => baixar('png')}
            disabled={!!baixando}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none"
                 stroke="currentColor" strokeWidth="1.4">
              <path d="M4 2.5h8l4 4v11H4z" strokeLinejoin="round"/>
              <path d="M12 2.5v4h4" strokeLinejoin="round"/>
            </svg>
            <span>
              <strong>PNG</strong>
              <em>
                {baixando === 'png' ? 'Baixando...' : 'Qualidade 100%'}
                {dim && baixando !== 'png' && ` · ${pesar(dim.w, dim.h, 'png')}`}
              </em>
            </span>
          </button>

          <button
            className="dl-op"
            onClick={() => baixar('jpeg')}
            disabled={!!baixando}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none"
                 stroke="currentColor" strokeWidth="1.4">
              <path d="M4 2.5h8l4 4v11H4z" strokeLinejoin="round"/>
              <path d="M12 2.5v4h4" strokeLinejoin="round"/>
            </svg>
            <span>
              <strong>JPEG</strong>
              <em>
                {baixando === 'jpeg' ? 'Baixando...' : 'Qualidade 80%'}
                {dim && baixando !== 'jpeg' && ` · ${pesar(dim.w, dim.h, 'jpeg')}`}
              </em>
            </span>
          </button>

          {erro && <div className="dl-erro">{erro}</div>}
        </div>
      )}
    </div>
  );
}
