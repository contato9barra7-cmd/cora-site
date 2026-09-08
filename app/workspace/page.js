'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import DropdownCora from '../../components/DropdownCora';
import Confirma from '../../components/Confirma';
import { useIdioma, localeDeIdioma } from '../../lib/i18n';
import { lerConta, lerEquipe, convidarMembro, removerMembro, atribuirAMim, dispositivosDoMembro, nomearEquipe, reenviarConvite, salvarFotoEquipe, reativarAssento, abrirPortal, moverCredito } from '../../lib/auth';

const NOME_PLANO = { pro: 'Pro', studio: 'Studio' };

function GrupoDisp({ titulo, lista, max, t, locale }) {
  return (
    <div className="disp-grupo">
      <div className="disp-grupo-tit">{titulo} <span className="disp-contagem">{lista.length}/{max}</span></div>
      {lista.length === 0 ? (
        <p className="ws-obs" style={{ marginTop: 0 }}>{t('ws_nenhum_disp')}</p>
      ) : (
        <div className="disp-lista">
          {lista.map((d) => (
            <div key={d.id} className="disp-item">
              <div>
                <div className="disp-nome">
                  {d.nome_pc || t('ws_dispositivo')}
                  {d.ativo_agora && <span className="disp-ativo">{t('ws_em_uso')}</span>}
                </div>
                <div className="disp-sub">{t('ws_ultimo_acesso')} {d.ultimo_acesso ? new Date(d.ultimo_acesso).toLocaleString(locale) : '—'}</div>
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
  const { t, idioma } = useIdioma();
  const locale = localeDeIdioma(idioma);
  const [carregando, setCarregando] = useState(true);
  const [equipe, setEquipe] = useState(null);
  const [membros, setMembros] = useState([]);
  const [email, setEmail] = useState('');
  const [emailsSlot, setEmailsSlot] = useState({});
  const [errosSlot, setErrosSlot] = useState({});
  const [convidandoSlot, setConvidandoSlot] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [convidando, setConvidando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [dispositivos, setDispositivos] = useState({});
  const [meuEmail, setMeuEmail] = useState('');
  const [nomeEquipe, setNomeEquipe] = useState('');
  const [abrindoPortal, setAbrindoPortal] = useState(false);
  const [mover, setMover] = useState({ para: '', quanto: '', erro: '', ok: '' });
  const [movendo, setMovendo] = useState(false);
  const [confirmaMover, setConfirmaMover] = useState(null);
  const [cobrancaEmDia, setCobrancaEmDia] = useState(true);
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
      setMeuEmail((c.email || '').toLowerCase());
      const dados = await lerEquipe();
      setEquipe(dados.equipe);
      setCobrancaEmDia(dados.cobranca_em_dia !== false);
      setMembros(dados.membros || []);
      if (dados.equipe) { setNomeEquipe(dados.equipe.nome || ''); setFoto(dados.equipe.foto || ''); }
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  // Recarrega quando a aba volta ao foco: se um convidado aceitou enquanto o
  // dono estava noutra aba, o status "pendente → ativo" aparece sem F5.
  useEffect(() => {
    function aoFocar() { if (document.visibilityState === 'visible') carregar(); }
    document.addEventListener('visibilitychange', aoFocar);
    window.addEventListener('focus', aoFocar);
    return () => {
      document.removeEventListener('visibilitychange', aoFocar);
      window.removeEventListener('focus', aoFocar);
    };
    /* eslint-disable-next-line */
  }, []);

  async function salvarNome() {
    setSalvandoNome(true); setErro(''); setAvisoNome('');
    try {
      await nomearEquipe(nomeEquipe);
      setAvisoNome(t('ws_salvo'));
      setTimeout(() => setAvisoNome(''), 4000);
    } catch (e) { setErro(e.message); }
    finally { setSalvandoNome(false); }
  }

  async function convidar() {
    setErro(''); setAviso('');
    if (!email.includes('@')) { setErro(t('ws_email_invalido')); return; }
    setConvidando(true);
    try {
      await convidarMembro(email);
      setAviso(t('ws_convite_enviado_para') + ' ' + email);
      setEmail('');
      await carregar();
    } catch (e) { setErro(e.message); }
    finally { setConvidando(false); }
  }

  /* O ERRO DO CONVITE FICA COLADO NO CAMPO, e não num cartão acima da lista
     inteira: numa equipe de dez assentos a pessoa apertava um botão embaixo e
     a resposta aparecia fora da tela. Erro se lê onde se conserta.

     E o "convite enviado" saiu: o assento vira pendente na hora, debaixo do
     dedo de quem clicou, e essa é a confirmação. Dizer a mesma coisa duas
     vezes ensina a ignorar as duas. */
  async function convidarSlot(idx) {
    setErro('');
    const em = (emailsSlot[idx] || '').trim();
    const poeErro = (m) => setErrosSlot((s) => ({ ...s, [idx]: m }));
    poeErro('');
    if (!em.includes('@')) { poeErro(t('ws_email_invalido')); return; }
    setConvidandoSlot(idx);
    try {
      /* CONVIDAR A SI MESMO É ATRIBUIR, e quem decide isso é o e-mail digitado,
         não o botão que foi apertado. Sem esta linha o dono recebia um convite
         por e-mail para entrar na própria equipe e o assento ficava pendente
         em vez de ativo. O servidor também trata esse caso, para quem chega
         por outro caminho, e as duas guardas são de propósito: esta poupa a
         viagem, a de lá é a que vale. */
      if (meuEmail && em.toLowerCase() === meuEmail) await atribuirAMim();
      else await convidarMembro(em);
      setEmailsSlot((s) => { const n = { ...s }; delete n[idx]; return n; });
      await carregar();
    } catch (e) { poeErro(e.message); }
    finally { setConvidandoSlot(null); }
  }

  /* MOVER CRÉDITO de um assento para outro. O que se move é a cota DESTE
     ciclo, e não um saldo guardado: no próximo reset todo mundo volta à cota
     do plano, e a tela diz isso em vez de deixar a pessoa descobrir sozinha.
     Quem confere o resto (dono, mesma equipe, assentos ativos, e o piso do que
     já foi gasto) é o servidor. */
  /* Quem pode RECEBER: assento ativo, com plano, e nao a propria pessoa.
     A mesma lista serve ao dropdown e a checagem, para as duas nunca
     discordarem sobre quem esta na conversa. */
  function podemReceber(m) {
    return membros.filter((o) => o.id !== m.id && o.status === 'ativo' && o.creditos_total != null);
  }

  /* A CONFIRMACAO EXISTE PORQUE ISTO MEXE EM CREDITO PAGO, e nao da para
     desfazer com um clique: para voltar atras o dono tem que mover de novo, na
     direcao contraria, e no meio disso a pessoa pode ja ter gastado. A frase
     diz os dois nomes e o numero, que e o que se confere antes de dizer sim. */
  function pedirConfirmacao(m, cede) {
    const quanto = parseInt(String(mover.quanto).replace(/\D/g, ''), 10);
    if (!mover.para) { setMover((x) => ({ ...x, erro: t('ws_mov_escolha') })); return; }
    if (!quanto) { setMover((x) => ({ ...x, erro: t('ws_mov_quanto') })); return; }
    if (quanto > cede) { setMover((x) => ({ ...x, erro: t('ws_mov_so_tem') + ' ' + cede.toLocaleString(locale) })); return; }
    const destino = membros.find((o) => String(o.id) === String(mover.para));
    setConfirmaMover({
      de: m.id,
      quanto,
      texto: t('ws_mov_conf_a') + ' ' + quanto.toLocaleString(locale) + ' '
        + t('ws_mov_conf_b') + ' ' + (m.nome || m.email) + ' '
        + t('ws_mov_conf_c') + ' ' + (destino ? (destino.nome || destino.email) : '') + '.',
    });
  }

  async function moverAgora(deId, quanto) {
    setConfirmaMover(null);
    setMovendo(true);
    setMover((x) => ({ ...x, erro: '', ok: '' }));
    try {
      await moverCredito(deId, parseInt(mover.para, 10), quanto);
      await carregar();
      setMover({ para: '', quanto: '', erro: '', ok: t('ws_mov_pronto') });
    } catch (e) {
      setMover((x) => ({ ...x, erro: e.message }));
    } finally { setMovendo(false); }
  }

  async function abrirAssentos() {
    setErro('');
    const guia = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    setAbrindoPortal(true);
    try { await abrirPortal(guia); }
    catch (e) { setErro(e.message); }
    finally { setAbrindoPortal(false); }
  }

  const [confRemover, setConfRemover] = useState(null);

  async function remover(id) {
    setConfRemover(null);
    setErro('');
    try { await removerMembro(id); setExpandido(null); await carregar(); }
    catch (e) { setErro(e.message); }
  }

  // Assento suspenso por excedente: devolve o acesso. Sem assento livre o
  // servidor recusa, e a saida e liberar um antes — o proprio painel ja tem o
  // botao de remover, entao a mensagem manda para la em vez de inventar um
  // seletor de troca aqui dentro.
  async function reativar(id) {
    setErro(''); setAviso('');
    try {
      await reativarAssento(id);
      setExpandido(null);
      await carregar();
    } catch (e) {
      setErro(e.precisaTroca ? t('ws_reativar_sem_vaga') : e.message);
    }
  }

  async function reenviar(id) {
    setErro(''); setAviso('');
    try { await reenviarConvite(id); setAviso(t('ws_convite_reenviado')); }
    catch (e) { setErro(e.message); }
  }

  /* A função `atribuir` saiu junto com o botão preto que a chamava. Quem
     atribui agora é o `convidarSlot`, quando o e-mail digitado é o seu: um
     caminho só, e o botão que executa é sempre o mesmo. */

  async function toggleGerenciar(m) {
    if (expandido === m.id) { setExpandido(null); return; }
    setExpandido(m.id);
    setMover({ para: '', quanto: '', erro: '', ok: '' });
    /* ROLA O ASSENTO PARA A VISTA. O detalhe abre com uns 340px e cresce para
       BAIXO: clicando num assento que estava no pé da tela, tudo o que abriu
       nasce fora dela, e a única coisa que muda à vista é o rótulo do botão.
       Parece que o clique não fez nada. */
    setTimeout(() => {
      const el = document.getElementById('assento-' + m.id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
    if (!dispositivos[m.id]) {
      try {
        const lista = await dispositivosDoMembro(m.id);
        setDispositivos((d) => ({ ...d, [m.id]: lista }));
      } catch (e) {
        setDispositivos((d) => ({ ...d, [m.id]: [] }));
      }
    }
  }

  if (carregando) return <div className="admin-wrap"><p>{t('comum_carregando')}</p></div>;

  if (!equipe) {
    return (
      <div className="admin-wrap">
        <div className="conta-cabeca">
          <div className="conta-cabeca__foto">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
                 strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3.2" /><circle cx="17" cy="9" r="2.4" />
              <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 13.6a4.4 4.4 0 0 1 4.5 4.4" />
            </svg>
          </div>
          <div className="conta-cabeca__txt">
            <p className="eyebrow">{t('nav_equipe')}</p>
            <h1 className="conta-cabeca__nome">{t('ws_sua_equipe')}</h1>
            {/* Sem repetir a frase do cartao logo abaixo: duas vezes a mesma
                promessa em trinta pixels de distancia. */}
            <p className="conta-cabeca__email">{t('ws_nenhuma_ainda')}</p>
          </div>
        </div>
        <div className="conta-card">
          <h2 className="conta-h2">{t('ws_sem_equipe_h')}</h2>
          <p className="conta-p">{t('ws_sem_equipe_p')}</p>
          <button className="as-btn-cta" onClick={() => router.push('/teams')}>
            {t('ws_criar_equipe')}
          </button>
        </div>
      </div>
    );
  }

  // Depois de um downgrade, ocupados > assentos e a conta fica negativa —
  // o badge estampava "-2 assentos livres". Zero é o piso em toda a tela.
  const livres = Math.max(0, equipe.assentos - membros.length);
  const donoNaEquipe = membros.some((m) => m.eh_dono);
  const slotsVazios = Array.from({ length: livres });

  return (
    <div className="admin-wrap">
      {/* A mesma cabeca de Minha conta, Assinatura e Admin: a foto da equipe no
          lugar da foto da pessoa, o rotulo em cima e a linha de apoio dizendo
          quantos assentos estao ocupados. Era um <h1> solto, e esta foi a
          ultima tela do produto na casca antiga. */}
      <div className="conta-cabeca">
        <div className="conta-cabeca__foto"
             style={foto ? { backgroundImage: `url(${foto})`, color: 'transparent' } : undefined}>
          {foto ? '' : (nomeEquipe || equipe.nome || 'E').charAt(0).toUpperCase()}
        </div>
        <div className="conta-cabeca__txt">
          <p className="eyebrow">{t('nav_equipe')}</p>
          <h1 className="conta-cabeca__nome">{nomeEquipe || equipe.nome || t('ws_sua_equipe')}</h1>
          <p className="conta-cabeca__email">
            {NOME_PLANO[equipe.plano] || equipe.plano} · {membros.length} {t('ws_de')}{' '}
            {equipe.assentos} {t('ws_assentos_ocupados')}
          </p>
        </div>
      </div>

      {/* Verde, e nao roxo: o roxo saiu da marca em 06/09/2026, e cor que ficou
          para tras e a que mais denuncia uma tela que nao foi revisada. E aqui
          ele nem era decorativo, era o sinal de "deu certo". */}
      {criada && (
        <div className="conta-card ws-criada">
          <h2 className="conta-h2">{t('ws_criada_h')}</h2>
          <p className="conta-p">{t('ws_criada_p')}</p>
        </div>
      )}

      {/* O AVISO DO DOWNLOAD SAIU. Ele ocupava um cartao inteiro no topo da
          tela para dizer onde fica um botao que esta no menu, sempre visivel,
          a dois centimetros dali. Um aviso permanente sobre navegacao e sinal
          de que a navegacao nao esta clara, e nao a correcao dela. */}

      {/* ── IDENTIDADE ──
          A MESMA GRADE DE MINHA CONTA: rótulo à esquerda, campo à direita, uma
          linha por coisa. Era um flex com a foto de um lado e um bloco de texto
          do outro, e por isso nada alinhava com nada: a foto flutuava acima do
          campo e a frase de apoio ficava pendurada no meio da altura. */}
      <div className="conta-card ws-identidade">
        <h2 className="perfil-h2">{t('ws_identidade')}</h2>
        <p className="perfil-sub">{t('ws_nome_foto_hint')}</p>

        <div className="perfil-linha">
          <label className="perfil-lbl">{t('ws_foto_lbl')}</label>
          <div className="perfil-avatar-area">
            <div className="perfil-avatar-box">
            <span
              className="perfil-avatar"
              style={foto ? { backgroundImage: `url(${foto})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}
            >
              {foto ? '' : (nomeEquipe || 'E').charAt(0).toUpperCase()}
            </span>
            <button className="perfil-avatar-editar" onClick={abrirSeletorFoto} title={t('ws_trocar_foto')} aria-label={t('ws_trocar_foto')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
            </button>
            {foto && (
              <button className="perfil-avatar-x" onClick={removerFotoEquipe} title={t('ws_remover_foto')} aria-label={t('ws_remover_foto')}>×</button>
            )}
              <input ref={inputFotoRef} type="file" accept="image/*" onChange={aoSelecionarFoto} style={{ display: 'none' }} />
            </div>
            {/* A regra do arquivo fica onde a pessoa ESCOLHE, e não só dentro do
                recorte: quem descobre o limite depois de escolher já perdeu a
                viagem. É o mesmo texto de Minha conta. */}
            <p className="perfil-foto-dica">{t('ws_foto_orient')}</p>
          </div>
        </div>

        <div className="perfil-linha">
          <label className="perfil-lbl" htmlFor="nome-equipe">{t('ws_nome_lbl')}</label>
          <div>
            <div className="ws-linha-input">
              <input className="perfil-input" id="nome-equipe" value={nomeEquipe} onChange={(e) => setNomeEquipe(e.target.value)} placeholder={t('ws_nome_ph')} maxLength={60} />
              <button className="ws-btn" onClick={salvarNome} disabled={salvandoNome}>
                {salvandoNome ? t('comum_salvando') : t('ws_salvar')}
              </button>
            </div>
            {avisoNome && <div className="conta-aviso" style={{ marginTop: 12 }}>{avisoNome}</div>}
          </div>
        </div>
      </div>

      {modalFoto && (
        <div className="foto-overlay" onClick={() => setModalFoto(false)}>
          <div className="foto-modal" onClick={(e) => e.stopPropagation()}>
            <div className="foto-titulo">{t('ws_foto_titulo')}</div>
            <div className="foto-orient">{t('ws_foto_orient')}</div>
            <div className="foto-crop" onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd}>
              <canvas ref={canvasRef} width={260} height={260} style={{ display: 'block' }} />
            </div>
            <div className="foto-zoom-row">
              <span>−</span>
              <input type="range" min="1" max="3" step="0.01" defaultValue="1" onChange={aoZoom} style={{ flex: 1 }} />
              <span>+</span>
            </div>
            <div className="foto-botoes">
              <button className="foto-btn-outra" onClick={abrirSeletorFoto}>{t('ws_escolher_outra')}</button>
              <button className="foto-btn-salvar" onClick={salvarFotoRecortada} disabled={salvandoFoto}>
                {salvandoFoto ? t('comum_salvando') : t('ws_salvar')}
              </button>
            </div>
            <div className="foto-cancelar" onClick={() => setModalFoto(false)}>{t('comum_cancelar')}</div>
          </div>
        </div>
      )}

      {/* O CARTAO DE RESUMO SAIU. Ele repetia o plano e os assentos, que agora
          estao na linha de apoio do cabecalho, e a contagem de livres, que a
          lista de assentos ja mostra em forma: cada assento vazio e uma linha
          com um campo esperando um e-mail.

          O que ele tinha de proprio, e nao existia em outro lugar, era o
          espaco do erro e do aviso. Isso fica, sozinho, e so quando ha o que
          dizer: um cartao vazio no meio da tela todos os dias para servir dois
          dias por ano e um cartao que ensina a ser ignorado. */}
      {(erro || aviso) && (
        <div className="conta-card">
          {erro && <p className="ws-erro">{erro}</p>}
          {aviso && <p className="ws-aviso-txt">{aviso}</p>}
        </div>
      )}

      {/* ── A COBRANÇA NÃO PASSOU ──
          O servidor já recusava convite com "regularize o pagamento", mas a
          tela só contava isso DEPOIS de a pessoa escrever um e-mail e apertar
          Convidar. Quem paga merece saber antes, e não como resposta a uma
          tentativa. Fica no topo, acima dos assentos, porque afeta a lista
          inteira e não um assento. */}
      {!cobrancaEmDia && (
        <div className="conta-card ws-cobranca">
          <div className="ws-cobranca-txt">
            <b>{t('ws_cobranca_h')}</b>
            {t('ws_cobranca_p')}
          </div>
          <button className="ws-lotado-bt" onClick={abrirAssentos} disabled={abrindoPortal}>
            {abrindoPortal ? t('assinatura_abrindo') : t('ws_cobranca_bt')}
          </button>
        </div>
      )}

      {/* Assentos */}
      <div className="conta-card">
        <h2 className="conta-h2">{t('teams_assentos_tit')}</h2>

        {membros.map((m) => (
          <div key={m.id} id={'assento-' + m.id} className="ws-slot">
            <div className="ws-slot-linha">
              {/* A FOTO DE QUEM JÁ TEM. A lista mostrava a inicial do e-mail
                  para todo mundo, mesmo para quem tinha foto no perfil. Numa
                  equipe onde as pessoas se conhecem, reconhecer pela cara é
                  mais rápido do que ler cinco endereços parecidos.
                  Quem não tem foto continua com a inicial, e quem ainda não
                  aceitou o convite continua com o envelope: ali não há pessoa
                  para mostrar. */}
              <span
                className={'ws-av' + (m.status === 'convidado' ? ' ws-av--pend' : '')}
                style={m.status !== 'convidado' && m.foto_url
                  ? { backgroundImage: `url(${m.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' }
                  : undefined}
              >
                {m.status === 'convidado'
                  ? (
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                         stroke="currentColor" strokeWidth="1.5">
                      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/>
                      <path d="M3 5.5l7 5 7-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )
                  : m.foto_url ? '' : (m.nome || m.email || '?')[0].toUpperCase()}
              </span>
              {/* NOME EM CIMA, E-MAIL EMBAIXO, quando a pessoa já tem nome.
                  A lista mostrava só endereços, e numa empresa eles são todos
                  parecidos: nome.sobrenome@aempresa.com.br, cinco vezes. Quem
                  ainda não aceitou o convite não tem conta, e aí o e-mail é
                  tudo que existe: ele fica sozinho, na linha de cima. */}
              <div className="ws-quem">
                <div className="disp-nome">
                  {m.nome || m.email}
                  {m.eh_dono && <span className="ws-tag ws-tag-dono">{t('ws_dono')}</span>}
                  {m.status === 'convidado' && <span className="ws-tag ws-tag-pend">{t('ws_convite_pendente')}</span>}
                  {m.status === 'ativo' && !m.eh_dono && <span className="ws-tag ws-tag-ativo">{t('ws_ativo')}</span>}
                  {m.status === 'suspenso' && <span className="ws-tag ws-tag-susp">{t('ws_suspenso')}</span>}
                </div>
                {m.nome && <div className="ws-quem-email">{m.email}</div>}
              </div>
              <div className="ws-slot-dir">
                {/* O crédito era um anel de 34px com os dois números escritos
                    dentro dele, em letra de 8px. Virou o mesmo desenho do
                    cartão de crédito do Início: número que se lê, e a barra
                    embaixo dizendo quanto sobrou. */}
                {m.status === 'ativo' && m.creditos_total != null && (() => {
                  const rest = Math.max(0, (m.creditos_total || 0) - (m.creditos_usados || 0));
                  const pct = m.creditos_total > 0 ? Math.round((rest / m.creditos_total) * 100) : 0;
                  return (
                    <div className="ws-cred">
                      <div className="ws-cred-num">
                        {rest.toLocaleString(locale)}{' '}
                        <span>{t('ws_de')} {(m.creditos_total || 0).toLocaleString(locale)}</span>
                      </div>
                      <div className="ws-cred-barra">
                        <i className={pct <= 10 ? 'baixo' : undefined} style={{ width: pct + '%' }} />
                      </div>
                    </div>
                  );
                })()}
                <button className="ws-gerenciar" onClick={() => toggleGerenciar(m)}>
                  {expandido === m.id ? t('ws_fechar') : t('ws_gerenciar')}
                </button>
              </div>
            </div>

            {expandido === m.id && (
              <div className="ws-detalhe">
                {m.status === 'convidado' ? (
                  <p className="ws-obs" style={{ marginTop: 0 }}>{t('ws_convite_nao_aceito')}</p>
                ) : m.status === 'suspenso' ? (
                  <p className="ws-obs" style={{ marginTop: 0 }}>{t('ws_suspenso_obs')}</p>
                ) : (
                  <>
                    <div className="ws-disp-tit">{t('ws_disp_tit')}</div>
                    {!dispositivos[m.id] ? (
                      <p className="ws-obs" style={{ marginTop: 0 }}>{t('comum_carregando')}</p>
                    ) : (
                      <>
                        <GrupoDisp titulo={t('ws_disp_plugin')} lista={(dispositivos[m.id] || []).filter((d) => (d.tipo || 'plugin') !== 'web')} max={2} t={t} locale={locale} />
                        <GrupoDisp titulo={t('ws_disp_web')} lista={(dispositivos[m.id] || []).filter((d) => d.tipo === 'web')} max={3} t={t} locale={locale} />
                      </>
                    )}
                  </>
                )}

                {/* ── MOVER CRÉDITO ──
                    O plano dá a mesma cota para todo mundo, e a realidade não
                    é essa: uma pessoa passa o mês sem abrir o plugin enquanto
                    outra trava no dia 20. Antes, a única saída era comprar
                    recarga com o crédito da primeira parado ao lado.

                    O QUE SE MOVE É A COTA DESTE CICLO. No próximo reset todo
                    mundo volta à cota do plano, e a frase abaixo diz isso: sem
                    ela, o dono acharia que arrumou o mês que vem também.

                    Só aparece entre assentos ativos, e só se houver outro para
                    receber. Assento vazio guarda saldo para quem chegar, e
                    convite pendente ainda não tem conta onde escrever. */}
                {m.status === 'ativo' && m.creditos_total != null
                  && podemReceber(m).length > 0 && (() => {
                  /* O TETO É O QUE ESTA PESSOA TEM PARA CEDER, e não a cota
                     dela: o que já foi gasto não se move. O campo não deixa
                     passar disso, e o rótulo diz o número em vez de esperar a
                     pessoa errar para contar. Um erro do servidor aqui seria
                     um erro que a tela sabia evitar. */
                  const cede = Math.max(0, (m.creditos_total || 0) - (m.creditos_usados || 0));
                  return (
                  <div className="ws-mover">
                    <div className="ws-disp-tit">{t('ws_mov_tit')}</div>
                    <div className="ws-mover-linha">
                      <input
                        className="ws-input ws-mover-qtd"
                        inputMode="numeric"
                        placeholder={t('ws_mov_ph')}
                        value={mover.quanto}
                        onChange={(e) => {
                          // Só dígito entra, e o teto corta na hora de digitar.
                          const n = e.target.value.replace(/\D/g, '');
                          const val = n === '' ? '' : String(Math.min(parseInt(n, 10), cede));
                          setMover((x) => ({ ...x, quanto: val, erro: '', ok: '' }));
                        }}
                      />
                      <div className="ws-mover-quem">
                        <DropdownCora
                          valor={mover.para}
                          onEscolher={(v) => setMover((x) => ({ ...x, para: v, erro: '', ok: '' }))}
                          opcoes={[{ v: '', n: t('ws_mov_para') }].concat(
                            podemReceber(m).map((o) => ({ v: String(o.id), n: o.nome || o.email }))
                          )}
                        />
                      </div>
                      <button className="ws-btn-sec" onClick={() => pedirConfirmacao(m, cede)} disabled={movendo}>
                        {movendo ? t('comum_salvando') : t('ws_mov_bt')}
                      </button>
                    </div>
                    <p className="ws-obs" style={{ marginTop: 8 }}>
                      {t('ws_mov_tem')} {cede.toLocaleString(locale)}. {t('ws_mov_obs')}
                    </p>
                    {mover.erro && <p className="ws-erro" style={{ marginTop: 6 }}>{mover.erro}</p>}
                    {mover.ok && <p className="ws-aviso-txt" style={{ marginTop: 6 }}>{mover.ok}</p>}
                  </div>
                  );
                })()}

                <div className="ws-acoes">
                  {!m.eh_dono && m.status === 'convidado' && (
                    <button className="ws-btn-sec" onClick={() => reenviar(m.id)}>{t('ws_reenviar_acesso')}</button>
                  )}
                  {m.status === 'suspenso' && (
                    <button className="ws-btn-sec" onClick={() => reativar(m.id)}>{t('ws_reativar_acesso')}</button>
                  )}
                  {m.eh_dono ? (
                    <button className="ws-remover" onClick={() => setConfRemover(m.id)}>{t('ws_liberar_assento')}</button>
                  ) : (
                    <button className="ws-remover" onClick={() => setConfRemover(m.id)}>{t('ws_remover_acesso')}</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {slotsVazios.map((_, i) => (
          <div key={'vazio-' + i} className="ws-slot ws-slot-vazio">
            <div className="ws-slot-vazio-topo">
              <span className="ws-av ws-av--livre">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                     stroke="currentColor" strokeWidth="1.6">
                  <path d="M10 5v10M5 10h10" strokeLinecap="round"/>
                </svg>
              </span>
              <div className="ws-linha-input" style={{ flex: 1 }}>
                <input
                  className="ws-input"
                  name={'convite-slot-' + i}
                  id={'convite-slot-' + i}
                  autoComplete="off"
                  value={emailsSlot[i] || ''}
                  onChange={(e) => {
                    setEmailsSlot((s) => ({ ...s, [i]: e.target.value }));
                    if (errosSlot[i]) setErrosSlot((s) => ({ ...s, [i]: '' }));
                  }}
                  placeholder="email@da-pessoa.com"
                  onKeyDown={(e) => { if (e.key === 'Enter') convidarSlot(i); }}
                />
                {/* ATRIBUIR A SI É CONVIDAR VOCÊ MESMO, e aqui os dois caminhos
                    viram um só: o atalho escreve o seu e-mail no campo e o
                    Convidar faz o resto. A pessoa vê o que vai acontecer antes
                    de acontecer, e dá para desistir.
                    Ele some no celular: ali o campo já ocupa a linha inteira, e
                    três controles lado a lado não cabem. */}
                {!donoNaEquipe && (
                  <button className="ws-sou-eu" onClick={() => {
                    setEmailsSlot((s) => ({ ...s, [i]: meuEmail }));
                    setErrosSlot((s) => ({ ...s, [i]: '' }));
                  }}>
                    <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
                         stroke="currentColor" strokeWidth="1.6">
                      <circle cx="10" cy="7" r="3.2" />
                      <path d="M4 16.5c.9-2.7 3.2-4.2 6-4.2s5.1 1.5 6 4.2" strokeLinecap="round" />
                    </svg>
                    {t('ws_sou_eu')}
                  </button>
                )}
                <button className="ws-btn" onClick={() => convidarSlot(i)} disabled={convidandoSlot === i}>
                  {convidandoSlot === i ? t('ws_enviando') : t('ws_convidar')}
                </button>
              </div>
            </div>
            {errosSlot[i] && <p className="ws-erro ws-erro-campo">{errosSlot[i]}</p>}
            {/* A frase de aviso aparece UMA vez, no primeiro assento livre.
                Repetida em cada um, ela deixava de ser aviso e virava
                padronagem: a pessoa lê a primeira e para de ver as outras. */}
            {i === 0 && (
              <div className="ws-slot-atribuir">
                <span className="ws-vazio-hint">
                  {t('ws_assento_livre_hint')}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* ── QUANDO NÃO SOBRA ASSENTO ──
            Sem esta linha a lista simplesmente terminava. A pessoa que precisa
            de mais um lugar ficava numa tela sobre assentos que não dizia como
            ter outro, e a resposta mora em Assinatura, que é onde ninguém vai
            procurar estando aqui.
            Ela aparece só quando lotou: um convite para gastar mais dinheiro
            todos os dias, com assento sobrando, é outra coisa. */}
        {livres === 0 && (
          <div className="ws-lotado">
            <div className="ws-lotado-txt">
              <b>{t('ws_lotado_h')}</b>
              {t('ws_lotado_p')}
            </div>
            {/* Vai DIRETO para o portal do Stripe, e não para Assinatura. Quem
                está aqui já sabe o que quer, e mandar para uma tela que só tem
                outro botão para o mesmo lugar é cobrar dois cliques pela mesma
                viagem. A guia abre dentro do clique: aberta depois do await,
                o navegador trata como pop-up e bloqueia. */}
            <button className="ws-lotado-bt" onClick={abrirAssentos} disabled={abrindoPortal}>
              {abrindoPortal ? t('assinatura_abrindo') : t('ws_lotado_bt')}
            </button>
          </div>
        )}
      </div>

      {/* A confirmação mora aqui, no fim da tela, e não dentro do assento: ela
          é um modal em portal, e o lugar dela no JSX não é o lugar dela na
          tela. Perto do botão, ela viajaria junto com o assento a cada
          recarga da lista. */}
      {confirmaMover && (
        <Confirma
          texto={confirmaMover.texto}
          ok={t('ws_mov_bt')}
          perigo={false}
          aoOk={() => moverAgora(confirmaMover.de, confirmaMover.quanto)}
          aoCancelar={() => setConfirmaMover(null)}
        />
      )}
      {confRemover && (
        <Confirma
          texto={t('ws_conf_remover')}
          ok={t('ws_remover_acesso')}
          aoOk={() => remover(confRemover)}
          aoCancelar={() => setConfRemover(null)}
        />
      )}
    </div>
  );
}

export default function Workspace() {
  const { t } = useIdioma();
  return (
    <AppShell>
      <Suspense fallback={<div className="admin-wrap"><p>{t('comum_carregando')}</p></div>}>
        <WorkspaceConteudo />
      </Suspense>
    </AppShell>
  );
}
