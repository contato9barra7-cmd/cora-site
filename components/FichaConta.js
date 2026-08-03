'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  FICHA DA CONTA — a tela do suporte
//
//  Busca uma conta e mostra tudo sobre ela num lugar só: acesso, créditos por
//  balde, assinatura, equipe, dispositivos, uso e a linha do tempo.
//
//  Existe para acabar com o "abre o Railway e roda SQL na mão", que era como
//  toda pergunta de cliente era respondida até aqui.
//
//  Componente separado de propósito: o /admin já tem 1.200 linhas e cinco abas.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { adminBuscarContas, adminFichaDaConta } from '../lib/auth';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

function data(d, comHora) {
  if (!d) return '—';
  const x = new Date(d);
  const dia = x.toLocaleDateString('pt-BR');
  return comHora ? `${dia} ${x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : dia;
}
const dinheiro = (c, m) => (c == null ? '—' : `${(m || 'brl').toUpperCase() === 'BRL' ? 'R$' : ''} ${(c / 100).toFixed(2)}`);
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));

// O motivo do bloqueio, em uma frase. É a primeira pergunta do suporte, e
// deduzir isso de quatro campos era justamente o trabalho manual que sobrava.
function motivoDoAcesso(a) {
  if (!a) return { texto: 'sem plano', cor: '#999' };
  if (a.ilimitado) return { texto: 'Admin — acesso ilimitado', cor: '#7C5CFF' };
  if (a.pode_gerar) return { texto: 'Pode gerar normalmente', cor: '#1F9D55' };
  if (a.equipe_suspenso) return { texto: 'BLOQUEADO — suspenso pela equipe (excedente de assentos)', cor: '#C53030' };
  if (a.eh_trial && a.trial_expirado) return { texto: 'BLOQUEADO — teste de 7 dias terminou', cor: '#C53030' };
  if (a.status === 'inativo') return { texto: 'BLOQUEADO — pagamento falhou', cor: '#C53030' };
  if (a.status === 'expirado') return { texto: 'BLOQUEADO — período pago venceu', cor: '#C53030' };
  return { texto: `BLOQUEADO — ${a.status || 'sem plano ativo'}`, cor: '#C53030' };
}

function Linha({ rotulo, children }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--line, #eee)', alignItems: 'flex-start' }}>
      <span style={{ minWidth: 170, color: '#777', fontSize: 13, lineHeight: 1.7 }}>{rotulo}</span>
      <span style={{ fontSize: 13, lineHeight: 1.7 }}>{children}</span>
    </div>
  );
}

export default function FichaConta() {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [ficha, setFicha] = useState(null);
  const [aba, setAba] = useState('resumo');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function procurar(e) {
    if (e) e.preventDefault();
    setErro(''); setFicha(null); setCarregando(true);
    try {
      const r = await adminBuscarContas(busca.trim());
      setResultados(r);
      if (!r.length) setErro('Nenhuma conta encontrada.');
      if (r.length === 1) await abrir(r[0].id);
    } catch (ex) { setErro(ex.message); }
    finally { setCarregando(false); }
  }

  async function abrir(id) {
    setErro(''); setCarregando(true);
    try {
      setFicha(await adminFichaDaConta(id));
      setAba('resumo');
    } catch (ex) { setErro(ex.message); }
    finally { setCarregando(false); }
  }

  const a = ficha?.acesso;
  const motivo = motivoDoAcesso(a);

  return (
    <div>
      {/* O .login-input traz margin-bottom: 18px do CSS global — era ela que
          empurrava o botao para baixo da caixa. Zerada aqui, com o alinhamento
          pelo centro para os dois ficarem na mesma linha. */}
      <form onSubmit={procurar} style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
        <input
          className="login-input" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="e-mail, nome ou id da conta" style={{ maxWidth: 380, marginBottom: 0 }}
        />
        <button className="btn btn--ink" style={{ width: 'auto', padding: '11px 22px' }} disabled={carregando}>
          {carregando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {erro && <div className="login-erro" style={{ marginBottom: 14 }}>{erro}</div>}

      {resultados.length > 1 && !ficha && (
        <div style={{ marginBottom: 18 }}>
          {resultados.map((c) => (
            <div key={c.id} onClick={() => abrir(c.id)}
                 style={{ padding: '10px 12px', border: '1px solid var(--line, #eee)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
              <strong>{c.email}</strong>
              <span style={{ color: '#777', fontSize: 13 }}>
                {' · '}{c.nome || 'sem nome'}{' · '}{NOME_PLANO[c.plano] || c.plano || 'free'}{' · #'}{c.id}
              </span>
            </div>
          ))}
        </div>
      )}

      {ficha && (
        <div>
          {/* ── O cabeçalho responde "esta pessoa consegue usar?" antes de
                qualquer outra coisa. É a pergunta que o suporte tem em mãos. ── */}
          <div style={{ border: '1px solid var(--line, #eee)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{ficha.conta.email}</div>
            <div style={{ color: '#777', fontSize: 13, marginBottom: 10 }}>
              {ficha.conta.nome || 'sem nome'} · conta #{ficha.conta.id} · desde {data(ficha.conta.criado_em)}
              {ficha.conta.is_admin && ' · ADMIN'}
              {!ficha.conta.email_verificado && ' · E-MAIL NÃO VERIFICADO'}
            </div>
            <div style={{ fontWeight: 700, color: motivo.cor, fontSize: 15 }}>{motivo.texto}</div>
            {a && (
              <div style={{ color: '#555', fontSize: 13, marginTop: 6 }}>
                {NOME_PLANO[a.plano] || a.plano} · {num(a.creditos_restantes)} créditos disponíveis
                {a.creditos_recarga > 0 && ` (${num(a.creditos_recarga)} de recarga)`}
                {a.expira_em && ` · vence ${data(a.expira_em)}`}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['resumo', 'Resumo'], ['creditos', 'Créditos'], ['equipe', 'Equipe'],
              ['uso', 'Uso'], ['logs', `Logs (${ficha.eventos.length})`], ['imagens', 'Imagens']].map(([k, r]) => (
              <button key={k} onClick={() => setAba(k)}
                      className={aba === k ? 'btn btn--ink' : 'btn'}
                      style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>{r}</button>
            ))}
          </div>

          {aba === 'resumo' && (
            <div style={{ paddingBottom: 24 }}>
              <Linha rotulo="Plano">{NOME_PLANO[a?.plano] || a?.plano} · {a?.status}</Linha>
              <Linha rotulo="Créditos do plano">{num(a?.creditos_total)} total · {num(a?.creditos_usados)} usados</Linha>
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
            <div>
              {/* Cada balde com a validade. "Por que meu saldo sumiu?" quase
                  sempre se responde aqui: o balde venceu. */}
              {ficha.baldes.length === 0 ? <p style={{ color: '#777' }}>Nenhuma compra de crédito.</p> : (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ textAlign: 'left', color: '#777' }}>
                    <th>Tipo</th><th>Descrição</th><th>Créditos</th><th>Usados</th><th>Valor</th><th>Comprado</th><th>Vence</th>
                  </tr></thead>
                  <tbody>
                    {ficha.baldes.map((b) => (
                      <tr key={b.id} style={{ borderTop: '1px solid var(--line, #eee)', opacity: b.vencido ? 0.45 : 1 }}>
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
              )}
            </div>
          )}

          {aba === 'equipe' && (
            <div>
              {!ficha.equipe_dono && !ficha.equipe_membro && <p style={{ color: '#777' }}>Não participa de equipe.</p>}
              {ficha.equipe_dono && (
                <>
                  <Linha rotulo="É dono da equipe">#{ficha.equipe_dono.id} {ficha.equipe_dono.nome || ''}</Linha>
                  <Linha rotulo="Plano e assentos">
                    {ficha.equipe_dono.plano} · {ficha.equipe_dono.ocupados} de {ficha.equipe_dono.assentos} ocupado(s)
                    {ficha.equipe_dono.ocupados > ficha.equipe_dono.assentos && ' — ACIMA DO CONTRATADO'}
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
            <div>
              {/* Vem de `transacoes`, não de eventos: gerações são milhares e
                  afogariam a linha do tempo. */}
              {ficha.uso.length === 0 ? <p style={{ color: '#777' }}>Nenhuma geração ainda.</p> : (
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead><tr style={{ textAlign: 'left', color: '#777' }}>
                    <th>Ferramenta</th><th>Gerações</th><th>Créditos gastos</th><th>Última</th>
                  </tr></thead>
                  <tbody>
                    {ficha.uso.map((u) => (
                      <tr key={u.rota} style={{ borderTop: '1px solid var(--line, #eee)' }}>
                        <td>{u.rota || '—'}</td><td>{num(u.n)}</td><td>{num(u.creditos)}</td><td>{data(u.ultima, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {aba === 'logs' && (
            <div>
              {ficha.eventos.length === 0 ? (
                <p style={{ color: '#777' }}>
                  Nenhum evento registrado. A gravação começou agora — contas antigas
                  não têm histórico anterior a ela.
                </p>
              ) : ficha.eventos.map((ev) => (
                <div key={ev.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line, #eee)' }}>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {data(ev.criado_em, true)} · {ev.tipo} · por {ev.ator}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    {ev.descricao}
                    {ev.valor_centavos != null && ` — ${dinheiro(ev.valor_centavos, ev.moeda)}`}
                  </div>
                  {ev.dados && (
                    <div style={{ fontSize: 12, color: '#777', fontFamily: 'monospace' }}>
                      {JSON.stringify(ev.dados)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {aba === 'imagens' && (
            <p style={{ color: '#777' }}>
              As imagens ficam no bucket do servidor de geração, que tem banco e
              credenciais próprios — a aba precisa de uma rota administrativa lá.
              Fase 1.5. Quando entrar, abrir esta aba vai gravar um evento com
              quem abriu e quando.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
