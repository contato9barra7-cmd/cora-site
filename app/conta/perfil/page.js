'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import DropdownCora from '../../../components/DropdownCora';
import { lerConta, salvarPerfil, deletarMinhaConta, aplicarTema, sair, salvarFoto, listarDispositivos, removerDispositivo, registrarDispositivoWeb } from '../../../lib/auth';
import { useIdioma, localeDeIdioma } from '../../../lib/i18n';

const IDIOMAS = [
  { v: 'pt', l: 'Português' },
  { v: 'en', l: 'English' },
  { v: 'es', l: 'Español' },
];
const TEMAS = [
  { v: 'claro', k: 'tema_claro' },
  { v: 'escuro', k: 'tema_escuro' },
  { v: 'sistema', k: 'tema_sistema' },
];

// O recorte sai sempre em 400 por 400 (ver salvarFotoRecortada). O teto aqui
// é do ARQUIVO que a pessoa escolhe, que é o que o navegador tem que ler
// inteiro para a memória antes de qualquer recorte acontecer.
// Mudar este número quer dizer mudar `perfil_foto_orient` e
// `perfil_foto_grande` nos três idiomas: o `t()` não interpola de
// propósito, então o "10 MB" está escrito nas frases.
const MAX_FOTO_BYTES = 10 * 1024 * 1024;   // 10 MB
const LADO_FOTO = 400;                     // o lado do que fica guardado

export default function Perfil() {
  const router = useRouter();
  const { t, idioma } = useIdioma();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [idiomaSel, setIdiomaSel] = useState('pt');
  const [tema, setTema] = useState('sistema');
  const [newsletter, setNewsletter] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [modalDeletar, setModalDeletar] = useState(false);
  /* O número da conta copiado. Ele volta ao normal sozinho depois de 1,4s, e
     o `useRef` guarda o relógio para dois cliques seguidos não deixarem o
     primeiro apagando a confirmação do segundo. */
  const [numCopiado, setNumCopiado] = useState(false);
  const relogioCopia = useRef(null);
  const [deletando, setDeletando] = useState(false);
  const [dispositivos, setDispositivos] = useState([]);
  const [modalAjuda, setModalAjuda] = useState(false);

  async function carregarDispositivos() {
    try {
      // Registra ANTES de listar. Quem já estava logado antes desta versão
      // nunca passou pelo salvarSessao com o registro dentro — e por isso o
      // próprio navegador que está lendo esta tela não aparecia nela.
      //
      // É idempotente: o mesmo device_id não duplica.
      await registrarDispositivoWeb();

      const lista = await listarDispositivos();
      setDispositivos(lista);
    } catch (e) { /* silencioso */ }
  }

  async function tirarDispositivo(id) {
    if (!confirm(t('perfil_confirm_remover_pc'))) return;
    try {
      await removerDispositivo(id);
      await carregarDispositivos();
    } catch (e) {
      setErro(e.message);
    }
  }

  // --- foto de perfil (recorte 1:1, igual ao plugin) ---
  const [modalFoto, setModalFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const inputFotoRef = useRef(null);
  const canvasRef = useRef(null);
  const fotoState = useRef({ img: null, zoom: 1, x: 0, y: 0, base: 1, drag: false, lx: 0, ly: 0 });

  function abrirSeletorFoto() { if (inputFotoRef.current) inputFotoRef.current.click(); }
  function aoSelecionarFoto(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    /* O LIMITE É DO ARQUIVO, e não da imagem.
       O recorte sempre sai em 400 por 400, então o tamanho do que a pessoa
       escolhe nunca chega ao servidor: uma foto de 8000px vira 400 aqui
       mesmo. O que o arquivo grande faz de ruim é acontecer ANTES disso, no
       navegador, que lê tudo para memória de uma vez. Num telefone antigo uma
       foto de 40MB trava a aba, e a pessoa não vê erro nenhum, só a tela
       parada. Daí o teto. */
    if (file.size > MAX_FOTO_BYTES) {
      setErroFoto(t('perfil_foto_grande'));
      ev.target.value = '';
      return;
    }
    setErroFoto('');
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
      out.width = LADO_FOTO; out.height = LADO_FOTO;
      const octx = out.getContext('2d');
      const esc = st.base * st.zoom * (LADO_FOTO / 260);
      const w = st.img.width * esc, h = st.img.height * esc;
      const x = (LADO_FOTO - w) / 2 + st.x * (LADO_FOTO / 260);
      const y = (LADO_FOTO - h) / 2 + st.y * (LADO_FOTO / 260);
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

  async function copiarNumeroDaConta() {
    try { await navigator.clipboard.writeText('#' + conta.id); } catch (e) {}
    setNumCopiado(true);
    clearTimeout(relogioCopia.current);
    relogioCopia.current = setTimeout(() => setNumCopiado(false), 1400);
  }

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setNome(c.nome || '');
    setUsername(c.username || '');
    setIdiomaSel(c.idioma || 'pt');
    setTema(c.tema || 'sistema');
    setNewsletter(c.newsletter !== false);
    setCarregando(false);
    carregarDispositivos();
  }, [router]);

  async function salvar() {
    setSalvando(true); setErro(''); setAviso('');
    try {
      const atualizada = await salvarPerfil({ nome, username, idioma: idiomaSel, tema, newsletter });
      if (atualizada) setConta(atualizada);
      aplicarTema(tema);
      setAviso(t('perfil_alteracoes_salvas'));
      setTimeout(() => setAviso(''), 4000);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  // O índice lateral acompanha a rolagem, como nas páginas legais e no
  // suporte. Sem isto a lista fica decorativa: ela marca uma seção e nunca
  // mais muda, mesmo com a pessoa lendo outra.
  useEffect(() => {
    if (carregando) return;
    const elos = Array.from(document.querySelectorAll('.perfil-idx a'));
    if (!elos.length) return;
    const secoes = elos.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
    function marcar() {
      let alvo = 0;
      secoes.forEach((sec, i) => { if (sec && sec.getBoundingClientRect().top <= 140) alvo = i; });
      elos.forEach((a, i) => a.setAttribute('data-aqui', i === alvo ? 'sim' : 'nao'));
    }
    marcar();
    window.addEventListener('scroll', marcar, { passive: true });
    return () => window.removeEventListener('scroll', marcar);
  }, [carregando]);

  // aplica o tema imediatamente ao trocar no seletor (preview)
  function trocarTema(v) {
    setTema(v);
    aplicarTema(v);
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

  if (carregando) return <AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;
  if (!conta) return null;

  const ehPago = conta.plano && conta.plano !== 'free' && !conta.is_admin;
  const inicial = (conta.nome || conta.email || '?').charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="admin-wrap">

        {/* A mesma cabeça do site dos Promptadores: foto quadrada de canto
            redondo, olho, nome grande em peso 500. O h1 morava dentro do
            índice, e um título dentro de uma lista de atalhos é um título
            que ninguém acha. */}
        <div className="conta-cabeca">
          <div
            className="conta-cabeca__foto"
            style={conta.foto_url ? { backgroundImage: `url(${conta.foto_url})`, color: 'transparent' } : undefined}
          >{conta.foto_url ? '' : inicial}</div>
          <div className="conta-cabeca__txt">
            <p className="eyebrow">{t('nav_minhaconta')}</p>
            <h1 className="conta-cabeca__nome">{conta.nome || conta.email}</h1>
            <p className="conta-cabeca__email">{conta.email}</p>
          </div>
        </div>

        <div className="perfil-wrap">
        <nav className="perfil-idx" aria-label={t('nav_minhaconta')}>
          <a href="#sec-perfil">{t('perfil_perfil')}</a>
          <a href="#sec-prefs">{t('perfil_preferencias')}</a>
          <a href="#sec-notif">{t('perfil_notificacoes')}</a>
          <a href="#sec-seg">{t('perfil_seguranca')}</a>
          <a href="#sec-perigo" className="perfil-idx--perigo">{t('perfil_deletar_conta')}</a>
        </nav>

        <div className="perfil-col">
        {aviso && <div className="conta-aviso">{aviso}</div>}
        {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

        {/* PERFIL */}
        <section className="perfil-sec" id="sec-perfil">
          <h2 className="perfil-h2">{t('perfil_perfil')}</h2>
          <div className="perfil-linha">
            <label className="perfil-lbl">{t('perfil_avatar')}</label>
            <div className="perfil-avatar-area">
              <div className="perfil-avatar-box">
                <span
                  className="perfil-avatar"
                  style={conta.foto_url ? { backgroundImage: `url(${conta.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
                >
                  {conta.foto_url ? '' : inicial}
                </span>
                <button className="perfil-avatar-editar" onClick={abrirSeletorFoto} title={t('perfil_trocar_foto')} aria-label={t('perfil_trocar_foto')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                </button>
                {conta.foto_url && (
                  <button className="perfil-avatar-x" onClick={removerFoto} title={t('perfil_remover_foto')} aria-label={t('perfil_remover_foto')}>×</button>
                )}
              </div>
              {/* A regra fica onde a pessoa ESCOLHE o arquivo, e não só dentro
                  do recorte: quem descobre o limite depois de escolher já
                  perdeu a viagem. */}
              <div className="perfil-foto-dica">
                {t('perfil_foto_orient')}
                {erroFoto && <><br /><em className="perfil-foto-erro">{erroFoto}</em></>}
              </div>
              <input type="file" ref={inputFotoRef} accept="image/*" style={{ display: 'none' }} onChange={aoSelecionarFoto} />
            </div>
          </div>
          <div className="perfil-linha">
            <label className="perfil-lbl">{t('perfil_nome')}</label>
            <input className="perfil-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t('perfil_seu_nome')} />
          </div>
          <div className="perfil-linha">
            <label className="perfil-lbl">{t('perfil_username')}</label>
            <input className="perfil-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="seu_username" />
          </div>
          <div className="perfil-linha">
            <label className="perfil-lbl">Email</label>
            <input className="perfil-input" value={conta.email} disabled title={t('perfil_email_bloqueado')} />
          </div>
          {/* ── O NÚMERO DA CONTA ──
              Ele é o único identificador que não muda: nome se edita, e-mail se
              troca, e duas pessoas podem ter o mesmo nome. Quem escreve para o
              suporte manda este número e a conta é encontrada na hora, sem a
              troca de mensagens de "qual e-mail mesmo?".
              Aparece como texto e não como campo, porque não se edita. */}
          <div className="perfil-linha">
            <label className="perfil-lbl">{t('perfil_num_conta')}</label>
            <div className="perfil-num-conta">
              {/* Pastilha, e não campo: campo diz "digite aqui", e este número
                  não se edita. Clicar copia, porque "diga este número ao
                  suporte" quer dizer que ele vai sair daqui. */}
              <button className="perfil-num-conta__p" type="button"
                      data-feito={numCopiado ? 'sim' : undefined}
                      aria-label={t('perfil_num_copiar')}
                      onClick={copiarNumeroDaConta}>
                #{conta.id}
                <span className="perfil-num-conta__ic" aria-hidden="true">
                  {numCopiado ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.5 3.5L13 4.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"
                         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
                      <path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" />
                    </svg>
                  )}
                </span>
              </button>
              <span className="perfil-num-conta__d">{t('perfil_num_conta_dica')}</span>
              {/* Sem isto, copiar não acontece para quem ouve a tela. */}
              <span className="pn-so-leitor" role="status">
                {numCopiado ? t('perfil_num_copiado') : ''}
              </span>
            </div>
          </div>
        </section>

        {/* PREFERÊNCIAS */}
        <section className="perfil-sec" id="sec-prefs">
          <h2 className="perfil-h2">{t('perfil_preferencias')}</h2>
          <div className="perfil-linha">
            <label className="perfil-lbl">{t('idioma_label')}</label>
            <DropdownCora
              valor={idiomaSel}
              onEscolher={(v) => setIdiomaSel(v)}
              opcoes={IDIOMAS.map(i => ({ v: i.v, n: i.l }))}
            />
          </div>
          <div className="perfil-linha">
            <label className="perfil-lbl">{t('tema_label')}</label>
            <DropdownCora
              valor={tema}
              onEscolher={(v) => trocarTema(v)}
              opcoes={TEMAS.map(op => ({ v: op.v, n: t(op.k) }))}
            />
          </div>
        </section>

        {/* NOTIFICAÇÕES */}
        <section className="perfil-sec" id="sec-notif">
          <h2 className="perfil-h2">{t('perfil_notificacoes')}</h2>
          <p className="perfil-sub">{t('perfil_notif_sub')}</p>
          <div className="perfil-linha perfil-toggle-linha">
            <div>
              {/* "Newsletter" estava cravado em inglês no meio de uma tela em
                  português, e não dizia o que chega. */}
              <label className="perfil-lbl">{t('perfil_newsletter_nome')}</label>
              <p className="perfil-sub perfil-sub--item">{t('perfil_newsletter_sub')}</p>
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
            {t('perfil_newsletter_legal1')}<br />
            {t('perfil_newsletter_legal2')}{' '}
            {/* Aba nova, e não navegação. Esta tela tem um botão Salvar, e quem
                está mexendo nos interruptores ainda não salvou: sair daqui para
                ler a Política jogava fora o que a pessoa acabou de mudar. Ler o
                documento é consulta, não é ir embora. */}
            <a href="/privacidade" target="_blank" rel="noopener noreferrer"
               className="perfil-link">{t('perfil_politica_privacidade')}</a>.
          </p>
        </section>

        <div className="perfil-salvar-barra">
          <button className="perfil-salvar" onClick={salvar} disabled={salvando}>
            {salvando ? t('comum_salvando') : t('perfil_salvar_alteracoes')}
          </button>
        </div>

        {/* SESSÕES E DISPOSITIVOS */}
        <section className="perfil-sec" id="sec-seg">
          <h2 className="perfil-h2">
            {t('perfil_sessoes')}
            <button className="perfil-ajuda" onClick={() => setModalAjuda(true)} title={t('comum_ajuda')} aria-label={t('comum_ajuda')}>?</button>
          </h2>
          <p className="perfil-sub" style={{ marginTop: 0, marginBottom: 18 }}>
            {t('perfil_disp_sub')}
          </p>

          {(() => {
            const plugins = dispositivos.filter(d => (d.tipo || 'plugin') !== 'web');
            const webs = dispositivos.filter(d => d.tipo === 'web');
            const grupo = (titulo, lista, max) => (
              <div className="disp-grupo">
                <div className="disp-grupo-tit">{titulo} <span className="disp-contagem">{lista.length}/{max}</span></div>
                {lista.length === 0 ? (
                  <p className="perfil-sub" style={{ marginTop: 0 }}>{t('perfil_nenhum_disp')}</p>
                ) : (
                  <div className="disp-lista">
                    {lista.map(d => (
                      <div key={d.id} className="disp-item">
                        <div>
                          <div className="disp-nome">
                            {d.nome_pc || t('perfil_dispositivo')}
                            {d.ativo_agora && <span className="disp-ativo">{t('perfil_em_uso')}</span>}
                          </div>
                          <div className="disp-sub">
                            {t('perfil_ultimo_acesso')} {d.ultimo_acesso ? new Date(d.ultimo_acesso).toLocaleString(localeDeIdioma(idioma)) : '—'}
                          </div>
                        </div>
                        <button className="disp-remover" onClick={() => tirarDispositivo(d.id)}>{t('comum_remover')}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
            return (
              <>
                {grupo('Plugin (SketchUp)', plugins, 2)}
                {grupo(t('perfil_versao_web'), webs, 3)}
              </>
            );
          })()}
        </section>

        {/* DELETAR CONTA */}
        <section className="perfil-sec perfil-perigo" id="sec-perigo">
          <h2 className="perfil-h2">{t('perfil_deletar_conta')}</h2>
          {ehPago ? (
            <p className="perfil-sub">
              {t('perfil_pago_nao_deletar')}
            </p>
          ) : (
            <>
              <p className="perfil-sub">{t('perfil_deletar_aviso')}</p>
              <button className="perfil-btn-deletar" onClick={() => setModalDeletar(true)}>
                {t('perfil_deletar_minha_conta')}
              </button>
            </>
          )}
        </section>
        </div>
        </div>
      </div>

      {modalDeletar && (
        <div className="foto-overlay" onClick={() => setModalDeletar(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">{t('perfil_deletar_titulo')}</div>
            <p className="perfil-sub" style={{ marginBottom: 18 }}>
              {t('perfil_deletar_modal_p')}
            </p>
            <div className="foto-botoes">
              <button className="foto-btn-outra" onClick={() => setModalDeletar(false)}>{t('comum_cancelar')}</button>
              <button className="perfil-btn-deletar" style={{ flex: 1 }} onClick={confirmarDeletar} disabled={deletando}>
                {deletando ? t('perfil_deletando') : t('perfil_sim_deletar')}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalAjuda && (
        <div className="foto-overlay" onClick={() => setModalAjuda(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
            <div className="foto-titulo">{t('perfil_problemas_comuns')}</div>

            <div className="ajuda-bloco">
              <div className="ajuda-tit">{t('perfil_seguranca')}</div>
              <p className="ajuda-txt">
                {t('perfil_ajuda_seg')}
              </p>
            </div>

            <div className="ajuda-bloco">
              <div className="ajuda-tit">{t('perfil_num_usuarios')}</div>
              <p className="ajuda-txt">
                {t('perfil_ajuda_num1')}{' '}
                <a href="/teams" className="perfil-link">{t('perfil_conheca_planos_equipe')}</a> {t('perfil_ajuda_num2')}
              </p>
            </div>

            <p className="ajuda-txt" style={{ marginTop: 4 }}>
              {t('perfil_ajuda_final1')} <strong>{t('perfil_ajuda_final_pc')}</strong> {t('perfil_ajuda_final_e')} <strong>{t('perfil_ajuda_final_web')}</strong>{t('perfil_ajuda_final2')}
            </p>

            <div className="foto-cancelar" onClick={() => setModalAjuda(false)} style={{ marginTop: 16 }}>{t('fechar')}</div>
          </div>
        </div>
      )}

      {modalFoto && (
        <div className="foto-overlay" onClick={() => setModalFoto(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">{t('perfil_foto_titulo')}</div>
            <div className="foto-orient">{t('perfil_foto_enquadrar')}</div>
            <div className="foto-crop" onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd}>
              <canvas ref={canvasRef} width={260} height={260} style={{ display: 'block' }} />
            </div>
            <div className="foto-zoom-row">
              <span>−</span>
              <input type="range" min="1" max="3" step="0.01" defaultValue="1" onChange={aoZoom} style={{ flex: 1 }} />
              <span>+</span>
            </div>
            <div className="foto-botoes">
              <button className="foto-btn-outra" onClick={abrirSeletorFoto}>{t('perfil_escolher_outra')}</button>
              <button className="foto-btn-salvar" onClick={salvarFotoRecortada} disabled={salvandoFoto}>
                {salvandoFoto ? t('comum_salvando') : t('comum_salvar')}
              </button>
            </div>
            <div className="foto-cancelar" onClick={() => setModalFoto(false)}>{t('comum_cancelar')}</div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
