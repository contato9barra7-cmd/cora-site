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

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import {
  paramsPadrao, temAjuste, aplicarPixels, aplicarEmCanvas,
  ABAS_AJUSTE, CORES_MIXER, CANAIS_CURVA, curvaLUT, equilibrioDeBranco
} from '../lib/ajustes';
import {
  novaMascara, pincelar, comporAlpha, aplicarMascaras, overlayVermelho,
  pincelarAuto, BRUSH_PADRAO
} from '../lib/mascaras';

const LADO_PREVIA = 1400;

// ── A trava magnética do meio ──
//
// Em sliders que vão de -N a +N, o zero é o "sem efeito", e é onde a mão mais
// quer parar. Sem uma trava, acertar exatamente 0 no arraste é sorte. Perto do
// centro, o valor gruda no zero — como no Lightroom.
//
// Só vale para sliders simétricos (min negativo): num de 0 a 100 não há meio
// que mereça ímã.
function comTrava(valor, min, max) {
  if (min >= 0) return valor;                 // sem centro-zero, sem trava
  const alcance = max - min;
  const zona = Math.max(1, Math.round(alcance * 0.04));   // ~4% de cada lado
  return Math.abs(valor) <= zona ? 0 : valor;
}

export default function JanelaAjustes({ camada, inicial, aoAplicar, aoFechar }) {
  // Reabrindo um filtro de Ajustes, os controles nascem com os valores DELE.
  // O `camada.ajustes` é o caminho antigo, das camadas rasterizadas — ali o
  // ajuste é único e vive na própria camada.
  const [p, setP]     = useState(() => inicial || camada.ajustes || paramsPadrao());
  const [aba, setAba] = useState('luz');
  const [canal, setCanal] = useState('rgb');
  const [cor, setCor]     = useState('vermelho');
  const [processando, setProc] = useState(false);
  const [pegandoWB, setPegandoWB] = useState(false);   // conta-gotas ativo

  // ── Máscaras ──
  // `mascaras` é a lista; `mascaraAtiva` é o índice em edição (null = global,
  // ajusta a imagem toda). `ferramenta` é pincel/linear/radial; `modoComp` diz
  // se a próxima pincelada soma ou subtrai; `brush` guarda tamanho/fluxo/etc.
  const [mascaras, setMascaras] = useState([]);
  const [mascaraAtiva, setMascaraAtiva] = useState(null);
  const [ferramenta, setFerramenta] = useState(null);
  const [modoComp, setModoComp] = useState('add');
  const [brush, setBrush] = useState(BRUSH_PADRAO);
  const [slotAberto, setSlotAberto] = useState(false);  // pode criar novo degradê
  const pintandoRef = useRef(false);
  const compRef = useRef(null);   // componente sendo pintado agora
  const mascarasRef = useRef([]); // espelho de `mascaras` para a pintura ao vivo
  const [cursorPincel, setCursorPincel] = useState(null);   // {x,y,d} em px de tela
  const pixelsBaseRef = useRef(null);  // pixels da base, para o automask
  const refAutoRef = useRef(null);     // cor de referência do automask
  const undoRef = useRef([]);          // pilha de snapshots das máscaras
  const [zoom, setZoom] = useState(1); // zoom da prévia (scroll com pincel)
  const rafRef = useRef(0);            // frame agendado, para não redesenhar demais
  const arrasteHandle = useRef(null);  // {tipo, compIdx, ...} do pino sendo arrastado
  const [, forcarRender] = useState(0);

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
    desenhar(p, [], null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camada]);

  // O ref acompanha o estado para a pintura ao vivo ler a versão mais recente
  // sem esperar o React re-renderizar.
  useEffect(() => { mascarasRef.current = mascaras; }, [mascaras]);

  // Ctrl+Z desfaz a última pincelada/degradê enquanto se edita máscara.
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (mascaraAtiva != null) {
          e.preventDefault();
          desfazer();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mascaraAtiva, p, mascaras]);

  // ── Desenhar ──
  //
  // Aplica os ajustes GLOBAIS e, por cima, os de cada máscara (só onde o alpha
  // dela incide). Se uma máscara está sendo editada, pinta um overlay vermelho
  // mostrando a região dela.
  const desenhar = useCallback((params, masks, ativa, verOverlay, forcarOverlay, leve) => {
    const base = baseRef.current;
    const tela = telaRef.current;
    if (!base || !tela) return;

    const w = base.width, h = base.height;
    tela.width = w; tela.height = h;

    const cx = tela.getContext('2d');
    cx.drawImage(base, 0, 0);

    const lista = masks || [];
    const mAtiva = ativa != null ? lista[ativa] : null;

    // Modo leve (usado durante a pincelada): mostra só a imagem + o overlay
    // vermelho da máscara ativa. Reaplicar todos os ajustes a cada frame é o que
    // travava; isso fica para quando a pessoa solta o mouse.
    if (leve) {
      if (mAtiva && mAtiva.componentes.length) {
        const ov = overlayVermelho(mAtiva, w, h);
        cx.drawImage(ov, 0, 0);
      }
      return;
    }

    const temGlobal = temAjuste(params);
    const temMasc = lista.some((m) => m.visivel !== false && temAjuste(m.params));

    if (temGlobal || temMasc) {
      const img = cx.getImageData(0, 0, w, h);
      if (temGlobal) aplicarPixels(img.data, w, h, params);
      if (temMasc) aplicarMascaras(img.data, w, h, lista);
      cx.putImageData(img, 0, 0);
    }

    // O overlay vermelho: aparece só enquanto a máscara está sendo DESENHADA e
    // ainda não recebeu ajuste. Assim que um slider mexe, o vermelho some e dá
    // lugar ao efeito real. Máscara oculta não mostra overlay.
    const mostrarOverlay = mAtiva
      && mAtiva.visivel !== false
      && mAtiva.componentes.length
      && (forcarOverlay || (verOverlay && !temAjuste(mAtiva.params)));

    if (mostrarOverlay) {
      const ov = overlayVermelho(mAtiva, w, h);
      cx.drawImage(ov, 0, 0);
    }
  }, []);

  // Redesenha com o estado atual (atalho, para não repetir os 4 args).
  const redesenhar = useCallback((np, nm, na) => {
    desenhar(
      np !== undefined ? np : p,
      nm !== undefined ? nm : mascaras,
      na !== undefined ? na : mascaraAtiva,
      (na !== undefined ? na : mascaraAtiva) != null
    );
  }, [desenhar, p, mascaras, mascaraAtiva]);

  // Grava uma mudança nos params CERTOS: os da máscara ativa, ou os globais.
  // Devolve { p, mascaras } já atualizados, para redesenhar.
  function comMudanca(muda) {
    if (mascaraAtiva != null && mascaras[mascaraAtiva]) {
      const nm = mascaras.map((m, i) =>
        i === mascaraAtiva ? { ...m, params: muda(m.params) } : m
      );
      setMascaras(nm);
      return { np: p, nm };
    }
    const np = muda(p);
    setP(np);
    return { np, nm: mascaras };
  }

  function agendarDesenho(np, nm) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => desenhar(np, nm, mascaraAtiva, mascaraAtiva != null),
      40
    );
  }

  // ── Mexer num slider ──
  function mexer(grupo, chave, valor) {
    const { np, nm } = comMudanca((pr) => ({ ...pr, [grupo]: { ...pr[grupo], [chave]: valor } }));
    agendarDesenho(np, nm);
  }

  function mexerMixer(corK, campo, valor) {
    const { np, nm } = comMudanca((pr) => ({
      ...pr,
      mixer: { ...pr.mixer, [corK]: { ...pr.mixer[corK], [campo]: valor } }
    }));
    agendarDesenho(np, nm);
  }

  function trocarCurva(pontos) {
    const { np, nm } = comMudanca((pr) => ({ ...pr, curva: { ...pr.curva, [canal]: pontos } }));
    agendarDesenho(np, nm);
  }

  // ── O conta-gotas do equilíbrio de branco ──
  //
  // Com ele ativo, clicar na prévia lê a cor ORIGINAL daquele ponto (da base
  // reduzida, sem os ajustes atuais) e calcula a temperatura/tint que a tornam
  // neutra. Depois desliga sozinho.
  function clicarWB(e) {
    if (!pegandoWB) return;
    const base = baseRef.current;
    if (!base) return;

    const pt = pontoNaBase(e);
    const bx = Math.max(0, Math.min(base.width  - 1, Math.round(pt.x)));
    const by = Math.max(0, Math.min(base.height - 1, Math.round(pt.y)));
    const px = base.getContext('2d').getImageData(bx, by, 1, 1).data;

    const { temp, tint } = equilibrioDeBranco(px[0], px[1], px[2]);
    const novo = { ...p, cor: { ...p.cor, temp, tint } };
    setP(novo);
    desenhar(novo, mascaras, mascaraAtiva, mascaraAtiva != null);
    setPegandoWB(false);
  }

  function resetar() {
    const z = paramsPadrao();
    setP(z);
    setMascaras([]);
    setMascaraAtiva(null);
    setFerramenta(null);
    desenhar(z, [], null, false);
  }

  // Zerar só a aba aberta — nos params ATIVOS (máscara ou global).
  function resetarAba() {
    const z = paramsPadrao();
    const muda = (pr) => {
      if (aba === 'mixer') return { ...pr, mixer: z.mixer };
      if (aba === 'curva') return { ...pr, curva: z.curva };
      const g = ABAS_AJUSTE.find((a) => a.id === aba)?.grupo;
      return g ? { ...pr, [g]: z[g] } : pr;
    };
    const { np, nm } = comMudanca(muda);
    desenhar(np, nm, mascaraAtiva, mascaraAtiva != null);
  }

  // ── OK ──
  // Só aqui a conta corre no tamanho real. E corre uma vez. Aplica globais e,
  // por cima, as máscaras (em escala cheia).
  async function aplicar() {
    const temMasc = mascaras.some((m) => m.visivel !== false && temAjuste(m.params));
    if (!temAjuste(p) && !temMasc) { aoFechar(); return; }

    setProc(true);
    await new Promise((r) => setTimeout(r, 20));

    // Em tamanho real: aplica global no canvas, depois as máscaras nos pixels.
    const c = aplicarEmCanvas(camada.canvas, p);
    if (temMasc) {
      const cx = c.getContext('2d');
      const img = cx.getImageData(0, 0, c.width, c.height);
      // As máscaras têm alpha do tamanho do preview; aplicarMascaras reescala.
      aplicarMascaras(img.data, c.width, c.height, mascaras);
      cx.putImageData(img, 0, 0);
    }
    aoAplicar(c, { ...p, _mascaras: mascaras });
    setProc(false);
  }

  // ═══════════ Ações de máscara ═══════════
  // ── Desfazer (Ctrl+Z) ──
  // Antes de cada pincelada/degradê, guardamos uma cópia das máscaras. O
  // Ctrl+Z restaura a última. Clona os bitmaps para o desfazer ser de verdade.
  function snapshotMascaras() {
    try {
      const snap = mascaras.map((m) => ({
        ...m,
        params: JSON.parse(JSON.stringify(m.params)),
        componentes: (m.componentes || []).map((c) => {
          if (c.tipo === 'pincel' && c.bitmap) {
            const bm = document.createElement('canvas');
            bm.width = c.bitmap.width; bm.height = c.bitmap.height;
            bm.getContext('2d').drawImage(c.bitmap, 0, 0);
            return { ...c, bitmap: bm };
          }
          return { ...c };
        })
      }));
      undoRef.current.push({ mascaras: snap, ativa: mascaraAtiva });
      if (undoRef.current.length > 30) undoRef.current.shift();
    } catch (e) { /* ignora falha de snapshot */ }
  }

  function desfazer() {
    if (!undoRef.current.length) return;
    const s = undoRef.current.pop();
    setMascaras(s.mascaras);
    setMascaraAtiva(s.ativa);
    desenhar(p, s.mascaras, s.ativa, s.ativa != null);
  }

  function criarMascara() {
    const base = baseRef.current;
    const nm = [...mascaras, novaMascara(base.width, base.height, mascaras.length + 1)];
    const idx = nm.length - 1;
    setMascaras(nm);
    setMascaraAtiva(idx);
    setFerramenta('pincel');
    setModoComp('add');
    setSlotAberto(true);
    setAba('luz');
    redesenhar(undefined, nm, idx);
  }
  function selMascara(idx) {
    setMascaraAtiva(idx);
    setFerramenta(null);
    redesenhar(undefined, mascaras, idx);
  }
  function sairMascara() {
    setMascaraAtiva(null);
    setFerramenta(null);
    desenhar(p, mascaras, null, false);
  }
  function delMascara(idx, e) {
    if (e) e.stopPropagation();
    const nm = mascaras.filter((_, i) => i !== idx);
    let na = mascaraAtiva;
    if (mascaraAtiva === idx) na = null;
    else if (mascaraAtiva != null && mascaraAtiva > idx) na = mascaraAtiva - 1;
    setMascaras(nm);
    setMascaraAtiva(na);
    desenhar(p, nm, na, na != null);
  }
  function toggleVis(idx, e) {
    if (e) e.stopPropagation();
    const nm = mascaras.map((m, i) => i === idx ? { ...m, visivel: m.visivel === false } : m);
    setMascaras(nm);
    redesenhar(undefined, nm);
  }
  function escolherFerramenta(f) {
    setFerramenta(f);
    setSlotAberto(true);   // trocar de ferramenta libera criar um novo componente
  }

  // ── Pintar a máscara com o pincel ──
  //
  // Cada arrasto do mouse cria (ou continua) um componente 'pincel' na máscara
  // ativa, escrevendo círculos macios no bitmap dele. O preview atualiza ao
  // vivo, com o overlay vermelho mostrando onde a máscara incide.
  // Onde a imagem REALMENTE está desenhada dentro do elemento canvas. Como o
  // canvas usa object-fit:contain, ele pode ser menor que a caixa e ficar
  // centralizado — sem isso, o clique cai deslocado do pincel.
  function retanguloDaImagem() {
    const base = baseRef.current;
    const tela = telaRef.current;
    const r = tela.getBoundingClientRect();

    const escala = Math.min(r.width / base.width, r.height / base.height);
    const w = base.width * escala;
    const h = base.height * escala;
    return {
      left: r.left + (r.width - w) / 2,
      top: r.top + (r.height - h) / 2,
      w, h, escala
    };
  }

  function pontoNaBase(e) {
    const base = baseRef.current;
    const ri = retanguloDaImagem();
    return {
      x: (e.clientX - ri.left) / ri.w * base.width,
      y: (e.clientY - ri.top)  / ri.h * base.height
    };
  }

  // Scroll dá/tira zoom quando se está editando máscara (para pintar detalhes).
  function aoRolar(e) {
    if (mascaraAtiva == null) return;   // sem máscara, rola normal
    e.preventDefault();
    setZoom((z) => {
      const nz = e.deltaY < 0 ? z * 1.12 : z / 1.12;
      return Math.max(1, Math.min(6, nz));
    });
  }

  function comecarPincel(e) {
    if (pegandoWB) return;   // o conta-gotas tem prioridade
    if (mascaraAtiva == null || !ferramenta) return;

    snapshotMascaras();   // para o Ctrl+Z
    const base = baseRef.current;

    // ── Degradês: linear e radial ──
    if (ferramenta === 'linear' || ferramenta === 'radial') {
      const pt = pontoNaBase(e);

      // Se já existe um degradê nesta máscara e o clique caiu num pino, arrasta
      // esse pino em vez de criar outro degradê (senão vira um monte de bolas).
      const hit = acharHandle(pt);
      if (hit) {
        comecarHandle(hit.tipo, hit.compIdx, e);
        return;
      }
      // Se já há um degradê e o slot está fechado, não cria outro: só o botão
      // Adicionar/Subtrair abre espaço para um novo.
      const jaTem = mascaras[mascaraAtiva].componentes.some(
        (c) => c.tipo === 'linear' || c.tipo === 'radial'
      );
      if (jaTem && !slotAberto) return;

      const comp = ferramenta === 'linear'
        ? { tipo: 'linear', modo: modoComp, ax: pt.x, ay: pt.y, bx: pt.x, by: pt.y }
        : { tipo: 'radial', modo: modoComp, cx: pt.x, cy: pt.y, rx: 1, ry: 1, ang: 0, feather: 0.5 };
      const idxNovo = mascaras[mascaraAtiva].componentes.length;
      compRef.current = comp;
      setSlotAberto(false);   // desenhou: fecha o slot
      setMascaras((ms) => ms.map((m, i) =>
        i === mascaraAtiva ? { ...m, componentes: [...m.componentes, comp] } : m
      ));
      mascarasRef.current = mascarasRef.current.map((m, i) =>
        i === mascaraAtiva ? { ...m, componentes: [...m.componentes, comp] } : m
      );

      // O arraste corre pela janela: assim o SVG dos pinos (que fica por cima)
      // não "rouba" o movimento logo após criar o degradê.
      arrasteHandle.current = ferramenta === 'linear'
        ? { tipo: 'B', compIdx: idxNovo }
        : { tipo: 'rx_ry_novo', compIdx: idxNovo, cx: pt.x, cy: pt.y };
      window.addEventListener('mousemove', moverHandle);
      window.addEventListener('mouseup', soltarHandle);
      return;
    }

    if (ferramenta !== 'pincel') return;

    const comp = { tipo: 'pincel', modo: modoComp, bitmap: null };
    compRef.current = comp;

    setMascaras((ms) => ms.map((m, i) =>
      i === mascaraAtiva ? { ...m, componentes: [...m.componentes, comp] } : m
    ));

    // No modo automático, guarda os pixels da base e a cor do ponto inicial —
    // toda a pincelada vai se confinar a cores parecidas com ELA.
    if (brush.automatica) {
      pixelsBaseRef.current = base.getContext('2d').getImageData(0, 0, base.width, base.height).data;
      const { x, y } = pontoNaBase(e);
      const bx = Math.max(0, Math.min(base.width - 1, Math.round(x)));
      const by = Math.max(0, Math.min(base.height - 1, Math.round(y)));
      const ii = (by * base.width + bx) * 4;
      const d = pixelsBaseRef.current;
      refAutoRef.current = [d[ii], d[ii + 1], d[ii + 2]];
    }

    pintandoRef.current = true;
    pintarEm(e);
  }

  function pintarEm(e) {
    // Acompanha o cursor com o círculo do pincel (mesmo sem estar pintando).
    if (mascaraAtiva != null && ferramenta === 'pincel') {
      const prev = telaRef.current?.parentElement;
      if (prev) {
        const ri = retanguloDaImagem();
        const pr = prev.getBoundingClientRect();
        setCursorPincel({
          x: e.clientX - pr.left,
          y: e.clientY - pr.top,
          d: brush.tamanho * ri.escala
        });
      }
    }

    if (!pintandoRef.current || !compRef.current) return;
    const base = baseRef.current;
    const { x, y } = pontoNaBase(e);

    const comp = compRef.current;
    if (comp.tipo === 'linear') {
      comp.bx = x; comp.by = y;
      desenharAoVivo();
      return;
    }
    if (comp.tipo === 'radial') {
      comp.rx = Math.max(1, Math.abs(x - comp.cx));
      comp.ry = Math.max(1, Math.abs(y - comp.cy));
      desenharAoVivo();
      return;
    }

    if (brush.automatica && pixelsBaseRef.current && refAutoRef.current) {
      pincelarAuto(comp, pixelsBaseRef.current, base.width, base.height, x, y,
        refAutoRef.current, brush.tamanho, brush.difusao, brush.fluxo, brush.densidade);
    } else {
      pincelar(comp, x, y, brush.tamanho, brush.difusao, brush.fluxo, base.width, base.height);
    }
    desenharAoVivo();
  }

  // Redesenho durante a pintura, limitado a um por frame — sem isso, mover o
  // mouse rápido dispara dezenas de recomposições por segundo e trava.
  function desenharAoVivo() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      desenhar(p, mascarasRef.current, mascaraAtiva, true, true, true);
    });
  }

  function soltarPincel() {
    if (!pintandoRef.current) return;
    pintandoRef.current = false;
    compRef.current = null;
    pixelsBaseRef.current = null;
    refAutoRef.current = null;
    // Força um re-render para o React "enxergar" o componente recém-pintado
    // (ele foi mutado por referência) e o preview reflita o estado final.
    setMascaras((ms) => ms.slice());
    redesenhar();
  }

  // ── Arraste dos pinos dos degradês (linear e radial) ──
  // Qual pino está sob o ponto clicado (em coords da base). Tolerância ~18px
  // de tela convertida para base.
  function acharHandle(pt) {
    const m = mascaras[mascaraAtiva];
    if (!m) return null;
    const ri = retanguloDaImagem();
    const base = baseRef.current;
    const tol = 18 / (ri.w / base.width || 1);
    const dist = (ax, ay) => Math.hypot(pt.x - ax, pt.y - ay);

    for (let i = m.componentes.length - 1; i >= 0; i--) {
      const c = m.componentes[i];
      if (c.tipo === 'linear') {
        if (dist(c.ax, c.ay) < tol) return { tipo: 'A', compIdx: i };
        if (dist(c.bx, c.by) < tol) return { tipo: 'B', compIdx: i };
        if (dist((c.ax + c.bx) / 2, (c.ay + c.by) / 2) < tol) return { tipo: 'mover', compIdx: i };
      } else if (c.tipo === 'radial') {
        const fin = 1 - (c.feather != null ? c.feather : 0.5);
        if (dist(c.cx + c.rx * 0.707, c.cy - c.ry * 0.707) < tol) return { tipo: 'escala', compIdx: i };
        if (dist(c.cx + c.rx, c.cy) < tol) return { tipo: 'rx', compIdx: i };
        if (dist(c.cx, c.cy + c.ry) < tol) return { tipo: 'ry', compIdx: i };
        if (dist(c.cx, c.cy - c.ry * fin) < tol) return { tipo: 'feather', compIdx: i };
        if (dist(c.cx, c.cy) < tol) return { tipo: 'mover', compIdx: i };
      }
    }
    return null;
  }

  function comecarHandle(tipo, compIdx, e) {
    e.stopPropagation();
    snapshotMascaras();
    const pt = pontoNaBase(e);
    const comp = mascarasRef.current[mascaraAtiva].componentes[compIdx];
    arrasteHandle.current = { tipo, compIdx, ox: pt.x, oy: pt.y, r0x: comp.rx, r0y: comp.ry };
    window.addEventListener('mousemove', moverHandle);
    window.addEventListener('mouseup', soltarHandle);
  }

  function moverHandle(e) {
    const ah = arrasteHandle.current;
    if (!ah) return;
    const pt = pontoNaBase(e);
    const m = mascarasRef.current[mascaraAtiva];
    const comp = m && m.componentes[ah.compIdx];
    if (!comp) return;

    if (comp.tipo === 'linear') {
      if (ah.tipo === 'A') { comp.ax = pt.x; comp.ay = pt.y; }
      else if (ah.tipo === 'B') { comp.bx = pt.x; comp.by = pt.y; }
      else if (ah.tipo === 'mover') {
        const dx = pt.x - ah.ox, dy = pt.y - ah.oy;
        comp.ax += dx; comp.ay += dy; comp.bx += dx; comp.by += dy;
        ah.ox = pt.x; ah.oy = pt.y;
      }
    } else if (comp.tipo === 'radial') {
      if (ah.tipo === 'rx_ry_novo') {
        // Recém-criado: o arraste define os dois raios de uma vez.
        comp.rx = Math.max(1, Math.abs(pt.x - comp.cx));
        comp.ry = Math.max(1, Math.abs(pt.y - comp.cy));
      }
      else if (ah.tipo === 'mover') { comp.cx = pt.x; comp.cy = pt.y; }
      else if (ah.tipo === 'rx') comp.rx = Math.max(1, Math.abs(pt.x - comp.cx));
      else if (ah.tipo === 'ry') comp.ry = Math.max(1, Math.abs(pt.y - comp.cy));
      else if (ah.tipo === 'feather') {
        const d = Math.abs(pt.y - comp.cy);
        comp.feather = Math.max(0, Math.min(0.95, 1 - d / Math.max(1, comp.ry)));
      } else if (ah.tipo === 'escala') {
        const f = Math.max(0.2, (comp.cy - pt.y) / Math.max(1, ah.r0y * 0.707));
        comp.rx = Math.max(1, ah.r0x * f);
        comp.ry = Math.max(1, ah.r0y * f);
      }
    }

    forcarRender((n) => n + 1);   // reposiciona os pinos na tela
    desenharAoVivo();
  }

  function soltarHandle() {
    arrasteHandle.current = null;
    window.removeEventListener('mousemove', moverHandle);
    window.removeEventListener('mouseup', soltarHandle);
    setMascaras((ms) => ms.slice());
    redesenhar();
  }

  const abaAtual = ABAS_AJUSTE.find((a) => a.id === aba);

  // Os params que os sliders leem/escrevem: da máscara ativa, ou os globais.
  const pAtivo = (mascaraAtiva != null && mascaras[mascaraAtiva])
    ? mascaras[mascaraAtiva].params
    : p;

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

          <div
            className={'aj-previa'
              + (pegandoWB ? ' aj-previa--wb' : '')
              + (mascaraAtiva != null && ferramenta === 'pincel' ? ' aj-previa--pincel' : '')
              + (mascaraAtiva != null && (ferramenta === 'linear' || ferramenta === 'radial') ? ' aj-previa--wb' : '')}
            onWheel={aoRolar}
          >
            <canvas
              ref={telaRef}
              onClick={clicarWB}
              onMouseDown={comecarPincel}
              onMouseMove={pintarEm}
              onMouseUp={soltarPincel}
              onMouseLeave={() => { soltarPincel(); setCursorPincel(null); }}
              style={{ transform: `scale(${zoom})` }}
            />
            {cursorPincel && (
              <span
                className="aj-cursor-pincel"
                style={{
                  left: cursorPincel.x,
                  top: cursorPincel.y,
                  width: cursorPincel.d,
                  height: cursorPincel.d
                }}
              >
                <span
                  className="aj-cursor-int"
                  style={{
                    width: cursorPincel.d * (1 - brush.difusao / 100),
                    height: cursorPincel.d * (1 - brush.difusao / 100)
                  }}
                />
              </span>
            )}

            <HandlesDegrade
              mascara={mascaraAtiva != null ? mascaras[mascaraAtiva] : null}
              ferramenta={ferramenta}
              rect={telaRef.current ? retanguloDaImagem() : null}
              previaRef={telaRef}
              onArrastarInicio={comecarHandle}
            />
          </div>

          <aside className="aj-lado">

            <div className="aj-painel">

              {/* ═══════════ Máscaras ═══════════ */}
              <div className="aj-msk">
                {mascaraAtiva != null && (
                  <button className="aj-msk-voltar" onClick={sairMascara}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
                         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                         strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Voltar aos ajustes
                  </button>
                )}

                <button className="aj-msk-criar" onClick={criarMascara}>
                  <span className="aj-msk-circ" />
                  Criar máscara
                </button>

                {mascaras.length > 0 && (
                  <div className="aj-msk-lista">
                    <div
                      className={'aj-msk-item' + (mascaraAtiva == null ? ' aj-msk-item--on' : '')}
                      onClick={sairMascara}
                    >
                      <span className="aj-msk-thumb aj-msk-thumb--global" />
                      <span className="aj-msk-nome">Imagem toda (global)</span>
                    </div>

                    {mascaras.map((m, i) => (
                      <div
                        key={i}
                        className={'aj-msk-item' + (mascaraAtiva === i ? ' aj-msk-item--on' : '')}
                        onClick={() => selMascara(i)}
                      >
                        <span className="aj-msk-thumb" />
                        <span className="aj-msk-nome">{m.nome}</span>
                        <button className="aj-msk-olho" onClick={(e) => toggleVis(i, e)}
                                title="Mostrar/ocultar" aria-label="Mostrar/ocultar">
                          {m.visivel === false
                            ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17.9 17.9A10 10 0 0 1 12 19c-7 0-11-7-11-7a18 18 0 0 1 5-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 7 11 7a18 18 0 0 1-2.2 3.2m-6.7-1.1a3 3 0 1 1-4.2-4.2" /><path d="M1 1l22 22" /></svg>
                            : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>}
                        </button>
                        <button className="aj-msk-del" onClick={(e) => delMascara(i, e)}
                                aria-label="Excluir">×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Com máscara ativa: modo, ferramentas e opções do pincel */}
                {mascaraAtiva != null && (
                  <>
                    <div className="aj-msk-modo">
                      <button
                        className={'aj-msk-modo-b' + (modoComp === 'add' ? ' aj-msk-modo-b--on' : '')}
                        onClick={() => { setModoComp('add'); setSlotAberto(true); }}
                      >+ Adicionar</button>
                      <button
                        className={'aj-msk-modo-b' + (modoComp === 'sub' ? ' aj-msk-modo-b--on' : '')}
                        onClick={() => { setModoComp('sub'); setSlotAberto(true); }}
                      >− Subtrair</button>
                    </div>

                    <div className="aj-msk-ferrs">
                      {[
                        ['pincel', 'brush', 'Pincel'],
                        ['linear', 'linear', 'Linear'],
                        ['radial', 'radial', 'Radial']
                      ].map(([id, ic, nome]) => (
                        <button
                          key={id}
                          className={'aj-msk-ferr' + (ferramenta === id ? ' aj-msk-ferr--on' : '')}
                          onClick={() => escolherFerramenta(id)}
                        >
                          <IconeFerr nome={ic} />
                          <span>{nome}</span>
                        </button>
                      ))}
                    </div>

                    {ferramenta === 'pincel' && (
                      <div className="aj-msk-brush">
                        {[
                          ['tamanho', 'Tamanho', 1, 200],
                          ['difusao', 'Difusão', 0, 100],
                          ['fluxo', 'Fluxo', 1, 100]
                        ].map(([k, nome, mn, mx]) => (
                          <div key={k} className="aj-sl">
                            <div className="aj-sl-topo">
                              <span>{nome}</span>
                              <span className="aj-sl-v">{brush[k]}</span>
                            </div>
                            <input
                              type="range" min={mn} max={mx} value={brush[k]}
                              onChange={(e) => setBrush({ ...brush, [k]: +e.target.value })}
                              aria-label={nome}
                            />
                          </div>
                        ))}
                        <label className="aj-msk-check" onClick={() => setBrush({ ...brush, automatica: !brush.automatica })}>
                          <span className={'aj-msk-box' + (brush.automatica ? ' aj-msk-box--on' : '')}>
                            {brush.automatica && (
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 12l5 5L20 6" /></svg>
                            )}
                          </span>
                          Máscara automática
                        </label>
                        <p className="aj-msk-dica">
                          {brush.automatica
                            ? 'Clique num ponto: a máscara seleciona sozinha a área de cor parecida.'
                            : 'Arraste sobre a imagem para desenhar a máscara.'}
                        </p>
                      </div>
                    )}

                    {(ferramenta === 'linear' || ferramenta === 'radial') && (
                      <p className="aj-msk-dica">
                        Arraste sobre a imagem para desenhar o degradê {ferramenta === 'linear' ? 'linear' : 'radial'}.
                      </p>
                    )}
                  </>
                )}
              </div>

              <nav className="aj-abas">
                {[...ABAS_AJUSTE.slice(0, 3),
                  { id: 'curva', nome: 'Curva', icone: 'curva' },
                  { id: 'mixer', nome: 'Color Mixer', icone: 'mixer' },
                  ABAS_AJUSTE[3]
                ].map((a) => (
                  <button
                    key={a.id}
                    className={'aj-aba' + (aba === a.id ? ' aj-aba--on' : '')}
                    onClick={() => setAba(a.id)}
                  >
                    <IconeAba nome={a.icone} />
                    <span>{a.nome}</span>
                  </button>
                ))}
              </nav>

              <div className="aj-cab">
                <span className="aj-cab-t">
                  {aba === 'curva' ? 'Curva'
                    : aba === 'mixer' ? 'Color Mixer'
                    : abaAtual?.nome}
                </span>
                <button className="aj-reset" onClick={resetarAba}>Resetar</button>
              </div>

              {/* ── O equilíbrio de branco, só na aba Cor ── */}
              {aba === 'cor' && (
                <>
                  <button
                    className={'aj-wb' + (pegandoWB ? ' aj-wb--on' : '')}
                    onClick={() => setPegandoWB((v) => !v)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                         stroke="currentColor" strokeWidth="1.7"
                         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 3l2 2-9 9-2-2 9-9z" />
                      <path d="M10 12l-6.5 6.5a1.5 1.5 0 0 0 0 2.1l.9.9a1.5 1.5 0 0 0 2.1 0L13 15" />
                      <path d="M14 7l3 3" />
                    </svg>
                    Equilíbrio de branco
                  </button>
                  <p className="aj-wb-dica">
                    Clique num ponto que deveria ser cinza/branco neutro na imagem.
                  </p>
                </>
              )}

              {/* ── Os sliders ── */}
              {abaAtual && aba !== 'curva' && aba !== 'mixer' &&
                abaAtual.sliders
                  .filter((s) => {
                    // Vinheta e granulado são efeitos da imagem inteira — não
                    // fazem sentido restritos a uma máscara. Some com eles ali.
                    if (mascaraAtiva == null) return true;
                    const daMascara = /^(vinheta|grao)/.test(s.k);
                    return !daMascara;
                  })
                  .map((s) => {
                  // Os filhos (ponto médio, tamanho do grão) só fazem sentido
                  // com o pai ligado — sem ele não há vinheta nem grão a ajustar.
                  const pai = s.filho ? pAtivo[abaAtual.grupo][s.filho] : null;
                  const morto = s.filho && !pai;

                  return (
                    <Fragment key={s.k}>
                      {/* O título da seção (Vinheta, Granulado) vem antes do
                          slider que o abre. */}
                      {s.sec && <div className="aj-sec">{s.sec}</div>}

                      <div
                        className={'aj-sl' + (s.filho ? ' aj-sl--filho' : '') + (morto ? ' aj-sl--off' : '')}
                      >
                        <div className="aj-sl-topo">
                          <span>{s.nome}</span>
                          <button
                            className="aj-sl-v"
                            onClick={() => mexer(abaAtual.grupo, s.k, paramsPadrao()[abaAtual.grupo][s.k])}
                            title="Voltar ao padrão"
                          >{pAtivo[abaAtual.grupo][s.k]}</button>
                        </div>
                        <input
                          type="range"
                          className={s.grad ? 'aj-sl-grad' : ''}
                          style={s.grad ? { background: s.grad } : null}
                          min={s.min} max={s.max}
                          value={pAtivo[abaAtual.grupo][s.k]}
                          disabled={morto}
                          onChange={(e) => mexer(abaAtual.grupo, s.k, comTrava(+e.target.value, s.min, s.max))}
                          onDoubleClick={() => mexer(abaAtual.grupo, s.k, paramsPadrao()[abaAtual.grupo][s.k])}
                          aria-label={s.nome}
                        />
                      </div>
                    </Fragment>
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
                    pontos={pAtivo.curva[canal]}
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
                        >{pAtivo.mixer[cor][k]}</button>
                      </div>
                      <input
                        type="range" min="-100" max="100"
                        value={pAtivo.mixer[cor][k]}
                        onChange={(e) => mexerMixer(cor, k, comTrava(+e.target.value, -100, 100))}
                        onDoubleClick={() => mexerMixer(cor, k, 0)}
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

  // A linha é traçada a partir da LUT — a MESMA que aplica o efeito. Assim o que
  // se vê é exatamente o que acontece com a imagem, e a curva sai suave (spline
  // monotônica), não em segmentos retos.
  const lut = curvaLUT(pontos);
  const linha = lut
    .map((y, x) => `${x ? 'L' : 'M'} ${px(x)} ${py(y)}`)
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

      <path d={linha} fill="none" stroke={cor} strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />

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

// ═══════════════════════════════════════════════════════════
//  Os ícones das abas — traços simples, sobre o texto (opção 4).
// ═══════════════════════════════════════════════════════════
const ICONES_ABA = {
  sun:    'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4|circle:12,12,4',
  palette:'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.5-.3-.9-.6-1.2-.3-.3-.5-.6-.5-1 0-.7.6-1.3 1.3-1.3H15a5 5 0 0 0 5-5c0-4.4-3.6-8-8-8z|dot:7.5,10.5|dot:12,8|dot:16.5,10.5',
  sparkles:'M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5z',
  curva:  'M4 20C9 20 8 5 20 4',
  mixer:  'M6 4v16M12 4v16M18 4v16|dot2:6,9|dot2:12,14|dot2:18,7',
  adjustments:'M4 8h10M18 8h2M4 16h4M12 16h8|circle:15,8,2.2|circle:9,16,2.2'
};

function IconeAba({ nome }) {
  const def = ICONES_ABA[nome];
  if (!def) return null;

  const partes = def.split('|');
  return (
    <svg className="aj-aba-ic" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {partes.map((parte, i) => {
        if (parte.startsWith('circle:')) {
          const [cx, cy, r] = parte.slice(7).split(',').map(Number);
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        if (parte.startsWith('dot:')) {
          const [cx, cy] = parte.slice(4).split(',').map(Number);
          return <circle key={i} cx={cx} cy={cy} r="1.2" fill="currentColor" stroke="none" />;
        }
        if (parte.startsWith('dot2:')) {
          const [cx, cy] = parte.slice(5).split(',').map(Number);
          return <circle key={i} cx={cx} cy={cy} r="2.4" fill="currentColor" stroke="none" />;
        }
        return <path key={i} d={parte} />;
      })}
    </svg>
  );
}

// Ícones das ferramentas de máscara (pincel, linear, radial).
const ICONES_FERR = {
  brush:  'M9.5 14.5l-2 2c-1 1-3 1.2-3.5.5s-.5-2.5.5-3.5l2-2|path:M14 4l6 6-7 7-6-6z',
  linear: 'M3 6h18M3 12h18M3 18h18|path:M4 4l16 16',
  radial: 'circleo:12,12,9,0.4|circle:12,12,4'
};
function IconeFerr({ nome }) {
  const def = ICONES_FERR[nome];
  if (!def) return null;
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
         stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {def.split('|').map((parte, i) => {
        if (parte.startsWith('circleo:')) {
          const [cx, cy, r, op] = parte.slice(8).split(',').map(Number);
          return <circle key={i} cx={cx} cy={cy} r={r} opacity={op} />;
        }
        if (parte.startsWith('circle:')) {
          const [cx, cy, r] = parte.slice(7).split(',').map(Number);
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        if (parte.startsWith('path:')) return <path key={i} d={parte.slice(5)} />;
        return <path key={i} d={parte} />;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
//  Os pinos arrastáveis dos degradês linear e radial.
//  Ficam sobre a prévia, em coordenadas de tela (convertidas da base).
// ═══════════════════════════════════════════════════════════
function HandlesDegrade({ mascara, ferramenta, rect, previaRef, onArrastarInicio }) {
  if (!mascara || !rect) return null;
  if (ferramenta !== 'linear' && ferramenta !== 'radial') return null;

  const prev = previaRef.current?.parentElement;
  if (!prev) return null;
  const pr = prev.getBoundingClientRect();

  // Converte um ponto da base para px relativos à prévia.
  const base = previaRef.current;
  if (!base || !base.width) return null;
  const bw = base.width, bh = base.height;
  const px = (x) => (rect.left - pr.left) + (x / bw) * rect.w;
  const py = (y) => (rect.top - pr.top) + (y / bh) * rect.h;

  const Pino = ({ x, y, cor, tipo, ci }) => (
    <circle
      cx={px(x)} cy={py(y)} r="6"
      fill={cor} stroke="#fff" strokeWidth="1.5"
      style={{ cursor: 'grab', pointerEvents: 'all' }}
      onMouseDown={(e) => onArrastarInicio(tipo, ci, e)}
    />
  );

  const elementos = [];
  mascara.componentes.forEach((comp, ci) => {
    if (comp.tipo === 'linear') {
      const ax = px(comp.ax), ay = py(comp.ay);
      const bx = px(comp.bx), by = py(comp.by);
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      const ux = -dy / len, uy = dx / len;
      const L = Math.max(rect.w, rect.h);
      const linha = (cxp, cyp, op) => (
        <line key={`l${ci}-${cxp}-${cyp}`}
          x1={cxp - ux * L} y1={cyp - uy * L}
          x2={cxp + ux * L} y2={cyp + uy * L}
          stroke={`rgba(255,255,255,${op})`} strokeWidth="1" />
      );
      elementos.push(
        <g key={`lin${ci}`}>
          {linha(ax, ay, 0.9)}
          {linha(mx, my, 0.35)}
          {linha(bx, by, 0.9)}
          <line x1={ax} y1={ay} x2={bx} y2={by} stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <Pino x={comp.ax} y={comp.ay} cor="#e25555" tipo="A" ci={ci} />
          <Pino x={(comp.ax + comp.bx) / 2} y={(comp.ay + comp.by) / 2} cor="#7aa7ff" tipo="mover" ci={ci} />
          <Pino x={comp.bx} y={comp.by} cor="#fff" tipo="B" ci={ci} />
        </g>
      );
    } else if (comp.tipo === 'radial') {
      const cx = px(comp.cx), cy = py(comp.cy);
      const rx = (comp.rx / bw) * rect.w, ry = (comp.ry / bh) * rect.h;
      const fin = 1 - (comp.feather != null ? comp.feather : 0.5);
      elementos.push(
        <g key={`rad${ci}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
          <ellipse cx={cx} cy={cy} rx={rx * fin} ry={ry * fin} fill="none" stroke="rgba(255,255,255,0.5)" strokeDasharray="4 3" strokeWidth="1.2" />
          <Pino x={comp.cx} y={comp.cy} cor="#7aa7ff" tipo="mover" ci={ci} />
          <Pino x={comp.cx + comp.rx} y={comp.cy} cor="#fff" tipo="rx" ci={ci} />
          <Pino x={comp.cx} y={comp.cy + comp.ry} cor="#fff" tipo="ry" ci={ci} />
          <Pino x={comp.cx} y={comp.cy - comp.ry * fin} cor="#9ad27a" tipo="feather" ci={ci} />
          <Pino x={comp.cx + comp.rx * 0.707} y={comp.cy - comp.ry * 0.707} cor="#ffd24a" tipo="escala" ci={ci} />
        </g>
      );
    }
  });

  return (
    <svg className="aj-handles" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {elementos}
    </svg>
  );
}
