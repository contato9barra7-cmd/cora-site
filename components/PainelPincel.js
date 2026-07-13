'use client';

// ═══════════════════════════════════════════════════════════
//  PainelPincel — os controles do preenchimento e da expansão
//
//  Fica no painel esquerdo enquanto a tela do pincel ocupa o feed. Os
//  controles ficam onde a pessoa já os procura; a imagem ganha o espaço.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import IconeCredito from './IconeCredito';
import { custoGenerativa, RESOLUCOES } from '../lib/render';

const TEXTOS = {
  preenchimento: {
    nome: 'Preenchimento generativo',
    desc: 'Corrigir falhas e remover objetos com precisão na área marcada.',
    campo: 'O que fazer na área marcada',
    ph: 'Ex: remover o objeto e continuar a parede; corrigir essa falha; trocar por piso de madeira...'
  },
  expansao: {
    nome: 'Expansão generativa',
    desc: 'Esticar a imagem para fora e mudar a proporção.',
    campo: 'O que você quer fazer',
    ph: 'Ex: continuar o jardim e o céu; estender o piso...'
  }
};

export default function PainelPincel({ modo, ocupado, onVoltar, onGerar }) {
  const [texto, setTexto]   = useState('');
  const [resolucao, setRes] = useState('2k');
  const [erro, setErro]     = useState('');

  const t = TEXTOS[modo] || TEXTOS.preenchimento;

  async function gerar() {
    setErro('');
    try {
      await onGerar({ modo, texto: texto.trim(), resolucao });
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

      <div className="cr-sec">{t.campo}</div>
      <textarea
        className="cr-ta ed-ta"
        rows={5}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t.ph}
        spellCheck={false}
      />

      <div className="cr-sec">Resolução</div>
      <div className="cr-chips">
        {RESOLUCOES.map((r) => (
          <button
            key={r.val}
            className={'cr-chip' + (resolucao === r.val ? ' cr-chip--on' : '')}
            onClick={() => setRes(r.val)}
          >{r.rotulo}</button>
        ))}
      </div>

      {erro && <div className="cr-erro">{erro}</div>}

      <button className="cr-btn-gerar" onClick={gerar} disabled={ocupado}>
        <span>{ocupado ? 'Gerando...' : 'Gerar'}</span>
        {!ocupado && (
          <span className="cr-custo-tag">
            <IconeCredito /> {custoGenerativa(resolucao)}
          </span>
        )}
      </button>
    </div>
  );
}
