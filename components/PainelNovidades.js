'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  QUEM QUER RECEBER NOVIDADES
//
//  Uma aba própria, e não uma coluna a mais na lista de contas, porque a
//  pergunta que traz alguém até aqui é outra: não é "quem é essa pessoa", é
//  "para quantas eu posso escrever". São dois usos diferentes da mesma tabela.
//
//  O NÚMERO QUE IMPORTA É O DE QUEM DESLIGOU. Ele costuma ser pequeno, e é
//  justamente por isso que precisa estar visível: quando ele cresce depois de
//  um envio, o envio foi o problema. Numa lista de dezenove, três a menos não
//  aparece sozinho.
//
//  A LISTA MOSTRA OS DOIS LADOS. Ver só quem desligou não responde "para
//  quantas pessoas o próximo e-mail vai", e ver só quem recebe esconde
//  exatamente o sinal que interessa acompanhar.
//
//  Ninguém liga nem desliga por aqui de propósito. É escolha da pessoa, feita
//  em Minha conta, e um admin que possa reativar sozinho transforma um opt-out
//  registrado numa caixa de entrada sem permissão.
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { useIdioma } from '../lib/i18n';

function data(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR',
    { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PainelNovidades({ contas }) {
  const { t } = useIdioma();
  const [ver, setVer] = useState('todos');   // todos | recebem | desligaram
  const [busca, setBusca] = useState('');

  const { recebem, desligaram } = useMemo(() => {
    const r = [], d = [];
    (contas || []).forEach((c) => (c.newsletter === false ? d : r).push(c));
    return { recebem: r, desligaram: d };
  }, [contas]);

  const lista = useMemo(() => {
    const base = ver === 'recebem' ? recebem : ver === 'desligaram' ? desligaram : (contas || []);
    const q = busca.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => (c.email || '').toLowerCase().includes(q)
      || (c.nome || '').toLowerCase().includes(q));
  }, [ver, busca, contas, recebem, desligaram]);

  const total = (contas || []).length;
  const pct = total ? Math.round((recebem.length / total) * 100) : 0;

  return (
    <>
      <div className="conta-card adm-card" style={{ marginTop: 0 }}>
        <h2 className="conta-h2">{t('adm_nov_titulo')}</h2>
        <p className="conta-p">{t('adm_nov_sub')}</p>

        <div className="din-fonte">
          <div className="din-barra" aria-hidden="true">
            <i style={{ width: pct + '%' }} />
            <i style={{ width: (100 - pct) + '%' }} />
          </div>
          <div className="din-legenda">
            <div>
              <span><em className="a" />{t('adm_nov_recebem')}</span>
              <b>{recebem.length}</b>
            </div>
            {/* A linha de quem desligou aparece SEMPRE, mesmo em zero. Aqui o
                zero é a informação: ele diz que ninguém saiu, e escondê-lo
                faria a ausência da linha parecer que a medida não existe. */}
            <div>
              <span><em className="c" />{t('adm_nov_desligaram')}</span>
              <b>{desligaram.length}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="conta-card adm-card admin-nov">
        <div className="adm-ficha-cab">
          <div className="adm-abas" role="tablist" style={{ margin: 0, border: 0 }}>
            {[['todos', t('adm_nov_todos'), total],
              ['recebem', t('adm_nov_recebem'), recebem.length],
              ['desligaram', t('adm_nov_desligaram'), desligaram.length]].map(([k, r, n]) => (
              <button key={k} className={'adm-aba' + (ver === k ? ' ativa' : '')}
                      onClick={() => setVer(k)}>
                {r} <b>{n}</b>
              </button>
            ))}
          </div>
          <div className="adm-busca" style={{ maxWidth: 260 }}>
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
                 stroke="currentColor" strokeWidth="1.6">
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13 13l4 4" strokeLinecap="round" />
            </svg>
            <input className="perfil-input" value={busca}
                   onChange={(e) => setBusca(e.target.value)}
                   placeholder={t('adm_ac_buscar')} />
          </div>
        </div>

        {lista.length === 0 ? (
          <p className="adm-vazio">{t('adm_nov_vazio')}</p>
        ) : (
          <div className="fat-rolo">
            <table className="fat">
              <thead>
                <tr>
                  <th>{t('adm_h_nome_email')}</th>
                  <th>{t('adm_h_plano')}</th>
                  <th>{t('adm_h_entrou')}</th>
                  <th>{t('adm_nov_coluna')}</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="adm-nome">{c.nome || '—'}</div>
                      <div className="adm-sub"><span className="adm-sub-txt">{c.email}</span></div>
                    </td>
                    <td>{c.plano || '—'}</td>
                    <td className="adm-mono">{data(c.criado_em)}</td>
                    <td>
                      <span className={'fat-selo fat-selo--'
                        + (c.newsletter === false ? 'aberta' : 'paga')}>
                        {c.newsletter === false ? t('adm_nov_nao') : t('adm_nov_sim')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="adm-total adm-total--nota">{t('adm_nov_rodape')}</p>
      </div>
    </>
  );
}
