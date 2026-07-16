// ═══════════════════════════════════════════════════════════
//  lib/geracoes.js — o feed do /app
//
//  Estas rotas batem no CORA-RENDER-SERVER (nao no cora-auth),
//  porque e ele quem fala com o R2 e com a tabela `geracoes`.
//  O token e o mesmo — o JWT do login, guardado no localStorage.
// ═══════════════════════════════════════════════════════════

import { lerToken } from './auth';

const RENDER_URL = 'https://cora-render-server-production.up.railway.app';

// Monta o header com o Bearer. Lanca se nao tiver token.
function comToken() {
  const token = lerToken();
  if (!token) throw new Error('Não autenticado');
  return { 'Authorization': 'Bearer ' + token };
}

// Pede ao servidor a URL de download (attachment) de um vídeo.
export async function urlDownloadVideo(id, nome = 'cora-animacao.mp4') {
  const r = await fetch(`${RENDER_URL}/baixar-geracao?id=${encodeURIComponent(id)}&nome=${encodeURIComponent(nome)}`, {
    headers: comToken()
  });
  if (!r.ok) throw new Error('Não foi possível preparar o download');
  const d = await r.json();
  return d.url;
}

// ── Lista o feed ──
//  filtros: { tipo, favorito, busca, limite, antesDe }
//
//  Devolve LOTES. Cada lote traz suas N imagens (as variacoes de uma
//  mesma geracao), ja com as URLs assinadas do R2 (valem 6h).
//
//  Formato:
//    [{
//      loteId, ferramenta, tipo, observacoes, proporcao, resolucao,
//      duracaoSeg, criadoEm,
//      original: 'https://...',            // o print do SketchUp
//      itens: [{ id, ordem, favorito, url }]
//    }]
export async function listarGeracoes(filtros = {}) {
  const q = new URLSearchParams();
  if (filtros.tipo)       q.set('tipo', filtros.tipo);
  if (filtros.ferramenta) q.set('ferramenta', filtros.ferramenta);
  if (filtros.favorito)   q.set('favorito', '1');

  // Filtros avançados: listas viram "a,b,c"
  if (filtros.ferramentas?.length) q.set('ferramentas', filtros.ferramentas.join(','));
  if (filtros.proporcoes?.length)  q.set('proporcoes',  filtros.proporcoes.join(','));
  if (filtros.resolucoes?.length)  q.set('resolucoes',  filtros.resolucoes.join(','));
  if (filtros.de)  q.set('de',  filtros.de);
  if (filtros.ate) q.set('ate', filtros.ate);
  if (filtros.baixadas)  q.set('baixadas', '1');
  if (filtros.favoritos) q.set('favoritos', '1');
  if (filtros.aprovadas) q.set('aprovadas', '1');
  if (filtros.busca)    q.set('busca', filtros.busca);
  if (filtros.limite)   q.set('limite', String(filtros.limite));
  if (filtros.antesDe)  q.set('antesDe', filtros.antesDe);

  const r = await fetch(`${RENDER_URL}/geracoes?${q.toString()}`, {
    headers: comToken()
  });

  if (r.status === 401) throw new Error('Sessão expirada. Entre novamente.');
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível carregar o histórico');
  }

  const dados = await r.json();
  return dados.lotes || [];
}

// ── Favoritar / desfavoritar ──
//  Devolve o novo estado (true/false).
export async function alternarFavorito(id) {
  const r = await fetch(`${RENDER_URL}/geracoes/${id}/favorito`, {
    method: 'PATCH',
    headers: comToken()
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível favoritar');
  }
  const dados = await r.json();
  return dados.favorito;
}

// ── Apagar uma geracao ──
export async function apagarGeracao(id) {
  const r = await fetch(`${RENDER_URL}/geracoes/${id}`, {
    method: 'DELETE',
    headers: comToken()
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível apagar');
  }
  return true;
}

// ── Rotulos das ferramentas (para as badges do feed) ──
export const ROTULO_FERRAMENTA = {
  render:      'Render',
  batch:       'Batch',
  edicao:      'Edição',
  ambientacao: 'Ambientação',
  mood:        'Mood',
  pessoa:      'Pessoa',
  derivadas:   'Close-up',
  maquete:     'Maquete',
  r360:        '360°',
  timelapse:   'Timelapse',
  animacao:    'Animação',
  upscale:     'Upscale',
  pos:         'Pós-produção'
};

// ── "há 2 horas", "ontem", "12 jul" ──
export function tempoRelativo(iso) {
  const agora = new Date();
  const data  = new Date(iso);
  const seg   = Math.floor((agora - data) / 1000);

  if (seg < 60)    return 'agora';
  if (seg < 3600)  return `há ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;
  if (seg < 172800) return 'ontem';

  const dias = Math.floor(seg / 86400);
  if (dias < 7) return `há ${dias} dias`;

  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Quantos dias faltam para a geracao ser apagada (lifecycle de 90 dias no R2).
// Devolve null se ainda falta muito (nao vale avisar).
export function diasAteExpirar(iso) {
  const DIAS_RETENCAO = 90;
  const criado = new Date(iso);
  const passou = Math.floor((new Date() - criado) / 86400000);
  const restam = DIAS_RETENCAO - passou;
  if (restam > 14) return null;   // so avisa nas 2 ultimas semanas
  return Math.max(restam, 0);
}

// ═══════════════════════════════════════════════════════════
//  Marca que a pessoa baixou — alimenta o filtro "Baixadas"
//
//  Best-effort: se falhar, o download acontece do mesmo jeito. Não vale
//  atrapalhar o que a pessoa pediu por causa de uma estatística.
// ═══════════════════════════════════════════════════════════
export async function marcarBaixada(id) {
  try {
    await fetch(`${RENDER_URL}/geracoes/${id}/baixada`, {
      method: 'POST',
      headers: comToken()
    });
  } catch {
    // silêncio: o download é o que importa
  }
}

// ═══════════════════════════════════════════════════════════
//  Aprovar — a imagem vira referência de estilo
//
//  NÃO é o mesmo que favoritar. Favorita = gostei. Aprovada = esta define
//  o estilo do projeto, e entra sozinha como referência no Batch.
// ═══════════════════════════════════════════════════════════
export async function alternarAprovado(id) {
  const r = await fetch(`${RENDER_URL}/geracoes/${id}/aprovado`, {
    method: 'PATCH',
    headers: comToken()
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível aprovar');
  }
  const dados = await r.json();
  return dados.aprovado;
}

// As referências que o Batch carrega sozinho
export async function listarAprovadas() {
  const r = await fetch(`${RENDER_URL}/geracoes/aprovadas`, {
    headers: comToken()
  });
  if (!r.ok) return [];
  const dados = await r.json();
  return dados.itens || [];
}

// ═══════════════════════════════════════════════════════════
//  Os bytes de uma geração, em base64
//
//  Por que não damos fetch() direto na URL da imagem: ela vem do R2, que
//  NÃO manda o cabeçalho CORS. O navegador exibe (<img src> não precisa de
//  CORS) mas não deixa ler os bytes. Então quem lê é o servidor, que já tem
//  acesso ao bucket.
//
//  Isto é necessário sempre que a imagem precisa VOLTAR ao servidor: como
//  referência do Batch, como base de uma edição, etc.
// ═══════════════════════════════════════════════════════════
export async function bytesDaGeracao(id) {
  const r = await fetch(`${RENDER_URL}/geracoes/${id}/base64`, {
    headers: comToken()
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível carregar a imagem');
  }
  const dados = await r.json();
  return dados.base64;
}

// ═══════════════════════════════════════════════════════════
//  Baixar uma geração
//
//  Os bytes vêm do SERVIDOR, não da URL do R2: o bucket não manda cabeçalho
//  CORS, então a imagem APARECE numa <img>, mas um fetch() nela morre com
//  "Failed to fetch". Quem lê do bucket é o servidor.
// ═══════════════════════════════════════════════════════════
export async function baixarGeracao(id, formato = 'png') {
  const base64 = await bytesDaGeracao(id);
  const blob = base64ParaBlob(base64);
  const nome = `cora-render-${Date.now()}`;

  if (formato === 'png') {
    salvarBlob(blob, `${nome}.png`);
  } else {
    // JPEG: converte no navegador, para não guardar duas cópias no R2
    const bmp = await createImageBitmap(blob);
    const cv = document.createElement('canvas');
    cv.width = bmp.width;
    cv.height = bmp.height;

    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF';          // JPEG não tem transparência
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(bmp, 0, 0);

    const jpg = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.8));
    salvarBlob(jpg, `${nome}.jpg`);
  }

  // Registra para o filtro "Baixadas" (best-effort: não bloqueia)
  if (id) marcarBaixada(id);
}

function base64ParaBlob(base64, mime = 'image/png') {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function salvarBlob(blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── Salvar uma imagem editada no histórico ──
//
// A imagem que sai da pós-produção vai para o MESMO feed das gerações de IA —
// não como uma camada, mas como uma entrada nova no histórico, ao lado das
// outras. É o que a pessoa espera de "Salvar no Histórico".
//
// O servidor recebe o PNG, sobe para o R2 e grava um lote em `geracoes` com
// ferramenta 'pos'. A rota é POST /geracoes/pos (ver o index.js).
export async function salvarNoHistorico(dataUrl, extras = {}) {
  // A imagem vai como base64 em JSON — o MESMO formato que o servidor já recebe
  // das gerações de IA. Assim a rota reaproveita o `salvarGeracaoAsync` sem
  // precisar de um caminho à parte para multipart.
  const base64 = dataUrl.split(',')[1];

  const r = await fetch(`${RENDER_URL}/geracoes/pos`, {
    method: 'POST',
    headers: { ...comToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imagemBase64: base64,
      proporcao: extras.proporcao || null,
      resolucao: extras.resolucao || null,
      observacoes: extras.observacoes || null
    })
  });

  if (r.status === 401) throw new Error('Sessão expirada. Entre novamente.');
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível salvar no histórico');
  }

  return r.json();
}

// Salva uma etapa do timelapse no feed. Todas as etapas de uma sequência usam
// o MESMO loteId, para ficarem agrupadas (a "sequência") no histórico.
export async function salvarEtapaTimelapse(base64, { loteId, ordem, proporcao, resolucao, original } = {}) {
  const r = await fetch(`${RENDER_URL}/geracoes/pos`, {
    method: 'POST',
    headers: { ...comToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imagemBase64: base64,
      originalBase64: original || null,
      ferramenta: 'timelapse',
      loteId: loteId || ('tl_' + Date.now()),
      ordem: Number.isInteger(ordem) ? ordem : 0,
      proporcao: proporcao || null,
      resolucao: resolucao || null,
      observacoes: 'Timelapse'
    })
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível salvar a etapa no feed');
  }
  return r.json();
}
