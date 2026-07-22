'use client';

// ═══════════════════════════════════════════════════════════
//  Trilho — as pills das abas
//
//  Enquanto eram quatro, cabiam: cada uma tomava um quarto da largura e
//  pronto. Com mais, essa divisão espremeria o texto até sumir. Então as pills
//  passam a ter a largura do próprio rótulo, e o trilho ANDA.
//
//  ── A trava ──
//  Andar não é somar N pixels. O trilho para de modo que a ÚLTIMA pill visível
//  caiba INTEIRA — nada de meia palavra assomando na borda. Para isso não basta
//  alinhar pela esquerda da próxima: é preciso olhar a DIREITA dela e recuar o
//  bastante para que ela caiba no sulco.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { useIdioma } from '../lib/i18n';

export default function Trilho({ abas, ativa, onTrocar, bloqueadas = [] }) {
  const { t } = useIdioma();

  const sulcoRef  = useRef(null);
  const trilhoRef = useRef(null);

  const [x, setX]     = useState(0);
  const [max, setMax] = useState(0);

  // FOLGA: a pill selecionada é branca e arredondada. Se ela parar colada na
  // borda curva do sulco, a curva morde o canto dela. Toda parada deixa esta
  // folga de respiro — assim a pill fica sempre na zona reta, sem corte, e
  // cada passo da seta trava logo depois do fim de uma aba (nunca no meio).
  const FOLGA = 16;

  // Quanto dá para andar. Se tudo cabe, é zero — e as setas se apagam.
  // O +FOLGA garante que a última aba também apareça com respiro à direita.
  const medir = useCallback(() => {
    const s = sulcoRef.current;
    const tr = trilhoRef.current;
    if (!s || !tr) return;

    const m = Math.max(0, tr.scrollWidth - s.clientWidth + FOLGA);
    setMax(m);
    setX((v) => Math.min(v, m));   // a janela cresceu: não deixa sobrar vão
  }, []);

  useEffect(() => {
    medir();
    const ob = new ResizeObserver(medir);
    if (sulcoRef.current) ob.observe(sulcoRef.current);
    return () => ob.disconnect();
  }, [medir, abas]);

  // ── Para a direita ──
  //
  // Queremos a PRÓXIMA pill que hoje está cortada (ou de fora) inteiramente à
  // vista, com a folga de respiro depois dela.
  function proxima() {
    const tr = trilhoRef.current;
    const s = sulcoRef.current;
    if (!tr || !s) return;

    const larguraSulco = s.clientWidth;
    const bordaVisivel = x + larguraSulco - FOLGA;

    for (const p of tr.children) {
      const dir = p.offsetLeft + p.offsetWidth;

      // A primeira que ainda não cabe por inteiro (contando a folga)
      if (dir > bordaVisivel + 1) {
        setX(Math.min(max, Math.max(0, dir - larguraSulco + FOLGA)));
        return;
      }
    }

    setX(max);
  }

  // ── Para a esquerda ──
  // Simétrico: a última pill cortada à esquerda encosta na borda, com folga.
  function anterior() {
    const tr = trilhoRef.current;
    if (!tr) return;

    const ps = [...tr.children];
    for (let i = ps.length - 1; i >= 0; i--) {
      if (ps[i].offsetLeft < x - 1) {
        setX(Math.max(0, ps[i].offsetLeft - FOLGA));
        return;
      }
    }

    setX(0);
  }

  // ── Trazer a aba ativa para dentro ──
  //
  // Trocar de aba por outro caminho (um botão vindo de outra tela) não deve
  // deixar a pill escondida.
  //
  // CUIDADO: `x` NÃO entra nas dependências. Se entrasse, este efeito rodaria a
  // cada passo da seta e puxaria o trilho de volta — que era exatamente o
  // travamento. Ele só corre quando a ABA muda, não quando o trilho anda.
  useEffect(() => {
    const tr = trilhoRef.current;
    const s = sulcoRef.current;
    if (!tr || !s) return;

    const i = abas.findIndex((a) => a.id === ativa);
    const p = tr.children[i];
    if (!p) return;

    const esq = p.offsetLeft;
    const dir = esq + p.offsetWidth;
    const larguraSulco = s.clientWidth;

    setX((atual) => {
      if (esq < atual) return Math.max(0, esq - FOLGA);
      if (dir > atual + larguraSulco) {
        return Math.max(0, Math.min(max, dir - larguraSulco + FOLGA));
      }
      return atual;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, abas, max]);

  const temEsq = x > 1;
  const temDir = x < max - 1;

  return (
    <div className="cr-pills">

      {/* As setas ocupam lugar mesmo quando não servem: aparecendo e sumindo,
          elas fariam o sulco mudar de largura a cada passo — e o trilho
          pularia sozinho debaixo do dedo. */}
      <button
        className={'cr-seta' + (temEsq ? '' : ' cr-seta--off')}
        onClick={anterior}
        disabled={!temEsq}
        aria-label={t('trilho_abas_anteriores')}
      >
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
             stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4l-5 6 5 6" />
        </svg>
      </button>

      <div className="cr-sulco" ref={sulcoRef}>
        <div
          className="cr-trilho"
          ref={trilhoRef}
          style={{ transform: `translateX(${-x}px)` }}
        >
          {abas.map((a) => {
            const trancada = bloqueadas.includes(a.id);
            return (
              <button
                key={a.id}
                className={'cr-pill' + (ativa === a.id ? ' cr-pill--on' : '') + (trancada ? ' cr-pill--trancada' : '')}
                onClick={() => onTrocar(a.id)}
              >
                {a.rotulo}
                {trancada && (
                  <svg className="cr-pill-cad" viewBox="0 0 24 24" width="13" height="13" fill="none"
                       stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        className={'cr-seta' + (temDir ? '' : ' cr-seta--off')}
        onClick={proxima}
        disabled={!temDir}
        aria-label={t('trilho_mais_abas')}
      >
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
             stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 4l5 6-5 6" />
        </svg>
      </button>
    </div>
  );
}
