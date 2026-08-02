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
//  sem oferecer o campo. Virou componente para as três usarem o mesmo, e para
//  o CNPJ ser acrescentado num lugar só.
//
//  Uso:
//    const [fiscal, setFiscal] = useState(false);
//    ...
//    catch (e) { if (e.precisaCpf) { setFiscal(true); return; } }
//    <ModalFiscal aberto={fiscal} onFechar={() => setFiscal(false)}
//                 onSalvo={() => { setFiscal(false); tentarDeNovo(); }} />
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { salvarDadosFiscais } from '../lib/auth';
import { useIdioma } from '../lib/i18n';

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
  const { t } = useIdioma();
  const [onde, setOnde] = useState('br');        // 'br' | 'intl'
  const [tipoBr, setTipoBr] = useState('cpf');   // 'cpf' | 'cnpj'
  const [doc, setDoc] = useState('');            // CPF ou CNPJ, conforme tipoBr
  const [docIntl, setDocIntl] = useState('');
  const [paisIntl, setPaisIntl] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!aberto) return null;

  const ehCnpj = tipoBr === 'cnpj';

  // Trocar entre CPF e CNPJ limpa o campo: os formatos são diferentes, e um
  // CPF meio digitado reformatado como CNPJ vira um número sem sentido.
  function trocarTipoBr(novo) {
    setTipoBr(novo);
    setDoc('');
    setErro('');
  }

  async function salvar() {
    setErro('');
    setSalvando(true);
    try {
      if (onde === 'br') {
        const digitos = doc.replace(/\D/g, '');
        const precisa = ehCnpj ? 14 : 11;
        if (digitos.length !== precisa) {
          // Conferência local só do tamanho — quem valida os dígitos
          // verificadores é o servidor, que é onde a regra tem que morar.
          setErro(ehCnpj ? t('precos_cnpj_incompleto') : t('precos_cpf_incompleto'));
          setSalvando(false);
          return;
        }
        await salvarDadosFiscais({ cpf: digitos });
      } else {
        if (!docIntl.trim()) { setErro(t('precos_inf_doc')); setSalvando(false); return; }
        if (!paisIntl.trim()) { setErro(t('precos_inf_pais')); setSalvando(false); return; }
        await salvarDadosFiscais({ internacional: true, documento: docIntl, pais: paisIntl });
      }
      onSalvo();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !salvando && onFechar()}>
      <div className="modal-cpf" onClick={(e) => e.stopPropagation()}>
        <h3>{t('precos_nota')}</h3>

        <div className="modal-seg">
          <button
            className={'modal-seg-btn' + (onde === 'br' ? ' on' : '')}
            onClick={() => { setOnde('br'); setErro(''); }}
          >{t('precos_brasil')}</button>
          <button
            className={'modal-seg-btn' + (onde === 'intl' ? ' on' : '')}
            onClick={() => { setOnde('intl'); setErro(''); }}
          >{t('precos_outro_pais')}</button>
        </div>

        {onde === 'br' ? (
          <>
            {/* Pessoa física ou empresa. O documento muda junto. */}
            <div className="modal-seg modal-seg--sub">
              <button
                className={'modal-seg-btn' + (!ehCnpj ? ' on' : '')}
                onClick={() => trocarTipoBr('cpf')}
              >CPF</button>
              <button
                className={'modal-seg-btn' + (ehCnpj ? ' on' : '')}
                onClick={() => trocarTipoBr('cnpj')}
              >CNPJ</button>
            </div>

            <p className="modal-cpf-desc">
              {ehCnpj ? t('precos_cnpj_desc') : t('precos_cpf_desc')}
            </p>
            <div className="modal-campo-rot">{ehCnpj ? 'CNPJ' : 'CPF'}</div>
            <input
              type="text"
              inputMode="numeric"
              placeholder={ehCnpj ? '00.000.000/0000-00' : '000.000.000-00'}
              value={doc}
              onChange={(e) => setDoc(ehCnpj ? formatarCnpj(e.target.value) : formatarCpf(e.target.value))}
              className="modal-input"
              autoFocus
            />
          </>
        ) : (
          <>
            <p className="modal-cpf-desc">{t('precos_intl_desc')}</p>
            <div className="modal-cpf-dupla">
              <div style={{ flex: 2 }}>
                <div className="modal-campo-rot">{t('precos_doc_label')}</div>
                <input
                  type="text"
                  placeholder={t('precos_doc_ph')}
                  value={docIntl}
                  onChange={(e) => setDocIntl(e.target.value)}
                  className="modal-input"
                  autoFocus
                />
              </div>
              <div style={{ flex: 1 }}>
                <div className="modal-campo-rot">{t('precos_pais')}</div>
                <input
                  type="text"
                  placeholder={t('precos_pais_ph')}
                  value={paisIntl}
                  onChange={(e) => setPaisIntl(e.target.value)}
                  className="modal-input"
                />
              </div>
            </div>
          </>
        )}

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
