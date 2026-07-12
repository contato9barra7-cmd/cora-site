// Ícone de crédito — a moedinha que aparece nos botões que geram.
// Só aparece em quem REALMENTE cobra: "Ler materiais" e "Renderizar".
// Botões que apenas transportam a imagem para outra aba (Editar, Upscale,
// Animar) não cobram nada no clique, então não levam este ícone.

export default function IconeCredito({ tamanho = 11 }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.2" />
      <path
        d="M10 5.8v8.4M7.9 8.1h3.3a1.55 1.55 0 010 3.1H8.8a1.55 1.55 0 000 3.1h3.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
