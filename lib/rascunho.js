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
//
//  Cada aba tem sua chave ('render', 'batch'): o mecanismo é o mesmo, mas
//  o que se guarda é diferente.
// ═══════════════════════════════════════════════════════════

const PREFIXO   = 'cora_rascunho_';
const MAX_IMG   = 3_000_000;   // ~3 MB de base64
const VALIDADE  = 7 * 24 * 60 * 60 * 1000;   // 7 dias

export function salvarRascunho(aba, estado) {
  if (typeof window === 'undefined') return;
  const CHAVE = PREFIXO + aba;

  try {
    const dados = { ...estado, salvoEm: Date.now() };

    // A regra: guardamos o que CUSTOU (os materiais lidos, que valeram
    // créditos) e descartamos os PIXELS (que a pessoa reescolhe em segundos).
    // Sem isso a cota do localStorage estoura na primeira imagem 2K.

    if (dados.imagem && dados.imagem.length > MAX_IMG) {
      dados.imagem = null;
      dados.previa = null;
      dados.imagemGrande = true;   // para avisar a pessoa
    }

    // As referências saem: são muitas, e as aprovadas voltam sozinhas do
    // banco na próxima visita.
    dados.refs = [];

    // As CENAS ficam, com as imagens: sem elas, a pessoa teria que subir
    // tudo de novo ao trocar de aba. Mas o localStorage tem teto (~5 MB),
    // então cabe até onde couber — e o resto perde só o pixel, não o nome.
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

export function lerRascunho(aba) {
  if (typeof window === 'undefined') return null;
  const CHAVE = PREFIXO + aba;

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

export function limparRascunho(aba) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(PREFIXO + aba); } catch {}
}
