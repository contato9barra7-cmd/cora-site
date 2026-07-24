'use client';

// Redireciona /promptadores para o primeiro curso que a pessoa pode ver.
// Admin → IA Studio. Aluno → o curso que tiver acesso (ativo ou vencido).

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { lerConta, atualizarConta } from '../../lib/auth';
import AppShell from '../../components/AppShell';
import { useIdioma } from '../../lib/i18n';

export default function PromptadoresIndex() {
  const router = useRouter();
  const { t } = useIdioma();
  useEffect(() => {
    const c = lerConta();
    if (!c) { router.replace('/login'); return; }
    (async () => {
      let cc = c;
      try { const fresca = await atualizarConta(); if (fresca) cc = fresca; } catch (_) {}
      const pc = cc.promptador_cursos || {};
      const temIA = cc.is_admin || (pc.ia_studio && (pc.ia_studio.acesso || pc.ia_studio.expirado));
      const temPH = cc.is_admin || (pc.prompthub && (pc.prompthub.acesso || pc.prompthub.expirado));
      if (temIA) router.replace('/promptadores/ia-studio');
      else if (temPH) router.replace('/promptadores/prompthub');
      else router.replace('/conta');
    })();
  }, [router]);

  return <AppShell><div className="promp-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;
}
