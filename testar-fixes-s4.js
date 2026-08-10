// ═══════════════════════════════════════════════════════════════════════════
//  testar-fixes-s4.js — Lote S4 da auditoria (os BAIXOs restantes do cora-site)
//
//    #99   .up-ajuda com --ink3 (o --ink4 nunca existiu)
//    #100  assinarPlano sem o ramo redundante
//    #101  VERIFICADO sem mudança: o gate dos cursos é da API (401/403 →
//          "acesso restrito" na página de destino) — o redirect é navegação
//    #102  reenviar() com try/catch (falha aparece, não some)
//    #103  assentos livres com piso em 0 (downgrade não mostra "-2")
//    #104  recolhido nasce igual ao SSR; localStorage entra por efeito
//          (o visual pré-React é do <html class="menu-recolhido">)
//    #105  Enter no Confirma: armado após 250ms e sem e.repeat
//    #106  consentimento vai pela fila do dataLayer mesmo sem gtag carregado
//    #107  Dica compõe ref/onMouseEnter/onMouseLeave do filho
//    #108  dinheiro() prefixa o código da moeda quando não é BRL
//    #109  HistoricoLeituras 100% em t() (pt/en/es no dicionário)
//    #110  lixo é <button> de verdade; item é div[role=button] com teclado
//    #111  arraste da curva reancora o índice depois do sort
//    #112  VERIFICADO sem mudança: JanelaAtalhos remonta a cada abertura
//          (contrato documentado no useState)
//    #113  MenuDownload zera a medida ao trocar de item
//    #114  ordem da IA deduplicada antes de completar
//    #115  jaBuscados só marca com o efeito vivo (bytes não somem mais)
//    #116  gerar() pula entrada aprovada sem imagem (cenaId null)
//    #117  lista de análise com key estável (cenaId)
//    #118  toggleMascara guarda UM snapshot (limparSelecao sem histórico)
//    #120  "Editar" foca o textarea (não trava mais como o "Seguir assim")
//    #121  busca do picker com debounce de 300ms
//    #122  blob URLs das prévias revogadas em todo descarte
//    #123  salvarUpload com .catch nas duas chamadas
//    #124  copiarPrompt aguarda o writeText (sem "Copiado!" falso)
//    #126  _idiomaAtual re-sincronizado no commit (render descartado não suja)
//
//    Sintaxe (parser do Next) + unidades da lógica pura.
//    node testar-fixes-s4.js
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
const ARQUIVOS = [
  'app/precos/page.js', 'app/verificar/page.js', 'app/workspace/page.js',
  'components/AppShell.js', 'components/Confirma.js', 'components/CookieConsent.js',
  'components/Dica.js', 'components/FichaConta.js', 'components/HistoricoLeituras.js',
  'components/JanelaAjustes.js', 'components/JanelaAtalhos.js', 'components/MenuDownload.js',
  'components/PainelAnimacao.js', 'components/PainelBatch.js', 'components/PainelPos.js',
  'components/PainelRender.js', 'components/PickerImagem.js', 'components/Visualizador.js',
  'lib/i18n.js',
];
for (const f of ARQUIVOS) {
  let r = true;
  try { parser.parse(read(f), { sourceType: 'module', plugins: ['jsx'] }); } catch (e) { r = e.message; }
  checar('parse ' + f, r === true, r === true ? '' : r);
}

const CSS    = read('app/globals.css');
const PRECOS = read('app/precos/page.js');
const VERIF  = read('app/verificar/page.js');
const WS     = read('app/workspace/page.js');
const SHELL  = read('components/AppShell.js');
const CONF   = read('components/Confirma.js');
const COOKIE = read('components/CookieConsent.js');
const DICA   = read('components/Dica.js');
const FICHA  = read('components/FichaConta.js');
const HL     = read('components/HistoricoLeituras.js');
const JAJ    = read('components/JanelaAjustes.js');
const JAT    = read('components/JanelaAtalhos.js');
const MENU   = read('components/MenuDownload.js');
const ANIM   = read('components/PainelAnimacao.js');
const BATCH  = read('components/PainelBatch.js');
const POS    = read('components/PainelPos.js');
const REND   = read('components/PainelRender.js');
const PICKER = read('components/PickerImagem.js');
const VIS    = read('components/Visualizador.js');
const I18N   = read('lib/i18n.js');

console.log('— #99 --ink4 que não existia —');
checar('.up-ajuda usa --ink3', CSS.includes('.up-ajuda { position: relative; display: inline-flex; color: var(--ink3); cursor: help; }'));
checar('var(--ink4) sumiu do arquivo (a menção que resta é o comentário do fix)', !CSS.includes('var(--ink4)'));

console.log('— #100 ramo redundante —');
(function () {
  // Escopado à função — outra função da página também abre o modal.
  const ini = PRECOS.indexOf('async function assinarPlano');
  const fim = PRECOS.indexOf('\n  }', ini);
  const corpo = PRECOS.slice(ini, fim);
  checar('só UM setPlanoAlvo/setModalUpgrade no assinarPlano',
    (corpo.match(/setModalUpgrade\(true\);/g) || []).length === 1);
})();
checar('sem o if interno redundante', !/if \(conta\.plano === planoId\) \{\s*\n\s*setPlanoAlvo/.test(PRECOS));

console.log('— #102 reenviar com catch —');
checar('reenviarCodigo dentro de try', /async function reenviar\(\) \{[\s\S]{0,400}?try \{[\s\S]{0,200}?reenviarCodigo\(email\)/.test(VERIF));
checar('falha vira setErro', /catch \(e\) \{\s*\n\s*setErro\(e\.message\);\s*\n\s*\}\s*\n\s*\}\s*\n\n  return/.test(VERIF) || /reenviarCodigo[\s\S]{0,200}?catch \(e\) \{\s*setErro/.test(VERIF));

console.log('— #103 livres com piso —');
checar('Math.max(0, ...) na conta', WS.includes('const livres = Math.max(0, equipe.assentos - membros.length);'));
checar('slots usam o valor já clampado', WS.includes('Array.from({ length: livres })'));
(function () {
  const livres = (assentos, membros) => Math.max(0, assentos - membros);
  checar('downgrade 5→3 mostra 0, não -2', livres(3, 5) === 0);
  checar('conta normal segue certa', livres(5, 3) === 2);
})();

console.log('— #104 hidratação do recolhido —');
checar('estado nasce false (igual ao SSR)', SHELL.includes('const [recolhido, setRecolhido] = useState(false);'));
checar('localStorage entra por efeito', /useEffect\(\(\) => \{\s*\n\s*if \(localStorage\.getItem\('cora_menu_recolhido'\) === '1'\) setRecolhido\(true\);\s*\n\s*\}, \[\]\);/.test(SHELL));
checar('initializer com localStorage saiu', !/useState\(\(\) => \{[\s\S]{0,200}?cora_menu_recolhido/.test(SHELL));

console.log('— #105 Enter residual —');
checar('tem o armado com respiro', CONF.includes("setTimeout(() => { armado.current = true; }, 250)"));
checar('Enter exige armado e não-repeat', CONF.includes("if (e.key === 'Enter' && armado.current && !e.repeat) aoOk();"));
checar('Escape continua imediato', CONF.includes("if (e.key === 'Escape') aoCancelar();"));
(function () {
  // A semântica: repeat nunca dispara; sem armar, nada dispara.
  const dispara = (armado, repeat) => armado && !repeat;
  checar('repeat não confirma nem armado', dispara(true, true) === false);
  checar('antes do respiro não confirma', dispara(false, false) === false);
  checar('intenção real confirma', dispara(true, false) === true);
})();

console.log('— #106 consentimento sem gtag —');
checar('stub empurra arguments na fila', COOKIE.includes('window.dataLayer.push(arguments)'));
checar('update não está mais atrás do guard', !/typeof window\.gtag === 'function'\) \{\s*\n\s*window\.gtag\('consent'/.test(COOKIE));
checar('dataLayer garantido antes', COOKIE.includes('window.dataLayer = window.dataLayer || [];'));

console.log('— #107 Dica compõe —');
checar('onMouseEnter do filho chamado', DICA.includes('children.props.onMouseEnter'));
checar('onMouseLeave do filho chamado', DICA.includes('children.props.onMouseLeave'));
checar('ref composta (função e objeto)', DICA.includes('alvo.current = el;') && DICA.includes("typeof anterior === 'function'"));

console.log('— #108 moeda não-BRL —');
checar('código da moeda no prefixo', FICHA.includes("moeda === 'BRL' ? 'R$' : moeda"));
(function () {
  const dinheiro = (c, m) => {
    if (c == null) return '—';
    const moeda = (m || 'brl').toUpperCase();
    return `${moeda === 'BRL' ? 'R$' : moeda} ${(c / 100).toFixed(2)}`;
  };
  checar('BRL segue R$', dinheiro(9700, 'brl') === 'R$ 97.00');
  checar('USD ganha o código', dinheiro(2900, 'usd') === 'USD 29.00');
  checar('nulo segue —', dinheiro(null) === '—');
})();

console.log('— #109 i18n do HistoricoLeituras —');
checar('importa useIdioma', HL.includes("import { useIdioma } from '../lib/i18n'"));
checar('sem PT hardcoded (título)', !HL.includes('<h3>Leituras anteriores</h3>'));
checar('sem PT hardcoded (rodapé)', !HL.includes('guardadas por 90 dias.'));
checar('quando() traduz agora/ontem/dias', HL.includes("t('historicoleituras_agora')") && HL.includes("t('historicoleituras_ontem')"));
for (const chave of ['historicoleituras_titulo', 'historicoleituras_sub', 'historicoleituras_pe', 'historicoleituras_apagar']) {
  checar(`${chave} nas 3 línguas`, (I18N.match(new RegExp('    ' + chave + ':', 'g')) || []).length === 3);
}

console.log('— #110 botão dentro de botão —');
checar('item virou div[role=button]', /className="hl-item"\s*\n\s*role="button"/.test(HL));
checar('item tem teclado próprio', HL.includes("if (e.key === 'Enter' || e.key === ' ')"));
checar('teclado do item ignora o lixo', HL.includes('if (e.target !== e.currentTarget) return;'));
checar('lixo é <button> de verdade', /<button\s*\n\s*type="button"\s*\n\s*className="hl-lixo"/.test(HL));
checar('sem span role=button aninhado', !/<span\s*\n\s*className="hl-lixo"/.test(HL));
checar('CSS zera o cromo do botão novo', /\.hl-lixo \{[^}]*border: none;[^}]*\}/s.test(CSS));

console.log('— #111 arraste reancorado —');
checar('reancora com indexOf no objeto movido', JAJ.includes('arrastando.current = novo.indexOf(movido);'));
(function () {
  // Replica: 3 pontos, o do meio cruza o vizinho no X. O índice fixo apontaria
  // para OUTRO ponto; o indexOf segue o objeto.
  const pontos = [{ x: 0, y: 0 }, { x: 50, y: 10 }, { x: 60, y: 20 }, { x: 100, y: 30 }];
  const i = 1;
  const movido = { x: 70, y: 12 };            // cruzou o ponto x=60
  const novo = [...pontos];
  novo[i] = movido;
  novo.sort((a, b) => a.x - b.x);
  checar('índice fixo apontaria para outro ponto', novo[i] !== movido);
  checar('indexOf segue o ponto arrastado', novo[novo.indexOf(movido)] === movido && novo.indexOf(movido) === 2);
})();

console.log('— #112 JanelaAtalhos (verificado) —');
checar('contrato documentado no useState', JAT.includes('cada\n  // abertura remonta e parte do valor fresco'));
checar('chamador continua condicional', /\{mostraAtalhos && \(\s*\n\s*<JanelaAtalhos/.test(POS));

console.log('— #113 dim remede ao trocar item —');
checar('efeito zera o dim por item.id', MENU.includes('useEffect(() => { setDim(null); }, [item?.id]);'));

console.log('— #114 ordem deduplicada —');
checar('Set antes do filtro', ANIM.includes('const validos = [...new Set(ordem)].filter'));
(function () {
  const narrImagens = [{ n: 1 }, { n: 2 }, { n: 3 }];
  const ordem = [2, 2, 3];
  const validos = [...new Set(ordem)].filter((n) => narrImagens.some((im) => im.n === n));
  narrImagens.forEach((im) => { if (!validos.includes(im.n)) validos.push(im.n); });
  checar('IA repetindo [2,2,3] vira [2,3,1]', JSON.stringify(validos) === '[2,3,1]');
  checar('contagem bate com o nº de imagens', validos.length === narrImagens.length);
})();

console.log('— #115 jaBuscados só com o efeito vivo —');
checar('Object.assign dentro do if (vivo)', /if \(vivo\) \{\s*\n\s*Object\.assign\(jaBuscados\.current, novos\);\s*\n\s*setBytesPorId/.test(BATCH));

console.log('— #116 aprovada sem imagem não gera —');
checar('filtro de geráveis no gerar()', BATCH.includes('const geraveis = cenasAprovadas.filter'));
checar('snapshot usa as geráveis', BATCH.includes('const cenasAprovadasSnap = geraveis;'));
checar('total recalculado das geráveis', BATCH.includes('const totalImagensSnap   = geraveis.reduce((s, c) => s + c.cfg.qtd, 0);'));

console.log('— #117 key estável na análise —');
checar('key por cenaId', BATCH.includes("key={c.cenaId || 'sem-cena-' + i}"));

console.log('— #118 um snapshot por máscara —');
checar('limparSelecao existe sem guardar', /function limparSelecao\(\) \{\s*\n\s*if \(!selRef\.current\) return;\s*\n\s*const cx/.test(POS));
checar('desmarcar delega para ela', /function desmarcar\(\) \{\s*\n\s*if \(!selRef\.current\) return;\s*\n\s*guardar\(\);\s*\n\s*limparSelecao\(\);/.test(POS));
checar('toggleMascara usa a versão sem histórico', POS.includes('limparSelecao();   // o guardar() lá de cima já cobre este passo inteiro'));

console.log('— #120 Editar edita —');
checar('Editar foca o textarea', REND.includes('onClick={() => matRef.current && matRef.current.focus()}'));
checar('textarea tem a ref', REND.includes('ref={matRef}'));
checar('Seguir assim continua confirmando', /cr-b-conf" onClick=\{\(\) => setMatEstado\('confirmado'\)\}/.test(REND));

console.log('— #121 busca com debounce —');
checar('setTimeout no efeito da busca', PICKER.includes("const tm = setTimeout(() => { carregarFeed(origem, busca); }, busca ? 300 : 0);"));
checar('cleanup limpa o timer', PICKER.includes('return () => clearTimeout(tm);'));

console.log('— #122 blob URLs revogadas —');
checar('helper soltarPrevia com revoke', PICKER.includes('URL.revokeObjectURL(p.previa);'));
(function () {
  // Conta chamadas E referências (forEach(soltarPrevia)) — 1 é a definição.
  const usos = (PICKER.match(/soltarPrevia/g) || []).length - 1;
  checar('revogação em todos os descartes (>=6 usos)', usos >= 6, usos + ' uso(s)');
})();
checar('só blobs de enviar são revogados', PICKER.includes("p.de === 'enviar' && p.previa && p.previa.startsWith('blob:')"));

console.log('— #123 salvarUpload com catch —');
checar('as duas chamadas têm .catch', (PICKER.match(/salvarUpload\(base64, file\.name\)\s*\n\s*\.catch/g) || []).length === 2);

console.log('— #124 clipboard aguardado —');
checar('await no writeText', VIS.includes('await navigator.clipboard.writeText(prompt || \'\');'));
checar('função virou async', VIS.includes('async function copiarPrompt()'));

console.log('— #126 espelho re-sincronizado —');
checar('atribuição no render continua (filhos do mesmo commit)', /\n  _idiomaAtual = idioma;\r?\n/.test(I18N));
checar('effect re-sincroniza no commit', I18N.includes('useEffect(() => { _idiomaAtual = idioma; }, [idioma]);'));

console.log('');
console.log(falhou ? `${falhou} FALHA(S), ${ok} ok` : `tudo certo — ${ok} checagens`);
process.exit(falhou ? 1 : 0);
