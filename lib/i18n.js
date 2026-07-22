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
    // comuns (reutilizáveis em todo o site)
    comum_carregando: 'Carregando...',
    comum_salvar: 'Salvar',
    comum_salvando: 'Salvando...',
    comum_cancelar: 'Cancelar',
    comum_remover: 'Remover',
    comum_ajuda: 'Ajuda',
    // perfil / minha conta
    perfil_perfil: 'Perfil',
    perfil_preferencias: 'Preferências',
    perfil_notificacoes: 'Notificações',
    perfil_seguranca: 'Segurança',
    perfil_deletar_conta: 'Deletar conta',
    perfil_avatar: 'Avatar',
    perfil_trocar_foto: 'Trocar foto',
    perfil_remover_foto: 'Remover foto',
    perfil_nome: 'Nome',
    perfil_seu_nome: 'Seu nome',
    perfil_username: 'Username',
    perfil_email_bloqueado: 'O email não pode ser alterado por aqui',
    perfil_newsletter_sub: 'Receba novidades, promoções e dicas do Cora Render.',
    perfil_newsletter_legal1: 'O 9BARRA7 usa seus dados para enviar novidades, promoções e dicas, com base em interesse legítimo.',
    perfil_newsletter_legal2: 'Não compartilhamos com terceiros, e você pode desativar quando quiser. Mais na',
    perfil_politica_privacidade: 'política de privacidade',
    perfil_salvar_alteracoes: 'Salvar alterações',
    perfil_sessoes: 'Sessões e dispositivos',
    perfil_disp_sub: 'Cada conta pode ter até 2 computadores no plugin e 3 dispositivos na versão web. O uso é de um por vez (plugin ou web, nunca ao mesmo tempo).',
    perfil_nenhum_disp: 'Nenhum dispositivo conectado ainda.',
    perfil_dispositivo: 'Dispositivo',
    perfil_em_uso: 'Em uso agora',
    perfil_ultimo_acesso: 'Último acesso:',
    perfil_versao_web: 'Versão web',
    perfil_pago_nao_deletar: 'Você tem um plano pago ativo, então não é possível deletar a conta diretamente. Cancele a assinatura primeiro (em Assinatura) ou fale com o suporte.',
    perfil_deletar_aviso: 'Esta ação é permanente e apaga todos os seus dados. Não pode ser desfeita.',
    perfil_deletar_minha_conta: 'Deletar minha conta',
    perfil_deletar_titulo: 'Deletar sua conta?',
    perfil_deletar_modal_p: 'Esta ação é permanente. Todos os seus dados serão apagados e não podem ser recuperados.',
    perfil_deletando: 'Deletando...',
    perfil_sim_deletar: 'Sim, deletar',
    perfil_problemas_comuns: 'Problemas comuns',
    perfil_ajuda_seg: 'Se você exceder o número de dispositivos permitido, remova um da lista. Depois de salvar, você poderá conectar o novo computador no próximo login.',
    perfil_num_usuarios: 'Número de usuários',
    perfil_ajuda_num1: 'Se você é uma empresa e precisa de mais usuários, temos ofertas especiais.',
    perfil_conheca_planos_equipe: 'Conheça os planos para equipes',
    perfil_ajuda_num2: 'para mais informações.',
    perfil_ajuda_final1: 'Cada conta pode ter até',
    perfil_ajuda_final_pc: '2 computadores no plugin',
    perfil_ajuda_final_e: 'e',
    perfil_ajuda_final_web: '3 dispositivos na versão web',
    perfil_ajuda_final2: ', com uso de um por vez (nunca plugin e web ao mesmo tempo).',
    perfil_confirm_remover_pc: 'Remover este computador? Ele precisará ser reconectado no próximo login.',
    perfil_alteracoes_salvas: 'Alterações salvas.',
    perfil_foto_titulo: 'Foto de perfil',
    perfil_foto_orient: 'Proporção 1:1 · recomendado 400×400px. Arraste e use o zoom para enquadrar.',
    perfil_escolher_outra: 'Escolher outra',
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
    comum_carregando: 'Loading...',
    comum_salvar: 'Save',
    comum_salvando: 'Saving...',
    comum_cancelar: 'Cancel',
    comum_remover: 'Remove',
    comum_ajuda: 'Help',
    perfil_perfil: 'Profile',
    perfil_preferencias: 'Preferences',
    perfil_notificacoes: 'Notifications',
    perfil_seguranca: 'Security',
    perfil_deletar_conta: 'Delete account',
    perfil_avatar: 'Avatar',
    perfil_trocar_foto: 'Change photo',
    perfil_remover_foto: 'Remove photo',
    perfil_nome: 'Name',
    perfil_seu_nome: 'Your name',
    perfil_username: 'Username',
    perfil_email_bloqueado: "Email can't be changed here",
    perfil_newsletter_sub: 'Get news, offers and tips from Cora Render.',
    perfil_newsletter_legal1: '9BARRA7 uses your data to send news, offers and tips, based on legitimate interest.',
    perfil_newsletter_legal2: "We don't share it with third parties, and you can turn it off anytime. More in the",
    perfil_politica_privacidade: 'privacy policy',
    perfil_salvar_alteracoes: 'Save changes',
    perfil_sessoes: 'Sessions & devices',
    perfil_disp_sub: 'Each account can have up to 2 computers on the plugin and 3 devices on the web version. Use is one at a time (plugin or web, never both at once).',
    perfil_nenhum_disp: 'No devices connected yet.',
    perfil_dispositivo: 'Device',
    perfil_em_uso: 'In use now',
    perfil_ultimo_acesso: 'Last access:',
    perfil_versao_web: 'Web version',
    perfil_pago_nao_deletar: "You have an active paid plan, so the account can't be deleted directly. Cancel the subscription first (under Subscription) or contact support.",
    perfil_deletar_aviso: "This action is permanent and erases all your data. It can't be undone.",
    perfil_deletar_minha_conta: 'Delete my account',
    perfil_deletar_titulo: 'Delete your account?',
    perfil_deletar_modal_p: "This action is permanent. All your data will be erased and can't be recovered.",
    perfil_deletando: 'Deleting...',
    perfil_sim_deletar: 'Yes, delete',
    perfil_problemas_comuns: 'Common issues',
    perfil_ajuda_seg: 'If you exceed the allowed number of devices, remove one from the list. After saving, you can connect the new computer on your next login.',
    perfil_num_usuarios: 'Number of users',
    perfil_ajuda_num1: "If you're a company and need more users, we have special offers.",
    perfil_conheca_planos_equipe: 'See our team plans',
    perfil_ajuda_num2: 'for more information.',
    perfil_ajuda_final1: 'Each account can have up to',
    perfil_ajuda_final_pc: '2 computers on the plugin',
    perfil_ajuda_final_e: 'and',
    perfil_ajuda_final_web: '3 devices on the web version',
    perfil_ajuda_final2: ', used one at a time (never plugin and web at the same time).',
    perfil_confirm_remover_pc: 'Remove this computer? It will need to be reconnected on the next login.',
    perfil_alteracoes_salvas: 'Changes saved.',
    perfil_foto_titulo: 'Profile photo',
    perfil_foto_orient: '1:1 ratio · 400×400px recommended. Drag and use zoom to frame.',
    perfil_escolher_outra: 'Choose another',
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
    comum_carregando: 'Cargando...',
    comum_salvar: 'Guardar',
    comum_salvando: 'Guardando...',
    comum_cancelar: 'Cancelar',
    comum_remover: 'Quitar',
    comum_ajuda: 'Ayuda',
    perfil_perfil: 'Perfil',
    perfil_preferencias: 'Preferencias',
    perfil_notificacoes: 'Notificaciones',
    perfil_seguranca: 'Seguridad',
    perfil_deletar_conta: 'Eliminar cuenta',
    perfil_avatar: 'Avatar',
    perfil_trocar_foto: 'Cambiar foto',
    perfil_remover_foto: 'Quitar foto',
    perfil_nome: 'Nombre',
    perfil_seu_nome: 'Tu nombre',
    perfil_username: 'Usuario',
    perfil_email_bloqueado: 'El email no se puede cambiar aquí',
    perfil_newsletter_sub: 'Recibe novedades, promociones y consejos de Cora Render.',
    perfil_newsletter_legal1: '9BARRA7 usa tus datos para enviar novedades, promociones y consejos, con base en interés legítimo.',
    perfil_newsletter_legal2: 'No los compartimos con terceros, y puedes desactivarlo cuando quieras. Más en la',
    perfil_politica_privacidade: 'política de privacidad',
    perfil_salvar_alteracoes: 'Guardar cambios',
    perfil_sessoes: 'Sesiones y dispositivos',
    perfil_disp_sub: 'Cada cuenta puede tener hasta 2 computadoras en el plugin y 3 dispositivos en la versión web. El uso es de uno a la vez (plugin o web, nunca a la vez).',
    perfil_nenhum_disp: 'Ningún dispositivo conectado todavía.',
    perfil_dispositivo: 'Dispositivo',
    perfil_em_uso: 'En uso ahora',
    perfil_ultimo_acesso: 'Último acceso:',
    perfil_versao_web: 'Versión web',
    perfil_pago_nao_deletar: 'Tienes un plan de pago activo, así que no se puede eliminar la cuenta directamente. Cancela la suscripción primero (en Suscripción) o contacta con soporte.',
    perfil_deletar_aviso: 'Esta acción es permanente y borra todos tus datos. No se puede deshacer.',
    perfil_deletar_minha_conta: 'Eliminar mi cuenta',
    perfil_deletar_titulo: '¿Eliminar tu cuenta?',
    perfil_deletar_modal_p: 'Esta acción es permanente. Todos tus datos serán borrados y no se pueden recuperar.',
    perfil_deletando: 'Eliminando...',
    perfil_sim_deletar: 'Sí, eliminar',
    perfil_problemas_comuns: 'Problemas comunes',
    perfil_ajuda_seg: 'Si superas el número de dispositivos permitido, quita uno de la lista. Después de guardar, podrás conectar la nueva computadora en el próximo inicio de sesión.',
    perfil_num_usuarios: 'Número de usuarios',
    perfil_ajuda_num1: 'Si eres una empresa y necesitas más usuarios, tenemos ofertas especiales.',
    perfil_conheca_planos_equipe: 'Conoce los planes para equipos',
    perfil_ajuda_num2: 'para más información.',
    perfil_ajuda_final1: 'Cada cuenta puede tener hasta',
    perfil_ajuda_final_pc: '2 computadoras en el plugin',
    perfil_ajuda_final_e: 'y',
    perfil_ajuda_final_web: '3 dispositivos en la versión web',
    perfil_ajuda_final2: ', usados de uno a la vez (nunca plugin y web a la vez).',
    perfil_confirm_remover_pc: '¿Quitar esta computadora? Tendrá que reconectarse en el próximo inicio de sesión.',
    perfil_alteracoes_salvas: 'Cambios guardados.',
    perfil_foto_titulo: 'Foto de perfil',
    perfil_foto_orient: 'Proporción 1:1 · recomendado 400×400px. Arrastra y usa el zoom para encuadrar.',
    perfil_escolher_outra: 'Elegir otra',
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
