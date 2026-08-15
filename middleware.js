import { NextResponse } from 'next/server';

/* ── MODO CONSTRUÇÃO ──
   true  = quem entrar em corarender.com vê SÓ a página "em construção",
           não importa a URL que tente. O site continua publicado, mas escondido.
   false = site liberado normal.

   No dia do lançamento: troca pra false e dá git push. Só isso.

   Pra VOCÊ testar o site de verdade com o modo ligado, entra UMA vez em:
   https://corarender.com/?chave=cora-add6505aa051848b
   Isso grava um cookie no seu navegador e libera tudo por 1 ano — nesse
   navegador. Repete o link em cada navegador/celular que for usar pra testar. */
const MODO_CONSTRUCAO = true;
const CHAVE = 'cora-add6505aa051848b';
const COOKIE = 'cora_preview';

export function middleware(req) {
  const url = req.nextUrl;

  if (!MODO_CONSTRUCAO) {
    // Modo desligado: se alguém guardou o link da página de construção, vai pra home.
    if (url.pathname === '/em-construcao') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Chegou com a chave na URL? Grava o cookie e reabre a mesma página, sem a chave.
  if (url.searchParams.get('chave') === CHAVE) {
    const limpa = url.clone();
    limpa.searchParams.delete('chave');
    const res = NextResponse.redirect(limpa);
    res.cookies.set(COOKIE, CHAVE, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return res;
  }

  // Tem o cookie (é você testando): site normal.
  if (req.cookies.get(COOKIE)?.value === CHAVE) return NextResponse.next();

  // Visitante comum: qualquer URL mostra a página "em construção".
  // (rewrite = a URL na barra não muda, mas o conteúdo é o da construção)
  if (url.pathname === '/em-construcao') return NextResponse.next();
  return NextResponse.rewrite(new URL('/em-construcao', req.url));
}

/* Não roda nos arquivos estáticos (imagens, fontes, _next) — só nas páginas. */
export const config = {
  matcher: ['/((?!_next/|favicon.ico|.*\\..*).*)'],
};
