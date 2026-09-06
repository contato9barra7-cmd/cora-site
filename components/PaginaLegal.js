'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  MOLDURA DAS PÁGINAS LEGAIS  (termos de uso, política de privacidade)
//
//  As duas páginas têm a mesma forma e mudam só no conteúdo, então a moldura
//  mora aqui e cada página entrega as seções como filhas.
//
//  ── Por que tem logo ──
//  O link destas páginas circula solto: vai no rodapé, no cadastro e nos
//  e-mails. Elas podem ser a PRIMEIRA página que alguém abre do Cora, e sem o
//  logo quem chega assim não sabe de quem é o documento que está lendo.
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIdioma } from '../lib/i18n';
import AoTopo from './AoTopo';

// Vira "1-aceitacao" a partir de "1. Aceitação": o id precisa sobreviver a
// acento e pontuação porque ele vai virar âncora na barra de endereço.
function apelido(texto, ordem) {
  const limpo = String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (limpo || 'secao') + '-' + ordem;
}

export default function PaginaLegal({ titulo, data, children }) {
  const router = useRouter();
  const { t } = useIdioma();
  const docRef = useRef(null);
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
    <div className="legal-wrap">
      {/* Numa linha so, um em cada ponta: o voltar na esquerda, porque e a
          saida e saida se procura onde a leitura comeca, e os logos na
          direita, fechando a linha.

          Os logos nao sao enfeite num documento legal, sao a identificacao de
          quem assina: o Cora e o produto, a Academy e quem responde por ele.
          So o do Cora leva a algum lugar. */}
      <header className="legal-topo">
        <a href="/" className="legal-voltar" onClick={voltar}>{t('legal_voltar')}</a>
        <div className="legal-marcas">
          <Link href="/" className="legal-marca" aria-label="Cora Render">
            <img src="/img/logo-cora.png" alt="Cora Render" width="266" height="64" />
          </Link>
          <span className="legal-marcas__fio" aria-hidden="true" />
          <span className="legal-marca legal-marca--academy">
            <img src="/img/logo-9barra7.png" alt="9barra7 Academy" width="300" height="36" />
          </span>
        </div>
      </header>

      <div className="legal-grade">
        <nav className="legal-indice" aria-label={titulo}>
          <p className="legal-indice__rotulo">{t('legal_indice')}</p>
          <ol>
            {secoes.map((s) => (
              <li key={s.id}>
                <a
                  href={'#' + s.id}
                  data-aqui={aqui === s.id ? 'sim' : undefined}
                  onClick={(e) => irPara(e, s.id)}
                >
                  {s.texto}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal-doc" ref={docRef}>
          <h1 className="legal-titulo">{titulo}</h1>
          <p className="legal-data">{data}</p>
          {children}
        </div>
      </div>

      <AoTopo rotulo={t('legal_ao_topo')} />
    </div>
  );
}
