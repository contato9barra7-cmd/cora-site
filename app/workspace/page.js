'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, lerEquipe, convidarMembro, removerMembro, atribuirAMim, dispositivosDoMembro } from '../../lib/auth';

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
  const [expandido, setExpandido] = useState(null); // id do membro com "gerenciar" aberto
  const [dispositivos, setDispositivos] = useState({}); // { membroId: [...] }
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
      setExpandido(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function atribuir() {
    setErro('');
    try {
      await atribuirAMim();
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function toggleGerenciar(m) {
    if (expandido === m.id) { setExpandido(null); return; }
    setExpandido(m.id);
    if (!dispositivos[m.id]) {
      try {
        const lista = await dispositivosDoMembro(m.id);
        setDispositivos((d) => ({ ...d, [m.id]: lista }));
      } catch (e) {
        setDispositivos((d) => ({ ...d, [m.id]: [] }));
      }
    }
  }

  if (carregando) return <div className="admin-wrap"><p>Carregando...</p></div>;

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
  const donoNaEquipe = membros.some((m) => m.conta_id === equipe.dono_id);
  // monta os "slots": os membros + os assentos vazios restantes
  const slotsVazios = Array.from({ length: Math.max(0, livres) });

  return (
    <div className="admin-wrap">
      <h1 className="conta-ola">Sua equipe</h1>

      {criada && (
        <div className="conta-card" style={{ borderColor: 'var(--roxo)' }}>
          <h2 className="conta-h2">Equipe criada com sucesso</h2>
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
            className="ws-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@da-pessoa.com"
            disabled={livres <= 0}
          />
          <button className="btn btn--verde ws-btn-convidar" onClick={convidar} disabled={convidando || livres <= 0}>
            {convidando ? 'Enviando...' : 'Convidar'}
          </button>
        </div>
        {livres <= 0 && <p className="ws-obs">Todos os assentos estão ocupados. Remova alguém para liberar espaço.</p>}
        {erro && <p className="tm-erro" style={{ textAlign: 'left' }}>{erro}</p>}
        {aviso && <p className="ws-aviso">{aviso}</p>}
      </div>

      <div className="conta-card">
        <h2 className="conta-h2">Assentos</h2>

        {/* Membros ocupando assentos */}
        {membros.map((m) => (
          <div key={m.id} className="ws-slot">
            <div className="ws-slot-linha">
              <div>
                <div className="disp-nome">
                  {m.email}
                  {m.conta_id === equipe.dono_id && <span className="ws-tag ws-tag-dono">Você (dono)</span>}
                  {m.status === 'convidado' && <span className="ws-tag ws-tag-pend">Convite pendente</span>}
                  {m.status === 'ativo' && m.conta_id !== equipe.dono_id && <span className="ws-tag ws-tag-ativo">Ativo</span>}
                </div>
              </div>
              <button className="ws-gerenciar" onClick={() => toggleGerenciar(m)}>
                {expandido === m.id ? 'Fechar' : 'Gerenciar'}
              </button>
            </div>

            {expandido === m.id && (
              <div className="ws-detalhe">
                {/* Dispositivos do membro */}
                {m.status === 'convidado' ? (
                  <p className="ws-obs">O convite ainda não foi aceito. Os dispositivos aparecerão quando a pessoa ativar o acesso.</p>
                ) : (
                  <>
                    <div className="ws-disp-tit">Dispositivos (2 no plugin, 3 na web · um por vez)</div>
                    {!dispositivos[m.id] ? (
                      <p className="ws-obs">Carregando...</p>
                    ) : dispositivos[m.id].length === 0 ? (
                      <p className="ws-obs">Nenhum dispositivo conectado ainda.</p>
                    ) : (
                      <div className="disp-lista">
                        {dispositivos[m.id].map((d) => (
                          <div key={d.id} className="disp-item">
                            <div>
                              <div className="disp-nome">
                                {d.nome_pc || 'Dispositivo'}
                                <span className="ws-tag ws-tag-pend">{d.tipo === 'web' ? 'Web' : 'Plugin'}</span>
                                {d.ativo_agora && <span className="ws-tag ws-tag-ativo">Em uso agora</span>}
                              </div>
                              <div className="disp-sub">Último acesso: {d.ultimo_acesso ? new Date(d.ultimo_acesso).toLocaleString('pt-BR') : '—'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {/* Remover acesso (menos o próprio dono) */}
                {m.conta_id !== equipe.dono_id && (
                  <button className="ws-remover" onClick={() => remover(m.id)}>Remover da equipe</button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Assentos vazios */}
        {slotsVazios.map((_, i) => (
          <div key={'vazio-' + i} className="ws-slot ws-slot-vazio">
            <div className="ws-slot-linha">
              <div className="ws-vazio-label">Assento livre</div>
              {!donoNaEquipe && i === 0 ? (
                <button className="ws-atribuir" onClick={atribuir}>Atribuir a mim</button>
              ) : (
                <span className="ws-vazio-hint">Convide alguém acima</span>
              )}
            </div>
          </div>
        ))}
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
