'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, lerEquipe, convidarMembro, removerMembro, atribuirAMim, dispositivosDoMembro, nomearEquipe, reenviarConvite, salvarFotoEquipe } from '../../lib/auth';

const NOME_PLANO = { pro: 'Pro', studio: 'Studio' };

function GrupoDisp({ titulo, lista, max }) {
  return (
    <div className="disp-grupo">
      <div className="disp-grupo-tit">{titulo} <span className="disp-contagem">{lista.length}/{max}</span></div>
      {lista.length === 0 ? (
        <p className="ws-obs" style={{ marginTop: 0 }}>Nenhum dispositivo conectado.</p>
      ) : (
        <div className="disp-lista">
          {lista.map((d) => (
            <div key={d.id} className="disp-item">
              <div>
                <div className="disp-nome">
                  {d.nome_pc || 'Dispositivo'}
                  {d.ativo_agora && <span className="disp-ativo">Em uso agora</span>}
                </div>
                <div className="disp-sub">Último acesso: {d.ultimo_acesso ? new Date(d.ultimo_acesso).toLocaleString('pt-BR') : '—'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const [carregando, setCarregando] = useState(true);
  const [equipe, setEquipe] = useState(null);
  const [membros, setMembros] = useState([]);
  const [email, setEmail] = useState('');
  const [emailsSlot, setEmailsSlot] = useState({});
  const [convidandoSlot, setConvidandoSlot] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [convidando, setConvidando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [dispositivos, setDispositivos] = useState({});
  const [nomeEquipe, setNomeEquipe] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [avisoNome, setAvisoNome] = useState('');
  const [foto, setFoto] = useState('');

  // --- foto da equipe (recorte 1:1, igual ao perfil) ---
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
      await salvarFotoEquipe(dataUrl);
      setFoto(dataUrl);
      setModalFoto(false);
    } catch (err) { console.error(err); }
    finally { setSalvandoFoto(false); }
  }
  async function removerFotoEquipe() {
    try { await salvarFotoEquipe(''); setFoto(''); }
    catch (err) { console.error(err); }
  }
  const criada = params.get('criada') === '1';

  async function carregar() {
    try {
      const c = await lerConta();
      if (!c) { router.push('/login'); return; }
      const dados = await lerEquipe();
      setEquipe(dados.equipe);
      setMembros(dados.membros || []);
      if (dados.equipe) { setNomeEquipe(dados.equipe.nome || ''); setFoto(dados.equipe.foto || ''); }
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  async function salvarNome() {
    setSalvandoNome(true); setErro(''); setAvisoNome('');
    try {
      await nomearEquipe(nomeEquipe);
      setAvisoNome('Alterações salvas.');
      setTimeout(() => setAvisoNome(''), 4000);
    } catch (e) { setErro(e.message); }
    finally { setSalvandoNome(false); }
  }

  async function convidar() {
    setErro(''); setAviso('');
    if (!email.includes('@')) { setErro('Digite um email válido.'); return; }
    setConvidando(true);
    try {
      await convidarMembro(email);
      setAviso('Convite enviado para ' + email);
      setEmail('');
      await carregar();
    } catch (e) { setErro(e.message); }
    finally { setConvidando(false); }
  }

  async function convidarSlot(idx) {
    setErro(''); setAviso('');
    const em = (emailsSlot[idx] || '').trim();
    if (!em.includes('@')) { setErro('Digite um email válido.'); return; }
    setConvidandoSlot(idx);
    try {
      await convidarMembro(em);
      setAviso('Convite enviado para ' + em);
      setEmailsSlot((s) => { const n = { ...s }; delete n[idx]; return n; });
      await carregar();
    } catch (e) { setErro(e.message); }
    finally { setConvidandoSlot(null); }
  }

  async function remover(id) {
    if (!confirm('Remover esta pessoa da equipe? O assento será liberado.')) return;
    setErro('');
    try { await removerMembro(id); setExpandido(null); await carregar(); }
    catch (e) { setErro(e.message); }
  }

  async function reenviar(id) {
    setErro(''); setAviso('');
    try { await reenviarConvite(id); setAviso('Convite reenviado.'); }
    catch (e) { setErro(e.message); }
  }

  async function atribuir() {
    setErro('');
    try { await atribuirAMim(); await carregar(); }
    catch (e) { setErro(e.message); }
  }

  async function toggleGerenciar(m) {
    if (expandido === m.id) { setExpandido(null); return; }
    setExpandido(m.id);
    if (!dispositivos[m.id]) {
      try {
        const lista = await dispositivosDoMembro(m.id);
        setDispositivos((d) => ({ ...d, [m.id]: lista }));
      } catch (e) {
        setDispositivos((d) => ({ ...d, [m.id]: [] }));
      }
    }
  }

  if (carregando) return <div className="admin-wrap"><p>Carregando...</p></div>;

  if (!equipe) {
    return (
      <div className="admin-wrap">
        <h1 className="conta-ola">Sua equipe</h1>
        <div className="conta-card">
          <h2 className="conta-h2">Você ainda não tem uma equipe</h2>
          <p className="conta-p">Monte uma equipe para adicionar pessoas com faturamento único e desconto por assento.</p>
          <button className="btn btn--verde" style={{ width: 'auto', marginTop: 14, padding: '11px 24px' }} onClick={() => router.push('/teams')}>
            Criar equipe
          </button>
        </div>
      </div>
    );
  }

  const livres = equipe.assentos - membros.length;
  const donoNaEquipe = membros.some((m) => m.eh_dono);
  const slotsVazios = Array.from({ length: Math.max(0, livres) });

  return (
    <div className="admin-wrap">
      <h1 className="conta-ola">Sua equipe</h1>

      {criada && (
        <div className="conta-card" style={{ borderColor: 'var(--roxo)' }}>
          <h2 className="conta-h2">Equipe criada com sucesso</h2>
          <p className="conta-p">Sua assinatura está ativa. Agora dê um nome à equipe e convide as pessoas por email.</p>
        </div>
      )}

      <div className="conta-card ws-aviso-download">
        O download do plugin fica na aba <strong>Dashboard</strong>.
      </div>

      {/* Foto e nome da equipe */}
      <div className="conta-card">
        <h2 className="conta-h2">Identidade da equipe</h2>
        <div className="ws-identidade">
          <div className="perfil-avatar-box">
            <span
              className="perfil-avatar"
              style={foto ? { backgroundImage: `url(${foto})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
            >
              {foto ? '' : (nomeEquipe || 'E').charAt(0).toUpperCase()}
            </span>
            <button className="perfil-avatar-editar" onClick={abrirSeletorFoto} title="Trocar foto" aria-label="Trocar foto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
            </button>
            {foto && (
              <button className="perfil-avatar-x" onClick={removerFotoEquipe} title="Remover foto" aria-label="Remover foto">×</button>
            )}
            <input ref={inputFotoRef} type="file" accept="image/*" onChange={aoSelecionarFoto} style={{ display: 'none' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p className="ws-obs" style={{ marginTop: 0, marginBottom: 10 }}>Nome e foto aparecem para as pessoas convidadas.</p>
            <div className="ws-linha-input">
              <input className="ws-input" value={nomeEquipe} onChange={(e) => setNomeEquipe(e.target.value)} placeholder="Nome da sua equipe" maxLength={60} />
              <button className="btn btn--verde ws-btn" onClick={salvarNome} disabled={salvandoNome}>
                {salvandoNome ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            {avisoNome && <div className="conta-aviso" style={{ marginTop: 12 }}>{avisoNome}</div>}
          </div>
        </div>
      </div>

      {modalFoto && (
        <div className="foto-overlay" onClick={() => setModalFoto(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">Foto da equipe</div>
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

      {/* Resumo do plano */}
      <div className="conta-card">
        <div className="ws-topo">
          <div>
            <div className="ws-plano">Plano {NOME_PLANO[equipe.plano] || equipe.plano}</div>
            <div className="ws-assentos">{membros.length} de {equipe.assentos} assentos ocupados</div>
          </div>
          <div className="ws-badge">{livres} {livres === 1 ? 'assento livre' : 'assentos livres'}</div>
        </div>
        {erro && <p className="tm-erro" style={{ textAlign: 'left', marginBottom: 0 }}>{erro}</p>}
        {aviso && <p className="ws-aviso-txt">{aviso}</p>}
      </div>

      {/* Assentos */}
      <div className="conta-card">
        <h2 className="conta-h2">Assentos</h2>

        {membros.map((m) => (
          <div key={m.id} className="ws-slot">
            <div className="ws-slot-linha">
              <div className="disp-nome">
                {m.email}
                {m.eh_dono && <span className="ws-tag ws-tag-dono">Você (dono)</span>}
                {m.status === 'convidado' && <span className="ws-tag ws-tag-pend">Convite pendente</span>}
                {m.status === 'ativo' && !m.eh_dono && <span className="ws-tag ws-tag-ativo">Ativo</span>}
              </div>
              <button className="ws-gerenciar" onClick={() => toggleGerenciar(m)}>
                {expandido === m.id ? 'Fechar' : 'Gerenciar'}
              </button>
            </div>

            {expandido === m.id && (
              <div className="ws-detalhe">
                {m.status === 'convidado' ? (
                  <p className="ws-obs" style={{ marginTop: 0 }}>O convite ainda não foi aceito. Os dispositivos aparecerão quando a pessoa ativar o acesso.</p>
                ) : (
                  <>
                    <div className="ws-disp-tit">Dispositivos (uso de um por vez)</div>
                    {!dispositivos[m.id] ? (
                      <p className="ws-obs" style={{ marginTop: 0 }}>Carregando...</p>
                    ) : (
                      <>
                        <GrupoDisp titulo="Plugin (SketchUp)" lista={(dispositivos[m.id] || []).filter((d) => (d.tipo || 'plugin') !== 'web')} max={2} />
                        <GrupoDisp titulo="Versão web" lista={(dispositivos[m.id] || []).filter((d) => d.tipo === 'web')} max={3} />
                      </>
                    )}
                  </>
                )}

                <div className="ws-acoes">
                  {!m.eh_dono && m.status === 'convidado' && (
                    <button className="ws-btn-sec" onClick={() => reenviar(m.id)}>Reenviar acesso</button>
                  )}
                  {m.eh_dono ? (
                    <button className="ws-remover" onClick={() => remover(m.id)}>Liberar meu assento</button>
                  ) : (
                    <button className="ws-remover" onClick={() => remover(m.id)}>Remover acesso</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {slotsVazios.map((_, i) => (
          <div key={'vazio-' + i} className="ws-slot ws-slot-vazio">
            <div className="ws-slot-vazio-topo">
              <div className="ws-linha-input" style={{ flex: 1 }}>
                <input
                  className="ws-input"
                  value={emailsSlot[i] || ''}
                  onChange={(e) => setEmailsSlot((s) => ({ ...s, [i]: e.target.value }))}
                  placeholder="email@da-pessoa.com"
                  onKeyDown={(e) => { if (e.key === 'Enter') convidarSlot(i); }}
                />
                <button className="btn btn--verde ws-btn" onClick={() => convidarSlot(i)} disabled={convidandoSlot === i}>
                  {convidandoSlot === i ? 'Enviando...' : 'Convidar'}
                </button>
              </div>
            </div>
            {!donoNaEquipe && i === 0 && (
              <div className="ws-slot-atribuir">
                <span className="ws-vazio-hint">ou</span>
                <button className="ws-atribuir" onClick={atribuir}>Atribuir a mim</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Workspace() {
  return (
    <AppShell>
      <Suspense fallback={<div className="admin-wrap"><p>Carregando...</p></div>}>
        <WorkspaceConteudo />
      </Suspense>
    </AppShell>
  );
}
