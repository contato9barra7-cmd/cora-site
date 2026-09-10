'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN · AULAS — o catálogo e o progresso
//
//  O arquivo `lib/aulas.js` é o berço: ele nasce com os 7 módulos, as 33
//  aulas, a ordem, as capas e as traduções. Aqui só se edita POR CIMA, e o
//  que é editado vai para o banco. Desfazer é apagar a linha, e o original
//  volta com a tradução dele junto.
//
//  O que esta tela NÃO faz, de propósito: criar aula, apagar aula e trocar a
//  ordem. Isso é estrutura do curso, e estrutura merece ficar no histórico do
//  git com data e motivo. Trocar o nome de uma aula não.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MODULOS, TOTAL_AULAS, comCatalogo, urlDoVideo, lerPainelAulas, salvarCatalogo,
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

  const lista = useMemo(() => comCatalogo(cat), [cat]);

  async function gravar(id, campo, valor) {
    const d = await salvarCatalogo(id, campo, valor);
    setCat((c) => {
      const novo = { ...c };
      if (d.item && (d.item.titulo || d.item.capa || d.item.panda)) {
        novo[id] = {};
        if (d.item.titulo != null) novo[id].titulo = d.item.titulo;
        if (d.item.capa != null) novo[id].capa = d.item.capa;
        if (d.item.panda != null) novo[id].panda = d.item.panda;
      } else {
        delete novo[id];
      }
      return novo;
    });
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
    const terminaram = pessoas.filter((n) => n >= TOTAL_AULAS).length;
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
      {lista.map((m) => (
        <div className="adm-cat" key={m.id}>
          <div className="adm-cat__mod">
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

          {m.aulas.map((a, i) => {
            const n = numeros[a.id] || { vistas: 0, cima: 0, baixo: 0, com: 0 };
            const noAr = !!urlDoVideo(a.panda);
            return (
              <div className="adm-cat__aula" key={a.id}>
                <span className="adm-cat__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="adm-cat__nome">
                  <Campo
                    valor={a.titulo}
                    original={cat[a.id]?.titulo != null ? true : null}
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
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
