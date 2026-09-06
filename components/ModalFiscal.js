'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  A janela de dados fiscais — pedida antes de mandar alguém para o Stripe.
//
//  Existe porque o Checkout do Stripe não coleta CPF de pessoa física, e sem
//  documento não há como emitir a nota. Ela aparece quando o servidor recusa o
//  checkout com `precisa_cpf` (HTTP 428).
//
//  Estava copiada em /precos e /teams, e faltava em /assinatura — onde comprar
//  crédito sem CPF virava a mensagem "Dados fiscais necessários" e parava ali,
//  sem oferecer o campo. Virou componente para as três usarem o mesmo.
//
//  Duas decisões de desenho, e o motivo de cada uma:
//
//    1. Escolher o país abre uma VISTA dentro da própria janela, com busca em
//       cima. Numa lista suspensa, os 195 países eram recortados pela borda da
//       janela, e a janela ganhava barra de rolagem própria: duas barras, uma
//       cortando a outra.
//    2. Tipo de documento tem duas opções. Abrir uma lista para ver duas
//       coisas que já cabem na tela é um clique jogado fora, então virou um par
//       de pílulas.
//
//  Uso:
//    const [fiscal, setFiscal] = useState(false);
//    ...
//    catch (e) { if (e.precisaCpf) { setFiscal(true); return; } }
//    <ModalFiscal aberto={fiscal} onFechar={() => setFiscal(false)}
//                 onSalvo={() => { setFiscal(false); tentarDeNovo(); }} />
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { salvarDadosFiscais } from '../lib/auth';
import { useIdioma } from '../lib/i18n';
import { BRASIL, opcoesDePais, nomeDoPais } from '../lib/paises';

// 000.000.000-00
function formatarCpf(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// 00.000.000/0000-00
function formatarCnpj(v) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// Sem acento e em minúscula, só para a busca: ninguém digita "Japão" com til,
// e sem isto procurar "japa" não acha nada.
function achatar(t) {
  try {
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  } catch (e) {
    return t.toLowerCase();
  }
}

export default function ModalFiscal({ aberto, onFechar, onSalvo }) {
  const { t, idioma } = useIdioma();
  const [pais, setPais] = useState(BRASIL);
  const [tipoBr, setTipoBr] = useState('cpf');   // 'cpf' | 'cnpj'
  const [doc, setDoc] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [escolhendoPais, setEscolhendoPais] = useState(false);
  const [busca, setBusca] = useState('');

  // A lista sai do `Intl.DisplayNames` e é ordenada por nome traduzido — cara
  // o bastante para não refazer a cada tecla digitada no campo do documento.
  const paises = useMemo(
    () => opcoesDePais(idioma).map((o) => ({ ...o, b: achatar(o.n) })),
    [idioma],
  );
  const filtrados = useMemo(() => {
    const f = achatar(busca.trim());
    return f ? paises.filter((o) => o.b.indexOf(f) >= 0) : paises;
  }, [paises, busca]);

  if (!aberto) return null;

  const noBrasil = pais === BRASIL;
  const ehCnpj = noBrasil && tipoBr === 'cnpj';

  // Trocar o documento limpa o campo: as máscaras são diferentes, e um CPF
  // meio digitado reformatado como CNPJ vira um número sem sentido.
  function trocarPais(novo) {
    setPais(novo);
    setDoc('');
    setErro('');
    setEscolhendoPais(false);
    setBusca('');
  }
  function trocarTipoBr(novo) {
    setTipoBr(novo);
    setDoc('');
    setErro('');
  }

  function aoDigitar(v) {
    if (!noBrasil) return setDoc(v);            // documento estrangeiro é livre
    setDoc(ehCnpj ? formatarCnpj(v) : formatarCpf(v));
  }

  async function salvar() {
    setErro('');
    setSalvando(true);
    try {
      if (noBrasil) {
        const digitos = doc.replace(/\D/g, '');
        const precisa = ehCnpj ? 14 : 11;
        if (digitos.length !== precisa) {
          // Aqui só se confere o TAMANHO. Os dígitos verificadores ficam no
          // servidor, que é onde a regra tem que morar.
          setErro(ehCnpj ? t('precos_cnpj_incompleto') : t('precos_cpf_incompleto'));
          setSalvando(false);
          return;
        }
        await salvarDadosFiscais({ cpf: digitos });
      } else {
        if (!doc.trim()) { setErro(t('precos_inf_doc')); setSalvando(false); return; }
        // O país vai gravado SEMPRE em português, qualquer que seja o idioma da
        // tela. Senão o relatório fiscal misturaria "Germany" e "Alemanha"
        // conforme o idioma de quem comprou.
        await salvarDadosFiscais({
          internacional: true,
          documento: doc.trim(),
          pais: nomeDoPais(pais, 'pt'),
        });
      }
      onSalvo();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  const rotuloDoc = noBrasil ? (ehCnpj ? 'CNPJ' : 'CPF') : t('precos_doc_label');
  const placeholderDoc = noBrasil
    ? (ehCnpj ? '00.000.000/0000-00' : '000.000.000-00')
    : t('precos_doc_ph');

  return (
    <div className="mf-veu" onClick={() => !salvando && onFechar()}>
      <div className="mf-centro">
        <div className="mf" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>

          {escolhendoPais ? (
            <>
              <div className="mf-topo">
                <button type="button" className="mf-voltar" aria-label={t('comum_voltar') || 'Voltar'}
                        onClick={() => { setEscolhendoPais(false); setBusca(''); }}>
                  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 3L5 8l5 5" />
                  </svg>
                </button>
                <h3>{t('precos_pais')}</h3>
              </div>

              <input
                className="mf-busca"
                type="text"
                autoFocus
                placeholder={t('precos_pais_ph')}
                aria-label={t('precos_pais')}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />

              <div className="mf-lista" role="listbox" aria-label={t('precos_pais')}>
                {filtrados.length === 0 ? (
                  <p className="mf-vazio">{t('precos_pais_vazio')}</p>
                ) : filtrados.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="option"
                    aria-selected={o.v === pais}
                    className={'mf-opt' + (o.v === pais ? ' mf-opt--sel' : '')}
                    onClick={() => trocarPais(o.v)}
                  >
                    {o.n}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mf-marca">
                <img src="/img/logo-cora.png" alt="Cora Render" width="266" height="64" />
              </div>

              <h3>{t('precos_nota')}</h3>
              <p className="mf-desc">
                {noBrasil
                  ? (ehCnpj ? t('precos_cnpj_desc') : t('precos_cpf_desc'))
                  : t('precos_intl_desc')}
              </p>

              <div className="mf-campo">
                <span className="mf-rot" id="mf-rot-pais">{t('precos_pais')}</span>
                <button type="button" className="mf-escolha" aria-labelledby="mf-rot-pais"
                        onClick={() => setEscolhendoPais(true)}>
                  <span>{nomeDoPais(pais, idioma)}</span>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </button>
              </div>

              {/* Só o Brasil separa pessoa física de empresa. Fora daqui, o campo é
                  um documento fiscal genérico — cada país tem o seu. */}
              {noBrasil && (
                <div className="mf-campo">
                  <span className="mf-rot" id="mf-rot-tipo">{t('precos_tipo_doc')}</span>
                  <div className="mf-segmento" role="group" aria-labelledby="mf-rot-tipo">
                    <button type="button" aria-pressed={tipoBr === 'cpf'} onClick={() => trocarTipoBr('cpf')}>CPF</button>
                    <button type="button" aria-pressed={tipoBr === 'cnpj'} onClick={() => trocarTipoBr('cnpj')}>CNPJ</button>
                  </div>
                </div>
              )}

              <div className="mf-campo">
                <label className="mf-rot" htmlFor="mf-doc">{rotuloDoc}</label>
                <input
                  id="mf-doc"
                  type="text"
                  inputMode={noBrasil ? 'numeric' : 'text'}
                  placeholder={placeholderDoc}
                  value={doc}
                  onChange={(e) => aoDigitar(e.target.value)}
                  className="mf-input"
                />
              </div>

              {erro && <div className="mf-erro">{erro}</div>}

              <div className="mf-acoes">
                <button type="button" className="mf-cancelar" onClick={onFechar} disabled={salvando}>
                  {t('comum_cancelar')}
                </button>
                <button type="button" className="mf-seguir" onClick={salvar} disabled={salvando}>
                  {salvando ? t('comum_salvando') : t('confirma_btn_continuar')}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
