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
import PainelBatch from '../../components/PainelBatch';
import Visualizador from '../../components/Visualizador';
import Filtros from '../../components/Filtros';
import Card, { proporcaoCss } from '../../components/Card';
import ModalDownload from '../../components/ModalDownload';
import { lerConta, creditosMudaram } from '../../lib/auth';

import {
  listarGeracoes, alternarFavorito, alternarAprovado, apagarGeracao,
  bytesDaGeracao, ROTULO_FERRAMENTA, tempoRelativo, diasAteExpirar
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

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// ═══════════════════════════════════════════════════════════
//  Achata os lotes numa grade contínua, agrupada por mês
//
//  O servidor entrega lotes (N variações de uma configuração). Para a grade
//  no estilo Magnific, desmontamos isso: todas as imagens numa lista só,
//  em ordem de tempo, separadas apenas por mês.
//
//  Cada imagem leva junto os dados do lote (ferramenta, proporção, loteId),
//  porque o visualizador ainda precisa deles — e é o loteId que liga a
//  imagem ao print original, para a comparação.
// ═══════════════════════════════════════════════════════════
function agruparPorMes(lotes) {
  const todas = [];

  lotes.forEach((lote) => {
    lote.itens.forEach((item) => {
      todas.push({
        ...item,
        loteId:     lote.loteId,
        ferramenta: lote.ferramenta,
        proporcao:  lote.proporcao,
        tipo:       lote.tipo,
        criadoEm:   lote.criadoEm
      });
    });
  });

  // Mais recentes primeiro
  todas.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

  const grupos = [];
  const indice = new Map();

  todas.forEach((it) => {
    const d = new Date(it.criadoEm);
    const chave = `${d.getFullYear()}-${d.getMonth()}`;

    if (!indice.has(chave)) {
      const g = { chave, titulo: `${MESES[d.getMonth()]} ${d.getFullYear()}`, itens: [] };
      indice.set(chave, g);
      grupos.push(g);
    }
    indice.get(chave).itens.push(it);
  });

  return grupos;
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

  // Baixar e excluir agora acontecem do card TAMBÉM, não só da janela
  // grande — então o modal e a confirmação moram aqui, um só para os dois.
  const [baixando, setBaixando]   = useState(null);   // o item a baixar
  const [excluindo, setExcluindo] = useState(null);   // o item a excluir

  // Como o feed se apresenta
  const [layout, setLayout]   = useState('linha');   // grade | linha — lista por padrão
  const [tamanho, setTamanho] = useState('g');       // p | m | g | gg — G por padrão

  // Filtros avançados (o painel do ícone de ajustes)
  const [painelFiltros, setPainelFiltros] = useState(false);
  const [avancados, setAvancados] = useState({});

  // Modo A/B: a pessoa escolhe AS DUAS imagens no feed. A que estava
  // aberta não entra sozinha — comparar deve valer para qualquer par.
  const [modoAB, setModoAB] = useState(false);
  const [ladoA, setLadoA]   = useState(null);
  const [ladoB, setLadoB]   = useState(null);

  // Primeiro clique = A. Segundo = B. A partir daí, cada clique novo vira o
  // A, e o A antigo desce para B — dá para ir comparando em cadeia, sempre
  // contra a última que interessou. Clicar numa já escolhida a solta.
  function escolherAB(it) {
    if (ladoA?.id === it.id) { setLadoA(ladoB); setLadoB(null); return; }
    if (ladoB?.id === it.id) { setLadoB(null); return; }

    if (!ladoA)      { setLadoA(it); return; }
    if (!ladoB)      { setLadoB(it); return; }

    // As duas ocupadas: a nova entra como A, e a A vira B.
    setLadoB(ladoA);
    setLadoA(it);
  }

  function sairAB() {
    setModoAB(false);
    setLadoA(null);
    setLadoB(null);
  }

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
    const antes  = item.favorito;
    const otimista = !antes;

    // Acende na hora: o clique responde na velocidade do dedo, não da rede.
    const pintar = (v) => setLotes((ls) => ls.map((l) => ({
      ...l,
      itens: l.itens.map((i) => (i.id === item.id ? { ...i, favorito: v } : i))
    })));

    pintar(otimista);

    try {
      const real = await alternarFavorito(item.id);
      // O servidor é a verdade final — se discordar, corrige.
      if (real !== otimista) pintar(real);
    } catch (e) {
      pintar(antes);          // deu errado: desfaz
      setErro(e.message);
    }
  }

  // Aprovar: a imagem vira referência de estilo no Batch. Otimista, como o
  // favoritar — o clique responde na velocidade do dedo, não da rede.
  async function aprovar(item) {
    const antes = item.aprovado;
    const novo  = !antes;

    const pintar = (v) => setLotes((ls) => ls.map((l) => ({
      ...l,
      itens: l.itens.map((i) => (i.id === item.id ? { ...i, aprovado: v } : i))
    })));

    pintar(novo);

    try {
      const real = await alternarAprovado(item.id);
      if (real !== novo) pintar(real);
    } catch (e) {
      pintar(antes);
      setErro(e.message);
    }
  }

  // O batch devolve VÁRIOS lotes (um por cena) — diferente do render, que
  // devolve um só. Recarregar o feed é o caminho mais simples e correto:
  // os lotes já estão no banco, salvos pelo servidor.
  function aoGerarBatch() {
    setUltimoLote(null);
    carregar();
  }

  // Apagar é irreversível — quem chama isto já confirmou.
  async function excluirDeVerdade(item) {
    try {
      await apagarGeracao(item.id);
      setExcluindo(null);
      setVendo(null);
      carregar();
    } catch (e) {
      setErro(e.message);
      setExcluindo(null);
    }
  }

  // Os botões Editar/Upscale/Animar não geram nada: levam a imagem para a
  // aba de destino, onde a pessoa configura e só então gera.
  //
  // Os bytes vêm do SERVIDOR, não da URL do R2 — o R2 não manda CORS, então
  // um fetch() direto na imagem morre com "Failed to fetch".
  async function enviarPara(destino, item) {
    setVendo(null);
    setErro('');
    try {
      const base64 = await bytesDaGeracao(item.id);
      setImagemDeOutraAba({ base64, previa: item.thumb || item.url, geracaoId: item.id });
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

  // ── As imagens aprovadas ──
  //
  //  O Batch as usa como referência de estilo. Elas saem DAQUI, do estado
  //  que a página já tem — não de um fetch próprio do Batch.
  //
  //  Por quê: aprovar/desaprovar acontece no feed, que é desta página. Se o
  //  Batch buscasse sozinho (um useEffect que roda uma vez), ele não ficaria
  //  sabendo — e era exatamente esse o bug: aprovar não surtia efeito, e
  //  desaprovar não tirava a imagem das referências.
  //
  //  Assim, o React reage na hora: aprovou, entra; desaprovou, sai.
  const aprovadas = lotes.flatMap((l) =>
    l.itens
      .filter((i) => i.aprovado)
      .map((i) => ({ id: i.id, url: i.url, thumb: i.thumb }))
  );

  // A grade contínua: todas as imagens, por mês (sem separar por lote)
  const porMes = agruparPorMes(lotes);
  const vazio  = !carregando && porMes.length === 0 && !progresso;

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
            <button
              className={'cr-pill' + (ferramenta === 'batch' ? ' cr-pill--on' : '')}
              onClick={() => setFerramenta('batch')}
              disabled={ocupado}
            >Batch</button>
            <button className="cr-pill" disabled data-tip="Em breve">Editar</button>
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

          {ferramenta === 'batch' && (
            <PainelBatch
              aprovadas={aprovadas}
              ocupado={ocupado}
              setOcupado={setOcupado}
              onProgresso={setProgresso}
              onPronto={aoGerarBatch}
            />
          )}

          {ferramenta !== 'render' && ferramenta !== 'batch' && (
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

              <button
                className={'cr-fbtn' + (modoAB ? ' cr-fbtn--on' : '')}
                onClick={() => (modoAB ? sairAB() : setModoAB(true))}
                data-tip="Comparar duas imagens"
                aria-label="Comparar A/B"
              >
                <span className="cr-ab-ico">A/B</span>
              </button>


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
                {!ladoA  ? 'Comparar A/B: clique na primeira imagem.'
                  : !ladoB ? 'Agora clique na segunda imagem.'
                  : 'Pronto — as duas escolhidas.'}
              </span>

              {ladoA && ladoB && (
                <button
                  className="cr-ab-ver"
                  onClick={() => setVendo({ ab: true })}
                >
                  Comparar
                </button>
              )}

              <button onClick={sairAB}>Sair</button>
            </div>
          )}

          <div className="cr-lista">

            {erro && <div className="cr-erro">{erro}</div>}

            {/* Gerando: os slots aparecem antes do feed */}
            {/* ── Analisando: NÃO é gerar ──
                Analisar cenas produz TEXTO (os materiais), não imagens. Mostrar
                os slots de imagem aqui fazia parecer que um render gigante
                estava sendo feito — e não estava. */}
            {progresso?.estado === 'analisando' && (
              <div className="cr-gerando cr-gerando--texto">
                <div className="cr-gerando-cab">
                  <span className="cr-spin" />
                  <span>
                    {progresso.total === 1
                      ? 'Lendo os materiais da cena...'
                      : `Lendo os materiais de ${progresso.total} cenas...`}
                  </span>
                </div>
                <p className="cr-gerando-nota">
                  A IA está cruzando cada cena com as referências. Assim que
                  terminar, você revisa e aprova.
                </p>
              </div>
            )}

            {progresso && progresso.estado !== 'analisando' && (
              <div className="cr-gerando">
                <div className="cr-gerando-cab">
                  <span className="cr-spin" />
                  <span>
                    {progresso.estado === 'na_fila'
                      ? 'Há muito tráfego agora — isso pode demorar mais que o normal.'
                      : `Gerando imagem ${Math.min(progresso.feito + 1, progresso.total)} de ${progresso.total}`}
                  </span>

                  {/* Este número é REAL: conta imagens prontas do lote.
                      (Dentro de cada imagem não há progresso — o Gemini não
                      informa quanto falta, então lá a barra é indeterminada.) */}
                  {progresso.total > 1 && (
                    <span className="cr-gerando-pct">
                      {Math.round((progresso.feito / progresso.total) * 100)}%
                    </span>
                  )}
                </div>

                {progresso.total > 1 && (
                  <div className="cr-prog-trilho">
                    <div
                      className="cr-prog-cheio"
                      style={{ width: (progresso.feito / progresso.total) * 100 + '%' }}
                    />
                  </div>
                )}
                <div className={`cr-cards cr-cards--${layout} cr-cards--${tamanho}`}>
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

            {vazio && (
              <div className="cr-vazio">
                <h2>Nada aqui ainda</h2>
                <p>
                  {buscaAtiva || filtro !== 'tudo'
                    ? 'Nenhuma geração corresponde a esse filtro.'
                    : 'Suas gerações do plugin e da web aparecem aqui.'}
                </p>
              </div>
            )}

            {/* ── GRADE: contínua por mês, sem lote (como o Magnific) ──
                Todas as imagens juntas, cada uma na sua proporção. É como as
                pessoas procuram: pela imagem, não pela geração. */}
            {!carregando && layout === 'grade' && porMes.map((mes) => (
              <section key={mes.chave} className="cr-mes">
                <h3 className="cr-mes-tit">
                  {mes.titulo}
                  {(() => {
                    const velha = mes.itens[mes.itens.length - 1];
                    const dias = diasAteExpirar(velha.criadoEm);
                    if (dias === null || dias > 15) return null;
                    return (
                      <span className="cr-mes-expira">
                        {dias === 0
                          ? 'algumas serão apagadas hoje'
                          : `algumas serão apagadas em ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
                      </span>
                    );
                  })()}
                </h3>

                <div className={`cr-cards cr-cards--grade cr-cards--${tamanho}`}>
                  {mes.itens.map((it) => (
                    <Card
                      key={it.id}
                      it={it}
                      modoAB={modoAB}
                      ladoA={ladoA}
                      ladoB={ladoB}
                      onClick={() => {
                        if (modoAB) { escolherAB(it); return; }
                        setVendo({ loteId: it.loteId, itemId: it.id });
                      }}
                      onFavoritar={favoritar}
                      onAprovar={aprovar}
                      onBaixar={setBaixando}
                      onExcluir={setExcluindo}
                      onEnviarPara={enviarPara}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* ── LISTA: agrupada por lote ──
                Aqui o lote importa: as N variações de uma mesma configuração
                ficam lado a lado, para comparar o que aquele ajuste produziu. */}
            {!carregando && layout === 'linha' && lotes.map((lote) => {
              const dias = diasAteExpirar(lote.criadoEm);
              return (
                <article key={lote.loteId} className="cr-lote">
                  <header className="cr-lote-cab">
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

                  {dias !== null && dias <= 15 && (
                    <p className="cr-expira">
                      {dias === 0
                        ? 'Esta geração será apagada hoje.'
                        : `Esta geração será apagada em ${dias} ${dias === 1 ? 'dia' : 'dias'}.`}
                    </p>
                  )}

                  <div className={`cr-cards cr-cards--linha cr-cards--${tamanho}`}>
                    {lote.itens.map((item) => (
                      <Card
                        key={item.id}
                        it={{ ...item, loteId: lote.loteId, proporcao: lote.proporcao, ferramenta: lote.ferramenta, criadoEm: lote.criadoEm }}
                        modoAB={modoAB}
                        ladoA={ladoA}
                        ladoB={ladoB}
                        onClick={() => {
                          if (modoAB) { escolherAB({ ...item, loteId: lote.loteId }); return; }
                          setVendo({ loteId: lote.loteId, itemId: item.id });
                        }}
                        onFavoritar={favoritar}
                        onAprovar={aprovar}
                        onBaixar={setBaixando}
                        onExcluir={setExcluindo}
                        onEnviarPara={enviarPara}
                      />
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

        // ── Modo A/B: as duas imagens que a pessoa escolheu ──
        if (vendo.ab && ladoA && ladoB) {
          return (
            <Visualizador
              item={ladoB}
              original={ladoA.url}
              proporcao={ladoB.proporcao}
              proporcaoEsq={ladoA.proporcao}
              rotuloEsq="A"
              rotuloDir="B"
              ehAdmin={ehAdmin}
              onFechar={() => setVendo(null)}
              onFavoritar={favoritar}
              onBaixar={setBaixando}
              onExcluir={setExcluindo}
              onEnviarPara={enviarPara}
            />
          );
        }

        // ── Normal: uma geração, comparada com o print dela ──
        const lote = lotes.find((l) => l.loteId === vendo.loteId);
        const item = lote?.itens.find((i) => i.id === vendo.itemId);
        if (!item) return null;

        return (
          <Visualizador
            item={item}
            original={lote.original}
            proporcao={lote.proporcao}
            prompt={lote.observacoes}
            ehAdmin={ehAdmin}
            onFechar={() => setVendo(null)}
            onFavoritar={favoritar}
            onBaixar={setBaixando}
            onExcluir={setExcluindo}
            onEnviarPara={enviarPara}
          />
        );
      })()}

      {/* O modal de download e a confirmação servem ao card E à janela */}
      <ModalDownload
        aberto={baixando !== null}
        url={baixando?.url}
        id={baixando?.id}
        onFechar={() => setBaixando(null)}
      />

      {excluindo && (
        <div className="cr-overlay cr-overlay--alto" onClick={() => setExcluindo(null)}>
          <div className="cf" onClick={(e) => e.stopPropagation()}>
            <h3>Excluir esta imagem?</h3>
            <p>Ela será apagada para sempre. Não dá para recuperar depois.</p>
            <div className="cf-acoes">
              <button className="cf-nao" onClick={() => setExcluindo(null)}>Cancelar</button>
              <button className="cf-sim" onClick={() => excluirDeVerdade(excluindo)}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
