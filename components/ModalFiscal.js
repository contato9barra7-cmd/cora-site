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
import DropdownCora from './DropdownCora';
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

export default function ModalFiscal({ aberto, onFechar, onSalvo }) {
  const { t, idioma } = useIdioma();
  const [pais, setPais] = useState(BRASIL);
  const [tipoBr, setTipoBr] = useState('cpf');   // 'cpf' | 'cnpj'
  const [doc, setDoc] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // A lista sai do `Intl.DisplayNames` e é ordenada por nome traduzido — cara
  // o bastante para não refazer a cada tecla digitada no campo do documento.
  const paises = useMemo(() => opcoesDePais(idioma), [idioma]);

  if (!aberto) return null;

  const noBrasil = pais === BRASIL;
  const ehCnpj = noBrasil && tipoBr === 'cnpj';

  // Trocar o documento limpa o campo: as máscaras são diferentes, e um CPF
  // meio digitado reformatado como CNPJ vira um número sem sentido.
  function trocarPais(novo) {
    setPais(novo);
    setDoc('');
    setErro('');
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
    <div className="modal-overlay" onClick={() => !salvando && onFechar()}>
      <div className="modal-cpf" onClick={(e) => e.stopPropagation()}>
        <h3>{t('precos_nota')}</h3>
        <p className="modal-cpf-desc">
          {noBrasil
            ? (ehCnpj ? t('precos_cnpj_desc') : t('precos_cpf_desc'))
            : t('precos_intl_desc')}
        </p>

        <div className="modal-campo-rot">{t('precos_pais')}</div>
        <div className="modal-dd">
          <DropdownCora valor={pais} opcoes={paises} onEscolher={trocarPais} />
        </div>

        {/* Só o Brasil separa pessoa física de empresa. Fora daqui, o campo é
            um documento fiscal genérico — cada país tem o seu. */}
        {noBrasil && (
          <>
            <div className="modal-campo-rot">{t('precos_tipo_doc')}</div>
            <div className="modal-dd">
              <DropdownCora
                valor={tipoBr}
                opcoes={[{ v: 'cpf', n: 'CPF' }, { v: 'cnpj', n: 'CNPJ' }]}
                onEscolher={trocarTipoBr}
              />
            </div>
          </>
        )}

        <div className="modal-campo-rot">{rotuloDoc}</div>
        <input
          type="text"
          inputMode={noBrasil ? 'numeric' : 'text'}
          placeholder={placeholderDoc}
          value={doc}
          onChange={(e) => aoDigitar(e.target.value)}
          className="modal-input"
        />

        {erro && <div className="modal-erro">{erro}</div>}

        <div className="modal-acoes">
          <button className="btn btn--ghost" onClick={onFechar} disabled={salvando}>
            {t('comum_cancelar')}
          </button>
          <button className="btn btn--verde" onClick={salvar} disabled={salvando}>
            {salvando ? t('comum_salvando') : t('confirma_btn_continuar')}
          </button>
        </div>
      </div>
    </div>
  );
}
