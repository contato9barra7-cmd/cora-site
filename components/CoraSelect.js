'use client';

// ═══════════════════════════════════════════════════════════
//  CoraSelect — o dropdown da marca (mesmo do seletor de idioma)
//
//  Popup arredondado, destaque roxo/verde da marca, sem o azul do
//  <select> do sistema. O popup vai em position:fixed (medido a partir
//  do gatilho) pra escapar de qualquer overflow do container.
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';

export default function CoraSelect({ value, options, onChange, icon, className, disabled }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const trigRef = useRef(null);
  const popRef = useRef(null);
  // A roda do mouse sobre o popup PRECISA rolar a lista, não vazar pro pai.
  useEffect(() => {
    if (!aberto) return;
    const el = popRef.current;
    if (!el) return;
    const parar = (e) => { e.stopPropagation(); };
    el.addEventListener('wheel', parar, { passive: false });
    return () => el.removeEventListener('wheel', parar);
  }, [aberto]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const fecha = (ev) => {
      if (ev && ev.target && ref.current && ref.current.contains && ref.current.contains(ev.target)) return;
      setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    window.addEventListener('resize', fecha);
    window.addEventListener('scroll', fecha, true);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('resize', fecha);
      window.removeEventListener('scroll', fecha, true);
    };
  }, [aberto]);
  function alternar() {
    if (disabled) return;
    if (!aberto && trigRef.current) {
      const r = trigRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 5, width: r.width });
    }
    setAberto((a) => !a);
  }
  const atual = options.find((o) => o.value === value);
  return (
    <div className={'cora-sel-wrap' + (className ? ' ' + className : '')} ref={ref}>
      <button
        type="button"
        ref={trigRef}
        disabled={disabled}
        className={'cora-sel-trigger' + (aberto ? ' aberto' : '')}
        onClick={alternar}
      >
        {icon && <span className="cora-sel-ico">{icon}</span>}
        <span className="cora-sel-lbl">{atual ? atual.label : ''}</span>
        <span className="cora-sel-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>
      {aberto && !disabled && (
        <div
          ref={popRef}
          className="cora-sel-pop"
          style={pos ? { position: 'fixed', left: pos.left, top: pos.top, width: pos.width, right: 'auto' } : undefined}
        >
          {options.map((o) => (
            <div
              key={o.value}
              className={'cora-sel-op' + (o.value === value ? ' sel' : '')}
              onClick={() => { onChange(o.value); setAberto(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
