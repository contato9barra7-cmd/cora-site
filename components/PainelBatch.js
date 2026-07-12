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

import { useState, useEffect } from 'react';
import PickerImagem from './PickerImagem';
import IconeCredito from './IconeCredito';
import { salvarRascunho, lerRascunho, limparRascunho } from '../lib/rascunho';
import { listarAprovadas } from '../lib/geracoes';
import {
  analisarBatch, gerarBatch, CREDITOS, custoBatchCena,
  urlParaBase64, PROPORCOES, RESOLUCOES, MAX_REFS
} from '../lib/render';

const MAX_CENAS = 20;

export default function PainelBatch({ onPronto, onProgresso, ocupado, setOcupado }) {
  // ── Fase 1 ──
  const [refs, setRefs]   = useState([]);   // { base64, previa, doHistorico }
  const [cenas, setCenas] = useState([]);   // { id, nome, base64, previa, marcada }

  // ── Fase 2 ──
  const [analise, setAnalise] = useState(null);   // [{ nome, materiais, aprovada, cfg }]

  const [picker, setPicker] = useState(null);     // 'ref' | 'cena'
  const [erro, setErro]     = useState('');
  const [confirmarReset, setConfirmarReset] = useState(false);

  const fase = analise ? 2 : 1;

  // ── As aprovadas entram sozinhas ──
  // É o que "aprovada" quer dizer: esta imagem define o estilo do projeto.
  useEffect(() => {
    let vivo = true;

    (async () => {
      try {
        const aprovadas = await listarAprovadas();
        if (!vivo || aprovadas.length === 0) return;

        const comBase64 = await Promise.all(
          aprovadas.map(async (a) => {
            try {
              return {
                id: a.id,
                base64: await urlParaBase64(a.url),
                previa: a.url,
                doHistorico: true
              };
            } catch { return null; }
          })
        );

        if (!vivo) return;

        // As que a pessoa subiu à mão ficam; as do histórico são repostas.
        setRefs((atuais) => {
          const manuais = atuais.filter((r) => !r.doHistorico);
          const doHist  = comBase64.filter(Boolean);
          return [...doHist, ...manuais].slice(0, MAX_REFS);
        });
      } catch {
        // Sem aprovadas, sem drama: a pessoa sobe as referências à mão.
      }
    })();

    return () => { vivo = false; };
  }, []);

  // ── Rascunho: sair e voltar não perde a análise (que custou créditos) ──
  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    const r = lerRascunho('batch');
    if (r?.analise) setAnalise(r.analise);
    setRestaurado(true);
  }, []);

  useEffect(() => {
    if (!restaurado) return;
    // Só o texto da análise vai para o disco. Os pixels (refs e cenas) são
    // grandes demais e a pessoa os reescolhe em segundos.
    salvarRascunho('batch', { analise });
  }, [restaurado, analise]);

  function escolheu({ base64, previa }) {
    if (picker === 'ref') {
      if (refs.length < MAX_REFS) {
        setRefs((r) => [...r, { base64, previa, doHistorico: false }]);
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
    if (refs.length === 0)     { setErro('Adicione ao menos uma referência'); return; }
    if (marcadas.length === 0) { setErro('Marque ao menos uma cena'); return; }

    setErro('');
    setOcupado(true);
    onProgresso({ feito: 0, total: marcadas.length, estado: 'analisando' });

    try {
      const r = await analisarBatch({
        cenas: marcadas.map((c) => ({ nome: c.nome, base64: c.base64 })),
        refs:  refs.map((r) => r.base64)
      });

      // Cada cena começa NÃO aprovada: a pessoa precisa ler e concordar.
      setAnalise(r.cenas.map((c, i) => ({
        nome:      c.nome || marcadas[i]?.nome || `Cena ${i + 1}`,
        cenaId:    marcadas[i]?.id,
        previa:    marcadas[i]?.previa,
        materiais: c.materiais_completos || c.leitura || '',
        aprovada:  false,
        cfg: { qtd: 1, proporcao: '4:5', resolucao: '2k' }
      })));
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
      onProgresso(null);
    }
  }

  const aprovadas = (analise || []).filter((c) => c.aprovada);

  // O custo é a soma real: cada cena tem sua quantidade e resolução.
  const custoTotal = aprovadas.reduce(
    (soma, c) => soma + custoBatchCena(c.cfg.qtd, c.cfg.resolucao),
    0
  );

  const totalImagens = aprovadas.reduce((s, c) => s + c.cfg.qtd, 0);

  async function gerar() {
    if (aprovadas.length === 0) { setErro('Aprove ao menos uma cena'); return; }

    setErro('');
    setOcupado(true);

    try {
      const r = await gerarBatch({
        cenas: aprovadas.map((c) => {
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
        refs: refs.map((r) => r.base64)
      }, {
        onProgresso: (feito, total) => onProgresso({ feito, total, estado: 'gerando' })
      });

      onPronto(r);
      limparRascunho('batch');
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
      onProgresso(null);
    }
  }

  function resetar() {
    setRefs((r) => r.filter((x) => x.doHistorico));   // as aprovadas voltam sozinhas
    setCenas([]);
    setAnalise(null);
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
              {refs.map((r, i) => (
                <div key={i} className="cr-ref">
                  <img src={r.previa} alt="" />
                  <button
                    className="cr-ref-x"
                    onClick={() => setRefs((rs) => rs.filter((_, j) => j !== i))}
                    aria-label="Remover referência"
                  >×</button>
                </div>
              ))}

              {refs.length < MAX_REFS && (
                <button className="cr-ref cr-ref--add" onClick={() => setPicker('ref')}>
                  <span className="cr-ref-mais">+</span>
                  <span className="cr-ref-c">{refs.length}/{MAX_REFS}</span>
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

                {/* A config desta cena — quantidade, proporção, resolução */}
                <CfgCena
                  cfg={c.cfg}
                  onMudar={(campo, v) => mudarCfg(i, campo, v)}
                  travado={c.aprovada}
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
        <button className="cr-resetar" onClick={() => setConfirmarReset(true)}>
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
            <button
              className="cr-btn-gerar"
              onClick={analisar}
              disabled={ocupado || refs.length === 0 || marcadas.length === 0}
            >
              <span>{ocupado ? 'Analisando...' : 'Analisar cenas'}</span>
              {!ocupado && marcadas.length > 0 && (
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
              disabled={ocupado || aprovadas.length === 0}
            >
              <span>{ocupado ? 'Gerando...' : 'Gerar batch'}</span>
              {!ocupado && aprovadas.length > 0 && (
                <span className="cr-custo-tag">
                  <IconeCredito /> {custoTotal}
                </span>
              )}
            </button>

            <p className="cr-custo">
              {aprovadas.length === 0
                ? 'Aprove as cenas que quer gerar'
                : `${aprovadas.length} ${aprovadas.length === 1 ? 'aprovada' : 'aprovadas'} · ${totalImagens} ${totalImagens === 1 ? 'imagem' : 'imagens'}`}
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
