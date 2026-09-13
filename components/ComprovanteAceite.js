'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  O COMPROVANTE DE ACEITE
//
//  Ele existe para ter valor de prova. Por isso traz, na mesma folha, as cinco
//  coisas que respondem "quem aceitou o que, quando e de onde":
//
//    quem      nome, e-mail, documento fiscal e o número da conta
//    o que     os DOIS documentos, cada um com a sua versão
//    quando    a data de cada aceite, com fuso
//    de onde   o IP e o navegador que estavam gravados
//    o texto   os dois documentos por INTEIRO, e não um link para eles
//
//  O TEXTO INTEIRO É O QUE SEPARA UM COMPROVANTE DE UM RECIBO. Um link pode
//  mudar de conteúdo depois; a folha, não. É a mesma razão de o servidor
//  guardar o texto de cada versão em vez de só apontar para a página.
//
//  DUAS DATAS, E NÃO UMA. Termos e Privacidade não mudam juntos: quem reaceitou
//  só os Termos continua com a Privacidade na versão antiga, e a folha diz as
//  duas. Uma data única no topo mentiria no primeiro reaceite parcial.
//
//  A LOCALIZAÇÃO É ESTIMATIVA, e a folha diz isso com todas as letras. O IP é o
//  fato registrado; a cidade é leitura dele numa base pública, e ela erra com
//  frequência em celular e em VPN. Num papel que pode ir para a Justiça, as
//  duas na mesma linha teriam a mesma força, e não têm.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { adminComprovante } from '../lib/auth';
import { useIdioma } from '../lib/i18n';

// O nome sai traduzido na tela; o que a pessoa aceitou continua sendo a
// versão em português guardada no banco, com o hash dela.
function porExtenso(iso, comHora, locale) {
  if (!iso) return '—';
  const d = new Date(iso);
  const data = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  if (!comHora) return data;
  return data + ', ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/* O texto guardado vem em parágrafos separados por linha em branco. Cada um
   vira um bloco próprio, e não um `<pre>`: o `<pre>` preserva a quebra do
   arquivo, e a quebra do arquivo não é a quebra da folha impressa. */
function paragrafos(texto) {
  return String(texto || '').split(/\n\s*\n/).filter((p) => p.trim());
}

export default function ComprovanteAceite({ contaId, nome, onFechar }) {
  const { idioma, t } = useIdioma();
  const locale = idioma === 'en' ? 'en-US' : idioma === 'es' ? 'es-ES' : 'pt-BR';
  const nomeDoDoc = { termos: t('cmp_termos'), privacidade: t('cmp_privacidade') };
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!contaId) return;
    adminComprovante(contaId).then(setDados).catch((e) => setErro(e.message));
  }, [contaId]);

  /* Escape fecha. Numa janela que cobre a tela inteira e não tem outra saída
     além do X, o teclado precisa funcionar. */
  useEffect(() => {
    const sair = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', sair);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', sair);
      document.body.style.overflow = '';
    };
  }, [onFechar]);

  const conta = dados?.conta;
  const docs = dados?.documentos || [];
  /* O IP, o navegador e a localização são os mesmos nos dois documentos quando
     o aceite foi no cadastro. Quando não são, o do documento mais recente é o
     que descreve o último gesto da pessoa. */
  const ultimo = docs.length
    ? docs.reduce((a, d) => (new Date(d.criado_em) > new Date(a.criado_em) ? d : a))
    : null;

  return (
    <div className="adm-modal" onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="adm-modal__folha" style={{ width: 'min(820px, 100%)' }}>
        <div className="adm-modal__cab">
          <h2>{t('cmp_titulo')}</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Só aparece com a folha pronta: imprimir um "carregando" gera um
                papel em branco que parece um comprovante vazio. */}
            {dados && (
              <button className="as-btn-cta"
                      style={{ height: 40, padding: '0 20px', fontSize: 13.5 }}
                      onClick={() => window.print()}>{t('cmp_salvar_pdf')}</button>
            )}
            <button className="adm-modal__x" onClick={onFechar} aria-label={t('fechar')}>×</button>
          </div>
        </div>

        {erro ? (
          <div className="cmp"><div className="cmp__miolo"><p className="conta-p">{erro}</p></div></div>
        ) : !dados ? (
          <div className="cmp"><div className="cmp__miolo"><p className="conta-p">{t('cmp_montando')}</p></div></div>
        ) : (
          <div className="cmp">
            <div className="cmp__faixa" aria-hidden="true" />
            <div className="cmp__miolo">
              <div className="cmp__marca" role="img" aria-label="Cora Render" />

              <h3 className="cmp__tit">{t('cmp_titulo')}</h3>
              <p className="cmp__num">
                {t('cmp_registro')} {String(conta.id).padStart(7, '0')} · {t('cmp_emitido')}{' '}
                {porExtenso(dados.emitido_em, false, locale)}
              </p>

              {/* Falta um documento? A folha não pode sair como se estivesse
                  completa: quem a leva à Justiça precisa saber o que ela não
                  cobre antes de descobrir do outro lado. */}
              {!dados.completo && (
                <p className="cmp__est" style={{ color: 'var(--alerta)' }}>
                  {t('cmp_incompleto')}
                </p>
              )}

              <div className="cmp__quem">
                <div>
                  <span>{t('cmp_quem')}</span>
                  <p>
                    <b>{conta.nome || nome || t('cmp_sem_nome')}</b><br />
                    {conta.email}<br />
                    {conta.cpf || conta.doc_intl || t('cmp_sem_doc')}<br />
                    {t('cmp_conta')} {conta.id}
                  </p>
                </div>
                <div>
                  <span>{t('cmp_o_que')}</span>
                  <p>
                    {docs.map((d) => (
                      <span key={d.documento}>
                        <b>{nomeDoDoc[d.documento] || d.documento}</b>, {t('cmp_versao').toLowerCase()} {d.versao}<br />
                      </span>
                    ))}
                    {t('cmp_integra_abaixo')}
                  </p>
                </div>
                <div>
                  <span>{t('cmp_quando')}</span>
                  <p>
                    {docs.map((d) => (
                      <span key={d.documento}>
                        {nomeDoDoc[d.documento] || d.documento}, {t('cmp_em')}{' '}
                        <b>{porExtenso(d.criado_em, true, locale)}</b><br />
                      </span>
                    ))}
                    {t('cmp_fuso')}
                  </p>
                </div>
                <div>
                  <span>{t('cmp_de_onde')}</span>
                  <p>
                    {t('cmp_ip')} <b>{ultimo?.ip || '—'}</b>
                  </p>
                  {ultimo?.navegador && <p className="doc__ua">{ultimo.navegador}</p>}
                  {(ultimo?.cidade || ultimo?.pais) && (
                    <p className="cmp__est">
                      {t('cmp_geo_inicio')}{' '}
                      <b>{[ultimo.cidade, ultimo.regiao, ultimo.pais].filter(Boolean).join(', ')}</b>.
                      {' '}{t('cmp_geo_desc')}
                    </p>
                  )}
                </div>
              </div>

              <div className="cmp__texto">
                <span>{t(docs.length === 1 ? 'cmp_doc_integro' : 'cmp_docs_integros')}</span>
                <p className="cmp__aviso">
                  {t('cmp_texto_desc')}
                </p>

                {docs.map((d) => (
                  <section className="cmp__sec" key={d.documento}>
                    <div className="cmp__sec-cab">
                      <h4>{nomeDoDoc[d.documento] || d.documento}</h4>
                      <p>
                        {t('cmp_versao')} <b>{d.versao}</b>, {t('cmp_vigente')} {d.data_texto}<br />
                        {t('cmp_aceita_em')} <b>{porExtenso(d.criado_em, true, locale)}</b>
                        {/* O hash confere com o texto guardado AGORA. Se alguém
                            editou a linha à mão, ele vira falso, e a folha diz
                            isso em vez de sair afirmando o que não pode. */}
                        {!d.hash_confere && (
                          <><br /><b style={{ color: 'var(--alerta)' }}>
                            {t('cmp_hash_erro')}
                          </b></>
                        )}
                      </p>
                    </div>
                    <div className="cmp__doc">
                      {paragrafos(d.texto).map((p, i) => (
                        <div className="cmp__cl" key={i}><p>{p}</p></div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <p className="cmp__pe">
                {t('cmp_rodape_1')}
                <br /><br />
                {t('cmp_rodape_2')}
                <br />
                <span className="cmp__quem-somos">
                  9BARRA7 STUDIO LTDA. · CNPJ 43.879.950/0001-40 · corarender.com
                  {dados.credito_geo && <><br /><span style={{ fontSize: 9 }}>{dados.credito_geo}</span></>}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
