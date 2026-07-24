'use client';

import { useIdioma } from '../../lib/i18n';

export default function Privacidade() {
  const { t } = useIdioma();
  const H = (k, cls = 'legal-p') => (
    <p className={cls} dangerouslySetInnerHTML={{ __html: t(k) }} />
  );
  const LI = (k) => <li dangerouslySetInnerHTML={{ __html: t(k) }} />;

  return (
    <div className="legal-wrap">
      <a href="/" className="legal-voltar">{t('legal_voltar')}</a>

      <h1 className="legal-titulo">{t('priv_titulo')}</h1>
      <p className="legal-data">{t('legal_data_label')} {t('priv_data_valor')}</p>

      {H('priv_intro')}

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h1')}</h2>
        {H('priv_p1a')}
        {H('priv_p1b')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h2')}</h2>
        {H('priv_p2')}
        <ul className="legal-lista">
          {LI('priv_p2_li1')}
          {LI('priv_p2_li2')}
          {LI('priv_p2_li3')}
          {LI('priv_p2_li4')}
          {LI('priv_p2_li5')}
        </ul>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h3')}</h2>
        {H('priv_p3')}
        <ul className="legal-lista">
          {LI('priv_p3_li1')}
          {LI('priv_p3_li2')}
          {LI('priv_p3_li3')}
          {LI('priv_p3_li4')}
          {LI('priv_p3_li5')}
          {LI('priv_p3_li6')}
        </ul>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h4')}</h2>
        {H('priv_p4a')}
        <ul className="legal-lista">
          {LI('priv_p4_li1')}
          {LI('priv_p4_li2')}
          {LI('priv_p4_li3')}
          {LI('priv_p4_li4')}
          {LI('priv_p4_li5')}
        </ul>
        {H('priv_p4b')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h5')}</h2>
        {H('priv_p5')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h6')}</h2>
        {H('priv_p6')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h7')}</h2>
        {H('priv_p7a')}
        {H('priv_p7b')}
        {H('priv_p7c')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h8')}</h2>
        {H('priv_p8')}
        <ul className="legal-lista">
          {LI('priv_p8_li1')}
          {LI('priv_p8_li2')}
          {LI('priv_p8_li3')}
          {LI('priv_p8_li4')}
          {LI('priv_p8_li5')}
          {LI('priv_p8_li6')}
        </ul>
        {H('priv_p8b')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h9')}</h2>
        {H('priv_p9')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h10')}</h2>
        {H('priv_p10')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h11')}</h2>
        {H('priv_p11')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('priv_h12')}</h2>
        {H('priv_p12a')}
        {H('priv_p12b')}
      </section>
    </div>
  );
}
