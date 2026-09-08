'use client';

import { useIdioma } from '../../lib/i18n';
import PaginaLegal from '../../components/PaginaLegal';
import { TextoPrivacidade } from '../../components/TextosLegais';

// Ver o comentário do /termos: as seções são compartilhadas com a janela de
// reaceite.
export default function Privacidade() {
  const { t } = useIdioma();
  return (
    <PaginaLegal
      titulo={t('priv_titulo')}
      data={`${t('legal_data_label')} ${t('priv_data_valor')}`}
    >
      <TextoPrivacidade />
    </PaginaLegal>
  );
}
