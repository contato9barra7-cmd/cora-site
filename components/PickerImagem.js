'use client';

// ═══════════════════════════════════════════════════════════
//  PickerImagem — escolher a imagem base, em overlay
//
//  Três abas:
//    Enviar     — arrastar, colar (Ctrl+V), ou escolher um arquivo
//    Histórico  — reusar algo que já foi gerado (plugin ou web)
//    Favoritos  — o mesmo, filtrado
//
//  As duas últimas são a vantagem da web sobre o plugin: dá para encadear
//  render → editar sem baixar e subir a imagem de novo.
//
//  Devolve { base64, previa } — o base64 vai para o servidor, a prévia
//  (data URL ou URL assinada) é só para mostrar na tela.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { arquivoParaBase64, urlParaBase64 } from '../lib/render';
import { listarGeracoes } from '../lib/geracoes';

const ABAS = [
  { id: 'enviar',    rotulo: 'Enviar' },
  { id: 'historico', rotulo: 'Histórico' },
  { id: 'favoritos', rotulo: 'Favoritos' }
];

export default function PickerImagem({ aberto, onFechar, onEscolher, titulo }) {
  const [aba, setAba]               = useState('enviar');
  const [arrastando, setArrastando] = useState(false);
  const [lotes, setLotes]           = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState('');
  const [pegando, setPegando]       = useState(null);   // id da imagem sendo baixada

  const carregarFeed = useCallback(async (soFavoritos) => {
    setCarregando(true);
    setErro('');
    try {
      const d = await listarGeracoes({
        tipo: 'imagem',
        favorito: soFavoritos,
        limite: 60
      });
      setLotes(d);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!aberto) return;
    if (aba === 'historico') carregarFeed(false);
    if (aba === 'favoritos') carregarFeed(true);
  }, [aberto, aba, carregarFeed]);

  // Esc fecha; Ctrl+V cola
  useEffect(() => {
    if (!aberto) return;

    const onKey = (e) => { if (e.key === 'Escape') onFechar(); };

    const onPaste = async (e) => {
      if (aba !== 'enviar') return;
      const item = [...(e.clipboardData?.items || [])]
        .find((i) => i.type.startsWith('image/'));
      if (!item) return;
      const f = item.getAsFile();
      if (f) await escolherArquivo(f);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  });

  async function escolherArquivo(file) {
    setErro('');
    try {
      const base64 = await arquivoParaBase64(file);
      onEscolher({ base64, previa: URL.createObjectURL(file) });
      onFechar();
    } catch (e) { setErro(e.message); }
  }

  async function escolherDoFeed(item) {
    setPegando(item.id);
    setErro('');
    try {
      const base64 = await urlParaBase64(item.url);
      onEscolher({ base64, previa: item.url });
      onFechar();
    } catch (e) { setErro(e.message); }
    finally { setPegando(null); }
  }

  if (!aberto) return null;

  // Achata os lotes numa lista de imagens
  const imagens = lotes.flatMap((l) => l.itens.filter((i) => i.url));

  return (
    <div className="cr-overlay" onClick={onFechar}>
      <div className="cr-picker" onClick={(e) => e.stopPropagation()}>

        <header className="cr-picker-cab">
          <span>{titulo || 'Escolher imagem'}</span>
          <button className="cr-modal-x" onClick={onFechar} aria-label="Fechar">×</button>
        </header>

        <div className="cr-picker-abas">
          {ABAS.map((a) => (
            <button
              key={a.id}
              className={'cr-picker-aba' + (aba === a.id ? ' cr-picker-aba--on' : '')}
              onClick={() => setAba(a.id)}
            >{a.rotulo}</button>
          ))}
        </div>

        <div className="cr-picker-corpo">

          {aba === 'enviar' && (
            <label
              className={'cr-picker-drop' + (arrastando ? ' cr-picker-drop--on' : '')}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastando(false);
                const f = e.dataTransfer.files[0];
                if (f && f.type.startsWith('image/')) escolherArquivo(f);
              }}
            >
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round"/>
              </svg>
              <span className="cr-picker-drop-t">Arraste sua imagem aqui</span>
              <span className="cr-picker-drop-s">ou cole com Ctrl+V</span>
              <span className="cr-picker-btn">Escolher arquivo</span>
              <input
                type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files[0]; if (f) escolherArquivo(f); e.target.value = ''; }}
              />
            </label>
          )}

          {(aba === 'historico' || aba === 'favoritos') && (
            <>
              {carregando && <p className="cr-msg">Carregando...</p>}

              {!carregando && imagens.length === 0 && (
                <p className="cr-msg">
                  {aba === 'favoritos'
                    ? 'Você ainda não favoritou nenhuma imagem.'
                    : 'Nenhuma imagem no seu histórico ainda.'}
                </p>
              )}

              {!carregando && imagens.length > 0 && (
                <div className="cr-picker-grade">
                  {imagens.map((i) => (
                    <button
                      key={i.id}
                      className={'cr-picker-item' + (pegando === i.id ? ' cr-picker-item--indo' : '')}
                      onClick={() => escolherDoFeed(i)}
                      disabled={pegando !== null}
                    >
                      <img src={i.url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {erro && <div className="cr-erro">{erro}</div>}
        </div>
      </div>
    </div>
  );
}
