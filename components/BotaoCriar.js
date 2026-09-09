'use client';

// ═══════════════════════════════════════════════════════════
//  O botão de criar, no menu da esquerda
//
//  Fica acima do "Início", como o Create do Magnific, e por isso funciona
//  de qualquer tela: da Minha conta ou do Início a pessoa já começa um
//  render sem passar pelo /app antes. Ele abre a lista do que dá para
//  gerar, e a lista é AGRUPADA pelo ponto de partida, porque essa é a
//  pergunta de quem chegou agora: "eu tenho um modelo" ou "eu tenho uma
//  imagem pronta". Uma lista chapada de oito só lista.
//
//  ── COMO ELE FALA COM O /app ──
//  Esta peça não sabe de plano nem de aba: ela só diz "abre tal
//  ferramenta". Quem decide se pode é o `trocarAba` da página do app, que
//  ouve por dois caminhos: um evento, quando a pessoa já está lá, e o
//  sessionStorage, quando ela vem de outra tela e a página ainda vai
//  montar. Duplicar o bloqueio aqui seria a terceira cópia da mesma regra.
//
//  ── O QUADRADO ──
//  O "+" mora num quadrado de canto redondo, turquesa, ao lado do rótulo.
//  É o mesmo desenho do Magnific, que o dono pediu pela foto. Turquesa e não
//  lima: ele não gasta crédito e não marca escolha, ele abre a porta. Lima
//  segue sendo dos botões que executam.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useIdioma, tOpt } from '../lib/i18n';

// Um traço por ferramenta, todos no mesmo peso e no mesmo quadro de 24.
// Nada de metáfora: o desenho mostra o que a ferramenta faz com a imagem.
const ICONES = {
  render:   'M3.5 5.5h17v13h-17z M3.5 14l5-4.5 4 3.5 3-2.5 5 4',
  batch:    'M7 3.5h13.5V17 M3.5 7h13.5v13.5H3.5z',
  planta:   'M3.5 3.5h17v17h-17z M3.5 10h8 M11.5 10v10.5 M11.5 6h9',
  editar:   'M4 20h4L19 9l-4-4L4 16v4z M14.5 5.5l4 4',
  upscale:  'M5 10.5V5h5.5 M19 13.5V19h-5.5 M5 5l5.5 5.5 M19 19l-5.5-5.5',
  pos:      'M4 6h16 M4 12h11 M4 18h7',
  animacao: 'M3.5 5.5h17v13h-17z M8 5.5v13 M16 5.5v13 M3.5 12h17',
  analises: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2'
};

// Os rótulos são os mesmos das abas do /app e passam pelo `tOpt`, que é o
// tradutor de opção que a página usa. Mudar o nome de uma aba lá muda aqui.
const GRUPOS = [
  { chave: 'app_criar_grp_modelo', itens: [
    { id: 'render', rotulo: 'Render' },
    { id: 'batch',  rotulo: 'Batch' },
    { id: 'planta', rotulo: 'Planta baixa' }
  ] },
  { chave: 'app_criar_grp_imagem', itens: [
    { id: 'editar',   rotulo: 'Editar' },
    { id: 'upscale',  rotulo: 'Upscale' },
    { id: 'pos',      rotulo: 'Pós-produção' },
    { id: 'animacao', rotulo: 'Animação' }
  ] }
];
// As leituras não geram nada: ficam embaixo, depois do fio, no lugar onde o
// Magnific põe o "New project".
const ANALISES = { id: 'analises', rotulo: 'Análises' };

const CHAVE_DESC = (id) => 'app_criar_' + id + '_desc';

const MAIS = (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor"
       strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M10 4.5v11M4.5 10h11" />
  </svg>
);

function Item({ item, t, onEscolher }) {
  const desc = t(CHAVE_DESC(item.id));
  return (
    <button type="button" className="criar__it" role="menuitem" onClick={() => onEscolher(item.id)}>
      <span className="criar__ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={ICONES[item.id]} />
        </svg>
      </span>
      <span className="criar__txt">
        <strong>{tOpt(item.rotulo)}</strong>
        {/* Sem tradução, o `t` devolve a própria chave: aí a linha some. */}
        {desc !== CHAVE_DESC(item.id) && <span>{desc}</span>}
      </span>
    </button>
  );
}

export default function BotaoCriar({ aoEscolher }) {
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);

  // Fecha ao clicar fora e no Escape: a lista flutua sobre a tela e, aberta,
  // roubaria o clique do que está atrás.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  function escolher(id) {
    setAberto(false);
    aoEscolher(id);
  }

  return (
    <div className="criar" ref={caixa}>
      <button
        type="button"
        className={'criar__b' + (aberto ? ' criar__b--on' : '')}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        title={t('app_aba_criar')}
      >
        <span className="criar__q">{MAIS}</span>
        {/* O mesmo rótulo dos itens do menu: é o CSS do menu recolhido que o
            esconde, junto com os outros. */}
        <span className="app-nav-lbl">{t('app_aba_criar')}</span>
      </button>

      {aberto && (
        <div className="criar__lista" role="menu">
          {GRUPOS.map((g) => (
            <div key={g.chave} className="criar__grp">
              <p className="criar__rot">{t(g.chave)}</p>
              {g.itens.map((it) => <Item key={it.id} item={it} t={t} onEscolher={escolher} />)}
            </div>
          ))}
          <div className="criar__div" />
          <Item item={ANALISES} t={t} onEscolher={escolher} />
        </div>
      )}
    </div>
  );
}
