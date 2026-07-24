'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, atualizarConta, baixarPlugin, minhaEquipe, sairDaEquipe, lerEquipe, EVENTO_CREDITOS} from '../../lib/auth';
import { useIdioma, localeDeIdioma } from '../../lib/i18n';

const NOME_PLANO = { free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio' };

function ContaConteudo() {
  const router = useRouter();
  const { t, idioma } = useIdioma();
  const loc = localeDeIdioma(idioma);
  const params = useSearchParams();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);

  const [comoInstalar, setComoInstalar] = useState(false);
  const [equipeMembro, setEquipeMembro] = useState(null);
  const [saindo, setSaindo] = useState(false);
  const [equipe, setEquipe] = useState(null);
  const [verComo, setVerComo] = useState('real');   // real | normal | dono | membro

  async function sairEquipe() {
    if (!confirm(t('conta_sair_confirm'))) return;
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
    atualizarConta().then((fresca) => { if (fresca) setConta(fresca); }).catch(() => {});
    minhaEquipe().then((eq) => { if (eq) setEquipeMembro(eq); });

    if (c.eh_dono_equipe) {
      lerEquipe().then((e) => { if (e) setEquipe(e); }).catch(() => {});
    }

    if (params.get('pagamento') === 'sucesso') {
      setAviso(t('conta_pag_recebido'));
      atualizarConta().then((fresca) => {
        if (fresca) setConta(fresca);
        setAviso(t('conta_pag_confirmado'));
        setTimeout(() => setAviso(''), 5000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, params]);

  useEffect(() => {
    function onCreditosDash(e) {
      if (e.detail) setConta(e.detail);
    }
    window.addEventListener(EVENTO_CREDITOS, onCreditosDash);
    return () => window.removeEventListener(EVENTO_CREDITOS, onCreditosDash);
  }, []);

  if (carregando) return <AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;
  if (!conta) return null;

  const ehAdmin = conta.is_admin === true;
  const modo = ehAdmin ? verComo : 'real';
  const ehAdminVis = modo === 'real' ? ehAdmin : false;
  const ehDono = modo === 'dono' ? true
               : (modo === 'normal' || modo === 'membro') ? false
               : ehAdmin ? false
               : conta.eh_dono_equipe;
  const ehMembroVis = modo === 'membro' ? true
                    : (modo === 'normal' || modo === 'dono') ? false
                    : ehAdmin ? false
                    : !!equipeMembro;
  const ehPago = conta.plano && conta.plano !== 'free';
  const ilimitadoReal = conta.ilimitado === true || conta.creditos_total === -1;
  const mostrarIlimitado = modo === 'real' ? ilimitadoReal : false;

  const nomePlano = (ehAdminVis && ilimitadoReal) ? 'Admin'
    : ehDono ? `Teams (${NOME_PLANO[conta.equipe_plano] || conta.equipe_plano || 'Pro'})`
    : ehMembroVis ? `${NOME_PLANO[conta.plano] || conta.plano} (${t('conta_equipe_tag').toLowerCase()})`
    : (NOME_PLANO[conta.plano] || conta.plano);
  const demoCreditos = ehAdmin && modo !== 'real';
  const creditos = mostrarIlimitado ? t('conta_ilimitado')
    : ehDono ? (conta.equipe_creditos_total ?? 0).toLocaleString(loc)
    : demoCreditos ? (14320).toLocaleString(loc)
    : (conta.creditos_restantes ?? 0).toLocaleString(loc);
  const totalCreditos = mostrarIlimitado ? null
    : ehDono ? null
    : demoCreditos ? (20000).toLocaleString(loc)
    : (conta.creditos_total ?? 0).toLocaleString(loc);
  const dataRenov = ehDono ? conta.equipe_renova_em : conta.expira_em;
  const rotuloData = (ehPago || ehDono) ? t('conta_renova_em') : t('conta_valido_ate');

  const pctCreditos = (conta.creditos_total > 0 && !mostrarIlimitado)
    ? Math.max(0, Math.min(100,
        Math.round(((conta.creditos_restantes ?? 0) / conta.creditos_total) * 100)))
    : 0;

  const diasAte = dataRenov
    ? Math.max(0, Math.ceil((new Date(dataRenov) - new Date()) / 86400000))
    : null;

  const vagos = equipe?.equipe
    ? Math.max(0, (equipe.equipe.assentos || 0) - (equipe.membros || []).length)
    : 0;

  return (
    <AppShell>
    <div className="admin-wrap">
      {ehAdmin && (
        <div className="vercomo">
          <span className="vercomo-lbl">{t('conta_ver_como')}</span>
          <div className="vercomo-opcoes">
            {[
              { v: 'real',   n: t('conta_vc_real') },
              { v: 'normal', n: t('conta_vc_normal') },
              { v: 'dono',   n: t('conta_vc_dono') },
              { v: 'membro', n: t('conta_vc_membro') }
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

      <div className="dash-faixa">
        <div className="dash-faixa-txt">
          <div className="dash-faixa-plano">
            <span>{nomePlano}</span>
            {ehDono && <em>{t('conta_proprietario')}</em>}
            {ehMembroVis && !ehDono && <em className="dash-tag--sec">{t('conta_equipe_tag')}</em>}
          </div>

          <div className="dash-faixa-num">
            <strong>{creditos}</strong>
            {totalCreditos && <span>{t('conta_creditos_de')} {totalCreditos}</span>}
            {ehDono && <span>{t('conta_creditos_equipe')}</span>}
          </div>

          {totalCreditos && !mostrarIlimitado && (
            <div className="dash-faixa-barra">
              <div style={{ width: pctCreditos + '%' }} />
            </div>
          )}

          {dataRenov && !mostrarIlimitado && (
            <div className="dash-faixa-data">
              {rotuloData} <b>{new Date(dataRenov).toLocaleDateString(loc, { day: 'numeric', month: 'long' })}</b>
              {diasAte != null && <> · {diasAte} {t('dias')}</>}
            </div>
          )}
        </div>

        <div className="dash-faixa-acoes">
          {!ehMembroVis || ehDono ? (
            <button className="dash-btn-cta" onClick={() => router.push('/assinatura')}>
              {t('comprar_creditos')}
            </button>
          ) : null}

          {ehDono && (
            <button className="dash-btn-sec" onClick={() => router.push('/workspace')}>
              {t('conta_gerenciar_equipe')}
            </button>
          )}

          {!ehMembroVis && !ehDono && (
            <button className="dash-btn-sec" onClick={() => router.push('/assinatura')}>
              {t('conta_ver_assinatura')}
            </button>
          )}
        </div>
      </div>

      {ehDono && equipe?.equipe && (
        <div className="dash-eq">
          <div className="dash-eq-cab">
            {equipe.equipe.foto && (
              <div className="dash-eq-foto"
                   style={{ backgroundImage: `url(${equipe.equipe.foto})` }} />
            )}
            <div className="dash-eq-id">
              <strong>{equipe.equipe.nome || t('conta_sua_equipe')}</strong>
              <span>
                {(equipe.membros || []).length} {t('conta_de')} {equipe.equipe.assentos} {t('conta_assentos_usados')}
                {vagos > 0 && ` · ${vagos} ${vagos === 1 ? t('conta_livre') : t('conta_livres')}`}
              </span>
            </div>
            <button className="dash-eq-btn" onClick={() => router.push('/workspace')}>
              {t('conta_ver_equipe')}
            </button>
          </div>

          {(equipe.membros || []).filter((m) => m.status === 'ativo').map((m) => (
            <div key={m.id} className="dash-eq-membro">
              <span className="dash-eq-av">{(m.email || '?')[0].toUpperCase()}</span>
              <div className="dash-eq-quem">
                <strong>
                  {m.email}
                  {m.eh_dono && <em> · {t('conta_voce')}</em>}
                </strong>
              </div>
              <div className="dash-eq-uso">
                <strong>{(m.creditos_usados ?? 0).toLocaleString(loc)}</strong>
                <span>
                  {t('conta_de')} {(m.creditos_total ?? 0).toLocaleString(loc)} {t('conta_usados')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {ehMembroVis && !ehDono && (
        <div className="dash-eq">
          <div className="dash-eq-cab">
            {equipeMembro?.foto && (
              <div className="dash-eq-foto"
                   style={{ backgroundImage: `url(${equipeMembro.foto})` }} />
            )}
            <div className="dash-eq-id">
              <strong>{equipeMembro?.nome || t('conta_sua_equipe')}</strong>
              <span>
                {t('conta_faz_parte')}{' '}
                {equipeMembro?.dono_nome || equipeMembro?.dono_email || '—'}
              </span>
            </div>
            <button className="dash-eq-btn dash-eq-btn--sair"
                    onClick={sairEquipe} disabled={saindo}>
              {saindo ? t('conta_saindo') : t('conta_sair_equipe')}
            </button>
          </div>
        </div>
      )}

      <div className="dash-cartoes">
        {(!ehMembroVis || ehDono) && !mostrarIlimitado && (() => {
          const demo = ehAdmin && modo !== 'real';
          const valorCent = demo ? 4900 : (conta.valor_centavos || 0);
          const assinouEm = demo ? '2025-01-15' : conta.assinou_em;
          const proxCobranca = demo ? new Date(Date.now() + 20 * 86400000).toISOString() : dataRenov;
          return (
          <div className="dash-cartao">
            <span className="dash-cartao-rot">{t('nav_assinatura')}</span>
            <strong className="dash-cartao-num">
              {valorCent > 0
                ? <>R$ {(valorCent / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<em>{t('conta_mes')}</em></>
                : '—'}
            </strong>
            <div className="dash-cartao-linhas">
              {assinouEm && (
                <span>{t('conta_cliente_desde')} <b>{new Date(assinouEm).toLocaleDateString(loc, { month: 'short', year: 'numeric' })}</b></span>
              )}
              {proxCobranca && (
                <span>{t('conta_prox_cobranca')} <b>{new Date(proxCobranca).toLocaleDateString(loc, { day: 'numeric', month: 'short' })}</b></span>
              )}
            </div>
          </div>
          );
        })()}

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
              <strong>{t('conta_plugin_titulo')}</strong>
              <span>{t('conta_plugin_sub')}</span>
            </div>
            <button className="dash-plugin-btn" onClick={baixar} disabled={baixando}>
              {baixando ? t('conta_preparando') : t('conta_baixar_plugin')}
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
            <span>{comoInstalar ? t('conta_como_instalar') : t('conta_clique_instalar')}</span>
            {!comoInstalar && <em>{t('conta_6passos')}</em>}
          </button>

          {comoInstalar && (
          <div className="dash-plugin-passos">
            <div className="dash-passo">
              <span>1</span>
              <div>
                <strong>{t('conta_p1_t')}</strong>
                <p>{t('conta_p1_b')}</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>2</span>
              <div>
                <strong>{t('conta_p2_t')}</strong>
                <p>{t('conta_p2_b')}</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>3</span>
              <div>
                <strong>{t('conta_p3_t')}</strong>
                <p>{t('conta_p3_b')}</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>4</span>
              <div>
                <strong>{t('conta_p4_t')}</strong>
                <p>{t('conta_p4_b')}</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>5</span>
              <div>
                <strong>{t('conta_p5_t')}</strong>
                <p>{t('conta_p5_b')}</p>
              </div>
            </div>
            <div className="dash-passo">
              <span>6</span>
              <div>
                <strong>{t('conta_p6_t')}</strong>
                <p>{t('conta_p6_b')}</p>
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
  const { t } = useIdioma();
  return (
    <Suspense fallback={<AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>}>
      <ContaConteudo />
    </Suspense>
  );
}
