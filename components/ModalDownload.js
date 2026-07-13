'use client';

// ═══════════════════════════════════════════════════════════
//  ModalDownload — "Exportar imagem", como no plugin
//
//  PNG  = o arquivo que está no R2, baixado direto (sem perdas)
//  JPEG = convertido AQUI, no navegador, via canvas
//
//  Converter no cliente evita guardar duas versões de cada imagem no R2.
//  O JPEG sai a 80%, o mesmo do plugin.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { bytesDaGeracao, marcarBaixada } from '../lib/geracoes';

// Um base64 vira Blob — o que o canvas e o link de download entendem.
function base64ParaBlob(base64, mime = 'image/png') {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function ModalDownload({ aberto, url, id, onFechar }) {
  const [formato, setFormato]   = useState('png');
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro]         = useState('');

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);

  async function baixar() {
    setBaixando(true);
    setErro('');
    try {
      // Os bytes vêm do SERVIDOR, não da URL do R2.
      //
      // O R2 não manda cabeçalho CORS: a imagem APARECE numa <img>, mas um
      // fetch() nela morre com "Failed to fetch" — foi exatamente o que
      // aconteceu aqui. Quem lê do bucket é o servidor.
      const base64 = await bytesDaGeracao(id);
      const blob   = base64ParaBlob(base64);

      const nome = `cora-render-${Date.now()}`;

      if (formato === 'png') {
        salvar(blob, `${nome}.png`);
      } else {
        // JPEG: converte no navegador, para não guardar duas cópias no R2
        const bmp = await createImageBitmap(blob);
        const cv  = document.createElement('canvas');
        cv.width  = bmp.width;
        cv.height = bmp.height;

        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#FFFFFF';          // JPEG não tem transparência
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(bmp, 0, 0);

        const jpg = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.8));
        salvar(jpg, `${nome}.jpg`);
      }

      // Registra para o filtro "Baixadas" (best-effort: não bloqueia)
      if (id) marcarBaixada(id);

      onFechar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setBaixando(false);
    }
  }

  function salvar(blob, nome) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  if (!aberto) return null;

  return (
    <div className="cr-overlay cr-overlay--alto" onClick={onFechar}>
      <div className="dl" onClick={(e) => e.stopPropagation()}>
        <h3>Exportar imagem</h3>

        <label className={'dl-op' + (formato === 'png' ? ' dl-op--on' : '')}>
          <input
            type="radio" name="fmt" value="png"
            checked={formato === 'png'}
            onChange={() => setFormato('png')}
          />
          <span className="dl-radio" />
          <span>
            <strong>PNG</strong>
            <em>Qualidade 100% · sem perdas</em>
          </span>
        </label>

        <label className={'dl-op' + (formato === 'jpeg' ? ' dl-op--on' : '')}>
          <input
            type="radio" name="fmt" value="jpeg"
            checked={formato === 'jpeg'}
            onChange={() => setFormato('jpeg')}
          />
          <span className="dl-radio" />
          <span>
            <strong>JPEG</strong>
            <em>Qualidade 80% · arquivo menor</em>
          </span>
        </label>

        {erro && <div className="cr-erro">{erro}</div>}

        <button className="dl-btn" onClick={baixar} disabled={baixando}>
          {baixando ? 'Baixando...' : 'Download'}
        </button>
        <button className="dl-cancel" onClick={onFechar}>Cancelar</button>
      </div>
    </div>
  );
}
