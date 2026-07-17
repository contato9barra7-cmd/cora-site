'use client';

// ═══════════════════════════════════════════════════════════
//  MenuCamada — o botão direito na camada
//
//  Os mesmos itens do plugin. Quem usa os dois não deveria ter que reaprender
//  onde as coisas estão.
//
//  O menu muda conforme o que está marcado: com uma camada só, ele oferece
//  Renomear e Rasterizar; com várias, oferece Agrupar e Duplicar selecionadas.
//  Mostrar "Renomear" para cinco camadas de uma vez não faria sentido.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function MenuCamada({ x, y, camada, quantas, emGrupo, aoEscolher, aoFechar }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });

  // Um menu que nasce colado na borda de baixo abriria para fora da tela e
  // metade dos itens ficaria inalcançável. Ele se vira para dentro.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    let nx = x;
    let ny = y;

    if (x + r.width  > window.innerWidth  - 8) nx = x - r.width;
    if (y + r.height > window.innerHeight - 8) ny = window.innerHeight - r.height - 8;

    setPos({ x: Math.max(8, nx), y: Math.max(8, ny) });
  }, [x, y]);

  useEffect(() => {
    const fecha = () => aoFechar();
    const tecla = (e) => { if (e.key === 'Escape') aoFechar(); };

    // Um quadro depois: sem isso, o próprio clique que ABRIU o menu já o
    // fecharia, e ele piscaria e sumiria.
    const t = setTimeout(() => {
      window.addEventListener('mousedown', fecha);
      window.addEventListener('keydown', tecla);
    }, 0);

    return () => {
      clearTimeout(t);
      window.removeEventListener('mousedown', fecha);
      window.removeEventListener('keydown', tecla);
    };
  }, [aoFechar]);

  const varias = quantas > 1;
  const ehGrupo = camada?.tipo === 'grupo';

  function It({ acao, children, perigo }) {
    return (
      <button
        className={'mc-it' + (perigo ? ' mc-it--perigo' : '')}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => { aoEscolher(acao); aoFechar(); }}
      >{children}</button>
    );
  }

  return createPortal(
    <div className="mc" ref={ref} style={{ left: pos.x, top: pos.y }}
         onContextMenu={(e) => e.preventDefault()}>

      {varias ? (
        <>
          <It acao="agrupar">Agrupar camadas</It>
          <It acao="duplicar-tudo">Duplicar selecionadas</It>
          <It acao="mesclar-copia">Mesclar em cópia</It>
          <It acao="nova-vazia">Nova camada vazia</It>
        </>
      ) : (
        <>
          <It acao="renomear">Renomear</It>

          {/* Um dos dois, nunca os dois. Uma camada é rasterizada OU é um objeto
              inteligente — oferecer "rasterizar" numa que já é rasterizada não
              faria nada, e é só ruído.

              A imagem nasce rasterizada. Converter em objeto inteligente guarda
              o pixel original: os Ajustes passam a ser reversíveis, e a camada
              pode ser escalada e voltar ao tamanho sem perder qualidade. */}
          {!ehGrupo && (
            camada?.smart
              ? <It acao="rasterizar">Rasterizar camada</It>
              : <It acao="smart">Converter em Objeto Inteligente</It>
          )}

          <span className="mc-sep" />

          {!ehGrupo && (
            <It acao="mascara">
              {camada?.mascara ? 'Remover máscara' : 'Adicionar máscara'}
            </It>
          )}
          {!ehGrupo && <It acao="duplicar">Duplicar camada</It>}

          {/* Só aparece se houver grupo de onde sair. Um item que não faz nada é
              pior que um item ausente: ele promete e não cumpre. */}
          {emGrupo && <It acao="tirar-grupo">Tirar do grupo</It>}

          <It acao="mesclar-copia">Mesclar em cópia (Ctrl+Alt+E)</It>
          <It acao="agrupar">Agrupar em novo grupo</It>
          <It acao="nova-vazia">Nova camada vazia</It>
        </>
      )}

      <span className="mc-sep" />
      <It acao="excluir" perigo>
        {varias ? 'Excluir selecionadas' : 'Excluir camada'}
      </It>
    </div>,
    document.body
  );
}
