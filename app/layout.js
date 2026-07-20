import './globals.css';
import RodapeGlobal from '../components/RodapeGlobal';
import CookieConsent from '../components/CookieConsent';

const GTM_ID = 'GTM-T7JBWLZ5';

export const metadata = {
  title: 'Cora Render — Render com IA para SketchUp',
  description:
    'Gere imagens, vídeos e apresentações a partir do seu modelo 3D no SketchUp, com IA. Planos a partir de R$97/mês.',
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
        <div className="site-conteudo">{children}</div>
        <RodapeGlobal />
        <CookieConsent />
      </body>
    </html>
  );
}
