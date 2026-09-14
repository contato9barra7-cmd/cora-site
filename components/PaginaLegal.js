'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  MOLDURA DAS PÁGINAS LEGAIS  (termos de uso, política de privacidade)
//
//  As duas páginas têm a mesma forma e mudam só no conteúdo, então a moldura
//  mora aqui e cada página entrega as seções como filhas.
//
//  ── Por que ela veste a página de suporte ──
//  Desde 13/09/2026 as duas usam a mesma moldura do /suporte: o cabeçalho do
//  site, o voltar embaixo dele, e a coluna da esquerda com título e sumário,
//  grudada ao rolar. O desenho vem da própria folha do suporte (classe `sp`),
//  e o que é só do documento mora no `paginas-legais.css`, debaixo de
//  `.sp.lg`. Antes elas tinham um cabeçalho próprio, com os dois logos e uma
//  linha, e tamanhos de fonte que não eram os do resto do site.
//
//  ── Por que tem índice ──
//  São catorze seções e mais de três metros de rolagem. A pergunta que se faz
//  num documento desses é sempre "onde está a parte de X", e rolar procurando
//  é a pior resposta possível.
//
//  O índice é montado A PARTIR DO DOM, lendo os próprios `<h2>` depois que a
//  página renderiza. Uma lista escrita à mão aqui teria que ser mantida em
//  paralelo com as seções e com as três traduções, e ia desencontrar na
//  primeira mudança. Lendo o DOM, ele acompanha sozinho.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIdioma } from '../lib/i18n';
import Cabecalho from './Cabecalho';
import AoTopo from './AoTopo';

// Vira "1-aceitacao" a partir de "1. Aceitação": o id precisa sobreviver a
// acento e pontuação porque ele vai virar âncora na barra de endereço.
function apelido(texto, ordem) {
  const limpo = String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (limpo || 'secao') + '-' + ordem;
}

export default function PaginaLegal({ titulo, data, children }) {
  const router = useRouter();
  const { t } = useIdioma();
  const docRef = useRef(null);
  const indiceRef = useRef(null);
  const [secoes, setSecoes] = useState([]);
  const [aqui, setAqui] = useState('');

  // Volta para a página anterior (ex.: o cadastro, com os dados preenchidos).
  // Se não houver histórico (acesso direto), cai para a home.
  const voltar = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;

    const blocos = [...doc.querySelectorAll('.legal-sec')];
    const lista = blocos.map((sec, i) => {
      const h = sec.querySelector('.legal-h2');
      const texto = (h && h.textContent) || '';
      if (!sec.id) sec.id = apelido(texto, i + 1);
      return { id: sec.id, texto: texto.trim() };
    });
    setSecoes(lista);

    // Marca no índice a seção que está sendo lida. A faixa de observação para
    // no meio da tela (`-55%` embaixo) para a marca trocar quando o título
    // chega ao alto, e não quando ele encosta no rodapé.
    const olho = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visiveis.length) setAqui(visiveis[0].target.id);
      },
      { rootMargin: '-12% 0px -55% 0px', threshold: 0 }
    );
    blocos.forEach((b) => olho.observe(b));
    return () => olho.disconnect();
  }, [children]);

  // Com catorze seções o sumário passa da altura da tela e rola por dentro.
  // Quando a seção marcada sai da parte visível dele, ele anda até ela, senão
  // a marca ficaria escondida justo enquanto a pessoa desce o texto.
  useEffect(() => {
    const lista = indiceRef.current;
    if (!lista || !aqui) return;
    const item = lista.querySelector('[data-aqui="sim"]');
    if (!item) return;
    const topo = item.offsetTop;
    const fim = topo + item.offsetHeight;
    if (topo < lista.scrollTop || fim > lista.scrollTop + lista.clientHeight) {
      lista.scrollTop = Math.max(0, topo - lista.clientHeight / 2);
    }
  }, [aqui]);

  const irPara = (e, id) => {
    e.preventDefault();
    const alvo = document.getElementById(id);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // O hash entra no histórico pra o link poder ser copiado e compartilhado.
    history.replaceState(null, '', '#' + id);
    setAqui(id);
  };

  return (
    /* `sp` é a classe da página de suporte: cabeçalho, voltar, grade, título
       e sumário vêm da folha dela. `lg` é o que só o documento tem. */
    <div className="sp lg">
      <Cabecalho aqui="legal" />

      <main id="conteudo">
        <div className="env sp-topo">
          <a href="/" className="sp-voltar" onClick={voltar}>{t('legal_voltar')}</a>
        </div>

        <section className="env" style={{ paddingBottom: 'clamp(48px,6vw,88px)' }}>
          <div className="faq-grade">
            <div className="faq-lado">
              <span className="olho">{t('legal_olho')}</span>
              <h1>{titulo}</h1>
              <p>{data}</p>

              <nav className="indice" ref={indiceRef} aria-label={t('legal_indice')}>
                {secoes.map((s) => (
                  <a
                    key={s.id}
                    href={'#' + s.id}
                    data-aqui={aqui === s.id ? 'sim' : undefined}
                    aria-current={aqui === s.id ? 'location' : undefined}
                    onClick={(e) => irPara(e, s.id)}
                  >
                    {s.texto}
                  </a>
                ))}
              </nav>
            </div>

            <div className="lg-doc" ref={docRef}>
              {children}
            </div>
          </div>
        </section>
      </main>

      <AoTopo rotulo={t('legal_ao_topo')} />
    </div>
  );
}
