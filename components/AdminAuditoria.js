'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  AUDITORIA — as duas varreduras que olham a base inteira
//
//  As quatro rotas de auditoria existem no `cora-auth` desde agosto e nunca
//  tiveram tela: até 09/09/2026 a única forma de lê-las era `curl`. Duas
//  entram aqui, e as outras duas não, por motivo:
//
//    orfaos ............... entra. Varre a base toda.
//    recargas-duplicadas .. entra. Varre a base toda.
//    extrato .............. NÃO. A aba Extrato da ficha já mostra a mesma
//                           tabela `transacoes`, com o pareamento
//                           débito↔estorno e o desfecho do pedido. Uma
//                           segunda tela, mais pobre, só daria duas respostas
//                           para a mesma pergunta.
//    consistencia ......... NÃO aqui. Ela é de UMA conta, e foi para dentro
//                           da aba Extrato da ficha, onde a conta já está
//                           aberta e ninguém precisa digitar o e-mail de novo.
//
//  ── O QUE ESTA TELA NÃO É ──
//  Ela não acusa ninguém. As duas rotas mandam um aviso junto, e o aviso é o
//  ponto: débito sem estorno é o NORMAL de uma geração que deu certo, e duas
//  recargas iguais podem ser alguém que comprou duas vezes. Uma tela que
//  chamasse essas linhas de "erro" ia fazer alguém devolver crédito de uma
//  venda boa. Por isso cada bloco explica o que a linha quer dizer ANTES de
//  mostrar a lista, e cada linha leva para a ficha, que é onde a resposta
//  está.
//
//  ── QUEM ABRE ──
//  Admin e gerente. As duas rotas estão na `ROTAS_DO_GERENTE` do cora-auth:
//  são leitura, e não mexem em crédito nem em dinheiro.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { adminAuditoriaOrfaos, adminAuditoriaRecargasDuplicadas } from '../lib/auth';
import DropdownCora from './DropdownCora';

function quando(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function num(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

function dinheiro(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });
}

/* A distância entre as duas compras, na unidade que cabe. "1980 s" faz a
   pessoa dividir de cabeça, e esse é o número que decide se ela vai ao
   Stripe conferir. */
function distancia(segundos) {
  const s = Math.round(Number(segundos) || 0);
  if (s < 90) return s + ' s';
  return Math.round(s / 60) + ' min';
}

/* A casca dos dois blocos. Eles têm a mesma forma: um título, a frase que diz
   o que a linha significa, o período e a lista. Escritos duas vezes, os dois
   desandariam em ritmos diferentes na primeira mudança. */
function Bloco({ titulo, explica, periodo, resumo, erro, carregando, vazio, children }) {
  return (
    <section className="conta-card adm-card admin-aud">
      <div className="admin-aud__topo">
        <div className="admin-aud__txt">
          <h2 className="admin-aud__titulo">{titulo}</h2>
          <p className="admin-aud__explica">{explica}</p>
        </div>
        <div className="admin-aud__periodo">{periodo}</div>
      </div>

      {erro && <div className="login-erro" style={{ marginTop: 14 }}>{erro}</div>}
      {carregando && <p className="admin-aud__estado">Procurando…</p>}

      {!erro && !carregando && (
        resumo === null
          ? <p className="admin-aud__estado">{vazio}</p>
          : (
            <>
              <p className="admin-aud__resumo">{resumo}</p>
              <div className="admin-tabela-wrap">{children}</div>
            </>
          )
      )}
    </section>
  );
}

export default function AdminAuditoria({ onAbrirConta }) {
  const [horas, setHoras] = useState(24);
  const [orfaos, setOrfaos] = useState(null);
  const [orfaosErro, setOrfaosErro] = useState('');
  const [orfaosLendo, setOrfaosLendo] = useState(true);

  const [dias, setDias] = useState(90);
  const [dupes, setDupes] = useState(null);
  const [dupesErro, setDupesErro] = useState('');
  const [dupesLendo, setDupesLendo] = useState(true);

  useEffect(() => {
    let vivo = true;
    setOrfaosLendo(true); setOrfaosErro('');
    adminAuditoriaOrfaos(horas)
      .then((d) => { if (vivo) setOrfaos(d); })
      .catch((e) => { if (vivo) setOrfaosErro(e.message); })
      .finally(() => { if (vivo) setOrfaosLendo(false); });
    return () => { vivo = false; };
  }, [horas]);

  useEffect(() => {
    let vivo = true;
    setDupesLendo(true); setDupesErro('');
    adminAuditoriaRecargasDuplicadas(dias)
      .then((d) => { if (vivo) setDupes(d); })
      .catch((e) => { if (vivo) setDupesErro(e.message); })
      .finally(() => { if (vivo) setDupesLendo(false); });
    return () => { vivo = false; };
  }, [dias]);

  /* O e-mail vira caminho para a ficha quando quem chamou souber abrir uma.
     Sem isso ele segue sendo texto, e não um botão que não faz nada. */
  function Quem({ email, contaId }) {
    if (!onAbrirConta) return <span className="admin-aud__quem">{email || '—'}</span>;
    return (
      <button
        type="button"
        className="admin-aud__quem admin-aud__quem--liga"
        onClick={() => onAbrirConta(contaId)}
      >
        {email || ('conta ' + contaId)}
      </button>
    );
  }

  const listaOrfaos = (orfaos && orfaos.debitos) || [];
  const listaDupes = (dupes && dupes.casos) || [];

  return (
    <div className="admin-aud-wrap">

      <Bloco
        titulo="Cobrado e não devolvido"
        explica={'Cada linha é um crédito que saiu da conta e não voltou. Na maior '
          + 'parte das vezes é o certo, porque a geração saiu e a pessoa recebeu a '
          + 'imagem. Abra a conta e olhe o Extrato antes de devolver qualquer coisa: '
          + 'é lá que se vê se a imagem chegou.'}
        periodo={(
          <DropdownCora
            valor={horas}
            opcoes={[
              { v: 24, n: '24 horas' },
              { v: 72, n: '3 dias' },
              { v: 168, n: '7 dias' },
              { v: 720, n: '30 dias' },
            ]}
            onEscolher={setHoras}
          />
        )}
        erro={orfaosErro}
        carregando={orfaosLendo}
        vazio="Nenhuma cobrança em aberto nesse período."
        resumo={listaOrfaos.length === 0 ? null : (
          <>
            <strong>{num(orfaos.total)}</strong> {orfaos.total === 1 ? 'cobrança' : 'cobranças'}
            {', '}
            <strong>{num(orfaos.creditos)}</strong> {orfaos.creditos === 1 ? 'crédito' : 'créditos'}
            {listaOrfaos.length === 500 && ' (as 500 mais recentes)'}
          </>
        )}
      >
        <table className="admin-tabela">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Quem</th>
              <th>Créditos</th>
              <th>Rota</th>
              <th>Referência</th>
            </tr>
          </thead>
          <tbody>
            {listaOrfaos.map((d, i) => (
              <tr key={(d.ref || '') + i}>
                <td className="admin-ac-num">{quando(d.criado_em)}</td>
                <td><Quem email={d.email} contaId={d.conta_id} /></td>
                <td className="admin-ac-num">{num(d.quantidade)}</td>
                <td className="admin-aud__rota">{d.rota || '—'}</td>
                <td className="admin-aud__ref" title={d.ref || ''}>{d.ref || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloco>

      <Bloco
        titulo="Recarga repetida"
        explica={'Duas compras iguais na mesma conta, com menos de 30 minutos entre '
          + 'uma e outra. Pode ser webhook reprocessado, e pode ser alguém que comprou '
          + 'duas vezes de propósito. Confira no painel do Stripe se houve dois '
          + 'pagamentos antes de mexer no saldo de alguém.'}
        periodo={(
          <DropdownCora
            valor={dias}
            opcoes={[
              { v: 30, n: '30 dias' },
              { v: 90, n: '90 dias' },
              { v: 365, n: '1 ano' },
              { v: 730, n: '2 anos' },
            ]}
            onEscolher={setDias}
          />
        )}
        erro={dupesErro}
        carregando={dupesLendo}
        vazio="Nenhuma recarga repetida nesse período."
        resumo={listaDupes.length === 0 ? null : (
          <>
            <strong>{num(dupes.total)}</strong> {dupes.total === 1 ? 'caso' : 'casos'}
            {', '}
            <strong>{num(dupes.creditos_em_duplicidade)}</strong> créditos em duplicidade
          </>
        )}
      >
        <table className="admin-tabela">
          <thead>
            <tr>
              <th>Quem</th>
              <th>Créditos</th>
              <th>Valor</th>
              <th>A primeira</th>
              <th>A segunda</th>
              <th>Distância</th>
            </tr>
          </thead>
          <tbody>
            {listaDupes.map((c) => (
              <tr key={c.id_1 + '-' + c.id_2}>
                <td><Quem email={c.email} contaId={c.conta_id} /></td>
                <td className="admin-ac-num">{num(c.creditos)}</td>
                <td className="admin-ac-num">{dinheiro(c.valor_centavos)}</td>
                <td className="admin-ac-num">{quando(c.quando_1)}</td>
                <td className="admin-ac-num">{quando(c.quando_2)}</td>
                <td className="admin-ac-num">{distancia(c.segundos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bloco>

    </div>
  );
}
