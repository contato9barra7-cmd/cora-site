'use client';

// ═══════════════════════════════════════════════════════════
//  PainelPos — a Pós-produção
//
//  Ao contrário das outras abas, esta NÃO é um painel de 380px: ela toma a
//  janela inteira. Um editor de camadas espremido numa coluna estreita seria
//  inútil — a tela é o instrumento.
//
//  Três partes, como no plugin:
//    topbar   — abrir, camada, crop | ferramentas | salvar, upscale, baixar
//    tela     — o canvas, com zoom e pan
//    coluna   — mesclagem, opacidade e a pilha de camadas
//
//  As ferramentas de seleção e pincel entram na Fase 4; aqui elas já aparecem
//  na barra (para a barra não mudar de forma depois), mas ainda não pintam.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import PickerImagem from './PickerImagem';
import Dica from './Dica';
import JanelaAjustes from './JanelaAjustes';
import {
  carregarCanvas, canvasVazio, clonarCanvas, novaCamada, novoGrupo,
  compor, thumb, thumbMascara, mascaraBranca, rasterizar, mesclarCopia,
  exportar, BLENDS
} from '../lib/pos';

// Os ícones são os do plugin (posIconeSVG) — quem usa os dois reconhece.
const IC = {
  mover:    'M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3',
  pincel:   'M20.5 3.5c-1 0-3 1-6 3.5C10 11 6.5 14.5 6.5 14.5l3 3s3.5-3.5 7.5-8c2.5-3 3.5-5 3.5-6z|M6.5 14.5c-2 0-3.5 1-4 3-.3 1.3-.5 2.8-2 3.2 1.5 1 4 1.3 5.5 1 2-.4 3.5-2 4-4z',
  borracha: 'M7 21h13|M5.5 16.5L13 9l5 5-5 5H8z|M11 7l5 5',
  varinha:  'M15 4l5 5M6 21l9-9M9 6l1-2 2 1-1 2zM18 11l2-1-1-2-2 1z',
  desfoque: 'M12 3c-3 4-6 7-6 10a6 6 0 0 0 12 0c0-3-3-6-6-10z',
  laco:     'M4 11c0-4 4-7 8-7s7 3 7 6-3 6-7 6c-2 0-3 1-3 2s1 2 2 2',
  crop:     'M6 2v14a2 2 0 0 0 2 2h14|M2 6h14a2 2 0 0 1 2 2v14',
  baixar:   'M12 3v12M7 10l5 5 5-5M5 21h14',
  teclado:  'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6',
  mais:     'M12 6v12M6 12h12',
  volta:    'M12 4l-5 6 5 6'
};

// Um SVG com os paths separados por "|"
const Svg = ({ d, extra }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
    {extra}
  </svg>
);

// As ferramentas da barra. `tri` marca as que têm mais de uma opção — o
// triângulo no canto, como no plugin.
const FERRAMENTAS = [
  { id: 'mover',    nome: 'Mover',                 d: IC.mover },
  { id: 'letreiro', nome: 'Letreiro',              tri: true,
    svg: <rect x="3" y="4" width="18" height="16" strokeDasharray="3 2"/> },
  { id: 'laco',     nome: 'Laço',                  d: IC.laco, tri: true, tracejado: true },
  { id: 'varinha',  nome: 'Seleção inteligente',   d: IC.varinha, tri: true },
  { id: 'pincel',   nome: 'Pincel',                d: IC.pincel },
  { id: 'borracha', nome: 'Borracha',              d: IC.borracha },
  { id: 'desfoque', nome: 'Desfoque',              d: IC.desfoque, tri: true }
];

export default function PainelPos({ aoSair, aoUpscale }) {
  // ── A pilha ──
  // A ordem é de CIMA para baixo, como na coluna. camadas[0] é a do topo.
  const [camadas, setCamadas] = useState([]);
  const [sel, setSel]         = useState([]);     // ids selecionados
  const [alvoMasc, setAlvo]   = useState(null);   // qual camada está com a máscara escolhida

  // A tela tem o tamanho da PRIMEIRA imagem aberta. As outras entram como
  // camadas sobre ela, e podem ser maiores — sobram para fora, como no PS.
  const [med, setMed] = useState(null);           // { w, h }

  const [ferr, setFerr]   = useState('mover');
  const [picker, setPicker] = useState(null);     // 'nova' | 'camada' | null
  const [zoom, setZoom]   = useState(1);
  const [pan, setPan]     = useState({ x: 0, y: 0 });
  const [ajustando, setAjustando] = useState(false);
  const [erro, setErro]   = useState('');
  const [ocupado, setOcupado] = useState(false);

  const telaRef  = useRef(null);
  const canvasRef = useRef(null);
  const arquivoRef = useRef(null);

  const ativa = camadas.find((l) => l.id === sel[0]) || null;
  const temImagem = camadas.length > 0;

  // ── Compor ──
  // Toda mudança na pilha redesenha o canvas. É o coração: as camadas são o
  // estado, e o canvas é só o que se vê delas.
  useEffect(() => {
    if (!med || !canvasRef.current) return;
    compor(camadas, med.w, med.h, canvasRef.current);
  }, [camadas, med]);

  // ── Abrir ──
  const abrir = useCallback(async (src, nome, comoCamada) => {
    setErro('');
    setOcupado(true);
    try {
      const c = await carregarCanvas(src);

      if (!comoCamada || !med) {
        // A primeira: define o tamanho da tela e zera tudo
        setMed({ w: c.width, h: c.height });
        const l = novaCamada(c, nome || 'Imagem');
        setCamadas([l]);
        setSel([l.id]);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else {
        // Uma camada nova, no topo
        const l = novaCamada(c, nome || `Camada ${camadas.length + 1}`);
        setCamadas((cs) => [l, ...cs]);
        setSel([l.id]);
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }, [med, camadas.length]);

  function escolheuDoPicker({ base64, previa }) {
    const src = previa || ('data:image/png;base64,' + base64);
    abrir(src, null, picker === 'camada');
    setPicker(null);
  }

  function escolheuArquivo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => abrir(r.result, f.name.replace(/\.[^.]+$/, ''), temImagem);
    r.readAsDataURL(f);
    e.target.value = '';
  }

  // ── Mexer numa camada ──
  const mudar = useCallback((id, campos) => {
    setCamadas((cs) => cs.map((l) => (l.id === id ? { ...l, ...campos } : l)));
  }, []);

  function selecionar(id, e) {
    if (e?.shiftKey || e?.metaKey || e?.ctrlKey) {
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setSel([id]);
      setAlvo(null);
    }
  }

  // ── As ações da coluna ──

  function novaVazia() {
    if (!med) return;
    const l = novaCamada(canvasVazio(med.w, med.h), `Camada ${camadas.length + 1}`);
    setCamadas((cs) => [l, ...cs]);
    setSel([l.id]);
  }

  function toggleMascara() {
    if (!ativa || ativa.tipo === 'grupo') return;

    if (ativa.mascara) {
      mudar(ativa.id, { mascara: null });
      if (alvoMasc === ativa.id) setAlvo(null);
    } else {
      mudar(ativa.id, { mascara: mascaraBranca(ativa.canvas.width, ativa.canvas.height) });
      setAlvo(ativa.id);
    }
  }

  function agrupar() {
    if (sel.length < 1) return;

    const g = novoGrupo('Grupo');
    // O grupo entra ONDE estava a primeira selecionada — não no topo. Assim a
    // pilha não se reordena sozinha debaixo da pessoa.
    const i = camadas.findIndex((l) => l.id === sel[0]);

    setCamadas((cs) => {
      const dentro = cs.filter((l) => sel.includes(l.id) && l.tipo !== 'grupo')
                       .map((l) => ({ ...l, grupo: g.id }));
      const fora   = cs.filter((l) => !sel.includes(l.id) || l.tipo === 'grupo');

      const antes  = fora.slice(0, i);
      const depois = fora.slice(i);
      return [...antes, g, ...dentro, ...depois];
    });

    setSel([g.id]);
  }

  function duplicar() {
    if (!ativa) return;
    if (ativa.tipo === 'grupo') return;

    const l = novaCamada(clonarCanvas(ativa.canvas), ativa.nome + ' cópia', {
      x: ativa.x, y: ativa.y,
      escala: ativa.escala, escalaY: ativa.escalaY,
      blend: ativa.blend, opacidade: ativa.opacidade,
      mascara: ativa.mascara ? clonarCanvas(ativa.mascara) : null,
      grupo: ativa.grupo
    });

    const i = camadas.findIndex((x) => x.id === ativa.id);
    setCamadas((cs) => [...cs.slice(0, i), l, ...cs.slice(i)]);
    setSel([l.id]);
  }

  function excluir() {
    if (!sel.length) return;

    setCamadas((cs) => {
      // Excluir um grupo leva os filhos junto — é o que se espera dele.
      const gruposMortos = cs.filter((l) => sel.includes(l.id) && l.tipo === 'grupo')
                             .map((l) => l.id);
      return cs.filter((l) => !sel.includes(l.id) && !gruposMortos.includes(l.grupo));
    });

    setSel([]);
    setAlvo(null);
  }

  function rasterizarAtiva() {
    if (!ativa || !med || ativa.tipo === 'grupo') return;
    const nova = rasterizar(ativa, med.w, med.h);
    setCamadas((cs) => cs.map((l) => (l.id === ativa.id ? nova : l)));
    setSel([nova.id]);
  }

  function mesclar() {
    if (!camadas.length || !med) return;
    const l = mesclarCopia(camadas, med.w, med.h);
    setCamadas((cs) => [l, ...cs]);
    setSel([l.id]);
  }

  // ── Reordenar ──
  // Arrastar move a camada na pilha. Sem biblioteca: o índice de origem e o
  // de destino bastam.
  const arrastando = useRef(null);

  function soltar(destino) {
    const origem = arrastando.current;
    arrastando.current = null;
    if (origem == null || origem === destino) return;

    setCamadas((cs) => {
      const c = [...cs];
      const [l] = c.splice(origem, 1);
      c.splice(destino, 0, l);
      return c;
    });
  }

  // ── Zoom e pan ──
  useEffect(() => {
    const el = telaRef.current;
    if (!el) return;

    const rolar = (e) => {
      e.preventDefault();
      const d = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom((z) => Math.min(8, Math.max(0.05, z * d)));
    };

    // Botão do meio arrasta a tela — o mesmo gesto do plugin
    let mov = false, ini = null;
    const desce = (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      mov = true;
      ini = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };
    const move = (e) => {
      if (!mov) return;
      setPan({ x: e.clientX - ini.x, y: e.clientY - ini.y });
    };
    const sobe = () => { mov = false; };

    el.addEventListener('wheel', rolar, { passive: false });
    el.addEventListener('mousedown', desce);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', sobe);

    return () => {
      el.removeEventListener('wheel', rolar);
      el.removeEventListener('mousedown', desce);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', sobe);
    };
  }, [pan]);

  // ── Sair ──
  function baixar() {
    if (!med) return;
    const a = document.createElement('a');
    a.download = 'cora-pos.png';
    a.href = exportar(camadas, med.w, med.h);
    a.click();
  }

  function paraUpscale() {
    if (!med || !aoUpscale) return;
    aoUpscale(exportar(camadas, med.w, med.h));
  }

  return (
    <section className="ps">

      {/* ══ A topbar ══ */}
      <header className="ps-top">
        <button className="ps-b" onClick={aoSair}>
          <Svg d={IC.volta} /> Voltar
        </button>
        <button
          className="ps-b ps-b--on"
          onClick={() => setPicker('nova')}
          disabled={ocupado}
        >Abrir imagem</button>

        <Dica texto="Adicionar camada">
          <button
            className="ps-ic"
            onClick={() => setPicker('camada')}
            disabled={!temImagem}
            aria-label="Adicionar camada"
          ><Svg d={IC.mais} /></button>
        </Dica>

        <Dica texto="Cortar">
          <button
            className="ps-ic"
            disabled={!temImagem}
            aria-label="Cortar"
          ><Svg d={IC.crop} /></button>
        </Dica>

        <span className="ps-sep" />

        {FERRAMENTAS.map((f) => (
          <Dica key={f.id} texto={f.nome}>
          <button
            className={'ps-ic' + (ferr === f.id ? ' ps-ic--on' : '')}
            onClick={() => setFerr(f.id)}
            disabled={!temImagem}
            aria-label={f.nome}
          >
            {f.svg ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                   strokeLinecap="round" strokeLinejoin="round">{f.svg}</svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                   strokeLinecap="round" strokeLinejoin="round">
                {f.d.split('|').map((p, i) => (
                  <path key={i} d={p} strokeDasharray={f.tracejado ? '3 2' : undefined} />
                ))}
              </svg>
            )}
            {f.tri && <span className="ps-tri" />}
          </button>
          </Dica>
        ))}

        <span className="ps-esticar" />

        <Dica texto="Atalhos de teclado">
          <button className="ps-ic" aria-label="Atalhos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                 strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <path d={IC.teclado} />
            </svg>
          </button>
        </Dica>
        <button className="ps-b" onClick={mesclar} disabled={!temImagem}>
          Salvar no Histórico
        </button>
        <button className="ps-b" onClick={paraUpscale} disabled={!temImagem}>
          Fazer upscale
        </button>

        <Dica texto="Baixar">
          <button
            className="ps-ic"
            onClick={baixar}
            disabled={!temImagem}
            aria-label="Baixar"
          ><Svg d={IC.baixar} /></button>
        </Dica>
      </header>

      <div className="ps-main">

        {/* ══ A tela ══ */}
        <div className="ps-tela" ref={telaRef}>

          {!temImagem ? (
            <div className="ps-vazio">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <p>Abra uma imagem do Histórico, dos Favoritos ou do seu computador para começar a pós-produção.</p>
              <button className="ps-b ps-b--on" onClick={() => setPicker('nova')}>
                Abrir imagem
              </button>
            </div>
          ) : (
            <div
              className="ps-folha"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
              }}
            >
              <canvas ref={canvasRef} />
            </div>
          )}

          {erro && <div className="ps-erro">{erro}</div>}

          {temImagem && (
            <Dica texto="Voltar a 100%" lado="cima">
              <button
                className="ps-zoom"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              >{Math.round(zoom * 100)}%</button>
            </Dica>
          )}
        </div>

        {/* ══ A coluna ══ */}
        <aside className="ps-col">

          <div className="ps-bloco">
            <button
              className="ps-b ps-b--on ps-b--largo"
              onClick={() => setAjustando(true)}
              disabled={!ativa || ativa.tipo === 'grupo'}
            >Ajustes</button>
          </div>

          {ativa && (
            <div className="ps-bloco">
              <div className="cr-sec ps-sec">Camada</div>

              <div className="ps-linha">
                <label>Mesclagem</label>
                <select
                  className="ps-sel"
                  value={ativa.blend}
                  onChange={(e) => mudar(ativa.id, { blend: e.target.value })}
                >
                  {BLENDS.map((b) => (
                    <option key={b.val} value={b.val}>{b.rotulo}</option>
                  ))}
                </select>
              </div>

              <div className="ps-linha">
                <label>Opacidade</label>
                <input
                  type="range" min="0" max="100"
                  value={ativa.opacidade}
                  onChange={(e) => mudar(ativa.id, { opacidade: +e.target.value })}
                  aria-label="Opacidade"
                />
                <span className="ps-val">{ativa.opacidade}%</span>
              </div>
            </div>
          )}

          <div className="ps-cab">
            <span className="cr-sec ps-sec">Camadas</span>

            <Dica texto={ativa?.mascara ? 'Remover máscara' : 'Adicionar máscara'}>
              <button
                className="ps-mini"
                onClick={toggleMascara}
                disabled={!ativa || ativa.tipo === 'grupo'}
                aria-label="Máscara"
              >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
              </svg>
              </button>
            </Dica>

            <Dica texto="Nova camada vazia">
              <button
                className="ps-mini"
                onClick={novaVazia}
                disabled={!temImagem}
                aria-label="Nova camada"
              >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
              </button>
            </Dica>

            <Dica texto="Duplicar camada">
              <button
                className="ps-mini"
                onClick={duplicar}
                disabled={!ativa || ativa.tipo === 'grupo'}
                aria-label="Duplicar"
              >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="8" y="8" width="12" height="12" rx="2"/>
                <path d="M4 16V6a2 2 0 012-2h10"/>
              </svg>
              </button>
            </Dica>

            <Dica texto="Agrupar selecionadas">
              <button
                className="ps-mini"
                onClick={agrupar}
                disabled={!sel.length}
                aria-label="Agrupar"
              >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              </button>
            </Dica>

            <Dica texto="Excluir">
              <button
                className="ps-mini ps-mini--perigo"
                onClick={excluir}
                disabled={!sel.length}
                aria-label="Excluir"
              >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>
              </svg>
              </button>
            </Dica>
          </div>

          <div className="ps-camadas">
            {camadas.map((l, i) => {
              const marcada = sel.includes(l.id);
              const naMasc  = alvoMasc === l.id;

              return (
                <div
                  key={l.id}
                  className={'ps-cam'
                    + (marcada ? ' ps-cam--on' : '')
                    + (l.grupo ? ' ps-cam--dentro' : '')
                    + (!l.visivel ? ' ps-cam--off' : '')}
                  onClick={(e) => selecionar(l.id, e)}
                  draggable
                  onDragStart={() => { arrastando.current = i; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => soltar(i)}
                >
                  <button
                    className="ps-olho"
                    onClick={(e) => { e.stopPropagation(); mudar(l.id, { visivel: !l.visivel }); }}
                    aria-label={l.visivel ? 'Ocultar' : 'Mostrar'}
                  >
                    {l.visivel ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M4 4l16 16" strokeLinecap="round"/>
                        <path d="M9.5 5.4A9.6 9.6 0 0112 5c6.5 0 10 6 10 6a15 15 0 01-3.1 3.6M6.6 6.7A15 15 0 002 11s3.5 6 10 6c1 0 2-.15 2.9-.42"/>
                      </svg>
                    )}
                  </button>

                  {l.tipo === 'grupo' ? (
                    <span className="ps-pasta">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                    </span>
                  ) : (
                    <>
                      <span
                        className={'ps-thumb' + (marcada && !naMasc ? ' ps-thumb--sel' : '')}
                        style={{ backgroundImage: `url(${thumb(l)})` }}
                        onClick={(e) => { e.stopPropagation(); setSel([l.id]); setAlvo(null); }}
                      />

                      {l.mascara && (
                        <span
                          className={'ps-thumb ps-thumb--masc' + (naMasc ? ' ps-thumb--sel' : '')}
                          style={{ backgroundImage: `url(${thumbMascara(l)})` }}
                          onClick={(e) => { e.stopPropagation(); setSel([l.id]); setAlvo(l.id); }}
                        />
                      )}
                    </>
                  )}

                  <span className="ps-nome">{l.nome}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <input
        type="file"
        ref={arquivoRef}
        accept="image/*"
        onChange={escolheuArquivo}
        style={{ display: 'none' }}
      />

      {/* A janela de Ajustes. Ela recebe a camada ATIVA e devolve o canvas já
          processado — os ajustes ficam guardados nela para poder reabrir e
          continuar de onde parou. */}
      {ajustando && ativa && (
        <JanelaAjustes
          camada={{ ...ativa, canvas: ativa.original || ativa.canvas }}
          aoFechar={() => setAjustando(false)}
          aoAplicar={(canvas, params) => {
            // `original` guarda o pixel VIRGEM. Sem ele, reabrir os Ajustes
            // partiria da imagem já processada e os efeitos se empilhariam:
            // duas passadas de contraste 50 não são um contraste 50 — são um
            // contraste 100 mal feito, e não haveria como voltar.
            mudar(ativa.id, {
              canvas,
              original: ativa.original || ativa.canvas,
              ajustes: params
            });
            setAjustando(false);
          }}
        />
      )}

      <PickerImagem
        aberto={picker !== null}
        onFechar={() => setPicker(null)}
        onEscolher={escolheuDoPicker}
        titulo={picker === 'camada' ? 'Adicionar camada' : 'Abrir imagem'}
      />
    </section>
  );
}
