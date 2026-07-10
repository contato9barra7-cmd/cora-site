'use client';

import AppShell from '../../components/AppShell';
import Link from 'next/link';

export default function Teams() {
  return (
    <AppShell>
      <div className="admin-wrap" style={{ maxWidth: 720 }}>
        <h1 className="conta-ola">Planos para equipes</h1>
        <div className="conta-card">
          <h2 className="conta-h2">Em breve</h2>
          <p className="conta-p">
            Estamos preparando planos especiais para empresas e equipes, com múltiplos usuários
            e preços por assento. Em breve você poderá contratar tudo por aqui.
          </p>
          <p className="perfil-sub" style={{ marginTop: 12 }}>
            Enquanto isso, confira nossos <Link href="/precos" className="perfil-link">planos individuais</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
