'use client';

// ═══════════════════════════════════════════════════════════
//  JanelaAjustes — o Camera Raw da Pós
//
//  Seis abas: Luz, Cor, Efeitos, Curva, Misturador, Detalhe. À esquerda a
//  imagem, à direita os controles.
//
//  ── Por que o preview é reduzido ──
//  Os efeitos espaciais (claridade, nitidez, ruído) leem a vizinhança de CADA
//  pixel. Numa imagem de 4K isso são 8 milhões de leituras por efeito — e o
//  slider engasgaria. O preview roda numa cópia de no máximo 1400px; ao dar OK,
//  aí sim a conta corre no tamanho real, uma vez só.
//
//  ── Por que há debounce ──
//  Arrastar um slider dispara dezenas de eventos por segundo. Sem espera, cada
//  um enfileiraria um reprocessamento inteiro, e a barra ficaria para trás do
//  dedo. 40ms bastam para a mão parar entre um passo e outro.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  paramsPadrao, temAjuste, aplicarPixels, aplicarEmCanvas,
  ABAS_AJUSTE, CORES_MIXER, CANAIS_CURVA
} from '../lib/ajustes';

const LADO_PREVIA = 1400;

export default function JanelaAjustes({ camada, aoAplicar, aoFechar }) {
  const [p, setP]     = useState(() => camada.ajustes || paramsPadrao());
  const [aba, setAba] = useState('luz');
  const [canal, setCanal] = useState('rgb');
  const [cor, setCor]     = useState('vermelho');
  const [processando, setProc] = useState(false);

  const telaRef  = useRef(null);
  const baseRef  = useRef(null);   // a cópia reduzida, já pronta
  const timerRef = useRef(null);

  // ── A base do preview ──
  // Reduzida uma vez, no início. Reduzir a cada slider seria refazer trabalho
  // que não muda.
  useEffect(() => {
    const src = camada.canvas;
    const r = Math.min(1, LADO_PREVIA / Math.max(src.width, src.height));

    const c = document.createElement('canvas');
    c.width  = Math.max(1, Math.round(src.width  * r));
    c.height = Math.max(1, Math.round(src.height * r));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);

    baseRef.current = c;
    desenhar(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camada]);

  // ── Desenhar ──
  const desenhar = useCallback((params) => {
    const base = baseRef.current;
    const tela = telaRef.current;
    if (!base || !tela) return;

    tela.width  = base.width;
    tela.height = base.height;

    const cx = tela.getContext('2d');
    cx.drawImage(base, 0, 0);

    if (!temAjuste(params)) return;

    const img = cx.getImageData(0, 0, tela.width, tela.height);
    aplicarPixels(img.data, tela.width, tela.height, params);
    cx.putImageData(img, 0, 0);
  }, []);

  // ── Mexer num slider ──
  function mexer(grupo, chave, valor) {
    const novo = { ...p, [grupo]: { ...p[grupo], [chave]: valor } };
    setP(novo);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => desenhar(novo), 40);
  }

  function mexerMixer(corK, campo, valor) {
    const novo = {
      ...p,
      mixer: { ...p.mixer, [corK]: { ...p.mixer[corK], [campo]: valor } }
    };
    setP(novo);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => desenhar(novo), 40);
  }

  function trocarCurva(pontos) {
    const novo = { ...p, curva: { ...p.curva, [canal]: pontos } };
    setP(novo);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => desenhar(novo), 40);
  }

  function resetar() {
    const z = paramsPadrao();
    setP(z);
    desenhar(z);
  }

  // Zerar só a aba aberta. Quem passou meia hora na curva não quer perder tudo
  // porque errou um slider da Luz.
  function resetarAba() {
    const z = paramsPadrao();

    if (aba === 'mixer') {
      const novo = { ...p, mixer: z.mixer };
      setP(novo); desenhar(novo); return;
    }
    if (aba === 'curva') {
      const novo = { ...p, curva: z.curva };
      setP(novo); desenhar(novo); return;
    }

    const g = ABAS_AJUSTE.find((a) => a.id === aba)?.grupo;
    if (!g) return;

    const novo = { ...p, [g]: z[g] };
    setP(novo);
    desenhar(novo);
  }

  // ── OK ──
  // Só aqui a conta corre no tamanho real. E corre uma vez.
  async function aplicar() {
    if (!temAjuste(p)) { aoFechar(); return; }

    setProc(true);

    // Deixa o navegador pintar o "processando" antes de travar na conta
    await new Promise((r) => setTimeout(r, 20));

    const c = aplicarEmCanvas(camada.canvas, p);
    aoAplicar(c, p);
    setProc(false);
  }

  const abaAtual = ABAS_AJUSTE.find((a) => a.id === aba);

  return (
    <div className="aj-fundo" onClick={aoFechar}>
      <div className="aj-win" onClick={(e) => e.stopPropagation()}>

        <header className="aj-topo">
          <span className="aj-titulo">Ajustes</span>
          <span className="aj-esticar" />
          <button className="ps-b" onClick={resetar}>Resetar tudo</button>
          <button className="ps-b" onClick={aoFechar}>Cancelar</button>
          <button className="ps-b ps-b--on" onClick={aplicar} disabled={processando}>
            {processando ? 'Aplicando...' : 'OK'}
          </button>
        </header>

        <div className="aj-corpo">

          <div className="aj-previa">
            <canvas ref={telaRef} />
          </div>

          <aside className="aj-lado">

            <nav className="aj-abas">
              {[...ABAS_AJUSTE.slice(0, 3),
                { id: 'curva', nome: 'Curva' },
                { id: 'mixer', nome: 'Misturador' },
                ABAS_AJUSTE[3]
              ].map((a) => (
                <button
                  key={a.id}
                  className={'aj-aba' + (aba === a.id ? ' aj-aba--on' : '')}
                  onClick={() => setAba(a.id)}
                >{a.nome}</button>
              ))}
            </nav>

            <div className="aj-painel">

              <div className="aj-cab">
                <span className="aj-cab-t">
                  {aba === 'curva' ? 'Curva'
                    : aba === 'mixer' ? 'Misturador'
                    : abaAtual?.nome}
                </span>
                <button className="aj-reset" onClick={resetarAba}>Resetar</button>
              </div>

              {/* ── Os sliders ── */}
              {abaAtual && aba !== 'curva' && aba !== 'mixer' &&
                abaAtual.sliders.map((s) => {
                  // Os filhos (ponto médio, tamanho do grão) só fazem sentido
                  // com o pai ligado — sem ele não há vinheta nem grão a ajustar.
                  const pai = s.filho ? p[abaAtual.grupo][s.filho] : null;
                  const morto = s.filho && !pai;

                  return (
                    <div
                      key={s.k}
                      className={'aj-sl' + (s.filho ? ' aj-sl--filho' : '') + (morto ? ' aj-sl--off' : '')}
                    >
                      <div className="aj-sl-topo">
                        <span>{s.nome}</span>
                        <button
                          className="aj-sl-v"
                          onClick={() => mexer(abaAtual.grupo, s.k, paramsPadrao()[abaAtual.grupo][s.k])}
                          title="Voltar ao padrão"
                        >{p[abaAtual.grupo][s.k]}</button>
                      </div>
                      <input
                        type="range"
                        min={s.min} max={s.max}
                        value={p[abaAtual.grupo][s.k]}
                        disabled={morto}
                        onChange={(e) => mexer(abaAtual.grupo, s.k, +e.target.value)}
                        aria-label={s.nome}
                      />
                    </div>
                  );
                })}

              {/* ── A curva ── */}
              {aba === 'curva' && (
                <>
                  <div className="aj-canais">
                    {CANAIS_CURVA.map((c) => (
                      <button
                        key={c.k}
                        className={'aj-canal' + (canal === c.k ? ' aj-canal--on' : '')}
                        onClick={() => setCanal(c.k)}
                        style={canal === c.k ? { borderColor: c.cor, color: c.cor } : null}
                      >{c.nome}</button>
                    ))}
                  </div>

                  <Curva
                    pontos={p.curva[canal]}
                    cor={CANAIS_CURVA.find((c) => c.k === canal).cor}
                    onMudar={trocarCurva}
                  />

                  <p className="aj-dica">
                    Clique adiciona · arraste ajusta · clique-duplo remove
                  </p>
                </>
              )}

              {/* ── O misturador ── */}
              {aba === 'mixer' && (
                <>
                  <div className="aj-cores">
                    {CORES_MIXER.map((c) => (
                      <button
                        key={c.k}
                        className={'aj-cor' + (cor === c.k ? ' aj-cor--on' : '')}
                        style={{ background: c.hex }}
                        onClick={() => setCor(c.k)}
                        aria-label={c.nome}
                        title={c.nome}
                      />
                    ))}
                  </div>

                  {[['h', 'Matiz'], ['s', 'Saturação'], ['l', 'Luminância']].map(([k, nome]) => (
                    <div key={k} className="aj-sl">
                      <div className="aj-sl-topo">
                        <span>{nome}</span>
                        <button
                          className="aj-sl-v"
                          onClick={() => mexerMixer(cor, k, 0)}
                          title="Voltar a zero"
                        >{p.mixer[cor][k]}</button>
                      </div>
                      <input
                        type="range" min="-100" max="100"
                        value={p.mixer[cor][k]}
                        onChange={(e) => mexerMixer(cor, k, +e.target.value)}
                        aria-label={nome}
                      />
                    </div>
                  ))}
                </>
              )}

            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  A curva
//
//  Os dois pontos das pontas não se removem: sem eles a curva não teria começo
//  nem fim, e a LUT ficaria indefinida nos extremos.
// ═══════════════════════════════════════════════════════════
const L = 260;   // o lado do quadrado

function Curva({ pontos, cor, onMudar }) {
  const ref = useRef(null);
  const arrastando = useRef(null);

  // Da tela para o valor: o Y é invertido porque em SVG ele cresce para baixo,
  // e numa curva tonal ele cresce para cima.
  const paraValor = (e) => {
    const r = ref.current.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(255, ((e.clientX - r.left) / r.width) * 255))),
      y: Math.round(Math.max(0, Math.min(255, 255 - ((e.clientY - r.top) / r.height) * 255)))
    };
  };

  function clicar(e) {
    if (arrastando.current != null) return;

    const v = paraValor(e);

    // Perto de um ponto que já existe? Então é um arraste, não um ponto novo.
    const i = pontos.findIndex(
      (p) => Math.abs(p.x - v.x) < 10 && Math.abs(p.y - v.y) < 10
    );
    if (i >= 0) return;

    onMudar([...pontos, v].sort((a, b) => a.x - b.x));
  }

  function pegar(e, i) {
    e.stopPropagation();
    arrastando.current = i;
  }

  useEffect(() => {
    const mover = (e) => {
      const i = arrastando.current;
      if (i == null || !ref.current) return;

      const v = paraValor(e);
      const novo = [...pontos];

      // As pontas só sobem e descem: mover o x delas deixaria a curva sem
      // definição fora do intervalo.
      const ehPonta = (i === 0 || i === novo.length - 1);
      novo[i] = ehPonta ? { x: novo[i].x, y: v.y } : v;

      onMudar(novo.sort((a, b) => a.x - b.x));
    };

    const soltar = () => { arrastando.current = null; };

    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
    return () => {
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
    };
  }, [pontos, onMudar]);

  function remover(e, i) {
    e.stopPropagation();
    if (i === 0 || i === pontos.length - 1) return;   // as pontas ficam
    onMudar(pontos.filter((_, j) => j !== i));
  }

  const px = (v) => (v / 255) * L;
  const py = (v) => L - (v / 255) * L;

  const linha = [...pontos]
    .sort((a, b) => a.x - b.x)
    .map((p, i) => `${i ? 'L' : 'M'} ${px(p.x)} ${py(p.y)}`)
    .join(' ');

  return (
    <svg
      ref={ref}
      className="aj-curva"
      viewBox={`0 0 ${L} ${L}`}
      onClick={clicar}
    >
      {/* A grade em terços: é onde as sombras, os meios e as luzes se separam */}
      {[1, 2].map((i) => (
        <g key={i}>
          <line x1={L / 3 * i} y1="0" x2={L / 3 * i} y2={L} className="aj-curva-grade" />
          <line x1="0" y1={L / 3 * i} x2={L} y2={L / 3 * i} className="aj-curva-grade" />
        </g>
      ))}

      {/* A diagonal: onde a curva estaria se não fizesse nada */}
      <line x1="0" y1={L} x2={L} y2="0" className="aj-curva-neutra" />

      <path d={linha} fill="none" stroke={cor} strokeWidth="2" />

      {pontos.map((p, i) => (
        <circle
          key={i}
          cx={px(p.x)} cy={py(p.y)} r="5"
          fill={cor}
          className="aj-curva-no"
          onMouseDown={(e) => pegar(e, i)}
          onDoubleClick={(e) => remover(e, i)}
        />
      ))}
    </svg>
  );
}
