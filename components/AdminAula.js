'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN · A TELA DE UMA AULA
//
//  A linha da lista existe para bater o olho na fila inteira. Aqui é onde se
//  monta a aula: o vídeo, o texto que fica embaixo dele, o material de apoio e
//  a assinatura.
//
//  Tudo salva sozinho ao sair do campo, como no resto do admin. Não há botão de
//  salvar de propósito: um botão que precisa ser lembrado é um jeito de perder
//  trabalho, e aqui se mexe em dez coisas por aula.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { urlDoVideo } from '../lib/aulas';
import { useIdioma, tOpt } from '../lib/i18n';

const LARGURA_ASSINA = 1200;      // a assinatura é uma faixa larga e baixa
const MAX_ARQUIVO = 8 * 1024 * 1024;

const Ico = {
  esq: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 6L9 12l5.5 6" /></svg>),
  olho: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>),
  elo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" /><path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" /></svg>),
  imagem: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3" /><circle cx="8.5" cy="10" r="1.6" /><path d="M4 17l4.5-4.5 3.5 3.5 3-2.5L20 18" /></svg>),
  troca: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h11a4.5 4.5 0 0 1 0 9h-3" /><path d="M7.5 5.5L4 9l3.5 3.5" /></svg>),
  mais: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5.5v13M5.5 12h13" /></svg>),
  x: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>),
};

/* Um campo que salva quando muda de verdade e sai do foco. Salvar a cada tecla
   mandaria um POST por letra. */
function Campo({ valor, onSalvar, placeholder, mono, alto }) {
  const [txt, setTxt] = useState(valor ?? '');
  useEffect(() => { setTxt(valor ?? ''); }, [valor]);
  const mudou = (txt || '') !== (valor ?? '');
  function sair() { if (mudou) onSalvar(txt.trim()); }
  const Tag = alto ? 'textarea' : 'input';
  return (
    <Tag
      className={'adm-au__campo' + (mono ? ' adm-au__campo--mono' : '') + (alto ? ' adm-au__campo--alto' : '')}
      value={txt}
      placeholder={placeholder}
      rows={alto ? 3 : undefined}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={sair}
      onKeyDown={(e) => { if (!alto && e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
}

/* ── O TEXTO DA AULA ──
   `contentEditable` com `execCommand`, e não um editor de blocos. Ele é o que
   o navegador já sabe fazer: negrito, itálico, sublinhado, link e lista saem de
   graça, e a imagem entra como um <img> no meio do texto.

   A imagem vai embutida como data URL, do mesmo jeito que as capas. Ela é
   redesenhada num canvas antes, então o print de 4 MB que foi arrastado para
   dentro não é o que fica guardado. */
function Texto({ valor, onSalvar, t }) {
  const caixa = useRef(null);
  const arquivo = useRef(null);

  useEffect(() => {
    if (caixa.current && caixa.current.innerHTML !== (valor || '')) {
      caixa.current.innerHTML = valor || '';
    }
  }, [valor]);

  function mandar(cmd, arg) {
    caixa.current?.focus();
    document.execCommand(cmd, false, arg);
    salvar();
  }
  function salvar() {
    const html = caixa.current?.innerHTML || '';
    if (html !== (valor || '')) onSalvar(html);
  }
  function link() {
    const url = window.prompt(t('adm_au_link_pede'));
    if (url) mandar('createLink', url);
  }

  function porImagem(f) {
    if (!f || f.size > MAX_ARQUIVO) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const larg = Math.min(img.width, 1400);
        const alt = Math.round((img.height / img.width) * larg);
        const c = document.createElement('canvas');
        c.width = larg; c.height = alt;
        c.getContext('2d').drawImage(img, 0, 0, larg, alt);
        mandar('insertImage', c.toDataURL('image/webp', 0.85));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(f);
  }

  const bts = [
    ['bold', <b key="b">B</b>, t('adm_au_negrito')],
    ['italic', <i key="i">I</i>, t('adm_au_italico')],
    ['underline', <u key="u">S</u>, t('adm_au_sublinhado')],
  ];

  return (
    <div className="adm-au__texto">
      <div className="adm-au__barra">
        {bts.map(([cmd, dentro, dica]) => (
          <button key={cmd} data-dica={dica} onMouseDown={(e) => e.preventDefault()}
                  onClick={() => mandar(cmd)}>{dentro}</button>
        ))}
        <hr />
        <button data-dica={t('adm_au_link')} onMouseDown={(e) => e.preventDefault()}
                onClick={link}>{Ico.elo}</button>
        <button data-dica={t('adm_au_imagem')} onMouseDown={(e) => e.preventDefault()}
                onClick={() => arquivo.current?.click()}>{Ico.imagem}</button>
        <hr />
        <button data-dica={t('adm_au_lista')} onMouseDown={(e) => e.preventDefault()}
                onClick={() => mandar('insertUnorderedList')}>&bull;</button>
        <button data-dica={t('adm_au_lista_n')} onMouseDown={(e) => e.preventDefault()}
                onClick={() => mandar('insertOrderedList')}>1.</button>
      </div>
      <div
        ref={caixa}
        className="adm-au__campo adm-au__campo--rico"
        contentEditable
        suppressContentEditableWarning
        data-vazio={t('adm_au_texto_vazio')}
        onBlur={salvar}
        /* Colar SEM formatação: o texto que vem do Word carrega fonte, cor e
           tamanho de lá, e a aula passa a ter a cara do editor da pessoa. */
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        onDrop={(e) => {
          const f = e.dataTransfer?.files?.[0];
          if (f && /^image\//.test(f.type)) { e.preventDefault(); porImagem(f); }
        }}
      />
      <input ref={arquivo} type="file" accept="image/*" hidden
             onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; porImagem(f); }} />
    </div>
  );
}

/* ── O MATERIAL DE APOIO ──
   Cada item é um nome e um link, e por enquanto só link: arquivo de verdade
   precisa do R2, porque um .skp de 40 MB não cabe onde as capas cabem. Quando
   ele entrar, é mais um botão nesta mesma lista. */
function Materiais({ lista, onSalvar, t }) {
  function trocar(i, campo, v) {
    const nova = lista.map((m, j) => (j === i ? { ...m, [campo]: v } : m));
    onSalvar(nova);
  }
  return (
    <div className="adm-au__mat">
      {lista.map((m, i) => (
        <div className="adm-au__mat-item" key={i}>
          <span className="adm-au__mat-ico">{Ico.elo}</span>
          <span className="adm-au__mat-txt">
            <Campo valor={m.nome} placeholder={t('adm_au_mat_nome')}
                   onSalvar={(v) => trocar(i, 'nome', v)} />
            <Campo mono valor={m.link} placeholder={t('adm_au_mat_link')}
                   onSalvar={(v) => trocar(i, 'link', v)} />
          </span>
          <button className="apr-bt apr-bt--so" title={t('adm_au_mat_tira')}
                  onClick={() => onSalvar(lista.filter((_, j) => j !== i))}>{Ico.x}</button>
        </div>
      ))}
      <button className="apr-bt apr-bt--txt"
              onClick={() => onSalvar([...lista, { nome: '', link: '' }])}>
        {Ico.mais}{t('adm_au_mat_novo')}
      </button>
    </div>
  );
}

export default function AdminAula({ aula, modulo, numero, aoVoltar, gravar, Estado }) {
  const { t } = useIdioma();
  const arquivo = useRef(null);
  const temVideo = !!urlDoVideo(aula.panda);

  /* `assina`: vazio é a faixa de fábrica, 'nao' é sem assinatura, e uma data
     URL é a imagem daquela aula. */
  const semAssina = aula.assina === 'nao';
  const imagemAssina = aula.assina && aula.assina !== 'nao' ? aula.assina : '/img/aulas/assinatura.webp';

  function escolherAssina(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || f.size > MAX_ARQUIVO) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const larg = Math.min(img.width, LARGURA_ASSINA);
        const alt = Math.round((img.height / img.width) * larg);
        const c = document.createElement('canvas');
        c.width = larg; c.height = alt;
        c.getContext('2d').drawImage(img, 0, 0, larg, alt);
        gravar(aula.id, 'assina', c.toDataURL('image/webp', 0.88));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(f);
  }

  return (
    <div className="adm-au">
      <input ref={arquivo} type="file" accept="image/*" hidden onChange={escolherAssina} />

      <div className="adm-au__cab">
        <button className="apr-volta" onClick={aoVoltar}>{Ico.esq}{t('adm_au_voltar')}</button>
        <span className="adm-au__tit">
          <p>{t('apr_modulo')} {modulo.numero || modulo.id} · {t('adm_au_aula')} {numero}</p>
          <h2>{tOpt(aula.titulo) || t('adm_cat_nome')}</h2>
        </span>
        <Estado valor={aula.estado} t={t} onTrocar={(e) => gravar(aula.id, 'estado', e)} />
      </div>

      <div className="adm-au__corpo">
        <div className="adm-au__main">
          <label className="adm-au__rot">{t('adm_cat_nome')}</label>
          <Campo valor={aula.titulo} placeholder={t('adm_cat_nome')}
                 onSalvar={(v) => gravar(aula.id, 'titulo', v)} />

          <label className="adm-au__rot">{t('adm_au_video')}</label>
          <Campo
            mono
            valor={aula.pandaDoBanco ? aula.panda : ''}
            /* Quando o link vem do ARQUIVO ele aparece apagado no lugar do
               convite: texto apagado veio do código, texto escrito veio daqui. */
            placeholder={aula.panda && !aula.pandaDoBanco ? aula.panda : t('adm_cat_cole')}
            onSalvar={(v) => gravar(aula.id, 'panda', v)}
          />
          {!temVideo && <p className="adm-au__nota">{t('adm_au_sem_video_nota')}</p>}

          <label className="adm-au__rot">{t('adm_au_texto')}</label>
          <Texto valor={aula.texto} t={t} onSalvar={(v) => gravar(aula.id, 'texto', v)} />

          <label className="adm-au__rot">{t('adm_au_material')}</label>
          <Materiais
            lista={aula.materiais || []}
            t={t}
            onSalvar={(l) => gravar(aula.id, 'materiais', JSON.stringify(l))}
          />
        </div>

        <div className="adm-au__lado">
          <div className="adm-au__liga">
            <span>
              <b>{t('adm_au_assina')}</b>
              <em>{t('adm_au_assina_q')}</em>
            </span>
            <button className={'adm-au__chave' + (semAssina ? '' : ' adm-au__chave--on')}
                    onClick={() => gravar(aula.id, 'assina', semAssina ? '' : 'nao')} />
          </div>
          {!semAssina && (
            <>
              <img className="adm-au__assina" src={imagemAssina} alt="" />
              <button className="apr-bt apr-bt--txt" onClick={() => arquivo.current?.click()}>
                {Ico.troca}{t('adm_au_assina_troca')}
              </button>
              {aula.assina && aula.assina !== 'nao' && (
                <button className="apr-bt apr-bt--txt" onClick={() => gravar(aula.id, 'assina', '')}>
                  {t('adm_au_assina_volta')}
                </button>
              )}
            </>
          )}

          <label className="adm-au__rot">{t('adm_au_resumo')}</label>
          <Campo alto valor={aula.resumo} placeholder={t('adm_au_resumo_vazio')}
                 onSalvar={(v) => gravar(aula.id, 'resumo', v)} />
        </div>
      </div>
    </div>
  );
}
