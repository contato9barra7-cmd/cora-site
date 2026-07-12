'use client';

// ═══════════════════════════════════════════════════════════
//  PainelRender — a aba Render do /app
//
//  Espelha a aba Render do plugin: mesmos controles, mesmos valores,
//  mesma ordem. A diferença é que a imagem vem de UPLOAD, não da
//  captura do viewport do SketchUp.
//
//  Ficam de fora (dependem do modelo 3D, não existem na web):
//    - Regra dos terços (overlay no viewport)
//    - Espelho / Vidro fumê (precisam da geometria)
//    - Ler materiais DO MODELO — aqui o GPT lê da própria imagem
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
  gerarRender, lerMateriais, arquivoParaBase64,
  TIPOS, PROPORCOES, LUZ_TIPOS, MOODS, DIRECOES,
  CORES_LUZ, INTENSIDADES, ENTORNOS, RESOLUCOES
} from '../lib/render';

const MAX_REFS = 4;

export default function PainelRender({ onPronto, ocupado, setOcupado }) {
  // ── Imagem base ──
  const [imagem, setImagem]   = useState(null);   // base64 puro
  const [previa, setPrevia]   = useState(null);   // data URL, para o <img>
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef(null);

  // ── Controles (mesmos padrões do plugin) ──
  const [tipo, setTipo]             = useState('interno');
  const [proporcao, setProporcao]   = useState('auto');
  const [resolucao, setResolucao]   = useState('2k');
  const [quantidade, setQuantidade] = useState(1);

  const [materiais, setMateriais]   = useState('');
  const [lendoMat, setLendoMat]     = useState(false);

  const [luzTipo, setLuzTipo]       = useState('Direta');
  const [mood, setMood]             = useState('Dia claro editorial');
  const [detNatural, setDetNatural] = useState('');

  const [direcoes, setDirecoes]     = useState([]);   // pode marcar várias
  const [descLuz, setDescLuz]       = useState('');

  const [corLuz, setCorLuz]         = useState('Desligada');
  const [intensidade, setIntensidade] = useState('Média');
  const [detArtificial, setDetArtificial] = useState('');

  const [tagsEntorno, setTagsEntorno] = useState([]);
  const [entorno, setEntorno]         = useState('');

  const [refs, setRefs]         = useState([]);   // [{ base64, mimeType, previa }]
  const [refTexto, setRefTexto] = useState('');

  const [erro, setErro]         = useState('');
  const [progresso, setProgresso] = useState(null);   // { feito, total, estado }

  // ── Colar imagem com Ctrl+V ──
  useEffect(() => {
    async function onPaste(e) {
      if (ocupado) return;
      const item = [...(e.clipboardData?.items || [])]
        .find((i) => i.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (file) await carregarImagem(file);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  async function carregarImagem(file) {
    setErro('');
    try {
      const b64 = await arquivoParaBase64(file);
      setImagem(b64);
      setPrevia(URL.createObjectURL(file));
      setMateriais('');   // a imagem mudou: os materiais antigos não valem mais
    } catch (e) { setErro(e.message); }
  }

  async function addRef(file) {
    if (refs.length >= MAX_REFS) return;
    try {
      const b64 = await arquivoParaBase64(file);
      setRefs((r) => [...r, {
        base64: b64,
        mimeType: file.type || 'image/png',
        previa: URL.createObjectURL(file)
      }]);
    } catch (e) { setErro(e.message); }
  }

  function toggle(lista, setLista, valor) {
    setLista(lista.includes(valor)
      ? lista.filter((v) => v !== valor)
      : [...lista, valor]);
  }

  async function lerMat() {
    if (!imagem) { setErro('Envie a imagem primeiro'); return; }
    setLendoMat(true);
    setErro('');
    try {
      const txt = await lerMateriais(imagem, tipo);
      setMateriais(txt);
    } catch (e) { setErro(e.message); }
    finally { setLendoMat(false); }
  }

  async function gerar() {
    if (!imagem)  { setErro('Envie a imagem do seu modelo'); return; }
    if (ocupado)  return;

    setErro('');
    setOcupado(true);
    setProgresso({ feito: 0, total: quantidade, estado: 'na_fila' });

    // O plugin junta o detalhe ao mood, e a intensidade à cor da luz.
    // Repetimos exatamente, senão o promptador recebe um formato diferente.
    const moodFinal = detNatural.trim()
      ? `${mood} (${luzTipo}). Detalhes: ${detNatural.trim()}`
      : `${mood} (${luzTipo})`;

    const luzArtFinal = corLuz === 'Desligada'
      ? 'Desligada'
      : `${corLuz}, intensidade ${intensidade}${detArtificial.trim() ? `. Detalhes: ${detArtificial.trim()}` : ''}`;

    const entornoFinal = [tagsEntorno.join(', '), entorno.trim()]
      .filter(Boolean).join('. ');

    try {
      const r = await gerarRender({
        imagem,
        tipo,
        proporcao,
        resolucao,
        quantidade,
        mood:          moodFinal,
        materiais:     materiais.trim(),
        entorno:       entornoFinal,
        luzArtificial: luzArtFinal,
        direcaoLuz:    direcoes.join(', '),
        descLuz:       descLuz.trim(),
        refTexto:      refTexto.trim(),
        referencias:   refs.map((r) => ({ base64: r.base64, mimeType: r.mimeType }))
      }, {
        onProgresso: (feito, total, estado) => setProgresso({ feito, total, estado })
      });

      onPronto(r);   // avisa a página: recarrega o feed
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
      setProgresso(null);
    }
  }

  const custo = quantidade * 120;   // TODO: puxar a tabela real de créditos

  return (
    <div className="cr-form">

      {/* ── Imagem base ── */}
      <div className="cr-sec">Imagem do modelo</div>

      <div
        className={'cr-drop' + (arrastando ? ' cr-drop--on' : '') + (previa ? ' cr-drop--tem' : '')}
        onClick={() => !ocupado && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const f = e.dataTransfer.files[0];
          if (f && f.type.startsWith('image/')) carregarImagem(f);
        }}
      >
        {previa ? (
          <>
            <img src={previa} alt="" />
            <button
              className="cr-drop-x"
              onClick={(e) => { e.stopPropagation(); setImagem(null); setPrevia(null); setMateriais(''); }}
              data-tip="Remover"
              aria-label="Remover imagem"
            >×</button>
          </>
        ) : (
          <div className="cr-drop-vazio">
            <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/>
              <path d="M3 14l4-4 3.5 3.5L14 9l3.5 3.5"/>
            </svg>
            <span>Arraste o print aqui</span>
            <span className="cr-drop-sub">ou clique, ou cole com Ctrl+V</span>
          </div>
        )}
        <input
          ref={inputRef} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files[0]; if (f) carregarImagem(f); e.target.value = ''; }}
        />
      </div>

      {/* ── Tipo de ambiente ── */}
      <div className="cr-sec">Tipo de ambiente</div>
      <div className="cr-segs">
        {TIPOS.map((t) => (
          <button
            key={t.val}
            className={'cr-seg' + (tipo === t.val ? ' cr-seg--on' : '')}
            onClick={() => setTipo(t.val)}
          >{t.rotulo}</button>
        ))}
      </div>

      {/* ── Proporção ── */}
      <div className="cr-sec">Proporção</div>
      <div className="cr-ratios">
        {PROPORCOES.map((p) => (
          <button
            key={p.val}
            className={'cr-ratio' + (proporcao === p.val ? ' cr-ratio--on' : '')}
            onClick={() => setProporcao(p.val)}
          >
            <svg viewBox="0 0 28 28" fill="none">
              <rect
                x={(28 - p.w) / 2} y={(28 - p.h) / 2}
                width={p.w} height={p.h} rx="1"
                stroke="currentColor" strokeWidth="1.5"
              />
            </svg>
            <span>{p.rotulo}</span>
          </button>
        ))}
      </div>

      {/* ── Materiais ── */}
      <div className="cr-sec">
        Materiais
        <button className="cr-sec-btn" onClick={lerMat} disabled={lendoMat || !imagem || ocupado}>
          {lendoMat ? 'Lendo...' : 'Ler da imagem'}
        </button>
      </div>
      <textarea
        className="cr-ta cr-ta--alta"
        placeholder="Clique em “Ler da imagem” — a IA descreve o que vê. Você pode editar depois."
        value={materiais}
        onChange={(e) => setMateriais(e.target.value)}
        spellCheck={false}
      />

      {/* ── Iluminação natural ── */}
      <div className="cr-sec">Iluminação natural</div>
      <div className="cr-segs">
        {LUZ_TIPOS.map((l) => (
          <button
            key={l.val}
            className={'cr-seg' + (luzTipo === l.val ? ' cr-seg--on' : '')}
            onClick={() => setLuzTipo(l.val)}
          >{l.rotulo}</button>
        ))}
      </div>

      {MOODS.map((g) => (
        <div key={g.grupo}>
          <div className="cr-grp">{g.grupo}</div>
          <div className="cr-tags">
            {g.itens.map((m) => (
              <button
                key={m}
                className={'cr-tag' + (mood === m ? ' cr-tag--on' : '')}
                onClick={() => setMood(m)}
              >{m}</button>
            ))}
          </div>
        </div>
      ))}

      <textarea
        className="cr-ta"
        placeholder="Opcional — detalhes da luz natural..."
        value={detNatural}
        onChange={(e) => setDetNatural(e.target.value)}
        spellCheck={false}
      />

      {/* ── Direção da luz ── */}
      <div className="cr-sec">Direção da luz</div>
      <div className="cr-tags">
        {DIRECOES.map((d) => (
          <button
            key={d}
            className={'cr-tag' + (direcoes.includes(d) ? ' cr-tag--on' : '')}
            onClick={() => toggle(direcoes, setDirecoes, d)}
          >{d}</button>
        ))}
      </div>
      <textarea
        className="cr-ta"
        placeholder="Opcional — descreva a luz com suas palavras..."
        value={descLuz}
        onChange={(e) => setDescLuz(e.target.value)}
        spellCheck={false}
      />

      {/* ── Luz artificial ── */}
      <div className="cr-sec">Luz artificial</div>
      <div className="cr-grp">Cor</div>
      <div className="cr-tags">
        {CORES_LUZ.map((c) => (
          <button
            key={c}
            className={'cr-tag' + (corLuz === c ? ' cr-tag--on' : '')}
            onClick={() => setCorLuz(c)}
          >{c}</button>
        ))}
      </div>

      {corLuz !== 'Desligada' && (
        <>
          <div className="cr-grp">Intensidade</div>
          <div className="cr-tags">
            {INTENSIDADES.map((i) => (
              <button
                key={i}
                className={'cr-tag' + (intensidade === i ? ' cr-tag--on' : '')}
                onClick={() => setIntensidade(i)}
              >{i}</button>
            ))}
          </div>
          <textarea
            className="cr-ta"
            placeholder="Opcional — detalhes da luz artificial..."
            value={detArtificial}
            onChange={(e) => setDetArtificial(e.target.value)}
            spellCheck={false}
          />
        </>
      )}

      {/* ── Entorno ── */}
      <div className="cr-sec">Entorno <span className="cr-opc">opcional</span></div>
      <div className="cr-tags">
        {ENTORNOS.map((e) => (
          <button
            key={e}
            className={'cr-tag' + (tagsEntorno.includes(e) ? ' cr-tag--on' : '')}
            onClick={() => toggle(tagsEntorno, setTagsEntorno, e)}
          >{e}</button>
        ))}
      </div>
      <textarea
        className="cr-ta"
        placeholder="Descreva o entorno com suas palavras..."
        value={entorno}
        onChange={(e) => setEntorno(e.target.value)}
        spellCheck={false}
      />
      <p className="cr-hint">
        Quanto mais específico, melhor. Ex: “10º andar, vista de bairro residencial arborizado”
      </p>

      {/* ── Referências ── */}
      <div className="cr-sec">
        Referências <span className="cr-opc">{refs.length}/{MAX_REFS}</span>
      </div>
      <div className="cr-refs">
        {refs.map((r, i) => (
          <div key={i} className="cr-ref">
            <img src={r.previa} alt="" />
            <button
              className="cr-ref-x"
              onClick={() => setRefs((rs) => rs.filter((_, j) => j !== i))}
              aria-label="Remover referência"
            >×</button>
            <span className="cr-ref-n">@ref{String(i + 1).padStart(2, '0')}</span>
          </div>
        ))}
        {refs.length < MAX_REFS && (
          <label className="cr-ref cr-ref--add">
            +
            <input
              type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files[0]; if (f) addRef(f); e.target.value = ''; }}
            />
          </label>
        )}
      </div>
      <textarea
        className="cr-ta"
        placeholder="Opcional — como usar as referências. Ex: “@ref01 define o piso”"
        value={refTexto}
        onChange={(e) => setRefTexto(e.target.value)}
        spellCheck={false}
      />

      {/* ── Resolução e quantidade ── */}
      <div className="cr-sec">Saída</div>
      <div className="cr-saida">
        <div className="cr-segs cr-segs--peq">
          {RESOLUCOES.map((r) => (
            <button
              key={r.val}
              className={'cr-seg' + (resolucao === r.val ? ' cr-seg--on' : '')}
              onClick={() => setResolucao(r.val)}
            >{r.rotulo}</button>
          ))}
        </div>

        <div className="cr-qty">
          <button
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
            aria-label="Menos uma"
          >−</button>
          <span>{quantidade}</span>
          <button
            onClick={() => setQuantidade((q) => Math.min(10, q + 1))}
            aria-label="Mais uma"
          >+</button>
        </div>
      </div>

      {erro && <div className="cr-erro">{erro}</div>}

      {/* ── Gerar ── */}
      <div className="cr-gerar">
        <button
          className="cr-btn-gerar"
          onClick={gerar}
          disabled={ocupado || !imagem}
        >
          {ocupado ? 'Gerando...' : 'Gerar'}
        </button>

        {progresso ? (
          <p className="cr-prog">
            {progresso.estado === 'na_fila'
              ? 'Na fila — muito tráfego agora...'
              : `Imagem ${Math.min(progresso.feito + 1, progresso.total)} de ${progresso.total}`}
          </p>
        ) : (
          <p className="cr-custo">
            {custo} créditos · {quantidade} {quantidade === 1 ? 'imagem' : 'imagens'}
          </p>
        )}
      </div>
    </div>
  );
}
