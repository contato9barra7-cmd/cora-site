'use client';

// ═══════════════════════════════════════════════════════════
//  Trilho — as pills das abas
//
//  Enquanto eram quatro, cabiam: cada uma tomava um quarto da largura
//  (`flex: 1`) e pronto. Com oito, essa divisão espremeria o texto até sumir.
//
//  Então as pills passam a ter a largura do próprio rótulo, e o trilho ANDA:
//  uma seta em cada ponta o empurra. A trava é o detalhe que importa — o
//  trilho para sempre no COMEÇO de uma pill, nunca no meio de um rótulo.
//  Meia palavra aparecendo é pior do que não aparecer nenhuma.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';

export default function Trilho({ abas, ativa, onTrocar }) {
  const sulcoRef  = useRef(null);
  const trilhoRef = useRef(null);

  const [x, setX]     = useState(0);
  const [max, setMax] = useState(0);

  // Quanto dá para andar. Se tudo cabe, é zero — e as setas somem.
  const medir = useCallback(() => {
    const s = sulcoRef.current;
    const t = trilhoRef.current;
    if (!s || !t) return;

    const m = Math.max(0, t.scrollWidth - s.clientWidth);
    setMax(m);
    setX((v) => Math.min(v, m));   // se a janela cresceu, não deixa sobrar vão
  }, []);

  useEffect(() => {
    medir();
    const ob = new ResizeObserver(medir);
    if (sulcoRef.current) ob.observe(sulcoRef.current);
    return () => ob.disconnect();
  }, [medir, abas]);

  // ── A trava ──
  // Andar não é somar N pixels: é ir até a borda esquerda da PRÓXIMA pill.
  // É isso que garante que nenhum rótulo fique cortado ao meio.
  function proxima() {
    const t = trilhoRef.current;
    if (!t) return;

    for (const p of t.children) {
      if (p.offsetLeft > x + 2) {
        setX(Math.min(p.offsetLeft, max));
        return;
      }
    }
    setX(max);   // não há próxima: vai até o fim
  }

  function anterior() {
    const t = trilhoRef.current;
    if (!t) return;

    const ps = [...t.children];
    for (let i = ps.length - 1; i >= 0; i--) {
      if (ps[i].offsetLeft < x - 2) {
        setX(Math.max(0, ps[i].offsetLeft));
        return;
      }
    }
    setX(0);
  }

  // Trocar de aba pela pill: se ela estiver fora de vista, o trilho a traz.
  // Sem isto, clicar numa aba pelo teclado a deixaria escondida.
  useEffect(() => {
    const t = trilhoRef.current;
    const s = sulcoRef.current;
    if (!t || !s) return;

    const i = abas.findIndex((a) => a.id === ativa);
    const p = t.children[i];
    if (!p) return;

    const esq = p.offsetLeft;
    const dir = esq + p.offsetWidth;

    if (esq < x)                     setX(Math.max(0, esq));
    else if (dir > x + s.clientWidth) setX(Math.min(max, dir - s.clientWidth));
  }, [ativa, abas, x, max]);

  const temEsq = x > 2;
  const temDir = x < max - 2;

  return (
    <div className="cr-pills">

      {temEsq && (
        <button className="cr-seta" onClick={anterior} aria-label="Abas anteriores">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
               stroke="currentColor" strokeWidth="1.7"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4l-5 6 5 6" />
          </svg>
        </button>
      )}

      <div className="cr-sulco" ref={sulcoRef}>
        <div
          className="cr-trilho"
          ref={trilhoRef}
          style={{ transform: `translateX(${-x}px)` }}
        >
          {abas.map((a) => (
            <button
              key={a.id}
              className={'cr-pill' + (ativa === a.id ? ' cr-pill--on' : '')}
              onClick={() => onTrocar(a.id)}
            >{a.rotulo}</button>
          ))}
        </div>
      </div>

      {temDir && (
        <button className="cr-seta" onClick={proxima} aria-label="Mais abas">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
               stroke="currentColor" strokeWidth="1.7"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 4l5 6-5 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
