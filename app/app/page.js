'use client';

// ═══════════════════════════════════════════════════════════
//  /app — o Cora Render na web
//
//  PARTE 1: o FEED. Mostra tudo que a pessoa ja gerou (no plugin ou
//  na web), com filtros, preview em overlay, favoritar, baixar e apagar.
//
//  A parte 2 (o painel de geracao a esquerda) entra depois. Por isso
//  o painel esquerdo aqui ainda esta vazio, so com o espaco reservado.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import PainelRender from '../../components/PainelRender';
import { lerConta } from '../../lib/auth';
import {
  listarGeracoes, alternarFavorito, apagarGeracao, baixarImagem,
  ROTULO_FERRAMENTA, tempoRelativo, diasAteExpirar
} from '../../lib/geracoes';

// Ícones e tooltips iguais aos do histórico do plugin.
const FILTROS = [
  {
    id: 'tudo', rotulo: 'Tudo',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/>
        <rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>
      </svg>
    )
  },
  {
    id: 'imagem', rotulo: 'Imagens',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/>
        <path d="M3 14l4-4 3.5 3.5L14 9l3.5 3.5"/>
      </svg>
    )
  },
  {
    id: 'video', rotulo: 'Vídeos',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2.5" y="5" width="11" height="10" rx="2"/>
        <path d="M13.5 8.5l4-2.2v7.4l-4-2.2" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 'upscale', rotulo: 'Upscales',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M11 4h5v5M16 4l-5 5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 16H4v-5M4 16l5-5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 'favoritos', rotulo: 'Favoritos', fav: true,
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 16.5l-1.2-1.1C5.4 12.3 3 10.1 3 7.5 3 5.5 4.5 4 6.5 4c1.1 0 2.2.5 2.9 1.4l.6.7.6-.7C11.3 4.5 12.4 4 13.5 4 15.5 4 17 5.5 17 7.5c0 2.6-2.4 4.8-5.8 7.9L10 16.5z"/>
      </svg>
    )
  }
];

// Coração para favoritar (preenche quando ativo, como no plugin)
const IC_CORACAO = (
  <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M10 16.5l-1.2-1.1C5.4 12.3 3 10.1 3 7.5 3 5.5 4.5 4 6.5 4c1.1 0 2.2.5 2.9 1.4l.6.7.6-.7C11.3 4.5 12.4 4 13.5 4 15.5 4 17 5.5 17 7.5c0 2.6-2.4 4.8-5.8 7.9L10 16.5z"/>
  </svg>
);

const IC_BAIXAR = (
  <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M10 3v9m0 0l-3.2-3.2M10 12l3.2-3.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.5 14v1.5a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5V14" strokeLinecap="round"/>
  </svg>
);

const IC_LIXO = (
  <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" strokeLinecap="round"/>
    <path d="M5 5.5l.7 10a1.5 1.5 0 001.5 1.4h5.6a1.5 1.5 0 001.5-1.4l.7-10" strokeLinecap="round"/>
  </svg>
);

export default function App() {
  const router = useRouter();

  const [conta, setConta]           = useState(null);
  const [lotes, setLotes]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState('');

  const [ferramenta, setFerramenta] = useState('render');
  const [ocupado, setOcupado]       = useState(false);

  const [filtro, setFiltro]   = useState('tudo');
  const [busca, setBusca]     = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');

  // Preview em overlay: qual lote esta aberto, e em qual variacao
  const [preview, setPreview] = useState(null);   // { lote, indice }
  const [modoComparar, setModoComparar] = useState('lado');  // lado | cortina | so
  const [cortina, setCortina] = useState(50);     // % da cortina

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const f = {};
      if (filtro === 'imagem' || filtro === 'video') f.tipo = filtro;
      if (filtro === 'favoritos') f.favorito = true;
      if (filtro === 'upscale')   f.ferramenta = 'upscale';
      if (buscaAtiva) f.busca = buscaAtiva;

      const dados = await listarGeracoes(f);
      setLotes(dados);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [filtro, buscaAtiva]);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
  }, [router]);

  useEffect(() => {
    if (conta) carregar();
  }, [conta, carregar]);

  // Esc fecha o preview
  useEffect(() => {
    if (!preview) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreview(null);
      if (e.key === 'ArrowRight') irPara(1);
      if (e.key === 'ArrowLeft')  irPara(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function irPara(passo) {
    setPreview((p) => {
      if (!p) return p;
      const n = p.lote.itens.length;
      const novo = (p.indice + passo + n) % n;
      return { ...p, indice: novo };
    });
  }

  async function favoritar(id) {
    try {
      const novo = await alternarFavorito(id);
      // Atualiza na hora, sem recarregar tudo
      setLotes((ls) => ls.map((l) => ({
        ...l,
        itens: l.itens.map((i) => (i.id === id ? { ...i, favorito: novo } : i))
      })));
      setPreview((p) => {
        if (!p) return p;
        return {
          ...p,
          lote: {
            ...p.lote,
            itens: p.lote.itens.map((i) => (i.id === id ? { ...i, favorito: novo } : i))
          }
        };
      });
    } catch (e) { setErro(e.message); }
  }

  async function apagar(id) {
    if (!confirm('Apagar esta imagem do histórico? Não dá para desfazer.')) return;
    try {
      await apagarGeracao(id);
      setPreview(null);
      carregar();
    } catch (e) { setErro(e.message); }
  }

  async function baixar(url, lote, ordem, formato) {
    try {
      const nome = `cora_${lote.ferramenta}_${lote.loteId}_${ordem + 1}`;
      await baixarImagem(url, nome, formato);
    } catch (e) { setErro(e.message); }
  }

  if (!conta) return null;

  return (
    <AppShell>
      <div className="cr-wrap">

        {/* ── Painel esquerdo: entra na parte 2 ── */}
        <aside className="cr-painel">
          <div className="cr-pills">
            <button
              className={'cr-pill' + (ferramenta === 'render' ? ' cr-pill--on' : '')}
              onClick={() => setFerramenta('render')}
              disabled={ocupado}
            >Render</button>
            <button className="cr-pill" disabled data-tip="Em breve">Editar</button>
            <button className="cr-pill" disabled data-tip="Em breve">Batch</button>
          </div>

          {ferramenta === 'render' && (
            <PainelRender
              ocupado={ocupado}
              setOcupado={setOcupado}
              onPronto={() => carregar()}
            />
          )}
        </aside>

        {/* ── Feed ── */}
        <section className="cr-feed">

          <div className="cr-barra">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                className={'cr-fbtn' + (filtro === f.id ? ' cr-fbtn--on' : '') + (f.fav ? ' cr-fbtn--fav' : '')}
                onClick={() => setFiltro(f.id)}
                data-tip={f.rotulo}
                aria-label={f.rotulo}
              >
                {f.icone}
              </button>
            ))}

            <div className="cr-busca">
              <input
                type="text"
                placeholder="Buscar"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setBuscaAtiva(busca.trim()); }}
              />
              {buscaAtiva && (
                <button
                  className="cr-busca-x"
                  onClick={() => { setBusca(''); setBuscaAtiva(''); }}
                  aria-label="Limpar busca"
                >×</button>
              )}
            </div>
          </div>

          <div className="cr-lista">
          {erro && <div className="login-erro" style={{ margin: 16 }}>{erro}</div>}

          {carregando && <p className="cr-msg">Carregando seu histórico...</p>}

          {!carregando && lotes.length === 0 && (
            <div className="cr-vazio">
              <h2>Nada aqui ainda</h2>
              <p>
                {buscaAtiva || filtro !== 'tudo'
                  ? 'Nenhuma geração corresponde a esse filtro.'
                  : 'Suas gerações do plugin e da web aparecem aqui.'}
              </p>
            </div>
          )}

          {!carregando && lotes.map((lote) => {
            const expira = diasAteExpirar(lote.criadoEm);
            return (
              <article key={lote.loteId} className="cr-lote">
                <header className="cr-lote-cab">
                  <span className="cr-lote-obs">
                    {lote.observacoes || 'Sem observações'}
                  </span>
                  <span className="cr-tag cr-tag--roxa">
                    {ROTULO_FERRAMENTA[lote.ferramenta] || lote.ferramenta}
                  </span>
                  {lote.proporcao && <span className="cr-tag">{lote.proporcao}</span>}
                  {lote.tipo === 'video' && lote.duracaoSeg && (
                    <span className="cr-tag">{lote.duracaoSeg}s</span>
                  )}
                  <span className="cr-lote-data">{tempoRelativo(lote.criadoEm)}</span>
                </header>

                {expira !== null && (
                  <p className="cr-expira">
                    {expira === 0
                      ? 'Esta geração será apagada hoje.'
                      : `Esta geração será apagada em ${expira} ${expira === 1 ? 'dia' : 'dias'}. Baixe o que quiser guardar.`}
                  </p>
                )}

                <div className="cr-cards">
                  {lote.itens.map((item, i) => (
                    <div
                      key={item.id}
                      className="cr-card"
                      onClick={() => { setPreview({ lote, indice: i }); setModoComparar('lado'); }}
                    >
                      {item.url ? (
                        <img src={item.url} alt="" loading="lazy" />
                      ) : (
                        <div className="cr-card-erro">imagem indisponível</div>
                      )}

                      <div className="cr-card-acoes" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={'cr-mini' + (item.favorito ? ' cr-mini--on' : '')}
                          onClick={() => favoritar(item.id)}
                          data-tip={item.favorito ? 'Desfavoritar' : 'Favoritar'}
                          aria-label={item.favorito ? 'Desfavoritar' : 'Favoritar'}
                        >
                          {IC_CORACAO}
                        </button>
                        <button
                          className="cr-mini"
                          onClick={() => baixar(item.url, lote, item.ordem, 'png')}
                          data-tip="Baixar PNG"
                          aria-label="Baixar PNG"
                        >
                          {IC_BAIXAR}
                        </button>
                        <button
                          className="cr-mini cr-mini--perigo"
                          onClick={() => apagar(item.id)}
                          data-tip="Apagar"
                          aria-label="Apagar"
                        >
                          {IC_LIXO}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
          </div>
        </section>
      </div>

      {/* ── Preview em overlay ── */}
      {preview && (() => {
        const item = preview.lote.itens[preview.indice];
        const temOriginal = !!preview.lote.original;
        return (
          <div className="cr-overlay" onClick={() => setPreview(null)}>
            <div className="cr-modal" onClick={(e) => e.stopPropagation()}>

              <header className="cr-modal-cab">
                <span className="cr-lote-obs">
                  {preview.lote.observacoes || 'Sem observações'}
                </span>

                {temOriginal && (
                  <div className="cr-segm">
                    <button
                      className={'cr-segm-b' + (modoComparar === 'lado' ? ' on' : '')}
                      onClick={() => setModoComparar('lado')}
                    >Lado a lado</button>
                    <button
                      className={'cr-segm-b' + (modoComparar === 'cortina' ? ' on' : '')}
                      onClick={() => setModoComparar('cortina')}
                    >Cortina</button>
                    <button
                      className={'cr-segm-b' + (modoComparar === 'so' ? ' on' : '')}
                      onClick={() => setModoComparar('so')}
                    >Só o render</button>
                  </div>
                )}

                <button
                  className="cr-modal-x"
                  onClick={() => setPreview(null)}
                  aria-label="Fechar"
                >×</button>
              </header>

              <div className="cr-modal-img">
                {modoComparar === 'lado' && temOriginal && (
                  <div className="cr-lado">
                    <figure>
                      <img src={preview.lote.original} alt="Original do SketchUp" />
                      <figcaption>Original</figcaption>
                    </figure>
                    <figure>
                      <img src={item.url} alt="Resultado" />
                      <figcaption>Render</figcaption>
                    </figure>
                  </div>
                )}

                {modoComparar === 'cortina' && temOriginal && (
                  <div className="cr-cortina">
                    <img src={preview.lote.original} alt="Original do SketchUp" />
                    <div
                      className="cr-cortina-topo"
                      style={{ clipPath: `inset(0 0 0 ${cortina}%)` }}
                    >
                      <img src={item.url} alt="Resultado" />
                    </div>
                    <input
                      type="range"
                      min="0" max="100" step="1"
                      value={cortina}
                      onChange={(e) => setCortina(Number(e.target.value))}
                      className="cr-cortina-slider"
                      aria-label="Comparar original e render"
                    />
                  </div>
                )}

                {(modoComparar === 'so' || !temOriginal) && (
                  <img src={item.url} alt="Resultado" className="cr-so" />
                )}
              </div>

              <footer className="cr-modal-pe">
                <button className="cr-btn" onClick={() => baixar(item.url, preview.lote, item.ordem, 'png')}>
                  Baixar PNG
                </button>
                <button className="cr-btn" onClick={() => baixar(item.url, preview.lote, item.ordem, 'jpeg')}>
                  Baixar JPG
                </button>
                <button
                  className={'cr-btn cr-btn--ic' + (item.favorito ? ' cr-btn--on' : '')}
                  onClick={() => favoritar(item.id)}
                >
                  {IC_CORACAO}
                  {item.favorito ? 'Favorito' : 'Favoritar'}
                </button>
                <button className="cr-btn cr-btn--perigo" onClick={() => apagar(item.id)}>
                  Apagar
                </button>

                {preview.lote.itens.length > 1 && (
                  <div className="cr-nav">
                    <button onClick={() => irPara(-1)} aria-label="Anterior">‹</button>
                    <span>{preview.indice + 1} de {preview.lote.itens.length}</span>
                    <button onClick={() => irPara(1)} aria-label="Próxima">›</button>
                  </div>
                )}
              </footer>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
