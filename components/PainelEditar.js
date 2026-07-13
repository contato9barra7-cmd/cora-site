'use client';

// ═══════════════════════════════════════════════════════════
//  PainelEditar — a aba Editar
//
//  Oito modos. Seis são formulários de texto; dois (preenchimento e
//  expansão) precisam de PINCEL, e por isso abrem numa tela grande — pintar
//  uma máscara num painel de 380px seria impossível.
//
//  A imagem base é UMA SÓ: escolhida uma vez, vale para todos os modos.
//  É assim no plugin, e quem usa os dois não deve ter que reaprender.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import PickerImagem from './PickerImagem';
import CampoRefs from './CampoRefs';
import IconeCredito from './IconeCredito';
import { editarImagem, custoEditar, RESOLUCOES, MAX_REFS } from '../lib/render';

// ── Os oito modos ──
//
//  Os textos vieram do plugin: quem usa os dois não deve reaprender nada.
//
//    refs     — aceita imagens de referência (@img01, @img02...)?
//    opcional — gera mesmo sem texto?
//    pincel   — precisa de máscara? (abre em tela grande)
const MODOS = [
  {
    id: 'edicao',
    nome: 'Edição',
    desc: 'Adicionar, trocar ou remover elementos, mudar cor ou material.',
    refs: true,
    campo: 'O que mudar',
    ph: 'Ex: remova a luminária do teto, troque a poltrona pela @img01, deixe a parede em cimento queimado...'
  },
  {
    id: 'ambientacao',
    nome: 'Ambientação',
    desc: 'Inserir mobiliário e decoração em um espaço vazio.',
    refs: true,
    campo: 'O que colocar',
    ph: 'Ex: sala de estar contemporânea seguindo a @img01, com sofá, mesa de centro, tapete...'
  },
  {
    id: 'mood',
    nome: 'Mudar mood',
    desc: 'Trocar atmosfera e iluminação mantendo o projeto.',
    refs: false,
    campo: 'Descreva o novo mood / iluminação',
    ph: 'Ex: golden hour, luz quente entrando pela janela, clima aconchegante...'
  },
  {
    id: 'pessoa',
    nome: 'Adicionar pessoa/animal',
    desc: 'Inserir figura humana ou animal com escala e luz corretas.',
    refs: true,
    campo: 'Descreva a figura',
    ph: 'Ex: mulher ~30 anos, cabelo castanho, vestido claro, sentada no sofá lendo...'
  },
  {
    id: 'derivadas',
    nome: 'Close-ups',
    desc: 'Closes, detalhes e novos enquadramentos da mesma imagem.',
    refs: false,
    campo: 'O que destacar',
    opcional: true,
    ph: 'Ex: close da poltrona de couro, detalhe da luz na parede, vista de cima...'
  },
  {
    id: 'maquete',
    nome: 'Maquete',
    desc: 'Transforma o render numa maquete física.',
    refs: false,
    campo: 'Detalhes',
    opcional: true,
    ph: 'Ex: materiais — papel kraft, MDF cru, madeira balsa, acrílico transparente...'
  },
  {
    id: 'preenchimento',
    nome: 'Preenchimento',
    desc: 'Pinte a área que quer trocar e descreva o que colocar.',
    pincel: true
  },
  {
    id: 'expansao',
    nome: 'Expansão',
    desc: 'Amplia a moldura da imagem, criando o que ficou de fora.',
    pincel: true
  }
];

export default function PainelEditar({
  imagemInicial, onPronto, onProgresso, ocupado, setOcupado,
  ferramentas, ehAdmin, onAbrirPincel
}) {
  const [base, setBase]     = useState(null);   // o base64 da imagem
  const [previa, setPrevia] = useState(null);
  const [modo, setModo]     = useState(null);   // null = mostra a grade

  const [texto, setTexto]   = useState('');
  const [refs, setRefs]     = useState([]);
  const [resolucao, setRes] = useState('2k');
  const [erro, setErro]     = useState('');

  const [picker, setPicker] = useState(null);   // 'base' | 'ref' | null

  // Uma imagem enviada de outra aba entra como base
  useEffect(() => {
    if (!imagemInicial) return;
    setBase(imagemInicial.base64);
    setPrevia(imagemInicial.previa);
  }, [imagemInicial]);

  const m = MODOS.find((x) => x.id === modo);

  // Quem pode usar o pincel? Não perguntamos o NOME do plano — perguntamos
  // se a conta tem a ferramenta. É o mesmo critério do servidor
  // (`contaPermite`), e não quebra se um plano novo aparecer.
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
    if (mod.pincel && !temPincel) return;        // o cadeado já explica
    if (!base) { setErro('Escolha a imagem para editar'); return; }

    setErro('');
    setTexto('');
    setRefs([]);

    // Os de pincel abrem numa tela GRANDE: pintar a máscara aqui seria
    // impossível. Quem monta essa tela é a página.
    if (mod.pincel) {
      onAbrirPincel({ modo: mod.id, base, previa });
      return;
    }

    setModo(mod.id);
  }

  async function gerar() {
    if (!base || !m) return;

    // Os modos "opcional" geram sem texto. Os outros, não.
    if (!m.opcional && !texto.trim()) {
      setErro('Descreva o que você quer');
      return;
    }

    setErro('');
    setOcupado(true);

    onProgresso({
      feito: 0, total: 1, estado: 'processando', proporcao: 'auto',
      base: previa            // a imagem base, desfocada no slot
    });

    try {
      const r = await editarImagem({
        modo,
        imagem: base,
        texto: texto.trim(),
        referencias: refs.map((x) => ({ base64: x.base64, mimeType: 'image/png' })),
        resolucao
      });

      onPronto(r);
      setModo(null);          // de volta à grade

    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
      onProgresso(null);
    }
  }

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

            {erro && <p className="cr-erro">{erro}</p>}
          </>
        )}

        {/* ── Um modo aberto ── */}
        {m && (
          <>
            <button className="ed-voltar" onClick={() => setModo(null)}>
              <svg viewBox="0 0 20 20" width="12" height="12" fill="none"
                   stroke="currentColor" strokeWidth="1.7">
                <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voltar
            </button>

            <div className="ed-titulo">
              <strong>{m.nome}</strong>
              <span>{m.desc}</span>
            </div>

            {/* As referências vêm ANTES do texto: é preciso ter as imagens
                para poder escrever @img01 apontando para elas. */}
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

            <div className="cr-sec">
              {m.campo}
              {m.opcional && <span className="cr-opc">Opcional</span>}
            </div>

            {/* Com refs, o campo entende @ — digitar abre a lista para clicar */}
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

            <div className="cr-sec">Resolução</div>
            <div className="cr-g3">
              {RESOLUCOES.map((r) => (
                <button
                  key={r.val}
                  className={'cr-b' + (resolucao === r.val ? ' cr-b--on' : '')}
                  onClick={() => setRes(r.val)}
                >{r.rotulo}</button>
              ))}
            </div>

            {erro && <p className="cr-erro">{erro}</p>}

            <button className="cr-btn-gerar" onClick={gerar} disabled={ocupado}>
              <span>{ocupado ? 'Gerando...' : 'Gerar'}</span>
              {!ocupado && (
                <span className="cr-custo-tag">
                  <IconeCredito /> {custoEditar(resolucao)}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheuImagem}
        titulo={picker === 'ref' ? 'Adicionar referência' : 'Imagem para editar'}
      />
    </>
  );
}
