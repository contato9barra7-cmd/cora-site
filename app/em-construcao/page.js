/* Página que TODO visitante vê enquanto o MODO_CONSTRUCAO do middleware.js
   estiver ligado. Quando o site lançar, ela some sozinha (o middleware passa a
   redirecionar quem cair aqui pra home). */

const INSTAGRAM = 'https://www.instagram.com/9barra7/';

export const metadata = {
  title: 'Cora Render — Em breve',
  description:
    'O Cora Render ainda está em construção. Siga o @9barra7 para ficar por dentro de quando lança.',
  // Enquanto está em construção, o Google não indexa o aviso — no lançamento
  // ele indexa direto o site de verdade, sem ficar "em construção" na busca.
  robots: { index: false, follow: false },
};

export default function EmConstrucao() {
  return (
    <main className="emc">
      <style>{`
        .emc {
          min-height: 100svh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center;
          background: var(--paper); color: var(--ink);
          padding: 32px 24px;
        }
        .emc__logo { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
        .emc__badge {
          margin-top: 34px;
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 14px; color: var(--ink2);
          border: 1px solid var(--line); border-radius: var(--r);
          padding: 7px 16px;
        }
        .emc__dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--verde-esc);
          animation: emc-pulsa 1.6s ease-in-out infinite;
        }
        @keyframes emc-pulsa { 50% { opacity: .35; } }
        .emc__titulo {
          margin: 22px 0 0; max-width: 560px;
          font-size: clamp(30px, 5.4vw, 44px);
          font-weight: 600; letter-spacing: -0.02em; line-height: 1.12;
        }
        .emc__texto {
          margin: 16px 0 0; max-width: 440px;
          font-size: 17px; line-height: 1.55; color: var(--ink2);
        }
        .emc__btn {
          margin-top: 30px;
          display: inline-block;
          background: var(--ink); color: var(--paper);
          font-size: 16px; font-weight: 500;
          padding: 13px 28px; border-radius: var(--r);
          transition: opacity .15s ease;
        }
        .emc__btn:hover { opacity: .85; }
      `}</style>

      <div className="emc__logo">Cora Render</div>
      <div className="emc__badge"><span className="emc__dot" />em construção</div>
      <h1 className="emc__titulo">Estamos construindo o Cora&nbsp;Render.</h1>
      <p className="emc__texto">
        Ainda não lançamos — mas falta pouco. Siga o <strong>@9barra7</strong> no
        Instagram pra ficar por dentro de quando sair.
      </p>
      <a className="emc__btn" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">
        Seguir @9barra7
      </a>
    </main>
  );
}
