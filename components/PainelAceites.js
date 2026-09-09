'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  A PROVA DO ACEITE
//
//  Quem aceitou os Termos, quando, de onde, e QUAL texto leu.
//
//  ── Por que isto existe ──
//  Até 06/09/2026 nada disso era guardado. A caixa "li e aceito" era conferida
//  no navegador e jogada fora: o `registrar()` nem mandava o campo, e a rota
//  nem exigia. Dava para criar conta por POST direto sem nunca ter visto os
//  Termos. Como a licença de divulgação das imagens (item 7) nasce do aceite,
//  uma conta sem registro é uma conta sem licença.
//
//  ── Por que o texto inteiro fica guardado ──
//  Os documentos mudam. Guardar só "aceitou: sim" e mostrar o texto de hoje,
//  um ano depois, não prova nada, porque não é o texto que a pessoa leu. Cada
//  linha aponta para a VERSÃO congelada, e "Ver o texto" imprime exatamente
//  aquilo, com a conferência do hash.
//
//  ── O número que mais importa nesta tela ──
//  `sem_prova`: contas que existem e não têm aceite nenhum. Ele não é um erro
//  a esconder, é a medida do buraco que ficou para trás.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { adminAceites, adminAceiteTexto,
         adminReaceitePendentes, adminReaceiteAvisar } from '../lib/auth';
import Confirma from './Confirma';
import ComprovanteAceite from './ComprovanteAceite';
import { useIdioma } from '../lib/i18n';

function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PainelAceites() {
  const { t } = useIdioma();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);
  const [comprovante, setComprovante] = useState(null);   // o texto que está sendo lido

  /* ── QUEM AINDA DEVE O ACEITE ──
     A trava é silenciosa: a pessoa só descobre no dia em que tenta gerar.
     Esta lista abre debaixo do número vermelho, e o aviso sai daqui. */
  const [pend, setPend] = useState(null);
  const [pendErro, setPendErro] = useState('');
  const [pendAberto, setPendAberto] = useState(false);
  const [enviando, setEnviando] = useState(null);   // id da conta, ou 'todos'
  const [feito, setFeito] = useState('');
  const [confirmarTodos, setConfirmarTodos] = useState(false);

  async function abrirPendentes() {
    setPendAberto((v) => !v);
    if (pend) return;
    try { setPend(await adminReaceitePendentes()); }
    catch (e) { setPendErro(e.message); }
  }

  async function avisar(alvo) {
    setEnviando(alvo === 'todos' ? 'todos' : alvo);
    setPendErro(''); setFeito('');
    try {
      const r = await adminReaceiteAvisar(
        alvo === 'todos' ? { todos: true } : { contaId: alvo });
      setFeito(r.enviados === 1 ? '1 aviso enviado.' : `${r.enviados} avisos enviados.`);
      /* Relê em vez de mexer na lista na mão: o servidor grava a data do
         aviso, e é ela que a linha mostra. */
      setPend(await adminReaceitePendentes());
    } catch (e) {
      setPendErro(e.message);
    } finally {
      setEnviando(null);
      setConfirmarTodos(false);
    }
  }

  useEffect(() => {
    adminAceites().then(setDados).catch((e) => setErro(e.message));
  }, []);

  async function verTexto(id) {
    setAberto({ carregando: true });
    try {
      setAberto(await adminAceiteTexto(id));
    } catch (e) {
      setAberto({ erro: e.message });
    }
  }

  if (erro) return <p className="admin-vazio">{erro}</p>;
  if (!dados) return <p className="admin-vazio">{t('adm_carregando')}</p>;

  const termo = busca.trim().toLowerCase();
  const lista = dados.aceites.filter(
    (a) => !termo ||
      (a.email || '').toLowerCase().includes(termo) ||
      (a.nome || '').toLowerCase().includes(termo)
  );

  return (
    <div className="admin-ac">
      <div className="admin-ac__topo">
        <div className="admin-ac__nums">
          <span><strong>{dados.aceites.length}</strong> {t('adm_ac_registros')}</span>
          <span className="admin-ac__sep">·</span>
          <span>{t('adm_ac_versao')} <strong>{dados.versao_atual}</strong></span>
          {dados.sem_prova > 0 && (
            <>
              <span className="admin-ac__sep">·</span>
              {/* Fica em vermelho de propósito. É o número de pessoas de quem
                  a gente não consegue provar o aceite, e ele só some quando
                  chegar a zero. */}
              {/* Virou botão. O número já dizia quantas pessoas estavam sem
                  prova, e não havia nada a fazer com ele: para agir, alguém
                  teria que abrir o banco. Agora ele abre a lista, e de lá sai
                  o aviso. */}
              <button type="button" className="admin-ac__falta admin-ac__falta--btn"
                      onClick={abrirPendentes}>
                <strong>{dados.sem_prova}</strong> {t('adm_ac_sem_prova')}
                <span className="admin-ac__seta" aria-hidden="true">
                  {pendAberto ? '-' : '+'}
                </span>
              </button>
            </>
          )}
        </div>
        <input
          className="admin-ac__busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('adm_ac_buscar')}
        />
      </div>

      {pendAberto && (
        <div className="admin-pend">
          {pendErro && <p className="admin-pend__erro">{pendErro}</p>}
          {feito && <p className="admin-pend__feito">{feito}</p>}
          {!pend && !pendErro && <p className="admin-aud__estado">Procurando…</p>}

          {pend && (
            <>
              <div className="admin-pend__topo">
                <p className="admin-pend__diz">
                  {pend.total === 0
                    ? 'Ninguém está devendo aceite da versão no ar.'
                    : <>
                        <strong>{pend.total}</strong>
                        {pend.total === 1 ? ' conta ainda não aceitou' : ' contas ainda não aceitaram'}
                        {' a versão '}<strong>{pend.versao_no_ar}</strong>.
                        {' A geração delas fica parada até aceitarem.'}
                      </>}
                </p>
                {pend.total > 0 && (
                  <button className="as-btn-cta" disabled={enviando === 'todos'}
                          onClick={() => setConfirmarTodos(true)}>
                    {enviando === 'todos' ? 'Enviando…' : `Avisar as ${pend.total}`}
                  </button>
                )}
              </div>

              {pend.pendentes.map((c) => (
                <div key={c.id} className="admin-pend__linha">
                  <div className="admin-pend__quem">
                    <div className="admin-ac-nome">{c.nome || 'sem nome'}</div>
                    <div className="admin-ac-email">{c.email}</div>
                  </div>
                  <div className="admin-pend__estado">
                    {c.nunca_aceitou
                      ? 'nunca aceitou nada'
                      : <>parou na versão {c.ultima_versao}</>}
                    {c.avisado_em && <div className="admin-pend__avisado">
                      avisada em {quando(c.avisado_em)}
                    </div>}
                  </div>
                  <button className="admin-ac-ver" disabled={enviando === c.id}
                          onClick={() => avisar(c.id)}>
                    {enviando === c.id ? 'Enviando…' : c.avisado_em ? 'Avisar de novo' : 'Avisar'}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {confirmarTodos && (
        <Confirma
          perigo={false}
          ok="Enviar"
          texto={`Mandar o aviso dos documentos novos para ${pend?.total} pessoa(s). Cada uma recebe um e-mail agora.`}
          aoOk={() => avisar('todos')}
          aoCancelar={() => setConfirmarTodos(false)}
        />
      )}

      {lista.length === 0 ? (
        <p className="admin-vazio">{t('adm_ac_nenhum')}</p>
      ) : (
        <div className="admin-tabela-wrap">
          <table className="admin-tabela">
            <thead>
              <tr>
                <th>{t('adm_ac_quem')}</th>
                <th>{t('adm_ac_documento')}</th>
                <th>{t('adm_ac_quando')}</th>
                <th>{t('adm_ac_de_onde')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="admin-ac-nome">{a.nome || '—'}</div>
                    <div className="admin-ac-email">{a.email}</div>
                  </td>
                  <td>
                    <span className="admin-ac-doc">{a.documento}</span>
                    <div className="admin-ac-versao">
                      {a.versao} · {a.idioma}
                    </div>
                  </td>
                  <td className="admin-ac-num">{quando(a.criado_em)}</td>
                  <td className="admin-ac-num">
                    <div>{a.ip || '—'}</div>
                    <div className="admin-ac-ua" title={a.navegador || ''}>
                      {(a.navegador || '').slice(0, 38)}
                    </div>
                  </td>
                  <td>
                    {/* Dois botoes com papeis diferentes. "Ver texto" e a
                        conferencia rapida de UMA linha, dentro da tela. O
                        comprovante e a folha da PESSOA, com os dois documentos
                        inteiros, e existe para ser impressa e levada.

                        O comprovante so aparece com conta ligada: sem conta_id
                        nao ha de quem montar a folha, e um botao que abre um
                        erro e pior que botao nenhum. */}
                    <button className="admin-ac-ver" onClick={() => verTexto(a.id)}>
                      {t('adm_ac_ver_texto')}
                    </button>
                    {a.conta_id && (
                      <button className="admin-ac-ver"
                              onClick={() => setComprovante({ id: a.conta_id, nome: a.nome })}>
                        {t('adm_ac_comprovante')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comprovante && (
        <ComprovanteAceite contaId={comprovante.id} nome={comprovante.nome}
                           onFechar={() => setComprovante(null)} />
      )}

      {aberto && (
        <div className="admin-ac-janela" onClick={() => setAberto(null)}>
          <div className="admin-ac-papel" onClick={(e) => e.stopPropagation()}>
            {aberto.carregando ? (
              <p className="admin-vazio">{t('adm_carregando')}</p>
            ) : aberto.erro ? (
              <p className="admin-vazio">{aberto.erro}</p>
            ) : (
              <>
                <div className="admin-ac-papel__cab">
                  <div>
                    <h3>{aberto.documento} · {aberto.versao}</h3>
                    <p>
                      {aberto.email} · {quando(aberto.criado_em)} · {aberto.ip}
                    </p>
                  </div>
                  <button onClick={() => setAberto(null)} aria-label="Fechar">✕</button>
                </div>
                {/* A conferência do hash: o texto guardado ainda é o que foi
                    aceito, ou alguém mexeu na linha depois? */}
                <p className={'admin-ac-hash' + (aberto.hash_confere ? '' : ' quebrado')}>
                  {aberto.hash_confere ? t('adm_ac_integro') : t('adm_ac_alterado')}
                  <code>{aberto.hash}</code>
                </p>
                <pre className="admin-ac-texto">{aberto.texto}</pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
