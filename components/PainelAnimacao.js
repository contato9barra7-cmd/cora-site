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
import Seta from './Seta';
import { animarKling, custoAnimacao, gerarTimelapse, custoTimelapseEtapa, CREDITOS } from '../lib/render';

const CUSTO_TL_PROMPTS = CREDITOS.tlPrompts;

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
  imagemInicial, ehAdmin, nav, onNav, onIniciar, onTerminar
}) {
  // Seção e ferramenta vêm do pai (persistem ao trocar de aba e voltar).
  const secao = (nav && nav.secao) || 'animacao';
  const ferramenta = (nav && nav.ferramenta) || null;
  // Trocar de seção NÃO apaga a ferramenta aberta — ao voltar pra Sequências,
  // ela continua onde estava.
  const setSecao = (s) => onNav && onNav({ secao: s, ferramenta });
  const setFerramenta = (f) => onNav && onNav({ secao: 'sequencias', ferramenta: f });
  // Timelapse Externo
  const [tlBase, setTlBase]   = useState(null);   // { base64, proporcao }
  const [tlRes, setTlRes]     = useState('2k');
  const [tlPopRes, setTlPopRes] = useState(false);
  const [tlEtapas, setTlEtapas] = useState([]);   // plano de etapas (após fase 1)
  const [tlImgs, setTlImgs]   = useState([]);     // base64 gerados, por índice
  const [tlStatus, setTlStatus] = useState('');   // texto de progresso
  const [tlRodando, setTlRodando] = useState(false);
  const [tlErro, setTlErro]   = useState('');
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

  // Fecha o popover de resolução do timelapse ao clicar fora.
  useEffect(() => {
    if (!tlPopRes) return;
    function fora(e) { if (!e.target.closest('.cr-pill-wrap')) setTlPopRes(false); }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [tlPopRes]);

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

  // ── Timelapse Externo: dispara a sequência inteira ──
  async function rodarTimelapse(modo) {
    if (!tlBase) { setTlErro('Suba a imagem base primeiro'); return; }
    setTlErro('');
    setTlRodando(true);
    setTlEtapas([]);
    setTlImgs([]);
    setTlStatus('Planejando a sequência...');
    try {
      await gerarTimelapse(
        {
          image: tlBase.base64,
          tipo: 'externo',
          proporcao: tlBase.proporcao || 'auto',
          resolucao: tlRes
        },
        {
          onEtapas: (etapas) => {
            setTlEtapas(etapas);
            setTlImgs(new Array(etapas.length).fill(null));
          },
          onImagem: (i, b64) => {
            setTlImgs((prev) => {
              const novo = prev.slice();
              novo[i] = b64;
              return novo;
            });
          },
          onStatus: (txt) => {
            if (txt === 'planejando') setTlStatus('Planejando a sequência...');
            else if (txt === 'pronto') setTlStatus('Sequência completa!');
            else if (txt.startsWith('etapa')) setTlStatus('Gerando ' + txt + '...');
          }
        }
      );
    } catch (e) {
      setTlErro(e.message);
      setTlStatus('');
    } finally {
      setTlRodando(false);
    }
  }

  return (
    <div className="up-painel">

      {/* ── Seletor Animação / Sequências (fixo no topo) ── */}
      <div className="anim-seletor">
        <button
          className={'anim-sel-btn' + (secao === 'animacao' ? ' anim-sel-btn--on anim-sel-btn--anim-on' : '')}
          onClick={() => setSecao('animacao')}
        >
          <span className="anim-sel-faixa anim-sel-faixa--anim">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>
          <span className="anim-sel-txt">Animação</span>
        </button>
        <button
          className={'anim-sel-btn' + (secao === 'sequencias' ? ' anim-sel-btn--on anim-sel-btn--seq-on' : '')}
          onClick={() => setSecao('sequencias')}
        >
          <span className="anim-sel-faixa anim-sel-faixa--seq">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>
          </span>
          <span className="anim-sel-txt">Sequências</span>
        </button>
      </div>

      {secao === 'animacao' && (<>

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

      </>)}

      {secao === 'sequencias' && !ferramenta && (
        <section className="up-bloco">
          <div className="cr-sec">Ferramentas</div>
          <div className="seq-cards">
            <button className="seq-card" onClick={() => setFerramenta('tl-externo')}>
              <span className="seq-faixa" style={{ background: '#E6F1FB' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V11l7-5 7 5v10"/><path d="M9 21v-6h6v6"/><path d="M2 11l10-7 10 7"/></svg>
              </span>
              <span className="seq-corpo">
                <strong>Timelapse Externo</strong>
                <span>Gera a sequência de construção (do terreno à obra pronta) a partir de um render externo.</span>
              </span>
            </button>
            <button className="seq-card" onClick={() => {}}>
              <span className="seq-faixa" style={{ background: '#E1F5EE' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M4 21V8h16v13"/><rect x="9" y="13" width="6" height="8"/><path d="M4 8l8-5 8 5"/></svg>
              </span>
              <span className="seq-corpo">
                <strong>Timelapse Interiores</strong>
                <span>Sequência de construção de um ambiente interno.</span>
              </span>
            </button>
            <button className="seq-card" onClick={() => {}}>
              <span className="seq-faixa" style={{ background: '#FAEEDA' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/></svg>
              </span>
              <span className="seq-corpo">
                <strong>Diretor de Narrativa</strong>
                <span>Cria uma sequência de cenas com direção cinematográfica.</span>
              </span>
            </button>
          </div>
        </section>
      )}

      {secao === 'sequencias' && ferramenta === 'tl-externo' && (
        <>
          {/* ── Voltar (igual ao Editar) ── */}
          <button className="cr-voltar ed-voltar" onClick={() => !tlRodando && setFerramenta(null)}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar
          </button>

          <div className="cr-sec" style={{ marginTop: 14 }}>Timelapse Externo</div>
          <p className="seq-hint">Escolha um render externo final. A IA vai gerar a sequência de desconstrução (da obra pronta até o terreno).</p>

          {/* ── Imagem final (mesmo seletor do Render) ── */}
          <section className="up-bloco">
            <div className="cr-sec">Imagem final</div>
            {tlBase ? (
              <div className="cr-base">
                <img src={'data:image/png;base64,' + tlBase.base64} alt="" />
                <button className="cr-base-x" onClick={() => setTlBase(null)} aria-label="Remover imagem">×</button>
              </div>
            ) : (
              <button className="cr-drop" onClick={() => setPicker('tl-base')}>
                <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/>
                  <path d="M3 14l4-4 3.5 3.5L14 9l3.5 3.5"/>
                </svg>
                <span>Escolher imagem</span>
              </button>
            )}
          </section>

          {/* ── Resolução (pill, igual ao Render/plugin, sem título) ── */}
          <div className="cr-pill-wrap" style={{ marginTop: 14 }}>
            <button
              className={'cr-pill-cfg' + (tlPopRes ? ' cr-pill-cfg--on' : '')}
              onClick={(e) => { e.stopPropagation(); setTlPopRes((v) => !v); }}
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="16" height="10" rx="1.5"/><path d="M7 17h6"/>
              </svg>
              <span>{tlRes.toUpperCase()}</span>
              <Seta aberto={tlPopRes} />
            </button>
            {tlPopRes && (
              <div className="cr-pop cr-pop--res" onClick={(e) => e.stopPropagation()}>
                {['1k', '2k', '4k'].map((rk) => (
                  <button
                    key={rk}
                    className={'cr-pop-res' + (tlRes === rk ? ' cr-pop-res--on' : '')}
                    onClick={() => { setTlRes(rk); setTlPopRes(false); }}
                  >{rk.toUpperCase()}</button>
                ))}
              </div>
            )}
          </div>

          {tlErro && <p className="up-erro">{tlErro}</p>}
          {tlStatus && <p className="seq-status">{tlStatus}</p>}

          {/* ── Dois modos de gerar (finos, com aviso abaixo — igual plugin) ── */}
          {!tlRodando && (
            <div className="seq-gerar-box">
              <div className="seq-gerar-item">
                <button className="cr-btn-gerar seq-gerar-fino" onClick={() => rodarTimelapse('completo')} disabled={!tlBase}>
                  <span>Gerar sequência completa</span>
                  {tlBase && <span className="cr-custo-tag"><IconeCredito /> {custoTimelapseEtapa(tlRes)}</span>}
                </button>
                <p className="seq-gerar-aviso">Gera todas as etapas de uma vez. Pode haver leve perda de qualidade ao longo da sequência.</p>
              </div>
              <div className="seq-gerar-item">
                <button className="cr-btn-gerar seq-gerar-fino" onClick={() => rodarTimelapse('passo')} disabled={!tlBase}>
                  <span>Gerar uma a uma</span>
                  {tlBase && <span className="cr-custo-tag"><IconeCredito /> {CUSTO_TL_PROMPTS}</span>}
                </button>
                <p className="seq-gerar-aviso">Gera uma etapa por vez. Você pode revisar e ajustar cada imagem antes de gerar a próxima.</p>
              </div>
            </div>
          )}
          {tlRodando && <p className="seq-status">Gerando... aguarde.</p>}

          {/* ── Grid de resultados ── */}
          {tlEtapas.length > 0 && (
            <div className="seq-grid">
              {tlEtapas.map((et, i) => (
                <div key={i} className="seq-slot">
                  {tlImgs[i]
                    ? <img src={`data:image/png;base64,${tlImgs[i]}`} alt={`Etapa ${i + 1}`} />
                    : <div className="seq-slot-load"><span className="cr-ger-spin" /></div>}
                  <span className="seq-slot-num">{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        titulo={picker === 'tl-base' ? 'Imagem final da obra' : picker === 'fim' ? 'Imagem final' : 'Imagem inicial'}
        onEscolher={(img) => {
          const b64 = (img.base64 || img).replace(/^data:[^,]+,/, '');
          if (picker === 'tl-base') {
            const im = new Image();
            im.onload = () => {
              const prop = (im.naturalWidth && im.naturalHeight) ? (im.naturalWidth + ':' + im.naturalHeight) : 'auto';
              setTlBase({ base64: b64, proporcao: prop });
            };
            im.onerror = () => setTlBase({ base64: b64, proporcao: 'auto' });
            im.src = 'data:image/png;base64,' + b64;
          } else if (picker === 'fim') definirFim(b64);
          else definirInicio(b64);
          setPicker(null);
        }}
      />
    </div>
  );
}
