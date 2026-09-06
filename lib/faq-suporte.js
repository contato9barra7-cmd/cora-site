// ═══════════════════════════════════════════════════════════════════════════
//  AS PERGUNTAS DA PÁGINA DE SUPORTE
//
//  São as dúvidas de quem JÁ é cliente e travou em alguma coisa, que é o que
//  de fato chega no suporte. O FAQ da home cobre o outro lado, de quem ainda
//  vai comprar ("o que é", "substitui o V-Ray"), e não se repete aqui.
//
//  ── Por que fica fora do i18n.js ──
//  São 15 perguntas com resposta longa, em três idiomas: 90 entradas. No
//  dicionário elas ficariam espalhadas entre chaves de botão e rótulo de
//  campo, e a pergunta ficaria longe da resposta. Aqui cada item é um bloco,
//  com os três idiomas juntos, e dá pra editar um sem procurar o outro.
//
//  ── De onde vem cada resposta ──
//  Nada foi inventado. Cancelamento, reembolso e direitos sobre as imagens
//  saem dos Termos de Uso (termos_p5, termos_p7a). O acesso do suporte sai da
//  Política de Privacidade (priv_p6). Crédito, plugin e dispositivos saem do
//  FAQ da home, que o William desenhou e o 9barra7 aprovou. Mudar uma resposta
//  aqui sem mudar o documento correspondente cria duas versões da mesma regra.
//
//  ── O <strong> nas respostas ──
//  O texto entra por `dangerouslySetInnerHTML`, e isso é seguro porque o HTML
//  é NOSSO: nada aqui interpola entrada de usuário. Vale a mesma advertência
//  que está no i18n.js. Se um dia alguma resposta passar a receber dado de
//  fora, este arquivo deixa de poder ir por ali.
// ═══════════════════════════════════════════════════════════════════════════

export const GRUPOS = [
  { id: 'conta',    pt: 'Conta e acesso',          en: 'Account and access',      es: 'Cuenta y acceso' },
  { id: 'cobranca', pt: 'Cobrança e créditos',     en: 'Billing and credits',     es: 'Facturación y créditos' },
  { id: 'plugin',   pt: 'Plugin e compatibilidade', en: 'Plugin and compatibility', es: 'Plugin y compatibilidad' },
  { id: 'dados',    pt: 'Direitos e dados',        en: 'Rights and data',         es: 'Derechos y datos' },
];

export const TUDO = { pt: 'Todos os assuntos', en: 'All topics', es: 'Todos los temas' };

export const PERGUNTAS = [
  // ── conta e acesso ────────────────────────────────────────────────────────
  {
    g: 'conta',
    pt: {
      q: 'Não consigo entrar na minha conta.',
      r: 'Use o link <strong>Esqueci minha senha</strong> na tela de entrada. O e-mail de redefinição chega em poucos minutos, e vale conferir a caixa de spam. Se ele nunca chega, pode ser que a conta esteja em outro endereço. Escreva pra gente que a gente localiza.',
    },
    en: {
      q: 'I cannot sign in to my account.',
      r: 'Use the <strong>Forgot my password</strong> link on the sign-in screen. The reset email arrives within a few minutes, and it is worth checking your spam folder. If it never shows up, the account may be under another address. Write to us and we will find it.',
    },
    es: {
      q: 'No puedo entrar en mi cuenta.',
      r: 'Usa el enlace <strong>Olvidé mi contraseña</strong> en la pantalla de entrada. El correo de restablecimiento llega en pocos minutos, y vale la pena revisar la carpeta de spam. Si nunca llega, puede que la cuenta esté en otra dirección. Escríbenos y la localizamos.',
    },
  },
  {
    g: 'conta',
    pt: {
      q: 'Não recebi o e-mail de confirmação.',
      r: 'Confira o spam e a lixeira primeiro. E-mail corporativo costuma segurar mensagem automática. Se não estiver lá, peça o reenvio na tela de verificação. Se ainda assim não chegar, escreva pra gente com o endereço que você usou no cadastro.',
    },
    en: {
      q: 'I did not get the confirmation email.',
      r: 'Check spam and trash first. Corporate email often holds automated messages. If it is not there, ask for a new one on the verification screen. If it still does not arrive, write to us with the address you signed up with.',
    },
    es: {
      q: 'No recibí el correo de confirmación.',
      r: 'Revisa primero el spam y la papelera. El correo corporativo suele retener los mensajes automáticos. Si no está ahí, pide el reenvío en la pantalla de verificación. Si aun así no llega, escríbenos con la dirección que usaste al registrarte.',
    },
  },
  {
    g: 'conta',
    pt: {
      q: 'Como eu troco o e-mail da conta?',
      r: 'O e-mail é a chave do seu acesso, então ele não muda pelo painel. Escreva pra gente a partir do endereço antigo dizendo qual é o novo, e a gente faz a troca sem mexer no plano, nos créditos nem no histórico.',
    },
    en: {
      q: 'How do I change the account email?',
      r: 'Your email is the key to your access, so it cannot be changed from the panel. Write to us from the old address telling us the new one, and we will make the change without touching your plan, your credits or your history.',
    },
    es: {
      q: '¿Cómo cambio el correo de la cuenta?',
      r: 'El correo es la llave de tu acceso, así que no se cambia desde el panel. Escríbenos desde la dirección anterior indicando cuál es la nueva, y hacemos el cambio sin tocar el plan, los créditos ni el historial.',
    },
  },
  {
    g: 'conta',
    pt: {
      q: 'Apareceu que a minha conta está em uso em outro computador.',
      r: 'O plugin roda em até 2 computadores, com uso em um por vez, e a versão web aceita até 3 dispositivos. Se você trocou de máquina, remova o dispositivo antigo no painel da sua conta e entre de novo.',
    },
    en: {
      q: 'It says my account is in use on another computer.',
      r: 'The plugin runs on up to 2 computers, one at a time, and the web version accepts up to 3 devices. If you changed machines, remove the old device in your account panel and sign in again.',
    },
    es: {
      q: 'Aparece que mi cuenta está en uso en otro ordenador.',
      r: 'El plugin funciona en hasta 2 ordenadores, uno a la vez, y la versión web acepta hasta 3 dispositivos. Si cambiaste de máquina, elimina el dispositivo anterior en el panel de tu cuenta y entra de nuevo.',
    },
  },

  // ── cobrança e créditos ───────────────────────────────────────────────────
  {
    g: 'cobranca',
    pt: {
      q: 'Posso cancelar quando quiser?',
      r: 'Pode, sem fidelidade, com um clique nas configurações da sua conta. O cancelamento encerra a <strong>renovação seguinte</strong>: o plano continua valendo até o fim do período que você já pagou, com os créditos daquele ciclo disponíveis, e depois disso não cobra de novo. Nada é cortado no meio do caminho.',
    },
    en: {
      q: 'Can I cancel anytime?',
      r: 'You can, with no lock-in, in one click from your account settings. Cancelling ends the <strong>next renewal</strong>: your plan stays valid until the end of the period you already paid for, with that cycle’s credits available, and after that nothing is charged again. Nothing is cut off midway.',
    },
    es: {
      q: '¿Puedo cancelar cuando quiera?',
      r: 'Puedes, sin permanencia, con un clic en la configuración de tu cuenta. La cancelación cierra la <strong>renovación siguiente</strong>: el plan sigue vigente hasta el final del período que ya pagaste, con los créditos de ese ciclo disponibles, y después de eso no se cobra de nuevo. Nada se corta a mitad de camino.',
    },
  },
  {
    // A conta do consumido é feita à mão hoje: a tabela `transacoes` diz o que
    // foi debitado, e alguém emite o reembolso parcial no Stripe. Por isso o
    // texto não promete automático. Ver cerebro/status.md.
    g: 'cobranca',
    pt: {
      q: 'Dá para pedir reembolso?',
      r: 'Dá, dentro de <strong>7 dias</strong> da contratação, que é o direito de arrependimento do art. 49 do Código de Defesa do Consumidor. O valor devolvido desconta os créditos que você já usou, porque o processamento deles já aconteceu. Peça nas configurações da conta ou por aqui, que a gente faz a conta e devolve.',
    },
    en: {
      q: 'Can I ask for a refund?',
      r: 'Yes, within <strong>7 days</strong> of purchase, under the right of withdrawal in article 49 of the Brazilian Consumer Protection Code. The amount refunded deducts the credits you already used, because that processing already happened. Ask in your account settings or here, and we will do the math and refund you.',
    },
    es: {
      q: '¿Puedo pedir un reembolso?',
      r: 'Sí, dentro de <strong>7 días</strong> de la contratación, por el derecho de arrepentimiento del art. 49 del Código de Defensa del Consumidor de Brasil. El importe devuelto descuenta los créditos que ya usaste, porque ese procesamiento ya ocurrió. Pídelo en la configuración de tu cuenta o por aquí, y hacemos la cuenta y te devolvemos.',
    },
  },
  {
    g: 'cobranca',
    pt: {
      q: 'A cobrança não passou. E agora?',
      r: 'A cobrança é tentada de novo automaticamente nos dias seguintes. Para resolver na hora, abra o portal de assinatura no painel da sua conta e atualize o cartão. A gente não guarda o número do seu cartão em momento nenhum.',
    },
    en: {
      q: 'The payment failed. What now?',
      r: 'The charge is retried automatically over the following days. To fix it right away, open the subscription portal in your account panel and update your card. We never store your card number.',
    },
    es: {
      q: 'El cobro no pasó. ¿Y ahora?',
      r: 'El cobro se reintenta automáticamente en los días siguientes. Para resolverlo al momento, abre el portal de suscripción en el panel de tu cuenta y actualiza la tarjeta. Nunca guardamos el número de tu tarjeta.',
    },
  },
  {
    g: 'cobranca',
    pt: {
      q: 'Onde eu vejo as minhas faturas e recibos?',
      r: 'No portal de assinatura, dentro do painel da sua conta. Lá ficam o histórico de cobranças, os recibos e a troca de cartão.',
    },
    en: {
      q: 'Where do I find my invoices and receipts?',
      r: 'In the subscription portal, inside your account panel. That is where the billing history, the receipts and the card change live.',
    },
    es: {
      q: '¿Dónde veo mis facturas y recibos?',
      r: 'En el portal de suscripción, dentro del panel de tu cuenta. Ahí están el historial de cobros, los recibos y el cambio de tarjeta.',
    },
  },
  {
    g: 'cobranca',
    pt: {
      q: 'A geração falhou. Perdi o crédito?',
      r: 'Não. Quando a geração falha, o crédito volta pro seu saldo automaticamente. Se você viu o saldo cair sem receber a imagem, manda o horário aproximado e o que estava gerando que a gente confere no registro.',
    },
    en: {
      q: 'The generation failed. Did I lose the credit?',
      r: 'No. When a generation fails, the credit goes back to your balance automatically. If your balance dropped without an image, send us the approximate time and what you were generating and we will check the log.',
    },
    es: {
      q: 'La generación falló. ¿Perdí el crédito?',
      r: 'No. Cuando la generación falla, el crédito vuelve a tu saldo automáticamente. Si viste bajar el saldo sin recibir la imagen, envía la hora aproximada y qué estabas generando y lo revisamos en el registro.',
    },
  },
  {
    g: 'cobranca',
    pt: {
      q: 'O meu saldo não bate com o que eu esperava.',
      r: 'A cota do plano volta cheia na data da sua assinatura e não acumula de um mês pro outro. As recargas avulsas valem por 6 meses e só entram depois que os créditos do plano acabam. Cada operação tem um custo próprio, que muda conforme a resolução.',
    },
    en: {
      q: 'My balance is not what I expected.',
      r: 'Your plan quota refills on your subscription date and does not roll over from one month to the next. One-off top-ups last 6 months and only kick in after the plan credits run out. Each operation has its own cost, which changes with the resolution.',
    },
    es: {
      q: 'Mi saldo no coincide con lo que esperaba.',
      r: 'La cuota del plan se recarga en la fecha de tu suscripción y no se acumula de un mes a otro. Las recargas sueltas valen 6 meses y solo entran después de que se acaban los créditos del plan. Cada operación tiene un coste propio, que cambia según la resolución.',
    },
  },

  // ── plugin e compatibilidade ──────────────────────────────────────────────
  {
    g: 'plugin',
    pt: {
      q: 'Instalei e o Cora não aparece no SketchUp.',
      r: 'Abra o Gerenciador de Extensões, no menu Janela do SketchUp, e veja se o Cora Render está na lista e habilitado. Se estiver desligado, ligue e reinicie o SketchUp. Se nem aparecer na lista, instale o arquivo .rbz de novo pelo botão de instalar extensão.',
    },
    en: {
      q: 'I installed it and Cora does not show up in SketchUp.',
      r: 'Open the Extension Manager, under SketchUp’s Window menu, and check whether Cora Render is listed and enabled. If it is off, turn it on and restart SketchUp. If it is not listed at all, install the .rbz file again with the install extension button.',
    },
    es: {
      q: 'Lo instalé y Cora no aparece en SketchUp.',
      r: 'Abre el Administrador de Extensiones, en el menú Ventana de SketchUp, y comprueba si Cora Render está en la lista y habilitado. Si está apagado, actívalo y reinicia SketchUp. Si ni siquiera aparece en la lista, instala el archivo .rbz de nuevo con el botón de instalar extensión.',
    },
  },
  {
    // ⚠ 2025, e não 2018. O dono quer 2018, mas hoje o plugin não carrega lá:
    // `src/core/viewport_capture.rb:7` declara `class TercosOverlay <
    // Sketchup::Overlay`, e essa classe só existe do SketchUp 2023 em diante.
    // O número aqui é o mesmo que a home já publica. Trocar para 2018 SÓ
    // depois de o plugin carregar e ser testado lá. Ver cerebro/status.md.
    g: 'plugin',
    pt: {
      q: 'Em qual versão do SketchUp o plugin funciona?',
      r: 'Hoje o plugin é homologado para o SketchUp 2025 e as versões recentes, no Windows e no macOS. A versão web roda no navegador e não depende do SketchUp: ela parte de qualquer imagem exportada de Revit, Archicad, 3ds Max ou Promob.',
    },
    en: {
      q: 'Which SketchUp version does the plugin work with?',
      r: 'Today the plugin is certified for SketchUp 2025 and recent versions, on Windows and macOS. The web version runs in the browser and does not depend on SketchUp: it starts from any image exported from Revit, Archicad, 3ds Max or Promob.',
    },
    es: {
      q: '¿Con qué versión de SketchUp funciona el plugin?',
      r: 'Hoy el plugin está homologado para SketchUp 2025 y las versiones recientes, en Windows y macOS. La versión web funciona en el navegador y no depende de SketchUp: parte de cualquier imagen exportada de Revit, Archicad, 3ds Max o Promob.',
    },
  },
  {
    g: 'plugin',
    pt: {
      q: 'Preciso de um computador potente?',
      r: 'Para gerar, não. A parte de IA roda na nuvem, e é de lá que sai a imagem. As ferramentas de modelagem do plugin rodam na sua máquina, mas são leves, do tipo que o SketchUp já aguenta sem esforço.',
    },
    en: {
      q: 'Do I need a powerful computer?',
      r: 'To generate, no. The AI side runs in the cloud, and that is where the image comes from. The plugin’s modelling tools run on your machine, but they are light, the kind SketchUp already handles without effort.',
    },
    es: {
      q: '¿Necesito un ordenador potente?',
      r: 'Para generar, no. La parte de IA corre en la nube, y de ahí sale la imagen. Las herramientas de modelado del plugin corren en tu máquina, pero son ligeras, del tipo que SketchUp ya soporta sin esfuerzo.',
    },
  },

  // ── direitos e dados ──────────────────────────────────────────────────────
  {
    g: 'dados',
    pt: {
      q: 'As imagens são minhas? Posso usar comercialmente?',
      r: 'São suas, e pode: projeto comercial, aprovação de cliente e portfólio. A ressalva é o conteúdo original de terceiros que você tenha colocado na cena, que continua sendo de quem é. Como o resultado vem de IA, a gente não garante que ele seja único.',
    },
    en: {
      q: 'Are the images mine? Can I use them commercially?',
      r: 'They are yours, and you can: commercial work, client approval and portfolio. The exception is third-party original content you placed in the scene, which stays with whoever owns it. Since the result comes from AI, we do not guarantee it is unique.',
    },
    es: {
      q: '¿Las imágenes son mías? ¿Puedo usarlas comercialmente?',
      r: 'Son tuyas, y puedes: proyecto comercial, aprobación de cliente y portafolio. La salvedad es el contenido original de terceros que hayas puesto en la escena, que sigue siendo de quien es. Como el resultado viene de IA, no garantizamos que sea único.',
    },
  },
  {
    g: 'dados',
    pt: {
      q: 'A equipe de suporte consegue ver a minha conta?',
      r: 'Para investigar um problema, uma pessoa autorizada da equipe pode abrir a sua conta em <strong>modo de leitura</strong>, por no máximo 30 minutos. Nesse acesso não dá para alterar dados, comprar nem gerar imagem. Todo acesso fica registrado com quem entrou e quando, e você pode pedir essa lista a qualquer momento.',
    },
    en: {
      q: 'Can the support team see my account?',
      r: 'To investigate a problem, an authorised team member can open your account in <strong>read-only mode</strong>, for at most 30 minutes. During that access it is not possible to change data, buy anything or generate images. Every access is logged with who entered and when, and you can ask for that list at any time.',
    },
    es: {
      q: '¿El equipo de soporte puede ver mi cuenta?',
      r: 'Para investigar un problema, una persona autorizada del equipo puede abrir tu cuenta en <strong>modo de solo lectura</strong>, por un máximo de 30 minutos. En ese acceso no se pueden cambiar datos, comprar ni generar imágenes. Todo acceso queda registrado con quién entró y cuándo, y puedes pedir esa lista en cualquier momento.',
    },
  },
];

// Quantas perguntas cada grupo tem. Contado, nunca escrito à mão: um número
// cravado desencontra do conteúdo na primeira pergunta que entra.
export function contar(id) {
  return PERGUNTAS.filter((p) => p.g === id).length;
}

// O idioma pedido, caindo no português quando a tradução ainda não existe.
// Mesma regra do t() do i18n.js, para as duas não divergirem.
export function noIdioma(item, idioma) {
  return item[idioma] || item.pt;
}
