// ═══════════════════════════════════════════════════════════════════════════
//  A FUSÃO DO CATÁLOGO DAS AULAS
//
//  `lib/aulas.js` é o berço do curso e o banco guarda só o que foi editado por
//  cima. Quem junta os dois é o `comCatalogo`, e é ele que decide o que a
//  pessoa vê: o nome, a ordem, o que foi criado no admin e o que foi removido.
//
//  Este teste roda o ARQUIVO DE VERDADE, e não uma cópia da lógica: ele lê
//  `lib/aulas.js`, tira os `import` (que puxariam o app inteiro) e avalia o
//  resto. Assim uma mudança no merge chega aqui sozinha.
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const fonte = fs.readFileSync(path.join(__dirname, 'lib', 'aulas.js'), 'utf8')
  .replace(/^import [^;]+;$/gm, '')
  .replace(/\bexport /g, '');

const { MODULOS, comCatalogo, contarAulas } = new Function(
  'registrarOpcoes',
  `${fonte}\n return { MODULOS, comCatalogo, contarAulas };`
)(() => {});

let falhas = 0;
function e(nome, cond) {
  if (!cond) falhas++;
  console.log((cond ? 'ok   ' : 'FALHA') + ' ' + nome);
}
const ids = (l) => l.map((x) => x.id).join();

// ── o berço sozinho ──
e('sem catálogo, devolve o próprio arquivo', comCatalogo({}) === MODULOS);
e('o arquivo tem 33 aulas', contarAulas(MODULOS) === 33);
e('e sete módulos', MODULOS.length === 7);

// ── editar por cima ──
let l = comCatalogo({ '00-02': { titulo: 'Outro nome' } });
e('o título editado ganha do arquivo', l[0].aulas[1].titulo === 'Outro nome');
e('e a aula fica marcada como editada', l[0].aulas[1].editado === true);
e('quem não foi editado segue do arquivo', l[0].aulas[0].titulo === MODULOS[0].aulas[0].titulo);
e('a capa do módulo também troca', comCatalogo({ '00': { capa: 'x' } })[0].capa === 'x');

// ── criar ──
l = comCatalogo({ '00-n1': { modulo: '00', titulo: 'Aula nova' } });
e('a aula criada entra no módulo dela', l[0].aulas.length === 6);
e('e entra no fim, sem ordem', l[0].aulas[5].id === '00-n1');
e('com o nome que foi escrito', l[0].aulas[5].titulo === 'Aula nova');
e('o total do curso sobe', contarAulas(l) === 34);
e('e ela não vaza para outro módulo', l[1].aulas.length === MODULOS[1].aulas.length);
l = comCatalogo({ '00-n2': { modulo: '00' }, '00-n1': { modulo: '00' } });
e('duas criadas saem na ordem em que nasceram', ids(l[0].aulas.slice(5)) === '00-n1,00-n2');

// ── remover ──
l = comCatalogo({ '00-03': { removido: true } });
e('a removida some para quem estuda', l[0].aulas.length === 4);
e('e o total cai junto', contarAulas(l) === 32);
l = comCatalogo({ '00-03': { removido: true } }, true);
e('mas o admin continua vendo ela', l[0].aulas.length === 5);
e('marcada como removida', l[0].aulas[2].removido === true);

// ── ordem ──
l = comCatalogo({
  '00-01': { ordem: 4 }, '00-02': { ordem: 3 }, '00-03': { ordem: 2 },
  '00-04': { ordem: 1 }, '00-05': { ordem: 0 },
});
e('as aulas obedecem a ordem do banco', ids(l[0].aulas) === '00-05,00-04,00-03,00-02,00-01');
e('e o resto do curso não se mexe', ids(l[1].aulas) === ids(MODULOS[1].aulas));
l = comCatalogo({
  '00': { ordem: 6 }, '01': { ordem: 0 }, '02': { ordem: 1 }, '03': { ordem: 2 },
  '04': { ordem: 3 }, '05': { ordem: 4 }, '06': { ordem: 5 },
});
e('os módulos também', ids(l) === '01,02,03,04,05,06,00');

// ── tudo junto ──
l = comCatalogo({
  '00-n1': { modulo: '00', titulo: 'Entra na frente', ordem: 0 },
  '00-01': { ordem: 1 }, '00-02': { ordem: 2 },
  '00-03': { ordem: 3, removido: true },
  '00-04': { ordem: 4 }, '00-05': { ordem: 5 },
});
e('a criada pode ir para o topo', l[0].aulas[0].id === '00-n1');
e('e a removida sai do meio', ids(l[0].aulas) === '00-n1,00-01,00-02,00-04,00-05');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo — 24 checagens');
process.exit(falhas ? 1 : 0);
