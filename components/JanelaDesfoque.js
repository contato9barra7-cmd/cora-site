'use client';

// ═══════════════════════════════════════════════════════════
//  As janelas de desfoque
//
//  Elas FLUTUAM e são arrastáveis: uma janela parada no meio da tela tapa
//  justamente a parte da imagem que se está tentando ajustar, e o ajuste vira
//  adivinhação.
//
//  E não escurecem o fundo. Um véu por cima da imagem falsearia as cores que a
//  pessoa está tentando julgar.
// ═══════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIdioma } from '../lib/i18n';

export default function JanelaDesfoque({ tipo, inicial, aoAplicar, aoFechar }) {
  const { t } = useIdioma();
  const gauss = tipo === 'desfGauss';

  // Reabrindo um filtro que já existe, os controles nascem com os valores DELE.
  // Nascer no padrão obrigaria a redescobrir de cabeça o raio que já se havia
  // escolhido.
  const [raio, setRaio] = useState(inicial?.raio ?? (gauss ? 4 : 10));
  const [angulo, setAngulo] = useState(inicial?.angulo ?? 0);
  const [previa, setPrevia] = useState(true);

  // Onde a janela está, em relação a onde ela nasceu.
  const [onde, setOnde] = useState({ x: 0, y: 0 });
  const arrasto = useRef(null);

  // ── A prévia ──
  //
  // Com um freio: arrastar o slider dispara dezenas de mudanças por segundo, e
  // desfocar a cada uma delas empilharia trabalho que nunca termina.
  useEffect(() => {
    if (!previa) {
      aoAplicar(null, false);        // desligada: a tela volta ao original
      return;
    }

    const tt = setTimeout(() => aoAplicar({ raio, angulo }, false), 80);
    return () => clearTimeout(tt);
  }, [previa, raio, angulo, aoAplicar]);

  // A prévia é limpa ao desmontar, aconteça o que acontecer. Sem isto, fechar a
  // janela por um caminho não previsto deixaria a imagem desfocada na tela sem
  // que nada tivesse sido aplicado de verdade.
  useEffect(() => () => aoAplicar(null, false), [aoAplicar]);

  const cancelar = useCallback(() => {
    aoAplicar(null, false);
    aoFechar();
  }, [aoAplicar, aoFechar]);

  const confirmar = useCallback(() => {
    aoAplicar({ raio, angulo }, true);
    aoFechar();
  }, [raio, angulo, aoAplicar, aoFechar]);

  // ── O teclado ──
  useEffect(() => {
    const tecla = (e) => {
      // O Enter dentro de um campo de número não fecha a janela: ali ele só
      // confirma o que se digitou.
      const emCampo = e.target.tagName === 'INPUT' && e.target.type === 'number';

      if (e.key === 'Escape') { e.stopPropagation(); cancelar(); }
      if (e.key === 'Enter' && !emCampo) { e.stopPropagation(); confirmar(); }
    };

    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [cancelar, confirmar]);

  // ── Arrastar pela barra do título ──
  function pegar(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.df-x')) return;      // o X não arrasta: ele fecha

    arrasto.current = { x: e.clientX - onde.x, y: e.clientY - onde.y };
    e.preventDefault();
  }

  useEffect(() => {
    const move = (e) => {
      if (!arrasto.current) return;
      setOnde({ x: e.clientX - arrasto.current.x, y: e.clientY - arrasto.current.y });
    };

    const solta = () => { arrasto.current = null; };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', solta);

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', solta);
    };
  }, []);

  return createPortal(
    <div className="df" style={{ transform: `translate(${onde.x}px, ${onde.y}px)` }}>

      <div className="df-topo" onMouseDown={pegar}>
        <span className="df-tit">
          {gauss ? t('janeladesfoque_titulo_gauss') : t('janeladesfoque_titulo_mov')}
        </span>

        <button className="df-x" onClick={cancelar} aria-label={t('fechar')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="df-corpo">

        {/* ── O ângulo, só no movimento ── */}
        {!gauss && (
          <div className="df-linha">
            <label className="df-l">{t('janeladesfoque_angulo')}</label>

            <input
              type="range" min={-180} max={180} value={angulo}
              onChange={(e) => setAngulo(+e.target.value)}
              aria-label={t('janeladesfoque_angulo')}
            />

            <input
              type="number" className="df-num" min={-180} max={180} value={angulo}
              onChange={(e) => setAngulo(Math.max(-180, Math.min(180, +e.target.value || 0)))}
              aria-label={t('janeladesfoque_angulo_graus')}
            />
            <span className="df-un">°</span>

            {/* O mostrador. Um número em graus não diz nada à mão: a linha diz.
                Ela gira, e vê-se para onde o borrão vai puxar. */}
            <span className="df-bussola" aria-hidden="true">
              <span
                className="df-agulha"
                style={{ transform: `rotate(${angulo}deg)` }}
              />
            </span>
          </div>
        )}

        <div className="df-linha">
          <label className="df-l">{gauss ? t('janeladesfoque_raio') : t('janeladesfoque_distancia')}</label>

          <input
            type="range" min={1} max={gauss ? 100 : 200} value={raio}
            onChange={(e) => setRaio(+e.target.value)}
            aria-label={gauss ? t('janeladesfoque_raio') : t('janeladesfoque_distancia')}
          />

          <input
            type="number" className="df-num" min={1} max={gauss ? 100 : 200} value={raio}
            onChange={(e) => {
              const tt = gauss ? 100 : 200;
              setRaio(Math.max(1, Math.min(tt, +e.target.value || 1)));
            }}
            aria-label={gauss ? t('janeladesfoque_raio_px') : t('janeladesfoque_distancia_px')}
          />
          <span className="df-un">px</span>
        </div>

        <label className="df-cx">
          <input
            type="checkbox"
            checked={previa}
            onChange={(e) => setPrevia(e.target.checked)}
          />
          <span>{t('janeladesfoque_visualizar')}</span>
        </label>

      </div>

      <div className="df-pe">
        <button className="ps-b" onClick={cancelar}>{t('comum_cancelar')}</button>
        <button className="ps-b ps-b--on" onClick={confirmar}>{t('janeladesfoque_ok')}</button>
      </div>

    </div>,
    document.body
  );
}
