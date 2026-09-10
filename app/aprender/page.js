'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  APRENDER
//
//  Três telas, e cada uma substitui a anterior:
//
//     MÓDULOS   as sete capas, e quantas aulas cada uma tem
//     MÓDULO    a capa vira miniatura no cabeçalho, e as aulas viram lista
//     AULA      o vídeo, com o índice do curso ao lado e os comentários embaixo
//
//  O catálogo (títulos, ordem, vídeo) mora em `lib/aulas.js`. O que é da
//  pessoa (assistida, voto) e o que é público (comentários, placar) vem do
//  cora-auth, pelas funções do mesmo arquivo.
//
//  O desenho é o do artefato `ferramentas/painel.html`, e a folha
//  (painel-pagina.css) é GERADA a partir dele:
//
//      python gerar-css-artefato.py painel.html ../app/painel-pagina.css pn
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, atualizarConta } from '../../lib/auth';
import {
  contarAulas, urlDoVideo, comCatalogo, lerCatalogo,
  lerEstadoAulas, marcarVisto, votar, lerComentarios, comentar,
} from '../../lib/aulas';
import { useIdioma, tOpt } from '../../lib/i18n';

const Ico = {
  esq: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6l-6 6 6 6" /></svg>),
  dir: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6l6 6-6 6" /></svg>),
  visto: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>),
  cima: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10.5v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" /><path d="M7 10.5l4-6.5a2 2 0 0 1 2.9 2.4l-1 3.6h4.7a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7z" /></svg>),
  baixo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13.5v-9H4.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1z" /><path d="M7 13.5l4 6.5a2 2 0 0 0 2.9-2.4l-1-3.6h4.7a2 2 0 0 0 2-2.4l-1.2-6a2 2 0 0 0-2-1.6H7z" /></svg>),
  envia: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12l15-7-4.5 15-3.5-5.8z" /><path d="M11.5 14.2L19.5 5" /></svg>),
  abre: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9.5l6 6 6-6" /></svg>),
  fecha: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14.5l6-6 6 6" /></svg>),
  relogio: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>),
};

/* O anel de progresso, com o número dentro. É o mesmo desenho do anel de
   créditos do avatar: retângulo de canto redondo com `pathLength=100`, então
   o quanto falta é o número direto, sem conta de perímetro. */
function Anel({ dentro, pct, tam = 26 }) {
  const r = Math.round(tam * 0.31);
  return (
    <span className="apr-anel">
      <svg viewBox={`0 0 ${tam} ${tam}`} aria-hidden="true">
        <rect className="tri" x="2" y="2" width={tam - 4} height={tam - 4} rx={r} pathLength="100" />
        <rect className="ch" x="2" y="2" width={tam - 4} height={tam - 4} rx={r} pathLength="100"
              strokeDasharray="100" strokeDashoffset={100 - pct} />
      </svg>
      <i>{dentro}</i>
    </span>
  );
}



export default function Aprender() {
  const { t } = useIdioma();
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  const [modId, setModId] = useState(null);
  const [aulaId, setAulaId] = useState(null);
  const [abertos, setAbertos] = useState([]);   // módulos abertos no índice

  const [estado, setEstado] = useState({ vistas: [], votos: {}, joinhas: {} });
  /* O catálogo do arquivo já serve a primeira pintura; o que foi editado no
     admin chega logo depois e substitui por cima. Assim a tela abre mesmo com
     a API fora, com os nomes que vieram no código. */
  const [cat, setCat] = useState(null);
  const MODULOS = useMemo(() => comCatalogo(cat), [cat]);
  /* Contra o total DE AGORA, e não contra as 33 do arquivo: desde que dá para
     criar e remover aula no admin, os dois números se separam, e o progresso
     tem que medir contra a lista que a pessoa está vendo. */
  const totalAulas = useMemo(() => contarAulas(MODULOS), [MODULOS]);
  /* A lista plana das 33, para o Anterior e o Próxima andarem pelo curso e não
     pelo módulo: no fim do módulo, o Próxima rola para o seguinte. */
  const FILA = useMemo(
    () => MODULOS.flatMap((m) => m.aulas.map((a) => ({ ...a, modulo: m }))),
    [MODULOS]
  );
  /* A conta mora aqui, e nao num `lerConta()` no meio do JSX: aquele le o
     cache do localStorage uma vez, na hora de desenhar, e nunca mais. Quem
     trocou a foto depois de entrar via a inicial para sempre, porque o cache
     so e reescrito no login e ninguem manda a tela desenhar de novo. */
  const [eu, setEu] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [rascunho, setRascunho] = useState('');
  const [escrevendo, setEscrevendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setEu(lerConta());
    atualizarConta().then((c) => { if (vivo && c) setEu(c); });
    return () => { vivo = false; };
  }, []);
  const caixa = useRef(null);

  useEffect(() => {
    if (!lerConta()) { router.push('/login'); return; }
    setPronto(true);
    lerEstadoAulas().then(setEstado);
    lerCatalogo().then(setCat);
  }, [router]);

  useEffect(() => {
    function aoVoltar() {
      if (aulaId) { setAulaId(null); return; }
      if (modId) setModId(null);
    }
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, [modId, aulaId]);

  // Os comentários chegam por aula, e só quando ela abre.
  useEffect(() => {
    if (!aulaId) { setComentarios([]); return; }
    let vivo = true;
    lerComentarios(aulaId).then((c) => { if (vivo) setComentarios(c); });
    return () => { vivo = false; };
  }, [aulaId]);

  const modulo = MODULOS.find((m) => m.id === modId) || null;
  const aula = modulo ? modulo.aulas.find((a) => a.id === aulaId) || null : null;
  const vistas = useMemo(() => new Set(estado.vistas), [estado.vistas]);

  /* ── A AULA SE MARCA SOZINHA AOS 90% ──
     O player da Panda avisa o andamento por `postMessage`. O formato do
     recado mudou de nome mais de uma vez, então aqui a gente aceita qualquer
     um que traga um tempo e uma duração, em vez de casar com uma chave.

     90% e não 100% porque os últimos segundos são a vinheta do fim: quem
     chegou até ali já assistiu a aula, e esperar o fim exato faria a marca
     depender de a pessoa não fechar a aba antes. Marcar é IDEMPOTENTE: uma
     `ref` guarda o que já foi marcado, senão o evento, que chega várias vezes
     por segundo, viraria uma enxurrada de POSTs. */
  const jaMarcou = useRef(new Set());
  useEffect(() => {
    if (!aulaId) return undefined;
    function ouvir(ev) {
      let host = '';
      try { host = new URL(ev.origin).hostname; } catch (e) { return; }
      if (!/pandavideo\.com\.br$/.test(host)) return;
      let d = ev.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
      if (!d || typeof d !== 'object') return;
      const t0 = Number(d.currentTime ?? d.time ?? d.progress);
      const total = Number(d.duration ?? d.length);
      if (!isFinite(t0) || !isFinite(total) || total <= 0) return;
      if (t0 / total < 0.9) return;
      if (jaMarcou.current.has(aulaId) || vistas.has(aulaId)) return;
      jaMarcou.current.add(aulaId);
      setEstado((e) => ({ ...e, vistas: [...e.vistas, aulaId] }));
      marcarVisto(aulaId, true).catch(() => {});
    }
    window.addEventListener('message', ouvir);
    return () => window.removeEventListener('message', ouvir);
  }, [aulaId, vistas]);


  function abrirModulo(id) {
    setModId(id); setAulaId(null); setAbertos([id]);
    window.history.pushState({ apr: id }, '');
  }
  function abrirAula(id, mod) {
    setAulaId(id);
    if (mod && mod !== modId) { setModId(mod); setAbertos([mod]); }
    setEscrevendo(false); setRascunho('');
    window.history.pushState({ apr: id }, '');
  }
  function quantas(n) {
    return `${n} ${n === 1 ? t('apr_aula') : t('apr_aulas')}`;
  }

  const vistasDo = useCallback(
    (m) => m.aulas.filter((a) => vistas.has(a.id)).length,
    [vistas]
  );

  /* A primeira aula do módulo que ainda não foi vista. É o que o botão da capa
     abre, e é ele que decide se o rótulo diz começar ou continuar. Nulo quando
     o módulo acabou. */
  const proximaDoModulo = useCallback(
    (m) => m.aulas.find((a) => !vistas.has(a.id)) || null,
    [vistas]
  );

  async function alternarVisto() {
    const novo = !vistas.has(aulaId);
    setEstado((e) => ({
      ...e,
      vistas: novo ? [...e.vistas, aulaId] : e.vistas.filter((x) => x !== aulaId),
    }));
    try { await marcarVisto(aulaId, novo); } catch (err) {}
  }

  async function alternarVoto(v) {
    const atual = estado.votos[aulaId] || null;
    const novo = atual === v ? null : v;
    try {
      const d = await votar(aulaId, novo);
      setEstado((e) => ({
        ...e,
        votos: { ...e.votos, [aulaId]: novo },
        joinhas: { ...e.joinhas, [aulaId]: { cima: d.cima, baixo: d.baixo } },
      }));
    } catch (err) {}
  }

  async function enviar() {
    const texto = rascunho.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    try {
      const d = await comentar(aulaId, texto);
      setComentarios((c) => [...c, d.comentario]);
      setRascunho(''); setEscrevendo(false);
    } catch (err) {}
    setEnviando(false);
  }

  if (!pronto) return <AppShell><div className="apr-wrap" /></AppShell>;

  const iAtual = FILA.findIndex((a) => a.id === aulaId);
  const anterior = iAtual > 0 ? FILA[iAtual - 1] : null;
  const proxima = iAtual >= 0 && iAtual < FILA.length - 1 ? FILA[iAtual + 1] : null;
  const joinha = estado.joinhas[aulaId] || { cima: 0, baixo: 0 };
  const meuVoto = estado.votos[aulaId] || null;
  const totalVistas = estado.vistas.length;
  const pctCurso = Math.round((totalVistas / (totalAulas || 1)) * 100);

  return (
    <AppShell>
      <div className="apr-wrap">
        {/* ── 1. OS MÓDULOS ── */}
        {!modulo && (
          <>
            <div className="conta-cabeca">
              <div className="conta-cabeca__txt">
                <p className="eyebrow">{t('apr_titulo')}</p>
                <h1 className="conta-cabeca__nome">{t('pn_apr_tit')}</h1>
                <p className="conta-cabeca__email">{t('apr_sub')}</p>
              </div>
            </div>
            <div className="apr-grade">
              {MODULOS.map((m) => (
                <button key={m.id} className="apr-mod" onClick={() => abrirModulo(m.id)}>
                  <span className="apr-mod__capa">
                    <img src={m.capa} alt="" loading="lazy" />
                  </span>
                  <span className="apr-mod__n">{t('apr_modulo')} {m.id}</span>
                  <span className="apr-mod__t">{tOpt(m.titulo)}</span>
                  <span className="apr-mod__q">{quantas(m.aulas.length)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── 2. AS AULAS DO MÓDULO ── */}
        {modulo && !aula && (
          <div className="apr-mtela">
            <button className="apr-volta apr-volta--topo" onClick={() => setModId(null)}>
              {Ico.esq}{t('apr_voltar_mod')}
            </button>

            {/* A capa deitada e o que ela precisa em volta.
                Uma imagem sozinha à esquerda lê como metade de alguma coisa, e
                aí qualquer sobra de altura vira erro de encaixe. Com o
                progresso e o botão embaixo, ela vira uma coluna de verdade, e
                a lista do lado pode ser mais curta ou mais longa sem estranhar.
                De quebra a tela ganha a ação que faltava: quem abre um módulo
                pela metade não precisa mais caçar na lista onde parou. */}
            <div className="apr-mcol">
              <img className="apr-mcapa" src={modulo.capaH || modulo.capa} alt=""
                   width="1168" height="668" />
              <div className="apr-mprog">
                {/* Sem número dentro: quem conta é o texto ao lado, e dois
                    números dizendo a mesma coisa em 34px brigariam. */}
                <Anel dentro="" pct={Math.round((vistasDo(modulo) / modulo.aulas.length) * 100)} tam={34} />
                <span>
                  <b>{vistasDo(modulo)} {t('apr_de')} {modulo.aulas.length}</b>
                  <em>{t('apr_assistidas')}</em>
                </span>
              </div>
              <button className="apr-mcta" disabled={!proximaDoModulo(modulo)}
                      onClick={() => { const p = proximaDoModulo(modulo); if (p) abrirAula(p.id, modulo.id); }}>
                {!proximaDoModulo(modulo) ? t('apr_mod_pronto')
                  : vistasDo(modulo) === 0 ? t('apr_mod_comecar')
                  : t('apr_mod_continuar')}
              </button>
            </div>

            <div className="apr-mlado">
              <p className="apr-molho">{t('apr_modulo')} {modulo.id} · {quantas(modulo.aulas.length)}</p>
              <h1 className="apr-mtit">{tOpt(modulo.titulo)}</h1>
              <div className="apr-lista">
                {modulo.aulas.map((a, i) => (
                  <button key={a.id} className="apr-aula" onClick={() => abrirAula(a.id, modulo.id)}>
                    <span className="apr-aula__n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="apr-aula__t">{tOpt(a.titulo)}</span>
                    {vistas.has(a.id) && <span className="apr-pip apr-pip--ok">{Ico.visto}</span>}
                    {!urlDoVideo(a.panda) && <span className="apr-aula__tag">{t('apr_breve')}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 3. A AULA ── */}
        {modulo && aula && (
          <>
            <div className="apr-topo">
              <button className="apr-volta" onClick={() => setAulaId(null)}>
                {Ico.esq}{t('apr_voltar_aulas')}
              </button>
            </div>

            <div className="apr-tela">
              <div className="apr-tela__t1">
                <p className="apr-palco__onde">{t('apr_modulo')} {modulo.id} · {tOpt(modulo.titulo)}</p>
                <h1 className="apr-palco__tit">{tOpt(aula.titulo)}</h1>
              </div>

              {/* O progresso do CURSO, solto da lista: ele é a única peça que
                  fala do todo, e o todo não tem número de módulo. */}
              <div className="apr-tela__t2">
                <div className="apr-prog">
                  <Anel dentro={`${pctCurso}%`} pct={pctCurso} tam={32} />
                  <span className="apr-prog__txt">
                    <b>{t('apr_progresso')}</b>
                    <em>{totalVistas} {t('apr_de')} {totalAulas} {t('apr_aulas')}</em>
                  </span>
                </div>
              </div>

              <div>
                <div className="apr-palco__quadro">
                  {urlDoVideo(aula.panda) ? (
                    <iframe
                      src={urlDoVideo(aula.panda)}
                      title={tOpt(aula.titulo)}
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="apr-breve">
                      <b>{t('apr_breve')}</b>
                      <span>{t('apr_breve_sub')}</span>
                    </div>
                  )}
                </div>

                {/* O joinha e o contrário dele moram na mesma pílula: são duas
                    metades de uma pergunta só, e não dois botões vizinhos. */}
                <div className="apr-acoes">
                  <span className="apr-voto">
                    <button className={meuVoto === 1 ? 'on' : undefined}
                            onClick={() => alternarVoto(1)} aria-label={t('apr_gostei')}>
                      {Ico.cima}{joinha.cima > 0 ? joinha.cima : ''}
                    </button>
                    <button className={meuVoto === -1 ? 'on' : undefined}
                            onClick={() => alternarVoto(-1)} aria-label={t('apr_nao_gostei')}>
                      {Ico.baixo}{joinha.baixo > 0 ? joinha.baixo : ''}
                    </button>
                  </span>
                  <button className={'apr-bt' + (vistas.has(aulaId) ? ' apr-bt--on' : '')}
                          onClick={alternarVisto}>
                    {Ico.visto}{vistas.has(aulaId) ? t('apr_assistida') : t('apr_marcar')}
                  </button>
                  <span className="apr-acoes__dir">
                    <button className="apr-bt" disabled={!anterior}
                            onClick={() => anterior && abrirAula(anterior.id, anterior.modulo.id)}>
                      {Ico.esq}{t('apr_anterior')}
                    </button>
                    <button className="apr-bt" disabled={!proxima}
                            onClick={() => proxima && abrirAula(proxima.id, proxima.modulo.id)}>
                      {t('apr_proxima')}{Ico.dir}
                    </button>
                  </span>
                </div>

                <img className="apr-assina" src="/img/aulas/assinatura.webp"
                     alt="Marilia Fischer · 9BARRA7 Academy" width="2501" height="418" />

                {/* ── os comentários ── */}
                <div className="apr-com">
                  <div className="apr-com__cab">
                    <h2>{t('apr_comentarios')}</h2>
                    {comentarios.length > 0 && <em>{comentarios.length}</em>}
                  </div>

                  <div className={'apr-escreve' + (escrevendo ? ' apr-escreve--alto' : '')}>
                    <span className="apr-ava"
                          style={eu?.foto_url ? { backgroundImage: `url(${eu.foto_url})`, color: 'transparent' } : undefined}>
                      {eu?.foto_url ? '' : (eu?.nome || eu?.email || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className={'apr-campo' + (escrevendo ? ' apr-campo--aberto' : '')}>
                      <textarea
                        ref={caixa}
                        rows={escrevendo ? 3 : 1}
                        value={rascunho}
                        placeholder={t('apr_escreva')}
                        onFocus={() => setEscrevendo(true)}
                        onChange={(e) => setRascunho(e.target.value)}
                      />
                      {escrevendo ? (
                        <span className="apr-campo__pe">
                          <button className="apr-bt apr-bt--txt"
                                  onClick={() => setEscrevendo(false)}>{t('apr_cancelar')}</button>
                          <button className="apr-bt apr-bt--cta"
                                  disabled={!rascunho.trim() || enviando} onClick={enviar}>
                            {Ico.envia}{t('apr_comentar')}
                          </button>
                        </span>
                      ) : (
                        <button className="apr-bt apr-bt--so" onClick={() => {
                          setEscrevendo(true);
                          setTimeout(() => caixa.current?.focus(), 0);
                        }}>{Ico.envia}</button>
                      )}
                    </div>
                  </div>

                  {comentarios.map((c) => (
                    <div className="apr-fio" key={c.id}>
                      <span className="apr-ava"
                            style={c.foto ? { backgroundImage: `url(${c.foto})`, color: 'transparent' } : undefined}>
                        {c.foto ? '' : (c.nome || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="apr-fio__txt">
                        <span className="apr-fio__quem">
                          <b>{c.nome || '—'}</b>
                          {c.esperando && (
                            <span className="apr-tag apr-tag--espera">{Ico.relogio}{t('apr_so_voce')}</span>
                          )}
                        </span>
                        <p>{c.texto}</p>
                        {c.resposta && (
                          <span className="apr-resp">
                            <span className="apr-fio__quem">
                              <b>Marilia</b>
                              <span className="apr-tag apr-tag--dono">{t('apr_quem_da')}</span>
                            </span>
                            <p>{c.resposta}</p>
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── o índice do curso ── */}
              <div className="apr-idx">
                {MODULOS.map((m) => {
                  const v = vistasDo(m);
                  const aberto = abertos.includes(m.id);
                  return (
                    <div className={'apr-mod-l' + (aberto ? ' apr-mod-l--on' : '')} key={m.id}>
                      <button className="apr-mod-l__cab"
                              onClick={() => setAbertos((a) => a.includes(m.id) ? a.filter((x) => x !== m.id) : [...a, m.id])}>
                        <Anel dentro={m.id} pct={Math.round((v / m.aulas.length) * 100)} />
                        <span>
                          <b>{tOpt(m.titulo)}</b>
                          <em>{quantas(m.aulas.length)}{v ? ` · ${v} ${t('apr_assistidas')}` : ''}</em>
                        </span>
                        {aberto ? Ico.fecha : Ico.abre}
                      </button>
                      {aberto && (
                        <div className="apr-mod-l__lista">
                          {m.aulas.map((a, i) => (
                            <button key={a.id} className={a.id === aulaId ? 'on' : undefined}
                                    onClick={() => abrirAula(a.id, m.id)}>
                              <span className={'apr-pip' + (vistas.has(a.id) ? ' apr-pip--ok' : '')}>
                                {vistas.has(a.id) ? Ico.visto : null}
                              </span>
                              {i + 1}. {tOpt(a.titulo)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
