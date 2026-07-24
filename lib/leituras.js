import { getAccessToken } from './auth';
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
  || 'https://render.corarender.com';

async function comToken() {
  const t = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {})
  };
}

export async function listarLeituras(limite = 40) {
  const r = await fetch(`${RENDER_URL}/leituras?limite=${limite}`, {
    headers: await comToken()
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
      headers: await comToken(),
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
    headers: await comToken()
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.erro || 'Não foi possível apagar');
  }
}


// Os BYTES da imagem que foi lida — para o botão "Usar no Render/Batch"
// levar a imagem junto com o texto.
//
// Só serve às leituras cuja imagem NÓS guardamos (upload solto, cenas do
// batch). Quando a leitura veio de uma geração, use `bytesDaGeracao`.
export async function bytesDaLeitura(id) {
  const r = await fetch(`${RENDER_URL}/leituras/${id}/imagem`, {
    headers: await comToken()
  });

  if (!r.ok) return null;

  const d = await r.json();
  return d.base64 || null;
}


// Os BYTES das referências de estilo de uma leitura.
//
// Uma análise não é só o texto: ela foi feita CRUZANDO a cena com estas
// imagens, e o resultado depende delas. Reaproveitar sem elas traria a cena
// mas não o estilo — e a geração sairia diferente.
export async function refsDaLeitura(id) {
  const r = await fetch(`${RENDER_URL}/leituras/${id}/refs`, {
    headers: await comToken()
  });

  if (!r.ok) return [];

  const d = await r.json();
  return d.refs || [];
}
