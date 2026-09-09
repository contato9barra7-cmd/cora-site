'use client';

// ═══════════════════════════════════════════════════════════
//  Filtros, o painel que abre pelo ícone de ajustes
//
//  Data, ferramenta, proporção, resolução e propriedades. Os filtros
//  rápidos (Tudo / Imagens / Vídeos / Upscales / Favoritos) continuam nos
//  ícones da barra; aqui ficam os que precisam de mais espaço.
//
//  ── O DESENHO É O DO ADMIN ──
//  Era uma grade de pílulas contornadas, uma por opção, com a mesma forma
//  dos botões de verdade da barra: nada ali dizia qual clique era ação e
//  qual era filtro, e a altura do painel crescia com o número de opções.
//
//  Agora é UM CAMPO POR FILTRO, com o rótulo pequeno em cima e o valor de
//  agora embaixo, que é o `DropdownCora` que o admin usa. Fechado, o painel
//  é uma pilha que se lê de relance. Aberto, um campo vira lista, e só um
//  por vez.
//
//  As classes são as de lá (`cora-dd`), de propósito: o desenho é o mesmo e
//  a folha já existe.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useIdioma } from '../lib/i18n';

const FERRAMENTAS = [
  { val: 'render',   rotulo: 'Render' },
  { val: 'editar',   chave: 'filtros_ferr_editar' },
  { val: 'batch',    rotulo: 'Batch' },
  { val: 'upscale',  rotulo: 'Upscale' },
  { val: 'pos',      chave: 'filtros_ferr_pos' },
  { val: '360',      rotulo: '360°' },
  { val: 'animacao', chave: 'filtros_ferr_animacao' }
];

// As ONZE, e não um recorte delas. Esconder proporção atrás de um "..." faz
// quem procura a dele achar que ela não existe no histórico.
const PROPORCOES = ['auto', '1:1', '21:9', '16:9', '9:16', '4:3', '4:5', '5:4', '3:4', '3:2', '2:3'];

const RESOLUCOES = ['1k', '2k', '4k', '8k', '16k'];

const SETA = (
  <svg className="cora-dd-seta" viewBox="0 0 16 16" width="14" height="14" fill="none"
       stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M4 6.5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TIQUE = (
  <svg viewBox="0 0 12 12" width="8" height="8" fill="none" stroke="currentColor"
       strokeWidth="2.6" aria-hidden="true">
    <path d="M2 6.3l2.6 2.6L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Um campo ──
// `uma` troca o marcador de quadrado para redondo, e é ele que diz sozinho
// quantas dá para escolher, sem precisar de uma frase embaixo explicando.
function Campo({ rotulo, valor, vazio, uma, aberto, aoAbrir, children }) {
  return (
    <div className="adm-pop__g">
      <div className={'cora-dd' + (uma ? ' cora-dd--uma' : '') + (aberto ? ' cora-dd--aberto' : '')}>
        <button
          type="button"
          className="cora-dd-btn"
          onClick={aoAbrir}
          aria-expanded={aberto}
        >
          <span className="cora-dd-mio">
            <span className="cora-dd-rot">{rotulo}</span>
            <span className="cora-dd-val" data-vazio={valor ? 'nao' : 'sim'}>{valor || vazio}</span>
          </span>
          {SETA}
        </button>
        {aberto && <div className="cora-dd-lista">{children}</div>}
      </div>
    </div>
  );
}

function Opcao({ marcada, onClick, children }) {
  return (
    <button
      type="button"
      className={'cora-dd-opt' + (marcada ? ' cora-dd-opt--sel' : '')}
      onClick={onClick}
      aria-checked={marcada}
      role="menuitemcheckbox"
    >
      <span className="cora-dd-m">{TIQUE}</span>
      {children}
    </button>
  );
}

export default function Filtros({ aberto, valor, onMudar, onLimpar, onFechar, quantos, total }) {
  const { t } = useIdioma();
  const [campoAberto, setCampoAberto] = useState(null);
  const caixa = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => {
      // Escape fecha o campo aberto antes de fechar o painel: quem abriu uma
      // lista e desistiu dela não quer perder o painel inteiro junto.
      if (e.key !== 'Escape') return;
      if (campoAberto) setCampoAberto(null);
      else onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onFechar, campoAberto]);

  if (!aberto) return null;

  function alternar(campo, item) {
    const atual = valor[campo] || [];
    onMudar({
      ...valor,
      [campo]: atual.includes(item)
        ? atual.filter((x) => x !== item)
        : [...atual, item]
    });
  }

  // Com duas ou mais o campo CONTA em vez de listar: nome cortado no meio não
  // informa nada, e a contagem informa.
  const resumo = (lista, comoNome) => {
    if (!lista || !lista.length) return '';
    if (lista.length === 1) return comoNome(lista[0]);
    return `${lista.length} ${t('filtros_escolhidas')}`;
  };

  const nomeFerr = (v) => {
    const f = FERRAMENTAS.find((x) => x.val === v);
    return f ? (f.chave ? t(f.chave) : f.rotulo) : v;
  };

  const propsMarcadas = [
    valor.baixadas ? t('filtros_baixadas') : null,
    valor.favoritos ? t('filtros_favoritas') : null
  ].filter(Boolean);

  const periodo = valor.de || valor.ate
    ? [valor.de, valor.ate].filter(Boolean).join(' → ')
    : '';

  const usados =
    (valor.de ? 1 : 0) + (valor.ate ? 1 : 0) +
    (valor.ferramentas?.length || 0) +
    (valor.proporcoes?.length || 0) +
    (valor.resolucoes?.length || 0) +
    (valor.baixadas ? 1 : 0) +
    (valor.favoritos ? 1 : 0);

  const abre = (nome) => () => setCampoAberto((a) => (a === nome ? null : nome));

  return (
    <>
      <div className="ft-fundo" onClick={onFechar} />

      <div className="ft" ref={caixa} onClick={(e) => e.stopPropagation()}>

        <div className="ft__cab">
          <h3>{t('filtros_titulo')}</h3>
          <button className="ft-limpar-t" onClick={onLimpar} disabled={usados === 0}>
            {t('filtros_limpar_tudo')}
          </button>
        </div>

        <div className="ft__corpo">

          <Campo
            rotulo={t('filtros_periodo')} valor={periodo} vazio={t('filtros_qualquer')}
            uma aberto={campoAberto === 'periodo'} aoAbrir={abre('periodo')}
          >
            <div className="ft-datas">
              <input
                type="date" aria-label={t('filtros_de')}
                value={valor.de || ''}
                onChange={(e) => onMudar({ ...valor, de: e.target.value })}
              />
              <input
                type="date" aria-label={t('filtros_ate')}
                value={valor.ate || ''}
                onChange={(e) => onMudar({ ...valor, ate: e.target.value })}
              />
            </div>
          </Campo>

          <Campo
            rotulo={t('filtros_ferramenta')}
            valor={resumo(valor.ferramentas, nomeFerr)} vazio={t('filtros_qualquer')}
            aberto={campoAberto === 'ferramenta'} aoAbrir={abre('ferramenta')}
          >
            {FERRAMENTAS.map((f) => (
              <Opcao
                key={f.val}
                marcada={(valor.ferramentas || []).includes(f.val)}
                onClick={() => alternar('ferramentas', f.val)}
              >{f.chave ? t(f.chave) : f.rotulo}</Opcao>
            ))}
          </Campo>

          <Campo
            rotulo={t('filtros_proporcao')}
            valor={resumo(valor.proporcoes, (p) => p)} vazio={t('filtros_qualquer')}
            aberto={campoAberto === 'proporcao'} aoAbrir={abre('proporcao')}
          >
            {PROPORCOES.map((p) => (
              <Opcao
                key={p}
                marcada={(valor.proporcoes || []).includes(p)}
                onClick={() => alternar('proporcoes', p)}
              >{p === 'auto' ? t('painelrender_auto') : p}</Opcao>
            ))}
          </Campo>

          <Campo
            rotulo={t('filtros_resolucao')}
            valor={resumo(valor.resolucoes, (r) => r.toUpperCase())} vazio={t('filtros_qualquer')}
            aberto={campoAberto === 'resolucao'} aoAbrir={abre('resolucao')}
          >
            {RESOLUCOES.map((r) => (
              <Opcao
                key={r}
                marcada={(valor.resolucoes || []).includes(r)}
                onClick={() => alternar('resolucoes', r)}
              >{r.toUpperCase()}</Opcao>
            ))}
          </Campo>

          <Campo
            rotulo={t('filtros_propriedades')}
            valor={propsMarcadas.length === 1 ? propsMarcadas[0]
                 : propsMarcadas.length > 1 ? `${propsMarcadas.length} ${t('filtros_escolhidas')}` : ''}
            vazio={t('filtros_todas')}
            aberto={campoAberto === 'props'} aoAbrir={abre('props')}
          >
            <Opcao
              marcada={!!valor.baixadas}
              onClick={() => onMudar({ ...valor, baixadas: !valor.baixadas })}
            >{t('filtros_baixadas')}</Opcao>
            <Opcao
              marcada={!!valor.favoritos}
              onClick={() => onMudar({ ...valor, favoritos: !valor.favoritos })}
            >{t('filtros_favoritas')}</Opcao>
          </Campo>
        </div>

        <div className="ft__pe">
          {typeof quantos === 'number' && typeof total === 'number' && (
            <span className="ft__conta">{quantos} {t('filtros_de_total')} {total}</span>
          )}
          <button className="ft-ver" onClick={onFechar}>
            {t('filtros_ver')} {typeof quantos === 'number' ? `${quantos} ` : ''}
            {quantos === 1 ? t('filtros_resultado') : t('filtros_resultados')}
          </button>
        </div>
      </div>
    </>
  );
}
