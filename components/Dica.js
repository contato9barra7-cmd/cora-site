'use client';

// ═══════════════════════════════════════════════════════════
//  Dica — o tooltip que não é cortado
//
//  O `[data-tip]` de CSS puro (um ::after posicionado por dentro) morre em
//  qualquer ancestral com `overflow: hidden`. E há um: o `.cr-tela`, que
//  segura o app inteiro. Não adianta mexer na barra — quem corta está acima
//  dela, e nenhum z-index atravessa um recorte.
//
//  A única saída é o tooltip NÃO estar dentro de ninguém: `position: fixed`,
//  ancorado no viewport. Isso exige medir o botão no hover — e por isso isto é
//  um componente, não uma regra de CSS.
// ═══════════════════════════════════════════════════════════

import { useState, useRef, cloneElement } from 'react';
import { createPortal } from 'react-dom';

export default function Dica({ texto, children, lado = 'baixo' }) {
  const [caixa, setCaixa] = useState(null);
  const alvo = useRef(null);

  function entrar() {
    const el = alvo.current;
    if (!el || !texto) return;

    const r = el.getBoundingClientRect();
    setCaixa({
      x: r.left + r.width / 2,
      y: lado === 'cima' ? r.top - 8 : r.bottom + 8
    });
  }

  const sair = () => setCaixa(null);

  return (
    <>
      {cloneElement(children, {
        ref: alvo,
        onMouseEnter: entrar,
        onMouseLeave: sair,
        // Sair no clique também: com o botão apertado, a dica sobrando na tela
        // fica parecendo um resto de tela que não sumiu.
        onClick: (e) => {
          sair();
          if (children.props.onClick) children.props.onClick(e);
        }
      })}

      {caixa && typeof document !== 'undefined' && createPortal(
        <div
          className="cr-dica"
          style={{
            left: caixa.x,
            top: caixa.y,
            transform: lado === 'cima'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)'
          }}
          role="tooltip"
        >{texto}</div>,
        document.body
      )}
    </>
  );
}
