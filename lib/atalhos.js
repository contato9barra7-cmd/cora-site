// ═══════════════════════════════════════════════════════════
//  Os atalhos do teclado
//
//  Cada ferramenta da pós-produção pode ter uma tecla. Elas vêm com um padrão
//  — o do plugin, o do Photoshop onde faz sentido — mas a pessoa pode trocar:
//  quem tem o próprio jeito de trabalhar não deveria se dobrar ao nosso.
//
//  O que a pessoa muda fica guardado no navegador, e vale nas próximas vezes.
// ═══════════════════════════════════════════════════════════

const CHAVE = 'cora-pos-atalhos';

// ── Todas as ferramentas que aceitam atalho ──
//
// A ordem é a dos grupos na janela. `tecla` é o padrão; um valor vazio nasce
// sem atalho, à espera de quem quiser dar um.
//
// A `tecla` é um `code` do teclado (KeyV, KeyM…), a tecla FÍSICA — não o
// caractere. Num teclado ABNT, o caractere muda com o layout; o `code` não.
export const FERRAMENTAS = [
  { id: 'mover',     nome: 'Mover',                 tecla: 'KeyV' },
  { id: 'letreiro',  nome: 'Letreiro',              tecla: 'KeyM' },
  { id: 'laco',      nome: 'Laço',                  tecla: 'KeyL' },
  { id: 'selInt',    nome: 'Seleção inteligente',   tecla: 'KeyW' },
  { id: 'pincel',    nome: 'Pincel',                tecla: 'KeyB' },
  { id: 'borracha',  nome: 'Borracha',              tecla: 'KeyE' },
  { id: 'cortar',    nome: 'Cortar',                tecla: 'KeyC' },
  { id: 'trocarCor', nome: 'Trocar a cor do pincel', tecla: 'KeyX' },
  { id: 'desfGauss', nome: 'Desfoque gaussiano',    tecla: '' },
  { id: 'desfMov',   nome: 'Desfoque de movimento', tecla: '' },
  { id: 'girar',     nome: 'Girar',                 tecla: '' },
  { id: 'ajustes',   nome: 'Ajustes',               tecla: '' }
];

// O mapa padrão { id: tecla }, montado a partir da lista.
function padrao() {
  const m = {};
  for (const f of FERRAMENTAS) m[f.id] = f.tecla;
  return m;
}

// ── Lê o mapa atual ──
//
// O que a pessoa salvou, completado pelo padrão: uma ferramenta nova, acrescida
// depois, nasce com o atalho de fábrica em vez de sumir do mapa antigo.
export function lerAtalhos() {
  const base = padrao();

  if (typeof window === 'undefined') return base;

  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    return { ...base, ...salvo };
  } catch {
    return base;
  }
}

export function salvarAtalhos(mapa) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(mapa));
  } catch {
    // Sem localStorage (aba privada, cota cheia): os atalhos valem só nesta
    // sessão. Não é motivo para quebrar nada.
  }
}

// ── O nome legível de uma tecla ──
//
// "KeyV" não diz nada a ninguém; "V" sim. Traduz os `code` comuns para o que a
// pessoa vê na tampa da tecla.
export function nomeDaTecla(code) {
  if (!code) return '';
  if (code.startsWith('Key'))   return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);

  const especiais = {
    Space: 'Espaço',
    Enter: 'Enter',
    Escape: 'Esc',
    Tab: 'Tab',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    Backslash: '\\'
  };

  return especiais[code] || code;
}
