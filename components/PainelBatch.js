'use client';

// ═══════════════════════════════════════════════════════════
//  PainelBatch — a aba Batch
//
//  O que ela resolve: você tem um render aprovado e N capturas do mesmo
//  projeto. Quer as N no mesmo estilo, sem reconfigurar tudo de novo.
//
//  DUAS FASES, como no plugin:
//
//    1. Referências + cenas → "Analisar cenas"
//       As imagens APROVADAS do histórico entram sozinhas como referência
//       (é o que "aprovada" significa: esta define o estilo). A IA cruza
//       cada cena com elas e deduz os materiais.
//
//    2. Verificação por cena → "Gerar batch"
//       A IA mostra o que entendeu de CADA cena. Você revisa, ajusta e
//       aprova. Só as aprovadas geram — e só elas custam.
//
//  Cada cena tem sua própria quantidade, proporção e resolução (o plugin
//  faz igual: `config: { qtd, ratio, res }` com fallback global).
//
//  ── Diferença obrigatória em relação ao plugin ──
//  Lá, "cenas do projeto" vem do `model.pages` (as cenas salvas do
//  SketchUp). Na web não há modelo: você sobe as capturas. O servidor não
//  se importa — a rota /analisar-batch recebe as cenas como base64.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import PickerImagem from './PickerImagem';
import CampoRefs from './CampoRefs';
import IconeCredito from './IconeCredito';
import { salvarRascunho, lerRascunho, limparRascunho } from '../lib/rascunho';
import { bytesDaGeracao } from '../lib/geracoes';
import { salvarLeitura } from '../lib/leituras';
import {
  analisarBatch, gerarBatch, CREDITOS, custoBatchCena,
  PROPORCOES, RESOLUCOES, MAX_REFS
} from '../lib/render';
import { useIdioma } from '../lib/i18n';

const MAX_CENAS = 20;

export default function PainelBatch({ aprovadas, leituraInicial, onDesaprovar, onPronto, onProgresso, onFeedAtualizar, ocupado, setOcupado, enfileirar, naFila }) {
  const { t } = useIdioma();

  // ── Fase 1 ──
  //  `refs` guarda só as MANUAIS (as que a pessoa subiu). As aprovadas vêm
  //  da página e são derivadas — assim aprovar/desaprovar reflete na hora.
  const [refs, setRefs]   = useState([]);   // { base64, previa }
  const [cenas, setCenas] = useState([]);   // { id, nome, base64, previa, marcada }

  // ── Fase 2 ──
  const [analise, setAnalise] = useState(null);   // [{ nome, materiais, aprovada, cfg }]

  const [picker, setPicker] = useState(null);     // 'ref' | 'cena'

  // Analisar produz TEXTO, não imagens — então o aviso fica no PAINEL, junto
  // do botão que a pessoa acabou de apertar. Mandá-lo para o feed (à direita)
  // fazia parecer que uma imagem gigante estava sendo gerada.
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro]     = useState('');
  const [confirmarReset, setConfirmarReset] = useState(false);

  // A fase 2 aparece quando há análise. Mas a pessoa pode VOLTAR à fase 1
  // sem perder nada: `verFase1` manda na tela; `analise` continua guardada.
  const [verFase1, setFase1] = useState(false);
  const fase = (analise && !verFase1) ? 2 : 1;

  // ── As aprovadas entram (e saem) sozinhas ──
  //
  //  A lista de aprovadas vem da PÁGINA, que é dona do feed. Antes o Batch
  //  buscava sozinho num useEffect com `[]` — rodava uma vez, na montagem.
  //  Aprovar depois disso não surtia efeito, e desaprovar não tirava a
  //  imagem daqui. Agora o React reage: entrou na lista, aparece; saiu,
  //  desaparece.
  //
  //  Os BYTES (que vão para o servidor) ainda precisam ser buscados — o R2
  //  não manda CORS, então quem lê é o servidor. Mas só buscamos os que
  //  faltam: uma imagem já baixada não é baixada de novo.
  const [bytesPorId, setBytesPorId] = useState({});

  // Os ids, como texto. `aprovadas` é um array NOVO a cada render (vem de um
  // flatMap na página), então usá-lo como dependência dispararia o efeito
  // sempre. A string só muda quando os ids mudam de verdade.
  const idsAprovados = (aprovadas || []).map((a) => a.id).join(',');

  // O que já foi buscado. Um `ref` (e não estado) porque isto não pinta
  // nada na tela: serve só para não baixar a mesma imagem duas vezes. Como
  // ref, também não entra nas dependências do efeito — nada de laço.
  const jaBuscados = useRef({});

  useEffect(() => {
    const faltando = (aprovadas || []).filter((a) => !(a.id in jaBuscados.current));
    if (faltando.length === 0) return;

    let vivo = true;

    (async () => {
      const novos = {};

      await Promise.all(faltando.map(async (a) => {
        try {
          novos[a.id] = await bytesDaGeracao(a.id);
        } catch {
          // Falhou? Marca como `null` assim mesmo — a chave passa a existir,
          // e não tentamos de novo em laço. A imagem só não vira referência.
          novos[a.id] = null;
        }
      }));

      // Marca JUNTO do setState, só com o efeito vivo. Marcar antes parecia
      // prudente ("se o componente sair do ar..."), mas na desmontagem o ref
      // morre junto — o único caso real de vivo=false com o ref vivo é o
      // RE-RUN do efeito (ids mudaram no meio do fetch): aí marcava o id como
      // buscado, descartava os bytes, e a imagem aprovada nunca virava
      // referência nem era rebuscada.
      if (vivo) {
        Object.assign(jaBuscados.current, novos);
        setBytesPorId((b) => ({ ...b, ...novos }));
      }
    })();

    return () => { vivo = false; };
  }, [idsAprovados]);

  // As referências: as aprovadas (com os bytes já em mãos) + as manuais.
  const refsAprovadas = (aprovadas || [])
    .filter((a) => bytesPorId[a.id])
    .map((a) => ({
      id: a.id,
      base64: bytesPorId[a.id],
      previa: a.thumb || a.url,
      doHistorico: true
    }));

  const todasRefs = [...refsAprovadas, ...refs].slice(0, MAX_REFS);

  // ── Persistência: trocar de aba não pode zerar o trabalho ──
  //
  //  Guardamos as cenas E a análise. As IMAGENS vão junto (em base64) porque
  //  sem elas as cenas viram nomes vazios — e a pessoa teria que subir tudo
  //  de novo. O `rascunho.js` corta o que não couber.
  //
  //  A análise em si também vive no BANCO (cada cena vira uma leitura), então
  //  mesmo perdendo o localStorage a pessoa não paga duas vezes.
  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    const r = lerRascunho('batch');
    if (r?.cenas)   setCenas(r.cenas);
    if (r?.analise) setAnalise(r.analise);
    setRestaurado(true);
  }, []);

  // Uma leitura da aba Análises? Vira uma cena, com a imagem e o texto —
  // já analisada, direto na fase 2. Sem custo: já foi paga.
  useEffect(() => {
    if (!leituraInicial?.materiais) return;

    const id = 'c' + Date.now();

    // A imagem vem junto quando a leitura saiu de uma geração.
    if (leituraInicial.base64) {
      setCenas((c) => [...c, {
        id,
        nome: leituraInicial.titulo || t('painelbatch_cena_analise'),
        base64: leituraInicial.base64,
        previa: leituraInicial.previa,
        geracaoId: leituraInicial.geracaoId,
        marcada: true
      }]);
    }

    setAnalise((a) => [...(a || []), {
      nome:      leituraInicial.titulo || t('painelbatch_cena_analise'),
      cenaId:    leituraInicial.base64 ? id : null,
      previa:    leituraInicial.previa,
      materiais: leituraInicial.materiais,
      aprovada:  false,
      cfg: { qtd: 1, proporcao: '4:5', resolucao: '2k' }
    }]);

    // As REFERÊNCIAS de estilo voltam junto. Sem elas, a análise descreveria
    // a cena mas a geração sairia com outro estilo — a análise foi feita
    // cruzando as duas coisas.
    if (leituraInicial.refs?.length) {
      setRefs((r) => [
        ...r,
        ...leituraInicial.refs.map((b) => ({
          base64: b,
          previa: `data:image/png;base64,${b}`
        }))
      ]);
    }

    setFase1(false);
  }, [leituraInicial]);

  // Debounce: salvar o rascunho serializa cenas+analise com as imagens em
  // base64 (vários MB). Fazer isso A CADA TECLA travava a digitação no campo
  // de materiais. Agora só grava 500ms depois que a pessoa para de digitar.
  useEffect(() => {
    if (!restaurado) return;
    const id = setTimeout(() => salvarRascunho('batch', { cenas, analise }), 500);
    return () => clearTimeout(id);
  }, [restaurado, cenas, analise]);

  function escolheu({ base64, previa, geracaoId }) {
    if (picker === 'ref') {
      if (todasRefs.length < MAX_REFS) {
        setRefs((r) => [...r, { base64, previa }]);
      }
      return;
    }

    // Referência específica DESTA cena (vira @det no servidor). picker = 'det:<i>'
    if (typeof picker === 'string' && picker.startsWith('det:')) {
      const idx = parseInt(picker.slice(4), 10);
      setAnalise((a) => a.map((x, j) => (
        j === idx
          ? { ...x, detalhes: [...(x.detalhes || []), { base64, previa }].slice(0, 10) }
          : x
      )));
      return;
    }

    if (cenas.length < MAX_CENAS) {
      setCenas((c) => [...c, {
        id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
        nome: `${t('painelbatch_cena')} ${c.length + 1}`,
        base64,
        previa,
        marcada: true
      }]);
    }
  }

  // Envio de VÁRIAS imagens de uma vez (multi). O picker devolve um array de
  // base64; monta a prévia (data URL) e adiciona todas ao destino do picker.
  function escolheuVarias(lista) {
    const itens = (lista || []).filter(Boolean).map((b64) => ({
      base64: b64,
      previa: /^data:|^https?:/.test(b64) ? b64 : ('data:image/png;base64,' + b64),
    }));
    if (!itens.length) return;

    if (picker === 'ref') {
      setRefs((r) => [...r, ...itens].slice(0, MAX_REFS));
      return;
    }
    if (typeof picker === 'string' && picker.startsWith('det:')) {
      const idx = parseInt(picker.slice(4), 10);
      setAnalise((a) => a.map((x, j) => (
        j === idx ? { ...x, detalhes: [...(x.detalhes || []), ...itens].slice(0, 10) } : x
      )));
      return;
    }
    setCenas((c) => {
      const novas = itens.map((it, k) => ({
        id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6) + k,
        nome: `${t('painelbatch_cena')} ${c.length + k + 1}`,
        base64: it.base64,
        previa: it.previa,
        marcada: true,
      }));
      return [...c, ...novas].slice(0, MAX_CENAS);
    });
  }

  const marcadas = cenas.filter((c) => c.marcada);

  // ── Já tenho a análise ──
  //
  //  A pessoa já leu os materiais antes (na aba Análises, ou no plugin) e
  //  quer colar o texto. Sem isto, pagaria 8 créditos por cena para refazer
  //  um trabalho que já foi feito.
  //
  //  Vai direto para a fase 2, com os campos vazios.
  function jaTenho() {
    if (marcadas.length === 0) return;

    setAnalise(marcadas.map((c, i) => ({
      nome:      c.nome || `${t('painelbatch_cena')} ${i + 1}`,
      cenaId:    c.id,
      previa:    c.previa,
      materiais: '',            // vazio: a pessoa cola o que já tem
      aprovada:  false,
      cfg: { qtd: 1, proporcao: '4:5', resolucao: '2k' }
    })));

    setFase1(false);
  }

  async function analisar() {
    if (todasRefs.length === 0) { setErro(t('painelbatch_erro_ref')); return; }
    if (marcadas.length === 0) { setErro(t('painelbatch_erro_cena')); return; }

    setErro('');
    setAnalisando(true);   // o aviso fica AQUI, no painel — não no feed

    try {
      // Já vem como array (o lib desembrulha o { analise: { cenas } })
      const lidas = await analisarBatch({
        cenas: marcadas.map((c) => ({ nome: c.nome, base64: c.base64 })),
        refs:  todasRefs.map((r) => r.base64)
      });

      // Os campos vêm do servidor com estes nomes (é o que o plugin lê):
      //   nome, leitura, materiais_completos, materiais_novos, perguntas
      //
      // `materiais_completos` é a leitura JÁ com as respostas da verificação;
      // `leitura` é o texto cru. Preferimos a primeira.
      const cenasAnalisadas = lidas.map((c, i) => ({
        nome:      c.nome || marcadas[i]?.nome || `${t('painelbatch_cena')} ${i + 1}`,
        cenaId:    marcadas[i]?.id,
        previa:    marcadas[i]?.previa,
        materiais: c.materiais_completos || c.leitura || c.materiais_novos || '',
        aprovada:  false,
        // Para a versão "Editada" na aba Análises: a chave agrupa no MESMO
        // card da leitura original (o servidor a devolve por cena), e o
        // snapshot diz se o texto mudou de verdade antes de aprovar.
        chaveImagem: c.chaveImagem || null,
        _materiaisOriginais: c.materiais_completos || c.leitura || c.materiais_novos || '',
        cfg: { qtd: 1, proporcao: '4:5', resolucao: '2k' }
      }));

      setAnalise(cenasAnalisadas);
      setFase1(false);          // a análise nova abre na fase 2

      // Cada cena vira uma leitura no BANCO — mas quem salva é o SERVIDOR
      // (rota /analisar-batch), para valer também no plugin.
    } catch (e) {
      setErro(e.message);
    } finally {
      setAnalisando(false);
    }
  }

  // As CENAS que a pessoa aprovou na fase 2 — não confundir com a prop
  // `aprovadas`, que são as IMAGENS aprovadas no feed (as referências).
  const cenasAprovadas = (analise || []).filter((c) => c.aprovada);

  // O custo é a soma real: cada cena tem sua quantidade e resolução.
  const custoTotal = cenasAprovadas.reduce(
    (soma, c) => soma + custoBatchCena(c.cfg.qtd, c.cfg.resolucao),
    0
  );

  const totalImagens = cenasAprovadas.reduce((s, c) => s + c.cfg.qtd, 0);

  function gerar() {
    if (cenasAprovadas.length === 0) { setErro(t('painelbatch_erro_aprove')); return; }

    setErro('');

    // Entrada aprovada sem imagem (leitura que chegou sem base64 tem
    // cenaId null e nenhuma cena correspondente): não há o que gerar dela —
    // seguiria para o servidor como cena com base64 undefined. Fica de fora,
    // e se não sobrar nenhuma, vale o mesmo aviso de "aprove uma cena".
    const geraveis = cenasAprovadas.filter(
      (c) => cenas.find((x) => x.id === c.cenaId)?.base64
    );
    if (geraveis.length === 0) { setErro(t('painelbatch_erro_aprove')); return; }

    // A tarefa roda DEPOIS (na fila), então congela o que foi aprovado no clique.
    const cenasAprovadasSnap = geraveis;
    const todasRefsSnap      = todasRefs;
    const cenasSnap          = cenas;
    const totalImagensSnap   = geraveis.reduce((s, c) => s + c.cfg.qtd, 0);
    const primeira = cenasAprovadasSnap[0];
    const printDa = (c) => cenasSnap.find((x) => x.id === c?.cenaId)?.previa || null;

    const tarefa = async (canalProg) => {
      // Canal próprio do pool: o batch tem o SEU bloco de slots e corre em
      // paralelo com outras gerações (editar, render...).
      const prog = canalProg || onProgresso;
      setOcupado(true);
      const prontas = [];   // imagens já prontas (data URL), por índice do slot

      prog({
        feito: 0,
        total: totalImagensSnap,
        estado: 'gerando',
        proporcao: primeira?.cfg.proporcao || '4:5',
        base: printDa(primeira)
      });

      try {
        const r = await gerarBatch({
          cenas: cenasAprovadasSnap.map((c) => {
            const cena = cenasSnap.find((x) => x.id === c.cenaId);
            const reusar = c._lote && c._lote.materiais === c.materiais;
            return {
              nome:      c.nome,
              base64:    cena?.base64,
              materiais: c.materiais,
              qtd:       c.cfg.qtd,
              proporcao: c.cfg.proporcao,
              resolucao: c.cfg.resolucao,
              detalhes:  (c.detalhes || []).map((d) => d.base64),
              // Normaliza @img0N/@ref0N -> @det0N: as refs DESTA cena vão como
              // @det no prompt, então o hábito de escrever @img/@ref também amarra.
              detalheTexto: (c.detalheTexto || '').replace(/@(?:img|ref)(\d)/gi, '@det$1'),
              loteId:       reusar ? c._lote.id : undefined,
              ordemInicial: reusar ? c._lote.feitas : 0,
              promptReuso:  reusar ? c._lote.prompt : null
            };
          }),
          refs: todasRefsSnap.map((r) => r.base64)
        }, {
          onProgresso: (feito, total, emCurso, imagem, loteId, ordem) => {
            const c = cenasAprovadasSnap.find((x) => x.nome === emCurso?.nome) || primeira;
            if (imagem) {
              prontas[feito - 1] = {
                url: /^https?:/.test(imagem) ? imagem : ('data:image/png;base64,' + imagem),
                loteId,
                ordem,
              };
            }
            prog({
              feito, total,
              estado: 'gerando',
              proporcao: c?.cfg.proporcao || '4:5',
              base: printDa(c),
              prontas: prontas.slice()
            });
          }
        });

        if (r && r.lotes) {
          setAnalise((a) => (a || []).map((x) => {
            const lote = r.lotes.find((l) => l.nome === x.nome);
            return lote
              ? { ...x, _lote: { id: lote.loteId, feitas: lote.feitas, prompt: lote.promptReuso, materiais: x.materiais } }
              : x;
          }));
        }

        prog(null);
        setOcupado(false);
        onPronto(r);
        limparRascunho('batch');

      } catch (e) {
        setErro(e.message);
        prog(null);
        setOcupado(false);
      }
    };
    if (enfileirar) enfileirar(tarefa, totalImagensSnap); else tarefa();
  }

  function resetar() {
    setRefs([]);          // só as manuais: as aprovadas vêm da página
    setCenas([]);
    setAnalise(null);
    setFase1(false);
    setErro('');
    limparRascunho('batch');
    setConfirmarReset(false);
  }

  function mudarCfg(i, campo, valor) {
    setAnalise((a) => a.map((c, j) => (
      j === i ? { ...c, cfg: { ...c.cfg, [campo]: valor } } : c
    )));
  }

  return (
    <>
      <div className="cr-form">

        {/* ═══ FASE 1 ═══ */}
        {fase === 1 && (
          <>
            <div className="cr-sec">{t('painelbatch_sec_refs')}</div>
            <p className="cr-hint cr-hint--topo">
              {t('painelbatch_hint_refs')}
            </p>

            <div className="cr-refs">
              {todasRefs.map((r, i) => (
                <div key={r.id || 'm' + i} className="cr-ref">
                  <img src={r.previa} alt="" />

                  {/* O X tira a referência daqui. Se ela veio do "aprovado",
                      desaprova a imagem no feed também — assim as duas telas
                      não se contradizem. */}
                  <button
                    className="cr-ref-x"
                    onClick={() => (r.doHistorico
                      ? onDesaprovar(r.id)
                      : setRefs((rs) => rs.filter((x) => x !== r)))}
                    aria-label={t('painelbatch_rem_ref')}
                  >×</button>

                  {r.doHistorico && (
                    <span className="cr-ref-selo" data-tip={t('painelbatch_selo_tip')}>
                      <svg viewBox="0 0 16 16" width="9" height="9" fill="none"
                           stroke="currentColor" strokeWidth="2.4"
                           strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2,8 6,12 14,4"/>
                      </svg>
                    </span>
                  )}
                </div>
              ))}

              {todasRefs.length < MAX_REFS && (
                <button className="cr-ref cr-ref--add" onClick={() => setPicker('ref')}>
                  <span className="cr-ref-mais">+</span>
                  <span className="cr-ref-c">{todasRefs.length}/{MAX_REFS}</span>
                </button>
              )}
            </div>

            <div className="cr-sec">{t('painelbatch_sec_cenas')}</div>
            <p className="cr-hint cr-hint--topo">
              {t('painelbatch_hint_cenas')}
            </p>

            {cenas.length > 0 && (
              <div className="cr-g2 cr-cenas-acoes">
                <button
                  className="cr-b"
                  onClick={() => setCenas((c) => c.map((x) => ({ ...x, marcada: true })))}
                >{t('painelbatch_sel_todas')}</button>
                <button
                  className="cr-b"
                  onClick={() => setCenas((c) => c.map((x) => ({ ...x, marcada: false })))}
                >{t('painelbatch_desm_todas')}</button>
              </div>
            )}

            {cenas.map((c, i) => (
              <label
                key={c.id}
                className={'cr-cena' + (c.marcada ? ' cr-cena--on' : '')}
              >
                <input
                  type="checkbox"
                  checked={c.marcada}
                  onChange={() => setCenas((cs) => cs.map((x, j) => (
                    j === i ? { ...x, marcada: !x.marcada } : x
                  )))}
                />
                <span className="cr-cena-check">
                  {c.marcada && (
                    <svg viewBox="0 0 16 16" width="10" height="10" fill="none"
                         stroke="currentColor" strokeWidth="2.4"
                         strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2,8 6,12 14,4"/>
                    </svg>
                  )}
                </span>

                <img src={c.previa} alt="" className="cr-cena-img" />

                <input
                  type="text"
                  className="cr-cena-nome"
                  value={c.nome}
                  onClick={(e) => e.preventDefault()}
                  onChange={(e) => setCenas((cs) => cs.map((x, j) => (
                    j === i ? { ...x, nome: e.target.value } : x
                  )))}
                  spellCheck={false}
                />

                <button
                  className="cr-cena-x"
                  onClick={(e) => {
                    e.preventDefault();
                    setCenas((cs) => cs.filter((_, j) => j !== i));
                  }}
                  aria-label={t('painelbatch_rem_cena')}
                >×</button>
              </label>
            ))}

            {cenas.length < MAX_CENAS && (
              <button className="cr-cena-add" onClick={() => setPicker('cena')}>
                <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.5 14v2a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5v-2" strokeLinecap="round"/>
                </svg>
                {t('painelbatch_add_cenas')}
              </button>
            )}
          </>
        )}

        {/* ═══ FASE 2 ═══ */}
        {fase === 2 && (
          <>
            {/* Voltar não apaga a análise: ela continua guardada (custou
                créditos). Serve para trocar as cenas ou as referências e
                analisar de novo — ou só para conferir o que foi enviado. */}
            <button className="cr-voltar" onClick={() => setFase1(true)}>
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('painelbatch_voltar_cenas')}
            </button>

            <div className="cr-sec">{t('painelbatch_sec_verif')}</div>
            <p className="cr-hint cr-hint--topo">
              {t('painelbatch_hint_verif')}
            </p>

            {analise.map((c, i) => (
              <div
                // key posicional fazia o React reaproveitar instâncias ao
                // remover uma cena do meio: o estado transitório do CfgCena
                // (popover aberto, foco) "pulava" para a cena seguinte. O
                // cenaId é o id estável da cena; o índice fica só para a
                // entrada rara sem cena (leitura sem imagem).
                key={c.cenaId || 'sem-cena-' + i}
                className={'cr-bcena' + (c.aprovada ? ' cr-bcena--ok' : '')}
              >
                <div className="cr-bcena-cab">
                  {c.previa && <img src={c.previa} alt="" />}
                  <span>{c.nome}</span>

                  {/* Sem isto, uma cena que não presta obriga a refazer a
                      análise inteira — e a análise custou créditos. */}
                  <button
                    className="cr-bcena-x"
                    onClick={() => setAnalise((a) => {
                      const resto = a.filter((_, j) => j !== i);
                      // Tirar a última deixaria uma fase 2 vazia — volta às cenas.
                      if (!resto.length) setFase1(true);
                      return resto;
                    })}
                    data-tip={t('painelbatch_tirar_tip')}
                    aria-label={t('painelbatch_tirar_cena') + ' ' + c.nome}
                  >
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                         stroke="currentColor" strokeWidth="1.6">
                      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                <textarea
                  className="cr-ta cr-ta--mat"
                  value={c.materiais}
                  onChange={(e) => setAnalise((a) => a.map((x, j) => (
                    j === i ? { ...x, materiais: e.target.value } : x
                  )))}
                  readOnly={c.aprovada}
                  spellCheck={false}
                />

                {/* Editar e Aprovar dizem respeito ao TEXTO logo acima — ficam
                    colados nele. */}
                <div className="cr-g2 cr-bcena-acoes">
                  <button
                    className="cr-b"
                    onClick={() => setAnalise((a) => a.map((x, j) => (
                      j === i ? { ...x, aprovada: false } : x
                    )))}
                    disabled={!c.aprovada}
                  >{t('painelbatch_editar')}</button>

                  <button
                    className={c.aprovada ? 'cr-b cr-b--on' : 'cr-b-conf'}
                    onClick={() => {
                      // Aprovou com o texto EDITADO? Salva uma versão nova na
                      // aba Análises, agrupada no card da leitura original
                      // (mesma chaveImagem). Sem recobrar: é só o texto.
                      const aprovando = !c.aprovada;
                      if (aprovando && c.chaveImagem &&
                          (c.materiais || '').trim() !== (c._materiaisOriginais || '').trim()) {
                        salvarLeitura({
                          origem: 'batch',
                          titulo: c.nome,
                          materiais: c.materiais,
                          chaveImagem: c.chaveImagem
                        }).catch(() => {});
                      }
                      setAnalise((a) => a.map((x, j) => (
                        j === i
                          ? {
                              ...x,
                              aprovada: aprovando,
                              // evita salvar de novo se aprovar/desaprovar sem mexer
                              _materiaisOriginais: aprovando ? x.materiais : x._materiaisOriginais
                            }
                          : x
                      )));
                    }}
                  >
                    {c.aprovada ? '✓ ' + t('painelbatch_aprovada') : t('painelbatch_aprovar')}
                  </button>
                </div>

                {/* Referência específica desta cena (ex.: um tipo de planta).
                    Fica logo abaixo do texto e ACIMA da config (igual ao plugin).
                    Vira @det no prompt — só desta cena, não do projeto todo. */}
                <div className="cr-bcena-refs">
                  <div className="cr-bcena-refs-lbl">Referências desta cena (opcional)</div>
                  <div className="cr-refs">
                    {(c.detalhes || []).map((d, di) => (
                      <div key={di} className="cr-ref">
                        <img src={d.previa} alt="" />
                        <button
                          className="cr-ref-x"
                          onClick={() => setAnalise((a) => a.map((x, j) => (
                            j === i ? { ...x, detalhes: (x.detalhes || []).filter((_, k) => k !== di) } : x
                          )))}
                          aria-label="Remover referência"
                        >×</button>
                        {/* O nome em cima, como nas refs do Render — pra citar por @det. */}
                        <span className="cr-ref-n">@det{String(di + 1).padStart(2, '0')}</span>
                      </div>
                    ))}
                    {(c.detalhes || []).length < 10 && (
                      <button className="cr-ref cr-ref--add" onClick={() => setPicker('det:' + i)}>
                        <span className="cr-ref-mais">+</span>
                        <span className="cr-ref-c">{(c.detalhes || []).length}/10</span>
                      </button>
                    )}
                  </div>
                  {/* Descrição das refs desta cena. Digitar @ abre a lista (autocomplete)
                      e insere @det01, @det02… amarrado à imagem certa. */}
                  <CampoRefs
                    className="cr-ta cr-bcena-det-txt"
                    valor={c.detalheTexto || ''}
                    onMudar={(v) => setAnalise((a) => a.map((x, j) => (
                      j === i ? { ...x, detalheTexto: v } : x
                    )))}
                    refs={c.detalhes || []}
                    prefixo="det"
                    placeholder="Descreva cada referência: @det01 luminária pendente dourada, @det02 tipo de planta…"
                  />
                </div>

                {/* A config é de outra natureza — vai embaixo. E NÃO trava ao
                    aprovar: aprovar é concordar com a leitura, não com a
                    resolução ou a quantidade. */}
                <CfgCena
                  cfg={c.cfg}
                  onMudar={(campo, v) => mudarCfg(i, campo, v)}
                  travado={ocupado}
                />
              </div>
            ))}
          </>
        )}

        {/* Recomeçar. Pede confirmação: a análise custou créditos. */}
        {/* Travado durante a geração: resetar no meio deixaria o `gerar`
            rodando com cenas que já não existem. */}
        <button
          className="cr-resetar"
          onClick={() => setConfirmarReset(true)}
          disabled={ocupado || analisando}
        >
          {t('painelbatch_resetar_cfg')}
        </button>

        {confirmarReset && (
          <div className="cr-overlay cr-overlay--alto" onClick={() => setConfirmarReset(false)}>
            <div className="cf" onClick={(e) => e.stopPropagation()}>
              <h3>{t('painelbatch_reset_tit')}</h3>
              <p>
                {t('painelbatch_reset_p1')}{' '}
                {CREDITOS.analiseBatch} {t('painelbatch_reset_p2')}
              </p>
              <div className="cf-acoes">
                <button className="cf-nao" onClick={() => setConfirmarReset(false)}>{t('comum_cancelar')}</button>
                <button className="cf-sim" onClick={resetar}>{t('painelbatch_resetar')}</button>
              </div>
            </div>
          </div>
        )}

        {erro && <div className="cr-erro">{erro}</div>}
      </div>

      {/* ── Barra fixa ── */}
      <div className="cr-barra-ger">
        {fase === 1 ? (
          <>
            {/* O aviso fica AQUI, no painel, junto do botão que a pessoa
                apertou — não no feed, que é onde as imagens aparecem. */}
            {analisando && (
              <div className="cr-lendo">
                <span className="cr-spin" />
                <span>
                  {marcadas.length === 1
                    ? t('painelbatch_lendo_uma')
                    : `${t('painelbatch_lendo_de')} ${marcadas.length} ${t('painelbatch_lendo_cenas')}`}
                </span>
              </div>
            )}

            {/* Já analisou? Um caminho de volta, sem pagar de novo. */}
            {analise && (
              <button className="cr-b cr-b--voltar" onClick={() => setFase1(false)}>
                {t('painelbatch_ver_analise')}
              </button>
            )}

            {/* Sem `ocupado`: analisar (produz texto, rota própria) roda em paralelo
                a uma geração em andamento — dá pra montar mais cenas sem esperar. */}
            <button
              className="cr-btn-gerar"
              onClick={analisar}
              disabled={analisando || todasRefs.length === 0 || marcadas.length === 0}
            >
              <span>{analisando ? t('painelbatch_analisando') : analise ? t('painelbatch_analisar_novo') : t('painelbatch_analisar')}</span>
              {!analisando && marcadas.length > 0 && (
                <span className="cr-custo-tag">
                  <IconeCredito /> {CREDITOS.analiseBatch * marcadas.length}
                </span>
              )}
            </button>

            {/* Já leu os materiais antes (na aba Análises, ou no plugin)? Cola o
                texto e não paga de novo. Aparece SEMPRE que houver cenas marcadas
                — mesmo já tendo uma análise antiga (ex.: subiu cenas novas e quer
                colar a leitura delas). */}
            {marcadas.length > 0 && (
              <button className="cr-b cr-b--tenho" onClick={jaTenho}>
                {t('painelbatch_ja_tenho')}
              </button>
            )}

            {/* O custo sai (ja esta na tag do hover); a CONTAGEM fica —
                ela orienta, e nao aparece em nenhum outro lugar. */}
            <p className="cr-custo">
              {marcadas.length === 0
                ? t('painelbatch_marque')
                : `${marcadas.length} ${marcadas.length === 1 ? t('painelbatch_cena_min') : t('painelbatch_cenas_min')}`}
            </p>
          </>
        ) : (
          <>
            <button
              className="cr-btn-gerar"
              onClick={gerar}
              disabled={cenasAprovadas.length === 0}
            >
              <span>{t('painelbatch_gerar')}</span>
              {cenasAprovadas.length > 0 && (
                <span className="cr-custo-tag">
                  <IconeCredito /> {custoTotal}
                </span>
              )}
            </button>

            <p className="cr-custo">
              {naFila > 0
                ? `${naFila} ${t('fila_rotulo')}`
                : cenasAprovadas.length === 0
                ? t('painelbatch_aprove_gerar')
                : `${cenasAprovadas.length} ${cenasAprovadas.length === 1 ? t('painelbatch_aprovada_min') : t('painelbatch_aprovadas_min')} · ${totalImagens} ${totalImagens === 1 ? t('painelbatch_imagem') : t('painelbatch_imagens')}`}
            </p>
          </>
        )}
      </div>

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheu}
        onEscolherVarias={escolheuVarias}
        multi
        titulo={picker === 'ref' ? t('painelbatch_add_ref') : (typeof picker === 'string' && picker.startsWith('det:')) ? 'Referência desta cena' : t('painelbatch_add_cena')}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  CfgCena — quantidade, proporção e resolução DESTA cena
//
//  Cada cena tem a sua: uma pode querer 3 variações em 4:5, outra 1 em
//  16:9. É assim no plugin (`config: { qtd, ratio, res }` por cena).
// ═══════════════════════════════════════════════════════════
function CfgCena({ cfg, onMudar, travado }) {
  const { t } = useIdioma();
  const [popRatio, setPopRatio] = useState(false);
  const [popRes, setPopRes]     = useState(false);

  useEffect(() => {
    if (!popRatio && !popRes) return;
    const fechar = () => { setPopRatio(false); setPopRes(false); };
    window.addEventListener('click', fechar);
    return () => window.removeEventListener('click', fechar);
  }, [popRatio, popRes]);

  return (
    <div className={'cr-bcfg' + (travado ? ' cr-bcfg--off' : '')}>
      <div className="cr-qty">
        <button
          onClick={() => onMudar('qtd', Math.max(1, cfg.qtd - 1))}
          disabled={travado}
          aria-label={t('painelbatch_menos')}
        >−</button>
        <span>{cfg.qtd}</span>
        <button
          onClick={() => onMudar('qtd', Math.min(10, cfg.qtd + 1))}
          disabled={travado}
          aria-label={t('painelbatch_mais')}
        >+</button>
      </div>

      <div className="cr-pill-wrap">
        <button
          className={'cr-pill-cfg' + (popRatio ? ' cr-pill-cfg--on' : '')}
          onClick={(e) => { e.stopPropagation(); setPopRes(false); setPopRatio((v) => !v); }}
          disabled={travado}
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
            <rect x="1" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="6" y="2" width="9" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span>{cfg.proporcao === 'auto' ? t('painelbatch_auto') : cfg.proporcao}</span>
        </button>

        {popRatio && (
          <div className="cr-pop" onClick={(e) => e.stopPropagation()}>
            <div className="cr-pop-grade">
              {PROPORCOES.map((p) => (
                <button
                  key={p.val}
                  className={'cr-pop-b' + (cfg.proporcao === p.val ? ' cr-pop-b--on' : '')}
                  onClick={() => { onMudar('proporcao', p.val); setPopRatio(false); }}
                >
                  <svg viewBox="0 0 28 28" fill="none">
                    <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="1"
                          stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <span>{p.val === 'auto' ? t('painelbatch_auto') : p.val}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="cr-pill-wrap">
        <button
          className={'cr-pill-cfg' + (popRes ? ' cr-pill-cfg--on' : '')}
          onClick={(e) => { e.stopPropagation(); setPopRatio(false); setPopRes((v) => !v); }}
          disabled={travado}
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="4" width="16" height="10" rx="1.5"/><path d="M7 17h6"/>
          </svg>
          <span>{RESOLUCOES.find((r) => r.val === cfg.resolucao)?.rotulo}</span>
        </button>

        {popRes && (
          <div className="cr-pop cr-pop--res" onClick={(e) => e.stopPropagation()}>
            {RESOLUCOES.map((r) => (
              <button
                key={r.val}
                className={'cr-pop-res' + (cfg.resolucao === r.val ? ' cr-pop-res--on' : '')}
                onClick={() => { onMudar('resolucao', r.val); setPopRes(false); }}
              >{r.rotulo}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
