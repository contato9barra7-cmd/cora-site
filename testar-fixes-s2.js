// ═══════════════════════════════════════════════════════════════════════════
//  testar-fixes-s2.js — Lote S2 da auditoria (admin/business do cora-site)
//
//    #82  relatório geo soma receita só de linhas BRL (câmbio não existe)
//    #95  catches do admin logam (não engolem em silêncio)
//    #96  totalAba não conta ativos na aba Cancelados
//    #84  A/B no layout 'linha' repassa a proporção do lote
//    #97  id do card inicial de timelapse tem sufixo aleatório
//    #127 comentário de custo do analiseBatch corrigido (8, bate com o servidor)
//    #128 ordem do feed = base0 + sucessos (não colide na continuação)
//    #130 logs de depuração que vazavam IDs internos removidos
//
//    Sintaxe (parser do Next) + unidades da lógica pura (totalAba, ordem, geo).
//    node testar-fixes-s2.js
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
for (const f of ['app/admin/page.js','app/app/page.js','lib/render.js']) {
  let r = true; try { parser.parse(read(f), { sourceType: 'module', plugins: ['jsx'] }); } catch (e) { r = e.message; }
  checar('parse ' + f, r === true, r === true ? '' : r);
}

const ADMIN = read('app/admin/page.js');
const APP   = read('app/app/page.js');
const REND  = read('lib/render.js');

console.log('— #82 receita geo só BRL —');
checar('helper ehBRL', ADMIN.includes("const ehBRL = (a) =>"));
checar('total soma só BRL', ADMIN.includes('s + (ehBRL(a) ? (a.valor_centavos || 0) : 0)'));
checar('grupo soma só BRL', ADMIN.includes('mapa[k].valor += (ehBRL(a) ? (a.valor_centavos || 0) : 0)'));

console.log('— #95 catches do admin com log —');
checar('compras loga erro', ADMIN.includes("console.error('[admin] compras:'"));
checar('sincronizar loga erro', ADMIN.includes("console.error('[admin] sincronizar stripe:'"));
checar('sem catch vazio nesses', !/adminCompras\(\)\.then\(setCompras\)\.catch\(\(\) => \{\}\)/.test(ADMIN));

console.log('— #96 totalAba por aba —');
checar('trata cancelados', ADMIN.includes("if (aba === 'cancelados') return !a.eh_convidado && !a.eh_trial && a.assinatura_status === 'cancelado'"));
checar('trata pagantes', ADMIN.includes("if (aba === 'pagantes')   return !a.eh_convidado && !a.eh_trial && a.assinatura_status !== 'cancelado'"));
// unidade: replica totalAba
(function(){
  const assinantes = [
    { id: 1, assinatura_status: 'ativo' },
    { id: 2, assinatura_status: 'ativo' },
    { id: 3, assinatura_status: 'cancelado' },
    { id: 9, eh_trial: true },
  ];
  const meuId = 99;
  const total = (aba) => assinantes.filter((a) => {
    if (a.id === meuId) return false;
    if (aba === 'convidados') return !!a.eh_convidado;
    if (aba === 'trial')      return !!a.eh_trial;
    if (aba === 'cancelados') return !a.eh_convidado && !a.eh_trial && a.assinatura_status === 'cancelado';
    if (aba === 'pagantes')   return !a.eh_convidado && !a.eh_trial && a.assinatura_status !== 'cancelado';
    return !a.eh_convidado && !a.eh_trial;
  }).length;
  checar('cancelados conta 1 (não 3)', total('cancelados') === 1);
  checar('pagantes conta 2', total('pagantes') === 2);
})();

console.log('— #84 A/B repassa proporção —');
checar('escolherAB do layout linha com proporcao', APP.includes('escolherAB({ ...item, loteId: lote.loteId, proporcao: lote.proporcao })'));

console.log('— #97 id de timelapse com aleatório —');
checar('tl_inicial com Math.random', APP.includes("'tl_inicial_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)"));

console.log('— #127 custo analiseBatch documentado —');
// O preço subiu para 16 em 10/08 (2 promptadores por cena: série + tradutor);
// o guarda continua o mesmo — comentário e valor têm que andar JUNTOS.
checar('comentário bate com o valor (16)', REND.includes('Custa 16 por'));
checar('valor bate com o servidor (16)', /analiseBatch: 16,/.test(REND));

console.log('— #128 ordem do feed sem colisão —');
checar('ordemFeed = base0 + imagens.length', REND.includes('const ordemFeed = base0 + imagens.length;'));
checar('base.ordem usa ordemFeed', /ordem: ordemFeed/.test(REND));
checar('callback pronto usa ordemFeed', /onProgresso\(i \+ 1, total, 'pronto', \{ ordem: ordemFeed/.test(REND));
// unidade: simula 2 rodadas com falha no meio e prova ausência de colisão
(function(){
  function rodada(base0, resultados) {  // resultados: array de true(ok)/false(falha)
    const imagens = [];
    const ordens = [];
    for (let i = 0; i < resultados.length; i++) {
      const ordemFeed = base0 + imagens.length;
      if (resultados[i]) { ordens.push(ordemFeed); imagens.push('img'); }
    }
    return { ordens, quantas: base0 + imagens.length };
  }
  const r1 = rodada(0, [true, false, true]);   // ok, falha, ok
  const r2 = rodada(r1.quantas, [true]);        // continua
  const todas = [...r1.ordens, ...r2.ordens];
  const semDup = new Set(todas).size === todas.length;
  checar('nenhuma ordem duplicada entre rodadas', semDup, JSON.stringify(todas));
  checar('ordens contíguas 0,1,2', JSON.stringify(todas) === JSON.stringify([0,1,2]));
})();

console.log('— #130 logs de depuração removidos —');
checar("sem console.log('[zip] selecionados'", !ADMIN.includes("[zip] selecionados") && !APP.includes("console.log('[zip] selecionados'"));
checar('sem log de loteIds do feed', !APP.includes("'[feed] recarregou:'"));
checar('mantém console.error de falha do zip', APP.includes("console.error('[zip] falhou no download"));

console.log(`\n${ok} ok, ${falhou} falha(s)`);
process.exit(falhou ? 1 : 0);
