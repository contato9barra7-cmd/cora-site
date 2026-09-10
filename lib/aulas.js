// ═══════════════════════════════════════════════════════════════════════════
//  AS AULAS DO CORA
//
//  Sete módulos, 33 aulas. Os títulos são os das gravações, e a ordem é a da
//  pasta `#AULAS` — módulo e número dentro do módulo.
//
//  `panda` é o identificador do vídeo na Panda Video, e NASCE VAZIO de
//  propósito: enquanto ele não existir, a aula continua aparecendo na lista,
//  mas abre dizendo "em breve" em vez de um quadro preto. Preencher aqui é a
//  única coisa que falta para uma aula entrar no ar.
//
//  Os títulos ficam em português no dado, e quem traduz é o `tOpt` na hora de
//  pintar — mesmo acordo do resto do app. O PT é o canônico porque é o nome
//  do arquivo da gravação, e ele não pode mudar quando alguém troca o idioma.
// ═══════════════════════════════════════════════════════════════════════════

import { registrarOpcoes } from './i18n';

export const MODULOS = [
  {
    id: '00',
    titulo: 'Comecei agora, e aí',
    capa: '/img/aulas/00.webp',
    aulas: [
      { id: '00-01', titulo: 'O que é o Cora Render', panda: '' },
      { id: '00-02', titulo: 'Web ou plugin? Qual usar', panda: '' },
      { id: '00-03', titulo: 'Qual plano combina com você', panda: '' },
      { id: '00-04', titulo: 'Colocando o Cora pra rodar', panda: '' },
      { id: '00-05', titulo: 'Atualizações', panda: '' },
    ],
  },
  {
    id: '01',
    titulo: 'Ferramentas de modelagem',
    capa: '/img/aulas/01.webp',
    aulas: [
      { id: '01-01', titulo: 'Tour pelo painel e toolbars', panda: '' },
      { id: '01-02', titulo: 'Gerenciando materiais no Cora', panda: '' },
      { id: '01-03', titulo: 'Ferramentas de textura', panda: '' },
      { id: '01-04', titulo: 'Material Resizer', panda: '' },
      { id: '01-05', titulo: 'Gerenciando blocos no Cora', panda: '' },
      { id: '01-06', titulo: 'Randomizar elementos', panda: '' },
      { id: '01-07', titulo: 'Randomizar materiais', panda: '' },
      { id: '01-08', titulo: 'Distribuir componentes', panda: '' },
      { id: '01-09', titulo: 'Purge e Otimizar', panda: '' },
    ],
  },
  {
    id: '02',
    titulo: 'Preparando a cena pro render',
    capa: '/img/aulas/02.webp',
    aulas: [
      { id: '02-01', titulo: 'Proporção, safe frame e enquadramento', panda: '' },
      { id: '02-02', titulo: 'Luzes: linear, spot e plafon', panda: '' },
      { id: '02-03', titulo: 'Espelho e vidros refletivos', panda: '' },
    ],
  },
  {
    id: '03',
    titulo: 'Gerando imagem com IA',
    capa: '/img/aulas/03.webp',
    aulas: [
      { id: '03-01', titulo: 'Seu primeiro render', panda: '' },
      { id: '03-02', titulo: 'Histórico e feed', panda: '' },
      { id: '03-03', titulo: 'Batch (render em série)', panda: '' },
      { id: '03-04', titulo: 'Render 360°', panda: '' },
      { id: '03-05', titulo: 'Planta baixa humanizada', panda: '' },
      { id: '03-06', titulo: 'Análises', panda: '' },
    ],
  },
  {
    id: '04',
    titulo: 'Editar e pós-produção',
    capa: '/img/aulas/04.webp',
    aulas: [
      { id: '04-01', titulo: 'Tour pela aba Editar', panda: '' },
      { id: '04-02', titulo: 'Edição, ambientação e mudar mood', panda: '' },
      { id: '04-03', titulo: 'Preenchimento generativo', panda: '' },
      { id: '04-04', titulo: 'Expansão generativa', panda: '' },
      { id: '04-05', titulo: 'Pós-produção', panda: '' },
      { id: '04-06', titulo: 'Upscale de imagem', panda: '' },
    ],
  },
  {
    id: '05',
    titulo: 'Dando movimento',
    capa: '/img/aulas/05.webp',
    aulas: [
      { id: '05-01', titulo: 'Animação', panda: '' },
      { id: '05-02', titulo: 'Timelapse', panda: '' },
      { id: '05-03', titulo: 'Diretor de narrativa', panda: '' },
    ],
  },
  {
    id: '06',
    titulo: 'O próximo passo',
    capa: '/img/aulas/06.webp',
    aulas: [
      { id: '06-01', titulo: 'O próximo passo', panda: '' },
    ],
  },
];

export const TOTAL_AULAS = MODULOS.reduce((n, m) => n + m.aulas.length, 0);

/* O endereço do player. Vazio enquanto a aula não tiver vídeo — quem decide o
   que mostrar é a tela, olhando o `panda`.

   O campo aceita as duas formas, e é de propósito:

     'https://player-vz-abc.tv.pandavideo.com.br/embed/?v=xxxx'
        o link inteiro, do jeito que a Panda entrega no botão de incorporar.
        Cola e funciona, sem precisar configurar nada.

     'xxxx'
        só o identificador do vídeo. Aí a biblioteca vem de
        NEXT_PUBLIC_PANDA_LIB, no Vercel, e as 33 linhas ficam curtas.

   Sem a variável e sem link inteiro, a aula continua na lista e abre dizendo
   "em breve". */
const BIBLIOTECA = process.env.NEXT_PUBLIC_PANDA_LIB || '';
export function urlDoVideo(panda) {
  if (!panda) return '';
  if (/^https?:\/\//i.test(panda)) return panda;
  if (!BIBLIOTECA) return '';
  return `https://player-${BIBLIOTECA}.tv.pandavideo.com.br/embed/?v=${encodeURIComponent(panda)}`;
}

/* Os títulos em inglês e espanhol. Três deles ("Análises", "Pós-produção",
   "Animação") já moram no dicionário de opções por causa das ferramentas, e
   por isso não se repetem aqui. */
registrarOpcoes({
  'Comecei agora, e aí': { en: 'I just started, now what?', es: 'Empecé ahora, ¿y ahora qué?' },
  'Ferramentas de modelagem': { en: 'Modeling tools', es: 'Herramientas de modelado' },
  'Preparando a cena pro render': { en: 'Getting the scene ready', es: 'Preparando la escena para el render' },
  'Gerando imagem com IA': { en: 'Generating images with AI', es: 'Generando imágenes con IA' },
  'Editar e pós-produção': { en: 'Editing and post-production', es: 'Editar y postproducción' },
  'Dando movimento': { en: 'Putting it in motion', es: 'Dando movimiento' },
  'O próximo passo': { en: 'The next step', es: 'El próximo paso' },

  'O que é o Cora Render': { en: 'What Cora Render is', es: 'Qué es Cora Render' },
  'Web ou plugin? Qual usar': { en: 'Web or plugin? Which to use', es: '¿Web o plugin? Cuál usar' },
  'Qual plano combina com você': { en: 'Which plan fits you', es: 'Qué plan combina contigo' },
  'Colocando o Cora pra rodar': { en: 'Getting Cora running', es: 'Poniendo Cora a funcionar' },
  'Atualizações': { en: 'Updates', es: 'Actualizaciones' },

  'Tour pelo painel e toolbars': { en: 'A tour of the panel and toolbars', es: 'Recorrido por el panel y las toolbars' },
  'Gerenciando materiais no Cora': { en: 'Managing materials in Cora', es: 'Gestionando materiales en Cora' },
  'Ferramentas de textura': { en: 'Texture tools', es: 'Herramientas de textura' },
  'Material Resizer': { en: 'Material Resizer', es: 'Material Resizer' },
  'Gerenciando blocos no Cora': { en: 'Managing components in Cora', es: 'Gestionando bloques en Cora' },
  'Randomizar elementos': { en: 'Randomize elements', es: 'Aleatorizar elementos' },
  'Randomizar materiais': { en: 'Randomize materials', es: 'Aleatorizar materiales' },
  'Distribuir componentes': { en: 'Distribute components', es: 'Distribuir componentes' },
  'Purge e Otimizar': { en: 'Purge and Optimize', es: 'Purge y Optimizar' },

  'Proporção, safe frame e enquadramento': { en: 'Ratio, safe frame and framing', es: 'Proporción, safe frame y encuadre' },
  'Luzes: linear, spot e plafon': { en: 'Lights: linear, spot and ceiling', es: 'Luces: lineal, spot y plafón' },
  'Espelho e vidros refletivos': { en: 'Mirrors and reflective glass', es: 'Espejos y vidrios reflectantes' },

  'Seu primeiro render': { en: 'Your first render', es: 'Tu primer render' },
  'Histórico e feed': { en: 'History and feed', es: 'Historial y feed' },
  'Batch (render em série)': { en: 'Batch (renders in series)', es: 'Batch (render en serie)' },
  'Render 360°': { en: '360° render', es: 'Render 360°' },
  'Planta baixa humanizada': { en: 'Furnished floor plan', es: 'Plano humanizado' },

  'Tour pela aba Editar': { en: 'A tour of the Edit tab', es: 'Recorrido por la pestaña Editar' },
  'Edição, ambientação e mudar mood': { en: 'Editing, staging and changing mood', es: 'Edición, ambientación y cambiar el mood' },
  'Preenchimento generativo': { en: 'Generative fill', es: 'Relleno generativo' },
  'Expansão generativa': { en: 'Generative expand', es: 'Expansión generativa' },
  'Upscale de imagem': { en: 'Image upscale', es: 'Upscale de imagen' },

  'Timelapse': { en: 'Timelapse', es: 'Timelapse' },
  'Diretor de narrativa': { en: 'Story director', es: 'Director de narrativa' },
});
