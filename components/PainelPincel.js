'use client';

// ═══════════════════════════════════════════════════════════
//  PainelPincel — os controles do preenchimento e da expansão
//
//  Tudo mora aqui, no painel esquerdo, onde a pessoa já procura os controles
//  das outras abas. Sobre a imagem eles comiam o espaço do trabalho.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import IconeCredito from './IconeCredito';
import Seta from './Seta';
import { custoGenerativa, PROPORCOES } from '../lib/render';

const TEXTOS = {
  preenchimento: {
    nome: 'Preenchimento generativo',
    desc: 'Pinte sobre a área que quer corrigir, remover ou regenerar. O resto é preservado.',
    campo: 'O que fazer na área marcada',
    ph: 'Ex: remover o objeto e continuar a parede; corrigir essa falha; trocar por piso de madeira...'
  },
  expansao: {
    nome: 'Expansão generativa',
    desc: 'Arraste as bordas da moldura para fora. As bordas e o centro têm encaixe automático.',
    campo: 'Detalhes (opcional)',
    ph: 'Ex: continuar o jardim e o céu; estender o piso...'
  }
};

// A lista OFICIAL, a mesma que o Render usa. Duplicá-la aqui com coordenadas
// próprias foi o que fez os desenhos encostarem na borda do viewBox.
//
// No Render o primeiro item é 'auto' (a proporção da imagem de origem);
// aqui ele é 'livre' (a moldura não obedece a proporção nenhuma) — mesmo
// papel, nome diferente.
const RATIOS = PROPORCOES.map((p) =>
  p.val === 'auto' ? { ...p, val: 'livre' } : p
);

export default function PainelPincel({
  modo, ocupado, onVoltar, onGerar,
  ferramenta, setFerramenta,
  tamanho, setTamanho,
  proporcao, setProporcao,
  medidas,                       // {w, h} da moldura, vindas da tela
  aoDigitarMedida,               // os campos mandam de volta
  aoInverter,
  limpar                         // a tela expõe o "limpar"
}) {
  const [texto, setTexto] = useState('');
  const [erro, setErro]   = useState('');
  const [pop, setPop]     = useState(false);

  const t = TEXTOS[modo] || TEXTOS.preenchimento;
  const ehExpansao = modo === 'expansao';

  async function gerar() {
    setErro('');
    try {
      await onGerar({ modo, texto: texto.trim() });
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="cr-form">

      <button className="cr-voltar ed-voltar" onClick={onVoltar} disabled={ocupado}>
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
             stroke="currentColor" strokeWidth="1.6">
          <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Voltar
      </button>

      <div className="ed-titulo">
        <strong>{t.nome}</strong>
        <span>{t.desc}</span>
      </div>

      {/* ── Preenchimento: pincel, borracha, calibre ── */}
      {!ehExpansao && (
        <>
          <div className="cr-sec">Ferramenta</div>
          <div className="cr-chips">
            <button
              className={'cr-chip' + (ferramenta === 'pincel' ? ' cr-chip--on' : '')}
              onClick={() => setFerramenta('pincel')}
            >
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <path d="M6 14l8-8 2 2-8 8H6v-2z" strokeLinejoin="round"/>
                <path d="M4 18h12" strokeLinecap="round"/>
              </svg>
              Pincel
            </button>
            <button
              className={'cr-chip' + (ferramenta === 'borracha' ? ' cr-chip--on' : '')}
              onClick={() => setFerramenta('borracha')}
            >
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <path d="M8 15l-3-3 7-7 3 3-7 7z" strokeLinejoin="round"/>
                <path d="M5 15h10" strokeLinecap="round"/>
              </svg>
              Borracha
            </button>
          </div>

          <div className="pn-lbl">
            <span className="cr-sec">Tamanho</span>
            <em>{tamanho} px</em>
          </div>
          <div className="pn-calibre">
            <input
              type="range" min="8" max="90" value={tamanho}
              onChange={(e) => setTamanho(+e.target.value)}
            />
            {/* O disco mostra o calibre real: o número sozinho não diz nada */}
            <span
              className="pn-disco"
              style={{ width: Math.min(28, tamanho / 3.2) + 'px',
                       height: Math.min(28, tamanho / 3.2) + 'px' }}
            />
          </div>
        </>
      )}

      {/* ── Expansão: proporção, medidas, inverter, limpar ── */}
      {ehExpansao && (
        <>
          <div className="cr-sec">Proporção</div>

          {/* O mesmo dropdown das outras abas (cr-pill-cfg + cr-pop) */}
          <div className="cr-pill-wrap">
            <button
              className={'cr-pill-cfg cr-pill-cfg--larga' + (pop ? ' cr-pill-cfg--on' : '')}
              onClick={(e) => { e.stopPropagation(); setPop((v) => !v); }}
            >
              {/* Os retângulos ficavam em x=1 / y=2 num viewBox de 20 — quase
                  colados na borda, e o traço de 1.5 (centrado) transbordava.
                  Centralizados com folga real de cada lado. */}
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                <rect x="2.5" y="6" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="6.5" y="4" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>{proporcao === 'livre' ? 'Livre' : proporcao}</span>
              <Seta aberto={pop} />
            </button>

            {pop && (
              <div className="cr-pop" onClick={(e) => e.stopPropagation()}>
                <div className="cr-pop-grade">
                  {RATIOS.map((p) => (
                    <button
                      key={p.val}
                      className={'cr-pop-b' + (proporcao === p.val ? ' cr-pop-b--on' : '')}
                      onClick={() => { setProporcao(p.val); setPop(false); }}
                    >
                      {/* viewBox folgado: as coordenadas vão até a borda,
                          e o traço (1.5) é centrado — metade dele cairia fora. */}
                      <svg viewBox="-3 -3 34 34" fill="none">
                        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="1"
                              stroke="currentColor" strokeWidth="1.5"
                              strokeDasharray={p.val === 'livre' ? '3 2' : undefined}/>
                      </svg>
                      <span>{p.val === 'livre' ? 'Livre' : p.val}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* As dimensões: dá para arrastar a moldura OU digitar o número.
              Quem sabe o tamanho exato que quer não deveria ter de acertá-lo
              no olho. */}
          <div className="pn-medidas">
            <input
              type="text"
              inputMode="numeric"
              value={medidas?.w || ''}
              onChange={(e) => aoDigitarMedida?.('w', e.target.value)}
              placeholder="L"
            />

            <button
              className="pn-inverter"
              onClick={() => aoInverter?.()}
              title="Inverter"
              aria-label="Inverter largura e altura"
            >
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <path d="M4 7h12m0 0l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H4m0 0l3-3m-3 3l3 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <input
              type="text"
              inputMode="numeric"
              value={medidas?.h || ''}
              onChange={(e) => aoDigitarMedida?.('h', e.target.value)}
              placeholder="A"
            />
          </div>

          <button
            className="pn-limpar-larga"
            onClick={() => limpar?.current?.()}
            disabled={ocupado}
          >
            Limpar
          </button>
        </>
      )}

      <div className="cr-sec">{t.campo}</div>
      <textarea
        className="cr-ta ed-ta"
        rows={ehExpansao ? 3 : 4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t.ph}
        spellCheck={false}
      />

      {erro && <div className="cr-erro">{erro}</div>}

      {/* O Gerar fica SOZINHO, como no Render e no Batch. O custo aparece só
          no hover (.cr-custo-tag) — não polui o botão em repouso. */}
      <button className="cr-btn-gerar" onClick={gerar} disabled={ocupado}>
        <span>{ocupado ? 'Gerando...' : 'Gerar'}</span>
        {!ocupado && (
          <span className="cr-custo-tag">
            <IconeCredito /> {custoGenerativa()}
          </span>
        )}
      </button>

      {/* O Resetar vem depois, largo e discreto — igual ao do Render. */}
      {!ehExpansao && (
        <button
          className="cr-resetar"
          onClick={() => limpar?.current?.()}
          disabled={ocupado}
        >
          Limpar marcação
        </button>
      )}
    </div>
  );
}
