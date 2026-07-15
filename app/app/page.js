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

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import PainelRender from '../../components/PainelRender';
import PainelBatch from '../../components/PainelBatch';
import PainelEditar from '../../components/PainelEditar';
import PainelUpscale from '../../components/PainelUpscale';
import TelaPincel from '../../components/TelaPincel';
import PainelPincel from '../../components/PainelPincel';
import PainelAnalises from '../../components/PainelAnalises';
import PainelPos from '../../components/PainelPos';
import Trilho from '../../components/Trilho';
import Visualizador from '../../components/Visualizador';
import Filtros from '../../components/Filtros';
import Card, { proporcaoCss } from '../../components/Card';
import Masonry from '../../components/Masonry';
import ModalDownload from '../../components/ModalDownload';
import ModalDetalhes from '../../components/ModalDetalhes';
import { lerConta, creditosMudaram } from '../../lib/auth';
import { gerarGenerativa } from '../../lib/render';

import {
  listarGeracoes, alternarFavorito, alternarAprovado, apagarGeracao,
  bytesDaGeracao, ROTULO_FERRAMENTA, tempoRelativo, diasAteExpirar,
  salvarNoHistorico
} from '../../lib/geracoes';

// As abas do trilho. A Pós não é como as outras: em vez de encher o painel,
// ela toma o corpo inteiro (ver `ehTelaCheia` mais abaixo).
const ABAS = [
  { id: 'render',   rotulo: 'Render' },
  { id: 'batch',    rotulo: 'Batch' },
  { id: 'editar',   rotulo: 'Editar' },
  { id: 'pos',      rotulo: 'Pós-produção' },
  { id: 'upscale',  rotulo: 'Upscale' },
  { id: 'analises', rotulo: 'Análises' }
];

// As que engolem a tela — o painel e o feed saem de cena enquanto durarem.
const TELA_CHEIA = ['pos'];

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

  // Preenchimento e expansão tomam o FEED: pintar máscara num painel de
  // 380px seria impossível. Ao sair, o feed volta — com o resultado nele.
  const [pincel, setPincel]         = useState(null);   // {modo, base, previa}
  const montarPincel                = useRef(null);     // a tela devolve os bytes
  const limparPincel                = useRef(null);     // o painel manda limpar

  // Botão "voltar ao topo": aparece quando o feed rola para baixo, some no topo.
  const listaRef                    = useRef(null);
  const [mostrarTopo, setMostrarTopo] = useState(false);

  // Upscales em andamento — canal próprio, para vários ao mesmo tempo sem
  // depender do `progresso` (que é único e serve as abas normais).
  const [upsAtivos, setUpsAtivos] = useState([]);   // [{ id, base }]
  function iniciarUpscale(base) {
    const id = 'up_ativo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setUpsAtivos((l) => [...l, { id, base }]);
    return id;
  }
  function terminarUpscale(id) {
    setUpsAtivos((l) => l.filter((u) => u.id !== id));
  }
  function aoRolarLista(e) {
    setMostrarTopo(e.target.scrollTop > 400);
  }
  function voltarAoTopo() {
    if (listaRef.current) listaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // O painel comanda, a tela obedece. O estado mora aqui, no meio dos dois.
  const [pnFerr, setPnFerr]   = useState('pincel');
  const [pnTam, setPnTam]     = useState(38);
  const [pnRatio, setPnRatio] = useState('livre');
  const [pnMed, setPnMed]     = useState(null);   // as dimensões da moldura

  // Os campos L/A: texto LIVRE (como st.rw/st.rh no plugin). Digitar "4" e "5"
  // dá a razão 4:5. Guardar o que foi digitado — e não recalcular por cima —
  // é o que permite editá-los.
  const [pnRw, setPnRw]       = useState('');
  const [pnRh, setPnRh]       = useState('');

  // edExpRatioSel: escolher uma proporção PREENCHE os campos. Sem isto eles
  // ficam vazios, e o inverter não tem o que trocar.
  function escolherRatio(v) {
    setPnRatio(v);
    if (v === 'livre') { setPnRw(''); setPnRh(''); return; }
    const [a, b] = v.split(':');
    setPnRw(a || '');
    setPnRh(b || '');
  }
  const [ocupado, setOcupado]       = useState(false);
  // O progresso aceita função: os painéis ACUMULAM as falhas nele
  // (setProgresso(p => ({...p, falhas}))), em vez de sobrescrever.
  const [progresso, setProgresso]   = useState(null);

  // O modal vive na PÁGINA, não no card: dentro da grade ele nasceria preso
  // ao recorte dela e ficaria cortado.
  const [baixando, setBaixando]     = useState(null);   // o item a baixar

  // ── Gerar com o pincel ──
  //
  //  A tela devolve a imagem e a máscara já prontas (preto-e-branco, no
  //  tamanho nativo). Quem cobra é o servidor — e estorna se falhar.
  async function gerarComPincel({ modo, texto }) {
    const montar = montarPincel.current;
    if (!montar) return;

    const { imagem, mascara, pronto } = montar();

    // Valida ANTES de sair: o erro precisa de uma tela onde aparecer.
    if (!pronto) {
      throw new Error(modo === 'expansao'
        ? 'Arraste as bordas para definir a área a criar'
        : 'Pinte a área que você quer trocar');
    }

    // A base viaja para o slot: assim o "gerando" mostra a imagem desfocada
    // por trás, como nas outras gerações — e não um retângulo vazio.
    const previa = pincel?.previa || ('data:image/png;base64,' + pincel.base);

    setPincel(null);          // sai do pincel JÁ: o feed mostra o "gerando"
    setOcupado(true);
    // A forma do resultado é conhecida — 'auto' cairia no 4/3 padrão e
    // deitaria uma expansão vertical.
    //
    //   expansão      → a moldura (pnMed traz as medidas em pixels)
    //   preenchimento → a própria base, que não muda de forma
    const forma = (modo === 'expansao' && pnMed?.w && pnMed?.h)
      ? `${pnMed.w}:${pnMed.h}`
      : null;

    setProgresso({
      feito: 0, total: 1, estado: 'processando',
      proporcao: forma,          // null → mede-se a base logo abaixo
      base: previa
    });

    // Preenchimento: a forma é a da própria base
    if (!forma) {
      const img = new Image();
      img.onload = () => {
        const f = `${img.naturalWidth}:${img.naturalHeight}`;
        setProgresso((p) => (p ? { ...p, proporcao: f } : p));
      };
      img.src = previa;
    }

    try {
      await gerarGenerativa({ modo, imagem, mascara, texto });
      recarregarComFolga();

    } catch (e) {
      // O pincel já fechou: o erro aparece no feed, como o das outras abas.
      setErro('Não foi possível gerar: ' + e.message);

    } finally {
      setOcupado(false);
      setProgresso(null);
    }
  }

  // O que refazer quando a pessoa clica em "Tentar de novo".
  const [refazer, setRefazer]       = useState(null);

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
  const [excluindo, setExcluindo] = useState(null);   // o item a excluir
  const [detalhes, setDetalhes]   = useState(null);   // { lote, item }

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

  // `silencioso` = não pisca a tela.
  //
  //  Ao terminar uma geração recarregamos o feed — e o `setCarregando(true)`
  //  trocava TUDO por "Carregando...", fazendo as imagens sumirem e voltarem.
  //  Como recarregamos três vezes (o banco pode não ter salvado ainda), a
  //  tela piscava três vezes.
  //
  //  Agora só a PRIMEIRA carga mostra o aviso. As atualizações acontecem por
  //  baixo: as imagens antigas ficam na tela até as novas chegarem.
  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
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

  // Uma leitura da aba Análises, levada a um painel — com a imagem junto,
  // quando ela veio de uma geração. A pessoa cai lá com tudo pronto.
  const [leituraDeOutraAba, setLeituraDeOutraAba] = useState(null);

  function usarLeitura(l) {
    setLeituraDeOutraAba({ ...l, quando: Date.now() });
    setFerramenta(l.destino || 'render');
  }

  // O batch devolve VÁRIOS lotes (um por cena) — diferente do render, que
  // devolve um só. Recarregar o feed é o caminho mais simples e correto:
  // os lotes já estão no banco, salvos pelo servidor.
  function aoGerarBatch() {
    setUltimoLote(null);
    recarregarComFolga();
  }

  // ── Por que recarregar duas vezes ──
  //
  //  O servidor responde a imagem SEM esperar o salvamento no banco: o
  //  `salvarGeracaoAsync` é fire-and-forget (index.js), e agora demora ainda
  //  mais porque gera a miniatura junto.
  //
  //  Resultado: a web recebe a imagem, pede o feed, e o banco AINDA não tem
  //  a linha. O feed volta sem a geração nova — foi exatamente isso que
  //  aconteceu (o log dizia "salvo id=10", mas a imagem não aparecia).
  //
  //  Então recarregamos agora (para o caso de já ter salvado) e de novo dali
  //  a pouco (para o caso de não ter). Barato, e resolve sem mexer no
  //  servidor — que responde rápido de propósito.
  // ── Tentar de novo ──
  //
  //  Os créditos daquela imagem JÁ voltaram (o servidor estorna ao falhar).
  //  Então isto é uma geração nova, e cobra normal — a pessoa não está
  //  pagando duas vezes pela mesma coisa.
  //
  //  Quem sabe refazer é o PAINEL (ele tem a configuração). A página só
  //  avisa: "refaça a ordem N".
  function tentarDeNovo(ordem) {
    setRefazer({ ordem, quando: Date.now() });

    // Tira o cartão de erro: o slot volta a "gerando".
    setProgresso((p) => p && ({
      ...p,
      falhas: (p.falhas || []).filter((f) => f.ordem !== ordem)
    }));
  }

  // Descartar: a falha some da tela. Não há o que desfazer — os créditos já
  // voltaram, e a imagem nunca existiu.
  function descartarFalha(ordem) {
    setProgresso((p) => {
      if (!p) return p;

      const falhas = (p.falhas || []).filter((f) => f.ordem !== ordem);

      // Era a última coisa na tela? Some com o bloco inteiro.
      if (falhas.length === 0 && !ocupado) return null;

      return { ...p, falhas };
    });
  }

  function recarregarComFolga() {
    // Silencioso: a imagem nova aparece no lugar do slot, sem a tela piscar.
    carregar(true);
    setTimeout(() => carregar(true), 1800);
    setTimeout(() => carregar(true), 4500);   // a thumb de uma 4K pode demorar
  }

  // Apagar é irreversível — quem chama isto já confirmou.
  async function excluirDeVerdade(item) {
    try {
      await apagarGeracao(item.id);
      setExcluindo(null);
      setVendo(null);
      carregar(true);   // silencioso: a imagem some, o resto fica
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

      // O DESTINO viaja junto: sem ele, o Render e o Editar recebiam a mesma
      // imagem, e "Enviar para Editar" a colocava nas duas abas.
      setImagemDeOutraAba({
        base64,
        previa: item.thumb || item.url,
        geracaoId: item.id,
        para: destino
      });

      setFerramenta(destino);
    } catch (e) {
      setErro('Não foi possível carregar a imagem: ' + e.message);
    }
  }

  function aoGerar(r) {
    setUltimoLote({ loteId: r.loteId, assinatura: r.assinatura, prompt: r.prompt, quantas: r.quantas });
    recarregarComFolga();   // o banco pode não ter salvado ainda
    creditosMudaram();      // o menu e o anel atualizam
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
  // De qual lote veio este item? A janela de Detalhes precisa do lote (é ele
  // que guarda as configurações, o print de origem e as referências).
  function loteDoItem(id) {
    return lotes.find((l) => l.itens.some((i) => i.id === id));
  }

  // O X numa referência do Batch desaprova a imagem no feed — assim as duas
  // telas não se contradizem (a fonte da verdade continua sendo o feed).
  function desaprovarPorId(id) {
    const item = lotes.flatMap((l) => l.itens).find((i) => i.id === id);
    if (item) aprovar(item);
  }

  const aprovadas = lotes.flatMap((l) =>
    l.itens
      .filter((i) => i.aprovado)
      .map((i) => ({ id: i.id, url: i.url, thumb: i.thumb }))
  );

  // A grade contínua: todas as imagens, por mês (sem separar por lote)
  const porMes = agruparPorMes(lotes);
  const vazio  = !carregando && porMes.length === 0 && !progresso && upsAtivos.length === 0;

  // A Pós não cabe num painel de 380px: um editor de camadas espremido numa
  // coluna seria inútil. Enquanto ela está aberta, o painel e o feed saem.
  const ehTelaCheia = TELA_CHEIA.includes(ferramenta);

  if (ehTelaCheia) {
    return (
      <AppShell>
        <div className="cr-tela">
          <PainelPos
            aoSair={() => setFerramenta('render')}
            aoSalvarHistorico={async (dataUrl, extras) => {
              // A imagem editada vai para o feed, ao lado das gerações de IA.
              // A pessoa FICA na pós — pode continuar editando, baixar, salvar de
              // novo. O feed a terá quando ela voltar. Um toast confirma, com um
              // atalho para quem quiser ir ver.
              await salvarNoHistorico(dataUrl, extras);
              recarregarComFolga();
            }}
            aoUpscale={(dataUrl) => {
              // O Upscale entra depois; por ora a imagem composta volta para
              // o Editar, que já sabe recebê-la.
              setImagemDeOutraAba({
                para: 'editar',
                base64: dataUrl.split(',')[1],
                previa: dataUrl
              });
              setFerramenta('editar');
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="cr-tela">

        {/* ═══ Painel ═══ */}
        <aside className="cr-painel">
          {/* Sem `disabled={ocupado}`: a geração roda no servidor, e não há
              razão para prender a pessoa aqui. Ela pode trocar de aba e
              preparar o próximo trabalho enquanto este sai. */}
          <Trilho
            abas={ABAS}
            ativa={ferramenta}
            onTrocar={setFerramenta}
          />

          {/* ── Os painéis ficam MONTADOS, escondidos ──
              Renderizar só o da aba ativa desmontava os outros — e o React
              leva o estado junto: a imagem que a pessoa subiu, o texto que
              escreveu, tudo sumia ao trocar de aba e voltar.

              `hidden` esconde sem desmontar. O estado sobrevive. */}
          <div hidden={ferramenta !== 'render'}>
            <PainelRender
              leituraInicial={leituraDeOutraAba?.destino === 'render' ? leituraDeOutraAba : null}
              refazer={refazer}
              ocupado={ocupado}
              setOcupado={setOcupado}
              onProgresso={setProgresso}
              onPronto={aoGerar}
              imagemInicial={imagemDeOutraAba?.para === 'render' ? imagemDeOutraAba : null}
              loteAnterior={ultimoLote}
            />
          </div>

          <div hidden={ferramenta !== 'batch'}>
            <PainelBatch
              leituraInicial={leituraDeOutraAba?.destino === 'batch' ? leituraDeOutraAba : null}
              aprovadas={aprovadas}
              onDesaprovar={desaprovarPorId}
              ocupado={ocupado}
              setOcupado={setOcupado}
              onProgresso={setProgresso}
              onPronto={aoGerarBatch}
            />
          </div>

          {/* Com o pincel aberto, o painel vira os controles dele */}
          {pincel && ferramenta === 'editar' && (
            <PainelPincel
              modo={pincel.modo}
              ocupado={ocupado}
              onVoltar={() => setPincel(null)}
              onGerar={gerarComPincel}
              ferramenta={pnFerr}   setFerramenta={setPnFerr}
              tamanho={pnTam}       setTamanho={setPnTam}
              proporcao={pnRatio}   setProporcao={escolherRatio}
              medidas={pnMed}
              rw={pnRw}
              rh={pnRh}
              aoDigitarRazao={(eixo, v) => {
                // aceita só dígitos, como o plugin
                const lim = v.replace(/[^\d]/g, '').slice(0, 5);
                const rw = eixo === 'w' ? lim : pnRw;
                const rh = eixo === 'h' ? lim : pnRh;
                if (eixo === 'w') setPnRw(lim); else setPnRh(lim);
                // dois campos preenchidos = uma razão
                setPnRatio(rw && rh ? `${rw}:${rh}` : 'livre');
              }}
              aoInverter={() => {
                // edExpSwap: troca os dois valores e a razão vai junto
                setPnRw(pnRh);
                setPnRh(pnRw);
                setPnRatio(pnRh && pnRw ? `${pnRh}:${pnRw}` : 'livre');
              }}
              limpar={limparPincel}
            />
          )}

          <div hidden={ferramenta !== 'editar' || !!pincel}>
            <PainelEditar
              imagemInicial={imagemDeOutraAba?.para === 'editar' ? imagemDeOutraAba : null}
              ferramentas={conta?.ferramentas || []}
              ehAdmin={ehAdmin}
              ocupado={ocupado}
              setOcupado={setOcupado}
              onProgresso={setProgresso}
              onPronto={() => { setProgresso(null); recarregarComFolga(); }}
              onAbrirPincel={(p) => {
                // Cada abertura começa limpa: a marcação da anterior não
                // tem nada a ver com a imagem nova.
                setPnFerr('pincel');
                setPnTam(38);
                setPnRatio('livre');
                setPnMed(null);
                setPincel(p);
              }}
            />
          </div>

          {ferramenta === 'analises' && (
            <PainelAnalises onUsar={usarLeitura} />
          )}

          {ferramenta === 'upscale' && (
            <PainelUpscale
              imagemInicial={imagemDeOutraAba?.para === 'upscale' ? imagemDeOutraAba : null}
              ehAdmin={ehAdmin}
              ehTelaCheia={false}
              onIniciar={iniciarUpscale}
              onTerminar={(id) => { terminarUpscale(id); recarregarComFolga(); }}
            />
          )}

          {ferramenta !== 'render' && ferramenta !== 'batch' &&
           ferramenta !== 'editar' && ferramenta !== 'analises' &&
           ferramenta !== 'upscale' && (
            <div className="cr-painel-vazio">
              <p>A aba {ferramenta} entra em breve.</p>
            </div>
          )}
        </aside>

        {/* ═══ Feed ═══ */}
        <section className="cr-feed">

          {/* O pincel toma o feed. Ao sair, tudo volta — com o resultado. */}
          {pincel ? (
            <TelaPincel
              modo={pincel.modo}
              base={pincel.base}
              ferramenta={pnFerr}
              tamanho={pnTam}
              proporcao={pnRatio}
              setProporcao={escolherRatio}
              aoLimpar={limparPincel}
              aoMudarMoldura={setPnMed}
              onGerar={montarPincel}
            />
          ) : (
          <>

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
            <div className={'cr-ab' + (ladoA && ladoB ? ' cr-ab--pronto' : '')}>

              {/* Os slots MOSTRAM o que foi escolhido, em vez de narrar o que
                  falta fazer. E cada um se desfaz sozinho: escolheu errado,
                  troca só aquele — não precisa sair e recomeçar. */}
              <div className="cr-ab-slots">
                {[['A', ladoA, () => setLadoA(null)],
                  ['B', ladoB, () => setLadoB(null)]].map(([letra, lado, limpar], i) => (
                  <Fragment key={letra}>
                    {i === 1 && <span className="cr-ab-vs">vs</span>}

                    <div className={'cr-ab-slot' + (lado ? ' cr-ab-slot--cheio' : '')}>
                      {lado ? (
                        <>
                          <img src={lado.thumb || lado.url} alt="" />
                          <span>Imagem {letra}</span>
                          <button onClick={limpar} aria-label={'Tirar a imagem ' + letra}>
                            <svg viewBox="0 0 20 20" width="13" height="13" fill="none"
                                 stroke="currentColor" strokeWidth="1.7">
                              <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <b>{letra}</b>
                          <span>
                            {/* Só um dos dois é o próximo — o outro espera */}
                            {(letra === 'A' || ladoA) ? 'Clique numa imagem' : 'Depois, a segunda'}
                          </span>
                        </>
                      )}
                    </div>
                  </Fragment>
                ))}
              </div>

              <button className="cr-ab-sair" onClick={sairAB}>Cancelar</button>

              <button
                className="cr-ab-ver"
                onClick={() => setVendo({ ab: true })}
                disabled={!ladoA || !ladoB}
              >
                <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
                  <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
                Comparar
              </button>
            </div>
          )}

          <div className="cr-lista" ref={listaRef} onScroll={aoRolarLista}>

            {erro && <div className="cr-erro">{erro}</div>}

            {upsAtivos.map((u) => (
              <div className="cr-gerando" key={u.id}>
                <div className={`cr-cards cr-cards--${layout} cr-cards--${tamanho}`}>
                  <div className="cr-slot cr-slot--agora" style={{ aspectRatio: '1 / 1' }}>
                    {u.base && <img className="cr-slot-base" src={u.base} alt="" />}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>Upscale…</div>
                  </div>
                </div>
                <p className="cr-estorno">
                  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <circle cx="8" cy="8" r="6.2"/>
                    <path d="M8 5.2v3.4" strokeLinecap="round"/>
                    <circle cx="8" cy="11" r=".7" fill="currentColor" stroke="none"/>
                  </svg>
                  Se falhar, os créditos voltam automaticamente.
                </p>
              </div>
            ))}

            {/* ── Gerando ──
                Sem cabeçalho solto: o contador vai PARA DENTRO do slot, sobre
                a imagem base desfocada. O que era um texto flutuando no branco
                agora é parte da própria imagem que está nascendo. */}
            {progresso && (
              <div className="cr-gerando">

                {/* O aviso de fila FICA: é informação real, não decoração.
                    A pessoa precisa saber por que está demorando. */}
                {progresso.estado === 'na_fila' && (
                  <div className="cr-fila">
                    <span className="cr-spin" />
                    <span>Há muito tráfego agora — isso pode demorar mais que o normal.</span>
                  </div>
                )}

                <div className={`cr-cards cr-cards--${layout} cr-cards--${tamanho}`}>
                  {Array.from({ length: progresso.total }).map((_, i) => {
                    const falhou = (progresso.falhas || []).find((f) => f.ordem === i);
                    const saindo = !falhou && i === progresso.feito;

                    return (
                      <div
                        key={i}
                        className={
                          'cr-slot' +
                          (falhou ? ' cr-slot--erro'
                            : i < progresso.feito ? ' cr-slot--ok'
                            : saindo ? ' cr-slot--agora' : '')
                        }
                        style={{ aspectRatio: proporcaoCss(progresso.proporcao) }}
                      >

                        {/* ── Falhou ──
                            O slot NÃO some: vira um cartão de erro, sobre a
                            imagem base. A pessoa vê o que aconteceu e decide.

                            Os créditos já voltaram (o servidor estorna ao
                            falhar), então tentar de novo cobra normal — é uma
                            nova geração. */}
                        {falhou && (
                          <>
                            {progresso.base && (
                              <img className="cr-slot-base" src={progresso.base} alt="" />
                            )}

                            <div className="cr-erro-capa">
                              <svg viewBox="0 0 20 20" width="22" height="22" fill="none"
                                   stroke="currentColor" strokeWidth="1.4">
                                <path d="M10 3.5l7 12.5H3l7-12.5z" strokeLinejoin="round"/>
                                <path d="M10 8.5v3.2" strokeLinecap="round"/>
                                <circle cx="10" cy="13.9" r=".65" fill="currentColor" stroke="none"/>
                              </svg>

                              <div className="cr-erro-txt">
                                <strong>Não foi possível gerar</strong>
                                <span>Os créditos voltaram</span>
                              </div>

                              <div className="cr-erro-btns">
                                <button
                                  className="cr-erro-b"
                                  onClick={() => tentarDeNovo(i)}
                                  disabled={ocupado}
                                >Tentar de novo</button>

                                <button
                                  className="cr-erro-x"
                                  onClick={() => descartarFalha(i)}
                                  aria-label="Descartar"
                                >
                                  <svg viewBox="0 0 20 20" width="13" height="13" fill="none"
                                       stroke="currentColor" strokeWidth="1.5">
                                    <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" strokeLinecap="round"/>
                                    <path d="M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                        {/* A imagem base, desfocada: a pessoa vê a cena tomando
                            forma em vez de encarar um retângulo vazio. No Render
                            e no Batch é o print; na Editar, a imagem base. */}
                        {saindo && progresso.base && (
                          <img className="cr-slot-base" src={progresso.base} alt="" />
                        )}

                        {/* O contador, sobre a imagem. Este número é REAL: conta
                            imagens prontas do lote. (Dentro de cada imagem não há
                            progresso — o Gemini não informa quanto falta.) */}
                        {saindo && (
                          <span className="cr-slot-tag">
                            <span className="cr-spin cr-spin--claro" />
                            {progresso.total > 1
                              ? `${progresso.feito + 1} de ${progresso.total}`
                              : 'Gerando'}
                          </span>
                        )}

                        {!falhou && i > progresso.feito && (
                          <span className="cr-slot-n">{i + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Isto não é promessa: o servidor estorna de verdade ao
                    falhar (`estornarPedido`). Dizer isso ANTES tira o medo de
                    quem está vendo os créditos saírem da conta. */}
                {progresso && (
                  <p className="cr-estorno">
                    <svg viewBox="0 0 16 16" width="11" height="11" fill="none"
                         stroke="currentColor" strokeWidth="1.4">
                      <circle cx="8" cy="8" r="6.2"/>
                      <path d="M8 5.2v3.4" strokeLinecap="round"/>
                      <circle cx="8" cy="11" r=".7" fill="currentColor" stroke="none"/>
                    </svg>
                    Se falhar, os créditos voltam automaticamente.
                  </p>
                )}
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

                {/* Sem CSS Grid: as linhas rígidas deixavam buracos ao lado
                    das imagens verticais. O Masonry joga cada card na coluna
                    mais curta e o vazio some. */}
                <Masonry itens={mes.itens} tamanho={tamanho}>
                  {(it, i, medir, razao) => (
                    <Card
                      key={it.id}
                      it={it}
                      modoAB={modoAB}
                      ladoA={ladoA}
                      ladoB={ladoB}
                      onMedir={medir}
                      razao={razao}
                      onClick={() => {
                        if (modoAB) { escolherAB(it); return; }
                        setVendo({ loteId: it.loteId, itemId: it.id });
                      }}
                      onBaixar={setBaixando}
                      onFavoritar={favoritar}
                      onAprovar={aprovar}
                      onExcluir={setExcluindo}
                      onEnviarPara={enviarPara}
                      onDetalhes={(item) => setDetalhes({ lote: loteDoItem(item.id), item })}
                    />
                  )}
                </Masonry>
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
                        onBaixar={setBaixando}
                        onFavoritar={favoritar}
                        onAprovar={aprovar}
                        onExcluir={setExcluindo}
                        onEnviarPara={enviarPara}
                        onDetalhes={() => setDetalhes({ lote, item })}
                      />
                    ))}
                  </div>
                </article>
              );
            })}

          </div>
          </>
          )}

          <button
            className={'cr-voltar-topo' + (mostrarTopo ? ' cr-voltar-topo--on' : '')}
            onClick={voltarAoTopo}
            aria-label="Voltar ao topo"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
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
              onBaixar={setBaixando}
              onFavoritar={favoritar}
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
            onBaixar={setBaixando}
            onFavoritar={favoritar}
            onAprovar={aprovar}
            onExcluir={setExcluindo}
            onEnviarPara={enviarPara}
            onDetalhes={() => setDetalhes({ lote, item })}
          />
        );
      })()}

      {/* O modal de download e a confirmação servem ao card E à janela */}

      <ModalDetalhes
        aberto={detalhes !== null}
        lote={detalhes?.lote}
        item={detalhes?.item}
        onFechar={() => setDetalhes(null)}
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
      {baixando && (
        <ModalDownload
          item={baixando}
          onFechar={() => setBaixando(null)}
        />
      )}

    </AppShell>
  );
}
