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

export default function PickerImagem({ aberto, onFechar, onEscolher, onEscolherVarias, multi, titulo }) {
  const [origem, setOrigem]         = useState('enviar');   // abre no upload
  const [arrastando, setArrastando] = useState(false);
  const [grupos, setGrupos]         = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState('');
  const [pegando, setPegando]       = useState(null);
  const [busca, setBusca]           = useState('');
  // Modo múltiplo: acumula seleções (do feed e/ou upload) e confirma tudo junto.
  const [multiSel, setMultiSel]     = useState([]);   // [{id?, base64?, previa, nome?}]
  const [confirmandoMulti, setConfirmandoMulti] = useState(false);

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

  // Adiciona um ou mais arquivos no modo múltiplo (upload do PC).
  async function adicionarArquivosMulti(files) {
    setErro('');
    // Snapshot ANTES de qualquer await: o chamador limpa o input (e.target.value='')
    // logo após, o que esvaziaria a FileList no meio do loop e só a 1ª entraria.
    const lista = Array.from(files || []);
    for (const file of lista) {
      if (!file || !file.type || !file.type.startsWith('image/')) continue;
      try {
        const base64 = await arquivoParaBase64(file);
        const previa = URL.createObjectURL(file);
        setMultiSel((l) => [...l, { base64, previa, nome: file.name, de: 'enviar' }]);
      } catch (e) { setErro(e.message); }
    }
  }

  // Guarda o que a pessoa enviou. NÃO fecha — ela confirma depois.
  async function escolherArquivo(file) {
    if (multi) { await adicionarArquivosMulti([file]); return; }
    setErro('');
    try {
      const base64 = await arquivoParaBase64(file);
      const previa = URL.createObjectURL(file);

      setPendente({
        base64,
        previa,
        de: 'enviar',
        nome: file.name,
        peso: file.size
      });
      setOrigem('enviar');   // se colou estando no histórico, mostra o que colou

      medir(previa);
    } catch (e) { setErro(e.message); }
  }

  // As dimensões: numa miniatura de 100px ninguém confere se é a imagem certa.
  // O número ajuda a ter certeza antes de gastar créditos com a errada.
  function medir(url) {
    const img = new Image();
    img.onload = () => {
      setPendente((p) => p && ({ ...p, w: img.naturalWidth, h: img.naturalHeight }));
    };
    img.src = url;
  }

  async function confirmar() {
    if (!pendente) return;

    let { base64, previa, geracaoId } = pendente;

    // Se veio do feed, é AGORA que os bytes são baixados — no momento em que
    // vão de fato ser usados, e não lá atrás, só para acender a barra.
    //
    // Eles vêm do servidor, e não por um fetch() direto na URL: o R2 não manda
    // CORS, e o fetch falharia com "Failed to fetch".
    if (!base64 && geracaoId) {
      setPegando(geracaoId);
      setErro('');
      try {
        base64 = await bytesDaGeracao(geracaoId);
      } catch (e) {
        setErro(e.message);
        setPegando(null);
        return;                       // a barra fica de pé: dá para tentar de novo
      }
      setPegando(null);
    }

    // Só os campos que o chamador espera — o resto (nome, peso, dimensões)
    // era só para a tela de confirmação.
    onEscolher({ base64, previa, geracaoId });

    setPendente(null);
    onFechar();
  }

  // Do histórico também se confirma: a miniatura tem 100px, e ninguém
  // consegue ter certeza de que é a imagem certa a esse tamanho.
  //
  // Os BYTES não são baixados aqui. Baixá-los agora — só para acender uma barra
  // que já poderia ser desenhada com a URL que temos em mãos — é o que fazia a
  // barra demorar a aparecer: a pessoa clicava e ficava esperando megabytes
  // chegarem antes de qualquer sinal de que o clique funcionou.
  //
  // Eles vêm no `confirmar()`, quando de fato serão usados.
  function escolherDoFeed(item) {
    setErro('');

    // Modo múltiplo: clicar acumula/desmarca (por id), sem barra de confirmação.
    if (multi) {
      setMultiSel((l) => {
        const existe = l.some((s) => s.id === item.id);
        return existe ? l.filter((s) => s.id !== item.id)
                      : [...l, { id: item.id, geracaoId: item.id, previa: item.thumb || item.url, de: 'feed' }];
      });
      return;
    }

    // Clicar de novo na MESMA imagem desmarca. Sem isso não haveria como
    // desfazer a escolha sem fechar o picker inteiro — e o gesto natural de
    // quem se arrependeu é clicar outra vez no que clicou.
    const desmarcando = pendente && pendente.id === item.id;

    if (desmarcando) {
      setPendente(null);
      return;
    }

    setPendente({
      base64: null,             // vem depois, no confirmar
      previa: item.url,
      geracaoId: item.id,
      de: 'feed',
      id: item.id
    });

    medir(item.url);
  }

  // Confirma TODAS as imagens do modo múltiplo. As do feed baixam os bytes
  // agora (via servidor); as do upload já têm base64.
  async function confirmarMulti() {
    if (!multiSel.length) return;
    setConfirmandoMulti(true);
    setErro('');
    try {
      const lista = [];
      for (const s of multiSel) {
        if (s.base64) { lista.push(s.base64); continue; }
        if (s.geracaoId) {
          try { lista.push(await bytesDaGeracao(s.geracaoId)); }
          catch (e) { /* pula a que falhar, segue com as outras */ }
        }
      }
      if (!lista.length) { setErro('Não consegui carregar as imagens.'); setConfirmandoMulti(false); return; }
      if (onEscolherVarias) onEscolherVarias(lista);
      setMultiSel([]);
      setConfirmandoMulti(false);
      onFechar();
    } catch (e) {
      setErro(e.message);
      setConfirmandoMulti(false);
    }
  }

  // Fechar limpa o que estava pendente
  function fechar() {
    setPendente(null);
    setMultiSel([]);
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

            {origem === 'enviar' && (multi || !pendente) && (
              <label
                className={'pk-drop' + (arrastando ? ' pk-drop--on' : '')}
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastando(false);
                  if (multi) { adicionarArquivosMulti(e.dataTransfer.files); return; }
                  const f = e.dataTransfer.files[0];
                  if (f && f.type.startsWith('image/')) escolherArquivo(f);
                }}
              >
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round"/>
                </svg>
                <span className="pk-drop-t">{multi ? 'Arraste suas imagens aqui' : 'Arraste sua imagem aqui'}</span>
                <span className="pk-drop-s">ou cole com Ctrl+V</span>
                <span className="pk-drop-b">Procurar no computador</span>
                <input
                  type="file" accept="image/*" hidden multiple={!!multi}
                  onChange={(e) => {
                    if (multi) { adicionarArquivosMulti(e.target.files); e.target.value = ''; return; }
                    const f = e.target.files[0]; if (f) escolherArquivo(f); e.target.value = '';
                  }}
                />
              </label>
            )}

            {/* Modo múltiplo: miniaturas do que já foi escolhido (upload + feed). */}
            {multi && origem === 'enviar' && multiSel.length > 0 && (
              <div className="pk-multi-tira">
                {multiSel.map((s, i) => (
                  <button key={(s.id || s.nome || 'i') + i} className="pk-multi-mini" onClick={() => setMultiSel((l) => l.filter((_, j) => j !== i))} title="Remover">
                    <img src={s.previa} alt="" />
                    <span className="pk-multi-x">×</span>
                  </button>
                ))}
              </div>
            )}

            {/* No ENVIO a prévia é grande: não há grade competindo pelo
                espaço, e numa miniatura ninguém confere se é a imagem certa. */}
            {pendente && pendente.de === 'enviar' && (
              <div className="pk-previa">
                <img src={pendente.previa} alt="" />
              </div>
            )}

            {origem !== 'enviar' && (
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
                          className={'pk-item'
                            + (pegando === i.id ? ' pk-item--indo' : '')
                            + (((multi ? multiSel.some((s) => s.id === i.id) : pendente?.id === i.id)) ? ' pk-item--on' : '')}
                          onClick={() => escolherDoFeed(i)}
                          disabled={pegando !== null}
                        >
                          {/* O visto: a escolhida se anuncia sem precisar
                              sair da grade. Clicar noutra troca. */}
                          {(multi ? multiSel.some((s) => s.id === i.id) : pendente?.id === i.id) && (
                            <span className="pk-visto">
                              <svg viewBox="0 0 20 20" width="11" height="11" fill="none"
                                   stroke="currentColor" strokeWidth="2.4">
                                <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )}
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

          {/* ── A confirmação ──
              A mesma barra serve aos dois casos. O que muda é o que fica
              acima dela: a grade (dá para trocar clicando em outra) ou a
              prévia grande (no envio, onde não há grade). */}
          {multi && multiSel.length > 0 && (
            <footer className="pk-ok">
              <div className="pk-ok-txt">
                <strong>{multiSel.length === 1 ? '1 imagem escolhida' : multiSel.length + ' imagens escolhidas'}</strong>
                <span>Do histórico e/ou do computador</span>
              </div>
              <button className="pk-ok-outra" onClick={() => setMultiSel([])} disabled={confirmandoMulti}>Limpar</button>
              <button className="pk-ok-btn" onClick={confirmarMulti} disabled={confirmandoMulti}>
                {confirmandoMulti ? 'Adicionando...' : (multiSel.length === 1 ? 'Usar 1 imagem' : 'Usar ' + multiSel.length + ' imagens')}
              </button>
            </footer>
          )}

          {!multi && pendente && (
            <footer className="pk-ok">
              {/* No histórico a grade continua à vista, e a miniatura aqui
                  lembra qual foi escolhida. No envio a prévia já é grande —
                  repetir seria redundante. */}
              {pendente.de === 'feed' && (
                <img className="pk-ok-mini" src={pendente.previa} alt="" />
              )}

              <div className="pk-ok-txt">
                <strong>
                  {pendente.de === 'enviar'
                    ? (pendente.nome || 'Imagem enviada')
                    : '1 imagem escolhida'}
                </strong>
                <span>
                  {pendente.w
                    ? pendente.w + ' × ' + pendente.h
                    : 'Carregando...'}
                  {pendente.peso ? ' · ' + (pendente.peso / 1048576).toFixed(1).replace('.', ',') + ' MB' : ''}
                </span>
              </div>

              {/* Só no envio: no histórico, trocar é clicar em outra da grade. */}
              {pendente.de === 'enviar' && (
                <button className="pk-ok-outra" onClick={() => setPendente(null)}>
                  Escolher outra
                </button>
              )}

              {/* Agora é aqui que os bytes chegam — então é aqui que a espera
                  aparece. Antes ela ficava escondida no clique da grade, sem
                  nada na tela dizendo que algo estava acontecendo. */}
              <button
                className="pk-ok-btn"
                onClick={confirmar}
                disabled={pegando !== null}
              >
                {pegando !== null ? 'Abrindo...' : 'Usar esta imagem'}
              </button>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
