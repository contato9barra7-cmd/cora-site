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

import { getAccessToken } from './auth';

const RENDER_URL = 'https://cora-render-server-production.up.railway.app';

// Sem créditos: avisa a interface (o AppShell escuta e abre o popup de upgrade/
// recarga). O erro segue sendo lançado para interromper o fluxo da geração.
export function avisarSemCreditos(custo) {
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new CustomEvent('cora:sem-creditos', { detail: { custo: custo ?? null } })); } catch (e) {}
  }
}

async function comToken() {
  const token = await getAccessToken();
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
  imagem:    { '1k': 134, '2k': 156, '4k': 231 }, // imagem adicional (render); 1a = prompt+imagem = 142/164/239

  // Batch: preço FECHADO por cena (planilha), com o prompt embutido.
  batch:       { '1k': 135, '2k': 155, '4k': 231 },

  // Análise do batch: 8 POR CENA. O servidor é quem cobra (creditos.js);
  // isto aqui só MOSTRA, para a pessoa não ser surpreendida.
  analiseBatch: 8,

  // Editar (os 6 modos de texto): prompt + imagem, num pedido só.
  editar:     { '1k': 127, '2k': 147, '4k': 223 },

  // Preenchimento e expansão (FLUX Fill): PREÇO ÚNICO.
  //
  // O FLUX Fill devolve a imagem no tamanho da que recebeu — não há
  // resolução a escolher, então não há o que variar. Tem que bater com o
  // servidor (creditos.js), ou mostraríamos um preço e cobraríamos outro.
  // Upscale (Magnific/Freepik): cobra por fator de escala.
  // Tem que bater com o servidor (creditos.js).
  upscale:    { '2k': 45, '4k': 72, '8k': 135, '16k': 225 },

  // Animação (Kling via Fal): custo POR SEGUNDO por modelo/resolução/áudio.
  // Tem que bater com o servidor (creditos.js).
  animSeg: {
    'v2-1':  { '720p': { s: 0.59, p: 1 }, '1080p': { s: 0.59, p: 1.15 } },
    'v2-5':  { '720p': { s: 0.42, p: 1 }, '1080p': { s: 0.42, p: 1.15 } },
    'v2-6':  {
      '720p':  { sem: { s: 0.42, p: 1 }, com: { s: 0.84, p: 1 } },
      '1080p': { sem: { s: 0.42, p: 1.15 }, com: { s: 0.84, p: 1.15 } }
    },
    'v3':    {
      '720p':  { sem: { s: 0.67, p: 1 }, com: { s: 1.01, p: 1 } },
      '1080p': { sem: { s: 0.67, p: 1.15 }, com: { s: 1.01, p: 1.15 } },
      '4k':    { sem: { s: 2.52, p: 1 }, com: { s: 2.52, p: 1 } }
    }
  },

  generativa: { '1k': 52, '2k': 60, '4k': 72 },   // preench/expansão por resolução (planilha)

  // Diretor de Narrativa: 8 por chamada GPT (ordem e roteiro cobrados separadamente).
  // O servidor (creditos.js) é quem cobra; aqui é só para exibir no botão.
  narrativa: 8,

  // Timelapse (obra): prompts uma vez + custo por etapa gerada.
  // Tem que bater com o servidor (creditos.js): tl_prompts + tl_etapa.
  tlPrompts: 8,
  tlEtapa:   { '1k': 120, '2k': 138, '4k': 216 }
};

// Os 6 modos de texto da aba Editar.
export function custoEditar(resolucao) {
  return CREDITOS.editar[resolucao] || CREDITOS.editar['2k'];
}

// Preenchimento e expansão — por resolução (planilha). Sem res, cai no 2k.
export function custoGenerativa(resolucao) {
  return CREDITOS.generativa[resolucao] || CREDITOS.generativa['2k'];
}

// Upscale: o custo depende do fator de escala (2x→2k, 4x→4k, etc.).
//
// A normalizacao aqui e a MESMA do servidor (creditos.js, custoUpscale):
// aceita 2 / '2' / '2x' / '2k' e, quando o valor nao existe na tabela, cai
// em '2k'. Antes o fallback daqui era '4k' e o do servidor '2k' — a tela
// mostrava 72 creditos e o servidor cobrava 45.
export function custoUpscale(scale) {
  const f = String(scale ?? '2').toLowerCase().replace('x', '').replace('k', '');
  const chave = (CREDITOS.upscale[f + 'k'] !== undefined) ? (f + 'k') : '2k';
  return CREDITOS.upscale[chave];
}

// Animação (Kling): custo por modelo/resolução/áudio/duração.
export function custoAnimacao(modelo, resolucao, audio, duracao) {
  const m = CREDITOS.animSeg[modelo];
  if (!m) return 0;
  const rk = String(resolucao || '').toLowerCase().includes('1080') ? '1080p'
           : String(resolucao || '').toLowerCase().includes('4k')   ? '4k'
           : '720p';
  const cfg = m[rk];
  if (!cfg) return 0;
  let node = cfg;
  if (cfg.sem || cfg.com) node = audio ? cfg.com : cfg.sem;
  if (!node) return 0;
  const dur = parseInt(duracao, 10) || 5;
  return Math.round((0.05 + node.s * dur) * 1.5 / 0.01 * (node.p || 1));
}

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
    headers: await comToken(),
    body: JSON.stringify({
      image: imagemBase64,
      tipo: tipo || 'interno',
      idioma: 'pt',
      origem: 'web',                // ⚠ obrigatório: é assim que o servidor sabe
                                    // que precisa cobrar (cobrarSeWeb). Sem isso,
                                    // a leitura passava de graça mesmo sem saldo.
      plataforma: 'web',            // o plugin manda 'plugin'

      // O servidor gera a miniatura sozinho (tem a imagem e o sharp).
      // Daqui só vai o que ele não teria como saber.
      geracaoId:     extra.geracaoId || null,
      tituloLeitura: extra.titulo || null,

      // As referências de estilo: a análise é feita cruzando a imagem com
      // elas, e o servidor as guarda junto com a leitura.
      referencias:   extra.refs || []
    })
  });

  if (r.status === 402) { avisarSemCreditos(); throw new Error('Créditos insuficientes para ler os materiais'); }
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
    headers: await comToken(),
    body: JSON.stringify({ ...corpo, origem: 'web' })
  });

  if (r.status === 402) {
    const e = await r.json().catch(() => ({}));
    avisarSemCreditos(e.custo);
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

    const st = (job.status || '').toString().toLowerCase();
    if (st === 'pronto' || st === 'completed' || st === 'ok' || st === 'concluido' || st === 'done') {
      if (job.erroImagem) throw new Error(job.erroImagem);
      return job;
    }
    if (st === 'erro' || st === 'failed' || st === 'error') throw new Error(job.erro || 'Erro ao gerar');
    if (st === 'ocupado') throw new Error('O servidor está cheio agora. Tente em alguns minutos.');
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
  const falhas  = [];   // as que não saíram — cada uma vira um cartão de erro
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

    // ── A falha de UMA imagem não derruba as outras ──
    //
    //  Antes um erro abortava o lote inteiro: as imagens que já tinham saído
    //  sumiam da tela junto com a que falhou. Agora cada uma responde por si.
    //
    //  O servidor já estorna os créditos da que falhou (`estornarPedido`),
    //  então a pessoa não paga pelo que não recebeu.
    try {
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

    } catch (e) {
      // Avisa QUAL falhou: o slot dela vira um cartão de erro, com o botão
      // de tentar de novo. As outras seguem.
      falhas.push({ ordem: i, erro: e.message });
      if (onProgresso) onProgresso(i + 1, total, 'erro', { ordem: i, erro: e.message });
    }
  }

  // Todas falharam? Aí sim é um erro do lote inteiro.
  if (imagens.length === 0 && falhas.length > 0) {
    throw new Error(falhas[0].erro || 'Nenhuma imagem foi gerada');
  }

  return {
    falhas,
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
//  Editar — os 6 modos de texto
//
//  `gerarImagem: true` é essencial: sem ele o servidor devolve só o prompt,
//  e cobra menos — mas nenhuma imagem sai.
// ═══════════════════════════════════════════════════════════
export async function editarImagem({
  modo, imagem, texto, referencias, resolucao, proporcao, quantidade, onProgresso
}) {
  const total   = Math.max(1, quantidade || 1);
  const imagens = [];
  const falhas  = [];
  let prompt    = '';

  // A rota /editar devolve UMA imagem por chamada. Para N, chamamos N vezes.
  // Uma falha não derruba as outras: quem falhou volta como falha, e os
  // créditos daquela são estornados pelo servidor.
  for (let i = 0; i < total; i++) {
    try {
      const job = await postComPolling('editar', {
        modo,
        image:       imagem,
        texto:       texto || '',
        referencias: referencias || [],
        proporcao:   proporcao || 'auto',
        resolucao:   resolucao || '2k',
        gerarImagem: true
      });

      if (job.imagem) imagens.push(job.imagem);
      if (job.prompt && !prompt) prompt = job.prompt;

      if (onProgresso) onProgresso(i + 1, total, 'ok', { ordem: i });

    } catch (e) {
      falhas.push({ ordem: i, erro: e.message });
      if (onProgresso) onProgresso(i + 1, total, 'erro', { ordem: i, erro: e.message });
    }
  }

  // Só é erro de verdade se TODAS falharam.
  if (imagens.length === 0 && falhas.length > 0) {
    throw new Error(falhas[0].erro);
  }

  return { imagens, prompt, falhas };
}

// ═══════════════════════════════════════════════════════════
//  Preenchimento e expansão (FLUX Fill)
//
//  A máscara é preto-e-branco: branco = trocar, preto = preservar.
//  Quem a desenha é o pincel, na tela grande.
// ═══════════════════════════════════════════════════════════
export async function gerarGenerativa({ modo, imagem, mascara, texto }) {
  const r = await fetch(`${RENDER_URL}/flux-fill`, {
    method: 'POST',
    headers: await comToken(),
    body: JSON.stringify({
      modo,                  // preenchimento | expansao
      image:  imagem,
      mask:   mascara,
      texto:  texto || '',
      origem: 'web'
    })
  });

  const d = await r.json().catch(() => ({}));
  // Credito insuficiente tem tratamento proprio: abre o popup de creditos em
  // vez de mostrar "Nao foi possivel gerar" (mesmo padrao de analisarBatch).
  if (r.status === 402 || d.creditos) {
    avisarSemCreditos(d.custo);
    throw new Error(d.custo ? `Créditos insuficientes (precisa de ${d.custo})` : 'Créditos insuficientes');
  }
  if (r.status === 403) throw new Error(d.erro || 'Preenchimento generativo indisponível no seu plano');
  if (!r.ok || d.erro) throw new Error(d.erro || 'Não foi possível gerar');

  return {
    imagens: d.imagem ? [d.imagem] : [],
    prompt:  d.prompt || '',
    falhas:  []
  };
}

// ═══════════════════════════════════════════════════════════
//  Upscale (Magnific / Freepik)
//
//  Assíncrono como as demais gerações pesadas: o servidor devolve um jobId
//  e o resultado sai por polling. Dois modos: 'precision' (nítido, fiel) e
//  'creative' (a IA pode inventar detalhe). Cada modo manda os seus campos.
// ═══════════════════════════════════════════════════════════
export async function upscaleImagem(cfg, { onEstado } = {}) {
  const corpo = {
    modo:  cfg.modo,                 // precision | creative
    image: cfg.image,
    scale: cfg.scale
  };

  if (cfg.modo === 'precision') {
    corpo.flavor      = cfg.flavor;
    corpo.sharpen     = cfg.sharpen;
    corpo.smart_grain = cfg.smart_grain;
  } else {
    corpo.optimized_for = cfg.optimized_for;
    corpo.creativity    = cfg.creativity;
    corpo.hdr           = cfg.hdr;
    corpo.resemblance   = cfg.resemblance;
    corpo.fractality    = cfg.fractality;
    corpo.engine        = cfg.engine;
    corpo.prompt        = cfg.prompt || '';
  }

  const job = await postComPolling('upscale', corpo, { onEstado });

  // O upscale pode devolver a imagem embutida (base64) ou por URL (arquivo
  // grande). Aceita qualquer um dos campos que o servidor use.
  const img = job.imagem || job.image || job.url || job.render || job.thumb || null;

  return {
    imagem: img,
    prompt: job.prompt || 'Upscale'
  };
}

// ═══════════════════════════════════════════════════════════
//  animarKling — imagem inicial (+ final opcional) vira vídeo
// ═══════════════════════════════════════════════════════════
export async function animarKling(cfg, { onEstado } = {}) {
  const corpo = {
    modelo:       cfg.modelo,
    modeloLabel:  cfg.modeloLabel || cfg.modelo,
    imagemInicio: cfg.imagemInicio,
    imagemFim:    cfg.imagemFim || '',
    duracao:      cfg.duracao,
    resolucao:    cfg.resolucao,
    descricao:    cfg.timelapse ? 'Static camera, construction timelapse' : (cfg.descricao || ''),
    promptDireto: !!cfg.timelapse,
    audio:        !!cfg.audio
  };

  const job = await postComPolling('animar-kling', corpo, { onEstado });

  return {
    url:    job.url || '',
    webmUrl: job.webmUrl || '',
    thumb:  job.thumb || '',
    prompt: job.prompt || 'Animação'
  };
}


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
    headers: { 'Content-Type': 'application/json', ...(await comToken()) },
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
    if (e.creditos) { avisarSemCreditos(e.custo); throw new Error(`Créditos insuficientes (precisa de ${e.custo})`); }
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
            gerarImagem: true,

            // Sem isto o servidor salvava a 1ª imagem de cada cena como
            // 'render' — porque a rota é /render. Só as variações (que vão
            // por /gerar-imagem) diziam 'batch'. Gerando 1 imagem por cena,
            // TODAS ficavam marcadas como render no histórico.
            ferramenta:  'batch'
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

// ═══════════════════════════════════════════════════════════
//  Timelapse de obra (externo/interior) — espelho do plugin
//
//  Fluxo em duas fases, igual ao plugin:
//   1) /timelapse-prompts  → a IA analisa a imagem final e devolve as
//      etapas (cada uma com um prompt de "desconstrução" da obra).
//   2) para cada etapa, /timelapse-imagem (assíncrono, jobId + polling).
//      Cada etapa parte da imagem ANTERIOR — é uma cadeia de trás pra
//      frente (da obra pronta ao terreno).
// ═══════════════════════════════════════════════════════════

// Custo estimado: prompts (1x) + etapa × nº de etapas. Como o nº de etapas
// só se sabe depois da fase 1, o custo por etapa é exposto para a UI somar.
export function custoTimelapseEtapa(resolucao) {
  return CREDITOS.tlEtapa[resolucao] || CREDITOS.tlEtapa['2k'];
}

// Custo da sequência completa: prompt (uma vez) + N etapas.
// Externo = 7 etapas; interior reforma = 8; interior obra nova = 7.
export function custoTimelapseCompleto(resolucao, nEtapas = 7) {
  const etapa = CREDITOS.tlEtapa[resolucao] || CREDITOS.tlEtapa['2k'];
  return CREDITOS.tlPrompts + (nEtapas * etapa);
}

// Custo da PRIMEIRA etapa no modo "uma a uma": etapa + prompt (o planejamento
// é cobrado junto da 1ª imagem). As demais etapas custam só a etapa.
export function custoTimelapsePrimeira(resolucao) {
  const etapa = CREDITOS.tlEtapa[resolucao] || CREDITOS.tlEtapa['2k'];
  return etapa + CREDITOS.tlPrompts;
}

// Fase 1: pede as etapas ao servidor.
export async function timelapsePrompts({ image, tipo = 'externo', modoInterior = 'reforma' }) {
  const r = await fetch(`${RENDER_URL}/timelapse-prompts`, {
    method: 'POST',
    headers: await comToken(),
    body: JSON.stringify({ image, tipo, modoInterior, origem: 'web' })
  });
  if (r.status === 402) {
    const e = await r.json().catch(() => ({}));
    avisarSemCreditos(e.custo);
    throw new Error(`Créditos insuficientes (esta etapa custa ${e.custo || '?'})`);
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível planejar a sequência');
  }
  const d = await r.json();
  if (!d.etapas || !d.etapas.length) throw new Error('A IA não retornou etapas válidas');
  return d.etapas;   // [{ titulo?, prompt }, ...]
}

// ═══════════════════════════════════════════════════════════
//  Diretor de Narrativa
//
//  Etapa 1 (ordem): manda as imagens numeradas, a IA devolve a melhor
//  ordem narrativa (só os números). Grátis — só análise GPT.
//  Etapa 2 (roteiro): manda as imagens JÁ na ordem, a IA devolve os takes
//  (câmera, close, transição, frames 1/2), o ritmo e a trilha. Grátis.
//  As animações dos takes é que custam (animarKling).
// ═══════════════════════════════════════════════════════════
export async function narrativaOrdem(imagens) {
  const r = await fetch(`${RENDER_URL}/narrativa-ordem`, {
    method: 'POST',
    headers: await comToken(),
    body: JSON.stringify({ imagens, origem: 'web' })   // [{ n, base64 }, ...]
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    if (r.status === 402 || e.creditos) {
      avisarSemCreditos(e.custo);
      throw new Error(e.custo ? `Créditos insuficientes (precisa de ${e.custo})` : 'Créditos insuficientes');
    }
    if (r.status === 403) throw new Error(e.erro || 'Diretor de Narrativa indisponível no seu plano');
    throw new Error(e.erro || 'Não foi possível ordenar as imagens');
  }
  const d = await r.json();
  if (!d.ordem || !d.ordem.length) throw new Error('A IA não retornou uma ordem válida');
  return d.ordem;   // ex: [3, 1, 4, 2]
}

export async function narrativaRoteiro(imagens, idioma = 'pt') {
  const r = await fetch(`${RENDER_URL}/narrativa-roteiro`, {
    method: 'POST',
    headers: await comToken(),
    body: JSON.stringify({ imagens, idioma, origem: 'web' })   // imagens JÁ na ordem
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    if (r.status === 402 || e.creditos) {
      avisarSemCreditos(e.custo);
      throw new Error(e.custo ? `Créditos insuficientes (precisa de ${e.custo})` : 'Créditos insuficientes');
    }
    if (r.status === 403) throw new Error(e.erro || 'Diretor de Narrativa indisponível no seu plano');
    throw new Error(e.erro || 'Não foi possível gerar o roteiro');
  }
  const d = await r.json();
  if (!d.takes || !d.takes.length) throw new Error('A IA não retornou um roteiro válido');
  return { takes: d.takes, ritmo: d.ritmo || '', trilha: d.trilha || '' };
}

// Gera UMA etapa (assíncrono com polling). Devolve o base64 da imagem.
// Exportada para o modo "uma a uma", em que o componente controla o ritmo.
export async function gerarEtapaTimelapse({ image, prompt, proporcao, resolucao, primeira }, { intervalo = 4000, maxTentativas = 200 } = {}) {
  const r = await fetch(`${RENDER_URL}/timelapse-imagem`, {
    method: 'POST',
    headers: await comToken(),
    body: JSON.stringify({ image, prompt, proporcao, resolucao, primeira: !!primeira, origem: 'web' })
  });
  if (r.status === 402) { avisarSemCreditos(); throw new Error('Créditos insuficientes para a próxima etapa'); }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Falha ao iniciar a etapa');
  }
  const { jobId } = await r.json();
  if (!jobId) throw new Error('O servidor não devolveu um jobId');

  for (let i = 0; i < maxTentativas; i++) {
    await new Promise((s) => setTimeout(s, intervalo));
    let job;
    try {
      const s = await fetch(`${RENDER_URL}/timelapse-imagem-status?id=${jobId}`);
      job = await s.json();
    } catch { continue; }
    const st = (job.status || '').toString().toLowerCase();
    if (st === 'pronto') return job.imagem;
    if (st === 'erro') throw new Error(job.erro || 'Erro ao gerar a etapa');
    if (st === 'ocupado') throw new Error('O servidor está cheio agora. Tente em alguns minutos.');
  }
  throw new Error('A etapa demorou demais. Tente novamente.');
}

// Orquestra a sequência inteira. Chama:
//   onEtapas(etapas)          — assim que o plano volta (para desenhar os slots)
//   onImagem(indice, base64)  — a cada etapa pronta
//   onStatus(texto)           — mensagens de progresso
// Devolve o array de base64 (da obra pronta ao terreno).
export async function gerarTimelapse(
  { image, tipo = 'externo', modoInterior = 'reforma', proporcao = 'auto', resolucao = '2k' },
  { onEtapas, onImagem, onStatus } = {}
) {
  if (onStatus) onStatus('planejando');
  const etapas = await timelapsePrompts({ image, tipo, modoInterior });
  if (onEtapas) onEtapas(etapas);

  const saidas = [];
  let base = image;   // a 1ª etapa parte da imagem final; depois, da anterior
  for (let i = 0; i < etapas.length; i++) {
    if (onStatus) onStatus(`etapa ${i + 1} de ${etapas.length}`);
    // Cada etapa vem como { titulo, pt } — o servidor espera o prompt PT em `pt`
    // (o plugin usa etapas[i].pt). Fallbacks por segurança.
    const et = etapas[i] || {};
    const prompt = et.pt || et.prompt || (typeof et === 'string' ? et : '');
    const b64 = await gerarEtapaTimelapse({ image: base, prompt, proporcao, resolucao });
    saidas.push(b64);
    if (onImagem) onImagem(i, b64);
    base = b64;   // encadeia: a próxima etapa desconstrói a partir desta
  }
  if (onStatus) onStatus('pronto');
  return saidas;
}
