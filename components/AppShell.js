'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { lerConta, sair, salvarFoto, aplicarTema } from '../lib/auth';

// Ícones simples em SVG (sem dependência externa)
const Icone = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  assinatura: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
    </svg>
  ),
  admin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"/>
    </svg>
  ),
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18"/>
    </svg>
  ),
  config: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [conta, setConta] = useState(null);
  const [recolhido, setRecolhido] = useState(false);
  const [menuUser, setMenuUser] = useState(false);
  const [modalFoto, setModalFoto] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  // refs e estado do recorte de foto (mesma lógica do plugin)
  const inputFotoRef = useRef(null);
  const canvasRef = useRef(null);
  const fotoState = useRef({ img: null, zoom: 1, x: 0, y: 0, base: 1, drag: false, lx: 0, ly: 0 });

  function abrirSeletorFoto() {
    if (inputFotoRef.current) inputFotoRef.current.click();
  }

  function aoSelecionarFoto(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const st = fotoState.current;
        st.img = img;
        st.base = Math.max(260 / img.width, 260 / img.height);
        st.zoom = 1; st.x = 0; st.y = 0;
        setMenuUser(false);
        setModalFoto(true);
        // desenha após o modal renderizar
        setTimeout(desenharFoto, 30);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    ev.target.value = '';
  }

  function desenharFoto() {
    const canvas = canvasRef.current;
    const st = fotoState.current;
    if (!canvas || !st.img) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 260, 260);
    const esc = st.base * st.zoom;
    const w = st.img.width * esc, h = st.img.height * esc;
    let x = (260 - w) / 2 + st.x, y = (260 - h) / 2 + st.y;
    x = Math.min(0, Math.max(260 - w, x));
    y = Math.min(0, Math.max(260 - h, y));
    st.x = x - (260 - w) / 2; st.y = y - (260 - h) / 2;
    ctx.drawImage(st.img, x, y, w, h);
  }

  function aoZoom(e) {
    fotoState.current.zoom = parseFloat(e.target.value);
    desenharFoto();
  }
  function dragStart(e) {
    const st = fotoState.current;
    st.drag = true; st.lx = e.clientX; st.ly = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function dragMove(e) {
    const st = fotoState.current;
    if (!st.drag) return;
    st.x += (e.clientX - st.lx); st.y += (e.clientY - st.ly);
    st.lx = e.clientX; st.ly = e.clientY;
    desenharFoto();
  }
  function dragEnd() { fotoState.current.drag = false; }

  async function salvarFotoRecortada() {
    const st = fotoState.current;
    if (!st.img) return;
    setSalvandoFoto(true);
    try {
      const out = document.createElement('canvas');
      out.width = 400; out.height = 400;
      const octx = out.getContext('2d');
      const esc = st.base * st.zoom * (400 / 260);
      const w = st.img.width * esc, h = st.img.height * esc;
      const x = (400 - w) / 2 + st.x * (400 / 260);
      const y = (400 - h) / 2 + st.y * (400 / 260);
      octx.drawImage(st.img, x, y, w, h);
      const dataUrl = out.toDataURL('image/jpeg', 0.85);
      const contaAtualizada = await salvarFoto(dataUrl);
      if (contaAtualizada) setConta(contaAtualizada);
      setModalFoto(false);
    } catch (err) {
      // se falhar, fecha mesmo assim (o erro fica no console)
      console.error(err);
    } finally {
      setSalvandoFoto(false);
    }
  }

  useEffect(() => {
    const c = lerConta();
    setConta(c);
    // aplica o tema salvo (da conta ou do navegador)
    if (typeof window !== 'undefined') {
      setRecolhido(localStorage.getItem('cora_menu_recolhido') === '1');
      const tema = (c && c.tema) || localStorage.getItem('cora_tema') || 'sistema';
      aplicarTema(tema);
    }
  }, [pathname]);

  function toggleMenu() {
    const novo = !recolhido;
    setRecolhido(novo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cora_menu_recolhido', novo ? '1' : '0');
    }
  }

  function logout() {
    sair();
    router.push('/');
  }

  const itens = [
    { href: '/conta', rotulo: 'Dashboard', icone: Icone.dashboard, admin: false },
    { href: '/assinatura', rotulo: 'Assinatura', icone: Icone.assinatura, admin: false },
    { href: '/admin', rotulo: 'Admin', icone: Icone.admin, admin: true },
  ].filter(i => !i.admin || (conta && conta.is_admin));

  // créditos para a barrinha do header
  const ilimitado = conta && (conta.creditos_total === -1 || conta.is_admin);
  const total = conta?.creditos_total ?? 0;
  const usados = conta?.creditos_usados ?? 0;
  const pct = ilimitado || total === 0 ? 0 : Math.min(100, Math.round((usados / total) * 100));

  const inicial = (conta?.nome || conta?.email || '?').charAt(0).toUpperCase();

  return (
    <div className={'app-shell' + (recolhido ? ' recolhido' : '')}>
      {/* MENU LATERAL FIXO */}
      <aside className="app-side">
        <div className="app-side-topo">
          <Link href="/conta" className="app-logo">
            {recolhido ? 'C' : 'Cora Render'}
          </Link>
          <button className="app-side-toggle" onClick={toggleMenu} title={recolhido ? 'Expandir' : 'Recolher'}>
            {Icone.menu}
          </button>
        </div>
        <nav className="app-nav">
          {itens.map(i => (
            <Link
              key={i.href}
              href={i.href}
              className={'app-nav-item' + (pathname === i.href ? ' ativo' : '')}
              title={i.rotulo}
            >
              <span className="app-nav-ic">{i.icone}</span>
              {!recolhido && <span className="app-nav-lbl">{i.rotulo}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* HEADER FIXO */}
      <header className="app-header">
        <div className="app-header-dir">
          <div className="app-user-wrap">
            <button className="app-user-btn" onClick={() => setMenuUser(!menuUser)} title="Minha conta">
              {/* anel de créditos ao redor do avatar (estilo Magnific) */}
              {!ilimitado && conta && total > 0 && (
                <svg className="app-anel" width="46" height="46" viewBox="0 0 46 46">
                  <circle className="app-anel-bg" cx="23" cy="23" r="21" />
                  <circle
                    className="app-anel-fill"
                    cx="23" cy="23" r="21"
                    strokeDasharray={2 * Math.PI * 21}
                    strokeDashoffset={(2 * Math.PI * 21) * (1 - pct / 100)}
                    transform="rotate(-90 23 23)"
                  />
                </svg>
              )}
              <span
                className="app-avatar"
                style={conta?.foto_url ? { backgroundImage: `url(${conta.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
              >
                {conta?.foto_url ? '' : inicial}
              </span>
            </button>
            {menuUser && (
              <div className="app-user-menu" onMouseLeave={() => setMenuUser(false)}>
                <div className="app-user-nome">
                  {conta?.nome || conta?.email}
                  {!ilimitado && conta && total > 0 && (
                    <div className="app-user-creditos">
                      {Math.max(0, total - usados).toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')} créditos
                    </div>
                  )}
                  {ilimitado && conta && <div className="app-user-creditos">Créditos ilimitados</div>}
                </div>
                <button className="app-user-link" onClick={abrirSeletorFoto}>Trocar foto</button>
                <Link href="/conta/perfil" className="app-user-link" onClick={() => setMenuUser(false)}>Configurações da conta</Link>
                <Link href="/conta" className="app-user-link" onClick={() => setMenuUser(false)}>Dashboard</Link>
                <Link href="/assinatura" className="app-user-link" onClick={() => setMenuUser(false)}>Assinatura</Link>
                <button className="app-user-link app-user-sair" onClick={logout}>Sair</button>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={inputFotoRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={aoSelecionarFoto}
          />
        </div>
      </header>

      {/* MODAL DE RECORTE DE FOTO (1:1, zoom, arraste — igual ao plugin) */}
      {modalFoto && (
        <div className="foto-overlay" onClick={() => setModalFoto(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">Foto de perfil</div>
            <div className="foto-orient">Proporção 1:1 · recomendado 400×400px. Arraste e use o zoom para enquadrar.</div>
            <div
              className="foto-crop"
              onPointerDown={dragStart}
              onPointerMove={dragMove}
              onPointerUp={dragEnd}
            >
              <canvas ref={canvasRef} width={260} height={260} style={{ display: 'block' }} />
            </div>
            <div className="foto-zoom-row">
              <span>−</span>
              <input type="range" min="1" max="3" step="0.01" defaultValue="1" onChange={aoZoom} style={{ flex: 1 }} />
              <span>+</span>
            </div>
            <div className="foto-botoes">
              <button className="foto-btn-outra" onClick={abrirSeletorFoto}>Escolher outra</button>
              <button className="foto-btn-salvar" onClick={salvarFotoRecortada} disabled={salvandoFoto}>
                {salvandoFoto ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            <div className="foto-cancelar" onClick={() => setModalFoto(false)}>Cancelar</div>
          </div>
        </div>
      )}

      {/* CONTEÚDO */}
      <main className="app-main">{children}</main>
    </div>
  );
}
