'use client';

// ═══════════════════════════════════════════════════════════
//  CampoRefs — a textarea que entende @
//
//  Digitar "@" abre a lista das referências carregadas, com miniatura.
//  Clicar (ou Enter) insere @img01, @img02...
//
//  Sem isto, a pessoa tinha que lembrar o número de cada referência e
//  digitar certo — e um @img03 num painel com 2 referências não referencia
//  nada.
//
//  Atalhos: ↑ ↓ navegam · Enter/Tab escolhem · Esc fecha
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';

export default function CampoRefs({ valor, onMudar, refs, placeholder, className }) {
  const [aberto, setAberto] = useState(false);
  const [marcado, setMarcado] = useState(0);
  const [inicioArroba, setInicioArroba] = useState(-1);
  const areaRef = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (!areaRef.current?.parentNode.contains(e.target)) setAberto(false);
    };
    window.addEventListener('mousedown', fora);
    return () => window.removeEventListener('mousedown', fora);
  }, [aberto]);

  function aoDigitar(e) {
    const txt = e.target.value;
    const cursor = e.target.selectionStart;
    onMudar(txt);

    // Achou um "@" solto logo antes do cursor? Abre a lista.
    const antes = txt.slice(0, cursor);
    const m = antes.match(/@(\w*)$/);

    if (m && refs.length > 0) {
      setInicioArroba(cursor - m[0].length);
      setMarcado(0);
      setAberto(true);
    } else {
      setAberto(false);
    }
  }

  function inserir(i) {
    const rotulo = '@img' + String(i + 1).padStart(2, '0');
    const area   = areaRef.current;
    const cursor = area.selectionStart;

    // Troca o "@..." que a pessoa começou a digitar pelo rótulo inteiro
    const antes  = valor.slice(0, inicioArroba);
    const depois = valor.slice(cursor);
    const novo   = antes + rotulo + ' ' + depois;

    onMudar(novo);
    setAberto(false);

    // Cursor logo depois do que foi inserido
    const pos = (antes + rotulo + ' ').length;
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(pos, pos);
    });
  }

  function aoTeclar(e) {
    if (!aberto) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMarcado((m) => (m + 1) % refs.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMarcado((m) => (m - 1 + refs.length) % refs.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      inserir(marcado);
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  }

  return (
    <div className="cref">
      <textarea
        ref={areaRef}
        className={className}
        placeholder={placeholder}
        value={valor}
        onChange={aoDigitar}
        onKeyDown={aoTeclar}
        spellCheck={false}
      />

      {aberto && (
        <div className="cref-menu">
          {refs.map((r, i) => (
            <button
              key={i}
              className={'cref-op' + (marcado === i ? ' cref-op--on' : '')}
              onMouseEnter={() => setMarcado(i)}
              onClick={() => inserir(i)}
              type="button"
            >
              <img src={r.previa} alt="" />
              <span>@img{String(i + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
