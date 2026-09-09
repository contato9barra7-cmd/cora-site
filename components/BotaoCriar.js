'use client';

// ═══════════════════════════════════════════════════════════
//  O botão de criar, no topo do painel
//
//  O trilho de abas responde bem a quem JÁ SABE o nome do que quer. Ele não
//  responde a quem chegou agora: "Batch", "Upscale" e "Planta baixa" são
//  oito rótulos de uma palavra, sem desenho e sem frase, e a diferença entre
//  eles só existe na cabeça de quem já usou.
//
//  Este botão é a outra porta. Ele abre a lista inteira do que dá para gerar,
//  cada uma com o desenho e uma linha dizendo o que faz. Quem já sabe segue
//  usando o trilho, que continua logo abaixo.
//
//  ── POR QUE TURQUESA ──
//  A regra da marca: lima é o que você faz, turquesa é o que está escolhido.
//  Aqui a coisa é outra, e por isso a cor é outra: este botão não executa
//  nada e não marca escolha nenhuma, ele ABRE a porta. O lima segue reservado
//  para os botões que gastam crédito (Renderizar, Ler materiais), e dois
//  botões limas empilhados na mesma coluna disputariam o mesmo olhar.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useIdioma } from '../lib/i18n';

// Um traço por ferramenta, todos no mesmo peso e no mesmo quadro de 24.
// Nada de metáfora: o desenho mostra o que a ferramenta faz com a imagem.
const ICONES = {
  render:   'M3.5 5.5h17v13h-17z M3.5 14l5-4.5 4 3.5 3-2.5 5 4',
  batch:    'M7 3.5h13.5V17 M3.5 7h13.5v13.5H3.5z',
  editar:   'M4 20h4L19 9l-4-4L4 16v4z M14.5 5.5l4 4',
  planta:   'M3.5 3.5h17v17h-17z M3.5 10h8 M11.5 10v10.5 M11.5 6h9',
  pos:      'M4 6h16 M4 12h11 M4 18h7',
  animacao: 'M3.5 5.5h17v13h-17z M8 5.5v13 M16 5.5v13 M3.5 12h17',
  upscale:  'M5 10.5V5h5.5 M19 13.5V19h-5.5 M5 5l5.5 5.5 M19 19l-5.5-5.5',
  analises: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2'
};

// A descrição de cada uma, numa linha. As chaves entram no i18n com o mesmo
// nome da aba, e a falta de uma não quebra a lista: fica só o rótulo.
const CHAVE_DESC = (id) => 'app_criar_' + id + '_desc';

const MAIS = (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M10 4.5v11M4.5 10h11" />
  </svg>
);

const CADEADO = (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);

export default function BotaoCriar({ abas, ativa, onTrocar, bloqueadas = [] }) {
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);

  // Fecha ao clicar fora e no Escape. Sem isso a lista fica pendurada sobre o
  // painel e rouba o clique do formulário que está atrás dela.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (caixa.current && !caixa.current.contains(e.target)) setAberto(false);
    };
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  function escolher(id) {
    if (bloqueadas.includes(id)) return;
    onTrocar(id);
    setAberto(false);
  }

  return (
    <div className="criar" ref={caixa}>
      <button
        type="button"
        className={'criar__b' + (aberto ? ' criar__b--on' : '')}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        {MAIS}
        <span>{t('app_aba_criar')}</span>
      </button>

      {aberto && (
        <div className="criar__lista" role="menu">
          {abas.map((a) => {
            const trancada = bloqueadas.includes(a.id);
            const desc = t(CHAVE_DESC(a.id));

            return (
              <button
                key={a.id}
                type="button"
                className="criar__it"
                role="menuitem"
                aria-current={ativa === a.id}
                disabled={trancada}
                onClick={() => escolher(a.id)}
              >
                <span className="criar__ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                       aria-hidden="true">
                    <path d={ICONES[a.id] || ICONES.render} />
                  </svg>
                </span>

                <span className="criar__txt">
                  <strong>{a.rotulo}</strong>
                  {/* Sem tradução para a chave, o `t` devolve a própria chave.
                      Nesse caso a linha some, em vez de mostrar o nome dela. */}
                  {desc !== CHAVE_DESC(a.id) && <span>{desc}</span>}
                </span>

                {trancada && <span className="criar__cad">{CADEADO}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
