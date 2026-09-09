// ═══════════════════════════════════════════════════════════
//  Os ícones das oito ferramentas
//
//  Um traço por ferramenta, todos no mesmo peso e no mesmo quadro de 24.
//  Nada de metáfora: o desenho mostra o que a ferramenta faz com a imagem.
//
//  Moram aqui, e não em quem os usa, porque são usados em dois lugares que
//  precisam concordar: a lista do "Criar" (ícone com nome e descrição, para
//  quem chegou agora) e o trilho do painel (só o ícone, com o nome no
//  hover). É a lista que ensina qual ícone é qual, e o trilho que cobra.
// ═══════════════════════════════════════════════════════════

export const ICONES = {
  render:   'M3.5 5.5h17v13h-17z M3.5 14l5-4.5 4 3.5 3-2.5 5 4',
  batch:    'M7 3.5h13.5V17 M3.5 7h13.5v13.5H3.5z',
  planta:   'M3.5 3.5h17v17h-17z M3.5 10h8 M11.5 10v10.5 M11.5 6h9',
  editar:   'M4 20h4L19 9l-4-4L4 16v4z M14.5 5.5l4 4',
  upscale:  'M5 10.5V5h5.5 M19 13.5V19h-5.5 M5 5l5.5 5.5 M19 19l-5.5-5.5',
  pos:      'M4 6h16 M4 12h11 M4 18h7',
  animacao: 'M3.5 5.5h17v13h-17z M8 5.5v13 M16 5.5v13 M3.5 12h17',
  analises: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2'
};

export function IconeFerramenta({ id, tamanho = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONES[id] || ICONES.render} />
    </svg>
  );
}
