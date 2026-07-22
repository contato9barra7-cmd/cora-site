'use client';

// ═══════════════════════════════════════════════════════════
//  PainelRender — a aba Render do /app
//
//  Espelha o plugin: mesmos controles, textos, ordem e grupos.
//    Tipo de ambiente → Materiais → Iluminação Natural →
//    Direção da Luz → Luz Artificial → Entorno → Referências
//  Barra fixa embaixo: quantidade + proporção + resolução + Renderizar.
//
//  Diferenças (dependem do SketchUp, não existem na web):
//    - A imagem vem do picker (upload/histórico), não do viewport
//    - Sem "Auto" na proporção (era o safe frame do viewport)
//    - "Ler materiais" lê da IMAGEM (no plugin, lê a lista do modelo)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import PickerImagem from './PickerImagem';
import IconeCredito from './IconeCredito';
import Seta from './Seta';
import CampoRefs from './CampoRefs';
import { salvarRascunho, lerRascunho, limparRascunho } from '../lib/rascunho';
import { useIdioma, localeDeIdioma } from '../lib/i18n';
import {
  gerarRender, lerMateriais, custoRender, CREDITOS,
  TIPOS, PROPORCOES, LUZ_TIPOS, MOODS, DIRECOES,
  CORES_LUZ, INTENSIDADES, ENTORNOS, RESOLUCOES, MAX_REFS
} from '../lib/render';

export default function PainelRender({ onPronto, onProgresso, ocupado, setOcupado, imagemInicial, leituraInicial, refazer, loteAnterior }) {
  const { t, idioma } = useIdioma();

  // ── Imagem base ──
  const [imagem, setImagem] = useState(null);
  const [previa, setPrevia] = useState(null);

  // Picker: 'base' | 'ref' | null — sabe onde guardar o que for escolhido
  const [picker, setPicker] = useState(null);

  // ── Controles (padrões do plugin) ──
  const [tipo, setTipo]             = useState('interno');
  const [proporcao, setProporcao]   = useState('4:5');
  const [resolucao, setResolucao]   = useState('2k');
  const [quantidade, setQuantidade] = useState(1);

  // Materiais: ler → revisar → confirmar. Sem confirmar, não renderiza.
  const [materiais, setMateriais] = useState('');
  const [matEstado, setMatEstado] = useState('vazio');  // vazio | lendo | revisar | confirmado
  const editandoMat = matEstado === 'revisar';

  const [luzTipo, setLuzTipo]       = useState('Direta');
  const [mood, setMood]             = useState('Dia claro editorial');
  const [detNatural, setDetNatural] = useState('');

  const [direcoes, setDirecoes] = useState([]);
  const [descLuz, setDescLuz]   = useState('');

  const [corLuz, setCorLuz]               = useState('Desligada');
  const [intensidade, setIntensidade]     = useState('Média');
  const [detArtificial, setDetArtificial] = useState('');

  const [tagsEntorno, setTagsEntorno] = useState([]);
  const [entorno, setEntorno]         = useState('');

  const [refs, setRefs]         = useState([]);
  const [refTexto, setRefTexto] = useState('');

  const [popRatio, setPopRatio] = useState(false);
  const [popRes, setPopRes]     = useState(false);

  const [erro, setErro] = useState('');

  // ── Volta como a pessoa deixou ──
  // Fechar a aba não pode custar a leitura de materiais (que custou 15
  // créditos) nem o ajuste fino de luz e entorno.
  const [restaurado, setRestaurado] = useState(false);
  const [avisoImg, setAvisoImg]     = useState(false);
  const [confirmarReset, setConfirmarReset] = useState(false);

  // Quando a imagem veio do histórico, sabemos o id dela: a leitura aponta
  // para a geração, e a thumb sai da URL assinada. Nada é duplicado.
  const [geracaoIdDaImagem, setGeracaoIdDaImagem] = useState(null);

  useEffect(() => {
    const r = lerRascunho('render');
    if (r) {
      if (r.imagem)  setImagem(r.imagem);
      if (r.previa)  setPrevia(r.previa);
      if (r.tipo)    setTipo(r.tipo);
      if (r.proporcao)   setProporcao(r.proporcao);
      if (r.resolucao)   setResolucao(r.resolucao);
      if (r.quantidade)  setQuantidade(r.quantidade);
      if (r.materiais)   setMateriais(r.materiais);
      if (r.matEstado)   setMatEstado(r.matEstado);
      if (r.luzTipo)     setLuzTipo(r.luzTipo);
      if (r.mood)        setMood(r.mood);
      if (r.detNatural)  setDetNatural(r.detNatural);
      if (r.direcoes)    setDirecoes(r.direcoes);
      if (r.descLuz)     setDescLuz(r.descLuz);
      if (r.corLuz)      setCorLuz(r.corLuz);
      if (r.intensidade) setIntensidade(r.intensidade);
      if (r.detArtificial) setDetArtificial(r.detArtificial);
      if (r.tagsEntorno) setTagsEntorno(r.tagsEntorno);
      if (r.entorno)     setEntorno(r.entorno);
      if (r.refTexto)    setRefTexto(r.refTexto);

      // A imagem era grande demais para o localStorage: avisa, sem drama.
      if (r.imagemGrande && r.matEstado === 'confirmado') setAvisoImg(true);
    }
    setRestaurado(true);
  }, []);

  // Guarda a cada mudança (só depois de restaurar, senão apaga o que leu)
  useEffect(() => {
    if (!restaurado) return;
    salvarRascunho('render', {
      imagem, previa, tipo, proporcao, resolucao, quantidade,
      materiais, matEstado, luzTipo, mood, detNatural,
      direcoes, descLuz, corLuz, intensidade, detArtificial,
      tagsEntorno, entorno, refTexto
    });
  }, [restaurado, imagem, previa, tipo, proporcao, resolucao, quantidade,
      materiais, matEstado, luzTipo, mood, detNatural, direcoes, descLuz,
      corLuz, intensidade, detArtificial, tagsEntorno, entorno, refTexto]);

  // Alguém mandou uma imagem de outra aba? Carrega.
  useEffect(() => {
    if (imagemInicial) {
      setImagem(imagemInicial.base64);
      setPrevia(imagemInicial.previa);
      setMateriais('');
      setMatEstado('vazio');
    }
  }, [imagemInicial]);

  // Refazer uma imagem que falhou. Os créditos daquela voltaram (o servidor
  // estorna), então isto é uma geração nova — e cobra normal.
  //
  // Uma imagem só: as outras do lote já saíram.
  useEffect(() => {
    if (!refazer || ocupado) return;
    gerar({ apenasUma: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refazer]);

  // Uma leitura da aba Análises? Carrega o texto E a imagem — sem custo,
  // já foi paga.
  //
  // Fica em 'revisar' (e não 'confirmado') de propósito: a pessoa precisa
  // conferir se a leitura ainda faz sentido antes de gerar.
  useEffect(() => {
    if (!leituraInicial?.materiais) return;

    setMateriais(leituraInicial.materiais);
    setMatEstado('revisar');

    // A imagem vem junto quando a leitura saiu de uma geração.
    if (leituraInicial.base64) {
      setImagem(leituraInicial.base64);
      setPrevia(leituraInicial.previa);
    }

    // E as REFERÊNCIAS de estilo: a análise foi feita cruzando a imagem com
    // elas. Sem as refs, a geração sairia com outro estilo.
    if (leituraInicial.refs?.length) {
      setRefs(leituraInicial.refs.map((b) => ({
        base64: b,
        previa: `data:image/png;base64,${b}`
      })));
    }
  }, [leituraInicial]);

  // Fecha os popovers ao clicar fora
  useEffect(() => {
    if (!popRatio && !popRes) return;
    const fechar = () => { setPopRatio(false); setPopRes(false); };
    window.addEventListener('click', fechar);
    return () => window.removeEventListener('click', fechar);
  }, [popRatio, popRes]);

  function escolheuImagem({ base64, previa: p, geracaoId }) {
    if (picker === 'ref') {
      if (refs.length < MAX_REFS) setRefs((r) => [...r, { base64, previa: p }]);
      return;
    }
    setImagem(base64);
    setPrevia(p);

    // Se veio do histórico, a imagem já está no R2 — a leitura vai apontar
    // para ela, em vez de guardar outra cópia. Se foi upload, fica null e
    // a leitura guarda uma miniatura própria.
    setGeracaoIdDaImagem(geracaoId || null);

    setMateriais('');       // imagem nova: os materiais antigos não valem mais
    setMatEstado('vazio');
    setErro('');
  }

  function toggle(lista, setLista, valor) {
    setLista(lista.includes(valor)
      ? lista.filter((v) => v !== valor)
      : [...lista, valor]);
  }

  async function lerMat() {
    if (!imagem) { setErro(t('painelrender_erro_escolha_modelo')); return; }
    setMatEstado('lendo');
    setErro('');
    try {
      // O servidor guarda a leitura (vale para a web e para o plugin) e gera
      // a miniatura sozinho — ele tem a imagem e o sharp. Daqui só vai o que
      // ele não teria como saber: o título e de qual geração veio a imagem.
      const txt = await lerMateriais(imagem, tipo, {
        titulo:    tituloDaLeitura(),
        geracaoId: geracaoIdDaImagem,
        refs:      refs.map((x) => x.base64)   // o estilo vai junto
      });

      setMateriais(txt);
      setMatEstado('revisar');   // agora a pessoa lê, edita e confirma

    } catch (e) {
      setErro(e.message);
      setMatEstado('vazio');
    }
  }

  // Um nome para a pessoa reconhecer a leitura depois.
  function tituloDaLeitura() {
    const agora = new Date().toLocaleDateString(localeDeIdioma(idioma), {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    return `${tipo === 'externo' ? t('painelrender_externo') : tipo === 'planta' ? t('painelrender_planta') : t('painelrender_interno')} · ${agora}`;
  }


  async function gerar({ apenasUma } = {}) {
    if (!imagem) { setErro(t('painelrender_erro_escolha_seu_modelo')); return; }
    if (matEstado === 'revisar') { setErro(t('painelrender_confirme_materiais')); return; }
    if (ocupado) return;

    setErro('');
    setOcupado(true);
    onProgresso({
      feito: 0,
      total: apenasUma ? 1 : quantidade,
      estado: 'enviado',
      proporcao,
      base: previa
    });

    // O plugin junta o detalhe ao mood, e a intensidade à cor da luz.
    // Repetimos igual: o promptador do GPT espera esse formato.
    const moodFinal = detNatural.trim()
      ? `${mood} (${luzTipo}). Detalhes: ${detNatural.trim()}`
      : `${mood} (${luzTipo})`;

    const luzArtFinal = corLuz === 'Desligada'
      ? 'Desligada'
      : `${corLuz}, intensidade ${intensidade}${detArtificial.trim() ? `. Detalhes: ${detArtificial.trim()}` : ''}`;

    const entornoFinal = [tagsEntorno.join(', '), entorno.trim()]
      .filter(Boolean).join('. ');

    const cfg = {
      imagem, tipo, proporcao, resolucao,

      // Refazendo uma que falhou? Uma imagem só — as outras do lote já saíram.
      quantidade: apenasUma ? 1 : quantidade,
      mood:          moodFinal,
      materiais:     materiais.trim(),
      entorno:       entornoFinal,
      luzArtificial: luzArtFinal,
      direcaoLuz:    direcoes.join(', '),
      descLuz:       descLuz.trim(),
      refTexto:      refTexto.trim(),
      // O label vai explícito: o servidor usa ele para nomear a referência
      // no prompt. (@img01 e @ref01 são a mesma coisa — ver o index.js.)
      referencias: refs.map((r, i) => ({
        base64: r.base64,
        mimeType: 'image/png',
        label: '@img' + String(i + 1).padStart(2, '0')
      }))
    };

    try {
      const r = await gerarRender(cfg, {
        onProgresso: (feito, total, estado, falha) => onProgresso((p) => ({
          ...(p || {}),
          feito, total, estado, proporcao,
          base: previa,          // o print, desfocado no slot

          // A que falhou vira um cartão de erro no lugar do slot. As outras
          // seguem — o servidor já estornou os créditos desta.
          falhas: falha
            ? [...((p && p.falhas) || []), falha]
            : ((p && p.falhas) || [])
        })),
        loteAnterior   // mesma config = continua na mesma linha do feed
      });
      // Some com os slots ANTES de recarregar o feed: senão há um instante
      // em que a imagem nova JÁ apareceu e o "gerando" ainda está lá.
      onProgresso(null);
      setOcupado(false);

      onPronto(r);

      // Deu certo: o rascunho já cumpriu o papel. (O painel continua
      // preenchido na tela — só não precisamos mais guardar em disco.)
      limparRascunho('render');

    } catch (e) {
      setErro(e.message);
      onProgresso(null);
      setOcupado(false);
    }
  }

  // Volta tudo ao padrão. O rascunho vai junto — senão a próxima visita
  // ressuscitaria o que a pessoa acabou de apagar.
  function resetar() {
    setImagem(null);      setPrevia(null);   setGeracaoIdDaImagem(null);
    setTipo('interno');   setProporcao('4:5');   setResolucao('2k');
    setQuantidade(1);
    setMateriais('');     setMatEstado('vazio');
    setLuzTipo('Direta'); setMood('Dia claro editorial'); setDetNatural('');
    setDirecoes([]);      setDescLuz('');
    setCorLuz('Desligada'); setIntensidade('Média'); setDetArtificial('');
    setTagsEntorno([]);   setEntorno('');
    setRefs([]);          setRefTexto('');
    setErro('');          setAvisoImg(false);

    limparRascunho('render');
    setConfirmarReset(false);
  }

  const custo = custoRender(quantidade, resolucao);

  // So renderiza com o material CONFIRMADO.
  //
  // Antes travava so em 'revisar' (leu mas nao confirmou). Quem nunca leu
  // ficava em 'vazio' e passava direto — renderizando sem material nenhum,
  // que e o oposto do que o produto quer.
  const travadoMat = matEstado !== 'confirmado';

  return (
    <>
      <div className="cr-form">

        {/* ── Imagem do modelo ── */}
        <div className="cr-sec">{t('painelrender_imagem_modelo')}</div>
        {previa ? (
          <div className="cr-base">
            <img src={previa} alt="" />
            <button
              className="cr-base-x"
              onClick={() => { setImagem(null); setPrevia(null); setMateriais(''); setMatEstado('vazio'); }}
              data-tip={t('painelrender_remover_imagem')}
              aria-label={t('painelrender_remover_imagem')}
            >×</button>
          </div>
        ) : (
          <button className="cr-drop" onClick={() => setPicker('base')} disabled={ocupado}>
            <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/>
              <path d="M3 14l4-4 3.5 3.5L14 9l3.5 3.5"/>
            </svg>
            <span>{t('painelrender_escolher_imagem')}</span>
          </button>
        )}

        {/* ── Tipo de ambiente ── */}
        <div className="cr-sec">{t('painelrender_tipo_ambiente')}</div>
        <div className="cr-g3">
          {TIPOS.map((tp) => (
            <button
              key={tp.val}
              className={'cr-b' + (tipo === tp.val ? ' cr-b--on' : '')}
              onClick={() => setTipo(tp.val)}
            >{tp.rotulo}</button>
          ))}
        </div>

        {/* ── Materiais ── */}
        {/* As leituras já feitas vivem na aba Análises — não repetimos a
            porta aqui. */}
        <div className="cr-sec">{t('painelrender_materiais')}</div>

        {/* Já leu esta imagem antes, ou tem o texto à mão? Abre o campo sem
            gastar créditos. A aba Análises guarda as leituras antigas. */}
        {matEstado === 'vazio' && (
          <button className="cr-b cr-b--tenho" onClick={() => setMatEstado('revisar')}>
            {t('painelrender_ja_tenho_analise')}
          </button>
        )}

        {matEstado !== 'revisar' && (
          <button
            className="cr-b-ler"
            onClick={lerMat}
            disabled={matEstado === 'lendo' || !imagem || ocupado}
          >
            <span>
              {matEstado === 'lendo' ? t('painelrender_lendo_imagem')
                : matEstado === 'confirmado' ? t('painelrender_ler_materiais_denovo')
                : t('painelrender_ler_materiais')}
            </span>
            {matEstado !== 'lendo' && (
              <span className="cr-custo-tag">
                <IconeCredito /> {CREDITOS.materiais}
              </span>
            )}
          </button>
        )}

        {(matEstado === 'revisar' || matEstado === 'confirmado') && (
          <>
            <textarea
              className="cr-ta cr-ta--mat"
              placeholder={materiais ? t('painelrender_ph_edite_materiais') : t('painelrender_ph_cole_analise')}
              value={materiais}
              onChange={(e) => setMateriais(e.target.value)}
              readOnly={matEstado === 'confirmado'}
              spellCheck={false}
            />

            {matEstado === 'revisar' && (
              <>
                <p className="cr-hint">{t('painelrender_materiais_identificados')}</p>
                <div className="cr-g2 cr-mat-acoes">
                  <button className="cr-b" onClick={() => setMatEstado('confirmado')}>
                    {t('painelrender_editar')}
                  </button>
                  <button className="cr-b-conf" onClick={() => setMatEstado('confirmado')}>
                    {t('painelrender_seguir_assim')}
                  </button>
                </div>
              </>
            )}

            {matEstado === 'confirmado' && (
              <button className="cr-b-editar-mat" onClick={() => setMatEstado('revisar')}>
                {t('painelrender_editar_materiais')}
              </button>
            )}
          </>
        )}

        {/* ── Iluminação Natural ── */}
        <div className="cr-sec">{t('painelrender_iluminacao_natural')}</div>
        <div className="cr-g2">
          {LUZ_TIPOS.map((l) => (
            <button
              key={l.val}
              className={'cr-b' + (luzTipo === l.val ? ' cr-b--on' : '')}
              onClick={() => setLuzTipo(l.val)}
            >{l.rotulo}</button>
          ))}
        </div>

        {MOODS.map((g) => (
          <div key={g.grupo}>
            <div className="cr-grp">{g.grupo}</div>
            <div className="cr-g2">
              {g.itens.map((m) => (
                <button
                  key={m}
                  className={'cr-b' + (mood === m ? ' cr-b--on' : '')}
                  onClick={() => setMood(m)}
                >{m}</button>
              ))}
            </div>
          </div>
        ))}

        <textarea
          className="cr-ta"
          placeholder={t('painelrender_ph_det_natural')}
          value={detNatural}
          onChange={(e) => setDetNatural(e.target.value)}
          spellCheck={false}
        />

        {/* ── Direção da Luz ── */}
        <div className="cr-sec">{t('painelrender_direcao_luz')}</div>
        <div className="cr-g2">
          {DIRECOES.map((d) => (
            <button
              key={d}
              className={'cr-b' + (direcoes.includes(d) ? ' cr-b--on' : '')}
              onClick={() => toggle(direcoes, setDirecoes, d)}
            >{d}</button>
          ))}
        </div>
        <textarea
          className="cr-ta"
          placeholder={t('painelrender_ph_desc_luz')}
          value={descLuz}
          onChange={(e) => setDescLuz(e.target.value)}
          spellCheck={false}
        />
        <p className="cr-hint">{t('painelrender_hint_desc_luz')}</p>

        {/* ── Luz Artificial ── */}
        <div className="cr-sec">{t('painelrender_luz_artificial')}</div>
        <div className="cr-grp">{t('painelrender_cor')}</div>
        <div className="cr-g3">
          {CORES_LUZ.map((c) => (
            <button
              key={c}
              className={'cr-b' + (corLuz === c ? ' cr-b--on' : '')}
              onClick={() => setCorLuz(c)}
            >{c}</button>
          ))}
        </div>

        {corLuz !== 'Desligada' && (
          <>
            <div className="cr-grp">{t('painelrender_intensidade')}</div>
            <div className="cr-g3">
              {INTENSIDADES.map((i) => (
                <button
                  key={i}
                  className={'cr-b' + (intensidade === i ? ' cr-b--on' : '')}
                  onClick={() => setIntensidade(i)}
                >{i}</button>
              ))}
            </div>
            <textarea
              className="cr-ta"
              placeholder={t('painelrender_ph_det_artificial')}
              value={detArtificial}
              onChange={(e) => setDetArtificial(e.target.value)}
              spellCheck={false}
            />
          </>
        )}

        {/* ── Entorno ── */}
        <div className="cr-sec">{t('painelrender_entorno')} <span className="cr-opc">{t('painelrender_opcional')}</span></div>
        <div className="cr-g2">
          {ENTORNOS.map((e) => (
            <button
              key={e}
              className={'cr-b' + (tagsEntorno.includes(e) ? ' cr-b--on' : '')}
              onClick={() => toggle(tagsEntorno, setTagsEntorno, e)}
            >{e}</button>
          ))}
        </div>
        <textarea
          className="cr-ta"
          placeholder={t('painelrender_ph_entorno')}
          value={entorno}
          onChange={(e) => setEntorno(e.target.value)}
          spellCheck={false}
        />
        <p className="cr-hint">
          {t('painelrender_hint_entorno')}
        </p>

        {/* ── Referências (abrem o mesmo picker) ── */}
        <div className="cr-sec">{t('painelrender_referencias')} <span className="cr-opc">{t('painelrender_opcional')}</span></div>
        <div className="cr-refs">
          {refs.map((r, i) => (
            <div key={i} className="cr-ref">
              <img src={r.previa} alt="" />
              <button
                className="cr-ref-x"
                onClick={() => setRefs((rs) => rs.filter((_, j) => j !== i))}
                aria-label={t('painelrender_remover_referencia')}
              >×</button>
              <span className="cr-ref-n">@img{String(i + 1).padStart(2, '0')}</span>
            </div>
          ))}
          {refs.length < MAX_REFS && (
            <button className="cr-ref cr-ref--add" onClick={() => setPicker('ref')}>
              <span className="cr-ref-mais">+</span>
              <span className="cr-ref-c">{refs.length}/{MAX_REFS}</span>
            </button>
          )}
        </div>
        {/* Digitar @ abre a lista das referências, para clicar */}
        <CampoRefs
          className="cr-ta"
          placeholder={refs.length > 0
            ? t('painelrender_ph_digite_arroba')
            : t('painelrender_ph_adicione_ref')}
          valor={refTexto}
          onMudar={setRefTexto}
          refs={refs}
        />

        {/* Confere se as @img que a pessoa escreveu existem mesmo */}
        {(() => {
          const citadas = [...refTexto.matchAll(/@img(\d{1,2})/gi)]
            .map((m) => parseInt(m[1], 10));
          const orfas = [...new Set(citadas)].filter((n) => n < 1 || n > refs.length);

          if (orfas.length > 0) {
            return (
              <p className="cr-hint cr-hint--erro">
                {orfas.map((n) => '@img' + String(n).padStart(2, '0')).join(', ')}
                {orfas.length === 1 ? t('painelrender_nao_existe') : t('painelrender_nao_existem')}{t('painelrender_voce_tem')}{refs.length}
                {refs.length === 1 ? t('painelrender_referencia_sing') : t('painelrender_referencia_plur')}.
              </p>
            );
          }
          if (citadas.length > 0) {
            return (
              <p className="cr-hint cr-hint--ok">
                {[...new Set(citadas)].length}
                {[...new Set(citadas)].length === 1 ? t('painelrender_ref_citada') : t('painelrender_ref_citadas')}.
              </p>
            );
          }
          return <p className="cr-hint">{t('painelrender_hint_usar_arroba')}</p>;
        })()}

        {/* Recomeçar do zero. Pede confirmação: os materiais lidos custaram
            créditos, e apagá-los sem querer é perder dinheiro. */}
        <button
          className="cr-resetar"
          onClick={() => setConfirmarReset(true)}
          disabled={ocupado}
        >
          {t('painelrender_resetar_config')}
        </button>

        {confirmarReset && (
          <div className="cr-overlay cr-overlay--alto" onClick={() => setConfirmarReset(false)}>
            <div className="cf" onClick={(e) => e.stopPropagation()}>
              <h3>{t('painelrender_resetar_tudo')}</h3>
              <p>
                {t('painelrender_reset_aviso1')} {CREDITOS.materiais} {t('painelrender_reset_aviso2')}
              </p>
              <div className="cf-acoes">
                <button className="cf-nao" onClick={() => setConfirmarReset(false)}>{t('comum_cancelar')}</button>
                <button className="cf-sim" onClick={resetar}>{t('painelrender_resetar')}</button>
              </div>
            </div>
          </div>
        )}


        {avisoImg && (
          <div className="cr-aviso">
            {t('painelrender_aviso_img_grande')}
            <button onClick={() => setAvisoImg(false)}>{t('painelrender_entendi')}</button>
          </div>
        )}

        {erro && <div className="cr-erro">{erro}</div>}
      </div>

      {/* ── Barra fixa (= .render-bar do plugin) ── */}
      <div className="cr-barra-ger">
        <div className="cr-pills-cfg">

          <div className="cr-qty">
            <button onClick={() => setQuantidade((q) => Math.max(1, q - 1))} aria-label={t('painelrender_menos_uma')}>−</button>
            <span>{quantidade}</span>
            <button onClick={() => setQuantidade((q) => Math.min(10, q + 1))} aria-label={t('painelrender_mais_uma')}>+</button>
          </div>

          {/* Pill: proporção */}
          <div className="cr-pill-wrap">
            <button
              className={'cr-pill-cfg' + (popRatio ? ' cr-pill-cfg--on' : '')}
              onClick={(e) => { e.stopPropagation(); setPopRes(false); setPopRatio((v) => !v); }}
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                <rect x="1" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="6" y="2" width="9" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>{proporcao === 'auto' ? t('painelrender_auto') : proporcao}</span>
              <Seta aberto={popRatio} />
            </button>

            {popRatio && (
              <div className="cr-pop" onClick={(e) => e.stopPropagation()}>
                <div className="cr-pop-grade">
                  {PROPORCOES.map((p) => (
                    <button
                      key={p.val}
                      className={'cr-pop-b' + (proporcao === p.val ? ' cr-pop-b--on' : '')}
                      onClick={() => { setProporcao(p.val); setPopRatio(false); }}
                    >
                      <svg viewBox="0 0 28 28" fill="none">
                        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="1"
                              stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      <span>{p.val === 'auto' ? t('painelrender_auto') : p.val}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pill: resolução */}
          <div className="cr-pill-wrap">
            <button
              className={'cr-pill-cfg' + (popRes ? ' cr-pill-cfg--on' : '')}
              onClick={(e) => { e.stopPropagation(); setPopRatio(false); setPopRes((v) => !v); }}
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="16" height="10" rx="1.5"/><path d="M7 17h6"/>
              </svg>
              <span>{RESOLUCOES.find((r) => r.val === resolucao)?.rotulo}</span>
              <Seta aberto={popRes} />
            </button>

            {popRes && (
              <div className="cr-pop cr-pop--res" onClick={(e) => e.stopPropagation()}>
                {RESOLUCOES.map((r) => (
                  <button
                    key={r.val}
                    className={'cr-pop-res' + (resolucao === r.val ? ' cr-pop-res--on' : '')}
                    onClick={() => { setResolucao(r.val); setPopRes(false); }}
                  >{r.rotulo}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="cr-btn-gerar"
          onClick={gerar}
          disabled={ocupado || !imagem || travadoMat}
        >
          <span>{ocupado ? t('painelrender_renderizando') : t('painelrender_renderizar')}</span>
          {!ocupado && !travadoMat && imagem && (
            <span className="cr-custo-tag">
              <IconeCredito /> {custo}
            </span>
          )}
        </button>

        {/* O custo nao se repete aqui: ja aparece na tag do hover.
            So o aviso fica — a pessoa precisa saber por que o botao esta
            apagado. */}
        {travadoMat && (
          <p className="cr-custo">
            {matEstado === 'revisar'
              ? t('painelrender_confirme_materiais')
              : t('painelrender_leia_materiais')}
          </p>
        )}
      </div>

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheuImagem}
        titulo={picker === 'ref' ? t('painelrender_adicionar_referencia') : t('painelrender_imagem_modelo')}
      />
    </>
  );
}
