'use client';

// ═══════════════════════════════════════════════════════════
//  PainelEditar — a aba Editar
//
//  Oito modos. Seis são formulários; dois (preenchimento e expansão) precisam
//  de PINCEL, e por isso abrem numa tela grande — pintar uma máscara num
//  painel de 380px seria impossível.
//
//  A imagem base é UMA SÓ: escolhida uma vez, vale para todos os modos.
//  Tudo aqui segue o plugin: os mesmos textos, os mesmos campos, a mesma
//  barra de gerar. Quem usa os dois não deve ter que reaprender nada.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import PickerImagem from './PickerImagem';
import CampoRefs from './CampoRefs';
import IconeCredito from './IconeCredito';
import {
  editarImagem, custoEditar, PROPORCOES, RESOLUCOES, MAX_REFS
} from '../lib/render';

// ── Os oito modos (iguais aos do plugin) ──
//
//    refs     — aceita imagens de referência (@img01, @img02...)?
//    campos   — os botões de escolha que este modo tem
//    pincel   — precisa de máscara? (abre em tela grande)
//
//  O rótulo do campo de texto é sempre "O que você quer fazer" (`ed_oque` no
//  plugin) — exceto onde o plugin usa outro.
const MODOS = [
  {
    id: 'edicao',
    nome: 'Edição',
    desc: 'Adicionar, trocar ou remover elementos, mudar cor ou material.',
    refs: true,
    campo: 'O que você quer fazer',
    ph: 'Ex: remova a luminária do teto, troque a poltrona pela @img01, deixe a parede em verde escuro...'
  },
  {
    id: 'ambientacao',
    nome: 'Ambientação',
    desc: 'Inserir mobiliário e decoração em um espaço vazio.',
    refs: true,
    campo: 'O que você quer fazer',
    ph: 'Ex: sala de estar contemporânea seguindo a @img01, com sofá, mesa de centro e tapete...'
  },
  {
    id: 'mood',
    nome: 'Mudar mood',
    desc: 'Trocar atmosfera e iluminação mantendo o projeto.',
    refs: false,
    campo: 'Descreva o novo mood / iluminação',
    ph: 'Ex: golden hour, luz quente entrando pela janela, clima aconchegante. Ou: dia nublado com luz difusa e fria.',
    campos: [
      { chave: 'tipoAmb', rotulo: 'Ambiente', opcoes: ['Interior', 'Exterior'], padrao: 'Interior' }
    ]
  },
  {
    id: 'pessoa',
    nome: 'Adicionar pessoa/animal',
    desc: 'Inserir figura humana ou animal com escala e luz coerentes.',
    refs: true,
    campo: 'Descreva a figura',
    ph: 'Ex: mulher ~30 anos, cabelo castanho, vestido claro, sentada no sofá lendo. Ou siga a @img01.',
    campos: [
      { chave: 'tipoFig', rotulo: 'O que inserir',
        opcoes: ['Pessoa', 'Animal', 'Pessoa + Animal'], padrao: 'Pessoa' },
      { chave: 'estilo', rotulo: 'Estilo de presença',
        opcoes: ['Estática (nítida)', 'Editorial (leve motion blur)'], padrao: 'Estática (nítida)' }
    ]
  },
  {
    id: 'derivadas',
    nome: 'Close-ups',
    desc: 'Closes, detalhes e novos enquadramentos da mesma imagem.',
    refs: false,
    campo: 'O que destacar',
    semTexto: true,   // gera mesmo sem texto
    ph: 'Ex: close da poltrona de couro, detalhe da luz na parede, vista de cima da mesa de jantar... (deixe vazio para a IA escolher os melhores ângulos)'
  },
  {
    id: 'maquete',
    nome: 'Maquete física',
    desc: 'Transformar o projeto em uma maquete física.',
    refs: false,
    campo: 'Detalhes',
    semTexto: true,
    ph: 'Ex: materiais — papel kraft, MDF cru, madeira balsa, acrílico transparente, concreto aparente; cor predominante; detalhes da base...',
    campos: [
      { chave: 'linguagem', rotulo: 'Linguagem da maquete',
        opcoes: ['Realista (cores e materiais)', 'Monocromática / conceitual'],
        padrao: 'Realista (cores e materiais)' },
      { chave: 'base', rotulo: 'Base / contexto', chips: true,
        opcoes: ['Mesa de arquitetura', 'Mesa limpa', 'Totem', 'Estúdio'],
        padrao: 'Mesa de arquitetura' }
    ]
  },
  {
    id: 'preenchimento',
    nome: 'Preenchimento generativo',
    desc: 'Corrigir falhas e remover objetos com precisão na área marcada.',
    pincel: true
  },
  {
    id: 'expansao',
    nome: 'Expansão generativa',
    desc: 'Esticar a imagem para fora e mudar a proporção.',
    pincel: true
  }
];

export default function PainelEditar({
  imagemInicial, onPronto, onProgresso, ocupado, setOcupado,
  ferramentas, ehAdmin, onAbrirPincel
}) {
  const [base, setBase]     = useState(null);
  const [previa, setPrevia] = useState(null);
  const [modo, setModo]     = useState(null);   // null = mostra a grade

  const [texto, setTexto]   = useState('');
  const [refs, setRefs]     = useState([]);
  const [escolhas, setEsc]  = useState({});     // os botões de cada modo
  const [erro, setErro]     = useState('');

  // A barra de gerar — igual à do Render e à do Batch
  const [quantidade, setQuantidade] = useState(1);
  const [proporcao, setProporcao]   = useState('auto');
  const [resolucao, setResolucao]   = useState('2k');
  const [popRatio, setPopRatio]     = useState(false);
  const [popRes, setPopRes]         = useState(false);

  const [picker, setPicker] = useState(null);   // 'base' | 'ref' | null

  useEffect(() => {
    if (!imagemInicial) return;
    setBase(imagemInicial.base64);
    setPrevia(imagemInicial.previa);
  }, [imagemInicial]);

  // Fecha os popovers ao clicar fora
  useEffect(() => {
    if (!popRatio && !popRes) return;
    const fechar = () => { setPopRatio(false); setPopRes(false); };
    window.addEventListener('click', fechar);
    return () => window.removeEventListener('click', fechar);
  }, [popRatio, popRes]);

  const m = MODOS.find((x) => x.id === modo);

  // Quem pode usar o pincel? Não perguntamos o NOME do plano — perguntamos se
  // a conta tem a ferramenta. É o mesmo critério do servidor.
  const temPincel = ehAdmin
    || (ferramentas || []).includes('preenchimento')
    || (ferramentas || []).includes('expansao');

  function escolheuImagem({ base64, previa: p }) {
    if (picker === 'ref') {
      if (refs.length < MAX_REFS) setRefs((r) => [...r, { base64, previa: p }]);
    } else {
      setBase(base64);
      setPrevia(p);
    }
    setPicker(null);
  }

  function abrir(mod) {
    if (mod.pincel && !temPincel) return;
    if (!base) { setErro('Escolha a imagem para editar'); return; }

    setErro('');
    setTexto('');
    setRefs([]);

    // Cada modo abre com os padrões dele já marcados
    const iniciais = {};
    (mod.campos || []).forEach((c) => { iniciais[c.chave] = c.padrao; });
    setEsc(iniciais);

    if (mod.pincel) {
      onAbrirPincel({ modo: mod.id, base, previa });
      return;
    }

    setModo(mod.id);
  }

  async function gerar() {
    if (!base || !m) return;

    if (!m.semTexto && !texto.trim()) {
      setErro('Descreva o que você quer');
      return;
    }

    setErro('');
    setOcupado(true);

    onProgresso({
      feito: 0, total: quantidade, estado: 'processando', proporcao,
      base: previa
    });

    try {
      // As escolhas dos botões entram no texto: o servidor recebe uma
      // instrução só, e o promptador dele sabe o que fazer com ela.
      const extras = Object.entries(escolhas)
        .map(([k, v]) => v)
        .filter(Boolean)
        .join('. ');

      const completo = [extras, texto.trim()].filter(Boolean).join('. ');

      const r = await editarImagem({
        modo,
        imagem: base,
        texto: completo,
        referencias: refs.map((x) => ({ base64: x.base64, mimeType: 'image/png' })),
        quantidade,
        proporcao,
        resolucao
      });

      onPronto(r);
      setModo(null);

    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
      onProgresso(null);
    }
  }

  const custo = custoEditar(resolucao) * quantidade;

  return (
    <>
      <div className="cr-form">

        {/* ── A imagem base ──
            Uma só, para todos os modos — como no plugin. */}
        <div className="cr-sec">Imagem base</div>

        <div className="cr-refs">
          {previa ? (
            <div className="cr-ref">
              <img src={previa} alt="" />
              <button
                className="cr-ref-x"
                onClick={() => { setBase(null); setPrevia(null); setModo(null); }}
                aria-label="Remover imagem base"
              >×</button>
            </div>
          ) : (
            <button className="cr-ref cr-ref--add" onClick={() => setPicker('base')}>
              <span className="cr-ref-mais">+</span>
            </button>
          )}
        </div>

        <p className="cr-hint">Escolhida uma vez. Vale para todos os modos.</p>

        {/* ── A grade dos oito modos ── */}
        {!modo && (
          <>
            <div className="cr-sec">O que fazer</div>

            <div className="ed-cards">
              {MODOS.map((mod) => {
                const travado = mod.pincel && !temPincel;

                return (
                  <button
                    key={mod.id}
                    className={'ed-card' + (travado ? ' ed-card--travado' : '')}
                    onClick={() => abrir(mod)}
                    disabled={ocupado}
                  >
                    {travado && (
                      <span className="ed-cad" data-tip="Disponível no Pro e no Studio">
                        <svg viewBox="0 0 16 16" width="10" height="10" fill="none"
                             stroke="currentColor" strokeWidth="1.6">
                          <rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/>
                          <path d="M5.5 7V5a2.5 2.5 0 015 0v2" strokeLinecap="round"/>
                        </svg>
                      </span>
                    )}

                    <strong>{mod.nome}</strong>
                    <span>{mod.desc}</span>
                  </button>
                );
              })}
            </div>

            {erro && <div className="cr-erro">{erro}</div>}
          </>
        )}

        {/* ── Um modo aberto ── */}
        {m && (
          <>
            {/* O mesmo botão do Batch — descolado da imagem base */}
            <button className="cr-voltar ed-voltar" onClick={() => setModo(null)}>
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                   stroke="currentColor" strokeWidth="1.6">
                <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar
            </button>

            <div className="ed-titulo">
              <strong>{m.nome}</strong>
              <span>{m.desc}</span>
            </div>

            {/* ── Os botões de escolha deste modo ── */}
            {(m.campos || []).map((c) => (
              <div key={c.chave}>
                <div className="cr-sec">{c.rotulo}</div>
                <div className={c.chips ? 'cr-chips' : 'cr-g2'}>
                  {c.opcoes.map((o) => (
                    <button
                      key={o}
                      className={(c.chips ? 'cr-chip' : 'cr-b')
                        + (escolhas[c.chave] === o ? (c.chips ? ' cr-chip--on' : ' cr-b--on') : '')}
                      onClick={() => setEsc((e) => ({ ...e, [c.chave]: o }))}
                    >{o}</button>
                  ))}
                </div>
              </div>
            ))}

            {/* As referências vêm ANTES do texto: é preciso tê-las para poder
                escrever @img01 apontando para elas. */}
            {m.refs && (
              <>
                <div className="cr-sec">
                  Referências <span className="cr-opc">Opcional</span>
                </div>
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
              </>
            )}

            <div className="cr-sec">{m.campo}</div>

            {m.refs ? (
              <CampoRefs
                className="cr-ta"
                placeholder={m.ph}
                valor={texto}
                onMudar={setTexto}
                refs={refs}
              />
            ) : (
              <textarea
                className="cr-ta"
                rows={4}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={m.ph}
                spellCheck={false}
              />
            )}

            {erro && <div className="cr-erro">{erro}</div>}
          </>
        )}
      </div>

      {/* ── A barra de gerar ──
          A MESMA do Render e do Batch: quantidade, proporção, resolução.
          Só aparece com um modo aberto — na grade não há o que gerar. */}
      {m && (
        <div className="cr-barra-ger">
          <div className="cr-pills-cfg">

            <div className="cr-qty">
              <button onClick={() => setQuantidade((q) => Math.max(1, q - 1))} aria-label="Menos uma">−</button>
              <span>{quantidade}</span>
              <button onClick={() => setQuantidade((q) => Math.min(10, q + 1))} aria-label="Mais uma">+</button>
            </div>

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

          <button className="cr-btn-gerar" onClick={gerar} disabled={ocupado || !base}>
            <span>{ocupado ? 'Gerando...' : 'Gerar'}</span>
            {!ocupado && base && (
              <span className="cr-custo-tag">
                <IconeCredito /> {custo}
              </span>
            )}
          </button>

          <p className="cr-custo">
            {custo} créditos · {quantidade} {quantidade === 1 ? 'imagem' : 'imagens'}
          </p>
        </div>
      )}

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheuImagem}
        titulo={picker === 'ref' ? 'Adicionar referência' : 'Imagem para editar'}
      />
    </>
  );
}
