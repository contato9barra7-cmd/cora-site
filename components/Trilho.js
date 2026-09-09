'use client';

// ═══════════════════════════════════════════════════════════
//  Trilho, as abas das ferramentas no topo do painel
//
//  Eram pílulas com nome. Cabiam quatro nos 400px do painel, e as outras
//  quatro ficavam atrás de uma seta, num trilho que andava. "Upscale" e
//  "Análises" só existiam para quem rolava.
//
//  Agora as oito cabem: cada ferramenta é o ícone, o mesmo da lista do
//  "Criar", e a ATIVA abre com o nome dentro da pílula branca. O nome de
//  onde a pessoa está fica sempre escrito, e os outros sete dizem o nome
//  no hover. É a opção 3 do estudo `ferramentas/cora-trilho.html`.
//
//  Sem seta e sem trilho que anda, o componente perdeu a medição, a trava
//  e a rolagem que tinha. Ficou o que ele é: uma fila de botões.
// ═══════════════════════════════════════════════════════════

import { IconeFerramenta } from './IconesFerramentas';

const CADEADO = (
  <svg className="cr-pill-cad" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);

export default function Trilho({ abas, ativa, onTrocar, bloqueadas = [] }) {
  return (
    <div className="cr-pills">
      <div className="cr-sulco" role="tablist">
        <div className="cr-trilho">
          {abas.map((a) => {
            const on = ativa === a.id;
            const trancada = bloqueadas.includes(a.id);
            return (
              <button
                key={a.id}
                role="tab"
                aria-selected={on}
                aria-label={a.rotulo}
                className={'cr-pill' + (on ? ' cr-pill--on' : '') + (trancada ? ' cr-pill--trancada' : '')}
                onClick={() => onTrocar(a.id)}
                /* O tooltip é só de quem está fechada: a ativa já tem o nome
                   escrito, e um tooltip repetindo o que está na tela é ruído. */
                data-tip={on ? undefined : a.rotulo}
              >
                <IconeFerramenta id={a.id} />
                <span className="cr-pill__nome">{a.rotulo}</span>
                {trancada && CADEADO}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
