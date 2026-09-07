// ═══════════════════════════════════════════════════════════
//  TESTE — AS BANDEIRAS DE CARTÃO
//
//  Vendendo fora do Brasil, uma bandeira sem desenho vira um retângulo cinza
//  no lugar do cartão da pessoa. O que este teste prende:
//
//    1. toda bandeira que o Stripe documenta no campo `card.brand` está
//       desenhada
//    2. nenhuma cai no vazio: a que faltar tem que ir para a pastilha neutra
//    3. o nome que aparece na tela nunca sai em branco, nem para uma bandeira
//       que o Stripe passe a mandar amanhã
//    4. o artefato (ferramentas/bandeiras.html) e a tela mostram AS MESMAS
//       bandeiras: um artefato que promete o que a tela não faz é pior do que
//       não ter artefato
//
//  A lista de referência é a do Stripe, escrita aqui à mão de propósito: se
//  ela saísse do próprio código, o teste aprovaria qualquer buraco.
//
//  Rodar:  node testar-bandeiras.js
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

// https://docs.stripe.com/api/cards/object#card_object-brand e os métodos de
// pagamento por país. `unknown` entra porque o Stripe manda mesmo.
const DO_STRIPE = [
  'visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay',
  'elo', 'hipercard', 'cartes_bancaires', 'eftpos_au', 'link', 'unknown',
];

let passou = 0, falhou = 0;
const ok = (nome, cond, detalhe) => {
  if (cond) { passou++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHA ' + nome + (detalhe ? '  → ' + detalhe : '')); }
};

const TELA = fs.readFileSync(path.join(__dirname, 'app/assinatura/page.js'), 'utf8');
const ARTE = fs.readFileSync(path.join(__dirname, 'ferramentas/bandeiras.html'), 'utf8');

// as chaves do objeto BANDEIRAS, do primeiro nível
function chavesDe(fonte, abertura) {
  const i = fonte.indexOf(abertura);
  if (i < 0) throw new Error('não achei ' + abertura);
  let j = fonte.indexOf('{', i), prof = 0, fim = j;
  for (let k = j; k < fonte.length; k++) {
    if (fonte[k] === '{') prof++;
    else if (fonte[k] === '}') { prof--; if (!prof) { fim = k; break; } }
  }
  const corpo = fonte.slice(j + 1, fim);
  // só o que está no nível de cima: conta as chaves à medida que anda
  const chaves = [];
  let nivel = 0;
  corpo.split('\n').forEach((linha) => {
    // 2 espaços no artefato, 4 na tela: o nível é dado pelo contador,
    // e não pela indentação.
    const m = linha.match(/^\s{2,4}([a-z_]+)\s*:\s*\{/);
    if (nivel === 0 && m) chaves.push(m[1]);
    for (const c of linha) {
      if (c === '{') nivel++;
      else if (c === '}') nivel--;
    }
  });
  return chaves;
}

const naTela = chavesDe(TELA, 'const BANDEIRAS = {');
const noArtefato = chavesDe(ARTE, 'var MARCAS = {');

console.log('\nO QUE ESTÁ DESENHADO');
console.log('        na tela:     ' + naTela.join(', '));
console.log('        no artefato: ' + noArtefato.join(', '));

console.log('\nCOBERTURA DO QUE O STRIPE MANDA');
DO_STRIPE.filter((b) => b !== 'unknown').forEach((b) => {
  ok(b + ' tem desenho', naTela.includes(b),
    'sem isto o cartão vira um retângulo cinza');
});

console.log('\nO QUE FOGE DO PREVISTO');
// A pastilha neutra é o `if (!b)` dentro do Bandeira. Sem ela, uma bandeira
// nova do Stripe rende um <span> vazio.
ok('bandeira desconhecida cai na pastilha neutra',
  /function Bandeira\(\{ marca \}\) \{\s*const b = BANDEIRAS\[marca\];\s*if \(!b\)/.test(TELA),
  'o componente precisa tratar o caso antes de usar `b`');
ok('a pastilha neutra desenha alguma coisa',
  /if \(!b\)[\s\S]{0,600}<circle/.test(TELA),
  'um span vazio não é um estado, é um buraco');
ok('o nome nunca sai em branco',
  /if \(m && m !== 'unknown'\)[\s\S]{0,200}toUpperCase/.test(TELA),
  'bandeira nova do Stripe tem que virar texto legível');
ok("'unknown' NÃO está desenhada de propósito",
  !naTela.includes('unknown'),
  'ela é justamente o caso que a pastilha neutra atende');

console.log('\nO ARTEFATO PROMETE O QUE A TELA FAZ');
const soNoArtefato = noArtefato.filter((b) => !naTela.includes(b));
const soNaTela = naTela.filter((b) => !noArtefato.includes(b));
ok('nada só no artefato', soNoArtefato.length === 0, soNoArtefato.join(', '));
ok('nada só na tela', soNaTela.length === 0, soNaTela.join(', '));

console.log('\n' + (falhou
  ? `FALHOU: ${falhou} de ${passou + falhou}`
  : `TUDO OK: ${passou} de ${passou}`));
process.exit(falhou ? 1 : 0);
