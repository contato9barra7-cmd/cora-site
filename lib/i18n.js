'use client';
// ─────────────────────────────────────────────────────────────────────────
//  i18n do site — mesmo espírito do plugin: 3 dicionários (pt/en/es) + t().
//  A landing NÃO usa isto (tem copy própria por idioma). Aqui é o resto do
//  site: app, painéis, conta, login, preços, jurídico.
//
//  Uso:
//    import { useIdioma } from '../lib/i18n';
//    const { t, idioma, trocarIdioma } = useIdioma();
//    <button>{t('sair')}</button>
//
//  Idioma persiste no localStorage (imediato) e na conta (via salvarPerfil,
//  feito no AppShell) — então segue o usuário entre dispositivos.
// ─────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const IDIOMAS = ['pt', 'en', 'es'];

export function localeDeIdioma(idioma) {
  return idioma === 'en' ? 'en-US' : idioma === 'es' ? 'es-ES' : 'pt-BR';
}

// Dicionários. Cada chave = um texto. Comece pelo shell; vamos crescendo
// por fase. Falta de chave num idioma cai no PT (nunca quebra a tela).
export const DIC = {
  pt: {
    // navegação
    nav_dashboard: 'Dashboard',
    nav_minhaconta: 'Minha conta',
    nav_equipe: 'Equipe',
    nav_assinatura: 'Assinatura',
    // menu do avatar
    expandir_menu: 'Expandir menu',
    recolher_menu: 'Recolher menu',
    plano_label: 'Plano',
    cred_restantes: 'Créditos restantes',
    cred_de: 'de',
    cred_renova_em: 'renova em',
    dia: 'dia', dias: 'dias',
    creditos: 'Créditos',
    ilimitados: 'Ilimitados',
    idioma_label: 'Idioma',
    tema_label: 'Tema',
    tema_claro: 'Claro',
    tema_escuro: 'Escuro',
    tema_sistema: 'Sistema',
    sair: 'Sair',
    // card de crédito baixo
    fechar: 'Fechar',
    cred_acabaram: 'Seus créditos acabaram',
    cred_recarregue: 'recarregue para continuar gerando',
    cred_restantes_txt: 'créditos restantes',
    recarregar: 'Recarregar',
    comprar_creditos: 'Comprar créditos',
    // trial
    trial_dia: 'Dia',
    trial_de7: 'de 7',
    trial_teste_gratis: 'do seu teste grátis',
    assinar: 'Assinar',
    teste_encerrado: 'Teste encerrado',
    teste_terminou_h1: 'Seu teste de 7 dias terminou',
    teste_terminou_p: 'Assine para continuar criando com o Cora Render — seus projetos e histórico continuam salvos.',
    ver_planos_assinar: 'Ver planos e assinar',
    // plano vencido
    plano_inativo: 'Plano inativo',
    plano_expirou_h1: 'Seu plano expirou',
    plano_expirou_p: 'Sua assinatura não está ativa — renove para voltar a gerar. Seus projetos e histórico continuam salvos.',
    renovar_assinatura: 'Renovar assinatura',
  },
  en: {
    nav_dashboard: 'Dashboard',
    nav_minhaconta: 'My account',
    nav_equipe: 'Team',
    nav_assinatura: 'Subscription',
    expandir_menu: 'Expand menu',
    recolher_menu: 'Collapse menu',
    plano_label: 'Plan',
    cred_restantes: 'Credits left',
    cred_de: 'of',
    cred_renova_em: 'renews in',
    dia: 'day', dias: 'days',
    creditos: 'Credits',
    ilimitados: 'Unlimited',
    idioma_label: 'Language',
    tema_label: 'Theme',
    tema_claro: 'Light',
    tema_escuro: 'Dark',
    tema_sistema: 'System',
    sair: 'Log out',
    fechar: 'Close',
    cred_acabaram: "You're out of credits",
    cred_recarregue: 'top up to keep generating',
    cred_restantes_txt: 'credits left',
    recarregar: 'Top up',
    comprar_creditos: 'Buy credits',
    trial_dia: 'Day',
    trial_de7: 'of 7',
    trial_teste_gratis: 'of your free trial',
    assinar: 'Subscribe',
    teste_encerrado: 'Trial ended',
    teste_terminou_h1: 'Your 7-day trial has ended',
    teste_terminou_p: 'Subscribe to keep creating with Cora Render — your projects and history stay saved.',
    ver_planos_assinar: 'See plans & subscribe',
    plano_inativo: 'Plan inactive',
    plano_expirou_h1: 'Your plan has expired',
    plano_expirou_p: "Your subscription isn't active — renew to start generating again. Your projects and history stay saved.",
    renovar_assinatura: 'Renew subscription',
  },
  es: {
    nav_dashboard: 'Panel',
    nav_minhaconta: 'Mi cuenta',
    nav_equipe: 'Equipo',
    nav_assinatura: 'Suscripción',
    expandir_menu: 'Expandir menú',
    recolher_menu: 'Contraer menú',
    plano_label: 'Plan',
    cred_restantes: 'Créditos restantes',
    cred_de: 'de',
    cred_renova_em: 'se renueva en',
    dia: 'día', dias: 'días',
    creditos: 'Créditos',
    ilimitados: 'Ilimitados',
    idioma_label: 'Idioma',
    tema_label: 'Tema',
    tema_claro: 'Claro',
    tema_escuro: 'Oscuro',
    tema_sistema: 'Sistema',
    sair: 'Salir',
    fechar: 'Cerrar',
    cred_acabaram: 'Se acabaron tus créditos',
    cred_recarregue: 'recarga para seguir generando',
    cred_restantes_txt: 'créditos restantes',
    recarregar: 'Recargar',
    comprar_creditos: 'Comprar créditos',
    trial_dia: 'Día',
    trial_de7: 'de 7',
    trial_teste_gratis: 'de tu prueba gratis',
    assinar: 'Suscribirse',
    teste_encerrado: 'Prueba finalizada',
    teste_terminou_h1: 'Tu prueba de 7 días terminó',
    teste_terminou_p: 'Suscríbete para seguir creando con Cora Render — tus proyectos e historial siguen guardados.',
    ver_planos_assinar: 'Ver planes y suscribirse',
    plano_inativo: 'Plan inactivo',
    plano_expirou_h1: 'Tu plan expiró',
    plano_expirou_p: 'Tu suscripción no está activa — renueva para volver a generar. Tus proyectos e historial siguen guardados.',
    renovar_assinatura: 'Renovar suscripción',
  },
};

const IdiomaContext = createContext({ idioma: 'pt', trocarIdioma: () => {}, t: (k) => k });

export function IdiomaProvider({ children }) {
  const [idioma, setIdioma] = useState('pt');   // server + 1ª pintura = pt (evita mismatch)

  // No cliente: usa o idioma salvo (localStorage) ou o do navegador.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem('cora_idioma');
      if (salvo && IDIOMAS.includes(salvo)) { setIdioma(salvo); return; }
      const nav = (navigator.language || 'pt').slice(0, 2).toLowerCase();
      if (IDIOMAS.includes(nav)) setIdioma(nav);
    } catch (e) {}
  }, []);

  const trocarIdioma = useCallback((novo) => {
    if (!IDIOMAS.includes(novo)) return;
    setIdioma(novo);
    try { localStorage.setItem('cora_idioma', novo); } catch (e) {}
    try { document.documentElement.lang = novo === 'pt' ? 'pt-BR' : novo; } catch (e) {}
  }, []);

  const t = useCallback(
    (chave) => (DIC[idioma] && DIC[idioma][chave]) || DIC.pt[chave] || chave,
    [idioma]
  );

  return (
    <IdiomaContext.Provider value={{ idioma, trocarIdioma, t }}>
      {children}
    </IdiomaContext.Provider>
  );
}

export function useIdioma() {
  return useContext(IdiomaContext);
}
