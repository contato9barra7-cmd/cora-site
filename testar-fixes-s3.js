// ═══════════════════════════════════════════════════════════════════════════
//  testar-fixes-s3.js — Lote S3 da auditoria (editor/app do cora-site)
//
//    #86  .login-input digita com --ink; o cinza --ink3 fica só no placeholder
//    #87  MenuDownload pesa pela imagem REAL (a thumb subestimava ~10x)
//    #88  ModalDownload idem, no ramo do feed (dimFixa continua como era)
//    #89  refazer etapa: apaga a versão antiga do feed e libera o dedup
//         (apagar ANTES de salvar — as duas linhas dividem a chave saida_N)
//    #90  duplicar/duplicarVarias copiam `filtros` (a receita do smart)
//    #91  exportarImagem: onerror rejeita em vez de pendurar o await
//    #119 (adiantado, mesma função) toBlob nulo vira erro, não TypeError
//    #92  TelaPincel limpa a pintura ao trocar a base (ajustar() preserva
//         de propósito — a limpeza tem que vir antes)
//
//    Sintaxe (parser do Next) + unidades da lógica pura (dedup do refazer,
//    cópia de filtros, o fator de erro do peso via thumb).
//    node testar-fixes-s3.js
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const parser = require('next/dist/compiled/babel/parser');

let ok = 0, falhou = 0;
function checar(nome, cond, det) {
  if (cond) { ok++; console.log(`  ok    ${nome}`); }
  else { falhou++; console.log(`  FALHA ${nome}${det ? `  -> ${det}` : ''}`); }
}
const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

console.log('— sintaxe —');
for (const f of ['components/MenuDownload.js', 'components/ModalDownload.js',
                 'components/PainelAnimacao.js', 'components/PainelPos.js',
                 'components/TelaPincel.js']) {
  let r = true;
  try { parser.parse(read(f), { sourceType: 'module', plugins: ['jsx'] }); } catch (e) { r = e.message; }
  checar('parse ' + f, r === true, r === true ? '' : r);
}

const CSS   = read('app/globals.css');
const MENU  = read('components/MenuDownload.js');
const MODAL = read('components/ModalDownload.js');
const ANIM  = read('components/PainelAnimacao.js');
const POS   = read('components/PainelPos.js');
const TELA  = read('components/TelaPincel.js');

console.log('— #86 cor do .login-input —');
// O bloco principal (o que define width/padding) tem que digitar com --ink...
const blocoLogin = CSS.match(/\.login-input \{[^}]*width: 100%[^}]*\}/);
checar('bloco principal existe', !!blocoLogin);
checar('texto digitado com --ink', !!blocoLogin && / color: var\(--ink\);/.test(blocoLogin[0]));
checar('--ink3 saiu do texto digitado', !!blocoLogin && !blocoLogin[0].includes('--ink3'));
// ...e o cinza de placeholder vive numa regra própria, como nos outros campos.
checar('placeholder segue --ink3 (regra própria)',
  CSS.includes('.login-input::placeholder { color: var(--ink3); }'));

console.log('— #87/#88 peso pela imagem real —');
checar('MenuDownload mede item.url', MENU.includes('img.src = item.url;'));
checar('MenuDownload não mede mais a thumb', !MENU.includes('item.thumb || item.url'));
checar('ModalDownload mede item.url', MODAL.includes('img.src = item.url;'));
checar('ModalDownload não mede mais a thumb', !MODAL.includes('item.thumb || item.url'));
checar('ModalDownload preserva o ramo dimFixa (pós)', MODAL.includes('if (dimFixa) { setDim(dimFixa); return; }'));
// A unidade que dá o TAMANHO do erro: a fórmula do pesar() com as dimensões da
// thumb vs as do original difere pelo quadrado da razão (~11x no caso do audit).
(function () {
  const pesarBytes = (w, h, formato) => (formato === 'png' ? w * h * 1.2 : w * h * 0.22);
  const fator = pesarBytes(2048, 2731, 'png') / pesarBytes(600, 800, 'png');
  checar('thumb subestimava por >10x (por isso o fix)', fator > 10, 'fator ' + fator.toFixed(1));
})();

console.log('— #89 refazer etapa persiste —');
checar('importa apagarGeracao', /import \{ salvarEtapaTimelapse, apagarGeracao \} from '\.\.\/lib\/geracoes'/.test(ANIM));
checar('acha o card antigo pelo lote + ordem',
  ANIM.includes("(lotes || []).find((l) => l.loteId === tlSeqId)"));
checar('apaga o antigo antes de regenerar', /await apagarGeracao\(item\.id\);/.test(ANIM));
checar('libera a chave do dedup', ANIM.includes('jaSalvasRef.current.delete(chave)'));
// A ordem importa: o delete do feed ANTES do save novo (dividem a chave saida_N
// no R2 — apagar depois levaria a imagem nova junto).
(function () {
  const iApaga = ANIM.indexOf('await apagarGeracao(item.id)');
  const iGera = ANIM.indexOf('await gerarEtapaPasso(i, tlEtapas, acc');
  checar('e o delete vem ANTES do gerar/salvar', iApaga !== -1 && iGera !== -1 && iApaga < iGera);
})();
// O dedup continua valendo para o caso que ele existe para pegar (o double
// effect), e liberar a chave reabre a passagem — a semântica do Set:
(function () {
  const jaSalvas = new Set();
  const salvar = (chave) => { if (jaSalvas.has(chave)) return false; jaSalvas.add(chave); return true; };
  checar('1º save passa', salvar('tl_x:3') === true);
  checar('duplicata acidental segue bloqueada', salvar('tl_x:3') === false);
  jaSalvas.delete('tl_x:3');   // o que o refazer faz agora
  checar('depois do refazer, o re-save passa', salvar('tl_x:3') === true);
})();

console.log('— #90 duplicar leva os filtros —');
checar('duplicar copia filtros', POS.includes('filtros: ativa.filtros ? ativa.filtros.map((f) => ({ ...f })) : undefined'));
checar('duplicarVarias copia filtros', POS.includes('filtros: l.filtros ? l.filtros.map((f) => ({ ...f })) : undefined'));
// A cópia tem que ser INDEPENDENTE: reeditar um filtro na cópia não pode
// mudar a receita do original (o editor troca objetos por spread, mas o olho
// do filtro faz { ...f, desligado } — se as entradas fossem compartilhadas,
// referências antigas em closures veriam a mudança).
(function () {
  const orig = { filtros: [{ id: 'f1', tipo: 'gauss', raio: 8 }] };
  const copia = orig.filtros ? orig.filtros.map((f) => ({ ...f })) : undefined;
  copia[0].raio = 99;
  checar('entradas da cópia são objetos novos', orig.filtros[0].raio === 8, 'veio ' + orig.filtros[0].raio);
  const semFiltros = { filtros: undefined };
  checar('camada sem filtros continua sem (undefined)',
    (semFiltros.filtros ? semFiltros.filtros.map((f) => ({ ...f })) : undefined) === undefined);
})();

console.log('— #91/#119 export com saída de erro —');
checar('onerror rejeita a Promise', POS.includes('composto.onerror = () => erro(new Error('));
checar('onload continua resolvendo', POS.includes('composto.onload = ok;'));
checar('toBlob nulo vira erro legível', POS.includes("if (!blob) throw new Error('Não foi possível codificar"));

console.log('— #92 troca de base limpa a pintura —');
// Dentro do efeito de carga ([base]): limpar o canvas de desenho e derrubar o
// `pintou` ANTES do ajustar() — que preserva o desenho de propósito.
const efeitoBase = TELA.match(/\/\/ ── Carrega a imagem ──[\s\S]*?\}, \[base, ehExpansao\]\);/);
checar('efeito de carga achado', !!efeitoBase);
checar('limpa o canvas de desenho', !!efeitoBase && efeitoBase[0].includes('clearRect(0, 0, dc.width, dc.height)'));
checar('derruba o pintou', !!efeitoBase && efeitoBase[0].includes('setPintou(false)'));
(function () {
  if (!efeitoBase) return;
  const iLimpa = efeitoBase[0].indexOf('clearRect');
  // A CHAMADA (`ajustar();`), não a menção nos comentários do próprio fix.
  const iAjusta = efeitoBase[0].indexOf('ajustar();');
  checar('e ANTES do ajustar()', iLimpa !== -1 && iAjusta !== -1 && iLimpa < iAjusta);
})();
checar('ajustar() segue preservando no resize (não foi vandalizado)',
  TELA.includes('const pintado = dc.width ? dc.toDataURL() : null;'));

console.log('');
console.log(falhou ? `${falhou} FALHA(S), ${ok} ok` : `tudo certo — ${ok} checagens`);
process.exit(falhou ? 1 : 0);
