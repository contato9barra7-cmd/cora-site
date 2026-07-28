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
import { useIdioma } from '../lib/i18n';

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
  rw, rh,                        // o que está ESCRITO nos campos (texto livre)
  aoDigitarRazao,                // os campos mandam de volta
  aoInverter,
  limpar                         // a tela expõe o "limpar"
}) {
  const { t } = useIdioma();
  const [texto, setTexto] = useState('');
  const [erro, setErro]   = useState('');
  const [pop, setPop]     = useState(false);

  const ehExpansao = modo === 'expansao';
  const txt = ehExpansao
    ? {
        nome:  t('painelpincel_exp_nome'),
        desc:  t('painelpincel_exp_desc'),
        campo: t('painelpincel_exp_campo'),
        ph:    t('painelpincel_exp_ph')
      }
    : {
        nome:  t('painelpincel_pre_nome'),
        desc:  t('painelpincel_pre_desc'),
        campo: t('painelpincel_pre_campo'),
        ph:    t('painelpincel_pre_ph')
      };

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
        {t('painelpincel_voltar')}
      </button>

      <div className="ed-titulo">
        <strong>{txt.nome}</strong>
        <span>{txt.desc}</span>
      </div>

      {/* ── Preenchimento: pincel, borracha, calibre ── */}
      {!ehExpansao && (
        <>
          {/* Barra única (estilo "Opção C"): ferramentas em ícone, divisor,
              calibre inline com o valor, e Limpar no fim. */}
          <div className="pn-bar">
            <button
              className={'pn-ico' + (ferramenta === 'pincel' ? ' pn-ico--on' : '')}
              onClick={() => setFerramenta('pincel')}
              title={t('painelpincel_pincel')} aria-label={t('painelpincel_pincel')}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                   strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 5.5l3 3M14 7L5 16c-.5.5-.8 1.2-.9 1.9L3.5 20.5l2.6-.6c.7-.1 1.4-.4 1.9-.9L17 10z"/>
              </svg>
            </button>
            <button
              className={'pn-ico' + (ferramenta === 'borracha' ? ' pn-ico--on' : '')}
              onClick={() => setFerramenta('borracha')}
              title={t('painelpincel_borracha')} aria-label={t('painelpincel_borracha')}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                   strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 20H5l-2-2a2 2 0 010-2.8l8.5-8.5a2 2 0 012.8 0l4 4a2 2 0 010 2.8L14 20z"/>
                <path d="M8 20l8-8"/>
              </svg>
            </button>

            <span className="pn-sep" />

            <input
              className="pn-bar-range"
              type="range" min="8" max="90" value={tamanho}
              onChange={(e) => setTamanho(+e.target.value)}
              aria-label={t('painelpincel_tamanho')}
            />
            <span className="pn-chip">{tamanho}</span>

            <span className="pn-sep" />

            <button
              className="pn-ico"
              onClick={() => limpar?.current?.()}
              disabled={ocupado}
              title={t('painelpincel_limpar')} aria-label={t('painelpincel_limpar')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                   strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M9 7V5h6v2M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12"/>
              </svg>
            </button>
          </div>
        </>
      )}

      {/* ── Expansão: proporção, medidas, inverter, limpar ── */}
      {ehExpansao && (
        <>
          <div className="cr-sec">{t('painelpincel_proporcao')}</div>

          {/* O mesmo dropdown das outras abas (cr-pill-cfg + cr-pop) */}
          <div className="cr-pill-wrap">
            <button
              className={'cr-pill-cfg cr-pill-cfg--larga' + (pop ? ' cr-pill-cfg--on' : '')}
              onClick={(e) => { e.stopPropagation(); setPop((v) => !v); }}
            >
              {/* O mesmo SVG do plugin (#pill-ratio-icon). O desenho nunca foi
                  o problema: era o pill sem padding lateral. */}
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                <rect x="1" y="5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="6" y="2" width="9" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>{proporcao === 'livre' ? t('painelpincel_livre') : proporcao}</span>
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
                      <span>{p.val === 'livre' ? t('painelpincel_livre') : p.val}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Como no plugin (edExpNumInput): os dois campos SÃO a razão.
              Digitar 4 e 5 dá 4:5; digitar 2 e 1 dá 2:1. O que é digitado fica
              — nada recalcula por cima, que era o que impedia de editá-los. */}
          <div className="pn-medidas">
            <input
              type="text"
              inputMode="numeric"
              value={rw ?? ''}
              onChange={(e) => aoDigitarRazao?.('w', e.target.value)}
              placeholder={t('painelpincel_ph_largura')}
            />

            <button
              className="pn-inverter"
              onClick={() => aoInverter?.()}
              title={t('painelpincel_inverter')}
              aria-label={t('painelpincel_inverter_aria')}
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
              value={rh ?? ''}
              onChange={(e) => aoDigitarRazao?.('h', e.target.value)}
              placeholder={t('painelpincel_ph_altura')}
            />
          </div>

          <button
            className="pn-limpar-larga"
            onClick={() => limpar?.current?.()}
            disabled={ocupado}
          >
            {t('painelpincel_limpar')}
          </button>
        </>
      )}

      <div className="cr-sec">{txt.campo}</div>
      <textarea
        className="cr-ta ed-ta"
        rows={ehExpansao ? 3 : 4}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={txt.ph}
        spellCheck={false}
      />

      {erro && <div className="cr-erro">{erro}</div>}

      {/* O Gerar fica SOZINHO, como no Render e no Batch. O custo aparece só
          no hover (.cr-custo-tag) — não polui o botão em repouso. */}
      <button className="cr-btn-gerar" onClick={gerar} disabled={ocupado}>
        <span>{ocupado ? t('painelpincel_gerando') : t('painelpincel_gerar')}</span>
        {!ocupado && (
          <span className="cr-custo-tag">
            <IconeCredito /> {custoGenerativa()}
          </span>
        )}
      </button>

    </div>
  );
}
