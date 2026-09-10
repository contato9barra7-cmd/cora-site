'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN · AULAS — o catálogo e o progresso
//
//  O arquivo `lib/aulas.js` é o berço: ele nasce com os 7 módulos, as 33
//  aulas, a ordem, as capas e as traduções. Aqui só se edita POR CIMA, e o
//  que é editado vai para o banco. Desfazer é apagar a linha, e o original
//  volta com a tradução dele junto.
//
//  A ESTRUTURA também se edita aqui: criar aula, remover e trocar a ordem das
//  aulas e dos módulos. Duas regras seguram isso de pé:
//
//  Remover ESCONDE, não apaga. A aula sai da lista de quem estuda, mas os
//  comentários e o assistido dela continuam de pé, e trazer de volta é um
//  clique. Uma aula que junta trinta comentários não pode sumir por engano.
//
//  A ordem vai para o banco como a LISTA INTEIRA daquele nível, e nunca como
//  "esta subiu uma casa": a posição de um item sozinho não diz nada sem a dos
//  outros. Enquanto ninguém arrastou nada, a ordem é a do arquivo.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MODULOS, comCatalogo, contarAulas, urlDoVideo, lerPainelAulas, salvarCatalogo,
  criarAula, criarModulo, publicarModulo, salvarOrdem,
} from '../lib/aulas';
import { useIdioma, tOpt } from '../lib/i18n';

/* A capa fica guardada com a largura do arquivo. São duas medidas porque são
   duas composições: o cartaz em pé vai na fila dos sete módulos, e a deitada
   na tela do módulo, ao lado da lista de aulas. */
const LADO_CAPA = { capa: 520, capah: 1168 };
const MAX_ARQUIVO = 8 * 1024 * 1024;

const Ico = {
  ok: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>),
  volta: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11a4.5 4.5 0 0 1 0 9h-3" /><path d="M7.5 6.5L4 10l3.5 3.5" /></svg>),
  olho: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>),
  cima: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10.5v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" /><path d="M7 10.5l4-6.5a2 2 0 0 1 2.9 2.4l-1 3.6h4.7a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7z" /></svg>),
  baixo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13.5v-9H4.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1z" /><path d="M7 13.5l4 6.5a2 2 0 0 0 2.9-2.4l-1-3.6h4.7a2 2 0 0 0 2-2.4l-1.2-6a2 2 0 0 0-2-1.6H7z" /></svg>),
  noAr: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.3l2.5 2.5 4.5-5" /></svg>),
  rascunho: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" strokeDasharray="3 3" /></svg>),
  relogio: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>),
  seta: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9.5l6 6 6-6" /></svg>),
  dobrar: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16" /><path d="M9 7.5L12 4.5l3 3" /><path d="M9 16.5l3 3 3-3" /></svg>),
  mais: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5.5v13M5.5 12h13" /></svg>),
  x: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>),
  pega: (<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>),
  balao: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13.5a3 3 0 0 1-3 3H9l-4 3.5v-3.5H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" /></svg>),
};

/* Um campo que só salva quando muda de verdade e sai do foco. Salvar a cada
   tecla mandaria um POST por letra; salvar num botão obrigaria a clicar em
   trinta e três botões. */
function Campo({ valor, original, onSalvar, placeholder, largo }) {
  const [txt, setTxt] = useState(valor ?? '');
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setTxt(valor ?? ''); }, [valor]);
  const mudou = (txt || '') !== (valor ?? '');

  async function sair() {
    if (!mudou || salvando) return;
    setSalvando(true);
    try { await onSalvar(txt.trim()); } catch (e) {}
    setSalvando(false);
  }
  return (
    <span className={'adm-cat__campo' + (mudou ? ' adm-cat__campo--edit' : '')}>
      <input
        value={txt}
        placeholder={placeholder}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={sair}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={largo ? { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5 } : undefined}
      />
      {original != null && (
        <button className="apr-bt apr-bt--so" title="Voltar ao original"
                onClick={() => onSalvar('')}>{Ico.volta}</button>
      )}
    </span>
  );
}

/* Uma caixa que empresta o próprio nó para quem desenha dentro dela. A alça
   precisa dele para dizer ao navegador que o fantasma do arrasto é a LINHA
   inteira, e não o punhado de pontinhos que foi agarrado. */
function Bloco({ className, onDragOver, onDrop, render }) {
  const eu = useRef(null);
  return (
    <div ref={eu} className={className} onDragOver={onDragOver} onDrop={onDrop}>
      {render(eu)}
    </div>
  );
}

/* Os tres estados. Um so vale por vez, e por isso e um seletor e nao tres
   interruptores: nao existe aula publicada E em rascunho.

   'no_ar' e o padrao, e quem esta nele nao guarda linha no banco: sem estado
   gravado a aula ja esta no ar. Isso e o que faz as 33 do arquivo aparecerem
   sem uma linha cada. */
const ESTADOS = ['no_ar', 'rascunho', 'breve'];
const CLASSE = { no_ar: 'adm-est--no', rascunho: 'adm-est--ras', breve: 'adm-est--br' };
const DESENHO = { no_ar: 'noAr', rascunho: 'rascunho', breve: 'relogio' };

function Estado({ valor, onTrocar, t }) {
  const [aberto, setAberto] = useState(false);
  const eu = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    function fora(ev) { if (eu.current && !eu.current.contains(ev.target)) setAberto(false); }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  return (
    <span className="adm-est-wrap" ref={eu}>
      <button className={'adm-est ' + CLASSE[valor]} onClick={() => setAberto((a) => !a)}>
        {Ico[DESENHO[valor]]}{t('adm_est_' + valor)}{Ico.seta}
      </button>
      {aberto && (
        <span className="adm-est-menu">
          {ESTADOS.map((e) => (
            <button key={e} className={'adm-est-op' + (e === valor ? ' adm-est-op--on' : '')}
                    onClick={() => { setAberto(false); if (e !== valor) onTrocar(e); }}>
              <span className={'adm-est-op__ico ' + CLASSE[e]}>{Ico[DESENHO[e]]}</span>
              <span><b>{t('adm_est_' + e)}</b><em>{t('adm_est_' + e + '_q')}</em></span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export default function AdminAulas({ aba }) {
  const { t } = useIdioma();
  const [cat, setCat] = useState({});
  const [numeros, setNumeros] = useState({});
  const [pessoas, setPessoas] = useState([]);
  const [semana, setSemana] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const arquivo = useRef(null);
  const [alvoCapa, setAlvoCapa] = useState(null);
  /* ── ARRASTAR ──
     `arraste` é o gesto em curso, e ele NÃO muda de conteúdo enquanto dura:
     a primeira versão reordenava a lista a cada `dragover`, e mexer no nó que
     está sendo arrastado faz o navegador abortar o gesto na hora. Era isso o
     "arrasta mas não solta". Agora só uma linha fina diz onde ele vai cair, e
     a lista se reordena depois que o dedo solta.

     `posto` é a ordem nova mandando no desenho enquanto o banco não responde,
     senão a lista voltaria para a ordem velha no meio do caminho. */
  const [arraste, setArraste] = useState(null);    // { pai, ids, movendo }
  const [alvo, setAlvo] = useState(null);          // { id, depois }
  const [posto, setPosto] = useState(null);        // { pai, ids }
  const [abrindo, setAbrindo] = useState({});      // módulos com as removidas à vista
  /* Quais módulos estão FECHADOS. Guardar o fechado e não o aberto faz a tela
     nascer com tudo aberto, que é como ela sempre foi. Fechar serve para
     reorganizar a fila dos sete: com as 33 aulas à mostra, arrastar um módulo
     do fim para o começo é uma viagem de tela e meia. */
  const [fechados, setFechados] = useState({});

  useEffect(() => {
    let vivo = true;
    lerPainelAulas()
      .then((d) => {
        if (!vivo) return;
        setCat(d.catalogo || {});
        setNumeros(d.numeros || {});
        setPessoas(d.pessoas || []);
        setSemana(d.semana || 0);
        setCarregando(false);
      })
      .catch(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, []);

  const lista = useMemo(() => comCatalogo(cat, true), [cat]);

  async function gravar(id, campo, valor) {
    const d = await salvarCatalogo(id, campo, valor);
    /* O servidor devolve a linha já enxuta, ou nada quando ela se apagou por
       não guardar mais nenhuma edição. */
    setCat((c) => {
      const novo = { ...c };
      if (d.item) novo[id] = d.item; else delete novo[id];
      return novo;
    });
  }

  async function nova(modulo) {
    const d = await criarAula(modulo);
    if (d?.id) setCat((c) => ({ ...c, [d.id]: { criado: true, modulo } }));
  }

  /* O módulo novo nasce vazio: sem nome, sem capa e sem aula. Ele entra no fim
     da fila e o resto chega por onde já chegava, campo a campo. */
  /* O módulo e todas as aulas dele de uma vez. Um módulo de nove aulas prontas
     seriam dez idas ao servidor sem isto, e dez chances de parar no meio com
     metade publicada. */
  async function publicarTudo(id) {
    try {
      const d = await publicarModulo(id);
      if (d?.catalogo) setCat(d.catalogo);
    } catch (e) {}
  }

  async function novoModulo() {
    const d = await criarModulo();
    if (d?.id) {
      setCat((c) => ({ ...c, [d.id]: { criado: true } }));
      setFechados((f) => ({ ...f, [d.id]: false }));
    }
  }

  /* Quem é arrastável é a ALÇA, e não a linha. Ligado na linha, arrastar de
     dentro de um campo de texto viraria arrastar a linha inteira, e ninguém
     mais conseguiria selecionar o que escreveu. O fantasma continua sendo a
     linha toda, por `setDragImage`. */
  function pegar(ev, pai, itens, id, linha) {
    ev.dataTransfer.effectAllowed = 'move';
    /* Sem `setData` o Chrome trata o gesto como um arrasto sem carga e recusa
       o drop, mesmo com o dragover pedindo. */
    ev.dataTransfer.setData('text/plain', id);
    if (linha) ev.dataTransfer.setDragImage(linha, 24, 20);
    setArraste({ pai, ids: itens.map((x) => x.id), movendo: id });
  }

  /* A metade de cima da linha manda cair antes dela, a de baixo depois. Sem
     isso não dá para largar no fim da lista: o último item não teria borda
     de baixo para mirar. */
  function sobre(ev, pai, id) {
    if (!arraste || arraste.pai !== pai) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    if (id === arraste.movendo) { setAlvo(null); return; }
    const r = ev.currentTarget.getBoundingClientRect();
    const depois = ev.clientY > r.top + r.height / 2;
    setAlvo((a) => (a && a.id === id && a.depois === depois ? a : { id, depois }));
  }

  function largar() { setArraste(null); setAlvo(null); }

  async function soltar(ev, pai, id) {
    ev.preventDefault();
    ev.stopPropagation();
    const a = arraste;
    const onde = alvo;
    largar();
    if (!a || a.pai !== pai || id === a.movendo) return;
    const ids = a.ids.filter((x) => x !== a.movendo);
    const i = ids.indexOf(id);
    if (i < 0) return;
    ids.splice(onde && onde.depois ? i + 1 : i, 0, a.movendo);
    setPosto({ pai, ids });
    try {
      const d = await salvarOrdem(pai, ids);
      if (d?.catalogo) setCat(d.catalogo);
    } catch (e) {}
    setPosto(null);
  }

  /* Enquanto o banco não respondeu, quem manda no desenho é a ordem nova. */
  function naOrdem(pai, itens) {
    if (!posto || posto.pai !== pai) return itens;
    const por = new Map(itens.map((x) => [x.id, x]));
    const fila = posto.ids.map((id) => por.get(id)).filter(Boolean);
    return fila.length === itens.length ? fila : itens;
  }

  function marca(id) {
    if (!alvo || alvo.id !== id) return '';
    return alvo.depois ? ' adm-cat--depois' : ' adm-cat--antes';
  }

  /* A capa vai como data URL, do mesmo jeito que a foto do perfil: ela é
     redesenhada num canvas de 520 de largura antes de sair daqui, então o
     arquivo de 4 MB que a pessoa escolheu não é o que fica guardado. */
  function escolherCapa(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f || !alvoCapa) return;
    if (f.size > MAX_ARQUIVO) return;
    const { id, campo } = alvoCapa;
    const largura = LADO_CAPA[campo];
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const alt = Math.round((img.height / img.width) * largura);
        const c = document.createElement('canvas');
        c.width = largura; c.height = alt;
        c.getContext('2d').drawImage(img, 0, 0, largura, alt);
        gravar(id, campo, c.toDataURL('image/webp', 0.86)).catch(() => {});
        setAlvoCapa(null);
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(f);
  }

  function trocarCapa(id, campo) {
    setAlvoCapa({ id, campo });
    setTimeout(() => arquivo.current?.click(), 0);
  }

  if (carregando) return <div className="adm-com"><p className="adm-com__vazio">{t('comum_carregando')}</p></div>;

  /* ── PROGRESSO ── */
  if (aba === 'progresso') {
    const comecaram = pessoas.length;
    const total = contarAulas(comCatalogo(cat));
    const terminaram = pessoas.filter((n) => n >= total).length;
    /* Quanto de cada módulo foi assistido, somando as aulas dele. A queda é a
       diferença para o módulo anterior: barra baixa no fim do curso é gente
       ainda chegando, queda brusca no meio é aula que perde a pessoa. */
    const base = comecaram || 1;
    const linhas = MODULOS.map((m) => {
      const soma = m.aulas.reduce((n, a) => n + (numeros[a.id]?.vistas || 0), 0);
      return { m, pct: Math.round((soma / (m.aulas.length * base)) * 100) };
    });
    const pior = linhas.reduce((p, l, i) => {
      if (i === 0) return p;
      const q = linhas[i - 1].pct - l.pct;
      return q > (p?.q ?? 0) ? { l, q } : p;
    }, null);

    return (
      <>
        <div className="adm-num" style={{ marginBottom: 16 }}>
          <div className="adm-tijolo"><b>{comecaram}</b><em>{t('adm_pg_comecaram')}</em></div>
          <div className="adm-tijolo"><b>{terminaram}</b><em>{t('adm_pg_terminaram')}</em></div>
          <div className="adm-tijolo"><b>{semana}</b><em>{t('adm_pg_semana')}</em></div>
          <div className="adm-tijolo">
            <b>{pior && pior.q >= 20 ? pior.l.m.id : '—'}</b>
            <em>{t('adm_pg_queda')}</em>
          </div>
        </div>
        <div className="adm-com">
          {linhas.map((l, i) => {
            const queda = i > 0 ? linhas[i - 1].pct - l.pct : 0;
            return (
              <div className={'adm-barra' + (queda >= 20 ? ' adm-barra--queda' : '')} key={l.m.id}>
                <span className="adm-barra__n">{l.m.numero || l.m.id}</span>
                <span className="adm-barra__t">
                  {tOpt(l.m.titulo)}
                  {queda >= 20 && <span className="adm-queda">{t('adm_pg_caiu')} {queda}</span>}
                  <em>{l.m.aulas.length} {t('apr_aulas')}</em>
                </span>
                <span className="adm-barra__g"><i style={{ width: `${Math.max(0, Math.min(100, l.pct))}%` }} /></span>
                <span className="adm-barra__p">{l.pct}%</span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  /* ── AS AULAS ── */
  return (
    <>
      <input ref={arquivo} type="file" accept="image/*" hidden onChange={escolherCapa} />

      {/* Fechar tudo é o que torna a fila dos módulos arrastável: dobrados, os
          sete cabem numa tela e a ordem se resolve num gesto. */}
      <div className="adm-cat__barra">
        <button className="apr-bt apr-bt--txt" onClick={() => {
          const tudoFechado = lista.every((m) => fechados[m.id]);
          setFechados(tudoFechado ? {} : Object.fromEntries(lista.map((m) => [m.id, true])));
        }}>
          {Ico.dobrar}
          {lista.every((m) => fechados[m.id]) ? t('adm_cat_abrir_tudo') : t('adm_cat_fechar_tudo')}
        </button>
        <button className="apr-bt apr-bt--txt" onClick={novoModulo}>
          {Ico.mais}{t('adm_cat_novo_mod')}
        </button>
      </div>

      {naOrdem('', lista).map((m) => (
        <Bloco
          key={m.id}
          className={'adm-cat' + (arraste?.movendo === m.id ? ' adm-cat--movendo' : '') + marca(m.id)}
          onDragOver={(e) => sobre(e, '', m.id)}
          onDrop={(e) => soltar(e, '', m.id)}
          render={(linha) => (<>
          <div className="adm-cat__mod">
            <span
              className="adm-cat__pega" title={t('adm_cat_mover')} draggable
              onDragStart={(e) => pegar(e, '', lista, m.id, linha.current)}
              onDragEnd={largar}
            >{Ico.pega}</span>
            <button className={'adm-cat__dobra' + (fechados[m.id] ? ' adm-cat__dobra--off' : '')}
                    title={fechados[m.id] ? t('adm_cat_abrir') : t('adm_cat_fechar')}
                    onClick={() => setFechados((f) => ({ ...f, [m.id]: !f[m.id] }))}>
              {Ico.seta}
            </button>
            {/* Módulo novo não tem capa nenhuma até alguém subir uma, então o
                lugar dela fica vazio em vez de mostrar um <img> quebrado. */}
            <span className="adm-cat__capa">
              {m.capa ? <img src={m.capa} alt="" /> : <span className="adm-cat__semcapa" />}
              <button onClick={() => trocarCapa(m.id, 'capa')}>{t('adm_cat_capa')}</button>
            </span>
            {/* A deitada, que é a que aparece na tela do módulo. Ela fica ao
                lado da em pé para as duas serem trocadas no mesmo lugar: são
                duas composições da mesma arte, e esquecer uma delas deixa o
                módulo com uma capa nova na fila e a velha lá dentro. */}
            <span className="adm-cat__capa adm-cat__capa--h">
              {(m.capaH || m.capa)
                ? <img src={m.capaH || m.capa} alt="" />
                : <span className="adm-cat__semcapa" />}
              <button onClick={() => trocarCapa(m.id, 'capah')}>{t('adm_cat_capa_h')}</button>
            </span>
            <Estado valor={m.estado} t={t} onTrocar={(e) => gravar(m.id, 'estado', e)} />
            <span className="adm-cat__txt">
              <p className="adm-cat__olho">
                {t('apr_modulo')} {m.numero || m.id} · {m.aulas.length} {t('apr_aulas')}
                {m.editado && <span className="apr-tag apr-tag--trad">{t('adm_cat_sem_trad')}</span>}
                {m.capaTrocada && (
                  <button className="apr-bt apr-bt--txt" onClick={() => gravar(m.id, 'capa', '')}>
                    {Ico.volta}{t('adm_cat_capa_volta')}
                  </button>
                )}
                {m.capaHTrocada && (
                  <button className="apr-bt apr-bt--txt" onClick={() => gravar(m.id, 'capah', '')}>
                    {Ico.volta}{t('adm_cat_capa_h_volta')}
                  </button>
                )}
              </p>
              <Campo
                valor={m.titulo}
                placeholder={t('adm_cat_nome_mod')}
                original={cat[m.id]?.titulo != null && !m.novo ? true : null}
                onSalvar={(v) => gravar(m.id, 'titulo', v)}
              />
            </span>
          </div>

          {!fechados[m.id] && naOrdem(m.id, m.aulas.filter((a) => !a.removido)).map((a, i) => {
            const n = numeros[a.id] || { vistas: 0, cima: 0, baixo: 0, com: 0 };
            const noAr = !!urlDoVideo(a.panda);
            return (
              <Bloco
                key={a.id}
                className={'adm-cat__aula' + (arraste?.movendo === a.id ? ' adm-cat--movendo' : '') + marca(a.id)}
                onDragOver={(e) => sobre(e, m.id, a.id)}
                onDrop={(e) => soltar(e, m.id, a.id)}
                render={(linha) => (<>
                <span
                  className="adm-cat__pega" title={t('adm_cat_mover')} draggable
                  onDragStart={(e) => pegar(e, m.id, m.aulas.filter((x) => !x.removido), a.id, linha.current)}
                  onDragEnd={largar}
                >{Ico.pega}</span>
                <span className="adm-cat__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="adm-cat__nome">
                  <Campo
                    valor={a.titulo}
                    placeholder={t('adm_cat_nome')}
                    original={cat[a.id]?.titulo != null && !a.nova ? true : null}
                    onSalvar={(v) => gravar(a.id, 'titulo', v)}
                  />
                  {a.editado && <span className="apr-tag apr-tag--trad">{t('adm_cat_sem_trad')}</span>}
                </span>
                <span className="adm-cat__link">
                  <Campo
                    largo
                    valor={a.pandaDoBanco ? a.panda : ''}
                    original={cat[a.id]?.panda != null ? true : null}
                    /* Quando o link vem do ARQUIVO, ele aparece apagado no
                       lugar do convite: assim a linha diz "no ar" e mostra de
                       onde. Texto apagado = veio do código; texto escrito =
                       veio daqui. */
                    placeholder={a.panda && !a.pandaDoBanco ? a.panda : t('adm_cat_cole')}
                    onSalvar={(v) => gravar(a.id, 'panda', v)}
                  />
                </span>
                <span className="adm-cat__num">
                  <Estado valor={a.estado} t={t} onTrocar={(e) => gravar(a.id, 'estado', e)} />
                  {/* Ter vídeo é outra pergunta, e continua sendo mostrada: uma
                      aula publicada sem link abre dizendo "em breve" para quem
                      estuda, e é bom enxergar isso daqui. */}
                  {!noAr && <span className="apr-tag apr-tag--espera">{t('adm_cat_sem_video')}</span>}
                  <span>{Ico.olho}{n.vistas}</span>
                  <span>{Ico.cima}{n.cima}</span>
                  <span>{Ico.baixo}{n.baixo}</span>
                  <span>{Ico.balao}{n.com}</span>
                </span>
                <button className="apr-bt apr-bt--so adm-cat__tira" title={t('adm_cat_remover')}
                        onClick={() => gravar(a.id, 'removido', '1')}>{Ico.x}</button>
                </>)} />
            );
          })}

          {/* O pé do módulo: criar uma aula, e as removidas dobradas. Elas
              ficam dobradas e não sumidas porque remover aqui é esconder: o
              que a aula juntou de comentário e de assistido continua lá. */}
          {!fechados[m.id] && <div className="adm-cat__pe">
            <button className="apr-bt apr-bt--txt" onClick={() => nova(m.id)}>
              {Ico.mais}{t('adm_cat_nova')}
            </button>
            {m.aulas.some((a) => a.estado !== 'no_ar') && (
              <button className="apr-bt apr-bt--txt" onClick={() => publicarTudo(m.id)}>
                {Ico.noAr}{t('adm_cat_publicar_tudo')}
              </button>
            )}
            {m.aulas.some((a) => a.removido) && (
              <button className="apr-bt apr-bt--txt"
                      onClick={() => setAbrindo((o) => ({ ...o, [m.id]: !o[m.id] }))}>
                {m.aulas.filter((a) => a.removido).length} {t('adm_cat_removidas')}
                {' · '}{abrindo[m.id] ? t('adm_cat_esconder') : t('adm_cat_mostrar')}
              </button>
            )}
          </div>}

          {!fechados[m.id] && abrindo[m.id] && m.aulas.filter((a) => a.removido).map((a) => (
            <div className="adm-cat__aula adm-cat__aula--fora" key={a.id}>
              <span className="adm-cat__n">—</span>
              <span className="adm-cat__nome"><s>{tOpt(a.titulo) || t('adm_cat_nome')}</s></span>
              <button className="apr-bt apr-bt--txt"
                      onClick={() => gravar(a.id, 'removido', '')}>
                {Ico.volta}{t('adm_cat_voltar_aula')}
              </button>
            </div>
          ))}
          </>)} />
      ))}
    </>
  );
}
