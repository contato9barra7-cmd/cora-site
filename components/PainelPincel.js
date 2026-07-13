'use client';

// ═══════════════════════════════════════════════════════════
//  PainelPincel — os controles do preenchimento e da expansão
//
//  Tudo mora aqui, no painel esquerdo, onde a pessoa já procura os controles
//  das outras abas. Sobre a imagem eles comiam o espaço do trabalho.
// ═══════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import IconeCredito from './IconeCredito';
import Seta from './Seta';
import { custoGenerativa } from '../lib/render';

const TEXTOS = {
  preenchimento: {
    nome: 'Preenchimento generativo',
    desc: 'Pinte sobre a área que quer corrigir, remover ou regenerar. O resto é preservado.',
    campo: 'O que fazer na área marcada',
    ph: 'Ex: remover o objeto e continuar a parede; corrigir essa falha; trocar por piso de madeira...'
  },
  expansao: {
    nome: 'Expansão generativa',
    desc: 'Arraste as bordas da moldura para fora. A área nova é o que a IA vai criar.',
    campo: 'Detalhes (opcional)',
    ph: 'Ex: continuar o jardim e o céu; estender o piso...'
  }
};

// As mesmas do plugin
const RATIOS = [
  ['livre', 'Livre'],
  ['1:1',   '1:1'],
  ['16:9',  '16:9'],
  ['9:16',  '9:16'],
  ['4:3',   '4:3'],
  ['3:4',   '3:4'],
  ['3:2',   '3:2'],
  ['2:3',   '2:3'],
  ['21:9',  '21:9'],
  ['5:7',   '5:7'],
  ['4:5',   '4:5']
];

export default function PainelPincel({
  modo, ocupado, onVoltar, onGerar,
  ferramenta, setFerramenta,
  tamanho, setTamanho,
  proporcao, setProporcao,
  medidas,                       // {w, h} da moldura, vindas da tela
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

  const rotuloRatio = (RATIOS.find((r) => r[0] === proporcao) || RATIOS[0])[1];

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

      {/* ── Expansão: proporção e medidas ── */}
      {ehExpansao && (
        <>
          <div className="cr-sec">Proporção</div>
          <div className="cr-pill-wrap">
            <button
              className="cr-pill cr-pill--larga"
              onClick={() => setPop((v) => !v)}
            >
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="14" height="10" rx="1.5"/>
              </svg>
              {rotuloRatio}
              <Seta aberto={pop} />
            </button>

            {pop && (
              <div className="cr-pop cr-pop--ratios">
                {RATIOS.map(([val, rot]) => (
                  <button
                    key={val}
                    className={'cr-pop-op' + (proporcao === val ? ' cr-pop-op--on' : '')}
                    onClick={() => { setProporcao(val); setPop(false); }}
                  >{rot}</button>
                ))}
              </div>
            )}
          </div>

          {/* As dimensões que vão sair. Não editáveis: quem manda é a moldura,
              e dois lugares mandando na mesma coisa divergem. */}
          {medidas?.w > 0 && (
            <div className="pn-medidas">
              <span>{medidas.w}</span>
              <em>×</em>
              <span>{medidas.h}</span>
              <b>px</b>
            </div>
          )}
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

      <div className="pn-acoes">
        <button
          className="pn-limpar"
          onClick={() => limpar?.current?.()}
          disabled={ocupado}
        >
          {ehExpansao ? 'Resetar' : 'Limpar'}
        </button>

        <button className="cr-btn-gerar" onClick={gerar} disabled={ocupado}>
          <span>{ocupado ? 'Gerando...' : 'Gerar'}</span>
          {!ocupado && (
            <span className="cr-custo-tag">
              <IconeCredito /> {custoGenerativa()}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
