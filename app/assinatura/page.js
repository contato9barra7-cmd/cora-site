'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import ModalFiscal from '../../components/ModalFiscal';
import DropdownCora from '../../components/DropdownCora';
import { lerConta, abrirPortal, lerEquipe, iniciarCheckout, lerCobranca } from '../../lib/auth';
import CartaoPlano from '../../components/CartaoPlano';
import { planos, recargas, imagensPor } from '../../lib/planos';
import { itemDoPlano, itemDaRecarga } from '../../lib/stripe-prices';
import { useIdioma, tOpt, localeDeIdioma } from '../../lib/i18n';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

export default function Assinatura() {
  const { t, idioma } = useIdioma();
  const router = useRouter();
  const [conta, setConta] = useState(null);
  const [equipe, setEquipe] = useState(null);
  const [membros, setMembros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abrindo, setAbrindo] = useState(false);
  // modal de recarga
  const [recargaSel, setRecargaSel] = useState('g');   // o popular, por padrão

  // O pacote escolhido, para o botão poder dizer o que vai comprar
  const recargaEscolhida = recargas.find((r) => r.id === recargaSel);
  const [assentoSel, setAssentoSel] = useState('');
  const [comprando, setComprando] = useState(false);
  // Janela de CPF/CNPJ: abre quando o servidor recusa o checkout por falta de
  // dados fiscais (428), e a compra segue sozinha assim que a pessoa salva.
  const [modalFiscal, setModalFiscal] = useState(false);

  // O cartão que paga e a lista do que já foi cobrado. Falha em silêncio: uma
  // conta sem assinatura ainda não tem customer no Stripe, e isso não é erro.
  const [cobranca, setCobranca] = useState(null);
  const [fatura, setFatura] = useState(null);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setCarregando(false);
    if (c.eh_dono_equipe) {
      lerEquipe().then((d) => {
        if (d && d.equipe) setEquipe(d.equipe);
        if (d && d.membros) {
          const ativos = d.membros.filter(m => m.status === 'ativo');
          setMembros(ativos);
          if (ativos.length) setAssentoSel(String(ativos[0].id));
        }
      }).catch(() => {});
    }
  }, [router]);

  // Cada cartão compra a si mesmo. Antes existia um `recargaSel` e um botão
  // solto embaixo: dois gestos para uma decisão que já estava tomada quando a
  // pessoa olhou o preço. O id agora vem do cartão que foi clicado.
  useEffect(() => {
    let vivo = true;
    lerCobranca().then((d) => { if (vivo) setCobranca(d); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  /* MUDAR DE PLANO NÃO É UM CHECKOUT NOVO.
     Quem já paga e passa por um `checkout.session` ganha uma SEGUNDA
     assinatura, não uma troca, e a cobrança aqui é real. Quem sabe trocar
     mantendo a mesma assinatura, com o proporcional do mês já calculado, é o
     portal da Stripe. Então o cartão do plano mostra o preço e o que muda, e
     o clique leva para lá.

     Conta sem plano pago é outro caso: aí não há o que trocar, e o checkout
     normal é o caminho certo. */
  async function trocarPlano(id) {
    if (!temPlano) {
      setErro(''); setComprando(true);
      try {
        await iniciarCheckout(itemDoPlano(id, 'mensal'), null, null);
      } catch (e) {
        if (e.precisaCpf) { setModalFiscal(true); return; }
        setErro(e.message);
      } finally { setComprando(false); }
      return;
    }
    gerenciar();
  }

  async function comprarRecarga(qual) {
    const id = qual || recargaSel;
    setRecargaSel(id);
    setErro(''); setComprando(true);
    try {
      const priceId = itemDaRecarga(id);
      // se for dono, direciona ao assento escolhido; senão, recarga na própria conta
      const assento = conta.eh_dono_equipe ? assentoSel : null;
      await iniciarCheckout(priceId, null, assento);
    } catch (e) {
      // Sem CPF/CNPJ na conta, o servidor recusa o checkout (428). Antes isso
      // virava só a mensagem "Dados fiscais necessários" e a pessoa ficava sem
      // saída — o campo para preencher só existia na página de preços. Agora a
      // janela abre aqui também, e a compra segue sozinha depois de salvar.
      if (e.precisaCpf) {
        setModalFiscal(true);
        return;
      }
      // Recarga sem plano ativo: o aviso sozinho deixaria a pessoa parada numa
      // tela sem botão de assinar. Mostra o motivo e leva para os planos, que é
      // o que ela precisa fazer para poder comprar.
      if (e.precisaPlano) {
        setErro(t('recarga_precisa_plano'));
        setTimeout(() => router.push('/precos'), 1800);
        return;
      }
      setErro(e.message);
    } finally {
      setComprando(false);
      // (havia um `setModalRecarga(false)` aqui, chamando uma função que nunca
      //  foi declarada — a escolha de recarga é inline nesta tela, não um
      //  modal. Todo clique em "Comprar" jogava um ReferenceError, invisível
      //  porque a página navegava logo em seguida.)
    }
  }

  async function gerenciar() {
    setErro('');
    const guia = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    setAbrindo(true);
    try {
      await abrirPortal(guia);
    } catch (e) {
      setErro(e.message);
    } finally {
      setAbrindo(false);
    }
  }

  if (carregando) return <AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;
  if (!conta) return null;

  const ehAdmin = conta.is_admin === true;
  /* Duas perguntas diferentes, e elas se confundiram por um tempo.

     O CARTÃO do plano pergunta o que MOSTRAR: admin tem acesso ilimitado, e
     escrever "5.000 créditos, renova em 12 dias" na conta dele seria mentira.
     Por isso `ehAdmin` continua trocando o texto lá em cima.

     Os BOTÕES perguntam sobre dinheiro: existe uma assinatura viva nesta
     conta? Se existe, trocar de plano tem que passar pelo portal, senão um
     checkout novo abre uma SEGUNDA assinatura e cobra duas vezes. E se existe,
     comprar crédito também faz sentido. Admin com plano marcado entra aqui.

     Enquanto as duas eram a mesma pergunta, a tela chegava sem ação nenhuma
     para quem é admin: nem gerenciar, nem recarga, nem ver os planos. */
  const temPlano = !!conta.plano && conta.plano !== 'free' && conta.status === 'ativo';

  // "renova em 11 de agosto" é uma data; "29 dias" é o que a pessoa sente.
  const dataRenov = conta.eh_dono_equipe ? conta.equipe_renova_em : conta.expira_em;
  const diasAte = dataRenov
    ? Math.max(0, Math.ceil((new Date(dataRenov) - new Date()) / 86400000))
    : null;
  const ehDonoEquipe = conta.eh_dono_equipe === true;
  const loc = localeDeIdioma(idioma);

  /* ── A BANDEIRA DO CARTÃO ──
     A lista aqui não é escolhida: é o campo `card.brand` do Stripe inteiro.
     Vendendo fora do Brasil, uma bandeira sem desenho vira um retângulo cinza
     no lugar do cartão da pessoa.

     Cada marca é uma REDUÇÃO, e não o logotipo oficial: as formas e as cores
     que fazem a pessoa reconhecer o próprio cartão de relance, num espaço de
     46 por 30. Redesenhar logotipo de terceiro em fidelidade seria pior nos
     dois sentidos, no direito e no resultado.

     Desenho de todas elas lado a lado: ferramentas/bandeiras.html.

     `fundoBranco` é para as que já têm cor própria forte, e ficam melhor
     sobre branco com um fio. As outras preenchem a pastilha com a cor delas.

     O `unknown` e o que o Stripe passar a mandar amanhã caem na pastilha
     neutra, com quatro pontinhos. Ela nunca pode virar um vazio: enquanto a
     linha disser "Cartão terminado em 4242", a tela continua servindo. */
  const BANDEIRAS = {
    visa: {
      nome: 'Visa', fundoBranco: true,
      marca: (
        <svg width="38" height="14" viewBox="0 0 38 14">
          <text x="19" y="11.6" textAnchor="middle" fill="#1A1F71"
                fontFamily="Georgia, 'Times New Roman', serif" fontSize="13"
                fontStyle="italic" fontWeight="700" letterSpacing="1.2">VISA</text>
        </svg>
      ),
    },
    mastercard: {
      nome: 'Mastercard', fundoBranco: true,
      // Os dois círculos com a sobreposição no meio. É a marca inteira: ela se
      // reconhece sem nenhuma letra.
      marca: (
        <svg width="34" height="22" viewBox="0 0 34 22">
          <circle cx="13" cy="11" r="8.4" fill="#EB001B" />
          <circle cx="21" cy="11" r="8.4" fill="#F79E1B" />
          <path d="M17 4.7a8.4 8.4 0 0 0 0 12.6 8.4 8.4 0 0 0 0-12.6z" fill="#FF5F00" />
        </svg>
      ),
    },
    amex: {
      nome: 'American Express', fundo: '#2E77BC',
      marca: (
        <svg width="42" height="16" viewBox="0 0 42 16">
          <text x="21" y="12" textAnchor="middle" fill="#FFFFFF"
                fontFamily="inherit" fontSize="10" fontWeight="700"
                letterSpacing=".5">AMEX</text>
        </svg>
      ),
    },
    elo: {
      nome: 'Elo', fundo: '#000000',
      // Os três pontos coloridos, que é o que sobra da marca em tamanho pequeno.
      marca: (
        <svg width="38" height="16" viewBox="0 0 38 16">
          <circle cx="7" cy="8" r="3.4" fill="#FFCB05" />
          <circle cx="15" cy="8" r="3.4" fill="#EF4123" />
          <circle cx="23" cy="8" r="3.4" fill="#00A4E0" />
          <text x="31" y="11" textAnchor="middle" fill="#FFFFFF"
                fontFamily="inherit" fontSize="7.5" fontWeight="700">elo</text>
        </svg>
      ),
    },
    hipercard: {
      nome: 'Hipercard', fundo: '#B3131B',
      marca: (
        <svg width="42" height="16" viewBox="0 0 42 16">
          <text x="21" y="12" textAnchor="middle" fill="#FFFFFF"
                fontFamily="inherit" fontSize="9" fontWeight="700"
                letterSpacing=".3">HIPER</text>
        </svg>
      ),
    },
    discover: {
      nome: 'Discover', fundoBranco: true,
      // A bola laranja é o que se vê de longe num cartão Discover.
      marca: (
        <svg width="42" height="18" viewBox="0 0 42 18">
          <text x="3" y="12" fill="#111111" fontFamily="inherit" fontSize="7.5"
                fontWeight="700" letterSpacing=".2">DISC</text>
          <circle cx="34" cy="9" r="6.4" fill="#FF6000" />
        </svg>
      ),
    },
    diners: {
      nome: 'Diners Club', fundoBranco: true,
      // O disco partido: metade cheia, metade vazada.
      marca: (
        <svg width="30" height="20" viewBox="0 0 30 20">
          <circle cx="11" cy="10" r="8" fill="#0079BE" />
          <circle cx="19" cy="10" r="8" fill="none" stroke="#0079BE" strokeWidth="1.8" />
        </svg>
      ),
    },
    jcb: {
      nome: 'JCB', fundoBranco: true,
      // As três barras, azul, vermelha e verde.
      marca: (
        <svg width="36" height="20" viewBox="0 0 36 20">
          <rect x="1" y="2" width="10" height="16" rx="2.5" fill="#0E4C96" />
          <rect x="13" y="2" width="10" height="16" rx="2.5" fill="#C8102E" />
          <rect x="25" y="2" width="10" height="16" rx="2.5" fill="#1E8A45" />
        </svg>
      ),
    },
    unionpay: {
      nome: 'UnionPay', fundoBranco: true,
      marca: (
        <svg width="36" height="20" viewBox="0 0 36 20">
          <path d="M3 2h9l-3 16H0z" fill="#E21836" />
          <path d="M13 2h9l-3 16h-9z" fill="#00447C" />
          <path d="M23 2h9l-3 16h-9z" fill="#007B84" />
        </svg>
      ),
    },
    cartes_bancaires: {
      nome: 'Cartes Bancaires', fundoBranco: true,
      marca: (
        <svg width="34" height="20" viewBox="0 0 34 20">
          <rect x="1" y="2" width="32" height="16" rx="3" fill="#004F9F" />
          <path d="M1 10h32v8a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3z" fill="#009640" />
          <text x="17" y="13.6" textAnchor="middle" fill="#FFFFFF"
                fontFamily="inherit" fontSize="8" fontWeight="700">CB</text>
        </svg>
      ),
    },
    eftpos_au: {
      nome: 'eftpos', fundo: '#E4002B',
      marca: (
        <svg width="42" height="16" viewBox="0 0 42 16">
          <text x="21" y="12" textAnchor="middle" fill="#FFFFFF"
                fontFamily="inherit" fontSize="9" fontWeight="700">eftpos</text>
        </svg>
      ),
    },
    link: {
      nome: 'Link', fundo: '#00D66F',
      marca: (
        <svg width="36" height="16" viewBox="0 0 36 16">
          <text x="18" y="12" textAnchor="middle" fill="#011E0F"
                fontFamily="inherit" fontSize="9.5" fontWeight="700">link</text>
        </svg>
      ),
    },
  };

  function nomeDaBandeira(m) {
    const b = BANDEIRAS[m];
    if (b) return b.nome;
    // Uma bandeira nova do Stripe chega em minúsculas e com underscore. Vira
    // texto legível em vez de sumir.
    if (m && m !== 'unknown') {
      return m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return t('pn_cartao');
  }

  function Bandeira({ marca }) {
    const b = BANDEIRAS[marca];
    if (!b) {
      return (
        <span className="pag-bandeira" aria-hidden="true">
          <svg width="30" height="8" viewBox="0 0 30 8">
            <circle cx="3" cy="4" r="2.4" fill="currentColor" />
            <circle cx="11" cy="4" r="2.4" fill="currentColor" />
            <circle cx="19" cy="4" r="2.4" fill="currentColor" />
            <circle cx="27" cy="4" r="2.4" fill="currentColor" />
          </svg>
        </span>
      );
    }
    return (
      <span className={'pag-bandeira' + (b.fundoBranco ? ' pag-bandeira--marca' : '')}
            style={b.fundo ? { background: b.fundo } : undefined}
            aria-hidden="true">
        {b.marca}
      </span>
    );
  }

  const dataLonga = (iso) => new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' });
  const dinheiro = (centavos, moeda) => new Intl.NumberFormat(loc, {
    style: 'currency', currency: (moeda || 'brl').toUpperCase(),
  }).format((centavos || 0) / 100);

  return (
    <AppShell>
      <div className="admin-wrap">
        <div className="conta-cabeca">
          <div
            className="conta-cabeca__foto"
            style={conta.foto_url ? { backgroundImage: `url(${conta.foto_url})`, color: 'transparent' } : undefined}
          >{conta.foto_url ? '' : (conta.nome || conta.email || '?').charAt(0).toUpperCase()}</div>
          {/* A pastilha do cabeçalho já diz "Assinatura". Repetir a palavra
              trinta pixels abaixo não conta nada a mais, e é a mesma conclusão
              que os Promptadores escreveram no PromptHub deles: no bloco fica
              a PESSOA, e o nome do lugar fica só na pastilha. O h1 continua
              existindo, agora com o nome de quem está logado, que é de quem a
              assinatura é. */}
          <div className="conta-cabeca__txt">
            <p className="eyebrow">{t('assinatura_titulo')}</p>
            <h1 className="conta-cabeca__nome">{conta.nome || conta.email}</h1>
            <p className="conta-cabeca__email">{t('assinatura_recibos_stripe')}</p>
          </div>
        </div>
        {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

        {ehDonoEquipe && equipe ? (
          <div className="conta-card">
            <h2 className="conta-h2">{t('assinatura_titulo_equipe')}</h2>
            <p className="conta-p">
              {t('assinatura_equipe_pre')}<strong>{NOME_PLANO[equipe.plano] || equipe.plano}</strong>{t('assinatura_equipe_mid')}{equipe.assentos}{t('assinatura_equipe_pos')}
            </p>
            <button className="as-btn-cta" style={{ marginTop: 16 }} onClick={gerenciar} disabled={abrindo}>
              {abrindo ? t('assinatura_abrindo') : t('assinatura_gerenciar')}
            </button>
          </div>
        ) : (
          <div className="as-plano">
            <div className="as-plano-topo">
              <div>
                <div className="as-plano-rot">
                  <span>{t('assinatura_plano_atual')}</span>
                  {conta.status === 'ativo' && <em>{t('assinatura_ativo')}</em>}
                </div>
                <strong className="as-plano-nome">
                  {ehAdmin ? 'Admin' : (NOME_PLANO[conta.plano] || conta.plano)}
                </strong>
                <span className="as-plano-sub">
                  {ehAdmin ? t('assinatura_acesso_ilimitado')
                    : <>
                        {(conta.creditos_total ?? 0).toLocaleString(localeDeIdioma(idioma))} {t('assinatura_creditos_mes')}
                        {diasAte != null && <> · {t('assinatura_renova_em')}{diasAte}{t('assinatura_dias')}</>}
                      </>}
                </span>
              </div>

              {!ehAdmin && conta.valor_centavos > 0 && (
                <div className="as-plano-preco">
                  <strong>
                    {'R$ '}{((conta.valor_centavos || 0) / 100).toLocaleString(localeDeIdioma(idioma), { minimumFractionDigits: 2 })}
                    <em>{t('assinatura_por_mes')}</em>
                  </strong>
                  {conta.assinou_em && (
                    <span>
                      {t('assinatura_cliente_desde')}{' '}
                      {new Date(conta.assinou_em).toLocaleDateString(localeDeIdioma(idioma), { month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="as-plano-pe">
              {temPlano ? (
                /* Mudar de plano acontece dentro do portal do Stripe. Um botão
                   levando a /precos era um desvio: a pessoa ia ver a tabela e
                   voltava para clicar aqui de qualquer jeito. */
                <button className="as-btn-cta" onClick={gerenciar} disabled={abrindo}>
                  {abrindo ? t('assinatura_abrindo') : t('assinatura_gerenciar')}
                </button>
              ) : (
                <Link href="/precos" className="as-btn-cta">{t('assinatura_ver_planos')}</Link>
              )}
            </div>
          </div>
        )}

        {/* ── MUDAR DE PLANO ──
            Os cartões são os MESMOS de /precos, o componente e a folha, e não
            uma cópia parecida: quem muda um preço, um crédito ou um recurso em
            `lib/planos.js` muda as duas telas de uma vez. O `pr` é o escopo
            daquela folha, e é ele que traz o desenho inteiro para cá, com o
            zoom do hover e o selo do destaque.

            O Free fica de fora: aqui a pergunta é para onde subir, e ninguém
            "muda para o Free". Numa equipe também não aparece, porque quem
            escolhe o plano lá é o dono, pelo Teams. */}
        {!conta.eh_dono_equipe && !conta.equipe_id && (
          <div className="conta-card">
            <h2 className="conta-h2">{t('assinatura_mudar_titulo')}</h2>
            <p className="conta-p">{t('assinatura_mudar_sub')}</p>
            <div className="pr as-planos">
              <div className="planos">
                {planos.filter((p) => p.mensal > 0).map((p) => (
                  <CartaoPlano
                    key={p.id}
                    p={p}
                    atual={p.id === conta.plano}
                    rotulo={temPlano ? t('assinatura_mudar_para') : undefined}
                    ocupado={comprando || abrindo}
                    aoClicar={trocarPlano}
                  />
                ))}
              </div>
            </div>
            {temPlano && <p className="as-planos__nota">{t('assinatura_mudar_nota')}</p>}
          </div>
        )}

        {(temPlano || conta.eh_dono_equipe) && (
          <div className="conta-card">
            <h2 className="conta-h2">{t('assinatura_mais_creditos')}</h2>
            <p className="conta-p">
              {t('assinatura_recarga_info')}
            </p>

            {/* O dono escolhe para QUEM vai a recarga: numa equipe, comprar
                crédito sem dizer o destino não quer dizer nada. */}
            {conta.eh_dono_equipe && (
              membros.length ? (
                <div className="rec-destino">
                  <label className="perfil-lbl">{t('assinatura_enviar_para')}</label>
                  <DropdownCora
                    valor={assentoSel}
                    onEscolher={(v) => setAssentoSel(v)}
                    opcoes={membros.map((m) => ({
                      v: String(m.id),
                      n: m.email + (m.eh_dono ? t('assinatura_voce') : ''),
                    }))}
                  />
                </div>
              ) : (
                <p className="conta-p" style={{ color: 'var(--alerta)' }}>
                  {t('assinatura_sem_membros')}
                </p>
              )
            )}

            {/* Um botão por cartão, como os planos na página de preços. O
                cartão não é mais um <button>, porque agora ele tem um dentro,
                e botão dentro de botão não é HTML válido. */}
            <div className="rec-grade">
              {recargas.map((r) => (
                <div key={r.id} className={'rec-op' + (r.popular ? ' rec-op--pop' : '')}>
                  {r.popular && <em className="rec-tag">{t('assinatura_popular')}</em>}
                  <span className="rec-nome">{t(r.nomeKey)}</span>
                  <strong>{r.creditos.toLocaleString(localeDeIdioma(idioma))}</strong>
                  <span className="rec-preco">{t('pn_creditos_min')}</span>
                  {/* O que o tamanho RESOLVE, e depois quantas imagens ele dá.
                      A conta sai do custo real de um render e não de um número
                      escrito à mão: mexer no custo e esquecer daqui faria o
                      cartão prometer o que não entrega. A regra de quando o
                      crédito é gasto ficou na chamada em cima, uma vez só: em
                      quatro cartões ela aparecia cinco vezes na mesma tela. */}
                  <span className="rec-frase">
                    {t(r.fraseKey)} {t('pn_da_umas')} {imagensPor(r.creditos)} {t('pn_imagens')}
                  </span>
                  <span className="rec-prazo">{t('pn_vale_6_meses')}</span>
                  {/* O preço mora no botão, e não no corpo do cartão: é no
                      clique que a pessoa assume o valor, e ali ele também
                      preenche uma pílula que com um "Comprar" sozinho ficava
                      oca. */}
                  <button
                    className="rec-comprar"
                    onClick={() => comprarRecarga(r.id)}
                    disabled={comprando || (conta.eh_dono_equipe && !membros.length)}
                  >
                    {comprando && recargaSel === r.id
                      ? t('assinatura_abrindo_pagamento')
                      : `${t('pn_comprar_por')} R$ ${r.preco}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FORMA DE PAGAMENTO ──
            O número do cartão nunca passa por aqui: o Stripe guarda ele, e a
            gente só mostra bandeira e os quatro últimos, que é o que a pessoa
            usa para reconhecer qual cartão é. Trocar abre o portal. */}
        <div className="conta-card">
          <h2 className="conta-h2">{t('pn_pagamento')}</h2>
          <p className="conta-p">{t('pn_pagamento_sub')}</p>
          {cobranca?.cartao ? (
            <div className="pag-linha">
              <Bandeira marca={cobranca.cartao.marca} />
              <div className="pag-txt">
                <strong>
                  {nomeDaBandeira(cobranca.cartao.marca)} {t('pn_pagamento_termina')} {cobranca.cartao.fim}
                </strong>
                {cobranca.cartao.mes && cobranca.cartao.ano && (
                  <span>
                    {t('pn_pagamento_vence')} {String(cobranca.cartao.mes).padStart(2, '0')}/{cobranca.cartao.ano}
                  </span>
                )}
              </div>
              {/* Leva para o portal do Stripe, o mesmo do "Gerenciar
                  assinatura": e o `title` diz isso antes do clique, para o
                  salto para fora do site não ser surpresa. */}
              <button className="pag-btn" onClick={gerenciar} disabled={abrindo}
                      title={t('pn_atualizar_titulo')}>
                {abrindo ? t('assinatura_abrindo') : t('pn_atualizar')}
              </button>
            </div>
          ) : (
            <p className="pag-vazio">{t('pn_pagamento_sem')}</p>
          )}

          {/* ── QUANDO A COBRANÇA NÃO PASSOU ──
              Sem isto a pessoa via o cartão listado com cara de tudo certo
              enquanto a cobrança do mês tinha sido recusada e o acesso já
              tinha caído. O motivo vem do Stripe e é traduzido no servidor,
              porque o texto de lá é em inglês e fala com quem integra.
              O que fazer aponta para o mesmo Atualizar logo acima, que é o
              portal do Stripe. */}
          {cobranca?.problema && (
            <div className="pag-erro" role="status">
              <strong>{t('pn_cartao_titulo_' + cobranca.problema.tipo)}</strong>
              <span>{t('pn_cartao_o_que_fazer')}</span>
              {(cobranca.problema.desde || cobranca.problema.tentativas > 1) && (
                <span className="pag-erro__quando">
                  {cobranca.problema.desde && (
                    <>{t('pn_cartao_desde')} {dataLonga(cobranca.problema.desde)}. </>
                  )}
                  {cobranca.problema.tentativas > 1 && (
                    <>{cobranca.problema.tentativas} {t('pn_cartao_tentativas')}</>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── FATURAS ── */}
        <div className="conta-card">
          <h2 className="conta-h2">{t('pn_faturas')}</h2>
          <p className="conta-p">{t('pn_faturas_sub')}</p>
          {(cobranca?.faturas || []).length ? (
            <div className="fat-rolo">
              <table className="fat">
                <thead>
                  <tr>
                    <th>{t('pn_col_data')}</th>
                    <th>{t('pn_col_desc')}</th>
                    <th style={{ textAlign: 'right' }}>{t('pn_col_total')}</th>
                    <th>{t('pn_col_status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cobranca.faturas.map((f) => (
                    <tr key={f.id}>
                      <td className="fat__data">{dataLonga(f.data)}</td>
                      <td className="fat__desc">{f.descricao}</td>
                      <td className="fat__total">{dinheiro(f.total_centavos, f.moeda)}</td>
                      <td>
                        <span className={'fat-selo' + (f.status === 'paga' ? '' : ' fat-selo--aberta')}>
                          {f.status === 'paga' ? t('pn_paga') : t('pn_aberta')}
                        </span>
                      </td>
                      <td className="fat__acao">
                        <button className="fat-ver" onClick={() => setFatura(f)}>{t('pn_ver')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="fat-vazio">{t('pn_faturas_sem')}</p>
          )}
        </div>
      </div>

      {/* ── A FATURA ABERTA ──
          Mesma casca do e-mail: faixa no alto, marca, cartão. Quem recebe o
          recibo por e-mail e depois abre este aqui reconhece os dois como a
          mesma empresa. */}
      {fatura && (
        <div className="doc-fundo" onClick={() => setFatura(null)}>
          {/* O tamanho do papel só pode ser dito num `@page`, e `@page` não
              aceita seletor: escrito no globals.css ele valeria para toda
              impressão do site. Por isso esta folha nasce e morre com a
              janela da fatura, e o A4 vale só enquanto ela está aberta.
              Sem declarar o tamanho, o navegador usa o papel da última
              impressão, que em muita gente é Carta. Margem zero porque o
              recuo é da folha, e assim a faixa chega na borda do papel. */}
          <style>{'@page{size:A4;margin:0}'}</style>
          <div className="doc" onClick={(e) => e.stopPropagation()}>
            <div className="doc__faixa" aria-hidden="true" />
            <div className="doc__miolo">
              <div className="doc__marca" role="img" aria-label="Cora Render" />

              <div className="doc__topo">
                <div>
                  <div className="doc__tit">{t('pn_fatura')}</div>
                  <div className="doc__num">
                    {fatura.numero ? `Nº ${fatura.numero} · ` : ''}{dataLonga(fatura.data)}
                  </div>
                </div>
                <span className={'fat-selo' + (fatura.status === 'paga' ? '' : ' fat-selo--aberta')}>
                  {fatura.status === 'paga' ? t('pn_paga') : t('pn_aberta')}
                </span>
              </div>

              <div className="doc__quem">
                <div className="doc__bloco">
                  <span>{t('pn_de')}</span>
                  <p><b>9BARRA7 Academy</b><br />CNPJ 43.879.950/0001-40<br />contato@corarender.com</p>
                </div>
                <div className="doc__bloco">
                  <span>{t('pn_para')}</span>
                  <p><b>{conta.nome || conta.email}</b><br />{conta.email}</p>
                </div>
              </div>

              <table className="doc__itens">
                <thead>
                  <tr><th>{t('pn_col_desc')}</th><th>{t('pn_valor')}</th></tr>
                </thead>
                <tbody>
                  {(fatura.itens && fatura.itens.length ? fatura.itens : [{
                    descricao: fatura.descricao, valor_centavos: fatura.total_centavos,
                  }]).map((it, i) => (
                    <tr key={i}>
                      <td>{it.descricao}</td>
                      <td>{dinheiro(it.valor_centavos, fatura.moeda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="doc__total">
                <span>{t('pn_total_pago')}</span>
                <strong>{dinheiro(fatura.total_centavos, fatura.moeda)}</strong>
              </div>

              <p className="doc__pe">
                {fatura.status === 'paga' && (
                  <>
                    {t('pn_pago_em')} {dataLonga(fatura.data)}
                    {cobranca?.cartao
                      ? ` ${t('pn_no_cartao')} ${nomeDaBandeira(cobranca.cartao.marca)} ${t('pn_pagamento_termina')} ${cobranca.cartao.fim}.`
                      : '.'}
                    {' '}
                  </>
                )}
                {t('pn_fatura_pe')}
              </p>

              <div className="doc__acoes">
                {/* "Salvar em PDF" e não "Imprimir": a janela do navegador
                    abre com "Salvar como PDF" já disponível, e é isso que a
                    pessoa quer. O @media print do globals.css deixa só o
                    documento na folha, em A4. */}
                <button className="doc__bt" onClick={() => window.print()}>{t('pn_salvar_pdf')}</button>
                <button className="doc__bt doc__bt--linha" onClick={() => setFatura(null)}>{t('fechar')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalFiscal
        aberto={modalFiscal}
        onFechar={() => setModalFiscal(false)}
        onSalvo={() => { setModalFiscal(false); comprarRecarga(); }}
      />
    </AppShell>
  );
}
