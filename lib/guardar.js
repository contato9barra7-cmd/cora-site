import { novoId } from './pos';

// ═══════════════════════════════════════════════════════════
//  O trabalho salvo
//
//  Fechar o navegador sem querer, ou uma atualização de página, não podem custar
//  uma hora de pós-produção. Um render tratado camada por camada é trabalho
//  demais para viver só na memória de uma aba.
//
//  Isto é o `.psd` do Cora: o estado inteiro do editor, guardado no navegador e
//  devolvido intacto quando a pessoa volta.
//
//  ── Por que IndexedDB, e não localStorage ──
//
//  O localStorage guarda TEXTO, e tem um teto de uns 5MB. Um render 4K em PNG
//  base64 passa disso sozinho — e uma composição tem várias camadas. O
//  IndexedDB guarda Blobs binários e não tem esse teto.
// ═══════════════════════════════════════════════════════════

const BANCO  = 'cora-pos';
const LOJA   = 'trabalho';
const CHAVE  = 'atual';
const VERSAO = 1;

function abrir() {
  return new Promise((ok, erro) => {
    const req = indexedDB.open(BANCO, VERSAO);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOJA)) db.createObjectStore(LOJA);
    };

    req.onsuccess = () => ok(req.result);
    req.onerror   = () => erro(req.error);
  });
}

// ── Canvas → Blob ──
//
// PNG, e não JPEG: o JPEG não tem transparência, e uma camada recortada ou
// mascarada perderia justamente o que a torna uma camada.
function paraBlob(canvas) {
  return new Promise((ok) => canvas.toBlob(ok, 'image/png'));
}

function paraCanvas(blob) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);

      URL.revokeObjectURL(url);   // sem isto, cada carregamento vaza memória
      ok(c);
    };

    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('imagem inválida')); };
    img.src = url;
  });
}

// ═══ Salvar ═══
//
// Os canvases viram Blobs; o resto da camada (posição, escala, blend, o que for)
// vai como está. O objeto guardado é serializável — é o que o IndexedDB exige.
// `aindaVale` é consultado LOGO ANTES de escrever. Preparar os Blobs de uma
// composição 4K leva tempo, e nesse meio a pessoa pode ter mexido de novo: sem
// essa checagem, um salvamento velho gravaria por cima de um novo, e o trabalho
// voltaria no tempo.
export async function salvar(camadas, med, selecao, aindaVale) {
  if (!med || !camadas?.length) return;

  const pacote = {
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
      c.canvas = await paraBlob(l.canvas);

      // A máscara e o pixel virgem do objeto inteligente também são canvases, e
      // perdê-los seria perder a reversibilidade que os justifica.
      if (l.mascara)  c.mascara  = await paraBlob(l.mascara);
      if (l.original) c.original = await paraBlob(l.original);
    }

    pacote.camadas.push(c);
  }

  // A seleção ativa também é guardada: ela costuma custar trabalho — uma varinha
  // ajustada, um laço traçado à mão — e recomeçá-la é justamente o que irrita.
  if (selecao) pacote.selecao = await paraBlob(selecao);

  // Os Blobs ficaram prontos. Mas ainda sou eu o salvamento mais recente?
  if (aindaVale && !aindaVale()) return;

  const db = await abrir();

  await new Promise((ok, erro) => {
    const t = db.transaction(LOJA, 'readwrite');
    t.objectStore(LOJA).put(pacote, CHAVE);
    t.oncomplete = ok;
    t.onerror    = () => erro(t.error);
  });

  db.close();
}

// ═══ Carregar ═══
export async function carregar() {
  const db = await abrir();

  const pacote = await new Promise((ok, erro) => {
    const t = db.transaction(LOJA, 'readonly');
    const r = t.objectStore(LOJA).get(CHAVE);
    r.onsuccess = () => ok(r.result);
    r.onerror   = () => erro(r.error);
  });

  db.close();

  if (!pacote || !pacote.camadas?.length) return null;

  // Os ids são refeitos, como na importação de um .cora: os do rascunho vêm de
  // outra sessão, e reaproveitá-los arrisca colidir com um id criado agora.
  const mapa = {};
  for (const c of pacote.camadas) mapa[c.id] = novoId();

  const camadas = [];

  for (const c of pacote.camadas) {
    const l = { ...c };

    if (c.tipo !== 'grupo') {
      l.canvas   = await paraCanvas(c.canvas);
      l.mascara  = c.mascara  ? await paraCanvas(c.mascara)  : null;
      l.original = c.original ? await paraCanvas(c.original) : null;
    } else {
      l.canvas = null;
    }

    l.id = mapa[c.id];
    l.grupo = c.grupo ? (mapa[c.grupo] || null) : null;

    camadas.push(l);
  }

  return {
    med: pacote.med,
    camadas,
    selecao: pacote.selecao ? await paraCanvas(pacote.selecao) : null,
    quando: pacote.quando
  };
}

// ═══ Apagar ═══
// Quando o trabalho é fechado de propósito, o rascunho tem que ir junto — ou a
// próxima visita ofereceria restaurar algo que já foi abandonado.
export async function apagar() {
  const db = await abrir();

  await new Promise((ok) => {
    const t = db.transaction(LOJA, 'readwrite');
    t.objectStore(LOJA).delete(CHAVE);
    t.oncomplete = ok;
    t.onerror    = ok;      // se falhar, não vale travar a interface por isso
  });

  db.close();
}

// ═══ Há algo guardado? ═══
// Uma checagem barata, sem trazer os Blobs: ela só decide se vale perguntar
// "quer voltar de onde parou?".
export async function existe() {
  try {
    const db = await abrir();

    const n = await new Promise((ok, erro) => {
      const t = db.transaction(LOJA, 'readonly');
      const r = t.objectStore(LOJA).count(CHAVE);
      r.onsuccess = () => ok(r.result);
      r.onerror   = () => erro(r.error);
    });

    db.close();
    return n > 0;
  } catch (e) {
    return false;   // sem IndexedDB (aba anônima, navegador antigo), segue sem
  }
}
