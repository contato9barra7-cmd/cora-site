import { NextResponse } from 'next/server';

/* ── MODO CONSTRUÇÃO ──
   true  = quem entrar em corarender.com vê SÓ a página "em construção",
           não importa a URL que tente. O site continua publicado, mas escondido.
   false = site liberado normal.

   No dia do lançamento: troca pra false e dá git push. Só isso. */
const MODO_CONSTRUCAO = true;

/* ── AS CHAVES DE ENTRADA ──
   Cada pessoa ou grupo que precisa ver o site fechado ganha a SUA chave, e não
   a mesma para todo mundo. O motivo é simples: chave compartilhada não se
   revoga. Se a agência de marketing repassa o link num grupo de WhatsApp e
   você quiser cortar, com uma chave só a sua opção seria trocar a chave e se
   trancar fora junto, e todo mundo de novo.

   Assim, apagar a linha da agência e dar push corta ELES, e só eles.

   Um cookie por chave, também de propósito: se as duas dividissem o mesmo
   nome de cookie, revogar uma derrubaria a sessão de quem tem a outra.

   Como usar: mandar o link com `?chave=` uma vez. O cookie grava e vale por um
   ano naquele navegador. Cada navegador e cada celular precisa abrir o link
   uma vez. */
const CHAVES = {
  'cora-add6505aa051848b': 'cora_preview',   // a sua, de sempre
  'cora-mkt-9b7f2c41e0a3': 'cora_mkt',       // agência de marketing (set/2026)
};

export function middleware(req) {
  const url = req.nextUrl;

  if (!MODO_CONSTRUCAO) {
    // Modo desligado: se alguém guardou o link da página de construção, vai pra home.
    if (url.pathname === '/em-construcao') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Chegou com uma chave válida na URL? Grava o cookie dela e reabre a mesma
  // página, sem a chave: o link some da barra e não vai junto num print.
  const chave = url.searchParams.get('chave');
  if (chave && CHAVES[chave]) {
    const limpa = url.clone();
    limpa.searchParams.delete('chave');
    const res = NextResponse.redirect(limpa);
    res.cookies.set(CHAVES[chave], chave, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return res;
  }

  // Tem algum dos cookies, com o valor que ainda está na lista? Site normal.
  // Tirar uma chave daqui derruba o cookie dela na hora, mesmo que o navegador
  // ainda o tenha guardado: é isso que faz a revogação valer.
  for (const [valor, cookie] of Object.entries(CHAVES)) {
    if (req.cookies.get(cookie)?.value === valor) return NextResponse.next();
  }

  // Visitante comum: qualquer URL mostra a página "em construção".
  // (rewrite = a URL na barra não muda, mas o conteúdo é o da construção)
  if (url.pathname === '/em-construcao') return NextResponse.next();
  return NextResponse.rewrite(new URL('/em-construcao', req.url));
}

/* Não roda nos arquivos estáticos (imagens, fontes, _next) — só nas páginas. */
export const config = {
  matcher: ['/((?!_next/|favicon.ico|.*\\..*).*)'],
};
