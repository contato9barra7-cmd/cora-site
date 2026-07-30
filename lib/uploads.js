// ═══════════════════════════════════════════════════════════
//  lib/uploads.js — a galeria de imagens que a pessoa SOBE
//
//  Bate no CORA-RENDER-SERVER (mesmo do feed). O token é o JWT do login.
//  Guarda a imagem base e as referências que a pessoa envia do PC, para ela
//  reencontrar depois na aba "Uploads" do seletor (retidas por 90 dias).
// ═══════════════════════════════════════════════════════════

import { getAccessToken } from './auth';

const RENDER_URL = process.env.NEXT_PUBLIC_RENDER_URL
  || 'https://render.corarender.com';

async function comToken() {
  const token = await getAccessToken();
  if (!token) throw new Error('Não autenticado');
  return { 'Authorization': 'Bearer ' + token };
}

// ── Salvar (dispare-e-esqueça) ──
//  Chamado quando a pessoa sobe um arquivo do PC. NUNCA lança para fora: um
//  upload que não salva não pode atrapalhar a geração — só não aparece na aba.
export async function salvarUpload(base64, nome) {
  try {
    if (!base64) return null;
    const r = await fetch(`${RENDER_URL}/uploads`, {
      method: 'POST',
      headers: { ...(await comToken()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, nome: nome || null, plataforma: 'web' })
    });
    if (!r.ok) return null;
    const d = await r.json().catch(() => ({}));
    return d.id || null;
  } catch {
    return null;
  }
}

// ── Listar (galeria) ──
export async function listarUploads({ busca, limite } = {}) {
  const q = new URLSearchParams();
  if (busca)  q.set('busca', busca);
  if (limite) q.set('limite', String(limite));

  const r = await fetch(`${RENDER_URL}/uploads?${q.toString()}`, {
    headers: await comToken()
  });
  if (r.status === 401) throw new Error('Sessão expirada. Entre novamente.');
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível carregar seus uploads');
  }
  const d = await r.json();
  return d.itens || [];
}

// ── Os bytes de um upload escolhido (para ir à geração) ──
export async function bytesDoUpload(id) {
  const r = await fetch(`${RENDER_URL}/uploads/${id}/base64`, {
    headers: await comToken()
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível abrir este upload');
  }
  const d = await r.json();
  return d.base64;
}

// ── Apagar ──
export async function apagarUpload(id) {
  const r = await fetch(`${RENDER_URL}/uploads/${id}`, {
    method: 'DELETE',
    headers: await comToken()
  });
  return r.ok;
}
