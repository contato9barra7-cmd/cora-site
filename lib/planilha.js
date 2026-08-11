// ═══════════════════════════════════════════════════════════
//  planilha.js — lê .xlsx e .csv NO NAVEGADOR, sem dependência
//
//  Existe para a importação em massa de acessos (a planilha que a Cademi
//  exporta). Uma lib de xlsx inteira (SheetJS/ExcelJS) custa centenas de KB
//  para um uso só do admin; o que precisamos é o caminho feliz do formato:
//  um zip com XML dentro, e o navegador já sabe inflar zip
//  (DecompressionStream) e nós sabemos ler o XML de células.
//
//  O que este leitor cobre — e é o que a Cademi gera:
//    · primeira aba (xl/worksheets/sheet1.xml), células com sharedStrings,
//      inlineStr e números (datas viram serial do Excel; ver paraDataISO)
//  O que ele NÃO cobre: fórmulas, múltiplas abas, xlsx cifrado. Se um dia
//  aparecer planilha assim, exportar como CSV resolve na hora — o caminho
//  CSV aqui é completo (separador ; ou , ou tab, aspas, BOM).
//
//  `lerPlanilha(file)` → Promise<Array<Array<string|number>>> (linhas cruas;
//  quem dá significado às colunas é a tela que importa).
// ═══════════════════════════════════════════════════════════

function desescaparXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

// Junta todos os <t> de um trecho (texto rico vem repartido em <r><t>…).
function textoDosT(xml) {
  let out = '';
  const re = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml))) out += desescaparXml(m[1]);
  return out;
}

// "D7" → 3 (índice da coluna, base 0)
function colunaDoRef(ref) {
  const m = /^([A-Z]+)\d+$/.exec(ref);
  if (!m) return null;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

async function inflar(bytes, metodo) {
  if (metodo === 0) return bytes;                       // stored: já está cru
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* Lê as entradas do zip pelo DIRETÓRIO CENTRAL (fim do arquivo), que é o
   índice oficial — varrer assinaturas locais quebraria com lixo no meio. */
async function entradasDoZip(buf) {
  const b = new Uint8Array(buf);
  const dv = new DataView(buf);
  // EOCD (0x06054b50): varre do fim; o registro tem comentário de tamanho
  // variável, então a posição não é fixa.
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Arquivo não parece ser um .xlsx (zip sem EOCD)');
  const qtd = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);                // início do diretório central

  const entradas = {};
  for (let i = 0; i < qtd; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const metodo = dv.getUint16(p + 10, true);
    const tamComp = dv.getUint32(p + 20, true);
    const nomeLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const comentLen = dv.getUint16(p + 32, true);
    const offLocal = dv.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nomeLen));
    // O cabeçalho LOCAL tem os próprios name/extra (o extra costuma diferir
    // do central); os dados começam depois DELES.
    const nomeL = dv.getUint16(offLocal + 26, true);
    const extraL = dv.getUint16(offLocal + 28, true);
    const ini = offLocal + 30 + nomeL + extraL;
    entradas[nome] = { metodo, bytes: b.subarray(ini, ini + tamComp) };
    p += 46 + nomeLen + extraLen + comentLen;
  }
  return entradas;
}

async function lerXlsx(buf) {
  const entradas = await entradasDoZip(buf);

  // sharedStrings é opcional (planilha só de números não tem).
  let strings = [];
  if (entradas['xl/sharedStrings.xml']) {
    const xml = new TextDecoder().decode(await inflar(entradas['xl/sharedStrings.xml'].bytes, entradas['xl/sharedStrings.xml'].metodo));
    const re = /<si>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = re.exec(xml))) strings.push(textoDosT(m[1]));
  }

  // Primeira aba pela numeração do arquivo — o suficiente para exportação de
  // aba única, que é o caso da Cademi.
  const nomesAbas = Object.keys(entradas)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, c) => parseInt(a.match(/\d+/)[0], 10) - parseInt(c.match(/\d+/)[0], 10));
  if (!nomesAbas.length) throw new Error('Nenhuma aba encontrada no .xlsx');
  const aba = entradas[nomesAbas[0]];
  const xml = new TextDecoder().decode(await inflar(aba.bytes, aba.metodo));

  const linhas = [];
  const reLinha = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let ml;
  while ((ml = reLinha.exec(xml))) {
    const linha = [];
    // célula vazia vem auto-fechada (<c r="B2" s="1"/>) — o grupo 1 pega essas
    const reCel = /<c ([^>]*)\/>|<c ([^>]*)>([\s\S]*?)<\/c>/g;
    let mc;
    while ((mc = reCel.exec(ml[1]))) {
      const attrs = mc[1] || mc[2] || '';
      const corpo = mc[3] || '';
      const ref = (/r="([A-Z]+\d+)"/.exec(attrs) || [])[1];
      const tipo = (/t="(\w+)"/.exec(attrs) || [])[1] || 'n';
      const col = ref ? colunaDoRef(ref) : linha.length;
      let valor = '';
      if (tipo === 'inlineStr') valor = textoDosT(corpo);
      else {
        const v = (/<v[^>]*>([\s\S]*?)<\/v>/.exec(corpo) || [])[1];
        if (v == null) valor = '';
        else if (tipo === 's') valor = strings[parseInt(v, 10)] ?? '';
        else if (tipo === 'str' || tipo === 'e') valor = desescaparXml(v);
        else if (tipo === 'b') valor = v === '1' ? 'true' : 'false';
        else valor = Number(v);                          // número (inclui datas em serial)
      }
      while (linha.length < col) linha.push('');
      linha[col] = valor;
    }
    linhas.push(linha);
  }
  return linhas;
}

function lerCsv(texto) {
  if (texto.charCodeAt(0) === 0xFEFF) texto = texto.slice(1);   // BOM
  // separador: o mais frequente na primeira linha, fora de aspas
  const primeira = texto.slice(0, texto.indexOf('\n') < 0 ? texto.length : texto.indexOf('\n'));
  const conta = (ch) => primeira.split('"').filter((_, i) => i % 2 === 0).join('').split(ch).length - 1;
  const sep = conta(';') >= conta(',') ? (conta(';') >= conta('\t') ? ';' : '\t') : (conta(',') >= conta('\t') ? ',' : '\t');

  const linhas = [[]];
  let campo = '', emAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (emAspas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else emAspas = false;
      } else campo += ch;
    } else if (ch === '"') emAspas = true;
    else if (ch === sep) { linhas[linhas.length - 1].push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      linhas[linhas.length - 1].push(campo); campo = '';
      linhas.push([]);
    } else campo += ch;
  }
  linhas[linhas.length - 1].push(campo);
  // remove linhas totalmente vazias do fim (todo CSV termina com \n)
  while (linhas.length && linhas[linhas.length - 1].every((c) => c === '')) linhas.pop();
  return linhas;
}

export async function lerPlanilha(file) {
  const buf = await file.arrayBuffer();
  const b = new Uint8Array(buf);
  // 'PK' no início = zip = xlsx; o resto é tratado como CSV (a extensão
  // mente com frequência — arquivo renomeado, download repetido).
  if (b[0] === 0x50 && b[1] === 0x4b) return lerXlsx(buf);
  return lerCsv(new TextDecoder('utf-8').decode(buf));
}

/* Data de vários mundos → 'YYYY-MM-DD'.
     · Date (não acontece aqui, mas custa nada)
     · serial do Excel (número de dias desde 30/12/1899 — datas de
       2026 ficam na casa dos 46 mil)
     · 'dd/mm/yyyy' com hora opcional (o formato do Brasil e da Cademi)
     · 'yyyy-mm-dd' passa direto
   Devolve null quando não reconhece — quem chama decide se a linha é
   inválida, com o valor original no relatório. */
export function paraDataISO(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v) ? null : v.toISOString().slice(0, 10);
  if (typeof v === 'number' || (/^\d+([.,]\d+)?$/.test(String(v).trim()))) {
    const n = parseFloat(String(v).replace(',', '.'));
    if (n > 20000 && n < 80000) {                        // ~1954 a ~2119
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000));
      return d.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = String(v).trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(\s|$)/.exec(s);
  if (m) {
    const ano = m[3].length === 2 ? '20' + m[3] : m[3];
    const mes = m[2].padStart(2, '0'), dia = m[1].padStart(2, '0');
    const iso = `${ano}-${mes}-${dia}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }
  return null;
}
