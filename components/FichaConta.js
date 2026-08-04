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
import {
  adminBuscarContas, adminFichaDaConta, adminCreditar,
  adminMudarPlano, adminCancelar, adminDeletarConta, adminPersonificar,
} from '../lib/auth';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };
const PLANOS = ['free', 'starter', 'pro', 'studio'];

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
const dinheiro = (c, m) => (c == null ? '—' : `${(m || 'brl').toUpperCase() === 'BRL' ? 'R$' : ''} ${(c / 100).toFixed(2)}`);
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));

// O motivo do bloqueio, em uma frase. É a primeira pergunta do suporte, e
// deduzir isso de quatro campos era justamente o trabalho manual que sobrava.
function motivoDoAcesso(a) {
  if (!a) return { texto: 'sem plano', cor: '#999' };
  if (a.ilimitado) return { texto: 'Admin — acesso ilimitado', cor: '#7C5CFF' };
  if (a.pode_gerar) return { texto: 'Pode gerar normalmente', cor: '#2E9E5B' };
  if (a.equipe_suspenso) return { texto: 'BLOQUEADO — suspenso pela equipe (excedente de assentos)', cor: '#C53030' };
  if (a.eh_trial && a.trial_expirado) return { texto: 'BLOQUEADO — teste de 7 dias terminou', cor: '#C53030' };
  if (a.status === 'inativo') return { texto: 'BLOQUEADO — pagamento falhou', cor: '#C53030' };
  if (a.status === 'expirado') return { texto: 'BLOQUEADO — período pago venceu', cor: '#C53030' };
  return { texto: `BLOQUEADO — ${a.status || 'sem plano ativo'}`, cor: '#C53030' };
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
    try {
      setFicha(await adminFichaDaConta(id));
      setAba('resumo');
    } catch (ex) { setErro(ex.message); }
    finally { setCarregando(false); }
  }

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
  const motivo = motivoDoAcesso(a);

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
                  color: 'var(--roxo)', flexShrink: 0,
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

      {/* O cabeçalho responde "esta pessoa consegue usar?" antes de qualquer
          outra coisa. É a pergunta que o suporte tem em mãos. */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: '22px 24px', marginBottom: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{ficha.conta.email}</div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>
          {ficha.conta.nome || 'sem nome'} · conta #{ficha.conta.id} · desde {data(ficha.conta.criado_em)}
          {ficha.conta.is_admin && ' · ADMIN'}
          {!ficha.conta.email_verificado && ' · E-MAIL NÃO VERIFICADO'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: motivo.cor, marginTop: 14 }}>{motivo.texto}</div>
        {a && (
          <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 4 }}>
            {NOME_PLANO[a.plano] || a.plano} · {num(a.creditos_restantes)} créditos disponíveis
            {a.creditos_recarga > 0 && ` (${num(a.creditos_recarga)} de recarga)`}
            {a.expira_em && ` · vence ${data(a.expira_em)}`}
          </div>
        )}
      </div>

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
              {/* Fica acima da divisória: cancelar tira o plano, mas dá para
                  devolvê-lo. Abaixo da linha só entra o que não tem volta. */}
              {a?.plano !== 'free' && (
                <button role="menuitem" onClick={() => { setMenu(false); abrirAcao('cancelar'); }}>
                  Cancelar plano
                </button>
              )}
              <a
                role="menuitem"
                href={`https://dashboard.stripe.com/test/customers?email=${encodeURIComponent(ficha.conta.email)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => setMenu(false)}
              >
                Stripe ↗
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
                assinatura no Stripe</b> — se houver cobrança ativa, cancele lá também,
                senão o cliente continua pagando sem acesso.
              </p>
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

      <div className="admin-abas">
        {[['resumo', 'Resumo'], ['creditos', 'Créditos'], ['equipe', 'Equipe'],
          ['uso', 'Uso'], ['logs', 'Logs'], ['imagens', 'Imagens']].map(([k, r]) => (
          <button key={k} onClick={() => setAba(k)} className={'admin-aba' + (aba === k ? ' ativa' : '')}>
            {r}
            {k === 'logs' && <span className="admin-aba-n">{ficha.eventos.length}</span>}
          </button>
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
        <div style={{ paddingBottom: 24 }}>
          {/* Cada balde com a validade. "Por que meu saldo sumiu?" quase sempre
              se responde aqui: o balde venceu. */}
          {ficha.baldes.length === 0 ? <p style={{ color: 'var(--ink3)' }}>Nenhuma compra de crédito.</p> : (
            <table className="admin-tabela">
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
          )}
        </div>
      )}

      {aba === 'equipe' && (
        <div style={{ paddingBottom: 24 }}>
          {!ficha.equipe_dono && !ficha.equipe_membro && <p style={{ color: 'var(--ink3)' }}>Não participa de equipe.</p>}
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
        <div style={{ paddingBottom: 24 }}>
          {/* Vem de `transacoes`, não de eventos: gerações são milhares e
              afogariam a linha do tempo. */}
          {ficha.uso.length === 0 ? <p style={{ color: 'var(--ink3)' }}>Nenhuma geração ainda.</p> : (
            <table className="admin-tabela">
              <thead><tr><th>Ferramenta</th><th>Gerações</th><th>Créditos gastos</th><th>Última</th></tr></thead>
              <tbody>
                {ficha.uso.map((u) => (
                  <tr key={u.rota}>
                    <td>{u.rota || '—'}</td><td>{num(u.n)}</td><td>{num(u.creditos)}</td><td>{data(u.ultima, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {aba === 'logs' && (
        <div style={{ paddingBottom: 24 }}>
          {ficha.eventos.length === 0 ? (
            <p style={{ color: 'var(--ink3)' }}>
              Nenhum evento registrado. A gravação começou agora — contas antigas
              não têm histórico anterior a ela.
            </p>
          ) : ficha.eventos.map((ev) => (
            <div key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {data(ev.criado_em, true)} · {ev.tipo} · por {ev.ator}
              </div>
              <div style={{ fontSize: 14, marginTop: 2 }}>
                {ev.descricao}
                {ev.valor_centavos != null && ` — ${dinheiro(ev.valor_centavos, ev.moeda)}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'imagens' && (
        <p style={{ color: 'var(--ink3)', paddingBottom: 24 }}>
          As imagens ficam no bucket do servidor de geração, que tem banco e
          credenciais próprios — a aba precisa de uma rota administrativa lá.
          Fase 1.5. Quando entrar, abrir esta aba vai gravar um evento com quem
          abriu e quando.
        </p>
      )}
    </div>
  );
}
