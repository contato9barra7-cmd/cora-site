/* Pagina que TODO visitante ve enquanto o MODO_CONSTRUCAO do middleware.js
   estiver ligado. Quando o site lancar, ela some sozinha (o middleware passa a
   redirecionar quem cair aqui pra home).

   O desenho e a grade animada da marca, a mesma do painel das telas de conta:
   formas girando em turquesa, lima e osso, com o icone 3D e o recado numa
   ficha de vidro por cima. O CSS abaixo e o recorte do painel que esta
   telas usam, sem as regras de transicao entre telas, que aqui nao existem.

   ARQUIVO GERADO por portar-construcao.py. Editar la, nao aqui. */

const INSTAGRAM = 'https://www.instagram.com/9barra7/';

export const metadata = {
  title: 'Cora Render — Em breve',
  description:
    'O Cora Render ainda está em construção. Siga o @9barra7 para ficar por dentro de quando lança.',
  // Enquanto está em construção, o Google não indexa o aviso — no lançamento
  // ele indexa direto o site de verdade, sem ficar "em construção" na busca.
  robots: { index: false, follow: false },
};

/* A grade, com semente fixa: o desenho é sempre o mesmo. Cada célula tem a
   classe, o índice `--i` (coluna + linha) e, quando é meia-lua, o tempo de giro
   e o atraso negativo, que faz cada uma nascer num ponto diferente do ciclo. */
const GRADE = [
  [{c:"cel cel--c cel--osso",i:0}, {c:"cel cel--c cel--osso",i:1}, {c:"cel cel--s cel--osso",i:2,g:"16.2s",a:"-13.8s"}, {c:"cel cel--c cel--osso",i:3}, {c:"cel cel--s cel--lima cel--g0",i:4,g:"14.9s",a:"-8.5s"}, {c:"cel cel--s cel--lima cel--g0",i:5,g:"22.6s",a:"-23.3s"}, {c:"cel cel--c cel--osso",i:6}, {c:"cel cel--s cel--lima",i:7,g:"24.8s",a:"-3.0s"}, {c:"cel cel--s cel--osso cel--g3",i:8,g:"24.0s",a:"-1.9s"}, {c:"cel cel--c cel--osso",i:9}, {c:"cel cel--c cel--lima",i:10}],
  [{c:"cel cel--s cel--osso cel--g2",i:1,g:"17.6s",a:"-25.7s"}, {c:"cel cel--v",i:2}, {c:"cel cel--s cel--lima cel--g2",i:3,g:"22.6s",a:"-15.0s"}, {c:"cel cel--c cel--lima",i:4}, {c:"cel cel--s cel--lima cel--g2",i:5,g:"13.1s",a:"-16.3s"}, {c:"cel cel--c cel--osso",i:6}, {c:"cel cel--s cel--lima cel--g3",i:7,g:"25.4s",a:"-23.6s"}, {c:"cel cel--c cel--osso",i:8}, {c:"cel cel--s cel--osso cel--g3",i:9,g:"18.4s",a:"-11.1s"}, {c:"cel cel--v",i:10}, {c:"cel cel--c cel--lima",i:11}],
  [{c:"cel cel--c cel--lima",i:2}, {c:"cel cel--s cel--osso cel--g3",i:3,g:"17.8s",a:"-17.6s"}, {c:"cel cel--s cel--lima cel--g0",i:4,g:"18.1s",a:"-11.7s"}, {c:"cel cel--s cel--osso cel--g0",i:5,g:"13.6s",a:"-11.4s"}, {c:"cel cel--s cel--osso cel--g0",i:6,g:"22.5s",a:"-2.0s"}, {c:"cel cel--s cel--osso cel--g0",i:7,g:"25.5s",a:"-10.9s"}, {c:"cel cel--s cel--lima cel--g3",i:8,g:"18.0s",a:"-11.7s"}, {c:"cel cel--c cel--lima",i:9}, {c:"cel cel--s cel--osso cel--g2",i:10,g:"15.1s",a:"-2.2s"}, {c:"cel cel--c cel--osso",i:11}, {c:"cel cel--s cel--osso cel--g0",i:12,g:"23.5s",a:"-5.3s"}],
  [{c:"cel cel--s cel--osso cel--g3",i:3,g:"23.2s",a:"-11.2s"}, {c:"cel cel--c cel--lima",i:4}, {c:"cel cel--s cel--osso cel--g2",i:5,g:"20.8s",a:"-24.7s"}, {c:"cel cel--c cel--osso",i:6}, {c:"cel cel--v",i:7}, {c:"cel cel--s cel--osso cel--g1",i:8,g:"14.2s",a:"-13.2s"}, {c:"cel cel--c cel--lima",i:9}, {c:"cel cel--s cel--osso cel--g0",i:10,g:"23.8s",a:"-1.7s"}, {c:"cel cel--s cel--osso cel--g0",i:11,g:"18.0s",a:"-13.1s"}, {c:"cel cel--s cel--osso cel--g1",i:12,g:"23.1s",a:"-14.6s"}, {c:"cel cel--s cel--osso cel--g0",i:13,g:"22.2s",a:"-13.7s"}],
];

export default function EmConstrucao() {
  return (
    <main className="emc">
      <style>{`
        /* ---- o rodapé do site não entra aqui ----
           O middleware REESCREVE qualquer endereço para esta página, e reescrita
           mantém a URL do navegador. Então o RodapeGlobal, que decide pelo
           caminho, vê "/" e não "/em-construcao": a lista de exceções dele nunca
           pegou esta tela. Enquanto o rodapé era a tira fina de links legais
           ninguém reparou; virou o de quatro colunas, e ele passou a cobrir a
           tela de construção inteira, porque vem depois no documento.

           A regra mora aqui, e não lá, de propósito: ela só existe enquanto
           esta página está na tela, vem no HTML do servidor (não pisca) e não
           obriga o layout raiz a virar dinâmico só para ler um cabeçalho. */
        .rodape, .rodape-legal { display: none !important; }

        .emc {
          position: fixed; inset: 0; overflow: hidden;
          background: #000;
          /* Fichas de cor da marca. Só as que esta página usa — os tokens de
             texto (--ink, --paper, --line) já vêm do globals.css e batem. */
          --lima: #C4FBA7;
          --turquesa: #ADECDF;
          --osso: #F4F4F4;
        }

        /* ---- a grade ---- */
        .campo-pad{ position:absolute; inset:0; display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:100%; overflow:hidden; }
    .coluna-pad{ overflow:hidden; background:var(--turquesa); will-change:transform, filter, opacity; }
    .tira{ display:flex; flex-direction:column; will-change:transform; }
    .coluna-pad:nth-child(1) .tira{ animation:correr 107s linear infinite; }
    .coluna-pad:nth-child(2) .tira{ animation:correr  79s linear infinite reverse; }
    .coluna-pad:nth-child(3) .tira{ animation:correr 149s linear infinite; }
    .coluna-pad:nth-child(4) .tira{ animation:correr  97s linear infinite reverse; }
    @keyframes correr{ from{ transform:translateY(0); } to{ transform:translateY(-50%); } }
    .cel{ aspect-ratio:1/1; position:relative; flex:0 0 auto; --giro:0deg; }
    .cel::before{ content:""; position:absolute; inset:0; transform-origin:center; }
    .cel--lima::before{ background:var(--lima); }
    .cel--osso::before{ background:var(--osso); }
    .cel--c::before{ border-radius:50%; }
    .cel--s::before{ inset:0 0 50%; border-radius:999px 999px 0 0; }
    .cel--g1{ --giro:90deg; }
    .cel--g2{ --giro:180deg; }
    .cel--g3{ --giro:270deg; }
    .cel--v::before{ display:none; }
    .cel--s{ rotate:var(--giro); animation:quarto var(--tgiro,18s) infinite; }
    @keyframes quarto{
    0%,   19% { rotate:calc(var(--giro) +   0deg); }
    25%,  44% { rotate:calc(var(--giro) +  90deg); }
    50%,  69% { rotate:calc(var(--giro) + 180deg); }
    75%,  94% { rotate:calc(var(--giro) + 270deg); }
    100%      { rotate:calc(var(--giro) + 360deg); }
    }

        /* ---- a ficha, no centro da tela ----
           O ícone 3D morava aqui em cima e saiu em 07/09/2026. Com ele, o
           bloco era uma pilha de dois e o respiro de baixo era menor que o de
           cima, para o par inteiro cair no meio. Sozinha, a ficha só precisa
           de respiro igual dos dois lados, e aí o place-items centra ela de
           verdade. (Sem crase nos nomes: esta folha inteira mora dentro de um
           template literal, e uma crase aqui fecha a string.)
           A assinatura do 9barra7 é absoluta no canto e não entra nesta conta. */
        .emc-pilha {
          position: absolute; inset: 0; z-index: 5;
          display: grid; place-items: center;
          padding: clamp(72px, 12vh, 104px) 16px;
        }

        /* ---- a ficha ---- */
        .emc-recado {
          width: min(560px, 100%);
          padding: clamp(22px, 3.4vw, 34px);
          /* Vidro líquido, o mesmo material do aviso de cookies e da barra do
             painel de login. */
          background: rgba(12, 12, 12, .62);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
                  backdrop-filter: blur(30px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, .12);
          border-radius: 28px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .07),
                      0 24px 60px rgba(0, 0, 0, .34);
          color: #fff; text-align: center;
        }
        .emc-marca { display: flex; justify-content: center; }
        .emc-marca img { height: 26px; width: auto; display: block; filter: invert(1); }

        .emc-selo {
          margin-top: 24px;
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 100px;
          background: rgba(255, 255, 255, .10);
          border: 1px solid rgba(255, 255, 255, .16);
          font-size: 11.5px; font-weight: 500;
          letter-spacing: .10em; text-transform: uppercase;
          color: rgba(255, 255, 255, .90);
        }
        .emc-ponto {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--lima);
          animation: emc-pulsa 1.8s ease-in-out infinite;
        }
        @keyframes emc-pulsa { 50% { opacity: .3; } }

        .emc-titulo {
          margin: 16px 0 0;
          font-size: clamp(26px, 4.4vw, 38px); font-weight: 500;
          letter-spacing: -.03em; line-height: 1.12; text-wrap: balance;
        }
        .emc-texto {
          margin: 12px 0 0; font-size: 15.5px; line-height: 1.55;
          color: rgba(255, 255, 255, .78); text-wrap: pretty;
        }
        .emc-texto b { color: #fff; font-weight: 600; }

        .emc-btn {
          margin-top: 24px;
          display: inline-flex; align-items: center; gap: 10px;
          height: 50px; padding: 0 26px; border-radius: 100px;
          background: var(--lima); color: #111;
          font-size: 15px; font-weight: 600; letter-spacing: -.005em;
          transition: background-color .18s ease, transform .12s ease;
        }
        .emc-btn:hover { background: #a9ef86; }
        .emc-btn:active { transform: scale(.98); }
        .emc-btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

        /* A 9barra7 assina no alto, como no painel de login. */
        .emc-assina {
          position: absolute; z-index: 5;
          left: clamp(18px, 3vw, 32px); top: clamp(18px, 3vw, 32px);
        }
        .emc-assina img { width: min(150px, 34vw); height: auto; display: block; }

        /* Tela estreita: quatro colunas viram tiras finas demais pra forma se
           ler. Duas mantêm o desenho reconhecível. */
        @media (max-width: 700px) {
          .campo-pad { grid-template-columns: repeat(2, 1fr); }
          .coluna-pad:nth-child(n+3) { display: none; }
        }
        @media (max-height: 600px) {
          .emc-pilha { padding-block: 56px; }
          .emc-recado { padding: 20px; }
          .emc-titulo { font-size: 23px; }
          .emc-texto { font-size: 14.5px; }
          .emc-btn { height: 44px; margin-top: 16px; }
        }
      `}</style>

      {/* O filtro `emc-vento` saiu junto com o ícone, em 07/09/2026: era uma
          turbulência SVG animada para um alvo só, e sem o alvo ela ficaria
          rodando para ninguém. */}

      <div className="campo-pad" aria-hidden="true">
        {GRADE.map((coluna, ci) => (
          <div className="coluna-pad" key={ci} style={{ '--c': ci }}>
            {/* A tira sai dobrada: a rolagem sobe metade da altura e volta ao
                começo sem emenda visível. */}
            <div className="tira">
              {coluna.concat(coluna).map((cel, i) => (
                <div
                  key={i}
                  className={cel.c}
                  style={{ '--i': cel.i, ...(cel.g ? { '--tgiro': cel.g, animationDelay: cel.a } : {}) }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="emc-assina">
        <img src="/img/logo-9barra7.png" alt="9barra7 Academy" width="300" height="36" />
      </div>

      <div className="emc-pilha">
        <div className="emc-recado">
          <div className="emc-marca">
            <img src="/img/logo-cora.png" alt="Cora Render" width="266" height="64" />
          </div>
          <p className="emc-selo"><span className="emc-ponto" aria-hidden="true" />em construção</p>
          <h1 className="emc-titulo">Estamos construindo o Cora&nbsp;Render.</h1>
          <p className="emc-texto">
            Ainda não lançamos, mas falta pouco. Siga o <b>@9barra7</b> no
            Instagram pra ficar por dentro de quando sair.
          </p>
          <a className="emc-btn" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.4" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            Seguir @9barra7
          </a>
        </div>
      </div>
    </main>
  );
}
