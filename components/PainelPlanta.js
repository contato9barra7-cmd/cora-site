'use client';

// ═══════════════════════════════════════════════════════════
//  PainelPlanta — a aba "Planta baixa" do /app (MODO 2D)
//
//  Espelha a Planta baixa do plugin. Só o 2D por enquanto — o 3D vem depois.
//  Segue o padrão dos outros painéis (PainelRender):
//    props onProgresso / onPronto / ocupado / setOcupado
//    barra fixa embaixo (quantidade + proporção + resolução + Renderizar)
//    imagem base via PickerImagem, refs via PickerImagem multi.
//
//  ⚠ Os VALORES enviados ao servidor são canônicos em PORTUGUÊS (o promptador
//    do GPT espera assim). Nos controles: `v` = valor PT fixo, `n` = rótulo
//    (por ora em PT, via objeto L — a i18n liga depois).
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import PickerImagem from './PickerImagem';
import DropdownCora from './DropdownCora';
import DropdownMulti from './DropdownMulti';
import IconeCredito from './IconeCredito';
import Seta from './Seta';
import CampoRefs from './CampoRefs';
import { useIdioma } from '../lib/i18n';
import { gerarRender, analisarBatch, PROPORCOES, RESOLUCOES, custoRender, MAX_REFS } from '../lib/render';

// ── Rótulos (PT) — a i18n liga depois; ver a lista no fim do componente ──
const L = {
  imagem_planta:   'Imagem da planta',
  escolher_imagem: 'Escolher imagem',
  remover_imagem:  'Remover imagem',
  obrigatorio:     'obrigatório',
  opcional:        'opcional',

  projecao:      'Projeção',
  proj_orto:     'Ortogonal',
  proj_iso:      'Perspectivada',

  tipo_leitura:  'Tipo de leitura',
  selecione:     'Selecione…',
  leitura_iso:   'Isométrica',
  leitura_persp: 'Vista superior com perspectiva',

  realismo:        'Nível de realismo',
  realismo_foto:   'Fotorrealista',
  realismo_grafico:'Gráfico / estilo desenho',

  mood:            'Mood',
  mood_leve:       'Leve e clean',
  mood_aconchego:  'Aconchegante',
  mood_sofisticada:'Sofisticada',
  mood_minimalista:'Minimalista',
  mood_natural:    'Natural / biofílica',
  mood_contemp:    'Contemporânea neutra',

  paleta:          'Paleta',
  paleta_neutra_c: 'Neutra clara',
  paleta_neutra_q: 'Neutra quente',
  paleta_neutra_f: 'Neutra fria',
  paleta_natural:  'Natural / orgânica',
  paleta_contraste:'Contrastada',

  ilum_sombras:    'Iluminação — sombras',
  sombra_difusas:  'Difusas',
  sombra_suaves:   'Suaves',
  sombra_medias:   'Médias',
  sombra_marcadas: 'Marcadas',

  ilum_origem:     'Iluminação — origem',
  origem_zenital:  'Zenital',
  origem_lateral:  'Lateral',
  origem_uniforme: 'Uniforme',

  par_cor:         'Espessura das paredes — cor',
  cor_branco:      'Branco',
  cor_offwhite:    'Off-white',
  cor_cinza_claro: 'Cinza claro',
  cor_cinza_medio: 'Cinza médio',
  cor_cinza_escuro:'Cinza escuro',
  cor_preto:       'Preto',

  par_trat:        'Espessura das paredes — tratamento',
  trat_sombra:     'Leve sombra interna',
  trat_chapada:    'Chapada',
  trat_textura:    'Textura sutil',

  vegetacao:       'Vegetação',
  veg_estilizada:  'Estilizada',
  veg_realista:    'Realista',
  veg_minima:      'Mínima',
  veg_sem:         'Sem',

  fundo:           'Fundo',
  fundo_branco:    'Branco',
  fundo_cinza:     'Cinza claro',
  fundo_escuro:    'Escuro',
  fundo_sombra:    'Sombra projetada',
  fundo_transp:    'Transparente',

  piso_titulo:       'Piso por zona',
  piso_definir:      '＋ Definir piso por zona',
  piso_social:       'Área social — tipo + tom + acabamento',
  piso_social_ph:    'ex.: porcelanato bege acetinado grande formato',
  piso_intima:       'Área íntima',
  piso_intima_mesmo: 'Mesmo piso',
  piso_intima_dif:   'Diferente (descrever)',
  piso_intima_ph:    'ex.: piso vinílico amadeirado tom médio',
  piso_add_zona:     '＋ Adicionar outra zona',
  piso_zona_outra:   'Outra zona',
  piso_zona_nome_lbl:'Nome da zona (ex.: varanda, cozinha)',
  piso_zona_nome_ph: 'nome da zona',
  piso_zona_piso_lbl:'Piso — tipo + tom + acabamento',
  piso_zona_piso_ph: 'ex.: deck de madeira',

  descricao:     'Descrição adicional',
  descricao_ph:  'Detalhes extras que a IA deve considerar',

  referencias:   'Referências',
  ref_ph_vazio:  'Descreva como usar as referências (adicione imagens acima)',
  ref_ph_arroba: 'Cite as referências com @ref01, @ref02…',

  // ── Seletor de modo (2D / 3D) ──
  oque_fazer:  'O que você quer fazer',
  voltar:      '‹ Voltar',
  modo_2d_tit: 'Planta 2D',
  modo_2d_sub: 'Suba uma planta 2D e humanize com materiais, mobília e luz.',
  modo_3d_tit: 'Planta 3D',
  modo_3d_sub: 'Suba uma imagem do seu projeto 3D e gere a planta humanizada com suas referências.',

  // ── Fluxo 3D ──
  refs_projeto:    'Referências do projeto (materiais e iluminação)',
  refs_projeto_ph: 'Use @ref01, @ref02… para referenciar cada imagem',
  cena_titulo:     'Imagem da cena',
  cena_nota:       'Suba uma imagem do seu modelo 3D (perspectiva ou vista superior).',
  cena_escolher:   'Escolher imagem da cena',
  analisar_mat:    'Analisar materiais',
  analisando:      'Analisando…',
  erro_cena:       'Suba uma imagem da cena',
  materiais_lidos: 'Materiais identificados',
  editar:          'Editar',
  confirmar_mat:   'Confirmar materiais',
  mat_confirmados: '✓ Materiais confirmados',
  voltar_refs:     '‹ Voltar para referências'
};

// ── Opções (v = PT canônico p/ o servidor · n = rótulo) ──
const OPC_LEITURA = [
  { v: '',      n: L.selecione },
  { v: 'iso',   n: L.leitura_iso },
  { v: 'persp', n: L.leitura_persp }
];
const OPC_REALISMO = [
  { v: 'Fotorrealista',            n: L.realismo_foto },
  { v: 'Gráfico / estilo desenho', n: L.realismo_grafico }
];
const OPC_MOOD = [
  { v: 'Leve e clean',          n: L.mood_leve },
  { v: 'Aconchegante',          n: L.mood_aconchego },
  { v: 'Sofisticada',           n: L.mood_sofisticada },
  { v: 'Minimalista',           n: L.mood_minimalista },
  { v: 'Natural / biofílica',   n: L.mood_natural },
  { v: 'Contemporânea neutra',  n: L.mood_contemp }
];
const OPC_PALETA = [
  { v: 'Neutra clara',       n: L.paleta_neutra_c },
  { v: 'Neutra quente',      n: L.paleta_neutra_q },
  { v: 'Neutra fria',        n: L.paleta_neutra_f },
  { v: 'Natural / orgânica', n: L.paleta_natural },
  { v: 'Contrastada',        n: L.paleta_contraste }
];
const OPC_SOMBRAS = [
  { v: 'Difusas',  n: L.sombra_difusas },
  { v: 'Suaves',   n: L.sombra_suaves },
  { v: 'Médias',   n: L.sombra_medias },
  { v: 'Marcadas', n: L.sombra_marcadas }
];
const OPC_ORIGEM = [
  { v: 'Zenital',  n: L.origem_zenital },
  { v: 'Lateral',  n: L.origem_lateral },
  { v: 'Uniforme', n: L.origem_uniforme }
];
const OPC_PARCOR = [
  { v: 'Branco',       n: L.cor_branco },
  { v: 'Off-white',    n: L.cor_offwhite },
  { v: 'Cinza claro',  n: L.cor_cinza_claro },
  { v: 'Cinza médio',  n: L.cor_cinza_medio },
  { v: 'Cinza escuro', n: L.cor_cinza_escuro },
  { v: 'Preto',        n: L.cor_preto }
];
const OPC_PARTRAT = [
  { v: 'Leve sombra interna', n: L.trat_sombra },
  { v: 'Chapada',             n: L.trat_chapada },
  { v: 'Textura sutil',       n: L.trat_textura }
];
const OPC_VEG = [
  { v: 'Estilizada', n: L.veg_estilizada },
  { v: 'Realista',   n: L.veg_realista },
  { v: 'Mínima',     n: L.veg_minima },
  { v: 'Sem',        n: L.veg_sem }
];
const OPC_FUNDO = [
  { v: 'Branco',           n: L.fundo_branco },
  { v: 'Cinza claro',      n: L.fundo_cinza },
  { v: 'Escuro',           n: L.fundo_escuro },
  { v: 'Sombra projetada', n: L.fundo_sombra },
  { v: 'Transparente',     n: L.fundo_transp }
];
const OPC_PISO_INTIMA = [
  { v: 'mesmo', n: L.piso_intima_mesmo },
  { v: 'dif',   n: L.piso_intima_dif }
];

export default function PainelPlanta({ onPronto, onProgresso, ocupado, setOcupado, imagemInicial, loteAnterior }) {
  const { t } = useIdioma();

  // ── Imagem base (a planta) ──
  const [imagem, setImagem] = useState(null);
  const [previa, setPrevia] = useState(null);

  // Picker: 'base' | 'ref' | null
  const [picker, setPicker] = useState(null);

  // ── Controles (defaults do enunciado) ──
  const [plantaModo, setPlantaModo]       = useState('orto');   // orto | iso
  const [plantaLeitura, setPlantaLeitura] = useState('');       // '' | iso | persp

  const [realismo, setRealismo] = useState('Fotorrealista');
  const [mood, setMood]         = useState(['Aconchegante']);
  const [paleta, setPaleta]     = useState(['Neutra clara']);
  const [sombras, setSombras]   = useState('Difusas');
  const [origem, setOrigem]     = useState('Zenital');
  const [parCor, setParCor]     = useState('Branco');
  const [parTrat, setParTrat]   = useState(['Leve sombra interna']);
  const [veg, setVeg]           = useState('Estilizada');
  const [fundo, setFundo]       = useState('Branco');

  // ── Piso por zona (opcional) ──
  const [pisoAberto, setPisoAberto]         = useState(false);
  const [pisoSocial, setPisoSocial]         = useState('');
  const [pisoIntima, setPisoIntima]         = useState('mesmo');  // mesmo | dif
  const [pisoIntimaDesc, setPisoIntimaDesc] = useState('');
  const [zonasExtra, setZonasExtra]         = useState([]);       // [{ nome, piso }]

  const [desc, setDesc] = useState('');

  // ── Referências ──
  const [refs, setRefs]         = useState([]);
  const [refTexto, setRefTexto] = useState('');

  // ── Barra ──
  const [proporcao, setProporcao]   = useState('auto');
  const [resolucao, setResolucao]   = useState('2k');
  const [quantidade, setQuantidade] = useState(1);
  const [popRatio, setPopRatio]     = useState(false);
  const [popRes, setPopRes]         = useState(false);

  const [erro, setErro] = useState('');

  // ── Seletor de modo: null (escolha) | '2d' | '3d' ──
  const [modo, setModo] = useState(null);

  // ── Fluxo 3D (estado próprio — não colide com o 2D) ──
  const [refs3d, setRefs3d]           = useState([]);    // { base64, previa } (multi, até MAX_REFS)
  const [refTexto3d, setRefTexto3d]   = useState('');
  const [cena3d, setCena3d]           = useState(null);  // { base64, previa } (single)
  const [analise3d, setAnalise3d]     = useState(null);  // null | { nome, materiais }
  const [matConfirmado3d, setMatConf] = useState(false);
  const [analisando3d, setAnalisando] = useState(false);

  // Imagem vinda de outra aba
  useEffect(() => {
    if (imagemInicial) {
      setImagem(imagemInicial.base64);
      setPrevia(imagemInicial.previa);
    }
  }, [imagemInicial]);

  // Projeção ortogonal não tem "tipo de leitura" — zera para não vazar valor.
  useEffect(() => {
    if (plantaModo === 'orto' && plantaLeitura !== '') setPlantaLeitura('');
  }, [plantaModo, plantaLeitura]);

  // Fecha os popovers ao clicar fora
  useEffect(() => {
    if (!popRatio && !popRes) return;
    const fechar = () => { setPopRatio(false); setPopRes(false); };
    window.addEventListener('click', fechar);
    return () => window.removeEventListener('click', fechar);
  }, [popRatio, popRes]);

  function escolheuImagem({ base64, previa: p }) {
    if (picker === 'ref') {
      if (refs.length < MAX_REFS) setRefs((r) => [...r, { base64, previa: p }]);
      return;
    }
    if (picker === 'ref3d') {
      if (refs3d.length < MAX_REFS) setRefs3d((r) => [...r, { base64, previa: p }]);
      return;
    }
    if (picker === 'cena3d') {
      setCena3d({ base64, previa: p });
      setErro('');
      return;
    }
    setImagem(base64);
    setPrevia(p);
    setErro('');
  }

  function escolheuVarias(lista) {
    const alvo = (picker === 'ref3d') ? setRefs3d : setRefs;
    alvo((r) => {
      const espaco = MAX_REFS - r.length;
      const novas = lista.slice(0, Math.max(0, espaco)).map((b) => ({
        base64: b,
        previa: `data:image/png;base64,${b}`
      }));
      return [...r, ...novas];
    });
  }

  function toggle(lista, setLista, v) {
    setLista(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  }

  // ── Monta o texto `materiais` (EXATAMENTE como o plugin — junta com '\n') ──
  function montarMateriais() {
    const linhas = [];
    linhas.push(`Nível de realismo: ${realismo}.`);
    if (mood.length)   linhas.push(`Mood: ${mood.join(', ')}.`);
    if (paleta.length) linhas.push(`Paleta: ${paleta.join(', ')}.`);
    linhas.push(`Iluminação — sombras: ${sombras}; origem: ${origem}.`);
    linhas.push(
      `Espessura das paredes: cor ${parCor}` +
      (parTrat.length ? `, tratamento ${parTrat.join(', ')}` : '') + '.'
    );
    linhas.push(`Vegetação: ${veg}. Fundo: ${fundo}.`);

    if (pisoAberto) {
      if (pisoSocial.trim()) linhas.push(`Piso área social: ${pisoSocial.trim()}.`);
      linhas.push(
        `Piso área íntima: ${
          pisoIntima === 'mesmo'
            ? 'mesmo piso da área social'
            : (pisoIntimaDesc.trim() || '—')
        }.`
      );
      zonasExtra.forEach((z) => {
        const nome = z.nome.trim() || 'zona';
        linhas.push(`Piso ${nome}: ${z.piso.trim() || '—'}.`);
      });
    }

    if (desc.trim()) linhas.push(`Observações: ${desc.trim()}.`);
    return linhas.join('\n');
  }

  const travadoLeitura = plantaModo === 'iso' && !plantaLeitura;

  // ── onProgresso do feed (idêntico p/ 2D e 3D) ──
  //  `baseImg` é a prévia que aparece desfocada no slot enquanto gera:
  //  no 2D é a planta; no 3D é a imagem da cena.
  function montarOnProgresso(baseImg) {
    return (feito, total, estado, extra) => onProgresso((p) => {
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
        feito, total, estado, proporcao,
        base: baseImg,
        prontas,
        falhas: (estado === 'erro' && extra)
          ? [...(prev.falhas || []), extra]
          : (prev.falhas || [])
      };
    });
  }

  async function gerar() {
    if (!imagem) { setErro(L.imagem_planta); return; }
    if (travadoLeitura) { setErro(L.tipo_leitura); return; }
    if (ocupado) return;

    setErro('');
    setOcupado(true);
    onProgresso({
      feito: 0,
      total: quantidade,
      estado: 'enviado',
      proporcao,
      base: previa
    });

    const cfg = {
      imagem,
      tipo: 'planta',
      materiais: montarMateriais(),
      plantaModo,
      plantaLeitura,
      proporcao,
      resolucao,
      quantidade,
      referencias: refs.map((r, i) => ({
        base64: r.base64,
        mimeType: 'image/png',
        label: '@ref' + String(i + 1).padStart(2, '0')
      })),
      refTexto: refTexto.trim()
    };

    try {
      const r = await gerarRender(cfg, {
        onProgresso: montarOnProgresso(previa),
        loteAnterior
      });
      onProgresso(null);
      setOcupado(false);
      onPronto(r);
    } catch (e) {
      setErro(e.message);
      onProgresso(null);
      setOcupado(false);
    }
  }

  // ═══ 3D — FASE 1: analisar materiais da cena a partir das referências ═══
  async function analisar3d() {
    if (!cena3d) { setErro(L.erro_cena); return; }
    if (ocupado || analisando3d) return;

    setErro('');
    setAnalisando(true);
    setOcupado(true);
    try {
      const lidas = await analisarBatch({
        cenas: [{ nome: 'Cena', base64: cena3d.base64 }],
        refs:  refs3d.map((r) => r.base64),
        origemTipo: 'planta',
        tipo: 'planta'
      });
      const c = lidas[0] || {};
      setAnalise3d({
        nome: 'Cena',
        materiais: c.materiais_completos || c.leitura || c.materiais_novos || ''
      });
      setMatConf(false);
    } catch (e) {
      setErro(e.message);
    } finally {
      setAnalisando(false);
      setOcupado(false);
    }
  }

  // ═══ 3D — FASE 2: renderizar (mesmo fluxo do 2D) ═══
  async function gerar3d() {
    if (!cena3d || !analise3d) { setErro(L.erro_cena); return; }
    if (ocupado) return;

    setErro('');
    setOcupado(true);
    onProgresso({
      feito: 0,
      total: quantidade,
      estado: 'enviado',
      proporcao,
      base: cena3d.previa
    });

    const cfg = {
      imagem: cena3d.base64,
      tipo: 'planta',
      materiais: analise3d.materiais,
      modoSerie: true,
      referencias: refs3d.map((r, i) => ({
        base64: r.base64,
        mimeType: 'image/png',
        label: '@ref' + String(i + 1).padStart(2, '0')
      })),
      refTexto: refTexto3d.trim(),
      proporcao,
      resolucao,
      quantidade
    };

    try {
      const r = await gerarRender(cfg, {
        onProgresso: montarOnProgresso(cena3d.previa),
        loteAnterior
      });
      onProgresso(null);
      setOcupado(false);
      onPronto(r);
    } catch (e) {
      setErro(e.message);
      onProgresso(null);
      setOcupado(false);
    }
  }

  const custo = custoRender(quantidade, resolucao);
  const podeGerar   = !ocupado && imagem && !travadoLeitura;
  const podeGerar3d = !ocupado && !!cena3d && !!analise3d;

  return (
    <>
      <div className="cr-form">

        {/* ═══ SELETOR DE MODO (2D / 3D) ═══
            Cores e ícones IGUAIS ao plugin (e ao padrão da aba Editar):
            faixa fraquinha na cor da marca, ícone na cor forte. */}
        {modo === null && (
          <>
            <div className="cr-sec">{L.oque_fazer}</div>
            <div className="ed-cards">
              <button className="ed-card" onClick={() => setModo('2d')} disabled={ocupado}>
                <div className="ed-faixa" style={{ background: '#EEEDFE' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.6"
                       strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="1"/>
                    <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
                  </svg>
                </div>
                <div className="ed-corpo">
                  <strong>{L.modo_2d_tit}</strong>
                  <span>{L.modo_2d_sub}</span>
                </div>
              </button>

              <button className="ed-card" onClick={() => setModo('3d')} disabled={ocupado}>
                <div className="ed-faixa" style={{ background: '#E1F5EE' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.6"
                       strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l9 5v10l-9 5-9-5V7z"/>
                    <path d="M12 2v20M3 7l9 5 9-5"/>
                  </svg>
                </div>
                <div className="ed-corpo">
                  <strong>{L.modo_3d_tit}</strong>
                  <span>{L.modo_3d_sub}</span>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════ MODO 2D ═══════════════════════ */}
        {modo === '2d' && (
        <>
        <button className="cr-voltar" onClick={() => setModo(null)}>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {L.modo_2d_tit}
        </button>

        {/* ── Imagem da planta ── */}
        <div className="cr-sec">{L.imagem_planta} <span className="cr-opc">{L.obrigatorio}</span></div>
        {previa ? (
          <div className="cr-base">
            <img src={previa} alt="" />
            <button
              className="cr-base-x"
              onClick={() => { setImagem(null); setPrevia(null); }}
              data-tip={L.remover_imagem}
              aria-label={L.remover_imagem}
            >×</button>
          </div>
        ) : (
          <button className="cr-drop" onClick={() => setPicker('base')} disabled={ocupado}>
            <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/>
              <path d="M3 14l4-4 3.5 3.5L14 9l3.5 3.5"/>
            </svg>
            <span>{L.escolher_imagem}</span>
          </button>
        )}

        {/* ── Projeção ── */}
        <div className="cr-sec">{L.projecao}</div>
        <div className="cr-g2">
          <button
            className={'cr-b' + (plantaModo === 'orto' ? ' cr-b--on' : '')}
            onClick={() => setPlantaModo('orto')}
          >{L.proj_orto}</button>
          <button
            className={'cr-b' + (plantaModo === 'iso' ? ' cr-b--on' : '')}
            onClick={() => setPlantaModo('iso')}
          >{L.proj_iso}</button>
        </div>

        {/* ── Tipo de leitura (só na perspectivada) ── */}
        {plantaModo === 'iso' && (
          <>
            <div className="cr-sec">{L.tipo_leitura}</div>
            <DropdownCora
              valor={plantaLeitura}
              opcoes={OPC_LEITURA}
              onEscolher={setPlantaLeitura}
            />
          </>
        )}

        {/* ── Nível de realismo ── */}
        <div className="cr-sec">{L.realismo}</div>
        <DropdownCora valor={realismo} opcoes={OPC_REALISMO} onEscolher={setRealismo} />

        {/* ── Mood (multi dropdown, igual ao plugin) ── */}
        <div className="cr-sec">{L.mood}</div>
        <DropdownMulti opcoes={OPC_MOOD} valores={mood} onToggle={(v) => toggle(mood, setMood, v)} placeholder={L.selecione} />

        {/* ── Paleta (multi dropdown) ── */}
        <div className="cr-sec">{L.paleta}</div>
        <DropdownMulti opcoes={OPC_PALETA} valores={paleta} onToggle={(v) => toggle(paleta, setPaleta, v)} placeholder={L.selecione} />

        {/* ── Iluminação — sombras ── */}
        <div className="cr-sec">{L.ilum_sombras}</div>
        <DropdownCora valor={sombras} opcoes={OPC_SOMBRAS} onEscolher={setSombras} />

        {/* ── Iluminação — origem ── */}
        <div className="cr-sec">{L.ilum_origem}</div>
        <DropdownCora valor={origem} opcoes={OPC_ORIGEM} onEscolher={setOrigem} />

        {/* ── Espessura paredes — cor ── */}
        <div className="cr-sec">{L.par_cor}</div>
        <DropdownCora valor={parCor} opcoes={OPC_PARCOR} onEscolher={setParCor} />

        {/* ── Espessura paredes — tratamento (multi dropdown) ── */}
        <div className="cr-sec">{L.par_trat}</div>
        <DropdownMulti opcoes={OPC_PARTRAT} valores={parTrat} onToggle={(v) => toggle(parTrat, setParTrat, v)} placeholder={L.selecione} />

        {/* ── Vegetação ── */}
        <div className="cr-sec">{L.vegetacao}</div>
        <DropdownCora valor={veg} opcoes={OPC_VEG} onEscolher={setVeg} />

        {/* ── Fundo ── */}
        <div className="cr-sec">{L.fundo}</div>
        <DropdownCora valor={fundo} opcoes={OPC_FUNDO} onEscolher={setFundo} />

        {/* ── Piso por zona (opcional) — caixinha igual ao plugin ── */}
        <div className="cr-sec">{L.piso_titulo} <span className="cr-opc">{L.opcional}</span></div>
        {!pisoAberto ? (
          <button className="pl-optadd" onClick={() => setPisoAberto(true)}>{L.piso_definir}</button>
        ) : (
          <div className="pl-optbox">
            <div className="pl-oh">
              <b>{L.piso_titulo}</b>
              <button className="pl-ox" onClick={() => setPisoAberto(false)} aria-label={L.remover_imagem}>✕</button>
            </div>

            <div className="pl-sub">{L.piso_social}</div>
            <textarea
              className="cr-ta"
              placeholder={L.piso_social_ph}
              value={pisoSocial}
              onChange={(e) => setPisoSocial(e.target.value)}
              spellCheck={false}
            />

            <div className="pl-sub">{L.piso_intima}</div>
            <DropdownCora valor={pisoIntima} opcoes={OPC_PISO_INTIMA} onEscolher={setPisoIntima} />
            {pisoIntima === 'dif' && (
              <textarea
                className="cr-ta"
                style={{ marginTop: 6 }}
                placeholder={L.piso_intima_ph}
                value={pisoIntimaDesc}
                onChange={(e) => setPisoIntimaDesc(e.target.value)}
                spellCheck={false}
              />
            )}

            {zonasExtra.map((z, i) => (
              <div key={i} className="pl-zona">
                <div className="pl-oh">
                  <b>{L.piso_zona_outra}</b>
                  <button
                    className="pl-ox"
                    onClick={() => setZonasExtra((zs) => zs.filter((_, j) => j !== i))}
                    aria-label={L.piso_zona_outra}
                  >✕</button>
                </div>
                <div className="pl-sub">{L.piso_zona_nome_lbl}</div>
                <input
                  className="pl-inp"
                  placeholder={L.piso_zona_nome_ph}
                  value={z.nome}
                  onChange={(e) => setZonasExtra((zs) => zs.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))}
                  spellCheck={false}
                />
                <div className="pl-sub">{L.piso_zona_piso_lbl}</div>
                <textarea
                  className="cr-ta"
                  placeholder={L.piso_zona_piso_ph}
                  value={z.piso}
                  onChange={(e) => setZonasExtra((zs) => zs.map((x, j) => j === i ? { ...x, piso: e.target.value } : x))}
                  spellCheck={false}
                />
              </div>
            ))}

            <button
              className="pl-optadd"
              style={{ marginTop: 10 }}
              onClick={() => setZonasExtra((zs) => [...zs, { nome: '', piso: '' }])}
            >
              {L.piso_add_zona}
            </button>
          </div>
        )}

        {/* ── Descrição adicional ── */}
        <div className="cr-sec">{L.descricao} <span className="cr-opc">{L.opcional}</span></div>
        <textarea
          className="cr-ta"
          placeholder={L.descricao_ph}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          spellCheck={false}
        />

        {/* ── Referências ── */}
        <div className="cr-sec">{L.referencias} <span className="cr-opc">{L.opcional}</span></div>
        <div className="cr-refs">
          {refs.map((r, i) => (
            <div key={i} className="cr-ref">
              <img src={r.previa} alt="" />
              <button
                className="cr-ref-x"
                onClick={() => setRefs((rs) => rs.filter((_, j) => j !== i))}
                aria-label={L.remover_imagem}
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
        <CampoRefs
          className="cr-ta"
          placeholder={refs.length > 0 ? L.ref_ph_arroba : L.ref_ph_vazio}
          valor={refTexto}
          onMudar={setRefTexto}
          refs={refs}
          prefixo="ref"
        />

        {erro && <div className="cr-erro">{erro}</div>}
        </>
        )}

        {/* ═══════════════════════ MODO 3D ═══════════════════════ */}
        {modo === '3d' && (
        <>
        <button
          className="cr-voltar"
          onClick={() => (analise3d ? setAnalise3d(null) : setModo(null))}
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {analise3d ? L.voltar_refs : L.modo_3d_tit}
        </button>

        {/* ── FASE 1: referências + cena → analisar ── */}
        {!analise3d && (
          <>
            <div className="cr-sec">{L.refs_projeto} <span className="cr-opc">{L.opcional}</span></div>
            <div className="cr-refs">
              {refs3d.map((r, i) => (
                <div key={i} className="cr-ref">
                  <img src={r.previa} alt="" />
                  <button
                    className="cr-ref-x"
                    onClick={() => setRefs3d((rs) => rs.filter((_, j) => j !== i))}
                    aria-label={L.remover_imagem}
                  >×</button>
                  <span className="cr-ref-n">@ref{String(i + 1).padStart(2, '0')}</span>
                </div>
              ))}
              {refs3d.length < MAX_REFS && (
                <button className="cr-ref cr-ref--add" onClick={() => setPicker('ref3d')}>
                  <span className="cr-ref-mais">+</span>
                  <span className="cr-ref-c">{refs3d.length}/{MAX_REFS}</span>
                </button>
              )}
            </div>
            <CampoRefs
              className="cr-ta"
              placeholder={L.refs_projeto_ph}
              valor={refTexto3d}
              onMudar={setRefTexto3d}
              refs={refs3d}
              prefixo="ref"
            />

            <div className="cr-sec">{L.cena_titulo} <span className="cr-opc">{L.obrigatorio}</span></div>
            {cena3d ? (
              <div className="cr-base">
                <img src={cena3d.previa} alt="" />
                <button
                  className="cr-base-x"
                  onClick={() => setCena3d(null)}
                  data-tip={L.remover_imagem}
                  aria-label={L.remover_imagem}
                >×</button>
              </div>
            ) : (
              <button className="cr-drop" onClick={() => setPicker('cena3d')} disabled={ocupado}>
                <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/>
                  <path d="M3 14l4-4 3.5 3.5L14 9l3.5 3.5"/>
                </svg>
                <span>{L.cena_escolher}</span>
              </button>
            )}
            <p className="cr-hint">{L.cena_nota}</p>
          </>
        )}

        {/* ── FASE 2: verificar/editar materiais → renderizar ──
            Cartão de verificação no estilo do Batch (uma cena só). ── */}
        {analise3d && (
          <>
            {refs3d.length > 0 && (
              <>
                <div className="cr-sec">{L.referencias}</div>
                <div className="cr-refs">
                  {refs3d.map((r, i) => (
                    <div key={i} className="cr-ref">
                      <img src={r.previa} alt="" />
                      <span className="cr-ref-n">@ref{String(i + 1).padStart(2, '0')}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="cr-sec">{L.materiais_lidos}</div>
            <div className={'cr-bcena' + (matConfirmado3d ? ' cr-bcena--ok' : '')}>
              <div className="cr-bcena-cab">
                {cena3d && <img src={cena3d.previa} alt="" />}
                <span>{analise3d.nome}</span>
              </div>

              <textarea
                className="cr-ta cr-ta--mat"
                value={analise3d.materiais}
                onChange={(e) => setAnalise3d((a) => ({ ...a, materiais: e.target.value }))}
                readOnly={matConfirmado3d}
                spellCheck={false}
              />

              <div className="cr-g2 cr-bcena-acoes">
                <button
                  className="cr-b"
                  onClick={() => setMatConf(false)}
                  disabled={!matConfirmado3d}
                >{L.editar}</button>
                <button
                  className={matConfirmado3d ? 'cr-b cr-b--on' : 'cr-b-conf'}
                  onClick={() => setMatConf(true)}
                >{matConfirmado3d ? L.mat_confirmados : L.confirmar_mat}</button>
              </div>
            </div>
          </>
        )}

        {erro && <div className="cr-erro">{erro}</div>}
        </>
        )}
      </div>

      {/* ── Barra fixa: 3D fase 1 = Analisar materiais ── */}
      {modo === '3d' && !analise3d && (
        <div className="cr-barra-ger">
          <button
            className="cr-btn-gerar"
            onClick={analisar3d}
            disabled={ocupado || analisando3d || !cena3d}
          >
            <span>{analisando3d ? L.analisando : L.analisar_mat}</span>
          </button>
        </div>
      )}

      {/* ── Barra fixa (= a do PainelRender). 2D e 3D-fase2 compartilham. ── */}
      {(modo === '2d' || (modo === '3d' && analise3d)) &&
      (() => { const emGeracao = modo === '2d' ? gerar : gerar3d;
               const gerarOk   = modo === '2d' ? podeGerar : podeGerar3d;
      return (
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
          onClick={emGeracao}
          disabled={!gerarOk}
        >
          <span>{ocupado ? t('painelrender_renderizando') : t('painelrender_renderizar')}</span>
          {gerarOk && (
            <span className="cr-custo-tag">
              <IconeCredito /> {custo}
            </span>
          )}
        </button>
      </div>
      ); })()}

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheuImagem}
        onEscolherVarias={escolheuVarias}
        multi={picker === 'ref' || picker === 'ref3d'}
        titulo={
          picker === 'ref' || picker === 'ref3d' ? L.referencias
          : picker === 'cena3d' ? L.cena_titulo
          : L.imagem_planta
        }
      />
    </>
  );
}
