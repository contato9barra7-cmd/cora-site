'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  O TEXTO DOS DOCUMENTOS, UM SÓ LUGAR
//
//  Os Termos e a Política aparecem em DOIS lugares: nas páginas /termos e
//  /privacidade, e dentro da janela de reaceite, onde a pessoa precisa ler
//  antes de aceitar de novo.
//
//  Se cada lugar montasse a própria lista de seções, mudar o documento passaria
//  a ser mudar em dois arquivos, e o dia em que alguém esquecer o segundo é o
//  dia em que a pessoa aceita um texto e a gente guarda outro. Então a lista
//  mora aqui, e os dois lugares chamam a mesma.
//
//  O texto em si continua no `lib/i18n.js`, que é de onde o gerador do
//  `cora-auth` tira a cópia congelada que vira prova do aceite. Aqui só está a
//  ORDEM das seções.
// ═══════════════════════════════════════════════════════════════════════════

import { useIdioma } from '../lib/i18n';

function useTexto() {
  const { t } = useIdioma();
  const P = (k, cls = 'legal-p') => (
    <p key={k} className={cls} dangerouslySetInnerHTML={{ __html: t(k) }} />
  );
  const LI = (k) => <li key={k} dangerouslySetInnerHTML={{ __html: t(k) }} />;
  const Sec = (h, filhos) => (
    <section className="legal-sec" key={h}>
      <h2 className="legal-h2">{t(h)}</h2>
      {filhos}
    </section>
  );
  return { t, P, LI, Sec };
}

export function TextoTermos() {
  const { t, P, LI, Sec } = useTexto();
  return (
    <>
      {P('termos_intro')}
      {Sec('termos_h1', P('termos_p1'))}
      {Sec('termos_h2', P('termos_p2'))}
      {Sec('termos_h3', P('termos_p3'))}
      {Sec('termos_h4', P('termos_p4'))}
      {/* O "Política de reembolso" do rodapé cai aqui: reembolso é uma seção
          destes Termos, e não um documento à parte. */}
      <section className="legal-sec" id="reembolso">
        <h2 className="legal-h2">{t('termos_h5')}</h2>
        {P('termos_p5')}
      </section>
      {Sec('termos_h6', (
        <>
          {P('termos_p6')}
          <ul className="legal-lista">
            {LI('termos_p6_li1')}{LI('termos_p6_li2')}{LI('termos_p6_li3')}
            {LI('termos_p6_li4')}{LI('termos_p6_li5')}
          </ul>
        </>
      ))}
      {Sec('termos_h7', <>{P('termos_p7a')}{P('termos_p7b')}</>)}
      {Sec('termos_h8', P('termos_p8'))}
      {Sec('termos_h9', P('termos_p9'))}
      {Sec('termos_h10', (
        <>
          {P('termos_p10a')}
          <ul className="legal-lista">
            {LI('termos_p10_li1')}{LI('termos_p10_li2')}
            {LI('termos_p10_li3')}{LI('termos_p10_li4')}
          </ul>
          {P('termos_p10b')}
        </>
      ))}
      {Sec('termos_h11', P('termos_p11'))}
      {Sec('termos_h12', P('termos_p12'))}
      {Sec('termos_h13', P('termos_p13'))}
      {Sec('termos_h14', <>{P('termos_p14a')}{P('termos_p14b')}</>)}
    </>
  );
}

export function TextoPrivacidade() {
  const { P, LI, Sec } = useTexto();
  return (
    <>
      {P('priv_intro')}
      {Sec('priv_h1', <>{P('priv_p1a')}{P('priv_p1b')}</>)}
      {Sec('priv_h2', (
        <>
          {P('priv_p2')}
          <ul className="legal-lista">
            {LI('priv_p2_li1')}{LI('priv_p2_li2')}{LI('priv_p2_li3')}
            {LI('priv_p2_li4')}{LI('priv_p2_li5')}
          </ul>
        </>
      ))}
      {Sec('priv_h3', (
        <>
          {P('priv_p3')}
          <ul className="legal-lista">
            {LI('priv_p3_li1')}{LI('priv_p3_li2')}{LI('priv_p3_li3')}{LI('priv_p3_li4')}
            {LI('priv_p3_li5')}{LI('priv_p3_li6')}{LI('priv_p3_li7')}
          </ul>
        </>
      ))}
      {Sec('priv_h4', (
        <>
          {P('priv_p4a')}
          <ul className="legal-lista">
            {LI('priv_p4_li1')}{LI('priv_p4_li2')}{LI('priv_p4_li3')}
            {LI('priv_p4_li4')}{LI('priv_p4_li5')}
          </ul>
          {P('priv_p4b')}
        </>
      ))}
      {Sec('priv_h5', P('priv_p5'))}
      {Sec('priv_h6', P('priv_p6'))}
      {Sec('priv_h7', <>{P('priv_p7a')}{P('priv_p7b')}{P('priv_p7c')}</>)}
      {Sec('priv_h8', (
        <>
          {P('priv_p8')}
          <ul className="legal-lista">
            {LI('priv_p8_li1')}{LI('priv_p8_li2')}{LI('priv_p8_li3')}
            {LI('priv_p8_li4')}{LI('priv_p8_li5')}{LI('priv_p8_li6')}
          </ul>
          {P('priv_p8b')}
        </>
      ))}
      {Sec('priv_h9', P('priv_p9'))}
      {Sec('priv_h10', P('priv_p10'))}
      {Sec('priv_h11', P('priv_p11'))}
      {Sec('priv_h12', <>{P('priv_p12a')}{P('priv_p12b')}</>)}
    </>
  );
}
