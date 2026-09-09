'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  CALENDÁRIO DE FAIXA — escolher "de 12 a 19"
//
//  Um mês por vez, e a faixa se monta em dois cliques: o primeiro põe o
//  começo, o segundo põe o fim. Clicar antes do começo recomeça a faixa dali,
//  em vez de recusar: quem clica num dia anterior está corrigindo, e um
//  calendário que responde "não pode" a uma correção óbvia faz a pessoa fechar
//  e abrir de novo.
//
//  ── POR QUE UM MÊS, E NÃO DOIS LADO A LADO ──
//  Dois meses ajudam faixas que cruzam a virada, e custam 640px de largura.
//  Ele abre ancorado num botão dentro de um cartão, e nessa largura o segundo
//  mês sairia da tela em qualquer laptop. As setas resolvem a virada.
//
//  ── AS DATAS SÃO STRING 'YYYY-MM-DD', E NUNCA Date ──
//  É a mesma forma que o servidor usa para agrupar. Comparar duas strings
//  dessas dá a ordem certa sozinha, sem fuso no meio: `Date` aqui traria de
//  volta o erro que o servidor acabou de corrigir, onde uma cobrança das 22h
//  aparecia no dia seguinte.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { tOpt } from '../lib/i18n';

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const dois = (n) => String(n).padStart(2, '0');
const chave = (ano, mes, dia) => `${ano}-${dois(mes + 1)}-${dois(dia)}`;

/* O dia de hoje NO FUSO DAQUI, pelo mesmo caminho do servidor. `new Date()`
   com `getDate()` usaria o fuso do computador de quem abre a tela, e num
   notebook configurado em outro país "hoje" seria outro dia. */
export function hojeISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/* "12 a 19 de março de 2026", e quando muda o mês ou o ano, a frase cresce só
   o necessário. Um dia sozinho não vira "12 a 12". */
export function faixaPorExtenso(de, ate) {
  if (!de) return '';
  const [a1, m1, d1] = de.split('-').map(Number);
  if (!ate || ate === de) return `${d1} de ${MES_LONGO[m1 - 1]} de ${a1}`;
  const [a2, m2, d2] = ate.split('-').map(Number);
  if (a1 !== a2) return `${d1} de ${MES_LONGO[m1 - 1]} de ${a1} a ${d2} de ${MES_LONGO[m2 - 1]} de ${a2}`;
  if (m1 !== m2) return `${d1} de ${MES_LONGO[m1 - 1]} a ${d2} de ${MES_LONGO[m2 - 1]} de ${a2}`;
  return `${d1} a ${d2} de ${MES_LONGO[m1 - 1]} de ${a1}`;
}

export default function Calendario({ de, ate, min, max, aoEscolher, aoFechar }) {
  const teto = max || hojeISO();
  const piso = min || '2000-01-01';

  /* Abre no mês do começo da faixa, ou no mês do último dia com dado. Abrir
     sempre no mês corrente faria quem está conferindo março voltar a setembro
     toda vez que reabrisse. */
  const inicial = (de || teto).split('-').map(Number);
  const [ano, setAno] = useState(inicial[0]);
  const [mes, setMes] = useState(inicial[1] - 1);

  /* `parcial` é o começo escolhido enquanto o fim não veio. Ele não sai para
     fora: só quando a faixa fecha é que o pai recebe alguma coisa. Assim um
     calendário aberto e abandonado no meio não muda a tela atrás dele. */
  const [parcial, setParcial] = useState(null);
  const [sobre, setSobre] = useState(null);   // o dia sob o cursor, para a prévia
  const caixa = useRef(null);

  // Escape fecha. Clique fora também, e ele escuta na fase de captura para o
  // clique no próprio botão que abriu não fechar e reabrir no mesmo gesto.
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') aoFechar(); };
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) aoFechar(); };
    window.addEventListener('keydown', tecla);
    document.addEventListener('mousedown', fora, true);
    return () => {
      window.removeEventListener('keydown', tecla);
      document.removeEventListener('mousedown', fora, true);
    };
  }, [aoFechar]);

  const grade = useMemo(() => {
    const primeiro = new Date(ano, mes, 1).getDay();     // 0 = domingo
    const quantos = new Date(ano, mes + 1, 0).getDate();
    const celulas = [];
    for (let i = 0; i < primeiro; i++) celulas.push(null);
    for (let d = 1; d <= quantos; d++) celulas.push(d);
    return celulas;
  }, [ano, mes]);

  /* Os extremos da faixa que o desenho deve mostrar AGORA. Com um começo
     escolhido e o mouse sobre outro dia, a prévia é a faixa que sairia se a
     pessoa clicasse ali — é o que dá a sensação de estar arrastando. */
  const [ini, fim] = (() => {
    if (parcial) {
      const outro = sobre || parcial;
      return parcial <= outro ? [parcial, outro] : [outro, parcial];
    }
    if (de && ate) return [de, ate];
    if (de) return [de, de];
    return [null, null];
  })();

  function clicar(dia) {
    const k = chave(ano, mes, dia);
    if (!parcial) { setParcial(k); return; }
    // Clicar antes do começo recomeça dali: é correção, e não erro.
    const dois_ = parcial <= k ? [parcial, k] : [k, parcial];
    setParcial(null);
    setSobre(null);
    aoEscolher({ de: dois_[0], ate: dois_[1] });
  }

  function andar(quanto) {
    const d = new Date(ano, mes + quanto, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth());
  }

  /* Não dá para andar para um mês inteiro fora do que existe. O limite é por
     MÊS e não por dia, senão o botão travaria no meio do mês corrente. */
  const antesDoPiso = chave(ano, mes, 1) <= piso;
  const depoisDoTeto = chave(ano, mes, 1) >= teto.slice(0, 8) + '01';

  return (
    <div className="cal" ref={caixa} role="dialog" aria-label={tOpt('Escolher o período')}>
      <div className="cal__cab">
        <button type="button" className="cal__seta" onClick={() => andar(-1)}
                disabled={antesDoPiso} aria-label={tOpt('Mês anterior')}>
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
               strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <span className="cal__mes">{MES_LONGO[mes]} <b>{ano}</b></span>
        <button type="button" className="cal__seta" onClick={() => andar(1)}
                disabled={depoisDoTeto} aria-label={tOpt('Próximo mês')}>
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor"
               strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>
      </div>

      <div className="cal__semana" aria-hidden="true">
        {SEMANA.map((l, i) => <span key={i}>{l}</span>)}
      </div>

      <div className="cal__grade" onMouseLeave={() => setSobre(null)}>
        {grade.map((dia, i) => {
          if (dia === null) return <span key={'v' + i} className="cal__vao" />;
          const k = chave(ano, mes, dia);
          const forjado = k < piso || k > teto;
          const dentro = ini && fim && k >= ini && k <= fim;
          return (
            <button
              key={k}
              type="button"
              disabled={forjado}
              className={'cal__dia'
                + (dentro ? ' cal__dia--dentro' : '')
                + (k === ini ? ' cal__dia--ini' : '')
                + (k === fim ? ' cal__dia--fim' : '')
                + (k === teto ? ' cal__dia--hoje' : '')}
              onMouseEnter={() => setSobre(k)}
              onFocus={() => setSobre(k)}
              onClick={() => clicar(dia)}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <div className="cal__pe">
        {/* A instrução aparece só enquanto ela é verdade: com o começo posto, a
            frase muda para o que falta fazer. Um texto fixo com dois passos
            deixa a pessoa procurando em qual ela está. */}
        <span className="cal__dica">
          {tOpt(parcial ? 'Agora escolha o último dia.' : 'Clique no primeiro dia.')}
        </span>
        {(de || parcial) && (
          <button type="button" className="cal__limpar"
                  onClick={() => { setParcial(null); setSobre(null); aoEscolher(null); }}>
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
