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
import CampoRefs from './CampoRefs';
import { salvarRascunho, lerRascunho, limparRascunho } from '../lib/rascunho';
import {
  gerarRender, lerMateriais, custoRender, CREDITOS,
  TIPOS, PROPORCOES, LUZ_TIPOS, MOODS, DIRECOES,
  CORES_LUZ, INTENSIDADES, ENTORNOS, RESOLUCOES, MAX_REFS
} from '../lib/render';

export default function PainelRender({ onPronto, onProgresso, ocupado, setOcupado, imagemInicial, leituraInicial, refazer, loteAnterior }) {
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
    if (!imagem) { setErro('Escolha a imagem do modelo primeiro'); return; }
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
    const agora = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    return `${tipo === 'externo' ? 'Externo' : tipo === 'planta' ? 'Planta' : 'Interno'} · ${agora}`;
  }


  async function gerar({ apenasUma } = {}) {
    if (!imagem) { setErro('Escolha a imagem do seu modelo'); return; }
    if (matEstado === 'revisar') { setErro('Confirme os materiais para renderizar'); return; }
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

  const custo      = custoRender(quantidade, resolucao);
  const travadoMat = matEstado === 'revisar';   // precisa confirmar antes

  return (
    <>
      <div className="cr-form">

        {/* ── Imagem do modelo ── */}
        <div className="cr-sec">Imagem do modelo</div>
        {previa ? (
          <div className="cr-base">
            <img src={previa} alt="" />
            <button
              className="cr-base-x"
              onClick={() => { setImagem(null); setPrevia(null); setMateriais(''); setMatEstado('vazio'); }}
              data-tip="Remover imagem"
              aria-label="Remover imagem"
            >×</button>
          </div>
        ) : (
          <button className="cr-drop" onClick={() => setPicker('base')} disabled={ocupado}>
            <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/>
              <path d="M3 14l4-4 3.5 3.5L14 9l3.5 3.5"/>
            </svg>
            <span>Escolher imagem</span>
          </button>
        )}

        {/* ── Tipo de ambiente ── */}
        <div className="cr-sec">Tipo de ambiente</div>
        <div className="cr-g3">
          {TIPOS.map((t) => (
            <button
              key={t.val}
              className={'cr-b' + (tipo === t.val ? ' cr-b--on' : '')}
              onClick={() => setTipo(t.val)}
            >{t.rotulo}</button>
          ))}
        </div>

        {/* ── Materiais ── */}
        {/* As leituras já feitas vivem na aba Análises — não repetimos a
            porta aqui. */}
        <div className="cr-sec">Materiais</div>

        {/* Já leu esta imagem antes, ou tem o texto à mão? Abre o campo sem
            gastar créditos. A aba Análises guarda as leituras antigas. */}
        {matEstado === 'vazio' && (
          <button className="cr-b cr-b--tenho" onClick={() => setMatEstado('revisar')}>
            Já tenho a análise
          </button>
        )}

        {matEstado !== 'revisar' && (
          <button
            className="cr-b-ler"
            onClick={lerMat}
            disabled={matEstado === 'lendo' || !imagem || ocupado}
          >
            <span>
              {matEstado === 'lendo' ? 'Lendo a imagem...'
                : matEstado === 'confirmado' ? 'Ler materiais de novo'
                : 'Ler materiais'}
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
              placeholder={materiais ? "Edite os materiais aqui..." : "Cole aqui a análise que você já tem..."}
              value={materiais}
              onChange={(e) => setMateriais(e.target.value)}
              readOnly={matEstado === 'confirmado'}
              spellCheck={false}
            />

            {matEstado === 'revisar' && (
              <>
                <p className="cr-hint">Materiais identificados — edite se necessário</p>
                <div className="cr-g2 cr-mat-acoes">
                  <button className="cr-b" onClick={() => setMatEstado('confirmado')}>
                    Editar
                  </button>
                  <button className="cr-b-conf" onClick={() => setMatEstado('confirmado')}>
                    Tá bom, seguir assim
                  </button>
                </div>
              </>
            )}

            {matEstado === 'confirmado' && (
              <button className="cr-b-editar-mat" onClick={() => setMatEstado('revisar')}>
                Editar materiais
              </button>
            )}
          </>
        )}

        {/* ── Iluminação Natural ── */}
        <div className="cr-sec">Iluminação Natural</div>
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
          placeholder="Opcional — detalhes adicionais sobre a iluminação natural..."
          value={detNatural}
          onChange={(e) => setDetNatural(e.target.value)}
          spellCheck={false}
        />

        {/* ── Direção da Luz ── */}
        <div className="cr-sec">Direção da Luz</div>
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
          placeholder="Opcional — descreva como a luz entra no espaço..."
          value={descLuz}
          onChange={(e) => setDescLuz(e.target.value)}
          spellCheck={false}
        />
        <p className="cr-hint">Ex: “luz entra pela porta-janela lateral direita e pelo fundo”</p>

        {/* ── Luz Artificial ── */}
        <div className="cr-sec">Luz Artificial</div>
        <div className="cr-grp">Cor</div>
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
            <div className="cr-grp">Intensidade</div>
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
              placeholder="Opcional — detalhes adicionais sobre a luz artificial..."
              value={detArtificial}
              onChange={(e) => setDetArtificial(e.target.value)}
              spellCheck={false}
            />
          </>
        )}

        {/* ── Entorno ── */}
        <div className="cr-sec">Entorno <span className="cr-opc">Opcional</span></div>
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
          placeholder="Descreva com suas palavras o entorno..."
          value={entorno}
          onChange={(e) => setEntorno(e.target.value)}
          spellCheck={false}
        />
        <p className="cr-hint">
          Melhores resultados quando você dá mais especificações. Ex: “10º andar em cidade
          como Florianópolis, vista de bairro residencial arborizado”
        </p>

        {/* ── Referências (abrem o mesmo picker) ── */}
        <div className="cr-sec">Referências <span className="cr-opc">Opcional</span></div>
        <div className="cr-refs">
          {refs.map((r, i) => (
            <div key={i} className="cr-ref">
              <img src={r.previa} alt="" />
              <button
                className="cr-ref-x"
                onClick={() => setRefs((rs) => rs.filter((_, j) => j !== i))}
                aria-label="Remover referência"
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
            ? 'Digite @ para escolher uma referência'
            : 'Adicione uma referência acima para usar @img01'}
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
                {orfas.length === 1 ? ' não existe' : ' não existem'} — você tem {refs.length}
                {refs.length === 1 ? ' referência' : ' referências'}.
              </p>
            );
          }
          if (citadas.length > 0) {
            return (
              <p className="cr-hint cr-hint--ok">
                {[...new Set(citadas)].length}
                {[...new Set(citadas)].length === 1 ? ' referência citada' : ' referências citadas'}.
              </p>
            );
          }
          return <p className="cr-hint">Use @img01, @img02... para referenciar cada imagem carregada.</p>;
        })()}

        {/* Recomeçar do zero. Pede confirmação: os materiais lidos custaram
            créditos, e apagá-los sem querer é perder dinheiro. */}
        <button
          className="cr-resetar"
          onClick={() => setConfirmarReset(true)}
          disabled={ocupado}
        >
          Resetar configurações
        </button>

        {confirmarReset && (
          <div className="cr-overlay cr-overlay--alto" onClick={() => setConfirmarReset(false)}>
            <div className="cf" onClick={(e) => e.stopPropagation()}>
              <h3>Resetar tudo?</h3>
              <p>
                Todos os campos voltam ao padrão, inclusive os materiais que você
                leu — e ler de novo custa {CREDITOS.materiais} créditos.
              </p>
              <div className="cf-acoes">
                <button className="cf-nao" onClick={() => setConfirmarReset(false)}>Cancelar</button>
                <button className="cf-sim" onClick={resetar}>Resetar</button>
              </div>
            </div>
          </div>
        )}


        {avisoImg && (
          <div className="cr-aviso">
            Seus materiais foram guardados, mas a imagem era grande demais para
            caber na memória do navegador. Escolha a imagem de novo.
            <button onClick={() => setAvisoImg(false)}>Entendi</button>
          </div>
        )}

        {erro && <div className="cr-erro">{erro}</div>}
      </div>

      {/* ── Barra fixa (= .render-bar do plugin) ── */}
      <div className="cr-barra-ger">
        <div className="cr-pills-cfg">

          <div className="cr-qty">
            <button onClick={() => setQuantidade((q) => Math.max(1, q - 1))} aria-label="Menos uma">−</button>
            <span>{quantidade}</span>
            <button onClick={() => setQuantidade((q) => Math.min(10, q + 1))} aria-label="Mais uma">+</button>
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
              <span>{proporcao === 'auto' ? 'Auto' : proporcao}</span>
              <span className="cr-pill-seta">{popRatio ? '▾' : '▴'}</span>
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
                      <span>{p.val === 'auto' ? 'Auto' : p.val}</span>
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
              <span className="cr-pill-seta">{popRes ? '▾' : '▴'}</span>
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
          <span>{ocupado ? 'Renderizando...' : 'Renderizar'}</span>
          {!ocupado && !travadoMat && imagem && (
            <span className="cr-custo-tag">
              <IconeCredito /> {custo}
            </span>
          )}
        </button>

        <p className="cr-custo">
          {travadoMat
            ? 'Confirme os materiais para renderizar'
            : `${custo} créditos · ${quantidade} ${quantidade === 1 ? 'imagem' : 'imagens'}`}
        </p>
      </div>

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheuImagem}
        titulo={picker === 'ref' ? 'Adicionar referência' : 'Imagem do modelo'}
      />
    </>
  );
}
