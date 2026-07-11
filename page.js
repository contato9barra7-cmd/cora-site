'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { lerConta, salvarPerfil, deletarMinhaConta, aplicarTema, sair, salvarFoto, listarDispositivos, removerDispositivo } from '../../../lib/auth';

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
  const [dispositivos, setDispositivos] = useState([]);
  const [modalAjuda, setModalAjuda] = useState(false);

  async function carregarDispositivos() {
    try {
      const lista = await listarDispositivos();
      setDispositivos(lista);
    } catch (e) { /* silencioso */ }
  }

  async function tirarDispositivo(id) {
    if (!confirm('Remover este computador? Ele precisará ser reconectado no próximo login.')) return;
    try {
      await removerDispositivo(id);
      await carregarDispositivos();
    } catch (e) {
      setErro(e.message);
    }
  }

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
    carregarDispositivos();
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
              <div className="perfil-avatar-box">
                <span
                  className="perfil-avatar"
                  style={conta.foto_url ? { backgroundImage: `url(${conta.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
                >
                  {conta.foto_url ? '' : inicial}
                </span>
                <button className="perfil-avatar-editar" onClick={abrirSeletorFoto} title="Trocar foto" aria-label="Trocar foto">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                </button>
                {conta.foto_url && (
                  <button className="perfil-avatar-x" onClick={removerFoto} title="Remover foto" aria-label="Remover foto">×</button>
                )}
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
          <p className="perfil-legal">
            O 9barra7 vai tratar seus dados para enviar informações sobre nossos produtos e serviços,
            promoções, pesquisas e novidades, com base no nosso interesse legítimo. Seus dados não serão
            compartilhados com terceiros. Você pode desativar as notificações no botão acima. Mais informações na{' '}
            <a href="/privacidade" className="perfil-link">política de privacidade</a>.
          </p>
        </section>

        <div className="perfil-salvar-barra">
          <button className="btn btn--verde" style={{ width: 'auto', padding: '11px 28px' }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {/* SESSÕES E DISPOSITIVOS */}
        <section className="perfil-sec">
          <h2 className="perfil-h2">
            Sessões e dispositivos
            <button className="perfil-ajuda" onClick={() => setModalAjuda(true)} title="Ajuda" aria-label="Ajuda">?</button>
          </h2>
          <p className="perfil-sub" style={{ marginTop: 0, marginBottom: 18 }}>
            Cada conta pode ter até 2 computadores no plugin e 3 dispositivos na versão web. O uso é de um por vez (plugin ou web, nunca ao mesmo tempo).
          </p>

          {(() => {
            const plugins = dispositivos.filter(d => (d.tipo || 'plugin') !== 'web');
            const webs = dispositivos.filter(d => d.tipo === 'web');
            const grupo = (titulo, lista, max) => (
              <div className="disp-grupo">
                <div className="disp-grupo-tit">{titulo} <span className="disp-contagem">{lista.length}/{max}</span></div>
                {lista.length === 0 ? (
                  <p className="perfil-sub" style={{ marginTop: 0 }}>Nenhum dispositivo conectado ainda.</p>
                ) : (
                  <div className="disp-lista">
                    {lista.map(d => (
                      <div key={d.id} className="disp-item">
                        <div>
                          <div className="disp-nome">
                            {d.nome_pc || 'Dispositivo'}
                            {d.ativo_agora && <span className="disp-ativo">Em uso agora</span>}
                          </div>
                          <div className="disp-sub">
                            Último acesso: {d.ultimo_acesso ? new Date(d.ultimo_acesso).toLocaleString('pt-BR') : '—'}
                          </div>
                        </div>
                        <button className="disp-remover" onClick={() => tirarDispositivo(d.id)}>Remover</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
            return (
              <>
                {grupo('Plugin (SketchUp)', plugins, 2)}
                {grupo('Versão web', webs, 3)}
              </>
            );
          })()}
        </section>

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
      {modalAjuda && (
        <div className="foto-overlay" onClick={() => setModalAjuda(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
            <div className="foto-titulo">Problemas comuns</div>

            <div className="ajuda-bloco">
              <div className="ajuda-tit">Segurança</div>
              <p className="ajuda-txt">
                Se você exceder o número de dispositivos permitido, remova um da lista. Depois de salvar,
                você poderá conectar o novo computador no próximo login.
              </p>
            </div>

            <div className="ajuda-bloco">
              <div className="ajuda-tit">Número de usuários</div>
              <p className="ajuda-txt">
                Se você é uma empresa e precisa de mais usuários, temos ofertas especiais.{' '}
                <a href="/teams" className="perfil-link">Conheça os planos para equipes</a> para mais informações.
              </p>
            </div>

            <p className="ajuda-txt" style={{ marginTop: 4 }}>
              Cada conta pode ter até <strong>2 computadores no plugin</strong> e <strong>3 dispositivos na versão web</strong>,
              com uso de um por vez (nunca plugin e web ao mesmo tempo).
            </p>

            <div className="foto-cancelar" onClick={() => setModalAjuda(false)} style={{ marginTop: 16 }}>Fechar</div>
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
