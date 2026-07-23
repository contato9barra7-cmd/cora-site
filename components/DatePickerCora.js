'use client';

// ═══════════════════════════════════════════════════════════
//  DatePickerCora — calendário com a cara do Cora
//
//  O <input type="date"> abre o calendário do sistema (azul, bordas retas).
//  Este substitui por um popover próprio: bordas arredondadas e seleção roxa
//  (verde no tema escuro). valor/onEscolher usam o formato ISO 'YYYY-MM-DD'.
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function parseISO(s) {
  if (!s) return null;
  const [a, m, d] = s.split('-').map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d);
}
function toISO(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function fmt(dt) {
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

export default function DatePickerCora({ valor, onEscolher, placeholder = 'Escolher data' }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const sel = parseISO(valor);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const [vista, setVista] = useState(sel || hoje); // mês visível

  useEffect(() => {
    if (!aberto) return;
    setVista(parseISO(valor) || new Date());
    function fora(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto, valor]);

  const ano = vista.getFullYear(), mes = vista.getMonth();
  const primeiro = new Date(ano, mes, 1).getDay();       // 0=domingo
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const celulas = [];
  for (let i = 0; i < primeiro; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);

  function escolher(d) {
    onEscolher(toISO(new Date(ano, mes, d)));
    setAberto(false);
  }
  function mesAnterior() { setVista(new Date(ano, mes - 1, 1)); }
  function mesProximo() { setVista(new Date(ano, mes + 1, 1)); }
  function irHoje() { onEscolher(toISO(new Date())); setAberto(false); }

  const mesmoDia = (d) =>
    sel && sel.getFullYear() === ano && sel.getMonth() === mes && sel.getDate() === d;
  const ehHoje = (d) =>
    hoje.getFullYear() === ano && hoje.getMonth() === mes && hoje.getDate() === d;

  return (
    <div className={'coradp' + (aberto ? ' coradp--aberto' : '')} ref={ref}>
      <button type="button" className="coradp-btn" onClick={() => setAberto(a => !a)}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9h18M8 2.5v4M16 2.5v4" strokeLinecap="round" />
        </svg>
        <span className={sel ? '' : 'coradp-ph'}>{sel ? fmt(sel) : placeholder}</span>
      </button>

      {aberto && (
        <div className="coradp-pop">
          <div className="coradp-cab">
            <button type="button" className="coradp-nav" onClick={mesAnterior} aria-label="Mês anterior">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="coradp-mes">{MESES[mes]} de {ano}</span>
            <button type="button" className="coradp-nav" onClick={mesProximo} aria-label="Próximo mês">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div className="coradp-grade">
            {DIAS.map((d, i) => <div key={'h' + i} className="coradp-dh">{d}</div>)}
            {celulas.map((d, i) => d === null
              ? <div key={'v' + i} />
              : <button
                  type="button" key={'d' + i}
                  className={'coradp-dia' + (mesmoDia(d) ? ' sel' : '') + (ehHoje(d) && !mesmoDia(d) ? ' hoje' : '')}
                  onClick={() => escolher(d)}
                >{d}</button>
            )}
          </div>
          <div className="coradp-pe">
            <button type="button" className="coradp-hoje" onClick={irHoje}>Hoje</button>
          </div>
        </div>
      )}
    </div>
  );
}
