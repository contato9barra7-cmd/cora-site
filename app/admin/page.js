'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, adminListarAssinantes, adminMudarPlano, adminCancelar, adminDadosFiscais, adminDeletarConta } from '../../lib/auth';

const PLANOS = ['free', 'starter', 'pro', 'studio'];

function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtCpf(c) {
  if (!c || c.length !== 11) return c || '—';
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
function fmtValor(centavos, moeda) {
  if (!centavos) return '—';
  const v = (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  return (moeda === 'brl' || !moeda ? 'R$ ' : (moeda.toUpperCase() + ' ')) + v;
}

export default function Admin() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [negado, setNegado] = useState(false);
  const [assinantes, setAssinantes] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('pagantes'); // 'pagantes' | 'trial' | 'convidados'
  const [filtroData, setFiltroData] = useState('todos'); // todos | mes | 12meses | ano | periodo
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()));
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [filtroVenc, setFiltroVenc] = useState(false); // quase vencendo
  const [filtroCancelado, setFiltroCancelado] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(null); // id da conta em ação
  const [exportando, setExportando] = useState(false);
  const [dadosFiscais, setDadosFiscais] = useState(null); // { email: {telefone, endereco} }
  const [carregandoFiscais, setCarregandoFiscais] = useState(false);
  const [meuId, setMeuId] = useState(null);

  async function mostrarFiscais() {
    if (dadosFiscais) { setDadosFiscais(null); return; } // toggle
    setCarregandoFiscais(true);
    setErro('');
    try {
      const linhas = await adminDadosFiscais();
      const mapa = {};
      linhas.forEach(l => { mapa[l.email] = { telefone: l.telefone, endereco: l.endereco }; });
      setDadosFiscais(mapa);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregandoFiscais(false);
    }
  }

  async function exportarContador() {
    setExportando(true);
    setErro('');
    try {
      const linhas = await adminDadosFiscais();
      if (!linhas.length) { setErro('Nenhum assinante pago para exportar.'); return; }
      // monta CSV (separador ; que o Excel BR entende bem)
      const cab = ['Nome', 'Email', 'CPF', 'Plano', 'Telefone', 'Endereço'];
      const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
      const corpo = linhas.map(l => [l.nome, l.email, l.cpf, l.plano, l.telefone, l.endereco].map(esc).join(';'));
      const csv = '\uFEFF' + [cab.join(';'), ...corpo].join('\r\n'); // BOM p/ acentos no Excel
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const hoje = new Date().toISOString().slice(0, 10);
      link.download = `cora-render-fiscais-${hoje}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e.message);
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setMeuId(c.id);
    carregar();
  }, [router]);

  async function carregar() {
    setErro('');
    try {
      const lista = await adminListarAssinantes();
      setAssinantes(lista);
      setCarregando(false);
    } catch (e) {
      setNegado(true);
      setCarregando(false);
    }
  }

  async function mudarPlano(id, plano, email, planoAtual) {
    if (plano === planoAtual) return;
    if (!confirm(`Mudar o plano de ${email} de "${planoAtual}" para "${plano}"?\n\nIsso altera o plano no nosso sistema imediatamente.`)) {
      // recarrega para o dropdown voltar ao valor original
      await carregar();
      return;
    }
    setOcupado(id);
    setErro('');
    try {
      await adminMudarPlano(id, plano);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function deletar(id, email) {
    if (!confirm(`Deletar a conta de ${email}?\n\nEsta ação é PERMANENTE e apaga a conta, plano e créditos. Não pode ser desfeita.`)) return;
    setOcupado(id);
    setErro('');
    try {
      await adminDeletarConta(id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function cancelar(id, email) {
    if (!confirm(`Cancelar o plano de ${email}? A conta volta para Free.`)) return;
    setOcupado(id);
    setErro('');
    try {
      await adminCancelar(id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  if (carregando) return <AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>;

  if (negado) {
    return (
      <AppShell>
      <div className="admin-wrap">
        <h1>Acesso restrito</h1>
        <p>Esta área é exclusiva para administradores.</p>
        <Link href="/conta" className="btn btn--roxo" style={{ width: 'auto', display: 'inline-block', padding: '10px 22px' }}>
          Voltar para minha conta
        </Link>
      </div>
      </AppShell>
    );
  }

  const filtrados = assinantes.filter(a => {
    if (a.id === meuId) return false; // não mostra a própria conta admin
    // separa por aba
    if (aba === 'convidados') { if (!a.eh_convidado) return false; }
    else if (aba === 'trial') { if (!a.eh_trial) return false; }
    else if (aba === 'pagantes') { if (a.eh_convidado || a.eh_trial) return false; }
    // filtro de data
    if (!passaFiltroData(a)) return false;
    // quase vencendo (renova nos próximos 7 dias)
    if (filtroVenc) {
      const ref = a.renova_em || a.expira_em;
      if (!ref) return false;
      const dias = (new Date(ref) - new Date()) / (1000 * 60 * 60 * 24);
      if (dias < 0 || dias > 7) return false;
    }
    // cancelados
    if (filtroCancelado && a.assinatura_status !== 'cancelado') return false;
    // busca textual
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return (a.nome || '').toLowerCase().includes(q)
      || (a.email || '').toLowerCase().includes(q)
      || (a.cpf || '').includes(q);
  });

  const totalConvidados = assinantes.filter(a => a.eh_convidado && a.id !== meuId).length;
  const totalTrial = assinantes.filter(a => a.eh_trial && a.id !== meuId).length;
  // contas "reais" = exclui a própria conta admin e os convidados de equipe
  const contasReais = assinantes.filter(a => a.id !== meuId && !a.eh_convidado);
  const totalContas = contasReais.length;
  const pagos = contasReais.filter(a => (a.plano !== 'free' || a.eh_dono_equipe) && a.status === 'ativo').length;

  // filtro de data (aplicado sobre assinou_em pra pagantes, criado_em pra trial)
  function passaFiltroData(a) {
    if (filtroData === 'todos') return true;
    const campo = aba === 'trial' ? a.criado_em : (a.assinou_em || a.criado_em);
    if (!campo) return filtroData === 'todos';
    const d = new Date(campo);
    const agora = new Date();
    if (filtroData === 'mes') {
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    }
    if (filtroData === '12meses') {
      const limite = new Date(); limite.setMonth(limite.getMonth() - 12);
      return d >= limite;
    }
    if (filtroData === 'ano') {
      return d.getFullYear() === parseInt(anoFiltro, 10);
    }
    if (filtroData === 'periodo') {
      const de = dataDe ? new Date(dataDe) : null;
      const ate = dataAte ? new Date(dataAte + 'T23:59:59') : null;
      if (de && d < de) return false;
      if (ate && d > ate) return false;
      return true;
    }
    return true;
  }

  return (
    <AppShell>
    <div className="admin-wrap">
      <div className="admin-topo">
        <div>
          <h1>Painel de administração</h1>
          <p className="admin-sub">{totalContas} contas · {pagos} com plano pago ativo</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn--ghost"
            style={{ width: 'auto', margin: 0, padding: '8px 18px' }}
            onClick={mostrarFiscais}
            disabled={carregandoFiscais}
          >
            {carregandoFiscais ? 'Carregando...' : (dadosFiscais ? 'Ocultar dados fiscais' : 'Ver dados fiscais')}
          </button>
          <button
            className="btn btn--verde"
            style={{ width: 'auto', margin: 0, padding: '8px 18px' }}
            onClick={exportarContador}
            disabled={exportando}
          >
            {exportando ? 'Gerando...' : 'Exportar .CSV'}
          </button>
        </div>
      </div>

      {erro && <div className="login-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      <div className="admin-abas">
        <button className={'admin-aba' + (aba === 'pagantes' ? ' ativa' : '')} onClick={() => setAba('pagantes')}>
          Assinantes
        </button>
        <button className={'admin-aba' + (aba === 'trial' ? ' ativa' : '')} onClick={() => setAba('trial')}>
          Trial ({totalTrial})
        </button>
        <button className={'admin-aba' + (aba === 'convidados' ? ' ativa' : '')} onClick={() => setAba('convidados')}>
          Membros de equipe ({totalConvidados})
        </button>
      </div>
      {aba === 'convidados' && (
        <p className="admin-sub" style={{ marginBottom: 12 }}>
          Estas contas recebem acesso via equipe (não pagam individualmente) e não entram no export do contador.
        </p>
      )}
      {aba === 'trial' && (
        <p className="admin-sub" style={{ marginBottom: 12 }}>
          Contas em teste grátis (plano Free). Dados de perfil úteis para tráfego e segmentação.
        </p>
      )}

      <div className="admin-filtros">
        <select className="admin-filtro-sel" value={filtroData} onChange={(e) => setFiltroData(e.target.value)}>
          <option value="todos">Todo o período</option>
          <option value="mes">Este mês</option>
          <option value="12meses">Últimos 12 meses</option>
          <option value="ano">Ano específico</option>
          <option value="periodo">Intervalo de datas</option>
        </select>
        {filtroData === 'ano' && (
          <input className="admin-filtro-sel" type="number" min="2024" max="2100" value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} style={{ width: 90 }} />
        )}
        {filtroData === 'periodo' && (
          <>
            <input className="admin-filtro-sel" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
            <span style={{ color: 'var(--ink3)', fontSize: 13 }}>até</span>
            <input className="admin-filtro-sel" type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
          </>
        )}
        {aba === 'pagantes' && (
          <>
            <label className="admin-filtro-check">
              <input type="checkbox" checked={filtroVenc} onChange={(e) => setFiltroVenc(e.target.checked)} /> Quase vencendo
            </label>
            <label className="admin-filtro-check">
              <input type="checkbox" checked={filtroCancelado} onChange={(e) => setFiltroCancelado(e.target.checked)} /> Cancelados
            </label>
          </>
        )}
      </div>

      <input
        type="text"
        placeholder="Buscar por nome, email ou CPF..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="admin-busca"
      />

      <div className="admin-tabela-wrap">
        <table className="admin-tabela">
          <thead>
            <tr>
              <th>Nome / Email</th>
              <th>CPF</th>
              {dadosFiscais && <th>Telefone</th>}
              {dadosFiscais && <th>Endereço</th>}
              <th>Plano</th>
              {aba === 'convidados' && <th>Equipe</th>}
              {aba === 'trial' && <th>Profissão</th>}
              {aba === 'trial' && <th>Origem</th>}
              {aba === 'trial' && <th>Usa render</th>}
              {aba === 'trial' && <th>Cadastro</th>}
              {aba === 'pagantes' && <th>Valor</th>}
              {aba === 'pagantes' && <th>Assinou</th>}
              {aba === 'pagantes' && <th>Renova em</th>}
              {aba === 'pagantes' && <th>Renov.</th>}
              <th>Status</th>
              <th>Créditos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(a => (
              <tr key={a.id}>
                <td>
                  <div className="admin-nome">{a.nome || '—'}</div>
                  <div className="admin-email">{a.email}{!a.email_verificado && <span className="admin-tag-nv">não verificado</span>}</div>
                </td>
                <td>{fmtCpf(a.cpf)}</td>
                {dadosFiscais && <td>{dadosFiscais[a.email]?.telefone || '—'}</td>}
                {dadosFiscais && <td style={{ fontSize: 13, maxWidth: 220 }}>{dadosFiscais[a.email]?.endereco || '—'}</td>}
                <td>
                  {a.eh_dono_equipe ? (
                    <span className="admin-badge" style={{ background: '#eef0ff', color: '#4b46b3' }}>
                      Teams · {a.assentos || '?'} assentos
                    </span>
                  ) : (
                    <select
                      value={a.plano}
                      disabled={ocupado === a.id}
                      onChange={(e) => mudarPlano(a.id, e.target.value, a.email, a.plano)}
                      className="admin-select"
                    >
                      {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                </td>
                {aba === 'convidados' && (
                  <td style={{ fontSize: 13 }}>
                    <div>{a.equipe_participa_nome || '—'}</div>
                    <div className="admin-email">{a.equipe_dono_email || ''}</div>
                  </td>
                )}
                {aba === 'trial' && <td style={{ fontSize: 13 }}>{a.profissao || '—'}</td>}
                {aba === 'trial' && <td style={{ fontSize: 13 }}>{a.origem || '—'}</td>}
                {aba === 'trial' && <td style={{ fontSize: 13 }}>{a.usa_render || '—'}</td>}
                {aba === 'trial' && <td>{fmtData(a.criado_em)}</td>}
                {aba === 'pagantes' && <td>{a.valor_centavos ? fmtValor(a.valor_centavos, a.moeda) : '—'}</td>}
                {aba === 'pagantes' && <td>{fmtData(a.assinou_em)}</td>}
                {aba === 'pagantes' && <td>{fmtData(a.renova_em)}</td>}
                {aba === 'pagantes' && <td style={{ textAlign: 'center' }}>{a.renovacoes || 0}</td>}
                <td><span className={'admin-badge ' + (a.assinatura_status === 'cancelado' ? 'off' : (a.status === 'ativo' ? 'ok' : 'off'))}>{a.assinatura_status === 'cancelado' ? 'cancelado' : a.status}</span></td>
                <td>{a.plano === 'free' && !a.eh_dono_equipe ? '—' : `${a.creditos_restantes}/${a.creditos_total}`}</td>
                <td>
                  <div className="admin-acoes">
                    {a.plano !== 'free' && (
                      <button
                        className="admin-btn-cancelar"
                        disabled={ocupado === a.id}
                        onClick={() => cancelar(a.id, a.email)}
                      >
                        Cancelar
                      </button>
                    )}
                    <a
                      href={`https://dashboard.stripe.com/test/customers?email=${encodeURIComponent(a.email)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn-stripe"
                    >
                      Stripe
                    </a>
                    <button
                      className="admin-btn-deletar"
                      disabled={ocupado === a.id}
                      onClick={() => deletar(a.id, a.email)}
                      title="Deletar conta"
                    >
                      Deletar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <p className="admin-vazio">Nenhuma conta encontrada.</p>}
      </div>
    </div>
    </AppShell>
  );
}
