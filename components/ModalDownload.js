'use client';

// ═══════════════════════════════════════════════════════════
//  ModalDownload — a janela de baixar
//
//  O que decide entre PNG e JPEG é o PESO. "Sem perdas" não diz se são
//  500 KB ou 8 MB, então cada opção mostra o tamanho estimado.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { baixarGeracao } from '../lib/geracoes';

// Uma estimativa, não uma medida: medir exigiria baixar os bytes ANTES de a
// pessoa escolher — que é justamente o que se quer evitar.
//
// PNG de render costuma dar ~1,2 byte por pixel; JPEG a 80%, ~0,22.
function pesar(w, h, formato) {
  if (!w || !h) return null;
  const bytes = w * h * (formato === 'png' ? 1.2 : 0.22);

  return bytes > 1048576
    ? (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB'
    : Math.round(bytes / 1024) + ' KB';
}

export default function ModalDownload({ item, dim: dimFixa, aoBaixar, onFechar }) {
  const [formato, setFormato]   = useState('png');
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro]         = useState('');
  const [dim, setDim]           = useState(dimFixa || null);

  // Mede a imagem para estimar o peso. Na pós, as dimensões já vêm prontas
  // (`dimFixa`) — não há `item.url` de onde medir.
  useEffect(() => {
    if (dimFixa) { setDim(dimFixa); return; }
    if (!item?.url) return;
    const img = new Image();
    img.onload = () => setDim({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = item.thumb || item.url;
  }, [item, dimFixa]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onFechar]);

  async function baixar() {
    setBaixando(true);
    setErro('');
    try {
      // A pós passa a própria função (imagem local); o feed baixa por id.
      if (aoBaixar) await aoBaixar(formato);
      else await baixarGeracao(item.id, formato);
      onFechar();
    } catch (e) {
      setErro(e.message);
      setBaixando(false);
    }
  }

  const peso = dim ? pesar(dim.w, dim.h, formato) : null;

  return (
    <div className="cr-overlay cr-overlay--alto" onClick={onFechar}>
      <div className="dl" onClick={(e) => e.stopPropagation()}>

        <div className="dl-cab">
          <div>
            <strong>Baixar imagem</strong>
            {dim && (
              <span>
                {dim.w} × {dim.h}
                {item?.proporcao && item.proporcao !== 'auto' ? ' · ' + item.proporcao : ''}
              </span>
            )}
          </div>

          <button className="dl-x" onClick={onFechar} aria-label="Fechar">
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
                 stroke="currentColor" strokeWidth="1.6">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="dl-ops">
          {[
            { id: 'png',  nome: 'PNG',  desc: 'Qualidade 100% · sem perdas' },
            { id: 'jpeg', nome: 'JPEG', desc: 'Qualidade 80% · arquivo menor' }
          ].map((f) => (
            <button
              key={f.id}
              className={'dl-op' + (formato === f.id ? ' dl-op--on' : '')}
              onClick={() => setFormato(f.id)}
              disabled={baixando}
            >
              <span className="dl-radio" />

              <span className="dl-txt">
                <strong>{f.nome}</strong>
                <em>{f.desc}</em>
              </span>

              {dim && (
                <span className="dl-peso">{pesar(dim.w, dim.h, f.id)}</span>
              )}
            </button>
          ))}
        </div>

        {erro && <div className="dl-erro">{erro}</div>}

        {/* O botão diz o que vai acontecer, com o peso do que foi escolhido */}
        <button className="dl-btn" onClick={baixar} disabled={baixando}>
          {baixando ? 'Baixando...' : (
            <>
              <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
                   stroke="currentColor" strokeWidth="1.6">
                <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.5 15v1.5h13V15" strokeLinecap="round"/>
              </svg>
              Baixar {formato.toUpperCase()}{peso ? ` · ${peso}` : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
