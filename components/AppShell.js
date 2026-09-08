'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { lerConta, sair, aplicarTema, salvarPerfil, atualizarConta, aceitarDocumentosLegais, EVENTO_CREDITOS } from '../lib/auth';
import RodapeLegal from './RodapeLegal';
import PopupCreditos from './PopupCreditos';
import PopupUpgrade from './PopupUpgrade';
import DropdownCora from './DropdownCora';
import { TELAS_ADMIN, usarTelaAdmin } from '../lib/telaAdmin';
import { useIdioma, IDIOMAS, localeDeIdioma } from '../lib/i18n';
import { DOCUMENTOS, maisRecentes } from '../lib/documentos';
import { TextoTermos, TextoPrivacidade } from './TextosLegais';

// Ícones simples em SVG (sem dependência externa)
function rotuloPlano(c, t) {
  if (!c) return '';
  if (c.is_admin) return 'Admin';
  const nomes = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };
  const p = nomes[c.plano] || c.plano;
  if (c.eh_dono_equipe || c.eh_membro_equipe) return `Teams (${p})`;
  return `${t('plano_label')} ${p}`;
}

const Icone = {
  studio: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z" strokeLinejoin="round"/>
      <path d="M12 12l8.5-4.7M12 12v9.5M12 12L3.5 7.3" strokeLinejoin="round"/>
    </svg>
  ),
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  conta: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  equipe: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M9 21v-2a4 4 0 0 1 3-3.87"/>
      <circle cx="9" cy="7" r="3"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
  // A barra lateral, desenhada. A seta aponta para onde o clique leva: para
  // dentro quando vai recolher, para fora quando vai abrir.
  recolher: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="16" rx="2.5"/>
      <path d="M9 4v16" strokeLinecap="round"/>
      <path d="M15.5 9.5L13 12l2.5 2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  expandir: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="18" height="16" rx="2.5"/>
      <path d="M9 4v16" strokeLinecap="round"/>
      <path d="M13 9.5l2.5 2.5L13 14.5" strokeLinecap="round" strokeLinejoin="round"/>
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
  // Qual das tres telas do admin esta aberta. Fora do /admin isto nao e
  // usado, mas o hook precisa rodar sempre: chamar hook dentro de `if` e o
  // jeito mais rapido de quebrar a ordem deles entre um render e outro.
  const telaAdm = usarTelaAdmin();
  const router = useRouter();
  const { t, idioma, trocarIdioma } = useIdioma();
  const [conta, setConta] = useState(null);
  // Quem evita o flash é o <html class="menu-recolhido"> (script do layout.js
  // + regras-espelho no globals.css): o menu nasce fechado antes do React
  // rodar. Então o estado pode começar IGUAL ao servidor (false) e ler o
  // localStorage depois de montar — iniciar direto do localStorage fazia o
  // HTML do SSR divergir do primeiro render do cliente (warning de hidratação
  // em toda carga com o menu fechado). A classe no <html> segura o layout até
  // o efeito rodar; visualmente é a mesma janela que já existia.
  const [recolhido, setRecolhido] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('cora_menu_recolhido') === '1') setRecolhido(true);
  }, []);
  const [menuUser, setMenuUser] = useState(false);
  const [credCardVisivel, setCredCardVisivel] = useState(false);
  // ── A gaveta (só existe até 1024px, ver responsivo.css) ──
  // No desktop a lateral é fixa e este estado nunca muda nada. No tablet e no
  // celular ela desliza por cima: 240px de moldura permanente numa tela de
  // 375px seriam 64% do espaço gasto numa navegação que se usa uma vez por
  // sessão. Só o estado mora aqui; quem decide se ela é gaveta ou coluna é o
  // CSS — assim não há um segundo layout escrito em JavaScript para manter.
  const [gaveta, setGaveta] = useState(false);

  useEffect(() => {
    const c = lerConta();
    setConta(c);
    // busca dados frescos pra ter campos novos (ex: eh_dono_equipe, para a aba Equipe)
    atualizarConta().then((fresca) => {
      if (fresca) setConta(fresca);
      // Tínhamos cache mas a sessão morreu (401 sem cookie): desloga na hora.
      else if (c && typeof window !== 'undefined' && !localStorage.getItem('cora_conta')) setConta(null);
    }).catch(() => {});
    // aplica o tema salvo (da conta ou do navegador)
    if (typeof window !== 'undefined') {
      // (o recolhido tem efeito próprio, acima — o visual pré-React é do <html>)
      const tema = (c && c.tema) || localStorage.getItem('cora_tema') || 'sistema';
      aplicarTema(tema);
    }
  }, [pathname]);

  // Chegou na página de destino: a gaveta já cumpriu o papel dela e sai.
  useEffect(() => { setGaveta(false); }, [pathname]);

  // Enquanto a gaveta está aberta, o que está por baixo não rola. Sem isto, o
  // dedo deslizando sobre o véu leva a página junto — e ao fechar a gaveta a
  // pessoa está num lugar do documento onde nunca pediu para estar.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!gaveta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, [gaveta]);

  // Esc fecha a gaveta — é o gesto esperado de qualquer camada por cima.
  useEffect(() => {
    if (!gaveta) return;
    function aoTeclar(e) { if (e.key === 'Escape') setGaveta(false); }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [gaveta]);

  // Alguém gastou crédito (uma geração no /app)? Atualiza o número, o anel
  // e tudo mais — sem precisar de F5.
  useEffect(() => {
    function onCreditos(e) {
      if (e.detail) setConta(e.detail);
    }
    window.addEventListener(EVENTO_CREDITOS, onCreditos);
    return () => window.removeEventListener(EVENTO_CREDITOS, onCreditos);
  }, []);

  // Sincroniza o idioma da UI com o salvo na conta (segue o usuário entre
  // dispositivos). O localStorage cobre a troca imediata; isto cobre o login.
  useEffect(() => {
    if (conta?.idioma && IDIOMAS.includes(conta.idioma) && conta.idioma !== idioma) {
      trocarIdioma(conta.idioma);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conta?.idioma]);

  function toggleMenu() {
    const novo = !recolhido;
    setRecolhido(novo);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cora_menu_recolhido', novo ? '1' : '0');
      // A classe no <html> é o que o script do layout.js lê na próxima
      // carga — é ela que evita o flash antes do React entrar.
      document.documentElement.classList.toggle('menu-recolhido', novo);
    }
  }

  // troca rápida de tema/idioma direto no menu do avatar
  async function trocarPref(campo, valor) {
    const nova = { ...conta, [campo]: valor };
    setConta(nova);
    if (campo === 'tema') aplicarTema(valor);
    if (campo === 'idioma') trocarIdioma(valor);   // troca a UI ao vivo
    try { await salvarPerfil({ [campo]: valor }); } catch (e) { /* silencioso */ }
  }

  function logout() {
    sair();
    router.push('/');
  }

  // `divisor` separa o TRABALHO (o que a pessoa faz) da CONTA (o que ela
  // administra). Sem isso, tudo vira uma lista indiferenciada.
  //
  // As duas abas de Promptadores saíram daqui em 06/09/2026: o produto passou
  // a ser externo, e ele já tem site próprio. As rotas `/promptadores/[curso]`
  // continuam de pé para quem chegar por link, e o `promptador_cursos` da
  // conta segue valendo logo abaixo, onde ele decide que aluno do curso não
  // leva bloqueio de tela cheia no Cora.
  const TODOS_ITENS = [
    { href: '/conta', rotulo: t('nav_dashboard'), icone: Icone.dashboard, admin: false },
    { href: '/app', rotulo: 'Cora Render', icone: Icone.studio, admin: false },
    { href: '/conta/perfil', rotulo: t('nav_minhaconta'), icone: Icone.conta, admin: false, divisor: true },
    { href: '/workspace', rotulo: t('nav_equipe'), icone: Icone.equipe, admin: false, soDono: true },
    { href: '/assinatura', rotulo: t('nav_assinatura'), icone: Icone.assinatura, admin: false, soPagante: true },
    { href: '/admin', rotulo: 'Admin', icone: Icone.admin, admin: true },
  ];

  /* O menu esconde o que nao se aplica a esta conta. */
  const itens = TODOS_ITENS.filter(i => (!i.admin || (conta && conta.is_admin))
    && (!i.soDono || (conta && conta.eh_dono_equipe))
    && (!i.soPagante || !(conta && conta.eh_membro_equipe)));

  // créditos para o anel do avatar (mostra o quanto RESTA)
  const ilimitado = conta && (conta.creditos_total === -1 || conta.is_admin);
  const total = conta?.creditos_total ?? 0;
  const usados = conta?.creditos_usados ?? 0;
  const pctRestante = ilimitado || total === 0 ? 0 : Math.max(0, Math.min(100, Math.round(((total - usados) / total) * 100)));

  const restantes = Math.max(0, total - usados);
  const acabando  = !ilimitado && total > 0 && pctRestante <= 10;   // usado só p/ cor da barra no menu

  // Card de crédito baixo: aparece quando restarem 1000 créditos ou menos
  // (número fixo, vale para qualquer plano).
  const LIMIAR_CRED_CARD = 1000;
  const credBaixo = !ilimitado && total > 0 && restantes <= LIMIAR_CRED_CARD;

  // Quantos dias até renovar? (só mostra quando faz sentido)
  const dataRenov = conta?.eh_dono_equipe ? conta?.equipe_renova_em : conta?.expira_em;
  const diasRenov = (() => {
    if (!dataRenov) return null;
    const d = Math.ceil((new Date(dataRenov) - new Date()) / 86400000);
    return (d >= 0 && d <= 60) ? d : null;
  })();

  const inicial = (conta?.nome || conta?.email || '?').charAt(0).toUpperCase();

  // Trial: conta free de até 7 dias. Mostra o contador; ao expirar, bloqueia a tela.
  const ehTrial = conta?.eh_trial === true;
  const trialExpirado = conta?.trial_expirado === true;
  const trialDiaAtual = Math.min(7, Math.max(1, 8 - (conta?.trial_dias_restantes ?? 7)));

  // Aluno dos Promptadores (acesso vigente OU vencido): a conta dele existe por
  // causa do curso da 9barra7, não do Cora. O teste vencido não pode trancar a
  // tela inteira — os Promptadores são o que ele veio buscar. Para ele, o
  // bloqueio vira um aviso SÓ dentro do /app: "sem assinatura, conheça o Cora".
  const ehAlunoPromptador = !!(conta && conta.promptador_cursos &&
    Object.values(conta.promptador_cursos).some((c) => c && (c.acesso || c.expirado)));

  // Plano pago vencido / cartão falhou: o servidor marca status != 'ativo'.
  // Bloqueia SÓ o /app (onde se gera); minha conta e assinatura seguem abertas
  // para a pessoa poder renovar. Trial e free não entram aqui (status 'ativo').
  const planoExpirado = !!(conta && !conta.is_admin && !ehTrial
    && conta.status && conta.status !== 'ativo');

  // Quem decide se a tela abre é o SERVIDOR, no campo `pode_gerar`.
  //
  // Esta regra já esteve escrita aqui, no plugin e no /creditos/debitar, com
  // três critérios diferentes — e eles discordavam: inadimplente com recarga
  // válida gerava pelo site e era barrado no plugin, com o servidor debitando
  // numa boa. Agora a resposta vem pronta e a tela só obedece.
  //
  // Ausente (servidor antigo, resposta em cache de antes do deploy) NÃO
  // bloqueia: `!== false` mantém a tela aberta em vez de trancar um pagante por
  // causa de um campo que ainda não chegou.
  const podeGerar = conta?.pode_gerar !== false;

  // Suspenso por excedente de assentos: o dono da equipe reduziu a quantidade e
  // esta pessoa ficou fora do contratado. O bloqueio e o mesmo, a mensagem nao
  // pode ser — "seu plano expirou, renove" e conselho errado para quem nunca
  // assinou nada: quem paga e a empresa dela.
  const suspensoEquipe = conta?.equipe_suspenso === true;

  /* ── OS DOCUMENTOS MUDARAM ──
     Quem decide continua sendo o servidor: `precisa_aceitar` vem junto de
     `pode_gerar`, e a tela so obedece. Ausente NAO bloqueia, pela mesma razao
     do `pode_gerar`: um servidor antigo ou uma resposta em cache de antes do
     deploy nao pode trancar ninguem por causa de um campo que ainda nao
     chegou. */
  const precisaAceitar = conta?.precisa_aceitar === true;
  const [aceitando, setAceitando] = useState(false);
  const [erroAceite, setErroAceite] = useState('');

  /* ── A REGRA DA LEITURA ──
     O aceite só destrava depois de a pessoa ABRIR e ROLAR ATÉ O FIM cada
     documento, aqui dentro da janela.

     Antes os dois eram links para outra aba. Numa aba nova não dá para saber
     se alguém chegou ao fim do texto, e um aceite que não sabe disso é só uma
     caixa marcada. O texto que vale contra a gente num tribunal é o que a
     pessoa teve a chance real de ler, e é essa chance que a rolagem registra.

     `lidos` guarda os ids já lidos. Não vai para o servidor: ele grava o
     aceite, e a prova dele continua sendo o texto congelado mais o hash. */
  const [docLendo, setDocLendo] = useState(null);
  const [lidos, setLidos] = useState([]);
  const [progresso, setProgresso] = useState(0);
  const caixaTextoRef = useRef(null);
  const novos = maisRecentes();
  const todosLidos = DOCUMENTOS.every((d) => lidos.includes(d.id));

  /* A FOLGA DE 4px. Zoom do navegador e altura fracionária fazem
     `scrollTop + clientHeight` parar meio pixel antes do fim, e sem a folga o
     documento nunca ficaria lido para quem rolou até embaixo. */
  function medirLeitura() {
    const c = caixaTextoRef.current;
    if (!c || !docLendo) return;
    /* SEM ALTURA, SEM CONCLUSÃO. Enquanto a caixa não foi desenhada,
       `clientHeight` é 0 e `scrollHeight` também: a conta daria "não tem o que
       rolar" e o documento nasceria lido. O ResizeObserver chama isto na hora
       em que começa a observar, que é justamente esse instante. */
    if (!c.clientHeight) return;
    const sobra = c.scrollHeight - c.clientHeight;
    /* Texto menor que a caixa não tem o que rolar. Exigir rolagem aí seria um
       botão que nunca destrava. */
    if (sobra <= 4) { setProgresso(100); marcarLido(docLendo); return; }
    setProgresso(Math.min(100, Math.round((c.scrollTop / sobra) * 100)));
    if (c.scrollTop >= sobra - 4) marcarLido(docLendo);
  }

  function marcarLido(id) {
    setLidos((L) => (L.includes(id) ? L : [...L, id]));
  }

  useEffect(() => {
    if (!docLendo) return;
    const c = caixaTextoRef.current;
    if (!c) return;
    c.scrollTop = 0;
    setProgresso(0);
    medirLeitura();
    /* Mede de novo quando a caixa muda de tamanho: girar o celular ou abrir o
       teclado muda a altura, e um documento que cabia inteiro passa a não
       caber (ou o contrário). */
    const obs = new ResizeObserver(medirLeitura);
    obs.observe(c);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docLendo]);

  async function aceitarDocumentos() {
    setAceitando(true);
    setErroAceite('');
    try {
      const nova = await aceitarDocumentosLegais();
      /* Usa a conta que o SERVIDOR devolveu, e nao um `precisa_aceitar: false`
         escrito aqui: quem diz se destravou e quem tomou a decisao. Se o
         aceite gravou mas alguma outra coisa ainda barra, a tela seguinte tem
         que ser a certa, e nao a tela livre. */
      if (nova) setConta(nova);
      else await atualizarConta().then((c) => c && setConta(c));
    } catch (e) {
      setErroAceite(e.message || 'Nao consegui registrar agora. Tente de novo.');
    } finally {
      setAceitando(false);
    }
  }

  // Card de crédito baixo (mesmo canto do "Dia X de 7"). NÃO fica fixo: aparece
  // no máximo 1x a cada 6h. Só para conta paga (não trial, não ilimitada) com
  // saldo <= 10%. Ao zerar, vira o estado "acabaram".
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ehTrial || ilimitado || !(total > 0) || !credBaixo || planoExpirado) {
      setCredCardVisivel(false);
      return;
    }
    const SEIS_H = 6 * 60 * 60 * 1000;
    let ultimo = 0;
    try { ultimo = parseInt(localStorage.getItem('cora_cred_card_visto') || '0', 10) || 0; } catch (e) {}
    if (Date.now() - ultimo > SEIS_H) setCredCardVisivel(true);
  }, [conta, credBaixo, ehTrial, ilimitado, total, planoExpirado]);

  function fecharCredCard() {
    setCredCardVisivel(false);
    try { localStorage.setItem('cora_cred_card_visto', String(Date.now())); } catch (e) {}
  }
  // A altura da tarja não pode ser um número chutado no CSS: o texto quebra em
  // duas linhas na tela estreita, e um valor fixo deixaria o menu por baixo
  // dela. Medimos a tarja de verdade e o CSS usa essa medida para deslocar o
  // menu, o cabeçalho e o conteúdo.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raiz = document.documentElement;
    if (!conta?.personificado) { raiz.style.removeProperty('--tarja-h'); return; }
    const el = document.querySelector('.tarja-personificacao');
    if (!el) return;
    const medir = () => raiz.style.setProperty('--tarja-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => { obs.disconnect(); raiz.style.removeProperty('--tarja-h'); };
  }, [conta?.personificado, conta?.email]);

  const naApp = pathname === '/app';

  // Encerrar é sair de verdade: o token de personificação é a sessão inteira
  // do navegador agora. Voltar direto para o admin exigiria guardar a sessão
  // antiga em algum lugar, e essa comodidade custaria transformar um token de
  // cliente em chave de admin — ver o comentário da rota no cora-auth.
  async function sairDaPersonificacao() {
    try { await sair(); } catch (e) {}
    window.location.href = '/login';
  }

  // Onde a pessoa está agora, para o cabeçalho dizer. Sem isso ele é uma
  // barra vazia de ponta a ponta com o avatar num canto.
  /* O rotulo do cabecalho sai da lista INTEIRA, e nao da filtrada. Quem abre
     /workspace sem ser dono de equipe (por link direto, ou logo depois de
     criar a equipe, antes de a conta em cache saber disso) via a pastilha
     vazia: o item nao estava no menu, entao nao havia de onde tirar o nome. */
  const aqui = (TODOS_ITENS.find((i) => i.href === pathname) || {}).rotulo || '';

  // A padronagem no cabeçalho fica só em Minha conta e Assinatura, do jeito
  // que o PromptHub faz. No Início ela já mora na esteira do herói, e duas na
  // mesma tela competem. Foi a mesma conclusão do lado dos Promptadores, e é
  // por isso que lá o cabeçalho liso é o normal e a faixa é a exceção.
  const TELAS_COM_FAIXA = ['/conta/perfil', '/assinatura', '/admin', '/workspace'];
  const cabecalhoComFaixa = TELAS_COM_FAIXA.includes(pathname);

  return (
    // `pn` é a classe da página. Todo o desenho aprovado do painel vive em
    // painel-pagina.css, escopado nela: assim ele ganha do molde antigo por
    // especificidade, sem `!important`, e nada dele vaza para o resto do site.
    // A folha é GERADA a partir de ferramentas/painel.html, que é o artefato.
    // Mexer no desenho é mexer lá e rodar o gerador, nunca editar a folha.
    <div className="pn">
    <div className={'app-shell' + (recolhido ? ' recolhido' : '') + (gaveta ? ' gaveta' : '')
      + (conta?.personificado ? ' com-tarja' : '')}>
      {/* ── TARJA DE PERSONIFICAÇÃO ──
          Fica no AppShell, e não só no /admin, porque o ponto todo de "ver como
          o cliente" é sair do painel e andar pelas telas dele. É justamente
          longe do admin que dá para esquecer de quem é a conta na tela. */}
      {conta?.personificado && (
        <div className="tarja-personificacao" role="status">
          <span>
            {t('pers_tarja')} <b>{conta.nome || conta.email}</b>
            {conta.personificado.minutos_restantes != null &&
              ` · ${conta.personificado.minutos_restantes} min`}
          </span>
          <span className="tarja-personificacao-nota">{t('pers_so_leitura')}</span>
          <button className="tarja-personificacao-sair" onClick={sairDaPersonificacao}>
            {t('pers_encerrar')}
          </button>
        </div>
      )}

      {/* MENU LATERAL FIXO (gaveta no tablet/celular) */}
      <aside className="app-side">
        {/* Um logo só, e quem escolhe o que aparece aqui é a classe
            `recolhido`, no CSS. Escolher por estado no React deixava a gaveta
            sem logo nenhum para quem tinha recolhido a lateral no desktop: o
            botão de recolher não existe na gaveta, e o logo tinha ido junto.

            O logo é uma máscara em CSS, então o elemento é vazio de propósito
            e quem diz o nome é o `aria-label`. Ele leva à landing. Para voltar
            ao painel, o caminho é o item "Início" do menu. */}
        <div className="app-side-topo">
          <Link href="/" className="app-logo" aria-label="Cora Render" />

          <button
            className="app-side-toggle"
            onClick={toggleMenu}
            title={t('recolher_menu')}
            aria-label={t('recolher_menu')}
          >
            {Icone.recolher}
          </button>

          {/* Recolhida, a lateral fica com o símbolo da marca e mais nada, e
              ele é o botão que abre de volta. Uma seta ao lado seria um
              segundo alvo para a mesma ação, num espaço de 68px. */}
          <button
            className="app-side-toggle app-side-toggle--so"
            onClick={toggleMenu}
            title={t('expandir_menu')}
            aria-label={t('expandir_menu')}
          >
            <span className="app-side-c" />
          </button>

          {/* Só na gaveta, onde não existe recolher: o X toma o lugar dele. */}
          <button
            className="app-side-fechar"
            onClick={() => setGaveta(false)}
            aria-label={t('fechar')}
          >×</button>
        </div>
        <nav className="app-nav">
          {itens.map(i => (
            <div key={i.href}>
              {i.divisor && <div className="app-nav-div" />}

              <Link
                href={i.href}
                className={'app-nav-item' + (pathname === i.href ? ' ativo' : '')}
                title={i.rotulo}
              >
                <span className="app-nav-ic">{i.icone}</span>
                {/* O rótulo é SEMPRE renderizado; quem o esconde no menu
                    recolhido é o CSS. Antes ele nem existia no HTML quando
                    recolhido — e aí, ao virar gaveta no celular (onde há
                    largura de sobra), a gaveta abria só com ícones. */}
                <span className="app-nav-lbl">{i.rotulo}</span>
              </Link>

              {/* ── AS TRES TELAS DO ADMIN ──
                  Elas moram aqui, embaixo do item, e nao numa fila de abas em
                  cima da tabela: cada tela carrega so os seus controles, e era
                  isso que a barra unica de oito abas nao conseguia dizer.

                  So aparecem quando ja se esta no admin. Um submenu visivel de
                  qualquer lugar do produto seria tres linhas a mais no menu
                  para todo mundo o tempo todo. */}
              {i.href === '/admin' && pathname === '/admin' && (
                <div className="app-nav-sub">
                  {TELAS_ADMIN.map(nome => (
                    <a key={nome} href={'#' + nome}
                       className={telaAdm === nome ? 'ativo' : undefined}>
                      {nome.charAt(0).toUpperCase() + nome.slice(1)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* HEADER FIXO */}
      <header className={'app-header' + (cabecalhoComFaixa ? ' app-header--faixa' : '')}>
        {/* O hambúrguer só aparece abaixo de 1024px, onde a lateral virou
            gaveta. `margin-right: auto` (no CSS) é o que mantém o avatar
            colado à direita sem precisar de um espaçador vazio. */}
        <button
          className="app-burger"
          onClick={() => setGaveta(true)}
          aria-label="Menu"
          aria-expanded={gaveta}
        >
          <span /><span /><span />
        </button>

        <span className="app-header-aqui">{aqui}</span>

        <div className="app-header-dir">
          <div className="app-user-wrap">
            <button className="app-user-btn" onClick={() => setMenuUser(!menuUser)} title={t('nav_minhaconta')}>
              {/* anel de créditos ao redor do avatar (estilo Magnific).
                  Admin/ilimitado mostra o anel SEMPRE CHEIO. */}
              {/* O anel acompanha a foto e é quadrado de canto redondo.
                  `pathLength="100"` poupa a conta do perímetro de um retângulo
                  arredondado: o traço passa a ser medido em centos, e o quanto
                  resta é o número direto. Acabando, ele deixa de ser marca e
                  vira sinal. */}
              {conta && (ilimitado || total > 0) && (
                <svg className="app-anel" width="46" height="46" viewBox="0 0 46 46">
                  <rect className="app-anel-bg"
                        x="2.5" y="2.5" width="41" height="41" rx="13" pathLength="100" />
                  <rect
                    className={'app-anel-fill' + (acabando ? ' baixo' : '')}
                    x="2.5" y="2.5" width="41" height="41" rx="13"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={ilimitado ? 0 : 100 - pctRestante}
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
                {/* A faixa fecha o menu por cima, como fecha o cartão do
                    e-mail. É o único lugar da moldura onde a marca aparece
                    desenhada, e não só em cor. */}
                <div className="app-user-faixa" aria-hidden="true" />
                <div className="app-user-miolo">
                {/* Irmãos, não aninhados: aninhado, o padding do plano
                    somava ao do nome e ele saía 12px mais à direita. */}
                <div className="app-user-nome">
                  {conta?.nome || conta?.email}
                </div>

                {conta?.plano && (
                  <div className="app-user-plano">{rotuloPlano(conta, t)}</div>
                )}

                {!ilimitado && conta && total > 0 && (
                  <div className="cred-card">
                    <div className="cred-rot">{t('cred_restantes')}</div>
                    <div className="cred-num">{restantes.toLocaleString(localeDeIdioma(idioma))}</div>
                    <div className="cred-barra">
                      <div
                        className={'cred-fill' + (acabando ? ' cred-fill--alerta' : '')}
                        style={{ width: pctRestante + '%' }}
                      />
                    </div>
                    <div className="cred-pe">
                      <span>{t('cred_de')} {total.toLocaleString(localeDeIdioma(idioma))}</span>
                      {diasRenov !== null && (
                        <span>{t('cred_renova_em')} {diasRenov} {diasRenov === 1 ? t('dia') : t('dias')}</span>
                      )}
                    </div>
                  </div>
                )}

                {ilimitado && conta && (
                  <div className="cred-card cred-card--ilim">
                    <div className="cred-rot">{t('creditos')}</div>
                    <div className="cred-num">{t('ilimitados')}</div>
                  </div>
                )}
                <Link href="/conta/perfil" className="app-user-link" onClick={() => setMenuUser(false)}>
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="10" cy="6.5" r="3"/>
                    <path d="M3.5 17a6.5 6.5 0 0113 0" strokeLinecap="round"/>
                  </svg>
                  {t('nav_minhaconta')}
                </Link>

                <div className="app-user-pref">
                  <label>{t('idioma_label')}</label>
                  <div className="app-user-pref-dd">
                    <DropdownCora
                      valor={idioma}
                      opcoes={[{ v: 'pt', n: 'Português' }, { v: 'en', n: 'English' }, { v: 'es', n: 'Español' }]}
                      onEscolher={(v) => trocarPref('idioma', v)}
                    />
                  </div>
                </div>
                <div className="app-user-pref">
                  <label>{t('tema_label')}</label>
                  <div className="app-user-pref-dd">
                    <DropdownCora
                      valor={conta?.tema || 'sistema'}
                      opcoes={[{ v: 'claro', n: t('tema_claro') }, { v: 'escuro', n: t('tema_escuro') }, { v: 'sistema', n: t('tema_sistema') }]}
                      onEscolher={(v) => trocarPref('tema', v)}
                    />
                  </div>
                </div>

                <button className="app-user-link app-user-sair" onClick={logout}>
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 17H4.5A1.5 1.5 0 013 15.5v-11A1.5 1.5 0 014.5 3H8" strokeLinecap="round"/>
                    <path d="M13 13.5L16.5 10 13 6.5M16.5 10H7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('sair')}
                </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* O véu da gaveta. Fica sempre no HTML (invisível e sem alvo até
          abrir) para que a transição de opacidade tenha de onde partir. */}
      <div className="app-veu" onClick={() => setGaveta(false)} aria-hidden="true" />

      {/* CONTEÚDO */}
      <main className="app-main">
        <div className="app-main-conteudo">{children}</div>
        <RodapeLegal />
      </main>

      {/* Contador do trial (enquanto ativo). Escondido nas abas de Promptadores:
          lá o teste é do Cora e confundiria com o acesso dos promptadores. */}
      {ehTrial && !trialExpirado && !pathname.startsWith('/promptadores') && (
        <div className="trial-card">
          <div className="trial-card-info">
            <span className="trial-card-txt"><strong>{t('trial_dia')} {trialDiaAtual} {t('trial_de7')}</strong> <small>{t('trial_teste_gratis')}</small></span>
            <div className="trial-card-prog"><i style={{ width: (trialDiaAtual / 7 * 100) + '%' }} /></div>
          </div>
          <button className="trial-card-btn" onClick={() => router.push('/precos')}>{t('assinar')}</button>
        </div>
      )}

      {/* Card de crédito baixo/zerado — mesmo canto do trial, aparece de 6 em 6h */}
      {credCardVisivel && !ehTrial && !ilimitado && total > 0 && credBaixo && !planoExpirado && (
        <div className="trial-card cred-nudge">
          <button className="cred-nudge-x" onClick={fecharCredCard} aria-label={t('fechar')}>×</button>
          {/* O selo é quem diz que isto é aviso. Sem ele o cartão parece
              novidade, que foi o que o dono apontou no desenho anterior. */}
          <span className="cred-nudge-selo">{restantes <= 0 ? t('cred_sem') : t('cred_acabando')}</span>
          <div className="trial-card-info">
            {restantes <= 0 ? (
              <span className="trial-card-txt"><strong>{t('cred_acabaram')}</strong> <small>{t('cred_recarregue')}</small></span>
            ) : (
              <span className="trial-card-txt"><strong>{restantes.toLocaleString(localeDeIdioma(idioma))} {t('cred_restantes_txt')}</strong> <small>{t('cred_de')} {total.toLocaleString(localeDeIdioma(idioma))}</small></span>
            )}
            {/* A barra mede o que JÁ FOI, não o que sobra: com 820 de 20.000
                ela chega quase no fim, e é assim que se lê um aviso. Antes ela
                usava `pctRestante` e ficava quase vazia bem na hora em que a
                coisa estava mais séria.
                O mínimo de 4% é para a barra nunca sumir de todo: pouca coisa
                gasta ainda precisa aparecer como pouca coisa. */}
            <div className="trial-card-prog">
              <i className={restantes <= 0 ? 'cred-bar-zero' : 'cred-bar-baixo'}
                 style={{ width: (restantes <= 0 ? 100 : Math.max(4, 100 - pctRestante)) + '%' }} />
            </div>
          </div>
          <button className="trial-card-btn" onClick={() => router.push('/assinatura')}>
            {restantes <= 0 ? t('recarregar') : t('comprar_creditos')}
          </button>
        </div>
      )}

      {/* ── OS DOCUMENTOS MUDARAM ──
          Tela cheia, e não um aviso que dá para ignorar. A licença de uso das
          imagens, o prazo da recarga e o foro moram nesse texto: continuar
          operando sob um acordo que a pessoa nunca leu é o que torna o acordo
          inexigível depois.

          Ela vem ANTES dos outros bloqueios na ordem do JSX, e por isso ganha
          deles quando duas coisas valem ao mesmo tempo. É a ordem certa:
          resolver o aceite é um clique, renovar um plano não, e mandar alguém
          renovar para só depois descobrir que ainda falta aceitar seria fazer a
          pessoa pagar antes de saber que continuaria travada.

          Sem botão de fechar de propósito. Sair é a única outra saída, e ela
          está ali embaixo. */}
      {precisaAceitar && (
        <div className="trial-bloqueio">
          <div className="trial-bloqueio-card trial-bloqueio-card--docs">
            <div className="trial-bloqueio-faixa" aria-hidden="true" />
            <div className="trial-bloqueio-miolo">
              {!docLendo && (
                <div>
                  <span className="trial-bloqueio-eb">{t('rea_eyebrow')}</span>
                  <h1>{t('rea_h1')}</h1>
                  <p>{t('rea_p')}</p>

                  {/* A condição vem escrita ANTES da lista, e não embaixo do
                      botão travado: quem lê depois de tentar clicar já leu a
                      tela como recusa. */}
                  <p className="blq-como">{t('rea_como')}</p>

                  <div className="blq-docs">
                    {DOCUMENTOS.map((d) => {
                      const lido = lidos.includes(d.id);
                      return (
                        <div className="blq-doc" key={d.id} data-lido={lido ? 'sim' : 'nao'}>
                          <div className="blq-doc__n">
                            <b>
                              {t(d.titulo)}
                              {novos.includes(d.id) && (
                                <span className="blq-doc__novo">{t('rea_novo')}</span>
                              )}
                            </b>
                            <span>{t('rea_versao').replace('{data}', t(d.data))}</span>
                          </div>
                          <div className="blq-doc__dir">
                            {lido && (
                              <span className="blq-doc__lido">
                                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                  <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2"
                                        strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {t('rea_lido')}
                              </span>
                            )}
                            <button className="blq-doc__ver" onClick={() => setDocLendo(d.id)}>
                              {lido ? t('rea_ler_de_novo') : t('rea_ler')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {erroAceite && <p className="rea-erro">{erroAceite}</p>}

                  <button className="btn" disabled={aceitando || !todosLidos}
                          onClick={aceitarDocumentos}>
                    {aceitando ? t('rea_gravando') : t('rea_botao')}
                  </button>
                  <p className="blq-pe">
                    {t('rea_pe')} <span>{t('rea_pe2')}</span>
                  </p>
                  <button className="trial-bloqueio-sair" onClick={logout}>{t('sair')}</button>
                </div>
              )}

              {/* ── O LEITOR ──
                  O texto vem do MESMO componente que desenha /termos e
                  /privacidade. Mudar o documento lá muda aqui, e não existe a
                  chance de a pessoa aceitar uma versão e a página pública
                  mostrar outra. */}
              {docLendo && (
                <div>
                  <div className="blq-leitor__topo">
                    <span className="blq-leitor__nome">
                      {t(DOCUMENTOS.find((d) => d.id === docLendo).titulo)}
                    </span>
                    <button className="blq-leitor__volta" onClick={() => setDocLendo(null)}>
                      {t('rea_voltar')}
                    </button>
                  </div>
                  <div className="blq-texto" ref={caixaTextoRef} tabIndex={0}
                       onScroll={medirLeitura}>
                    {docLendo === 'termos' ? <TextoTermos /> : <TextoPrivacidade />}
                  </div>
                  <div className="blq-prog" aria-hidden="true">
                    <i style={{ width: progresso + '%' }} />
                  </div>
                  <p className="blq-status" data-fim={lidos.includes(docLendo) ? 'sim' : 'nao'}>
                    {lidos.includes(docLendo) ? t('rea_doc_lido') : t('rea_role')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bloqueio de tela cheia (trial expirado, e sem recarga para gastar).
          Aluno dos Promptadores NÃO cai aqui — para ele o aviso é só no /app,
          logo abaixo, e o resto da conta (inclusive os Promptadores) segue. */}
      {ehTrial && trialExpirado && !podeGerar && !ehAlunoPromptador && (
        <div className="trial-bloqueio">
          <div className="trial-bloqueio-card">
            <div className="trial-bloqueio-faixa" aria-hidden="true" />
            <div className="trial-bloqueio-miolo">
            <span className="trial-bloqueio-eb">{t('teste_encerrado')}</span>
            <h1>{t('teste_terminou_h1')}</h1>
            <p>{t('teste_terminou_p')}</p>
            <button className="btn" onClick={() => router.push('/precos')}>{t('ver_planos_assinar')}</button>
            <button className="trial-bloqueio-sair" onClick={logout}>{t('sair')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Aluno dos Promptadores sem assinatura do Cora: aviso amigável, só no
          /app (onde se gera). Ele não "perdeu" nada — nunca assinou; o botão
          apresenta o produto em vez de cobrar renovação. */}
      {ehAlunoPromptador && ehTrial && trialExpirado && !podeGerar && naApp && (
        <div className="trial-bloqueio">
          <div className="trial-bloqueio-card">
            <div className="trial-bloqueio-faixa" aria-hidden="true" />
            <div className="trial-bloqueio-miolo">
            <span className="trial-bloqueio-eb">{t('aluno_sem_assin_eb')}</span>
            <h1>{t('aluno_sem_assin_h1')}</h1>
            <p>{t('aluno_sem_assin_p')}</p>
            <button className="btn" onClick={() => router.push('/')}>{t('aluno_conhecer')}</button>
            <button className="trial-bloqueio-sair" onClick={() => router.push('/conta')}>{t('sair')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bloqueio do /app quando o plano vence / cartão falha (conta e
          assinatura continuam acessíveis pela navegação lateral) */}
      {planoExpirado && naApp && !podeGerar && !suspensoEquipe && (
        <div className="trial-bloqueio">
          <div className="trial-bloqueio-card">
            <div className="trial-bloqueio-faixa" aria-hidden="true" />
            <div className="trial-bloqueio-miolo">
            <span className="trial-bloqueio-eb">{t('plano_inativo')}</span>
            <h1>{t('plano_expirou_h1')}</h1>
            <p>{t('plano_expirou_p')}</p>
            <button className="btn" onClick={() => router.push('/assinatura')}>{t('renovar_assinatura')}</button>
            <button className="trial-bloqueio-sair" onClick={() => router.push('/conta')}>{t('sair')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspenso por excedente de assentos (a equipe reduziu a quantidade).
          Mesma moldura do bloqueio de plano, outra mensagem: aqui nao ha o que
          renovar — quem resolve e o administrador da equipe. O botao oferece a
          unica saida que depende so dela: assinar por conta propria. */}
      {suspensoEquipe && naApp && !podeGerar && (
        <div className="trial-bloqueio">
          <div className="trial-bloqueio-card">
            <div className="trial-bloqueio-faixa" aria-hidden="true" />
            <div className="trial-bloqueio-miolo">
            <span className="trial-bloqueio-eb">{t('susp_badge')}</span>
            <p>{t('susp_texto')}</p>
            <button className="btn" onClick={() => router.push('/precos')}>{t('susp_botao')}</button>
            <button className="trial-bloqueio-sair" onClick={() => router.push('/conta')}>{t('sair')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup "créditos acabaram" — dispara ao receber 402 de uma geração */}
      <PopupCreditos />

      {/* Popup "recurso do Pro/Studio" — dispara em 'cora:sem-acesso' */}
      <PopupUpgrade />
    </div>
    </div>
  );
}
