'use client';

// ═══════════════════════════════════════════════════════════
//  Visualizador — a imagem grande, com comparação
//
//  Três modos, na ordem e com os ícones do plugin:
//    Split        — cortina arrastável entre o print e o render
//    Side by Side — os dois lado a lado
//    Single       — só o render; SEGURE para ver o print
//
//  Mais o modo A/B: compara DUAS imagens quaisquer do histórico.
//
//  O tamanho da janela NÃO muda entre os modos — só o conteúdo. Trocar de
//  modo não pode fazer a tela pular.
//
//  ── A imagem É a caixa ──
//  Não há moldura fixa com a imagem encaixada dentro (que deixava faixas
//  vazias e arredondava a moldura, não a imagem). A imagem se dimensiona
//  sozinha: altura cheia, largura pela proporção real. No Split, o print
//  recebe a MESMA proporção e fica ancorado à esquerda — por isso os dois
//  coincidem e a cortina corta no lugar certo.
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { proporcaoCss } from './Card';

const MODOS = [
  {
    id: 'split', rotulo: 'Split', tip: 'Split View',
    icone: (
      <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
        <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <line x1="7" y1="0" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    )
  },
  {
    id: 'sbs', rotulo: 'Side by Side', tip: 'Side by Side',
    icone: (
      <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
        <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    )
  },
  {
    id: 'single', rotulo: 'Single', tip: 'Single View',
    icone: (
      <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
        <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    )
  }
];

export default function Visualizador({
  item, original, prompt, ehAdmin,
  proporcao,                     // "4:5", "16:9"... dá forma à caixa
  proporcaoEsq,                  // no A/B, a imagem A pode ter outra forma
  rotuloEsq, rotuloDir,          // no A/B viram "A" e "B"
  onFechar, onFavoritar, onAprovar, onBaixar, onExcluir, onEnviarPara, onDetalhes
}) {
  const [modo, setModo]           = useState('split');
  const [corte, setCorte]         = useState(50);
  const [segurando, setSegurando] = useState(false);
  // O modal de download e a confirmação de exclusão vivem na PÁGINA: o card
  // do feed também precisa deles, e dois lugares com o mesmo modal é um
  // convite a divergirem.

  const parRef = useRef(null);

  // ── A forma real das imagens ──
  //
  //  Quando a geração não declara proporção (o preenchimento e a expansão
  //  salvam null: o FLUX devolve no tamanho da base, seja ele qual for), o
  //  proporcaoCss chutava 4/3 — e o `object-fit: cover` CORTAVA a imagem
  //  para caber nesse chute. A imagem aparecia com a forma errada.
  //
  //  Sem proporção declarada, medimos a imagem de verdade.
  const [medida, setMedida]       = useState(null);
  const [medidaEsq, setMedidaEsq] = useState(null);

  // A imagem gerada (B, à direita)
  useEffect(() => {
    if (proporcao && proporcao !== 'auto') { setMedida(null); return; }
    if (!item?.url) return;

    let vivo = true;
    const img = new Image();
    img.onload = () => {
      if (vivo && img.naturalWidth && img.naturalHeight) {
        setMedida(img.naturalWidth + ' / ' + img.naturalHeight);
      }
    };
    img.src = item.url;
    return () => { vivo = false; };
  }, [item?.url, proporcao]);

  // A imagem de comparação (A, à esquerda) — pode ter outra forma
  useEffect(() => {
    if (proporcaoEsq && proporcaoEsq !== 'auto') { setMedidaEsq(null); return; }
    if (!original) { setMedidaEsq(null); return; }

    let vivo = true;
    const img = new Image();
    img.onload = () => {
      if (vivo && img.naturalWidth && img.naturalHeight) {
        setMedidaEsq(img.naturalWidth + ' / ' + img.naturalHeight);
      }
    };
    img.src = original;
    return () => { vivo = false; };
  }, [original, proporcaoEsq]);

  // A forma da caixa. A imagem NÃO se encaixa numa moldura fixa — ela É a
  // caixa: altura cheia, e a largura sai desta proporção. Por isso não
  // sobra faixa vazia e o arredondamento fica na própria imagem.
  const forma = { aspectRatio: medida || proporcaoCss(proporcao) };

  // No A/B as duas podem ter proporções diferentes. No Side by Side cada uma
  // fica na sua forma; no Split a sobreposição exige a mesma, então ali o
  // print acompanha o render.
  const formaEsq = (medidaEsq || proporcaoEsq)
    ? { aspectRatio: medidaEsq || proporcaoCss(proporcaoEsq) }
    : forma;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);


  // A cortina é relativa à IMAGEM, não ao contêiner. Era esse o bug.
  function arrastar(e) {
    if (!parRef.current) return;
    const r = parRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    setCorte(Math.max(0, Math.min(100, (x / r.width) * 100)));
  }

  function iniciarArrasto(e) {
    e.preventDefault();
    arrastar(e);
    const mover  = (ev) => arrastar(ev);
    const soltar = () => {
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
      window.removeEventListener('touchmove', mover);
      window.removeEventListener('touchend', soltar);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
    window.addEventListener('touchmove', mover);
    window.addEventListener('touchend', soltar);
  }

  if (!item) return null;

  // No A/B a "esquerda" é a imagem A que a pessoa escolheu; no normal, é o
  // print do SketchUp. Os rótulos vêm de fora justamente por isso.
  const esquerda = original;
  const rotEsq   = rotuloEsq || 'Print';
  const rotDir   = rotuloDir || 'Render';
  const compara  = Boolean(esquerda);

  return (
    <div className="cr-overlay" onClick={onFechar}>
      <div className="vz" onClick={(e) => e.stopPropagation()}>

        {/* O X mora na quina — meio dentro, meio fora. É o mesmo padrão do
            picker, e vale para toda janela do app. */}
        <button className="vz-x" onClick={onFechar} aria-label="Fechar">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" strokeLinecap="round"/>
          </svg>
        </button>

        <header className="vz-cab">
          {compara && (
            <div className="vz-modos">
              {MODOS.map((m) => (
                <button
                  key={m.id}
                  className={'vz-modo' + (modo === m.id ? ' vz-modo--on' : '')}
                  onClick={() => setModo(m.id)}
                  data-tip={m.tip}
                >
                  {m.icone}
                  <span>{m.rotulo}</span>
                </button>
              ))}
            </div>
          )}

        </header>

        {/* A área tem tamanho FIXO — trocar de modo não faz a tela pular */}
        <div className="vz-area">

          {compara && modo === 'split' && (
            <div
              className="vz-par"
              ref={parRef}
              style={forma}
              onMouseDown={iniciarArrasto}
              onTouchStart={iniciarArrasto}
            >
              {/* Base: o render */}
              <img className="vz-img" src={item.url} alt="" draggable={false} />

              {/* A cortina corta pela esquerda. O print, dentro dela, recebe
                  a largura da CAIXA (não da cortina) — senão encolheria junto
                  e as duas imagens deixariam de coincidir. Era esse o bug. */}
              <div className="vz-cortina" style={{ width: corte + '%' }}>
                {/* Mesma forma do render, ancorado à esquerda: os dois se
                    sobrepõem exatamente, e a cortina só descobre o que já
                    está no lugar. */}
                <img
                  className="vz-img vz-img--fixa"
                  src={esquerda}
                  alt=""
                  draggable={false}
                  style={forma}
                />
              </div>

              <div className="vz-handle" style={{ left: corte + '%' }}>
                <span className="vz-handle-bola">
                  <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.5 6l-3 4 3 4M11.5 6l3 4-3 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>

              <span className="vz-tag vz-tag--esq">{rotEsq}</span>
              <span className="vz-tag vz-tag--dir">{rotDir}</span>
            </div>
          )}

          {compara && modo === 'sbs' && (
            <div className="vz-sbs">
              <div className="vz-sbs-lado" style={formaEsq}>
                <img className="vz-img" src={esquerda} alt="" />
                <span className="vz-tag vz-tag--esq">{rotEsq}</span>
              </div>
              <div className="vz-sbs-lado" style={forma}>
                <img className="vz-img" src={item.url} alt="" />
                <span className="vz-tag vz-tag--esq">{rotDir}</span>
              </div>
            </div>
          )}

          {(!compara || modo === 'single') && (
            <div className="vz-sbs vz-sbs--um">
              <div
                className="vz-sbs-lado vz-sbs-lado--segura"
                style={forma}
                onMouseDown={() => compara && setSegurando(true)}
                onMouseUp={() => setSegurando(false)}
                onMouseLeave={() => setSegurando(false)}
                onTouchStart={() => compara && setSegurando(true)}
                onTouchEnd={() => setSegurando(false)}
              >
                <img
                  className="vz-img"
                  src={segurando && compara ? esquerda : item.url}
                  alt=""
                  draggable={false}
                />
                {compara && (
                  <>
                    {/* A MESMA pílula do Side by Side — só o texto muda */}
                    <span className="vz-tag vz-tag--esq">
                      {segurando ? rotEsq : rotDir}
                    </span>
                    <span className="vz-tag vz-tag--baixo">
                      {segurando ? `Solte para ver ${rotDir}` : `Segure para ver ${rotEsq}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* O prompt é só do admin */}
        {ehAdmin && prompt && (
          <details className="vz-prompt">
            <summary>Ver prompt (admin)</summary>
            <p>{prompt}</p>
          </details>
        )}

        <footer className="vz-acoes">
          {/* Aprovar existia no card do feed, mas não aqui — e é aqui que a
              pessoa vê a imagem grande e decide se ela presta.
              (A aprovada vira referência no Batch.) */}
          {onAprovar && (
            <button
              className={'vz-ico' + (item.aprovado ? ' vz-ico--ok' : '')}
              onClick={() => onAprovar(item)}
              data-tip={item.aprovado ? 'Remover aprovação' : 'Aprovar (vira referência no Batch)'}
              aria-label={item.aprovado ? 'Remover aprovação' : 'Aprovar'}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none"
                   stroke="currentColor" strokeWidth="2.2"
                   strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,8 6,12 14,4"/>
              </svg>
            </button>
          )}

          <button
            className={'vz-ico' + (item.favorito ? ' vz-ico--fav' : '')}
            onClick={() => onFavoritar(item)}
            data-tip={item.favorito ? 'Desfavoritar' : 'Favoritos'}
            aria-label={item.favorito ? 'Desfavoritar' : 'Favoritar'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18"
                 fill={item.favorito ? 'currentColor' : 'none'}
                 stroke="currentColor" strokeWidth="1.6">
              <path d="M12 20.3l-1.5-1.4C5.2 14.1 2 11.2 2 7.6A4.6 4.6 0 016.6 3c1.6 0 3.1.7 4.1 1.9l1.3 1.5 1.3-1.5A5.4 5.4 0 0117.4 3 4.6 4.6 0 0122 7.6c0 3.6-3.2 6.5-8.5 11.3L12 20.3z"
                    strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="vz-ico" onClick={() => onBaixar(item)}
                  data-tip="Baixar" aria-label="Baixar">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 15v1.5h13V15" strokeLinecap="round"/>
            </svg>
          </button>

          {/* O que foi usado nesta geração: configurações, imagem de origem,
              prompt. Meses depois, ninguém lembra.

              No modo A/B não aparece: são duas imagens de lotes diferentes, e
              "detalhes de qual?" não teria resposta. */}
          {onDetalhes && (
          <button
            className="vz-ico"
            onClick={onDetalhes}
            data-tip="Detalhes"
            aria-label="Ver detalhes desta geração"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 11v5" strokeLinecap="round"/>
              <circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          )}

          <div className="vz-div" />

          {/* Estes só TRANSPORTAM: levam a imagem para a aba de destino.
              Não geram, não cobram — por isso não têm o losango de crédito.

              Com rótulo: são o que a pessoa faz DEPOIS de ver o resultado, e
              como ícone solto ninguém sabia o que eram sem passar o mouse. */}
          <span className="vz-envia-rot">Enviar</span>

          <button className="vz-envia" onClick={() => onEnviarPara('editar', item)}
                  aria-label="Enviar para Editar">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13.5 3.5l3 3L7 16l-3.5.5L4 13l9.5-9.5z" strokeLinejoin="round"/>
            </svg>
            Editar
          </button>

          <button className="vz-envia" onClick={() => onEnviarPara('upscale', item)}
                  aria-label="Enviar para Upscale">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 3.5h5.5V9M16.5 3.5L11 9" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 16.5H3.5V11M3.5 16.5L9 11" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Upscale
          </button>

          <button className="vz-envia" onClick={() => onEnviarPara('animar', item)}
                  aria-label="Enviar para Animação">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2.5" y="5" width="10" height="10" rx="1.5"/>
              <path d="M12.5 8.5l5-2.5v8l-5-2.5" strokeLinejoin="round"/>
            </svg>
            Animação
          </button>

          {/* Sozinho, no canto oposto. Destruir não pode ficar a um erro de
              mira de guardar — antes ele estava entre "baixar" e "detalhes". */}
          <button className="vz-ico vz-ico--perigo vz-ico--fim"
                  onClick={() => onExcluir(item)}
                  data-tip="Excluir" aria-label="Excluir">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" strokeLinecap="round"/>
              <path d="M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10" strokeLinecap="round"/>
            </svg>
          </button>
        </footer>
      </div>


    </div>
  );
}
