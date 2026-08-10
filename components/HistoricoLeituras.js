'use client';

// ═══════════════════════════════════════════════════════════
//  HistoricoLeituras — as leituras de materiais já feitas
//
//  Ler os materiais de uma imagem custa 15 créditos. Esta gaveta existe
//  para que ninguém pague duas vezes pelo mesmo trabalho: a pessoa abre,
//  reconhece a imagem, clica, e a leitura volta.
//
//  A thumb é essencial: sem ela, seria uma lista de textos parecidos e a
//  pessoa não saberia qual é qual.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { listarLeituras, apagarLeitura } from '../lib/leituras';
import { useIdioma } from '../lib/i18n';

const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

function quando(iso, t, idioma) {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d) / 60000);
  if (min < 1)    return t('historicoleituras_agora');
  if (min < 60)   return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return t('historicoleituras_ontem');
  if (dias < 30)  return `${dias} ${t('historicoleituras_dias')}`;
  return d.toLocaleDateString(LOCALE[idioma] || 'pt-BR', { day: '2-digit', month: 'short' });
}

export default function HistoricoLeituras({ aberto, onFechar, onEscolher }) {
  const { t, idioma } = useIdioma();
  const [itens, setItens]         = useState([]);
  const [carregando, setCarreg]   = useState(true);
  const [busca, setBusca]         = useState('');
  const [apagando, setApagando]   = useState(null);

  useEffect(() => {
    if (!aberto) return;

    let vivo = true;
    setCarreg(true);

    listarLeituras(60)
      .then((l) => { if (vivo) { setItens(l); setCarreg(false); } })
      .catch(() => { if (vivo) setCarreg(false); });

    return () => { vivo = false; };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const filtrados = busca.trim()
    ? itens.filter((i) =>
        (i.materiais || '').toLowerCase().includes(busca.toLowerCase()) ||
        (i.titulo || '').toLowerCase().includes(busca.toLowerCase()))
    : itens;

  async function apagar(e, id) {
    e.stopPropagation();
    setApagando(id);
    try {
      await apagarLeitura(id);
      setItens((l) => l.filter((i) => i.id !== id));
    } catch {
      // Não apagou: deixa como está. Não vale um alerta por isso.
    } finally {
      setApagando(null);
    }
  }

  return (
    <div className="cr-overlay cr-overlay--alto" onClick={onFechar}>
      <div className="hl" onClick={(e) => e.stopPropagation()}>

        <button className="hl-x" onClick={onFechar} aria-label={t('historicoleituras_fechar')}>
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" strokeLinecap="round"/>
          </svg>
        </button>

        <header className="hl-cab">
          <div>
            <h3>{t('historicoleituras_titulo')}</h3>
            <p>{t('historicoleituras_sub')}</p>
          </div>

          <input
            className="hl-busca"
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t('historicoleituras_buscar')}
            spellCheck={false}
          />
        </header>

        <div className="hl-lista">
          {carregando && <p className="cr-msg">{t('comum_carregando')}</p>}

          {!carregando && filtrados.length === 0 && (
            <div className="hl-vazio">
              <p>
                {busca
                  ? t('historicoleituras_vazio_busca')
                  : t('historicoleituras_vazio')}
              </p>
            </div>
          )}

          {/* O item era um <button> com o lixo (span role=button) DENTRO —
              botão dentro de botão é HTML inválido e o lixo não respondia a
              teclado. Agora o item é div[role=button] com teclado próprio e o
              lixo é um <button> de verdade, irmão válido, com Enter/Espaço
              nativos. */}
          {!carregando && filtrados.map((l) => (
            <div
              key={l.id}
              className="hl-item"
              role="button"
              tabIndex={0}
              onClick={() => { onEscolher(l); onFechar(); }}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;   // Enter no lixo é do lixo
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEscolher(l);
                  onFechar();
                }
              }}
            >
              {l.thumb
                ? <img src={l.thumb} alt="" className="hl-thumb" />
                : <span className="hl-thumb hl-thumb--vazia" />}

              <span className="hl-txt">
                <span className="hl-topo">
                  <span className="hl-tit">{l.titulo || t('historicoleituras_sem_titulo')}</span>
                  <span className="hl-tag">{l.origem === 'batch' ? 'Batch' : 'Render'}</span>
                  <span className="hl-quando">{quando(l.criadoEm, t, idioma)}</span>
                </span>
                <span className="hl-prev">{l.materiais}</span>
              </span>

              <button
                type="button"
                className="hl-lixo"
                onClick={(e) => apagar(e, l.id)}
                aria-label={t('historicoleituras_apagar')}
              >
                {apagando === l.id ? '...' : (
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" strokeLinecap="round"/>
                    <path d="M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>

        {!carregando && itens.length > 0 && (
          <footer className="hl-pe">
            {t('historicoleituras_pe')}
          </footer>
        )}
      </div>
    </div>
  );
}
