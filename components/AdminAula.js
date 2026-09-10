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

import { useCallback, useEffect, useRef, useState } from 'react';
import { urlDoVideo, subirMaterial, urlDoMaterial } from '../lib/aulas';
import { useIdioma, tOpt } from '../lib/i18n';

const LARGURA_ASSINA = 1200;      // a assinatura é uma faixa larga e baixa
const MAX_ARQUIVO = 8 * 1024 * 1024;    // imagem, que ainda passa por um canvas
const TETO_MATERIAL = 100 * 1024 * 1024; // material de apoio, que vai inteiro

function tamanhoLegivel(n) {
  if (!n) return '';
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
  return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}

const Ico = {
  esq: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 6L9 12l5.5 6" /></svg>),
  olho: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>),
  elo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" /><path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" /></svg>),
  imagem: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3" /><circle cx="8.5" cy="10" r="1.6" /><path d="M4 17l4.5-4.5 3.5 3.5 3-2.5L20 18" /></svg>),
  troca: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h11a4.5 4.5 0 0 1 0 9h-3" /><path d="M7.5 5.5L4 9l3.5 3.5" /></svg>),
  arquivo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 3.5H7A2 2 0 0 0 5 5.5v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" /><path d="M13.5 3.5V9H19" /></svg>),
  sobe: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4.5" /><path d="M7.5 9L12 4.5 16.5 9" /><path d="M4.5 16v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>),
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
  /* A imagem escolhida, e a caixa das alças por cima dela. A largura é gravada
     em PORCENTAGEM e não em pixel: a mesma imagem é vista numa coluna de 760 no
     admin e de 900 na aula, e um número em pixel sairia de tamanho diferente
     nas duas. */
  const [escolhida, setEscolhida] = useState(null);
  const [moldura, setMoldura] = useState(null);

  const medir = useCallback(() => {
    const img = escolhida;
    const pai = caixa.current;
    if (!img || !pai || !pai.contains(img)) { setMoldura(null); return; }
    const a = img.getBoundingClientRect();
    const b = pai.getBoundingClientRect();
    setMoldura({ x: a.left - b.left, y: a.top - b.top + pai.scrollTop, w: a.width, h: a.height });
  }, [escolhida]);

  useEffect(() => { medir(); }, [medir, valor]);
  useEffect(() => {
    if (!escolhida) return undefined;
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [escolhida, medir]);

  /* Arrastar uma alça. O canto que se puxa decide o sinal: pela esquerda, ir
     para a esquerda aumenta. */
  function arrastar(ev, canto) {
    ev.preventDefault();
    ev.stopPropagation();
    const img = escolhida;
    const pai = caixa.current;
    if (!img || !pai) return;
    const x0 = ev.clientX;
    const larg0 = img.getBoundingClientRect().width;
    const dentro = pai.clientWidth - 2;   // o quanto a coluna dá, sem a borda
    const sinal = canto === 'esq' ? -1 : 1;

    function mover(e) {
      const nova = Math.max(60, Math.min(dentro, larg0 + (e.clientX - x0) * sinal));
      img.style.width = (nova / dentro * 100).toFixed(1) + '%';
      img.style.height = 'auto';
      medir();
    }
    function soltar() {
      document.removeEventListener('pointermove', mover);
      document.removeEventListener('pointerup', soltar);
      salvar();
    }
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
  }

  function largura(pct) {
    if (!escolhida) return;
    escolhida.style.width = pct + '%';
    escolhida.style.height = 'auto';
    medir();
    salvar();
  }

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
      <div className="adm-au__palco">
      <div
        ref={caixa}
        className="adm-au__campo adm-au__campo--rico"
        contentEditable
        suppressContentEditableWarning
        data-vazio={t('adm_au_texto_vazio')}
        onScroll={medir}
        /* Clicar numa imagem escolhe ela. Clicar em qualquer outro lugar
           desfaz a escolha, senão as alças ficariam boiando sobre o texto. */
        onMouseUp={(e) => setEscolhida(e.target.tagName === 'IMG' ? e.target : null)}
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
      {moldura && (
        <div className="adm-au__alcas" style={{ left: moldura.x, top: moldura.y, width: moldura.w, height: moldura.h }}>
          <span className="adm-au__alca adm-au__alca--ce" onPointerDown={(e) => arrastar(e, 'esq')} />
          <span className="adm-au__alca adm-au__alca--cd" onPointerDown={(e) => arrastar(e, 'dir')} />
          <span className="adm-au__alca adm-au__alca--be" onPointerDown={(e) => arrastar(e, 'esq')} />
          <span className="adm-au__alca adm-au__alca--bd" onPointerDown={(e) => arrastar(e, 'dir')} />
          <span className="adm-au__medidas" onPointerDown={(e) => e.preventDefault()}>
            <button onClick={() => largura(33)}>33%</button>
            <button onClick={() => largura(50)}>50%</button>
            <button onClick={() => largura(100)}>{t('adm_au_img_toda')}</button>
          </span>
        </div>
      )}
      </div>
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
  /* A LISTA MORA AQUI enquanto se digita. O servidor joga fora item sem nome e
     sem link, e com razão: linha vazia gravada é lixo. Só que era isso que
     fazia o "Adicionar material" não fazer nada, porque a linha nasce vazia,
     ia para o servidor, voltava sem ela e sumia antes de aparecer. Agora ela
     aparece na hora e só vai para o banco quando tem o que guardar. */
  const [locais, setLocais] = useState(lista);
  useEffect(() => {
    /* Só aceita de volta o que veio do banco quando ele diz algo diferente do
       que está na tela sem contar as linhas vazias. */
    const cheias = locais.filter((m) => m.nome || m.link);
    if (JSON.stringify(cheias) !== JSON.stringify(lista)) setLocais(lista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  const escolher = useRef(null);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState('');

  function aplicar(nova) {
    setLocais(nova);
    onSalvar(nova.filter((m) => m.nome || m.link || m.chave));
  }
  function trocar(i, campo, v) {
    aplicar(locais.map((m, j) => (j === i ? { ...m, [campo]: v } : m)));
  }

  /* O arquivo vai inteiro para o R2, e o que fica guardado aqui é a chave dele.
     Qualquer formato serve, porque quem estuda só baixa: imagem, PDF, zip,
     .rbz, .skp. */
  async function enviar(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > TETO_MATERIAL) { setErro(t('adm_au_mat_grande')); return; }
    setErro(''); setSubindo(true);
    try {
      const d = await subirMaterial(f);
      aplicar([...locais, { nome: f.name, chave: d.chave, tamanho: d.tamanho, link: '' }]);
    } catch (err) {
      setErro(err.message);
    }
    setSubindo(false);
  }

  return (
    <div className="adm-au__mat">
      <input ref={escolher} type="file" hidden onChange={enviar} />
      {locais.map((m, i) => (
        m.chave ? (
          /* O que subiu não se edita: ele é um arquivo, e o que se pode fazer
             com ele é tirar. Trocar é subir outro. */
          <div className="adm-au__mat-item" key={i}>
            <span className="adm-au__mat-ico">{Ico.arquivo}</span>
            <span className="adm-au__mat-txt">
              <a className="adm-au__mat-nome" href={urlDoMaterial(m.chave, m.nome)}>{m.nome}</a>
              <span className="adm-au__mat-peso">{tamanhoLegivel(m.tamanho)}</span>
            </span>
            <button className="apr-bt apr-bt--so" data-dica={t('adm_au_mat_tira')}
                    onClick={() => aplicar(locais.filter((_, j) => j !== i))}>{Ico.x}</button>
          </div>
        ) : (
        <div className="adm-au__mat-item" key={i}>
          <span className="adm-au__mat-ico">{Ico.elo}</span>
          <span className="adm-au__mat-txt">
            <Campo valor={m.nome} placeholder={t('adm_au_mat_nome')}
                   onSalvar={(v) => trocar(i, 'nome', v)} />
            <Campo mono valor={m.link} placeholder={t('adm_au_mat_link')}
                   onSalvar={(v) => trocar(i, 'link', v)} />
          </span>
          <button className="apr-bt apr-bt--so" data-dica={t('adm_au_mat_tira')}
                  onClick={() => aplicar(locais.filter((_, j) => j !== i))}>{Ico.x}</button>
        </div>
        )
      ))}
      {erro && <p className="adm-au__erro">{erro}</p>}
      <span className="adm-au__mat-bts">
        <button className="adm-au__mais" disabled={subindo}
                onClick={() => escolher.current?.click()}>
          {Ico.sobe}{subindo ? t('adm_au_mat_subindo') : t('adm_au_mat_arquivo')}
        </button>
        <button className="adm-au__mais"
                onClick={() => setLocais([...locais, { nome: '', link: '' }])}>
          {Ico.elo}{t('adm_au_mat_novo')}
        </button>
      </span>
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
