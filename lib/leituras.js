// ═══════════════════════════════════════════════════════════
//  Leituras de materiais — o histórico
//
//  Ler os materiais de uma imagem custa 15 créditos. Sem guardar, fechar o
//  navegador significa pagar de novo pelo mesmo trabalho.
//
//  As leituras vivem no BANCO, não no localStorage: assim sobrevivem à
//  troca de máquina, à limpeza do cache, ao fim da sessão. Ficam 90 dias
//  (o mesmo prazo das gerações) e guardamos as últimas 100.
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

export async function listarLeituras(limite = 40) {
  const r = await fetch(`${RENDER_URL}/leituras?limite=${limite}`, {
    headers: comToken()
  });
  if (!r.ok) return [];
  const d = await r.json();
  return d.itens || [];
}

// Guarda uma leitura. Nunca lança: uma leitura não salva é chato, mas não
// vale quebrar a geração que a pessoa está fazendo.
export async function salvarLeitura({ origem, titulo, materiais, geracaoId, thumb }) {
  if (!materiais) return null;

  try {
    const r = await fetch(`${RENDER_URL}/leituras`, {
      method: 'POST',
      headers: comToken(),
      body: JSON.stringify({ origem, titulo, materiais, geracaoId, thumb })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.id;
  } catch {
    return null;
  }
}

export async function apagarLeitura(id) {
  const r = await fetch(`${RENDER_URL}/leituras/${id}`, {
    method: 'DELETE',
    headers: comToken()
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível apagar');
  }
}
