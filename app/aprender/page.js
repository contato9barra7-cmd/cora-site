'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  APRENDER
//
//  Três telas, e cada uma substitui a anterior:
//
//     MÓDULOS   as sete capas, e quantas aulas cada uma tem
//     MÓDULO    a capa vira miniatura no cabeçalho, e as aulas viram lista
//     AULA      o vídeo, com o caminho de volta para o módulo
//
//  Não há índice lateral de propósito. Dentro da aula o que importa é o
//  vídeo, e a lista fica a um clique. Foi o fluxo escolhido em 09/09/2026.
//
//  O desenho é o do artefato `ferramentas/painel.html`, e a folha
//  (painel-pagina.css) é GERADA a partir dele:
//
//      python gerar-css-artefato.py painel.html ../app/painel-pagina.css pn
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta } from '../../lib/auth';
import { MODULOS, urlDoVideo } from '../../lib/aulas';
import { useIdioma, tOpt } from '../../lib/i18n';

const Seta = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 6l-6 6 6 6" />
  </svg>
);

export default function Aprender() {
  const { t } = useIdioma();
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  // Onde a pessoa está. Os dois nulos = a tela dos módulos.
  const [modId, setModId] = useState(null);
  const [aulaId, setAulaId] = useState(null);

  useEffect(() => {
    if (!lerConta()) { router.push('/login'); return; }
    setPronto(true);
  }, [router]);

  // Voltar do navegador fecha a aula antes de sair da tela: quem entrou em
  // três passos espera desfazer um por vez.
  useEffect(() => {
    function aoVoltar() {
      if (aulaId) { setAulaId(null); return; }
      if (modId) { setModId(null); }
    }
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, [modId, aulaId]);

  const modulo = MODULOS.find((m) => m.id === modId) || null;
  const aula = modulo ? modulo.aulas.find((a) => a.id === aulaId) || null : null;

  function abrirModulo(id) {
    setModId(id);
    setAulaId(null);
    window.history.pushState({ apr: id }, '');
  }
  function abrirAula(id) {
    setAulaId(id);
    window.history.pushState({ apr: id }, '');
  }

  function quantas(n) {
    return `${n} ${n === 1 ? t('apr_aula') : t('apr_aulas')}`;
  }

  if (!pronto) return <AppShell><div className="apr-wrap" /></AppShell>;

  return (
    <AppShell>
      <div className="apr-wrap">
        {/* ── 1. OS MÓDULOS ── */}
        {!modulo && (
          <>
            <header className="apr-cab">
              <h1>{t('apr_titulo')}</h1>
              <p>{t('apr_intro')}</p>
            </header>
            <div className="apr-grade">
              {MODULOS.map((m) => (
                <button key={m.id} className="apr-mod" onClick={() => abrirModulo(m.id)}>
                  <span className="apr-mod__capa">
                    <img src={m.capa} alt="" loading="lazy" />
                  </span>
                  <span className="apr-mod__n">{t('apr_modulo')} {m.id}</span>
                  <span className="apr-mod__t">{tOpt(m.titulo)}</span>
                  <span className="apr-mod__q">{quantas(m.aulas.length)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── 2. AS AULAS DO MÓDULO ── */}
        {modulo && !aula && (
          <div className="apr-col">
            <button className="apr-volta" onClick={() => setModId(null)}>
              {Seta}{t('apr_voltar_mod')}
            </button>
            <div className="apr-mcab">
              <img src={modulo.capa} alt="" />
              <div>
                <p>{t('apr_modulo')} {modulo.id} · {quantas(modulo.aulas.length)}</p>
                <h1>{tOpt(modulo.titulo)}</h1>
              </div>
            </div>
            <div className="apr-lista">
              {modulo.aulas.map((a, i) => (
                <button key={a.id} className="apr-aula" onClick={() => abrirAula(a.id)}>
                  <span className="apr-aula__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="apr-aula__t">{tOpt(a.titulo)}</span>
                  {/* A etiqueta só aparece quando a aula ainda não tem vídeo.
                      Aula pronta não precisa dizer que está pronta. */}
                  {!urlDoVideo(a.panda) && <span className="apr-aula__tag">{t('apr_breve')}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. A AULA ── */}
        {modulo && aula && (
          <div className="apr-col">
            <button className="apr-volta" onClick={() => setAulaId(null)}>
              {Seta}{t('apr_voltar_aulas')}
            </button>
            <div className="apr-palco">
              <div className="apr-palco__quadro">
                {urlDoVideo(aula.panda) ? (
                  <iframe
                    src={urlDoVideo(aula.panda)}
                    title={tOpt(aula.titulo)}
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="apr-breve">
                    <b>{t('apr_breve')}</b>
                    <span>{t('apr_breve_sub')}</span>
                  </div>
                )}
              </div>
              <p className="apr-palco__onde">{t('apr_modulo')} {modulo.id} · {tOpt(modulo.titulo)}</p>
              <h1>{tOpt(aula.titulo)}</h1>
              {/* Quem dá a aula assina embaixo dela, como na área de membros.
                  É a mesma peça de lá, e ela fecha a tela sem precisar de
                  mais uma caixa em volta. */}
              <img
                className="apr-assina"
                src="/img/aulas/assinatura.webp"
                alt="Marilia Fischer · 9BARRA7 Academy"
                width="1251"
                height="209"
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
