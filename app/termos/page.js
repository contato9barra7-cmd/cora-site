'use client';

import { useIdioma } from '../../lib/i18n';

export default function Termos() {
  const { t } = useIdioma();
  const H = (k, cls = 'legal-p') => (
    <p className={cls} dangerouslySetInnerHTML={{ __html: t(k) }} />
  );

  return (
    <div className="legal-wrap">
      <a href="/" className="legal-voltar">{t('legal_voltar')}</a>

      <h1 className="legal-titulo">{t('termos_titulo')}</h1>
      <p className="legal-data">{t('legal_data_label')} {t('termos_data_valor')}</p>

      {H('termos_intro')}

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h1')}</h2>
        {H('termos_p1')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h2')}</h2>
        {H('termos_p2')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h3')}</h2>
        {H('termos_p3')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h4')}</h2>
        {H('termos_p4')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h5')}</h2>
        {H('termos_p5')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h6')}</h2>
        {H('termos_p6')}
        <ul className="legal-lista">
          <li dangerouslySetInnerHTML={{ __html: t('termos_p6_li1') }} />
          <li dangerouslySetInnerHTML={{ __html: t('termos_p6_li2') }} />
          <li dangerouslySetInnerHTML={{ __html: t('termos_p6_li3') }} />
          <li dangerouslySetInnerHTML={{ __html: t('termos_p6_li4') }} />
          <li dangerouslySetInnerHTML={{ __html: t('termos_p6_li5') }} />
        </ul>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h7')}</h2>
        {H('termos_p7a')}
        {H('termos_p7b')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h8')}</h2>
        {H('termos_p8')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h9')}</h2>
        {H('termos_p9')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h10')}</h2>
        {H('termos_p10a')}
        <ul className="legal-lista">
          <li dangerouslySetInnerHTML={{ __html: t('termos_p10_li1') }} />
          <li dangerouslySetInnerHTML={{ __html: t('termos_p10_li2') }} />
          <li dangerouslySetInnerHTML={{ __html: t('termos_p10_li3') }} />
          <li dangerouslySetInnerHTML={{ __html: t('termos_p10_li4') }} />
        </ul>
        {H('termos_p10b')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h11')}</h2>
        {H('termos_p11')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h12')}</h2>
        {H('termos_p12')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h13')}</h2>
        {H('termos_p13')}
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">{t('termos_h14')}</h2>
        {H('termos_p14a')}
        {H('termos_p14b')}
      </section>
    </div>
  );
}
