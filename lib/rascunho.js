// ═══════════════════════════════════════════════════════════
//  lib/rascunho.js — guarda o que a pessoa estava fazendo
//
//  Fechar a aba não pode custar a leitura de materiais (que custou
//  créditos) nem meia hora de ajuste fino de luz e entorno. Ao voltar,
//  o painel está como ela deixou.
//
//  Fica no localStorage: é do navegador dela, não precisa do servidor,
//  e sobrevive a fechar o navegador inteiro.
//
//  ⚠ PRIVACIDADE: a chave é amarrada ao ID da conta logada. Sem isso, num
//  navegador compartilhado (ou ao trocar de conta), a conta B via o
//  rascunho — e a imagem base — da conta A. A chave scoped resolve isso.
//
//  A IMAGEM BASE vai junto (em base64). É o item mais pesado — um PNG de
//  2K passa de 2 MB, e o localStorage costuma parar em ~5 MB. Por isso
//  guardamos no máximo ~3 MB de imagem; acima disso, salvamos todo o
//  resto e deixamos a imagem de fora.
//
//  Cada aba tem sua chave ('render', 'batch', 'timelapse'…).
// ═══════════════════════════════════════════════════════════

const PREFIXO        = 'cora_rascunho_';
const MAX_IMG        = 3_000_000;   // ~3 MB de base64
const MAX_CENAS_BYTES = 3_000_000;  // teto p/ as imagens das cenas juntas
const VALIDADE       = 7 * 24 * 60 * 60 * 1000;   // 7 dias

// ID da conta logada (para separar o rascunho por conta).
function contaId() {
  try {
    const c = JSON.parse(localStorage.getItem('cora_conta') || 'null');
    return c && c.id != null ? String(c.id) : 'anon';
  } catch {
    return 'anon';
  }
}

function chaveDe(aba) {
  return PREFIXO + aba + '_' + contaId();
}

// Remove os rascunhos ANTIGOS (sem o id da conta) que ficaram no navegador
// antes desta correção — eles podiam ser de outra conta. Roda uma vez.
function limparLegado() {
  if (typeof window === 'undefined' || limparLegado._feito) return;
  limparLegado._feito = true;
  try {
    const remover = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      // legado = começa com o prefixo e NÃO termina com "_<numero>" (o id da conta)
      if (k && k.startsWith(PREFIXO) && !/_\d+$/.test(k) && !/_anon$/.test(k)) {
        remover.push(k);
      }
    }
    remover.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function salvarRascunho(aba, estado) {
  if (typeof window === 'undefined') return;
  limparLegado();
  const CHAVE = chaveDe(aba);

  try {
    const dados = { ...estado, salvoEm: Date.now() };

    if (dados.imagem && dados.imagem.length > MAX_IMG) {
      dados.imagem = null;
      dados.previa = null;
      dados.imagemGrande = true;
    }

    dados.refs = [];

    if (Array.isArray(dados.cenas)) {
      let acumulado = 0;
      dados.cenas = dados.cenas.map((c) => {
        const peso = (c.base64 || '').length;
        if (acumulado + peso > MAX_CENAS_BYTES) {
          return { ...c, base64: null, previa: null, semImagem: true };
        }
        acumulado += peso;
        return c;
      });
    }

    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch (e) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        ...estado,
        imagem: null, previa: null, refs: [],
        imagemGrande: true,
        salvoEm: Date.now()
      }));
    } catch {
      // Desistiu. Não vale quebrar a página por causa disso.
    }
  }
}

export function lerRascunho(aba) {
  if (typeof window === 'undefined') return null;
  limparLegado();
  const CHAVE = chaveDe(aba);

  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return null;

    const d = JSON.parse(cru);

    if (!d.salvoEm || (Date.now() - d.salvoEm) > VALIDADE) {
      localStorage.removeItem(CHAVE);
      return null;
    }

    return d;
  } catch {
    return null;
  }
}

export function limparRascunho(aba) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(chaveDe(aba)); } catch {}
}
