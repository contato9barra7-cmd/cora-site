'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  SETA DE VOLTAR AO TOPO
//
//  Nasce escondida e só aparece depois que a pessoa desceu de verdade. Num
//  documento de três metros isso é a diferença entre rolar de volta e chegar
//  em um clique.
//
//  ── Por que o `bottom` vem daqui e não do CSS ──
//  A seta e o aviso de cookies moram no MESMO canto da tela. Sem tratar isso,
//  a seta nasce atrás do botão "Aceitar" e vira um clique perdido.
//
//  A primeira tentativa foi uma variável de CSS com o `bottom` num `calc`. Não
//  colou: o valor chegava na variável mas o `calc` resolvia pelo fallback, e a
//  seta ficava por cima do aviso. Como a conta depende de uma medida que só
//  existe em tempo de execução, ela é feita aqui e sai como estilo direto. Um
//  número só, sem cascata no meio, e dá para conferir medindo.
//
//  O aviso sai do DOM quando a pessoa escolhe (o CookieConsent devolve null),
//  então a seta desce sozinha. Medir em vez de chutar um número importa porque
//  no celular o aviso quebra em mais linhas e fica bem mais alto.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

const RESPIRO = 14;          // entre a seta e o aviso de cookies

export default function AoTopo({ apartir = 520, rotulo = 'Voltar ao topo' }) {
  const [ver, setVer] = useState(false);
  const [acima, setAcima] = useState(0);
  const [base, setBase] = useState(24);

  // Aparecer depois de descer. A conferência roda no mount também: a página
  // pode abrir já rolada, quando o link traz uma âncora de seção.
  useEffect(() => {
    const olhar = () => setVer(window.scrollY > apartir);
    olhar();
    const quadro = requestAnimationFrame(olhar);
    window.addEventListener('scroll', olhar, { passive: true });
    window.addEventListener('load', olhar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener('scroll', olhar);
      window.removeEventListener('load', olhar);
    };
  }, [apartir]);

  // Subir enquanto o aviso de cookies estiver na tela.
  useEffect(() => {
    const medir = () => {
      const barra = document.querySelector('.cookie-bar');
      setAcima(barra ? Math.round(barra.getBoundingClientRect().height) + RESPIRO : 0);
      setBase(window.innerWidth <= 640 ? 16 : 24);
    };
    medir();
    const olho = new MutationObserver(medir);
    olho.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', medir);
    return () => {
      olho.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  return (
    <button
      type="button"
      className="ao-topo"
      data-ver={ver ? 'true' : 'false'}
      style={{ bottom: base + acima + 'px' }}
      aria-label={rotulo}
      title={rotulo}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
