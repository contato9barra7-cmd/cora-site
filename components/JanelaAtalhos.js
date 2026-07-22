'use client';

// ═══════════════════════════════════════════════════════════
//  JanelaAtalhos — o mapa do teclado
//
//  As FERRAMENTAS são editáveis: cada uma tem uma tecla, e a pessoa pode trocar.
//  Clicar no atalho entra em modo "pressione…", e a próxima tecla vira o novo.
//  Uma tecla já usada por outra ferramenta é recusada — dois donos para a mesma
//  tecla deixaria o comportamento imprevisível.
//
//  O resto (gestos do mouse, combinações com Ctrl) é fixo e serve de referência.
//  São coisas que não conflitam entre si e que a mão de quem edita já conhece.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { FERRAMENTAS, nomeDaTecla } from '../lib/atalhos';
import { useIdioma, tOpt } from '../lib/i18n';

export default function JanelaAtalhos({ atalhos, aoSalvar, aoFechar }) {
  const { t } = useIdioma();

  // Os gestos e combinações fixos, só para consulta.
  const FIXOS = [
    {
      nome: t('janelaatalhos_grp_imagem'),
      itens: [
        [t('janelaatalhos_img_clique_k'), t('janelaatalhos_img_clique_d')],
        [t('janelaatalhos_img_arrastar_k'), t('janelaatalhos_img_arrastar_d')],
        ['Alt', t('janelaatalhos_img_alt_d')],
        ['Shift', t('janelaatalhos_img_shift_d')],
        [t('janelaatalhos_img_shiftclique_k'), t('janelaatalhos_img_shiftclique_d')]
      ]
    },
    {
      nome: t('janelaatalhos_grp_selecao'),
      itens: [
        ['Ctrl', t('janelaatalhos_sel_ctrl_d')],
        ['Alt', t('janelaatalhos_sel_alt_d')],
        ['Shift', t('janelaatalhos_sel_shift_d')],
        [t('janelaatalhos_duploclique_k'), t('janelaatalhos_sel_duplo_d')],
        ['Ctrl+A', t('janelaatalhos_sel_a_d')],
        ['Ctrl+D', t('janelaatalhos_sel_d_d')],
        ['Ctrl+Shift+X', t('janelaatalhos_sel_x_d')],
        ['Esc', t('janelaatalhos_sel_esc_d')]
      ]
    },
    {
      nome: t('janelaatalhos_grp_camadas'),
      itens: [
        ['Ctrl+J', t('janelaatalhos_cam_j_d')],
        ['Ctrl+G', t('janelaatalhos_cam_g_d')],
        ['Ctrl+Shift+I', t('janelaatalhos_cam_i_d')],
        ['Ctrl+Shift+R', t('janelaatalhos_cam_r_d')],
        ['Ctrl+Alt+E', t('janelaatalhos_cam_e_d')],
        [t('janelaatalhos_duploclique_k'), t('janelaatalhos_cam_duplo_d')],
        [t('janelaatalhos_cam_botaodireito_k'), t('janelaatalhos_cam_botaodireito_d')],
        ['Delete', t('janelaatalhos_cam_delete_d')]
      ]
    },
    {
      nome: t('janelaatalhos_grp_geral'),
      itens: [
        ['Ctrl+Z', t('janelaatalhos_ger_z_d')],
        ['Enter', t('janelaatalhos_ger_enter_d')],
        [t('janelaatalhos_ger_roda_k'), 'Zoom'],
        [t('janelaatalhos_ger_espaco_k'), t('janelaatalhos_arrastartela_d')],
        [t('janelaatalhos_ger_meio_k'), t('janelaatalhos_arrastartela_d')]
      ]
    }
  ];

  // ── Um RASCUNHO ──
  //
  // As mudanças ficam aqui, e só valem quando a pessoa aperta Salvar. Gravar na
  // hora seria uma armadilha: um toque errado de tecla mudaria um atalho sem
  // volta, e não haveria como recuar sem redescobrir o que era.
  const [rascunho, setRascunho] = useState(atalhos);
  const [gravando, setGravando] = useState(null);
  const [aviso, setAviso] = useState('');

  const mudou = JSON.stringify(rascunho) !== JSON.stringify(atalhos);

  // ── Captura da tecla ──
  //
  // Enquanto uma ferramenta grava, a próxima tecla vira o atalho dela. Modifica-
  // dores sozinhos (Ctrl, Shift…) são ignorados: um atalho de ferramenta é uma
  // tecla única, e "só Shift" não seleciona ferramenta nenhuma.
  useEffect(() => {
    if (!gravando) return;

    const capturar = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') { setGravando(null); setAviso(''); return; }

      const code = e.code;
      const soMod = ['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight',
                     'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(code);
      if (soMod) return;

      // A tecla já pertence a outra ferramenta?
      const dono = Object.entries(rascunho).find(
        ([id, tt]) => tt === code && id !== gravando
      );

      if (dono) {
        const nome = FERRAMENTAS.find((f) => f.id === dono[0])?.nome || dono[0];
        setAviso(`${nomeDaTecla(code)} ${t('janelaatalhos_aviso_ja_de')} "${nome}".`);
        return;
      }

      setRascunho((r) => ({ ...r, [gravando]: code }));
      setGravando(null);
      setAviso('');
    };

    window.addEventListener('keydown', capturar, true);
    return () => window.removeEventListener('keydown', capturar, true);
  }, [gravando, rascunho]);

  function limpar(id) {
    setRascunho((r) => ({ ...r, [id]: '' }));
  }

  function salvar() {
    aoSalvar(rascunho);
    aoFechar();
  }

  // Volta todas as ferramentas às teclas de fábrica (só no rascunho — a pessoa
  // ainda precisa Salvar para valer).
  function restaurarPadrao() {
    const p = {};
    for (const f of FERRAMENTAS) p[f.id] = f.tecla;
    setRascunho(p);
    setGravando(null);
    setAviso('');
  }

  return (
    <div className="aj-fundo" onClick={aoFechar}>
      <div className="at-win" onClick={(e) => e.stopPropagation()}>

        <header className="aj-topo">
          <span className="aj-titulo">{t('janelaatalhos_titulo')}</span>
          <span className="aj-esticar" />
          <button className="df-x" onClick={aoFechar} aria-label={t('fechar')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="at-corpo">

          {/* ── As ferramentas, editáveis ── */}
          <section className="at-grupo">
            <h3 className="cr-sec">{t('janelaatalhos_sec_ferramentas')}</h3>

            {aviso && <p className="at-aviso">{aviso}</p>}

            {FERRAMENTAS.map((f) => {
              const tecla = rascunho[f.id];
              const nesta = gravando === f.id;

              return (
                <div key={f.id} className="at-linha at-linha--edit">
                  <span className="at-o-que">{tOpt(f.nome)}</span>

                  <span className="at-controles">
                    <button
                      className={'at-tecla-btn'
                        + (nesta ? ' at-tecla-btn--grav' : '')
                        + (!tecla && !nesta ? ' at-tecla-btn--vazio' : '')}
                      onClick={() => { setGravando(nesta ? null : f.id); setAviso(''); }}
                    >
                      {nesta ? t('janelaatalhos_pressione') : (tecla ? nomeDaTecla(tecla) : '—')}
                    </button>

                    {/* Limpar só aparece quando há o que limpar. */}
                    {tecla && !nesta && (
                      <button
                        className="at-limpar"
                        onClick={() => limpar(f.id)}
                        aria-label={t('janelaatalhos_remover_atalho')}
                        title={t('janelaatalhos_remover_atalho')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </section>

          {/* ── O resto, fixo, para consulta ── */}
          {FIXOS.map((g) => (
            <section key={g.nome} className="at-grupo">
              <h3 className="cr-sec">{tOpt(g.nome)}</h3>

              {g.itens.map(([tecla, oQue]) => (
                <div key={tecla + oQue} className="at-linha">
                  <kbd className="at-tecla">{tecla}</kbd>
                  <span className="at-o-que">{oQue}</span>
                </div>
              ))}
            </section>
          ))}

        </div>

        <footer className="at-pe">
          <button className="ps-b at-restaurar" onClick={restaurarPadrao}>{t('janelaatalhos_restaurar')}</button>
          <span className="aj-esticar" />
          <button className="ps-b" onClick={aoFechar}>{t('comum_cancelar')}</button>
          <button className="ps-b ps-b--on" onClick={salvar} disabled={!mudou}>
            {t('comum_salvar')}
          </button>
        </footer>
      </div>
    </div>
  );
}
