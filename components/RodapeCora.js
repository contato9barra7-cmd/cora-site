'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  O RODAPÉ DO SITE
//
//  A marcação é a do artefato do William (`<footer class="rodape">` no
//  index.html), e o estilo dela já vive em `app/home-pagina.css`, escopado
//  em `.hm`. Por isso o `<footer>` sai embrulhado numa div `.hm`: é ali que
//  moram as fichas de cor e de espaço do desenho aprovado, e sem elas o
//  rodapé nasce sem fundo preto e sem ritmo.
//
//  ── Por que isto existe ──
//  Quando a home foi portada, o `montar-home.py` recortou só o `<main>`,
//  porque cabeçalho e rodapé viram componentes. O cabeçalho virou. O rodapé
//  não, e o site inteiro ficou com a tira fina de links legais no lugar do
//  rodapé de quatro colunas que o artefato tem. Dava para ver no motor da
//  home, que procura `[data-marcas]` desde sempre e nunca achava nada.
//
//  ── Onde ele aparece ──
//  Nas páginas públicas, por `RodapeGlobal`. As telas do painel seguem com o
//  `RodapeLegal`, a tira fina, que é o que cabe ao lado da barra lateral.
// ═══════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { useIdioma } from '../lib/i18n';

// A regra da casa: software novo citado em qualquer lugar do produto entra
// aqui. É esta lista que a frase do rodapé escreve, então basta acrescentar o
// nome e ele aparece na hora, nos três idiomas.
const MARCAS = [
  'SketchUp', 'V-Ray', 'Enscape', 'Revit', 'Archicad', '3ds Max',
  'Promob', 'Kling', 'Windows', 'macOS',
];

const EMAIL = 'cora@corarender.com';
const WHATSAPP = 'https://wa.me/5551980889004';
const INSTAGRAM = 'https://www.instagram.com/9barra7';

export default function RodapeCora() {
  const { t, idioma } = useIdioma();

  // "A, B e C" nos três idiomas. O último nome entra com a conjunção do
  // idioma, e não com vírgula, senão a frase fica de lista de sistema.
  const marcas = (() => {
    const lista = MARCAS.slice();
    const ultima = lista.pop();
    const e = { en: ' and ', es: ' y ' }[idioma] || ' e ';
    return lista.length ? lista.join(', ') + e + ultima : ultima;
  })();

  const Coluna = ({ titulo, itens }) => (
    <div>
      <h3 className="rodape__t">{titulo}</h3>
      <ul className="rodape__links">
        {itens.map(({ rotulo, href, fora }) => (
          <li key={rotulo}>
            {fora ? (
              <a href={href} target="_blank" rel="noopener noreferrer">{rotulo}</a>
            ) : (
              <Link href={href}>{rotulo}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="hm">
      <footer className="rodape">
        <div className="env">
          <div className="rodape__grade">
            <div className="rodape__marca">
              {/* Só existe em preto, então o CSS o inverte para branco sobre
                  o rodapé escuro. */}
              <img
                className="rodape__logo"
                src="/home/2dd2a94695.png"
                alt="9BARRA7 Academy"
              />
            </div>

            <Coluna
              titulo="Cora Render"
              itens={[
                { rotulo: t('nav_como_funciona'), href: '/#passos' },
                { rotulo: t('nav_ferramentas'), href: '/#ferramentas' },
                { rotulo: t('rod_planos'), href: '/precos' },
                { rotulo: t('nav_faq'), href: '/precos#faq' },
              ]}
            />

            <Coluna
              titulo={t('rod_conta')}
              itens={[
                { rotulo: t('nav_entrar'), href: '/login' },
                { rotulo: t('nav_criar_conta'), href: '/cadastro' },
              ]}
            />

            {/* Reembolso é a seção 5 dos Termos, e não um documento à parte.
                O link cai direto nela pela âncora. */}
            <Coluna
              titulo={t('rod_legal')}
              itens={[
                { rotulo: t('rodapelegal_termos'), href: '/termos' },
                { rotulo: t('rodapelegal_privacidade'), href: '/privacidade' },
                { rotulo: t('rod_reembolso'), href: '/termos#reembolso' },
              ]}
            />

            <Coluna
              titulo={t('rod_contato')}
              itens={[
                { rotulo: t('rod_email'), href: 'mailto:' + EMAIL, fora: true },
                { rotulo: 'WhatsApp', href: WHATSAPP, fora: true },
                { rotulo: 'Instagram', href: INSTAGRAM, fora: true },
              ]}
            />
          </div>
        </div>

        <div className="env rodape__agua-caixa" aria-hidden="true">
          <img className="rodape__agua" src="/home/b8beb13ff3.png" alt="" aria-hidden="true" />
        </div>

        <div className="env">
          <div className="rodape__base">
            <p className="rodape__copy">© {new Date().getFullYear()} {t('rod_copy')}</p>
            <p className="rodape__disclaimer">
              {t('rod_direitos')} <span data-marcas>{marcas}</span> {t('rod_marcas')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
