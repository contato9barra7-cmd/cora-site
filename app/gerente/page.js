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
//  documentos, e escrever para os clientes. É o trabalho de atendimento.
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
import { lerConta, atualizarConta } from '../../lib/auth';
import { useIdioma } from '../../lib/i18n';

export default function Gerente() {
  const router = useRouter();
  const { t } = useIdioma();
  const [conta, setConta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState('contas');
  const [emailAberto, setEmailAberto] = useState(false);

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
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
          <h1 className="conta-cabeca__nome">Esta tela é a do gerente</h1>
          <p className="conta-p" style={{ marginTop: 8 }}>
            Você é admin, então a sua é a de Admin, que tem tudo o que esta tem
            e mais.
          </p>
          <button className="as-btn-cta" style={{ marginTop: 18 }}
                  onClick={() => router.push('/admin')}>
            Ir para o Admin
          </button>
        </div>
      </AppShell>
    );
  }

  if (!conta.gerente) {
    return (
      <AppShell>
        <div className="admin-wrap">
          <h1 className="conta-cabeca__nome">Esta tela não é sua</h1>
          <p className="conta-p" style={{ marginTop: 8 }}>
            Ela é de quem atende os clientes do Cora.
          </p>
          <button className="as-btn-cta" style={{ marginTop: 18 }}
                  onClick={() => router.push('/conta')}>
            Voltar para o Início
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
              <p className="eyebrow">Gerente</p>
              <h1 className="conta-cabeca__nome">Quem está no Cora</h1>
              <p className="conta-cabeca__email">
                {aba === 'contas'
                  ? 'Ache a pessoa e veja a conta dela por inteiro.'
                  : 'A prova de quem aceitou o que, e quando.'}
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
              Enviar e-mail
            </button>
          </div>
        </div>

        {/* Duas abas, e não sete. O gerente tem dois assuntos: as pessoas e a
            prova do aceite. Uma fila de abas com metade delas ausente pareceria
            uma tela quebrada. */}
        <div className="adm-abas" role="tablist">
          <button className={'adm-aba' + (aba === 'contas' ? ' ativa' : '')}
                  onClick={() => setAba('contas')}>Contas</button>
          <button className={'adm-aba' + (aba === 'aceites' ? ' ativa' : '')}
                  onClick={() => setAba('aceites')}>Aceites</button>
        </div>

        {/* A ficha traz a própria busca e a própria lista: ela é a tela de
            "achar uma pessoa e ver tudo dela". `papel` só desliga o menu de
            ações, que é o que o gerente não tem. */}
        {aba === 'contas' && <FichaConta papel="gerente" />}
        {aba === 'aceites' && <div style={{ marginTop: 18 }}><PainelAceites /></div>}
      </div>

      {emailAberto && <EmailAssinantes onClose={() => setEmailAberto(false)} />}
    </AppShell>
  );
}
