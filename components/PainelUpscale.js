'use client';

// ═══════════════════════════════════════════════════════════
//  PainelUpscale — a aba de upscale, espelho do plugin
//
//  Dois modos: Precisão (nítido, fiel ao original) e Criativo (a IA pode
//  inventar detalhe). A pessoa sobe uma imagem, escolhe o fator de escala e
//  os ajustes do modo, e gera. O resultado sai por polling e volta com uma
//  comparação antes/depois.
//
//  Os campos, os limites e os nomes acompanham o plugin, para quem usa os
//  dois não precisar reaprender nada.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import PickerImagem from './PickerImagem';
import IconeCredito from './IconeCredito';
import { upscaleImagem, custoUpscale } from '../lib/render';

// ── Os modelos e engines, iguais aos do plugin ──
const FLAVORS = [
  { v: 'sublime',        n: 'Magnific v2 (sublime)' },
  { v: 'photo_denoiser', n: 'Magnific v2 (photo denoiser)' }
];

const OTIMIZADO = [
  { v: 'standard',                  n: 'Standard Ultra' },
  { v: 'portrait_soft',             n: 'Portrait (Soft)' },
  { v: 'portrait_hard',             n: 'Portrait (Hard)' },
  { v: 'art',                       n: 'Art & Illustration' },
  { v: 'videogame_assets',          n: 'Videogame Assets' },
  { v: 'nature_n_landscapes',       n: 'Nature & Landscapes' },
  { v: 'films_n_photography',       n: 'Films & Photography' },
  { v: '3d_renders',                n: '3D Renders' },
  { v: 'science_fiction_n_horror',  n: 'Science Fiction & Horror' }
];

const ENGINES = [
  { v: 'automatic',        n: 'Automatic' },
  { v: 'magnific_illusio', n: 'Illusio' },
  { v: 'magnific_sharpy',  n: 'Sharpy' },
  { v: 'magnific_sparkle', n: 'Sparkle' }
];

const AJUDA = {
  model:       'Sublime: equilíbrio geral, ótimo para a maioria das imagens. Photo Denoiser: foca em reduzir ruído, ideal para fotos granuladas ou com pouca luz.',
  sharpness:   'Realça bordas e texturas para dar mais clareza visual. Valores altos podem deixar a imagem com aparência artificial.',
  grain:       'Valores baixos (7%–12%) preservam o grão original para uma textura realista. Valores altos criam efeito artístico. Use 0% para um visual limpo.',
  otimizado:   'Define o tipo de conteúdo da imagem para o upscale gerar detalhes mais coerentes (arquitetura, retrato, paisagem, etc.).',
  criatividade:'Controla quanto a IA pode inventar novos detalhes. Valores altos criam mais textura, mas podem se afastar do original.',
  hdr:         'Aumenta o contraste e a riqueza de detalhes em luzes e sombras, dando profundidade à imagem.',
  semelhanca:  'Define quão fiel o resultado fica em relação ao original. Valores altos preservam mais a composição e os materiais.',
  fractalidade:'Adiciona micro-detalhes e padrões finos. Valores altos intensificam texturas pequenas, mas em excesso poluem a imagem.',
  engine:      'O motor de geração. Automatic escolhe o melhor. Illusio é mais suave, Sharpy mais nítido, Sparkle mais detalhado.'
};

// O padrão do estado, igual ao upState do plugin.
const PADRAO = {
  scale: 2,
  flavor: 'sublime', sharpen: 7, smart_grain: 7,
  optimized_for: 'standard', creativity: 0, hdr: 0, resemblance: 0, fractality: 0,
  engine: 'automatic', prompt: ''
};

// Pequeno "?" com dica ao passar o mouse.
function Ajuda({ texto }) {
  return (
    <span className="up-ajuda" tabIndex={0}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
      <span className="up-ajuda-bolha">{texto}</span>
    </span>
  );
}

export default function PainelUpscale({
  imagemInicial, onPronto, onProgresso, ocupado, setOcupado, ehAdmin
}) {
  const [base, setBase]   = useState(null);     // { base64, w, h }
  const [modo, setModo]   = useState('precision');
  const [st, setSt]       = useState({ ...PADRAO });
  const [picker, setPicker] = useState(false);
  const [erro, setErro]   = useState('');

  // Imagem vinda de outra aba (ex.: "Enviar para Upscale" do visualizador).
  useEffect(() => {
    if (imagemInicial && imagemInicial.base64) {
      medirEDefinir(imagemInicial.base64);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagemInicial]);

  function medirEDefinir(base64) {
    const src = base64.startsWith('data:') ? base64 : 'data:image/png;base64,' + base64;
    const img = new Image();
    img.onload = () => setBase({ base64: base64.replace(/^data:[^,]+,/, ''), w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setBase({ base64: base64.replace(/^data:[^,]+,/, ''), w: 0, h: 0 });
    img.src = src;
  }

  function campo(k, v) { setSt((s) => ({ ...s, [k]: v })); }

  const custo = custoUpscale(st.scale);

  async function gerar() {
    if (!base) { setErro('Suba uma imagem primeiro'); return; }
    setErro('');
    setOcupado(true);

    onProgresso && onProgresso({
      feito: 0, total: 1, estado: 'processando',
      base: 'data:image/png;base64,' + base.base64
    });

    try {
      const r = await upscaleImagem({
        modo,
        image: base.base64,
        scale: st.scale,
        flavor: st.flavor, sharpen: st.sharpen, smart_grain: st.smart_grain,
        optimized_for: st.optimized_for, creativity: st.creativity, hdr: st.hdr,
        resemblance: st.resemblance, fractality: st.fractality,
        engine: st.engine, prompt: st.prompt
      });

      if (r.imagem) {
        onPronto && onPronto({ imagens: [r.imagem], prompt: r.prompt, isUpscale: true, origem: base.base64 });
      } else {
        setErro('Não foi possível fazer o upscale');
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
      onProgresso && onProgresso(null);
    }
  }

  return (
    <div className="up-painel">

      {/* ── A imagem ── */}
      <section className="up-bloco">
        <h3 className="cr-sec">Imagem base</h3>

        {!base ? (
          <button className="up-dropzone" onClick={() => setPicker(true)}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Suba uma imagem do Histórico, Favoritos, Pós-produção ou do seu computador.</span>
          </button>
        ) : (
          <div className="up-preview">
            <img src={'data:image/png;base64,' + base.base64} alt="" />
            {base.w > 0 && <span className="up-dim">{base.w} × {base.h}</span>}
            <button className="up-trocar" onClick={() => setPicker(true)}>Trocar imagem</button>
            <button className="up-remover" onClick={() => setBase(null)} aria-label="Remover">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </section>

      {/* ── Modo ── */}
      <section className="up-bloco">
        <h3 className="cr-sec">Upscale de imagem</h3>
        <div className="up-modo-row">
          <button className={'up-modo' + (modo === 'precision' ? ' up-modo--on' : '')} onClick={() => setModo('precision')}>Precisão</button>
          <button className={'up-modo' + (modo === 'creative' ? ' up-modo--on' : '')} onClick={() => setModo('creative')}>Criativo</button>
        </div>
      </section>

      {/* ── Fator de escala ── */}
      <section className="up-bloco">
        <h3 className="cr-sec">Fator de escala</h3>
        <div className="up-scale-row">
          {[2, 4, 8, 16].map((s) => (
            <button key={s} className={'up-scale' + (st.scale === s ? ' up-scale--on' : '')} onClick={() => campo('scale', s)}>{s}x</button>
          ))}
        </div>
      </section>

      {/* ── Campos do modo Precisão ── */}
      {modo === 'precision' && (
        <section className="up-bloco">
          <label className="up-lbl">Modelo <Ajuda texto={AJUDA.model} /></label>
          <select className="up-select" value={st.flavor} onChange={(e) => campo('flavor', e.target.value)}>
            {FLAVORS.map((f) => <option key={f.v} value={f.v}>{f.n}</option>)}
          </select>

          <div className="up-slider">
            <label>Nitidez <Ajuda texto={AJUDA.sharpness} /></label>
            <input type="range" min="0" max="100" value={st.sharpen} onChange={(e) => campo('sharpen', +e.target.value)} />
            <span>{st.sharpen}%</span>
          </div>
          <div className="up-slider">
            <label>Grão <Ajuda texto={AJUDA.grain} /></label>
            <input type="range" min="0" max="100" value={st.smart_grain} onChange={(e) => campo('smart_grain', +e.target.value)} />
            <span>{st.smart_grain}%</span>
          </div>
        </section>
      )}

      {/* ── Campos do modo Criativo ── */}
      {modo === 'creative' && (
        <section className="up-bloco">
          <label className="up-lbl">Otimizado para <Ajuda texto={AJUDA.otimizado} /></label>
          <select className="up-select" value={st.optimized_for} onChange={(e) => campo('optimized_for', e.target.value)}>
            {OTIMIZADO.map((o) => <option key={o.v} value={o.v}>{o.n}</option>)}
          </select>

          <div className="up-slider">
            <label>Criatividade <Ajuda texto={AJUDA.criatividade} /></label>
            <input type="range" min="-10" max="10" value={st.creativity} onChange={(e) => campo('creativity', +e.target.value)} />
            <span>{st.creativity}</span>
          </div>
          <div className="up-slider">
            <label>HDR <Ajuda texto={AJUDA.hdr} /></label>
            <input type="range" min="-10" max="10" value={st.hdr} onChange={(e) => campo('hdr', +e.target.value)} />
            <span>{st.hdr}</span>
          </div>
          <div className="up-slider">
            <label>Semelhança <Ajuda texto={AJUDA.semelhanca} /></label>
            <input type="range" min="-10" max="10" value={st.resemblance} onChange={(e) => campo('resemblance', +e.target.value)} />
            <span>{st.resemblance}</span>
          </div>
          <div className="up-slider">
            <label>Fractalidade <Ajuda texto={AJUDA.fractalidade} /></label>
            <input type="range" min="-10" max="10" value={st.fractality} onChange={(e) => campo('fractality', +e.target.value)} />
            <span>{st.fractality}</span>
          </div>

          <label className="up-lbl">Engine <Ajuda texto={AJUDA.engine} /></label>
          <select className="up-select" value={st.engine} onChange={(e) => campo('engine', e.target.value)}>
            {ENGINES.map((en) => <option key={en.v} value={en.v}>{en.n}</option>)}
          </select>
        </section>
      )}

      {erro && <p className="up-erro">{erro}</p>}

      {/* ── Gerar ── */}
      <button className="cr-btn-gerar up-gerar" onClick={gerar} disabled={ocupado || !base}>
        <span>{ocupado ? 'Processando...' : 'Fazer upscale'}</span>
        {!ocupado && base && (
          <span className="cr-custo-tag"><IconeCredito /> {custo}</span>
        )}
      </button>

      <PickerImagem
        aberto={picker}
        onFechar={() => setPicker(false)}
        titulo="Imagem para upscale"
        onEscolher={(img) => { medirEDefinir(img.base64 || img); setPicker(false); }}
      />
    </div>
  );
}
