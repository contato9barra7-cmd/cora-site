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

import { useState, useEffect, useRef } from 'react';
import PickerImagem from './PickerImagem';
import IconeCredito from './IconeCredito';
import Seta from './Seta';
import CampoRefs from './CampoRefs';
import { salvarRascunho, lerRascunho, limparRascunho } from '../lib/rascunho';
import { useIdioma, localeDeIdioma, tOpt } from '../lib/i18n';
import {
  Linha, Amostra, Lista, ItemLista, Sulco, resumir,
  CEU, QUALIDADE, PLANTA, KELVIN
} from './CoraFicha';
import PickerCor, { COR_OUTRA_INICIAL, notaPt } from './PickerCor';
import {
  gerarRender, lerMateriais, custoRender, CREDITOS,
  TIPOS, PROPORCOES, LUZ_TIPOS, MOODS, DIRECOES, ATMOSFERAS,
  CORES_LUZ, INTENSIDADES, ENTORNOS, RESOLUCOES, MAX_REFS
} from '../lib/render';

export default function PainelRender({ onPronto, onProgresso, ocupado, setOcupado, imagemInicial, leituraInicial, refazer, loteAnterior, enfileirar, naFila }) {
  const { t, idioma } = useIdioma();

  // ── Imagem base ──
  const [imagem, setImagem] = useState(null);
  const [previa, setPrevia] = useState(null);

  // ── A ficha ──
  // Uma linha aberta por vez, de propósito: é o que mantém o painel curto.
  // `familiaHora` é qual das quatro famílias de mood está à mostra dentro da
  // linha da Hora do dia, e ela nasce na família do mood que está valendo.
  const [linhaAberta, setLinhaAberta] = useState(null);
  const [familiaHora, setFamiliaHora] = useState(MOODS[0].grupo);
  const abre = (nome) => () => setLinhaAberta((a) => (a === nome ? null : nome));

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
  const matRef = useRef(null);   // o textarea dos materiais, para o "Editar" focar

  const [luzTipo, setLuzTipo]       = useState('Direta');
  const [mood, setMood]             = useState('Dia claro editorial');
  const [detNatural, setDetNatural] = useState('');

  const [direcoes, setDirecoes] = useState([]);
  const [atmosfera, setAtmosfera] = useState([]);        // multi-seleção
  const [atmosferaOutra, setAtmosferaOutra] = useState('');
  const [descLuz, setDescLuz]   = useState('');

  const [corLuz, setCorLuz]               = useState('Desligada');
  // A cor do "Outro": temperatura em Kelvin ou cor livre. Só vale quando
  // `corLuz` é 'Outro', mas fica guardada mesmo quando a pessoa troca para
  // 2700K e volta, para não perder o tom que ela já tinha achado.
  const [corOutra, setCorOutra]           = useState(COR_OUTRA_INICIAL);
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
      // A prévia salva pode ser um blob: URL — e blob URLs MORREM ao recarregar
      // a página (ficava uma imagem quebrada e sem como re-subir). Só reusa a
      // prévia se for durável (data:/http:); senão reconstrói do base64 salvo.
      if (r.previa && !/^blob:/.test(r.previa)) setPrevia(r.previa);
      else if (r.imagem) setPrevia('data:image/png;base64,' + r.imagem);
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
      if (r.atmosfera)   setAtmosfera(r.atmosfera);
      if (r.atmosferaOutra) setAtmosferaOutra(r.atmosferaOutra);
      if (r.descLuz)     setDescLuz(r.descLuz);
      if (r.corLuz)      setCorLuz(r.corLuz);
      if (r.corOutra)    setCorOutra(r.corOutra);
      if (r.intensidade) setIntensidade(r.intensidade);
      if (r.detArtificial) setDetArtificial(r.detArtificial);
      if (r.tagsEntorno) setTagsEntorno(r.tagsEntorno);
      if (r.entorno)     setEntorno(r.entorno);
      if (r.refTexto)    setRefTexto(r.refTexto);
      // Referências: voltam pelo base64 salvo; a prévia é reconstruída (as
      // prévias originais eram blob: URLs, que não sobrevivem ao reload).
      if (Array.isArray(r.refs) && r.refs.length) {
        setRefs(r.refs.filter((x) => x && x.base64).map((x) => ({
          base64: x.base64,
          previa: 'data:image/png;base64,' + x.base64
        })));
      }

      // A imagem era grande demais para o localStorage: avisa, sem drama.
      if (r.imagemGrande && r.matEstado === 'confirmado') setAvisoImg(true);
    }
    setRestaurado(true);
  }, []);

  // Guarda a cada mudança (só depois de restaurar, senão apaga o que leu).
  // Debounce de 500ms: sem ele, cada tecla no campo de materiais serializava a
  // imagem base em base64 pro localStorage — e travava a digitação.
  useEffect(() => {
    if (!restaurado) return;
    const id = setTimeout(() => salvarRascunho('render', {
      imagem, previa, tipo, proporcao, resolucao, quantidade,
      materiais, matEstado, luzTipo, mood, detNatural,
      direcoes, descLuz, corLuz, corOutra, intensidade, detArtificial,
      tagsEntorno, entorno, refTexto, atmosfera, atmosferaOutra,
      refs: refs.map((r) => ({ base64: r.base64 }))   // só o base64 (a prévia é reconstruída)
    }), 500);
    return () => clearTimeout(id);
  }, [restaurado, imagem, previa, tipo, proporcao, resolucao, quantidade,
      materiais, matEstado, luzTipo, mood, detNatural, direcoes, descLuz,
      corLuz, corOutra, intensidade, detArtificial, tagsEntorno, entorno, refTexto, atmosfera, atmosferaOutra, refs]);

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
    // Sem o guard de `ocupado`: a falha acontece DURANTE a geração (as outras
    // imagens ainda saindo), então antes o "Tentar de novo" não fazia nada.
    // Agora a nova tentativa entra na FILA e roda em seguida.
    if (!refazer) return;
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

  // Seleção MÚLTIPLA de referências (upload de vários arquivos ou várias do
  // histórico de uma vez). Respeita o teto MAX_REFS.
  function escolheuVarias(lista) {
    setRefs((r) => {
      const espaco = MAX_REFS - r.length;
      const novas = lista.slice(0, Math.max(0, espaco)).map((b) => ({
        base64: b,
        previa: `data:image/png;base64,${b}`
      }));
      return [...r, ...novas];
    });
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
    // Guarda o tipo em PT canônico; a tela das Análises traduz no display (tOpt).
    const tipoLabel = tipo === 'externo' ? 'Externo' : tipo === 'planta' ? 'Planta' : 'Interno';
    return `${tipoLabel} · ${agora}`;
  }


  function gerar({ apenasUma } = {}) {
    if (!imagem) { setErro(t('painelrender_erro_escolha_seu_modelo')); return; }
    if (matEstado === 'revisar') { setErro(t('painelrender_confirme_materiais')); return; }

    setErro('');

    // A tarefa roda DEPOIS (na fila), então congelamos os valores do clique —
    // se a pessoa mexer no form ou disparar outra, esta continua com o que pediu.
    const previaSnap    = previa;
    const proporcaoSnap = proporcao;
    const totalSnap     = apenasUma ? 1 : quantidade;
    const loteAntSnap   = loteAnterior;

    // O plugin junta o detalhe ao mood, e a intensidade à cor da luz.
    // Repetimos igual: o promptador do GPT espera esse formato.
    const moodFinal = detNatural.trim()
      ? `${mood} (${luzTipo}). Detalhes: ${detNatural.trim()}`
      : `${mood} (${luzTipo})`;

    // "Outro" não é cor nenhuma para o promptador: vai a temperatura com a
    // nota ("4200K, branco neutro") ou a cor livre com o hex.
    const corFinal = corLuz !== 'Outro' ? corLuz
      : corOutra.modo === 'colorida' ? `luz colorida ${corOutra.hex}`
      : `${corOutra.rotulo}, ${notaPt(corOutra.notaChave)}`;
    const luzArtFinal = corLuz === 'Desligada'
      ? 'Desligada'
      : `${corFinal}, intensidade ${intensidade}${detArtificial.trim() ? `. Detalhes: ${detArtificial.trim()}` : ''}`;

    const entornoFinal = [tagsEntorno.join(', '), entorno.trim()]
      .filter(Boolean).join('. ');

    // Atmosfera / clima: entra junto da luz natural (o servidor lê `descLuz`).
    const atmSel = atmosfera.slice();
    if (atmosferaOutra.trim()) atmSel.push(atmosferaOutra.trim());
    const atmTexto = atmSel.length ? `Atmosfera/clima: ${atmSel.join(', ')}.` : '';
    const descLuzFinal = [descLuz.trim(), atmTexto].filter(Boolean).join(' ');

    const cfg = {
      imagem, tipo, proporcao: proporcaoSnap, resolucao,
      quantidade:    totalSnap,
      mood:          moodFinal,
      materiais:     materiais.trim(),
      entorno:       entornoFinal,
      luzArtificial: luzArtFinal,
      direcaoLuz:    direcoes.join(', '),
      descLuz:       descLuzFinal,
      refTexto:      refTexto.trim(),
      referencias: refs.map((r, i) => ({
        base64: r.base64,
        mimeType: 'image/png',
        label: '@ref' + String(i + 1).padStart(2, '0')
      }))
    };

    const tarefa = async (canalProg) => {
      // O pool entrega um canal próprio: cada geração tem o seu bloco de
      // slots e pode correr em paralelo com as outras.
      const prog = canalProg || onProgresso;
      setOcupado(true);
      prog({ feito: 0, total: totalSnap, estado: 'enviado', proporcao: proporcaoSnap, base: previaSnap });
      try {
        const r = await gerarRender(cfg, {
          onProgresso: (feito, total, estado, extra) => prog((p) => {
            const prev = p || {};
            const prontas = (prev.prontas || []).slice();
            if (estado === 'pronto' && extra && extra.url) {
              prontas[feito - 1] = {
                url: /^https?:/.test(extra.url) ? extra.url : ('data:image/png;base64,' + extra.url),
                loteId: extra.loteId,
                ordem:  extra.ordem
              };
            }
            return {
              ...prev,
              feito, total, estado, proporcao: proporcaoSnap,
              base: previaSnap,
              prontas,
              falhas: (estado === 'erro' && extra)
                ? [...(prev.falhas || []), extra]
                : (prev.falhas || [])
            };
          }),
          loteAnterior: loteAntSnap
        });
        prog(null);
        setOcupado(false);
        onPronto(r);
        limparRascunho('render');
      } catch (e) {
        setErro(e.message);
        prog(null);
        setOcupado(false);
      }
    };

    // Pool: dispara NA HORA, em paralelo; o peso (nº de imagens) conta no
    // teto de simultâneas. (Sem a prop, roda direto.)
    if (enfileirar) enfileirar(tarefa, totalSnap);
    else tarefa();
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
    setAtmosfera([]);     setAtmosferaOutra('');
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

        {/* ── Ambiente ──
            Era um par de pílulas soltas, com a mesma forma dos botões de ação
            da barra. Virou linha da ficha, como todo o resto do painel: o
            nome à esquerda, o valor de agora à direita. Círculo no marcador,
            porque aqui só dá para escolher um. */}
        <div className="fic fic--solta">
          <Linha
            nome={t('painelrender_tipo_ambiente')}
            valor={tOpt((TIPOS.find((x) => x.val === tipo) || {}).rotulo)}
            aberta={linhaAberta === 'ambiente'} aoAbrir={abre('ambiente')}
          >
            <Lista uma>
              {TIPOS.map((tp) => (
                <ItemLista
                  key={tp.val}
                  marcada={tipo === tp.val}
                  onClick={() => setTipo(tp.val)}
                >{tOpt(tp.rotulo)}</ItemLista>
              ))}
            </Lista>
          </Linha>
        </div>

        {/* ── Materiais ── */}
        {/* As leituras já feitas vivem na aba Análises — não repetimos a
            porta aqui. */}
        <div className="cr-sec">{t('painelrender_materiais')}</div>

        {/* Já leu esta imagem antes, ou tem o texto à mão? Abre o campo sem
            gastar créditos. A aba Análises guarda as leituras antigas. */}
        {/* Os dois botões na mesma caixa, lado a lado: são dois caminhos para
            a mesma coisa. Sozinho, o de ler ocupa a linha toda. */}
        <div className="cr-mat-acoes">
        {matEstado === 'vazio' && (
          <button className="cr-b cr-b--tenho" onClick={() => setMatEstado('revisar')}>
            {t('painelrender_ja_tenho_analise')}
          </button>
        )}

        {/* O botão de ler fica SEMPRE. Ele sumia no estado 'revisar', e aí quem
            clicava em "já tenho a leitura" ficava preso: campo vazio e nenhuma
            porta de volta para a leitura de verdade. */}
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
        </div>

        {(matEstado === 'revisar' || matEstado === 'confirmado') && (
          <>
            <textarea
              ref={matRef}
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
                  {/* "Editar" fazia o MESMO que "Seguir assim" (confirmava e
                      travava o campo) — o rótulo prometia o contrário. O campo
                      já é editável em 'revisar': editar é focar nele. */}
                  <button className="cr-b" onClick={() => matRef.current && matRef.current.focus()}>
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

        {/* ══ A FICHA ══
            Uma linha por ajuste: o nome à esquerda, o valor de agora à
            direita. Fechada, ela é tipografia e fio; aberta, ela mostra a cor
            do grupo que está sendo escolhido. Era uma pilha de 44 botões
            sempre à vista, e nenhum deles em destaque. */}
        <div className="fic">

          {/* Qualidade da luz: a diferença entre direta e difusa é a borda da
              sombra, e ela se desenha. */}
          <Linha
            nome={t('painelrender_iluminacao_natural')}
            valor={tOpt((LUZ_TIPOS.find((l) => l.val === luzTipo) || {}).rotulo)}
            aberta={linhaAberta === 'luz'} aoAbrir={abre('luz')}
          >
            <div className="am">
              {LUZ_TIPOS.map((l) => (
                <Amostra
                  key={l.val}
                  fundo={QUALIDADE[l.val]}
                  marcada={luzTipo === l.val}
                  onClick={() => setLuzTipo(l.val)}
                >{tOpt(l.rotulo)}</Amostra>
              ))}
            </div>
          </Linha>

          {/* Hora do dia: quinze opções em quatro famílias. A família anda no
              sulco, e a hora é a cor do céu. */}
          <Linha
            nome={t('painelrender_hora_dia')}
            valor={tOpt(mood)}
            aberta={linhaAberta === 'hora'}
            /* Abrir leva o sulco para a família do mood que está valendo. Sem
               isto, um rascunho salvo em "Golden hour" abria em "Dia" e a
               amostra escolhida ficava fora da tela. */
            aoAbrir={() => {
              const g = MOODS.find((x) => x.itens.includes(mood));
              if (g) setFamiliaHora(g.grupo);
              setLinhaAberta((x) => (x === 'hora' ? null : 'hora'));
            }}
          >
            <Sulco
              rotulo={t('painelrender_hora_dia')}
              opcoes={MOODS.map((g) => ({ val: g.grupo, rotulo: tOpt(g.grupo) }))}
              atual={familiaHora}
              onEscolher={setFamiliaHora}
            />
            <div className="am" style={{ marginTop: 8 }}>
              {(MOODS.find((g) => g.grupo === familiaHora) || MOODS[0]).itens.map((m) => (
                <Amostra
                  key={m}
                  fundo={CEU[m]}
                  marcada={mood === m}
                  onClick={() => setMood(m)}
                >{tOpt(m)}</Amostra>
              ))}
            </div>
          </Linha>

          {/* Direção da luz: aceita mais de uma, porque a luz de um projeto
              entra por mais de um lugar. */}
          <Linha
            nome={t('painelrender_direcao_luz')}
            valor={resumir(direcoes, t('painelrender_escolhidas'), tOpt)}
            vazio={t('painelrender_nenhuma')}
            aberta={linhaAberta === 'direcao'} aoAbrir={abre('direcao')}
          >
            <div className="am am--3">
              {DIRECOES.map((d) => (
                <Amostra
                  key={d}
                  planta={PLANTA[d]}
                  marcada={direcoes.includes(d)}
                  onClick={() => toggle(direcoes, setDirecoes, d)}
                >{tOpt(d)}</Amostra>
              ))}
            </div>
          </Linha>

          {/* Atmosfera: lista longa e secundária, e dá para marcar várias. O
              marcador quadrado diz isso sozinho. */}
          <Linha
            nome={t('painelrender_atmosfera')}
            valor={resumir(atmosfera, t('painelrender_escolhidas'), tOpt)}
            vazio={t('painelrender_nenhuma')}
            aberta={linhaAberta === 'atmosfera'} aoAbrir={abre('atmosfera')}
          >
            <Lista>
              {ATMOSFERAS.map((a) => (
                <ItemLista
                  key={a}
                  marcada={atmosfera.includes(a)}
                  onClick={() => toggle(atmosfera, setAtmosfera, a)}
                >{tOpt(a)}</ItemLista>
              ))}
            </Lista>
            <input
              className="cr-ta ta--curta"
              style={{ minHeight: 0, height: 42 }}
              placeholder={t('painelrender_ph_atmosfera_outra')}
              value={atmosferaOutra}
              onChange={(e) => setAtmosferaOutra(e.target.value)}
              spellCheck={false}
            />
          </Linha>

          {/* O texto livre da luz mora numa linha só, e não aberto no meio das
              escolhas. Os dois campos continuam sendo dois (`detNatural` e
              `descLuz`, que é como o servidor recebe), e quem nunca escreve
              nada não vê nenhum dos dois. */}
          <Linha
            nome={t('painelrender_detalhes_luz_natural')}
            aberta={linhaAberta === 'detalhes'} aoAbrir={abre('detalhes')}
          >
            <p className="fic__grp">{t('painelrender_sobre_natural')}</p>
            <textarea
              className="cr-ta ta--curta"
              placeholder={t('painelrender_ph_det_natural')}
              value={detNatural}
              onChange={(e) => setDetNatural(e.target.value)}
              spellCheck={false}
            />
            <p className="fic__grp">{t('painelrender_sobre_direcao')}</p>
            <textarea
              className="cr-ta ta--curta"
              placeholder={t('painelrender_ph_desc_luz')}
              value={descLuz}
              onChange={(e) => setDescLuz(e.target.value)}
              spellCheck={false}
            />
            <p className="cr-hint">{t('painelrender_hint_desc_luz')}</p>
          </Linha>


          {/* Luz artificial: 2700K não quer dizer nada até virar uma bolinha
              alaranjada ao lado do número. */}
          <Linha
            nome={t('painelrender_luz_artificial')}
            valor={corLuz === 'Outro' ? corOutra.rotulo : tOpt(corLuz)}
            aberta={linhaAberta === 'artificial'} aoAbrir={abre('artificial')}
          >
            <div className="kel">
              {CORES_LUZ.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="kel__b"
                  aria-checked={corLuz === c}
                  role="radio"
                  onClick={() => setCorLuz(c)}
                >
                  <span className="kel__q" style={{ background: KELVIN[c] || 'var(--wash2)' }} />
                  {tOpt(c)}
                </button>
              ))}
            </div>

            {/* O seletor só existe com "Outro" marcado. Sem ele, "Outro" era
                uma palavra que ia para o prompt sem cor nenhuma dentro. */}
            {corLuz === 'Outro' && <PickerCor valor={corOutra} onMudar={setCorOutra} />}
          </Linha>

          {/* Intensidade e detalhes moravam DENTRO da linha da luz artificial,
              em grupos com rótulo pequeno. Cada assunto virou linha própria,
              como todo o resto da ficha. As duas só existem com a luz ligada:
              intensidade de uma lâmpada apagada não é pergunta. */}
          {corLuz !== 'Desligada' && (
            <>
              <Linha
                nome={t('painelrender_intensidade')}
                valor={tOpt(intensidade)}
                aberta={linhaAberta === 'intensidade'} aoAbrir={abre('intensidade')}
              >
                <Lista uma>
                  {INTENSIDADES.map((i) => (
                    <ItemLista
                      key={i}
                      marcada={intensidade === i}
                      onClick={() => setIntensidade(i)}
                    >{tOpt(i)}</ItemLista>
                  ))}
                </Lista>
              </Linha>

              <Linha
                nome={t('painelrender_detalhes_luz_artificial')}
                aberta={linhaAberta === 'detalhesArt'} aoAbrir={abre('detalhesArt')}
              >
                <textarea
                  className="cr-ta ta--curta"
                  placeholder={t('painelrender_ph_det_artificial')}
                  value={detArtificial}
                  onChange={(e) => setDetArtificial(e.target.value)}
                  spellCheck={false}
                />
              </Linha>
            </>
          )}

          {/* Entorno: aceita vários, e o campo de texto para o que não está na
              lista mora dentro da linha. */}
          <Linha
            nome={t('painelrender_entorno')}
            valor={resumir(tagsEntorno, t('painelrender_escolhidos'), tOpt)}
            vazio={t('painelrender_nenhum')}
            aberta={linhaAberta === 'entorno'} aoAbrir={abre('entorno')}
          >
            <Lista>
              {ENTORNOS.map((e) => (
                <ItemLista
                  key={e}
                  marcada={tagsEntorno.includes(e)}
                  onClick={() => toggle(tagsEntorno, setTagsEntorno, e)}
                >{tOpt(e)}</ItemLista>
              ))}
            </Lista>
            <textarea
              className="cr-ta ta--curta"
              placeholder={t('painelrender_ph_entorno')}
              value={entorno}
              onChange={(e) => setEntorno(e.target.value)}
              spellCheck={false}
            />
            <p className="cr-hint">{t('painelrender_hint_entorno')}</p>
          </Linha>
        </div>

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
              <span className="cr-ref-n">@ref{String(i + 1).padStart(2, '0')}</span>
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
          prefixo="ref"
        />

        {/* Confere se as @img que a pessoa escreveu existem mesmo */}
        {(() => {
          const citadas = [...refTexto.matchAll(/@ref(\d{1,2})/gi)]
            .map((m) => parseInt(m[1], 10));
          const orfas = [...new Set(citadas)].filter((n) => n < 1 || n > refs.length);

          if (orfas.length > 0) {
            return (
              <p className="cr-hint cr-hint--erro">
                {orfas.map((n) => '@ref' + String(n).padStart(2, '0')).join(', ')}
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

        {/* Sem `ocupado` no disabled: dá pra disparar mais de uma — elas entram
            na FILA e rodam uma por vez. */}
        <button
          className="cr-btn-gerar"
          onClick={gerar}
          disabled={!imagem || travadoMat}
        >
          <span>{t('painelrender_renderizar')}</span>
          {!travadoMat && imagem && (
            <span className="cr-custo-tag">
              <IconeCredito /> {custo}
            </span>
          )}
        </button>

        {naFila > 0 && (
          <p className="cr-custo">{naFila} {t('fila_rotulo')}</p>
        )}

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
      {/* Recomeçar do zero, no pé da barra e não antes dela. Recomeçar é a
          última coisa que se faz, e estava no meio da tela. Pede confirmação: os
          materiais lidos custaram créditos, e apagá-los sem querer é perder
          dinheiro. */}
      <button
        className="cr-resetar"
        onClick={() => setConfirmarReset(true)}
        disabled={ocupado}
      >
        {t('painelrender_resetar_config')}
      </button>
      </div>

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheuImagem}
        onEscolherVarias={escolheuVarias}
        multi={picker === 'ref'}
        titulo={picker === 'ref' ? t('painelrender_adicionar_referencia') : t('painelrender_imagem_modelo')}
      />
    </>
  );
}
