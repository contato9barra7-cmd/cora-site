// ═══════════════════════════════════════════════════════════
//  O histórico
//
//  Desfazer numa Pós é diferente de desfazer num editor de texto: o estado não
//  é uma string, são canvas — e um canvas de 4K pesa 64MB em memória. Guardar
//  cem passos assim estouraria o navegador.
//
//  Então o snapshot CLONA só o que pode mudar (o pixel da camada, a máscara) e
//  compartilha o resto por referência. E a pilha tem teto: passado um limite, o
//  passo mais antigo cai fora. Ninguém desfaz trinta vezes; quem precisa disso
//  queria mesmo era o arquivo original.
// ═══════════════════════════════════════════════════════════

const TETO = 25;

function clonar(c) {
  if (!c) return null;
  const n = document.createElement('canvas');
  n.width = c.width;
  n.height = c.height;
  n.getContext('2d').drawImage(c, 0, 0);
  return n;
}

// Um retrato do estado. As camadas são copiadas rasas, mas os CANVAS — que são
// o que o pincel e os ajustes alteram no lugar — são clonados de verdade.
export function tirar(camadas, sel, med) {
  return {
    med: med ? { ...med } : null,
    sel: clonar(sel),
    camadas: camadas.map((l) => ({
      ...l,
      canvas:   clonar(l.canvas),
      original: clonar(l.original),
      mascara:  clonar(l.mascara)
    }))
  };
}

export function empilhar(pilha, snap) {
  const nova = [...pilha, snap];
  if (nova.length > TETO) nova.shift();
  return nova;
}
