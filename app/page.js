import Link from 'next/link';
import Nav from '../components/Nav';

export default function Home() {
  return (
    <>
      <Nav />
      <div className="container">
        <div className="head" style={{ paddingTop: 110 }}>
          <h1>Renderize seu projeto do SketchUp com IA</h1>
          <p>
            Gere imagens, vídeos e apresentações direto do seu modelo 3D.
            Sem sair do SketchUp.
          </p>
          <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/precos" className="btn btn--verde" style={{ width: 'auto', padding: '13px 30px', margin: 0 }}>
              Ver planos e preços
            </Link>
          </div>
          <p style={{ marginTop: 40, color: 'var(--texto3)', fontSize: 14 }}>
            Esta é a página inicial provisória. Vamos preencher com o conteúdo de
            vendas depois — por enquanto, o foco é a página de preços.
          </p>
        </div>
      </div>
      <div className="container">
        <div className="foot">© {new Date().getFullYear()} Cora Render · 9barra7 Academy</div>
      </div>
    </>
  );
}
