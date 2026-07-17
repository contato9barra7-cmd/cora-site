'use client';

// A seta dos dropdowns (proporção, resolução).
//
// Era o caractere `▴` em 8px — do tamanho de um ponto, e o olho não lia como
// "isto abre". SVG escala sem virar borrão, e gira ao abrir em vez de trocar
// de glifo.
export default function Seta({ aberto }) {
  return (
    <svg
      className={'cr-seta' + (aberto ? ' cr-seta--on' : '')}
      viewBox="0 0 16 16" width="13" height="13"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
