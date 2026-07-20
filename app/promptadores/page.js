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
import { lerConta, listarPromptadores, salvarPromptador, excluirPromptador, reordenarPromptadores } from '../../lib/auth';

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

  // modal de edição (admin)
  const [editando, setEditando] = useState(null);   // objeto do form ou null
  const [langEdit, setLangEdit] = useState('pt');
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef(null);

  // reordenar por arraste (admin) — item fica parado; um risco roxo indica onde vai cair
  const arrastando = useRef(null);          // índice pego
  const [voando, setVoando] = useState(null);
  const [alvo, setAlvo] = useState(null);   // { index, side:'antes'|'depois' }
  const alvoRef = useRef(null);
  const listaRef = useRef([]);
  useEffect(() => { listaRef.current = lista; }, [lista]);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setIsAdmin(!!c.is_admin);
    carregar();
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

  // Enquanto arrasta: NÃO move o item. Só calcula de que lado do card sob o
  // cursor o risco roxo deve aparecer (antes/depois), pela metade horizontal.
  function arrastaSobre(e, i) {
    if (arrastando.current == null) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const side = (e.clientY < r.top + r.height / 2) ? 'antes' : 'depois';
    const novo = { index: i, side };
    alvoRef.current = novo;
    setAlvo(prev => (prev && prev.index === i && prev.side === side) ? prev : novo);
  }

  async function soltar() {
    const de = arrastando.current;
    const al = alvoRef.current;
    arrastando.current = null;
    alvoRef.current = null;
    setVoando(null);
    setAlvo(null);
    if (de == null || !al) return;
    let ins = al.side === 'antes' ? al.index : al.index + 1;
    const arr = [...listaRef.current];
    const [m] = arr.splice(de, 1);
    const target = ins > de ? ins - 1 : ins;
    if (target === de) return;                 // não mudou de lugar
    arr.splice(target, 0, m);
    listaRef.current = arr;
    setLista(arr);
    try { await reordenarPromptadores(arr.map(p => p.id)); }
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

  if (carregando) return <AppShell><div className="promp-wrap"><p>Carregando...</p></div></AppShell>;

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
            <button className="promp-novo" onClick={novo}>
              <span>+</span> Novo promptador
            </button>
          )}
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
          <div className="promp-lista" onDragOver={(e) => e.preventDefault()} onDrop={soltar}>
            {filtrados.map((p, i) => (
              <div
                className={'promp-row'
                  + (voando === i ? ' promp-row--voando' : '')
                  + (alvo && alvo.index === i && alvo.side === 'antes' ? ' promp-row--linha-antes' : '')
                  + (alvo && alvo.index === i && alvo.side === 'depois' ? ' promp-row--linha-depois' : '')}
                key={p.id}
                onDragOver={(e) => podeArrastar && arrastaSobre(e, i)}
              >
                {isAdmin && (
                  <span
                    className={'promp-grip' + (podeArrastar ? '' : ' promp-grip--off')}
                    title={podeArrastar ? 'Arraste para reordenar' : 'Limpe a busca para reordenar'}
                    draggable={podeArrastar}
                    onDragStart={() => { arrastando.current = i; setVoando(i); }}
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
