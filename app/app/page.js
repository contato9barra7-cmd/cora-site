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
import { lerConta } from '../../lib/auth';
import {
  listarGeracoes, alternarFavorito, apagarGeracao, baixarImagem,
  ROTULO_FERRAMENTA, tempoRelativo, diasAteExpirar
} from '../../lib/geracoes';

const FILTROS = [
  { id: 'tudo',      rotulo: 'Tudo' },
  { id: 'imagem',    rotulo: 'Imagens' },
  { id: 'video',     rotulo: 'Vídeos' },
  { id: 'favoritos', rotulo: 'Favoritos' }
];

export default function App() {
  const router = useRouter();

  const [conta, setConta]           = useState(null);
  const [lotes, setLotes]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState('');

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
      <div className="app-wrap">

        {/* ── Painel esquerdo: entra na parte 2 ── */}
        <aside className="app-painel">
          <div className="app-pills">
            <button className="app-pill app-pill--on">Render</button>
            <button className="app-pill" disabled>Editar</button>
            <button className="app-pill" disabled>Batch</button>
          </div>
          <div className="app-painel-vazio">
            <p>As ferramentas de geração entram aqui em breve.</p>
            <p className="app-dica">
              Por enquanto, gere pelo plugin do SketchUp — tudo aparece neste histórico.
            </p>
          </div>
        </aside>

        {/* ── Feed ── */}
        <section className="app-feed">

          <div className="app-barra">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                className={'app-chip' + (filtro === f.id ? ' app-chip--on' : '')}
                onClick={() => setFiltro(f.id)}
              >
                {f.rotulo}
              </button>
            ))}

            <div className="app-busca">
              <input
                type="text"
                placeholder="Buscar"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setBuscaAtiva(busca.trim()); }}
              />
              {buscaAtiva && (
                <button
                  className="app-busca-x"
                  onClick={() => { setBusca(''); setBuscaAtiva(''); }}
                  aria-label="Limpar busca"
                >×</button>
              )}
            </div>
          </div>

          {erro && <div className="login-erro">{erro}</div>}

          {carregando && <p className="app-msg">Carregando seu histórico...</p>}

          {!carregando && lotes.length === 0 && (
            <div className="app-vazio">
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
              <article key={lote.loteId} className="app-lote">
                <header className="app-lote-cab">
                  <span className="app-lote-obs">
                    {lote.observacoes || 'Sem observações'}
                  </span>
                  <span className="app-tag app-tag--roxa">
                    {ROTULO_FERRAMENTA[lote.ferramenta] || lote.ferramenta}
                  </span>
                  {lote.proporcao && <span className="app-tag">{lote.proporcao}</span>}
                  {lote.tipo === 'video' && lote.duracaoSeg && (
                    <span className="app-tag">{lote.duracaoSeg}s</span>
                  )}
                  <span className="app-lote-data">{tempoRelativo(lote.criadoEm)}</span>
                </header>

                {expira !== null && (
                  <p className="app-expira">
                    {expira === 0
                      ? 'Esta geração será apagada hoje.'
                      : `Esta geração será apagada em ${expira} ${expira === 1 ? 'dia' : 'dias'}. Baixe o que quiser guardar.`}
                  </p>
                )}

                <div className="app-cards">
                  {lote.itens.map((item, i) => (
                    <div
                      key={item.id}
                      className="app-card"
                      onClick={() => { setPreview({ lote, indice: i }); setModoComparar('lado'); }}
                    >
                      {item.url ? (
                        <img src={item.url} alt="" loading="lazy" />
                      ) : (
                        <div className="app-card-erro">imagem indisponível</div>
                      )}

                      <div className="app-card-acoes" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={'app-mini' + (item.favorito ? ' app-mini--on' : '')}
                          onClick={() => favoritar(item.id)}
                          aria-label={item.favorito ? 'Desfavoritar' : 'Favoritar'}
                          title={item.favorito ? 'Desfavoritar' : 'Favoritar'}
                        >
                          {item.favorito ? '★' : '☆'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {/* ── Preview em overlay ── */}
      {preview && (() => {
        const item = preview.lote.itens[preview.indice];
        const temOriginal = !!preview.lote.original;
        return (
          <div className="app-overlay" onClick={() => setPreview(null)}>
            <div className="app-modal" onClick={(e) => e.stopPropagation()}>

              <header className="app-modal-cab">
                <span className="app-lote-obs">
                  {preview.lote.observacoes || 'Sem observações'}
                </span>

                {temOriginal && (
                  <div className="app-segm">
                    <button
                      className={'app-segm-b' + (modoComparar === 'lado' ? ' on' : '')}
                      onClick={() => setModoComparar('lado')}
                    >Lado a lado</button>
                    <button
                      className={'app-segm-b' + (modoComparar === 'cortina' ? ' on' : '')}
                      onClick={() => setModoComparar('cortina')}
                    >Cortina</button>
                    <button
                      className={'app-segm-b' + (modoComparar === 'so' ? ' on' : '')}
                      onClick={() => setModoComparar('so')}
                    >Só o render</button>
                  </div>
                )}

                <button
                  className="app-modal-x"
                  onClick={() => setPreview(null)}
                  aria-label="Fechar"
                >×</button>
              </header>

              <div className="app-modal-img">
                {modoComparar === 'lado' && temOriginal && (
                  <div className="app-lado">
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
                  <div className="app-cortina">
                    <img src={preview.lote.original} alt="Original do SketchUp" />
                    <div
                      className="app-cortina-topo"
                      style={{ clipPath: `inset(0 0 0 ${cortina}%)` }}
                    >
                      <img src={item.url} alt="Resultado" />
                    </div>
                    <input
                      type="range"
                      min="0" max="100" step="1"
                      value={cortina}
                      onChange={(e) => setCortina(Number(e.target.value))}
                      className="app-cortina-slider"
                      aria-label="Comparar original e render"
                    />
                  </div>
                )}

                {(modoComparar === 'so' || !temOriginal) && (
                  <img src={item.url} alt="Resultado" className="app-so" />
                )}
              </div>

              <footer className="app-modal-pe">
                <button className="app-btn" onClick={() => baixar(item.url, preview.lote, item.ordem, 'png')}>
                  Baixar PNG
                </button>
                <button className="app-btn" onClick={() => baixar(item.url, preview.lote, item.ordem, 'jpeg')}>
                  Baixar JPG
                </button>
                <button
                  className={'app-btn' + (item.favorito ? ' app-btn--on' : '')}
                  onClick={() => favoritar(item.id)}
                >
                  {item.favorito ? '★ Favorito' : '☆ Favoritar'}
                </button>
                <button className="app-btn app-btn--perigo" onClick={() => apagar(item.id)}>
                  Apagar
                </button>

                {preview.lote.itens.length > 1 && (
                  <div className="app-nav">
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
