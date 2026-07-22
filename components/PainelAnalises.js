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
import { listarLeituras, apagarLeitura, bytesDaLeitura, refsDaLeitura } from '../lib/leituras';
import { bytesDaGeracao } from '../lib/geracoes';
import { useIdioma, localeDeIdioma } from '../lib/i18n';

function quando(iso, t, idioma) {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d) / 60000);
  if (min < 1)    return t('painelanalises_agora');
  if (min < 60)   return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return t('painelanalises_ontem');
  if (dias < 30)  return `${dias} ${t('painelanalises_dias')}`;
  return d.toLocaleDateString(localeDeIdioma(idioma), { day: '2-digit', month: 'short' });
}

// Um dropdown. O rótulo fica sempre à vista ("Origem", "Aba") e o valor
// escolhido ao lado — assim a pessoa não precisa abrir para lembrar o que
// aquele campo filtra.
function Escolha({ rotulo, valor, opcoes, onMudar, aberto, onAbrir }) {
  const atual = opcoes.find((o) => o.v === valor) || opcoes[0];

  return (
    <div className="an-esc">
      <button className={'an-esc-b' + (aberto ? ' an-esc-b--on' : '')} onClick={onAbrir}>
        <span className="an-esc-rot">{rotulo}</span>
        <span className="an-esc-val">{atual.r}</span>
        <svg
          className={'an-esc-seta' + (aberto ? ' an-esc-seta--on' : '')}
          viewBox="0 0 20 20" width="12" height="12"
          fill="none" stroke="currentColor" strokeWidth="1.6"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {aberto && (
        <div className="an-esc-menu">
          {opcoes.map((o) => (
            <button
              key={o.v}
              className={'an-esc-op' + (o.v === valor ? ' an-esc-op--on' : '')}
              onClick={() => { onMudar(o.v); onAbrir(); }}
            >
              {o.r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PainelAnalises({ onUsar }) {
  const { t, idioma } = useIdioma();
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
  const [menuAberto, setMenuAberto] = useState(null);   // 'plataforma' | 'filtro'

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
      // A imagem lida e as REFERÊNCIAS de estilo vêm juntas: a análise foi
      // feita cruzando as duas, e reaproveitar sem as refs traria a cena mas
      // não o estilo — a geração sairia diferente.
      const [base64, refs] = await Promise.all([
        l.geracaoId ? bytesDaGeracao(l.geracaoId)
          : l.temImagem ? bytesDaLeitura(l.id)
          : Promise.resolve(null),

        l.qtdRefs > 0 ? refsDaLeitura(l.id) : Promise.resolve([])
      ]);

      onUsar({
        materiais: l.materiais,
        base64,                    // null quando não há imagem guardada
        previa: l.thumb || null,
        refs,                      // o estilo que a análise usou
        destino
      });

    } catch {
      // Não deu para buscar a imagem? Leva o texto assim mesmo — é ele que
      // custou créditos.
      onUsar({ materiais: l.materiais, base64: null, previa: null, refs: [], destino });
    } finally {
      setLevando(null);
    }
  }

  useEffect(() => {
    let vivo = true;

    // 30, não 100: o servidor assina uma URL do R2 para CADA miniatura antes
    // de responder. Com 100, a aba demorava a abrir. 30 enche a tela.
    listarLeituras(30)
      .then((l) => { if (vivo) { setItens(l); setCarreg(false); } })
      .catch(() => { if (vivo) setCarreg(false); });

    return () => { vivo = false; };
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!menuAberto) return;
    const fora = (e) => { if (!e.target.closest('.an-esc')) setMenuAberto(null); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [menuAberto]);

  const filtrados = itens
    .filter((i) => plataforma === 'todas' || (i.plataforma || 'web') === plataforma)
    .filter((i) => filtro === 'todas' || i.origem === filtro)
    .filter((i) => {
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return (i.materiais || '').toLowerCase().includes(q)
          || (i.titulo || '').toLowerCase().includes(q);
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

      <div className="cr-sec">{t('painelanalises_titulo')}</div>
      <p className="cr-hint cr-hint--topo">
        {t('painelanalises_intro')}
      </p>

      <input
        className="an-busca"
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={t('painelanalises_ph_busca')}
        spellCheck={false}
      />

      {/* Dois dropdowns: DE ONDE veio a leitura, e QUAL aba a gerou. */}
      <div className="an-filtros">
        <Escolha
          rotulo={t('painelanalises_rot_origem')}
          valor={plataforma}
          onMudar={setPlataforma}
          aberto={menuAberto === 'plataforma'}
          onAbrir={() => setMenuAberto(menuAberto === 'plataforma' ? null : 'plataforma')}
          opcoes={[
            { v: 'todas',  r: t('painelanalises_todas') },
            { v: 'web',    r: 'Web' },
            { v: 'plugin', r: 'Plugin' }
          ]}
        />

        <Escolha
          rotulo={t('painelanalises_rot_aba')}
          valor={filtro}
          onMudar={setFiltro}
          aberto={menuAberto === 'filtro'}
          onAbrir={() => setMenuAberto(menuAberto === 'filtro' ? null : 'filtro')}
          opcoes={[
            { v: 'todas',  r: t('painelanalises_todas') },
            { v: 'render', r: 'Render' },
            { v: 'batch',  r: 'Batch' }
          ]}
        />
      </div>

      {carregando && <p className="cr-msg">{t('comum_carregando')}</p>}

      {!carregando && filtrados.length === 0 && (
        <div className="an-vazio">
          <p>
            {busca || filtro !== 'todas' || plataforma !== 'todas'
              ? t('painelanalises_vazio_filtro')
              : t('painelanalises_vazio')}
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
                  <span className="an-tit">{l.titulo || t('painelanalises_sem_titulo')}</span>
                  <span className="an-tag">{l.origem === 'batch' ? 'Batch' : 'Render'}</span>
                  <span className={'an-tag an-tag--' + (l.plataforma || 'web')}>
                    {(l.plataforma || 'web') === 'plugin' ? 'Plugin' : 'Web'}
                  </span>
                </span>
                <span className="an-quando">{quando(l.criadoEm, t, idioma)}</span>
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
                    {copiada === l.id ? t('painelanalises_copiado') : t('painelanalises_copiar')}
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
                      ? t('painelanalises_levando')
                      : l.origem === 'batch' ? t('painelanalises_usar_batch') : t('painelanalises_usar_render')}
                  </button>

                  <button
                    className="an-lixo"
                    onClick={(e) => apagar(e, l.id)}
                    aria-label={t('painelanalises_apagar_aria')}
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
        <p className="an-pe">{t('painelanalises_rodape')}</p>
      )}
    </div>
  );
}
