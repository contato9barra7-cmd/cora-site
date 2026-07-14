'use client';

// ═══════════════════════════════════════════════════════════
//  JanelaAtalhos — o mapa do teclado
//
//  Um editor de imagem sem atalhos é um editor lento: quem pinta não quer
//  soltar o mouse para caçar um botão. Mas atalho que ninguém conhece não
//  serve de nada — daí esta lista.
//
//  São os mesmos do plugin, e os mesmos do Photoshop onde faz sentido: a mão
//  de quem já edita não deveria ter que reaprender nada.
// ═══════════════════════════════════════════════════════════

const GRUPOS = [
  {
    nome: 'Ferramentas',
    itens: [
      ['V', 'Mover'],
      ['M', 'Letreiro (alterna retangular / elíptico)'],
      ['L', 'Laço (alterna livre / poligonal)'],
      ['W', 'Seleção inteligente (alterna rápida / varinha)'],
      ['B', 'Pincel'],
      ['E', 'Borracha'],
      ['C', 'Cortar'],
      ['X', 'Trocar a cor do pincel (branco / preto)']
    ]
  },
  {
    nome: 'Seleção',
    itens: [
      ['Ctrl', 'Somar à seleção (segure enquanto desenha)'],
      ['Alt', 'Subtrair da seleção (segure enquanto desenha)'],
      ['Ctrl+A', 'Selecionar tudo'],
      ['Ctrl+D', 'Desmarcar'],
      ['Ctrl+Shift+I', 'Inverter a seleção'],
      ['Esc', 'Desmarcar / cancelar o que está em curso']
    ]
  },
  {
    nome: 'Camadas',
    itens: [
      ['Ctrl+J', 'Duplicar a camada'],
      ['Ctrl+G', 'Agrupar as selecionadas'],
      ['Ctrl+Shift+R', 'Rasterizar'],
      ['Ctrl+Alt+E', 'Mesclar tudo numa camada nova'],
      ['Ctrl+Shift+A', 'Abrir os Ajustes'],
      ['Delete', 'Excluir']
    ]
  },
  {
    nome: 'Geral',
    itens: [
      ['Ctrl+Z', 'Desfazer'],
      ['Enter', 'Confirmar o corte'],
      ['Roda do mouse', 'Zoom'],
      ['Botão do meio', 'Arrastar a tela']
    ]
  }
];

export default function JanelaAtalhos({ aoFechar }) {
  return (
    <div className="aj-fundo" onClick={aoFechar}>
      <div className="at-win" onClick={(e) => e.stopPropagation()}>

        <header className="aj-topo">
          <span className="aj-titulo">Atalhos de teclado</span>
          <span className="aj-esticar" />
          <button className="ps-b" onClick={aoFechar}>Fechar</button>
        </header>

        <div className="at-corpo">
          {GRUPOS.map((g) => (
            <section key={g.nome} className="at-grupo">
              <h3 className="cr-sec">{g.nome}</h3>

              {g.itens.map(([tecla, o_que]) => (
                <div key={tecla} className="at-linha">
                  <kbd className="at-tecla">{tecla}</kbd>
                  <span className="at-o-que">{o_que}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
