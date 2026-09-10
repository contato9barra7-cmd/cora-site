'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  A HOME DO PAINEL
//
//  O desenho é o do artefato aprovado, `ferramentas/painel.html`, e a folha
//  (painel-pagina.css) é GERADA a partir dele. Mexer no visual é mexer lá e
//  rodar o gerador, nunca editar a folha nem enfiar estilo aqui:
//
//      python gerar-css-artefato.py painel.html ../app/painel-pagina.css pn
//
//  A classe `pn` que escopa tudo mora no AppShell, que é a moldura.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, Suspense } from 'react';
import { lerModo, gravarModo, DEMO_TOTAL, DEMO_RESTANTES } from '../../lib/verComo';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell, { URL_IA_STUDIO } from '../../components/AppShell';
import Confirma from '../../components/Confirma';
import { lerConta, atualizarConta, baixarPlugin, minhaEquipe, sairDaEquipe, lerEquipe, EVENTO_CREDITOS} from '../../lib/auth';
import { listarGeracoes } from '../../lib/geracoes';
import { useIdioma, localeDeIdioma } from '../../lib/i18n';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

// Quantas imagens a esteira mostra, e o mínimo que ela precisa ter na fila
// para a volta fechar sem buraco. Com três renders e duas cópias a fila fica
// mais curta que a tela, e a emenda aparece no meio dela.
const TETO_RENDERS = 20;
const MINIMO_FILA = 12;

function ContaConteudo() {
  const router = useRouter();
  const { t, idioma } = useIdioma();
  const loc = localeDeIdioma(idioma);
  const params = useSearchParams();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  // Qual dos três quadros do herói está no ar, e se ele parou de andar. Ele
  // para no hover e no primeiro clique nos pontinhos: quem escolheu um quadro
  // quer ler aquele, e não ver o próximo chegar no meio da frase.
  const [quadro, setQuadro] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);

  const [comoInstalar, setComoInstalar] = useState(false);
  const [equipeMembro, setEquipeMembro] = useState(null);
  const [saindo, setSaindo] = useState(false);
  const [equipe, setEquipe] = useState(null);
  /* O modo mora no `lib/verComo.js`, e nao aqui: a moldura (AppShell) precisa
     dele para trocar o menu junto. Enquanto ele morava so nesta pagina, o
     seletor mudava o miolo e deixava a aba Admin no lugar e a aba Equipe
     escondida, que nao e a visao de ninguem. */
  const [verComo, setVerComo] = useState('real');   // real | normal | dono | membro
  useEffect(() => { setVerComo(lerModo()); }, []);
  function escolherVerComo(m) { setVerComo(gravarModo(m)); }

  /* O herói anda sozinho de sete em sete segundos.

     Sete porque o que manda aqui não é o tempo de LER o quadro inteiro, é o
     tempo até a pessoa PRESENCIAR uma troca. Quem chega no painel olha o topo
     por poucos segundos e desce; virando em nove ou dez, a maioria nunca
     descobre que existe um segundo quadro. Sete dá para ler o título e o
     apoio com folga, e quem quiser ler cada palavra do quadro do IA Studio
     para ele só de passar o mouse.

     Quem pediu menos movimento no sistema fica no primeiro quadro e anda
     pelos pontinhos — a mesma regra do resto do painel. */
  useEffect(() => {
    if (pausado) return undefined;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    } catch (e) {}
    const id = setInterval(() => setQuadro((q) => (q + 1) % 3), 7000);
    return () => clearInterval(id);
  }, [pausado]);

  // As últimas imagens. Vêm do mesmo `/geracoes` que alimenta o feed dentro
  // do /app, e ele já devolve do mais novo para o mais velho.
  const [renders, setRenders] = useState([]);

  /* A pergunta e nossa, e nao a caixa do navegador: aquela nasce com o
     dominio no titulo, com os botoes do sistema e sem o tema escuro, e num
     produto ela le como se fosse de outro. */
  const [confSair, setConfSair] = useState(false);

  async function sairEquipe() {
    setConfSair(false);
    setSaindo(true);
    try {
      await sairDaEquipe();
      const fresca = await atualizarConta();
      if (fresca) setConta(fresca);
      setEquipeMembro(null);
    } catch (e) { setErro(e.message); }
    finally { setSaindo(false); }
  }

  async function baixar() {
    setBaixando(true);
    setErro('');
    try {
      const url = await baixarPlugin();
      window.location.href = url;
    } catch (e) {
      setErro(e.message);
    } finally {
      setTimeout(() => setBaixando(false), 1500);
    }
  }

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setCarregando(false);
    atualizarConta().then((fresca) => { if (fresca) setConta(fresca); }).catch(() => {});
    minhaEquipe().then((eq) => { if (eq) setEquipeMembro(eq); }).catch(() => {});

    if (c.eh_dono_equipe) {
      lerEquipe().then((e) => { if (e) setEquipe(e); }).catch(() => {});
    }

    if (params.get('pagamento') === 'sucesso') {
      setAviso(t('conta_pag_recebido'));
      atualizarConta().then((fresca) => {
        if (fresca) setConta(fresca);
        setAviso(t('conta_pag_confirmado'));
        setTimeout(() => setAviso(''), 5000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, params]);

  // A esteira falha em silêncio de propósito: quem nunca gerou nada e quem
  // não conseguiu falar com o servidor de render caem no mesmo lugar, que é
  // a fila de blocos de cor. Um erro vermelho aqui seria alarme por nada,
  // numa tela que não é sobre isso.
  useEffect(() => {
    let vivo = true;
    listarGeracoes({ limite: 12 })
      .then((lotes) => {
        if (!vivo) return;
        const imagens = [];
        (lotes || []).forEach((lote) => {
          (lote.itens || []).forEach((item) => {
            if (item.url && imagens.length < TETO_RENDERS) {
              imagens.push({ id: item.id, url: item.url, criadoEm: lote.criadoEm });
            }
          });
        });
        setRenders(imagens);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    function onCreditosDash(e) {
      if (e.detail) setConta(e.detail);
    }
    window.addEventListener(EVENTO_CREDITOS, onCreditosDash);
    return () => window.removeEventListener(EVENTO_CREDITOS, onCreditosDash);
  }, []);

  if (carregando) return <AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;
  if (!conta) return null;

  const ehAdmin = conta.is_admin === true;
  const modo = ehAdmin ? verComo : 'real';
  const ehAdminVis = modo === 'real' ? ehAdmin : false;
  const ehDono = modo === 'dono' ? true
               : (modo === 'normal' || modo === 'membro') ? false
               : ehAdmin ? false
               : conta.eh_dono_equipe;
  const ehMembroVis = modo === 'membro' ? true
                    : (modo === 'normal' || modo === 'dono') ? false
                    : ehAdmin ? false
                    : !!equipeMembro;
  const ehPago = conta.plano && conta.plano !== 'free';
  const ilimitadoReal = conta.ilimitado === true || conta.creditos_total === -1;
  /* O gerente gera sem gastar, entao a tela dele mostra "Ilimitado" no lugar
     do numero. Os outros modos de demonstracao usam o credito de mentira. */
  const mostrarIlimitado = modo === 'real' ? ilimitadoReal : modo === 'gerente';

  // "Plano Free" para quem está no teste é o nome do que ela NÃO tem. O que
  // ela tem é o teste, e é isso que o olho do herói diz.
  const nomePlano = (ehAdminVis && ilimitadoReal) ? 'Admin'
    : modo === 'gerente' ? 'Gerente'
    : ehDono ? `Teams (${NOME_PLANO[conta.equipe_plano] || conta.equipe_plano || 'Pro'})`
    : ehMembroVis ? `${NOME_PLANO[conta.plano] || conta.plano} (${t('conta_equipe_tag').toLowerCase()})`
    : (conta.eh_trial === true) ? t('pn_teste_gratis')
    : (conta.plano === 'free') ? t('pn_sem_plano')
    : `${t('plano_label')} ${NOME_PLANO[conta.plano] || conta.plano}`;

  const demoCreditos = ehAdmin && modo !== 'real';
  /* ── O CRÉDITO DA DEMONSTRAÇÃO SAI DE UM LUGAR SÓ ──
     O número inventado precisa valer para TODAS as leituras da tela: o número
     grande, o "de X no ciclo", a barra e a linha de "sem créditos". Antes só
     as duas primeiras olhavam a demonstração, e as outras duas continuavam
     lendo a conta real de quem está espiando. O resultado era a tela mostrar
     14.320 e escrever "Você não tem créditos" três linhas abaixo. */
  const restantesNum = demoCreditos ? DEMO_RESTANTES : (conta.creditos_restantes ?? 0);
  const totalNum = demoCreditos ? DEMO_TOTAL : (conta.creditos_total ?? 0);

  const creditos = mostrarIlimitado ? t('conta_ilimitado')
    : ehDono ? (conta.equipe_creditos_total ?? 0).toLocaleString(loc)
    : restantesNum.toLocaleString(loc);
  const totalCreditos = mostrarIlimitado ? null
    : ehDono ? null
    : totalNum.toLocaleString(loc);
  // No teste a data que importa e a do teste, e o `expira_em` do plano free
  // pode nem existir.
  const dataRenov = ehDono ? conta.equipe_renova_em
    : (conta.eh_trial === true) ? (conta.trial_expira_em || conta.expira_em)
    : conta.expira_em;

  const pctCreditos = (totalNum > 0 && !mostrarIlimitado)
    ? Math.max(0, Math.min(100, Math.round((restantesNum / totalNum) * 100)))
    : 0;

  const diasAte = dataRenov
    ? Math.max(0, Math.ceil((new Date(dataRenov) - new Date()) / 86400000))
    : null;

  // Quem tem crédito de verdade. `totalCreditos` é string, e "0" é verdadeiro:
  // sem esta conta, a barra e a linha "de 0 no ciclo" apareciam para quem não
  // tem crédito nenhum.
  const temCreditos = mostrarIlimitado || ehDono || (totalNum > 0);

  const vagos = equipe?.equipe
    ? Math.max(0, (equipe.equipe.assentos || 0) - (equipe.membros || []).length)
    : 0;

  const primeiroNome = (conta.nome || '').trim().split(/\s+/)[0] || '';
  const dataLonga = dataRenov
    ? new Date(dataRenov).toLocaleDateString(loc, { day: 'numeric', month: 'long' })
    : null;

  // Teste grátis: conta free de até 7 dias, com o contador vindo do servidor.
  const ehTrial = conta.eh_trial === true;
  const diaDoTeste = Math.min(7, Math.max(1, 8 - (conta.trial_dias_restantes ?? 7)));

  // Quem paga o plano desta equipe, para a nota do cartão de créditos poder
  // dizer com quem falar em vez de só enunciar a regra.
  const donoDaEquipe = equipeMembro?.dono_nome || equipeMembro?.dono_email || '';

  // Membro de equipe não compra crédito: quem compra é quem paga o plano.
  const podeComprar = !ehMembroVis || ehDono;

  // E recarga exige plano ativo: sem plano, o `POST /stripe/checkout` recusa
  // com `precisaPlano` e a pessoa é jogada para os preços com um aviso. Um
  // botão "Comprar créditos" aqui seria um beco com o nome errado na porta.
  const temPlano = demoCreditos || ehPago || ehDono || ehMembroVis;

  // A frase do herói, montada em pedaços. A t() não interpola de propósito
  // (é invariante de segurança do i18n), então quem junta é o JSX.
  function subDoHeroi() {
    if (mostrarIlimitado) return <>{t('pn_sub_ilimitado')}</>;
    if (!ehPago && !ehTrial && !ehDono && !ehMembroVis) return <>{t('pn_sub_sem_plano')}</>;
    if (ehTrial) {
      return (
        <>
          {t('pn_sub_teste_a')} <b>{diaDoTeste}</b> {t('pn_sub_teste_b')}{' '}
          {t('pn_sub_teste_c')}
        </>
      );
    }
    const abre = ehDono ? t('pn_sub_equipe_tem') : t('pn_sub_voce_tem');
    const meio = ehDono ? t('pn_sub_ciclo')
               : ehMembroVis ? t('pn_sub_pela_equipe')
               : t('pn_sub_gastar');
    return (
      <>
        {abre} <b>{creditos} {t('creditos').toLowerCase()}</b> {meio}
        {dataLonga ? <> <b>{dataLonga}</b>.</> : '.'}
      </>
    );
  }

  // A fila da esteira: a mesma lista repetida um número PAR de vezes, para a
  // volta cair sempre num limite de cópia. Menos que isso e a emenda aparece.
  const vezes = renders.length
    ? Math.max(2, Math.ceil(MINIMO_FILA / renders.length) * 2)
    : 0;
  const fila = [];
  for (let v = 0; v < vezes; v++) {
    renders.forEach((r, i) => fila.push({ ...r, chave: v + '-' + i, eco: v >= vezes / 2 }));
  }

  function quando(iso) {
    if (!iso) return '';
    const dias = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
    if (dias <= 0) return t('pn_hoje');
    if (dias === 1) return t('pn_ontem');
    return new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  }

  return (
    <AppShell>
    <div className="admin-wrap">
      {ehAdmin && (
        <div className="vercomo">
          <span className="vercomo-lbl">{t('conta_ver_como')}</span>
          <div className="vercomo-opcoes">
            {[
              { v: 'real',   n: t('conta_vc_real') },
              { v: 'normal', n: t('conta_vc_normal') },
              { v: 'dono',   n: t('conta_vc_dono') },
              { v: 'membro', n: t('conta_vc_membro') },
              { v: 'gerente', n: 'Gerente' }
            ].map((o) => (
              <button
                key={o.v}
                className={'vercomo-btn' + (verComo === o.v ? ' vercomo-btn--on' : '')}
                onClick={() => escolherVerComo(o.v)}
              >{o.n}</button>
            ))}
          </div>
        </div>
      )}
      {aviso && <div className="conta-aviso">{aviso}</div>}
      {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

      {/* ── O HERÓI, EM TRÊS QUADROS ──
          Cartão branco com a esteira da faixa numa coluna, no modelo da home
          dos Promptadores. A esteira é a mesma peça do cabeçalho dos e-mails,
          de pé.

          Ele passou a contar três assuntos no mesmo lugar: quem chegou, o IA
          Studio e as aulas. Só o quadro do momento existe no HTML — empilhar
          os três em absoluto obrigaria a caixa a ter a altura do mais alto, e
          os dois menores ficariam com um vão embaixo do botão. */}
      <div
        className="heroi-carro"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
      >
        {quadro === 0 && (
          <div className="heroi heroi--entra" key="q0">
            <div className="heroi__pad" aria-hidden="true" />
            <div className="heroi__txt">
              <div className="heroi__marca" role="img" aria-label="Cora Render" />
              <p className="eyebrow">{nomePlano}</p>
              <h1>{t('pn_oi')}{primeiroNome ? `, ${primeiroNome}` : ''}</h1>
              <p className="heroi__sub">{subDoHeroi()}</p>
              <div className="heroi__acoes">
                <button className="dash-btn-cta" onClick={() => router.push('/app')}>
                  {t('pn_abrir')}
                </button>
                <button className="dash-btn-sec" onClick={baixar} disabled={baixando}>
                  {baixando ? t('conta_preparando') : t('conta_baixar_plugin')}
                </button>
              </div>
            </div>
          </div>
        )}

        {quadro === 1 && (
          <div className="heroi heroi--entra" key="q1">
            <div className="heroi__pad" aria-hidden="true" />
            <div className="heroi__txt">
              <div className="heroi__marca" role="img" aria-label="Cora Render" />
              <p className="eyebrow">{t('pn_apr_olho')}</p>
              <h1>{t('pn_apr_tit')}</h1>
              {/* `--largo` porque a frase cabe inteira numa linha, e o limite
                  de 52ch do apoio normal só serviria para quebrá-la no meio. */}
              <p className="heroi__sub heroi__sub--largo">{t('pn_apr_sub')}</p>
              <div className="heroi__acoes">
                <button className="dash-btn-cta" onClick={() => router.push('/aprender')}>
                  {t('pn_apr_btn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {quadro === 2 && (
          <div className="heroi heroi--entra" key="q2">
            {/* A coluna do IA Studio é um objeto, e não textura andando: a
                outra marca se apresenta pelo balão da capa dela. Ele respira
                em nove segundos e a cada sete e meio uma luz atravessa a
                silhueta, como reflexo no alumínio. */}
            <div className="heroi__pad heroi__pad--ia" aria-hidden="true">
              <span className="ia-balao"><span /><i /></span>
            </div>
            <div className="heroi__txt">
              <div className="heroi__marca heroi__marca--ia" role="img" aria-label="IA Studio" />
              <p className="eyebrow">{t('pn_ia_olho')}</p>
              <h1>{t('pn_ia_tit')}</h1>
              <p className="heroi__sub">{t('pn_ia_sub')}</p>
              <div className="heroi__acoes">
                <a
                  className="dash-btn-ia"
                  href={URL_IA_STUDIO}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('pn_ia_btn')}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 4h6v6M20 4l-8 8" />
                    <path d="M17 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="heroi__pontos">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              className="heroi__ponto"
              aria-current={quadro === i}
              aria-label={`${t('pn_quadro')} ${i + 1}`}
              onClick={() => { setQuadro(i); setPausado(true); }}
            />
          ))}
        </div>
      </div>

      {/* ── OS ÚLTIMOS RENDERS ──
          Quem ainda não gerou nada vê a MESMA esteira, no mesmo lugar e no
          mesmo passo, com blocos de cor no lugar das imagens: a tela não muda
          de forma quando a primeira imagem chega, e nenhum quadro vazio
          parece foto que não carregou. */}
      {renders.length > 0 ? (
        <>
          <div className="dash-rotulo-linha">
            <p className="eyebrow">{t('pn_renders')}</p>
            <button className="dash-ver-tudo" onClick={() => router.push('/app')}>
              {t('pn_renders_ver')}
            </button>
          </div>
          <div className="dash-esteira">
            <div className="dash-esteira__fila">
              {fila.map((r) => (
                <Link
                  key={r.chave}
                  href="/app"
                  className="dash-mini"
                  aria-hidden={r.eco ? 'true' : undefined}
                  tabIndex={r.eco ? -1 : 0}
                >
                  <img src={r.url} alt="" loading="lazy" />
                  <span>{quando(r.criadoEm)}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="dash-rotulo-linha">
            <p className="eyebrow">{t('pn_renders_vazio')}</p>
          </div>
          <div className="dash-esteira">
            <div className="dash-esteira__fila">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="dash-mini--vazio" />
              ))}
            </div>
          </div>
          <p className="dash-vazio-txt">
            <b>{t('pn_renders_vazio_a')}</b> {t('pn_renders_vazio_b')}
          </p>
        </>
      )}

      <p className="eyebrow dash-rotulo">{t('pn_sua_conta')}</p>

      <div className="dash-cartoes">
        <div className="dash-cartao">
          <span className="dash-cartao-rot">{t('pn_creditos')}</span>
          <strong className="dash-cartao-num">{creditos}</strong>
          {totalCreditos && temCreditos && !mostrarIlimitado && (
            <div className="dash-cartao-barra">
              <div className={pctCreditos <= 10 ? 'baixo' : undefined}
                   style={{ width: pctCreditos + '%' }} />
            </div>
          )}
          <div className="dash-cartao-linhas">
            {totalCreditos && temCreditos && (
              <span>
                {t('conta_de')} <b>{totalCreditos}</b>{' '}
                {ehTrial ? t('pn_no_teste') : t('pn_no_ciclo')}
              </span>
            )}
            {/* O teste não dá crédito: o plano free vale zero, e as ferramentas
                de IA ficam trancadas. O número grande é 0 mesmo, e as duas
                linhas dizem o quê e o porquê. O segundo texto é o MESMO da
                página de preços, com a mesma chave, para as duas telas não
                contarem histórias diferentes sobre o mesmo assunto. */}
            {!temCreditos && <span>{t('pn_sem_creditos')}</span>}
            {ehTrial && !temCreditos && <span>{t('pl_free_cs')}</span>}

            {/* A data sai daqui quando não há crédito: ela já está no cartão
                do lado, e o mesmo "Termina em" duas vezes na mesma linha de
                cartões é ruído, não reforço. */}
            {dataLonga && temCreditos && (
              <span>
                {ehTrial ? t('pn_termina_em') : t('conta_renova_em')} <b>{dataLonga}</b>
              </span>
            )}
          </div>
          {/* Sem plano este cartão não tem ação própria: recarga exige plano, e
              o único caminho é assinar, que é o que o cartão do lado oferece
              com o nome certo. Dois botões diferentes indo para a mesma página
              é uma escolha que não existe. */}
          {!podeComprar ? (
            // Com o nome de quem paga a frase deixa de ser uma regra e vira um
            // caminho: a pessoa sabe com quem falar sem sair da tela. Sem o
            // nome (equipe que ainda não carregou) sobra a versão genérica.
            <p className="dash-cartao-nota">
              {donoDaEquipe
                ? <>{t('pn_sem_compra_a')} <b>{donoDaEquipe}</b>{t('pn_sem_compra_b')}</>
                : t('pn_sem_compra')}
            </p>
          ) : temPlano ? (
            <button className="dash-cartao-acao" onClick={() => router.push('/assinatura')}>
              {t('comprar_creditos')}
            </button>
          ) : null}
        </div>

        {(!ehMembroVis || ehDono) && !mostrarIlimitado && (() => {
          const demo = ehAdmin && modo !== 'real';
          const valorCent = demo ? 4900 : (conta.valor_centavos || 0);
          const assinouEm = demo ? '2025-01-15' : conta.assinou_em;
          const proxCobranca = demo ? new Date(Date.now() + 20 * 86400000).toISOString() : dataRenov;

          // Quem nunca assinou não tem preço, nem data de cobrança, nem
          // assinatura para ver. O cartão diz o que ela TEM (o teste, ou nada)
          // e oferece a única coisa que faz sentido ali, que é assinar.
          if (!temPlano) {
            return (
              <div className="dash-cartao">
                <span className="dash-cartao-rot">{t('nav_assinatura')}</span>
                <strong className="dash-cartao-num">
                  {ehTrial ? t('pn_teste_gratis') : t('pn_sem_plano')}
                </strong>
                <div className="dash-cartao-linhas">
                  {ehTrial ? (
                    <>
                      <span>{t('trial_dia')} <b>{diaDoTeste}</b> {t('trial_de7')}</span>
                      {dataLonga && (
                        <span>{t('pn_termina_em')} <b>{dataLonga}</b></span>
                      )}
                    </>
                  ) : (
                    <span>{t('pn_teste_terminou')}</span>
                  )}
                </div>
                <button className="dash-cartao-acao" onClick={() => router.push('/precos')}>
                  {t('assinar')}
                </button>
              </div>
            );
          }

          return (
            <div className="dash-cartao">
              <span className="dash-cartao-rot">{t('nav_assinatura')}</span>
              <strong className="dash-cartao-num">
                {valorCent > 0
                  ? <>{'R$ '}{(valorCent / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<em>{t('conta_mes')}</em></>
                  : '—'}
              </strong>
              {/* Mês por extenso, como no cartão do lado. Abreviado, o
                  português devolve "jan. de 2026" e "26 de set.", com ponto no
                  meio da frase e uma palavra cortada. */}
              <div className="dash-cartao-linhas">
                {assinouEm && (
                  <span>{t('conta_cliente_desde')} <b>{new Date(assinouEm).toLocaleDateString(loc, { month: 'long', year: 'numeric' })}</b></span>
                )}
                {proxCobranca && (
                  <span>{t('conta_prox_cobranca')} <b>{new Date(proxCobranca).toLocaleDateString(loc, { day: 'numeric', month: 'long' })}</b></span>
                )}
              </div>
              <button className="dash-cartao-acao" onClick={() => router.push('/assinatura')}>
                {t('conta_ver_assinatura')}
              </button>
            </div>
          );
        })()}

        {ehDono && equipe?.equipe && (
          <div className="dash-cartao">
            <span className="dash-cartao-rot">{t('nav_equipe')}</span>
            <strong className="dash-cartao-num">
              {(equipe.membros || []).length}
              <em> {t('conta_de')} {equipe.equipe.assentos} {t('pn_assentos')}</em>
            </strong>
            <div className="dash-cartao-linhas">
              <span><b>{vagos}</b> {t('pn_livres')}</span>
              {dataLonga && <span>{t('conta_renova_em')} <b>{dataLonga}</b></span>}
            </div>
            <button className="dash-cartao-acao" onClick={() => router.push('/workspace')}>
              {t('conta_gerenciar_equipe')}
            </button>
          </div>
        )}

        {ehMembroVis && !ehDono && (
          <div className="dash-cartao">
            <span className="dash-cartao-rot">{t('nav_equipe')}</span>
            {/* A FOTO DA EQUIPE, para quem é membro. O dono escolhe uma imagem
                em Equipe e ela não aparecia para ninguém além dele: quem entra
                por convite via só o nome, e a identidade que a empresa montou
                ficava invisível justo para quem ela existe para acolher. */}
            <div className="dash-cartao-eq">
              {equipeMembro?.foto
                ? <div className="dash-eq-foto" style={{ backgroundImage: `url(${equipeMembro.foto})` }} />
                : <div className="dash-eq-foto dash-eq-foto--vazia">
                    {(equipeMembro?.nome || 'E').charAt(0).toUpperCase()}
                  </div>}
              <strong className="dash-cartao-num">
                {equipeMembro?.nome || t('conta_sua_equipe')}
              </strong>
            </div>
            <div className="dash-cartao-linhas">
              <span>{t('pn_quem_gerencia')} <b>{equipeMembro?.dono_nome || equipeMembro?.dono_email || '—'}</b></span>
              <span>{t('pn_cred_da_equipe')}</span>
            </div>
            <button className="dash-cartao-acao" onClick={() => setConfSair(true)} disabled={saindo}>
              {saindo ? t('conta_saindo') : t('conta_sair_equipe')}
            </button>
          </div>
        )}
      </div>

      {ehDono && equipe?.equipe && (equipe.membros || []).length > 0 && (
        <>
          <p className="eyebrow dash-rotulo">{t('pn_quem_usando')}</p>
          <div className="dash-eq">
            <div className="dash-eq-cab">
              {equipe.equipe.foto && (
                <div className="dash-eq-foto" style={{ backgroundImage: `url(${equipe.equipe.foto})` }} />
              )}
              <div className="dash-eq-id">
                <strong>{equipe.equipe.nome || t('conta_sua_equipe')}</strong>
                <span>
                  {(equipe.membros || []).length} {t('conta_de')} {equipe.equipe.assentos} {t('conta_assentos_usados')}
                  {vagos > 0 && ` · ${vagos} ${vagos === 1 ? t('conta_livre') : t('conta_livres')}`}
                </span>
              </div>
              <button className="dash-eq-btn" onClick={() => router.push('/workspace')}>
                {t('conta_ver_equipe')}
              </button>
            </div>

            {(equipe.membros || []).filter((m) => m.status === 'ativo').map((m) => (
              <div key={m.id} className="dash-eq-membro">
                {/* A foto de quem tem, a inicial para quem não tem. A mesma
                    regra da lista de assentos em Equipe: as duas telas mostram
                    as mesmas pessoas e não podem desenhá-las de jeitos
                    diferentes. */}
                <span
                  className="dash-eq-av"
                  style={m.foto_url
                    ? { backgroundImage: `url(${m.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' }
                    : undefined}
                >
                  {m.foto_url ? '' : (m.nome || m.email || '?')[0].toUpperCase()}
                </span>
                <div className="dash-eq-quem">
                  <strong>
                    {m.email}
                    {m.eh_dono && <em> · {t('conta_voce')}</em>}
                  </strong>
                </div>
                <div className="dash-eq-uso">
                  <strong>{(m.creditos_usados ?? 0).toLocaleString(loc)}</strong>
                  <span>
                    {t('conta_de')} {(m.creditos_total ?? 0).toLocaleString(loc)} {t('conta_usados')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="eyebrow dash-rotulo">{t('pn_o_plugin')}</p>

      <div className="dash-plugin">
        <div className="dash-plugin-cab">
          <div className="dash-plugin-ico">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <path d="M9 3v5M15 3v5M6 8h12v5a6 6 0 01-12 0V8zM12 19v2"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="dash-plugin-txt">
            <strong>{t('conta_plugin_titulo')}</strong>
            <span>{t('conta_plugin_sub')}</span>
          </div>
          <button className="dash-plugin-btn" onClick={baixar} disabled={baixando}>
            {baixando ? t('conta_preparando') : t('conta_baixar_plugin')}
          </button>
        </div>

        <button
          className={'dash-plugin-abre' + (comoInstalar ? ' dash-plugin-abre--on' : '')}
          onClick={() => setComoInstalar((v) => !v)}
        >
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
               stroke="currentColor" strokeWidth="1.6">
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{comoInstalar ? t('conta_como_instalar') : t('conta_clique_instalar')}</span>
          {!comoInstalar && <em>{t('conta_6passos')}</em>}
        </button>

        {comoInstalar && (
          <div className="dash-plugin-passos">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="dash-passo">
                <span>{n}</span>
                <div>
                  <strong>{t(`conta_p${n}_t`)}</strong>
                  <p>{t(`conta_p${n}_b`)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {confSair && (
        <Confirma
          texto={t('conta_sair_confirm')}
          ok={t('conta_sair_equipe')}
          aoOk={sairEquipe}
          aoCancelar={() => setConfSair(false)}
        />
      )}
    </div>
    </AppShell>
  );
}

export default function Conta() {
  const { t } = useIdioma();
  return (
    <Suspense fallback={<AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>}>
      <ContaConteudo />
    </Suspense>
  );
}
