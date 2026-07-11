'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, lerEquipe, convidarMembro, removerMembro } from '../../lib/auth';

const NOME_PLANO = { pro: 'Pro', studio: 'Studio' };

function WorkspaceConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const [carregando, setCarregando] = useState(true);
  const [equipe, setEquipe] = useState(null);
  const [membros, setMembros] = useState([]);
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [convidando, setConvidando] = useState(false);
  const criada = params.get('criada') === '1';

  async function carregar() {
    try {
      const c = await lerConta();
      if (!c) { router.push('/login'); return; }
      const dados = await lerEquipe();
      setEquipe(dados.equipe);
      setMembros(dados.membros || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  async function convidar() {
    setErro(''); setAviso('');
    if (!email.includes('@')) { setErro('Digite um email válido.'); return; }
    setConvidando(true);
    try {
      await convidarMembro(email);
      setAviso('Convite enviado para ' + email);
      setEmail('');
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setConvidando(false);
    }
  }

  async function remover(id) {
    if (!confirm('Remover esta pessoa da equipe? O assento será liberado.')) return;
    setErro('');
    try {
      await removerMembro(id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (carregando) return <div className="admin-wrap"><p>Carregando...</p></div>;

  // Sem equipe: mostra convite pra criar
  if (!equipe) {
    return (
      <div className="admin-wrap">
        <h1 className="conta-ola">Sua equipe</h1>
        <div className="conta-card">
          <h2 className="conta-h2">Você ainda não tem uma equipe</h2>
          <p className="conta-p">Monte uma equipe para adicionar pessoas com faturamento único e desconto por assento.</p>
          <button className="btn btn--verde" style={{ width: 'auto', marginTop: 14, padding: '11px 24px' }} onClick={() => router.push('/teams')}>
            Criar equipe
          </button>
        </div>
      </div>
    );
  }

  const livres = equipe.assentos - membros.length;

  return (
    <div className="admin-wrap" style={{ maxWidth: 820 }}>
      <h1 className="conta-ola">Sua equipe</h1>

      {criada && (
        <div className="conta-card" style={{ borderColor: 'var(--roxo)' }}>
          <h2 className="conta-h2">Equipe criada com sucesso! 🎉</h2>
          <p className="conta-p">Sua assinatura está ativa. Agora convide as pessoas por email.</p>
        </div>
      )}

      <div className="conta-card">
        <div className="ws-topo">
          <div>
            <div className="ws-plano">Plano {NOME_PLANO[equipe.plano] || equipe.plano}</div>
            <div className="ws-assentos">{membros.length} de {equipe.assentos} assentos ocupados</div>
          </div>
          <div className="ws-badge">{livres} {livres === 1 ? 'assento livre' : 'assentos livres'}</div>
        </div>

        <div className="ws-convidar">
          <input
            className="tm-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@da-pessoa.com"
            disabled={livres <= 0}
          />
          <button className="btn btn--verde" onClick={convidar} disabled={convidando || livres <= 0}>
            {convidando ? 'Enviando...' : 'Convidar'}
          </button>
        </div>
        {livres <= 0 && <p className="tm-obs" style={{ textAlign: 'left' }}>Todos os assentos estão ocupados. Remova alguém para liberar espaço.</p>}
        {erro && <p className="tm-erro" style={{ textAlign: 'left' }}>{erro}</p>}
        {aviso && <p className="ws-aviso">{aviso}</p>}
      </div>

      <div className="conta-card">
        <h2 className="conta-h2">Pessoas na equipe</h2>
        <div className="disp-lista">
          {membros.map((m) => (
            <div key={m.id} className="disp-item">
              <div>
                <div className="disp-nome">
                  {m.email}
                  {m.conta_id === equipe.dono_id && <span className="disp-ativo" style={{ background: '#eef0ff', color: '#4b46b3' }}>Você (dono)</span>}
                  {m.status === 'convidado' && <span className="ws-pendente">Convite pendente</span>}
                  {m.status === 'ativo' && m.conta_id !== equipe.dono_id && <span className="disp-ativo">Ativo</span>}
                </div>
              </div>
              {m.conta_id !== equipe.dono_id && (
                <button className="disp-remover" onClick={() => remover(m.id)}>Remover</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Workspace() {
  return (
    <AppShell>
      <Suspense fallback={<div className="admin-wrap"><p>Carregando...</p></div>}>
        <WorkspaceConteudo />
      </Suspense>
    </AppShell>
  );
}
