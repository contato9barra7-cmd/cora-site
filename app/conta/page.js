'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, atualizarConta, baixarPlugin, minhaEquipe, sairDaEquipe, lerEquipe, EVENTO_CREDITOS} from '../../lib/auth';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

function ContaConteudo() {
  const router = useRouter();
  const params = useSearchParams();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);

  // Fechado por padrão: quem já instalou não precisa ver os seis passos
  // todo dia. Quem não instalou tem o convite logo abaixo do botão.
  const [comoInstalar, setComoInstalar] = useState(false);
  const [equipeMembro, setEquipeMembro] = useState(null);
  const [saindo, setSaindo] = useState(false);

  // A equipe do PROPRIETÁRIO: quem são os membros e quanto cada um gastou.
  // É o que justifica a conta que ele paga — sem isso, o Teams é uma
  // fatura maior sem explicação.
  const [equipe, setEquipe] = useState(null);

  // "Ver como": só admins. Permite visualizar as 3 dashes (normal, dono de
  // equipe, membro convidado) sem trocar de conta. Não muda nada no servidor —
  // apenas força como a dash é renderizada.
  const [verComo, setVerComo] = useState('real');   // real | normal | dono | membro

  async function sairEquipe() {
    if (!confirm('Tem certeza que deseja sair da equipe? Você perderá o acesso ao plano fornecido por ela.')) return;
    setSaindo(true);
    try {
      await sairDaEquipe();
      const fresca = await atualizarConta();
      if (fresca) setConta(fresca);
      setEquipeMembro(null);
    } catch (e) { setErro(e.message); }
    finally { setSaindo(false); }
  }

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

    // se é proprietária, busca os membros e o consumo de cada um
    if (c.eh_dono_equipe) {
      lerEquipe().then((e) => { if (e) setEquipe(e); }).catch(() => {});
    }

    if (params.get('pagamento') === 'sucesso') {
      setAviso('Pagamento recebido! Atualizando sua conta...');
      atualizarConta().then((fresca) => {
        if (fresca) setConta(fresca);
        setAviso('Pagamento confirmado. Plano atualizado!');
        setTimeout(() => setAviso(''), 5000);
      });
    }
  }, [router, params]);

  // Gerou algo no /app? O saldo mostrado aqui atualiza sozinho.
  useEffect(() => {
    function onCreditosDash(e) {
      if (e.detail) setConta(e.detail);
    }
    window.addEventListener(EVENTO_CREDITOS, onCreditosDash);
    return () => window.removeEventListener(EVENTO_CREDITOS, onCreditosDash);
  }, []);

  if (carregando) return <AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>;
  if (!conta) return null;

  const ehAdmin = conta.is_admin === true;

  // Flags efetivas: no modo "Ver como" (admin), sobrescrevem o estado real
  // para renderizar a dash como cada tipo de conta. Nos modos simulados, a
  // conta deixa de se comportar como admin (senão a assinatura some, os
  // créditos viram "ilimitado", etc.).
  const modo = ehAdmin ? verComo : 'real';
  const ehAdminVis = modo === 'real' ? ehAdmin : false;
  const ehDono = modo === 'dono' ? true
               : (modo === 'normal' || modo === 'membro') ? false
               : conta.eh_dono_equipe;
  const ehMembroVis = modo === 'membro' ? true
                    : (modo === 'normal' || modo === 'dono') ? false
                    : !!equipeMembro;
  const ehPago = conta.plano && conta.plano !== 'free';
  const nomePlano = ehAdminVis ? 'Admin'
    : ehDono ? `Teams (${NOME_PLANO[conta.equipe_plano] || conta.equipe_plano || 'Pro'})`
    : ehMembroVis ? `${NOME_PLANO[conta.plano] || conta.plano} (equipe)`
    : (NOME_PLANO[conta.plano] || conta.plano);
  const creditos = (conta.creditos_total === -1 || ehAdminVis) ? 'Ilimitado'
    : ehDono ? (conta.equipe_creditos_total ?? 0).toLocaleString('pt-BR')
    : (conta.creditos_restantes ?? 0).toLocaleString('pt-BR');
  const totalCreditos = (conta.creditos_total === -1 || ehAdminVis) ? null
    : ehDono ? null
    : (conta.creditos_total ?? 0).toLocaleString('pt-BR');
  // data mostrada: renovação da equipe (dono) ou validade individual
  const dataRenov = ehDono ? conta.equipe_renova_em : conta.expira_em;
  const rotuloData = (ehPago || ehDono) ? 'Renova em' : 'Válido até';

  // Quanto ainda resta, em %
  const pctCreditos = (conta.creditos_total > 0 && !ehAdminVis)
    ? Math.max(0, Math.min(100,
        Math.round(((conta.creditos_restantes ?? 0) / conta.creditos_total) * 100)))
    : 0;

  // "renova em 11 de agosto" é uma data; "29 dias" é o que a pessoa sente.
  const diasAte = dataRenov
    ? Math.max(0, Math.ceil((new Date(dataRenov) - new Date()) / 86400000))
    : null;

  // Assentos pagos e vazios: é o que faz o proprietário convidar alguém
  const vagos = equipe?.equipe
    ? Math.max(0, (equipe.equipe.assentos || 0) - (equipe.membros || []).length)
    : 0;

  return (
    <AppShell>
    <div className="admin-wrap">
      {ehAdmin && (
        <div className="vercomo">
          <span className="vercomo-lbl">Ver dashboard como</span>
          <div className="vercomo-opcoes">
            {[
              { v: 'real',   n: 'Real (admin)' },
              { v: 'normal', n: 'Conta normal' },
              { v: 'dono',   n: 'Dono de equipe' },
              { v: 'membro', n: 'Membro convidado' }
            ].map((o) => (
              <button
                key={o.v}
                className={'vercomo-btn' + (verComo === o.v ? ' vercomo-btn--on' : '')}
                onClick={() => setVerComo(o.v)}
              >{o.n}</button>
            ))}
          </div>
        </div>
      )}
      {aviso && <div className="conta-aviso">{aviso}</div>}
      {erro && <div className="login-erro" style={{ marginBottom: 18 }}>{erro}</div>}

      {/* ── A faixa ──
          O que se quer saber ao entrar: quantos créditos sobraram e quando
          renova. O PROPRIETÁRIO vê o pote da equipe; o membro convidado vê
          o do ASSENTO DELE — não controla o pote, e mostrá-lo confundiria. */}
      <div className="dash-faixa">
        <div className="dash-faixa-txt">
          <div className="dash-faixa-plano">
            <span>{nomePlano}</span>
            {ehDono && <em>PROPRIETÁRIO</em>}
            {ehMembroVis && !ehDono && <em className="dash-tag--sec">EQUIPE</em>}
          </div>

          <div className="dash-faixa-num">
            <strong>{creditos}</strong>
            {totalCreditos && <span>créditos de {totalCreditos}</span>}
            {ehDono && <span>créditos da equipe</span>}
          </div>

          {totalCreditos && !ehAdminVis && (
            <div className="dash-faixa-barra">
              <div style={{ width: pctCreditos + '%' }} />
            </div>
          )}

          {dataRenov && !ehAdminVis && (
            <div className="dash-faixa-data">
              {rotuloData} <b>{new Date(dataRenov).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</b>
              {diasAte != null && <> · {diasAte} dias</>}
            </div>
          )}
        </div>

        <div className="dash-faixa-acoes">
          {/* O membro não compra: quem paga é a equipe. */}
          {!ehMembroVis || ehDono ? (
            <button className="dash-btn-cta" onClick={() => router.push('/assinatura')}>
              Comprar créditos
            </button>
          ) : null}

          {ehDono && (
            <button className="dash-btn-sec" onClick={() => router.push('/workspace')}>
              Gerenciar equipe
            </button>
          )}

          {!ehMembroVis && !ehDono && (
            <button className="dash-btn-sec" onClick={() => router.push('/assinatura')}>
              Ver assinatura
            </button>
          )}
        </div>
      </div>

      {/* ── A equipe ──
          Só para quem tem. Quem assina sozinho não vê nada disto. */}
      {ehDono && equipe?.equipe && (
        <div className="dash-eq">
          <div className="dash-eq-cab">
            {equipe.equipe.foto && (
              <div className="dash-eq-foto"
                   style={{ backgroundImage: `url(${equipe.equipe.foto})` }} />
            )}
            <div className="dash-eq-id">
              <strong>{equipe.equipe.nome || 'Sua equipe'}</strong>
              <span>
                {(equipe.membros || []).length} de {equipe.equipe.assentos} assentos usados
                {vagos > 0 && ` · ${vagos} ${vagos === 1 ? 'livre' : 'livres'}`}
              </span>
            </div>
            <button className="dash-eq-btn" onClick={() => router.push('/workspace')}>
              Ver equipe
            </button>
          </div>

          {/* Quem gastou quanto: é o que justifica a conta que ele paga */}
          {(equipe.membros || []).filter((m) => m.status === 'ativo').map((m) => (
            <div key={m.id} className="dash-eq-membro">
              <span className="dash-eq-av">{(m.email || '?')[0].toUpperCase()}</span>
              <div className="dash-eq-quem">
                <strong>
                  {m.email}
                  {m.eh_dono && <em> · você</em>}
                </strong>
              </div>
              <div className="dash-eq-uso">
                <strong>{(m.creditos_usados ?? 0).toLocaleString('pt-BR')}</strong>
                <span>
                  de {(m.creditos_total ?? 0).toLocaleString('pt-BR')} usados
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* O membro convidado vê o estúdio — mas sem consumo alheio nem
          botão de gerenciar: não é conta dele. */}
      {ehMembroVis && !ehDono && (
        <div className="dash-eq">
          <div className="dash-eq-cab">
            {equipeMembro?.foto && (
              <div className="dash-eq-foto"
                   style={{ backgroundImage: `url(${equipeMembro.foto})` }} />
            )}
            <div className="dash-eq-id">
              <strong>{equipeMembro?.nome || 'Sua equipe'}</strong>
              <span>
                Você faz parte desta equipe · convidado por{' '}
                {equipeMembro?.dono_nome || equipeMembro?.dono_email || '—'}
              </span>
            </div>
            <button className="dash-eq-btn dash-eq-btn--sair"
                    onClick={sairEquipe} disabled={saindo}>
              {saindo ? 'Saindo...' : 'Sair da equipe'}
            </button>
          </div>
        </div>
      )}

      {/* ── Assinatura e consumo ── */}
      <div className="dash-cartoes">
        {/* O membro não paga: no lugar da assinatura, o consumo dele. */}
        {(!ehMembroVis || ehDono) && !ehAdminVis && (
          <div className="dash-cartao">
            <span className="dash-cartao-rot">Assinatura</span>
            <strong className="dash-cartao-num">
              {conta.valor_centavos > 0
                ? <>R$ {((conta.valor_centavos || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<em>/mês</em></>
                : '—'}
            </strong>
            <div className="dash-cartao-linhas">
              {conta.assinou_em && (
                <span>Cliente desde <b>{new Date(conta.assinou_em).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</b></span>
              )}
              {dataRenov && (
                <span>Próxima cobrança <b>{new Date(dataRenov).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</b></span>
              )}
            </div>
          </div>
        )}

        {/* ── O plugin ──
            É o produto, não um rodapé: fica na faixa escura, com os passos
            sempre à vista. Quem não instalou precisa deles na cara. */}
        <div className="dash-plugin">
          <div className="dash-plugin-cab">
            <div className="dash-plugin-ico">
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <path d="M9 3v5M15 3v5M6 8h12v5a6 6 0 01-12 0V8zM12 19v2"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="dash-plugin-txt">
              <strong>Plugin para o SketchUp</strong>
              <span>Renderize direto do seu modelo · SketchUp 2023 ou superior</span>
            </div>
            <button className="dash-plugin-btn" onClick={baixar} disabled={baixando}>
              {baixando ? 'Preparando...' : 'Baixar plugin'}
            </button>
          </div>

          <button
            className={'dash-plugin-abre' + (comoInstalar ? ' dash-plugin-abre--on' : '')}
            onClick={() => setComoInstalar((v) => !v)}
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
                 stroke="currentColor" strokeWidth="1.6">
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{comoInstalar ? 'Como instalar' : 'Clique para ver como instalar'}</span>
            {!comoInstalar && <em>6 passos</em>}
          </button>

          {comoInstalar && (
          <div className="dash-plugin-passos">
            <div className="dash-passo">
              <span>1</span>
              <div>
                <strong>Baixe o plugin</strong>
                <p>Clique no botão <strong>Download</strong> acima para baixar o arquivo <strong>.rbz</strong> do Cora Render.</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>2</span>
              <div>
                <strong>Abra o Gerenciador de Extensões</strong>
                <p>No SketchUp, vá em <strong>Extensões → Gerenciador de extensões</strong> (Extension Manager).</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>3</span>
              <div>
                <strong>Clique em "Instalar extensão"</strong>
                <p>No canto inferior do gerenciador, clique em <strong>Instalar extensão</strong> (Install Extension).</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>4</span>
              <div>
                <strong>Escolha o arquivo .rbz</strong>
                <p>Selecione o arquivo <strong>.rbz</strong> que você baixou no passo 1.</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>5</span>
              <div>
                <strong>Confirme a instalação</strong>
                <p>Se aparecer um aviso de segurança, clique em <strong>Sim</strong> para continuar.</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>6</span>
              <div>
                <strong>Pronto!</strong>
                <p>O Cora Render aparece na barra de ferramentas. Clique no ícone para abrir e fazer login.</p>
              </div>
            </div>
          </div>
          )}
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
