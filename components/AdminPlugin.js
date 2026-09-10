'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN · PUBLICAR UMA VERSÃO DO PLUGIN
//
//  Quem instala a atualização é o próprio plugin, sozinho. Ele pergunta a
//  versão de tempos em tempos, e se a que está publicada for maior que a dele,
//  mostra o aviso, baixa o `.rbz` e instala. Nada disso passa por e-mail nem
//  por link: a pessoa clica em atualizar dentro do SketchUp.
//
//  Publicar, então, é só pôr dois arquivos no lugar certo do R2:
//
//    cora-render.rbz   o plugin em si
//    versao.json       { versao, novidades[], obrigatoria }
//
//  E eles têm ORDEM. Primeiro o arquivo, depois o manifesto. Invertido, o
//  manifesto anunciaria uma versão cujo arquivo ainda não subiu, e todo plugin
//  que perguntasse naquele minuto baixaria a versão velha achando que era a
//  nova. Esta tela faz os dois na ordem, num clique só.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { lerPlugin, subirPluginArquivo, publicarPluginVersao } from '../lib/aulas';
import { useIdioma } from '../lib/i18n';

const Ico = {
  sobe: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4.5" /><path d="M7.5 9L12 4.5 16.5 9" /><path d="M4.5 16v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>),
  caixa: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5l8 4v9l-8 4-8-4v-9z" /><path d="M4 7.5l8 4 8-4" /><path d="M12 11.5V20" /></svg>),
  ok: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>),
};

function tamanhoLegivel(n) {
  if (!n) return '';
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
  return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}

/* '2.1.0' contra '2.0.9': a comparação é número a número, e não de texto, senão
   '2.10.0' sairia antes de '2.9.0'. */
function maior(a, b) {
  const A = String(a || '').split('.').map(Number);
  const B = String(b || '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((A[i] || 0) > (B[i] || 0)) return true;
    if ((A[i] || 0) < (B[i] || 0)) return false;
  }
  return false;
}

export default function AdminPlugin() {
  const { t, idioma } = useIdioma();
  const escolher = useRef(null);
  const [agora, setAgora] = useState(null);
  const [carregando, setCarregando] = useState(true);
  /* "Nada publicado" e "não consegui perguntar" são coisas diferentes e
     estavam saindo iguais na tela. A primeira é o começo de tudo, a segunda é
     um problema, e quem lê precisa saber em qual das duas está. */
  const [naoLeu, setNaoLeu] = useState(false);

  const [arquivo, setArquivo] = useState(null);   // o .rbz escolhido, ainda no PC
  const [versao, setVersao] = useState('');
  const [novidades, setNovidades] = useState('');
  const [obrigatoria, setObrigatoria] = useState(false);
  const [indo, setIndo] = useState('');           // '' | 'arquivo' | 'versao'
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  /* ── CORRIGIR O AVISO DA VERSAO QUE JA ESTA NO AR ──
     Republicar o manifesto com o MESMO numero nao avisa ninguem de novo: quem
     ja atualizou continua atualizado, e quem ainda nao passa a ler o texto
     novo. E o conserto do erro de digitacao, e tambem o jeito de trancar uma
     versao que ja saiu sem ter que subir o arquivo outra vez. */
  const [avisoTxt, setAvisoTxt] = useState('');
  const [avisoObrig, setAvisoObrig] = useState(false);
  const [salvandoAviso, setSalvandoAviso] = useState(false);
  const [avisoSalvo, setAvisoSalvo] = useState(false);

  useEffect(() => {
    let vivo = true;
    lerPlugin()
      .then((d) => {
        if (!vivo) return;
        setAgora(d);
        semear(d);
        setCarregando(false);
      })
      .catch(() => { if (vivo) { setNaoLeu(true); setCarregando(false); } });
    return () => { vivo = false; };
  }, []);

  function semear(d) {
    setAvisoTxt((d?.manifesto?.novidades || []).join('\n'));
    setAvisoObrig(d?.manifesto?.obrigatoria === true);
  }

  async function salvarAviso() {
    setErro(''); setAvisoSalvo(false); setSalvandoAviso(true);
    try {
      const d = await publicarPluginVersao({
        versao: noAr,
        novidades: avisoTxt.split('\n').map((l) => l.trim()).filter(Boolean),
        obrigatoria: avisoObrig,
      });
      setAgora((a) => ({ ...(a || {}), manifesto: d.manifesto }));
      setAvisoSalvo(true);
    } catch (e) {
      setErro(e.message);
    }
    setSalvandoAviso(false);
  }

  const noAr = agora?.manifesto?.versao || null;
  const podeIr = !!arquivo && /^\d+\.\d+\.\d+$/.test(versao.trim()) && !indo;
  const recuando = noAr && versao.trim() && !maior(versao.trim(), noAr);

  async function publicar() {
    setErro(''); setPronto(false);
    try {
      /* O ARQUIVO PRIMEIRO. Só depois o manifesto, que é o que faz o plugin de
         todo mundo enxergar a versão nova. */
      setIndo('arquivo');
      await subirPluginArquivo(arquivo);
      setIndo('versao');
      const d = await publicarPluginVersao({
        versao: versao.trim(),
        novidades: novidades.split('\n').map((l) => l.trim()).filter(Boolean),
        obrigatoria,
      });
      setAgora((a) => ({ ...(a || {}), manifesto: d.manifesto }));
      setArquivo(null);
      setPronto(true);
      semear({ manifesto: d.manifesto });
      lerPlugin().then((novo) => { setAgora(novo); semear(novo); }).catch(() => {});
    } catch (e) {
      setErro(e.message);
    }
    setIndo('');
  }

  if (carregando) return <div className="adm-com"><p className="adm-com__vazio">{t('comum_carregando')}</p></div>;

  return (
    <div className="adm-pl">
      <input ref={escolher} type="file" accept=".rbz,application/zip" hidden
             onChange={(e) => { setArquivo(e.target.files?.[0] || null); e.target.value = ''; }} />

      {/* O QUE ESTÁ NO AR. Ele vem primeiro porque é a pergunta que se faz ao
          abrir esta tela: o que as pessoas têm hoje. */}
      <div className="adm-pl__agora">
        <span className="adm-pl__ico">{Ico.caixa}</span>
        <span className="adm-pl__txt">
          <p>{t('adm_pl_no_ar')}</p>
          <h3>{noAr ? t('adm_pl_versao') + ' ' + noAr
                : naoLeu ? t('adm_pl_naoleu') : t('adm_pl_nada')}</h3>
          {naoLeu && <span className="adm-pl__meta">{t('adm_pl_naoleu_q')}</span>}
          {agora?.arquivo && (
            <span className="adm-pl__meta">
              {agora.arquivo.nome} · {tamanhoLegivel(agora.arquivo.tamanho)}
              {agora.arquivo.quando && ' · ' + new Date(agora.arquivo.quando)
                .toLocaleDateString(idioma === 'en' ? 'en-US' : idioma === 'es' ? 'es-ES' : 'pt-BR',
                  { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          )}
        </span>
        {agora?.manifesto?.obrigatoria && (
          <span className="apr-tag apr-tag--espera">{t('adm_pl_era_obrig')}</span>
        )}
      </div>

      {/* O que foi anunciado, à vista. Ele existe para a pergunta "o que essa
          versão dizia mesmo?", que é a que se faz olhando de longe. */}
      {(agora?.manifesto?.novidades || []).length > 0 && (
        <ul className="adm-pl__lista">
          {agora.manifesto.novidades.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}

      {/* CORRIGIR O QUE JÁ ESTÁ NO AR, sem tocar no arquivo. Ele fica dobrado
          porque é o caso raro: quase toda visita a esta tela é para publicar
          uma versão, e não para consertar a de ontem. */}
      {noAr && (
        <details className="adm-pl__consertar">
          <summary>{t('adm_pl_consertar')}</summary>
          <p className="adm-pl__dica">{t('adm_pl_consertar_q').replace('{v}', noAr)}</p>

          <label className="adm-au__rot">{t('adm_pl_novidades')}</label>
          <textarea className="adm-au__campo adm-au__campo--alto" rows={5} value={avisoTxt}
                    placeholder={t('adm_pl_novidades_q')}
                    onChange={(e) => { setAvisoTxt(e.target.value); setAvisoSalvo(false); }} />

          <div className="adm-au__liga" style={{ marginTop: 18 }}>
            <span>
              <b>{t('adm_pl_obrig')}</b>
              <em>{t('adm_pl_obrig_q')}</em>
            </span>
            <button className={'adm-au__chave' + (avisoObrig ? ' adm-au__chave--on' : '')}
                    onClick={() => { setAvisoObrig((o) => !o); setAvisoSalvo(false); }} />
          </div>

          {avisoSalvo && <p className="adm-pl__pronto">{Ico.ok}{t('adm_pl_aviso_salvo')}</p>}
          <button className="adm-au__mais" style={{ marginTop: 16 }}
                  disabled={salvandoAviso} onClick={salvarAviso}>
            {salvandoAviso ? t('adm_pl_indo_versao') : t('adm_pl_salvar_aviso')}
          </button>
        </details>
      )}

      <h2 className="conta-h2">{t('adm_pl_nova')}</h2>
      <p className="conta-p">{t('adm_pl_nova_q')}</p>

      <div className="adm-pl__forma">
        <label className="adm-au__rot">{t('adm_pl_arquivo')}</label>
        <button className="adm-au__mais" onClick={() => escolher.current?.click()}>
          {Ico.sobe}{arquivo ? arquivo.name : t('adm_pl_escolher')}
        </button>
        {arquivo && <p className="adm-pl__dica">{tamanhoLegivel(arquivo.size)}</p>}

        <label className="adm-au__rot">{t('adm_pl_versao_rot')}</label>
        <input className="adm-au__campo adm-au__campo--mono adm-pl__versao" value={versao}
               placeholder="2.1.0" onChange={(e) => setVersao(e.target.value)} />
        {/* O plugin só mostra o aviso quando a versão publicada é MAIOR que a
            dele. Publicar um número igual ou menor não avisa ninguém, e é um
            engano silencioso: vale dizer antes. */}
        {recuando && <p className="adm-pl__aviso">{t('adm_pl_menor').replace('{v}', noAr)}</p>}

        <label className="adm-au__rot">{t('adm_pl_novidades')}</label>
        <textarea className="adm-au__campo adm-au__campo--alto" rows={5} value={novidades}
                  placeholder={t('adm_pl_novidades_q')}
                  onChange={(e) => setNovidades(e.target.value)} />

        <div className="adm-au__liga" style={{ marginTop: 18 }}>
          <span>
            <b>{t('adm_pl_obrig')}</b>
            <em>{t('adm_pl_obrig_q')}</em>
          </span>
          <button className={'adm-au__chave' + (obrigatoria ? ' adm-au__chave--on' : '')}
                  onClick={() => setObrigatoria((o) => !o)} />
        </div>

        {erro && <p className="adm-au__erro">{erro}</p>}
        {pronto && <p className="adm-pl__pronto">{Ico.ok}{t('adm_pl_pronto')}</p>}

        <button className="as-btn-cta adm-pl__ir" disabled={!podeIr} onClick={publicar}>
          {indo === 'arquivo' ? t('adm_pl_indo_arquivo')
            : indo === 'versao' ? t('adm_pl_indo_versao')
            : t('adm_pl_publicar')}
        </button>
      </div>
    </div>
  );
}
