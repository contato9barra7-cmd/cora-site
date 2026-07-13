'use client';

// ═══════════════════════════════════════════════════════════
//  PainelAnalises — a aba Análises
//
//  Toda leitura de materiais custa créditos: 15 na aba Render, 8 por cena
//  no Batch. Sem um lugar para guardá-las, fechar o navegador significa
//  pagar de novo pelo mesmo trabalho.
//
//  Aqui ficam todas — do Render e do Batch. A pessoa reabre, copia, ou
//  manda direto para a aba Render como ponto de partida.
//
//  A thumb é o que torna a lista navegável: sem ela seria uma pilha de
//  textos parecidos, e ninguém saberia qual é qual.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { listarLeituras, apagarLeitura, bytesDaLeitura } from '../lib/leituras';
import { bytesDaGeracao } from '../lib/geracoes';

function quando(iso) {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d) / 60000);
  if (min < 1)    return 'agora';
  if (min < 60)   return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 30)  return `${dias} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function PainelAnalises({ onUsar }) {
  const [itens, setItens]       = useState([]);
  const [carregando, setCarreg] = useState(true);
  const [busca, setBusca]       = useState('');
  // Dois níveis: DE ONDE veio (web | plugin) e QUAL ferramenta (render | batch)
  const [plataforma, setPlataforma] = useState('todas');  // todas | web | plugin
  const [filtro, setFiltro]         = useState('todas');  // todas | render | batch
  const [aberta, setAberta]     = useState(null);      // a leitura expandida
  const [apagando, setApagando] = useState(null);
  const [copiada, setCopiada]   = useState(null);
  const [levando, setLevando]   = useState(null);

  // ── Levar a leitura para um painel, com a imagem junto ──
  //
  //  Só o texto não basta: a pessoa teria que reencontrar a imagem à mão.
  //  Quando a leitura veio de uma geração, buscamos os bytes dela (o R2 não
  //  manda CORS, então quem lê é o servidor).
  //
  //  Quando foi um upload solto, temos só a miniatura — pequena demais para
  //  gerar. Aí mandamos o texto e a pessoa escolhe a imagem.
  async function usar(l, destino) {
    setLevando(l.id);

    try {
      // A imagem pode estar em dois lugares:
      //
      //   - é uma GERAÇÃO      -> os bytes vêm de /geracoes/:id/base64
      //   - nós a guardamos    -> vêm de /leituras/:id/imagem
      //
      // Nos dois casos quem lê do R2 é o servidor: o navegador não consegue
      // (o R2 não manda CORS, e um fetch() na URL assinada morre).
      let base64 = null;

      if (l.geracaoId) {
        base64 = await bytesDaGeracao(l.geracaoId);
      } else if (l.temImagem) {
        base64 = await bytesDaLeitura(l.id);
      }

      onUsar({
        materiais: l.materiais,
        base64,                    // null quando não há imagem guardada
        previa: l.thumb || null,
        destino
      });

    } catch {
      // Não deu para buscar a imagem? Leva o texto assim mesmo — é ele que
      // custou créditos.
      onUsar({ materiais: l.materiais, base64: null, previa: null, destino });
    } finally {
      setLevando(null);
    }
  }

  useEffect(() => {
    let vivo = true;

    listarLeituras(100)
      .then((l) => { if (vivo) { setItens(l); setCarreg(false); } })
      .catch(() => { if (vivo) setCarreg(false); });

    return () => { vivo = false; };
  }, []);

  const filtrados = itens
    .filter((i) => plataforma === 'todas' || (i.plataforma || 'web') === plataforma)
    .filter((i) => filtro === 'todas' || i.origem === filtro)
    .filter((i) => {
      if (!busca.trim()) return true;
      const t = busca.toLowerCase();
      return (i.materiais || '').toLowerCase().includes(t)
          || (i.titulo || '').toLowerCase().includes(t);
    });

  async function apagar(e, id) {
    e.stopPropagation();
    setApagando(id);
    try {
      await apagarLeitura(id);
      setItens((l) => l.filter((i) => i.id !== id));
      if (aberta === id) setAberta(null);
    } catch {
      // Não apagou: deixa como está. Não vale um alerta por isso.
    } finally {
      setApagando(null);
    }
  }

  async function copiar(e, l) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(l.materiais);
      setCopiada(l.id);
      setTimeout(() => setCopiada(null), 1600);
    } catch {
      // Sem clipboard (contexto inseguro): a pessoa seleciona à mão.
    }
  }

  return (
    <div className="cr-form">

      <div className="cr-sec">Análises de materiais</div>
      <p className="cr-hint cr-hint--topo">
        Cada leitura custou créditos. Aqui elas ficam guardadas — reaproveite
        em vez de pagar de novo.
      </p>

      <input
        className="an-busca"
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar nos materiais..."
        spellCheck={false}
      />

      {/* De onde veio: a web ou o plugin do SketchUp */}
      <div className="cr-g3 an-filtros">
        {[
          { v: 'todas',  r: 'Todas' },
          { v: 'web',    r: 'Web' },
          { v: 'plugin', r: 'Plugin' }
        ].map((f) => (
          <button
            key={f.v}
            className={'cr-b' + (plataforma === f.v ? ' cr-b--on' : '')}
            onClick={() => setPlataforma(f.v)}
          >{f.r}</button>
        ))}
      </div>

      {/* Qual ferramenta gerou a leitura */}
      <div className="cr-g3 an-filtros an-filtros--sub">
        {[
          { v: 'todas',  r: 'Todas' },
          { v: 'render', r: 'Render' },
          { v: 'batch',  r: 'Batch' }
        ].map((f) => (
          <button
            key={f.v}
            className={'cr-b' + (filtro === f.v ? ' cr-b--on' : '')}
            onClick={() => setFiltro(f.v)}
          >{f.r}</button>
        ))}
      </div>

      {carregando && <p className="cr-msg">Carregando...</p>}

      {!carregando && filtrados.length === 0 && (
        <div className="an-vazio">
          <p>
            {busca || filtro !== 'todas' || plataforma !== 'todas'
              ? 'Nenhuma leitura corresponde a esse filtro.'
              : 'Nenhuma leitura ainda. As que você fizer aqui e no plugin aparecem nesta aba.'}
          </p>
        </div>
      )}

      {!carregando && filtrados.map((l) => {
        const expandida = aberta === l.id;

        return (
          <div key={l.id} className={'an-item' + (expandida ? ' an-item--on' : '')}>
            <button
              className="an-cab"
              onClick={() => setAberta(expandida ? null : l.id)}
            >
              {l.thumb
                ? <img src={l.thumb} alt="" className="an-thumb" />
                : <span className="an-thumb an-thumb--vazia" />}

              <span className="an-txt">
                <span className="an-topo">
                  <span className="an-tit">{l.titulo || 'Sem título'}</span>
                  <span className="an-tag">{l.origem === 'batch' ? 'Batch' : 'Render'}</span>
                  <span className={'an-tag an-tag--' + (l.plataforma || 'web')}>
                    {(l.plataforma || 'web') === 'plugin' ? 'Plugin' : 'Web'}
                  </span>
                </span>
                <span className="an-quando">{quando(l.criadoEm)}</span>
                {!expandida && <span className="an-prev">{l.materiais}</span>}
              </span>

              <span className={'an-seta' + (expandida ? ' an-seta--on' : '')}>
                <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>

            {expandida && (
              <div className="an-corpo">
                <div className="an-materiais">{l.materiais}</div>

                <div className="an-acoes">
                  <button className="cr-b" onClick={(e) => copiar(e, l)}>
                    {copiada === l.id ? 'Copiado' : 'Copiar'}
                  </button>

                  {/* Só o caminho que faz sentido: uma leitura de batch
                      descreve uma CENA de um conjunto; uma de render descreve
                      a imagem inteira. Oferecer os dois confundiria. */}
                  <button
                    className="cr-b-conf"
                    onClick={() => usar(l, l.origem === 'batch' ? 'batch' : 'render')}
                    disabled={levando === l.id}
                  >
                    {levando === l.id
                      ? 'Levando...'
                      : l.origem === 'batch' ? 'Usar no Batch' : 'Usar no Render'}
                  </button>

                  <button
                    className="an-lixo"
                    onClick={(e) => apagar(e, l.id)}
                    aria-label="Apagar leitura"
                  >
                    {apagando === l.id ? '...' : (
                      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3.5 5.5h13M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5" strokeLinecap="round"/>
                        <path d="M5.5 5.5l.7 10a1.5 1.5 0 001.5 1.4h4.6a1.5 1.5 0 001.5-1.4l.7-10" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!carregando && itens.length > 0 && (
        <p className="an-pe">As leituras ficam guardadas por 90 dias.</p>
      )}
    </div>
  );
}
