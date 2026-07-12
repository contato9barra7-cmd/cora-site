'use client';

// ═══════════════════════════════════════════════════════════
//  Filtros — o painel que abre pelo ícone de ajustes
//
//  Data, ferramenta, proporção, resolução e favoritos. Os filtros rápidos
//  (Tudo / Imagens / Vídeos / Upscales / Favoritos) continuam nos ícones da
//  barra; aqui ficam os que precisam de mais espaço.
// ═══════════════════════════════════════════════════════════

import { useEffect } from 'react';

const FERRAMENTAS = [
  { val: 'render',   rotulo: 'Render' },
  { val: 'editar',   rotulo: 'Editar' },
  { val: 'batch',    rotulo: 'Batch' },
  { val: 'upscale',  rotulo: 'Upscale' },
  { val: '360',      rotulo: '360°' },
  { val: 'animacao', rotulo: 'Animação' }
];

const PROPORCOES = ['1:1', '16:9', '9:16', '4:3', '4:5', '3:2', '21:9'];
const RESOLUCOES = ['1k', '2k', '4k', '8k'];

export default function Filtros({ aberto, valor, onMudar, onLimpar, onFechar }) {
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
    (valor.resolucoes?.length || 0);

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
            {PROPORCOES.map((p) => (
              <button
                key={p}
                className={'ft-tag' + ((valor.proporcoes || []).includes(p) ? ' ft-tag--on' : '')}
                onClick={() => alternar('proporcoes', p)}
              >{p}</button>
            ))}
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
