'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, atualizarConta, baixarPlugin, minhaEquipe } from '../../lib/auth';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

function ContaConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);
  const [equipeMembro, setEquipeMembro] = useState(null);

  async function baixar() {
    setBaixando(true);
    setErro('');
    try {
      const url = await baixarPlugin();
      // dispara o download
      window.location.href = url;
    } catch (e) {
      setErro(e.message);
    } finally {
      setTimeout(() => setBaixando(false), 1500);
    }
  }

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setConta(c);
    setCarregando(false);
    // busca dados frescos do servidor (reflete mudança de plano, ex: entrou numa equipe)
    atualizarConta().then((fresca) => { if (fresca) setConta(fresca); }).catch(() => {});
    // verifica se a pessoa participa de uma equipe (como convidada)
    minhaEquipe().then((eq) => { if (eq) setEquipeMembro(eq); });

    if (params.get('pagamento') === 'sucesso') {
      setAviso('Pagamento recebido! Atualizando sua conta...');
      atualizarConta().then((fresca) => {
        if (fresca) setConta(fresca);
        setAviso('Pagamento confirmado. Plano atualizado!');
        setTimeout(() => setAviso(''), 5000);
      });
    }
  }, [router, params]);

  if (carregando) return <AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>;
  if (!conta) return null;

  const ehAdmin = conta.is_admin === true;
  const ehPago = conta.plano && conta.plano !== 'free';
  const nomePlano = ehAdmin ? 'Admin'
    : conta.eh_dono_equipe ? `Teams (${NOME_PLANO[conta.equipe_plano] || conta.equipe_plano || 'Pro'})`
    : equipeMembro ? `${NOME_PLANO[conta.plano] || conta.plano} (equipe)`
    : (NOME_PLANO[conta.plano] || conta.plano);
  const creditos = (conta.creditos_total === -1 || ehAdmin) ? 'Ilimitado'
    : (conta.creditos_restantes ?? 0).toLocaleString('pt-BR');
  const totalCreditos = (conta.creditos_total === -1 || ehAdmin) ? null
    : (conta.creditos_total ?? 0).toLocaleString('pt-BR');

  return (
    <AppShell>
    <div className="admin-wrap">
      {aviso && <div className="conta-aviso">{aviso}</div>}
      {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

      <h1 className="conta-ola">Olá, {conta.nome || conta.email}</h1>

      {/* Plano + créditos */}
      <div className="dash-grid">
        <div className="dash-card">
          <span className="dash-rotulo">Seu plano</span>
          <span className="dash-valor">{nomePlano}</span>
          <span className={'dash-badge ' + (conta.status === 'ativo' ? 'ok' : 'off')}>
            {conta.status}
          </span>
        </div>

        <div className="dash-card">
          <span className="dash-rotulo">Créditos disponíveis</span>
          <span className="dash-valor">{creditos}</span>
          {totalCreditos && <span className="dash-sub">de {totalCreditos} no ciclo</span>}
        </div>

        <div className="dash-card">
          <span className="dash-rotulo">{ehPago ? 'Renova em' : 'Válido até'}</span>
          <span className="dash-valor">
            {conta.expira_em && !ehAdmin ? new Date(conta.expira_em).toLocaleDateString('pt-BR') : '—'}
          </span>
        </div>
      </div>

      {equipeMembro && (
        <div className="conta-card" style={{ borderColor: 'var(--roxo)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {equipeMembro.foto && (
              <div style={{ width: 52, height: 52, borderRadius: 12, backgroundImage: `url(${equipeMembro.foto})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
            )}
            <div>
              <h2 className="conta-h2" style={{ margin: 0 }}>Você faz parte de uma equipe</h2>
              <p className="conta-p" style={{ marginBottom: 0 }}>
                {equipeMembro.nome ? <>Equipe <strong>{equipeMembro.nome}</strong></> : 'Equipe'}
                {' · '}convidado por {equipeMembro.dono_nome || equipeMembro.dono_email}.
                Seu acesso ao plano {equipeMembro.plano === 'studio' ? 'Studio' : 'Pro'} é fornecido por esta equipe.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Download do plugin */}
      <div className="conta-card">
        <h2 className="conta-h2">Plugin para o SketchUp</h2>
        <p className="conta-p">Baixe o Cora Render e instale no seu SketchUp. Funciona no SketchUp 2023 em diante.</p>
        <button className="btn btn--roxo" style={{ width: 'auto', marginTop: 6, padding: '11px 24px' }} onClick={baixar} disabled={baixando}>
          {baixando ? 'Preparando...' : 'Download'}
        </button>
        <p className="dash-sub" style={{ marginTop: 10 }}>Depois de baixar, siga o passo a passo abaixo para instalar.</p>
      </div>

      {/* Passo a passo de instalação */}
      <div className="conta-card">
        <h2 className="conta-h2">Como instalar</h2>
        <div className="passos">
          <div className="passo">
            <div className="passo-num">1</div>
            <div className="passo-txt">
              <div className="passo-tit">Baixe o plugin</div>
              <p className="passo-desc">Clique no botão <strong>Download</strong> acima para baixar o arquivo <strong>.rbz</strong> do Cora Render.</p>
              <div className="passo-img">imagem em breve</div>
            </div>
          </div>

          <div className="passo">
            <div className="passo-num">2</div>
            <div className="passo-txt">
              <div className="passo-tit">Abra o Gerenciador de Extensões</div>
              <p className="passo-desc">No SketchUp, vá em <strong>Extensões → Gerenciador de extensões</strong> (Extension Manager).</p>
              <div className="passo-img">imagem em breve</div>
            </div>
          </div>

          <div className="passo">
            <div className="passo-num">3</div>
            <div className="passo-txt">
              <div className="passo-tit">Clique em "Instalar extensão"</div>
              <p className="passo-desc">No canto inferior do gerenciador, clique em <strong>Instalar extensão</strong> (Install Extension).</p>
              <div className="passo-img">imagem em breve</div>
            </div>
          </div>

          <div className="passo">
            <div className="passo-num">4</div>
            <div className="passo-txt">
              <div className="passo-tit">Escolha o arquivo .rbz</div>
              <p className="passo-desc">Selecione o arquivo <strong>.rbz</strong> que você baixou no passo 1.</p>
              <div className="passo-img">imagem em breve</div>
            </div>
          </div>

          <div className="passo">
            <div className="passo-num">5</div>
            <div className="passo-txt">
              <div className="passo-tit">Confirme a instalação</div>
              <p className="passo-desc">Se aparecer um aviso de segurança, clique em <strong>Sim</strong> para continuar.</p>
              <div className="passo-img">imagem em breve</div>
            </div>
          </div>

          <div className="passo">
            <div className="passo-num">6</div>
            <div className="passo-txt">
              <div className="passo-tit">Pronto!</div>
              <p className="passo-desc">O Cora Render aparece na barra de ferramentas. Clique no ícone para abrir e fazer login.</p>
              <div className="passo-img">imagem em breve</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}

export default function Conta() {
  return (
    <Suspense fallback={<AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>}>
      <ContaConteudo />
    </Suspense>
  );
}
