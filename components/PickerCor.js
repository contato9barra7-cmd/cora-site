'use client';

// ═══════════════════════════════════════════════════════════
//  O seletor de cor do "Outro", na luz artificial
//
//  Duas abas, porque são dois problemas diferentes. BRANCO é escolher a
//  temperatura de uma luminária, e ali a régua de Kelvin é o controle
//  certo: o gradiente dela É a escala, e a pessoa arrasta até a cor sem
//  precisar saber que 2700 é amarelo. COLORIDA é fita de LED, neon, luz
//  de festa. Ali não existe Kelvin nenhum, e o que serve é o quadro de cor
//  de sempre: a régua de matiz escolhe a família, o quadro escolhe quanto
//  de cor e quanto de luz.
//
//  O hex fica embaixo dos dois e vale para os dois, porque quem já tem o
//  código da fita não quer caçar o tom no quadro.
//
//  A peça não guarda nada: recebe `valor` e devolve `onMudar(valor novo)`.
//  Quem guarda é o painel, junto com o resto do rascunho, e é o painel que
//  transforma isso em prompt.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useIdioma } from '../lib/i18n';

// Kelvin vira RGB pela aproximação do Tanner Helland, que é a que se usa
// para desenhar régua de temperatura. Ela erra alguns pontos nas pontas, e
// para escolher a cor de uma luminária isso não muda nada.
function kelvinParaRgb(k) {
  const x = k / 100;
  let r, g, b;
  if (x <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(x) - 161.1195681661;
    b = x <= 19 ? 0 : 138.5177312231 * Math.log(x - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(x - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(x - 60, -0.0755148492);
    b = 255;
  }
  return [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))));
}

function hsvParaRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return t.map((n) => Math.round((n + m) * 255));
}

function paraHex(rgb) {
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// A nota da temperatura sai como CHAVE, e não como texto: o rascunho fica
// salvo, e quem trocar de idioma depois lê a nota no idioma novo.
function chaveDaTemp(k) {
  if (k < 2400) return 'pickercor_muito_quente';
  if (k < 3200) return 'pickercor_quente';
  if (k < 4600) return 'pickercor_neutro';
  if (k < 5600) return 'pickercor_frio';
  return 'pickercor_dia';
}

// O prompt vai em português, seja qual for o idioma da tela: é o formato que
// o promptador espera. Esta tabela é a do prompt, e não a da interface.
const NOTA_PT = {
  pickercor_muito_quente: 'muito quente',
  pickercor_quente: 'quente',
  pickercor_neutro: 'branco neutro',
  pickercor_frio: 'branco frio',
  pickercor_dia: 'luz do dia',
  pickercor_livre: 'cor livre'
};
export const notaPt = (chave) => NOTA_PT[chave] || '';

// O valor com que o "Outro" nasce: 4200K, um branco neutro.
export const COR_OUTRA_INICIAL = {
  modo: 'branco', kelvin: 4200, h: 30, s: 1, v: 1,
  hex: paraHex(kelvinParaRgb(4200)), rotulo: '4200K', notaChave: 'pickercor_neutro'
};

const trava = (n) => Math.max(0, Math.min(1, n));

export default function PickerCor({ valor, onMudar }) {
  const { t } = useIdioma();
  const v = { ...COR_OUTRA_INICIAL, ...(valor || {}) };
  const quadro = useRef(null);

  // O campo do hex é livre enquanto se digita: só vira cor quando fecha um
  // código válido. Sem o estado local, cada tecla reescreveria o campo.
  const [txt, setTxt] = useState(v.hex);
  useEffect(() => { setTxt(v.hex); }, [v.hex]);

  function doKelvin(k) {
    onMudar({ ...v, modo: 'branco', kelvin: k, hex: paraHex(kelvinParaRgb(k)),
              rotulo: k + 'K', notaChave: chaveDaTemp(k) });
  }
  function daCor(h, s, vv) {
    const hex = paraHex(hsvParaRgb(h, s, vv));
    onMudar({ ...v, modo: 'colorida', h, s, v: vv, hex, rotulo: hex, notaChave: 'pickercor_livre' });
  }
  function trocaModo(m) {
    if (m === v.modo) return;
    if (m === 'branco') doKelvin(v.kelvin); else daCor(v.h, v.s, v.v);
  }
  const arrastando = useRef(false);

  // O quadro segue o dedo e o mouse. `setPointerCapture` é o que faz o
  // arraste continuar valendo quando o ponteiro sai da caixinha.
  function noQuadro(e) {
    if (!quadro.current) return;
    const r = quadro.current.getBoundingClientRect();
    daCor(v.h, trava((e.clientX - r.left) / r.width), trava(1 - (e.clientY - r.top) / r.height));
  }
  function doHex(texto) {
    setTxt(texto);
    const m = /^#?([0-9a-f]{6})$/i.exec(texto.trim());
    if (!m) return;
    const hex = '#' + m[1].toUpperCase();
    onMudar({ ...v, modo: 'colorida', hex, rotulo: hex, notaChave: 'pickercor_livre' });
  }

  const branco = v.modo === 'branco';

  return (
    <div className="cor">
      <div className="cor__topo">
        <span className="cor__bola" style={{ background: v.hex }} />
        <span className="cor__k">
          {branco ? v.kelvin : v.hex}{branco && 'K'}{' '}
          <small>· {t(v.notaChave)}</small>
        </span>
      </div>

      <div className="cor__abas" role="tablist">
        <button type="button" className="cor__aba" role="tab" aria-checked={branco}
                onClick={() => trocaModo('branco')}>{t('pickercor_branco')}</button>
        <button type="button" className="cor__aba" role="tab" aria-checked={!branco}
                onClick={() => trocaModo('colorida')}>{t('pickercor_colorida')}</button>
      </div>

      <div className="cor__painel" hidden={!branco}>
        <input className="cor__regua cor__regua--k" type="range" min="1800" max="6500" step="50"
               value={v.kelvin} onChange={(e) => doKelvin(+e.target.value)}
               aria-label={t('pickercor_kelvin_aria')} />
        <div className="cor__pes"><span>{t('pickercor_quente_pe')}</span><span>{t('pickercor_frio_pe')}</span></div>
      </div>

      <div className="cor__painel" hidden={branco}>
        <div
          className="cor__quadro" ref={quadro} tabIndex={0} role="application"
          aria-label={t('pickercor_quadro_aria')}
          style={{ background: paraHex(hsvParaRgb(v.h, 1, 1)), touchAction: 'none' }}
          onPointerDown={(e) => {
            arrastando.current = true;
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
            noQuadro(e);
          }}
          onPointerMove={(e) => {
            if (arrastando.current || e.buttons > 0) noQuadro(e);
          }}
          onPointerUp={(e) => {
            arrastando.current = false;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
          }}
          onPointerCancel={(e) => {
            arrastando.current = false;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
          }}
        >
          <span className="cor__alvo" style={{ left: (v.s * 100) + '%', top: ((1 - v.v) * 100) + '%' }} />
        </div>
        <input className="cor__regua cor__regua--h" type="range" min="0" max="360" step="1"
               value={v.h} onChange={(e) => daCor(+e.target.value, v.s, v.v)}
               aria-label={t('pickercor_matiz_aria')} />
      </div>

      <div className="cor__hex">
        <span className="cor__rot">{t('pickercor_ou')}</span>
        <input className="cor__campo" value={txt} spellCheck={false}
               onChange={(e) => doHex(e.target.value)} aria-label={t('pickercor_hex_aria')} />
      </div>
    </div>
  );
}
