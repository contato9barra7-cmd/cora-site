'use client';

// ═══════════════════════════════════════════════════════════
//  As janelas de desfoque
//
//  O desfoque era aplicado direto, sem perguntar nada: um clique no ícone e
//  pronto. Não havia como escolher o raio, nem o ângulo do movimento, nem ver o
//  resultado antes de aceitá-lo — e desfoque é justamente o tipo de coisa que
//  só se acerta olhando.
//
//  Estas são as janelas do plugin, com uma diferença: a prévia é ao vivo.
// ═══════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

export default function JanelaDesfoque({ tipo, aoAplicar, aoFechar }) {
  const gauss = tipo === 'desfGauss';

  const [raio, setRaio] = useState(gauss ? 4 : 10);
  const [angulo, setAngulo] = useState(0);
  const [previa, setPrevia] = useState(true);

  // A prévia é pedida a cada mudança — mas com um freio. Desfocar uma imagem de
  // 4K a cada movimento do slider engasgaria a mão; um quadro de espera basta
  // para o arraste ficar fluido e o olho não notar o atraso.
  const espera = useRef(null);

  useEffect(() => {
    if (!previa) {
      aoAplicar(null, false);      // desliga a prévia: mostra o original
      return;
    }

    clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      aoAplicar({ raio, angulo }, false);
    }, 90);

    return () => clearTimeout(espera.current);
  }, [raio, angulo, previa]);

  // Ao fechar, a prévia tem que ir junto — ou a imagem ficaria desfocada na tela
  // sem que nada tivesse sido aplicado de verdade.
  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); cancelar(); }
      if (e.key === 'Enter')  { e.stopPropagation(); confirmar(); }
    };

    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  function cancelar() {
    aoAplicar(null, false);
    aoFechar();
  }

  function confirmar() {
    aoAplicar({ raio, angulo }, true);
    aoFechar();
  }

  return createPortal(
    <div className="cf-fundo" onClick={cancelar}>
      <div className="df" onClick={(e) => e.stopPropagation()}>

        <div className="df-topo">
          <span className="df-tit">
            {gauss ? 'Desfoque gaussiano' : 'Desfoque de movimento'}
          </span>

          <button className="df-x" onClick={cancelar} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="df-corpo">

          {/* ── O ângulo, só no movimento ── */}
          {!gauss && (
            <div className="df-linha">
              <label className="df-l">Ângulo</label>

              <input
                type="range" min={-180} max={180} value={angulo}
                onChange={(e) => setAngulo(+e.target.value)}
                aria-label="Ângulo"
              />

              <input
                type="number" className="df-num" min={-180} max={180} value={angulo}
                onChange={(e) => setAngulo(Math.max(-180, Math.min(180, +e.target.value || 0)))}
                aria-label="Ângulo em graus"
              />
              <span className="df-un">°</span>

              {/* O mostrador. Um número em graus não diz nada à mão: a linha
                  diz. Ela gira, e vê-se para onde o borrão vai puxar. */}
              <span className="df-bussola" aria-hidden="true">
                <span
                  className="df-agulha"
                  style={{ transform: `rotate(${angulo}deg)` }}
                />
              </span>
            </div>
          )}

          <div className="df-linha">
            <label className="df-l">{gauss ? 'Raio' : 'Distância'}</label>

            <input
              type="range" min={1} max={gauss ? 100 : 200} value={raio}
              onChange={(e) => setRaio(+e.target.value)}
              aria-label={gauss ? 'Raio' : 'Distância'}
            />

            <input
              type="number" className="df-num" min={1} max={gauss ? 100 : 200} value={raio}
              onChange={(e) => {
                const t = gauss ? 100 : 200;
                setRaio(Math.max(1, Math.min(t, +e.target.value || 1)));
              }}
              aria-label={gauss ? 'Raio em pixels' : 'Distância em pixels'}
            />
            <span className="df-un">px</span>
          </div>

          <label className="df-cx">
            <input
              type="checkbox"
              checked={previa}
              onChange={(e) => setPrevia(e.target.checked)}
            />
            <span>Visualizar</span>
          </label>

        </div>

        <div className="df-pe">
          <button className="ps-b" onClick={cancelar}>Cancelar</button>
          <button className="ps-b ps-b--on" onClick={confirmar}>OK</button>
        </div>

      </div>
    </div>,
    document.body
  );
}
