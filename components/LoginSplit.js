'use client';

// ═══════════════════════════════════════════════════════════
//  LoginSplit — moldura das telas de conta (entrar, criar conta,
//  recuperar senha, verificar e-mail).
//
//  Desktop: painel visual a esquerda (imagem + frase), formulario a
//           direita. So o lado direito rola — o painel fica parado.
//  Mobile:  o painel some e volta o card centralizado de sempre.
//
//  PARA TROCAR A ARTE: substitua /public/img/login-hero.jpg. O layout
//  nao muda. Se quiser outra frase, edite as chaves login_visual_frase
//  e login_visual_sub no i18n.
// ═══════════════════════════════════════════════════════════

import Link from 'next/link';
import { useIdioma } from '../lib/i18n';

export default function LoginSplit({ children }) {
  const { t } = useIdioma();

  return (
    <div className="login-split">
      <div className="login-visual">
        <Link href="/" className="login-visual-logo">Cora Render</Link>
        <div>
          <p className="login-visual-frase">{t('login_visual_frase')}</p>
          <p className="login-visual-sub">{t('login_visual_sub')}</p>
        </div>
      </div>

      <div className="login-form-lado">
        {children}
      </div>
    </div>
  );
}
