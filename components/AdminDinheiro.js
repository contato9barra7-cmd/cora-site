'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  A DASHBOARD DO DINHEIRO
//
//  A primeira tela do admin, e a pergunta que ela responde é "quanto entrou".
//
//  UM PERÍODO E UMA MOEDA MANDAM EM TUDO. A barra de cima escolhe os dois, e
//  os blocos abaixo se refazem juntos. É o que evita o erro clássico da tela
//  de faturamento: o número grande falando de um período e o gráfico ao lado
//  falando de outro.
//
//  DE ONDE VÊM OS NÚMEROS
//  `GET /admin/dinheiro`, que varre as COBRANÇAS do Stripe e não as faturas:
//  recarga passa por Checkout de pagamento único e não gera fatura, então uma
//  tela montada em `invoices.list` perderia toda a receita avulsa. A taxa é
//  `balance_transaction.fee`, o que o Stripe reteve naquela cobrança
//  específica, e não uma porcentagem de tabela: cartão de fora do Brasil,
//  parcelamento e conversão de moeda cobram diferente, e uma constante no
//  código erraria em todos esses casos sem ninguém perceber.
//
//  TUDO EM CENTAVOS
//  Inteiro do começo ao fim, e a divisão por 100 só na hora de escrever na
//  tela. Fração no meio de uma soma de dinheiro é como nasce a diferença de
//  um centavo que ninguém consegue explicar.
//
//  MOEDA NÃO SE SOMA
//  Cada moeda tem a sua leitura completa, inclusive a régua de meses: um mês
//  pode ter movimento em real e nenhum em euro. E elas saem do que existe, e
//  não de uma lista escrita aqui: se entrar peso amanhã, o peso aparece
//  sozinho.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { adminDinheiro, baixarDinheiroPlanilha } from '../lib/auth';

const MES_NOME = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                  'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const TODAS = '__todas__';   // a moeda que não é uma moeda

function mesPorExtenso(chave) {
  const p = String(chave || '').split('-');
  return (MES_LONGO[(+p[1] || 1) - 1] || '') + ' de ' + p[0];
}

const VAZIO = { assinatura: 0, recarga: 0, outro: 0, taxa: 0, reembolso: 0,
                cobrancas: 0, meses: 0, bruto: 0, liquido: 0 };

export default function AdminDinheiro() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [moeda, setMoeda] = useState(null);   // null até saber quais existem
  const [anoAberto, setAnoAberto] = useState(new Date().getFullYear());
  const [mesAberto, setMesAberto] = useState(null);   // null = o período inteiro
  const [atalho, setAtalho] = useState('12m');
  const [verLiquido, setVerLiquido] = useState(false);
  // Guarda QUAL formato está baixando, e não um sim/não: com dois botões, um
  // booleano faria os dois dizerem "Gerando..." ao mesmo tempo.
  const [baixando, setBaixando] = useState(null);

  function baixar(formato) {
    setBaixando(formato);
    baixarDinheiroPlanilha(formato)
      .catch((e) => setErro(e.message))
      .finally(() => setBaixando(null));
  }

  useEffect(() => {
    adminDinheiro()
      .then((d) => {
        setDados(d);
        setMoeda(d.moedas.length ? d.moedas[0].codigo : TODAS);
      })
      .catch((e) => setErro(e.message));
  }, []);

  const moedas = dados?.moedas || [];
  const meses = dados?.meses || {};
  const resumo = dados?.resumo || null;
  const contas = dados?.contas || [];

  const info = (cod) => moedas.find((m) => m.codigo === cod)
    || { codigo: cod, simbolo: String(cod || '').toUpperCase(), nome: '', primeira: '' };

  const dinheiro = (centavos, cod) =>
    info(cod || moeda).simbolo + ' '
    + (centavos / 100).toLocaleString('pt-BR',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* Um mês do período conta? A regra é a mesma para todos os blocos, então ela
     mora num lugar só. */
  const noPeriodo = (chave) => {
    const ano = +String(chave).slice(0, 4);
    const mes = +String(chave).slice(5, 7) - 1;
    if (mesAberto !== null) return ano === anoAberto && mes === mesAberto;
    if (atalho === 'tudo') return true;
    return ano === anoAberto;
  };

  const somaDaMoeda = (cod) => {
    const s = { ...VAZIO };
    const m = meses[cod] || {};
    Object.keys(m).forEach((k) => {
      if (!noPeriodo(k)) return;
      const v = m[k];
      s.assinatura += v.assinatura; s.recarga += v.recarga; s.outro += v.outro;
      s.taxa += v.taxa; s.reembolso += v.reembolso; s.cobrancas += v.cobrancas;
      s.meses++;
    });
    s.bruto = s.assinatura + s.recarga + s.outro;
    s.liquido = s.bruto - s.taxa;
    return s;
  };

  /* A data da primeira cobrança. Com uma moeda é a dela; com todas, a mais
     antiga entre elas, que é quando o negócio começou a receber. */
  const desdeQuando = () => {
    if (moeda !== TODAS) return mesPorExtenso(info(moeda).primeira);
    const menor = moedas.reduce((a, m) => (!a || m.primeira < a ? m.primeira : a), null);
    return menor ? mesPorExtenso(menor) : 'o começo';
  };

  const primeiroAno = useMemo(() => {
    const hoje = new Date().getFullYear();
    return moedas.reduce((a, m) => {
      const y = +String(m.primeira).slice(0, 4);
      return y && y < a ? y : a;
    }, hoje);
  }, [moedas]);

  const todas = moeda === TODAS;
  const s = todas ? VAZIO : somaDaMoeda(moeda);

  /* A RÉGUA. Com todas as moedas ela mede COBRANÇAS, e não valor: altura de
     barra pede uma escala, e real e dólar não têm uma em comum. Cobrança tem,
     porque ela é contável e vale o mesmo em qualquer moeda. Empilhar valores
     de moedas diferentes na mesma barra daria um desenho bonito e sem
     significado nenhum. */
  const regua = useMemo(() => {
    const codigos = todas ? moedas.map((m) => m.codigo) : [moeda];
    const linha = MES_NOME.map((_, i) => {
      const chave = anoAberto + '-' + String(i + 1).padStart(2, '0');
      let v = 0, existe = false;
      codigos.forEach((cod) => {
        const l = (meses[cod] || {})[chave];
        if (!l) return;
        existe = true;
        v += todas ? l.cobrancas : l.assinatura + l.recarga + l.outro;
      });
      return existe ? v : null;
    });
    const maior = linha.reduce((a, v) => (v && v > a ? v : a), 0);
    return { linha, maior };
  }, [meses, moedas, moeda, anoAberto, todas]);

  const nomeDoPeriodo = () => {
    if (mesAberto !== null) return MES_LONGO[mesAberto] + ' de ' + anoAberto;
    if (atalho === 'ano') return String(anoAberto);
    return 'nos últimos 12 meses';
  };

  const rotulo = mesAberto !== null || atalho === 'ano'
    ? 'Entrou em ' + nomeDoPeriodo()
    : atalho === 'tudo' ? 'Entrou desde ' + desdeQuando() : 'Entrou nos últimos 12 meses';

  /* A comparação só faz sentido com um mês aberto: comparar "o ano todo" com o
     quê? Sem mês, a linha vira a média mensal do período. */
  const anterior = mesAberto !== null && mesAberto > 0
    ? (meses[moeda] || {})[anoAberto + '-' + String(mesAberto).padStart(2, '0')]
    : null;
  const total = verLiquido ? s.liquido : s.bruto;
  let comparacao = null;
  if (mesAberto !== null && anterior) {
    const antes = anterior.assinatura + anterior.recarga + anterior.outro
      - (verLiquido ? anterior.taxa : 0);
    comparacao = { difer: total - antes, texto: 'em relação a ' + MES_LONGO[mesAberto - 1] };
  } else if (mesAberto === null) {
    comparacao = {
      difer: s.meses ? Math.round(total / s.meses) : 0,
      texto: 'por mês, na média', semSinal: true,
    };
  }

  function trocarAtalho(qual) {
    setAtalho(qual);
    setMesAberto(null);
    /* Qualquer atalho traz a régua de volta para o ano corrente. Sem isto,
       quem estivesse olhando um ano vazio e clicasse no atalho de tudo veria o
       total inteiro em cima de um gráfico vazio, e os dois discordavam. */
    setAnoAberto(new Date().getFullYear());
  }

  if (erro) {
    return (
      <div className="conta-card adm-card">
        <h2 className="conta-h2">Não consegui ler o faturamento</h2>
        <p className="conta-p">{erro}</p>
      </div>
    );
  }
  if (!dados) {
    return <div className="conta-card adm-card"><p className="conta-p">Lendo o Stripe...</p></div>;
  }
  if (!moedas.length) {
    return (
      <div className="conta-card adm-card">
        <h2 className="conta-h2">Nenhuma cobrança ainda</h2>
        <p className="conta-p">Quando a primeira for paga, ela aparece aqui.</p>
      </div>
    );
  }

  const pctAssinatura = s.bruto ? (s.assinatura / s.bruto) * 100 : 0;

  return (
    <>
      {/* ── A BARRA DE PERÍODO ──
          O gráfico e o seletor são a MESMA peça. Separados, seriam dois
          lugares dizendo qual mês está em foco, e eles discordariam na
          primeira vez que alguém clicasse só num. */}
      <div className="conta-card adm-card per" style={{ marginTop: 0 }}>
        <div className="per__cab">
          <div className="per__ano">
            <button className="per__seta" aria-label="Ano anterior"
                    disabled={anoAberto <= primeiroAno}
                    onClick={() => { setAnoAberto((a) => a - 1); setMesAberto(null);
                                     if (atalho === 'tudo') setAtalho('ano'); }}>
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>
            <button className="per__nome"
                    onClick={() => { setMesAberto(null); setAtalho('ano'); }}>
              {anoAberto}
            </button>
            <button className="per__seta" aria-label="Próximo ano"
                    disabled={anoAberto >= new Date().getFullYear()}
                    onClick={() => { setAnoAberto((a) => a + 1); setMesAberto(null);
                                     if (atalho === 'tudo') setAtalho('ano'); }}>
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          </div>

          {/* Uma moeda só não vira seletor: não há entre o que escolher, e o
              botão de "todas" ao lado de uma única moeda seria o mesmo botão
              duas vezes. */}
          {moedas.length > 1 && (
            <div className="per__moedas" role="group" aria-label="Moeda">
              {moedas.concat([{ codigo: TODAS, simbolo: 'Todas', nome: 'Todas as moedas' }])
                .map((m) => (
                  <button key={m.codigo} type="button" title={m.nome}
                          aria-pressed={moeda === m.codigo}
                          className={'per__moeda' + (moeda === m.codigo ? ' ativo' : '')
                            + (m.codigo === TODAS ? ' per__moeda--todas' : '')}
                          onClick={() => {
                            setMoeda(m.codigo);
                            /* Trocar de moeda zera o mês: maio existe em real e
                               não existe em euro, e manter a escolha levaria a
                               uma tela vazia sem aviso. */
                            setMesAberto(null);
                          }}>
                    {m.simbolo}
                  </button>
                ))}
            </div>
          )}

          <div className="per__atalhos">
            <button className={mesAberto === null && atalho === '12m' ? 'ativo' : undefined}
                    onClick={() => trocarAtalho('12m')}>Últimos 12 meses</button>
            <button className={mesAberto === null && atalho === 'ano' ? 'ativo' : undefined}
                    onClick={() => trocarAtalho('ano')}>O ano todo</button>
            <button className={mesAberto === null && atalho === 'tudo' ? 'ativo' : undefined}
                    onClick={() => trocarAtalho('tudo')}>Desde {desdeQuando()}</button>
          </div>
        </div>

        <div className="per__meses">
          {MES_NOME.map((nome, i) => {
            const v = regua.linha[i];
            const alt = v && regua.maior ? Math.round((v / regua.maior) * 100) : 0;
            return (
              <button key={nome} type="button"
                      className={'per__mes' + (mesAberto === i ? ' ativo' : '')}
                      /* Mês sem cobrança não aceita clique: abrir um mês vazio
                         só troca a tela toda por zeros, e isso não é uma
                         resposta que alguém pediu. */
                      disabled={v === null}
                      title={v === null ? undefined : MES_LONGO[i] + ': ' + (todas
                        ? v + (v === 1 ? ' cobrança' : ' cobranças') : dinheiro(v))}
                      onClick={() => {
                        /* Clicar de novo no mês aberto volta para o ano: é o
                           mesmo gesto de ida e volta, sem procurar um "limpar". */
                        setMesAberto((m) => (m === i ? null : i));
                        if (mesAberto !== i) setAtalho('ano');
                      }}>
                <i style={{ '--h': alt ? alt + '%' : '2px' }} />
                <b>{nome}</b>
              </button>
            );
          })}
        </div>

        {todas && (
          <p className="per__regua">
            as barras contam cobranças, porque moedas diferentes não têm escala em comum
          </p>
        )}
        {!regua.maior && (
          <p className="per__vazio">
            Nenhuma cobrança em {anoAberto}. A primeira foi em {desdeQuando()}.
          </p>
        )}
      </div>

      {dados.aviso && (
        <div className="conta-card adm-card">
          <p className="conta-p" style={{ margin: 0 }}>{dados.aviso}</p>
        </div>
      )}

      <div className={'din-topo' + (todas ? ' din-topo--todas' : '')}>
        <div className="conta-card adm-card din-grande">
          {todas ? (
            /* ══ TODAS AS MOEDAS ══
               Uma linha por moeda, e nenhuma somada com outra. Somar real com
               dólar dá um valor que não existe, e ele apareceria no lugar mais
               visível da tela. Assim dá para ver tudo de uma vez e cada número
               continua sendo verdade. */
            <div>
              <h2 className="conta-h2">O que entrou, moeda por moeda</h2>
              <p className="conta-p">
                {mesAberto !== null || atalho === 'ano' ? 'Em ' + nomeDoPeriodo() + '.'
                  : atalho === 'tudo' ? 'Desde ' + desdeQuando() + '.'
                  : 'Nos últimos 12 meses.'}
              </p>
              <div className="fat-rolo">
                <table className="fat din-tabela-moedas">
                  <thead>
                    <tr>
                      <th>Moeda</th><th className="adm-num">Bruto</th>
                      <th className="adm-num">Taxa</th><th className="adm-num">Líquido</th>
                      <th className="adm-num">Cobranças</th><th className="fat__acao" />
                    </tr>
                  </thead>
                  <tbody>
                    {moedas.map((m) => {
                      const x = somaDaMoeda(m.codigo);
                      return (
                        <tr key={m.codigo}>
                          <td>
                            <b className="din-moeda-nome">{m.nome}</b>
                            <span className="din-moeda-cod">{m.codigo.toUpperCase()}</span>
                          </td>
                          <td className="adm-num">{dinheiro(x.bruto, m.codigo)}</td>
                          <td className="adm-num din-menos">
                            {x.taxa ? '− ' + dinheiro(x.taxa, m.codigo) : '—'}
                          </td>
                          <td className="adm-num"><b>{dinheiro(x.liquido, m.codigo)}</b></td>
                          <td className="adm-num">{x.cobrancas}</td>
                          <td className="fat__acao">
                            <button className="fat-ver"
                                    onClick={() => { setMoeda(m.codigo); setMesAberto(null); }}>
                              Ver só {m.nome.toLowerCase()}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="din-nota">
                Cada linha é uma moeda inteira, com a taxa que o Stripe reteve nela. Não há
                total geral de propósito: para somar todas seria preciso câmbio com a data
                de cada cobrança, e o número passaria a mudar sozinho conforme o dólar.
              </p>
            </div>
          ) : (
            <div>
              {/* ── BRUTO OU LÍQUIDO ──
                  Duas leituras do mesmo dinheiro, e por isso no mesmo lugar em
                  vez de dois cartões: ninguém precisa dos dois números ao mesmo
                  tempo, precisa saber qual está olhando. */}
              <div className="din-abas" role="tablist">
                <button role="tab" aria-selected={!verLiquido}
                        className={!verLiquido ? 'ativa' : undefined}
                        onClick={() => setVerLiquido(false)}>Bruto</button>
                <button role="tab" aria-selected={verLiquido}
                        className={verLiquido ? 'ativa' : undefined}
                        onClick={() => setVerLiquido(true)}>Líquido</button>
              </div>

              <p className="eyebrow">{rotulo}</p>
              <p className="din-num">{dinheiro(total)}</p>

              {comparacao && (
                <span className={'din-var din-var--'
                  + (comparacao.difer >= 0 ? 'sobe' : 'desce')}>
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                       strokeLinejoin="round">
                    <path d={comparacao.difer >= 0 ? 'M3 11l5-5 5 5' : 'M3 5l5 5 5-5'} />
                  </svg>
                  <b>
                    {comparacao.difer < 0 && !comparacao.semSinal ? '− ' : ''}
                    {dinheiro(Math.abs(comparacao.difer))}
                  </b>{' '}
                  <span>{comparacao.texto}</span>
                </span>
              )}

              {/* O líquido abre a conta em três linhas em vez de aparecer
                  pronto: assim dá para conferir, em vez de confiar. */}
              {verLiquido && (
                <div className="din-taxa">
                  <div className="din-taxa__linha">
                    <span>Cobrado</span><b>{dinheiro(s.bruto)}</b>
                  </div>
                  <div className="din-taxa__linha din-taxa__linha--tira">
                    <span>Taxa do Stripe{' '}
                      <em>{s.bruto ? (s.taxa / s.bruto * 100).toFixed(2).replace('.', ',') + '%' : ''}</em>
                    </span>
                    <b>− {dinheiro(s.taxa)}</b>
                  </div>
                  <div className="din-taxa__linha din-taxa__linha--fim">
                    <span>Ficou com você</span><b>{dinheiro(s.liquido)}</b>
                  </div>
                </div>
              )}

              <p className="din-nota">
                {verLiquido
                  ? 'O que o Stripe reteve em cada cobrança, somado. A taxa muda por cobrança: cartão de fora do Brasil e parcelamento custam mais que o cartão nacional à vista. Imposto não entra nesta conta.'
                  : 'Tudo que foi pago no período, assinatura mais recarga. É dinheiro que entrou de verdade, e não cobrança em aberto.'}
              </p>
            </div>
          )}
        </div>

        {/* Some com todas as moedas: este cartão só sabe falar de uma por vez. */}
        {!todas && (
          <div className="conta-card adm-card">
            <h2 className="conta-h2">De onde vem</h2>
            <p className="conta-p">
              {mesAberto !== null || atalho === 'ano' ? 'Em ' + nomeDoPeriodo() : 'Nos últimos 12 meses'}
              , em {info(moeda).nome.toLowerCase()}.
            </p>
            <div className="din-fonte">
              <div className="din-barra" aria-hidden="true">
                <i style={{ width: pctAssinatura + '%' }} />
                <i style={{ width: (100 - pctAssinatura) + '%' }} />
              </div>
              <div className="din-legenda">
                <div>
                  <span><em className="a" />Assinatura</span>
                  <b>{dinheiro(s.assinatura)}</b>
                </div>
                <div>
                  <span><em className="b" />Recarga avulsa</span>
                  <b>{dinheiro(s.recarga)}</b>
                </div>
                {/* Cobrança que entrou e não bate com assinatura nem com recarga
                    nossa. Só aparece quando existe: numa tela onde ela é zero,
                    mostrá-la faria procurar um problema que não tem. Quando
                    aparece, é para ser olhada. */}
                {!!s.outro && (
                  <div>
                    <span><em className="c" />Sem origem conhecida</span>
                    <b>{dinheiro(s.outro)}</b>
                  </div>
                )}
              </div>
            </div>

            <p className="din-nota">
              {s.cobrancas} {s.cobrancas === 1 ? 'cobrança paga' : 'cobranças pagas'} no período.
              {s.reembolso > 0 && ' ' + dinheiro(s.reembolso) + ' devolvidos, já fora do total acima.'}
            </p>
          </div>
        )}
      </div>

      {/* ── OS NÚMEROS DE CONTEXTO ──
          Eles não obedecem ao período de propósito: são sobre o estado de
          HOJE, e não sobre o que entrou num recorte. Misturá-los com a régua
          de meses faria o recorrente mudar ao clicar num mês, e recorrente que
          muda com o mês escolhido não é recorrente.

          Ficam num degrau visualmente abaixo do número grande porque são o
          contexto dele, e não uma segunda resposta. */}
      {resumo && (
        <div className="din-fila">
          <div className="conta-card adm-card din-cel">
            <p className="eyebrow">Recorrente por mês</p>
            <strong>{dinheiro(resumo.recorrente_centavos, moedas[0]?.codigo)}</strong>
            <p>
              A soma das mensalidades ativas hoje, com o anual dividido por doze.
              Recarga não entra: ela é avulsa e não se repete sozinha.
            </p>
          </div>
          <div className="conta-card adm-card din-cel">
            <p className="eyebrow">Ticket médio</p>
            <strong>
              {contas.length
                ? dinheiro(Math.round(contas.reduce((a, c) => a + c.total, 0) / contas.length),
                           moedas[0]?.codigo)
                : '—'}
            </strong>
            <p>Quanto cada conta pagante já pagou, na média, contando recarga.</p>
          </div>
          <div className="conta-card adm-card din-cel">
            <p className="eyebrow">Quanto dura uma conta</p>
            <strong>
              {resumo.meses_de_vida >= 0.1
                ? resumo.meses_de_vida.toFixed(1).replace('.', ',') + ' meses'
                : '—'}
            </strong>
            {/* Só quem já cancelou entra nesta média: quem ainda assina não tem
                duração final, e incluir essas contas puxaria o número para
                baixo toda vez que alguém novo entrasse. */}
            <p>
              Média de quem já cancelou, entre {resumo.assinaturas_encerradas}{' '}
              {resumo.assinaturas_encerradas === 1 ? 'conta' : 'contas'}.
            </p>
          </div>
          <div className="conta-card adm-card din-cel">
            <p className="eyebrow">Assinaturas ativas</p>
            <strong>{resumo.assinaturas_ativas}</strong>
            <p>
              {resumo.assinaturas_encerradas > 0
                ? resumo.assinaturas_encerradas + (resumo.assinaturas_encerradas === 1
                    ? ' já foi encerrada.' : ' já foram encerradas.')
                : 'Nenhuma encerrada até agora.'}
            </p>
          </div>
        </div>
      )}

      {/* ── QUANTO CADA CONTA JÁ PAGOU ──
          Do primeiro mês até hoje, e não no período: a pergunta aqui é quem
          sustenta o negócio, e ela não muda porque alguém clicou em setembro.

          Sai do nosso banco, e não do Stripe. A pergunta é sobre a CONTA, e
          cruzar cobrança com conta pelo customer jogaria no balde errado tudo
          que não casasse. */}
      {contas.length > 0 && (
        <div className="conta-card adm-card">
          <h2 className="conta-h2">Quanto cada conta já pagou</h2>
          <p className="conta-p">
            A mensalidade de cada ciclo mais as recargas, desde a primeira cobrança.
            Ordenado por quem mais pagou.
          </p>
          <div className="fat-rolo">
            <table className="fat">
              <thead>
                <tr>
                  <th>Conta</th><th>Plano</th><th>Desde</th>
                  <th className="adm-num">Ciclos</th>
                  <th className="adm-num">Assinatura</th>
                  <th className="adm-num">Recarga</th>
                  <th className="adm-num">Total pago</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="adm-nome">{c.nome || '—'}</div>
                      <div className="adm-sub">
                        <span className="adm-sub-txt">{c.email}</span>
                        {c.cancelou && <span className="fat-selo fat-selo--aberta">Cancelou</span>}
                      </div>
                    </td>
                    <td>{c.plano || '—'}</td>
                    <td className="adm-mono">
                      {c.desde ? new Date(c.desde).toLocaleDateString('pt-BR',
                        { month: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                    <td className="adm-num">{c.ciclos}</td>
                    <td className="adm-num">{dinheiro(c.assinatura, c.moeda)}</td>
                    <td className="adm-num">
                      {c.recarga ? dinheiro(c.recarga, c.moeda) : '—'}
                    </td>
                    <td className="adm-num"><b>{dinheiro(c.total, c.moeda)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="adm-total">
            {contas.length} {contas.length === 1 ? 'conta já pagou' : 'contas já pagaram'}{' '}
            alguma coisa.
          </p>
        </div>
      )}

      <div className="conta-card adm-card">
        <div className="adm-ficha-cab">
          <h2 className="conta-h2">Levar para a contabilidade</h2>
          {/* Excel primeiro, CSV ao lado. O Excel e o que se usa: coluna na
              largura certa e valor como numero, entao a coluna soma. O CSV
              fica porque ele e o que outros sistemas importam. */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="fat-ver" disabled={!!baixando}
                    onClick={() => baixar('xlsx')}>
              {baixando === 'xlsx' ? 'Gerando...' : 'Baixar em Excel'}
            </button>
            <button className="fat-ver" disabled={!!baixando}
                    onClick={() => baixar('csv')}>
              {baixando === 'csv' ? 'Gerando...' : 'CSV'}
            </button>
          </div>
        </div>
        <p className="conta-p">
          Uma linha por mês e moeda, com bruto, taxa, líquido, reembolso e quantas
          cobranças. No Excel os valores vão como número, e não como texto: a coluna
          soma sem ninguém reformatar nada.
        </p>
      </div>
    </>
  );
}
