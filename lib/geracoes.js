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

// ── Baixar uma imagem ──
//  formato: 'png' (original, como veio do servidor) | 'jpeg' (convertido no
//  navegador, arquivo menor). O plugin oferece as duas opcoes; aqui tambem.
//
//  A conversao para JPEG acontece no <canvas> do proprio navegador — nao
//  gasta nada do servidor e nao ocupa espaco no R2.
export async function baixarImagem(url, nomeArquivo, formato = 'png') {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Não foi possível baixar a imagem');
  const blob = await r.blob();

  if (formato === 'png') {
    disparaDownload(blob, `${nomeArquivo}.png`);
    return;
  }

  // JPEG: desenha num canvas e re-exporta. Fundo branco, porque JPEG
  // nao tem transparencia (senao areas transparentes viram preto).
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width  = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);

  const jpegBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.95)
  );
  disparaDownload(jpegBlob, `${nomeArquivo}.jpg`);
}

function disparaDownload(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  upscale:     'Upscale'
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
