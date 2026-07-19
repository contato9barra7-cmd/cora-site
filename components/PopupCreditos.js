'use client';

// ═══════════════════════════════════════════════════════════
//  PopupCreditos — "Seus créditos acabaram" (opção A)
//
//  Aparece quando uma geração volta 402 do servidor (lib/render.js dispara o
//  evento 'cora:sem-creditos'). A interface segue livre: só a geração é barrada.
//  Dois caminhos: fazer upgrade do plano ou comprar uma recarga avulsa.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PopupCreditos() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    function onSemCreditos() { setAberto(true); }
    window.addEventListener('cora:sem-creditos', onSemCreditos);
    return () => window.removeEventListener('cora:sem-creditos', onSemCreditos);
  }, []);

  if (!aberto) return null;

  return (
    <div className="cred-overlay" onClick={() => setAberto(false)}>
      <div className="cred-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cred-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#A4A1F3" strokeWidth="2">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" />
          </svg>
        </div>
        <div className="cred-tit">Seus créditos acabaram</div>
        <div className="cred-sub">
          Faça upgrade do seu plano ou compre uma recarga avulsa para continuar gerando.
        </div>
        <button className="cred-btn cred-btn--verde" onClick={() => router.push('/precos')}>
          Fazer upgrade
        </button>
        <button className="cred-btn cred-btn--linha" onClick={() => router.push('/assinatura')}>
          Comprar créditos
        </button>
        <div className="cred-agora" onClick={() => setAberto(false)}>Agora não</div>
      </div>
    </div>
  );
}
