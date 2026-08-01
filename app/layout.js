import './globals.css';
import './responsivo.css';
import RodapeGlobal from '../components/RodapeGlobal';
import CookieConsent from '../components/CookieConsent';
import { IdiomaProvider } from '../lib/i18n';

const GTM_ID = 'GTM-T7JBWLZ5';

export const metadata = {
  title: 'Cora Render — Render com IA para SketchUp',
  description:
    'Gere imagens, vídeos e apresentações a partir do seu modelo 3D no SketchUp, com IA. Planos a partir de R$97/mês.',
};

/* ── A janela ──
   `viewportFit: 'cover'` faz a página ir até as bordas nos iPhone com
   notch/ilha; quem cuida de não deixar botão embaixo do queixo são as
   `env(safe-area-inset-*)` do responsivo.css.

   `maximumScale: 5` — o zoom de pinça CONTINUA liberado. Travar em 1 mataria
   o acesso de quem enxerga pouco, e o motivo comum para travar (o Safari dá
   zoom sozinho ao focar um campo com fonte < 16px) já está resolvido no CSS,
   que sobe todo controle para 16px no celular. */
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1A1E' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager + Consent Mode (LGPD).
            O consentimento nasce NEGADO — os rastreadores (GA/Pixel/Ads que o
            gerente de tráfego configurar dentro do GTM) só disparam depois que a
            pessoa aceita no banner. Se já tiver aceitado antes, nasce concedido. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              try {
                var _c = localStorage.getItem('cora_cookie_consent');
                var _g = _c === 'accepted';
                gtag('consent','default',{
                  ad_storage:_g?'granted':'denied',
                  ad_user_data:_g?'granted':'denied',
                  ad_personalization:_g?'granted':'denied',
                  analytics_storage:_g?'granted':'denied',
                  functionality_storage:'granted',
                  security_storage:'granted'
                });
              } catch(e){}
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');
            `
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('cora_menu_recolhido') === '1') {
                  document.documentElement.classList.add('menu-recolhido');
                }
              } catch (e) {}
            `
          }}
        />
      </head>
      <body>
        {/* GTM (noscript) — logo após a abertura do body */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0" width="0" style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <IdiomaProvider>
          <div className="site-conteudo">{children}</div>
          <RodapeGlobal />
          <CookieConsent />
        </IdiomaProvider>
      </body>
    </html>
  );
}
