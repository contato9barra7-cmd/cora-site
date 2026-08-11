// ═══════════════════════════════════════════════════════════════════════════
//  testar-planilha.js — o leitor de .xlsx/.csv da importação em massa
//
//  Monta um .xlsx DE VERDADE em memória (zip + deflate, como o Excel grava) e
//  confere que o leitor tira dele as mesmas linhas que tiraria do CSV. Roda o
//  CÓDIGO REAL de lib/planilha.js (reescrito de ESM para CJS na carga, mesma
//  técnica do testar-personificacao-guard do render-server).
//
//  Precisa de Node 18+ (Blob, Response e DecompressionStream globais — os
//  mesmos que o navegador dá ao código em produção).
//
//    node testar-planilha.js
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

// ── carrega o lib/planilha.js real (ESM → CJS) ─────────────────────────────
const SRC = fs.readFileSync(path.join(__dirname, 'lib', 'planilha.js'), 'utf8');
const tmp = path.join(os.tmpdir(), `planilha-cjs-${Date.now()}.js`);
fs.writeFileSync(tmp, SRC.replace(/^export /gm, '') + '\nmodule.exports = { lerPlanilha, paraDataISO };\n');
const { lerPlanilha, paraDataISO } = require(tmp);

let ok = 0, falhou = 0;
function checar(nome, cond, det) {
  if (cond) { ok++; console.log('  ok    ' + nome); }
  else { falhou++; console.log('  FALHA ' + nome + (det !== undefined ? '  -> ' + JSON.stringify(det) : '')); }
}

// ── um zip mínimo válido (local headers + diretório central + EOCD) ────────
function zipar(entradas) {
  const locais = [], centrais = [];
  let off = 0;
  for (const [nome, conteudo] of entradas) {
    const nomeB = Buffer.from(nome);
    const dados = zlib.deflateRawSync(Buffer.from(conteudo));
    const loc = Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50, 0);
    loc.writeUInt16LE(20, 4);                    // versão
    loc.writeUInt16LE(8, 8);                     // método: deflate
    loc.writeUInt32LE(dados.length, 18);         // comprimido
    loc.writeUInt32LE(Buffer.byteLength(conteudo), 22); // original
    loc.writeUInt16LE(nomeB.length, 26);
    locais.push(loc, nomeB, dados);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(8, 10);                    // método
    cen.writeUInt32LE(dados.length, 20);
    cen.writeUInt32LE(Buffer.byteLength(conteudo), 24);
    cen.writeUInt16LE(nomeB.length, 28);
    cen.writeUInt32LE(off, 42);                  // offset do local header
    centrais.push(cen, nomeB);
    off += 30 + nomeB.length + dados.length;
  }
  const corpoCentral = Buffer.concat(centrais);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entradas.length, 8);
  eocd.writeUInt16LE(entradas.length, 10);
  eocd.writeUInt32LE(corpoCentral.length, 12);
  eocd.writeUInt32LE(off, 16);                   // início do diretório central
  return Buffer.concat([...locais, corpoCentral, eocd]);
}

// Um File de mentira: só o arrayBuffer() que o leitor usa.
const comoArquivo = (buf) => ({ arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });

(async () => {
  console.log('\n── paraDataISO ──');
  checar("'12/06/2026 09:57' → 2026-06-12", paraDataISO('12/06/2026 09:57') === '2026-06-12', paraDataISO('12/06/2026 09:57'));
  checar("'05/06/2026' → 2026-06-05", paraDataISO('05/06/2026') === '2026-06-05', paraDataISO('05/06/2026'));
  checar("'2026-06-12' passa direto", paraDataISO('2026-06-12') === '2026-06-12');
  const serial = (Date.UTC(2026, 5, 12) - Date.UTC(1899, 11, 30)) / 86400000;
  checar(`serial do Excel (${serial}) → 2026-06-12`, paraDataISO(serial) === '2026-06-12', paraDataISO(serial));
  checar('serial com hora (fração) → mesmo dia', paraDataISO(serial + 0.415) === '2026-06-12', paraDataISO(serial + 0.415));
  checar("'ontem' → null", paraDataISO('ontem') === null);
  checar('vazio → null', paraDataISO('') === null && paraDataISO(null) === null);
  checar('número pequeno (não é data) → null', paraDataISO(42) === null);

  console.log('\n── CSV ──');
  const csv1 = '﻿codigo;cliente_nome;cliente_email;comecou_em\r\nHP1;"Débora; Carres";carres@gmail.com;12/06/2026 09:57\r\nHP2;Cássia "CF" Flores;cassiaf_@hotmail.com;10/06/2026 12:15\r\n';
  const l1 = await lerPlanilha(comoArquivo(Buffer.from(csv1.replace(/Cássia "CF"/, '"Cássia ""CF"""'))));
  checar('cabeçalho lido (4 colunas, sem BOM)', l1[0].length === 4 && l1[0][0] === 'codigo', l1[0]);
  checar('campo com ; dentro de aspas', l1[1][1] === 'Débora; Carres', l1[1][1]);
  checar('aspas escapadas ("")', l1[2][1] === 'Cássia "CF" Flores', l1[2][1]);
  checar('3 linhas (sem linha fantasma do \\r\\n final)', l1.length === 3, l1.length);

  const csv2 = 'nome,email\nAna,ana@x.com\n';
  const l2 = await lerPlanilha(comoArquivo(Buffer.from(csv2)));
  checar('separador vírgula detectado', l2[1][1] === 'ana@x.com', l2[1]);

  console.log('\n── XLSX ──');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const strings = ['codigo', 'status', 'cliente_nome', 'cliente_email', 'comecou_em',
    'HP0730846493', 'aprovado', 'Débora Carres', 'carresdebora@gmail.com'];
  const sst = `<?xml version="1.0"?><sst>${strings.map((s) => `<si><t>${esc(s)}</t></si>`).join('')}<si><r><t>Ri</t></r><r><t>co</t></r></si></sst>`;
  const sheet = `<?xml version="1.0"?><worksheet><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c></row>
    <row r="2"><c r="A2" t="s"><v>5</v></c><c r="B2" t="s"><v>6</v></c><c r="C2" t="s"><v>7</v></c><c r="D2" t="s"><v>8</v></c><c r="E2"><v>${serial}.415</v></c></row>
    <row r="3"><c r="B3" s="1"/><c r="C3" t="s"><v>9</v></c><c r="D3" t="inlineStr"><is><t>inline@x.com</t></is></c><c r="E3" t="str"><v>12/06/2026</v></c></row>
  </sheetData></worksheet>`;
  const xlsx = zipar([
    ['[Content_Types].xml', '<Types/>'],
    ['xl/sharedStrings.xml', sst],
    ['xl/worksheets/sheet1.xml', sheet],
  ]);
  const lx = await lerPlanilha(comoArquivo(xlsx));
  checar('cabeçalho via sharedStrings', lx[0].join('|') === 'codigo|status|cliente_nome|cliente_email|comecou_em', lx[0]);
  checar('linha de dados completa', lx[1][3] === 'carresdebora@gmail.com', lx[1]);
  checar('data em serial vira número', typeof lx[1][4] === 'number', typeof lx[1][4]);
  checar('… que o paraDataISO entende', paraDataISO(lx[1][4]) === '2026-06-12', paraDataISO(lx[1][4]));
  checar('célula vazia auto-fechada não desloca colunas', lx[2][0] === '' && lx[2][1] === '', lx[2]);
  checar('texto rico (vários <t>) concatenado', lx[2][2] === 'Rico', lx[2][2]);
  checar('inlineStr lido', lx[2][3] === 'inline@x.com', lx[2][3]);
  checar('t="str" lido como texto', paraDataISO(lx[2][4]) === '2026-06-12', lx[2][4]);

  fs.unlinkSync(tmp);
  console.log(`\n${ok}/${ok + falhou} passaram${falhou ? '  — ' + falhou + ' FALHA(S)' : ''}\n`);
  process.exit(falhou ? 1 : 0);
})().catch((e) => { console.error('\nERRO:', e); try { fs.unlinkSync(tmp); } catch (_) {} process.exit(1); });
