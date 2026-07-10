'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Nav from '../components/Nav';
import Reveal from '../components/Reveal';
import Marquee from '../components/Marquee';

// dados provisórios — o design final virá do designer
const capacidades = [
  ['Render com IA', 'Transforme a cena do SketchUp em imagem realista em segundos.'],
  ['Batch de cenas', 'Renderize várias cenas do projeto de uma vez, com consistência.'],
  ['Editar', 'Ambientação, mood, pessoas, close-ups e maquete física.'],
  ['360°', 'Panoramas navegáveis a partir do seu modelo.'],
  ['Animação e vídeo', 'Dê movimento aos seus projetos com poucos cliques.'],
  ['Timelapse e Diretor', 'Da obra ao render final, em sequência narrada.'],
];

const marcas = ['SketchUp', 'Gemini', 'OpenAI', 'Kling', 'Topaz', 'Freepik'];

export default function Home() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <motion.h1
            className="hero__titulo"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Renderize seu projeto do SketchUp com IA
          </motion.h1>
          <motion.p
            className="hero__sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            Imagens, vídeos e apresentações direto do seu modelo 3D.
            Sem sair do SketchUp.
          </motion.p>
          <motion.div
            className="hero__ctas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link href="/login" className="btn btn--verde" style={{ width: 'auto', margin: 0, padding: '13px 30px' }}>
              Testar grátis
            </Link>
            <Link href="/precos" className="btn btn--ghost" style={{ width: 'auto', margin: 0, padding: '13px 30px' }}>
              Ver planos
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FAIXA DE MARCAS (marquee) */}
      <section className="faixa">
        <div className="container">
          <p className="faixa__label">Movido pelas melhores tecnologias de IA</p>
        </div>
        <Marquee items={marcas} />
      </section>

      {/* CAPACIDADES */}
      <section className="sec">
        <div className="container">
          <Reveal>
            <h2 className="sec__titulo">Tudo que você precisa para apresentar um projeto</h2>
          </Reveal>
          <div className="cards">
            {capacidades.map((c, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="card">
                  <h3>{c[0]}</h3>
                  <p>{c[1]}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GALERIA / ANTES-DEPOIS (placeholder para o designer) */}
      <section className="sec sec--wash">
        <div className="container">
          <Reveal>
            <h2 className="sec__titulo">Do modelo 3D à imagem final</h2>
            <p className="sec__sub">Aqui vai a galeria de exemplos / antes e depois. O designer define o visual.</p>
          </Reveal>
          <div className="galeria">
            {[1, 2, 3].map((n) => (
              <Reveal key={n} delay={n * 0.08}>
                <div className="galeria__item">Exemplo {n}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS (placeholder) */}
      <section className="sec">
        <div className="container">
          <Reveal>
            <h2 className="sec__titulo">O que dizem os arquitetos</h2>
            <p className="sec__sub">Espaço para depoimentos — entram quando você tiver.</p>
          </Reveal>
        </div>
      </section>

      {/* CHAMADA FINAL */}
      <section className="cta-final">
        <div className="container">
          <Reveal>
            <h2>Pronta para renderizar diferente?</h2>
            <p>Comece hoje. Cancele quando quiser.</p>
            <Link href="/precos" className="btn btn--verde" style={{ width: 'auto', margin: '20px auto 0', padding: '14px 34px', display: 'inline-block' }}>
              Ver planos e preços
            </Link>
          </Reveal>
        </div>
      </section>

      <div className="container">
        <div className="foot">© {new Date().getFullYear()} Cora Render · 9barra7 Academy</div>
      </div>
    </>
  );
}
