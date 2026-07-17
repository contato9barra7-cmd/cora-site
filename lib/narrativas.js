// ═══════════════════════════════════════════════════════════
//  Narrativas (Diretor de Narrativa) — salvas no servidor
//
//  Uma narrativa (várias imagens + ordem + roteiro) custa créditos e tempo.
//  Guardá-la no banco/R2 permite "continuar de onde parei" (não finalizada)
//  e reabrir depois na aba Análises — mesmo trocando de máquina.
//
//  As imagens são pesadas demais para o localStorage; por isso vão para o
//  servidor (como as leituras e as gerações).
// ═══════════════════════════════════════════════════════════

const RENDER_URL = process.env.NEXT_PUBLIC_RENDER_URL
  || 'https://cora-render-server-production.up.railway.app';

function comToken() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('cora_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {})
  };
}

// Lista as narrativas (thumb + metadados). Nunca lança.
export async function listarNarrativas(limite = 40) {
  try {
    const r = await fetch(`${RENDER_URL}/narrativas?limite=${limite}`, { headers: comToken() });
    if (!r.ok) return [];
    const d = await r.json();
    return d.itens || [];
  } catch (e) { return []; }
}

// Cria uma narrativa (sobe as imagens). Devolve o id, ou null.
export async function criarNarrativa({ imagens, ordem, takes, ritmo, trilha, finalizado, plataforma }) {
  try {
    const r = await fetch(`${RENDER_URL}/narrativas`, {
      method: 'POST',
      headers: comToken(),
      body: JSON.stringify({ imagens, ordem, takes, ritmo, trilha, finalizado, plataforma: plataforma || 'web' })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.id || null;
  } catch (e) { return null; }
}

// Atualiza só os metadados (ordem/takes/ritmo/trilha/finalizado). Nunca lança.
export async function atualizarNarrativa(id, { ordem, takes, ritmo, trilha, finalizado }) {
  if (!id) return false;
  try {
    const r = await fetch(`${RENDER_URL}/narrativas`, {
      method: 'POST',
      headers: comToken(),
      body: JSON.stringify({ id, ordem, takes, ritmo, trilha, finalizado })
    });
    return r.ok;
  } catch (e) { return false; }
}

// Abre uma narrativa completa (imagens em base64). Devolve o objeto, ou null.
export async function pegarNarrativa(id) {
  try {
    const r = await fetch(`${RENDER_URL}/narrativas/${id}`, { headers: comToken() });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

export async function apagarNarrativa(id) {
  try {
    const r = await fetch(`${RENDER_URL}/narrativas/${id}`, { method: 'DELETE', headers: comToken() });
    return r.ok;
  } catch (e) { return false; }
}
