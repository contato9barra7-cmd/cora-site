'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { lerConta, salvarPerfil, deletarMinhaConta, aplicarTema, sair, salvarFoto } from '../../../lib/auth';

const IDIOMAS = [
  { v: 'pt', l: 'Português' },
  { v: 'en', l: 'English' },
  { v: 'es', l: 'Español' },
];
const TEMAS = [
  { v: 'claro', l: 'Claro' },
  { v: 'escuro', l: 'Escuro' },
  { v: 'sistema', l: 'Sistema' },
];

export default function Perfil() {
  const router = useRouter();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [idioma, setIdioma] = useState('pt');
  const [tema, setTema] = useState('sistema');
  const [newsletter, setNewsletter] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [modalDeletar, setModalDeletar] = useState(false);
  const [deletando, setDeletando] = useState(false);

  // --- foto de perfil (recorte 1:1, igual ao plugin) ---
  const [modalFoto, setModalFoto] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const inputFotoRef = useRef(null);
  const canvasRef = useRef(null);
  const fotoState = useRef({ img: null, zoom: 1, x: 0, y: 0, base: 1, drag: false, lx: 0, ly: 0 });

  function abrirSeletorFoto() { if (inputFotoRef.current) inputFotoRef.current.click(); }
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
        setModalFoto(true);
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
  function aoZoom(e) { fotoState.current.zoom = parseFloat(e.target.value); desenharFoto(); }
  function dragStart(e) { const st = fotoState.current; st.drag = true; st.lx = e.clientX; st.ly = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }
  function dragMove(e) { const st = fotoState.current; if (!st.drag) return; st.x += (e.clientX - st.lx); st.y += (e.clientY - st.ly); st.lx = e.clientX; st.ly = e.clientY; desenharFoto(); }
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
      const c = await salvarFoto(dataUrl);
      if (c) setConta(c);
      setModalFoto(false);
    } catch (err) { console.error(err); }
    finally { setSalvandoFoto(false); }
  }
  async function removerFoto() {
    try {
      const c = await salvarFoto('');
      if (c) setConta(c);
    } catch (err) { console.error(err); }
  }

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setNome(c.nome || '');
    setUsername(c.username || '');
    setIdioma(c.idioma || 'pt');
    setTema(c.tema || 'sistema');
    setNewsletter(c.newsletter !== false);
    setCarregando(false);
  }, [router]);

  async function salvar() {
    setSalvando(true); setErro(''); setAviso('');
    try {
      const atualizada = await salvarPerfil({ nome, username, idioma, tema, newsletter });
      if (atualizada) setConta(atualizada);
      aplicarTema(tema);
      setAviso('Alterações salvas.');
      setTimeout(() => setAviso(''), 4000);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  // aplica o tema imediatamente ao trocar no seletor (preview)
  function trocarTema(t) {
    setTema(t);
    aplicarTema(t);
  }

  async function confirmarDeletar() {
    setDeletando(true); setErro('');
    try {
      await deletarMinhaConta();
      sair();
      router.push('/');
    } catch (e) {
      setModalDeletar(false);
      setErro(e.message);
      setDeletando(false);
    }
  }

  if (carregando) return <AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>;
  if (!conta) return null;

  const ehPago = conta.plano && conta.plano !== 'free' && !conta.is_admin;
  const inicial = (conta.nome || conta.email || '?').charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="admin-wrap perfil-wrap">
        <h1 className="conta-ola">Minha conta</h1>
        {aviso && <div className="conta-aviso">{aviso}</div>}
        {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

        {/* PERFIL */}
        <section className="perfil-sec">
          <h2 className="perfil-h2">Perfil</h2>
          <div className="perfil-linha">
            <label className="perfil-lbl">Avatar</label>
            <div className="perfil-avatar-area">
              <span
                className="perfil-avatar"
                style={conta.foto_url ? { backgroundImage: `url(${conta.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
              >
                {conta.foto_url ? '' : inicial}
              </span>
              <div className="perfil-avatar-botoes">
                <button className="perfil-btn-foto" onClick={abrirSeletorFoto}>Trocar foto</button>
                {conta.foto_url && <button className="perfil-btn-remover" onClick={removerFoto}>Remover</button>}
              </div>
              <input type="file" ref={inputFotoRef} accept="image/*" style={{ display: 'none' }} onChange={aoSelecionarFoto} />
            </div>
          </div>
          <div className="perfil-linha">
            <label className="perfil-lbl">Nome</label>
            <input className="perfil-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="perfil-linha">
            <label className="perfil-lbl">Username</label>
            <input className="perfil-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="seu_username" />
          </div>
          <div className="perfil-linha">
            <label className="perfil-lbl">Email</label>
            <input className="perfil-input" value={conta.email} disabled title="O email não pode ser alterado por aqui" />
          </div>
        </section>

        {/* PREFERÊNCIAS */}
        <section className="perfil-sec">
          <h2 className="perfil-h2">Preferências</h2>
          <div className="perfil-linha">
            <label className="perfil-lbl">Idioma</label>
            <select className="perfil-input" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
              {IDIOMAS.map(i => <option key={i.v} value={i.v}>{i.l}</option>)}
            </select>
          </div>
          <div className="perfil-linha">
            <label className="perfil-lbl">Tema</label>
            <select className="perfil-input" value={tema} onChange={(e) => trocarTema(e.target.value)}>
              {TEMAS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
        </section>

        {/* NOTIFICAÇÕES */}
        <section className="perfil-sec">
          <h2 className="perfil-h2">Notificações</h2>
          <div className="perfil-linha perfil-toggle-linha">
            <div>
              <label className="perfil-lbl">Newsletter</label>
              <p className="perfil-sub">Receba novidades, promoções e dicas do Cora Render.</p>
            </div>
            <button
              className={'perfil-toggle' + (newsletter ? ' on' : '')}
              onClick={() => setNewsletter(!newsletter)}
              role="switch"
              aria-checked={newsletter}
            >
              <span className="perfil-toggle-bola" />
            </button>
          </div>
        </section>

        <div className="perfil-salvar-barra">
          <button className="btn btn--verde" style={{ width: 'auto', padding: '11px 28px' }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {/* DELETAR CONTA */}
        <section className="perfil-sec perfil-perigo">
          <h2 className="perfil-h2">Deletar conta</h2>
          {ehPago ? (
            <p className="perfil-sub">
              Você tem um plano pago ativo, então não é possível deletar a conta diretamente.
              Cancele a assinatura primeiro (em Assinatura) ou fale com o suporte.
            </p>
          ) : (
            <>
              <p className="perfil-sub">Esta ação é permanente e apaga todos os seus dados. Não pode ser desfeita.</p>
              <button className="perfil-btn-deletar" onClick={() => setModalDeletar(true)}>
                Deletar minha conta
              </button>
            </>
          )}
        </section>
      </div>

      {modalDeletar && (
        <div className="foto-overlay" onClick={() => setModalDeletar(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">Deletar sua conta?</div>
            <p className="perfil-sub" style={{ marginBottom: 18 }}>
              Esta ação é permanente. Todos os seus dados serão apagados e não podem ser recuperados.
            </p>
            <div className="foto-botoes">
              <button className="foto-btn-outra" onClick={() => setModalDeletar(false)}>Cancelar</button>
              <button className="perfil-btn-deletar" style={{ flex: 1 }} onClick={confirmarDeletar} disabled={deletando}>
                {deletando ? 'Deletando...' : 'Sim, deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalFoto && (
        <div className="foto-overlay" onClick={() => setModalFoto(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">Foto de perfil</div>
            <div className="foto-orient">Proporção 1:1 · recomendado 400×400px. Arraste e use o zoom para enquadrar.</div>
            <div className="foto-crop" onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd}>
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
    </AppShell>
  );
}
