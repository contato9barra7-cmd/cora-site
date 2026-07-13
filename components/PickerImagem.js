'use client';

// ═══════════════════════════════════════════════════════════
//  PickerImagem — escolher imagem, em overlay
//
//  REGRA: todo card que seleciona imagem abre este picker.
//  Imagem base, referências, imagem do Editar — tudo.
//
//  Origens: Histórico · Favoritos · Enviar
//  O histórico vem agrupado por mês, como as pessoas lembram das coisas
//  ("aquele render de junho").
//
//  Devolve { base64, previa }. O base64 vai para o servidor; a prévia
//  (URL assinada ou data URL) é só para a tela.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { arquivoParaBase64 } from '../lib/render';
import { listarGeracoes, bytesDaGeracao } from '../lib/geracoes';

// Enviar vem primeiro: quase sempre a pessoa quer subir uma imagem nova.
// Quem vai buscar no histórico procura; quem vai subir, encontra na frente.
const ORIGENS = [
  {
    id: 'enviar', rotulo: 'Enviar',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.5 14v2a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5v-2" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    id: 'historico', rotulo: 'Histórico',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 10a7 7 0 107-7 7 7 0 00-5 2.1" strokeLinecap="round"/>
        <path d="M3 3v2.5h2.5M10 6v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  },
  {
    id: 'favoritos', rotulo: 'Favoritos',
    icone: (
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 16.5l-1.1-1C5 12 2.5 9.7 2.5 6.9A3.4 3.4 0 016 3.5c1.2 0 2.3.5 3 1.5.7-1 1.8-1.5 3-1.5a3.4 3.4 0 013.5 3.4c0 2.8-2.5 5.1-6.4 8.6l-1.1 1z" strokeLinejoin="round"/>
      </svg>
    )
  }
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Junta as imagens por mês, para o histórico ficar navegável
function agruparPorMes(lotes) {
  const grupos = new Map();

  lotes.forEach((lote) => {
    lote.itens.filter((i) => i.url).forEach((item) => {
      // O servidor manda `criadoEm` (camelCase), não `criado_em`. Com o
      // nome errado, virava Invalid Date e o cabeçalho dizia "undefined NaN".
      const d = new Date(lote.criadoEm || item.criadoEm);
      const chave = `${d.getFullYear()}-${d.getMonth()}`;
      if (!grupos.has(chave)) {
        grupos.set(chave, { titulo: `${MESES[d.getMonth()]} ${d.getFullYear()}`, itens: [] });
      }
      grupos.get(chave).itens.push(item);
    });
  });

  return [...grupos.values()];
}

export default function PickerImagem({ aberto, onFechar, onEscolher, titulo }) {
  const [origem, setOrigem]         = useState('enviar');   // abre no upload
  const [arrastando, setArrastando] = useState(false);
  const [grupos, setGrupos]         = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState('');
  const [pegando, setPegando]       = useState(null);
  const [busca, setBusca]           = useState('');

  // A imagem enviada fica AQUI, esperando o OK. Colar ou escolher um arquivo
  // não fecha o picker sozinho — a pessoa vê o que carregou e confirma.
  const [pendente, setPendente] = useState(null);   // { base64, previa }

  const carregarFeed = useCallback(async (soFavoritos, termo) => {
    setCarregando(true);
    setErro('');
    try {
      // 80 era demais: o servidor assina uma URL do R2 para CADA imagem
      // antes de responder, então 80 imagens = 80 chamadas ao R2, e a
      // gaveta demorava a abrir. 24 enche a tela; o resto vem ao rolar.
      const d = await listarGeracoes({
        tipo: 'imagem',
        favorito: soFavoritos,
        busca: termo || undefined,
        limite: 24
      });
      setGrupos(agruparPorMes(d));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!aberto || origem === 'enviar') return;
    carregarFeed(origem === 'favoritos', busca);
  }, [aberto, origem, busca, carregarFeed]);

  // Esc fecha; Ctrl+V cola (só na aba Enviar)
  useEffect(() => {
    if (!aberto) return;

    const onKey = (e) => { if (e.key === 'Escape') fechar(); };

    const onPaste = async (e) => {
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

  // Guarda o que a pessoa enviou. NÃO fecha — ela confirma depois.
  async function escolherArquivo(file) {
    setErro('');
    try {
      const base64 = await arquivoParaBase64(file);
      setPendente({ base64, previa: URL.createObjectURL(file) });
      setOrigem('enviar');   // se colou estando no histórico, mostra o que colou
    } catch (e) { setErro(e.message); }
  }

  function confirmar() {
    if (!pendente) return;
    onEscolher(pendente);
    setPendente(null);
    onFechar();
  }

  // Do histórico, um clique basta: a pessoa já está vendo a imagem.
  async function escolherDoFeed(item) {
    setPegando(item.id);
    setErro('');
    try {
      // Os bytes vêm do servidor: o R2 não manda CORS, então o fetch()
      // direto na URL da imagem falha ("Failed to fetch").
      const base64 = await bytesDaGeracao(item.id);
      // O `geracaoId` viaja junto: com ele, a leitura de materiais aponta
      // para a imagem que JÁ está no R2, em vez de guardar outra cópia.
      onEscolher({ base64, previa: item.url, geracaoId: item.id });
      onFechar();
    } catch (e) { setErro(e.message); }
    finally { setPegando(null); }
  }

  // Fechar limpa o que estava pendente
  function fechar() {
    setPendente(null);
    onFechar();
  }

  if (!aberto) return null;

  const vazio = !carregando && grupos.length === 0;

  return (
    <div className="cr-overlay" onClick={fechar}>
      <div className="pk" onClick={(e) => e.stopPropagation()}>

        {/* O X mora na quina, meio dentro meio fora — não rouba espaço do cabeçalho */}
        <button className="pk-x" onClick={fechar} aria-label="Fechar">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" strokeLinecap="round"/>
          </svg>
        </button>


        {/* ── Lateral: de onde vem a imagem ── */}
        <nav className="pk-lado">
          {ORIGENS.map((o) => (
            <button
              key={o.id}
              className={'pk-origem' + (origem === o.id ? ' pk-origem--on' : '')}
              onClick={() => setOrigem(o.id)}
            >
              {o.icone}
              <span>{o.rotulo}</span>
            </button>
          ))}
        </nav>

        <div className="pk-main">
          <header className="pk-cab">
            <span className="pk-titulo">
              {origem === 'enviar' ? (titulo || 'Enviar imagem')
                : ORIGENS.find((o) => o.id === origem).rotulo}
            </span>

            {origem !== 'enviar' && (
              <div className="pk-busca">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="8.5" cy="8.5" r="5"/><path d="M12.5 12.5L17 17" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  spellCheck={false}
                />
              </div>
            )}

          </header>

          <div className="pk-corpo">

            {origem === 'enviar' && !pendente && (
              <label
                className={'pk-drop' + (arrastando ? ' pk-drop--on' : '')}
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
                <span className="pk-drop-t">Arraste sua imagem aqui</span>
                <span className="pk-drop-s">ou cole com Ctrl+V</span>
                <span className="pk-drop-b">Procurar no computador</span>
                <input
                  type="file" accept="image/*" hidden
                  onChange={(e) => { const f = e.target.files[0]; if (f) escolherArquivo(f); e.target.value = ''; }}
                />
              </label>
            )}

            {/* Carregou: mostra e espera o OK */}
            {pendente && (
              <div className="pk-pend">
                <div className="pk-pend-img">
                  <img src={pendente.previa} alt="" />
                </div>
                <div className="pk-pend-acoes">
                  <button className="pk-pend-trocar" onClick={() => setPendente(null)}>
                    Trocar imagem
                  </button>
                  <button className="pk-pend-ok" onClick={confirmar}>
                    Usar esta imagem
                  </button>
                </div>
              </div>
            )}

            {origem !== 'enviar' && !pendente && (
              <>
                {carregando && <p className="cr-msg">Carregando...</p>}

                {vazio && (
                  <p className="cr-msg">
                    {busca ? 'Nada encontrado para essa busca.'
                      : origem === 'favoritos'
                        ? 'Nenhum favorito ainda.'
                        : 'Nenhuma imagem no histórico ainda.'}
                  </p>
                )}

                {grupos.map((g) => (
                  <section key={g.titulo} className="pk-mes">
                    <h3>{g.titulo}</h3>
                    <div className="pk-grade">
                      {g.itens.map((i) => (
                        <button
                          key={i.id}
                          className={'pk-item' + (pegando === i.id ? ' pk-item--indo' : '')}
                          onClick={() => escolherDoFeed(i)}
                          disabled={pegando !== null}
                        >
                          {/* A miniatura, não a original: aqui o card tem
                              uns 100px. Baixar 4 MB para isso era o que
                              deixava a gaveta lenta. */}
                          <img src={i.thumb || i.url} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}

            {erro && <div className="cr-erro">{erro}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
