// ─────────────────────────────────────────────────────────────────────────
//  O idioma da tela, lido FORA do React.
//
//  Este espelho ja existia dentro do i18n.js, e mudou de casa por causa do
//  peso: o i18n tem 7 mil linhas de dicionario, e o `auth.js` e importado
//  por quase tudo. Importar o i18n de dentro dele arrastaria os tres
//  dicionarios inteiros para pacotes que nunca traduzem nada. Aqui sao 50
//  linhas, e o i18n reexporta o que esta aqui — quem ja importava
//  `IDIOMAS`, `localeDeIdioma` ou `idiomaAtual` dele nao muda nada.
//
//  Quem mantem o espelho continua sendo o IdiomaProvider, chamando
//  `definirIdiomaAtual`. A leitura da tela abaixo e so a rede de seguranca
//  para antes de o provider montar.
//
//  Serve para duas coisas:
//    · o `tg()` e o `tOpt()` do i18n, que traduzem fora de componente
//    · o cabecalho `X-Cora-Idioma` que vai em toda chamada aos servidores
//
//  O cabecalho e o que faz o cora-auth e o cora-render-server escreverem
//  "Wrong email or password" em vez de "Email ou senha incorretos". A
//  conta tem um idioma guardado, mas ele nao basta: entrar, cadastrar e
//  recuperar senha acontecem antes de existir conta, e mesmo depois a
//  pessoa pode estar com a tela em outra lingua.
// ─────────────────────────────────────────────────────────────────────────
export const IDIOMAS = ['pt', 'en', 'es'];

export function localeDeIdioma(idioma) {
  return idioma === 'en' ? 'en-US' : idioma === 'es' ? 'es-ES' : 'pt-BR';
}

let _atual = null;   // null = o provider ainda nao falou

export function definirIdiomaAtual(idioma) {
  if (IDIOMAS.includes(idioma)) _atual = idioma;
}

export function idiomaAtual() {
  if (_atual) return _atual;
  // Antes de o provider montar, le da propria tela. A ordem e a mesma que
  // ele usa, para os dois nunca discordarem: a rota /en e /es mandam,
  // depois o que ficou salvo, depois o `lang` do documento, depois o
  // navegador.
  if (typeof window === 'undefined') return 'pt';
  try {
    const path = window.location.pathname || '';
    if (path === '/es' || path.startsWith('/es/')) return 'es';
    if (path === '/en' || path.startsWith('/en/')) return 'en';
    const salvo = localStorage.getItem('cora_idioma');
    if (salvo && IDIOMAS.includes(salvo)) return salvo;
    const doc = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
    if (IDIOMAS.includes(doc)) return doc;
    const nav = (navigator.language || 'pt').slice(0, 2).toLowerCase();
    if (IDIOMAS.includes(nav)) return nav;
  } catch (e) {}
  return 'pt';
}
