// ═══════════════════════════════════════════════════════════════════════════
//  TESTE — IDIOMAS DA HOME (PT / EN / ES)
//
//  Trava a cobertura e a fidelidade dos textos da Home nos três idiomas.
//  O que este teste prende:
//    1. Todas as chaves da Home existem em pt, en e es
//    2. Nenhum valor contém marcador não resolvido ({{)
//    3. Nenhum texto em en ou es contém travessão longo (—) ou ponto-e-vírgula (;)
//    4. A interpolação com pt é 100% idêntica, byte a byte, à marcação original
//    5. A interpolação com en e es não deixa nenhum marcador solto
//
//  Rodar: node testar-idiomas-home.js
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

let passou = 0, falhou = 0;
const ok = (nome, cond, detalhe) => {
  if (cond) { passou++; console.log('  ok   ' + nome); }
  else { falhou++; console.log('  FALHA ' + nome + (detalhe ? '  → ' + detalhe : '')); }
};

// Carrega os dicionários
const { HOME_TEXTOS, MOTOR_TEXTOS } = require('./lib/home-textos.js');

console.log('\n1. COBERTURA DE CHAVES');
const chavesPt = Object.keys(HOME_TEXTOS.pt);
const chavesEn = Object.keys(HOME_TEXTOS.en);
const chavesEs = Object.keys(HOME_TEXTOS.es);

ok('pelo menos 128 chaves em pt', chavesPt.length >= 128, `encontradas: ${chavesPt.length}`);
ok('mesmo número de chaves em pt e en', chavesPt.length === chavesEn.length, `pt: ${chavesPt.length}, en: ${chavesEn.length}`);
ok('mesmo número de chaves em pt e es', chavesPt.length === chavesEs.length, `pt: ${chavesPt.length}, es: ${chavesEs.length}`);

const faltandoEn = chavesPt.filter((k) => !chavesEn.includes(k));
const faltandoEs = chavesPt.filter((k) => !chavesEs.includes(k));
ok('nenhuma chave faltando em en', faltandoEn.length === 0, faltandoEn.join(', '));
ok('nenhuma chave faltando em es', faltandoEs.length === 0, faltandoEs.join(', '));

console.log('\n2. REGRAS DE ESTILO E VOZ (CLAUDE.md)');
let temMarcadorSolto = false;
let temTravessaoOuPv = false;
const errosEstilo = [];

['pt', 'en', 'es'].forEach((lang) => {
  const d = HOME_TEXTOS[lang];
  Object.keys(d).forEach((k) => {
    const val = d[k];
    if (typeof val === 'string' && val.includes('{{')) {
      temMarcadorSolto = true;
      errosEstilo.push(`${lang}.${k} tem {{: ${val}`);
    }
    if ((lang === 'en' || lang === 'es') && typeof val === 'string') {
      if (val.includes('—')) {
        temTravessaoOuPv = true;
        errosEstilo.push(`${lang}.${k} tem travessão longo: ${val}`);
      }
      if (val.includes(';')) {
        temTravessaoOuPv = true;
        errosEstilo.push(`${lang}.${k} tem ponto-e-vírgula: ${val}`);
      }
    }
  });
});

// Conferir também os textos do motor
['pt', 'en', 'es'].forEach((lang) => {
  const m = MOTOR_TEXTOS[lang];
  if (m && m.ferramentas) {
    m.ferramentas.forEach((f) => {
      if ((lang === 'en' || lang === 'es')) {
        if (f.nome.includes('—') || f.txt.includes('—')) {
          temTravessaoOuPv = true;
          errosEstilo.push(`motor.${lang}.${f.nome} tem travessão`);
        }
        if (f.nome.includes(';') || f.txt.includes(';')) {
          temTravessaoOuPv = true;
          errosEstilo.push(`motor.${lang}.${f.nome} tem ponto-e-vírgula`);
        }
      }
    });
  }
});

ok('nenhum texto contém {{ não resolvido', !temMarcadorSolto, errosEstilo.join(' | '));
ok('en e es sem travessão longo (—) e sem ponto-e-vírgula (;)', !temTravessaoOuPv, errosEstilo.join(' | '));

console.log('\n3. FIDELIDADE E ROUNDTRIP DO HTML DA HOME');
const homeFonte = fs.readFileSync(path.join(__dirname, 'components/HomeCora.js'), 'utf8');
const refOriginal = fs.readFileSync(path.join(__dirname, 'ferramentas/referencia-home-pt.html'), 'utf8').replace(/\r\n/g, '\n');

// Extrai MARCACAO_TEMPLATE de HomeCora.js
const matchTmpl = homeFonte.match(/const MARCACAO_TEMPLATE = ("(?:[^"\\]|\\.)*"|`[\s\S]*?`);/);
ok('MARCACAO_TEMPLATE encontrado em HomeCora.js', !!matchTmpl);

if (matchTmpl) {
  let tmpl;
  if (matchTmpl[1].startsWith('"')) {
    tmpl = JSON.parse(matchTmpl[1]);
  } else {
    tmpl = matchTmpl[1].slice(1, -1);
  }

  function interpolar(template, textos) {
    return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, chave) => {
      return textos[chave] !== undefined ? textos[chave] : match;
    });
  }

  const htmlPt = interpolar(tmpl, HOME_TEXTOS.pt).replace(/\r\n/g, '\n');
  const identicoPt = htmlPt === refOriginal;
  ok('interpolação em pt é 100% idêntica ao HTML original (byte a byte)', identicoPt,
    identicoPt ? '' : `tamanho: pt=${htmlPt.length} vs ref=${refOriginal.length}`);

  const htmlEn = interpolar(tmpl, HOME_TEXTOS.en);
  const sobraramEn = (htmlEn.match(/\{\{[a-zA-Z0-9_]+\}\}/g) || []);
  ok('interpolação em en não deixa marcadores soltos', sobraramEn.length === 0, sobraramEn.join(', '));

  const htmlEs = interpolar(tmpl, HOME_TEXTOS.es);
  const sobraramEs = (htmlEs.match(/\{\{[a-zA-Z0-9_]+\}\}/g) || []);
  ok('interpolação em es não deixa marcadores soltos', sobraramEs.length === 0, sobraramEs.join(', '));
}

console.log('\n' + (falhou
  ? `FALHOU: ${falhou} de ${passou + falhou}`
  : `TUDO OK: ${passou} de ${passou}`));
process.exit(falhou ? 1 : 0);
