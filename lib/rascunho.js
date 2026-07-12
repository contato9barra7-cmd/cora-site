// ═══════════════════════════════════════════════════════════
//  lib/rascunho.js — guarda o que a pessoa estava fazendo
//
//  Fechar a aba não pode custar a leitura de materiais (que custou 15
//  créditos) nem meia hora de ajuste fino de luz e entorno. Ao voltar,
//  o painel está como ela deixou.
//
//  Fica no localStorage: é do navegador dela, não precisa do servidor,
//  e sobrevive a fechar o navegador inteiro.
//
//  A IMAGEM BASE vai junto (em base64). É o item mais pesado — um PNG de
//  2K passa de 2 MB, e o localStorage costuma parar em ~5 MB. Por isso
//  guardamos no máximo ~3 MB de imagem; acima disso, salvamos todo o
//  resto e deixamos a imagem de fora (a pessoa reescolhe, mas não perde
//  os materiais).
// ═══════════════════════════════════════════════════════════

const CHAVE     = 'cora_rascunho_render';
const MAX_IMG   = 3_000_000;   // ~3 MB de base64
const VALIDADE  = 7 * 24 * 60 * 60 * 1000;   // 7 dias

export function salvarRascunho(estado) {
  if (typeof window === 'undefined') return;

  try {
    const dados = { ...estado, salvoEm: Date.now() };

    // Imagem grande demais? Salva o resto — os materiais são o que importa.
    if (dados.imagem && dados.imagem.length > MAX_IMG) {
      dados.imagem = null;
      dados.previa = null;
      dados.imagemGrande = true;   // para avisar a pessoa
    }

    // Referências não vão: são muitas e pesadas. A pessoa reescolhe.
    dados.refs = [];

    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch (e) {
    // Estourou a cota do localStorage: tenta salvar só o essencial
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

export function lerRascunho() {
  if (typeof window === 'undefined') return null;

  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return null;

    const d = JSON.parse(cru);

    // Rascunho velho demais não ajuda ninguém
    if (!d.salvoEm || (Date.now() - d.salvoEm) > VALIDADE) {
      localStorage.removeItem(CHAVE);
      return null;
    }

    return d;
  } catch {
    return null;
  }
}

export function limparRascunho() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(CHAVE); } catch {}
}
