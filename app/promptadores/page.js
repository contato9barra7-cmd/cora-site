'use client';

// ═══════════════════════════════════════════════════════════
//  ABA PROMPTADORES — agentes de GPT do 9barra7 Academy
//
//  Só aparece pra quem tem acesso (hoje: admin). Lista em "layout A":
//  círculo com inicial/foto, nome, descrição, "atualizado em" e botão Abrir
//  (abre o GPT no ChatGPT da própria pessoa). Toggle PT/ES troca nome,
//  descrição e link. No modo admin: "+ Novo", lápis por linha e modal de
//  edição (avatar clicável, campos por idioma, excluir). "atualizado em" é
//  carimbado pelo servidor ao salvar.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, atualizarConta, listarPromptadores, salvarPromptador, excluirPromptador, reordenarPromptadores,
  adminListarAcessos, adminAddAcessoManual, adminEnviarConvite, adminRevogarAcesso } from '../../lib/auth';

// TODO: trocar pela oferta de ex-aluno do IA Studio (link da página de venda/checkout).
const LINK_RENOVAR = 'https://9barra7.com';

const PERIODOS = [
  { v: '1', l: '1 ano' }, { v: '2', l: '2 anos' }, { v: '3', l: '3 anos' }, { v: 'vitalicio', l: 'Vitalício' },
];
function hojeISO() { return new Date().toISOString().slice(0, 10); }
function fmtDataLong(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function fmtData(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  const dia = String(dt.getDate()).padStart(2, '0');
  const mes = String(dt.getMonth() + 1).padStart(2, '0');
  const ano = String(dt.getFullYear()).slice(-2);
  return `${dia}/${mes}/${ano}`;
}

// Redimensiona a imagem escolhida para um quadrado pequeno (evita base64 gigante).
function lerAvatar(file, tam = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = tam; c.height = tam;
        const ctx = c.getContext('2d');
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, tam, tam);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const VAZIO = { id: null, nome_pt: '', descricao_pt: '', link_pt: '', nome_es: '', descricao_es: '', link_es: '', avatar: '', ordem: 0 };

export default function Promptadores() {
  const router = useRouter();
  const [lista, setLista] = useState([]);
  const [idioma, setIdioma] = useState('pt');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [negado, setNegado] = useState(false);
  const [erro, setErro] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [expirado, setExpirado] = useState(false);   // aluno com acesso vencido
  const [diasRestantes, setDiasRestantes] = useState(null); // p/ card "acesso acabando"

  // área de Usuários (admin)
  const [tela, setTela] = useState('lista');          // 'lista' | 'usuarios'
  const [acessos, setAcessos] = useState([]);
  const [carrAcessos, setCarrAcessos] = useState(false);
  const [dropAberto, setDropAberto] = useState(false);
  const [convModo, setConvModo] = useState(null);     // null | 'manual' | 'convite'
  const [formA, setFormA] = useState({ nome: '', email: '', data_acesso: '', periodo: '1' });
  const [salvandoAcesso, setSalvandoAcesso] = useState(false);
  const [erroAcesso, setErroAcesso] = useState('');

  // modal de edição (admin)
  const [editando, setEditando] = useState(null);   // objeto do form ou null
  const [langEdit, setLangEdit] = useState('pt');
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef(null);

  // reordenar por arraste (admin) — item fica parado; um risco roxo indica onde vai cair
  const arrastando = useRef(null);          // índice ATUAL do card arrastado (muda ao mover)
  const [arrastandoId, setArrastandoId] = useState(null);
  const listaRef = useRef([]);
  useEffect(() => { listaRef.current = lista; }, [lista]);

  // Auto-scroll da janela enquanto arrasta perto do topo/rodapé — sem isso não
  // dá pra alcançar linhas distantes (o HTML5 drag não rola a página sozinho).
  const scrollVel = useRef(0);
  const scrollTimer = useRef(null);
  function iniciarAutoScroll() {
    if (scrollTimer.current) return;
    scrollTimer.current = setInterval(() => {
      if (scrollVel.current) window.scrollBy(0, scrollVel.current);
    }, 16);
  }
  function pararAutoScroll() {
    if (scrollTimer.current) { clearInterval(scrollTimer.current); scrollTimer.current = null; }
    scrollVel.current = 0;
  }
  function calcVel(clientY) {
    const margem = 120, passoMax = 22, h = window.innerHeight;
    if (clientY < margem) scrollVel.current = -Math.ceil(passoMax * (1 - clientY / margem));
    else if (clientY > h - margem) scrollVel.current = Math.ceil(passoMax * (1 - (h - clientY) / margem));
    else scrollVel.current = 0;
  }
  useEffect(() => () => pararAutoScroll(), []);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setIsAdmin(!!c.is_admin);
    (async () => {
      let cc = c;
      try { const fresca = await atualizarConta(); if (fresca) cc = fresca; } catch (_) {}
      setIsAdmin(!!cc.is_admin);
      if (!cc.is_admin && typeof cc.promptador_dias_restantes === 'number') setDiasRestantes(cc.promptador_dias_restantes);
      // Aluno com acesso vencido: não busca a lista, mostra a janela de "renove".
      if (!cc.is_admin && cc.promptador_expirado) { setExpirado(true); setCarregando(false); return; }
      carregar();
    })();
  }, [router]);

  async function carregar() {
    setErro('');
    try {
      const l = await listarPromptadores();
      setLista(l);
      setCarregando(false);
    } catch (e) {
      const m = (e.message || '').toLowerCase();
      if (m.includes('acesso') || m.includes('403') || m.includes('401') || m.includes('permiss')) {
        setNegado(true);
      } else {
        setErro('Erro ao carregar: ' + e.message);
      }
      setCarregando(false);
    }
  }

  // campo por idioma, com fallback pro PT quando o ES estiver vazio
  const campo = (p, base) => (idioma === 'es' ? (p[base + '_es'] || p[base + '_pt']) : p[base + '_pt']);

  const filtrados = lista.filter(p => {
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return (campo(p, 'nome') || '').toLowerCase().includes(t)
        || (campo(p, 'descricao') || '').toLowerCase().includes(t);
  });

  function abrir(p) {
    const link = idioma === 'es' ? (p.link_es || p.link_pt) : p.link_pt;
    if (link) window.open(link, '_blank', 'noopener');
  }

  // ── reordenar (admin): só na lista completa, sem busca ──
  const podeArrastar = isAdmin && !busca.trim();

  // Reordena AO VIVO: o card arrastado assume a célula sob o cursor (ordem de
  // leitura, esq→dir, cima→baixo). O que você vê durante o arraste é o resultado
  // final — ao soltar não há pulo. Vale pra qualquer coluna/linha.
  function arrastaSobre(e, i) {
    if (arrastando.current == null) return;
    e.preventDefault();
    calcVel(e.clientY);
    const de = arrastando.current;
    if (de === i) return;
    setLista(prev => {
      const arr = [...prev];
      const [m] = arr.splice(de, 1);
      arr.splice(i, 0, m);
      return arr;
    });
    arrastando.current = i;
  }

  async function soltar() {
    const mudou = arrastando.current != null;
    arrastando.current = null;
    setArrastandoId(null);
    pararAutoScroll();
    if (!mudou) return;
    try { await reordenarPromptadores(listaRef.current.map(p => p.id)); }
    catch (e) { setErro('Não foi possível salvar a ordem: ' + e.message); }
  }

  // ── admin: editar/novo ──
  function novo() { setEditando({ ...VAZIO }); setLangEdit('pt'); }
  function editar(p) { setEditando({ ...p }); setLangEdit('pt'); }
  function fechar() { setEditando(null); }

  async function escolherAvatar(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const url = await lerAvatar(f);
      setEditando(prev => ({ ...prev, avatar: url }));
    } catch (_) {}
    e.target.value = '';
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    setErro('');
    try {
      await salvarPromptador(editando);
      await carregar();
      setEditando(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!editando || !editando.id) return;
    if (!confirm('Excluir este promptador? Esta ação não pode ser desfeita.')) return;
    setSalvando(true);
    try {
      await excluirPromptador(editando.id);
      await carregar();
      setEditando(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  // ── área de Usuários (admin) ──
  async function abrirUsuarios() {
    setTela('usuarios');
    setCarrAcessos(true);
    try { setAcessos(await adminListarAcessos()); }
    catch (e) { setErroAcesso(e.message); }
    finally { setCarrAcessos(false); }
  }
  async function recarregarAcessos() {
    try { setAcessos(await adminListarAcessos()); } catch (e) { setErroAcesso(e.message); }
  }
  function abrirModalAcesso(modo) {
    setConvModo(modo);
    setDropAberto(false);
    setErroAcesso('');
    setFormA({ nome: '', email: '', data_acesso: hojeISO(), periodo: '1' });
  }
  async function salvarAcesso() {
    if (!formA.email.trim() || !formA.data_acesso) { setErroAcesso('Preencha e-mail e data.'); return; }
    setSalvandoAcesso(true);
    setErroAcesso('');
    try {
      if (convModo === 'convite') {
        await adminEnviarConvite({ email: formA.email.trim(), data_acesso: formA.data_acesso, periodo: formA.periodo });
      } else {
        await adminAddAcessoManual({ nome: formA.nome.trim(), email: formA.email.trim(), data_acesso: formA.data_acesso, periodo: formA.periodo });
      }
      await recarregarAcessos();
      setConvModo(null);
    } catch (e) {
      setErroAcesso(e.message);
    } finally {
      setSalvandoAcesso(false);
    }
  }
  async function revogarAcesso(a) {
    if (!confirm(`Revogar o acesso de ${a.email}?`)) return;
    try { await adminRevogarAcesso(a.id); await recarregarAcessos(); }
    catch (e) { setErroAcesso(e.message); }
  }
  function statusAcesso(a) {
    if (!a.tem_conta) return { txt: a.origem === 'convite' ? 'Convite enviado' : 'Aguardando cadastro', cls: 'pend' };
    if (a.expirado) return { txt: 'Expirado', cls: 'exp' };
    return { txt: 'Ativo', cls: 'ok' };
  }

  if (carregando) return <AppShell><div className="promp-wrap"><p>Carregando...</p></div></AppShell>;

  // Aluno com acesso vencido → janela de "renove o IA Studio".
  if (expirado) {
    return (
      <AppShell>
        <div className="promp-wrap" style={{ position: 'relative', minHeight: '60vh' }}>
          <h1>Promptadores</h1>
          <p className="promp-sub">Seus agentes do 9barra7 Academy.</p>
          <div className="promp-exp-ov">
            <div className="promp-exp-card">
              <div className="promp-exp-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0d2b06" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
              </div>
              <span className="promp-exp-eb">Acesso encerrado</span>
              <h2>Seu acesso aos Promptadores acabou</h2>
              <p>Seu período de acesso terminou. Renove o IA Studio para continuar usando os promptadores.</p>
              <a className="promp-exp-btn" href={LINK_RENOVAR} target="_blank" rel="noopener">Renovar IA Studio ↗</a>
              <button className="promp-exp-voltar" onClick={() => router.push('/conta')}>Voltar</button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Área de Usuários (admin)
  if (isAdmin && tela === 'usuarios') {
    return (
      <AppShell>
        <div className="promp-wrap">
          <button className="promp-voltar" onClick={() => setTela('lista')}>← Voltar aos promptadores</button>
          <div className="promp-top">
            <div>
              <h1>Acesso aos Promptadores</h1>
              <p className="promp-sub">Alunos que podem ver a aba Promptadores.</p>
            </div>
            <div className="promp-conv-wrap">
              <button className="promp-novo" onClick={() => setDropAberto(v => !v)}>Convidar <span style={{ fontSize: 10 }}>▼</span></button>
              {dropAberto && (
                <div className="promp-drop" onMouseLeave={() => setDropAberto(false)}>
                  <div className="promp-dopt" onClick={() => abrirModalAcesso('manual')}>
                    <div className="promp-dico g"><svg viewBox="0 0 24 24" fill="none" stroke="#3f9d54" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 5l4 4" /></svg></div>
                    <div><div className="t">Adicionar manualmente</div><div className="s">Cadastro o aluno na mão (nome, e-mail, data e período).</div></div>
                  </div>
                  <div className="promp-dopt" onClick={() => abrirModalAcesso('convite')}>
                    <div className="promp-dico r"><svg viewBox="0 0 24 24" fill="none" stroke="#6d6ae0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 6l8 6 8-6" /></svg></div>
                    <div><div className="t">Enviar acesso por e-mail</div><div className="s">A pessoa recebe o convite, cria a conta e já entra.</div></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {erroAcesso && <p className="promp-erro">{erroAcesso}</p>}

          <div className="promp-tabela-wrap">
            {carrAcessos ? <p style={{ padding: 20, color: 'var(--ink3)' }}>Carregando...</p> : (
              <table className="promp-tabela">
                <thead><tr><th>Aluno</th><th>Data de compra</th><th>Acesso até</th><th>Origem</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {acessos.length === 0 ? (
                    <tr><td colSpan={6} style={{ color: 'var(--ink3)', padding: 22 }}>Ninguém com acesso ainda. Use “Convidar”.</td></tr>
                  ) : acessos.map(a => {
                    const st = statusAcesso(a);
                    return (
                      <tr key={a.id}>
                        <td><div className="promp-al-nome">{a.nome || '—'}</div><div className="promp-al-mail">{a.email}</div></td>
                        <td>{fmtDataLong(a.data_acesso)}</td>
                        <td>{a.vitalicio
                          ? <span className="promp-badge vital">Vitalício</span>
                          : <span className={'promp-badge ' + (a.expirado ? 'venc' : 'data')}>até {fmtDataLong(a.validade)}</span>}</td>
                        <td><span className="promp-tag">{a.origem === 'convite' ? 'Convite' : 'Manual'}</span></td>
                        <td><span className={'promp-st ' + st.cls}><span className="promp-dot" />{st.txt}</span></td>
                        <td><button className="promp-revogar" onClick={() => revogarAcesso(a)}>Revogar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal adicionar/convidar */}
        {convModo && (
          <div className="promp-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) setConvModo(null); }}>
            <div className="promp-modal">
              <div className="promp-mh">
                <h3>{convModo === 'convite' ? 'Enviar acesso por e-mail' : 'Adicionar manualmente'}</h3>
              </div>
              <div className="promp-mb">
                {convModo === 'convite' && (
                  <div className="promp-nota">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#6d6ae0" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" strokeLinecap="round" /></svg>
                    A pessoa recebe um convite no e-mail, cria a conta e já entra com o acesso liberado.
                  </div>
                )}
                {convModo === 'manual' && (
                  <div className="promp-fld"><label>Nome</label>
                    <input value={formA.nome} onChange={e => setFormA(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do aluno" /></div>
                )}
                <div className="promp-fld"><label>E-mail{convModo === 'convite' ? ' do aluno' : ''}</label>
                  <input type="email" value={formA.email} onChange={e => setFormA(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
                <div className="promp-duo">
                  <div className="promp-fld"><label>{convModo === 'convite' ? 'Data de entrada' : 'Data de compra'}</label>
                    <input type="date" value={formA.data_acesso} onChange={e => setFormA(f => ({ ...f, data_acesso: e.target.value }))} /></div>
                  <div className="promp-fld"><label>Período de acesso</label>
                    <select value={formA.periodo} onChange={e => setFormA(f => ({ ...f, periodo: e.target.value }))}>
                      {PERIODOS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select></div>
                </div>
              </div>
              <div className="promp-mf">
                <span />
                <div className="promp-dir">
                  <button className="promp-btn promp-cancelar" onClick={() => setConvModo(null)} disabled={salvandoAcesso}>Cancelar</button>
                  <button className={'promp-btn ' + (convModo === 'convite' ? 'promp-salvar' : 'promp-add')} onClick={salvarAcesso} disabled={salvandoAcesso}>
                    {salvandoAcesso ? 'Salvando...' : (convModo === 'convite' ? 'Enviar convite' : 'Adicionar')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    );
  }

  if (negado) {
    return (
      <AppShell>
        <div className="promp-wrap">
          <h1>Acesso restrito</h1>
          <p>Os promptadores são um bônus exclusivo dos alunos do 9barra7 Academy.</p>
          <Link href="/conta" className="btn btn--roxo" style={{ width: 'auto', display: 'inline-block', padding: '10px 22px' }}>
            Voltar para minha conta
          </Link>
        </div>
      </AppShell>
    );
  }

  const inicial = (p) => (campo(p, 'nome') || '?').replace(/^promptador\s*·?\s*/i, '').charAt(0).toUpperCase();
  const ee = idioma === 'es'; // rótulos em espanhol quando o aluno escolhe ES

  return (
    <AppShell>
      <div className="promp-wrap">
        <div className="promp-top">
          <div>
            <h1>Promptadores</h1>
            <p className="promp-sub">
              {ee
                ? 'Tus agentes del 9barra7 Academy — haz clic en “Abrir” para usarlos en tu ChatGPT.'
                : 'Seus agentes do 9barra7 Academy — clique em “Abrir” para usar no seu ChatGPT.'}
            </p>
          </div>
          {isAdmin && (
            <div className="promp-acoes-top">
              <button className="promp-usuarios" onClick={abrirUsuarios}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a6 6 0 0 1 11 0M16 6.5a3 3 0 0 1 0 6M17.5 20a6 6 0 0 0-3-5.2" strokeLinecap="round" /></svg>
                Usuários
              </button>
              <button className="promp-novo" onClick={novo}>
                <span>+</span> Novo promptador
              </button>
            </div>
          )}
        </div>

        <div className="promp-aviso30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>
          <div className="t">
            {ee
              ? <><b>Los enlaces se renuevan cada 30 días.</b> Si un promptador deja de abrir en tu ChatGPT, vuelve aquí y copia el nuevo enlace — mientras tu acceso esté activo, solo haz clic en “Abrir” otra vez.</>
              : <><b>Os links são renovados a cada 30 dias.</b> Se um promptador parar de abrir no seu ChatGPT, volte aqui e copie o link novo — enquanto seu acesso estiver ativo, é só clicar em “Abrir” de novo.</>}
          </div>
        </div>

        <div className="promp-barra">
          <div className="promp-busca">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5" /><path d="M11 11l3 3" /></svg>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder={ee ? 'Buscar promptador...' : 'Buscar promptador...'}
            />
          </div>
          <div className="promp-toggle">
            <button className={idioma === 'pt' ? 'on' : ''} onClick={() => setIdioma('pt')}>Português</button>
            <button className={idioma === 'es' ? 'on' : ''} onClick={() => setIdioma('es')}>Español</button>
          </div>
        </div>

        {erro && <p className="promp-erro">{erro}</p>}

        {filtrados.length === 0 ? (
          <div className="promp-vazio">
            {lista.length === 0
              ? (isAdmin ? 'Nenhum promptador ainda. Clique em “Novo promptador” para adicionar o primeiro.' : 'Nenhum promptador disponível ainda.')
              : 'Nenhum resultado para a sua busca.'}
          </div>
        ) : (
          <div className="promp-lista" onDragOver={(e) => { e.preventDefault(); calcVel(e.clientY); }} onDrop={soltar}>
            {filtrados.map((p, i) => (
              <div
                className={'promp-row' + (arrastandoId === p.id ? ' promp-row--arrastando' : '')}
                key={p.id}
                onDragOver={(e) => podeArrastar && arrastaSobre(e, i)}
              >
                {isAdmin && (
                  <span
                    className={'promp-grip' + (podeArrastar ? '' : ' promp-grip--off')}
                    title={podeArrastar ? 'Arraste para reordenar' : 'Limpe a busca para reordenar'}
                    draggable={podeArrastar}
                    onDragStart={() => { arrastando.current = i; setArrastandoId(p.id); iniciarAutoScroll(); }}
                    onDragEnd={soltar}
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <circle cx="6" cy="4" r="1.3" /><circle cx="10" cy="4" r="1.3" />
                      <circle cx="6" cy="8" r="1.3" /><circle cx="10" cy="8" r="1.3" />
                      <circle cx="6" cy="12" r="1.3" /><circle cx="10" cy="12" r="1.3" />
                    </svg>
                  </span>
                )}
                <div className="promp-cir" style={p.avatar ? { backgroundImage: `url(${p.avatar})` } : undefined}>
                  {!p.avatar && inicial(p)}
                </div>
                <div className="promp-info">
                  <div className="promp-nm">{campo(p, 'nome')}</div>
                  <div className="promp-ds">{campo(p, 'descricao')}</div>
                  {p.atualizado_em && (
                    <div className="promp-att">{ee ? 'actualizado en ' : 'atualizado em '}{fmtData(p.atualizado_em)}</div>
                  )}
                </div>
                {isAdmin && (
                  <button className="promp-lapis" onClick={() => editar(p)} title="Editar" aria-label="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 5l4 4" />
                    </svg>
                  </button>
                )}
                <button className="promp-abrir" onClick={() => abrir(p)}>
                  {ee ? 'Abrir' : 'Abrir'} ↗
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card "acesso acabando" — só na aba, estilo do "5 de 7" do free.
          Aparece quando faltam 7 dias ou menos (não admin, não vitalício). */}
      {!isAdmin && diasRestantes != null && diasRestantes > 0 && diasRestantes <= 7 && (
        <div className="trial-card">
          <div className="trial-card-info">
            <span className="trial-card-txt">
              <strong>{diasRestantes === 1 ? 'Falta 1 dia de acesso' : `Faltam ${diasRestantes} dias de acesso`}</strong>{' '}
              <small>aos Promptadores · renove o IA Studio</small>
            </span>
            <div className="trial-card-prog"><i style={{ width: (diasRestantes / 7 * 100) + '%' }} /></div>
          </div>
          <button className="trial-card-btn" onClick={() => window.open(LINK_RENOVAR, '_blank', 'noopener')}>
            Renovar IA Studio
          </button>
        </div>
      )}

      {/* ── Modal de edição (admin) ── */}
      {editando && (
        <div className="promp-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
          <div className="promp-modal">
            <div className="promp-mh">
              <h3>{editando.id ? 'Editar promptador' : 'Novo promptador'}</h3>
              <div className="promp-lang">
                <button className={langEdit === 'pt' ? 'on' : ''} onClick={() => setLangEdit('pt')}>Português</button>
                <button className={langEdit === 'es' ? 'on' : ''} onClick={() => setLangEdit('es')}>Español</button>
              </div>
            </div>

            <div className="promp-mb">
              {/* avatar clicável */}
              <div className="promp-av-fld">
                <div className="promp-av-wrap" onClick={() => fileRef.current && fileRef.current.click()}>
                  <div className="promp-av-img" style={editando.avatar ? { backgroundImage: `url(${editando.avatar})` } : undefined}>
                    {!editando.avatar && ((editando.nome_pt || '?').replace(/^promptador\s*·?\s*/i, '').charAt(0).toUpperCase())}
                  </div>
                  <div className="promp-av-cam">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></svg>
                  </div>
                  {editando.avatar && (
                    <div className="promp-av-x" onClick={(e) => { e.stopPropagation(); setEditando(prev => ({ ...prev, avatar: '' })); }}>×</div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={escolherAvatar} />
              </div>

              {langEdit === 'pt' ? (
                <>
                  <div className="promp-fld"><label>Nome</label>
                    <input value={editando.nome_pt} onChange={e => setEditando(p => ({ ...p, nome_pt: e.target.value }))} placeholder="Promptador · Nome" /></div>
                  <div className="promp-fld"><label>Descrição</label>
                    <textarea value={editando.descricao_pt} onChange={e => setEditando(p => ({ ...p, descricao_pt: e.target.value }))} placeholder="O que este promptador faz..." /></div>
                  <div className="promp-fld"><label>Link do ChatGPT</label>
                    <input value={editando.link_pt} onChange={e => setEditando(p => ({ ...p, link_pt: e.target.value }))} placeholder="https://chatgpt.com/g/..." /></div>
                </>
              ) : (
                <>
                  <div className="promp-fld"><label>Nombre</label>
                    <input value={editando.nome_es} onChange={e => setEditando(p => ({ ...p, nome_es: e.target.value }))} placeholder="Promptador · Nombre" /></div>
                  <div className="promp-fld"><label>Descripción</label>
                    <textarea value={editando.descricao_es} onChange={e => setEditando(p => ({ ...p, descricao_es: e.target.value }))} placeholder="Qué hace este promptador..." /></div>
                  <div className="promp-fld"><label>Enlace de ChatGPT</label>
                    <input value={editando.link_es} onChange={e => setEditando(p => ({ ...p, link_es: e.target.value }))} placeholder="https://chatgpt.com/g/..." /></div>
                </>
              )}

              {editando.id && (
                <div className="promp-fld"><label>Atualizado em <span className="promp-auto">automático</span></label>
                  <input value={fmtData(editando.atualizado_em)} disabled className="promp-disabled" /></div>
              )}
            </div>

            <div className="promp-mf">
              {editando.id
                ? <button className="promp-excluir" onClick={excluir} disabled={salvando}>Excluir</button>
                : <span />}
              <div className="promp-dir">
                <button className="promp-btn promp-cancelar" onClick={fechar} disabled={salvando}>Cancelar</button>
                <button className="promp-btn promp-salvar" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
