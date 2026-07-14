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
import MenuCamada from './MenuCamada';
import Confirma from './Confirma';
import Nomear from './Nomear';
import JanelaDesfoque from './JanelaDesfoque';
import { aplicarFiltros, mascaraDoFiltro, nomeDoFiltro, novoIdFiltro } from '../lib/filtros';
import {
  carregarCanvas, canvasVazio, clonarCanvas, novaCamada, novoGrupo,
  compor, thumb, thumbMascara, mascaraBranca, rasterizar, mesclarCopia,
  exportar, fonteDaCamada, largura, altura, apagarForaDoDoc,
  BLENDS, RATIOS_CROP
} from '../lib/pos';
import {
  novaSelecao, selecaoVazia, comporSelecao, modoEfetivo,
  retangulo, elipse, poligono, suavizar, varinha, selecaoRapida,
  tudo as selTudo, inverter as selInverter, tracarContornos,
  pincelada, hexParaRgb, desfocar, desfoqueMovimento
} from '../lib/selecao';
import { tirar, empilhar } from '../lib/historico';
import * as guardarTrabalho from '../lib/guardar';
import { exportarCora, importarCora } from '../lib/cora';
import {
  camadaNoPonto, alcaNoPonto, pontosDasAlcas, moverComEncaixe,
  redimensionar, centralizar, ALCAS
} from '../lib/transformar';

// Os ícones são os do plugin (posIconeSVG) — quem usa os dois reconhece.
const IC = {
  // Abrir e salvar um .crd
  pasta:    'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  disquete: 'M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M7 3v5h8V3|M7 20v-6h10v6',

  // A máscara de camada: o círculo dentro do quadrado. É o ícone do Photoshop —
  // quem vem de lá reconhece sem ler.
  mascara:  'M3 3h18v18H3z|M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',

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

// As ferramentas que têm uma PONTA: elas pintam com um círculo, e precisam do
// anel que mostra onde a tinta (ou a seleção) vai cair.
//
// A seleção rápida é uma delas. Ela é um pincel que pinta seleção em vez de
// cor — e sem o anel, pintar com ela é adivinhar o alcance.
const TEM_PONTA = ['pincel', 'borracha', 'selRapida'];
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

  // ── O menu de contexto ──
  const [menu, setMenu] = useState(null);          // { x, y, id }
  const [renomeando, setRenomeando] = useState(null);  // id da camada em edição

  // ── Os grupos abertos ──
  // Um grupo nasce FECHADO. Agrupar cinco camadas e ver as cinco continuarem
  // ocupando a coluna anularia o sentido de agrupar.
  const [abertos, setAbertos] = useState({});

  // ── A caixa de transformação ──
  // As alças aparecem quando uma camada está marcada e a ferramenta é Mover.
  // As guias de encaixe são efêmeras: só existem durante o arraste.
  const [guias, setGuias] = useState([]);

  // ── O cursor do pincel ──
  // Um círculo do TAMANHO REAL da ponta. Sem ele, pintar é adivinhar: a pessoa
  // não sabe onde a tinta vai cair nem quanto vai cobrir, e erra o alvo.
  const [pincelEm, setPincelEm] = useState(null);   // { x, y } em coords do doc

  // ── O aviso de que abrir fecha o trabalho ──
  const [confirmando, setConfirmando] = useState(false);

  // ── A caixinha do corte ──
  // Marcada por padrão, como no Photoshop: cortar normalmente APAGA o excesso.
  // Desmarcada, o pixel de fora fica guardado e a camada pode ser arrastada
  // para revelá-lo de novo.
  const [apagarCortado, setApagarCortado] = useState(true);

  // ── O trabalho guardado ──
  // Se houver um rascunho da sessão passada, a pessoa é convidada a voltar de
  // onde parou. Restaurar sem perguntar seria pior: quem veio começar outra
  // coisa acharia a tela ocupada por um trabalho velho.
  const [rascunho, setRascunho] = useState(null);   // { quando } ou null
  const [salvando, setSalvando] = useState(false);
  const turno = useRef(0);          // qual salvamento é o mais recente

  // O seletor de arquivo .crd, escondido: um <input type=file> nativo é feio,
  // e o botão da barra o aciona por baixo dos panos.
  const arquivoCora = useRef(null);

  // O nome do arquivo, perguntado antes de salvar. Só quando o navegador não
  // tem o seletor nativo — ele já pergunta o nome sozinho, e perguntar duas
  // vezes seria um passo a mais sem motivo.
  const [nomeando, setNomeando] = useState(null);

  // A janela de desfoque: 'desfGauss' | 'desfMov' | null
  const [desfocando, setDesfocando] = useState(null);

  // Qual filtro está sendo REEDITADO. Quando não é nulo, o OK substitui aquele
  // filtro na lista em vez de acrescentar um novo — senão reabrir um desfoque
  // para ajustar o raio criaria um segundo desfoque por cima do primeiro.
  const [editandoFiltro, setEditandoFiltro] = useState(null);

  // A prévia do desfoque vive num canvas à parte, e some ao cancelar. Aplicar na
  // camada a cada movimento do slider a destruiria — e o Cancelar não teria o
  // que restaurar.
  const previaRef = useRef(null);
  const [ratio, setRatio] = useState('livre');

  // ── O histórico ──
  const [pilha, setPilha] = useState([]);

  // ── O encaixe ──
  //
  // "100%" significa VER A IMAGEM INTEIRA, não 1 pixel do documento = 1 pixel
  // da tela. Um render de 4000px a 1:1 apareceria com um quarto dele visível, e
  // a pessoa teria que afastar antes de fazer qualquer coisa — ninguém começa a
  // trabalhar assim.
  //
  // Então `zoom` é um MULTIPLICADOR do encaixe: zoom 1 = cabe na tela.
  const [encaixe, setEncaixe] = useState(1);
  const escala = encaixe * zoom;

  const telaRef   = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const arrastando = useRef(null);

  // Estado vivo do gesto em curso. Refs, não estado: eles mudam a cada
  // mousemove, e não devem provocar renderização.
  const gesto = useRef({ ativo: false, pts: [], ret: null, ultimo: null, poli: [] });
  const pixCache = useRef({ id: null, dados: null });

  const ativa = camadas.find((l) => l.id === sel[0]) || null;
  const temImagem = camadas.length > 0;

  // ═══ O encaixe ═══
  // Recalcula quando a imagem muda de tamanho ou a janela é redimensionada.
  useEffect(() => {
    if (!med) return;

    function medir() {
      const el = telaRef.current;
      if (!el) return;

      // A folga deixa a imagem respirar: encostada nas bordas, ela parece
      // espremida, e não há onde pegar para arrastar a tela.
      // A barra de opções flutua sobre o topo da tela (44px + 10 de folga). Sem
      // reservar esse espaço, a imagem encaixada nasceria com a borda de cima
      // escondida atrás dos botões.
      const FOLGA = 72;
      const BARRA = 56;

      const w = el.clientWidth  - FOLGA;
      const h = el.clientHeight - FOLGA - BARRA;
      if (w <= 0 || h <= 0) return;

      // Nunca AMPLIA: uma imagem pequena não deve ser esticada até encher a
      // tela — ela ficaria borrada e daria a impressão de má qualidade.
      setEncaixe(Math.min(1, w / med.w, h / med.h));
    }

    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [med]);

  // ═══ Compor ═══
  useEffect(() => {
    if (!med || !canvasRef.current) return;

    // Com uma prévia de desfoque em curso, é ELA que vai para a tela — não a
    // camada. Compor a camada crua aqui apagaria a prévia a cada re-render, e a
    // janela pareceria não fazer nada.
    if (previaRef.current && ativa) {
      // A prévia usa um canvas reduzido; a escala compensa para a camada não
      // encolher na tela (ver aplicarDesfoque).
      const compensa = ativa.canvas.width / previaRef.current.width;

      const finge = camadas.map((l) => (
        l.id === ativa.id
          ? {
              ...l,
              canvas: previaRef.current,
              escala: l.escala * compensa,
              escalaY: (l.escalaY != null ? l.escalaY : l.escala) * compensa
            }
          : l
      ));
      compor(finge, med.w, med.h, canvasRef.current);
      return;
    }

    compor(camadas, med.w, med.h, canvasRef.current);
  }, [camadas, med, ativa]);

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
        cx.lineWidth = 1 / escala;    // a linha não engorda com o zoom
        cx.setLineDash([4 / escala, 4 / escala]);
        cx.beginPath();

        if (g.ret) {
          const x = Math.min(g.ret.x0, g.ret.x1);
          const y = Math.min(g.ret.y0, g.ret.y1);
          const w = Math.abs(g.ret.x1 - g.ret.x0);
          const h = Math.abs(g.ret.y1 - g.ret.y0);
          if (ferr === 'elip') cx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          else cx.rect(x, y, w, h);
        }

        // ── O laço à mão livre ──
        //
        // Só o traço percorrido. A reta de fechamento NÃO é desenhada durante o
        // gesto: ela ficaria ancorada no ponto inicial, varrendo a imagem atrás
        // do cursor como um elástico — poluindo justamente a área que se está
        // tentando contornar. O laço fecha sozinho ao soltar; até lá, o que se
        // vê é o que a mão fez.
        if (ferr === 'laco' && g.pts.length > 1) {
          cx.moveTo(g.pts[0].x, g.pts[0].y);
          for (let i = 1; i < g.pts.length; i++) cx.lineTo(g.pts[i].x, g.pts[i].y);
        }

        // ── O poligonal ──
        //
        // As arestas já fixadas, mais UMA linha elástica do último vértice até o
        // cursor: é a aresta que o próximo clique vai criar.
        //
        // Sem a reta de volta ao primeiro ponto, pelo mesmo motivo do laço: ela
        // cruzaria a imagem inteira a cada movimento do mouse.
        if (ferr === 'lacoPoli' && g.poli.length) {
          cx.moveTo(g.poli[0].x, g.poli[0].y);
          for (let i = 1; i < g.poli.length; i++) cx.lineTo(g.poli[i].x, g.poli[i].y);

          if (g.ultimo) cx.lineTo(g.ultimo.x, g.ultimo.y);
        }

        cx.strokeStyle = '#000';
        cx.stroke();
        cx.strokeStyle = '#fff';
        cx.lineDashOffset = 4 / escala;
        cx.stroke();

        // Os vértices do poligonal, para saber onde clicar de novo
        if (ferr === 'lacoPoli' && g.poli.length) {
          cx.setLineDash([]);
          cx.fillStyle = '#fff';
          cx.strokeStyle = '#000';
          for (const pt of g.poli) {
            cx.beginPath();
            cx.arc(pt.x, pt.y, 3.5 / escala, 0, Math.PI * 2);
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

        // As formiguinhas. A 60ms por passo elas rastejavam; a 30ms com passo
        // maior elas andam, e a seleção fica viva sem virar um piscar nervoso.
        if (ts - ultimo > 30) { offset += 1; ultimo = ts; }

        cx.save();
        cx.lineWidth = 1 / escala;
        cx.beginPath();
        for (const path of contornoRef.current) {
          cx.moveTo(path[0][0], path[0][1]);
          for (let i = 1; i < path.length; i++) cx.lineTo(path[i][0], path[i][1]);
        }
        cx.setLineDash([4 / escala, 4 / escala]);
        cx.strokeStyle = '#000';
        cx.lineDashOffset = -offset;
        cx.stroke();
        cx.strokeStyle = '#fff';
        cx.lineDashOffset = -offset + 4 / escala;
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
        cx.lineWidth = 1.5 / escala;
        cx.setLineDash([]);
        cx.strokeRect(x, y, w, h);

        // Os terços: a regra de composição mais usada que existe
        cx.globalAlpha = .5;
        cx.lineWidth = .7 / escala;
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
        const s = 5 / escala;
        cx.fillStyle = '#fff';
        cx.strokeStyle = 'rgba(0,0,0,.5)';
        cx.lineWidth = 1 / escala;

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

      // ── A caixa de transformação ──
      //
      // Quadradinhos nos cantos e nos meios, como em qualquer editor. Sem eles
      // não há como saber que a camada é redimensionável — e a pessoa tentaria
      // arrastar a borda sem que nada acontecesse.
      if (ferr === 'mover' && !crop && ativa && ativa.tipo !== 'grupo') {
        const bx = ativa.x;
        const by = ativa.y;
        const bw = largura(ativa);
        const bh = altura(ativa);

        cx.save();
        cx.setLineDash([]);
        cx.strokeStyle = 'rgba(120,120,255,.9)';
        cx.lineWidth = 1.2 / escala;
        cx.strokeRect(bx, by, bw, bh);

        // O tamanho é dividido pela escala para que, NA TELA, as alças tenham
        // sempre o mesmo tamanho — a 20%, alças fixas seriam pontos invisíveis.
        const s = 4.5 / escala;
        const pts = pontosDasAlcas(ativa);

        cx.fillStyle = '#fff';
        cx.strokeStyle = 'rgba(90,90,200,.95)';
        cx.lineWidth = 1 / escala;

        for (const a of ALCAS) {
          const [hx, hy] = pts[a];
          cx.beginPath();
          cx.rect(hx - s, hy - s, s * 2, s * 2);
          cx.fill();
          cx.stroke();
        }
        cx.restore();
      }

      // ── As guias de encaixe ──
      //
      // Elas EXPLICAM a trava. Sem a linha, a camada "pularia" sozinha e
      // pareceria um defeito; com ela, fica claro que encostou no centro.
      if (guias.length) {
        cx.save();
        cx.strokeStyle = '#FF3D8A';    // rosa: não se confunde com nada na imagem
        cx.lineWidth = 1 / escala;
        cx.setLineDash([]);

        for (const g of guias) {
          cx.beginPath();
          if (g.eixo === 'x') {
            cx.moveTo(g.em, 0);
            cx.lineTo(g.em, med.h);
          } else {
            cx.moveTo(0, g.em);
            cx.lineTo(med.w, g.em);
          }
          cx.stroke();
        }
        cx.restore();
      }

      // ── O anel do pincel ──
      //
      // Ele mostra o TAMANHO REAL da ponta, no lugar exato onde a tinta vai
      // cair. É desenhado em duas cores — preto por dentro, branco por fora —
      // porque um anel de cor única desaparece sobre imagens da mesma cor.
      if (TEM_PONTA.includes(ferr) && pincelEm && !crop) {
        const r = opts.tamanho;

        cx.save();
        cx.setLineDash([]);
        cx.lineWidth = 1 / escala;

        cx.beginPath();
        cx.arc(pincelEm.x, pincelEm.y, r, 0, Math.PI * 2);
        cx.strokeStyle = 'rgba(0,0,0,.75)';
        cx.stroke();

        cx.beginPath();
        cx.arc(pincelEm.x, pincelEm.y, r + 1 / escala, 0, Math.PI * 2);
        cx.strokeStyle = 'rgba(255,255,255,.75)';
        cx.stroke();

        // Com dureza baixa a borda é toda esfumada, e o anel de fora mentiria
        // sobre onde a tinta é sólida. O anel interno mostra o miolo.
        if (opts.dureza < 95) {
          const miolo = r * (opts.dureza / 100);
          if (miolo > 1.5 / escala) {
            cx.beginPath();
            cx.arc(pincelEm.x, pincelEm.y, miolo, 0, Math.PI * 2);
            cx.strokeStyle = 'rgba(0,0,0,.28)';
            cx.stroke();
          }
        }
        cx.restore();
      }

      raf = requestAnimationFrame(pintar);
    }

    raf = requestAnimationFrame(pintar);
    return () => cancelAnimationFrame(raf);
  }, [med, temSel, crop, ferr, escala, camadas, sel, guias, pincelEm, opts, ativa]);

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
        // A camada nova entra CENTRALIZADA, e encolhida se não couber. Entrar em
        // (0,0) esconderia metade dela atrás da borda quando fosse maior que a
        // base — e pareceria que nada aconteceu.
        const pos = centralizar(c, med.w, med.h);

        const l = novaCamada(c, nome || `Camada ${camadas.length + 1}`, pos);
        setCamadas((cs) => [l, ...cs]);
        setSel([l.id]);

        // E já com a Mover na mão: quem acabou de trazer uma imagem quer
        // POSICIONÁ-LA. Ter que ir buscar a ferramenta antes é um passo a mais
        // que ninguém pediu.
        setFerr('mover');
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

  // A última clicada sem modificador. É a âncora do intervalo do Shift — sem
  // guardá-la, "do primeiro ao último" não teria de onde partir.
  const ancora = useRef(null);

  function selecionar(id, e) {
    // ── Shift: o INTERVALO ──
    // Clicar na primeira e Shift-clicar na última pega tudo entre as duas. É o
    // gesto de qualquer lista, e sem ele marcar dez camadas exige dez cliques.
    if (e?.shiftKey && ancora.current) {
      const i = camadas.findIndex((l) => l.id === ancora.current);
      const j = camadas.findIndex((l) => l.id === id);

      if (i >= 0 && j >= 0) {
        const [de, ate] = i < j ? [i, j] : [j, i];

        // As escondidas (dentro de grupo fechado) entram também: o intervalo é
        // o que está ENTRE as duas na pilha, não só o que se vê.
        setSel(camadas.slice(de, ate + 1).map((l) => l.id));
        setAlvo(null);
        return;
      }
    }

    // ── Ctrl: alterna uma ──
    if (e?.metaKey || e?.ctrlKey) {
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      ancora.current = id;
      return;
    }

    // ── Clique simples ──
    setSel([id]);
    setAlvo(null);
    ancora.current = id;
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
      return;
    }

    // ── Com uma seleção ativa, ela VIRA a máscara ──
    //
    // É o gesto do Photoshop: seleciona-se o sofá, clica-se na máscara, e o
    // fundo some — sem ter sido apagado. O pixel continua lá, e um pincel de
    // branco na máscara o traz de volta.
    //
    // Ignorar a seleção aqui obrigaria a pessoa a apagar com Delete, e aí o
    // recorte 3px curto no braço do sofá não teria conserto.
    if (temSel && selRef.current) {
      const m  = canvasVazio(ativa.canvas.width, ativa.canvas.height);
      const mc = m.getContext('2d');

      // Preto esconde. A seleção pinta de branco por cima o que deve aparecer.
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
      return;
    }

    // Sem seleção, a máscara nasce toda branca: nada escondido, pronta para ser
    // pintada do zero.
    mudar(ativa.id, { mascara: mascaraBranca(ativa.canvas.width, ativa.canvas.height) });
    setAlvo(ativa.id);
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

    // O grupo nasce FECHADO. Agrupar cinco camadas e ver as cinco continuarem
    // ocupando a coluna anularia o motivo de ter agrupado.
    setAbertos((a) => ({ ...a, [g.id]: false }));
    setSel([g.id]);
  }

  function duplicar() {
    if (!ativa || ativa.tipo === 'grupo') return;
    guardar();

    // ── Com uma seleção ativa, duplica SÓ ela ──
    //
    // É o Ctrl+J do Photoshop: a parte selecionada vira uma camada nova, e o
    // resto não vem junto. Copiar a camada inteira quando há uma seleção
    // ignoraria justamente o que a pessoa acabou de marcar.
    if (temSel && selRef.current) {
      const c  = canvasVazio(med.w, med.h);
      const cx = c.getContext('2d');

      // A camada, já no espaço do documento
      cx.drawImage(fonteDaCamada(ativa), ativa.x, ativa.y,
                   largura(ativa), altura(ativa));

      // E recortada pela seleção. O `destination-in` guarda só o que cai dentro
      // dela — inclusive as bordas suaves, que chegam meio transparentes.
      cx.globalCompositeOperation = 'destination-in';
      cx.drawImage(selRef.current, 0, 0);
      cx.globalCompositeOperation = 'source-over';

      const l = novaCamada(c, ativa.nome + ' cópia', {
        blend: ativa.blend,
        opacidade: ativa.opacidade,
        grupo: ativa.grupo
      });

      const i = camadas.findIndex((x) => x.id === ativa.id);
      setCamadas((cs) => [...cs.slice(0, i), l, ...cs.slice(i)]);
      setSel([l.id]);
      return;
    }

    const l = novaCamada(clonarCanvas(ativa.canvas), ativa.nome + ' cópia', {
      x: ativa.x, y: ativa.y,
      escala: ativa.escala, escalaY: ativa.escalaY,
      blend: ativa.blend, opacidade: ativa.opacidade,
      mascara: ativa.mascara ? clonarCanvas(ativa.mascara) : null,
      original: ativa.original ? clonarCanvas(ativa.original) : null,
      smart: ativa.smart,          // a cópia de um objeto inteligente também é um
      ajustes: ativa.ajustes,
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

  // ── Objeto inteligente ──
  //
  // Rasterizada, a camada É os pixels: um ajuste os reescreve, e não há volta.
  // Como objeto inteligente, o pixel original fica guardado — os Ajustes viram
  // uma receita reaplicável, e escalar e voltar não degrada a imagem.
  function virarSmart() {
    if (!ativa || ativa.tipo === 'grupo' || ativa.smart) return;
    guardar();

    mudar(ativa.id, {
      smart: true,
      // O original é o que torna tudo reversível. Se a camada já foi ajustada,
      // ele já existe; senão, o pixel de agora é o original.
      original: ativa.original || clonarCanvas(ativa.canvas)
    });
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

  // ═══ Arrastar na coluna ═══
  //
  // O arraste antigo era às cegas: pegava-se uma camada, soltava-se, e torcia-
  // se para ter acertado. Agora a linha de destino se ANUNCIA antes de soltar.
  //
  // Há três destinos possíveis, e a diferença importa:
  //   - entre duas camadas  -> reordena
  //   - sobre a barra de um grupo -> entra NO grupo
  //   - fora de um grupo    -> sai dele
  const [alvoSolta, setAlvoSolta] = useState(null);   // { i, onde } onde: 'cima'|'baixo'|'dentro'

  // Qual linha está no ar. É ESTADO, não ref: a classe que a deixa fantasma
  // precisa de uma renderização para aparecer, e um ref não provoca nenhuma.
  const [voando, setVoando] = useState(null);

  function ondeCai(e, i, l) {
    const r = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - r.top;

    // Sobre a barra de um grupo, a faixa do meio significa "entra aqui". As
    // pontas continuam reordenando — senão seria impossível pôr uma camada
    // logo ACIMA de um grupo.
    if (l.tipo === 'grupo' && y > r.height * 0.25 && y < r.height * 0.75) {
      return { i, onde: 'dentro' };
    }

    return { i, onde: y < r.height / 2 ? 'cima' : 'baixo' };
  }

  function arrastaSobre(e, i, l) {
    e.preventDefault();
    if (arrastando.current == null) return;

    const a = ondeCai(e, i, l);
    if (!alvoSolta || alvoSolta.i !== a.i || alvoSolta.onde !== a.onde) {
      setAlvoSolta(a);
    }
  }

  function soltar() {
    const origem = arrastando.current;
    const alvo = alvoSolta;

    arrastando.current = null;
    setVoando(null);
    setAlvoSolta(null);

    if (origem == null || !alvo) return;
    if (origem === alvo.i) return;

    guardar();

    setCamadas((cs) => {
      const c = [...cs];
      const l = c[origem];
      if (!l) return cs;

      // Um grupo viaja com os filhos: arrastar a barra e deixar as camadas para
      // trás seria quebrar o grupo sem pedir.
      const bloco = l.tipo === 'grupo'
        ? [l, ...c.filter((x) => x.grupo === l.id)]
        : [l];

      const ids = new Set(bloco.map((x) => x.id));
      const resto = c.filter((x) => !ids.has(x.id));

      // O índice de destino é recalculado DEPOIS de tirar o bloco: os índices
      // antigos já não valem, e usá-los jogaria a camada no lugar errado.
      const destino = c[alvo.i];
      if (!destino) return cs;

      // Um grupo não pode cair dentro de si mesmo, nem um filho dentro do
      // próprio pai que está viajando junto: o resultado seria uma referência
      // circular, e a camada sumiria da coluna para sempre.
      if (ids.has(destino.id)) return cs;

      let j = resto.findIndex((x) => x.id === destino.id);
      if (j < 0) j = resto.length;

      if (alvo.onde === 'dentro' && destino.tipo === 'grupo') {
        // Entra no grupo: vira filho, e cai logo abaixo da barra dele.
        const dentro = bloco.map((x) => {
          if (x.tipo === 'grupo') return x;
          if (l.tipo === 'grupo' && x.grupo === l.id) return x;   // filho: fica
          return { ...x, grupo: destino.id };
        });
        return [...resto.slice(0, j + 1), ...dentro, ...resto.slice(j + 1)];
      }

      // Fora de grupo. Se a camada cai ao lado de uma que TEM grupo, ela herda
      // o grupo — é o que o olho espera ao ver a linha aparecer lá dentro.
      const herda = destino.tipo === 'grupo' ? null : (destino.grupo || null);

      // Mas os FILHOS do grupo arrastado não herdam nada: eles já pertencem ao
      // grupo que está viajando. Reatribuí-los ao destino romperia o grupo — e
      // arrastar a barra de um grupo passaria a desmontá-lo.
      const solto = bloco.map((x) => {
        if (x.tipo === 'grupo') return x;
        if (l.tipo === 'grupo' && x.grupo === l.id) return x;   // filho: fica
        return { ...x, grupo: herda };
      });

      const k = alvo.onde === 'cima' ? j : j + 1;
      return [...resto.slice(0, k), ...solto, ...resto.slice(k)];
    });
  }

  // ═══ O menu de contexto ═══
  function abrirMenu(e, l) {
    e.preventDefault();
    e.stopPropagation();

    // Clicar com o direito numa camada NÃO marcada troca a seleção para ela.
    // Agir sobre outra coisa que não a clicada seria traição.
    if (!sel.includes(l.id)) {
      setSel([l.id]);
      setAlvo(null);
    }

    setMenu({ x: e.clientX, y: e.clientY, id: l.id });
  }

  function acaoDoMenu(acao) {
    const l = camadas.find((x) => x.id === menu?.id);

    if (acao === 'renomear')      { setRenomeando(menu.id); return; }
    if (acao === 'smart')         { virarSmart(); return; }
    if (acao === 'rasterizar')    { rasterizarAtiva(); return; }
    if (acao === 'mascara')       { toggleMascara(); return; }
    if (acao === 'duplicar')      { duplicar(); return; }
    if (acao === 'duplicar-tudo') { duplicarVarias(); return; }
    if (acao === 'mesclar-copia') { mesclar(); return; }
    if (acao === 'agrupar')       { agrupar(); return; }
    if (acao === 'nova-vazia')    { novaVazia(); return; }
    if (acao === 'tirar-grupo')   { tirarDoGrupo(); return; }
    if (acao === 'excluir')       { excluir(); return; }
  }

  // Duplicar VÁRIAS de uma vez. A de cima é duplicada por último para que a
  // pilha saia na mesma ordem em que entrou.
  function duplicarVarias() {
    if (!sel.length) return;
    guardar();

    setCamadas((cs) => {
      const novas = [];

      for (const l of cs) {
        if (!sel.includes(l.id) || l.tipo === 'grupo') continue;

        novas.push(novaCamada(clonarCanvas(l.canvas), l.nome + ' cópia', {
          x: l.x, y: l.y,
          escala: l.escala, escalaY: l.escalaY,
          blend: l.blend, opacidade: l.opacidade,
          mascara:  l.mascara  ? clonarCanvas(l.mascara)  : null,
          original: l.original ? clonarCanvas(l.original) : null,
          smart: l.smart,
          ajustes: l.ajustes,
          grupo: l.grupo
        }));
      }

      return [...novas, ...cs];
    });
  }

  // Tirar do grupo sem arrastar. A camada sobe para logo acima da barra do
  // grupo: é onde ela estaria se tivesse sido arrastada para fora.
  function tirarDoGrupo() {
    if (!sel.length) return;
    guardar();

    setCamadas((cs) => {
      const saindo = cs.filter((l) => sel.includes(l.id) && l.grupo);
      if (!saindo.length) return cs;

      const ids = new Set(saindo.map((l) => l.id));
      const resto = cs.filter((l) => !ids.has(l.id));

      // Cada uma sai para logo acima do grupo em que estava
      let saida = [...resto];

      for (const l of saindo.slice().reverse()) {
        const i = saida.findIndex((x) => x.id === l.grupo);
        const onde = i < 0 ? 0 : i;
        saida = [...saida.slice(0, onde), { ...l, grupo: null }, ...saida.slice(onde)];
      }

      return saida;
    });
  }

  function renomear(id, nome) {
    const n = (nome || '').trim();
    if (n) mudar(id, { nome: n });
    setRenomeando(null);
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
    if (espaco.current) return;          // e com o espaço, o esquerdo também é
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

    // ── As alças de transformação ──
    //
    // Elas vêm ANTES de tudo: uma alça fica em cima da imagem, e se o teste da
    // camada rodasse primeiro, puxar a alça viraria arrastar a camada.
    if (ferr === 'mover' && ativa && ativa.tipo !== 'grupo') {
      const a = alcaNoPonto(ativa, p, escala);

      if (a) {
        guardar();
        g.ativo = true;
        g.alcaT = a;
        g.transDe = {
          x: ativa.x, y: ativa.y,
          w: largura(ativa), h: altura(ativa)
        };
        return;
      }
    }

    // ── Clicar na imagem pega a camada ──
    //
    // Sem isto seria preciso caçar a camada na coluna antes de mexer nela — e
    // numa pilha de dez, com nomes iguais, ninguém sabe qual é qual. O olho já
    // sabe: é a que está debaixo do cursor.
    //
    // Só vale com a ferramenta Mover: com o pincel na mão, clicar deve PINTAR.
    if (ferr === 'mover') {
      const alvo = camadaNoPonto(camadas, p);

      if (alvo) {
        // Shift soma à seleção, como na coluna
        if (e.shiftKey) {
          setSel((s) => (s.includes(alvo.id) ? s : [...s, alvo.id]));
        } else if (!sel.includes(alvo.id)) {
          setSel([alvo.id]);
          setAlvo(null);
        }

        guardar();
        g.ativo = true;
        g.moveDe = { x: p.x, y: p.y, lx: alvo.x, ly: alvo.y, id: alvo.id };
        return;
      }

      // Clicou no vazio: desmarca
      setSel([]);
      return;
    }

    // ── O laço poligonal: cada clique põe um vértice ──
    if (ferr === 'lacoPoli') {
      g.poli.push(p);
      g.modo = modoEfetivo(e, opts.modo);
      return;
    }

    // Só as ferramentas que LEEM ou ESCREVEM pixels precisam de uma camada: a
    // varinha e a seleção rápida leem, o pincel e a borracha escrevem.
    //
    // O letreiro e o laço são geometria pura sobre o DOCUMENTO. Exigir uma
    // camada deles travava a seleção: bastava clicar fora, a camada perdia a
    // marca, e o letreiro parava de responder para sempre.
    const PRECISA_CAMADA = ['varinha', 'selRapida', 'pincel', 'borracha',
                            'desfGauss', 'desfMov'];
    if (PRECISA_CAMADA.includes(ferr) && !ativa) return;

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

    // ── A seleção rápida SOMA por natureza ──
    //
    // Ela é um pincel: pinta-se um trecho, solta-se, pinta-se outro, e a seleção
    // cresce. Exigir Ctrl entre cada pincelada tornaria inútil justamente o
    // gesto que a define — e no Photoshop ela também é aditiva por padrão.
    //
    // O Alt continua subtraindo: é como se corrige o que a ferramenta pegou a
    // mais, e sem isso não haveria conserto.
    if (ferr === 'selRapida' && g.modo === 'novo' && temSel) {
      g.modo = 'somar';
    }

    // ── A seleção antiga sai NA HORA ──
    //
    // Ela só era limpa ao soltar o botão. Durante o arraste, a antiga continuava
    // na tela junto com a nova — e o que se via não era o que ia acontecer.
    //
    // Só no modo `novo`: com Ctrl (somar) ou Alt (subtrair), a antiga é
    // justamente a base sobre a qual se desenha.
    if (SELECAO.includes(ferr) && g.modo === 'novo' && temSel) {
      selRef.current = novaSelecao(med.w, med.h);
      contornoRef.current = null;
      setTemSel(false);
    }

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
      // O snapshot NÃO é tirado aqui. A camada ainda não mudou — o traço vive
      // num canvas à parte até o botão ser solto. Guardar agora criaria um
      // ponto de desfazer para um estado idêntico ao anterior, e o Ctrl+Z
      // gastaria um passo sem fazer nada.
      pintar(p, true);
      return;
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

    // O anel do pincel segue o mouse mesmo sem botão apertado: é uma MIRA, e
    // uma mira que só aparece depois do disparo não serve para nada.
    if (TEM_PONTA.includes(ferr)) {
      setPincelEm(paraDoc(e));
    }

    // Parado com a Mover na mão, o cursor conta o que aquele ponto faz: uma
    // alça redimensiona, a camada arrasta, o vazio não faz nada.
    if (ferr === 'mover' && !g.ativo && !crop) {
      const p0 = paraDoc(e);

      let dica = null;
      if (ativa && ativa.tipo !== 'grupo') dica = alcaNoPonto(ativa, p0, escala);
      if (!dica && camadaNoPonto(camadas, p0)) dica = 'mover';

      if (dica !== sobreAlca) setSobreAlca(dica);
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
        const w = x1 - x0;
        const h = y1 - y0;

        let nx = x0 + dx;
        let ny = y0 + dy;

        // ── As travas ──
        // Enquadrar "no olho" no centro é impossível: a mão erra por um ou dois
        // pixels, e o corte sai torto sem que se saiba por quê. Alt as solta.
        const gs = [];

        if (!e.altKey) {
          const tol = 7 / escala;

          // Os alvos: as bordas e o centro da imagem
          const ax = [0, (med.w - w) / 2, med.w - w];   // já em posição de canto
          const ay = [0, (med.h - h) / 2, med.h - h];

          for (const a of ax) {
            if (Math.abs(nx - a) < tol) {
              nx = a;
              // A guia é desenhada onde ela SIGNIFICA algo: no centro, se for o
              // centro; na borda, se for a borda.
              gs.push({ eixo: 'x', em: a === 0 ? 0 : (a === med.w - w ? med.w : med.w / 2) });
              break;
            }
          }

          for (const a of ay) {
            if (Math.abs(ny - a) < tol) {
              ny = a;
              gs.push({ eixo: 'y', em: a === 0 ? 0 : (a === med.h - h ? med.h : med.h / 2) });
              break;
            }
          }
        }

        // E a moldura nunca sai da imagem: fora dela não corta nada.
        nx = Math.max(0, Math.min(med.w - w, nx));
        ny = Math.max(0, Math.min(med.h - h, ny));

        const igual = gs.length === guias.length
          && gs.every((x, i) => guias[i] && x.eixo === guias[i].eixo && x.em === guias[i].em);
        if (!igual) setGuias(gs);

        setCrop({ x0: nx, y0: ny, x1: nx + w, y1: ny + h });
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

      // ── Shift ──
      //
      // Segurar Shift força o quadrado (e, na elipse, o CÍRCULO perfeito). Sem
      // isto, desenhar um círculo à mão é impossível: ele sempre sai um ovo.
      //
      // O lado que manda é o maior dos dois — assim a forma acompanha o cursor
      // em vez de encolher quando a mão se afasta na diagonal.
      if (e.shiftKey) {
        const dx = p.x - g.ret.x0;
        const dy = p.y - g.ret.y0;
        const lado = Math.max(Math.abs(dx), Math.abs(dy));

        g.ret.x1 = g.ret.x0 + Math.sign(dx || 1) * lado;
        g.ret.y1 = g.ret.y0 + Math.sign(dy || 1) * lado;
      }
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

      // A seleção precisa APARECER enquanto se pinta, não só ao soltar.
      //
      // O overlay só desenha a seleção firmada quando `temSel` é verdadeiro — e
      // ele só virava verdadeiro no `subir`. Até lá, a pessoa pintava às cegas,
      // sem saber o que estava pegando.
      if (!temSel) setTemSel(true);
      return;
    }

    if (PINTAM.includes(ferr)) {
      pintar(p, false);
      return;
    }

    // ── Redimensionar pela alça ──
    if (g.alcaT && ativa) {
      const r = redimensionar(ativa, g.alcaT, p, g.transDe, e.shiftKey);
      mudar(ativa.id, r);
      return;
    }

    // ── Arrastar a camada, com as travas ──
    if (g.moveDe) {
      const l = camadas.find((c) => c.id === g.moveDe.id);
      if (!l) return;

      const bruto = {
        x: g.moveDe.lx + (p.x - g.moveDe.x),
        y: g.moveDe.ly + (p.y - g.moveDe.y)
      };

      // Alt solta as travas. Às vezes é justamente 2px fora do centro que se
      // quer, e uma trava sem escapatória vira uma prisão.
      if (e.altKey) {
        mudar(l.id, bruto);
        setGuias([]);
        return;
      }

      const r = moverComEncaixe(l, bruto.x, bruto.y, camadas, med.w, med.h, escala);
      mudar(l.id, { x: r.x, y: r.y });

      // As guias só mudam de verdade de vez em quando; comparar antes de gravar
      // evita re-renderizar a cada pixel do arraste.
      const igual = r.guias.length === guias.length
        && r.guias.every((x, i) => guias[i] && x.eixo === guias[i].eixo && x.em === guias[i].em);
      if (!igual) setGuias(r.guias);
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
      const w = Math.abs(g.ret.x1 - g.ret.x0);
      const h = Math.abs(g.ret.y1 - g.ret.y0);

      // Um CLIQUE, e não um arraste: a moldura nasceu com tamanho zero. No
      // Photoshop isso desmarca — e é o gesto natural de quem quer largar a
      // seleção e continuar com a mesma ferramenta na mão.
      //
      // Mas só se não estiver somando nem subtraindo: com Ctrl apertado, um
      // clique perdido não deveria apagar o trabalho todo.
      if (w < 2 && h < 2) {
        if (g.modo === 'novo' && temSel) desmarcar();
        g.ret = null;
        return;
      }

      guardar();
      const fn = ferr === 'ret' ? retangulo : elipse;
      fn(selRef.current, g.modo, g.ret);
      contornoRef.current = null;
      setTemSel(!selecaoVazia(selRef.current));
      g.ret = null;
    }

    else if (ferr === 'laco') {
      // Um traço curto demais para ser uma forma é um clique: desmarca.
      if (g.pts.length <= 2) {
        if (g.modo === 'novo' && temSel) desmarcar();
        g.pts = [];
        return;
      }

      guardar();
      // O laço FECHA sozinho: uma reta liga o último ponto ao primeiro, mesmo
      // que a mão não tenha voltado exatamente ao começo. Ninguém consegue
      // fechar um contorno no pixel exato — e exigir isso seria cruel.
      poligono(selRef.current, g.modo, suavizar(g.pts));
      contornoRef.current = null;
      setTemSel(!selecaoVazia(selRef.current));
    }

    else if (ferr === 'selRapida') {
      setTemSel(!selecaoVazia(selRef.current));
      pixCache.current = { id: null, dados: null };
    }

    else if (PINTAM.includes(ferr)) {
      // O traço só agora vai para a camada — é aqui que a opacidade vira teto.
      guardar();
      fecharTraco();
      pixCache.current = { id: null, dados: null };
    }

    g.pts = [];
    g.ultimo = null;
    g.moveDe = null;
    g.alcaT = null;
    g.transDe = null;

    // As guias somem quando o arraste acaba: elas dizem "está encaixando
    // AGORA", e mantê-las depois seria mentira.
    if (guias.length) setGuias([]);
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
  // ── O pincel ──
  //
  // O traço inteiro é pintado num canvas À PARTE, e só é aplicado na camada
  // quando o botão do mouse é solto.
  //
  // Isso não é um detalhe de implementação: é o que separa OPACIDADE de FLUXO.
  //
  //   O fluxo   acumula DENTRO do traço. Passar duas vezes no mesmo lugar,
  //             sem soltar, escurece — é a tinta se depositando.
  //   A opacidade é o TETO do traço inteiro. Por mais que se vá e volte, o
  //             traço nunca passa dela.
  //
  // Pintando direto na camada, os dois viravam a mesma coisa: os carimbos se
  // somavam e um traço com opacidade 50 saía a 99% depois de dez sobreposições.
  // Com a camada intermediária, o fluxo age lá dentro e a opacidade só entra na
  // hora de compor.
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
    // que ela guarda é quanto se vê. Apagar ali é pintar de PRETO.
    const ehBorracha = ferr === 'borracha';
    const removeAlfa = ehBorracha && !naMascara;
    const tinta = ehBorracha && naMascara ? '0,0,0' : hexParaRgb(cor);

    // O traço nasce no primeiro toque e vive até o botão ser solto.
    if (inicio || !g.traco) {
      g.traco = canvasVazio(canvas.width, canvas.height);
      g.tracoAlvo = canvas;
      g.tracoRemove = removeAlfa;
    }

    // A pincelada vai para o traço SEM a opacidade — só com o fluxo. A opacidade
    // é aplicada uma única vez, ao compor, e é isso que a torna um teto.
    pincelada(g.traco, de, pc, {
      raio,
      dureza: opts.dureza,
      opacidade: 100,          // o teto entra depois, na composição
      fluxo: opts.fluxo,
      cor: tinta,
      apagar: false            // o traço só DESENHA; remover é coisa da aplicação
    });

    g.ultimoPt = pc;

    // A tela mostra o resultado ao vivo, sem tocar na camada real.
    if (canvasRef.current) comporComTraco();
  }

  // O traço em curso, composto por cima da camada — só para os olhos. A camada
  // real só é tocada quando o botão é solto.
  function comporComTraco() {
    if (!canvasRef.current) return;

    const g = gesto.current;
    compor(camadas, med.w, med.h, canvasRef.current);

    if (!g.traco || !ativa) return;

    // O traço está no espaço da CAMADA; a tela, no do documento.
    const cx = canvasRef.current.getContext('2d');
    cx.save();
    cx.globalAlpha = opts.opacidade / 100;

    // A borracha em curso precisa mostrar o buraco que vai abrir.
    if (g.tracoRemove) cx.globalCompositeOperation = 'destination-out';

    cx.drawImage(g.traco, ativa.x, ativa.y, largura(ativa), altura(ativa));
    cx.restore();
  }

  // ── Aplicar o traço na camada ──
  //
  // Chamado ao soltar o botão. É aqui que a opacidade vira o teto: o traço
  // inteiro é composto DE UMA VEZ, com um único `globalAlpha`.
  function fecharTraco() {
    const g = gesto.current;
    if (!g.traco || !g.tracoAlvo) return;

    const traco = g.traco;
    const alvo = g.tracoAlvo;

    g.traco = null;
    g.tracoAlvo = null;

    // A seleção recorta o traço: o que cai fora dela não é pintado.
    if (temSel && selRef.current && ativa) {
      const recorte = canvasVazio(alvo.width, alvo.height);
      const rc = recorte.getContext('2d');

      // A seleção está em coordenadas do DOCUMENTO; o traço, nas da CAMADA.
      rc.save();
      rc.scale(alvo.width / largura(ativa), alvo.height / altura(ativa));
      rc.translate(-ativa.x, -ativa.y);
      rc.drawImage(selRef.current, 0, 0);
      rc.restore();

      const tc = traco.getContext('2d');
      tc.globalCompositeOperation = 'destination-in';
      tc.drawImage(recorte, 0, 0);
      tc.globalCompositeOperation = 'source-over';
    }

    const cc = alvo.getContext('2d');
    cc.save();

    // A OPACIDADE, uma única vez, sobre o traço inteiro.
    cc.globalAlpha = opts.opacidade / 100;

    // A borracha REMOVE por onde o traço passou; o pincel SOMA.
    if (g.tracoRemove) cc.globalCompositeOperation = 'destination-out';

    cc.drawImage(traco, 0, 0);
    cc.restore();

    g.tracoRemove = false;

    // ── A pincelada ASSA a receita ──
    //
    // O canvas de uma camada com filtros é o RESULTADO de aplicá-los ao
    // original. Pintar nele e deixar a receita de pé é uma armadilha: ao reabrir
    // qualquer filtro, o canvas seria recalculado do original — e a pincelada
    // sumiria, sem aviso.
    //
    // Então pintar torna os filtros permanentes: o resultado atual vira o novo
    // original, a lista é esvaziada, e a tinta entra por cima. A camada continua
    // inteligente; ela só perde o histórico de filtros que já não pode honrar.
    //
    // (O Photoshop simplesmente PROÍBE pintar num objeto inteligente. Preferi
    // deixar pintar e assumir o custo — é o que a mão espera.)
    if (ativa) {
      if (ativa.smart && ativa.filtros?.length) {
        mudar(ativa.id, {
          original: clonarCanvas(alvo),
          filtros: []
        });
      } else {
        mudar(ativa.id, {});      // só avisa que o canvas mudou
      }
    }

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


  // ═══ O desfoque ═══
  // ═══ Os filtros inteligentes ═══

  // De onde a janela de Ajustes parte.
  //
  // Reeditando um filtro, ela parte do original com todos os OUTROS aplicados:
  // o desfoque que veio antes continua valendo, e só o ajuste em questão é
  // recalculado. Partir do canvas atual empilharia o ajuste sobre ele mesmo.
  function baseParaAjustes() {
    if (!ativa) return null;

    if (ativa.smart && ativa.original) {
      const outros = (ativa.filtros || []).filter((f) => f.id !== editandoFiltro);
      return aplicarFiltros(ativa.original, outros);
    }

    return ativa.original || ativa.canvas;
  }


  // Reabrir um filtro: a janela volta com os valores dele, e o OK o SUBSTITUI.
  function reabrirFiltro(idCamada, f) {
    setSel([idCamada]);
    setEditandoFiltro(f.id);

    if (f.tipo === 'ajustes') setAjustando(true);
    else setDesfocando(f.tipo);
  }

  // O olho do filtro. Ele não apaga a receita: só a pula ao recalcular. É como
  // se compara "com" e "sem" sem perder o que se ajustou.
  function ligarFiltro(idCamada, idFiltro) {
    const l = camadas.find((x) => x.id === idCamada);
    if (!l?.original) return;

    guardar();

    const lista = l.filtros.map((f) => (
      f.id === idFiltro ? { ...f, desligado: !f.desligado } : f
    ));

    mudar(idCamada, {
      filtros: lista,
      canvas: aplicarFiltros(l.original, lista)
    });
  }

  function tirarFiltro(idCamada, idFiltro) {
    const l = camadas.find((x) => x.id === idCamada);
    if (!l?.original) return;

    guardar();

    const lista = l.filtros.filter((f) => f.id !== idFiltro);

    mudar(idCamada, {
      filtros: lista,
      canvas: aplicarFiltros(l.original, lista)
    });
  }

  // ── O desfoque ──
  //
  // A janela mostra o resultado ao vivo, e a camada só é tocada no OK.
  //
  // `firmar = false` é a PRÉVIA: composta na tela, mas a camada continua intacta
  // — é o que permite cancelar sem perder nada.
  // `firmar = true` é o OK: aí a camada muda e o Ctrl+Z passa a valer.
  //
  // O `useCallback` NÃO é enfeite. A janela tem um efeito que depende desta
  // função; se ela nascesse de novo a cada render do painel, o efeito dispararia
  // a cada quadro — e um desfoque por quadro é uma aba travada.
  const aplicarDesfoque = useCallback((params, firmar) => {
    if (!ativa || ativa.tipo === 'grupo') return;

    // Sem parâmetros: a prévia foi desligada, ou a janela cancelada. Devolve a
    // tela ao estado da camada.
    if (!params) {
      previaRef.current = null;
      if (canvasRef.current) compor(camadas, med.w, med.h, canvasRef.current);
      return;
    }

    // ── De onde partir ──
    //
    // Reeditando um filtro de um objeto inteligente, parte-se do que existiria
    // SEM ele: o original com todos os OUTROS filtros aplicados. Partir do
    // canvas atual desfocaria por cima do desfoque que se está justamente
    // tentando corrigir — e baixar o raio de 8 para 4 sairia MAIS borrado.
    let base = ativa.canvas;

    if (ativa.smart && ativa.original) {
      const outros = (ativa.filtros || []).filter((f) => f.id !== editandoFiltro);
      base = aplicarFiltros(ativa.original, outros);
    }

    // ── A prévia trabalha numa CÓPIA REDUZIDA ──
    //
    // Uma camada 4K tem 9 milhões de pixels. Desfocá-la inteira leva segundos —
    // e o slider dispara um novo desfoque a cada 80ms, empilhando trabalho que
    // nunca termina. Foi assim que a janela travou a aba.
    //
    // Mas a prévia é vista NA TELA, que tem uns mil pixels de largura. Calcular
    // os outros oito milhões é jogar fora. O OK, sim, trabalha na resolução
    // cheia — ali o resultado é definitivo e vale a espera.
    const TETO = 1400;
    const reduz = firmar ? 1 : Math.min(1, TETO / base.width);

    const cw = Math.max(1, Math.round(base.width  * reduz));
    const ch = Math.max(1, Math.round(base.height * reduz));

    const c = canvasVazio(cw, ch);
    c.getContext('2d').drawImage(base, 0, 0, cw, ch);

    // A seleção precisa vir para o espaço da camada, ou o desfoque vazaria por
    // fora dela.
    let sl = null;
    if (temSel && selRef.current) {
      sl = canvasVazio(cw, ch);
      const sc = sl.getContext('2d');
      sc.save();
      sc.scale(cw / largura(ativa), ch / altura(ativa));
      sc.translate(-ativa.x, -ativa.y);
      sc.drawImage(selRef.current, 0, 0);
      sc.restore();
    }

    // O raio é dado em pixels da TELA. Aqui ele vira pixels DESTE canvas — que
    // pode estar reduzido. É por isso que a prévia bate com o resultado final:
    // o raio encolhe junto com a imagem.
    const fator = cw / largura(ativa);
    const r = Math.max(0.5, params.raio * fator);

    if (desfocando === 'desfGauss') desfocar(c, r, sl);
    else desfoqueMovimento(c, r, params.angulo || 0, sl);

    // ── A PRÉVIA: só a tela muda ──
    if (!firmar) {
      previaRef.current = c;

      if (canvasRef.current) {
        // O canvas da prévia é MENOR que o real (reduzido para não travar). Mas
        // `largura(l)` é `canvas.width × escala` — então, trocando só o canvas,
        // a camada encolheria na tela junto com ele. Era por isso que a imagem
        // diminuía ao abrir a janela.
        //
        // A escala é multiplicada pelo quanto o canvas encolheu, devolvendo à
        // camada o tamanho de antes. O borrão disfarça a perda de resolução —
        // que é justamente o ponto de reduzir.
        const compensa = ativa.canvas.width / c.width;

        const finge = camadas.map((l) => (
          l.id === ativa.id
            ? {
                ...l,
                canvas: c,
                escala: l.escala * compensa,
                escalaY: (l.escalaY != null ? l.escalaY : l.escala) * compensa
              }
            : l
        ));
        compor(finge, med.w, med.h, canvasRef.current);
      }
      return;
    }

    // ── O OK ──
    guardar();
    previaRef.current = null;

    // Num OBJETO INTELIGENTE, o filtro não é carimbado no pixel: ele é anotado
    // numa lista, e o resultado é recalculado a partir do original.
    //
    // É o que torna a edição não-destrutiva: amanhã se pode voltar neste
    // desfoque, mudar o raio, e tudo o mais continua de pé.
    if (ativa.smart) {
      const virgem = ativa.original || ativa.canvas;
      const antigos = ativa.filtros || [];

      // Reabrindo um filtro que já existe? Ele é SUBSTITUÍDO no lugar, e a
      // máscara dele é mantida — mexer no raio não deveria mudar onde ele age.
      const velho = editandoFiltro
        ? antigos.find((f) => f.id === editandoFiltro)
        : null;

      const filtro = {
        id: velho ? velho.id : novoIdFiltro(),
        tipo: desfocando,
        raio: params.raio,
        angulo: params.angulo || 0,
        mascara: velho
          ? velho.mascara
          : (temSel && selRef.current
              ? mascaraDoFiltro(selRef.current, ativa, largura(ativa), altura(ativa))
              : null)
      };

      const lista = velho
        ? antigos.map((f) => (f.id === velho.id ? filtro : f))
        : [...antigos, filtro];

      mudar(ativa.id, {
        original: virgem,                        // o virgem, guardado
        filtros: lista,                          // a receita
        canvas: aplicarFiltros(virgem, lista)    // o resultado
      });

      setEditandoFiltro(null);
      return;
    }

    // Numa camada comum, o filtro carimba o pixel. Sem volta — é o que
    // "rasterizado" quer dizer.
    mudar(ativa.id, { canvas: c, original: null });
  }, [ativa, camadas, med, temSel, desfocando, editandoFiltro, guardar, mudar]);

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
    const t = ALCA / escala;

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

  // ── A barra do crop ──

  function trocarRatio(r) {
    setRatio(r);
    if (!crop || r === 'livre' || !med) return;

    // Ao escolher uma proporção, a moldura nasce CENTRADA e do maior tamanho que
    // cabe. É o enquadramento que quase sempre se quer — e de onde é fácil sair
    // arrastando, se não for.
    const [a, b] = r.split(':').map(Number);

    let w = med.w;
    let h = (w * b) / a;

    if (h > med.h) {
      h = med.h;
      w = (h * a) / b;
    }

    const nx = (med.w - w) / 2;
    const ny = (med.h - h) / 2;

    setCrop({ x0: nx, y0: ny, x1: nx + w, y1: ny + h });
  }

  // Digitar um número muda a moldura a partir do canto de cima-esquerda: é o
  // ponto que a pessoa está vendo como origem.
  function cropPorNumero(w, h) {
    if (!crop) return;

    const x0 = Math.min(crop.x0, crop.x1);
    const y0 = Math.min(crop.y0, crop.y1);

    let nw = w != null ? w : Math.abs(crop.x1 - crop.x0);
    let nh = h != null ? h : Math.abs(crop.y1 - crop.y0);

    // Com proporção travada, mexer num lado arrasta o outro junto — senão o
    // select diria "16:9" e a moldura seria outra coisa.
    if (ratio !== 'livre') {
      const [a, b] = ratio.split(':').map(Number);
      if (w != null) nh = (nw * b) / a;
      else           nw = (nh * a) / b;
    }

    nw = Math.max(8, Math.min(med.w - x0, nw));
    nh = Math.max(8, Math.min(med.h - y0, nh));

    setCrop({ x0, y0, x1: x0 + nw, y1: y0 + nh });
  }

  // Inverter é o gesto de quem tinha 16:9 e quer 9:16 sem procurar no select.
  function inverterCrop() {
    if (!crop) return;

    const x0 = Math.min(crop.x0, crop.x1);
    const y0 = Math.min(crop.y0, crop.y1);
    const w = Math.abs(crop.x1 - crop.x0);
    const h = Math.abs(crop.y1 - crop.y0);

    // A proporção acompanha: 16:9 vira 9:16.
    if (ratio !== 'livre') {
      const [a, b] = ratio.split(':');
      const virado = `${b}:${a}`;
      if (RATIOS_CROP.includes(virado)) setRatio(virado);
    }

    const nw = Math.min(h, med.w - x0);
    const nh = Math.min(w, med.h - y0);

    setCrop({ x0, y0, x1: x0 + nw, y1: y0 + nh });
  }

  // Limpar devolve a moldura à imagem inteira — sem sair do modo de corte.
  function limparCrop() {
    if (!med) return;
    setRatio('livre');
    setCrop({ x0: 0, y0: 0, x1: med.w, y1: med.h });
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

    // Cortar muda o DOCUMENTO, não cada camada.
    //
    // As camadas são deslocadas e o documento encolhe. Elas continuam inteiras,
    // transbordando para fora da nova borda — e a composição, que é desenhada
    // num canvas do tamanho do documento, simplesmente não pinta o que passa.
    //
    // Quem decide se o excesso morre é a caixinha, exatamente como no Photoshop:
    //   marcada    -> `apagarForaDoDoc` reescreve o canvas de cada camada
    //   desmarcada -> o pixel fica guardado; arrastar a camada o revela de novo
    setCamadas((cs) => {
      const movidas = cs.map((l) => (
        l.tipo === 'grupo' ? l : { ...l, x: l.x - x, y: l.y - y }
      ));

      if (!apagarCortado) return movidas;

      return movidas
        .map((l) => apagarForaDoDoc(l, w, h))
        .filter(Boolean);                    // as que ficaram inteiras de fora somem
    });

    setMed({ w, h });

    selRef.current = novaSelecao(w, h);
    contornoRef.current = null;
    setTemSel(false);

    setCrop(null);
    setFerr('mover');
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // A dica de cursor é escrita pela Mover e pelo corte. Ao trocar de ferramenta
  // ela ficava grudada — e o laço herdava a setinha de "mover", porque a regra
  // do `data-alca` no CSS vence a do `data-ferr`.
  useEffect(() => {
    if (ferr !== 'mover' && ferr !== 'crop') setSobreAlca(null);
  }, [ferr]);

  // ═══ O trabalho guardado ═══

  // Ao entrar, procura um rascunho da sessão passada.
  useEffect(() => {
    let vivo = true;

    guardarTrabalho.existe().then((tem) => {
      if (vivo && tem) setRascunho(true);
    });

    return () => { vivo = false; };
  }, []);

  // Salva sozinho, sempre que o trabalho muda.
  //
  // Com uma espera: salvar a cada pincelada gravaria PNGs de 4K dezenas de vezes
  // por segundo e travaria tudo. Dois segundos parados é sinal de que a pessoa
  // terminou o gesto — e é aí que vale guardar.
  useEffect(() => {
    if (!temImagem || !med || !camadas.length) return;

    const t = setTimeout(async () => {
      // Dois salvamentos podem se cruzar: um começa, a pessoa mexe de novo, e o
      // segundo dispara antes de o primeiro terminar. Se o VELHO terminasse por
      // último, ele gravaria por cima do novo — e o trabalho voltaria no tempo.
      //
      // O selo resolve: cada salvamento anota a sua vez, e só grava se ainda for
      // o mais recente quando chegar a hora de escrever.
      const meuTurno = ++turno.current;

      setSalvando(true);

      try {
        await guardarTrabalho.salvar(camadas, med, selRef.current,
                                    () => turno.current === meuTurno);
      } catch (e) {
        // Um disco cheio, ou uma aba anônima sem IndexedDB, não podem derrubar
        // o editor. O trabalho segue na memória.
      } finally {
        if (turno.current === meuTurno) setSalvando(false);
      }
    }, 2000);

    return () => clearTimeout(t);
  }, [camadas, med, temImagem]);

  async function restaurar() {
    setRascunho(null);
    setOcupado(true);

    try {
      const t = await guardarTrabalho.carregar();
      if (!t) return;

      setCamadas(t.camadas);
      setMed(t.med);

      // A seleção volta junto: ela costuma custar trabalho — uma varinha
      // ajustada, um laço traçado à mão — e refazê-la é o que mais irrita.
      selRef.current = t.selecao || novaSelecao(t.med.w, t.med.h);
      contornoRef.current = null;
      setTemSel(t.selecao ? !selecaoVazia(t.selecao) : false);

      setSel(t.camadas.length ? [t.camadas[0].id] : []);
      setPilha([]);
      setFerr('mover');
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch (e) {
      setErro('Não foi possível recuperar o trabalho guardado.');
    } finally {
      setOcupado(false);
    }
  }

  // ═══ O arquivo .crd ═══

  function exportar() {
    if (!temImagem || !med) return;

    // O nome sugerido é o da camada de baixo — quase sempre a imagem original,
    // e o que a pessoa reconhece como "o projeto".
    const sugerido = camadas.length
      ? camadas[camadas.length - 1].nome
      : 'trabalho';

    // O seletor nativo do sistema já pergunta o nome e a pasta. Onde ele não
    // existe, perguntamos aqui — senão o arquivo cairia em Downloads com um
    // nome que ninguém escolheu.
    if (window.showSaveFilePicker) {
      salvarCora(sugerido);
    } else {
      setNomeando(sugerido);
    }
  }

  async function salvarCora(nome) {
    setNomeando(null);
    setOcupado(true);

    try {
      await exportarCora(camadas, med, temSel ? selRef.current : null, nome);
    } catch (e) {
      setErro('Não foi possível salvar o arquivo.');
    } finally {
      setOcupado(false);
    }
  }

  async function importar(e) {
    const f = e.target.files?.[0];
    e.target.value = '';          // permite reabrir o MESMO arquivo depois
    if (!f) return;

    setOcupado(true);
    setErro('');

    try {
      const t = await importarCora(f);

      setCamadas(t.camadas);
      setMed(t.med);

      selRef.current = t.selecao || novaSelecao(t.med.w, t.med.h);
      contornoRef.current = null;
      setTemSel(t.selecao ? !selecaoVazia(t.selecao) : false);

      setSel(t.camadas.length ? [t.camadas[0].id] : []);
      setPilha([]);
      setFerr('mover');
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRascunho(null);
    } catch (err) {
      setErro(err.message || 'Não foi possível abrir o arquivo.');
    } finally {
      setOcupado(false);
    }
  }

  function descartarRascunho() {
    setRascunho(null);
    guardarTrabalho.apagar().catch(() => {});
  }

  // ═══ Zoom e pan ═══
  //
  // O pan lê e escreve o `pan` por REF, não pelo estado. Com `[pan]` nas deps, o
  // efeito se re-registrava a cada quadro do arraste — e o listener trocava
  // debaixo do gesto em curso, que engasgava ou parava.
  const panRef = useRef({ x: 0, y: 0 });
  useEffect(() => { panRef.current = pan; }, [pan]);

  // ── A barra de espaço ──
  //
  // Segurar espaço vira a mão: o botão esquerdo passa a arrastar a tela, sem
  // largar a ferramenta que está na mão. É o gesto do Photoshop, e o único que
  // funciona num trackpad — onde não existe botão do meio.
  //
  // É um REF, não estado: o `descer` precisa lê-lo no instante do clique, e um
  // estado ainda não teria chegado lá.
  const espaco = useRef(false);
  const [comEspaco, setComEspaco] = useState(false);   // só para o cursor

  useEffect(() => {
    const desce = (e) => {
      if (e.code !== 'Space' || espaco.current) return;

      const alvo = e.target.tagName;
      if (alvo === 'INPUT' || alvo === 'TEXTAREA' || alvo === 'SELECT') return;

      // Sem isto a página rola: o espaço é o "page down" do navegador.
      e.preventDefault();
      espaco.current = true;
      setComEspaco(true);
    };

    const sobe = (e) => {
      if (e.code !== 'Space') return;
      espaco.current = false;
      setComEspaco(false);
    };

    // Se a janela perde o foco com o espaço apertado, o `keyup` nunca chega — e
    // a mão ficaria presa para sempre.
    const perdeu = () => { espaco.current = false; setComEspaco(false); };

    window.addEventListener('keydown', desce);
    window.addEventListener('keyup', sobe);
    window.addEventListener('blur', perdeu);

    return () => {
      window.removeEventListener('keydown', desce);
      window.removeEventListener('keyup', sobe);
      window.removeEventListener('blur', perdeu);
    };
  }, []);

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
      // Duas formas de arrastar a tela: o botão do meio, e o espaço + esquerdo.
      const meio    = e.button === 1;
      const comMao  = e.button === 0 && espaco.current;
      if (!meio && !comMao) return;

      // Sem isto, o botão do meio dispara o AUTOSCROLL do navegador: aparece o
      // ícone de rolagem, a página tenta se mover sozinha, e o arraste nunca
      // chega aqui.
      e.preventDefault();
      e.stopPropagation();

      movendo = true;
      ini = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    };

    const move = (e) => {
      if (!movendo) return;
      e.preventDefault();
      setPan({ x: e.clientX - ini.x, y: e.clientY - ini.y });
    };

    const sobe = (e) => {
      if (!movendo) return;
      movendo = false;
      e.preventDefault();
    };

    // O `auxclick` é o clique do botão do meio depois do mouseup. Ele também
    // abre o autoscroll em alguns navegadores, e precisa ser barrado.
    const aux = (e) => { if (e.button === 1) e.preventDefault(); };

    el.addEventListener('wheel', rolar, { passive: false });
    el.addEventListener('mousedown', desce);
    el.addEventListener('auxclick', aux);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', sobe);

    return () => {
      el.removeEventListener('wheel', rolar);
      el.removeEventListener('mousedown', desce);
      el.removeEventListener('auxclick', aux);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', sobe);
    };
  }, []);

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

      // A tecla é lida por `code`, não por `key`.
      //
      // No Windows, Ctrl+Alt é o AltGr — e o AltGr produz um CARACTERE. Num
      // teclado ABNT, Ctrl+Alt+E não devolve "e" em `e.key`: devolve outra
      // coisa, ou nada. Era por isso que o Ctrl+Alt+E nunca funcionava.
      //
      // O `code` é a tecla FÍSICA. Ela não muda com o modificador nem com o
      // layout.
      const tecla = (e.code || '').replace('Key', '').toLowerCase();

      if (ctrl) {
        // As combinações mais específicas vêm PRIMEIRO. Testar Ctrl+A antes de
        // Ctrl+Shift+A faz o segundo nunca chegar — o primeiro casa e retorna.
        if (e.shiftKey && tecla === 'a') { e.preventDefault(); setAjustando(true); return; }
        // Ctrl+Shift+I é OBJETO INTELIGENTE — é o do plugin, e a mão já sabe.
        if (e.shiftKey && tecla === 'i') { e.preventDefault(); virarSmart(); return; }
        if (e.shiftKey && tecla === 'r') { e.preventDefault(); rasterizarAtiva(); return; }
        // Inverter a seleção fica no X: o I já tem dono.
        if (e.shiftKey && tecla === 'x') { e.preventDefault(); inverterSel(); return; }
        if (e.altKey   && tecla === 'e') { e.preventDefault(); mesclar(); return; }

        if (tecla === 'z') { e.preventDefault(); desfazer(); return; }
        if (tecla === 'a') { e.preventDefault(); selecionarTudo(); return; }
        if (tecla === 'd') { e.preventDefault(); desmarcar(); return; }
        if (tecla === 'j') { e.preventDefault(); duplicar(); return; }
        if (tecla === 'g') { e.preventDefault(); agrupar(); return; }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') { excluir(); return; }
      // Esc desfaz o que estiver em curso, na ordem em que se espera abandonar:
      // primeiro o gesto, depois a seleção, e por fim a própria ferramenta.
      if (e.key === 'Escape') {
        if (crop)                            { setCrop(null); setFerr('mover'); }
        else if (gesto.current.poli.length)  { gesto.current.poli = []; }
        else if (temSel)                     { desmarcar(); }
        else if (ferr !== 'mover')           { setFerr('mover'); }   // volta ao repouso
        else                                 { setSel([]); }          // e desmarca a camada
        return;
      }
      if (e.key === 'Enter' && crop) { aplicarCrop(); return; }

      if (tecla === 'v') setFerr('mover');
      if (tecla === 'm') setFerr((f) => (f === 'ret' ? 'elip' : 'ret'));
      if (tecla === 'l') setFerr((f) => (f === 'laco' ? 'lacoPoli' : 'laco'));
      if (tecla === 'w') setFerr((f) => (f === 'selRapida' ? 'varinha' : 'selRapida'));
      if (tecla === 'b') setFerr('pincel');
      if (tecla === 'e') setFerr('borracha');
      if (tecla === 'c') abrirCrop();
      // X troca a cor do pincel: é o gesto de quem pinta numa máscara e precisa
      // alternar entre esconder e revelar sem tirar a mão do teclado.
      if (tecla === 'x') setCor((c) => (c === '#ffffff' ? '#000000' : '#ffffff'));
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

        <button
          className="ps-b ps-b--on"
          onClick={() => (temImagem ? setConfirmando(true) : setPicker('nova'))}
          disabled={ocupado}
        >Abrir imagem</button>

        <Dica texto="Adicionar camada">
          <button className="ps-ic" onClick={() => setPicker('camada')}
                  disabled={!temImagem} aria-label="Adicionar camada">
            <Svg d={IC.mais} />
          </button>
        </Dica>

        {/* Abrir um .crd. Ele fica colado no + porque as duas coisas trazem
            trabalho para dentro: uma imagem nova, ou um trabalho já começado. */}
        <Dica texto="Abrir um projeto (.crd)">
          <button className="ps-ic" onClick={() => arquivoCora.current?.click()}
                  disabled={ocupado} aria-label="Abrir projeto">
            <Svg d={IC.pasta} />
          </button>
        </Dica>

        <input
          type="file" ref={arquivoCora} accept=".crd,.coraproj,.cora"
          onChange={importar} style={{ display: 'none' }}
        />

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
                    if (g.acao) setDesfocando(it.id);
                    else setFerr(it.id);
                  }}
                  // O botão direito no ícone abre o grupo. É o gesto do
                  // Photoshop — e mirar no triângulo, que tem uns poucos pixels,
                  // é um exercício de pontaria que ninguém pediu.
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!temImagem) return;
                    setAberto((a) => ({ [g.grupo]: !a[g.grupo] }));
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
                onClick={() => setAberto((a) => ({ [g.grupo]: !a[g.grupo] }))}
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
                          if (g.acao) setDesfocando(i.id);
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

        <Dica texto="Salvar o projeto (.crd)">
          <button className="ps-ic" onClick={exportar}
                  disabled={!temImagem || ocupado} aria-label="Salvar projeto">
            <Svg d={IC.disquete} />
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


      <div className="ps-main">

        {/* ══ A tela ══ */}
        {/* Clicar no VAZIO ao redor da imagem desmarca. Este handler tem que
            estar aqui, na tela, e não na folha: a folha É a imagem, e o branco
            em volta dela nunca receberia o clique. */}
        <div
          className="ps-tela"
          ref={telaRef}
          data-mao={comEspaco ? '1' : undefined}
          onMouseDown={(e) => {
            if (espaco.current) return;   // com o espaço, o clique é da mão
            if (e.target !== e.currentTarget) return;   // caiu na imagem, não aqui

            // O branco em volta da imagem é o "fora". Clicar nele larga o que
            // estiver marcado — a seleção, ou a camada.
            if (temSel) desmarcar();
            else if (ferr === 'mover') {
              setSel([]);
              setAlvo(null);
            }
          }}
        >

        {/* ══ A barra de opções ══
            Ela existe quando a ferramenta tem o que ajustar — ou quando há uma
            seleção ativa, que precisa de algum lugar de onde ser invertida ou
            desfeita, mesmo que a mão já tenha trocado de ferramenta. */}
        {temImagem && (mostraOpcoes || crop || temSel) && (
          <div className="ps-opts">

            {crop ? (
              <>
                <select
                  className="ps-sel ps-sel--min"
                  value={ratio}
                  onChange={(e) => trocarRatio(e.target.value)}
                >
                  {RATIOS_CROP.map((r) => (
                    <option key={r} value={r}>{r === 'livre' ? 'Livre' : r}</option>
                  ))}
                </select>

                {/* Os números. Cortar "no olho" não serve quando o destino tem
                    medida certa — um post, um slide, uma impressão. */}
                <input
                  type="number"
                  className="ps-num"
                  value={Math.round(Math.abs(crop.x1 - crop.x0))}
                  onChange={(e) => cropPorNumero(+e.target.value, null)}
                  aria-label="Largura"
                />

                <Dica texto="Inverter largura e altura">
                  <button className="ps-troca" onClick={inverterCrop} aria-label="Inverter">
                    ⇄
                  </button>
                </Dica>

                <input
                  type="number"
                  className="ps-num"
                  value={Math.round(Math.abs(crop.y1 - crop.y0))}
                  onChange={(e) => cropPorNumero(null, +e.target.value)}
                  aria-label="Altura"
                />

                <button className="ps-b" onClick={limparCrop}>Limpar</button>

                <Dica texto="Desmarque para poder arrastar a camada e revelar o que ficou de fora">
                  <label className="ps-caixa">
                    <input
                      type="checkbox"
                      checked={apagarCortado}
                      onChange={(e) => setApagarCortado(e.target.checked)}
                    />
                    <span>Apagar pixels cortados</span>
                  </label>
                </Dica>

                <span className="ps-esticar" />

                <button className="ps-b" onClick={() => { setCrop(null); setFerr('mover'); }}>
                  Cancelar
                </button>
                <button className="ps-b ps-b--on" onClick={aplicarCrop}>
                  Aplicar corte
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
                    <LinhaCor cor={cor} setCor={setCor} naMasc={naMasc} />
                  </>
                )}

              </>
            )}

            {/* ── As ações da seleção ──
                Elas ficam FORA do bloco da ferramenta: uma seleção continua ativa
                depois de trocar para a Mover, e os botões sumirem junto com o
                letreiro deixava a seleção sem como ser invertida ou desfeita. */}
            {!crop && temSel && (
              <>
                <span className="ps-esticar" />
                <button className="ps-b" onClick={inverterSel}>Inverter seleção</button>

                {/* Virar máscara. Ele é ação da CAMADA, e por isso vive no painel de
                    camadas — mas com uma seleção na mão, o gesto que se quer é este, e
                    obrigar a atravessar a tela até o outro painel seria um desvio. */}
                <button className="ps-b" onClick={toggleMascara}
                        disabled={!ativa || ativa.tipo === 'grupo'}>
                  Virar máscara
                </button>

                <button className="ps-b" onClick={desmarcar}>Desmarcar</button>
              </>
            )}
          </div>
        )}

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

              {/* O trabalho da sessão passada. Ele é OFERECIDO, não imposto: quem
                  veio começar outra coisa não deveria achar a tela ocupada. */}
              {rascunho && (
                <div className="ps-volta">
                  <span>Você tem um trabalho não terminado.</span>
                  <div className="ps-volta-b">
                    <button className="ps-b ps-b--on" onClick={restaurar}>
                      Continuar de onde parei
                    </button>
                    <button className="ps-b" onClick={descartarRascunho}>
                      Descartar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="ps-folha"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${escala})`,
                // O xadrez é dividido pela escala para não crescer com o zoom
                '--xadrez': `${10 / escala}px`
              }}
              onMouseDown={descer}
              onMouseMove={mover}
              onMouseLeave={() => setPincelEm(null)}
              onDoubleClick={duploClique}
              data-ferr={ferr}
              data-alca={sobreAlca || undefined}
            >
              <canvas ref={canvasRef} />
              {/* O overlay leva as formiguinhas e o crop. Separá-lo do canvas é
                  o que permite animá-las sem redesenhar a imagem inteira a cada
                  frame. */}
              <canvas ref={overlayRef} className="ps-overlay" />
            </div>
          )}

          {erro && <div className="ps-erro">{erro}</div>}

          {/* O aviso de que está guardando. Sem ele, ninguém saberia que o
              trabalho está seguro — e a dúvida é justamente o que faz a pessoa
              hesitar em fechar a aba. */}
          {temImagem && salvando && (
            <span className="ps-salvando">Guardando…</span>
          )}

          {temImagem && (
            <Dica texto="Enquadrar a imagem" lado="cima">
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

          {/* O bloco da Camada é FIXO. Ele sumir quando nada está marcado faria a
              coluna inteira saltar — e apagar uma camada empurraria os Ajustes
              para cima debaixo do cursor. Sem camada, ele só fica inerte. */}
          <div className={'ps-bloco' + (!ativa ? ' ps-bloco--inerte' : '')}>
            <div className="cr-sec ps-sec">Camada</div>

            <div className="ps-linha">
              <label>Mesclagem</label>
              <select
                className="ps-sel"
                value={ativa ? ativa.blend : 'source-over'}
                disabled={!ativa}
                onChange={(e) => mudar(ativa.id, { blend: e.target.value })}
              >
                {BLENDS.map((b) => <option key={b.val} value={b.val}>{b.rotulo}</option>)}
              </select>
            </div>

            <div className="ps-linha">
              <label>Opacidade</label>
              <input
                type="range" min="0" max="100"
                value={ativa ? ativa.opacidade : 100}
                disabled={!ativa}
                onChange={(e) => mudar(ativa.id, { opacidade: +e.target.value })}
                aria-label="Opacidade"
              />
              <span className="ps-val">{ativa ? ativa.opacidade : 100}%</span>
            </div>
          </div>

          <div className="ps-cab">
            <span className="cr-sec ps-sec">Camadas</span>

            <Dica texto={
              ativa?.mascara ? 'Remover máscara'
              : temSel       ? 'A seleção vira máscara'
              :                'Adicionar máscara'
            }>
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

          <div
            className="ps-camadas"
            onDragOver={(e) => e.preventDefault()}
            onDrop={soltar}
          >
            {camadas.map((l, i) => {
              // Uma camada dentro de um grupo FECHADO não aparece. É esse o
              // sentido de fechar: recolher, não só recuar um pouco.
              if (l.grupo && !abertos[l.grupo]) return null;

              const marcada = sel.includes(l.id);
              const naM = alvoMasc === l.id;
              const filhos = l.tipo === 'grupo'
                ? camadas.filter((x) => x.grupo === l.id).length
                : 0;

              const alvo = alvoSolta && alvoSolta.i === i ? alvoSolta.onde : null;

              return (
                <div
                  key={l.id}
                  className={'ps-bloco'
                    + (marcada ? ' ps-bloco--on' : '')
                    + (l.grupo ? ' ps-bloco--dentro' : '')}
                >
                <div
                  className={'ps-cam'
                    + (marcada ? ' ps-cam--on' : '')
                    + (l.grupo ? ' ps-cam--dentro' : '')
                    + (!l.visivel ? ' ps-cam--off' : '')
                    + (voando === i ? ' ps-cam--voando' : '')
                    + (alvo === 'cima'   ? ' ps-cam--alvo' : '')
                    + (alvo === 'baixo'  ? ' ps-cam--alvo-baixo' : '')
                    + (alvo === 'dentro' ? ' ps-cam--dentro-alvo' : '')}
                  onClick={(e) => selecionar(l.id, e)}
                  onContextMenu={(e) => abrirMenu(e, l)}
                  draggable={renomeando !== l.id}
                  onDragStart={() => { arrastando.current = i; setVoando(i); }}
                  onDragEnd={() => { arrastando.current = null; setVoando(null); setAlvoSolta(null); }}
                  onDragOver={(e) => arrastaSobre(e, i, l)}
                >
                  {/* A seta abre e fecha o grupo. Só o grupo a tem — nas outras,
                      um vão do mesmo tamanho mantém tudo alinhado. */}
                  {l.tipo === 'grupo' ? (
                    <button
                      className={'ps-seta' + (abertos[l.id] ? ' ps-seta--on' : '')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAbertos((a) => ({ ...a, [l.id]: !a[l.id] }));
                      }}
                      aria-label={abertos[l.id] ? 'Fechar grupo' : 'Abrir grupo'}
                    >
                      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor"
                           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 1l4 4-4 4" />
                      </svg>
                    </button>
                  ) : (
                    <span className="ps-seta" />
                  )}

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

                  {/* Renomear acontece NA LINHA, não numa janela: abrir um modal
                      para trocar uma palavra é desproporcional. */}
                  {renomeando === l.id ? (
                    <input
                      className="ps-nome-edit"
                      defaultValue={l.nome}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => renomear(l.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')  renomear(l.id, e.target.value);
                        if (e.key === 'Escape') setRenomeando(null);
                        e.stopPropagation();
                      }}
                    />
                  ) : (
                    <span
                      className="ps-rotulo"
                      onDoubleClick={(e) => { e.stopPropagation(); setRenomeando(l.id); }}
                    >
                      <span className="ps-nome">
                        {l.nome}
                        {filhos > 0 && <span className="ps-conta">{filhos}</span>}
                      </span>

                      {/* O objeto inteligente se anuncia numa segunda linha, como
                          no plugin. Sem isso não haveria como saber que aquela
                          camada é reversível e a vizinha não. */}
                      {l.smart && <span className="ps-tag">Objeto Inteligente</span>}
                    </span>
                  )}
                </div>

                {/* ── Os filtros inteligentes ──
                    Eles pendem da camada, como no Photoshop, RECUADOS por baixo
                    dela — os "riozinhos". Ficam FORA do cartão da camada, mas
                    dentro do mesmo bloco: quando a camada é marcada, eles se
                    acendem junto, porque são parte dela.

                    Cada um é clicável (abre a janela com os valores dele, e o OK
                    substitui em vez de empilhar). O olho liga e desliga sem
                    apagar — compara "com" e "sem" sem perder a receita. */}
                {l.smart && l.filtros?.length > 0 && (
                    <div className="ps-filtros">
                      {l.filtros.map((f) => (
                        <div
                          key={f.id}
                          className={'ps-filtro' + (f.desligado ? ' ps-filtro--off' : '')}
                          onClick={(e) => { e.stopPropagation(); reabrirFiltro(l.id, f); }}
                          title="Clique para editar"
                        >
                          <button
                            className="ps-filtro-olho"
                            onClick={(e) => { e.stopPropagation(); ligarFiltro(l.id, f.id); }}
                            aria-label={f.desligado ? 'Ligar filtro' : 'Desligar filtro'}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                              {f.desligado
                                ? <path d="M3 3l18 18" />
                                : <circle cx="12" cy="12" r="3" />}
                            </svg>
                          </button>

                          <span className="ps-filtro-nome">{nomeDoFiltro(f)}</span>

                          <button
                            className="ps-filtro-x"
                            onClick={(e) => { e.stopPropagation(); tirarFiltro(l.id, f.id); }}
                            aria-label="Remover filtro"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                )}
                </div>
              );
            })}

          </div>
        </aside>
      </div>

      {/* ── A janela de Ajustes ──
          Ela recebe o pixel VIRGEM, e não o já processado: partir da imagem
          ajustada empilharia os efeitos sem volta — subir o contraste duas
          vezes daria um resultado que nenhum valor de contraste reproduz.

          Reabrindo um filtro de Ajustes, ela parte do original com todos os
          OUTROS filtros — o desfoque que veio antes continua valendo. */}
      {ajustando && ativa && (
        <JanelaAjustes
          camada={{ ...ativa, canvas: baseParaAjustes() }}
          inicial={
            editandoFiltro
              ? (ativa.filtros || []).find((f) => f.id === editandoFiltro)?.params
              : ativa.ajustes
          }
          aoFechar={() => { setAjustando(false); setEditandoFiltro(null); }}
          aoAplicar={(canvas, params) => {
            guardar();

            // ── Objeto inteligente: o ajuste vira um FILTRO ──
            //
            // Ele não carimba o pixel. Fica anotado na receita, e pode ser
            // reaberto, mexido, desligado ou removido — amanhã, ou daqui a um
            // mês, com o resto do trabalho intacto.
            if (ativa.smart) {
              const virgem = ativa.original || ativa.canvas;
              const antigos = ativa.filtros || [];

              const velho = editandoFiltro
                ? antigos.find((f) => f.id === editandoFiltro)
                : null;

              const filtro = {
                id: velho ? velho.id : novoIdFiltro(),
                tipo: 'ajustes',
                params,
                mascara: velho
                  ? velho.mascara
                  : (temSel && selRef.current
                      ? mascaraDoFiltro(selRef.current, ativa, largura(ativa), altura(ativa))
                      : null)
              };

              const lista = velho
                ? antigos.map((f) => (f.id === velho.id ? filtro : f))
                : [...antigos, filtro];

              mudar(ativa.id, {
                original: virgem,
                filtros: lista,
                canvas: aplicarFiltros(virgem, lista)
              });

              setAjustando(false);
              setEditandoFiltro(null);
              return;
            }

            // Camada comum: o ajuste carimba o pixel.
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

      {desfocando && (
        <JanelaDesfoque
          tipo={desfocando}
          // Reabrindo um filtro, os controles nascem com os valores DELE.
          inicial={
            editandoFiltro
              ? (ativa?.filtros || []).find((f) => f.id === editandoFiltro)
              : null
          }
          aoAplicar={aplicarDesfoque}
          aoFechar={() => { setDesfocando(null); setEditandoFiltro(null); }}
        />
      )}

      {nomeando !== null && (
        <Nomear
          inicial={nomeando}
          aoSalvar={salvarCora}
          aoCancelar={() => setNomeando(null)}
        />
      )}

      {confirmando && (
        <Confirma
          texto="Abrir uma nova imagem vai fechar o trabalho atual. Tem certeza?"
          ok="Abrir mesmo assim"
          aoOk={() => { setConfirmando(false); setPicker('nova'); }}
          aoCancelar={() => setConfirmando(false)}
        />
      )}

      {menu && (
        <MenuCamada
          x={menu.x}
          y={menu.y}
          camada={camadas.find((l) => l.id === menu.id)}
          quantas={sel.length}
          emGrupo={!!camadas.find((l) => l.id === menu.id)?.grupo}
          aoEscolher={acaoDoMenu}
          aoFechar={() => setMenu(null)}
        />
      )}

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

// ── A cor do pincel ──
//
// Um anel com o espectro inteiro, que abre o seletor do sistema, mais três
// atalhos para as cores que a mão pede o tempo todo.
//
// Numa MÁSCARA, o branco e o preto não são cores: são o revelar e o esconder.
// É por isso que eles vêm primeiro, e o cinza — que revela pela metade — logo
// atrás. O X troca entre os dois extremos sem tirar a mão da imagem.
function LinhaCor({ cor, setCor, naMasc }) {
  const ATALHOS = [
    ['#ffffff', naMasc ? 'Branco: revela' : 'Branco'],
    ['#000000', naMasc ? 'Preto: esconde' : 'Preto'],
    ['#8e8e88', naMasc ? 'Cinza: revela pela metade' : 'Cinza']
  ];

  return (
    <>
      <Dica texto="Escolher a cor">
        <span className="ps-cor-envelope">
          <button className="ps-cor-picker" aria-hidden="true" tabIndex={-1}>
            <i style={{ background: cor }} />
          </button>

          {/* O seletor do sistema, invisível, esticado por cima do anel. É ele
              que recebe o clique — o botão de baixo é só a aparência.

              Um <input type=color> não pode ser estilizado: cada navegador
              desenha o seu, e todos são feios. Escondê-lo e mostrar o anel por
              baixo dá o seletor nativo com a nossa cara. */}
          <input
            type="color"
            className="ps-cor-real"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            aria-label="Cor do pincel"
          />
        </span>
      </Dica>

      <span className="ps-cores">
        {ATALHOS.map(([c, nome]) => (
          <Dica key={c} texto={nome}>
            <button
              className={'ps-cor-at' + (cor.toLowerCase() === c ? ' ps-cor-at--on' : '')}
              style={{ background: c }}
              onClick={() => setCor(c)}
              aria-label={nome}
            />
          </Dica>
        ))}
      </span>
    </>
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
