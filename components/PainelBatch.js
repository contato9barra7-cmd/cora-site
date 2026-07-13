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
import IconeCredito from './IconeCredito';
import { salvarRascunho, lerRascunho, limparRascunho } from '../lib/rascunho';
import { bytesDaGeracao } from '../lib/geracoes';
import { salvarLeitura } from '../lib/leituras';
import {
  analisarBatch, gerarBatch, CREDITOS, custoBatchCena, miniatura,
  PROPORCOES, RESOLUCOES, MAX_REFS
} from '../lib/render';

const MAX_CENAS = 20;

export default function PainelBatch({ aprovadas, onPronto, onProgresso, ocupado, setOcupado }) {
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

      // Marca ANTES do setState: se o componente sair do ar no meio, o ref
      // já sabe o que foi buscado.
      Object.assign(jaBuscados.current, novos);

      if (vivo) setBytesPorId((b) => ({ ...b, ...novos }));
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

  useEffect(() => {
    if (!restaurado) return;
    salvarRascunho('batch', { cenas, analise });
  }, [restaurado, cenas, analise]);

  function escolheu({ base64, previa }) {
    if (picker === 'ref') {
      if (todasRefs.length < MAX_REFS) {
        setRefs((r) => [...r, { base64, previa }]);
      }
      return;
    }

    if (cenas.length < MAX_CENAS) {
      setCenas((c) => [...c, {
        id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
        nome: `Cena ${c.length + 1}`,
        base64,
        previa,
        marcada: true
      }]);
    }
  }

  const marcadas = cenas.filter((c) => c.marcada);

  async function analisar() {
    if (todasRefs.length === 0) { setErro('Adicione ao menos uma referência'); return; }
    if (marcadas.length === 0) { setErro('Marque ao menos uma cena'); return; }

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
        nome:      c.nome || marcadas[i]?.nome || `Cena ${i + 1}`,
        cenaId:    marcadas[i]?.id,
        previa:    marcadas[i]?.previa,
        materiais: c.materiais_completos || c.leitura || c.materiais_novos || '',
        aprovada:  false,
        cfg: { qtd: 1, proporcao: '4:5', resolucao: '2k' }
      }));

      setAnalise(cenasAnalisadas);
      setFase1(false);          // a análise nova abre na fase 2

      // Cada cena analisada vira uma leitura no BANCO. Isto custou 15
      // créditos por cena — perder seria pagar de novo pelo mesmo trabalho.
      // Não esperamos: se o salvamento falhar, a análise está na tela.
      cenasAnalisadas.forEach(async (c, i) => {
        const cena = marcadas[i];
        if (!c.materiais || !cena) return;

        salvarLeitura({
          origem:    'batch',
          titulo:    c.nome,
          materiais: c.materiais,
          thumb:     await miniatura(cena.base64)
        });
      });
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

  async function gerar() {
    if (cenasAprovadas.length === 0) { setErro('Aprove ao menos uma cena'); return; }

    setErro('');
    setOcupado(true);

    // Gerar produz IMAGENS — então o progresso vai para o feed, à direita,
    // igual ao Render. (Analisar produz texto, e o aviso fica no painel.)
    // Sem esta linha, o feed só reagia quando a primeira imagem ficava
    // pronta: até lá, nada acontecia na tela.
    // A primeira cena a sair: sua forma e seu print vão para o slot.
    const primeira = cenasAprovadas[0];
    const printDa = (c) => cenas.find((x) => x.id === c?.cenaId)?.previa || null;

    onProgresso({
      feito: 0,
      total: totalImagens,
      estado: 'gerando',
      proporcao: primeira?.cfg.proporcao || '4:5',
      base: printDa(primeira)          // o print, desfocado no slot
    });

    try {
      const r = await gerarBatch({
        cenas: cenasAprovadas.map((c) => {
          const cena = cenas.find((x) => x.id === c.cenaId);
          return {
            nome:      c.nome,
            base64:    cena?.base64,
            materiais: c.materiais,
            qtd:       c.cfg.qtd,
            proporcao: c.cfg.proporcao,
            resolucao: c.cfg.resolucao
          };
        }),
        refs: todasRefs.map((r) => r.base64)
      }, {
        // `emCurso` é a cena que está saindo agora — o slot mostra o print
        // DELA, não o da primeira cena o tempo todo.
        onProgresso: (feito, total, emCurso) => {
          const c = cenasAprovadas.find((x) => x.nome === emCurso?.nome) || primeira;
          onProgresso({
            feito, total,
            estado: 'gerando',
            proporcao: c?.cfg.proporcao || '4:5',
            base: printDa(c)
          });
        }
      });

      // Some com os slots ANTES de recarregar o feed: senão há um instante
      // em que a imagem nova JÁ apareceu e o "gerando" ainda está lá.
      onProgresso(null);
      setOcupado(false);

      onPronto(r);
      limparRascunho('batch');

    } catch (e) {
      setErro(e.message);
      onProgresso(null);
      setOcupado(false);
    }
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
            <div className="cr-sec">Renders de referência</div>
            <p className="cr-hint cr-hint--topo">
              As imagens aprovadas do seu histórico entram aqui automaticamente.
              Elas definem o estilo.
            </p>

            <div className="cr-refs">
              {todasRefs.map((r, i) => (
                <div key={r.id || 'm' + i} className="cr-ref">
                  <img src={r.previa} alt="" />

                  {/* A vinda do histórico não se tira daqui: ela sai quando
                      a pessoa desaprova a imagem, no feed. Tirar por aqui
                      seria mentira — a imagem continuaria aprovada. */}
                  {!r.doHistorico && (
                    <button
                      className="cr-ref-x"
                      onClick={() => setRefs((rs) => rs.filter((x) => x !== r))}
                      aria-label="Remover referência"
                    >×</button>
                  )}

                  {r.doHistorico && (
                    <span className="cr-ref-selo" data-tip="Aprovada — desaprove no feed para tirar">
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

            <div className="cr-sec">Cenas do projeto</div>
            <p className="cr-hint cr-hint--topo">
              Suba as capturas que quer renderizar no mesmo estilo das referências.
            </p>

            {cenas.length > 0 && (
              <div className="cr-g2 cr-cenas-acoes">
                <button
                  className="cr-b"
                  onClick={() => setCenas((c) => c.map((x) => ({ ...x, marcada: true })))}
                >Selecionar todas</button>
                <button
                  className="cr-b"
                  onClick={() => setCenas((c) => c.map((x) => ({ ...x, marcada: false })))}
                >Desmarcar todas</button>
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
                  aria-label="Remover cena"
                >×</button>
              </label>
            ))}

            {cenas.length < MAX_CENAS && (
              <button className="cr-cena-add" onClick={() => setPicker('cena')}>
                <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.5 14v2a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5v-2" strokeLinecap="round"/>
                </svg>
                Adicionar cenas
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
              Voltar às cenas
            </button>

            <div className="cr-sec">Verificação de materiais por cena</div>
            <p className="cr-hint cr-hint--topo">
              A IA cruzou cada cena com as referências. Revise, ajuste e aprove —
              só as aprovadas entram no batch.
            </p>

            {analise.map((c, i) => (
              <div
                key={i}
                className={'cr-bcena' + (c.aprovada ? ' cr-bcena--ok' : '')}
              >
                <div className="cr-bcena-cab">
                  {c.previa && <img src={c.previa} alt="" />}
                  <span>{c.nome}</span>
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

                {/* A config NÃO trava ao aprovar: aprovar é concordar com a
                    LEITURA dos materiais, não com a resolução ou a quantidade.
                    Essas continuam livres até a hora de gerar. */}
                <CfgCena
                  cfg={c.cfg}
                  onMudar={(campo, v) => mudarCfg(i, campo, v)}
                  travado={ocupado}
                />

                <div className="cr-g2 cr-bcena-acoes">
                  <button
                    className="cr-b"
                    onClick={() => setAnalise((a) => a.map((x, j) => (
                      j === i ? { ...x, aprovada: false } : x
                    )))}
                    disabled={!c.aprovada}
                  >Editar</button>

                  <button
                    className={c.aprovada ? 'cr-b cr-b--on' : 'cr-b-conf'}
                    onClick={() => setAnalise((a) => a.map((x, j) => (
                      j === i ? { ...x, aprovada: !x.aprovada } : x
                    )))}
                  >
                    {c.aprovada ? '✓ Aprovada' : 'Tá bom, aprovar'}
                  </button>
                </div>
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
          Resetar configurações
        </button>

        {confirmarReset && (
          <div className="cr-overlay cr-overlay--alto" onClick={() => setConfirmarReset(false)}>
            <div className="cf" onClick={(e) => e.stopPropagation()}>
              <h3>Resetar tudo?</h3>
              <p>
                As cenas e a análise serão apagadas — e analisar de novo custa{' '}
                {CREDITOS.analiseBatch} créditos por cena.
              </p>
              <div className="cf-acoes">
                <button className="cf-nao" onClick={() => setConfirmarReset(false)}>Cancelar</button>
                <button className="cf-sim" onClick={resetar}>Resetar</button>
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
                    ? 'Lendo os materiais da cena...'
                    : `Lendo os materiais de ${marcadas.length} cenas...`}
                </span>
              </div>
            )}

            {/* Já analisou? Um caminho de volta, sem pagar de novo. */}
            {analise && (
              <button className="cr-b cr-b--voltar" onClick={() => setFase1(false)}>
                Ver a análise que já fiz
              </button>
            )}

            <button
              className="cr-btn-gerar"
              onClick={analisar}
              disabled={analisando || ocupado || todasRefs.length === 0 || marcadas.length === 0}
            >
              <span>{analisando ? 'Analisando...' : analise ? 'Analisar de novo' : 'Analisar cenas'}</span>
              {!analisando && marcadas.length > 0 && (
                <span className="cr-custo-tag">
                  <IconeCredito /> {CREDITOS.analiseBatch * marcadas.length}
                </span>
              )}
            </button>

            <p className="cr-custo">
              {marcadas.length === 0
                ? 'Marque as cenas que quer analisar'
                : `${marcadas.length} ${marcadas.length === 1 ? 'cena' : 'cenas'} · ${CREDITOS.analiseBatch} créditos cada`}
            </p>
          </>
        ) : (
          <>
            <button
              className="cr-btn-gerar"
              onClick={gerar}
              disabled={ocupado || cenasAprovadas.length === 0}
            >
              <span>{ocupado ? 'Gerando...' : 'Gerar batch'}</span>
              {!ocupado && cenasAprovadas.length > 0 && (
                <span className="cr-custo-tag">
                  <IconeCredito /> {custoTotal}
                </span>
              )}
            </button>

            <p className="cr-custo">
              {cenasAprovadas.length === 0
                ? 'Aprove as cenas que quer gerar'
                : `${cenasAprovadas.length} ${cenasAprovadas.length === 1 ? 'aprovada' : 'aprovadas'} · ${totalImagens} ${totalImagens === 1 ? 'imagem' : 'imagens'}`}
            </p>
          </>
        )}
      </div>

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheu}
        titulo={picker === 'ref' ? 'Adicionar referência' : 'Adicionar cena'}
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
          aria-label="Menos uma"
        >−</button>
        <span>{cfg.qtd}</span>
        <button
          onClick={() => onMudar('qtd', Math.min(10, cfg.qtd + 1))}
          disabled={travado}
          aria-label="Mais uma"
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
          <span>{cfg.proporcao === 'auto' ? 'Auto' : cfg.proporcao}</span>
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
                  <span>{p.val === 'auto' ? 'Auto' : p.val}</span>
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
