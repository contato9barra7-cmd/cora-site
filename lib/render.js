// ═══════════════════════════════════════════════════════════
//  lib/render.js — a geração de imagens no /app
//
//  Fala com o CORA-RENDER-SERVER, as MESMAS rotas que o plugin usa.
//  O servidor nao sabe (nem se importa) se a imagem veio do SketchUp
//  ou de um upload — por isso nao foi preciso criar rota nenhuma.
//
//  Padrao assincrono: POST devolve um jobId na hora, e o cliente faz
//  polling no /{rota}-status ate ficar 'pronto'. Isso existe porque o
//  Railway derruba requisicoes acima de ~5 min.
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

// ── Arquivo -> base64 puro (sem o "data:image/png;base64,") ──
//  E o formato que o servidor espera, o mesmo que o plugin manda.
export function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo'));
    r.readAsDataURL(file);
  });
}

// ── Gera um id de lote (agrupa as N variacoes numa linha do feed) ──
export function novoLoteId(prefixo = 'rd') {
  return `${prefixo}_${Math.floor(Date.now() / 1000)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Ler materiais da imagem ──
//  O GPT olha o print e descreve os materiais que ve. E a MESMA rota do
//  plugin: la o print vem do SketchUp, aqui vem do upload. Nada muda.
export async function lerMateriais(imagemBase64, tipo) {
  const r = await fetch(`${RENDER_URL}/ler-materiais`, {
    method: 'POST',
    headers: comToken(),
    body: JSON.stringify({ image: imagemBase64, tipo: tipo || 'interno', idioma: 'pt' })
  });

  if (r.status === 403) throw new Error('Leitura de materiais indisponível no seu plano');
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível ler os materiais');
  }

  const d = await r.json();
  return d.materiais || '';
}

// ═══════════════════════════════════════════════════════════
//  POST + polling — o coracao da geracao
//
//  Estados do servidor:
//    na_fila     → entrou na fila (muito trafego)
//    processando → rodando
//    ocupado     → a fila estourou; a pessoa reenvia
//    pronto      → terminou (pode ter `imagem` ou `erroImagem`)
//    erro        → falhou
//
//  onEstado recebe cada mudanca, para a UI mostrar o que esta havendo.
// ═══════════════════════════════════════════════════════════
async function postComPolling(rota, corpo, { onEstado, intervalo = 4000, maxTentativas = 200 } = {}) {
  const r = await fetch(`${RENDER_URL}/${rota}`, {
    method: 'POST',
    headers: comToken(),
    body: JSON.stringify(corpo)
  });

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
      continue;   // rede oscilou; tenta de novo na próxima volta
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
//  Igual ao plugin: a 1a imagem vai pelo /render (que gera o prompt com
//  o GPT e depois a imagem). As demais vao pelo /gerar-imagem, REUSANDO
//  o mesmo prompt — sem chamar o GPT de novo.
//
//  Assim N imagens custam 1 prompt + N Gemini, em vez de N prompts.
//
//  onProgresso(feito, total, estado) e chamado a cada passo.
// ═══════════════════════════════════════════════════════════
export async function gerarRender(cfg, { onProgresso } = {}) {
  const loteId = novoLoteId('rd');
  const total  = Math.max(1, Math.min(cfg.quantidade || 1, 10));

  const imagens = [];
  let promptReuso = null;

  for (let i = 0; i < total; i++) {
    const aviso = (estado) => onProgresso && onProgresso(i, total, estado);

    let job;
    if (promptReuso === null) {
      // 1a imagem: gera o prompt + a imagem
      job = await postComPolling('render', {
        image:         cfg.imagem,
        tipo:          cfg.tipo,
        proporcao:     cfg.proporcao,
        resolucao:     cfg.resolucao,
        mood:          cfg.mood,
        materiais:     cfg.materiais,
        entorno:       cfg.entorno,
        luzArtificial: cfg.luzArtificial,
        direcaoLuz:    cfg.direcaoLuz,
        descLuz:       cfg.descLuz,
        refTexto:      cfg.refTexto,
        referencias:   cfg.referencias,
        gerarImagem:   true,
        loteId,
        ordem: i
      }, { onEstado: aviso });

      promptReuso = job.prompt || '';
    } else {
      // demais: reusa o prompt
      job = await postComPolling('gerar-imagem', {
        prompt:      promptReuso,
        image:       cfg.imagem,
        proporcao:   cfg.proporcao,
        resolucao:   cfg.resolucao,
        referencias: cfg.referencias,
        ferramenta:  'render',
        observacoes: cfg.materiais,
        loteId,
        ordem: i
      }, { onEstado: aviso });
    }

    if (job.imagem) imagens.push(job.imagem);
    if (onProgresso) onProgresso(i + 1, total, 'pronto');
  }

  if (imagens.length === 0) throw new Error('Nenhuma imagem foi gerada');
  return { loteId, imagens, prompt: promptReuso };
}

// ═══════════════════════════════════════════════════════════
//  Opções dos controles — copiadas do plugin, valor por valor.
//  Os valores (data-val) vão para o servidor exatamente como estão:
//  o promptador do GPT foi ajustado para esses textos.
// ═══════════════════════════════════════════════════════════

export const TIPOS = [
  { val: 'interno', rotulo: 'Interno' },
  { val: 'externo', rotulo: 'Externo' },
  { val: 'planta',  rotulo: 'Planta baixa' }
];

export const PROPORCOES = [
  { val: 'auto',  rotulo: 'Auto',  w: 20, h: 20 },
  { val: '1:1',   rotulo: '1:1',   w: 20, h: 20 },
  { val: '21:9',  rotulo: '21:9',  w: 26, h: 12 },
  { val: '16:9',  rotulo: '16:9',  w: 24, h: 16 },
  { val: '9:16',  rotulo: '9:16',  w: 12, h: 24 },
  { val: '4:3',   rotulo: '4:3',   w: 24, h: 18 },
  { val: '4:5',   rotulo: '4:5',   w: 16, h: 24 },
  { val: '5:4',   rotulo: '5:4',   w: 24, h: 16 },
  { val: '3:4',   rotulo: '3:4',   w: 14, h: 24 },
  { val: '3:2',   rotulo: '3:2',   w: 24, h: 14 },
  { val: '2:3',   rotulo: '2:3',   w: 14, h: 24 }
];

export const LUZ_TIPOS = [
  { val: 'Direta', rotulo: 'Luz direta' },
  { val: 'Difusa', rotulo: 'Luz difusa' }
];

// Os moods do plugin, nos 3 grupos que ele usa
export const MOODS = [
  {
    grupo: 'Dia',
    itens: ['Dia claro editorial', 'Manhã', 'Meio dia', 'Tarde']
  },
  {
    grupo: 'Transição',
    itens: ['Amanhecer', 'Golden hour', 'Blue hour']
  },
  {
    grupo: 'Clima',
    itens: ['Nublado', 'Neve', 'Chuvoso', 'Neblina']
  },
  {
    grupo: 'Noite',
    itens: ['Noite clara', 'Noite estrelada', 'Noite escura', 'Noite chuvosa']
  }
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
