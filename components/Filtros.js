'use client';

// ═══════════════════════════════════════════════════════════
//  Filtros — o painel que abre pelo ícone de ajustes
//
//  Data, ferramenta, proporção, resolução e favoritos. Os filtros rápidos
//  (Tudo / Imagens / Vídeos / Upscales / Favoritos) continuam nos ícones da
//  barra; aqui ficam os que precisam de mais espaço.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

const FERRAMENTAS = [
  { val: 'render',   rotulo: 'Render' },
  { val: 'editar',   rotulo: 'Editar' },
  { val: 'batch',    rotulo: 'Batch' },
  { val: 'upscale',  rotulo: 'Upscale' },
  { val: '360',      rotulo: '360°' },
  { val: 'animacao', rotulo: 'Animação' }
];

// As mais usadas ficam à mostra; o resto entra no "..."
const PROPORCOES_PRINCIPAIS = ['1:1', '16:9', '9:16', '4:3', '4:5'];
const PROPORCOES_RESTO      = ['3:2', '2:3', '5:4', '3:4', '21:9'];

const RESOLUCOES = ['1k', '2k', '4k', '8k', '16k'];

export default function Filtros({ aberto, valor, onMudar, onLimpar, onFechar }) {
  const [maisProps, setMaisProps] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  function alternar(campo, item) {
    const atual = valor[campo] || [];
    onMudar({
      ...valor,
      [campo]: atual.includes(item)
        ? atual.filter((x) => x !== item)
        : [...atual, item]
    });
  }

  const usados =
    (valor.de ? 1 : 0) + (valor.ate ? 1 : 0) +
    (valor.ferramentas?.length || 0) +
    (valor.proporcoes?.length || 0) +
    (valor.resolucoes?.length || 0) +
    (valor.baixadas ? 1 : 0) +
    (valor.favoritos ? 1 : 0);

  return (
    <>
      <div className="ft-fundo" onClick={onFechar} />

      <div className="ft" onClick={(e) => e.stopPropagation()}>

        <div className="ft-bloco">
          <h4>Período</h4>
          <div className="ft-datas">
            <input
              type="date"
              value={valor.de || ''}
              onChange={(e) => onMudar({ ...valor, de: e.target.value })}
            />
            <span>→</span>
            <input
              type="date"
              value={valor.ate || ''}
              onChange={(e) => onMudar({ ...valor, ate: e.target.value })}
            />
          </div>
        </div>

        <div className="ft-bloco">
          <h4>Ferramenta</h4>
          <div className="ft-tags">
            {FERRAMENTAS.map((f) => (
              <button
                key={f.val}
                className={'ft-tag' + ((valor.ferramentas || []).includes(f.val) ? ' ft-tag--on' : '')}
                onClick={() => alternar('ferramentas', f.val)}
              >{f.rotulo}</button>
            ))}
          </div>
        </div>

        <div className="ft-bloco">
          <h4>Proporção</h4>
          <div className="ft-tags">
            {PROPORCOES_PRINCIPAIS.map((p) => (
              <button
                key={p}
                className={'ft-tag' + ((valor.proporcoes || []).includes(p) ? ' ft-tag--on' : '')}
                onClick={() => alternar('proporcoes', p)}
              >{p}</button>
            ))}

            {/* O resto das proporções mora aqui, para não lotar o painel */}
            {!maisProps && (
              <button className="ft-tag ft-tag--mais" onClick={() => setMaisProps(true)}>
                ...
              </button>
            )}

            {maisProps && PROPORCOES_RESTO.map((p) => (
              <button
                key={p}
                className={'ft-tag' + ((valor.proporcoes || []).includes(p) ? ' ft-tag--on' : '')}
                onClick={() => alternar('proporcoes', p)}
              >{p}</button>
            ))}
          </div>
        </div>

        <div className="ft-bloco">
          <h4>Propriedades</h4>
          <div className="ft-tags">
            <button
              className={'ft-tag' + (valor.baixadas ? ' ft-tag--on' : '')}
              onClick={() => onMudar({ ...valor, baixadas: !valor.baixadas })}
            >
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.5 14v1.5A1.5 1.5 0 005 17h10a1.5 1.5 0 001.5-1.5V14" strokeLinecap="round"/>
              </svg>
              Baixadas
            </button>

            <button
              className={'ft-tag' + (valor.favoritos ? ' ft-tag--on' : '')}
              onClick={() => onMudar({ ...valor, favoritos: !valor.favoritos })}
            >
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M10 16.5l-1.1-1C5 12 2.5 9.7 2.5 6.9A3.4 3.4 0 016 3.5c1.2 0 2.3.5 3 1.5.7-1 1.8-1.5 3-1.5a3.4 3.4 0 013.5 3.4c0 2.8-2.5 5.1-6.4 8.6l-1.1 1z" strokeLinejoin="round"/>
              </svg>
              Favoritas
            </button>
          </div>
        </div>

        <div className="ft-bloco">
          <h4>Resolução</h4>
          <div className="ft-tags">
            {RESOLUCOES.map((r) => (
              <button
                key={r}
                className={'ft-tag' + ((valor.resolucoes || []).includes(r) ? ' ft-tag--on' : '')}
                onClick={() => alternar('resolucoes', r)}
              >{r.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <button className="ft-limpar" onClick={onLimpar} disabled={usados === 0}>
          Limpar tudo{usados > 0 ? ` (${usados})` : ''}
        </button>
      </div>
    </>
  );
}
