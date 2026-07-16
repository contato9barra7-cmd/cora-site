'use client';

// ═══════════════════════════════════════════════════════════
//  PainelAnimacao — a aba de animação (Kling), espelho do plugin
//
//  A pessoa escolhe um modelo, sobe a imagem inicial (e opcionalmente a
//  final), descreve o movimento e gera um vídeo. Os campos, limites e nomes
//  acompanham o plugin.
//
//  Só a parte "Kling" nesta versão — as Sequências (Timelapse, Diretor de
//  Narrativa) entram numa próxima rodada.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import PickerImagem from './PickerImagem';
import ModalDownload from './ModalDownload';
import { salvarEtapaTimelapse } from '../lib/geracoes';
import IconeCredito from './IconeCredito';
import DropdownCora from './DropdownCora';
import { animarKling, custoAnimacao, custoTimelapseEtapa, custoTimelapseCompleto, custoTimelapsePrimeira, timelapsePrompts, gerarEtapaTimelapse, narrativaOrdem, narrativaRoteiro, CREDITOS } from '../lib/render';

const CUSTO_TL_PROMPTS = CREDITOS.tlPrompts;   // custo do planejamento (8)

const MODELOS = [
  { v: 'v2-1', n: 'Kling 2.1' },
  { v: 'v2-5', n: 'Kling 2.5' },
  { v: 'v2-6', n: 'Kling 2.6' },
  { v: 'v3',   n: 'Kling 3.0' }
];

const RESOLUCOES = {
  'v2-1': ['720p', '1080p'],
  'v2-5': ['720p', '1080p'],
  'v2-6': ['720p', '1080p'],
  'v3':   ['720p', '1080p', '4k']
};

const DURACOES = {
  'v2-1': ['5', '10'],
  'v2-5': ['5', '10'],
  'v2-6': ['5', '10'],
  'v3':   ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']
};

const AUDIO_SUP = { 'v2-1': false, 'v2-5': false, 'v2-6': true, 'v3': true };

// Proporções padrão do sistema — o feed espera uma delas (ex "3:4"),
// nunca as dimensões cruas em pixels ("1600:2846").
const PROPORCOES_PADRAO_TL = [
  '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '4:5', '5:4', '5:7', '7:5'
];
function proporcaoMaisProximaTL(w, h) {
  if (!w || !h) return 'auto';
  const alvo = w / h;
  let melhor = PROPORCOES_PADRAO_TL[0];
  let menorDif = Infinity;
  for (const p of PROPORCOES_PADRAO_TL) {
    const [a, b] = p.split(':').map(Number);
    const dif = Math.abs(a / b - alvo);
    if (dif < menorDif) { menorDif = dif; melhor = p; }
  }
  return melhor;
}

export default function PainelAnimacao({
  imagemInicial, ehAdmin, nav, onNav, onEnviarBase64, imgEditadaPos, onIniciar, onTerminar, onFeedAtualizar, onEtapaIniciar, onEtapaTerminar, onEtapaPronta, onMostrarInicial, onRemoverInicial
}) {
  // Seção e ferramenta vêm do pai (persistem ao trocar de aba e voltar).
  const secao = (nav && nav.secao) || 'animacao';
  const ferramenta = (nav && nav.ferramenta) || null;
  // Trocar de seção NÃO apaga a ferramenta aberta — ao voltar pra Sequências,
  // ela continua onde estava.
  const setSecao = (s) => onNav && onNav((a) => ({ ...(a || nav), secao: s }));
  const setFerramenta = (f) => onNav && onNav((a) => ({ ...(a || nav), secao: 'sequencias', ferramenta: f }));
  // Timelapse Externo
  // Dados do timelapse que NÃO podem se perder ao trocar de aba (vêm do pai).
  const tlDados = (nav && nav.tl) || { base: null, res: '2k', etapas: [], imgs: [], passo: 0, modo: null };
  const tlBase = tlDados.base;
  const tlRes = tlDados.res || '2k';
  const tlEtapas = tlDados.etapas || [];
  const tlImgs = tlDados.imgs || [];
  const tlPasso = tlDados.passo || 0;      // próxima etapa a gerar (modo passo)
  const tlModo = tlDados.modo || null;     // 'completo' | 'passo'
  const tlSeqId = tlDados.seqId || null;   // loteId comum das etapas no feed
  const tlTipo = tlDados.tipo || 'externo';        // 'externo' | 'interior'
  const tlModoInt = tlDados.modoInterior || 'reforma';  // 'reforma' | 'obra_nova'
  const patchTl = (patch) => onNav && onNav((atual) => {
    const base = atual || nav || {};
    const tlAtual = base.tl || tlDados;
    return { ...base, tl: { ...tlAtual, ...patch } };
  });
  const setTlBase = (v) => patchTl({ base: typeof v === 'function' ? v(tlBase) : v });
  const setTlRes = (v) => patchTl({ res: v });
  const setTlTipo = (v) => patchTl({ tipo: v });
  const setTlModoInt = (v) => patchTl({ modoInterior: v });
  // Nº de etapas geradas por tipo (o servidor decide, mas o custo do botão
  // "completo" precisa saber de antemão): externo=7, reforma=8, obra nova=7.
  const tlNEtapas = (tlTipo === 'interior' && tlModoInt === 'reforma') ? 8 : 7;
  // Transitórios (não precisam sobreviver à troca de aba).
  const [tlPopRes, setTlPopRes] = useState(false);
  const [tlStatus, setTlStatus] = useState('');   // texto de progresso
  const [tlRodando, setTlRodando] = useState(false);
  const [tlErro, setTlErro]   = useState('');
  // Visualizador da imagem da sequência (índice aberto, ou null).
  const [tlVer, setTlVer]     = useState(null);
  const [tlBaixar, setTlBaixar] = useState(false);   // modal de download
  const [modelo, setModelo]   = useState('');
  const [inicio, setInicio]   = useState(null);   // { base64 }
  const [fim, setFim]         = useState(null);
  const [timelapse, setTimelapse] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState('5');
  const [resolucao, setResolucao] = useState('720p');
  const [audio, setAudio]     = useState(false);
  const [picker, setPicker]   = useState(null);    // 'inicio' | 'fim' | null
  const [pop, setPop]         = useState(null);     // 'dur' | 'res' | null
  const [erro, setErro]       = useState('');

  // ── Diretor de Narrativa ──
  // Persistidos via nav (sobrevivem à troca de aba), igual ao timelapse.
  const narrDados = (nav && nav.narr) || { imagens: [], ordem: [], confirmado: false, takes: null, ritmo: '', trilha: '' };
  const narrImagens = narrDados.imagens || [];   // [{ n, base64 }]
  const narrOrdem = narrDados.ordem || [];        // ordem atual dos números
  const narrConfirmado = !!narrDados.confirmado;
  const narrTakes = narrDados.takes;              // null antes de gerar
  const narrRitmo = narrDados.ritmo || '';
  const narrTrilha = narrDados.trilha || '';
  const patchNarr = (patch) => onNav && onNav((atual) => {
    const base = atual || nav || {};
    const nAtual = base.narr || narrDados;
    return { ...base, narr: { ...nAtual, ...patch } };
  });
  // Transitórios
  const [narrStatus, setNarrStatus] = useState('');
  const [narrRodando, setNarrRodando] = useState(false);
  const [narrErro, setNarrErro] = useState('');
  const [narrDrag, setNarrDrag] = useState(null);   // índice sendo arrastado
  const narrFileRef = useRef(null);

  // Fecha os popovers de opção ao clicar fora deles.
  useEffect(() => {
    if (!pop) return;
    function fora(e) { if (!e.target.closest('.anim-pill-wrap')) setPop(null); }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [pop]);

  // Fecha o popover de resolução do timelapse ao clicar fora.
  useEffect(() => {
    if (!tlPopRes) return;
    function fora(e) { if (!e.target.closest('.tl-pill-wrap')) setTlPopRes(false); }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [tlPopRes]);

  // Imagem vinda de outra aba (ex.: "Enviar para Animação", ou uma etapa do
  // timelapse). O slot diz se vai como início ou fim do vídeo.
  useEffect(() => {
    if (imagemInicial && imagemInicial.base64) {
      const b64 = imagemInicial.base64.replace(/^data:[^,]+,/, '');
      if (imagemInicial.slot === 'fim') definirFim(b64);
      else definirInicio(b64);
      // garante que a pessoa cai na tela da animação (não em Sequências)
      if (secao !== 'animacao') setSecao('animacao');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagemInicial]);

  // Imagem editada que voltou da Pós (fluxo "enviar para pós" de uma etapa):
  // recoloca no slot correspondente e salva a versão editada no feed.
  const posEditRef = useRef(null);
  useEffect(() => {
    if (imgEditadaPos && imgEditadaPos.ts && imgEditadaPos.ts !== posEditRef.current && imgEditadaPos.base64) {
      posEditRef.current = imgEditadaPos.ts;
      const pos = imgEditadaPos.pos;
      if (Number.isInteger(pos)) {
        const acc = tlImgs.slice();
        acc[pos] = imgEditadaPos.base64;
        patchTl({ imgs: acc });
        salvarEtapaNoFeed(imgEditadaPos.base64, pos, tlSeqId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEditadaPos]);

  // Mede a imagem para guardar w/h (a proporção do vídeo segue a inicial).
  function definirInicio(b64) {
    const img = new Image();
    img.onload = () => setInicio({ base64: b64, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setInicio({ base64: b64, w: 0, h: 0 });
    img.src = 'data:image/png;base64,' + b64;
  }
  function definirFim(b64) {
    const img = new Image();
    img.onload = () => setFim({ base64: b64, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setFim({ base64: b64, w: 0, h: 0 });
    img.src = 'data:image/png;base64,' + b64;
  }

  // Ao trocar de modelo, corrige duração/resolução/áudio para o que ele suporta.
  useEffect(() => {
    if (!modelo) return;
    const durs = DURACOES[modelo] || ['5'];
    if (!durs.includes(duracao)) setDuracao(durs[0]);
    const res = RESOLUCOES[modelo] || ['720p'];
    if (!res.includes(resolucao)) setResolucao(res[0]);
    if (!AUDIO_SUP[modelo]) setAudio(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo]);

  const temAudio  = AUDIO_SUP[modelo];

  const custo = custoAnimacao(modelo, resolucao, audio, duracao);

  function inverter() { const a = inicio; setInicio(fim); setFim(a); }
  function copiarParaFim() { if (inicio) setFim({ base64: inicio.base64 }); }
  function copiarParaInicio() { if (fim) setInicio({ base64: fim.base64 }); }

  // A seta entre os cards muda conforme o que já foi preenchido:
  //  - só inicial → seta → que COPIA a inicial para a final
  //  - só final   → seta ← que COPIA a final para a inicial
  //  - as duas    → seta ⇄ que INVERTE as posições
  const SETA_DIR = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12h14" strokeLinecap="round"/><path d="M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const SETA_ESQ = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12H6" strokeLinecap="round"/><path d="M10 7l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const SETA_DUPLA = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 4L4 7l3 3" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 7h13a3 3 0 0 1 3 3" strokeLinecap="round"/><path d="M17 20l3-3-3-3" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 17H7a3 3 0 0 1-3-3" strokeLinecap="round"/></svg>;

  let seta = null;
  if (inicio && fim)      seta = { icone: SETA_DUPLA, acao: inverter, tip: 'Inverter início e fim' };
  else if (inicio)        seta = { icone: SETA_DIR, acao: copiarParaFim, tip: 'Copiar imagem inicial para a final' };
  else if (fim)           seta = { icone: SETA_ESQ, acao: copiarParaInicio, tip: 'Copiar imagem final para a inicial' };

  async function gerar() {
    if (!modelo) { setErro('Escolha um modelo primeiro'); return; }
    if (!inicio) { setErro('Suba a imagem inicial primeiro'); return; }
    setErro('');

    const iniB64 = inicio.base64;
    const prop = proporcaoMaisProximaTL(inicio.w, inicio.h);
    const ativoId = onIniciar ? onIniciar('data:image/png;base64,' + iniB64, prop) : null;

    try {
      const r = await animarKling({
        modelo,
        modeloLabel: (MODELOS.find((m) => m.v === modelo) || {}).n,
        imagemInicio: iniB64,
        imagemFim: fim ? fim.base64 : '',
        duracao,
        resolucao,
        descricao,
        timelapse,
        audio: temAudio && audio
      });
      if (!r.url) setErro('Não foi possível gerar a animação');
    } catch (e) {
      setErro(e.message);
    } finally {
      onTerminar && onTerminar(ativoId);
    }
  }

  // ── Timelapse Externo ──
  //
  //  N etapas geram N+1 slots na ORDEM DO VÍDEO: pos 0 = terreno (primeira
  //  etapa) ... pos N = a imagem enviada (obra pronta, já preenchida).
  //  A etapa i (0..N-1) desconstrói a partir da imagem da etapa anterior e
  //  ocupa o slot pos = (N-1) - i.
  // Salva uma etapa no feed, com o loteId comum da sequência (para agrupar).
  // Best-effort: se falhar, a geração não é interrompida.
  const jaSalvasRef = useRef(new Set());
  const inicialTlRef = useRef(null);   // { cardId, base64 } no modo passo
  async function salvarEtapaNoFeed(b64, ordem, seqId, refB64) {
    const chave = seqId + ':' + ordem;
    console.log('[tl] salvando no feed loteId=' + seqId + ' ordem=' + ordem);
    if (jaSalvasRef.current.has(chave)) { console.log('[tl] BLOQUEADO duplicata', chave); return; }
    jaSalvasRef.current.add(chave);
    try {
      await salvarEtapaTimelapse(b64, {
        loteId: seqId,
        ordem: ordem,
        proporcao: tlBase && tlBase.proporcao,
        resolucao: tlRes,
        original: refB64 || null
      });
      onFeedAtualizar && onFeedAtualizar();   // recarrega o feed para a imagem aparecer na hora
    } catch (e) {
      jaSalvasRef.current.delete(chave);   // falhou: libera pra tentar de novo
      console.error('[timelapse] falha ao salvar no feed:', e && e.message);
    }
  }

  async function rodarTimelapse(modo) {
    if (!tlBase) { setTlErro('Suba a imagem base primeiro'); return; }
    setTlErro('');
    setTlRodando(true);
    setTlStatus('Planejando etapas...');
    const baseB64 = tlBase.base64;
    const prop = tlBase.proporcao || 'auto';
    const res = tlRes;
    const seqId = 'tl_' + Date.now();   // loteId comum de toda a sequência
    try {
      const etapas = await timelapsePrompts({ image: baseB64, tipo: tlTipo, modoInterior: tlModoInt });
      const N = etapas.length;
      // slots na ordem do vídeo; o último (pos N) já é a imagem enviada
      const imgs = new Array(N + 1).fill(null);
      imgs[N] = baseB64;
      patchTl({ etapas, imgs: imgs.slice(), passo: 0, modo, seqId });
      // A imagem enviada (a obra pronta) entra no feed JÁ, como 1º card do lote
      // (ordem 0). As etapas entram ao lado conforme ficam prontas.
      salvarEtapaNoFeed(baseB64, 0, seqId);

      if (modo === 'passo') {
        // gera só a 1ª etapa e para para revisão
        await gerarEtapaPasso(0, etapas, imgs, baseB64, prop, res, seqId);
      } else {
        // completo: gera todas em cadeia
        let base = baseB64;
        const acc = imgs.slice();
        for (let i = 0; i < N; i++) {
          setTlStatus(`Gerando etapa ${i + 1} de ${N}...`);
          const et = etapas[i] || {};
          const promptEt = et.pt || et.prompt || '';
          const pos = (N - 1) - i;
          const phId = onEtapaIniciar ? onEtapaIniciar(base, prop, seqId) : null;   // placeholder carregando no feed
          let b64;
          try {
            b64 = await gerarEtapaTimelapse({ image: base, prompt: promptEt, proporcao: prop, resolucao: res, primeira: i === 0 });
          } catch (e) {
            onEtapaTerminar && phId && onEtapaTerminar(phId);   // falhou: tira o placeholder
            throw e;
          }
          // Pronta: o placeholder vira a imagem na hora (sem esperar o feed).
          onEtapaPronta && phId && onEtapaPronta(phId, b64, i + 1);
          acc[pos] = b64;
          patchTl({ etapas, imgs: acc.slice(), passo: i + 1, modo, seqId });
          salvarEtapaNoFeed(b64, i + 1, seqId, base);
          base = b64;
        }
        setTlStatus('Sequência completa!');
        // Folga extra: a última etapa salva async no servidor. Recarrega de
        // novo depois de um tempo para garantir que ela apareça no feed.
        if (onFeedAtualizar) {
          setTimeout(() => onFeedAtualizar(), 2500);
          setTimeout(() => onFeedAtualizar(), 6000);
        }
      }
    } catch (e) {
      setTlErro(e.message);
      setTlStatus('');
    } finally {
      setTlRodando(false);
    }
  }

  // Gera uma etapa específica (modo passo). Usa a imagem da etapa anterior
  // como base (ou a enviada, se for a primeira).
  async function gerarEtapaPasso(i, etapas, imgsAtual, baseInicial, prop, res, seqId) {
    const N = etapas.length;
    const idSeq = seqId || tlSeqId || ('tl_' + Date.now());
    setTlRodando(true);
    setTlStatus(`Gerando etapa ${i + 1} de ${N}...`);
    // base = imagem da etapa anterior (pos maior) ou a enviada
    const posAnterior = (N - 1) - (i - 1);       // pos do slot da etapa i-1
    const base = i === 0 ? baseInicial : (imgsAtual[posAnterior] || baseInicial);
    const et = etapas[i] || {};
    const promptEt = et.pt || et.prompt || '';
    const phId = onEtapaIniciar ? onEtapaIniciar(base, prop, idSeq) : null;   // placeholder carregando no feed
    try {
      const b64 = await gerarEtapaTimelapse({ image: base, prompt: promptEt, proporcao: prop, resolucao: res, primeira: i === 0 });
      const pos = (N - 1) - i;
      const acc = imgsAtual.slice();
      acc[pos] = b64;
      onEtapaPronta && phId && onEtapaPronta(phId, b64, i + 1);   // vira imagem na hora
      patchTl({ etapas, imgs: acc, passo: i + 1, modo: 'passo', seqId: idSeq });
      salvarEtapaNoFeed(b64, i + 1, idSeq, base);
      setTlStatus(i + 1 >= N ? 'Sequência completa!' : `Etapa ${i + 1} pronta. Revise e gere a próxima.`);
    } catch (e) {
      onEtapaTerminar && phId && onEtapaTerminar(phId);   // falhou: tira o placeholder
      setTlErro(e.message);
      setTlStatus('');
    } finally {
      setTlRodando(false);
    }
  }

  // Botão "gerar próxima etapa" (modo passo).
  async function gerarProxima() {
    if (!tlBase) return;
    await gerarEtapaPasso(tlPasso, tlEtapas, tlImgs, tlBase.base64, tlBase.proporcao || 'auto', tlRes, tlSeqId);
  }

  // Botão "refazer esta etapa": regenera a última etapa gerada.
  async function refazerEtapa() {
    if (!tlBase) return;
    const i = tlPasso - 1;   // última etapa gerada
    if (i < 0) return;
    const N = tlEtapas.length;
    const pos = (N - 1) - i;
    const acc = tlImgs.slice();
    acc[pos] = null;         // limpa o slot
    patchTl({ imgs: acc, passo: i });
    await gerarEtapaPasso(i, tlEtapas, acc, tlBase.base64, tlBase.proporcao || 'auto', tlRes, tlSeqId);
  }

  // "Resetar e fazer outra": zera a sequência inteira (volta ao estado inicial).
  function resetarTimelapse() {
    setTlErro('');
    setTlStatus('');
    patchTl({ base: null, etapas: [], imgs: [], passo: 0, modo: null });
  }

  // ── Diretor de Narrativa: funções ──
  const NARR_MAX = 20;

  // Adiciona imagens (do feed via picker, ou upload). Renumera 1..N.
  function narrAddImagens(lista) {
    const atuais = narrImagens.slice();
    for (const b of lista) {
      if (atuais.length >= NARR_MAX) break;
      const base64 = (b || '').replace(/^data:[^,]+,/, '');
      if (base64) atuais.push({ base64 });
    }
    const numeradas = atuais.map((im, i) => ({ ...im, n: i + 1 }));
    patchNarr({ imagens: numeradas });
  }

  function narrRemover(n) {
    const filtradas = narrImagens.filter((im) => im.n !== n).map((im, i) => ({ ...im, n: i + 1 }));
    // remover imagem invalida a ordem/roteiro já gerados
    patchNarr({ imagens: filtradas, ordem: [], confirmado: false, takes: null, ritmo: '', trilha: '' });
  }

  function narrUpload(ev) {
    const files = Array.from(ev.target.files || []);
    ev.target.value = '';
    if (!files.length) return;
    const lidos = [];
    let pendentes = files.length;
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = (e) => {
        lidos.push(e.target.result);
        if (--pendentes === 0) narrAddImagens(lidos);
      };
      r.onerror = () => { if (--pendentes === 0 && lidos.length) narrAddImagens(lidos); };
      r.readAsDataURL(f);
    });
  }

  // Etapa 1 → 2: pede a ordem à IA. Depois o usuário arrasta pra ajustar.
  async function narrAnalisarOrdem() {
    if (narrImagens.length < 2) { setNarrErro('Selecione pelo menos 2 imagens.'); return; }
    setNarrErro('');
    setNarrRodando(true);
    setNarrStatus('Analisando o projeto e montando a sequência narrativa...');
    try {
      const ordem = await narrativaOrdem(narrImagens.map((im) => ({ n: im.n, base64: im.base64 })));
      // valida: só números que existem; completa com os que faltarem
      const validos = ordem.filter((n) => narrImagens.some((im) => im.n === n));
      narrImagens.forEach((im) => { if (!validos.includes(im.n)) validos.push(im.n); });
      patchNarr({ ordem: validos, confirmado: false, takes: null });
    } catch (e) {
      setNarrErro('Erro ao sugerir a ordem: ' + (e.message || ''));
    } finally {
      setNarrRodando(false);
      setNarrStatus('');
    }
  }

  // Drag-and-drop pra reordenar os números na etapa 2.
  function narrDragStart(i) { setNarrDrag(i); }
  function narrDragOver(i, ev) {
    ev.preventDefault();
    if (narrDrag === null || narrDrag === i) return;
    const nova = narrOrdem.slice();
    const [movido] = nova.splice(narrDrag, 1);
    nova.splice(i, 0, movido);
    setNarrDrag(i);
    patchNarr({ ordem: nova });
  }
  function narrDragEnd() { setNarrDrag(null); }

  // Etapa 2 → 3: confirma a ordem e gera o roteiro (takes + ritmo + trilha).
  async function narrGerarRoteiro() {
    setNarrErro('');
    setNarrRodando(true);
    setNarrStatus('Montando o roteiro de direção (câmera, closes, transições, ritmo)...');
    try {
      const naOrdem = narrOrdem.map((n) => narrImagens.find((im) => im.n === n)).filter(Boolean);
      const r = await narrativaRoteiro(naOrdem.map((im) => ({ n: im.n, base64: im.base64 })), 'pt');
      patchNarr({ confirmado: true, takes: r.takes, ritmo: r.ritmo, trilha: r.trilha });
    } catch (e) {
      setNarrErro('Erro ao gerar o roteiro: ' + (e.message || ''));
    } finally {
      setNarrRodando(false);
      setNarrStatus('');
    }
  }

  // Take → aba Animação: imagem inicial (+ final se frames=2) e câmera na descrição.
  function narrAnimarTake(take) {
    const imgIni = narrImagens.find((im) => im.n === take.imagem);
    if (!imgIni) return;
    definirInicio(imgIni.base64);
    if (take.frames === 2 && take.imagem_fim) {
      const imgFim = narrImagens.find((im) => im.n === take.imagem_fim);
      if (imgFim) definirFim(imgFim.base64); else setFim(null);
    } else {
      setFim(null);
    }
    setDescricao(take.camera || '');
    setSecao('animacao');
  }

  function narrCopiarTudo() {
    if (!narrTakes) return;
    let txt = 'ROTEIRO DE DIREÇÃO\n\n';
    narrTakes.forEach((tk) => {
      txt += `Take ${tk.n_take} — ${tk.momento || ''}\n`;
      txt += `Câmera: ${tk.camera || ''}\n`;
      if (tk.close) txt += `Close: ${tk.close}\n`;
      if (tk.transicao) txt += `Transição: ${tk.transicao}\n`;
      txt += '\n';
    });
    if (narrRitmo) txt += `Ritmo: ${narrRitmo}\n\n`;
    if (narrTrilha) txt += `Trilha e som: ${narrTrilha}\n`;
    try { navigator.clipboard.writeText(txt); } catch (e) {}
  }

  function narrResetar() {
    setNarrErro('');
    setNarrStatus('');
    patchNarr({ imagens: [], ordem: [], confirmado: false, takes: null, ritmo: '', trilha: '' });
  }

  // Ações das imagens (usadas tanto na miniatura quanto no preview grande).
  function tlParaInicio(pos) { onEnviarBase64 && onEnviarBase64('animacao', tlImgs[pos], 'inicio'); setTlVer(null); }
  function tlParaFim(pos) { onEnviarBase64 && onEnviarBase64('animacao', tlImgs[pos], 'fim'); setTlVer(null); }
  function tlParaPos(pos) { onEnviarBase64 && onEnviarBase64('pos', tlImgs[pos], null, { pos }); setTlVer(null); }
  function tlBaixarPos(pos) { setTlVer(pos); setTlBaixar(true); }

  // Baixa uma etapa no formato escolhido (png ou jpeg), convertendo via canvas.
  function baixarEtapa(i, formato) {
    const b64 = tlImgs[i];
    if (!b64) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (formato === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0);
      const mime = formato === 'jpeg' ? 'image/jpeg' : 'image/png';
      const url = c.toDataURL(mime, formato === 'jpeg' ? 0.92 : undefined);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timelapse-etapa-${i + 1}.${formato === 'jpeg' ? 'jpg' : 'png'}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };
    img.src = 'data:image/png;base64,' + b64;
  }

  return (
    <div className="up-painel">

      {/* ── Seletor Animação / Sequências (fixo no topo) ── */}
      <div className="anim-seletor">
        <button
          className={'anim-sel-btn' + (secao === 'animacao' ? ' anim-sel-btn--on anim-sel-btn--anim-on' : '')}
          onClick={() => setSecao('animacao')}
        >
          <span className="anim-sel-faixa anim-sel-faixa--anim">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>
          <span className="anim-sel-txt">Animação</span>
        </button>
        <button
          className={'anim-sel-btn' + (secao === 'sequencias' ? ' anim-sel-btn--on anim-sel-btn--seq-on' : '')}
          onClick={() => setSecao('sequencias')}
        >
          <span className="anim-sel-faixa anim-sel-faixa--seq">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>
          </span>
          <span className="anim-sel-txt">Sequências</span>
        </button>
      </div>

      {secao === 'animacao' && (<>

      {/* ── Modelo ── */}
      <section className="up-bloco">
        <div className="cr-sec">Animação</div>
        <label className="up-lbl">Modelo</label>
        <DropdownCora valor={modelo} opcoes={[{ v: '', n: 'Escolher modelo' }, ...MODELOS]} onEscolher={setModelo} />
      </section>

      {/* ── Imagem inicial e final ── */}
      <section className="up-bloco">
        <div className="cr-sec">Imagens</div>
        <div className="anim-refs">
          <button
            className={'anim-card' + (inicio ? ' anim-card--img' : '') + (!inicio ? ' anim-card--obrig' : '')}
            onClick={() => setPicker('inicio')}
          >
            {inicio ? (
              <>
                <img src={'data:image/png;base64,' + inicio.base64} alt="" />
                <span className="anim-card-x" onClick={(e) => { e.stopPropagation(); setInicio(null); }} aria-label="Remover">×</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span className="anim-card-lbl">Imagem inicial</span>
              </>
            )}
          </button>

          {seta && (
            <button className="anim-seta" onClick={seta.acao} title={seta.tip} aria-label={seta.tip}>
              {seta.icone}
            </button>
          )}

          <button
            className={'anim-card' + (fim ? ' anim-card--img' : '')}
            onClick={() => setPicker('fim')}
          >
            {fim ? (
              <>
                <img src={'data:image/png;base64,' + fim.base64} alt="" />
                <span className="anim-card-x" onClick={(e) => { e.stopPropagation(); setFim(null); }} aria-label="Remover">×</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span className="anim-card-lbl">Imagem final</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Modo timelapse ── */}
      <section className="up-bloco">
        <label className="anim-check">
          <input type="checkbox" className="cora-check-bola" checked={timelapse} onChange={(e) => setTimelapse(e.target.checked)} />
          <span>Modo timelapse de obra</span>
        </label>
        <p className="cr-hint">Use apenas para timelapse de obra. Para qualquer outra animação, deixe desligado — a descrição abaixo cria o movimento.</p>
      </section>

      {/* ── Descrição ── */}
      {!timelapse && (
        <section className="up-bloco">
          <div className="cr-sec">Descrição (opcional)</div>
          <textarea
            className="up-textarea"
            rows={4}
            maxLength={2500}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o movimento como falaria com a IA. Ex: a câmera entra pela porta e avança até a sala revelando o ambiente."
            spellCheck={false}
          />
          <p className="anim-contador">{descricao.length}/2500</p>
        </section>
      )}

      {/* ── Opções ── */}
      <section className="up-bloco">
        <div className="cr-sec">Opções</div>
        <div className="anim-pills">
          <div className="anim-pill-wrap">
            <button className="anim-pill" onClick={() => setPop(pop === 'dur' ? null : 'dur')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg>
              <span>{duracao}s</span>
            </button>
            {pop === 'dur' && (
              <div className="anim-pop">
                {(DURACOES[modelo] || ['5']).map((d) => (
                  <button key={d} className={d === duracao ? 'sel' : ''} onClick={() => { setDuracao(d); setPop(null); }}>{d}s</button>
                ))}
              </div>
            )}
          </div>

          <div className="anim-pill-wrap">
            <button className="anim-pill" onClick={() => setPop(pop === 'res' ? null : 'res')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
              <span>{resolucao}</span>
            </button>
            {pop === 'res' && (
              <div className="anim-pop">
                {(RESOLUCOES[modelo] || ['720p']).map((r) => (
                  <button key={r} className={r === resolucao ? 'sel' : ''} onClick={() => { setResolucao(r); setPop(null); }}>{r}</button>
                ))}
              </div>
            )}
          </div>

          {temAudio && (
            <button className={'anim-pill' + (audio ? ' anim-pill--on' : '')} onClick={() => setAudio(!audio)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 5L6 9H2v6h4l5 4V5z"/>{audio && <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round"/>}</svg>
              <span>{audio ? 'Áudio ON' : 'Áudio OFF'}</span>
            </button>
          )}
        </div>
      </section>

      {erro && <p className="up-erro">{erro}</p>}

      {/* ── Gerar ── */}
      <button className="cr-btn-gerar up-gerar" onClick={gerar} disabled={!inicio || !modelo}>
        <span>Gerar animação</span>
        {inicio && modelo && custo > 0 && (
          <span className="cr-custo-tag"><IconeCredito /> {custo}</span>
        )}
      </button>

      </>)}

      {secao === 'sequencias' && !ferramenta && (
        <section className="up-bloco">
          <div className="cr-sec">Ferramentas</div>
          <div className="seq-cards">
            <button className="seq-card" onClick={() => { setTlTipo('externo'); setFerramenta('tl-externo'); }}>
              <span className="seq-faixa" style={{ background: '#E6F1FB' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V11l7-5 7 5v10"/><path d="M9 21v-6h6v6"/><path d="M2 11l10-7 10 7"/></svg>
              </span>
              <span className="seq-corpo">
                <strong>Timelapse Externo</strong>
                <span>Gera a sequência de construção (do terreno à obra pronta) a partir de um render externo.</span>
              </span>
            </button>
            <button className="seq-card" onClick={() => { setTlTipo('interior'); setFerramenta('tl-interior'); }}>
              <span className="seq-faixa" style={{ background: '#E1F5EE' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M4 21V8h16v13"/><rect x="9" y="13" width="6" height="8"/><path d="M4 8l8-5 8 5"/></svg>
              </span>
              <span className="seq-corpo">
                <strong>Timelapse Interiores</strong>
                <span>Sequência de construção de um ambiente interno.</span>
              </span>
            </button>
            <button className="seq-card" onClick={() => setFerramenta('diretor')}>
              <span className="seq-faixa" style={{ background: '#FAEEDA' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/></svg>
              </span>
              <span className="seq-corpo">
                <strong>Diretor de Narrativa</strong>
                <span>Cria uma sequência de cenas com direção cinematográfica.</span>
              </span>
            </button>
          </div>
        </section>
      )}

      {secao === 'sequencias' && (ferramenta === 'tl-externo' || ferramenta === 'tl-interior') && (
        <>
          {/* ── Voltar (igual ao Editar) ── */}
          <button className="cr-voltar ed-voltar" style={{ alignSelf: 'flex-start' }} onClick={() => !tlRodando && setFerramenta(null)}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar
          </button>

          <div className="cr-sec" style={{ marginTop: 14 }}>{tlTipo === 'interior' ? 'Timelapse Interiores' : 'Timelapse Externo'}</div>
          <p className="seq-hint">{tlTipo === 'interior'
            ? 'Escolha o render final do ambiente. A IA vai gerar a sequência de desconstrução (do ambiente pronto até a estrutura).'
            : 'Escolha um render externo final. A IA vai gerar a sequência de desconstrução (da obra pronta até o terreno).'}</p>

          {/* ── Interior: escolha reforma / obra nova ── */}
          {tlTipo === 'interior' && (
            <section className="up-bloco">
              <div className="cr-sec">Tipo de obra</div>
              <div className="seq-modo-int">
                <button
                  className={'seq-modo-int-btn' + (tlModoInt === 'reforma' ? ' seq-modo-int-btn--on' : '')}
                  onClick={() => !tlRodando && tlEtapas.length === 0 && setTlModoInt('reforma')}
                  disabled={tlRodando || tlEtapas.length > 0}
                >
                  <strong>Reforma</strong>
                  <span>Termina num ambiente simples existente, pronto para reformar.</span>
                </button>
                <button
                  className={'seq-modo-int-btn' + (tlModoInt === 'obra_nova' ? ' seq-modo-int-btn--on' : '')}
                  onClick={() => !tlRodando && tlEtapas.length === 0 && setTlModoInt('obra_nova')}
                  disabled={tlRodando || tlEtapas.length > 0}
                >
                  <strong>Obra nova</strong>
                  <span>Termina na estrutura bruta (concreto e alvenaria, sem acabamento).</span>
                </button>
              </div>
            </section>
          )}

          {/* ── Imagem final (mesmo seletor do Render) ── */}
          <section className="up-bloco">
            <div className="cr-sec">Imagem final</div>
            {tlBase ? (
              <div className="cr-base">
                <img src={'data:image/png;base64,' + tlBase.base64} alt="" />
                <button className="cr-base-x" onClick={() => setTlBase(null)} aria-label="Remover imagem">×</button>
              </div>
            ) : (
              <button className="cr-drop" onClick={() => setPicker('tl-base')}>
                <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/>
                  <path d="M3 14l4-4 3.5 3.5L14 9l3.5 3.5"/>
                </svg>
                <span>Escolher imagem</span>
              </button>
            )}
          </section>

          {/* ── Resolução (pill estilo plugin: pequeno, à esquerda, seta ▲) ── */}
          <div className="tl-pill-wrap" style={{ marginTop: 14 }}>
            <button
              className={'tl-pill' + (tlPopRes ? ' tl-pill--on' : '')}
              onClick={(e) => { e.stopPropagation(); setTlPopRes((v) => !v); }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              <span>{tlRes.toUpperCase()}</span>
              <span className="tl-pill-seta">▲</span>
            </button>
            {tlPopRes && (
              <div className="tl-pill-pop" onClick={(e) => e.stopPropagation()}>
                {['1k', '2k', '4k'].map((rk) => (
                  <button
                    key={rk}
                    className={'tl-pill-opt' + (tlRes === rk ? ' tl-pill-opt--on' : '')}
                    onClick={() => { setTlRes(rk); setTlPopRes(false); }}
                  >{rk.toUpperCase()}</button>
                ))}
              </div>
            )}
          </div>

          {tlErro && <p className="up-erro">{tlErro}</p>}

          {/* ── Dois modos de gerar (só antes de começar uma sequência) ── */}
          {!tlRodando && tlEtapas.length === 0 && (
            <div className="seq-gerar-box">
              <div className="seq-gerar-item">
                <button className="cr-btn-gerar seq-gerar-fino" onClick={() => rodarTimelapse('completo')} disabled={!tlBase}>
                  <span>Gerar sequência completa</span>
                  {tlBase && <span className="cr-custo-tag"><IconeCredito /> {custoTimelapseCompleto(tlRes, tlNEtapas)}</span>}
                </button>
                <p className="seq-gerar-aviso">Gera todas as etapas de uma vez. Pode haver leve perda de qualidade ao longo da sequência.</p>
              </div>
              <div className="seq-gerar-item">
                <button className="cr-btn-gerar seq-gerar-fino" onClick={() => rodarTimelapse('passo')} disabled={!tlBase}>
                  <span>Gerar uma a uma</span>
                  {tlBase && <span className="cr-custo-tag"><IconeCredito /> {custoTimelapsePrimeira(tlRes)}</span>}
                </button>
                <p className="seq-gerar-aviso">Gera uma etapa por vez. Você pode revisar e ajustar cada imagem antes de gerar a próxima.</p>
              </div>
            </div>
          )}

          {/* ── Progresso + aviso de reembolso ── */}
          {(tlRodando || (tlStatus && tlEtapas.length > 0)) && (
            <div className="seq-gerando">
              <p className="seq-status">{tlStatus || 'Gerando...'}</p>
              {(tlRodando || tlEtapas.length > 0) && (
                <div className="seq-prog"><span style={{ width: (tlEtapas.length ? Math.round((tlPasso / tlEtapas.length) * 100) : 0) + '%' }} /></div>
              )}
              {tlRodando && <p className="seq-reembolso">Se falhar, os créditos voltam automaticamente.</p>}
            </div>
          )}

          {/* ── Controles do modo uma a uma ── */}
          {tlModo === 'passo' && !tlRodando && tlPasso > 0 && tlPasso < tlEtapas.length && (
            <div className="seq-passo-box">
              <button className="cr-btn-gerar seq-gerar-fino" onClick={gerarProxima}>
                <span>Gerar próxima etapa ({tlPasso + 1}/{tlEtapas.length})</span>
                <span className="cr-custo-tag"><IconeCredito /> {custoTimelapseEtapa(tlRes)}</span>
              </button>
              <button className="seq-refazer" onClick={refazerEtapa}>Refazer esta etapa</button>
            </div>
          )}

          {/* ── Grid de resultados (N+1 slots, ordem do vídeo) ── */}
          {tlEtapas.length > 0 && (
            <div className="seq-grid">
              {tlImgs.map((img, pos) => {
                const N = tlEtapas.length;
                const titulo = pos === N ? 'Imagem final' : ((tlEtapas[(N - 1) - pos] || {}).titulo || '');
                return (
                  <div key={pos} className="seq-cel">
                    {img ? (
                      <div className="seq-slot seq-slot--clic">
                        <img src={`data:image/png;base64,${img}`} alt={titulo} onClick={() => setTlVer(pos)} />
                        <div className="seq-slot-acoes">
                          <button className="seq-acao" data-tip="Imagem inicial" aria-label="Imagem inicial" onClick={(e) => { e.stopPropagation(); tlParaInicio(pos); }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="14" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M4 15l4-3 4 3 3-2 5 4"/><path d="M12 2v3m0 0l-1.5-1.5M12 5l1.5-1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button className="seq-acao" data-tip="Imagem final" aria-label="Imagem final" onClick={(e) => { e.stopPropagation(); tlParaFim(pos); }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="1.5"/><path d="M4 17l4-3 4 3 3-2 5 4"/><path d="M12 2v3m0 0l-1.5-1.5M12 5l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 3.5)"/></svg>
                          </button>
                          <button className="seq-acao" data-tip="Pós-produção" aria-label="Pós-produção" onClick={(e) => { e.stopPropagation(); tlParaPos(pos); }}>
                            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5h8M3 10h13M3 15h6" strokeLinecap="round"/><circle cx="14.5" cy="5" r="1.7"/><circle cx="11" cy="15" r="1.7"/></svg>
                          </button>
                          <button className="seq-acao" data-tip="Baixar" aria-label="Baixar" onClick={(e) => { e.stopPropagation(); tlBaixarPos(pos); }}>
                            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 15v1.5h13V15" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="seq-slot">
                        <div className="seq-slot-load">{tlRodando ? <span className="cr-ger-spin" /> : null}</div>
                      </div>
                    )}
                    <span className="seq-cel-cap"><b>{pos + 1}</b> {titulo}</span>
                  </div>
                );
              })}
            </div>
          )}

          {tlEtapas.length > 0 && !tlRodando && (
            <div className="seq-reset-box">
              <button className="seq-reset" onClick={resetarTimelapse}>Resetar e fazer outra</button>
            </div>
          )}
        </>
      )}

      {secao === 'sequencias' && ferramenta === 'diretor' && (
        <>
          <button className="cr-voltar ed-voltar" style={{ alignSelf: 'flex-start' }} onClick={() => !narrRodando && setFerramenta(null)}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar
          </button>

          <div className="cr-sec" style={{ marginTop: 14 }}>Diretor de Narrativa</div>
          <p className="seq-hint">Selecione as imagens do projeto (renders, plantas, fachada, closes). A IA vai sugerir uma ordem narrativa — você pode arrastar para ajustar. É um guia: a direção criativa final é sua.</p>

          {/* ── Etapa 1: seleção de imagens ── */}
          {!narrConfirmado && (
            <section className="up-bloco">
              <div className="cr-sec">
                {narrImagens.length === 0 ? 'Imagens do projeto'
                  : narrImagens.length === 1 ? '1 imagem selecionada'
                  : narrImagens.length + ' imagens selecionadas'}
              </div>
              <div className="narr-grid">
                {(narrOrdem.length ? narrOrdem.map((n) => narrImagens.find((im) => im.n === n)).filter(Boolean) : narrImagens).map((im, i) => (
                  <div
                    key={im.n}
                    className={'narr-cel' + (narrOrdem.length ? ' narr-cel--drag' : '') + (narrDrag === i ? ' narr-cel--dragging' : '')}
                    draggable={narrOrdem.length > 0 && !narrRodando}
                    onDragStart={() => narrOrdem.length && narrDragStart(i)}
                    onDragOver={(e) => narrOrdem.length && narrDragOver(i, e)}
                    onDragEnd={narrDragEnd}
                  >
                    <img src={'data:image/png;base64,' + im.base64} alt={'Imagem ' + im.n} />
                    <span className="narr-num">{narrOrdem.length ? i + 1 : im.n}</span>
                    {!narrOrdem.length && (
                      <button className="narr-x" onClick={() => narrRemover(im.n)} aria-label="Remover">×</button>
                    )}
                    {narrOrdem.length > 0 && (
                      <span className="narr-grip" aria-hidden="true">
                        <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor"><circle cx="7" cy="5" r="1.3"/><circle cx="13" cy="5" r="1.3"/><circle cx="7" cy="10" r="1.3"/><circle cx="13" cy="10" r="1.3"/><circle cx="7" cy="15" r="1.3"/><circle cx="13" cy="15" r="1.3"/></svg>
                      </span>
                    )}
                  </div>
                ))}
                {!narrOrdem.length && narrImagens.length < NARR_MAX && (
                  <>
                    <button className="narr-add" onClick={() => setPicker('narr')}>
                      <span className="narr-add-plus">+</span>
                      <span className="narr-add-txt">Do feed</span>
                    </button>
                    <button className="narr-add" onClick={() => narrFileRef.current && narrFileRef.current.click()}>
                      <span className="narr-add-plus">↑</span>
                      <span className="narr-add-txt">Upload</span>
                    </button>
                    <input ref={narrFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={narrUpload} />
                  </>
                )}
              </div>

              {narrOrdem.length > 0 && (
                <p className="seq-hint" style={{ marginTop: 6 }}>Ordem sugerida (arraste para ajustar)</p>
              )}
              {narrErro && <p className="up-erro">{narrErro}</p>}

              {narrRodando && (
                <div className="seq-gerando"><p className="seq-status">{narrStatus}</p><div className="seq-prog"><span style={{ width: '60%' }} /></div></div>
              )}

              {!narrRodando && (
                <div className="seq-gerar-box" style={{ marginTop: 10 }}>
                  {narrOrdem.length === 0 ? (
                    <button className="cr-btn-gerar seq-gerar-fino" onClick={narrAnalisarOrdem} disabled={narrImagens.length < 2}>
                      <span>Analisar ordem narrativa</span>
                    </button>
                  ) : (
                    <button className="cr-btn-gerar seq-gerar-fino" onClick={narrGerarRoteiro}>
                      <span>Confirmar ordem</span>
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Etapa 3: roteiro de direção ── */}
          {narrConfirmado && narrTakes && (
            <>
              <div className="narr-roteiro-cab">
                <div className="cr-sec" style={{ margin: 0 }}>Roteiro de direção</div>
                <button className="narr-copiar" onClick={narrCopiarTudo}>Copiar tudo</button>
              </div>

              <div className="narr-takes">
                {narrTakes.map((tk) => (
                  <div key={tk.n_take} className="narr-take">
                    <div className="narr-take-cab">
                      <span className="narr-take-badge">Take {tk.n_take}{tk.momento ? ' · ' + tk.momento : ''}</span>
                      <span className="narr-take-frames">{tk.frames === 2 ? '2 imagens' : '1 imagem'} · imagem {tk.imagem}{tk.frames === 2 && tk.imagem_fim ? '→' + tk.imagem_fim : ''}</span>
                    </div>
                    <p className="narr-take-linha"><b>Câmera:</b> {tk.camera}</p>
                    {tk.close && <p className="narr-take-linha narr-take-sec"><b>Close:</b> {tk.close}</p>}
                    {tk.transicao && <p className="narr-take-linha narr-take-sec"><b>Transição:</b> {tk.transicao}</p>}
                    <button className="narr-take-anim" onClick={() => narrAnimarTake(tk)}>
                      <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor"><path d="M6 4l10 6-10 6z"/></svg>
                      Enviar para animação
                    </button>
                  </div>
                ))}
              </div>

              {(narrRitmo || narrTrilha) && (
                <div className="narr-notas">
                  {narrRitmo && <div className="narr-nota"><b>Ritmo</b><span>{narrRitmo}</span></div>}
                  {narrTrilha && <div className="narr-nota"><b>Trilha e som</b><span>{narrTrilha}</span></div>}
                </div>
              )}

              <div className="seq-reset-box">
                <button className="seq-reset" onClick={narrResetar}>Resetar e fazer outro</button>
              </div>
            </>
          )}
        </>
      )}

      {tlVer !== null && tlImgs[tlVer] && (
        <div className="cr-overlay" onClick={() => { setTlVer(null); setTlBaixar(false); }}>
          <div className="vz vz-tl" onClick={(e) => e.stopPropagation()}>
            <button className="vz-x" onClick={() => { setTlVer(null); setTlBaixar(false); }} aria-label="Fechar">
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" strokeLinecap="round"/>
              </svg>
            </button>
            {/* barra de cima (igual ao visualizador do feed) */}
            <header className="vz-cab" />
            <div className="vz-area">
              {tlImgs.filter(Boolean).length > 1 && (() => {
                const cheios = tlImgs.map((im, idx) => im ? idx : -1).filter((x) => x >= 0);
                const pos = cheios.indexOf(tlVer);
                const anterior = pos > 0 ? cheios[pos - 1] : null;
                const proximo = pos < cheios.length - 1 ? cheios[pos + 1] : null;
                return (
                  <>
                    {anterior !== null && (
                      <button className="vz-nav vz-nav--prev" onClick={() => setTlVer(anterior)} aria-label="Anterior">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                    {proximo !== null && (
                      <button className="vz-nav vz-nav--next" onClick={() => setTlVer(proximo)} aria-label="Próxima">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                    <span className="vz-pos">{pos + 1} / {cheios.length}</span>
                  </>
                );
              })()}
              <img className="vz-img-tl" src={`data:image/png;base64,${tlImgs[tlVer]}`} alt={`Etapa ${tlVer + 1}`} />
            </div>
            <footer className="vz-acoes">
              <button className="vz-ico" data-tip="Imagem inicial" aria-label="Enviar como imagem inicial da animação"
                onClick={() => { onEnviarBase64 && onEnviarBase64('animacao', tlImgs[tlVer], 'inicio'); setTlVer(null); }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="14" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M4 15l4-3 4 3 3-2 5 4"/><path d="M12 2v3m0 0l-1.5-1.5M12 5l1.5-1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="vz-ico" data-tip="Imagem final" aria-label="Enviar como imagem final da animação"
                onClick={() => { onEnviarBase64 && onEnviarBase64('animacao', tlImgs[tlVer], 'fim'); setTlVer(null); }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="1.5"/><path d="M4 17l4-3 4 3 3-2 5 4"/><path d="M12 2v3m0 0l-1.5-1.5M12 5l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 3.5)"/></svg>
              </button>
              <button className="vz-ico" data-tip="Pós-produção" aria-label="Enviar para pós-produção"
                onClick={() => { onEnviarBase64 && onEnviarBase64('pos', tlImgs[tlVer], null, { pos: tlVer }); setTlVer(null); }}>
                <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 5h8M3 10h13M3 15h6" strokeLinecap="round"/>
                  <circle cx="14.5" cy="5" r="1.7"/><circle cx="11" cy="15" r="1.7"/>
                </svg>
              </button>
              <button className="vz-ico" data-tip="Baixar" aria-label="Baixar" onClick={() => setTlBaixar(true)}>
                <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.5 15v1.5h13V15" strokeLinecap="round"/>
                </svg>
              </button>
            </footer>
          </div>
        </div>
      )}

      {tlBaixar && tlVer !== null && tlImgs[tlVer] && (
        <ModalDownload
          aoBaixar={(formato) => baixarEtapa(tlVer, formato)}
          onFechar={() => setTlBaixar(false)}
        />
      )}

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        titulo={picker === 'narr' ? 'Escolher do feed' : picker === 'tl-base' ? 'Imagem final da obra' : picker === 'fim' ? 'Imagem final' : 'Imagem inicial'}
        onEscolher={(img) => {
          const b64 = (img.base64 || img).replace(/^data:[^,]+,/, '');
          if (picker === 'narr') {
            narrAddImagens([b64]);
            // mantém o picker aberto pra escolher várias em sequência? Não: fecha,
            // e o usuário reabre. Simples e previsível.
            setPicker(null);
            return;
          }
          if (picker === 'tl-base') {
            const im = new Image();
            im.onload = () => {
              const prop = proporcaoMaisProximaTL(im.naturalWidth, im.naturalHeight);
              setTlBase({ base64: b64, proporcao: prop });
            };
            im.onerror = () => setTlBase({ base64: b64, proporcao: 'auto' });
            im.src = 'data:image/png;base64,' + b64;
          } else if (picker === 'fim') definirFim(b64);
          else definirInicio(b64);
          setPicker(null);
        }}
      />
    </div>
  );
}
