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

const { MODULOS, comCatalogo, contarAulas, temEtiqueta, podeAbrir } = new Function(
  'registrarOpcoes',
  `${fonte}\n return { MODULOS, comCatalogo, contarAulas, temEtiqueta, podeAbrir };`
)(() => {});

let falhas = 0;
let feitas = 0;
/* A conta sai daqui, e não de um número escrito à mão no fim: aquele já ficou
   para trás e passou a mentir sobre quantas checagens rodaram. */
function e(nome, cond) {
  feitas++;
  if (!cond) falhas++;
  console.log((cond ? 'ok   ' : 'FALHA') + ' ' + nome);
}
const ids = (l) => l.map((x) => x.id).join();

// ── o berço sozinho ──
/* O catálogo vazio NÃO devolve o arquivo cru: ele passa pela fusão do mesmo
   jeito, senão as aulas voltam sem estado, sem materiais e sem número, e a
   tela mostra a chave de tradução no lugar da pastilha. */
e('sem catálogo, a lista sai igual à do arquivo', ids(comCatalogo({})) === ids(MODULOS));
e('mas já com estado em cada aula', comCatalogo({})[0].aulas[0].estado === 'no_ar');
e('e com o número de cada módulo', comCatalogo({})[3].numero === '03');
e('sem catálogo nenhum também', ids(comCatalogo(null)) === ids(MODULOS));
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

// ── criar módulo ──
l = comCatalogo({ n01: { criado: true, titulo: 'Módulo novo' } });
e('o módulo criado entra na fila', l.length === 8);
e('e entra no fim, sem ordem', l[7].id === 'n01');
e('com o nome que foi escrito', l[7].titulo === 'Módulo novo');
e('e nasce sem aula nenhuma', l[7].aulas.length === 0);
e('sem mexer no total do curso', contarAulas(l) === 33);
l = comCatalogo({
  n01: { criado: true, titulo: 'Módulo novo' },
  'n01-n1': { criado: true, modulo: 'n01', titulo: 'Primeira' },
});
e('a aula criada acha o módulo criado', l[7].aulas.length === 1);
e('com o nome dela', l[7].aulas[0].titulo === 'Primeira');
e('e agora o curso tem 34', contarAulas(l) === 34);
l = comCatalogo({ n01: { criado: true, ordem: 0 }, '00': { ordem: 1 } });
e('o módulo criado pode ir para o topo', l[0].id === 'n01');
l = comCatalogo({ n01: { criado: true, removido: true } });
e('módulo removido some da fila', l.length === 7);
e('mas o admin continua vendo', comCatalogo({ n01: { criado: true, removido: true } }, true).length === 8);

// ── remover ──
l = comCatalogo({ '00-03': { removido: true } });
e('a removida some para quem estuda', l[0].aulas.length === 4);
e('e o total cai junto', contarAulas(l) === 32);
l = comCatalogo({ '00-03': { removido: true } }, true);
e('mas o admin continua vendo ela', l[0].aulas.length === 5);
e('marcada como removida', l[0].aulas[2].removido === true);

// ── os três estados ──
l = comCatalogo({ '00-02': { estado: 'rascunho' } });
e('a aula em rascunho some para quem estuda', l[0].aulas.length === 4);
e('e a numeração fecha em cima dela', ids(l[0].aulas) === '00-01,00-03,00-04,00-05');
l = comCatalogo({ '00-02': { estado: 'rascunho' } }, true);
e('mas o admin continua vendo', l[0].aulas.length === 5);
e('marcada com o estado', l[0].aulas[1].estado === 'rascunho');
l = comCatalogo({ '00-02': { estado: 'breve' } });
e('a aula em breve continua na lista', l[0].aulas.length === 5);
e('sem estado gravado, a aula está no ar', l[0].aulas[0].estado === 'no_ar');
l = comCatalogo({ '01': { estado: 'rascunho' } });
e('módulo em rascunho some da fila', l.length === 6);
e('e leva as aulas dele junto', contarAulas(l) === 24);
l = comCatalogo({ '01': { estado: 'rascunho' } }, true);
e('o admin vê o módulo em rascunho', l.length === 7);
l = comCatalogo({ '01': { estado: 'breve' } });
e('módulo em breve continua na fila', l.length === 7);
e('a aula do arquivo com vídeo abre', podeAbrir(MODULOS[0].aulas[0]));
e('a sem vídeo não abre', !podeAbrir(MODULOS[0].aulas[1]));
e('e leva etiqueta', temEtiqueta(MODULOS[0].aulas[1]));
e('a com vídeo em breve não abre', !podeAbrir({ panda: MODULOS[0].aulas[0].panda, estado: 'breve' }));
e('e leva etiqueta também', temEtiqueta({ panda: MODULOS[0].aulas[0].panda, estado: 'breve' }));

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

console.log(falhas ? `\n${falhas} falha(s)` : `\ntudo certo — ${feitas} checagens`);
process.exit(falhas ? 1 : 0);
