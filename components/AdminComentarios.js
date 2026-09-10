'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  A FILA DE COMENTÁRIOS DAS AULAS
//
//  Aprovar não fecha a linha: ela troca de estado e abre o campo de resposta,
//  ali mesmo. Responder é o que se vai querer fazer em nove de cada dez, e
//  obrigar a abrir a aula para isso seria o caminho mais longo entre duas
//  frases.
//
//  Recusar não apaga. O comentário sai da fila e some da aula, e continua
//  guardado com o nome de quem escreveu: sem isso, uma recusa por engano é
//  irreversível, e a mesma pessoa voltando vira duas pessoas diferentes.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { acharAula, lerFilaComentarios, marcarFilaVista, moderarComentario } from '../lib/aulas';
import { useIdioma, tOpt } from '../lib/i18n';

const Ico = {
  ok: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>),
  nao: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>),
  envia: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12l15-7-4.5 15-3.5-5.8z" /><path d="M11.5 14.2L19.5 5" /></svg>),
};

export default function AdminComentarios({ aba }) {
  const { t } = useIdioma();
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [rascunhos, setRascunhos] = useState({});

  const estado = aba === 'todos' ? null : 'espera';

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    lerFilaComentarios(estado)
      .then((d) => { if (vivo) { setLinhas(d.comentarios || []); setCarregando(false); } })
      .catch(() => { if (vivo) setCarregando(false); });
    /* Abrir a aba é o que zera a bolinha: ela conta o que ainda não foi
       OLHADO, e não o que falta fazer. */
    marcarFilaVista();
    return () => { vivo = false; };
  }, [estado]);

  async function agir(id, acao) {
    try {
      const d = await moderarComentario(id, acao);
      setLinhas((l) => l.map((x) => (x.id === id ? { ...x, estado: d.estado } : x)));
    } catch (e) {}
  }

  async function responder(id) {
    const texto = (rascunhos[id] || '').trim();
    if (!texto) return;
    try {
      const d = await moderarComentario(id, 'responder', texto);
      setLinhas((l) => l.map((x) => (x.id === id ? { ...x, resposta: d.resposta } : x)));
      setRascunhos((r) => ({ ...r, [id]: '' }));
    } catch (e) {}
  }

  function onde(id) {
    const achado = acharAula(id);
    if (!achado) return id;
    return `${t('apr_modulo')} ${achado.modulo.id} · ${tOpt(achado.aula.titulo)}`;
  }

  if (carregando) return <div className="adm-com"><p className="adm-com__vazio">{t('comum_carregando')}</p></div>;
  if (!linhas.length) return <div className="adm-com"><p className="adm-com__vazio">{t('adm_com_vazio')}</p></div>;

  return (
    <div className="adm-com">
      {linhas.map((c) => (
        <div key={c.id} className={'adm-com__linha' + (c.estado !== 'espera' ? ' adm-com__linha--ok' : '')}>
          <span className="apr-ava"
                style={c.foto_url ? { backgroundImage: `url(${c.foto_url})`, color: 'transparent' } : undefined}>
            {c.foto_url ? '' : (c.nome || c.email || '?').charAt(0).toUpperCase()}
          </span>
          <span className="adm-com__txt">
            <p className="adm-com__onde">{onde(c.aula)}</p>
            <span className="apr-fio__quem">
              <b>{c.nome || c.email}</b>
              {c.estado === 'no_ar' && (
                <span className="apr-tag apr-tag--dono">{Ico.ok}{t('adm_com_no_ar')}</span>
              )}
              {c.estado === 'recusado' && (
                <span className="apr-tag apr-tag--espera">{t('adm_com_recusado')}</span>
              )}
            </span>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--t-apoio)', color: 'var(--ink2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {c.texto}
            </p>

            {/* O campo de resposta só existe depois que o comentário está no
                ar: responder a um que ninguém vai ver é escrever para a
                parede. */}
            {c.estado === 'no_ar' && (
              c.resposta ? (
                <span className="apr-resp">
                  <span className="apr-fio__quem"><b>{t('apr_quem_da')}</b></span>
                  <p>{c.resposta}</p>
                </span>
              ) : (
                <span className="adm-com__resp">
                  <span className="apr-ava">M</span>
                  <span className="apr-campo">
                    <textarea
                      rows={1}
                      value={rascunhos[c.id] || ''}
                      placeholder={`${t('adm_com_responder')} ${(c.nome || '').split(' ')[0]}…`}
                      onChange={(e) => setRascunhos((r) => ({ ...r, [c.id]: e.target.value }))}
                    />
                    <button className="apr-bt apr-bt--so"
                            disabled={!(rascunhos[c.id] || '').trim()}
                            onClick={() => responder(c.id)}>{Ico.envia}</button>
                  </span>
                </span>
              )
            )}
          </span>

          {c.estado === 'espera' && (
            <span className="adm-com__bts">
              <button className="apr-bt apr-bt--cta" onClick={() => agir(c.id, 'aprovar')}>
                {Ico.ok}{t('adm_com_aprovar')}
              </button>
              <button className="apr-bt apr-bt--so" title={t('adm_com_recusar')}
                      onClick={() => agir(c.id, 'recusar')}>{Ico.nao}</button>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
