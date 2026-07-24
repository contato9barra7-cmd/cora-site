'use client';

// ═══════════════════════════════════════════════════════════
//  LoginSplit — moldura das telas de conta (entrar, criar conta,
//  recuperar senha, verificar e-mail).
//
//  Desktop: painel visual a esquerda (carrossel + frase), formulario
//           a direita. So o lado direito rola.
//  Mobile:  o painel some e volta o card centralizado de sempre.
//
//  PARA TROCAR AS ARTES: edite a lista SLIDES abaixo e ponha os
//  arquivos em /public/img/. Cada slide tem imagem + as chaves de
//  traducao da frase. O layout nao muda.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useIdioma } from '../lib/i18n';

const SLIDES = [
  { img: '/img/login-hero.jpg',   frase: 'login_visual_frase',   sub: 'login_visual_sub' },
  { img: '/img/login-hero-2.jpg', frase: 'login_visual_frase_2', sub: 'login_visual_sub_2' },
];

const INTERVALO = 6000;

export default function LoginSplit({ children }) {
  const { t } = useIdioma();
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || SLIDES.length < 2) return;
    const id = setInterval(() => {
      setAtual((i) => (i + 1) % SLIDES.length);
    }, INTERVALO);
    return () => clearInterval(id);
  }, [pausado]);

  // Respeita quem pediu menos movimento no sistema.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => setPausado(mq.matches);
    aplicar();
    if (mq.addEventListener) mq.addEventListener('change', aplicar);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', aplicar); };
  }, []);

  return (
    <div className="login-split">
      <div className="login-visual">
        {SLIDES.map((s, i) => (
          <div
            key={s.img}
            className={'login-visual-slide' + (i === atual ? ' login-visual-slide--on' : '')}
            style={{ backgroundImage: "url('" + s.img + "')" }}
            aria-hidden="true"
          />
        ))}
        <div className="login-visual-veu" aria-hidden="true" />

        <Link href="/" className="login-visual-logo">Cora Render</Link>

        <div className="login-visual-texto">
          <p className="login-visual-frase">{t(SLIDES[atual].frase)}</p>
          <p className="login-visual-sub">{t(SLIDES[atual].sub)}</p>

          {SLIDES.length > 1 && (
            <div className="login-visual-dots">
              {SLIDES.map((s, i) => (
                <button
                  key={s.img}
                  type="button"
                  className={'login-visual-dot' + (i === atual ? ' login-visual-dot--on' : '')}
                  onClick={() => setAtual(i)}
                  aria-label={'Imagem ' + (i + 1) + ' de ' + SLIDES.length}
                  aria-current={i === atual}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="login-form-lado">
        {children}
      </div>
    </div>
  );
}
