'use client';

// ═══════════════════════════════════════════════════════════
//  PainelPos — a Pós-produção
//
//  Ao contrário das outras abas, esta NÃO cabe num painel de 380px: ela toma a
//  janela inteira. Um editor de camadas espremido numa coluna seria inútil — a
//  tela é o instrumento.
//
//  ── As três coordenadas ──
//  Este arquivo lida com três espaços, e confundi-los é a origem de quase todo
//  bug de editor de imagem:
//    TELA      — pixels do navegador, onde o mouse acontece
//    DOCUMENTO — pixels da imagem, onde a seleção e o desenho acontecem
//    CAMADA    — pixels daquela camada, que pode estar escalada e deslocada
//  `paraDoc()` faz a primeira conversão. `paraCamada()`, a segunda.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import PickerImagem from './PickerImagem';
import Dica from './Dica';
import JanelaAjustes from './JanelaAjustes';
import JanelaAtalhos from './JanelaAtalhos';
import {
  carregarCanvas, canvasVazio, clonarCanvas, novaCamada, novoGrupo,
  compor, thumb, thumbMascara, mascaraBranca, rasterizar, mesclarCopia,
  exportar, fonteDaCamada, largura, altura, BLENDS, RATIOS_CROP
} from '../lib/pos';
import {
  novaSelecao, selecaoVazia, comporSelecao, modoEfetivo,
  retangulo, elipse, poligono, suavizar, varinha, selecaoRapida,
  tudo as selTudo, inverter as selInverter, tracarContornos,
  pincelada, hexParaRgb, desfocar, desfoqueMovimento
} from '../lib/selecao';
import { tirar, empilhar } from '../lib/historico';

// Os ícones são os do plugin (posIconeSVG) — quem usa os dois reconhece.
const IC = {
  mover:    'M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3',
  pincel:   'M20.5 3.5c-1 0-3 1-6 3.5C10 11 6.5 14.5 6.5 14.5l3 3s3.5-3.5 7.5-8c2.5-3 3.5-5 3.5-6z|M6.5 14.5c-2 0-3.5 1-4 3-.3 1.3-.5 2.8-2 3.2 1.5 1 4 1.3 5.5 1 2-.4 3.5-2 4-4z',
  borracha: 'M7 21h13|M5.5 16.5L13 9l5 5-5 5H8z|M11 7l5 5',
  varinha:  'M15 4l5 5M6 21l9-9M9 6l1-2 2 1-1 2zM18 11l2-1-1-2-2 1z',
  selRapida:'M12 3c-3 4-6 7-6 10a6 6 0 0 0 12 0c0-3-3-6-6-10z|M9 13h6',
  desfoque: 'M12 3c-3 4-6 7-6 10a6 6 0 0 0 12 0c0-3-3-6-6-10z',
  laco:     'M4 11c0-4 4-7 8-7s7 3 7 6-3 6-7 6c-2 0-3 1-3 2s1 2 2 2',
  lacoPoli: 'M4 6l7-2 9 5-4 8-8 1z',
  crop:     'M6 2v14a2 2 0 0 0 2 2h14|M2 6h14a2 2 0 0 1 2 2v14',
  baixar:   'M12 3v12M7 10l5 5 5-5M5 21h14',
  teclado:  'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6',
  mais:     'M12 6v12M6 12h12',
  volta:    'M12 4l-5 6 5 6',
  desfazer: 'M9 5L4 10l5 5|M4 10h9a6 6 0 0 1 0 12h-3'
};

const Svg = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

// ── As ferramentas, agrupadas como no plugin ──
// Um grupo tem um botão só; o triângulo abre o resto. É o que evita uma barra
// com quinze ícones.
const GRUPOS = [
  { id: 'mover', nome: 'Mover', d: IC.mover, solo: true },
  {
    grupo: 'letreiro', nome: 'Letreiro',
    itens: [
      { id: 'ret',  nome: 'Retangular', rect: true },
      { id: 'elip', nome: 'Elíptica',   elip: true }
    ]
  },
  {
    grupo: 'laco', nome: 'Laço',
    itens: [
      { id: 'laco',     nome: 'Laço livre',      d: IC.laco,     tracejado: true },
      { id: 'lacoPoli', nome: 'Laço poligonal',  d: IC.lacoPoli, tracejado: true }
    ]
  },
  {
    grupo: 'objeto', nome: 'Seleção inteligente',
    itens: [
      { id: 'selRapida', nome: 'Seleção rápida',  d: IC.selRapida },
      { id: 'varinha',   nome: 'Varinha mágica',  d: IC.varinha }
    ]
  },
  { id: 'pincel',   nome: 'Pincel',   d: IC.pincel,   solo: true },
  { id: 'borracha', nome: 'Borracha', d: IC.borracha, solo: true },
  {
    grupo: 'desfoque', nome: 'Desfoque', acao: true,
    itens: [
      { id: 'desfGauss', nome: 'Desfoque gaussiano', d: IC.desfoque },
      { id: 'desfMov',   nome: 'Desfoque de movimento', d: IC.desfoque }
    ]
  }
];

const PINTAM   = ['pincel', 'borracha'];
const SELECAO  = ['ret', 'elip', 'laco', 'lacoPoli', 'selRapida', 'varinha'];

export default function PainelPos({ aoSair, aoUpscale }) {
  // ── A pilha ──
  // A ordem é de CIMA para baixo, como na coluna. camadas[0] é a do topo.
  const [camadas, setCamadas] = useState([]);
  const [sel, setSel]         = useState([]);
  const [alvoMasc, setAlvo]   = useState(null);
  const [med, setMed]         = useState(null);

  const [ferr, setFerr]   = useState('mover');
  const [aberto, setAberto] = useState({});   // qual flyout de grupo está aberto
  const [picker, setPicker] = useState(null);
  const [zoom, setZoom]   = useState(1);
  const [pan, setPan]     = useState({ x: 0, y: 0 });
  const [ajustando, setAjustando] = useState(false);
  const [atalhos, setAtalhos] = useState(false);
  const [erro, setErro]   = useState('');
  const [ocupado, setOcupado] = useState(false);

  // ── As opções da ferramenta ──
  const [opts, setOpts] = useState({
    modo: 'novo',          // novo | somar | subtrair
    tolerancia: 30,
    tamanho: 40,
    dureza: 70,
    opacidade: 100,
    fluxo: 100
  });
  const [cor, setCor] = useState('#ffffff');

  // ── A seleção ──
  // Ela vive num ref, não no estado: o pincel a lê a cada movimento do mouse, e
  // um setState por frame faria o React re-renderizar 60 vezes por segundo à
  // toa. O que precisa virar estado é só o "existe seleção?".
  const selRef      = useRef(null);
  const [temSel, setTemSel] = useState(false);
  const contornoRef = useRef(null);

  // ── O crop ──
  const [crop, setCrop] = useState(null);     // { x0,y0,x1,y1 } em coords do doc
  const [sobreAlca, setSobreAlca] = useState(null);   // o cursor diz o que a alça faz
  const [ratio, setRatio] = useState('livre');

  // ── O histórico ──
  const [pilha, setPilha] = useState([]);

  const telaRef   = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const arquivoRef = useRef(null);
  const arrastando = useRef(null);

  // Estado vivo do gesto em curso. Refs, não estado: eles mudam a cada
  // mousemove, e não devem provocar renderização.
  const gesto = useRef({ ativo: false, pts: [], ret: null, ultimo: null, poli: [] });
  const pixCache = useRef({ id: null, dados: null });

  const ativa = camadas.find((l) => l.id === sel[0]) || null;
  const temImagem = camadas.length > 0;

  // ═══ Compor ═══
  useEffect(() => {
    if (!med || !canvasRef.current) return;
    compor(camadas, med.w, med.h, canvasRef.current);
  }, [camadas, med]);

  // ═══ As formiguinhas ═══
  //
  // O tracejado ANDA. Não é enfeite: um contorno estático se confunde com a
  // borda da própria imagem, e não se sabe o que está selecionado. O movimento
  // é o que diz "isto é uma seleção".
  useEffect(() => {
    if (!med || !overlayRef.current) return;

    const cv = overlayRef.current;
    cv.width = med.w;
    cv.height = med.h;
    const cx = cv.getContext('2d');

    let raf = null;
    let offset = 0;
    let ultimo = 0;

    function pintar(ts) {
      cx.clearRect(0, 0, med.w, med.h);

      const g = gesto.current;

      // A forma sendo arrastada AGORA
      if (g.ativo || g.poli.length) {
        cx.save();
        cx.lineWidth = 1 / zoom;    // a linha não engorda com o zoom
        cx.setLineDash([4 / zoom, 4 / zoom]);
        cx.beginPath();

        if (g.ret) {
          const x = Math.min(g.ret.x0, g.ret.x1);
          const y = Math.min(g.ret.y0, g.ret.y1);
          const w = Math.abs(g.ret.x1 - g.ret.x0);
          const h = Math.abs(g.ret.y1 - g.ret.y0);
          if (ferr === 'elip') cx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          else cx.rect(x, y, w, h);
        }

        const pts = g.poli.length ? g.poli : g.pts;
        if ((ferr === 'laco' || ferr === 'lacoPoli') && pts.length > 1) {
          cx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i].x, pts[i].y);
          if (ferr === 'lacoPoli' && g.ultimo) cx.lineTo(g.ultimo.x, g.ultimo.y);
        }

        cx.strokeStyle = '#000';
        cx.stroke();
        cx.strokeStyle = '#fff';
        cx.lineDashOffset = 4 / zoom;
        cx.stroke();

        // Os vértices do poligonal, para saber onde clicar de novo
        if (ferr === 'lacoPoli' && g.poli.length) {
          cx.setLineDash([]);
          cx.fillStyle = '#fff';
          cx.strokeStyle = '#000';
          for (const pt of g.poli) {
            cx.beginPath();
            cx.arc(pt.x, pt.y, 3.5 / zoom, 0, Math.PI * 2);
            cx.fill();
            cx.stroke();
          }
        }
        cx.restore();
      }

      // A seleção já firmada
      if (temSel && selRef.current) {
        if (!contornoRef.current) {
          contornoRef.current = tracarContornos(selRef.current, med.w, med.h);
        }

        if (ts - ultimo > 60) { offset += 0.6; ultimo = ts; }

        cx.save();
        cx.lineWidth = 1 / zoom;
        cx.beginPath();
        for (const path of contornoRef.current) {
          cx.moveTo(path[0][0], path[0][1]);
          for (let i = 1; i < path.length; i++) cx.lineTo(path[i][0], path[i][1]);
        }
        cx.setLineDash([4 / zoom, 4 / zoom]);
        cx.strokeStyle = '#000';
        cx.lineDashOffset = -offset;
        cx.stroke();
        cx.strokeStyle = '#fff';
        cx.lineDashOffset = -offset + 4 / zoom;
        cx.stroke();
        cx.restore();
      }

      // O crop: escurece o que vai ser cortado
      if (crop) {
        const x = Math.min(crop.x0, crop.x1);
        const y = Math.min(crop.y0, crop.y1);
        const w = Math.abs(crop.x1 - crop.x0);
        const h = Math.abs(crop.y1 - crop.y0);

        cx.save();
        cx.fillStyle = 'rgba(0,0,0,.45)';
        cx.beginPath();
        cx.rect(0, 0, med.w, med.h);
        cx.rect(x, y, w, h);
        cx.fill('evenodd');

        cx.strokeStyle = '#fff';
        cx.lineWidth = 1.5 / zoom;
        cx.setLineDash([]);
        cx.strokeRect(x, y, w, h);

        // Os terços: a regra de composição mais usada que existe
        cx.globalAlpha = .5;
        cx.lineWidth = .7 / zoom;
        for (let i = 1; i < 3; i++) {
          cx.beginPath();
          cx.moveTo(x + (w / 3) * i, y);
          cx.lineTo(x + (w / 3) * i, y + h);
          cx.moveTo(x, y + (h / 3) * i);
          cx.lineTo(x + w, y + (h / 3) * i);
          cx.stroke();
        }
        cx.globalAlpha = 1;

        // As alças. Elas precisam ser VISÍVEIS: uma moldura sem alça parece
        // fixa, e ninguém tenta puxá-la.
        //
        // O tamanho é dividido pelo zoom para que, na tela, elas tenham sempre
        // o mesmo tamanho — a 20% de zoom, uma alça fixa seria um ponto
        // invisível; a 800%, um bloco cobrindo a imagem.
        const s = 5 / zoom;
        cx.fillStyle = '#fff';
        cx.strokeStyle = 'rgba(0,0,0,.5)';
        cx.lineWidth = 1 / zoom;

        for (const [hx, hy] of [
          [x, y], [x + w / 2, y], [x + w, y],
          [x, y + h / 2],         [x + w, y + h / 2],
          [x, y + h], [x + w / 2, y + h], [x + w, y + h]
        ]) {
          cx.beginPath();
          cx.rect(hx - s, hy - s, s * 2, s * 2);
          cx.fill();
          cx.stroke();
        }

        cx.restore();
      }

      raf = requestAnimationFrame(pintar);
    }

    raf = requestAnimationFrame(pintar);
    return () => cancelAnimationFrame(raf);
  }, [med, temSel, crop, ferr, zoom]);

  // ═══ Abrir ═══
  const abrir = useCallback(async (src, nome, comoCamada) => {
    setErro('');
    setOcupado(true);
    try {
      const c = await carregarCanvas(src);

      if (!comoCamada || !med) {
        setMed({ w: c.width, h: c.height });
        const l = novaCamada(c, nome || 'Imagem');
        setCamadas([l]);
        setSel([l.id]);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        selRef.current = novaSelecao(c.width, c.height);
        setTemSel(false);
        setPilha([]);
      } else {
        const l = novaCamada(c, nome || `Camada ${camadas.length + 1}`);
        setCamadas((cs) => [l, ...cs]);
        setSel([l.id]);
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }, [med, camadas.length]);

  function escolheuDoPicker({ base64, previa }) {
    // O base64 vem PRIMEIRO, não a `previa`.
    //
    // A previa é a URL do R2, e o R2 não manda cabeçalho CORS. Uma <img> comum
    // não se importa — mas aqui a imagem vira CANVAS, e desenhar uma imagem de
    // outra origem sem CORS SUJA o canvas: o getImageData passa a lançar erro,
    // e sem ele não há ajustes, nem máscara, nem exportar.
    const src = base64 ? ('data:image/png;base64,' + base64) : previa;
    abrir(src, null, picker === 'camada');
    setPicker(null);
  }

  function escolheuArquivo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => abrir(r.result, f.name.replace(/\.[^.]+$/, ''), temImagem);
    r.readAsDataURL(f);
    e.target.value = '';
  }

  // ═══ O histórico ═══
  const guardar = useCallback(() => {
    setPilha((p) => empilhar(p, tirar(camadas, selRef.current, med)));
  }, [camadas, med]);

  const desfazer = useCallback(() => {
    setPilha((p) => {
      if (!p.length) return p;

      const s = p[p.length - 1];
      setCamadas(s.camadas);
      setMed(s.med);
      selRef.current = s.sel;
      contornoRef.current = null;
      setTemSel(s.sel ? !selecaoVazia(s.sel) : false);

      return p.slice(0, -1);
    });
  }, []);

  // ═══ Mexer numa camada ═══
  const mudar = useCallback((id, campos) => {
    setCamadas((cs) => cs.map((l) => (l.id === id ? { ...l, ...campos } : l)));
  }, []);

  function selecionar(id, e) {
    if (e?.shiftKey || e?.metaKey || e?.ctrlKey) {
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setSel([id]);
      setAlvo(null);
    }
  }

  // ═══ As ações da coluna ═══
  function novaVazia() {
    if (!med) return;
    guardar();
    const l = novaCamada(canvasVazio(med.w, med.h), `Camada ${camadas.length + 1}`);
    setCamadas((cs) => [l, ...cs]);
    setSel([l.id]);
  }

  function toggleMascara() {
    if (!ativa || ativa.tipo === 'grupo') return;
    guardar();

    if (ativa.mascara) {
      mudar(ativa.id, { mascara: null });
      if (alvoMasc === ativa.id) setAlvo(null);
    } else {
      mudar(ativa.id, { mascara: mascaraBranca(ativa.canvas.width, ativa.canvas.height) });
      setAlvo(ativa.id);
    }
  }

  function agrupar() {
    if (!sel.length) return;
    guardar();

    const g = novoGrupo('Grupo');
    // O grupo entra ONDE estava a primeira selecionada — não no topo. Assim a
    // pilha não se reordena sozinha debaixo da pessoa.
    const i = camadas.findIndex((l) => l.id === sel[0]);

    setCamadas((cs) => {
      const dentro = cs.filter((l) => sel.includes(l.id) && l.tipo !== 'grupo')
                       .map((l) => ({ ...l, grupo: g.id }));
      const fora   = cs.filter((l) => !sel.includes(l.id) || l.tipo === 'grupo');
      return [...fora.slice(0, i), g, ...dentro, ...fora.slice(i)];
    });

    setSel([g.id]);
  }

  function duplicar() {
    if (!ativa || ativa.tipo === 'grupo') return;
    guardar();

    const l = novaCamada(clonarCanvas(ativa.canvas), ativa.nome + ' cópia', {
      x: ativa.x, y: ativa.y,
      escala: ativa.escala, escalaY: ativa.escalaY,
      blend: ativa.blend, opacidade: ativa.opacidade,
      mascara: ativa.mascara ? clonarCanvas(ativa.mascara) : null,
      original: ativa.original ? clonarCanvas(ativa.original) : null,
      grupo: ativa.grupo
    });

    const i = camadas.findIndex((x) => x.id === ativa.id);
    setCamadas((cs) => [...cs.slice(0, i), l, ...cs.slice(i)]);
    setSel([l.id]);
  }

  function excluir() {
    if (!sel.length) return;
    guardar();

    setCamadas((cs) => {
      // Excluir um grupo leva os filhos junto — é o que se espera dele.
      const mortos = cs.filter((l) => sel.includes(l.id) && l.tipo === 'grupo').map((l) => l.id);
      return cs.filter((l) => !sel.includes(l.id) && !mortos.includes(l.grupo));
    });

    setSel([]);
    setAlvo(null);
  }

  function rasterizarAtiva() {
    if (!ativa || !med || ativa.tipo === 'grupo') return;
    guardar();
    const nova = rasterizar(ativa, med.w, med.h);
    setCamadas((cs) => cs.map((l) => (l.id === ativa.id ? nova : l)));
    setSel([nova.id]);
  }

  function mesclar() {
    if (!camadas.length || !med) return;
    guardar();
    const l = mesclarCopia(camadas, med.w, med.h);
    setCamadas((cs) => [l, ...cs]);
    setSel([l.id]);
  }

  function soltar(destino) {
    const origem = arrastando.current;
    arrastando.current = null;
    if (origem == null || origem === destino) return;

    guardar();
    setCamadas((cs) => {
      const c = [...cs];
      const [l] = c.splice(origem, 1);
      c.splice(destino, 0, l);
      return c;
    });
  }

  // ═══ As coordenadas ═══
  //
  // Do evento do mouse para o pixel do documento. O canvas está escalado (zoom)
  // e deslocado (pan) na tela; sem desfazer as duas coisas, um clique no canto
  // viraria um ponto no meio da imagem.
  const paraDoc = useCallback((e) => {
    const cv = canvasRef.current;
    if (!cv) return { x: 0, y: 0 };

    const r = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * cv.width,
      y: ((e.clientY - r.top) / r.height) * cv.height
    };
  }, []);

  // Do documento para o pixel DAQUELA camada, que pode estar escalada e movida.
  function paraCamada(p, l) {
    return {
      x: (p.x - l.x) / l.escala,
      y: (p.y - l.y) / (l.escalaY != null ? l.escalaY : l.escala)
    };
  }

  // Os pixels da camada, no espaço do documento. Cacheados: a varinha e a
  // seleção rápida os leem a cada movimento do mouse, e reextraí-los seria
  // refazer um getImageData de milhões de pixels por frame.
  //
  // A chave NÃO é só o id da camada. O pincel e os Ajustes trocam o canvas dela
  // sem trocar o id — e um cache preso ao id devolveria o pixel VELHO, fazendo
  // a varinha selecionar pela imagem de antes. A referência do canvas muda a
  // cada alteração real, e é ela que serve de chave.
  function pixelsDaCamada(l) {
    const c = pixCache.current;
    if (c.id === l.id && c.canvas === l.canvas && c.x === l.x && c.y === l.y && c.dados) {
      return c.dados;
    }

    const cv = canvasVazio(med.w, med.h);
    cv.getContext('2d').drawImage(fonteDaCamada(l), l.x, l.y, largura(l), altura(l));

    const d = cv.getContext('2d').getImageData(0, 0, med.w, med.h).data;
    pixCache.current = { id: l.id, canvas: l.canvas, x: l.x, y: l.y, dados: d };
    return d;
  }

  // ═══ O alvo do pincel ═══
  //
  // Pintar onde? Se a máscara da camada está escolhida, é NELA — e aí o preto
  // esconde. Senão, é no pixel da camada.
  function alvoDoPincel(l) {
    if (alvoMasc === l.id && l.mascara) {
      return { canvas: l.mascara, naMascara: true };
    }
    return { canvas: l.canvas, naMascara: false };
  }

  // ═══ O mouse na tela ═══
  function descer(e) {
    if (e.button === 1) return;          // o botão do meio é do pan
    if (!temImagem || !med) return;

    const p = paraDoc(e);
    const g = gesto.current;

    // ── O crop ──
    // Qual alça foi pega decide o que o arraste faz: redimensionar, mover, ou
    // começar uma moldura nova.
    if (crop !== null && ferr === 'crop') {
      const alca = alcaEm(p);

      g.ativo = true;
      g.alca = alca;
      g.cropDe = { ...crop, px: p.x, py: p.y };

      // Fora da moldura: recomeça do ponto clicado
      if (!alca) {
        g.cropDe = null;
        g.ret = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
        setCrop(g.ret);
      }
      return;
    }

    // ── O laço poligonal: cada clique põe um vértice ──
    if (ferr === 'lacoPoli') {
      g.poli.push(p);
      g.modo = modoEfetivo(e, opts.modo);
      return;
    }

    if (!ativa) return;

    // ── A varinha: um clique, e pronto ──
    if (ferr === 'varinha') {
      guardar();
      const m = modoEfetivo(e, opts.modo);
      if (!selRef.current) selRef.current = novaSelecao(med.w, med.h);

      varinha(selRef.current, m, pixelsDaCamada(ativa), med.w, med.h, p, opts.tolerancia);
      contornoRef.current = null;
      setTemSel(!selecaoVazia(selRef.current));
      return;
    }

    g.ativo = true;
    g.modo = modoEfetivo(e, opts.modo);
    g.pts = [p];
    g.ultimo = null;

    if (ferr === 'ret' || ferr === 'elip') {
      g.ret = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      return;
    }

    if (ferr === 'selRapida') {
      guardar();
      if (!selRef.current) selRef.current = novaSelecao(med.w, med.h);
      selecaoRapida(selRef.current, g.modo, pixelsDaCamada(ativa),
                    med.w, med.h, p, opts.tolerancia, opts.tamanho);
      contornoRef.current = null;
      return;
    }

    if (PINTAM.includes(ferr)) {
      guardar();
      pintar(p, true);
      return;
    }

    if (ferr === 'mover') {
      g.moveDe = { x: p.x, y: p.y, lx: ativa.x, ly: ativa.y };
      guardar();
    }
  }

  function mover(e) {
    const g = gesto.current;

    // O poligonal não arrasta: ele só precisa saber onde o cursor está, para
    // desenhar a linha elástica do último vértice até ele.
    if (ferr === 'lacoPoli' && g.poli.length) {
      g.ultimo = paraDoc(e);
      return;
    }

    // Parado sobre a moldura de corte, o cursor ANUNCIA o que a alça faz. Sem
    // isso não há como saber que a moldura é agarrável — a pessoa clicaria e
    // desenharia uma nova sem querer.
    if (crop !== null && ferr === 'crop' && !g.ativo) {
      const a = alcaEm(paraDoc(e));
      if (a !== sobreAlca) setSobreAlca(a);
      return;
    }

    if (!g.ativo || !med) return;
    const p = paraDoc(e);

    if (crop !== null && ferr === 'crop') {
      // Moldura nova, sendo arrastada do zero
      if (!g.cropDe) {
        g.ret.x1 = p.x;
        g.ret.y1 = p.y;
        setCrop(comRatio(g.ret, 'se'));
        return;
      }

      const d = g.cropDe;
      const dx = p.x - d.px;
      const dy = p.y - d.py;

      const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1);
      const y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);

      let r;

      if (g.alca === 'mover') {
        // Mover não deixa a moldura sair da imagem: uma moldura fora da tela
        // não corta nada, e é só uma forma de perder o trabalho.
        const w = x1 - x0, h = y1 - y0;
        const nx = Math.max(0, Math.min(med.w - w, x0 + dx));
        const ny = Math.max(0, Math.min(med.h - h, y0 + dy));
        r = { x0: nx, y0: ny, x1: nx + w, y1: ny + h };
        setCrop(r);
        return;
      }

      // Cada alça move só as bordas que lhe dizem respeito.
      //
      // As bordas são declaradas por extenso, e não deduzidas das letras do
      // nome: "mover" contém um "o" e um "e", e um teste por substring o
      // confundiria com uma alça de canto.
      const BORDAS = {
        no: { o: 1, n: 1 }, ne: { l: 1, n: 1 },
        so: { o: 1, s: 1 }, se: { l: 1, s: 1 },
        o:  { o: 1 }, l: { l: 1 }, n: { n: 1 }, s: { s: 1 }
      };
      const b = BORDAS[g.alca] || {};

      r = {
        x0: b.o ? x0 + dx : x0,
        y0: b.n ? y0 + dy : y0,
        x1: b.l ? x1 + dx : x1,
        y1: b.s ? y1 + dy : y1
      };

      // Não deixa a moldura escapar da imagem nem se virar do avesso
      r.x0 = Math.max(0, Math.min(r.x0, med.w));
      r.y0 = Math.max(0, Math.min(r.y0, med.h));
      r.x1 = Math.max(0, Math.min(r.x1, med.w));
      r.y1 = Math.max(0, Math.min(r.y1, med.h));

      setCrop(comRatio(r, g.alca));
      return;
    }

    if (ferr === 'ret' || ferr === 'elip') {
      g.ret.x1 = p.x;
      g.ret.y1 = p.y;
      return;
    }

    if (ferr === 'laco') {
      // Só grava se moveu o bastante: gravar cada pixel encheria o array de
      // pontos redundantes e engasgaria o traçado.
      const u = g.pts[g.pts.length - 1];
      if (!u || Math.abs(p.x - u.x) + Math.abs(p.y - u.y) >= 2) g.pts.push(p);
      return;
    }

    if (ferr === 'selRapida' && ativa) {
      selecaoRapida(selRef.current, g.modo, pixelsDaCamada(ativa),
                    med.w, med.h, p, opts.tolerancia, opts.tamanho);
      contornoRef.current = null;
      return;
    }

    if (PINTAM.includes(ferr)) {
      pintar(p, false);
      return;
    }

    if (ferr === 'mover' && g.moveDe && ativa) {
      mudar(ativa.id, {
        x: g.moveDe.lx + (p.x - g.moveDe.x),
        y: g.moveDe.ly + (p.y - g.moveDe.y)
      });
    }
  }

  function subir() {
    const g = gesto.current;
    if (!g.ativo) return;
    g.ativo = false;

    if (crop !== null && ferr === 'crop') {
      g.ret = null;
      g.alca = null;
      g.cropDe = null;
      return;
    }

    if (!selRef.current && med) selRef.current = novaSelecao(med.w, med.h);

    if ((ferr === 'ret' || ferr === 'elip') && g.ret) {
      guardar();
      const fn = ferr === 'ret' ? retangulo : elipse;
      fn(selRef.current, g.modo, g.ret);
      contornoRef.current = null;
      setTemSel(!selecaoVazia(selRef.current));
      g.ret = null;
    }

    else if (ferr === 'laco' && g.pts.length > 2) {
      guardar();
      poligono(selRef.current, g.modo, suavizar(g.pts));
      contornoRef.current = null;
      setTemSel(!selecaoVazia(selRef.current));
    }

    else if (ferr === 'selRapida') {
      setTemSel(!selecaoVazia(selRef.current));
      pixCache.current = { id: null, dados: null };
    }

    else if (PINTAM.includes(ferr)) {
      pixCache.current = { id: null, dados: null };
    }

    g.pts = [];
    g.ultimo = null;
    g.moveDe = null;
  }

  // Duplo clique fecha o laço poligonal
  function duploClique() {
    const g = gesto.current;
    if (ferr !== 'lacoPoli' || g.poli.length < 3) return;

    guardar();
    if (!selRef.current) selRef.current = novaSelecao(med.w, med.h);

    poligono(selRef.current, g.modo || opts.modo, g.poli);
    contornoRef.current = null;
    setTemSel(!selecaoVazia(selRef.current));

    g.poli = [];
    g.ultimo = null;
  }

  // ═══ Pintar ═══
  function pintar(p, inicio) {
    if (!ativa || ativa.tipo === 'grupo') return;

    const g = gesto.current;
    const { canvas, naMascara } = alvoDoPincel(ativa);

    const pc = paraCamada(p, ativa);
    const de = inicio ? null : g.ultimoPt;
    const raio = Math.max(0.5, opts.tamanho / ativa.escala);

    // ── O que a borracha faz depende de ONDE ela está ──
    //
    // No PIXEL, apagar é remover: o que sai deixa transparência, e a camada de
    // baixo aparece. Isso é `destination-out`.
    //
    // Numa MÁSCARA, não existe "remover" — a máscara é opaca por definição, e o
    // que ela guarda é quanto se vê. Apagar ali é pintar de PRETO. Uma borracha
    // que abrisse buraco na máscara deixaria a área indefinida, e o resultado
    // seria imprevisível.
    const ehBorracha = ferr === 'borracha';
    const removeAlfa = ehBorracha && !naMascara;
    const tinta = ehBorracha && naMascara ? '0,0,0' : hexParaRgb(cor);

    // ── Sem seleção: pinta direto ──
    // É o caminho rápido, e o mais comum. Criar dois canvas auxiliares a cada
    // movimento do mouse, à toa, seria caro.
    if (!temSel || !selRef.current) {
      pincelada(canvas, de, pc, {
        raio,
        dureza: opts.dureza,
        opacidade: opts.opacidade,
        fluxo: opts.fluxo,
        cor: tinta,
        apagar: removeAlfa
      });

      g.ultimoPt = pc;
      if (canvasRef.current) compor(camadas, med.w, med.h, canvasRef.current);
      return;
    }

    // ── Com seleção: a pincelada é recortada a ela ──
    //
    // A pincelada não vai direto no alvo: ela é desenhada num canvas à parte,
    // recortada pela seleção, e só então aplicada. É isso que faz a seleção
    // valer alguma coisa para o pincel — sem ela, pintaria por fora.
    const traco = canvasVazio(canvas.width, canvas.height);

    // Sempre desenha o traço OPACO no rascunho. A opacidade e o fluxo entram
    // depois, na hora de aplicar — senão a borracha (que precisa do alfa do
    // traço para saber quanto apagar) perderia a informação.
    pincelada(traco, de, pc, {
      raio,
      dureza: opts.dureza,
      opacidade: opts.opacidade,
      fluxo: opts.fluxo,
      cor: tinta,
      apagar: false            // no rascunho, nunca se apaga: só se desenha
    });

    // A seleção está em coordenadas do DOCUMENTO; o traço, nas da CAMADA.
    // Desfazer a transformação da camada alinha as duas.
    const recorte = canvasVazio(canvas.width, canvas.height);
    const rc = recorte.getContext('2d');
    rc.save();
    rc.scale(canvas.width / largura(ativa), canvas.height / altura(ativa));
    rc.translate(-ativa.x, -ativa.y);
    rc.drawImage(selRef.current, 0, 0);
    rc.restore();

    // Recorta o traço: o que cai fora da seleção some.
    const tc = traco.getContext('2d');
    tc.globalCompositeOperation = 'destination-in';
    tc.drawImage(recorte, 0, 0);
    tc.globalCompositeOperation = 'source-over';

    // Aplica. A borracha REMOVE por onde o traço passa; o pincel SOMA.
    const cc = canvas.getContext('2d');
    cc.save();
    if (removeAlfa) cc.globalCompositeOperation = 'destination-out';
    cc.drawImage(traco, 0, 0);
    cc.restore();

    g.ultimoPt = pc;

    // Redesenha sem passar pelo estado: o canvas já mudou no lugar, e um
    // setState por movimento do mouse re-renderizaria a árvore 60x por segundo.
    if (canvasRef.current) compor(camadas, med.w, med.h, canvasRef.current);
  }

  // ═══ As ações da seleção ═══
  function selecionarTudo() {
    if (!med) return;
    guardar();
    if (!selRef.current) selRef.current = novaSelecao(med.w, med.h);
    selTudo(selRef.current);
    contornoRef.current = null;
    setTemSel(true);
  }

  function desmarcar() {
    if (!selRef.current) return;
    guardar();
    const cx = selRef.current.getContext('2d');
    cx.clearRect(0, 0, med.w, med.h);
    contornoRef.current = null;
    setTemSel(false);
    gesto.current.poli = [];
  }

  function inverterSel() {
    if (!selRef.current || !temSel) return;
    guardar();
    selInverter(selRef.current);
    contornoRef.current = null;
    setTemSel(!selecaoVazia(selRef.current));
  }

  // A seleção vira máscara: o que estava selecionado fica visível, o resto some.
  // É o caminho mais curto entre "recortei isto" e "só isto aparece".
  function selParaMascara() {
    if (!ativa || !temSel || !selRef.current) return;
    guardar();

    const m = canvasVazio(ativa.canvas.width, ativa.canvas.height);
    const mc = m.getContext('2d');

    // Preto = escondido. A seleção pinta de branco por cima.
    mc.fillStyle = '#000';
    mc.fillRect(0, 0, m.width, m.height);

    mc.save();
    mc.scale(m.width / largura(ativa), m.height / altura(ativa));
    mc.translate(-ativa.x, -ativa.y);
    mc.drawImage(selRef.current, 0, 0);
    mc.restore();

    mudar(ativa.id, { mascara: m });
    setAlvo(ativa.id);
    desmarcar();
  }

  // ═══ O desfoque ═══
  function aplicarDesfoque(tipo) {
    if (!ativa || ativa.tipo === 'grupo') return;
    guardar();

    const c = clonarCanvas(ativa.canvas);

    // A seleção precisa vir para o espaço da camada
    let s = null;
    if (temSel && selRef.current) {
      s = canvasVazio(c.width, c.height);
      const sc = s.getContext('2d');
      sc.save();
      sc.scale(c.width / largura(ativa), c.height / altura(ativa));
      sc.translate(-ativa.x, -ativa.y);
      sc.drawImage(selRef.current, 0, 0);
      sc.restore();
    }

    if (tipo === 'desfGauss') desfocar(c, opts.tamanho / 2, s);
    else desfoqueMovimento(c, opts.tamanho / 2, 0, s);

    mudar(ativa.id, { canvas: c, original: null });
    setFerr('mover');
  }

  // ═══ O crop ═══
  //
  // A moldura tem ALÇAS. Sem elas, qualquer clique dentro da moldura a
  // recomeçaria do zero — e como ela nasce do tamanho da imagem, o primeiro
  // clique a colapsaria num ponto. Arrastar um canto redimensiona; arrastar o
  // meio move a moldura inteira.
  const ALCA = 14;   // o raio de tolerância do canto, em pixels do documento

  function alcaEm(p) {
    if (!crop) return null;

    const x0 = Math.min(crop.x0, crop.x1);
    const y0 = Math.min(crop.y0, crop.y1);
    const x1 = Math.max(crop.x0, crop.x1);
    const y1 = Math.max(crop.y0, crop.y1);

    // A tolerância cresce quando se está afastado: num zoom de 20%, uma alça de
    // 14px do documento teria menos de 3px na tela, e ninguém a acertaria.
    const t = ALCA / zoom;

    const perto = (a, b) => Math.abs(a - b) < t;

    if (perto(p.x, x0) && perto(p.y, y0)) return 'no';
    if (perto(p.x, x1) && perto(p.y, y0)) return 'ne';
    if (perto(p.x, x0) && perto(p.y, y1)) return 'so';
    if (perto(p.x, x1) && perto(p.y, y1)) return 'se';

    if (perto(p.x, x0) && p.y > y0 && p.y < y1) return 'o';
    if (perto(p.x, x1) && p.y > y0 && p.y < y1) return 'l';
    if (perto(p.y, y0) && p.x > x0 && p.x < x1) return 'n';
    if (perto(p.y, y1) && p.x > x0 && p.x < x1) return 's';

    if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) return 'mover';

    return null;   // fora da moldura: começa uma nova
  }

  function comRatio(r, ancora) {
    if (ratio === 'livre') return r;

    const [a, b] = ratio.split(':').map(Number);

    const x0 = Math.min(r.x0, r.x1);
    const y0 = Math.min(r.y0, r.y1);
    const w = Math.abs(r.x1 - r.x0);
    const h = (w * b) / a;

    // A proporção é imposta pela LARGURA, e a altura a segue. O canto que a
    // pessoa está segurando é que fica parado — puxar o canto de cima não deve
    // fazer a moldura crescer para baixo.
    const paraCima = ancora === 'no' || ancora === 'ne' || ancora === 'n';

    return paraCima
      ? { x0, y0: y0 + Math.abs(r.y1 - r.y0) - h, x1: x0 + w, y1: y0 + Math.abs(r.y1 - r.y0) }
      : { x0, y0, x1: x0 + w, y1: y0 + h };
  }

  function abrirCrop() {
    if (!med) return;
    if (crop) { setCrop(null); setFerr('mover'); return; }

    // Começa com a imagem inteira: quem quer cortar já sabe puxar a borda, e uma
    // moldura de tamanho zero não daria pista nenhuma do que fazer.
    setCrop({ x0: 0, y0: 0, x1: med.w, y1: med.h });
    setFerr('crop');
  }

  function aplicarCrop() {
    if (!crop || !med) return;

    const x = Math.round(Math.min(crop.x0, crop.x1));
    const y = Math.round(Math.min(crop.y0, crop.y1));
    const w = Math.round(Math.abs(crop.x1 - crop.x0));
    const h = Math.round(Math.abs(crop.y1 - crop.y0));
    if (w < 8 || h < 8) return;

    guardar();

    // Cortar não redimensiona cada camada: ele DESLOCA todas, e encolhe o
    // documento. Assim uma camada que estava meio para fora continua meio para
    // fora — só que agora em relação à nova borda.
    setCamadas((cs) => cs.map((l) => (
      l.tipo === 'grupo' ? l : { ...l, x: l.x - x, y: l.y - y }
    )));

    setMed({ w, h });

    selRef.current = novaSelecao(w, h);
    contornoRef.current = null;
    setTemSel(false);

    setCrop(null);
    setFerr('mover');
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // ═══ Zoom e pan ═══
  useEffect(() => {
    const el = telaRef.current;
    if (!el) return;

    const rolar = (e) => {
      e.preventDefault();
      const d = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom((z) => Math.min(8, Math.max(0.05, z * d)));
    };

    let movendo = false;
    let ini = null;

    const desce = (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      movendo = true;
      ini = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };
    const move = (e) => {
      if (!movendo) return;
      setPan({ x: e.clientX - ini.x, y: e.clientY - ini.y });
    };
    const sobe = () => { movendo = false; };

    el.addEventListener('wheel', rolar, { passive: false });
    el.addEventListener('mousedown', desce);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', sobe);

    return () => {
      el.removeEventListener('wheel', rolar);
      el.removeEventListener('mousedown', desce);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', sobe);
    };
  }, [pan]);

  // O mouse é solto na JANELA, não no canvas: quem arrasta para fora da tela e
  // solta lá espera que o traço termine mesmo assim.
  useEffect(() => {
    window.addEventListener('mouseup', subir);
    return () => window.removeEventListener('mouseup', subir);
  });

  // ═══ Os atalhos ═══
  useEffect(() => {
    function tecla(e) {
      // Num campo de texto, "V" é a letra V — não a ferramenta Mover.
      const alvo = e.target.tagName;
      if (alvo === 'INPUT' || alvo === 'TEXTAREA' || alvo === 'SELECT') return;
      if (ajustando || atalhos) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); desfazer(); return; }
      if (ctrl && e.key.toLowerCase() === 'a') { e.preventDefault(); selecionarTudo(); return; }
      if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); desmarcar(); return; }
      if (ctrl && e.key.toLowerCase() === 'j') { e.preventDefault(); duplicar(); return; }
      if (ctrl && e.key.toLowerCase() === 'g') { e.preventDefault(); agrupar(); return; }
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'i') { e.preventDefault(); inverterSel(); return; }
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'r') { e.preventDefault(); rasterizarAtiva(); return; }
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); setAjustando(true); return; }
      if (ctrl && e.altKey && e.key.toLowerCase() === 'e')   { e.preventDefault(); mesclar(); return; }
      if (ctrl) return;

      if (e.key === 'Delete' || e.key === 'Backspace') { excluir(); return; }
      if (e.key === 'Escape') {
        if (crop) { setCrop(null); setFerr('mover'); }
        else if (gesto.current.poli.length) { gesto.current.poli = []; }
        else desmarcar();
        return;
      }
      if (e.key === 'Enter' && crop) { aplicarCrop(); return; }

      const k = e.key.toLowerCase();
      if (k === 'v') setFerr('mover');
      if (k === 'm') setFerr((f) => (f === 'ret' ? 'elip' : 'ret'));
      if (k === 'l') setFerr((f) => (f === 'laco' ? 'lacoPoli' : 'laco'));
      if (k === 'w') setFerr((f) => (f === 'selRapida' ? 'varinha' : 'selRapida'));
      if (k === 'b') setFerr('pincel');
      if (k === 'e') setFerr('borracha');
      if (k === 'c') abrirCrop();
      // X troca a cor do pincel: é o gesto de quem pinta numa máscara e precisa
      // alternar entre esconder e revelar sem tirar a mão do teclado.
      if (k === 'x') setCor((c) => (c === '#ffffff' ? '#000000' : '#ffffff'));
    }

    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  // ═══ Sair ═══
  function baixar() {
    if (!med) return;
    const a = document.createElement('a');
    a.download = 'cora-pos.png';
    a.href = exportar(camadas, med.w, med.h);
    a.click();
  }

  function paraUpscale() {
    if (!med || !aoUpscale) return;
    aoUpscale(exportar(camadas, med.w, med.h));
  }

  // Qual item do grupo está ativo (para o botão mostrar o ícone certo)
  function itemDoGrupo(g) {
    const achou = g.itens.find((i) => i.id === ferr);
    return achou || g.itens[0];
  }

  const mostraOpcoes = SELECAO.includes(ferr) || PINTAM.includes(ferr);
  const naMasc = ativa && alvoMasc === ativa.id && ativa.mascara;

  return (
    <section className="ps">

      {/* ══ A topbar ══ */}
      <header className="ps-top">

        <Dica texto="Voltar">
          <button className="ps-b" onClick={aoSair}>
            <Svg d={IC.volta} /> Voltar
          </button>
        </Dica>

        <button className="ps-b ps-b--on" onClick={() => setPicker('nova')} disabled={ocupado}>
          Abrir imagem
        </button>

        <Dica texto="Adicionar camada">
          <button className="ps-ic" onClick={() => setPicker('camada')}
                  disabled={!temImagem} aria-label="Adicionar camada">
            <Svg d={IC.mais} />
          </button>
        </Dica>

        <Dica texto="Do computador">
          <button className="ps-ic" onClick={() => arquivoRef.current?.click()}
                  aria-label="Do computador">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>
            </svg>
          </button>
        </Dica>

        <Dica texto="Cortar (C)">
          <button className={'ps-ic' + (crop ? ' ps-ic--on' : '')} onClick={abrirCrop}
                  disabled={!temImagem} aria-label="Cortar">
            <Svg d={IC.crop} />
          </button>
        </Dica>

        <span className="ps-sep" />

        {/* ── As ferramentas ── */}
        {GRUPOS.map((g) => {
          if (g.solo) {
            return (
              <Dica key={g.id} texto={g.nome}>
                <button
                  className={'ps-ic' + (ferr === g.id ? ' ps-ic--on' : '')}
                  onClick={() => setFerr(g.id)}
                  disabled={!temImagem}
                  aria-label={g.nome}
                ><Svg d={g.d} /></button>
              </Dica>
            );
          }

          const it = itemDoGrupo(g);
          const ligado = g.itens.some((i) => i.id === ferr);

          return (
            <span key={g.grupo} className="ps-grupo">
              <Dica texto={g.nome}>
                <button
                  className={'ps-ic' + (ligado ? ' ps-ic--on' : '')}
                  onClick={() => {
                    if (g.acao) aplicarDesfoque(it.id);
                    else setFerr(it.id);
                  }}
                  disabled={!temImagem}
                  aria-label={g.nome}
                >
                  <IconeItem it={it} />
                </button>
              </Dica>

              {/* O triângulo abre o resto do grupo. Sem ele, quinze ícones na
                  barra — com ele, sete. */}
              <button
                className="ps-tri-btn"
                onClick={() => setAberto((a) => ({ ...a, [g.grupo]: !a[g.grupo] }))}
                disabled={!temImagem}
                aria-label={`Mais de ${g.nome}`}
              ><span className="ps-tri" /></button>

              {aberto[g.grupo] && (
                <>
                  <span className="ps-veu" onClick={() => setAberto({})} />
                  <div className="ps-fly">
                    {g.itens.map((i) => (
                      <button
                        key={i.id}
                        className={'ps-fly-it' + (ferr === i.id ? ' ps-fly-it--on' : '')}
                        onClick={() => {
                          if (g.acao) aplicarDesfoque(i.id);
                          else setFerr(i.id);
                          setAberto({});
                        }}
                      >
                        <IconeItem it={i} />
                        <span>{i.nome}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </span>
          );
        })}

        <span className="ps-esticar" />

        <Dica texto="Desfazer (Ctrl+Z)">
          <button className="ps-ic" onClick={desfazer}
                  disabled={!pilha.length} aria-label="Desfazer">
            <Svg d={IC.desfazer} />
          </button>
        </Dica>

        <Dica texto="Atalhos de teclado">
          <button className="ps-ic" onClick={() => setAtalhos(true)} aria-label="Atalhos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                 strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <path d={IC.teclado} />
            </svg>
          </button>
        </Dica>

        <button className="ps-b" onClick={mesclar} disabled={!temImagem}>
          Salvar no Histórico
        </button>

        <button className="ps-b" onClick={paraUpscale} disabled={!temImagem}>
          Fazer upscale
        </button>

        <Dica texto="Baixar">
          <button className="ps-ic" onClick={baixar}
                  disabled={!temImagem} aria-label="Baixar">
            <Svg d={IC.baixar} />
          </button>
        </Dica>
      </header>

      {/* ══ A barra de opções ══
          Ela só existe quando a ferramenta tem o que ajustar. Uma barra sempre
          presente, mas vazia metade do tempo, seria só um vão. */}
      {temImagem && (mostraOpcoes || crop) && (
        <div className="ps-opts">

          {crop ? (
            <>
              <label className="ps-opt-l">Proporção</label>
              <select className="ps-sel ps-sel--min" value={ratio}
                      onChange={(e) => {
                        setRatio(e.target.value);
                        if (crop) setCrop((c) => comRatio({ ...c }));
                      }}>
                {RATIOS_CROP.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              <span className="ps-esticar" />

              <button className="ps-b" onClick={() => { setCrop(null); setFerr('mover'); }}>
                Cancelar
              </button>
              <button className="ps-b ps-b--on" onClick={aplicarCrop}>
                Cortar
              </button>
            </>
          ) : (
            <>
              {SELECAO.includes(ferr) && (
                <>
                  <div className="ps-modos">
                    {[
                      ['novo', 'Nova'],
                      ['somar', 'Somar (Ctrl)'],
                      ['subtrair', 'Subtrair (Alt)']
                    ].map(([k, n]) => (
                      <button
                        key={k}
                        className={'ps-modo' + (opts.modo === k ? ' ps-modo--on' : '')}
                        onClick={() => setOpts((o) => ({ ...o, modo: k }))}
                        title={n}
                      >
                        {k === 'novo' && <ModoNovo />}
                        {k === 'somar' && <ModoSomar />}
                        {k === 'subtrair' && <ModoSub />}
                      </button>
                    ))}
                  </div>
                  <span className="ps-sep" />
                </>
              )}

              {(ferr === 'varinha' || ferr === 'selRapida') && (
                <Faixa nome="Tolerância" v={opts.tolerancia} min={1} max={100}
                       set={(v) => setOpts((o) => ({ ...o, tolerancia: v }))} />
              )}

              {(PINTAM.includes(ferr) || ferr === 'selRapida') && (
                <Faixa nome="Tamanho" v={opts.tamanho} min={1} max={300}
                       set={(v) => setOpts((o) => ({ ...o, tamanho: v }))} />
              )}

              {PINTAM.includes(ferr) && (
                <>
                  <Faixa nome="Dureza" v={opts.dureza} min={0} max={100}
                         set={(v) => setOpts((o) => ({ ...o, dureza: v }))} />
                  <Faixa nome="Opacidade" v={opts.opacidade} min={1} max={100}
                         set={(v) => setOpts((o) => ({ ...o, opacidade: v }))} />
                  <Faixa nome="Fluxo" v={opts.fluxo} min={1} max={100}
                         set={(v) => setOpts((o) => ({ ...o, fluxo: v }))} />
                </>
              )}

              {/* A cor só importa quando se pinta numa máscara: ali o branco
                  revela e o preto esconde. No pixel, o pincel usa a cor
                  escolhida como tinta mesmo. */}
              {ferr === 'pincel' && (
                <>
                  <span className="ps-sep" />
                  <Dica texto={naMasc ? 'Branco revela, preto esconde (X troca)' : 'Cor do pincel (X troca)'}>
                    <button
                      className="ps-cor"
                      style={{ background: cor }}
                      onClick={() => setCor((c) => (c === '#ffffff' ? '#000000' : '#ffffff'))}
                      aria-label="Trocar cor"
                    />
                  </Dica>
                </>
              )}

              <span className="ps-esticar" />

              {temSel && (
                <>
                  <button className="ps-b" onClick={inverterSel}>Inverter</button>
                  <button className="ps-b" onClick={selParaMascara}
                          disabled={!ativa || ativa.tipo === 'grupo'}>
                    Virar máscara
                  </button>
                  <button className="ps-b" onClick={desmarcar}>Desmarcar</button>
                </>
              )}
            </>
          )}
        </div>
      )}

      <div className="ps-main">

        {/* ══ A tela ══ */}
        <div className="ps-tela" ref={telaRef}>

          {!temImagem ? (
            <div className="ps-vazio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <p>Abra uma imagem do Histórico, dos Favoritos ou do seu computador para começar a pós-produção.</p>
              <button className="ps-b ps-b--on" onClick={() => setPicker('nova')}>
                Abrir imagem
              </button>
            </div>
          ) : (
            <div
              className="ps-folha"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              onMouseDown={descer}
              onMouseMove={mover}
              onDoubleClick={duploClique}
              data-ferr={ferr}
              data-alca={crop && ferr === 'crop' ? (sobreAlca || 'novo') : undefined}
            >
              <canvas ref={canvasRef} />
              {/* O overlay leva as formiguinhas e o crop. Separá-lo do canvas é
                  o que permite animá-las sem redesenhar a imagem inteira a cada
                  frame. */}
              <canvas ref={overlayRef} className="ps-overlay" />
            </div>
          )}

          {erro && <div className="ps-erro">{erro}</div>}

          {temImagem && (
            <Dica texto="Voltar a 100%" lado="cima">
              <button className="ps-zoom"
                      onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
                {Math.round(zoom * 100)}%
              </button>
            </Dica>
          )}
        </div>

        {/* ══ A coluna ══ */}
        <aside className="ps-col">

          <div className="ps-bloco">
            <button
              className="ps-b ps-b--on ps-b--largo"
              onClick={() => setAjustando(true)}
              disabled={!ativa || ativa.tipo === 'grupo'}
            >Ajustes</button>
          </div>

          {ativa && (
            <div className="ps-bloco">
              <div className="cr-sec ps-sec">Camada</div>

              <div className="ps-linha">
                <label>Mesclagem</label>
                <select className="ps-sel" value={ativa.blend}
                        onChange={(e) => mudar(ativa.id, { blend: e.target.value })}>
                  {BLENDS.map((b) => <option key={b.val} value={b.val}>{b.rotulo}</option>)}
                </select>
              </div>

              <div className="ps-linha">
                <label>Opacidade</label>
                <input type="range" min="0" max="100" value={ativa.opacidade}
                       onChange={(e) => mudar(ativa.id, { opacidade: +e.target.value })}
                       aria-label="Opacidade" />
                <span className="ps-val">{ativa.opacidade}%</span>
              </div>

              <div className="ps-acoes2">
                <button className="ps-b" onClick={rasterizarAtiva}
                        disabled={ativa.tipo === 'grupo'}>
                  Rasterizar
                </button>
              </div>
            </div>
          )}

          <div className="ps-cab">
            <span className="cr-sec ps-sec">Camadas</span>

            <Dica texto={ativa?.mascara ? 'Remover máscara' : 'Adicionar máscara'}>
              <button className="ps-mini" onClick={toggleMascara}
                      disabled={!ativa || ativa.tipo === 'grupo'} aria-label="Máscara">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
                </svg>
              </button>
            </Dica>

            <Dica texto="Nova camada vazia">
              <button className="ps-mini" onClick={novaVazia}
                      disabled={!temImagem} aria-label="Nova camada">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <path d="M12 8v8M8 12h8"/>
                </svg>
              </button>
            </Dica>

            <Dica texto="Duplicar (Ctrl+J)">
              <button className="ps-mini" onClick={duplicar}
                      disabled={!ativa || ativa.tipo === 'grupo'} aria-label="Duplicar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="8" y="8" width="12" height="12" rx="2"/>
                  <path d="M4 16V6a2 2 0 012-2h10"/>
                </svg>
              </button>
            </Dica>

            <Dica texto="Agrupar (Ctrl+G)">
              <button className="ps-mini" onClick={agrupar}
                      disabled={!sel.length} aria-label="Agrupar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
              </button>
            </Dica>

            <Dica texto="Excluir (Delete)">
              <button className="ps-mini ps-mini--perigo" onClick={excluir}
                      disabled={!sel.length} aria-label="Excluir">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>
                </svg>
              </button>
            </Dica>
          </div>

          <div className="ps-camadas">
            {camadas.map((l, i) => {
              const marcada = sel.includes(l.id);
              const naM = alvoMasc === l.id;

              return (
                <div
                  key={l.id}
                  className={'ps-cam'
                    + (marcada ? ' ps-cam--on' : '')
                    + (l.grupo ? ' ps-cam--dentro' : '')
                    + (!l.visivel ? ' ps-cam--off' : '')}
                  onClick={(e) => selecionar(l.id, e)}
                  draggable
                  onDragStart={() => { arrastando.current = i; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => soltar(i)}
                >
                  <button
                    className="ps-olho"
                    onClick={(e) => { e.stopPropagation(); mudar(l.id, { visivel: !l.visivel }); }}
                    aria-label={l.visivel ? 'Ocultar' : 'Mostrar'}
                  >
                    {l.visivel ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M4 4l16 16" strokeLinecap="round"/>
                        <path d="M9.5 5.4A9.6 9.6 0 0112 5c6.5 0 10 6 10 6a15 15 0 01-3.1 3.6M6.6 6.7A15 15 0 002 11s3.5 6 10 6c1 0 2-.15 2.9-.42"/>
                      </svg>
                    )}
                  </button>

                  {l.tipo === 'grupo' ? (
                    <span className="ps-pasta">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                    </span>
                  ) : (
                    <>
                      {/* Qual dos dois está escolhido diz ONDE a próxima
                          pincelada vai cair: no pixel ou na máscara. */}
                      <span
                        className={'ps-thumb' + (marcada && !naM ? ' ps-thumb--sel' : '')}
                        style={{ backgroundImage: `url(${thumb(l)})` }}
                        onClick={(e) => { e.stopPropagation(); setSel([l.id]); setAlvo(null); }}
                      />
                      {l.mascara && (
                        <span
                          className={'ps-thumb ps-thumb--masc' + (naM ? ' ps-thumb--sel' : '')}
                          style={{ backgroundImage: `url(${thumbMascara(l)})` }}
                          onClick={(e) => { e.stopPropagation(); setSel([l.id]); setAlvo(l.id); }}
                        />
                      )}
                    </>
                  )}

                  <span className="ps-nome">{l.nome}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <input type="file" ref={arquivoRef} accept="image/*"
             onChange={escolheuArquivo} style={{ display: 'none' }} />

      {/* A janela de Ajustes recebe o pixel VIRGEM (`original`): sem isso,
          reabri-la partiria da imagem já processada e os efeitos se
          empilhariam sem volta. */}
      {ajustando && ativa && (
        <JanelaAjustes
          camada={{ ...ativa, canvas: ativa.original || ativa.canvas }}
          aoFechar={() => setAjustando(false)}
          aoAplicar={(canvas, params) => {
            guardar();
            mudar(ativa.id, {
              canvas,
              original: ativa.original || ativa.canvas,
              ajustes: params
            });
            setAjustando(false);
          }}
        />
      )}

      {atalhos && <JanelaAtalhos aoFechar={() => setAtalhos(false)} />}

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheuDoPicker}
        titulo={picker === 'camada' ? 'Adicionar camada' : 'Abrir imagem'}
      />
    </section>
  );
}

// ── Um ícone de item de grupo ──
function IconeItem({ it }) {
  if (it.rect) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="4" width="18" height="16" strokeDasharray="3 2"/>
      </svg>
    );
  }
  if (it.elip) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <ellipse cx="12" cy="12" rx="9" ry="8" strokeDasharray="3 2"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round">
      {it.d.split('|').map((p, i) => (
        <path key={i} d={p} strokeDasharray={it.tracejado ? '3 2' : undefined} />
      ))}
    </svg>
  );
}

// ── Um slider da barra de opções ──
function Faixa({ nome, v, min, max, set }) {
  return (
    <span className="ps-faixa">
      <label className="ps-opt-l">{nome}</label>
      <input type="range" min={min} max={max} value={v}
             onChange={(e) => set(+e.target.value)} aria-label={nome} />
      <span className="ps-opt-v">{v}</span>
    </span>
  );
}

// Os três modos de seleção, desenhados: dois quadrados que se encontram.
const ModoNovo = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="4" y="4" width="12" height="12" rx="1"/>
  </svg>
);
const ModoSomar = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="2.5" y="2.5" width="10" height="10" rx="1"/>
    <rect x="7.5" y="7.5" width="10" height="10" rx="1" fill="currentColor" fillOpacity=".25"/>
  </svg>
);
const ModoSub = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
    <rect x="2.5" y="2.5" width="10" height="10" rx="1" fill="currentColor" fillOpacity=".25"/>
    <rect x="7.5" y="7.5" width="10" height="10" rx="1"/>
  </svg>
);
