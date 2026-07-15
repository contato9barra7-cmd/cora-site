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
  const [modelo, setModelo]   = useState('v2-1');
  const [inicio, setInicio]   = useState(null);   // { base64 }
  const [fim, setFim]         = useState(null);
  const [timelapse, setTimelapse] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [duracao, setDuracao] = useState('5');
  const [resolucao, setResolucao] = useState('720p');
  const [audio, setAudio]     = useState(false);
  const [picker, setPicker]   = useState(null);    // 'inicio' | 'fim' | null
  const [erro, setErro]       = useState('');

  // Imagem vinda de outra aba (ex.: "Enviar para Animação").
  useEffect(() => {
    if (imagemInicial && imagemInicial.base64) {
      setInicio({ base64: imagemInicial.base64.replace(/^data:[^,]+,/, '') });
    }
  }, [imagemInicial]);

  // Ao trocar de modelo, corrige duração/resolução/áudio para o que ele suporta.
  useEffect(() => {
    const durs = DURACOES[modelo] || ['5'];
    if (!durs.includes(duracao)) setDuracao(durs[0]);
    const res = RESOLUCOES[modelo] || ['720p'];
    if (!res.includes(resolucao)) setResolucao(res[0]);
    if (!AUDIO_SUP[modelo]) setAudio(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo]);

  const durOpcoes = (DURACOES[modelo] || ['5']).map((d) => ({ v: d, n: d + 's' }));
  const resOpcoes = (RESOLUCOES[modelo] || ['720p']).map((r) => ({ v: r, n: r }));
  const temAudio  = AUDIO_SUP[modelo];

  const custo = custoAnimacao(modelo, resolucao, audio, duracao);

  function inverter() {
    setInicio(fim);
    setFim(inicio);
  }

  async function gerar() {
    if (!inicio) { setErro('Suba a imagem inicial primeiro'); return; }
    setErro('');

    const iniB64 = inicio.base64;
    const ativoId = onIniciar ? onIniciar('data:image/png;base64,' + iniB64) : null;

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
        <DropdownCora valor={modelo} opcoes={MODELOS} onEscolher={setModelo} />
      </section>

      {/* ── Imagem inicial e final ── */}
      <section className="up-bloco">
        <div className="cr-sec">Imagens</div>
        <div className="anim-pares">
          <div className="anim-slot">
            {inicio ? (
              <div className="cr-ref">
                <img src={'data:image/png;base64,' + inicio.base64} alt="" />
                <button className="cr-ref-x" onClick={() => setInicio(null)} aria-label="Remover imagem inicial">×</button>
              </div>
            ) : (
              <button className="cr-ref cr-ref--add" onClick={() => setPicker('inicio')}>
                <span className="cr-ref-mais">+</span>
              </button>
            )}
            <span className="anim-slot-lbl">Imagem inicial</span>
          </div>

          {inicio && fim && (
            <button className="anim-inverter" onClick={inverter} title="Inverter início e fim" aria-label="Inverter início e fim">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4l-3 3 3 3M4 7h13M17 20l3-3-3-3M20 17H7" />
              </svg>
            </button>
          )}

          <div className="anim-slot">
            {fim ? (
              <div className="cr-ref">
                <img src={'data:image/png;base64,' + fim.base64} alt="" />
                <button className="cr-ref-x" onClick={() => setFim(null)} aria-label="Remover imagem final">×</button>
              </div>
            ) : (
              <button className="cr-ref cr-ref--add" onClick={() => setPicker('fim')}>
                <span className="cr-ref-mais">+</span>
              </button>
            )}
            <span className="anim-slot-lbl">Imagem final</span>
          </div>
        </div>
      </section>

      {/* ── Modo timelapse ── */}
      <section className="up-bloco">
        <label className="anim-check">
          <input type="checkbox" checked={timelapse} onChange={(e) => setTimelapse(e.target.checked)} />
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
        <div className="anim-opcoes">
          <div className="anim-op">
            <label className="up-lbl">Duração</label>
            <DropdownCora valor={duracao} opcoes={durOpcoes} onEscolher={setDuracao} />
          </div>
          <div className="anim-op">
            <label className="up-lbl">Resolução</label>
            <DropdownCora valor={resolucao} opcoes={resOpcoes} onEscolher={setResolucao} />
          </div>
        </div>
        {temAudio && (
          <label className="anim-check" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} />
            <span>Áudio</span>
          </label>
        )}
      </section>

      {erro && <p className="up-erro">{erro}</p>}

      {/* ── Gerar ── */}
      <button className="cr-btn-gerar up-gerar" onClick={gerar} disabled={!inicio}>
        <span>Gerar animação</span>
        {inicio && custo > 0 && (
          <span className="cr-custo-tag"><IconeCredito /> {custo}</span>
        )}
      </button>

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        titulo={picker === 'fim' ? 'Imagem final' : 'Imagem inicial'}
        onEscolher={(img) => {
          const b64 = (img.base64 || img).replace(/^data:[^,]+,/, '');
          if (picker === 'fim') setFim({ base64: b64 });
          else setInicio({ base64: b64 });
          setPicker(null);
        }}
      />
    </div>
  );
}
