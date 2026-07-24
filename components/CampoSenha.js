'use client';

// ═══════════════════════════════════════════════════════════
//  CampoSenha — senha forte com checklist ao vivo + repetir senha
//
//  Regras (todas obrigatórias): 8+ caracteres, maiúscula, minúscula,
//  número e caractere especial. Cada regra fica verde quando cumprida.
//  Abaixo, o campo "repetir senha" precisa bater.
//
//  O componente informa a validade ao pai via onValidez(true|false).
//  A MESMA regra roda no servidor (cora-auth) — o front é só a experiência.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useIdioma } from '../lib/i18n';

export const REQUISITOS_SENHA = [
  { chave: 'len',       label: 'Pelo menos 8 caracteres',            teste: (s) => s.length >= 8 },
  { chave: 'maiuscula', label: 'Uma letra maiúscula (A–Z)',          teste: (s) => /[A-Z]/.test(s) },
  { chave: 'minuscula', label: 'Uma letra minúscula (a–z)',          teste: (s) => /[a-z]/.test(s) },
  { chave: 'numero',    label: 'Um número (0–9)',                    teste: (s) => /[0-9]/.test(s) },
  { chave: 'especial',  label: 'Um caractere especial (!@#$…)',      teste: (s) => /[^A-Za-z0-9]/.test(s) },
];

export function senhaForte(s) {
  s = String(s || '');
  return REQUISITOS_SENHA.every((r) => r.teste(s));
}

const OlhoIcone = ({ aberto }) => aberto ? (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
) : (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default function CampoSenha({ senha, setSenha, onValidez, erroCampo, labelSenha, obrigatorio = true }) {
  const { t } = useIdioma();
  const [confirma, setConfirma] = useState('');
  const [ver, setVer] = useState(false);
  const [verC, setVerC] = useState(false);
  const [focou, setFocou] = useState(false);

  const status = REQUISITOS_SENHA.map((r) => ({ ...r, ok: r.teste(senha || '') }));
  const forte = status.every((r) => r.ok);
  const confere = confirma.length > 0 && confirma === senha;
  const valido = forte && confere;

  useEffect(() => { if (onValidez) onValidez(valido); }, [valido]); // eslint-disable-line react-hooks/exhaustive-deps

  const mostrarReqs = focou || (senha && senha.length > 0);

  return (
    <div className="cs-wrap">
      <label className="login-label">{labelSenha || t('camposenha_label_senha')} {obrigatorio && <span className="obrig">*</span>}</label>
      <div className="senha-campo">
        <input
          className={'login-input' + (erroCampo ? ' campo-erro' : '')}
          type={ver ? 'text' : 'password'}
          placeholder={t('camposenha_ph_criar')}
          value={senha}
          onFocus={() => setFocou(true)}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
        />
        <button type="button" className="senha-olho" onClick={() => setVer(!ver)} aria-label={ver ? t('camposenha_esconder') : t('camposenha_mostrar')}>
          <OlhoIcone aberto={ver} />
        </button>
      </div>

      {mostrarReqs && (
        <ul className="cs-reqs">
          {status.map((r) => (
            <li key={r.chave} className={'cs-req' + (r.ok ? ' cs-req--ok' : '')}>
              <span className="cs-req-ic" aria-hidden="true">
                {r.ok ? (
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
                ) : (
                  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="8" r="5.2" /></svg>
                )}
              </span>
              {t('camposenha_req_' + r.chave)}
            </li>
          ))}
        </ul>
      )}

      <label className="login-label">{t('camposenha_repetir')} {obrigatorio && <span className="obrig">*</span>}</label>
      <div className="senha-campo">
        <input
          className={'login-input' + (confirma.length > 0 && !confere ? ' campo-erro' : '')}
          type={verC ? 'text' : 'password'}
          placeholder={t('camposenha_ph_repetir')}
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
          autoComplete="new-password"
        />
        <button type="button" className="senha-olho" onClick={() => setVerC(!verC)} aria-label={verC ? t('camposenha_esconder') : t('camposenha_mostrar')}>
          <OlhoIcone aberto={verC} />
        </button>
      </div>
      {confirma.length > 0 && !confere && <p className="cs-nao-bate">{t('camposenha_nao_bate')}</p>}
    </div>
  );
}
