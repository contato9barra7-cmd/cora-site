/** @type {import('next').NextConfig} */

// ── Content-Security-Policy (ENFORCE — bloqueia de verdade) ──
// O `connect-src` restrito é a defesa principal do token em localStorage: mesmo
// que um XSS rode, ele não consegue mandar o token pra um domínio estranho.
// A lista inclui os domínios de marketing comuns (GTM, Google Ads, DoubleClick,
// Facebook Pixel) pra não derrubar o rastreamento. Se alguma tag específica
// parar de disparar, é só adicionar o domínio dela aqui.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://js.stripe.com https://connect.facebook.net https://www.googleadservices.com https://googleads.g.doubleclick.net https://*.doubleclick.net https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "connect-src 'self' https://api.corarender.com https://cora-auth-production.up.railway.app https://cora-render-server-production.up.railway.app https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.stripe.com https://*.r2.dev https://connect.facebook.net https://*.facebook.com https://*.doubleclick.net https://stats.g.doubleclick.net https://www.google.com https://www.googleadservices.com",
  "frame-src https://js.stripe.com https://*.stripe.com https://www.googletagmanager.com https://td.doubleclick.net https://*.doubleclick.net https://www.facebook.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https://*.stripe.com",
].join('; ');

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Clickjacking: ninguém embute teu site num iframe.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Impede o navegador de "adivinhar" tipo de conteúdo (evita alguns XSS).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Não vaza a URL completa como referer para terceiros.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desliga APIs sensíveis que o site não usa.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")' },
          // Força HTTPS por 2 anos (HSTS).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // CSP ENFORCE — bloqueia de verdade.
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
