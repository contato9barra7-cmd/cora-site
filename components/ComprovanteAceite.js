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

const NOME_DO_DOC = { termos: 'Termos de Uso', privacidade: 'Política de Privacidade' };

function porExtenso(iso, comHora) {
  if (!iso) return '—';
  const d = new Date(iso);
  const data = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (!comHora) return data;
  return data + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* O texto guardado vem em parágrafos separados por linha em branco. Cada um
   vira um bloco próprio, e não um `<pre>`: o `<pre>` preserva a quebra do
   arquivo, e a quebra do arquivo não é a quebra da folha impressa. */
function paragrafos(texto) {
  return String(texto || '').split(/\n\s*\n/).filter((p) => p.trim());
}

export default function ComprovanteAceite({ contaId, nome, onFechar }) {
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
          <h2>Comprovante de aceite</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Só aparece com a folha pronta: imprimir um "carregando" gera um
                papel em branco que parece um comprovante vazio. */}
            {dados && (
              <button className="as-btn-cta"
                      style={{ height: 40, padding: '0 20px', fontSize: 13.5 }}
                      onClick={() => window.print()}>Salvar em PDF</button>
            )}
            <button className="adm-modal__x" onClick={onFechar} aria-label="Fechar">×</button>
          </div>
        </div>

        {erro ? (
          <div className="cmp"><div className="cmp__miolo"><p className="conta-p">{erro}</p></div></div>
        ) : !dados ? (
          <div className="cmp"><div className="cmp__miolo"><p className="conta-p">Montando a folha...</p></div></div>
        ) : (
          <div className="cmp">
            <div className="cmp__faixa" aria-hidden="true" />
            <div className="cmp__miolo">
              <div className="cmp__marca" role="img" aria-label="Cora Render" />

              <h3 className="cmp__tit">Comprovante de aceite</h3>
              <p className="cmp__num">
                Registro nº {String(conta.id).padStart(7, '0')} · emitido em{' '}
                {porExtenso(dados.emitido_em)}
              </p>

              {/* Falta um documento? A folha não pode sair como se estivesse
                  completa: quem a leva à Justiça precisa saber o que ela não
                  cobre antes de descobrir do outro lado. */}
              {!dados.completo && (
                <p className="cmp__est" style={{ color: 'var(--alerta)' }}>
                  Esta conta não tem registro de aceite dos dois documentos. A folha traz
                  só o que está gravado.
                </p>
              )}

              <div className="cmp__quem">
                <div>
                  <span>Quem aceitou</span>
                  <p>
                    <b>{conta.nome || nome || 'sem nome'}</b><br />
                    {conta.email}<br />
                    {conta.cpf || conta.doc_intl || 'sem documento fiscal'}<br />
                    Conta nº {conta.id}
                  </p>
                </div>
                <div>
                  <span>O que foi aceito</span>
                  <p>
                    {docs.map((d) => (
                      <span key={d.documento}>
                        <b>{NOME_DO_DOC[d.documento] || d.documento}</b>, versão {d.versao}<br />
                      </span>
                    ))}
                    os dois na íntegra, mais abaixo nesta folha
                  </p>
                </div>
                <div>
                  <span>Quando</span>
                  <p>
                    {docs.map((d) => (
                      <span key={d.documento}>
                        {NOME_DO_DOC[d.documento] || d.documento}, em{' '}
                        <b>{porExtenso(d.criado_em, true)}</b><br />
                      </span>
                    ))}
                    horário de Brasília (UTC−3)
                  </p>
                </div>
                <div>
                  <span>De onde</span>
                  <p>
                    Endereço de IP <b>{ultimo?.ip || '—'}</b>
                  </p>
                  {ultimo?.navegador && <p className="doc__ua">{ultimo.navegador}</p>}
                  {(ultimo?.cidade || ultimo?.pais) && (
                    <p className="cmp__est">
                      Pelo IP, a conexão saiu de{' '}
                      <b>{[ultimo.cidade, ultimo.regiao, ultimo.pais].filter(Boolean).join(', ')}</b>.
                      É leitura de uma base pública de faixas de IP, e não o endereço da
                      pessoa: em celular e em VPN costuma apontar outra cidade. O que está
                      registrado é o IP.
                    </p>
                  )}
                </div>
              </div>

              <div className="cmp__texto">
                <span>Os {docs.length === 1 ? 'documento' : 'documentos'}, na íntegra</span>
                <p className="cmp__aviso">
                  Abaixo está o texto por inteiro, na versão que esta conta aceitou. Não é
                  resumo nem link: é o que estava escrito no dia.
                </p>

                {docs.map((d) => (
                  <section className="cmp__sec" key={d.documento}>
                    <div className="cmp__sec-cab">
                      <h4>{NOME_DO_DOC[d.documento] || d.documento}</h4>
                      <p>
                        Versão <b>{d.versao}</b>, em vigor desde {d.data_texto}<br />
                        Aceita por esta conta em <b>{porExtenso(d.criado_em, true)}</b>
                        {/* O hash confere com o texto guardado AGORA. Se alguém
                            editou a linha à mão, ele vira falso, e a folha diz
                            isso em vez de sair afirmando o que não pode. */}
                        {!d.hash_confere && (
                          <><br /><b style={{ color: 'var(--alerta)' }}>
                            O texto guardado não confere com o registro desta versão.
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
                Este comprovante reproduz o registro guardado no sistema do Cora Render no
                momento do aceite. O registro guarda o identificador da versão do documento,
                e a versão em si é imutável: um texto novo entra como versão nova, sem apagar
                a anterior.
                <br /><br />
                Quando um documento muda, a pessoa é avisada na tela e precisa aceitar de
                novo antes de continuar usando. Cada novo aceite gera um registro próprio, e
                este comprovante passa a mostrar a versão mais recente que ela aceitou.
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
