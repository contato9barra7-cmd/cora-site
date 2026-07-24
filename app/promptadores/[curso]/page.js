'use client';

// ═══════════════════════════════════════════════════════════
//  ABA PROMPTADORES (por curso: IA Studio / PromptHub)
//
//  A rota /promptadores/[curso] define qual curso é exibido. Aluno vê só o
//  curso que comprou; admin vê os dois. Lista em "layout A", toggle PT/ES
//  (conteúdo dos promptadores), admin edita, reordena (arraste) e gerencia
//  acessos (Usuários) — tudo escopado pelo curso.
//  A UI (chrome) segue o idioma global do site (useIdioma → t).
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import DropdownCora from '../../../components/DropdownCora';
import DatePickerCora from '../../../components/DatePickerCora';
import EmailAssinantes from '../../../components/EmailAssinantes';
import { useIdioma } from '../../../lib/i18n';
import { lerConta, atualizarConta, listarPromptadores, salvarPromptador, excluirPromptador, reordenarPromptadores,
  adminListarAcessos, adminAddAcessoManual, adminEnviarConvite, adminRevogarAcesso } from '../../../lib/auth';

// TODO: trocar pelos links das OFERTAS DE EX-ALUNO (renovação mais barata), um por curso.
const LINKS_RENOVAR = {
  ia_studio: 'https://9barra7.com',   // PLACEHOLDER — oferta ex-aluno IA Studio
  prompthub: 'https://9barra7.com',   // PLACEHOLDER — oferta ex-aluno PromptHub
};

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
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`;
}

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

export default function PromptadoresCurso() {
  const router = useRouter();
  const params = useParams();
  const { t } = useIdioma();
  const cursoSlug = (params && params.curso) || 'ia-studio';
  const curso = cursoSlug === 'prompthub' ? 'prompthub' : 'ia_studio';
  const cursoLabel = curso === 'prompthub' ? 'PromptHub' : 'IA Studio';
  const linkRenovar = LINKS_RENOVAR[curso] || LINKS_RENOVAR.ia_studio;
  const VAZIO = { id: null, nome_pt: '', descricao_pt: '', link_pt: '', nome_es: '', descricao_es: '', link_es: '', avatar: '', ordem: 0, curso };

  const PERIODOS = [
    { v: '1', n: t('promp_per_1') }, { v: '2', n: t('promp_per_2') },
    { v: '3', n: t('promp_per_3') }, { v: 'vitalicio', n: t('promp_vitalicio') },
  ];

  const [lista, setLista] = useState([]);
  const [idioma, setIdioma] = useState('pt');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [negado, setNegado] = useState(false);
  const [erro, setErro] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [expirado, setExpirado] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState(null);

  // Usuários (admin)
  const [tela, setTela] = useState('lista');
  const [acessos, setAcessos] = useState([]);
  const [carrAcessos, setCarrAcessos] = useState(false);
  const [dropAberto, setDropAberto] = useState(false);
  const [convModo, setConvModo] = useState(null);
  const [formA, setFormA] = useState({ nome: '', email: '', data_acesso: '', periodo: '1' });
  const [salvandoAcesso, setSalvandoAcesso] = useState(false);
  const [erroAcesso, setErroAcesso] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos'); // todos|avencer|vencidos|pendentes
  const [buscaAcesso, setBuscaAcesso] = useState('');
  const [emailAberto, setEmailAberto] = useState(false);

  // edição (admin)
  const [editando, setEditando] = useState(null);
  const [langEdit, setLangEdit] = useState('pt');
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef(null);

  // reordenar por arraste
  const arrastando = useRef(null);
  const [arrastandoId, setArrastandoId] = useState(null);
  const listaRef = useRef([]);
  useEffect(() => { listaRef.current = lista; }, [lista]);

  const scrollVel = useRef(0);
  const scrollTimer = useRef(null);
  function iniciarAutoScroll() {
    if (scrollTimer.current) return;
    scrollTimer.current = setInterval(() => { if (scrollVel.current) window.scrollBy(0, scrollVel.current); }, 16);
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

  // Recarrega ao trocar de curso (troca de aba reutiliza o componente).
  useEffect(() => {
    setCarregando(true); setNegado(false); setExpirado(false); setTela('lista');
    setBusca(''); setDiasRestantes(null); setErro('');
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setIsAdmin(!!c.is_admin);
    (async () => {
      let cc = c;
      try { const fresca = await atualizarConta(); if (fresca) cc = fresca; } catch (_) {}
      setIsAdmin(!!cc.is_admin);
      const est = cc.promptador_cursos && cc.promptador_cursos[curso];
      if (!cc.is_admin && est && typeof est.dias === 'number') setDiasRestantes(est.dias);
      if (!cc.is_admin && est && est.expirado) { setExpirado(true); setCarregando(false); return; }
      carregar();
    })();
  }, [router, curso]);

  async function carregar() {
    setErro('');
    try {
      const l = await listarPromptadores(curso);
      setLista(l);
      setCarregando(false);
    } catch (e) {
      const m = (e.message || '').toLowerCase();
      if (m.includes('acesso') || m.includes('403') || m.includes('401') || m.includes('permiss')) setNegado(true);
      else setErro(t('promp_erro_carregar') + ' ' + e.message);
      setCarregando(false);
    }
  }

  const campo = (p, base) => (idioma === 'es' ? (p[base + '_es'] || p[base + '_pt']) : p[base + '_pt']);
  const filtrados = lista.filter(p => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (campo(p, 'nome') || '').toLowerCase().includes(q) || (campo(p, 'descricao') || '').toLowerCase().includes(q);
  });

  function abrir(p) {
    const link = idioma === 'es' ? (p.link_es || p.link_pt) : p.link_pt;
    if (link) window.open(link, '_blank', 'noopener');
  }

  const podeArrastar = isAdmin && !busca.trim();
  function arrastaSobre(e, i) {
    if (arrastando.current == null) return;
    e.preventDefault();
    calcVel(e.clientY);
    const de = arrastando.current;
    if (de === i) return;
    setLista(prev => { const arr = [...prev]; const [m] = arr.splice(de, 1); arr.splice(i, 0, m); return arr; });
    arrastando.current = i;
  }
  async function soltar() {
    const mudou = arrastando.current != null;
    arrastando.current = null;
    setArrastandoId(null);
    pararAutoScroll();
    if (!mudou) return;
    try { await reordenarPromptadores(listaRef.current.map(p => p.id)); }
    catch (e) { setErro(t('promp_erro_ordem') + ' ' + e.message); }
  }

  function novo() { setEditando({ ...VAZIO }); setLangEdit('pt'); }
  function editar(p) { setEditando({ ...p }); setLangEdit('pt'); }
  function fechar() { setEditando(null); }
  async function escolherAvatar(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try { const url = await lerAvatar(f); setEditando(prev => ({ ...prev, avatar: url })); } catch (_) {}
    e.target.value = '';
  }
  async function salvar() {
    if (!editando) return;
    setSalvando(true); setErro('');
    try { await salvarPromptador({ ...editando, curso }); await carregar(); setEditando(null); }
    catch (e) { setErro(e.message); } finally { setSalvando(false); }
  }
  async function excluir() {
    if (!editando || !editando.id) return;
    if (!confirm(t('promp_conf_excluir'))) return;
    setSalvando(true);
    try { await excluirPromptador(editando.id); await carregar(); setEditando(null); }
    catch (e) { setErro(e.message); } finally { setSalvando(false); }
  }

  // ── Usuários (admin) ──
  async function abrirUsuarios() {
    setTela('usuarios'); setCarrAcessos(true);
    try { setAcessos(await adminListarAcessos(curso)); } catch (e) { setErroAcesso(e.message); } finally { setCarrAcessos(false); }
  }
  async function recarregarAcessos() {
    try { setAcessos(await adminListarAcessos(curso)); } catch (e) { setErroAcesso(e.message); }
  }
  function abrirModalAcesso(modo) {
    setConvModo(modo); setDropAberto(false); setErroAcesso('');
    setFormA({ nome: '', email: '', data_acesso: hojeISO(), periodo: '1' });
  }
  async function salvarAcesso() {
    if (!formA.email.trim() || !formA.data_acesso) { setErroAcesso(t('promp_preencha')); return; }
    setSalvandoAcesso(true); setErroAcesso('');
    try {
      const base = { email: formA.email.trim(), data_acesso: formA.data_acesso, periodo: formA.periodo, curso };
      if (convModo === 'convite') await adminEnviarConvite(base);
      else await adminAddAcessoManual({ ...base, nome: formA.nome.trim() });
      await recarregarAcessos();
      setConvModo(null);
    } catch (e) { setErroAcesso(e.message); } finally { setSalvandoAcesso(false); }
  }
  async function revogarAcesso(a) {
    if (!confirm(`${t('promp_conf_revogar')} ${a.email}?`)) return;
    try { await adminRevogarAcesso(a.id); await recarregarAcessos(); } catch (e) { setErroAcesso(e.message); }
  }
  // "Vencido" decidido no próprio front (fonte única) pra status, selo e filtro
  // nunca discordarem. Vale ATÉ o fim do dia da validade (inclusive).
  function estaVencido(a) {
    if (!a.validade) return false;               // vitalício / sem data
    const v = new Date(a.validade); v.setHours(23, 59, 59, 999);
    return new Date() > v;
  }
  function statusAcesso(a) {
    if (!a.tem_conta) return { txt: a.origem === 'convite' ? t('promp_st_convite') : t('promp_st_aguardando'), cls: 'pend' };
    if (estaVencido(a)) return { txt: t('promp_st_expirado'), cls: 'exp' };
    return { txt: t('promp_st_ativo'), cls: 'ok' };
  }
  const acessosFiltrados = acessos.filter(a => {
    if (filtroStatus === 'vencidos' && !estaVencido(a)) return false;
    if (filtroStatus === 'pendentes' && a.tem_conta) return false;
    if (filtroStatus === 'avencer') {
      if (!a.validade || estaVencido(a)) return false;
      const v = new Date(a.validade), now = new Date();
      if (!(v.getMonth() === now.getMonth() && v.getFullYear() === now.getFullYear())) return false;
    }
    if (buscaAcesso.trim()) {
      const q = buscaAcesso.toLowerCase();
      if (!((a.nome || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });
  function exportarCSV() {
    const linhas = [[t('promp_nome'), t('promp_email'), t('promp_th_compra'), t('promp_th_ate'), t('promp_th_origem'), t('promp_th_status')]];
    acessosFiltrados.forEach(a => {
      linhas.push([
        a.nome || '', a.email || '', fmtDataLong(a.data_acesso),
        a.validade ? fmtDataLong(a.validade) : t('promp_vitalicio'),
        a.origem === 'convite' ? t('promp_origem_convite') : t('promp_origem_manual'), statusAcesso(a).txt,
      ]);
    });
    const csv = linhas.map(l => l.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acessos-${cursoSlug}-${filtroStatus}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  const FILTROS = [
    { v: 'todos', l: t('promp_f_todos') }, { v: 'avencer', l: t('promp_f_avencer') },
    { v: 'vencidos', l: t('promp_f_vencidos') }, { v: 'pendentes', l: t('promp_f_pendentes') },
  ];
  function contarFiltro(v) {
    return acessos.filter(a => {
      if (v === 'vencidos') return estaVencido(a);
      if (v === 'pendentes') return !a.tem_conta;
      if (v === 'avencer') {
        if (!a.validade || estaVencido(a)) return false;
        const d = new Date(a.validade), now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    }).length;
  }

  if (carregando) return <AppShell><div className="promp-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;

  // Aluno com acesso vencido
  if (expirado) {
    return (
      <AppShell>
        <div className="promp-wrap" style={{ position: 'relative', minHeight: '60vh' }}>
          <h1>Promptadores {cursoLabel}</h1>
          <p className="promp-sub">{t('promp_sub_short')}</p>
          <div className="promp-exp-ov">
            <div className="promp-exp-card">
              <div className="promp-exp-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0d2b06" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
              </div>
              <span className="promp-exp-eb">{t('promp_exp_eb')}</span>
              <h2>{t('promp_exp_h')}</h2>
              <p>{t('promp_exp_p_a')} {cursoLabel} {t('promp_exp_p_b')}</p>
              <a className="promp-exp-btn" href={linkRenovar} target="_blank" rel="noopener">{t('promp_renovar')} {cursoLabel} ↗</a>
              <button className="promp-exp-voltar" onClick={() => router.push('/conta')}>{t('promp_voltar_b')}</button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Usuários (admin)
  if (isAdmin && tela === 'usuarios') {
    return (
      <AppShell>
        <div className="promp-wrap">
          <button className="promp-voltar" onClick={() => setTela('lista')}>{t('promp_voltar_lista')}</button>
          <div className="promp-top">
            <div>
              <h1>{t('promp_acesso_tit')} {cursoLabel}</h1>
              <p className="promp-sub">{t('promp_acesso_sub_a')} {cursoLabel}.</p>
            </div>
            <div className="promp-top-acoes">
              <button className="promp-usuarios" onClick={() => setEmailAberto(true)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 6l8 6 8-6" /></svg>
                {t('promp_enviar_email')}
              </button>
              <div className="promp-conv-wrap">
              <button className="promp-novo" onClick={() => setDropAberto(v => !v)}>{t('promp_convidar')} <span style={{ fontSize: 10 }}>▼</span></button>
              {dropAberto && (
                <div className="promp-drop" onMouseLeave={() => setDropAberto(false)}>
                  <div className="promp-dopt" onClick={() => abrirModalAcesso('manual')}>
                    <div className="promp-dico g"><svg viewBox="0 0 24 24" fill="none" stroke="#3f9d54" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 5l4 4" /></svg></div>
                    <div><div className="t">{t('promp_add_manual_t')}</div><div className="s">{t('promp_add_manual_s')}</div></div>
                  </div>
                  <div className="promp-dopt" onClick={() => abrirModalAcesso('convite')}>
                    <div className="promp-dico r"><svg viewBox="0 0 24 24" fill="none" stroke="#6d6ae0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 6l8 6 8-6" /></svg></div>
                    <div><div className="t">{t('promp_add_email_t')}</div><div className="s">{t('promp_add_email_s')}</div></div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* filtros + busca */}
          <div className="promp-filtros">
            <div className="promp-chips">
              {FILTROS.map(f => (
                <button key={f.v} className={'promp-chip' + (filtroStatus === f.v ? ' on' : '')} onClick={() => setFiltroStatus(f.v)}>{f.l} <span className="promp-chip-n">{contarFiltro(f.v)}</span></button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="promp-busca promp-busca--sm">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5" /><path d="M11 11l3 3" /></svg>
                <input value={buscaAcesso} onChange={e => setBuscaAcesso(e.target.value)} placeholder={t('promp_busca_ph')} />
              </div>
              <button className="promp-usuarios" onClick={exportarCSV} disabled={acessosFiltrados.length === 0} title={t('promp_csv_title')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M5 21h14" /></svg>
                CSV
              </button>
            </div>
          </div>

          {erroAcesso && <p className="promp-erro">{erroAcesso}</p>}

          <div className="promp-tabela-wrap">
            {carrAcessos ? <p style={{ padding: 20, color: 'var(--ink3)' }}>{t('comum_carregando')}</p> : (
              <table className="promp-tabela">
                <thead><tr><th>{t('promp_th_aluno')}</th><th>{t('promp_th_compra')}</th><th>{t('promp_th_ate')}</th><th>{t('promp_th_origem')}</th><th>{t('promp_th_status')}</th><th></th></tr></thead>
                <tbody>
                  {acessosFiltrados.length === 0 ? (
                    <tr><td colSpan={6} style={{ color: 'var(--ink3)', padding: 22 }}>{acessos.length === 0 ? t('promp_vazio_acessos') : t('promp_vazio_filtro')}</td></tr>
                  ) : acessosFiltrados.map(a => {
                    const st = statusAcesso(a);
                    return (
                      <tr key={a.id}>
                        <td><div className="promp-al-nome">{a.nome || '—'}</div><div className="promp-al-mail">{a.email}</div></td>
                        <td>{fmtDataLong(a.data_acesso)}</td>
                        <td>{!a.validade
                          ? <span className="promp-badge vital">{t('promp_vitalicio')}</span>
                          : <span className={'promp-badge ' + (estaVencido(a) ? 'venc' : 'data')}>{t('promp_ate')} {fmtDataLong(a.validade)}</span>}</td>
                        <td><span className="promp-tag">{a.origem === 'convite' ? t('promp_origem_convite') : t('promp_origem_manual')}</span></td>
                        <td><span className={'promp-st ' + st.cls}><span className="promp-dot" />{st.txt}</span></td>
                        <td><button className="promp-revogar" onClick={() => revogarAcesso(a)}>{t('promp_revogar')}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {convModo && (
          <div className="promp-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) setConvModo(null); }}>
            <div className="promp-modal promp-modal--acesso">
              <div className="promp-mh"><h3>{convModo === 'convite' ? t('promp_add_email_t') : t('promp_add_manual_t')}</h3></div>
              <div className="promp-mb">
                <div className="promp-curso-tag">{t('promp_curso_l')} <b>{cursoLabel}</b></div>
                {convModo === 'convite' && (
                  <div className="promp-nota">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#6d6ae0" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" strokeLinecap="round" /></svg>
                    {t('promp_conv_nota')}
                  </div>
                )}
                {convModo === 'manual' && (
                  <div className="promp-fld"><label>{t('promp_nome')}</label>
                    <input value={formA.nome} onChange={e => setFormA(f => ({ ...f, nome: e.target.value }))} placeholder={t('promp_nome_ph')} /></div>
                )}
                <div className="promp-fld"><label>{convModo === 'convite' ? t('promp_email_aluno') : t('promp_email')}</label>
                  <input type="email" value={formA.email} onChange={e => setFormA(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
                <div className="promp-duo">
                  <div className="promp-fld"><label>{convModo === 'convite' ? t('promp_data_entrada') : t('promp_th_compra')}</label>
                    <DatePickerCora valor={formA.data_acesso} onEscolher={(iso) => setFormA(f => ({ ...f, data_acesso: iso }))} /></div>
                  <div className="promp-fld"><label>{t('promp_periodo')}</label>
                    <DropdownCora valor={formA.periodo} opcoes={PERIODOS} onEscolher={(v) => setFormA(f => ({ ...f, periodo: v }))} /></div>
                </div>
              </div>
              <div className="promp-mf">
                <span />
                <div className="promp-dir">
                  <button className="promp-btn promp-cancelar" onClick={() => setConvModo(null)} disabled={salvandoAcesso}>{t('comum_cancelar')}</button>
                  <button className={'promp-btn ' + (convModo === 'convite' ? 'promp-salvar' : 'promp-add')} onClick={salvarAcesso} disabled={salvandoAcesso}>
                    {salvandoAcesso ? t('comum_salvando') : (convModo === 'convite' ? t('promp_enviar_convite') : t('promp_adicionar'))}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {emailAberto && <EmailAssinantes curso={curso} cursoLabel={cursoLabel} onClose={() => setEmailAberto(false)} />}
      </AppShell>
    );
  }

  if (negado) {
    return (
      <AppShell>
        <div className="promp-wrap">
          <h1>{t('promp_acesso_restrito')}</h1>
          <p>{t('promp_restrito_a')} {cursoLabel} {t('promp_restrito_b')}</p>
          <Link href="/conta" className="btn btn--roxo" style={{ width: 'auto', display: 'inline-block', padding: '10px 22px' }}>{t('promp_voltar_conta')}</Link>
        </div>
      </AppShell>
    );
  }

  const inicial = (p) => (campo(p, 'nome') || '?').replace(/^promptador\s*·?\s*/i, '').charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="promp-wrap">
        <div className="promp-top">
          <div>
            <h1>Promptadores {cursoLabel}</h1>
            <p className="promp-sub">{t('promp_sub_full')}</p>
          </div>
          {isAdmin && (
            <div className="promp-acoes-top">
              <button className="promp-usuarios" onClick={abrirUsuarios}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a6 6 0 0 1 11 0M16 6.5a3 3 0 0 1 0 6M17.5 20a6 6 0 0 0-3-5.2" strokeLinecap="round" /></svg>
                {t('promp_usuarios')}
              </button>
              <button className="promp-novo" onClick={novo}><span>+</span> {t('promp_novo')}</button>
            </div>
          )}
        </div>

        <div className="promp-aviso30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>
          <div className="t" dangerouslySetInnerHTML={{ __html: t('promp_aviso30') }} />
        </div>

        <div className="promp-barra">
          <div className="promp-busca">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5" /><path d="M11 11l3 3" /></svg>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder={t('promp_busca_promp_ph')} />
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
              ? (isAdmin ? t('promp_vazio_admin') : t('promp_vazio_aluno'))
              : t('promp_vazio_busca')}
          </div>
        ) : (
          <div className="promp-lista" onDragOver={(e) => { e.preventDefault(); calcVel(e.clientY); }} onDrop={soltar}>
            {filtrados.map((p, i) => (
              <div className={'promp-row' + (arrastandoId === p.id ? ' promp-row--arrastando' : '')} key={p.id}
                onDragOver={(e) => podeArrastar && arrastaSobre(e, i)}>
                {isAdmin && (
                  <span className={'promp-grip' + (podeArrastar ? '' : ' promp-grip--off')}
                    title={podeArrastar ? t('promp_arraste') : t('promp_limpe_busca')}
                    draggable={podeArrastar}
                    onDragStart={() => { arrastando.current = i; setArrastandoId(p.id); iniciarAutoScroll(); }}
                    onDragEnd={soltar}>
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
                    <div className="promp-att">{t('promp_atualizado')} {fmtData(p.atualizado_em)}</div>
                  )}
                </div>
                {isAdmin && (
                  <button className="promp-lapis" onClick={() => editar(p)} title={t('promp_editar')} aria-label={t('promp_editar')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 5l4 4" /></svg>
                  </button>
                )}
                <button className="promp-abrir" onClick={() => abrir(p)}>{t('promp_abrir')} ↗</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card "acesso acabando" — só na aba, ≤7 dias */}
      {!isAdmin && diasRestantes != null && diasRestantes > 0 && diasRestantes <= 7 && (
        <div className="trial-card">
          <div className="trial-card-info">
            <span className="trial-card-txt">
              <strong>{diasRestantes === 1 ? t('promp_falta1') : `${t('promp_dias_pre')} ${diasRestantes} ${t('promp_dias_pos')}`.trim()}</strong>{' '}
              <small>{t('promp_aos_a')} {cursoLabel} {t('promp_aos_b')}</small>
            </span>
            <div className="trial-card-prog"><i style={{ width: (diasRestantes / 7 * 100) + '%' }} /></div>
          </div>
          <button className="trial-card-btn" onClick={() => window.open(linkRenovar, '_blank', 'noopener')}>{t('promp_renovar')} {cursoLabel}</button>
        </div>
      )}

      {/* Modal de edição (admin) */}
      {editando && (
        <div className="promp-ov" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
          <div className="promp-modal">
            <div className="promp-mh">
              <h3>{editando.id ? t('promp_edit_editar') : t('promp_edit_novo')}</h3>
              <div className="promp-lang">
                <button className={langEdit === 'pt' ? 'on' : ''} onClick={() => setLangEdit('pt')}>Português</button>
                <button className={langEdit === 'es' ? 'on' : ''} onClick={() => setLangEdit('es')}>Español</button>
              </div>
            </div>
            <div className="promp-mb">
              <div className="promp-av-fld">
                <div className="promp-av-wrap" onClick={() => fileRef.current && fileRef.current.click()}>
                  <div className="promp-av-img" style={editando.avatar ? { backgroundImage: `url(${editando.avatar})` } : undefined}>
                    {!editando.avatar && ((editando.nome_pt || '?').replace(/^promptador\s*·?\s*/i, '').charAt(0).toUpperCase())}
                  </div>
                  <div className="promp-av-cam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></svg></div>
                  {editando.avatar && (<div className="promp-av-x" onClick={(e) => { e.stopPropagation(); setEditando(prev => ({ ...prev, avatar: '' })); }}>×</div>)}
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
                <div className="promp-fld"><label>{t('promp_atualizado_em_l')} <span className="promp-auto">{t('promp_automatico')}</span></label>
                  <input value={fmtData(editando.atualizado_em)} disabled className="promp-disabled" /></div>
              )}
            </div>
            <div className="promp-mf">
              {editando.id ? <button className="promp-excluir" onClick={excluir} disabled={salvando}>{t('promp_excluir')}</button> : <span />}
              <div className="promp-dir">
                <button className="promp-btn promp-cancelar" onClick={fechar} disabled={salvando}>{t('comum_cancelar')}</button>
                <button className="promp-btn promp-salvar" onClick={salvar} disabled={salvando}>{salvando ? t('comum_salvando') : t('promp_salvar')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
