'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  FICHA DA CONTA — a tela do suporte
//
//  Abre com a lista de todas as contas em ordem alfabética; a busca filtra essa
//  mesma lista. Entrar numa conta mostra tudo sobre ela num lugar só: acesso,
//  créditos por balde, assinatura, equipe, dispositivos, uso e a linha do tempo.
//
//  Existe para acabar com o "abre o Railway e roda SQL na mão", que era como
//  toda pergunta de cliente era respondida até aqui.
//
//  A lista vem inteira do servidor e o filtro roda AQUI: assim digitar filtra na
//  hora, sem ida e volta a cada tecla.
//
//  Componente separado de propósito: o /admin já tem 1.200 linhas e cinco abas.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { adminGeracoesDaConta } from '../lib/geracoes';
import DropdownCora from './DropdownCora';
import {
  adminBuscarContas, adminFichaDaConta, adminExtratoDaConta, adminCreditar,
  adminMudarPlano, adminCancelar, adminDeletarConta, adminPersonificar, adminGerente, adminTirarAdmin, adminCreditosReais,
} from '../lib/auth';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };
const PLANOS = ['free', 'starter', 'pro', 'studio'];

// ── O painel do Stripe: teste ou produção ──
//
// O caminho estava fixo em `/test/`. Depois do lançamento isso levaria o suporte
// ao painel de TESTE — que abre normalmente, com uma busca que não acha ninguém.
// O modo de falha é o pior possível para esta tela: parece funcionar, e a
// conclusão natural de "não achei o cliente no Stripe" é que ele não pagou.
//
// O padrão é o modo de teste de propósito: um ambiente sem a variável é um
// ambiente de desenvolvimento, e errar para o lado do painel de teste não
// estraga nada. Em produção, defina NEXT_PUBLIC_STRIPE_MODO=live no Vercel.
const STRIPE_MODO = process.env.NEXT_PUBLIC_STRIPE_MODO === 'live' ? '' : 'test/';
const stripeCliente = (email) =>
  `https://dashboard.stripe.com/${STRIPE_MODO}customers?email=${encodeURIComponent(email)}`;

// Cancelar e deletar exigem digitar o e-mail da conta. É de propósito que
// incomode: a Ficha deixa agir rápido, e as duas ações irreversíveis precisam
// de um passo que não dá para fazer no automático. Ler o e-mail em voz alta é
// também a última chance de perceber que se está na conta errada.
const DESTRUTIVAS = { cancelar: true, deletar: true };

function data(d, comHora) {
  if (!d) return '—';
  const x = new Date(d);
  const dia = x.toLocaleDateString('pt-BR');
  return comHora ? `${dia} ${x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : dia;
}
// Moeda não-BRL sai com o CÓDIGO na frente ("USD 29.00") — omitir deixava o
// suporte lendo valor internacional como se fosse R$ na hora do reembolso.
const dinheiro = (c, m) => {
  if (c == null) return '—';
  const moeda = (m || 'brl').toUpperCase();
  return `${moeda === 'BRL' ? 'R$' : moeda} ${(c / 100).toFixed(2)}`;
};
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));

// O motivo do bloqueio, em uma frase. É a primeira pergunta do suporte, e
// deduzir isso de quatro campos era justamente o trabalho manual que sobrava.
/* O problema da cobranca, em uma frase.
   O servidor devolve o TIPO, e nao o texto, porque a mesma causa e escrita
   diferente para quem paga ("este cartao venceu") e para o suporte ("o cartao
   dela venceu"). Aqui e a versao do suporte. */
const FRASE_DO_PROBLEMA = {
  expirado: 'O cartão venceu',
  sem_saldo: 'A cobrança não passou por limite ou saldo',
  dados: 'Algum dado do cartão está errado',
  confirmar: 'O banco pediu uma confirmação que ficou pendente',
  nao_aceito: 'O banco não aceita esta cobrança',
  recusado: 'A última cobrança foi recusada',
};

function fraseDoProblema(p) {
  if (!p) return null;
  let f = FRASE_DO_PROBLEMA[p.tipo] || FRASE_DO_PROBLEMA.recusado;
  if (p.desde) f += ' em ' + data(p.desde);
  if (p.tentativas > 1) f += ', após ' + p.tentativas + ' tentativas';
  return f;
}

function motivoDoAcesso(a, conta) {
  if (!a) return { texto: 'sem plano', cor: '#8E8E88' };
  // Preto, e nao roxo: o roxo saiu da marca em 06/09/2026, e cor que ficou
  // para tras e a que mais denuncia uma tela que nao foi revisada. Admin nao
  // e alerta nem confirmacao, entao ele nao pede cor de sinal.
  /* "Admin, acesso ilimitado" era o texto fixo aqui, e ele nasceu quando o
     admin era o unico jeito de ter credito sem limite. Com o gerente, esse
     rotulo passou a chamar de admin quem nao e: a mesma classe de erro que
     este arquivo acabou de consertar em outro lugar, e o tipo de coisa que
     leva alguem a procurar a aba Admin na conta de outra pessoa. */
  if (a.ilimitado) {
    return {
      texto: conta?.is_admin ? 'Admin, acesso ilimitado'
        : conta?.gerente ? 'Gerente, gera sem gastar crédito'
        : 'Acesso ilimitado',
      cor: '#111111',
    };
  }
  if (a.pode_gerar) return { texto: 'Pode gerar normalmente', cor: '#1F7A44' };
  if (a.equipe_suspenso) return { texto: 'BLOQUEADO — suspenso pela equipe (excedente de assentos)', cor: '#C8342A' };
  if (a.eh_trial && a.trial_expirado) return { texto: 'BLOQUEADO — teste de 7 dias terminou', cor: '#C8342A' };
  if (a.status === 'inativo') return { texto: 'BLOQUEADO — pagamento falhou', cor: '#C8342A' };
  if (a.status === 'expirado') return { texto: 'BLOQUEADO — período pago venceu', cor: '#C8342A' };
  return { texto: `BLOQUEADO — ${a.status || 'sem plano ativo'}`, cor: '#C8342A' };
}

// ── Quanto já foi consumido, para decidir reembolso ──
//
// Duas leituras, porque são duas perguntas diferentes e a errada custa caro:
//
//   ciclo atual   — o que `creditos_usados` sempre soube. Responde certo para
//                   um mensal no primeiro mês.
//   desde a compra— soma os débitos desde `assinou_em`. É o único número que
//                   serve para um ANUAL: a cota renova todo mês, então quem
//                   está no oitavo mês tem um "ciclo atual" baixo e pode já ter
//                   gasto quase tudo que pagou.
//
// O equivalente em dinheiro é proporção, não custo real de IA: serve para dizer
// "devolver o valor cheio devolve mais do que sobrou", que é a decisão em jogo.
function consumoDaConta(ficha) {
  const a = ficha?.acesso;
  const c = ficha?.consumo;
  const ass = ficha?.assinatura;
  if (!a || !c || !ass) return null;
  // Conta ilimitada usa `creditos_total: -1` como sentinela. Sem esta saída, a
  // cota contratada viraria negativa e a Ficha exibiria "0 de -8 créditos". E
  // não há o que decidir: numa conta ilimitada não existe reembolso a calcular.
  if (a.ilimitado || (a.creditos_total ?? 0) < 0) return null;

  const pct = (parte, todo) => (todo > 0 ? Math.round((parte / todo) * 100) : null);
  const pctCiclo = pct(a.creditos_usados, a.creditos_total);
  const pctDesde = pct(c.creditos_liquidos, c.contratado);
  const proporcao = (valor, p) => (p == null ? null : Math.round((valor || 0) * p / 100));

  return {
    moeda: c.moeda,
    ciclo: {
      usados: a.creditos_usados, total: a.creditos_total, pct: pctCiclo,
      cobranca: ass.valor_centavos || 0,
      equivalente: proporcao(ass.valor_centavos, pctCiclo),
    },
    desde: {
      creditos: c.creditos_liquidos, contratado: c.contratado, pct: pctDesde,
      pago: c.pago_centavos, quando: c.desde,
      equivalente: proporcao(c.pago_centavos, pctDesde),
    },
  };
}

// Acima de 70% consumido, devolver o valor cheio é prejuízo dos dois lados: a
// geração já foi paga ao provedor. A cor diz isso antes da leitura do número.
function corDoConsumo(p) {
  if (p == null) return 'var(--ink2)';
  if (p >= 70) return '#C8342A';
  if (p >= 40) return '#B7791F';
  return '#1F7A44';
}

// ── Extrato: o rótulo de cada situação, calculada no servidor ──
// A cor carrega a leitura: verde = dinheiro devolvido, cinza = caso normal,
// âmbar = ainda aberto, vermelho = precisa de gente. O texto de "em voo" ganha
// a idade na hora de exibir — 10min é geração rodando, 5h é crédito preso.
const SITUACAO_EXTRATO = {
  devolvido:            { texto: 'devolvido ✓',            cor: '#1F7A44' },
  devolvido_parcial:    { texto: 'devolvido parcial',      cor: '#B7791F' },
  entregue:             { texto: 'entregue',               cor: 'var(--ink3)' },
  em_voo:               { texto: 'em voo',                 cor: '#B7791F' },
  conferir:             { texto: 'CONFERIR',               cor: '#C8342A' },
  sem_registro:         { texto: '—',                      cor: 'var(--ink3)' },
  devolucao:            { texto: 'devolução',              cor: '#1F7A44' },
  devolucao_pos_deploy: { texto: 'devolução (pós-deploy)', cor: '#1F7A44' },
};

function idade(d) {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 60) return `há ${min}min`;
  const h = Math.round(min / 60);
  return h < 48 ? `há ${h}h` : `há ${Math.round(h / 24)}d`;
}

function Linha({ rotulo, children }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
      <span style={{ minWidth: 170, color: 'var(--ink3)', fontSize: 13, lineHeight: 1.7 }}>{rotulo}</span>
      <span style={{ fontSize: 13, lineHeight: 1.7 }}>{children}</span>
    </div>
  );
}

// `abrirConta` ({ id, seq }) vem das tabelas do painel: elas viraram lista, e
// clicar numa linha traz para cá. O `seq` existe porque clicar DUAS vezes na
// mesma conta precisa reabrir — só o id não mudaria e o efeito não dispararia.
export default function FichaConta({ abrirConta }) {
  const [busca, setBusca] = useState('');
  const [contas, setContas] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [aba, setAba] = useState('resumo');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  // ── Extrato ──
  // Carrega quando a aba abre, não junto com a ficha: são até 500 linhas que a
  // maioria das visitas ao painel nunca olha. Trocar o período recarrega.
  const [extrato, setExtrato] = useState(null);
  const [extratoDias, setExtratoDias] = useState(90);
  /* As imagens da pessoa. `imagensDe` guarda de QUAL conta elas são: sem isso,
     trocar de conta com a aba aberta mostraria as imagens da anterior por um
     instante, e nesta aba isso não é um piscar feio, é mostrar o trabalho de
     um cliente na ficha de outro. */
  const [imagens, setImagens] = useState(null);
  const [imagensDe, setImagensDe] = useState(null);
  const [imagensCarregando, setImagensCarregando] = useState(false);
  const [imagensErro, setImagensErro] = useState('');
  const [extratoErro, setExtratoErro] = useState('');
  const [extratoCarregando, setExtratoCarregando] = useState(false);

  // ── Ações ──
  // `acao` é qual painel de confirmação está aberto. Só um por vez: duas
  // confirmações abertas ao mesmo tempo é como se aplica a errada.
  const [acao, setAcao] = useState(null);
  const [planoNovo, setPlanoNovo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [confirmaEmail, setConfirmaEmail] = useState('');
  const [executando, setExecutando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [menu, setMenu] = useState(false);

  // Fecha o menu ao clicar em qualquer outro lugar e ao apertar Esc. O listener
  // só existe enquanto o menu está aberto — deixá-lo ligado o tempo todo faria
  // cada clique da página passar por ele à toa.
  useEffect(() => {
    if (!menu) return;
    const fora = () => setMenu(false);
    const tecla = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('click', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('click', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [menu]);

  // A lista chega uma vez, ao abrir a aba.
  useEffect(() => {
    let vivo = true;
    adminBuscarContas('')
      .then((r) => { if (vivo) setContas(r); })
      .catch((e) => { if (vivo) setErro(e.message); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, []);

  function fecharAcao() {
    setAcao(null); setConfirmaEmail(''); setQuantidade(''); setPlanoNovo('');
  }

  // Abrir um painel limpa o resultado do anterior: deixar "7 créditos
  // devolvidos" no verde enquanto se confirma uma EXCLUSÃO mistura o que já
  // aconteceu com o que está prestes a acontecer.
  function abrirAcao(tipo) {
    fecharAcao();
    setErro(''); setAviso('');
    setAcao(tipo);
    if (tipo === 'plano') setPlanoNovo(ficha?.acesso?.plano || 'free');
  }

  async function abrir(id) {
    setErro(''); setAviso(''); setCarregando(true); fecharAcao();
    // O extrato é da conta anterior: sem esta limpeza, trocar de conta com a
    // aba Extrato aberta mostraria as transações de outra pessoa por um instante.
    setExtrato(null); setExtratoErro('');
    setImagens(null); setImagensDe(null); setImagensErro('');
    try {
      setFicha(await adminFichaDaConta(id));
      setAba('resumo');
    } catch (ex) { setErro(ex.message); }
    finally { setCarregando(false); }
  }

  // O extrato chega quando a aba abre (e recarrega quando o período muda).
  // `extrato` guarda o resultado: reabrir a aba não refaz a chamada.
  useEffect(() => {
    if (aba !== 'extrato' || !ficha?.conta?.id) return;
    if (extrato && extrato.conta.id === ficha.conta.id && extrato.dias === extratoDias) return;
    let vivo = true;
    setExtratoCarregando(true); setExtratoErro('');
    adminExtratoDaConta(ficha.conta.id, extratoDias)
      .then((r) => { if (vivo) setExtrato(r); })
      .catch((e) => { if (vivo) setExtratoErro(e.message); })
      .finally(() => { if (vivo) setExtratoCarregando(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, extratoDias, ficha?.conta?.id]);

  /* As imagens chegam quando a aba abre, e só. Elas NÃO vêm junto da ficha:
     abrir a ficha de alguém é rotina do suporte, e ver o arquivo de imagens
     dela não é. Carregar sob demanda é o que mantém as duas coisas separadas,
     e é o que faz o registro de acesso significar alguma coisa: ele marca
     quem foi olhar, e não quem abriu uma ficha. */
  useEffect(() => {
    if (aba !== 'imagens' || !ficha?.conta?.id) return;
    if (imagens && imagensDe === ficha.conta.id) return;
    let vivo = true;
    setImagensCarregando(true); setImagensErro('');
    adminGeracoesDaConta(ficha.conta.id)
      .then((lotes) => {
        if (!vivo) return;
        /* Os lotes viram uma fila de imagens: na ficha o que importa é o que
           a pessoa fez, e não como as variações foram agrupadas. A data vem
           do lote, porque é dele. */
        const fila = [];
        (lotes || []).forEach((lote) => {
          (lote.itens || []).forEach((item) => {
            if (item.url) fila.push({ id: item.id, url: item.url, quando: lote.criadoEm });
          });
        });
        setImagens(fila);
        setImagensDe(ficha.conta.id);
      })
      .catch((e) => { if (vivo) setImagensErro(e.message); })
      .finally(() => { if (vivo) setImagensCarregando(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, ficha?.conta?.id]);

  // Recarrega a ficha depois de agir. Não é enfeite: é o que faz a consequência
  // aparecer na hora — o evento novo na aba Logs, o plano novo no cabeçalho.
  // Sem isto a tela continuaria mostrando o estado anterior à ação.
  async function recarregar(id) {
    try {
      setFicha(await adminFichaDaConta(id));
      // A lista do menu também envelheceu (nome/plano podem ter mudado).
      adminBuscarContas('').then(setContas).catch(() => {});
    } catch (ex) { setErro(ex.message); }
  }

  async function executar() {
    const conta = ficha.conta;

    // Trava das destrutivas: o e-mail digitado precisa bater com o da conta.
    if (DESTRUTIVAS[acao] && confirmaEmail.trim().toLowerCase() !== (conta.email || '').toLowerCase()) {
      setErro('O e-mail digitado não confere com o desta conta.');
      return;
    }

    setErro(''); setAviso(''); setExecutando(true);
    try {
      if (acao === 'plano') {
        await adminMudarPlano(conta.id, planoNovo);
        setAviso(`Plano alterado para ${NOME_PLANO[planoNovo] || planoNovo}.`);
      } else if (acao === 'creditar') {
        const q = parseInt(quantidade, 10);
        if (!Number.isInteger(q) || q <= 0) { setErro('Informe um número inteiro maior que zero.'); setExecutando(false); return; }
        await adminCreditar(conta.id, q);
        setAviso(`${q} crédito(s) devolvidos.`);
      } else if (acao === 'personificar') {
        await adminPersonificar(conta.id);
        // Recarga inteira de propósito: a sessão do navegador mudou de dono, e
        // qualquer estado que sobrasse em memória seria do admin anterior.
        window.location.href = '/conta';
        return;
      } else if (acao === 'tirar-admin') {
        await adminTirarAdmin(conta.id);
        setAviso('Não é mais admin: a aba some e as rotas de admin recusam.');
      } else if (acao === 'creditos-reais') {
        const ligar = !ficha.conta.creditos_reais;
        await adminCreditosReais(conta.id, ligar);
        setAviso(ligar
          ? 'Agora esta conta gasta crédito de verdade.'
          : 'Esta conta voltou a não gastar crédito.');
      } else if (acao === 'gerente') {
        const virar = !ficha.conta.gerente;
        await adminGerente(conta.id, virar);
        setAviso(virar
          ? 'Agora é gerente: gera sem consumir crédito, e continua sem o admin.'
          : 'Não é mais gerente: volta a consumir crédito do plano.');
      } else if (acao === 'cancelar') {
        await adminCancelar(conta.id);
        setAviso('Plano cancelado — a conta voltou para Free.');
      } else if (acao === 'deletar') {
        await adminDeletarConta(conta.id);
        // A conta não existe mais: não há ficha para onde voltar.
        setContas((cs) => cs.filter((c) => c.id !== conta.id));
        setFicha(null);
        fecharAcao();
        setAviso(`Conta ${conta.email} deletada.`);
        setExecutando(false);
        return;
      }
      fecharAcao();
      await recarregar(conta.id);
    } catch (ex) {
      setErro(ex.message);
    } finally {
      setExecutando(false);
    }
  }

  useEffect(() => {
    if (abrirConta && abrirConta.id) abrir(abrirConta.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirConta && abrirConta.seq]);

  const termo = busca.trim().toLowerCase();
  const filtradas = !termo ? contas : contas.filter((c) =>
    (c.email || '').toLowerCase().includes(termo) ||
    (c.nome || '').toLowerCase().includes(termo) ||
    String(c.id) === termo);

  const a = ficha?.acesso;
  const consumo = consumoDaConta(ficha);
  const motivo = motivoDoAcesso(a, ficha?.conta);
  /* O cartao e o problema vem prontos do servidor, da MESMA funcao que monta
     a tela da propria pessoa. Duplicar a leitura aqui faria as duas darem
     versoes diferentes do mesmo cartao, e a divergencia so apareceria numa
     conversa em que uma das duas ja estivesse errada. */
  const cartao = ficha?.cobranca?.cartao || null;
  const problemaCartao = fraseDoProblema(ficha?.cobranca?.problema);
  const faturasConta = ficha?.cobranca?.faturas || [];
  const aceitesConta = ficha?.aceites || [];
  /* Versao aceita diferente da que esta no ar quer dizer que a pessoa ainda
     vai cair na tela de reaceite no proximo acesso. E a resposta de "por que
     ela diz que apareceu um aviso". */
  const versaoNoAr = ficha?.versao_legal_atual || null;

  // ── A LISTA ──────────────────────────────────────────────────────────────
  if (!ficha) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', marginBottom: 20 }}>
          <input
            className="login-input" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="e-mail, nome ou id da conta"
            style={{ flex: 1, maxWidth: 420, marginBottom: 0 }}
          />
        </div>

        {erro && <div className="login-erro" style={{ marginBottom: 14 }}>{erro}</div>}
        {/* Uma conta deletada leva de volta para a lista — o aviso precisa
            sobreviver a essa volta, senão a ação parece não ter acontecido. */}
        {aviso && <div className="ficha-aviso" style={{ marginBottom: 14 }}>{aviso}</div>}
        {carregando && <p style={{ color: 'var(--ink3)' }}>Carregando contas…</p>}

        {!carregando && filtradas.length === 0 && (
          <p style={{ color: 'var(--ink3)' }}>
            {contas.length === 0 ? 'Nenhuma conta cadastrada.' : 'Nenhuma conta com esse termo.'}
          </p>
        )}

        {filtradas.length > 0 && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            {filtradas.map((c, i) => (
              <div
                key={c.id}
                onClick={() => abrir(c.id)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') abrir(c.id); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', cursor: 'pointer',
                  borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome || 'sem nome'}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 2 }}>{c.email}</div>
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--line2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink3)', flexShrink: 0,
                }}>
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7.5 4.5l6 5.5-6 5.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── UMA CONTA ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Voltar sem precisar buscar de novo — a lista continua carregada. */}
      <div
        onClick={() => { setFicha(null); setErro(''); }}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') { setFicha(null); setErro(''); } }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink3)', fontSize: 14, marginBottom: 16, cursor: 'pointer' }}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4.5L6.5 10l5.5 5.5M6.5 10H17" />
        </svg>
        <span>Voltar para a lista</span>
      </div>

      {erro && <div className="login-erro" style={{ marginBottom: 14 }}>{erro}</div>}

      {/* ── QUEM É ──
          A mesma cabeça de Minha conta e do resto do admin: inicial, nome
          grande, e uma linha de apoio. Antes eram estilos escritos na mão
          dentro do JSX, e por isso esta tela envelhecia sozinha toda vez que
          o desenho do produto mudava. */}
      <div className="conta-card adm-card" style={{ marginTop: 0 }}>
        <div className="conta-cabeca" style={{ marginBottom: 0 }}>
          <div className="conta-cabeca__foto">
            {(ficha.conta.nome || ficha.conta.email || '?').trim().charAt(0).toUpperCase()}
          </div>
          <div className="conta-cabeca__txt">
            <p className="eyebrow">Conta #{ficha.conta.id}</p>
            <h2 className="conta-cabeca__nome" style={{ fontSize: 24 }}>
              {ficha.conta.nome || 'sem nome'}
            </h2>
            <p className="conta-cabeca__email">
              {ficha.conta.email} · desde {data(ficha.conta.criado_em)}
              {ficha.conta.is_admin && ' · admin'}
              {!ficha.conta.email_verificado && ' · e-mail não verificado'}
            </p>
          </div>
        </div>
      </div>

      {/* ── A PRIMEIRA PERGUNTA DO SUPORTE ──
          "Por que essa pessoa não consegue gerar?" A resposta já vem calculada
          do servidor, pela mesma porta que o produto usa, mas ficava enterrada
          em quatro campos. Aqui ela é a primeira linha da ficha, numa frase.

          O selo é sinal, não marca: verde quando pode, vermelho quando não.
          São as duas únicas cores de sinal do produto. */}
      <div className={'conta-card adm-card adm-porque adm-porque--'
        + (!a ? 'ok' : a.pode_gerar ? 'ok' : 'nao')}>
        <div className="adm-porque__selo" aria-hidden="true">
          {(!a || a.pode_gerar) ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          )}
        </div>
        <div>
          <p className="adm-porque__t">{motivo.texto}</p>
          {a && (
            <p className="adm-porque__p">
              {NOME_PLANO[a.plano] || a.plano}
              {a.ilimitado ? ', sem limite de créditos'
                : `, ${num(a.creditos_restantes)} créditos disponíveis`}
              {a.creditos_recarga > 0 && ` (${num(a.creditos_recarga)} de recarga)`}
              {a.expira_em && `. Vence em ${data(a.expira_em)}`}
              {ficha.ja_usou_teste && '. Este e-mail já usou o teste antes'}
              {problemaCartao && `. ${problemaCartao}`}
            </p>
          )}
        </div>
      </div>

      {/* ── O CARTÃO QUE PAGA ──
          Quando alguém escreve "perdi o acesso", a resposta quase sempre é "o
          cartão foi recusado no dia tal". O motivo vem do Stripe, pela mesma
          função que monta a tela da própria pessoa: as duas nunca discordam. */}
      {cartao && (
        <div className="conta-card adm-card">
          <div className="adm-ficha-cab">
            <h2 className="conta-h2">Cartão que paga</h2>
            <a className="fat-ver" href={stripeCliente(ficha.conta.email)}
               target="_blank" rel="noopener noreferrer">Stripe ↗</a>
          </div>
          <p className="conta-p" style={{ marginBottom: 0 }}>
            {(cartao.marca || 'cartão').replace(/^./, (c) => c.toUpperCase())}
            {cartao.fim && ` terminado em ${cartao.fim}`}
            {cartao.mes && cartao.ano
              && `, vence ${String(cartao.mes).padStart(2, '0')}/${String(cartao.ano).slice(-2)}`}
          </p>
          {problemaCartao && (
            <p className="conta-p" style={{ color: 'var(--alerta)', marginBottom: 0 }}>
              {problemaCartao}
            </p>
          )}
        </div>
      )}

      {/* ── JÁ CONSUMIDO ──
          Duas leituras, porque são duas perguntas diferentes e a errada
          custa caro. Quem vai ao Stripe escolher um valor de reembolso
          precisa deste número ANTES de sair da tela. */}
      {consumo && (
      <div className="conta-card adm-card">
            <h2 className="conta-h2">Já consumido</h2>
            <div>

              <div style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.7 }}>
                <span style={{ minWidth: 110, color: 'var(--ink3)' }}>Ciclo atual</span>
                <span>
                  <b style={{ color: corDoConsumo(consumo.ciclo.pct) }}>
                    {consumo.ciclo.pct == null ? '—' : consumo.ciclo.pct + '%'}
                  </b>
                  {' · '}{num(consumo.ciclo.usados)} de {num(consumo.ciclo.total)} créditos
                  {consumo.ciclo.equivalente != null && consumo.ciclo.cobranca > 0 && (
                    <span style={{ color: 'var(--ink3)' }}>
                      {' ≈ '}{dinheiro(consumo.ciclo.equivalente, consumo.moeda)} de {dinheiro(consumo.ciclo.cobranca, consumo.moeda)}
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.7 }}>
                <span style={{ minWidth: 110, color: 'var(--ink3)' }}>Desde a compra</span>
                <span>
                  <b style={{ color: corDoConsumo(consumo.desde.pct) }}>
                    {consumo.desde.pct == null ? '—' : consumo.desde.pct + '%'}
                  </b>
                  {' · '}{num(consumo.desde.creditos)} de {num(consumo.desde.contratado)} créditos
                  {consumo.desde.equivalente != null && consumo.desde.pago > 0 && (
                    <span style={{ color: 'var(--ink3)' }}>
                      {' ≈ '}{dinheiro(consumo.desde.equivalente, consumo.moeda)} de {dinheiro(consumo.desde.pago, consumo.moeda)} pagos
                    </span>
                  )}
                  <span style={{ color: 'var(--ink3)' }}> · desde {data(consumo.desde.quando)}</span>
                </span>
              </div>

              {/* O consumo sai do plano; recarga é dinheiro à parte e tem outro
                  destino no reembolso. Dizer isso aqui evita a leitura errada de
                  que o percentual cobriria tudo que a pessoa comprou. */}
              {a?.creditos_recarga > 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>
                  Só o consumo do plano. A recarga é compra à parte — reembolsá-la revoga o saldo dela, não o plano.
                </div>
              )}
            </div>
      </div>
      )}

      {/* ── AÇÕES ──
          Ficam aqui, coladas na conta, e não numa tabela de outra aba: agir
          sobre a linha errada de uma lista era o risco real do arranjo antigo.
          Logo abaixo do cabeçalho, a decisão é tomada com o estado à vista. */}
      {/* Uma ação visível, o resto no "⋯". Cinco pills lado a lado davam o mesmo
          peso visual para "ver a tela do cliente" e para "apagar a conta"; o
          menu recolhe as menos frequentes e põe a irreversível atrás de mais um
          gesto — sem tirar nenhuma trava: deletar e cancelar seguem exigindo o
          e-mail digitado no painel de confirmação. */}
      <div className="ficha-acoes">
        <button className="ficha-btn-principal" onClick={() => abrirAcao('personificar')}>
          Ver como o cliente
        </button>

        <div className="ficha-mais-wrap">
          <button
            className="ficha-btn-mais"
            onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Mais ações"
          >
            {/* Três pontos desenhados: o caractere "⋯" muda de largura e de
                altura conforme a fonte instalada e desalinha o círculo. */}
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <circle cx="4" cy="10" r="1.6" fill="currentColor" />
              <circle cx="10" cy="10" r="1.6" fill="currentColor" />
              <circle cx="16" cy="10" r="1.6" fill="currentColor" />
            </svg>
          </button>

          {menu && (
            <div className="ficha-menu" role="menu">
              <button role="menuitem" onClick={() => { setMenu(false); abrirAcao('plano'); }}>
                Trocar plano
              </button>
              <button role="menuitem" onClick={() => { setMenu(false); abrirAcao('creditar'); }}>
                Creditar
              </button>
              {/* Promover e rebaixar são o mesmo item, com o rótulo dizendo o
                  que vai acontecer. Dois itens ("tornar" e "tirar") deixariam
                  sempre um deles sem efeito na tela, e um menu com metade dos
                  itens inertes é um menu que a pessoa para de ler. */}
              <button role="menuitem" onClick={() => { setMenu(false); abrirAcao('gerente'); }}>
                {ficha.conta.gerente ? 'Tirar de gerente' : 'Tornar gerente'}
              </button>
              {/* Só aparece quando há o que tirar. Um item permanente que não
                  faz nada na maioria das fichas vira um item que ninguém lê. */}
              {ficha.conta.is_admin && (
                <button role="menuitem" onClick={() => { setMenu(false); abrirAcao('tirar-admin'); }}>
                  Tirar o admin
                </button>
              )}
              <button role="menuitem" onClick={() => { setMenu(false); abrirAcao('creditos-reais'); }}>
                {ficha.conta.creditos_reais
                  ? 'Voltar a não gastar crédito'
                  : 'Fazer gastar crédito de verdade'}
              </button>
              {/* Fica acima da divisória: cancelar tira o plano, mas dá para
                  devolvê-lo. Abaixo da linha só entra o que não tem volta. */}
              {a?.plano !== 'free' && (
                <button role="menuitem" onClick={() => { setMenu(false); abrirAcao('cancelar'); }}>
                  Cancelar plano
                </button>
              )}
              {/* O número aparece DE NOVO aqui, e não é redundância: este é o
                  clique que leva para fora da tela, e o valor do reembolso é
                  escolhido lá, sem nada disto à vista. Repetir custa uma linha;
                  voltar para conferir custa a decisão. */}
              <a
                role="menuitem"
                href={stripeCliente(ficha.conta.email)}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setMenu(false)}
              >
                Stripe ↗
                {consumo && consumo.desde.pct != null && (
                  <span style={{ display: 'block', fontSize: 11, color: corDoConsumo(consumo.desde.pct), marginTop: 2 }}>
                    {consumo.desde.pct}% consumido
                    {consumo.desde.equivalente != null && consumo.desde.pago > 0 &&
                      ` · ${dinheiro(consumo.desde.equivalente, consumo.moeda)} de ${dinheiro(consumo.desde.pago, consumo.moeda)}`}
                  </span>
                )}
              </a>
              <hr />
              <button role="menuitem" className="perigo" onClick={() => { setMenu(false); abrirAcao('deletar'); }}>
                Deletar conta
              </button>
            </div>
          )}
        </div>
      </div>

      {aviso && <div className="ficha-aviso" style={{ marginBottom: 16 }}>{aviso}</div>}

      {acao && (
        <div className={'ficha-confirma' + (DESTRUTIVAS[acao] ? ' perigo' : '')}>
          {acao === 'plano' && (
            <>
              <p className="ficha-confirma-t">Trocar o plano de <b>{ficha.conta.email}</b></p>
              <p className="ficha-confirma-p">
                Vale imediatamente no nosso sistema. <b>Não mexe na cobrança do Stripe</b> —
                se houver assinatura ativa, ela continua cobrando normalmente.
              </p>
              <select className="admin-select" value={planoNovo} onChange={(e) => setPlanoNovo(e.target.value)}>
                {PLANOS.map((p) => <option key={p} value={p}>{NOME_PLANO[p]}</option>)}
              </select>
            </>
          )}

          {acao === 'creditar' && (
            <>
              <p className="ficha-confirma-t">Devolver créditos para <b>{ficha.conta.email}</b></p>
              <p className="ficha-confirma-p">
                Reduz o consumo do período ({num(a?.creditos_usados)} usados de {num(a?.creditos_total)}).
                Não cria saldo além do total do plano, e fica registrado na aba Logs com o seu nome.
              </p>
              <input
                className="login-input" type="number" min="1" value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="quantos créditos" style={{ maxWidth: 200, marginBottom: 0 }}
              />
            </>
          )}

          {acao === 'cancelar' && (
            <>
              <p className="ficha-confirma-t">Cancelar o plano de <b>{ficha.conta.email}</b></p>
              <p className="ficha-confirma-p">
                A conta volta para Free e perde os créditos do plano. <b>Não cancela a
                assinatura no Stripe</b>. Se houver cobrança ativa, cancele lá também,
                senão o cliente continua pagando sem acesso.
              </p>
            </>
          )}

          {acao === 'tirar-admin' && (
            <>
              <p className="ficha-confirma-t">Tirar o admin de <b>{ficha.conta.email}</b></p>
              <p className="ficha-confirma-p">
                A aba Admin some do menu dela, e as rotas de admin passam a
                recusar. O resto da conta continua igual.
                <br />
                <b>Não existe o botão que devolve.</b> Dar admin pela tela seria
                o botão mais perigoso do produto, então conceder continua sendo
                uma decisão no banco.
              </p>
            </>
          )}

          {acao === 'creditos-reais' && (
            <>
              <p className="ficha-confirma-t">
                {ficha.conta.creditos_reais
                  ? 'Voltar a não gastar crédito' : 'Fazer gastar crédito de verdade'}
                {' '}em <b>{ficha.conta.email}</b>
              </p>
              <p className="ficha-confirma-p">
                {ficha.conta.creditos_reais ? (
                  <>Hoje esta conta gasta crédito mesmo sendo admin ou gerente.
                    Desligando, ela volta a não gastar, que é o que o papel dela
                    promete.</>
                ) : (
                  <>Ela passa a gastar crédito de verdade, mesmo sendo admin ou
                    gerente. Serve para testar a cobrança por dentro, e
                    <b> cancela o "sem limite" do papel</b> enquanto estiver
                    ligada.</>
                )}
              </p>
            </>
          )}

          {acao === 'gerente' && (
            <>
              <p className="ficha-confirma-t">
                {ficha.conta.gerente ? 'Tirar de gerente ' : 'Tornar gerente '}
                <b>{ficha.conta.email}</b>
              </p>
              <p className="ficha-confirma-p">
                {ficha.conta.gerente ? (
                  <>Volta a consumir crédito do plano dela, como qualquer conta.</>
                ) : (
                  <>Passa a gerar <b>sem consumir crédito</b>. Dá para desfazer
                    por este mesmo caminho.</>
                )}
              </p>
              {/* O AVISO QUE FALTAVA. `creditos_reais` cancela o "sem limite"
                  do papel, e ela não aparecia em lugar nenhum: uma conta foi
                  promovida, não ganhou nada, e recebeu um e-mail dizendo que
                  tinha ganhado. Promover com ela ligada é prometer o que não
                  vai acontecer. */}
              {!ficha.conta.gerente && ficha.conta.creditos_reais && (
                <p className="ficha-confirma-p" style={{ color: '#C8342A' }}>
                  <b>Esta conta está marcada para gastar crédito de verdade.</b>{' '}
                  Enquanto isso valer, ser gerente não muda nada para ela, e o
                  e-mail vai avisar de um benefício que ela não recebeu.
                  Desligue a marca antes, no mesmo menu.
                </p>
              )}
            </>
          )}

          {acao === 'deletar' && (
            <>
              <p className="ficha-confirma-t">Deletar a conta <b>{ficha.conta.email}</b></p>
              <p className="ficha-confirma-p">
                Apaga conta, plano, créditos e dispositivos. <b>É permanente.</b> Fica
                registrado quem apagou e quando, mas o conteúdo não volta.
              </p>
            </>
          )}

          {acao === 'personificar' && (
            <>
              <p className="ficha-confirma-t">Ver o site como <b>{ficha.conta.email}</b></p>
              <p className="ficha-confirma-p">
                Você vai navegar como esta pessoa por <b>30 minutos</b>, em modo de
                leitura: nada pode ser alterado, comprado ou gerado enquanto durar.
                <br />
                <b>Fica registrado na aba Logs desta conta</b> que você entrou, e quando.
                O cliente não recebe aviso por e-mail.
                <br />
                Ao encerrar você sai da sessão e precisa entrar de novo como você.
              </p>
            </>
          )}

          {DESTRUTIVAS[acao] && (
            <div style={{ marginTop: 14 }}>
              <label className="ficha-confirma-p" style={{ display: 'block', marginBottom: 6 }}>
                Digite <b>{ficha.conta.email}</b> para confirmar:
              </label>
              <input
                className="login-input" value={confirmaEmail} autoComplete="off"
                onChange={(e) => setConfirmaEmail(e.target.value)}
                placeholder="e-mail da conta" style={{ maxWidth: 340, marginBottom: 0 }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              className={DESTRUTIVAS[acao] ? 'admin-btn-deletar' : 'admin-aba ativa'}
              disabled={executando}
              onClick={executar}
            >
              {executando ? 'Aplicando…' : 'Confirmar'}
            </button>
            <button className="admin-aba" disabled={executando} onClick={() => { fecharAcao(); setErro(''); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── O DETALHE, EM ABAS ──
          Os cartões acima respondem a pergunta que traz alguém até aqui. Estas
          abas guardam as listas longas, que só interessam depois. Elas usam a
          mesma barra do resto do admin, e não um segmentador próprio: eram dois
          desenhos para o mesmo gesto na mesma tela. */}
      <div className="adm-abas" role="tablist">
        {[['resumo', 'Resumo', null],
          ['creditos', 'Créditos', ficha.baldes.length],
          ['faturas', 'Faturas', faturasConta.length],
          ['aceites', 'Aceites', aceitesConta.length],
          ['equipe', 'Equipe', null],
          ['uso', 'Uso', null],
          ['extrato', 'Extrato', null],
          ['logs', 'Eventos', ficha.eventos.length],
          ['imagens', 'Imagens', null]].map(([k, r, n]) => (
          <button key={k} onClick={() => setAba(k)}
                  className={'adm-aba' + (aba === k ? ' ativa' : '')}>
            {r}{n ? <b>{n}</b> : null}
          </button>
        ))}
      </div>

      {aba === 'resumo' && (
        <div className="conta-card adm-card">
          <Linha rotulo="Plano">{NOME_PLANO[a?.plano] || a?.plano} · {a?.status}</Linha>
          {/* ── O PAPEL E A CHAVE QUE O CANCELA ──
              Estas duas linhas nasceram de um defeito real: uma conta foi
              promovida a gerente, não ganhou nada, e recebeu um e-mail dizendo
              que tinha ganhado. A causa era `creditos_reais`, ligada no banco,
              que cancela o "sem limite" dos dois papéis e não aparecia em tela
              nenhuma. Chave que muda o comportamento do produto e não se vê é
              chave que engana quem responde pelo produto. */}
          <Linha rotulo="Papel">
            {ficha.conta.is_admin ? 'admin'
              : ficha.conta.gerente ? 'gerente'
              : 'conta comum'}
          </Linha>
          {ficha.conta.creditos_reais && (
            <Linha rotulo="Gasta crédito de verdade">
              <b style={{ color: '#C8342A' }}>sim</b>
              {(ficha.conta.is_admin || ficha.conta.gerente)
                && ' · isto cancela o sem limite do papel acima'}
            </Linha>
          )}
          {/* `-1` e o codigo de ilimitado no servidor, e ele nao pode aparecer
              como se fosse um saldo negativo. */}
          <Linha rotulo="Créditos do plano">
            {a?.ilimitado || a?.creditos_total === -1
              ? <>sem limite · {num(a?.creditos_usados)} usados</>
              : <>{num(a?.creditos_total)} total · {num(a?.creditos_usados)} usados</>}
          </Linha>
          <Linha rotulo="Teste de 7 dias">
            {a?.eh_trial
              ? (a.trial_expirado ? 'terminou' : `${a.trial_dias_restantes} dia(s) restantes`)
              : 'não se aplica'}
            {ficha.ja_usou_teste && ' · este e-mail já usou o teste antes'}
          </Linha>
          <Linha rotulo="Assinatura">
            {ficha.assinatura
              ? <>{ficha.assinatura.plano}/{ficha.assinatura.tipo_compra} · {dinheiro(ficha.assinatura.valor_centavos, ficha.assinatura.moeda)} · {ficha.assinatura.status}
                  {' · '}{ficha.assinatura.renovacoes} renovação(ões)
                  {ficha.assinatura.renova_em && ` · renova ${data(ficha.assinatura.renova_em)}`}</>
              : 'nunca assinou'}
          </Linha>
          <Linha rotulo="Documento fiscal">{ficha.conta.cpf || ficha.conta.doc_intl || '—'}</Linha>
          <Linha rotulo="Onde está">{[ficha.conta.cidade, ficha.conta.estado, ficha.conta.pais].filter(Boolean).join(', ') || '—'}</Linha>
          <Linha rotulo="Perfil">{[ficha.conta.profissao, ficha.conta.origem, ficha.conta.usa_render].filter(Boolean).join(' · ') || '—'}</Linha>
          <Linha rotulo="Dispositivos">
            {ficha.dispositivos.length === 0 ? 'nenhum' : ficha.dispositivos.map((d) => (
              <div key={d.id}>{d.nome_pc || 'sem nome'} ({d.tipo}) · último acesso {data(d.ultimo_acesso, true)}</div>
            ))}
          </Linha>
        </div>
      )}

      {aba === 'creditos' && (
        <div className="conta-card adm-card">
          {/* Cada balde com a validade. "Por que meu saldo sumiu?" quase sempre
              se responde aqui: o balde venceu. */}
          {ficha.baldes.length === 0 ? <p style={{ color: 'var(--ink3)' }}>Nenhuma compra de crédito.</p> : (
            <div className="fat-rolo">
              <table className="fat">
              <thead><tr>
                <th>Tipo</th><th>Descrição</th><th>Créditos</th><th>Usados</th><th>Valor</th><th>Comprado</th><th>Vence</th>
              </tr></thead>
              <tbody>
                {ficha.baldes.map((b) => (
                  <tr key={b.id} style={{ opacity: b.vencido ? 0.45 : 1 }}>
                    <td>{b.tipo}</td>
                    <td>{b.descricao || '—'}</td>
                    <td>{num(b.creditos)}</td>
                    <td>{num(b.usados)}</td>
                    <td>{dinheiro(b.valor_centavos, b.moeda)}</td>
                    <td>{data(b.criado_em)}</td>
                    <td>{data(b.expira_em)}{b.vencido && ' (vencido)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* ── FATURAS DESTA CONTA ──
          A mesma lista da aba geral, filtrada por quem está aberto na ficha.
          Ela existe aqui porque a pergunta "quanto essa pessoa já pagou" chega
          junto com a pessoa, e não junto com o mês: procurar o nome dela numa
          lista de todas as faturas era o caminho longo para a mesma resposta. */}
      {aba === 'faturas' && (
        <div className="conta-card adm-card">
          {faturasConta.length === 0 ? (
            <p style={{ color: 'var(--ink3)' }}>Nenhuma cobrança nesta conta.</p>
          ) : (
            <>
              <div className="fat-rolo">
                <table className="fat">
                  <thead><tr>
                    <th>Quando</th><th>O que</th><th>Número</th>
                    <th className="adm-num">Valor</th><th>Situação</th><th className="fat__acao" />
                  </tr></thead>
                  <tbody>
                    {faturasConta.map((f) => (
                      <tr key={f.id}>
                        <td className="adm-mono">{data(f.data)}</td>
                        <td>{f.descricao || '—'}</td>
                        <td className="adm-mono">{f.numero || '—'}</td>
                        <td className="adm-num">{dinheiro(f.total_centavos, f.moeda)}</td>
                        <td>
                          <span className={'fat-selo fat-selo--'
                            + (f.status === 'paga' ? 'paga' : 'aberta')}>
                            {f.status === 'paga' ? 'Paga' : 'Em aberto'}
                          </span>
                        </td>
                        <td className="fat__acao">
                          {f.pdf && (
                            <a className="fat-ver" href={f.pdf}
                               target="_blank" rel="noopener noreferrer">PDF ↗</a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="adm-total">
                {faturasConta.length} {faturasConta.length === 1 ? 'cobrança' : 'cobranças'},
                {' '}<b>{dinheiro(
                  faturasConta.filter((f) => f.status === 'paga')
                    .reduce((soma, f) => soma + (f.total_centavos || 0), 0),
                  faturasConta[0].moeda)}</b> pagos.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── ACEITES DESTA CONTA ──
          A prova de que esta pessoa aceitou os Termos, e qual versão. Uma linha
          por documento e por aceite: um reaceite entra como registro novo, sem
          apagar o anterior, porque a prova é justamente a versão antiga
          continuar existindo.

          Versão aceita diferente da que está no ar quer dizer que a pessoa vai
          cair na tela de reaceite no próximo acesso. É a resposta de "por que
          apareceu um aviso para ela". */}
      {aba === 'aceites' && (
        <div className="conta-card adm-card">
          {aceitesConta.length === 0 ? (
            <p style={{ color: 'var(--ink3)' }}>
              Nenhum aceite gravado. Contas criadas antes de 6 de setembro de 2026 não têm
              esse registro: o aceite acontecia, mas não era guardado.
            </p>
          ) : (
            <div className="fat-rolo">
              <table className="fat">
                <thead><tr>
                  <th>Documento</th><th>Versão</th><th>Quando</th><th>De onde</th><th>Onde</th>
                </tr></thead>
                <tbody>
                  {aceitesConta.map((ac) => (
                    <tr key={ac.id}>
                      <td>
                        {ac.documento === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
                      </td>
                      <td className="adm-mono">
                        {ac.versao}
                        {versaoNoAr && ac.versao !== versaoNoAr && (
                          <span className="fat-selo fat-selo--aberta"
                                style={{ marginLeft: 8 }}>desatualizada</span>
                        )}
                      </td>
                      <td className="adm-mono">{data(ac.criado_em, true)}</td>
                      <td className="adm-sub" style={{ fontSize: '12.5px' }}>
                        {ac.ip || '—'}
                        {/* A cidade fica ABAIXO do IP e em letra menor: o IP é o
                            fato registrado, a cidade é leitura dele. */}
                        {(ac.cidade || ac.pais) && (
                          <><br />{[ac.cidade, ac.regiao, ac.pais].filter(Boolean).join(', ')}</>
                        )}
                      </td>
                      <td className="adm-sub" style={{ fontSize: '12.5px' }}>{ac.onde || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {versaoNoAr && (
            <p className="adm-total">Versão no ar hoje: <b>{versaoNoAr}</b>.</p>
          )}
        </div>
      )}

      {aba === 'equipe' && (
        <div className="conta-card adm-card">
          {!ficha.equipe_dono && !ficha.equipe_membro && <p style={{ color: 'var(--ink3)' }}>Não participa de equipe.</p>}
          {ficha.equipe_dono && (
            <>
              <Linha rotulo="É dono da equipe">#{ficha.equipe_dono.id} {ficha.equipe_dono.nome || ''}</Linha>
              <Linha rotulo="Plano e assentos">
                {ficha.equipe_dono.plano} · {ficha.equipe_dono.ocupados} de {ficha.equipe_dono.assentos} ocupado(s)
                {ficha.equipe_dono.ocupados > ficha.equipe_dono.assentos && ', ACIMA DO CONTRATADO'}
              </Linha>
              <Linha rotulo="Status">{ficha.equipe_dono.status}</Linha>
            </>
          )}
          {ficha.equipe_membro && (
            <>
              <Linha rotulo="É membro da equipe">
                #{ficha.equipe_membro.equipe_id} {ficha.equipe_membro.equipe_nome || ''} (de {ficha.equipe_membro.dono_email})
              </Linha>
              <Linha rotulo="Assento">#{ficha.equipe_membro.assento_id} · {ficha.equipe_membro.assento_status}</Linha>
              <Linha rotulo="Plano da equipe">{ficha.equipe_membro.equipe_plano} · equipe {ficha.equipe_membro.equipe_status}</Linha>
            </>
          )}
        </div>
      )}

      {aba === 'uso' && (
        <div className="conta-card adm-card">
          {/* Vem de `transacoes`, não de eventos: gerações são milhares e
              afogariam a linha do tempo. */}
          {ficha.uso.length === 0 ? <p style={{ color: 'var(--ink3)' }}>Nenhuma geração ainda.</p> : (
            <div className="fat-rolo">
              <table className="fat">
              <thead><tr><th>Ferramenta</th><th>Gerações</th><th>Créditos gastos</th><th>Última</th></tr></thead>
              <tbody>
                {ficha.uso.map((u) => (
                  <tr key={u.rota}>
                    <td>{u.rota || '—'}</td><td>{num(u.n)}</td><td>{num(u.creditos)}</td><td>{data(u.ultima, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {aba === 'extrato' && (
        <div className="conta-card adm-card">
          {/* "Essa geração foi cobrada, falhou, e o crédito voltou?" — cada
              linha responde sozinha: débito↔estorno pareados pela ref, com o
              desfecho do pedido no servidor de geração. */}
          {/* DropdownCora, e não <select>: a lista nativa abre com a cara do
              sistema (bordas retas, seleção azul) e destoa dos outros
              dropdowns do app — idioma, tema, filtros. */}
          <div style={{ marginBottom: 14, width: 140 }}>
            <DropdownCora
              valor={extratoDias}
              opcoes={[30, 90, 180, 365].map((d) => ({ v: d, n: `${d} dias` }))}
              onEscolher={(v) => setExtratoDias(v)}
            />
          </div>

          {extratoErro && <div className="login-erro" style={{ marginBottom: 14 }}>{extratoErro}</div>}
          {extratoCarregando && <p style={{ color: 'var(--ink3)' }}>Carregando extrato…</p>}

          {extrato && !extratoCarregando && (
            <>
              <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 6 }}>
                {num(extrato.resumo.debitado)} debitados · {num(extrato.resumo.estornado)} devolvidos
                {' · '}líquido {num(extrato.resumo.liquido)} · {extrato.resumo.lancamentos} lançamento(s)
                {extrato.resumo.suspeitos > 0 && (
                  <span style={{ color: '#C8342A', fontWeight: 700 }}>
                    {', '}{extrato.resumo.suspeitos} sem retorno, conferir
                  </span>
                )}
              </div>
              {!extrato.pedidos_ok && (
                <p style={{ fontSize: 12, color: '#B7791F', marginBottom: 10 }}>
                  Sem os pedidos do servidor de geração neste ambiente, a Situação
                  mostra só o pareamento débito↔estorno.
                </p>
              )}
              {extrato.transacoes.length === 500 && (
                <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 10 }}>
                  Mostrando os 500 lançamentos mais recentes do período.
                </p>
              )}

              {extrato.transacoes.length === 0 ? (
                <p style={{ color: 'var(--ink3)' }}>Nenhum lançamento no período.</p>
              ) : (
                <div className="fat-rolo">
                  <table className="fat">
                  <thead><tr>
                    <th>Quando</th><th>Ferramenta</th><th>Créditos</th><th>Situação</th><th>Saldo depois</th><th>Ref</th>
                  </tr></thead>
                  <tbody>
                    {extrato.transacoes.map((t) => {
                      const s = SITUACAO_EXTRATO[t.situacao] || { texto: t.situacao, cor: 'var(--ink3)' };
                      const emVooVelho = t.situacao === 'em_voo' &&
                        Date.now() - new Date(t.criado_em).getTime() > 3600 * 1000;
                      return (
                        <tr key={t.id}>
                          <td>{data(t.criado_em, true)}</td>
                          <td>{t.rota || '—'}</td>
                          <td style={{ color: t.tipo === 'estorno' ? '#1F7A44' : undefined }}>
                            {t.tipo === 'estorno' ? '+' : '−'}{num(t.quantidade)}
                          </td>
                          <td style={{ color: emVooVelho ? '#C8342A' : s.cor, fontWeight: t.situacao === 'conferir' || emVooVelho ? 700 : 400 }}
                              title={t.situacao === 'devolvido' && t.estorno_em ? `estorno em ${data(t.estorno_em, true)}`
                                   : t.situacao === 'sem_registro' ? 'Sem registro de pedido: cobrança do plugin, ou anterior à tabela de pedidos.'
                                   : undefined}>
                            {s.texto}
                            {t.situacao === 'devolvido_parcial' && ` (${num(t.estorno_qtd)} de ${num(t.quantidade)})`}
                            {t.situacao === 'em_voo' && ` ${idade(t.criado_em)}`}
                          </td>
                          <td>{num(t.saldo_depois)}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }} title={t.ref}>
                            {t.ref && t.ref.length > 22 ? t.ref.slice(0, 22) + '…' : (t.ref || '—')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}

              <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 10 }}>
                Débito com situação <b>entregue</b> é o caso normal (gerou e não há o que
                devolver). <b>Em voo</b> além de 1h e <b>CONFERIR</b> são candidatos a
                devolução. “—” é cobrança sem registro de pedido (plugin). Cruze com a
                aba Uso antes de decidir.
              </p>
            </>
          )}
        </div>
      )}

      {aba === 'logs' && (
        <div className="conta-card adm-card">
          {ficha.eventos.length === 0 ? (
            <p style={{ color: 'var(--ink3)' }}>
              Nenhum evento registrado. A gravação começou agora, e contas antigas
              não têm histórico anterior a ela.
            </p>
          ) : ficha.eventos.map((ev) => (
            <div key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {data(ev.criado_em, true)} · {ev.tipo} · por {ev.ator}
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>
                {ev.descricao}
                {ev.valor_centavos != null && `, ${dinheiro(ev.valor_centavos, ev.moeda)}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'imagens' && (
        <div className="conta-card adm-card">
          {/* O AVISO VEM PRIMEIRO, e não no rodapé.
              Isto é o arquivo de trabalho de um cliente, e muitas vezes o
              trabalho dos clientes DELE. Dizer que o acesso ficou registrado
              depois que a pessoa já olhou não avisa nada: avisa depois. */}
          <p className="adm-fotos__aviso">
            Estas são as imagens de <b>{ficha.conta.email}</b>. Abrir esta aba
            ficou registrado nos eventos da conta, com o seu nome e a hora.
          </p>

          {imagensCarregando && <p className="conta-p">Carregando as imagens…</p>}
          {imagensErro && <p className="adm-fotos__erro">{imagensErro}</p>}

          {!imagensCarregando && !imagensErro && imagens && imagens.length === 0 && (
            <p className="adm-vazio">Esta conta ainda não gerou nenhuma imagem.</p>
          )}

          {!imagensCarregando && !imagensErro && imagens && imagens.length > 0 && (
            <>
              <div className="adm-fotos">
                {imagens.map((im) => (
                  /* Abre em aba nova, e não numa janela de zoom aqui dentro:
                     a URL do R2 já vale por 6h e o navegador mostra imagem
                     melhor do que qualquer visor que eu escrevesse. */
                  <a key={im.id} className="adm-foto" href={im.url}
                     target="_blank" rel="noopener noreferrer"
                     title={im.quando ? data(im.quando, true) : undefined}>
                    <img src={im.url} alt="" loading="lazy" />
                  </a>
                ))}
              </div>
              <p className="adm-total adm-total--nota">
                As {imagens.length} mais recentes. As imagens abrem por link
                assinado, que vale algumas horas: copiar o endereço não serve
                para guardar.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
