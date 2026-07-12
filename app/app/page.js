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
      <div className="cr-wrap">

        {/* ── Painel esquerdo: entra na parte 2 ── */}
        <aside className="cr-painel">
          <div className="cr-pills">
            <button className="cr-pill cr-pill--on">Render</button>
            <button className="cr-pill" disabled>Editar</button>
            <button className="cr-pill" disabled>Batch</button>
          </div>
          <div className="cr-painel-vazio">
            <p>As ferramentas de geração entram aqui em breve.</p>
            <p className="cr-dica">
              Por enquanto, gere pelo plugin do SketchUp — tudo aparece neste histórico.
            </p>
          </div>
        </aside>

        {/* ── Feed ── */}
        <section className="cr-feed">

          <div className="cr-barra">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                className={'cr-chip' + (filtro === f.id ? ' cr-chip--on' : '')}
                onClick={() => setFiltro(f.id)}
              >
                {f.rotulo}
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
                  className={'cr-btn' + (item.favorito ? ' cr-btn--on' : '')}
                  onClick={() => favoritar(item.id)}
                >
                  {item.favorito ? '★ Favorito' : '☆ Favoritar'}
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
