/** @type {import('next').NextConfig} */

// ── Content-Security-Policy ──
// Em modo REPORT-ONLY: o navegador NÃO bloqueia nada, só reporta no console o que
// violaria a política. Assim a gente observa (por causa do GTM/Pixel/Ads que o
// gerente de tráfego injeta) sem quebrar o marketing, e depois troca para
// enforce. O `connect-src` restrito é o que impede exfiltração: mesmo que um XSS
// rode, ele não consegue mandar dados pra um domínio estranho.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.corarender.com https://cora-auth-production.up.railway.app https://cora-render-server-production.up.railway.app https://www.google-analytics.com https://*.google-analytics.com https://*.stripe.com https://*.r2.dev",
  "frame-src https://js.stripe.com https://*.stripe.com https://www.googletagmanager.com",
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
          // CSP em report-only: observa sem bloquear. Trocar para
          // 'Content-Security-Policy' quando confirmar que nada quebra.
          { key: 'Content-Security-Policy-Report-Only', value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
