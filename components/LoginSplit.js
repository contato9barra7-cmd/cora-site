'use client';

// ═══════════════════════════════════════════════════════════
//  LoginSplit — moldura das telas de conta (entrar, criar conta,
//  recuperar senha, verificar e-mail).
//
//  Desktop: painel visual a esquerda, formulario a direita. So o lado
//           direito rola.
//  Mobile:  o painel some e volta o card centralizado de sempre.
//
//  O painel comeca sempre na grade animada da marca e depois passa pelas
//  fotos. Quem avanca o rodizio e o FIM DA ANIMACAO DA BARRINHA, nao um
//  setTimeout em paralelo: com dois relogios, basta uma pausa pra eles se
//  desencontrarem e a tela trocar com a barra no meio do caminho.
//
//  O motor abaixo roda num efeito, sobre refs, em vez de virar estado do
//  React. E de proposito: ele mexe em `data-*` e reinicia animacao lendo
//  `offsetWidth`, coisas que dependem da ordem exata dos quadros. Em estado
//  do React o mesmo codigo passaria a depender de quando o React resolve
//  renderizar, que e justamente o que nao se pode ter aqui.
//
//  PARA TROCAR AS FOTOS: edite SLIDES e ponha os arquivos em /public/img.
//  Cada slide tem imagem, alt e as chaves de traducao da frase.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useIdioma } from '../lib/i18n';
import GradeCora from './GradeCora';

const SLIDES = [
  { img: '/img/painel-fachada.webp',    alt: 'login_alt_1', frase: 'login_visual_frase_2', sub: 'login_visual_sub_2' },
  { img: '/img/painel-cozinha.webp',    alt: 'login_alt_2', frase: 'login_visual_frase_3', sub: 'login_visual_sub_3' },
  { img: '/img/painel-edificio.webp',   alt: 'login_alt_3', frase: 'login_visual_frase_4', sub: 'login_visual_sub_4' },
  { img: '/img/painel-varanda.webp',    alt: 'login_alt_4', frase: 'login_visual_frase_5', sub: 'login_visual_sub_5' },
  { img: '/img/painel-escritorio.webp', alt: 'login_alt_5', frase: 'login_visual_frase_6', sub: 'login_visual_sub_6' },
];

// A grade fica mais tempo: e a primeira coisa que a pessoa ve e tem animacao
// propria pra mostrar.
const DUR_GRADE = 7000;
const DUR_FOTO = 5200;

// `denso`: a tela tem campo demais pra caber numa janela baixa e aceita
// encolher o respiro. Vale pro cadastro e pra nova senha. Entrar, confirmar
// e-mail e esqueci a senha tem dois campos e sobra espaco: encolher ali seria
// perder tamanho de graca.
export default function LoginSplit({ children, denso = false }) {
  const { t } = useIdioma();
  const painelRef = useRef(null);

  // ── A altura do aviso de cookies ──
  // Ele e fixo no pe da janela e mora no mesmo canto que a faixa de vidro. Sem
  // tratar, cobre o pe destas telas: no desktop cortava a frase, engolia o
  // apoio e as barrinhas e comia metade do selo; no celular o "Criar conta
  // grátis" ficava atrás dele e o toque caia no botao "Aceitar".
  //
  // A medida sai daqui porque o aviso quebra em mais linhas no celular, 71px de
  // altura no desktop e 135 no telefone, e porque ele nasce DEPOIS, quando o
  // CookieConsent le o localStorage. Por isso o observador: ele pega tanto a
  // entrada quanto a saida, e quando a pessoa escolhe o valor volta a zero
  // sozinho. Mesmo caminho do AoTopo, que divide o canto com ele.
  //
  // Vai como variavel de CSS, e nao como estilo direto, porque o desktop e o
  // celular precisam do numero em propriedades diferentes (altura la, respiro
  // de baixo aqui). O `px` no fim nao e enfeite: `calc()` com numero puro e
  // invalido, a declaracao inteira cai, e e assim que uma conta dessas volta
  // silenciosamente pro valor de antes.
  const [aviso, setAviso] = useState(0);
  useEffect(() => {
    const medir = () => {
      const barra = document.querySelector('.cookie-bar');
      setAviso(barra ? Math.round(barra.getBoundingClientRect().height) : 0);
    };
    medir();
    const olho = new MutationObserver(medir);
    olho.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', medir);
    return () => {
      olho.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  // As frases entram pelo dataset pra o motor nao depender do React pra
  // escrever texto no meio de uma transicao.
  const textos = [
    { frase: t('login_visual_frase'), apoio: t('login_visual_sub') },
    ...SLIDES.map((s) => ({ frase: t(s.frase), apoio: t(s.sub) })),
  ];

  useEffect(() => {
    const painel = painelRef.current;
    if (!painel) return;

    const slides = [].slice.call(painel.querySelectorAll('.slide'));
    const barras = painel.querySelector('.barras');
    const caixaTexto = painel.querySelector('.texto');
    const elFrase = painel.querySelector('.frase');
    const elApoio = painel.querySelector('.apoio');
    if (!slides.length || !barras) return;

    const TEXTOS = JSON.parse(painel.dataset.textos || '[]');
    const DUR = slides.map((s, i) => (i === 0 ? DUR_GRADE : DUR_FOTO));
    let atual = 0;
    let passo = 0;
    const travas = { ponteiro: false, foco: false, fora: true };
    const limpezas = [];

    barras.innerHTML = '';
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.className = 'barra';
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', i === 0 ? 'Animação' : 'Imagem ' + i);
      b.style.setProperty('--dur', DUR[i] / 1000 + 's');
      b.innerHTML = '<i></i>';
      b.addEventListener('click', (e) => { e.stopPropagation(); ir(i); });
      barras.appendChild(b);
    });
    const listaBarras = [].slice.call(barras.children);

    function pintarBarras() {
      listaBarras.forEach((b, i) => {
        if (i < atual) { b.dataset.status = 'completa'; return; }
        if (i > atual) { b.dataset.status = 'pendente'; return; }
        b.dataset.status = 'ativa';
        const fill = b.querySelector('i');
        // sem isto a barra nao recomeca quando se volta pra mesma tela
        fill.style.animation = 'none';
        void fill.offsetWidth;
        fill.style.animation = '';
      });
    }

    function escreverTexto() {
      const t2 = TEXTOS[atual] || { frase: '', apoio: '' };
      elFrase.textContent = t2.frase;
      elApoio.textContent = t2.apoio;
      elApoio.hidden = !t2.apoio;
    }

    function ir(n) {
      const antes = atual;
      atual = (n + slides.length) % slides.length;
      if (antes === atual) { pintarBarras(); return; }
      const meu = ++passo;

      // Com a grade envolvida a troca e por colunas. Entre duas fotos, cross-fade.
      const lateral = antes === 0 || atual === 0;

      const grade = slides[0];
      grade.removeAttribute('data-saindo');
      grade.removeAttribute('data-entrando');
      void grade.offsetWidth;

      if (lateral) {
        // A grade fica visivel enquanto as colunas saem, e a imagem ja esta atras.
        slides.forEach((s, i) => { s.dataset.ativo = String(i === atual || i === 0); });
        if (antes === 0) {
          // Sem o `imediato` a foto ainda estaria em opacidade baixa enquanto as
          // colunas passam, e a fresta entre elas mostraria o fundo preto.
          const foto = slides[atual];
          foto.dataset.imediato = 'true';
          foto.dataset.ativo = 'true';
          void foto.offsetWidth;
          requestAnimationFrame(() => { foto.removeAttribute('data-imediato'); });
          grade.dataset.saindo = 'true';
          const id = setTimeout(() => {
            if (meu !== passo) return;
            grade.dataset.ativo = 'false';
          }, 1980);
          limpezas.push(() => clearTimeout(id));
        } else {
          grade.dataset.entrando = 'true';
          slides.forEach((s, i) => { s.dataset.ativo = String(i === 0); });
          // Terminada a entrada, a marca sai. Enquanto ela ficasse, a regra de
          // entrada (ja parada) continuaria valendo sobre o icone e o zoom de
          // `respirar` nao voltaria ate a proxima troca.
          const id = setTimeout(() => {
            if (meu !== passo) return;
            grade.removeAttribute('data-entrando');
          }, 1980);
          limpezas.push(() => clearTimeout(id));
        }
      } else {
        slides.forEach((s, i) => { s.dataset.ativo = String(i === atual); });
      }

      // O texto sai antes de a tela terminar de deslizar, e volta ja com o novo.
      caixaTexto.dataset.trocando = 'true';
      const idTexto = setTimeout(() => {
        if (meu !== passo) return;
        escreverTexto();
        caixaTexto.dataset.trocando = 'false';
      }, 240);
      limpezas.push(() => clearTimeout(idTexto));

      painel.dataset.sobre = atual === 0 ? 'grade' : 'foto';
      pintarBarras();
    }

    // A barra e o relogio: quando ela enche, passa pra proxima.
    let ultimo = 0;
    function aoTerminar(e) {
      if (e.animationName !== 'tc-preencher') return;
      const b = e.target.parentElement;
      if (b.dataset.status !== 'ativa') return;
      const agora = Date.now();
      if (agora - ultimo < 400) return;
      ultimo = agora;
      ir(atual + 1);
    }
    barras.addEventListener('animationend', aoTerminar);

    function aplicarPausa() {
      painel.dataset.pausado = String(travas.ponteiro || travas.foco || travas.fora);
    }
    // Igual ao story: pausa so enquanto esta pressionado, passar o mouse nao para.
    function apertou() { travas.ponteiro = true; aplicarPausa(); }
    function soltar() { if (travas.ponteiro) { travas.ponteiro = false; aplicarPausa(); } }
    function entrouFoco() {
      const a = document.activeElement;
      let teclado = false;
      try { teclado = !!(a && a.matches && a.matches(':focus-visible')); } catch (err) { /* navegador antigo */ }
      travas.foco = teclado; aplicarPausa();
    }
    function saiuFoco(e) {
      if (!painel.contains(e.relatedTarget)) { travas.foco = false; aplicarPausa(); }
    }
    painel.addEventListener('pointerdown', apertou);
    painel.addEventListener('pointerup', soltar);
    painel.addEventListener('pointercancel', soltar);
    painel.addEventListener('pointerleave', soltar);
    painel.addEventListener('focusin', entrouFoco);
    painel.addEventListener('focusout', saiuFoco);

    let observador = null;
    if ('IntersectionObserver' in window) {
      observador = new IntersectionObserver((es) => {
        travas.fora = !es[0].isIntersecting; aplicarPausa();
      }, { threshold: 0.15 });
      observador.observe(painel);
    } else {
      travas.fora = false;
    }

    const setas = [].slice.call(painel.querySelectorAll('[data-ir]'));
    const aoClicarSeta = [];
    setas.forEach((b) => {
      const f = (e) => { e.stopPropagation(); ir(atual + parseInt(b.dataset.ir, 10)); };
      b.addEventListener('click', f);
      aoClicarSeta.push([b, f]);
    });

    painel.dataset.sobre = 'grade';
    escreverTexto();
    aplicarPausa();
    ir(0);

    return () => {
      passo++;                                   // invalida timers em voo
      limpezas.forEach((f) => f());
      barras.removeEventListener('animationend', aoTerminar);
      painel.removeEventListener('pointerdown', apertou);
      painel.removeEventListener('pointerup', soltar);
      painel.removeEventListener('pointercancel', soltar);
      painel.removeEventListener('pointerleave', soltar);
      painel.removeEventListener('focusin', entrouFoco);
      painel.removeEventListener('focusout', saiuFoco);
      aoClicarSeta.forEach(([b, f]) => b.removeEventListener('click', f));
      if (observador) observador.disconnect();
    };
    // Refaz o motor quando as frases mudam de idioma.
  }, [JSON.stringify(textos)]);

  return (
    <main className={'login-split tc' + (denso ? ' tc--denso' : '')}
          style={{ '--aviso': aviso + 'px' }}>
      {/* Vento: ruído de baixa frequência deslocando o pelo de leve. Uma oitava
          tira o granulado.

          A frequência e o deslocamento são os do SELO, de 50px, e não os do
          ícone grande que morava no meio do painel. O filtro desloca em pixel:
          os 4px de antes, numa figura de 50, não fariam o pelo respirar,
          fariam a silhueta derreter. */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id="vento-selo" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.045" numOctaves="1" seed="7" result="ruido">
            <animate attributeName="baseFrequency" dur="22s" repeatCount="indefinite"
                     values="0.02 0.045; 0.028 0.036; 0.017 0.05; 0.02 0.045" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale="1.4"
                             xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="painel" ref={painelRef} data-textos={JSON.stringify(textos)}>
        <div className="slide slide--grade" data-ativo="true">
          <GradeCora />
        </div>

        {SLIDES.map((s) => (
          <div className="slide slide--img" data-ativo="false" key={s.img}>
            <img src={s.img} alt={t(s.alt)} />
          </div>
        ))}

        <div className="marca">
          <Link href="/">
            <img src="/img/logo-9barra7.png" alt="9barra7 Academy" width="300" height="36" />
          </Link>
        </div>

        <div className="rodape-painel">
          {/* O selo vem antes do texto porque a faixa é um flex: a ordem do
              DOM é a ordem na linha. */}
          <div className="selo" aria-hidden="true">
            <div className="selo__zoom">
              <img src="/img/icone-3d.webp" alt="" width="320" height="303" />
            </div>
          </div>
          <div className="texto">
            <p className="frase" />
            <p className="apoio" />
            <div className="barras" role="tablist" aria-label="Telas do painel" />
          </div>
        </div>

        {/* Metades invisíveis: clicar na esquerda volta, na direita avança. */}
        <div className="toque" aria-hidden="true">
          <button type="button" data-ir="-1" aria-label="Anterior" />
          <button type="button" data-ir="1" aria-label="Próxima" />
        </div>
      </div>

      {/* O cartao mora DENTRO de uma area que cresce ate a altura da tela e
          centraliza. A area nao e enfeite: sem ela, a regra que centraliza
          (`.tc .cartao-area`) caia no proprio cartao, e ai ele ganhava
          `min-height:100%` mais `align-items:center`. O resultado era um vao
          de 134px acima do logo e todo o texto centralizado, quando o desenho
          aprovado tem o texto alinhado a esquerda. */}
      <div className="lado-form">
        <div className="cartao-area">{children}</div>
      </div>
    </main>
  );
}
