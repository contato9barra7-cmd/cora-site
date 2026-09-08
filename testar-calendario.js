// ═══════════════════════════════════════════════════════════════════════════
//  TESTE — O CALENDÁRIO DE FAIXA E O FILTRO POR DIA
//
//  A tela do dinheiro passou a responder "de 12 a 19". Duas coisas precisam
//  estar certas para isso não virar um número errado com cara de exato:
//
//  1. A FRASE. "12 a 19 de março de 2026" é o rótulo do total. Se ela contar
//     um período diferente do que foi somado, quem lê confia no texto.
//
//  2. O FILTRO. Ele compara datas como TEXTO, e não como `Date`. Isso é de
//     propósito: 'YYYY-MM-DD' ordena sozinho, e virar `Date` traria de volta
//     o erro de fuso que o servidor acabou de corrigir. O teste prende as
//     duas pontas da faixa (dia 12 e dia 19 entram, 11 e 20 não).
//
//  As funções são EXTRAÍDAS dos arquivos de verdade e rodadas. Reescrevê-las
//  aqui provaria que eu sei escrever a função, e não que a tela usa uma certa.
//
//  Rodar:  node testar-calendario.js
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const CAL = fs.readFileSync(path.join(__dirname, 'components', 'Calendario.js'), 'utf8');
const DIN = fs.readFileSync(path.join(__dirname, 'components', 'AdminDinheiro.js'), 'utf8');

let passou = 0, falhou = 0;
const falhas = [];
function ok(n, c, d) {
  if (c) { passou++; console.log('  ok    ' + n); }
  else {
    falhou++; falhas.push(n);
    console.log('  FALHA ' + n + (d !== undefined ? '  (' + JSON.stringify(d) + ')' : ''));
  }
}
function eq(n, r, e) { ok(n, r === e, { esperado: e, veio: r }); }
function secao(t) { console.log('\n' + t); }

// ── a frase, extraída do componente ────────────────────────────────────────
const iMes = CAL.indexOf('const MES_LONGO =');
const iFn = CAL.indexOf('export function faixaPorExtenso');
const fFn = CAL.indexOf('export default function Calendario');
if (iMes < 0 || iFn < 0 || fFn < iFn) {
  console.error('não achei faixaPorExtenso no Calendario.js — foi movida?');
  process.exit(1);
}
const bloco = CAL.slice(iMes, CAL.indexOf('\n', iMes + 200)) + '\n'
  + CAL.slice(iFn, fFn).replace('export function', 'function');
const faixaPorExtenso = new Function(bloco + '\nreturn faixaPorExtenso;')();

secao('a frase do período');
eq('um dia só não vira "12 a 12"',
  faixaPorExtenso('2026-03-12', '2026-03-12'), '12 de março de 2026');
eq('sem fim, mostra só o começo',
  faixaPorExtenso('2026-03-12', null), '12 de março de 2026');
eq('dentro do mesmo mês, o mês aparece uma vez',
  faixaPorExtenso('2026-03-12', '2026-03-19'), '12 a 19 de março de 2026');
eq('cruzando o mês, cada ponta leva o seu',
  faixaPorExtenso('2026-03-28', '2026-04-03'), '28 de março a 3 de abril de 2026');
eq('cruzando o ano, cada ponta leva o ano também',
  faixaPorExtenso('2025-12-30', '2026-01-02'),
  '30 de dezembro de 2025 a 2 de janeiro de 2026');

// ── o filtro, extraído da tela ─────────────────────────────────────────────
secao('o filtro por dia');
{
  const i = DIN.indexOf('const noPeriodo = (dia) => {');
  const f = DIN.indexOf('};', i) + 2;
  ok('achei o noPeriodo na tela', i > 0);
  const corpo = DIN.slice(i, f).replace('const noPeriodo = (dia) => {', '');
  const monta = (ctx) => new Function('faixa', 'mesAberto', 'atalho', 'anoAberto', 'inicio12m',
    'return (dia) => {' + corpo.slice(0, corpo.lastIndexOf('};')) + '};')(
      ctx.faixa, ctx.mesAberto, ctx.atalho, ctx.anoAberto, ctx.inicio12m);

  const comFaixa = monta({ faixa: { de: '2026-03-12', ate: '2026-03-19' },
                           mesAberto: null, atalho: 'ano', anoAberto: 2026, inicio12m: '2025-09-08' });
  ok('o dia 11 fica de fora', comFaixa('2026-03-11') === false);
  ok('o dia 12 entra (a ponta conta)', comFaixa('2026-03-12') === true);
  ok('um dia do meio entra', comFaixa('2026-03-15') === true);
  ok('o dia 19 entra (a outra ponta conta)', comFaixa('2026-03-19') === true);
  ok('o dia 20 fica de fora', comFaixa('2026-03-20') === false);
  ok('e a faixa ganha do atalho que estava ligado', comFaixa('2026-08-01') === false);

  const semFaixa = monta({ faixa: null, mesAberto: null, atalho: 'ano',
                           anoAberto: 2026, inicio12m: '2025-09-08' });
  ok('sem faixa, o ano manda', semFaixa('2026-03-15') === true);
  ok('e outro ano fica de fora', semFaixa('2025-03-15') === false);

  /* A correção do defeito: "últimos 12 meses" e "o ano todo" caíam no mesmo
     `return ano === anoAberto`, então os dois rótulos mostravam o MESMO
     número. Um dia de janeiro de 2026 está no ano e está fora dos 12 meses
     contados de setembro de 2025 para cá, e é essa diferença que prova que os
     dois atalhos deixaram de ser o mesmo. */
  const doze = monta({ faixa: null, mesAberto: null, atalho: '12m',
                       anoAberto: 2026, inicio12m: '2025-09-08' });
  ok('12 meses pega o que está dentro da janela', doze('2025-10-01') === true);
  ok('e recusa o que é mais velho que ela', doze('2025-08-01') === false);
  ok('12 meses e o ano todo NÃO respondem igual',
    doze('2025-10-01') !== semFaixa('2025-10-01'));

  const mes = monta({ faixa: null, mesAberto: 2, atalho: 'ano',
                      anoAberto: 2026, inicio12m: '2025-09-08' });
  ok('mês aberto pega o mês inteiro', mes('2026-03-01') === true && mes('2026-03-31') === true);
  ok('e só ele', mes('2026-04-01') === false);
}

secao('as datas são texto, e não Date');
ok('o filtro não constrói Date', !/new Date\(/.test(DIN.slice(
  DIN.indexOf('const noPeriodo = (dia) => {'),
  DIN.indexOf('const somaDaMoeda'))));
ok('o calendário monta a chave com padStart, e não com toISOString',
  /const chave = \(ano, mes, dia\) =>/.test(CAL) && /padStart\(2, '0'\)/.test(CAL));
ok('e o "hoje" dele sai do fuso de São Paulo',
  /timeZone: 'America\/Sao_Paulo'/.test(CAL));

console.log('\n' + (falhou ? `${passou} passaram, ${falhou} falharam:\n  - ` + falhas.join('\n  - ')
                            : `${passou} de ${passou}`) + '\n');
process.exit(falhou ? 1 : 0);
