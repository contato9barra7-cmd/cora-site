'use client';

// ═══════════════════════════════════════════════════════════
//  Card — uma imagem no feed
//
//  Os dois modos usam este mesmo card:
//    Grade — contínua por mês, sem lote (a pessoa procura pela imagem)
//    Lista — agrupada por lote (a pessoa compara variações de um ajuste)
//
//  A altura vem da proporção real da geração, não de uma caixa fixa: uma
//  4:5 fica alta, uma 21:9 fica larga.
// ═══════════════════════════════════════════════════════════

import { ROTULO_FERRAMENTA, tempoRelativo } from '../lib/geracoes';

// "4:5" -> "4 / 5". "auto" não tem forma definida — quem decide é a imagem
// que voltar; até lá, 4/3 é o meio-termo que menos distorce.
export function proporcaoCss(p) {
  if (!p || p === 'auto' || !/^\d+:\d+$/.test(p)) return '4 / 3';
  return p.replace(':', ' / ');
}

export default function Card({ it, modoAB, ladoA, ladoB, onClick }) {
  const ehA = ladoA?.id === it.id;
  const ehB = ladoB?.id === it.id;

  return (
    <button
      className={'cr-card' + (ehA || ehB ? ' cr-card--sel' : '')}
      style={{ aspectRatio: proporcaoCss(it.proporcao) }}
      onClick={onClick}
    >
      <img src={it.url} alt="" loading="lazy" />

      {/* Qual lado esta imagem ocupa na comparação */}
      {modoAB && ehA && <span className="cr-card-ab">A</span>}
      {modoAB && ehB && <span className="cr-card-ab">B</span>}

      {it.favorito && (
        <span className="cr-card-fav">
          {/* Coração limpo: dois arcos e uma ponta, sem degrau no bico */}
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M12 20.5C6.5 16 3 13 3 8.9A4.4 4.4 0 017.4 4.5c1.9 0 3.6 1.1 4.6 2.8 1-1.7 2.7-2.8 4.6-2.8A4.4 4.4 0 0121 8.9c0 4.1-3.5 7.1-9 11.6z"/>
          </svg>
        </span>
      )}

      <span className="cr-card-info">
        <span className="cr-card-fer">
          {ROTULO_FERRAMENTA[it.ferramenta] || it.ferramenta}
        </span>
        {it.proporcao && <span>{it.proporcao}</span>}
        <span className="cr-card-quando">{tempoRelativo(it.criadoEm)}</span>
      </span>
    </button>
  );
}
