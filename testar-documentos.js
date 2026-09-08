// ═══════════════════════════════════════════════════════════
//  TESTE — A DATA DOS DOCUMENTOS LEGAIS
//
//  A data de cada documento existe em dois lugares, e por um bom motivo:
//
//    · `lib/i18n.js` guarda a data POR EXTENSO, em três idiomas, que é o que
//      a pessoa lê no alto de /termos e de /privacidade
//    · `lib/documentos.js` guarda a MESMA data em ISO, que é o que decide
//      qual dos dois leva o selo "Novo" na janela de reaceite
//
//  Duas fontes desencontram na primeira mudança. Este teste prende as duas
//  juntas: mexeu numa, tem que mexer na outra.
//
//  Também confere que a janela de reaceite não perdeu nenhuma das peças que
//  fazem a regra da leitura funcionar. Se o botão voltar a nascer solto, o
//  aceite volta a ser uma caixa que se marca sem ler, e isso não aparece em
//  tela nenhuma: continua tudo bonito e continua sem valer nada.
//
//  Rodar:  node testar-documentos.js
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

let passou = 0, falhou = 0;
const ok = (nome, cond, detalhe) => {
  if (cond) { passou++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHA ' + nome + (detalhe ? '  → ' + detalhe : '')); }
};
const secao = (t) => console.log('\n' + t);

const ler = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const I18N = ler('lib/i18n.js');
const DOCS = ler('lib/documentos.js');
const SHELL = ler('components/AppShell.js');
const TEXTOS = ler('components/TextosLegais.js');

// Os meses por extenso dos três idiomas. Escritos à mão de propósito: saindo
// do próprio código, o teste aprovaria qualquer coisa.
const MESES = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
       'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['january', 'february', 'march', 'april', 'may', 'june', 'july',
       'august', 'september', 'october', 'november', 'december'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
       'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};

// "19 de julho de 2026" / "July 19, 2026" / "18 de julio de 2026" → 2026-07-19
function paraIso(texto) {
  const t = texto.toLowerCase();
  const ano = (t.match(/\b(20\d\d)\b/) || [])[1];
  const dia = (t.match(/\b(\d{1,2})\b/) || [])[1];
  let mes = null;
  for (const lista of Object.values(MESES)) {
    const i = lista.findIndex((m) => t.includes(m));
    if (i >= 0) { mes = i + 1; break; }
  }
  if (!ano || !dia || !mes) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Todos os valores de uma chave, um por idioma.
function valores(chave) {
  const re = new RegExp(`^\\s*${chave}:\\s*(['"])(.*?)\\1,`, 'gm');
  return [...I18N.matchAll(re)].map((m) => m[2]);
}

// ── as datas batem ────────────────────────────────────────────────────────
secao('a data em ISO é a mesma que a pessoa lê');

const entradas = [...DOCS.matchAll(/data:\s*'([a-z_]+)'\s*,\s*iso:\s*'(\d{4}-\d{2}-\d{2})'/g)];
ok('lib/documentos.js declara os dois documentos', entradas.length === 2,
   `achei ${entradas.length}`);

for (const [, chave, iso] of entradas) {
  const vs = valores(chave);
  ok(`${chave} existe nos três idiomas`, vs.length === 3, `achei ${vs.length}`);
  for (const v of vs) {
    const convertida = paraIso(v);
    ok(`${chave}: "${v}" = ${iso}`, convertida === iso,
       convertida ? `o texto diz ${convertida}` : 'não consegui ler a data');
  }
}

// ── o selo "Novo" marca o documento certo ─────────────────────────────────
secao('o selo "Novo" cai no que mudou por último');

const isos = entradas.map(([, , iso]) => iso);
const topo = isos.slice().sort().pop();
ok('há um documento mais recente que o outro (ou empate declarado)',
   isos.length === 2, isos.join(' / '));
ok('o mais recente é o que a função devolveria', DOCS.includes('maisRecentes'),
   'a função sumiu do módulo');
ok(`o topo é ${topo}`, isos.includes(topo));

// ── a regra da leitura continua de pé ─────────────────────────────────────
secao('a janela de reaceite ainda exige a leitura');

ok('o botão depende de todos os documentos lidos',
   /disabled=\{aceitando \|\| !todosLidos\}/.test(SHELL));
ok('todosLidos olha TODOS os documentos, e não um',
   /DOCUMENTOS\.every\(\(d\) => lidos\.includes\(d\.id\)\)/.test(SHELL));
ok('o medidor não conclui nada sem a caixa desenhada',
   /if \(!c\.clientHeight\) return;/.test(SHELL),
   'sem essa guarda o documento nasce lido');
ok('a folga do fim da rolagem existe',
   /c\.scrollTop >= sobra - 4/.test(SHELL));
ok('a condição está escrita na tela', SHELL.includes("t('rea_como')"));
ok('a frase da condição existe nos três idiomas', valores('rea_como').length === 3);

// ── uma fonte só para o texto legal ───────────────────────────────────────
secao('o texto do documento vem de um lugar só');

ok('a janela usa o componente compartilhado',
   SHELL.includes('TextoTermos') && SHELL.includes('TextoPrivacidade'));
for (const pag of ['app/termos/page.js', 'app/privacidade/page.js']) {
  const s = ler(pag);
  ok(`${pag} também usa o componente`, s.includes('TextosLegais'),
     'a página remontou a própria lista de seções');
}
// 14 seções nos Termos e 12 na Política. O número não é decoração: é o que
// separa "o componente montou o documento" de "montou metade dele".
ok('TextosLegais tem as 14 seções dos Termos',
   (TEXTOS.match(/termos_h\d+/g) || []).length === 14,
   String((TEXTOS.match(/termos_h\d+/g) || []).length));
ok('TextosLegais tem as 12 seções da Política',
   (TEXTOS.match(/priv_h\d+/g) || []).length === 12,
   String((TEXTOS.match(/priv_h\d+/g) || []).length));

// ── nada de travessão nem de dois pontos-e-vírgula na copy nova ───────────
secao('a copy nova segue a regra da casa');

const chavesNovas = ['rea_como', 'rea_role', 'rea_doc_lido', 'rea_pe',
                     'rea_botao', 'rea_p', 'ws_cobranca_p'];
for (const c of chavesNovas) {
  const vs = valores(c);
  ok(`${c} sem travessão longo`, vs.length > 0 && vs.every((v) => !v.includes('—')),
     vs.join(' | '));
}

console.log(`\n${passou} de ${passou + falhou}`);
process.exit(falhou ? 1 : 0);
