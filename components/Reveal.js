'use client';

import { motion } from 'framer-motion';

/**
 * Reveal — envolve qualquer conteúdo e faz ele aparecer suavemente
 * (fade + leve subida) quando entra na tela ao rolar.
 * Uso: <Reveal><h2>Título</h2></Reveal>
 * delay opcional para escalonar elementos: <Reveal delay={0.1}>...</Reveal>
 */
export default function Reveal({ children, delay = 0, y = 24 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
