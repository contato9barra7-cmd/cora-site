// ═══════════════════════════════════════════════════════════════════════════
//  testar-fixes-s1.js — Lote S1 da auditoria (libs/segurança do cora-site)
//
//    #93/#98 lerConta com try/catch (localStorage corrompido = deslogado)
//    #85     senha fora do sessionStorage no cadastro
//    #83     CSV: neutraliza injeção de fórmula (= + - @)
//    #125    paraPng rejeita (não trava) quando toBlob devolve null
//    #129    grad() clampa vizinhos aos limites (sem NaN nas bordas)
//    #94     radial com feather=0 preenche sólido (gradiente degenerado)
//
//  Valida a SINTAXE de cada arquivo editado (parser do próprio Next) + unidades
//  da lógica pura extraída (esc do CSV, grad clampado, radial).
//    node testar-fixes-s1.js
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const parser = require('next/dist/compiled/babel/parser');

let ok = 0, falhou = 0;
function checar(nome, cond, det) {
  if (cond) { ok++; console.log(`  ok    ${nome}`); }
  else { falhou++; console.log(`  FALHA ${nome}${det ? `  -> ${det}` : ''}`); }
}
function parseOk(rel) {
  const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  try {
    parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
    return true;
  } catch (e) { return e.message; }
}

console.log('— sintaxe dos arquivos editados —');
for (const f of ['lib/auth.js','lib/cora.js','lib/selecao.js','lib/mascaras.js','app/admin/page.js','app/cadastro/page.js']) {
  const r = parseOk(f);
  checar('parse ' + f, r === true, r === true ? '' : r);
}

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

console.log('— #93 lerConta com try/catch —');
{
  const s = read('lib/auth.js');
  checar('lerConta tem try/catch', /export function lerConta\(\)[\s\S]{0,400}try \{[\s\S]{0,120}JSON\.parse/.test(s));
  checar('remove chave corrompida', s.includes("localStorage.removeItem('cora_conta')"));
}

console.log('— #85 senha fora do sessionStorage —');
{
  const s = read('app/cadastro/page.js');
  checar('setItem não inclui senha', !/setItem\('cora_cad_form', JSON\.stringify\(\{[\s\S]{0,120}senha/.test(s));
  checar('deps do useEffect sem senha', !/\}, \[nome, email, senha,/.test(s));
  checar('restauração não seta senha do storage', !/s\.senha != null.*setSenha\(s\.senha\)/.test(s));
}

console.log('— #83 CSV anti-fórmula —');
{
  const s = read('app/admin/page.js');
  checar('prefixa fórmula com apóstrofo', /\/\^\[=\+\\-@\\t\\r\]\/\.test\(raw\)/.test(s) && s.includes("\"'\" + raw"));
  // unidade: replica o esc
  const idxTexto = [];
  const esc = (v, i) => {
    let raw = String(v ?? '');
    if (raw && !idxTexto.includes(i) && /^[=+\-@\t\r]/.test(raw)) raw = "'" + raw;
    const t = raw.replace(/"/g, '""');
    return `"${t}"`;
  };
  checar('=HYPERLINK vira texto', esc('=HYPERLINK("http://x")', 0) === `"'=HYPERLINK(""http://x"")"`);
  checar('+cmd vira texto', esc('+cmd', 0).startsWith(`"'+`));
  checar('-1 vira texto', esc('-1', 0) === `"'-1"`);
  checar('@x vira texto', esc('@x', 0) === `"'@x"`);
  checar('nome normal intacto', esc('Rafael Moreira', 0) === `"Rafael Moreira"`);
}

console.log('— #125 paraPng rejeita em blob null —');
{
  const s = read('lib/cora.js');
  checar('Promise expõe erro (reject)', /new Promise\(\(ok, erro\) =>/.test(s));
  checar('guard de blob null', /if \(!blob\) \{ erro\(/.test(s));
}

console.log('— #129 grad clampado —');
{
  const s = read('lib/selecao.js');
  checar('deriva x,y do índice', /const x = p % w, y = \(p \/ w\) \| 0;/.test(s));
  checar('clampa vizinhos com Math.min/max', s.includes('Math.min(w - 1, x + 1)') && s.includes('Math.max(0, y - 1)'));
  // unidade: replica grad clampado sobre uma imagem 3x3 e prova ausência de NaN nas bordas
  const w = 3, h = 3;
  // luminância sintética por pixel (0..255)
  const L = [10, 200, 10,  200, 10, 200,  10, 200, 10];
  const lumAt = (x, y) => L[y * w + x];
  const grad = (x, y) => {
    const l  = lumAt(x, y);
    const lx1 = lumAt(Math.min(w - 1, x + 1), y);
    const lx0 = lumAt(Math.max(0, x - 1), y);
    const ly1 = lumAt(x, Math.min(h - 1, y + 1));
    const ly0 = lumAt(x, Math.max(0, y - 1));
    return Math.abs(lx1 - l) + Math.abs(l - lx0) + Math.abs(ly1 - l) + Math.abs(l - ly0);
  };
  let algumNaN = false;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Number.isNaN(grad(x, y))) algumNaN = true;
  checar('nenhum grad NaN nas bordas (inclui y=0)', !algumNaN);
  checar('canto (0,0) é finito e >= 0', Number.isFinite(grad(0,0)) && grad(0,0) >= 0);
}

console.log('— #94 radial feather=0 —');
{
  const s = read('lib/mascaras.js');
  checar('branch para fin>=1', /if \(fin >= 1\) \{[\s\S]{0,80}fillStyle = 'rgba\(255,255,255,1\)'/.test(s));
  // unidade: a decisão
  const decideSolido = (feather) => { const fin = Math.max(0, 1 - (feather != null ? feather : 0.5)); return fin >= 1; };
  checar('feather 0 => sólido', decideSolido(0) === true);
  checar('feather 0.5 => gradiente', decideSolido(0.5) === false);
}

console.log(`\n${ok} ok, ${falhou} falha(s)`);
process.exit(falhou ? 1 : 0);
