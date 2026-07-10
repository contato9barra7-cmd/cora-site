'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lerConta, adminListarAssinantes, adminMudarPlano, adminCancelar } from '../../lib/auth';

const PLANOS = ['free', 'starter', 'pro', 'studio'];

function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtCpf(c) {
  if (!c || c.length !== 11) return c || '—';
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default function Admin() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [negado, setNegado] = useState(false);
  const [assinantes, setAssinantes] = useState([]);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(null); // id da conta em ação

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
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

  async function mudarPlano(id, plano) {
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

  if (carregando) return <div className="admin-wrap"><p>Carregando...</p></div>;

  if (negado) {
    return (
      <div className="admin-wrap">
        <h1>Acesso restrito</h1>
        <p>Esta área é exclusiva para administradores.</p>
        <Link href="/conta" className="btn btn--roxo" style={{ width: 'auto', display: 'inline-block', padding: '10px 22px' }}>
          Voltar para minha conta
        </Link>
      </div>
    );
  }

  const filtrados = assinantes.filter(a => {
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return (a.nome || '').toLowerCase().includes(q)
      || (a.email || '').toLowerCase().includes(q)
      || (a.cpf || '').includes(q);
  });

  const pagos = assinantes.filter(a => a.plano !== 'free' && a.status === 'ativo').length;

  return (
    <div className="admin-wrap">
      <div className="admin-topo">
        <div>
          <h1>Painel de administração</h1>
          <p className="admin-sub">{assinantes.length} contas · {pagos} com plano pago ativo</p>
        </div>
        <Link href="/conta" className="btn btn--ghost" style={{ width: 'auto', margin: 0, padding: '8px 18px' }}>
          Minha conta
        </Link>
      </div>

      {erro && <div className="login-erro" style={{ marginBottom: 16 }}>{erro}</div>}

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
              <th>Plano</th>
              <th>Status</th>
              <th>Créditos</th>
              <th>Validade</th>
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
                <td>
                  <select
                    value={a.plano}
                    disabled={ocupado === a.id}
                    onChange={(e) => mudarPlano(a.id, e.target.value)}
                    className="admin-select"
                  >
                    {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td><span className={'admin-badge ' + (a.status === 'ativo' ? 'ok' : 'off')}>{a.status}</span></td>
                <td>{a.plano === 'free' ? '—' : `${a.creditos_restantes}/${a.creditos_total}`}</td>
                <td>{fmtData(a.expira_em)}</td>
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <p className="admin-vazio">Nenhuma conta encontrada.</p>}
      </div>
    </div>
  );
}
