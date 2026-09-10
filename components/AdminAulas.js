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
  criarAula, salvarOrdem,
} from '../lib/aulas';
import { useIdioma, tOpt } from '../lib/i18n';

const LADO_CAPA = 520;          // a capa fica guardada com a largura do arquivo
const MAX_ARQUIVO = 8 * 1024 * 1024;

const Ico = {
  ok: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>),
  volta: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h11a4.5 4.5 0 0 1 0 9h-3" /><path d="M7.5 6.5L4 10l3.5 3.5" /></svg>),
  olho: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>),
  cima: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10.5v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" /><path d="M7 10.5l4-6.5a2 2 0 0 1 2.9 2.4l-1 3.6h4.7a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7z" /></svg>),
  baixo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13.5v-9H4.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1z" /><path d="M7 13.5l4 6.5a2 2 0 0 0 2.9-2.4l-1-3.6h4.7a2 2 0 0 0 2-2.4l-1.2-6a2 2 0 0 0-2-1.6H7z" /></svg>),
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

export default function AdminAulas({ aba }) {
  const { t } = useIdioma();
  const [cat, setCat] = useState({});
  const [numeros, setNumeros] = useState({});
  const [pessoas, setPessoas] = useState([]);
  const [semana, setSemana] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const arquivo = useRef(null);
  const [alvoCapa, setAlvoCapa] = useState(null);
  /* A fila que está sendo arrastada. Ela existe só enquanto o dedo está em
     cima, e mais um instante depois: soltar dispara o POST, e a fila continua
     mandando no desenho até o catálogo voltar do banco, senão a lista pularia
     para a ordem velha no meio do caminho. */
  const [fila, setFila] = useState(null);
  const [pronto, setPronto] = useState(null);      // a linha que a alça soltou
  const [abrindo, setAbrindo] = useState({});      // módulos com as removidas à vista

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
    if (d?.id) setCat((c) => ({ ...c, [d.id]: { modulo } }));
  }

  /* ── ARRASTAR ──
     A alça é que decide: `draggable` só liga na linha cuja alça foi apertada.
     Sem isso, arrastar de dentro de um campo de texto viraria arrastar a linha
     inteira, e ninguém mais conseguiria selecionar o que escreveu. */
  function pegar(pai, itens, id) {
    setFila({ pai, ids: itens.map((x) => x.id), movendo: id, salvando: false });
  }
  function sobre(id) {
    setFila((f) => {
      if (!f || f.salvando || f.movendo === id) return f;
      const de = f.ids.indexOf(f.movendo);
      const para = f.ids.indexOf(id);
      if (de < 0 || para < 0) return f;
      const ids = f.ids.slice();
      ids.splice(para, 0, ids.splice(de, 1)[0]);
      return { ...f, ids };
    });
  }
  async function soltar() {
    setPronto(null);
    const f = fila;
    if (!f || f.salvando) return;
    setFila({ ...f, salvando: true });
    try {
      const d = await salvarOrdem(f.pai, f.ids);
      if (d?.catalogo) setCat(d.catalogo);
    } catch (e) {}
    setFila(null);
  }

  /* Enquanto a fila está viva, quem manda no desenho é ela. */
  function naOrdem(pai, itens) {
    if (!fila || fila.pai !== pai) return itens;
    const por = new Map(itens.map((x) => [x.id, x]));
    const posto = fila.ids.map((id) => por.get(id)).filter(Boolean);
    return posto.length === itens.length ? posto : itens;
  }

  /* A capa vai como data URL, do mesmo jeito que a foto do perfil: ela é
     redesenhada num canvas de 520 de largura antes de sair daqui, então o
     arquivo de 4 MB que a pessoa escolheu não é o que fica guardado. */
  function escolherCapa(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f || !alvoCapa) return;
    if (f.size > MAX_ARQUIVO) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const alt = Math.round((img.height / img.width) * LADO_CAPA);
        const c = document.createElement('canvas');
        c.width = LADO_CAPA; c.height = alt;
        c.getContext('2d').drawImage(img, 0, 0, LADO_CAPA, alt);
        gravar(alvoCapa, 'capa', c.toDataURL('image/webp', 0.86)).catch(() => {});
        setAlvoCapa(null);
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(f);
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
                <span className="adm-barra__n">{l.m.id}</span>
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
      {naOrdem('', lista).map((m) => (
        <div
          className={'adm-cat' + (fila?.movendo === m.id ? ' adm-cat--movendo' : '')}
          key={m.id}
          draggable={pronto === m.id}
          onDragStart={() => pegar('', lista, m.id)}
          onDragOver={(e) => { if (fila?.pai === '') { e.preventDefault(); sobre(m.id); } }}
          onDragEnd={soltar}
          onDrop={(e) => { e.preventDefault(); soltar(); }}
        >
          <div className="adm-cat__mod">
            <span
              className="adm-cat__pega" title={t('adm_cat_mover')}
              onMouseDown={() => setPronto(m.id)}
              onMouseUp={() => setPronto(null)}
            >{Ico.pega}</span>
            <span className="adm-cat__capa">
              <img src={m.capa} alt="" />
              <button onClick={() => { setAlvoCapa(m.id); setTimeout(() => arquivo.current?.click(), 0); }}>
                {t('adm_cat_capa')}
              </button>
            </span>
            <span className="adm-cat__txt">
              <p className="adm-cat__olho">
                {t('apr_modulo')} {m.id} · {m.aulas.length} {t('apr_aulas')}
                {m.editado && <span className="apr-tag apr-tag--trad">{t('adm_cat_sem_trad')}</span>}
                {m.capaTrocada && (
                  <button className="apr-bt apr-bt--txt" onClick={() => gravar(m.id, 'capa', '')}>
                    {Ico.volta}{t('adm_cat_capa_volta')}
                  </button>
                )}
              </p>
              <Campo
                valor={m.titulo}
                original={cat[m.id]?.titulo != null ? true : null}
                onSalvar={(v) => gravar(m.id, 'titulo', v)}
              />
            </span>
          </div>

          {naOrdem(m.id, m.aulas.filter((a) => !a.removido)).map((a, i) => {
            const n = numeros[a.id] || { vistas: 0, cima: 0, baixo: 0, com: 0 };
            const noAr = !!urlDoVideo(a.panda);
            return (
              <div
                className={'adm-cat__aula' + (fila?.movendo === a.id ? ' adm-cat__aula--movendo' : '')}
                key={a.id}
                draggable={pronto === a.id}
                onDragStart={() => pegar(m.id, m.aulas.filter((x) => !x.removido), a.id)}
                onDragOver={(e) => { if (fila?.pai === m.id) { e.preventDefault(); sobre(a.id); } }}
                onDragEnd={soltar}
                onDrop={(e) => { e.preventDefault(); soltar(); }}
              >
                <span
                  className="adm-cat__pega" title={t('adm_cat_mover')}
                  onMouseDown={() => setPronto(a.id)}
                  onMouseUp={() => setPronto(null)}
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
                  <span className={'apr-tag ' + (noAr ? 'apr-tag--dono' : 'apr-tag--espera')}>
                    {noAr ? Ico.ok : null}{noAr ? t('adm_com_no_ar') : t('apr_breve')}
                  </span>
                  <span>{Ico.olho}{n.vistas}</span>
                  <span>{Ico.cima}{n.cima}</span>
                  <span>{Ico.baixo}{n.baixo}</span>
                  <span>{Ico.balao}{n.com}</span>
                </span>
                <button className="apr-bt apr-bt--so adm-cat__tira" title={t('adm_cat_remover')}
                        onClick={() => gravar(a.id, 'removido', '1')}>{Ico.x}</button>
              </div>
            );
          })}

          {/* O pé do módulo: criar uma aula, e as removidas dobradas. Elas
              ficam dobradas e não sumidas porque remover aqui é esconder: o
              que a aula juntou de comentário e de assistido continua lá. */}
          <div className="adm-cat__pe">
            <button className="apr-bt apr-bt--txt" onClick={() => nova(m.id)}>
              {Ico.mais}{t('adm_cat_nova')}
            </button>
            {m.aulas.some((a) => a.removido) && (
              <button className="apr-bt apr-bt--txt"
                      onClick={() => setAbrindo((o) => ({ ...o, [m.id]: !o[m.id] }))}>
                {m.aulas.filter((a) => a.removido).length} {t('adm_cat_removidas')}
                {' · '}{abrindo[m.id] ? t('adm_cat_esconder') : t('adm_cat_mostrar')}
              </button>
            )}
          </div>

          {abrindo[m.id] && m.aulas.filter((a) => a.removido).map((a) => (
            <div className="adm-cat__aula adm-cat__aula--fora" key={a.id}>
              <span className="adm-cat__n">—</span>
              <span className="adm-cat__nome"><s>{tOpt(a.titulo) || t('adm_cat_nome')}</s></span>
              <button className="apr-bt apr-bt--txt"
                      onClick={() => gravar(a.id, 'removido', '')}>
                {Ico.volta}{t('adm_cat_voltar_aula')}
              </button>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
