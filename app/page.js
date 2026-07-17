'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Nav from '../components/Nav';
import Reveal from '../components/Reveal';
import Marquee from '../components/Marquee';

/* ============================================================================
   LANDING PAGE — CORA RENDER
   Copy de venda provisória, pronta para o designer usar como base.
   Todo o texto está aqui em cima, fácil de editar.
   ============================================================================ */

const marcas = ['SketchUp 2025', 'Render', 'Batch', 'Editar', '360°', 'Animação', 'Timelapse', 'Diretor de Narrativa'];

// dores que o mercado não resolve (baseado em pesquisa de concorrentes)
const dores = [
  ['Cada vista sai diferente', 'Você precisa de 5 imagens do mesmo projeto para o cliente — e cada ferramenta devolve 5 estilos diferentes. No Cora, o Batch mantém a consistência entre todas as cenas.'],
  ['A IA inventa o que não existe', 'Escada vira rampa, aparece parede onde era janela. O Cora lê os materiais das suas cenas e respeita o seu projeto.'],
  ['Uma ferramenta para cada coisa', 'Uma para render, outra para vídeo, outra para pós. O Cora faz tudo num lugar só, sem exportar nada.'],
  ['Tudo em inglês', 'A maioria das ferramentas nem fala a sua língua. O Cora é feito para o arquiteto brasileiro, em português.'],
];

// capacidades / o que faz
const capacidades = [
  ['Render', 'Transforme a cena do SketchUp em imagem realista em segundos.'],
  ['Batch de cenas', 'Renderize o projeto inteiro de uma vez, com consistência entre as vistas.'],
  ['Editar', 'Ambientação, mood, pessoas, close-ups e maquete física — a partir do seu render.'],
  ['360°', 'Panoramas navegáveis para o cliente entrar no projeto.'],
  ['Animação e vídeo', 'Dê movimento aos ambientes e apresente como um filme.'],
  ['Timelapse e Diretor', 'Da obra ao render final, em sequência narrada. Ninguém mais faz isso.'],
];

// como funciona (3 passos)
const passos = [
  ['1', 'Modele no SketchUp', 'Você continua no seu fluxo de sempre. O Cora vive dentro do SketchUp 2025.'],
  ['2', 'Descreva e gere', 'Escolha a cena, ajuste os detalhes e deixe a IA fazer o trabalho pesado.'],
  ['3', 'Apresente e impressione', 'Imagens, vídeos e narrativas prontas para o cliente — em minutos, não em dias.'],
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <motion.p className="hero__tag"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}>
            Para arquitetos que usam SketchUp
          </motion.p>
          <motion.h1 className="hero__titulo"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
            Do modelo 3D à apresentação que fecha o projeto
          </motion.h1>
          <motion.p className="hero__sub"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}>
            Render, vídeo, 360° e narrativa com IA — direto do seu SketchUp,
            em português. Sem exportar, sem pular de programa, sem esperar horas.
          </motion.p>
          <motion.div className="hero__ctas"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            <Link href="/login" className="btn btn--verde" style={{ width: 'auto', margin: 0, padding: '14px 32px' }}>
              Testar grátis por 7 dias
            </Link>
            <Link href="/precos" className="btn btn--ghost" style={{ width: 'auto', margin: 0, padding: '14px 32px' }}>
              Ver planos
            </Link>
          </motion.div>
          <motion.p className="hero__nota"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            Sem cartão para testar · Cancele quando quiser
          </motion.p>
        </div>
      </section>

      {/* FAIXA DE CAPACIDADES (marquee) */}
      <section className="faixa">
        <Marquee items={marcas} />
      </section>

      {/* PROBLEMA / DORES */}
      <section className="sec">
        <div className="container">
          <Reveal>
            <h2 className="sec__titulo">Renderizar com IA prometeu muito. E entregou frustração.</h2>
            <p className="sec__sub">As ferramentas atuais deixam quatro problemas sem solução. O Cora nasceu para resolvê-los.</p>
          </Reveal>
          <div className="cards cards--2">
            {dores.map((d, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="card card--dor">
                  <h3>{d[0]}</h3>
                  <p>{d[1]}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CAPACIDADES */}
      <section className="sec sec--wash">
        <div className="container">
          <Reveal>
            <h2 className="sec__titulo">Um ecossistema, não mais um plugin de render</h2>
            <p className="sec__sub">Tudo que você precisa para apresentar um projeto — no mesmo lugar.</p>
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

      {/* GALERIA (placeholder pro designer) */}
      <section className="sec">
        <div className="container">
          <Reveal>
            <h2 className="sec__titulo">Do modelo à imagem final</h2>
            <p className="sec__sub">Espaço para a galeria de exemplos e antes/depois. O designer define o visual.</p>
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

      {/* COMO FUNCIONA */}
      <section className="sec sec--wash">
        <div className="container">
          <Reveal>
            <h2 className="sec__titulo">Simples assim</h2>
          </Reveal>
          <div className="passos">
            {passos.map((p, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="passo">
                  <span className="passo__num">{p[0]}</span>
                  <h3>{p[1]}</h3>
                  <p>{p[2]}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAL / PT-BR */}
      <section className="sec">
        <div className="container">
          <Reveal>
            <div className="destaque">
              <h2>Feito no Brasil, para o arquiteto brasileiro</h2>
              <p>
                Interface, suporte e prompts em português. Uma década de prática
                real em visualização arquitetônica por trás de cada ferramenta.
                O Cora entende como você trabalha — porque foi feito por quem faz.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* DEPOIMENTOS (placeholder) */}
      <section className="sec sec--wash">
        <div className="container">
          <Reveal>
            <h2 className="sec__titulo">O que dizem os arquitetos</h2>
            <p className="sec__sub">Espaço para depoimentos reais — entram quando você tiver os primeiros clientes.</p>
          </Reveal>
          <div className="depo-grid">
            {[1, 2, 3].map((n) => (
              <Reveal key={n} delay={n * 0.08}>
                <div className="depo">
                  <p className="depo__txt">"Depoimento do cliente {n} aqui."</p>
                  <p className="depo__autor">Nome · Escritório</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CHAMADA FINAL */}
      <section className="cta-final">
        <div className="container">
          <Reveal>
            <h2>Sua próxima apresentação pode ser diferente</h2>
            <p>Comece hoje, grátis por 7 dias. Sem cartão, sem compromisso.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <Link href="/login" className="btn btn--verde" style={{ width: 'auto', margin: 0, padding: '14px 34px' }}>
                Testar grátis
              </Link>
              <Link href="/precos" className="btn btn--ghost" style={{ width: 'auto', margin: 0, padding: '14px 34px' }}>
                Ver planos e preços
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container">
        <div className="foot">© {new Date().getFullYear()} Cora Render · 9barra7 Academy</div>
      </div>
    </>
  );
}
