import { novoId } from './pos';
// ═══════════════════════════════════════════════════════════
//  O arquivo .cora
//
//  O trabalho inteiro num arquivo que a pessoa guarda onde quiser: no
//  computador, no drive, mandado para o cliente. É o `.psd` do Cora.
//
//  Por dentro é um ZIP:
//     projeto.json      — as camadas, posições, blends, o documento
//     camadas/c1.png    — o pixel de cada camada
//     camadas/c1-m.png  — a máscara, quando existe
//     camadas/c1-o.png  — o pixel virgem do objeto inteligente
//     selecao.png       — a seleção ativa, se houver
//
//  ── Por que o ZIP é escrito à mão ──
//
//  Uma biblioteca de zip resolveria isso em três linhas. Mas ela é mais uma
//  dependência para instalar, versionar e carregar no navegador — e o formato
//  ZIP, na parte que interessa aqui, é simples: um cabeçalho por arquivo, os
//  bytes, e um índice no fim.
//
//  Os arquivos entram SEM COMPRESSÃO (método 0, "stored"). PNG já é comprimido;
//  passar deflate por cima economizaria quase nada e custaria tempo.
// ═══════════════════════════════════════════════════════════

const ASSINATURA = 'CORA';
const VERSAO = 1;

// ── CRC-32 ──
// O ZIP exige uma soma de verificação de cada arquivo. Sem ela, qualquer
// programa de descompactação recusaria o arquivo como corrompido.
let TABELA = null;

function tabelaCrc() {
  if (TABELA) return TABELA;

  TABELA = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    TABELA[i] = c >>> 0;
  }

  return TABELA;
}

function crc32(bytes) {
  const t = tabelaCrc();
  let c = 0xFFFFFFFF;

  for (let i = 0; i < bytes.length; i++) {
    c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }

  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── Escrever números no formato do ZIP (little-endian) ──
function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }

// ── Montar o ZIP ──
function montarZip(arquivos) {
  const partes  = [];       // os pedaços do arquivo final
  const indice  = [];       // o índice central, montado em paralelo
  let desloc = 0;           // onde cada arquivo começa, contado em bytes

  const texto = new TextEncoder();

  for (const a of arquivos) {
    const nome  = texto.encode(a.nome);
    const dados = a.dados;
    const crc   = crc32(dados);

    // O cabeçalho local, que vem colado antes dos bytes do arquivo
    const cab = [
      ...u32(0x04034B50),      // a assinatura que marca "começa um arquivo aqui"
      ...u16(20),              // versão mínima para extrair
      ...u16(0),               // sem bandeiras
      ...u16(0),               // método 0: sem compressão
      ...u16(0), ...u16(0),    // hora e data — irrelevantes aqui
      ...u32(crc),
      ...u32(dados.length),    // tamanho comprimido
      ...u32(dados.length),    // tamanho original (iguais, já que não comprime)
      ...u16(nome.length),
      ...u16(0)               // sem campos extras
    ];

    partes.push(new Uint8Array(cab), nome, dados);

    // A entrada correspondente no índice do fim
    indice.push({ nome, crc, tam: dados.length, desloc });

    desloc += cab.length + nome.length + dados.length;
  }

  // ── O índice central ──
  // Ele repete os dados de cada arquivo e diz ONDE cada um está. É por ele que
  // um descompactador navega, sem ter que varrer o arquivo inteiro.
  const inicioIndice = desloc;
  let tamIndice = 0;

  for (const e of indice) {
    const c = [
      ...u32(0x02014B50),      // "entrada do índice"
      ...u16(20), ...u16(20),
      ...u16(0), ...u16(0),
      ...u16(0), ...u16(0),
      ...u32(e.crc),
      ...u32(e.tam), ...u32(e.tam),
      ...u16(e.nome.length),
      ...u16(0), ...u16(0),    // sem extras, sem comentário
      ...u16(0), ...u16(0),
      ...u32(0),
      ...u32(e.desloc)         // onde o arquivo começa
    ];

    partes.push(new Uint8Array(c), e.nome);
    tamIndice += c.length + e.nome.length;
  }

  // ── O rodapé ──
  // A última coisa do arquivo. Ele aponta para o índice — e é por aqui que todo
  // descompactador começa a ler, de trás para frente.
  partes.push(new Uint8Array([
    ...u32(0x06054B50),
    ...u16(0), ...u16(0),
    ...u16(indice.length), ...u16(indice.length),
    ...u32(tamIndice),
    ...u32(inicioIndice),
    ...u16(0)
  ]));

  return new Blob(partes, { type: 'application/zip' });
}

// ── Ler um ZIP ──
//
// Só o que interessa: percorrer os cabeçalhos locais e recolher os bytes. Não
// há por que ler o índice — os cabeçalhos já dizem tudo, e o arquivo é nosso.
function lerZip(buffer) {
  const v = new DataView(buffer);
  const b = new Uint8Array(buffer);
  const texto = new TextDecoder();

  const arquivos = {};
  let i = 0;

  while (i < b.length - 4) {
    if (v.getUint32(i, true) !== 0x04034B50) break;   // acabaram os arquivos

    const metodo   = v.getUint16(i + 8, true);
    const tam      = v.getUint32(i + 18, true);
    const tamNome  = v.getUint16(i + 26, true);
    const tamExtra = v.getUint16(i + 28, true);

    const nome = texto.decode(b.subarray(i + 30, i + 30 + tamNome));
    const ini  = i + 30 + tamNome + tamExtra;

    // Só escrevemos sem compressão — se vier comprimido, o arquivo não é nosso.
    if (metodo !== 0) throw new Error('arquivo .cora não reconhecido');

    arquivos[nome] = b.slice(ini, ini + tam);
    i = ini + tam;
  }

  return arquivos;
}

// ── Canvas ↔ bytes ──
function paraPng(canvas) {
  return new Promise((ok) => {
    canvas.toBlob(async (blob) => {
      ok(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  });
}

function dePng(bytes) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    const img = new Image();

    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);

      URL.revokeObjectURL(url);   // sem isto, cada camada carregada vaza memória
      ok(c);
    };

    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('imagem inválida')); };
    img.src = url;
  });
}

// ═══ Exportar ═══
export async function exportarCora(camadas, med, selecao, nome = 'trabalho') {
  if (!med || !camadas?.length) return;

  const arquivos = [];

  const projeto = {
    formato: ASSINATURA,
    versao: VERSAO,
    quando: Date.now(),
    med,
    camadas: []
  };

  for (const l of camadas) {
    const c = {
      id: l.id,
      tipo: l.tipo,
      nome: l.nome,
      x: l.x, y: l.y,
      escala: l.escala,
      escalaY: l.escalaY,
      blend: l.blend,
      opacidade: l.opacidade,
      visivel: l.visivel,
      grupo: l.grupo,
      smart: l.smart || false,
      ajustes: l.ajustes || null
    };

    // O grupo não tem pixel próprio: só os filhos têm.
    if (l.tipo !== 'grupo') {
      arquivos.push({ nome: `camadas/${l.id}.png`, dados: await paraPng(l.canvas) });
      c.temCanvas = true;

      // A máscara e o pixel virgem do objeto inteligente também são canvases, e
      // perdê-los seria perder a reversibilidade que os justifica.
      if (l.mascara) {
        arquivos.push({ nome: `camadas/${l.id}-m.png`, dados: await paraPng(l.mascara) });
        c.temMascara = true;
      }

      if (l.original) {
        arquivos.push({ nome: `camadas/${l.id}-o.png`, dados: await paraPng(l.original) });
        c.temOriginal = true;
      }
    }

    projeto.camadas.push(c);
  }

  if (selecao) {
    arquivos.push({ nome: 'selecao.png', dados: await paraPng(selecao) });
    projeto.temSelecao = true;
  }

  // O json entra por ÚLTIMO na montagem, mas é o primeiro do zip: quem abrir o
  // arquivo lê o mapa antes dos pixels.
  arquivos.unshift({
    nome: 'projeto.json',
    dados: new TextEncoder().encode(JSON.stringify(projeto))
  });

  const zip = montarZip(arquivos);

  // Baixar
  const url = URL.createObjectURL(zip);
  const a = document.createElement('a');

  a.href = url;
  a.download = `${nome.replace(/[^\w\-]/g, '_')}.cora`;
  a.click();

  // Um instante para o navegador iniciar o download antes de soltar a URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ═══ Importar ═══
export async function importarCora(file) {
  const arquivos = lerZip(await file.arrayBuffer());

  const mapa = arquivos['projeto.json'];
  if (!mapa) throw new Error('arquivo .cora inválido');

  const projeto = JSON.parse(new TextDecoder().decode(mapa));

  if (projeto.formato !== ASSINATURA) throw new Error('arquivo .cora inválido');

  // Um arquivo salvo por uma versão FUTURA do Cora pode ter campos que esta não
  // entende. Abrir mesmo assim daria um resultado silenciosamente errado.
  if (projeto.versao > VERSAO) {
    throw new Error('este arquivo foi salvo numa versão mais nova do Cora Render');
  }

  // ── Os ids são REFEITOS ──
  //
  // Os ids do arquivo foram gerados noutra sessão. Reaproveitá-los arrisca uma
  // colisão com um id criado agora — e duas camadas com o mesmo id fariam a
  // seleção, o desenho e a exclusão agirem sobre a errada.
  //
  // O mapa guarda o de-para, porque os grupos referenciam os filhos por id: sem
  // ele, os grupos apontariam para camadas que já não existem.
  const mapa = {};
  for (const c of projeto.camadas) mapa[c.id] = novoId();

  const camadas = [];

  for (const c of projeto.camadas) {
    const l = { ...c };

    delete l.temCanvas;
    delete l.temMascara;
    delete l.temOriginal;

    if (c.tipo !== 'grupo') {
      const px = arquivos[`camadas/${c.id}.png`];
      if (!px) throw new Error('arquivo .cora incompleto');

      l.canvas   = await dePng(px);
      l.mascara  = c.temMascara  ? await dePng(arquivos[`camadas/${c.id}-m.png`]) : null;
      l.original = c.temOriginal ? await dePng(arquivos[`camadas/${c.id}-o.png`]) : null;
    } else {
      l.canvas = null;
    }

    l.id = mapa[c.id];
    l.grupo = c.grupo ? (mapa[c.grupo] || null) : null;

    camadas.push(l);
  }

  return {
    med: projeto.med,
    camadas,
    selecao: projeto.temSelecao ? await dePng(arquivos['selecao.png']) : null
  };
}
