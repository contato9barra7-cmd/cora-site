'use client';

// ═══════════════════════════════════════════════════════════
//  Visualizador — a imagem em tamanho grande, com comparação
//
//  Três modos, na ordem e com os ícones do plugin:
//    Split        — cortina arrastável entre a captura e o render
//    Side by Side — as duas lado a lado
//    Single       — só o render; SEGURE o botão para ver a captura
//
//  O Single não alterna com clique: no plugin você segura e vê a captura,
//  solta e volta o render, com um aviso na tela. Copiamos esse gesto.
//
//  As ações se dividem em duas famílias:
//    Grátis     — Favoritar, Baixar, Excluir
//    Transporte — Editar, Upscale, Animar
//  As de transporte NÃO geram e NÃO cobram: levam a imagem para a aba de
//  destino, onde a pessoa configura e só então gera. Por isso não têm o
//  ícone de crédito. (Mesmo padrão do tlParaStart / narrEnviarParaAnim.)
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import ModalDownload from './ModalDownload';

const MODOS = [
  {
    id: 'split', rotulo: 'Split', tip: 'Split View',
    icone: (
      <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
        <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="7" y1="0" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )
  },
  {
    id: 'sbs', rotulo: 'Side by Side', tip: 'Side by Side',
    icone: (
      <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
        <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    )
  },
  {
    id: 'single', rotulo: 'Single', tip: 'Single View',
    icone: (
      <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    )
  }
];

export default function Visualizador({
  item, original, prompt, ehAdmin,
  onFechar, onFavoritar, onExcluir, onEnviarPara
}) {
  const [modo, setModo]           = useState('split');
  const [corte, setCorte]         = useState(50);      // % da cortina
  const [segurando, setSegurando] = useState(false);   // single: vendo a captura
  const [baixar, setBaixar]       = useState(false);
  const areaRef = useRef(null);

  // Esc fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  // Arrastar a cortina
  function arrastar(e) {
    if (modo !== 'split' || !areaRef.current) return;
    const r = areaRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    setCorte(Math.max(0, Math.min(100, (x / r.width) * 100)));
  }

  function iniciarArrasto(e) {
    e.preventDefault();
    arrastar(e);
    const mover = (ev) => arrastar(ev);
    const soltar = () => {
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
      window.removeEventListener('touchmove', mover);
      window.removeEventListener('touchend', soltar);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
    window.addEventListener('touchmove', mover);
    window.addEventListener('touchend', soltar);
  }

  if (!item) return null;

  const temOriginal = Boolean(original);

  return (
    <div className="cr-overlay" onClick={onFechar}>
      <div className="vz" onClick={(e) => e.stopPropagation()}>

        <header className="vz-cab">
          {temOriginal && (
            <div className="vz-modos">
              {MODOS.map((m) => (
                <button
                  key={m.id}
                  className={'vz-modo' + (modo === m.id ? ' vz-modo--on' : '')}
                  onClick={() => setModo(m.id)}
                  data-tip={m.tip}
                >
                  {m.icone}
                  <span>{m.rotulo}</span>
                </button>
              ))}
            </div>
          )}
          <button className="cr-modal-x" onClick={onFechar} aria-label="Fechar">×</button>
        </header>

        <div className="vz-area" ref={areaRef}>

          {/* Split: a cortina */}
          {temOriginal && modo === 'split' && (
            <div className="vz-split" onMouseDown={iniciarArrasto} onTouchStart={iniciarArrasto}>
              <img className="vz-img" src={item.url} alt="" draggable={false} />
              <div className="vz-split-topo" style={{ width: corte + '%' }}>
                <img
                  className="vz-img"
                  src={original}
                  alt=""
                  draggable={false}
                  style={{ width: areaRef.current?.clientWidth + 'px' }}
                />
              </div>

              <div className="vz-handle" style={{ left: corte + '%' }}>
                <span className="vz-handle-bola">
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 6l-3 4 3 4M12 6l3 4-3 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>

              <span className="vz-tag vz-tag--esq">Captura</span>
              <span className="vz-tag vz-tag--dir">Render</span>
            </div>
          )}

          {/* Side by Side */}
          {temOriginal && modo === 'sbs' && (
            <div className="vz-sbs">
              <div className="vz-sbs-lado">
                <img className="vz-img" src={original} alt="" />
                <span className="vz-tag">Captura</span>
              </div>
              <div className="vz-sbs-lado">
                <img className="vz-img" src={item.url} alt="" />
                <span className="vz-tag">Render</span>
              </div>
            </div>
          )}

          {/* Single: segure para ver a captura */}
          {(!temOriginal || modo === 'single') && (
            <div
              className="vz-single"
              onMouseDown={() => temOriginal && setSegurando(true)}
              onMouseUp={() => setSegurando(false)}
              onMouseLeave={() => setSegurando(false)}
              onTouchStart={() => temOriginal && setSegurando(true)}
              onTouchEnd={() => setSegurando(false)}
            >
              <img
                className="vz-img"
                src={segurando && temOriginal ? original : item.url}
                alt=""
                draggable={false}
              />
              {temOriginal && (
                <span className="vz-aviso">
                  {segurando ? 'Solte para ver o render' : 'Segure para ver a captura'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* O prompt é só para o admin — a pessoa não precisa vê-lo. */}
        {ehAdmin && prompt && (
          <details className="vz-prompt">
            <summary>Ver prompt (admin)</summary>
            <p>{prompt}</p>
          </details>
        )}

        <footer className="vz-acoes">
          <button
            className={'vz-ico' + (item.favorito ? ' vz-ico--fav' : '')}
            onClick={() => onFavoritar(item)}
            data-tip={item.favorito ? 'Desfavoritar' : 'Favoritos'}
            aria-label={item.favorito ? 'Desfavoritar' : 'Favoritar'}
          >
            <svg viewBox="0 0 20 20" width="17" height="17"
                 fill={item.favorito ? 'currentColor' : 'none'}
                 stroke="currentColor" strokeWidth="1.5">
              <path d="M10 16.8l-1.2-1.1C4.7 12 2 9.5 2 6.5A3.7 3.7 0 015.8 2.8c1.3 0 2.5.6 3.2 1.6.8-1 2-1.6 3.2-1.6A3.7 3.7 0 0118 6.5c0 3-2.7 5.5-6.8 9.2L10 16.8z" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            className="vz-ico"
            onClick={() => setBaixar(true)}
            data-tip="Baixar (PNG/JPEG)"
            aria-label="Baixar"
          >
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 14v1.5A1.5 1.5 0 005 17h10a1.5 1.5 0 001.5-1.5V14" strokeLinecap="round"/>
            </svg>
          </button>

          <button
            className="vz-ico vz-ico--perigo"
            onClick={() => onExcluir(item)}
            data-tip="Excluir"
            aria-label="Excluir"
          >
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" strokeLinecap="round"/>
              <path d="M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="vz-div" />

          {/* Estes NÃO geram: levam a imagem para a aba de destino. */}
          <button
            className="vz-envia vz-envia--on"
            onClick={() => onEnviarPara('editar', item)}
            data-tip="Enviar para Editar"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13.5 3.5l3 3L7 16l-3.5.5L4 13l9.5-9.5z" strokeLinejoin="round"/>
            </svg>
            Editar
          </button>

          <button
            className="vz-envia"
            onClick={() => onEnviarPara('upscale', item)}
            data-tip="Enviar para Upscale"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 3.5h5.5V9M16.5 3.5L11 9" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 16.5H3.5V11M3.5 16.5L9 11" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Upscale
          </button>

          <button
            className="vz-envia"
            onClick={() => onEnviarPara('animar', item)}
            data-tip="Enviar para Animação"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2.5" y="5" width="10" height="10" rx="1.5"/>
              <path d="M12.5 8.5l5-2.5v8l-5-2.5" strokeLinejoin="round"/>
            </svg>
            Animar
          </button>
        </footer>
      </div>

      <ModalDownload
        aberto={baixar}
        url={item.url}
        onFechar={() => setBaixar(false)}
      />
    </div>
  );
}
