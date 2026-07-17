// Ícone de crédito — o losango do plugin.
//
// O plugin usa exatamente este path (panel.html):
//   <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
//     <path d="M12 2l10 10-10 10L2 12z"/>
//   </svg>
// Copiado tal e qual, para o mesmo símbolo aparecer nos dois lugares.
//
// Só entra em botões que REALMENTE cobram ("Ler materiais", "Renderizar").
// Editar/Upscale/Animar apenas transportam a imagem para outra aba — não
// geram, não cobram, não levam o losango.

export default function IconeCredito({ tamanho = 12 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="currentColor"
      style={{ verticalAlign: '-1px' }}
      aria-hidden="true"
    >
      <path d="M12 2l10 10-10 10L2 12z" />
    </svg>
  );
}
