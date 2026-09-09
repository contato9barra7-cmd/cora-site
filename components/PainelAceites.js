'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  A PROVA DO ACEITE
//
//  Quem aceitou os Termos, quando, de onde, e QUAL texto leu.
//
//  ── Por que isto existe ──
//  Até 06/09/2026 nada disso era guardado. A caixa "li e aceito" era conferida
//  no navegador e jogada fora: o `registrar()` nem mandava o campo, e a rota
//  nem exigia. Dava para criar conta por POST direto sem nunca ter visto os
//  Termos. Como a licença de divulgação das imagens (item 7) nasce do aceite,
//  uma conta sem registro é uma conta sem licença.
//
//  ── Por que o texto inteiro fica guardado ──
//  Os documentos mudam. Guardar só "aceitou: sim" e mostrar o texto de hoje,
//  um ano depois, não prova nada, porque não é o texto que a pessoa leu. Cada
//  linha aponta para a VERSÃO congelada, e "Ver o texto" imprime exatamente
//  aquilo, com a conferência do hash.
//
//  ── O número de quem ainda deve ──
//  Esta tela já mostrou, em vermelho, quantas contas não tinham aceite nenhum,
//  e a lista de quem eram, com o botão de avisar por e-mail. O dono pediu para
//  tirar: o número vinha de antes de 06/09/2026, quando o aceite ainda não era
//  gravado, e ele estava sempre lá.
//
//  As rotas continuam de pé no cora-auth (`/admin/reaceite/pendentes` e
//  `/admin/reaceite/avisar`), já filtradas para contar só as contas do Cora.
//  Trazer de volta é um commit.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { adminAceites, adminAceiteTexto } from '../lib/auth';
import ComprovanteAceite from './ComprovanteAceite';
import { useIdioma } from '../lib/i18n';

function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PainelAceites() {
  const { t } = useIdioma();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);
  const [comprovante, setComprovante] = useState(null);   // o texto que está sendo lido


  useEffect(() => {
    adminAceites().then(setDados).catch((e) => setErro(e.message));
  }, []);

  async function verTexto(id) {
    setAberto({ carregando: true });
    try {
      setAberto(await adminAceiteTexto(id));
    } catch (e) {
      setAberto({ erro: e.message });
    }
  }

  if (erro) return <p className="admin-vazio">{erro}</p>;
  if (!dados) return <p className="admin-vazio">{t('adm_carregando')}</p>;

  const termo = busca.trim().toLowerCase();
  const lista = dados.aceites.filter(
    (a) => !termo ||
      (a.email || '').toLowerCase().includes(termo) ||
      (a.nome || '').toLowerCase().includes(termo)
  );

  return (
    <div className="admin-ac">
      <div className="admin-ac__topo">
        <div className="admin-ac__nums">
          <span><strong>{dados.aceites.length}</strong> {t('adm_ac_registros')}</span>
          <span className="admin-ac__sep">·</span>
          <span>{t('adm_ac_versao')} <strong>{dados.versao_atual}</strong></span>
        </div>
        <input
          className="admin-ac__busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('adm_ac_buscar')}
        />
      </div>

      {lista.length === 0 ? (
        <p className="admin-vazio">{t('adm_ac_nenhum')}</p>
      ) : (
        <div className="admin-tabela-wrap">
          <table className="admin-tabela">
            <thead>
              <tr>
                <th>{t('adm_ac_quem')}</th>
                <th>{t('adm_ac_documento')}</th>
                <th>{t('adm_ac_quando')}</th>
                <th>{t('adm_ac_de_onde')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="admin-ac-nome">{a.nome || '—'}</div>
                    <div className="admin-ac-email">{a.email}</div>
                  </td>
                  <td>
                    <span className="admin-ac-doc">{a.documento}</span>
                    <div className="admin-ac-versao">
                      {a.versao} · {a.idioma}
                    </div>
                  </td>
                  <td className="admin-ac-num">{quando(a.criado_em)}</td>
                  <td className="admin-ac-num">
                    <div>{a.ip || '—'}</div>
                    <div className="admin-ac-ua" title={a.navegador || ''}>
                      {(a.navegador || '').slice(0, 38)}
                    </div>
                  </td>
                  <td>
                    {/* Dois botoes com papeis diferentes. "Ver texto" e a
                        conferencia rapida de UMA linha, dentro da tela. O
                        comprovante e a folha da PESSOA, com os dois documentos
                        inteiros, e existe para ser impressa e levada.

                        O comprovante so aparece com conta ligada: sem conta_id
                        nao ha de quem montar a folha, e um botao que abre um
                        erro e pior que botao nenhum. */}
                    <button className="admin-ac-ver" onClick={() => verTexto(a.id)}>
                      {t('adm_ac_ver_texto')}
                    </button>
                    {a.conta_id && (
                      <button className="admin-ac-ver"
                              onClick={() => setComprovante({ id: a.conta_id, nome: a.nome })}>
                        {t('adm_ac_comprovante')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comprovante && (
        <ComprovanteAceite contaId={comprovante.id} nome={comprovante.nome}
                           onFechar={() => setComprovante(null)} />
      )}

      {aberto && (
        <div className="admin-ac-janela" onClick={() => setAberto(null)}>
          <div className="admin-ac-papel" onClick={(e) => e.stopPropagation()}>
            {aberto.carregando ? (
              <p className="admin-vazio">{t('adm_carregando')}</p>
            ) : aberto.erro ? (
              <p className="admin-vazio">{aberto.erro}</p>
            ) : (
              <>
                <div className="admin-ac-papel__cab">
                  <div>
                    <h3>{aberto.documento} · {aberto.versao}</h3>
                    <p>
                      {aberto.email} · {quando(aberto.criado_em)} · {aberto.ip}
                    </p>
                  </div>
                  <button onClick={() => setAberto(null)} aria-label="Fechar">✕</button>
                </div>
                {/* A conferência do hash: o texto guardado ainda é o que foi
                    aceito, ou alguém mexeu na linha depois? */}
                <p className={'admin-ac-hash' + (aberto.hash_confere ? '' : ' quebrado')}>
                  {aberto.hash_confere ? t('adm_ac_integro') : t('adm_ac_alterado')}
                  <code>{aberto.hash}</code>
                </p>
                <pre className="admin-ac-texto">{aberto.texto}</pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
