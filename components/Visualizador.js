'use client';

// ═══════════════════════════════════════════════════════════
//  Visualizador — a imagem grande, com comparação
//
//  Três modos, na ordem e com os ícones do plugin:
//    Split        — cortina arrastável entre o print e o render
//    Side by Side — os dois lado a lado
//    Single       — só o render; SEGURE para ver o print
//
//  Mais o modo A/B: compara DUAS imagens quaisquer do histórico.
//
//  O tamanho da janela NÃO muda entre os modos — só o conteúdo. Trocar de
//  modo não pode fazer a tela pular.
//
//  ── O bug do split (corrigido) ──
//  Antes, a camada de cima usava a largura do CONTÊINER. Como a imagem é
//  menor que o contêiner (fica centralizada, com margem), o corte caía no
//  lugar errado e o lado do print mostrava um pedaço do render.
//  Agora as duas camadas usam a MESMA caixa (a da imagem), e o corte é
//  relativo a ela. Por isso o wrapper .vz-par tem o tamanho da imagem, não
//  o do contêiner.
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
  ladoB, modoAB, onEntrarAB, onSairAB,
  onFechar, onFavoritar, onExcluir, onEnviarPara
}) {
  const [modo, setModo]           = useState('split');
  const [corte, setCorte]         = useState(50);
  const [segurando, setSegurando] = useState(false);
  const [baixar, setBaixar]       = useState(false);
  const parRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  // A cortina é relativa à IMAGEM, não ao contêiner. Era esse o bug.
  function arrastar(e) {
    if (!parRef.current) return;
    const r = parRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    setCorte(Math.max(0, Math.min(100, (x / r.width) * 100)));
  }

  function iniciarArrasto(e) {
    e.preventDefault();
    arrastar(e);
    const mover  = (ev) => arrastar(ev);
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

  // No A/B, o "print" vira a imagem A escolhida
  const esquerda = modoAB ? (ladoB?.url || null) : original;
  const rotEsq   = modoAB ? 'A' : 'Print';
  const rotDir   = modoAB ? 'B' : 'Render';
  const compara  = Boolean(esquerda);

  return (
    <div className="cr-overlay" onClick={onFechar}>
      <div className="vz" onClick={(e) => e.stopPropagation()}>

        <header className="vz-cab">
          {compara && (
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

          <button
            className={'vz-ab' + (modoAB ? ' vz-ab--on' : '')}
            onClick={modoAB ? onSairAB : onEntrarAB}
            data-tip={modoAB ? 'Sair do A/B' : 'Comparar com outra imagem'}
          >
            A/B
          </button>

          <button className="cr-modal-x" onClick={onFechar} aria-label="Fechar">×</button>
        </header>

        {modoAB && !ladoB && (
          <p className="vz-ab-dica">
            Modo A/B: clique numa imagem do histórico para escolher o lado A.
          </p>
        )}

        {/* A área tem tamanho FIXO — trocar de modo não faz a tela pular */}
        <div className="vz-area">

          {compara && modo === 'split' && (
            <div
              className="vz-par"
              ref={parRef}
              onMouseDown={iniciarArrasto}
              onTouchStart={iniciarArrasto}
            >
              {/* Base: o render */}
              <img className="vz-img" src={item.url} alt="" draggable={false} />

              {/* Cortina: o print, cortado à esquerda.
                  A imagem de dentro tem 100% da MESMA caixa — por isso as
                  duas coincidem pixel a pixel. */}
              <div className="vz-cortina" style={{ width: corte + '%' }}>
                <img className="vz-img vz-img--fixa" src={esquerda} alt="" draggable={false} />
              </div>

              <div className="vz-handle" style={{ left: corte + '%' }}>
                <span className="vz-handle-bola">
                  <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.5 6l-3 4 3 4M11.5 6l3 4-3 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>

              <span className="vz-tag vz-tag--esq">{rotEsq}</span>
              <span className="vz-tag vz-tag--dir">{rotDir}</span>
            </div>
          )}

          {compara && modo === 'sbs' && (
            <div className="vz-sbs">
              <div className="vz-sbs-lado">
                <img className="vz-img" src={esquerda} alt="" />
                <span className="vz-tag vz-tag--esq">{rotEsq}</span>
              </div>
              <div className="vz-sbs-lado">
                <img className="vz-img" src={item.url} alt="" />
                <span className="vz-tag vz-tag--esq">{rotDir}</span>
              </div>
            </div>
          )}

          {(!compara || modo === 'single') && (
            <div
              className="vz-par vz-par--single"
              onMouseDown={() => compara && setSegurando(true)}
              onMouseUp={() => setSegurando(false)}
              onMouseLeave={() => setSegurando(false)}
              onTouchStart={() => compara && setSegurando(true)}
              onTouchEnd={() => setSegurando(false)}
            >
              <img
                className="vz-img"
                src={segurando && compara ? esquerda : item.url}
                alt=""
                draggable={false}
              />
              {compara && (
                <span className="vz-aviso">
                  {segurando ? 'Solte para ver o render' : 'Segure para ver o print'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* O prompt é só do admin */}
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
            <svg viewBox="0 0 24 24" width="18" height="18"
                 fill={item.favorito ? 'currentColor' : 'none'}
                 stroke="currentColor" strokeWidth="1.6">
              <path d="M12 20.3l-1.5-1.4C5.2 14.1 2 11.2 2 7.6A4.6 4.6 0 016.6 3c1.6 0 3.1.7 4.1 1.9l1.3 1.5 1.3-1.5A5.4 5.4 0 0117.4 3 4.6 4.6 0 0122 7.6c0 3.6-3.2 6.5-8.5 11.3L12 20.3z"
                    strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="vz-ico" onClick={() => setBaixar(true)} data-tip="Baixar (PNG/JPEG)" aria-label="Baixar">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 14v1.5A1.5 1.5 0 005 17h10a1.5 1.5 0 001.5-1.5V14" strokeLinecap="round"/>
            </svg>
          </button>

          <button className="vz-ico vz-ico--perigo" onClick={() => onExcluir(item)} data-tip="Excluir" aria-label="Excluir">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" strokeLinecap="round"/>
              <path d="M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="vz-div" />

          {/* Estes só TRANSPORTAM: levam a imagem para a aba de destino.
              Não geram, não cobram — por isso não têm o losango de crédito. */}
          <button className="vz-ico vz-ico--envia" onClick={() => onEnviarPara('editar', item)}
                  data-tip="Enviar para Editar" aria-label="Enviar para Editar">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13.5 3.5l3 3L7 16l-3.5.5L4 13l9.5-9.5z" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="vz-ico vz-ico--envia" onClick={() => onEnviarPara('upscale', item)}
                  data-tip="Enviar para Upscale" aria-label="Enviar para Upscale">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 3.5h5.5V9M16.5 3.5L11 9" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 16.5H3.5V11M3.5 16.5L9 11" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="vz-ico vz-ico--envia" onClick={() => onEnviarPara('animar', item)}
                  data-tip="Enviar para Animação" aria-label="Enviar para Animação">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2.5" y="5" width="10" height="10" rx="1.5"/>
              <path d="M12.5 8.5l5-2.5v8l-5-2.5" strokeLinejoin="round"/>
            </svg>
          </button>
        </footer>
      </div>

      <ModalDownload aberto={baixar} url={item.url} onFechar={() => setBaixar(false)} />
    </div>
  );
}
