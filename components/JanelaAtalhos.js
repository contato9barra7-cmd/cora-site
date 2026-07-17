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

// Os gestos e combinações fixos, só para consulta.
const FIXOS = [
  {
    nome: 'Na imagem',
    itens: [
      ['Clique', 'Pega a camada sob o cursor (com a Mover)'],
      ['Arrastar', 'Move a camada — encaixa no centro e nas bordas'],
      ['Alt', 'Solta as travas magnéticas enquanto arrasta'],
      ['Shift', 'Nos cantos: redimensiona sem manter a proporção'],
      ['Shift + clique', 'Soma a camada à seleção']
    ]
  },
  {
    nome: 'Seleção',
    itens: [
      ['Ctrl', 'Somar à seleção (segure enquanto desenha)'],
      ['Alt', 'Subtrair da seleção (segure enquanto desenha)'],
      ['Shift', 'No letreiro: quadrado / círculo perfeito'],
      ['Duplo clique', 'Fecha o laço poligonal'],
      ['Ctrl+A', 'Selecionar tudo'],
      ['Ctrl+D', 'Desmarcar'],
      ['Ctrl+Shift+X', 'Inverter a seleção'],
      ['Esc', 'Desmarcar / cancelar o que está em curso']
    ]
  },
  {
    nome: 'Camadas',
    itens: [
      ['Ctrl+J', 'Duplicar (só a seleção, se houver)'],
      ['Ctrl+G', 'Agrupar as selecionadas'],
      ['Ctrl+Shift+I', 'Converter em Objeto Inteligente'],
      ['Ctrl+Shift+R', 'Rasterizar'],
      ['Ctrl+Alt+E', 'Mesclar tudo numa camada nova'],
      ['Duplo clique', 'Renomear a camada'],
      ['Botão direito', 'Abre o menu da camada'],
      ['Delete', 'Excluir']
    ]
  },
  {
    nome: 'Geral',
    itens: [
      ['Ctrl+Z', 'Desfazer'],
      ['Enter', 'Confirmar o corte'],
      ['Roda do mouse', 'Zoom'],
      ['Espaço + arrastar', 'Arrastar a tela'],
      ['Botão do meio', 'Arrastar a tela']
    ]
  }
];

export default function JanelaAtalhos({ atalhos, aoSalvar, aoFechar }) {
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
        ([id, t]) => t === code && id !== gravando
      );

      if (dono) {
        const nome = FERRAMENTAS.find((f) => f.id === dono[0])?.nome || dono[0];
        setAviso(`${nomeDaTecla(code)} já é de "${nome}".`);
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
          <span className="aj-titulo">Atalhos de teclado</span>
          <span className="aj-esticar" />
          <button className="df-x" onClick={aoFechar} aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="at-corpo">

          {/* ── As ferramentas, editáveis ── */}
          <section className="at-grupo">
            <h3 className="cr-sec">Ferramentas</h3>

            {aviso && <p className="at-aviso">{aviso}</p>}

            {FERRAMENTAS.map((f) => {
              const tecla = rascunho[f.id];
              const nesta = gravando === f.id;

              return (
                <div key={f.id} className="at-linha at-linha--edit">
                  <span className="at-o-que">{f.nome}</span>

                  <span className="at-controles">
                    <button
                      className={'at-tecla-btn'
                        + (nesta ? ' at-tecla-btn--grav' : '')
                        + (!tecla && !nesta ? ' at-tecla-btn--vazio' : '')}
                      onClick={() => { setGravando(nesta ? null : f.id); setAviso(''); }}
                    >
                      {nesta ? 'pressione…' : (tecla ? nomeDaTecla(tecla) : '—')}
                    </button>

                    {/* Limpar só aparece quando há o que limpar. */}
                    {tecla && !nesta && (
                      <button
                        className="at-limpar"
                        onClick={() => limpar(f.id)}
                        aria-label="Remover atalho"
                        title="Remover atalho"
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
              <h3 className="cr-sec">{g.nome}</h3>

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
          <button className="ps-b at-restaurar" onClick={restaurarPadrao}>Restaurar padrão</button>
          <span className="aj-esticar" />
          <button className="ps-b" onClick={aoFechar}>Cancelar</button>
          <button className="ps-b ps-b--on" onClick={salvar} disabled={!mudou}>
            Salvar
          </button>
        </footer>
      </div>
    </div>
  );
}
