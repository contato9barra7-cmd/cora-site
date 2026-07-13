// ═══════════════════════════════════════════════════════════
//  lib/render.js — a geração de imagens no /app
//
//  Fala com o CORA-RENDER-SERVER, as MESMAS rotas que o plugin usa.
//  O servidor não sabe (nem se importa) se a imagem veio do SketchUp
//  ou de um upload — por isso não foi preciso criar rota nenhuma.
//
//  Padrão assíncrono: o POST devolve um jobId na hora, e o cliente faz
//  polling no /{rota}-status até ficar 'pronto'. Isso existe porque o
//  Railway derruba requisições acima de ~5 min.
//
//  Todo pedido leva `origem: 'web'` — é assim que o servidor sabe que
//  precisa cobrar os créditos (o plugin cobra por conta própria, por
//  enquanto).
// ═══════════════════════════════════════════════════════════

import { lerToken } from './auth';

const RENDER_URL = 'https://cora-render-server-production.up.railway.app';

function comToken() {
  const token = lerToken();
  if (!token) throw new Error('Não autenticado');
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  };
}

// ═══════════════════════════════════════════════════════════
//  CRÉDITOS — a mesma tabela do plugin.
//
//  ⚠ Isto aqui só MOSTRA o custo na tela. Quem COBRA é o servidor
//    (creditos.js no cora-render-server), com a tabela dele. Se os
//    dois divergirem, a tela mente — mas ninguém é cobrado errado.
// ═══════════════════════════════════════════════════════════
// Os mesmos números da tabela do servidor (creditos.js). O servidor é quem
// cobra de verdade — isto aqui só MOSTRA, para a pessoa não ser surpreendida.
export const CREDITOS = {
  prompt:    8,                                   // 1 GPT, cobrado 1x por lote
  materiais: 15,                                  // botão "Ler materiais"
  imagem:    { '1k': 120, '2k': 138, '4k': 216 }, // 1 Gemini por imagem

  // Batch: já vem com o prompt embutido (por isso 146, e não 138+8)
  batch:       { '1k': 128, '2k': 146, '4k': 224 },

  // Análise do batch: 8 POR CENA. O servidor é quem cobra (creditos.js);
  // isto aqui só MOSTRA, para a pessoa não ser surpreendida.
  analiseBatch: 8
};

export function custoRender(quantidade, resolucao) {
  const porImagem = CREDITOS.imagem[resolucao] || CREDITOS.imagem['2k'];
  return CREDITOS.prompt + (quantidade * porImagem);
}

// O batch cobra por cena, com o prompt embutido.
export function custoBatchCena(quantidade, resolucao) {
  const porImagem = CREDITOS.batch[resolucao] || CREDITOS.batch['2k'];
  return quantidade * porImagem;
}

// ── Arquivo -> base64 puro (sem o "data:image/png;base64,") ──
export function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo'));
    r.readAsDataURL(file);
  });
}

// ── URL -> base64 (para reusar uma imagem do histórico) ──
export async function urlParaBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Não foi possível carregar a imagem');
  const blob = await r.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload  = () => resolve(String(fr.result).split(',')[1]);
    fr.onerror = () => reject(new Error('Não foi possível ler a imagem'));
    fr.readAsDataURL(blob);
  });
}

export function novoLoteId(prefixo = 'rd') {
  return `${prefixo}_${Math.floor(Date.now() / 1000)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════
//  Assinatura da configuração — decide se é a mesma linha do feed
//
//  O feed agrupa por loteId. Para que "clicar Renderizar de novo, sem mudar
//  nada" caia na MESMA linha, o loteId tem que se repetir. Então assinamos
//  tudo que entra no prompt: se a assinatura bate, reusamos o lote.
//
//  A QUANTIDADE fica de fora de propósito — pedir mais 2 iguais é continuar
//  o mesmo lote, não começar outro. Mudar a proporção, a luz, a imagem ou
//  qualquer texto, sim, começa uma linha nova.
// ═══════════════════════════════════════════════════════════
export function assinaturaConfig(cfg) {
  return JSON.stringify([
    cfg.imagem ? cfg.imagem.slice(0, 64) : '',   // o começo do base64 já identifica
    cfg.tipo, cfg.proporcao, cfg.resolucao,
    cfg.mood, cfg.materiais, cfg.entorno,
    cfg.luzArtificial, cfg.direcaoLuz, cfg.descLuz, cfg.refTexto,
    (cfg.referencias || []).map((r) => r.base64.slice(0, 32))
  ]);
}

// ── Ler materiais da imagem ──
//  O GPT olha o print e descreve os materiais que vê. É a MESMA rota do
//  plugin: lá o print vem do SketchUp, aqui vem do upload.
// `extra` leva o que o servidor precisa para GUARDAR a leitura: de qual
// geração veio a imagem (ou uma miniatura, se foi upload) e um título.
// Quem salva é o servidor — assim vale para a web e para o plugin.
export async function lerMateriais(imagemBase64, tipo, extra = {}) {
  const r = await fetch(`${RENDER_URL}/ler-materiais`, {
    method: 'POST',
    headers: comToken(),
    body: JSON.stringify({
      image: imagemBase64,
      tipo: tipo || 'interno',
      idioma: 'pt',
      plataforma: 'web',            // o plugin manda 'plugin'

      // O servidor gera a miniatura sozinho (tem a imagem e o sharp).
      // Daqui só vai o que ele não teria como saber.
      geracaoId:     extra.geracaoId || null,
      tituloLeitura: extra.titulo || null
    })
  });

  if (r.status === 402) throw new Error('Créditos insuficientes para ler os materiais');
  if (r.status === 403) throw new Error('Leitura de materiais indisponível no seu plano');
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível ler os materiais');
  }

  const d = await r.json();
  return d.materiais || '';
}

// ═══════════════════════════════════════════════════════════
//  POST + polling
//  Estados: na_fila | processando | ocupado | pronto | erro
// ═══════════════════════════════════════════════════════════
async function postComPolling(rota, corpo, { onEstado, intervalo = 4000, maxTentativas = 200 } = {}) {
  const r = await fetch(`${RENDER_URL}/${rota}`, {
    method: 'POST',
    headers: comToken(),
    body: JSON.stringify({ ...corpo, origem: 'web' })
  });

  if (r.status === 402) {
    const e = await r.json().catch(() => ({}));
    throw new Error(`Créditos insuficientes (esta geração custa ${e.custo || '?'})`);
  }
  if (r.status === 403) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Ferramenta indisponível no seu plano');
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível iniciar a geração');
  }

  const { jobId } = await r.json();
  if (!jobId) throw new Error('O servidor não devolveu um jobId');

  for (let i = 0; i < maxTentativas; i++) {
    await new Promise((s) => setTimeout(s, intervalo));

    let job;
    try {
      const s = await fetch(`${RENDER_URL}/${rota}-status?id=${jobId}`);
      job = await s.json();
    } catch {
      continue;   // rede oscilou; tenta de novo
    }

    if (onEstado) onEstado(job.status);

    if (job.status === 'pronto') {
      if (job.erroImagem) throw new Error(job.erroImagem);
      return job;
    }
    if (job.status === 'erro')    throw new Error(job.erro || 'Erro ao gerar');
    if (job.status === 'ocupado') throw new Error('O servidor está cheio agora. Tente em alguns minutos.');
  }

  throw new Error('A geração demorou demais. Tente novamente.');
}

// ═══════════════════════════════════════════════════════════
//  gerarRender — N variações
//
//  Igual ao plugin: a 1ª imagem vai pelo /render (que gera o prompt com o
//  GPT e depois a imagem). As demais vão pelo /gerar-imagem, REUSANDO o
//  mesmo prompt. Assim N imagens custam 1 prompt + N Gemini.
// ═══════════════════════════════════════════════════════════
export async function gerarRender(cfg, { onProgresso, loteAnterior } = {}) {
  // Mesma configuração de antes? Continua no mesmo lote (mesma linha do feed).
  const assin  = assinaturaConfig(cfg);
  const mesmo  = loteAnterior && loteAnterior.assinatura === assin;
  const loteId = mesmo ? loteAnterior.loteId : novoLoteId('rd');

  // A ordem continua de onde parou, para as imagens novas irem para o fim da linha
  const base0 = mesmo ? (loteAnterior.quantas || 0) : 0;

  const total = Math.max(1, Math.min(cfg.quantidade || 1, 10));

  const imagens = [];
  // Se o lote já existe, o prompt dele também — não gastamos outro GPT.
  let promptReuso = mesmo ? (loteAnterior.prompt || null) : null;

  for (let i = 0; i < total; i++) {
    const aviso = (estado) => onProgresso && onProgresso(i, total, estado);

    const base = {
      image:       cfg.imagem,
      proporcao:   cfg.proporcao,
      resolucao:   cfg.resolucao,
      referencias: cfg.referencias,
      loteId,
      ordem: base0 + i
    };

    const job = (promptReuso === null)
      ? await postComPolling('render', {
          ...base,
          tipo:          cfg.tipo,
          mood:          cfg.mood,
          materiais:     cfg.materiais,
          entorno:       cfg.entorno,
          luzArtificial: cfg.luzArtificial,
          direcaoLuz:    cfg.direcaoLuz,
          descLuz:       cfg.descLuz,
          refTexto:      cfg.refTexto,
          gerarImagem:   true
        }, { onEstado: aviso })
      : await postComPolling('gerar-imagem', {
          ...base,
          prompt:      promptReuso,
          ferramenta:  'render',
          observacoes: cfg.materiais
        }, { onEstado: aviso });

    if (promptReuso === null) promptReuso = job.prompt || '';
    if (job.imagem) imagens.push(job.imagem);
    if (onProgresso) onProgresso(i + 1, total, 'pronto');
  }

  if (imagens.length === 0) throw new Error('Nenhuma imagem foi gerada');

  return {
    loteId,
    imagens,
    prompt: promptReuso,
    // Devolvido para o próximo clique saber se pode continuar nesta linha
    assinatura: assin,
    quantas: base0 + imagens.length
  };
}

// ═══════════════════════════════════════════════════════════
//  Opções dos controles — copiadas do plugin, valor por valor.
//
//  Os textos (data-val) vão para o servidor exatamente como estão: o
//  promptador do GPT foi ajustado para eles. Não traduza, não abrevie.
// ═══════════════════════════════════════════════════════════

export const TIPOS = [
  { val: 'interno', rotulo: 'Interno' },
  { val: 'externo', rotulo: 'Externo' },
  { val: 'planta',  rotulo: 'Planta baixa' }
];

// Sem "Auto": era o safe frame do viewport do SketchUp, que não existe na web.
export const PROPORCOES = [
  { val: 'auto', x: 4, y: 4, w: 20, h: 20 },
  { val: '1:1',  x: 4, y: 4, w: 20, h: 20 },
  { val: '21:9', x: 1, y: 8, w: 26, h: 12 },
  { val: '16:9', x: 2, y: 6, w: 24, h: 16 },
  { val: '9:16', x: 8, y: 2, w: 12, h: 24 },
  { val: '4:3',  x: 2, y: 5, w: 24, h: 18 },
  { val: '4:5',  x: 6, y: 2, w: 16, h: 24 },
  { val: '5:4',  x: 2, y: 6, w: 24, h: 16 },
  { val: '3:4',  x: 7, y: 2, w: 14, h: 24 },
  { val: '3:2',  x: 2, y: 7, w: 24, h: 14 },
  { val: '2:3',  x: 7, y: 2, w: 14, h: 24 }
];

export const LUZ_TIPOS = [
  { val: 'Direta', rotulo: 'Luz direta' },
  { val: 'Difusa', rotulo: 'Luz difusa' }
];

// Os 4 grupos do plugin: Dia / Especiais / Difuso / Noite
export const MOODS = [
  { grupo: 'Dia',       itens: ['Dia claro editorial', 'Manhã', 'Meio dia', 'Tarde'] },
  { grupo: 'Especiais', itens: ['Amanhecer', 'Golden hour', 'Blue hour'] },
  { grupo: 'Difuso',    itens: ['Nublado', 'Neve', 'Chuvoso', 'Neblina'] },
  { grupo: 'Noite',     itens: ['Noite clara', 'Noite estrelada', 'Noite escura', 'Noite chuvosa'] }
];

export const DIRECOES = [
  'Frontal', 'Lateral esquerda', 'Lateral direita',
  'Pelo fundo', 'Diagonal', 'Zenital'
];

export const CORES_LUZ = ['Desligada', '2700K', '3000K', '4000K', '5500K', 'Outro'];

export const INTENSIDADES = ['Suave', 'Média', 'Intensa'];

export const ENTORNOS = [
  'Jardim', 'Casa térrea', 'Vista urbana',
  'Bairro residencial', 'Montanhas', 'Praia'
];

export const RESOLUCOES = [
  { val: '1k', rotulo: '1K' },
  { val: '2k', rotulo: '2K' },
  { val: '4k', rotulo: '4K' }
];

export const MAX_REFS = 10;


// ═══════════════════════════════════════════════════════════
//  Batch — fase 1: analisar as cenas
//
//  A IA cruza cada cena com as referências e deduz os materiais. Custa 15
//  por cena (o mesmo do "Ler materiais": é o mesmo trabalho, 1-2 chamadas
//  GPT, só que por cena).
//
//  Antes isto era de graça, e o custo do GPT saía do bolso da Marilia.
// ═══════════════════════════════════════════════════════════
export async function analisarBatch({ cenas, refs }) {
  const r = await fetch(`${RENDER_URL}/analisar-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...comToken() },
    body: JSON.stringify({
      // O servidor lê `cena.imageBase64` (não `base64`) — mandar com o nome
      // errado fazia ele montar `data:image/png;base64,undefined`, e o
      // OpenAI recusava com "Invalid base64 image_url". Era esse o erro.
      cenas: cenas.map((c) => ({
        nome:        c.nome,
        imageBase64: c.base64
      })),
      refs:  refs,          // aqui sim são strings puras
      tipo:  'interno',
      origem: 'web'
    })
  });

  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    if (e.creditos) throw new Error(`Créditos insuficientes (precisa de ${e.custo})`);
    throw new Error(e.erro || 'Não foi possível analisar as cenas');
  }

  const dados = await r.json();

  // O servidor devolve { analise: { cenas: [...] }, status }. Ler `r.cenas`
  // direto (sem passar por `analise`) dava undefined — e o `.map` estourava.
  //
  // O nome é `lidas` e não `cenas` porque `cenas` já é parâmetro desta
  // função: redeclarar no mesmo escopo quebra o build.
  const lidas = dados?.analise?.cenas;

  if (!Array.isArray(lidas)) {
    throw new Error('O servidor não devolveu as cenas analisadas');
  }

  return lidas;
}


// ═══════════════════════════════════════════════════════════
//  Batch — fase 2: gerar
//
//  Não há rota própria: cada cena é uma chamada ao /render, com os
//  materiais que a análise produziu. É assim que o plugin faz.
//
//  Cada cena vira um LOTE próprio — no feed, ela aparece como uma entrada
//  com suas N variações juntas.
//
//  O prompt é reusado entre as variações da MESMA cena (custa 8, uma vez
//  só). Entre cenas diferentes, não: cada uma tem seus materiais.
// ═══════════════════════════════════════════════════════════
export async function gerarBatch({ cenas, refs }, { onProgresso } = {}) {
  const total = cenas.reduce((soma, c) => soma + c.qtd, 0);
  let feito = 0;

  const lotes = [];

  for (const cena of cenas) {
    // Cada CENA é um lote próprio: no feed ela aparece como uma entrada,
    // com suas N variações juntas. (É o que o plugin faz — prefixo 'bt'.)
    const loteId = 'bt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const imagens = [];
    let promptReuso = null;

    const base = {
      image:       cena.base64,
      referencias: refs.map((b) => ({ base64: b, mimeType: 'image/png' })),
      resolucao:   cena.resolucao,
      proporcao:   cena.proporcao,
      loteId:      loteId
    };

    for (let i = 0; i < cena.qtd; i++) {
      // A 1ª imagem gera o prompt (/render). As outras o REUSAM
      // (/gerar-imagem) — assim não se paga 8 créditos por variação.
      const job = (promptReuso === null)
        ? await postComPolling('render', {
            ...base,
            ordem:       i,
            tipo:        'interno',
            materiais:   cena.materiais,
            gerarImagem: true
          })
        : await postComPolling('gerar-imagem', {
            ...base,
            ordem:       i,
            prompt:      promptReuso,
            ferramenta:  'batch',
            observacoes: cena.materiais
          });

      if (promptReuso === null) promptReuso = job.prompt || '';
      if (job.imagem) imagens.push(job.imagem);

      feito += 1;
      // A cena em curso vai junto: o slot mostra O PRINT DELA desfocado,
      // não o da primeira cena o tempo todo.
      if (onProgresso) onProgresso(feito, total, cena);
    }

    lotes.push({ loteId, nome: cena.nome, imagens });
  }

  return { lotes, total: feito };
}


// ═══════════════════════════════════════════════════════════
//  Miniatura — para a leitura de materiais ser reconhecível
//
//  Só é usada quando a imagem NÃO veio de uma geração (upload solto). Se
//  veio, apontamos para a geração e a thumb sai da URL assinada do R2 —
//  nada é duplicado.
//
//  300px de largura, JPEG a 70%: uns 15 KB. Cabe folgado no banco.
// ═══════════════════════════════════════════════════════════
export function miniatura(base64, largura = 300) {
  return new Promise((resolve) => {
    try {
      const img = new Image();

      img.onload = () => {
        const escala = Math.min(1, largura / img.width);
        const c = document.createElement('canvas');
        c.width  = Math.round(img.width  * escala);
        c.height = Math.round(img.height * escala);

        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);

        resolve(c.toDataURL('image/jpeg', 0.7));
      };

      // Não deu para gerar? A leitura vale mais que a thumb — salva sem ela.
      img.onerror = () => resolve(null);
      img.src = `data:image/png;base64,${base64}`;

    } catch {
      resolve(null);
    }
  });
}
