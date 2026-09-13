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
import Calendario, { faixaPorExtenso, hojeISO } from './Calendario';
import { useIdioma } from '../lib/i18n';

const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
const MES_NOME = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};

const TODAS = '__todas__';   // a moeda que não é uma moeda

function mesPorExtenso(chave, idioma) {
  const p = String(chave || '').split('-');
  if (!p[0]) return '';
  const dt = new Date(Date.UTC(+p[0], (+p[1] || 1) - 1, 1));
  return new Intl.DateTimeFormat(LOCALE[idioma] || LOCALE.pt, {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(dt);
}

const VAZIO = { assinatura: 0, recarga: 0, outro: 0, taxa: 0, reembolso: 0,
                cobrancas: 0, meses: 0, bruto: 0, liquido: 0 };

export default function AdminDinheiro() {
  const { idioma, t } = useIdioma();
  const locale = LOCALE[idioma] || LOCALE.pt;
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [moeda, setMoeda] = useState(null);   // null até saber quais existem
  const [anoAberto, setAnoAberto] = useState(new Date().getFullYear());
  /* A faixa exata, em 'YYYY-MM-DD'. Quando ela existe, ganha de tudo: do mes
     aberto e do atalho. E ela e o unico periodo que nao cabe na regua, entao
     a regua para de marcar mes enquanto ela vale. */
  const [faixa, setFaixa] = useState(null);
  const [calAberto, setCalAberto] = useState(false);
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
  /* `dias` e a contagem de verdade, e `meses` e a soma dela (o servidor manda
     as duas). A regua e mensal, entao ela le `meses`; todo o resto le `dias`,
     porque so ele responde "de 12 a 19". */
  const dias = dados?.dias || {};
  const resumo = dados?.resumo || null;
  const contas = dados?.contas || [];

  const info = (cod) => moedas.find((m) => m.codigo === cod)
    || { codigo: cod, simbolo: String(cod || '').toUpperCase(), nome: '', primeira: '' };

  const dinheiro = (centavos, cod) =>
    info(cod || moeda).simbolo + ' '
    + (centavos / 100).toLocaleString(locale,
        { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* O primeiro dia dos ultimos 12 meses, contado a partir de HOJE. */
  const inicio12m = useMemo(() => {
    const [a, m, d] = hojeISO().split('-').map(Number);
    const x = new Date(Date.UTC(a, m - 1, d));
    x.setUTCMonth(x.getUTCMonth() - 12);
    return x.toISOString().slice(0, 10);
  }, []);

  /* Um DIA do período conta? A regra é a mesma para todos os blocos, então ela
     mora num lugar só.

     Datas em 'YYYY-MM-DD' se comparam como texto e dão a ordem certa sozinhas.
     Virar `Date` aqui traria de volta o erro de fuso que o servidor acabou de
     corrigir, onde a cobrança das 22h aparecia no dia seguinte.

     "ÚLTIMOS 12 MESES" ERA IGUAL A "O ANO TODO", e isso era defeito: os dois
     caíam no mesmo `return ano === anoAberto`, então os dois rótulos mostravam
     o MESMO número. Agora ele conta 12 meses para trás de hoje, que é o que
     ele sempre disse fazer. */
  const noPeriodo = (dia) => {
    const k = String(dia);
    if (faixa) return k >= faixa.de && k <= faixa.ate;
    if (mesAberto !== null) {
      return k.slice(0, 7) === anoAberto + '-' + String(mesAberto + 1).padStart(2, '0');
    }
    if (atalho === 'tudo') return true;
    if (atalho === '12m') return k >= inicio12m;
    return k.slice(0, 4) === String(anoAberto);
  };

  const somaDaMoeda = (cod) => {
    const s = { ...VAZIO };
    const m = dias[cod] || {};
    /* `s.meses` alimenta a média mensal, e agora ele conta MESES DISTINTOS
       tocados pelo período, e não baldes: varrendo dias, `s.meses++` contaria
       dias e a média sairia dividida por trinta. */
    const mesesTocados = new Set();
    Object.keys(m).forEach((k) => {
      if (!noPeriodo(k)) return;
      const v = m[k];
      s.assinatura += v.assinatura; s.recarga += v.recarga; s.outro += v.outro;
      s.taxa += v.taxa; s.reembolso += v.reembolso; s.cobrancas += v.cobrancas;
      mesesTocados.add(k.slice(0, 7));
    });
    s.meses = mesesTocados.size;
    s.bruto = s.assinatura + s.recarga + s.outro;
    s.liquido = s.bruto - s.taxa;
    return s;
  };

  /* A data da primeira cobrança. Com uma moeda é a dela; com todas, a mais
     antiga entre elas, que é quando o negócio começou a receber. */
  const desdeQuando = () => {
    if (moeda !== TODAS) return mesPorExtenso(info(moeda).primeira, idioma);
    const menor = moedas.reduce((a, m) => (!a || m.primeira < a ? m.primeira : a), null);
    return menor ? mesPorExtenso(menor, idioma) : t('adm_din_comeco');
  };

  /* O dia da primeira cobranca, entre todas as moedas. E o piso do calendario:
     antes dele nao existe dinheiro nenhum, e deixar escolher ali seria oferecer
     uma resposta vazia como se fosse uma resposta.

     `primeira` agora vem como 'YYYY-MM-DD' (o servidor passou a agrupar por
     dia). Como todas vem no mesmo formato, comparar como texto continua dando
     a mais antiga. */
  const menorPrimeira = useMemo(
    () => moedas.reduce((a, m) => (!a || m.primeira < a ? m.primeira : a), null),
    [moedas]);

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
    const linha = MES_NOME[idioma].map((_, i) => {
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
  }, [meses, moedas, moeda, anoAberto, todas, idioma]);

  const nomeDoPeriodo = () => {
    if (mesAberto !== null) {
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
        .format(new Date(anoAberto, mesAberto, 1));
    }
    if (atalho === 'ano') return String(anoAberto);
    return t('adm_din_ult12_minusculo');
  };

  const rotulo = faixa ? t('adm_din_entrou_de') + ' ' + faixaPorExtenso(faixa.de, faixa.ate)
    : mesAberto !== null || atalho === 'ano' ? t('adm_din_entrou_em') + ' ' + nomeDoPeriodo()
    : atalho === 'tudo' ? t('adm_din_entrou_desde') + ' ' + desdeQuando() : t('adm_din_entrou_ult12');

  /* Quantos dias a faixa cobre, contando as duas pontas: de 12 a 19 são oito
     dias, e não sete. É o divisor da média. */
  const diasNaFaixa = faixa
    ? Math.round((Date.parse(faixa.ate) - Date.parse(faixa.de)) / 86400000) + 1
    : 0;

  /* A comparação só faz sentido com um mês aberto: comparar "o ano todo" com o
     quê? Sem mês, a linha vira a média mensal do período. */
  const anterior = mesAberto !== null && mesAberto > 0
    ? (meses[moeda] || {})[anoAberto + '-' + String(mesAberto).padStart(2, '0')]
    : null;
  const total = verLiquido ? s.liquido : s.bruto;
  let comparacao = null;
  if (!faixa && mesAberto !== null && anterior) {
    const antes = anterior.assinatura + anterior.recarga + anterior.outro
      - (verLiquido ? anterior.taxa : 0);
    const mesAnterior = new Intl.DateTimeFormat(locale, { month: 'long' })
      .format(new Date(anoAberto, mesAberto - 1, 1));
    comparacao = { difer: total - antes, texto: t('adm_din_em_relacao') + ' ' + mesAnterior };
  } else if (faixa) {
    /* Numa faixa de dias a média MENSAL não diz nada: oito dias não são um
       mês, e dividir por "1 mês tocado" daria o total de novo com outro nome.
       A média por dia é a que responde alguma coisa. */
    comparacao = {
      difer: diasNaFaixa ? Math.round(total / diasNaFaixa) : 0,
      texto: t('adm_din_media_dia'), semSinal: true,
    };
  } else if (mesAberto === null) {
    comparacao = {
      difer: s.meses ? Math.round(total / s.meses) : 0,
      texto: t('adm_din_media_mes'), semSinal: true,
    };
  }

  function trocarAtalho(qual) {
    setAtalho(qual);
    setMesAberto(null);
    // Um atalho e uma faixa respondem à mesma pergunta. Deixar as duas ligadas
    // faria o rótulo dizer uma coisa e o número mostrar outra.
    setFaixa(null);
    /* Qualquer atalho traz a régua de volta para o ano corrente. Sem isto,
       quem estivesse olhando um ano vazio e clicasse no atalho de tudo veria o
       total inteiro em cima de um gráfico vazio, e os dois discordavam. */
    setAnoAberto(new Date().getFullYear());
  }

  if (erro) {
    return (
      <div className="conta-card adm-card">
        <h2 className="conta-h2">{t('adm_din_erro_titulo')}</h2>
        <p className="conta-p">{erro}</p>
      </div>
    );
  }
  if (!dados) {
    return <div className="conta-card adm-card"><p className="conta-p">{t('adm_din_lendo')}</p></div>;
  }
  if (!moedas.length) {
    return (
      <div className="conta-card adm-card">
        <h2 className="conta-h2">{t('adm_din_vazio_titulo')}</h2>
        <p className="conta-p">{t('adm_din_vazio_desc')}</p>
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
            <button className="per__seta" aria-label={t('adm_din_ano_anterior')}
                    disabled={anoAberto <= primeiroAno}
                    onClick={() => { setAnoAberto((a) => a - 1); setMesAberto(null); setFaixa(null);
                                     if (atalho === 'tudo') setAtalho('ano'); }}>
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>
            {/* O ANO ABRE O CALENDARIO.
                Antes ele so ligava o atalho "o ano todo", que ja existe logo
                ali do lado como botao com nome. Clicar num ano escrito grande
                pede um seletor de data, e era isso que faltava para responder
                "de 12 a 19". */}
            <div className="per__cal-wrap">
              <button className={'per__nome' + (faixa ? ' per__nome--faixa' : '')}
                      onClick={() => setCalAberto((v) => !v)}
                      aria-haspopup="dialog" aria-expanded={calAberto}
                      title={t('adm_din_escolher_dias')}>
                {faixa ? faixaPorExtenso(faixa.de, faixa.ate) : anoAberto}
              </button>
              {calAberto && (
                <Calendario
                  de={faixa?.de} ate={faixa?.ate}
                  min={menorPrimeira} max={hojeISO()}
                  aoFechar={() => setCalAberto(false)}
                  aoEscolher={(f) => {
                    setFaixa(f);
                    setCalAberto(false);
                    if (f) {
                      // A regua acompanha: ela e mensal, e olhar marco com a
                      // regua parada em setembro seria a tela discordando de
                      // si mesma.
                      setMesAberto(null);
                      setAnoAberto(+f.de.slice(0, 4));
                    }
                  }}
                />
              )}
            </div>
            <button className="per__seta" aria-label={t('adm_din_ano_proximo')}
                    disabled={anoAberto >= new Date().getFullYear()}
                    onClick={() => { setAnoAberto((a) => a + 1); setMesAberto(null); setFaixa(null);
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
            <div className="per__moedas" role="group" aria-label={t('adm_din_moeda')}>
              {moedas.concat([{ codigo: TODAS, simbolo: t('adm_din_todas'), nome: t('adm_din_todas_moedas') }])
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
                    onClick={() => trocarAtalho('12m')}>{t('adm_din_ult12')}</button>
            <button className={mesAberto === null && atalho === 'ano' ? 'ativo' : undefined}
                    onClick={() => trocarAtalho('ano')}>{t('adm_din_ano_todo')}</button>
            <button className={mesAberto === null && atalho === 'tudo' ? 'ativo' : undefined}
                    onClick={() => trocarAtalho('tudo')}>{t('adm_din_desde')} {desdeQuando()}</button>
          </div>
        </div>

        <div className="per__meses">
          {MES_NOME[idioma].map((nome, i) => {
            const v = regua.linha[i];
            const alt = v && regua.maior ? Math.round((v / regua.maior) * 100) : 0;
            return (
              <button key={nome} type="button"
                      className={'per__mes' + (mesAberto === i ? ' ativo' : '')}
                      /* Mês sem cobrança não aceita clique: abrir um mês vazio
                         só troca a tela toda por zeros, e isso não é uma
                         resposta que alguém pediu. */
                      disabled={v === null}
                      title={v === null ? undefined : new Intl.DateTimeFormat(locale, { month: 'long' })
                        .format(new Date(anoAberto, i, 1)) + ': ' + (todas
                          ? v + ' ' + t(v === 1 ? 'adm_din_cobranca' : 'adm_din_cobrancas') : dinheiro(v))}
                      onClick={() => {
                        /* Clicar de novo no mês aberto volta para o ano: é o
                           mesmo gesto de ida e volta, sem procurar um "limpar". */
                        setFaixa(null);
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
            {t('adm_din_regua_moedas')}
          </p>
        )}
        {!regua.maior && (
          <p className="per__vazio">
            {t('adm_din_sem_cobranca_ano').replace('{ano}', anoAberto).replace('{desde}', desdeQuando())}
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
              <h2 className="conta-h2">{t('adm_din_por_moeda_titulo')}</h2>
              <p className="conta-p">
                {mesAberto !== null || atalho === 'ano' ? t('adm_din_em') + ' ' + nomeDoPeriodo() + '.'
                  : atalho === 'tudo' ? t('adm_din_desde') + ' ' + desdeQuando() + '.'
                  : t('adm_din_ult12_frase')}
              </p>
              <div className="fat-rolo">
                <table className="fat din-tabela-moedas">
                  <thead>
                    <tr>
                      <th>{t('adm_din_moeda')}</th><th className="adm-num">{t('adm_din_bruto')}</th>
                      <th className="adm-num">{t('adm_din_taxa')}</th><th className="adm-num">{t('adm_din_liquido')}</th>
                      <th className="adm-num">{t('adm_din_cobrancas')}</th><th className="fat__acao" />
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
                              {t('adm_din_ver_so')} {m.nome.toLowerCase()}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="din-nota">
                {t('adm_din_nota_moedas')}
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
                        onClick={() => setVerLiquido(false)}>{t('adm_din_bruto')}</button>
                <button role="tab" aria-selected={verLiquido}
                        className={verLiquido ? 'ativa' : undefined}
                        onClick={() => setVerLiquido(true)}>{t('adm_din_liquido')}</button>
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
                    <span>{t('adm_din_cobrado')}</span><b>{dinheiro(s.bruto)}</b>
                  </div>
                  <div className="din-taxa__linha din-taxa__linha--tira">
                    <span>{t('adm_din_taxa_stripe')}{' '}
                      <em>{s.bruto ? (s.taxa / s.bruto * 100).toFixed(2).replace('.', ',') + '%' : ''}</em>
                    </span>
                    <b>− {dinheiro(s.taxa)}</b>
                  </div>
                  <div className="din-taxa__linha din-taxa__linha--fim">
                    <span>{t('adm_din_ficou')}</span><b>{dinheiro(s.liquido)}</b>
                  </div>
                </div>
              )}

              <p className="din-nota">
                {verLiquido
                  ? t('adm_din_nota_liquido')
                  : t('adm_din_nota_bruto')}
              </p>
            </div>
          )}
        </div>

        {/* Some com todas as moedas: este cartão só sabe falar de uma por vez. */}
        {!todas && (
          <div className="conta-card adm-card">
            <h2 className="conta-h2">{t('adm_din_origem')}</h2>
            <p className="conta-p">
              {mesAberto !== null || atalho === 'ano' ? t('adm_din_em') + ' ' + nomeDoPeriodo() : t('adm_din_ult12')}
              {t('adm_din_em_moeda')} {info(moeda).nome.toLowerCase()}.
            </p>
            <div className="din-fonte">
              <div className="din-barra" aria-hidden="true">
                <i style={{ width: pctAssinatura + '%' }} />
                <i style={{ width: (100 - pctAssinatura) + '%' }} />
              </div>
              <div className="din-legenda">
                <div>
                  <span><em className="a" />{t('adm_din_assinatura')}</span>
                  <b>{dinheiro(s.assinatura)}</b>
                </div>
                <div>
                  <span><em className="b" />{t('adm_din_recarga')}</span>
                  <b>{dinheiro(s.recarga)}</b>
                </div>
                {/* Cobrança que entrou e não bate com assinatura nem com recarga
                    nossa. Só aparece quando existe: numa tela onde ela é zero,
                    mostrá-la faria procurar um problema que não tem. Quando
                    aparece, é para ser olhada. */}
                {!!s.outro && (
                  <div>
                    <span><em className="c" />{t('adm_din_sem_origem')}</span>
                    <b>{dinheiro(s.outro)}</b>
                  </div>
                )}
              </div>
            </div>

            <p className="din-nota">
              {s.cobrancas} {t(s.cobrancas === 1 ? 'adm_din_cobranca_paga' : 'adm_din_cobrancas_pagas')} {t('adm_din_no_periodo')}
              {s.reembolso > 0 && ' ' + t('adm_din_reembolso').replace('{valor}', dinheiro(s.reembolso))}
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
            <p className="eyebrow">{t('adm_din_recorrente')}</p>
            <strong>{dinheiro(resumo.recorrente_centavos, moedas[0]?.codigo)}</strong>
            <p>
              {t('adm_din_recorrente_desc')}
            </p>
          </div>
          <div className="conta-card adm-card din-cel">
            <p className="eyebrow">{t('adm_din_ticket')}</p>
            <strong>
              {contas.length
                ? dinheiro(Math.round(contas.reduce((a, c) => a + c.total, 0) / contas.length),
                           moedas[0]?.codigo)
                : '—'}
            </strong>
            <p>{t('adm_din_ticket_desc')}</p>
          </div>
          <div className="conta-card adm-card din-cel">
            <p className="eyebrow">{t('adm_din_duracao')}</p>
            <strong>
              {resumo.meses_de_vida >= 0.1
                ? resumo.meses_de_vida.toLocaleString(locale, { maximumFractionDigits: 1 }) + ' ' + t('adm_din_meses')
                : '—'}
            </strong>
            {/* Só quem já cancelou entra nesta média: quem ainda assina não tem
                duração final, e incluir essas contas puxaria o número para
                baixo toda vez que alguém novo entrasse. */}
            <p>
              {t('adm_din_media_cancelou')} {resumo.assinaturas_encerradas}{' '}
              {t(resumo.assinaturas_encerradas === 1 ? 'adm_din_conta' : 'adm_din_contas')}.
            </p>
          </div>
          <div className="conta-card adm-card din-cel">
            <p className="eyebrow">{t('adm_din_ativas')}</p>
            <strong>{resumo.assinaturas_ativas}</strong>
            <p>
              {resumo.assinaturas_encerradas > 0
                ? resumo.assinaturas_encerradas + (resumo.assinaturas_encerradas === 1
                    ? t('adm_din_uma_encerrada') : t('adm_din_varias_encerradas'))
                : t('adm_din_nenhuma_encerrada')}
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
          <h2 className="conta-h2">{t('adm_din_contas_titulo')}</h2>
          <p className="conta-p">
            {t('adm_din_contas_desc')}
          </p>
          <div className="fat-rolo">
            <table className="fat">
              <thead>
                <tr>
                  <th>{t('adm_din_conta')}</th><th>{t('adm_din_plano')}</th><th>{t('adm_din_desde')}</th>
                  <th className="adm-num">{t('adm_din_ciclos')}</th>
                  <th className="adm-num">{t('adm_din_assinatura')}</th>
                  <th className="adm-num">{t('adm_din_recarga_curta')}</th>
                  <th className="adm-num">{t('adm_din_total_pago')}</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="adm-nome">{c.nome || '—'}</div>
                      <div className="adm-sub">
                        <span className="adm-sub-txt">{c.email}</span>
                        {c.cancelou && <span className="fat-selo fat-selo--aberta">{t('adm_din_cancelou')}</span>}
                      </div>
                    </td>
                    <td>{c.plano || '—'}</td>
                    <td className="adm-mono">
                      {c.desde ? new Date(c.desde).toLocaleDateString(locale,
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
            {contas.length} {t(contas.length === 1 ? 'adm_din_conta_pagou' : 'adm_din_contas_pagaram')}
          </p>
        </div>
      )}

      <div className="conta-card adm-card">
        <div className="adm-ficha-cab">
          <h2 className="conta-h2">{t('adm_din_contabilidade')}</h2>
          {/* Excel primeiro, CSV ao lado. O Excel e o que se usa: coluna na
              largura certa e valor como numero, entao a coluna soma. O CSV
              fica porque ele e o que outros sistemas importam. */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="fat-ver" disabled={!!baixando}
                    onClick={() => baixar('xlsx')}>
              {baixando === 'xlsx' ? t('adm_din_gerando') : t('adm_din_excel')}
            </button>
            <button className="fat-ver" disabled={!!baixando}
                    onClick={() => baixar('csv')}>
              {baixando === 'csv' ? t('adm_din_gerando') : 'CSV'}
            </button>
          </div>
        </div>
        <p className="conta-p">
          {t('adm_din_contabilidade_desc')}
        </p>
      </div>
    </>
  );
}
