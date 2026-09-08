'use client';

import { useIdioma } from '../../lib/i18n';
import PaginaLegal from '../../components/PaginaLegal';
import { TextoTermos } from '../../components/TextosLegais';

// As seções moram no `components/TextosLegais.js`, e não aqui: a janela de
// reaceite mostra o MESMO texto, e duas listas separadas iam desencontrar na
// primeira mudança.
export default function Termos() {
  const { t } = useIdioma();
  return (
    <PaginaLegal
      titulo={t('termos_titulo')}
      data={`${t('legal_data_label')} ${t('termos_data_valor')}`}
    >
      <TextoTermos />
    </PaginaLegal>
  );
}
