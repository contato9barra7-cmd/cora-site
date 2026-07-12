'use client';

// ═══════════════════════════════════════════════════════════
//  /app — o Cora Render na web
//
//  Painel à esquerda (as ferramentas), feed à direita (tudo que já foi
//  gerado, do plugin E da web).
//
//  O feed agrupa por LOTE: N variações da mesma configuração ficam numa
//  linha só. Clicar em Renderizar de novo sem mudar nada continua na mesma
//  linha; mudar qualquer coisa começa uma linha nova. (A regra mora em
//  assinaturaConfig, no lib/render.)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import PainelRender from '../../components/PainelRender';
import Visualizador from '../../components/Visualizador';
import Filtros from '../../components/Filtros';
import { lerConta, creditosMudaram } from '../../lib/auth';
import { urlParaBase64 } from '../../lib/render';
import {
  listarGeracoes, alternarFavorito, apagarGeracao,
  ROTULO_FERRAMENTA, tempoRelativo, diasAteExpirar
} from '../../lib/geracoes';

const FILTROS = [
  {
    id: 'tudo', rotulo: 'Tudo',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1"/><rect x="11.5" y="2.5" width="6" height="6" rx="1"/>
        <rect x="2.5" y="11.5" width="6" height="6" rx="1"/><rect x="11.5" y="11.5" width="6" height="6" rx="1"/>
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
        <rect x="2.5" y="5" width="10" height="10" rx="1.5"/>
        <path d="M12.5 8.5l5-2.5v8l-5-2.5" strokeLinejoin="round"/>
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
    id: 'favoritos', rotulo: 'Favoritos',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M10 16.5l-1.1-1C5 12 2.5 9.7 2.5 6.9A3.4 3.4 0 016 3.5c1.2 0 2.3.5 3 1.5.7-1 1.8-1.5 3-1.5a3.4 3.4 0 013.5 3.4c0 2.8-2.5 5.1-6.4 8.6l-1.1 1z" strokeLinejoin="round"/>
      </svg>
    )
  }
];

// "4:5" -> "4 / 5", que o CSS entende em aspect-ratio.
// Sem proporção guardada (gerações antigas), cai em 4/3 — um meio-termo
// razoável que não espreme nem estica demais.
function proporcaoCss(p) {
  if (!p || !/^\d+:\d+$/.test(p)) return '4 / 3';
  return p.replace(':', ' / ');
}

export default function AppPage() {
  const router = useRouter();
  const [conta, setConta] = useState(null);

  const [lotes, setLotes]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState('');

  const [ferramenta, setFerramenta] = useState('render');
  const [ocupado, setOcupado]       = useState(false);
  const [progresso, setProgresso]   = useState(null);

  // O último lote gerado — para saber se o próximo continua na mesma linha
  const [ultimoLote, setUltimoLote] = useState(null);

  // Imagem vinda de outra aba (o botão "Editar" do visualizador)
  const [imagemDeOutraAba, setImagemDeOutraAba] = useState(null);

  const [filtro, setFiltro]         = useState('tudo');
  const [busca, setBusca]           = useState('');
  const [buscaAtiva, setBuscaAtiva] = useState('');

  // Guarda só IDs: a imagem em si vem sempre de `lotes`, que é a fonte
  // única. Guardar uma cópia aqui fazia as duas divergirem (o favorito
  // mudava em `lotes` e não em `vendo` — o coração não acendia).
  const [vendo, setVendo] = useState(null);   // { loteId, itemId }

  // Como o feed se apresenta
  const [layout, setLayout]   = useState('grade');   // grade | linha
  const [tamanho, setTamanho] = useState('m');       // p | m | g | gg

  // Filtros avançados (o painel do ícone de ajustes)
  const [painelFiltros, setPainelFiltros] = useState(false);
  const [avancados, setAvancados] = useState({});

  // Modo A/B: comparar duas imagens quaisquer do histórico
  const [modoAB, setModoAB] = useState(false);
  const [ladoB, setLadoB]   = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const f = {};
      if (filtro === 'imagem' || filtro === 'video') f.tipo = filtro;
      if (filtro === 'favoritos') f.favorito = true;
      if (filtro === 'upscale')   f.ferramenta = 'upscale';
      if (buscaAtiva) f.busca = buscaAtiva;

      // Os avançados (do painel de ajustes) somam aos rápidos
      if (avancados.de)  f.de  = avancados.de;
      if (avancados.ate) f.ate = avancados.ate;
      if (avancados.ferramentas?.length) f.ferramentas = avancados.ferramentas;
      if (avancados.proporcoes?.length)  f.proporcoes  = avancados.proporcoes;
      if (avancados.resolucoes?.length)  f.resolucoes  = avancados.resolucoes;
      if (avancados.baixadas)  f.baixadas  = true;
      if (avancados.favoritos) f.favoritos = true;

      setLotes(await listarGeracoes(f));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [filtro, buscaAtiva, avancados]);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
  }, [router]);

  useEffect(() => {
    if (conta) carregar();
  }, [conta, carregar]);

  async function favoritar(item) {
    try {
      const novo = await alternarFavorito(item.id);
      // Um lugar só. O visualizador lê daqui, então acende junto.
      setLotes((ls) => ls.map((l) => ({
        ...l,
        itens: l.itens.map((i) => (i.id === item.id ? { ...i, favorito: novo } : i))
      })));
    } catch (e) { setErro(e.message); }
  }

  async function excluir(item) {
    try {
      await apagarGeracao(item.id);
      setVendo(null);
      carregar();
    } catch (e) { setErro(e.message); }
  }

  // Os botões Editar/Upscale/Animar do visualizador não geram nada:
  // levam a imagem para a aba de destino, onde a pessoa configura e só
  // então gera. A imagem vive no R2, então buscamos o base64 antes de
  // entregar ao painel (que precisa mandá-lo ao servidor).
  async function enviarPara(destino, item) {
    setVendo(null);
    setErro('');
    try {
      const base64 = await urlParaBase64(item.url);
      setImagemDeOutraAba({ base64, previa: item.url });
      setFerramenta(destino);
    } catch (e) {
      setErro('Não foi possível carregar a imagem: ' + e.message);
    }
  }

  function aoGerar(r) {
    setUltimoLote({ loteId: r.loteId, assinatura: r.assinatura, prompt: r.prompt, quantas: r.quantas });
    carregar();          // o feed mostra a geração nova
    creditosMudaram();   // o menu e o anel atualizam
  }

  const ehAdmin = conta?.is_admin === true;

  return (
    <AppShell>
      <div className="cr-tela">

        {/* ═══ Painel ═══ */}
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
              onProgresso={setProgresso}
              onPronto={aoGerar}
              imagemInicial={imagemDeOutraAba}
              loteAnterior={ultimoLote}
            />
          )}

          {ferramenta !== 'render' && (
            <div className="cr-painel-vazio">
              <p>A aba {ferramenta} entra em breve.</p>
            </div>
          )}
        </aside>

        {/* ═══ Feed ═══ */}
        <section className="cr-feed">

          <header className="cr-barra">
            <div className="cr-fbtns">
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  className={'cr-fbtn' + (filtro === f.id ? ' cr-fbtn--on' : '')}
                  onClick={() => setFiltro(f.id)}
                  data-tip={f.rotulo}
                  aria-label={f.rotulo}
                >{f.icone}</button>
              ))}
            </div>

            <div className="cr-barra-dir">

              {/* Como o feed se apresenta */}
              <div className="cr-seg-lay">
                <button
                  className={'cr-fbtn' + (layout === 'linha' ? ' cr-fbtn--on' : '')}
                  onClick={() => setLayout('linha')}
                  data-tip="Lista"
                  aria-label="Lista"
                >
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  className={'cr-fbtn' + (layout === 'grade' ? ' cr-fbtn--on' : '')}
                  onClick={() => setLayout('grade')}
                  data-tip="Grade"
                  aria-label="Grade"
                >
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="2.5" y="2.5" width="6" height="6" rx="1"/><rect x="11.5" y="2.5" width="6" height="6" rx="1"/>
                    <rect x="2.5" y="11.5" width="6" height="6" rx="1"/><rect x="11.5" y="11.5" width="6" height="6" rx="1"/>
                  </svg>
                </button>
              </div>

              {/* Tamanho das miniaturas */}
              <div className="cr-tams">
                {['p', 'm', 'g', 'gg'].map((t) => (
                  <button
                    key={t}
                    className={'cr-tam' + (tamanho === t ? ' cr-tam--on' : '')}
                    onClick={() => setTamanho(t)}
                  >{t.toUpperCase()}</button>
                ))}
              </div>

              {/* Filtros avançados */}
              <div className="cr-ft-wrap">
                <button
                  className={'cr-fbtn' + (painelFiltros ? ' cr-fbtn--on' : '')}
                  onClick={() => setPainelFiltros((v) => !v)}
                  data-tip="Filtros"
                  aria-label="Filtros"
                >
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M3 6h14M6 10h8M8 14h4" strokeLinecap="round"/>
                  </svg>
                </button>

                <Filtros
                  aberto={painelFiltros}
                  valor={avancados}
                  onMudar={setAvancados}
                  onLimpar={() => setAvancados({})}
                  onFechar={() => setPainelFiltros(false)}
                />
              </div>

              <form
                className="cr-busca"
                onSubmit={(e) => { e.preventDefault(); setBuscaAtiva(busca.trim()); }}
              >
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="8.5" cy="8.5" r="5"/><path d="M12.5 12.5L17 17" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  spellCheck={false}
                />
              </form>
            </div>
          </header>

          {modoAB && (
            <div className="cr-ab-barra">
              <span>
                {ladoB
                  ? 'Lado A escolhido. Abra uma imagem para comparar.'
                  : 'Modo A/B: clique numa imagem para escolher o lado A.'}
              </span>
              <button onClick={() => { setModoAB(false); setLadoB(null); }}>Sair</button>
            </div>
          )}

          <div className="cr-lista">

            {erro && <div className="cr-erro">{erro}</div>}

            {/* Gerando: os slots aparecem antes do feed */}
            {progresso && (
              <div className="cr-gerando">
                <div className="cr-gerando-cab">
                  <span className="cr-spin" />
                  <span>
                    {progresso.estado === 'na_fila'
                      ? 'Há muito tráfego agora — isso pode demorar mais que o normal.'
                      : `Gerando imagem ${Math.min(progresso.feito + 1, progresso.total)} de ${progresso.total}`}
                  </span>
                </div>
                <div className="cr-gerando-slots">
                  {Array.from({ length: progresso.total }).map((_, i) => (
                    <div
                      key={i}
                      className={
                        'cr-slot' +
                        (i < progresso.feito ? ' cr-slot--ok'
                          : i === progresso.feito ? ' cr-slot--agora' : '')
                      }
                      style={{ aspectRatio: proporcaoCss(progresso.proporcao) }}
                    >
                      {i === progresso.feito && <span className="cr-spin" />}
                      {i > progresso.feito && <span className="cr-slot-n">{i + 1}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {carregando && <p className="cr-msg">Carregando...</p>}

            {!carregando && lotes.length === 0 && !progresso && (
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
                    {/* O prompt/observações NÃO aparece para quem não é admin */}
                    {ehAdmin && (
                      <span className="cr-lote-obs">
                        {lote.observacoes || 'Sem observações'}
                      </span>
                    )}
                    {!ehAdmin && <span className="cr-lote-obs" />}

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
                        : `Esta geração será apagada em ${expira} ${expira === 1 ? 'dia' : 'dias'}.`}
                    </p>
                  )}

                  <div className={`cr-cards cr-cards--${layout} cr-cards--${tamanho}`}>
                    {lote.itens.map((item, i) => (
                      <button
                        key={item.id}
                        className={'cr-card' + (ladoB?.id === item.id ? ' cr-card--ab' : '')}
                        style={{ aspectRatio: proporcaoCss(lote.proporcao) }}
                        onClick={() => {
                          // No A/B, clicar escolhe o lado de comparação
                          if (modoAB) { setLadoB(item); return; }
                          setVendo({ loteId: lote.loteId, itemId: item.id });
                        }}
                      >
                        <img src={item.url} alt="" loading="lazy" />
                        {item.favorito && (
                          <span className="cr-card-fav">
                            <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor">
                              <path d="M10 16.5l-1.1-1C5 12 2.5 9.7 2.5 6.9A3.4 3.4 0 016 3.5c1.2 0 2.3.5 3 1.5.7-1 1.8-1.5 3-1.5a3.4 3.4 0 013.5 3.4c0 2.8-2.5 5.1-6.4 8.6l-1.1 1z"/>
                            </svg>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {(() => {
        if (!vendo) return null;

        // Deriva de `lotes` — nunca de uma cópia guardada
        const lote = lotes.find((l) => l.loteId === vendo.loteId);
        const item = lote?.itens.find((i) => i.id === vendo.itemId);
        if (!item) return null;

        return (
          <Visualizador
            item={item}
            original={lote.original}
            prompt={lote.observacoes}
            ehAdmin={ehAdmin}
            modoAB={modoAB}
            ladoB={ladoB}
            onEntrarAB={() => setModoAB(true)}   /* NÃO fecha: a pessoa escolhe o A no feed atrás */
            onSairAB={() => { setModoAB(false); setLadoB(null); }}
            onFechar={() => setVendo(null)}
            onFavoritar={favoritar}
            onExcluir={excluir}
            onEnviarPara={enviarPara}
          />
        );
      })()}
    </AppShell>
  );
}
