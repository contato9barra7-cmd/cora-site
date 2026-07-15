'use client';

// ═══════════════════════════════════════════════════════════
//  PainelAnimacao — a aba de animação (Kling), espelho do plugin
//
//  A pessoa escolhe um modelo, sobe a imagem inicial (e opcionalmente a
//  final), descreve o movimento e gera um vídeo. Os campos, limites e nomes
//  acompanham o plugin.
//
//  Só a parte "Kling" nesta versão — as Sequências (Timelapse, Diretor de
//  Narrativa) entram numa próxima rodada.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import PickerImagem from './PickerImagem';
import IconeCredito from './IconeCredito';
import DropdownCora from './DropdownCora';
import { animarKling, custoAnimacao } from '../lib/render';

const MODELOS = [
  { v: 'v2-1', n: 'Kling 2.1' },
  { v: 'v2-5', n: 'Kling 2.5' },
  { v: 'v2-6', n: 'Kling 2.6' },
  { v: 'v3',   n: 'Kling 3.0' }
];

const RESOLUCOES = {
  'v2-1': ['720p', '1080p'],
  'v2-5': ['720p', '1080p'],
  'v2-6': ['720p', '1080p'],
  'v3':   ['720p', '1080p', '4k']
};

const DURACOES = {
  'v2-1': ['5', '10'],
  'v2-5': ['5', '10'],
  'v2-6': ['5', '10'],
  'v3':   ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']
};

const AUDIO_SUP = { 'v2-1': false, 'v2-5': false, 'v2-6': true, 'v3': true };

export default function PainelAnimacao({
  imagemInicial, ehAdmin, onIniciar, onTerminar
}) {
  const [modelo, setModelo]   = useState('');
  const [inicio, setInicio]   = useState(null);   // { base64 }
  const [fim, setFim]         = useState(null);
  const [timelapse, setTimelapse] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState('5');
  const [resolucao, setResolucao] = useState('720p');
  const [audio, setAudio]     = useState(false);
  const [picker, setPicker]   = useState(null);    // 'inicio' | 'fim' | null
  const [pop, setPop]         = useState(null);     // 'dur' | 'res' | null
  const [erro, setErro]       = useState('');

  // Fecha os popovers de opção ao clicar fora deles.
  useEffect(() => {
    if (!pop) return;
    function fora(e) { if (!e.target.closest('.anim-pill-wrap')) setPop(null); }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [pop]);

  // Imagem vinda de outra aba (ex.: "Enviar para Animação").
  useEffect(() => {
    if (imagemInicial && imagemInicial.base64) {
      definirInicio(imagemInicial.base64.replace(/^data:[^,]+,/, ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagemInicial]);

  // Mede a imagem para guardar w/h (a proporção do vídeo segue a inicial).
  function definirInicio(b64) {
    const img = new Image();
    img.onload = () => setInicio({ base64: b64, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setInicio({ base64: b64, w: 0, h: 0 });
    img.src = 'data:image/png;base64,' + b64;
  }
  function definirFim(b64) {
    const img = new Image();
    img.onload = () => setFim({ base64: b64, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setFim({ base64: b64, w: 0, h: 0 });
    img.src = 'data:image/png;base64,' + b64;
  }

  // Ao trocar de modelo, corrige duração/resolução/áudio para o que ele suporta.
  useEffect(() => {
    if (!modelo) return;
    const durs = DURACOES[modelo] || ['5'];
    if (!durs.includes(duracao)) setDuracao(durs[0]);
    const res = RESOLUCOES[modelo] || ['720p'];
    if (!res.includes(resolucao)) setResolucao(res[0]);
    if (!AUDIO_SUP[modelo]) setAudio(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo]);

  const temAudio  = AUDIO_SUP[modelo];

  const custo = custoAnimacao(modelo, resolucao, audio, duracao);

  function inverter() { const a = inicio; setInicio(fim); setFim(a); }
  function copiarParaFim() { if (inicio) setFim({ base64: inicio.base64 }); }
  function copiarParaInicio() { if (fim) setInicio({ base64: fim.base64 }); }

  // A seta entre os cards muda conforme o que já foi preenchido:
  //  - só inicial → seta → que COPIA a inicial para a final
  //  - só final   → seta ← que COPIA a final para a inicial
  //  - as duas    → seta ⇄ que INVERTE as posições
  const SETA_DIR = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12h14" strokeLinecap="round"/><path d="M14 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const SETA_ESQ = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12H6" strokeLinecap="round"/><path d="M10 7l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const SETA_DUPLA = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 4L4 7l3 3" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 7h13a3 3 0 0 1 3 3" strokeLinecap="round"/><path d="M17 20l3-3-3-3" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 17H7a3 3 0 0 1-3-3" strokeLinecap="round"/></svg>;

  let seta = null;
  if (inicio && fim)      seta = { icone: SETA_DUPLA, acao: inverter, tip: 'Inverter início e fim' };
  else if (inicio)        seta = { icone: SETA_DIR, acao: copiarParaFim, tip: 'Copiar imagem inicial para a final' };
  else if (fim)           seta = { icone: SETA_ESQ, acao: copiarParaInicio, tip: 'Copiar imagem final para a inicial' };

  async function gerar() {
    if (!modelo) { setErro('Escolha um modelo primeiro'); return; }
    if (!inicio) { setErro('Suba a imagem inicial primeiro'); return; }
    setErro('');

    const iniB64 = inicio.base64;
    const prop = (inicio.w && inicio.h) ? (inicio.w + ':' + inicio.h) : null;
    const ativoId = onIniciar ? onIniciar('data:image/png;base64,' + iniB64, prop) : null;

    try {
      const r = await animarKling({
        modelo,
        modeloLabel: (MODELOS.find((m) => m.v === modelo) || {}).n,
        imagemInicio: iniB64,
        imagemFim: fim ? fim.base64 : '',
        duracao,
        resolucao,
        descricao,
        timelapse,
        audio: temAudio && audio
      });
      if (!r.url) setErro('Não foi possível gerar a animação');
    } catch (e) {
      setErro(e.message);
    } finally {
      onTerminar && onTerminar(ativoId);
    }
  }

  return (
    <div className="up-painel">

      {/* ── Modelo ── */}
      <section className="up-bloco">
        <div className="cr-sec">Animação</div>
        <label className="up-lbl">Modelo</label>
        <DropdownCora valor={modelo} opcoes={[{ v: '', n: 'Escolher modelo' }, ...MODELOS]} onEscolher={setModelo} />
      </section>

      {/* ── Imagem inicial e final ── */}
      <section className="up-bloco">
        <div className="cr-sec">Imagens</div>
        <div className="anim-refs">
          <button
            className={'anim-card' + (inicio ? ' anim-card--img' : '') + (!inicio ? ' anim-card--obrig' : '')}
            onClick={() => setPicker('inicio')}
          >
            {inicio ? (
              <>
                <img src={'data:image/png;base64,' + inicio.base64} alt="" />
                <span className="anim-card-x" onClick={(e) => { e.stopPropagation(); setInicio(null); }} aria-label="Remover">×</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span className="anim-card-lbl">Imagem inicial</span>
              </>
            )}
          </button>

          {seta && (
            <button className="anim-seta" onClick={seta.acao} title={seta.tip} aria-label={seta.tip}>
              {seta.icone}
            </button>
          )}

          <button
            className={'anim-card' + (fim ? ' anim-card--img' : '')}
            onClick={() => setPicker('fim')}
          >
            {fim ? (
              <>
                <img src={'data:image/png;base64,' + fim.base64} alt="" />
                <span className="anim-card-x" onClick={(e) => { e.stopPropagation(); setFim(null); }} aria-label="Remover">×</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span className="anim-card-lbl">Imagem final</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Modo timelapse ── */}
      <section className="up-bloco">
        <label className="anim-check">
          <input type="checkbox" className="cora-check-bola" checked={timelapse} onChange={(e) => setTimelapse(e.target.checked)} />
          <span>Modo timelapse de obra</span>
        </label>
        <p className="cr-hint">Use apenas para timelapse de obra. Para qualquer outra animação, deixe desligado — a descrição abaixo cria o movimento.</p>
      </section>

      {/* ── Descrição ── */}
      {!timelapse && (
        <section className="up-bloco">
          <div className="cr-sec">Descrição (opcional)</div>
          <textarea
            className="up-textarea"
            rows={4}
            maxLength={2500}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o movimento como falaria com a IA. Ex: a câmera entra pela porta e avança até a sala revelando o ambiente."
            spellCheck={false}
          />
          <p className="anim-contador">{descricao.length}/2500</p>
        </section>
      )}

      {/* ── Opções ── */}
      <section className="up-bloco">
        <div className="cr-sec">Opções</div>
        <div className="anim-pills">
          <div className="anim-pill-wrap">
            <button className="anim-pill" onClick={() => setPop(pop === 'dur' ? null : 'dur')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" strokeLinecap="round"/></svg>
              <span>{duracao}s</span>
            </button>
            {pop === 'dur' && (
              <div className="anim-pop">
                {(DURACOES[modelo] || ['5']).map((d) => (
                  <button key={d} className={d === duracao ? 'sel' : ''} onClick={() => { setDuracao(d); setPop(null); }}>{d}s</button>
                ))}
              </div>
            )}
          </div>

          <div className="anim-pill-wrap">
            <button className="anim-pill" onClick={() => setPop(pop === 'res' ? null : 'res')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
              <span>{resolucao}</span>
            </button>
            {pop === 'res' && (
              <div className="anim-pop">
                {(RESOLUCOES[modelo] || ['720p']).map((r) => (
                  <button key={r} className={r === resolucao ? 'sel' : ''} onClick={() => { setResolucao(r); setPop(null); }}>{r}</button>
                ))}
              </div>
            )}
          </div>

          {temAudio && (
            <button className={'anim-pill' + (audio ? ' anim-pill--on' : '')} onClick={() => setAudio(!audio)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 5L6 9H2v6h4l5 4V5z"/>{audio && <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round"/>}</svg>
              <span>{audio ? 'Áudio ON' : 'Áudio OFF'}</span>
            </button>
          )}
        </div>
      </section>

      {erro && <p className="up-erro">{erro}</p>}

      {/* ── Gerar ── */}
      <button className="cr-btn-gerar up-gerar" onClick={gerar} disabled={!inicio || !modelo}>
        <span>Gerar animação</span>
        {inicio && modelo && custo > 0 && (
          <span className="cr-custo-tag"><IconeCredito /> {custo}</span>
        )}
      </button>

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        titulo={picker === 'fim' ? 'Imagem final' : 'Imagem inicial'}
        onEscolher={(img) => {
          const b64 = (img.base64 || img).replace(/^data:[^,]+,/, '');
          if (picker === 'fim') definirFim(b64);
          else definirInicio(b64);
          setPicker(null);
        }}
      />
    </div>
  );
}
