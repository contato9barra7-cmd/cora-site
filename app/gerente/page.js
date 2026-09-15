'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  A TELA DO GERENTE
//
//  Tela PRÓPRIA, e não o `/admin` com pedaços escondidos. A diferença importa:
//  com uma tela só, metade dos botões recusaria, e botão que existe e recusa
//  ensina a pessoa a tentar. Aqui, o que está no arquivo é o que ele pode.
//
//  ── O QUE ELA TEM ──
//  Achar uma pessoa e ver a ficha dela por inteiro, a prova de aceite dos
//  documentos, as duas varreduras de auditoria, e escrever para os clientes.
//  É o trabalho de atendimento.
//
//  ── O QUE ELA NÃO TEM, E POR QUÊ ──
//  A tela Dinheiro e as listas de faturamento (é a empresa inteira, não uma
//  conta), creditar, trocar plano e cancelar (mexe em dinheiro), e as ações de
//  papel e de deletar (mexe em quem é quem). Quem pode promover pode promover
//  outra pessoa, e essa é a única família que não se abre nem com confiança.
//
//  ── A TRANCA NÃO É ESTA TELA ──
//  Quem tranca é o servidor, na tabela `ROTAS_DO_GERENTE` do cora-auth: 15 das
//  42 rotas de admin, e o padrão é negar. Esta página é desenho. Se ela um dia
//  discordar da tabela, quem manda é a tabela, e o que a pessoa vê é um erro.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import FichaConta from '../../components/FichaConta';
import PainelAceites from '../../components/PainelAceites';
import EmailAssinantes from '../../components/EmailAssinantes';
import AdminAuditoria from '../../components/AdminAuditoria';
import { lerConta, atualizarConta, retomarOuIrParaLogin } from '../../lib/auth';
import { contaVista, lerModo, EVENTO_VER_COMO } from '../../lib/verComo';
import { useIdioma } from '../../lib/i18n';

export default function Gerente() {
  const router = useRouter();
  const { t } = useIdioma();
  const [contaReal, setConta] = useState(null);
  const [modoVer, setModoVer] = useState('real');
  /* ── O "VER COMO GERENTE" PRECISA CHEGAR ATE AQUI ──
     Sem isto, o admin em modo gerente via a aba "Gerente" no menu e, ao
     clicar, recebia "voce e admin, va para o Admin". O menu dizia uma coisa e
     a tela dizia outra, e a unica tela que o modo existe para mostrar era
     justamente a que ele nao mostrava. */
  const conta = contaVista(contaReal, modoVer);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState('contas');
  const [emailAberto, setEmailAberto] = useState(false);
  /* A auditoria manda para a ficha, e a ficha e a aba Contas. O `seq` e o que
     faz a ficha reabrir quando o clique cai na MESMA conta duas vezes: sem
     ele, o efeito la dentro ve o mesmo id e nao faz nada. */
  const [fichaAbrir, setFichaAbrir] = useState(null);

  function abrirNaFicha(contaId) {
    setFichaAbrir({ id: contaId, seq: Date.now() });
    setAba('contas');
  }

  useEffect(() => {
    setModoVer(lerModo());
    function onVerComo(e) { setModoVer(e.detail || 'real'); }
    window.addEventListener(EVENTO_VER_COMO, onVerComo);
    return () => window.removeEventListener(EVENTO_VER_COMO, onVerComo);
  }, []);

  useEffect(() => {
    const c = lerConta();
    if (!c) { retomarOuIrParaLogin(router); return; }
    setConta(c);
    setCarregando(false);
    /* Busca a conta fresca porque o papel pode ter mudado desde o último
       carregamento. O cache serve para a tela abrir rápido, e não para decidir
       quem entra: quem decide é o servidor, a cada rota. */
    atualizarConta().then((fresca) => { if (fresca) setConta(fresca); }).catch(() => {});
  }, [router]);

  if (carregando) {
    return <AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;
  }
  if (!conta) return null;

  /* O admin não fica aqui: ele tem a tela inteira, e esta é a versão menor.
     Mandar ele embora evita a pergunta "por que sumiram os meus botões?". */
  if (conta.is_admin) {
    return (
      <AppShell>
        <div className="admin-wrap">
          <h1 className="conta-cabeca__nome">{t('ger_admin_titulo')}</h1>
          <p className="conta-p" style={{ marginTop: 8 }}>
            {t('ger_admin_desc')}
          </p>
          <button className="as-btn-cta" style={{ marginTop: 18 }}
                  onClick={() => router.push('/admin')}>
            {t('ger_ir_admin')}
          </button>
        </div>
      </AppShell>
    );
  }

  if (!conta.gerente) {
    return (
      <AppShell>
        <div className="admin-wrap">
          <h1 className="conta-cabeca__nome">{t('ger_sem_acesso_titulo')}</h1>
          <p className="conta-p" style={{ marginTop: 8 }}>
            {t('ger_sem_acesso_desc')}
          </p>
          <button className="as-btn-cta" style={{ marginTop: 18 }}
                  onClick={() => router.push('/conta')}>
            {t('ger_voltar_inicio')}
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="admin-wrap">
        {/* A mesma cabeça do admin: olho, nome grande e uma linha de apoio. */}
        <div className="adm-cabeca">
          <div className="conta-cabeca">
            <div className="conta-cabeca__txt">
              <p className="eyebrow">{t('ger_eyebrow')}</p>
              <h1 className="conta-cabeca__nome">{t('ger_titulo')}</h1>
              <p className="conta-cabeca__email">
                {aba === 'contas'
                  ? t('ger_sub_contas')
                  : aba === 'aceites'
                    ? t('ger_sub_aceites')
                    : t('ger_sub_auditoria')}
              </p>
            </div>
          </div>
          <div className="adm-acoes">
            <button className="as-btn-cta" onClick={() => setEmailAberto(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              {t('ger_enviar_email')}
            </button>
          </div>
        </div>

        {/* Três abas, e não sete. O gerente tem três assuntos: as pessoas, a
            prova do aceite e o que o crédito fez. Uma fila de abas com metade
            delas ausente pareceria uma tela quebrada. */}
        <div className="adm-abas" role="tablist">
          <button className={'adm-aba' + (aba === 'contas' ? ' ativa' : '')}
                  onClick={() => setAba('contas')}>{t('ger_aba_contas')}</button>
          <button className={'adm-aba' + (aba === 'aceites' ? ' ativa' : '')}
                  onClick={() => setAba('aceites')}>{t('ger_aba_aceites')}</button>
          {/* Leitura, e só. As duas varreduras não mexem em crédito nem em
              dinheiro, e por isso cabem aqui: elas mostram o que conferir, e
              quem conserta continua sendo o admin. */}
          <button className={'adm-aba' + (aba === 'auditoria' ? ' ativa' : '')}
                  onClick={() => setAba('auditoria')}>{t('ger_aba_auditoria')}</button>
        </div>

        {/* A ficha traz a própria busca e a própria lista: ela é a tela de
            "achar uma pessoa e ver tudo dela". `papel` só desliga o menu de
            ações, que é o que o gerente não tem. */}
        {aba === 'contas' && <FichaConta papel="gerente" abrirConta={fichaAbrir} />}
        {aba === 'aceites' && <div style={{ marginTop: 18 }}><PainelAceites /></div>}
        {aba === 'auditoria' && (
          <div style={{ marginTop: 18 }}><AdminAuditoria onAbrirConta={abrirNaFicha} /></div>
        )}
      </div>

      {emailAberto && <EmailAssinantes onClose={() => setEmailAberto(false)} />}
    </AppShell>
  );
}
