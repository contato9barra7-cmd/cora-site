'use client';

import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// ═══════════════════════════════════════════════════════════
//  A ficha do painel, e as peças que ela usa
//
//  O painel do Render tinha 44 botões de escolha e 384px de caixa de texto
//  abertas o tempo todo, num formulário de 2515px. Quase tudo no mesmo
//  tamanho, e por isso nada em destaque.
//
//  A ficha troca isso por uma LINHA por ajuste: o nome à esquerda, o valor
//  de agora à direita. Clicou, ela abre no formato que a escolha pede, e
//  fecha quando outra abre. A regra que segura tudo é uma só:
//
//      FECHADO É TIPOGRAFIA E FIO.
//      A COR SÓ APARECE NO GRUPO QUE ESTÁ SENDO ESCOLHIDO AGORA.
//
//  E cada escolha abre no formato dela, e não num formato só:
//
//    ESCOLHA VISUAL     → a amostra (a cor do céu, a planta da direção)
//    LISTA DE PALAVRAS  → lista com marcador (quadrado marca vários,
//                         círculo marca uma)
//    FAMÍLIA DO GRUPO   → o sulco, o mesmo gesto das abas e do P/M/G/GG
//
//  Os desenhos são AMOSTRA, e não ilustração. A direção da luz não é uma
//  seta apontando para um diagrama: é a sala vista de cima, sempre no mesmo
//  ponto do quadro, e só a seta anda em volta.
// ═══════════════════════════════════════════════════════════

const SETA = (
  <svg className="cmp__seta" viewBox="0 0 20 20" width="13" height="13" fill="none"
       stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CHECK = (
  <span className="am__ok">
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
         strokeWidth="2.6" aria-hidden="true">
      <path d="M3 8.4l3.4 3.4L13 4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

// ── A cor do céu de cada hora ──
// A hora do dia é uma COR, e não um nome: "golden hour" só quer dizer alguma
// coisa para quem já viu uma. Os tons são puxados para baixo de propósito,
// porque quinze amostras saturadas numa coluna viram mostruário.
export const CEU = {
  'Dia claro editorial': 'linear-gradient(175deg,#cfe0ec,#f2f4f4 60%,#e6e4de)',
  'Manhã':               'linear-gradient(175deg,#d8e3ea,#f7efe2 58%,#eeddc8)',
  'Meio dia':            'linear-gradient(175deg,#c2d8e8,#f4f7f8 55%,#e9ebea)',
  'Tarde':               'linear-gradient(175deg,#e2cfb4,#f2e2c8 50%,#d6b489)',
  'Amanhecer':           'linear-gradient(175deg,#cfd4e2,#efdcd2 55%,#e3b9a4)',
  'Golden hour':         'linear-gradient(175deg,#e8c99a,#f2d9a8 50%,#cf9a5e)',
  'Blue hour':           'linear-gradient(175deg,#8fa0bd,#b7c2d4 55%,#6c7c9c)',
  'Nublado':             'linear-gradient(175deg,#cfd3d4,#e4e6e6 58%,#c8cccd)',
  'Neve':                'linear-gradient(175deg,#dde4e8,#f4f7f9 58%,#e6ebee)',
  'Chuvoso':             'linear-gradient(175deg,#b9c1c6,#d2d8db 55%,#a8b1b7)',
  'Neblina':             'linear-gradient(175deg,#d6d8d6,#e8e9e7 58%,#cdd0ce)',
  'Noite clara':         'linear-gradient(175deg,#2f3a4d,#4a5670 55%,#232a37)',
  'Noite estrelada':     'linear-gradient(175deg,#1e2636,#2f3a52 55%,#141a26)',
  'Noite escura':        'linear-gradient(175deg,#1a1e26,#262c38 55%,#10131a)',
  'Noite chuvosa':       'linear-gradient(175deg,#232a33,#363f4b 55%,#171c23)'
};

// ── A qualidade da luz ──
// A diferença entre direta e difusa é a BORDA DA SOMBRA, e ela se desenha:
// a primeira tem uma parada dura no gradiente, a segunda não tem parada
// nenhuma. É a coisa, e não o desenho da coisa.
export const QUALIDADE = {
  Direta: 'linear-gradient(112deg,#f8f4ea 0 44%,#b3aa99 44%,#8f8677)',
  Difusa: 'linear-gradient(112deg,#f2efe8,#dcd7cd 55%,#cbc5ba)'
};

// ── A planta da direção ──
// A sala é a âncora: fica no MESMO ponto nas seis, centrada em (50,22) do
// quadro de 100x44, e só a seta anda. Centrar cada desenho pelo próprio
// contorno faria a sala subir e descer de um botão para o outro.
const SALA = <rect className="pl-sala" x="37" y="16" width="26" height="12" rx="1.5" />;
export const PLANTA = {
  'Frontal':          <>{SALA}<path className="pl-luz" d="M50 9.5v4.5M50 14l-2.2-2.2M50 14l2.2-2.2" /></>,
  'Lateral esquerda': <>{SALA}<path className="pl-luz" d="M28.5 22h6.5M35 22l-2.2-2.2M35 22l-2.2 2.2" /></>,
  'Lateral direita':  <>{SALA}<path className="pl-luz" d="M71.5 22H65M65 22l2.2-2.2M65 22l2.2 2.2" /></>,
  'Pelo fundo':       <>{SALA}<path className="pl-luz" d="M50 34.5V30M50 30l-2.2 2.2M50 30l2.2 2.2" /></>,
  'Diagonal':         <>{SALA}<path className="pl-luz" d="M68.5 12.5l-4 4M64.5 16.5l3.1-.3M64.5 16.5l.3-3.1" /></>,
  'Zenital': (
    <>
      <path className="pl-sala" d="M39 28v-7l11-6 11 6v7" />
      <path className="pl-luz" d="M50 12v-2.6M45.8 12.8l-1-2.2M54.2 12.8l1-2.2" />
    </>
  )
};

// ── A cor da luminária ──
export const KELVIN = {
  'Desligada': null,
  '2700K': '#f0c07a',
  '3000K': '#f5d2a2',
  '4000K': '#f6e6cd',
  '5500K': '#eef2f6',
  'Outro': null
};

// ═══════════════════════════════════════════════════════════
//  O campo
//
//  Rótulo em cima, caixa larga embaixo, e ao abrir o MESMO cartão flutuante
//  do dropdown da Planta baixa: ele nasce em `document.body`, com posição
//  medida a partir da caixa, e por isso nunca é cortado pelo formulário,
//  que rola. Fecha ao clicar fora, ao rolar o painel e ao redimensionar,
//  que é o que o DropdownCora faz.
//
//  Quem decide se ele está aberto é o pai (`aberta` + `aoAbrir`, um
//  alternador): assim uma aba abre um campo por vez. O `fechar` do contexto
//  é o que a lista de escolha única chama depois de escolher.
//
//  O cartão leva a classe `co` na raiz: as amostras e o sulco vivem na
//  folha escopada da janela, e o `body` está fora dela.
// ═══════════════════════════════════════════════════════════
const CtxCampo = createContext({ fechar: () => {} });
const CtxLista = createContext({ uma: false });

export function Linha({ nome, valor, vazio, aberta, aoAbrir, inline, children }) {
  const ref = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState(null);

  // Mede antes de abrir, para não piscar. Se não cabe embaixo, abre em cima.
  function medir() {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    // A altura de LAYOUT, e não `innerHeight`: numa janela emulada os dois
    // divergem, e o cartão nascia com `bottom` negativo, fora da tela.
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const abaixo = vh - r.bottom - 12;
    const acima = r.top - 12;
    if (abaixo >= 240 || abaixo >= acima) {
      setPos({ left: r.left, width: r.width, top: r.bottom + 6, maxHeight: Math.max(160, Math.min(480, abaixo)) });
    } else {
      setPos({ left: r.left, width: r.width, bottom: vh - r.top + 6, maxHeight: Math.max(160, Math.min(480, acima)) });
    }
  }
  function alternar() { if (!aberta) medir(); aoAbrir(); }
  const fechar = () => { if (aberta) aoAbrir(); };

  useEffect(() => {
    if (!aberta || inline) return;
    medir();
    function fora(e) {
      if (ref.current && ref.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      aoAbrir();
    }
    // Rolar o painel fecha: o cartão é fixo e não acompanharia. Rolar
    // DENTRO do cartão não fecha.
    function aoRolar(e) {
      if (popRef.current && popRef.current.contains(e.target)) return;
      aoAbrir();
    }
    function aoRedimensionar() { aoAbrir(); }
    document.addEventListener('mousedown', fora);
    window.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', aoRedimensionar);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta, inline]);

  const corpo = <CtxCampo.Provider value={{ fechar }}>{children}</CtxCampo.Provider>;

  return (
    <div className="cmp" data-aberta={aberta ? 'sim' : 'nao'} ref={ref}>
      <span className="cmp__rot">{nome}</span>
      <button type="button" className="cmp__b" onClick={alternar} aria-haspopup="listbox" aria-expanded={aberta}>
        <span className="cmp__val" data-vazio={valor ? 'nao' : 'sim'}>{valor || vazio}</span>
        {SETA}
      </button>
      {aberta && inline && <div className="cmp__corpo">{corpo}</div>}
      {aberta && !inline && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          className="co cmp__pop cora-dd-lista cora-dd-lista--portal"
          style={{
            position: 'fixed', left: pos.left, width: pos.width, right: 'auto',
            top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight
          }}
          role="listbox"
        >
          {corpo}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── A amostra ──
// `planta` troca o fundo de gradiente pelo desenho da sala. O check fica SOBRE
// a amostra, e não ao lado: ela ocupa a largura toda, e um marcador fora dela
// pediria uma coluna que não existe.
export function Amostra({ fundo, planta, marcada, onClick, children }) {
  return (
    <button
      type="button"
      className={'am__b' + (planta ? ' am__b--planta' : '')}
      aria-checked={marcada}
      role="checkbox"
      onClick={onClick}
    >
      <span className="am__q" style={planta ? undefined : { background: fundo }}>
        {planta && (
          <svg viewBox="0 0 100 44" aria-hidden="true">{planta}</svg>
        )}
      </span>
      {CHECK}
      <span className="am__n">{children}</span>
    </button>
  );
}

// ── A lista de palavras ──
// As MESMAS opções do dropdown da Planta baixa, com as classes do globals:
// escolha única leva o texto à esquerda e o tique à direita (DropdownCora);
// várias levam a caixinha à esquerda (DropdownMulti). A linha escolhida fica
// turquesa nas duas. Única fecha ao escolher, várias ficam abertas.
export function Lista({ uma, children }) {
  return (
    <CtxLista.Provider value={{ uma: !!uma }}>
      <div className={'cmp__lista' + (uma ? ' cmp__lista--uma' : '')}>{children}</div>
    </CtxLista.Provider>
  );
}

export function ItemLista({ marcada, onClick, children }) {
  const { uma } = useContext(CtxLista);
  const { fechar } = useContext(CtxCampo);
  // A mesma opção nas duas: caixinha à esquerda, texto à direita. O que muda
  // é só que a escolha única fecha o cartão depois de escolher.
  const escolher = uma ? () => { onClick(); fechar(); } : onClick;
  return (
    <div
      className={'cora-dd-opt cora-dd-opt--multi' + (uma ? ' cora-dd-opt--uma' : '') + (marcada ? ' cora-dd-opt--sel' : '')}
      role="option"
      aria-selected={!!marcada}
      tabIndex={0}
      onClick={escolher}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(); } }}
    >
      <span className="cora-dd-check" aria-hidden="true">
        {marcada && (
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none"
               stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,8 6,12 14,4" />
          </svg>
        )}
      </span>
      {children}
    </div>
  );
}

// ── O sulco das famílias ──
// Escolher entre jeitos de ver a mesma coisa, que é o trabalho dele nas abas
// e no P/M/G/GG. Aqui ele escolhe qual família de hora aparece.
export function Sulco({ opcoes, atual, onEscolher, rotulo }) {
  return (
    <div className="sul" role="tablist" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          key={o.val}
          type="button"
          className="sul__b"
          aria-checked={atual === o.val}
          role="tab"
          onClick={() => onEscolher(o.val)}
        >{o.rotulo}</button>
      ))}
    </div>
  );
}

// ── O resumo do cabeçalho ──
// Com duas ou mais, ele CONTA em vez de listar: "Nuvens leves, Pós-chuva com
// reflexos su..." cortado no meio não informa nada, e a contagem informa. O
// plural vem de fora porque "2 escolhidas" e "2 escolhidos" dependem da linha.
export function resumir(lista, plural, comoNome = (x) => x) {
  if (!lista || !lista.length) return '';
  if (lista.length === 1) return comoNome(lista[0]);
  return `${lista.length} ${plural}`;
}
