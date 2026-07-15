'use client';

// ═══════════════════════════════════════════════════════════
//  Card — uma imagem no feed
//
//  Os dois modos usam este mesmo card:
//    Grade — contínua por mês, sem lote (procura-se pela imagem)
//    Lista — agrupada por lote (compara-se variações de um ajuste)
//
//  A altura vem da proporção real da geração: uma 4:5 fica alta, uma 21:9
//  fica larga. Nada de caixa fixa espremendo tudo.
//
//  No hover aparecem as MESMAS ações da janela grande — favoritar, baixar,
//  excluir, e enviar para Editar/Upscale/Animar. Não faz sentido ter que
//  abrir a imagem só para favoritar.
// ═══════════════════════════════════════════════════════════

import { ROTULO_FERRAMENTA, tempoRelativo } from '../lib/geracoes';

// "4:5" -> "4 / 5". "auto" não tem forma definida — quem decide é a imagem
// que voltar; até lá, 4/3 é o meio-termo que menos distorce.
export function proporcaoCss(p) {
  if (!p || p === 'auto' || !/^\d+:\d+$/.test(p)) return '4 / 3';
  return p.replace(':', ' / ');
}

// O mesmo coração da janela grande: dois arcos e uma ponta, sem degrau
// no bico (o anterior parecia ter um rabinho).
const Coracao = ({ cheio }) => (
  <svg viewBox="0 0 24 24" width="16" height="16"
       fill={cheio ? 'currentColor' : 'none'}
       stroke="currentColor" strokeWidth="1.7">
    <path d="M12 20.5C6.5 16 3 13 3 8.9A4.4 4.4 0 017.4 4.5c1.9 0 3.6 1.1 4.6 2.8 1-1.7 2.7-2.8 4.6-2.8A4.4 4.4 0 0121 8.9c0 4.1-3.5 7.1-9 11.6z"
          strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);

// O check de "aprovada" — o mesmo path do plugin (points="2,8 6,12 14,4").
// Aprovada NÃO é favorita: favorita = gostei; aprovada = esta define o
// estilo do projeto, e entra sozinha como referência no Batch.
const Check = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none"
       stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,8 6,12 14,4"/>
  </svg>
);

export default function Card({
  it, modoAB, ladoA, ladoB, onClick,
  onFavoritar, onAprovar, onBaixar, onExcluir, onEnviarPara, onDetalhes,
  onMedir, razao
}) {
  const ehA = ladoA?.id === it.id;
  const ehB = ladoB?.id === it.id;

  // A proporção que o card VAI usar. Na grade, o Masonry mede a imagem de
  // verdade e devolve a razão em `razao` — é ela que manda, porque só ela
  // encaixa o card na coluna sem sobra. Enquanto não chega (e sempre, na
  // lista), vale a proporção declarada da geração.
  const forma = razao ? `${razao} / 1` : proporcaoCss(it.proporcao);

  // A imagem carregou: avisa o Masonry da proporção real. É aqui que o
  // upscale e a geração 'auto' — que não têm proporção declarada — ganham
  // a forma certa.
  const carregou = (e) => {
    if (!onMedir) return;
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      onMedir(it.id, img.naturalWidth / img.naturalHeight);
    }
  };

  // Um clique numa ação não deve abrir a imagem também
  const so = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div
      className={'cr-card'
        + (ehA || ehB ? ' cr-card--sel' : '')
        + (it.aprovado ? ' cr-card--aprovada' : '')}
      style={{ aspectRatio: forma }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      {/* A miniatura (600px, ~60 KB), não a original (2K, 4 MB). Sem isto
          o navegador baixaria a imagem inteira para mostrar num card de
          330px. As gerações antigas não têm thumb — ali cai na original. */}
      <img
        src={it.thumb || it.url}
        alt=""
        loading="lazy"
        onLoad={carregou}
      />

      {(it.tipo === 'video' || /\.(mp4|webm)(\?|$)/i.test(it.url || '')) && (
        <span className="cr-card-play" aria-label="Vídeo">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><polygon points="7 4 20 12 7 20 7 4"/></svg>
        </span>
      )}

      {/* Qual lado esta imagem ocupa na comparação */}
      {modoAB && ehA && <span className="cr-card-ab">A</span>}
      {modoAB && ehB && <span className="cr-card-ab">B</span>}

      {/* Aprovada: a badge fica à mostra — é o que o Batch vai usar */}
      {it.aprovado && !modoAB && (
        <span className="cr-card-selo" data-tip="Aprovada — é referência no Batch">
          <Check />
        </span>
      )}

      {/* Favoritada: o coração também fica à mostra */}
      {it.favorito && !modoAB && (
        <span className="cr-card-fav"><Coracao cheio /></span>
      )}

      {/* As mesmas ações da janela grande. Ficam escondidas no A/B: lá o
          clique tem outro significado (escolher o lado). */}
      {!modoAB && (
        <div className="cr-card-acoes">
          <button
            className={'cr-ca' + (it.aprovado ? ' cr-ca--on' : '')}
            onClick={so(() => onAprovar(it))}
            data-tip={it.aprovado ? 'Remover aprovação' : 'Aprovar (vira referência no Batch)'}
            aria-label={it.aprovado ? 'Remover aprovação' : 'Aprovar'}
          >
            <Check />
          </button>

          <button
            className={'cr-ca' + (it.favorito ? ' cr-ca--fav' : '')}
            onClick={so(() => onFavoritar(it))}
            data-tip={it.favorito ? 'Desfavoritar' : 'Favoritos'}
            aria-label={it.favorito ? 'Desfavoritar' : 'Favoritar'}
          >
            <Coracao cheio={it.favorito} />
          </button>

          <button
            className="cr-ca"
            onClick={so(() => onBaixar(it))}
            data-tip="Baixar"
            aria-label="Baixar"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 14v1.5A1.5 1.5 0 005 17h10a1.5 1.5 0 001.5-1.5V14" strokeLinecap="round"/>
            </svg>
          </button>

          <button
            className="cr-ca cr-ca--perigo"
            onClick={so(() => onExcluir(it))}
            data-tip="Excluir"
            aria-label="Excluir"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" strokeLinecap="round"/>
              <path d="M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10" strokeLinecap="round"/>
            </svg>
          </button>

          {/* O que foi usado nesta geração: print de origem, referências,
              configurações. Aqui no hover, sem precisar abrir a imagem. */}
          <button
            className="cr-ca"
            onClick={so(() => onDetalhes(it))}
            data-tip="Detalhes"
            aria-label="Ver detalhes"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <circle cx="10" cy="10" r="7.5"/>
              <path d="M10 9.2v4.3" strokeLinecap="round"/>
              <circle cx="10" cy="6.4" r=".8" fill="currentColor" stroke="none"/>
            </svg>
          </button>

          <span className="cr-ca-div" />

          {/* Transporte: levam a imagem para a aba, não geram nada */}
          <button
            className="cr-ca"
            onClick={so(() => onEnviarPara('editar', it))}
            data-tip="Editar"
            aria-label="Enviar para Editar"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13.5 3.5l3 3L7 16l-3.5.5L4 13l9.5-9.5z" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            className="cr-ca"
            onClick={so(() => onEnviarPara('upscale', it))}
            data-tip="Upscale"
            aria-label="Enviar para Upscale"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 3.5h5.5V9M16.5 3.5L11 9" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 16.5H3.5V11M3.5 16.5L9 11" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            className="cr-ca"
            onClick={so(() => onEnviarPara('animar', it))}
            data-tip="Animar"
            aria-label="Enviar para Animação"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2.5" y="5" width="10" height="10" rx="1.5"/>
              <path d="M12.5 8.5l5-2.5v8l-5-2.5" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      <span className="cr-card-info">
        <span className="cr-card-fer">
          {ROTULO_FERRAMENTA[it.ferramenta] || it.ferramenta}
        </span>
        {it.plataforma === 'plugin' && <span className="cr-card-plugin">Plugin</span>}
        {it.proporcao && <span>{it.proporcao}</span>}
        <span className="cr-card-quando">{tempoRelativo(it.criadoEm)}</span>
      </span>
    </div>
  );
}
