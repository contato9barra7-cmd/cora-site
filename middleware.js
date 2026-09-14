import { NextResponse } from 'next/server';
import { PAISES_ES, PAISES_PT, REGEX_BOTS } from './lib/idiomas-pais';

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

  // 1. MODO CONSTRUÇÃO
  if (MODO_CONSTRUCAO) {
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
    let liberado = false;
    for (const [valor, cookie] of Object.entries(CHAVES)) {
      if (req.cookies.get(cookie)?.value === valor) {
        liberado = true;
        break;
      }
    }

    // Visitante comum: qualquer URL mostra a página "em construção".
    if (!liberado) {
      if (url.pathname === '/em-construcao') return NextResponse.next();
      return NextResponse.rewrite(new URL('/em-construcao', req.url));
    }
  } else {
    // Modo desligado: se alguém guardou o link da página de construção, vai pra home.
    if (url.pathname === '/em-construcao') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // 2. ROTAS /es e /en (NUNCA redirecionam)
  const pathname = url.pathname;
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-cora-idioma', 'es');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-cora-idioma', 'en');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 3. ROTAS / e /precos (redirecionamento inteligente de primeira visita)
  if (pathname === '/' || pathname === '/precos') {
    const userAgent = req.headers.get('user-agent') || '';
    const ehBot = REGEX_BOTS.test(userAgent);

    if (!ehBot) {
      const cookieIdioma = req.cookies.get('cora_idioma')?.value;

      if (cookieIdioma) {
        if (cookieIdioma === 'es') {
          const destino = url.clone();
          destino.pathname = pathname === '/' ? '/es' : '/es/precos';
          return NextResponse.redirect(destino, { status: 307 });
        }
        if (cookieIdioma === 'en') {
          const destino = url.clone();
          destino.pathname = pathname === '/' ? '/en' : '/en/precos';
          return NextResponse.redirect(destino, { status: 307 });
        }
        // Se cookieIdioma === 'pt', continua em PT
      } else {
        // Sem cookie: geolocalização pelo header da Vercel
        const pais = (req.headers.get('x-vercel-ip-country') || '').toUpperCase().trim();
        if (pais) {
          if (PAISES_ES.includes(pais)) {
            const destino = url.clone();
            destino.pathname = pathname === '/' ? '/es' : '/es/precos';
            return NextResponse.redirect(destino, { status: 307 });
          }
          if (!PAISES_PT.includes(pais)) {
            const destino = url.clone();
            destino.pathname = pathname === '/' ? '/en' : '/en/precos';
            return NextResponse.redirect(destino, { status: 307 });
          }
        }
        // Se estiver em PAISES_PT ou ausente: continua em PT
      }
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-cora-idioma', 'pt');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Outras rotas do site
  const requestHeaders = new Headers(req.headers);
  const cookieIdioma = req.cookies.get('cora_idioma')?.value;
  requestHeaders.set('x-cora-idioma', (cookieIdioma && ['pt', 'en', 'es'].includes(cookieIdioma)) ? cookieIdioma : 'pt');
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/* Não roda nos arquivos estáticos (imagens, fontes, _next) — só nas páginas. */
export const config = {
  matcher: ['/((?!_next/|favicon.ico|.*\\..*).*)'],
};
