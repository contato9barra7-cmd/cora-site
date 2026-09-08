// ═══════════════════════════════════════════════════════════════════════════
//  A DATA DE CADA DOCUMENTO, EM FORMATO DE MÁQUINA
//
//  A data que a pessoa lê ("19 de julho de 2026") mora no `i18n.js`, escrita
//  em três idiomas. Isso serve para ler e não serve para comparar: descobrir
//  qual dos dois documentos é o mais recente a partir de "18 de julio de 2026"
//  daria um analisador de datas em português, inglês e espanhol.
//
//  Então a mesma data vem aqui uma vez, em ISO. É ela que decide onde aparece
//  o selo "Novo" na janela de reaceite.
//
//  MUDOU O DOCUMENTO? Mexe nos dois: `termos_data_valor` / `priv_data_valor`
//  no i18n (os três idiomas) e a linha daqui. O `testar-documentos.js` do
//  cora-site confere que as duas contam a mesma coisa.
// ═══════════════════════════════════════════════════════════════════════════

export const DOCUMENTOS = [
  { id: 'termos',      href: '/termos',      titulo: 'termos_titulo', data: 'termos_data_valor', iso: '2026-07-19' },
  { id: 'privacidade', href: '/privacidade', titulo: 'priv_titulo',   data: 'priv_data_valor',   iso: '2026-07-18' },
];

/* Qual documento mudou por último. Dizer "atualizado" nos dois quando só um
   mudou é mentira pequena que custa a confiança na próxima. Empate devolve os
   dois, que é o caso de uma revisão que mexeu nos dois no mesmo dia. */
export function maisRecentes() {
  const topo = DOCUMENTOS.reduce((a, d) => (d.iso > a ? d.iso : a), '');
  return DOCUMENTOS.filter((d) => d.iso === topo).map((d) => d.id);
}
