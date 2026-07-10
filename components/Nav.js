import Link from 'next/link';

export default function Nav() {
  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="nav__logo">Cora Render</Link>
        <div className="nav__links">
          <Link href="/precos">Planos e preços</Link>
          <Link href="/precos" className="btn btn--roxo" style={{ margin: 0, width: 'auto', padding: '9px 20px' }}>
            Começar
          </Link>
        </div>
      </nav>
    </div>
  );
}
