// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DA HOME
//
//  Gerado por montar-home.py a partir dos <script> de index.html, que e o
//  desenho aprovado. NAO editar aqui: editar o artefato e rodar o script de
//  novo, senao os dois desencontram na primeira mudanca.
//
//  Cada bloco do artefato entra na sua propria IIFE, que e como ele ja vivia
//  na pagina: assim nenhuma variavel de um bloco esbarra na de outro.
//
//  O que roda aqui: carrossel de ferramentas com filtros e arraste, rodizio
//  dos tres passos, dois comparadores antes e depois, galeria das cinco
//  vistas, visor 360 em canvas, abas plugin e web, acordeao do FAQ, esteira
//  de fotos com lupa, contador de alunos e o observador de revelacao.
// ═══════════════════════════════════════════════════════════════════════════

/* eslint-disable */

// Devolve um elemento solto quando o id nao existe no DOM. Ver a nota em
// montar-home.py sobre o menu do cabecalho.
function pegarOuVazio(id) {
  return document.getElementById(id) || document.createElement('div');
}

export function iniciarHome(numeros) {
  if (typeof window === 'undefined') return;

  // O artefato le os numeros dos planos de `window.CORA_PLANOS`, que la vinha
  // de um arquivo solto. Aqui eles vem de lib/planos.js, que e a fonte unica
  // do site: assim a home, a pagina de precos e o checkout nao divergem.
  if (numeros) window.CORA_PLANOS = numeros;

  // A pagina do artefato marcava <html class="js"> pra o CSS saber que o
  // script rodou. Varias regras de estado dependem disso.
  document.documentElement.classList.add('js');

  // ── bloco 1 do artefato ──
  try {
    (function(){
    (function(){
      // 06/09 — decisão do produto: o site NÃO obedece mais ao
      // `prefers-reduced-motion`. A esteira, os ródizios e o 360° rodam pra todo
      // mundo, inclusive pra quem está com "reduzir animações" ligado no sistema.
      // A variável continua existindo, presa em `false`, pra não ter que caçar as
      // nove guardas espalhadas pelo arquivo — e pra ficar num lugar só se um dia
      // a decisão voltar atrás.
      var semMov = false;
      var ferramentas = [
        { nome:'Render fotorrealista', cat:'imagem', txt:'Gera o render da geometria e dos materiais da cena, com luz calculada sem ajuste físico.' },
        { nome:'Batch, imagens em série', cat:'imagem', txt:'Aprovada a luz de um ângulo, o Cora repete a mesma leitura em todas as vistas.' },
        { nome:'Render 360°', cat:'imagem', txt:'Gera panoramas navegáveis direto da cena, para o cliente percorrer pelo navegador.' },
        { nome:'Planta baixa humanizada', cat:'imagem', txt:'Converte vistas de topo e linhas CAD em plantas com pisos reais e sombra calculada.' },
        { nome:'Mudar mood', cat:'edicao', txt:'Troca horário solar, clima e iluminação de uma imagem pronta, sem renderizar de novo.' },
        { nome:'Preenchimento e expansão', cat:'edicao', pro:true, txt:'Troca objetos pontuais sem mexer na cena e expande a borda quando o corte apertou.' },
        { nome:'Pós-produção', cat:'edicao', pro:true, txt:'Exposição, contraste, balanço de branco e curvas de tom, em camadas, na plataforma.' },
        { nome:'Upscale', cat:'edicao', txt:'Eleva a resolução para prancha executiva, telão e banner. Até 4x no Starter, 16K no Pro.' },
        { nome:'Animação', cat:'video', pro:true, txt:'Transforma a perspectiva estática em vídeo em alta definição, com câmera guiada.' },
        { nome:'Timelapse de obra', cat:'video', pro:true, txt:'Simula a evolução da obra ou a montagem do mobiliário a partir de uma imagem base.' },
        { nome:'Diretor de narrativa', cat:'video', pro:true, txt:'Organiza os renders numa sequência cinematográfica e entrega o roteiro take a take.' }
      ];
      var rot = { imagem:'Imagem', video:'Vídeo', edicao:'Edição' };
      var carrossel = document.getElementById('carrossel');
      var trilha = document.getElementById('trilha-ferramentas');
      // O card É a imagem (2:3). Texto e selo ficam por cima dela, não abaixo.
      function cartao(f){
        return '<article class="ferramenta" data-cat="'+f.cat+'">'+
          '<span class="ferramenta__selo">'+rot[f.cat]+'</span>'+
          (f.pro ? '<span class="ferramenta__pro">Pro</span>' : '')+
          '<div class="ferramenta__texto"><h3>'+f.nome+'</h3><p>'+f.txt+'</p></div>'+
          '</article>';
      }

      // Looping infinito: a lista é repetida N vezes e a posição é normalizada de
      // volta para o miolo sempre que passa de um período. Como todas as cópias são
      // idênticas, o salto é invisível — ao percorrer tudo, reencontra o primeiro card.
      // Fica parado no meio (uma cópia de folga de cada lado) para poder dar a volta
      // nos dois sentidos: `scrollLeft` trava em 0 e não permitiria voltar do início.
      var periodo = 0;
      function montar(lista){
        var uma = lista.map(cartao).join('');
        trilha.innerHTML = uma;
        // O período é a distância entre uma cópia e a seguinte. NÃO usar
        // `trilha.scrollWidth`: ele soma o padding lateral da trilha, que existe
        // uma vez só e não faz parte do ciclo — com ele o salto sai torto.
        var vao = parseFloat(getComputedStyle(trilha).gap) || 0;
        var larguraCard = trilha.children[0].getBoundingClientRect().width;
        periodo = lista.length * (larguraCard + vao);
        // Cópias suficientes para nunca faltar card na tela ao dar a volta.
        var copias = Math.max(3, Math.ceil((carrossel.clientWidth * 2) / periodo) + 2);
        trilha.innerHTML = new Array(copias).fill(uma).join('');
        // Confere pelo desenho real: onde a segunda cópia de fato começa.
        var segundaCopia = trilha.children[lista.length];
        if (segundaCopia) periodo = segundaCopia.offsetLeft - trilha.children[0].offsetLeft;
        carrossel.scrollLeft = periodo;
      }
      function normalizar(){
        if (!periodo) return;
        if (carrossel.scrollLeft >= periodo * 2) carrossel.scrollLeft -= periodo;
        else if (carrossel.scrollLeft <= 0) carrossel.scrollLeft += periodo;
      }
      carrossel.addEventListener('scroll', normalizar, { passive: true });
      montar(ferramentas);

      // Arraste com inércia, preservando a rolagem vertical nativa no mobile.
      (function arraste(){
        var pegou = false, xInicial = 0, yInicial = 0, scrollInicial = 0, moveu = false;
        var vel = 0, ultimoX = 0, ultimoT = 0;
        carrossel.addEventListener('pointerdown', function(e){
          if (e.button !== 0 && e.pointerType === 'mouse') return;
          pegou = true; moveu = false; vel = 0;
          xInicial = ultimoX = e.clientX;
          yInicial = e.clientY;
          ultimoT = e.timeStamp;
          scrollInicial = carrossel.scrollLeft;
          if (e.pointerType === 'mouse'){
            try { carrossel.setPointerCapture(e.pointerId); } catch(err){}
          }
        });
        carrossel.addEventListener('pointermove', function(e){
          if (!pegou) return;
          var dx = e.clientX - xInicial;
          var dy = e.clientY - yInicial;
          if (!moveu && Math.abs(dx) > 5){
            // Se o gesto for mais vertical que horizontal no touch, libera para o scroll da página
            if (e.pointerType !== 'mouse' && Math.abs(dy) > Math.abs(dx)){
              pegou = false;
              return;
            }
            moveu = true;
            carrossel.dataset.arrastando = 'true';
            manual = true;
            if (e.pointerType !== 'mouse'){
              try { carrossel.setPointerCapture(e.pointerId); } catch(err){}
            }
          }
          if (moveu){
            carrossel.scrollLeft = scrollInicial - dx;
          }
          var dt = e.timeStamp - ultimoT;
          if (dt > 0) vel = (e.clientX - ultimoX) / dt;   // px por ms
          ultimoX = e.clientX; ultimoT = e.timeStamp;
        });
        // Projeção de momento: desaceleração fluida
        function lancar(v){
          if (semMov || Math.abs(v) < 0.08) return;
          var restante = -v * 1000 * 0.499;
          (function passo(){
            if (pegou) return;
            var d = restante * 0.14;
            if (Math.abs(d) < 0.5) return;
            carrossel.scrollLeft += d;
            restante -= d;
            requestAnimationFrame(passo);
          })();
        }
        function soltar(e){
          if (!pegou) return;
          pegou = false;
          carrossel.dataset.arrastando = 'false';
          if (e && e.pointerId != null && carrossel.releasePointerCapture){
            try { carrossel.releasePointerCapture(e.pointerId); } catch(err){}
          }
          if (moveu) {
            lancar(vel);
          } else if (e) {
            // Clique nas metades laterais: esquerda recua, direita avança (que nem tela de login)
            var rect = carrossel.getBoundingClientRect();
            var relX = (e.clientX - rect.left) / rect.width;
            var primeiroCard = trilha.children[0];
            var salto = (primeiroCard ? primeiroCard.getBoundingClientRect().width : 280) + 16;
            if (relX < 0.28) {
              manual = true;
              carrossel.scrollBy({ left: -salto, behavior: 'smooth' });
            } else if (relX > 0.72) {
              manual = true;
              carrossel.scrollBy({ left: salto, behavior: 'smooth' });
            }
          }
        }
        carrossel.addEventListener('pointerup', soltar);
        carrossel.addEventListener('pointercancel', soltar);
      })();

      // A posição do carrossel acompanha o avanço da seção pela viewport.
      // Uma vez que a pessoa arrastou, a posição é dela: o vínculo só se rearma
      // quando a seção sai inteira da tela (ver o listener de scroll abaixo).
      // Antes ele voltava 1,2s depois e apagava o gesto na primeira rolagem.
      var manual = false;
      var secaoFerramentas = document.getElementById('ferramentas');
      function vincularAoScroll(){
        if (manual || semMov) return;
        var r = secaoFerramentas.getBoundingClientRect();
        var alcance = r.height + window.innerHeight;
        var progresso = (window.innerHeight - r.top) / alcance;
        progresso = Math.max(0, Math.min(1, progresso));
        // Percorre exatamente um período ao longo da seção: no fim, o card sob o
        // olho é o mesmo do começo — que é o efeito de looping pedido.
        // 0.998 evita bater no limite e brigar com a normalização.
        if (periodo > 0) carrossel.scrollLeft = periodo + progresso * periodo * 0.998;
      }
      window.addEventListener('scroll', function(){
        var r = secaoFerramentas.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) manual = false;
        requestAnimationFrame(vincularAoScroll);
      }, { passive: true });
      vincularAoScroll();

      function setas(lista, aplicar){
        lista.forEach(function(btn,i){
          btn.addEventListener('keydown', function(e){
            var d = e.key==='ArrowRight' ? 1 : e.key==='ArrowLeft' ? -1 : 0;
            if(!d) return;
            e.preventDefault();
            var prox = lista[(i+d+lista.length)%lista.length];
            prox.focus(); aplicar(prox);
          });
        });
      }
      // Num tablist só a aba selecionada entra na ordem de tabulação; as outras se
      // alcançam com as setas. Sem isso o Tab percorre as três/quatro uma a uma.
      function roving(lista, btn){
        lista.forEach(function(b){ b.tabIndex = (b===btn ? 0 : -1); });
      }

      var filtros = [].slice.call(document.querySelectorAll('.filtro'));
      function filtrar(btn){
        var alvo = btn.dataset.filtro;
        filtros.forEach(function(b){ b.setAttribute('aria-pressed', String(b===btn)); });
        montar(alvo === 'todas' ? ferramentas : ferramentas.filter(function(f){ return f.cat === alvo; }));
      }
      filtros.forEach(function(b){ b.addEventListener('click', function(){ filtrar(b); }); });
      setas(filtros, filtrar);

      var passos = [].slice.call(document.querySelectorAll('.passo'));
      var quadros = [].slice.call(document.querySelectorAll('.passos__quadro'));
      var palco = document.querySelector('.passos__palco');

      function trocarPasso(btn){
        passos.forEach(function(b){ b.setAttribute('aria-selected', String(b===btn)); });
        quadros.forEach(function(q){ q.dataset.ativo = String(q.dataset.quadro===btn.dataset.passo); });
        roving(passos, btn);
      }
      var DUR = 7000;
      document.documentElement.style.setProperty('--passo-dur', (DUR/1000)+'s');

      // A barra e a troca de passo passam a ter UM relógio só: quem avança o rodízio
      // é o fim da animação da barra, não um `setTimeout` paralelo. Antes eram dois
      // relógios independentes — bastava uma pausa (ponteiro sobre o palco) pra eles
      // desencontrarem, porque a barra retomava de onde parou e o `setTimeout`
      // recomeçava do zero. O resultado era barra cheia parada, ou passo trocando
      // com a barra no meio. Com `animationend`, desencontro deixa de ser possível.
      function barraDe(btn){ return btn.querySelector('.passo__barra i'); }
      function reiniciarBarra(btn){
        // Sem isto a barra não recomeça ao voltar para o passo que já estava ativo.
        var barra = barraDe(btn);
        if (!barra) return;
        barra.style.animation = 'none';
        void barra.offsetWidth;
        barra.style.animation = '';
      }
      // Dois motivos de pausa. O ponteiro NÃO é um deles — ver o comentário no
      // bloco de eventos abaixo.
      var travas = { fora:true, foco:false };
      function aplicarPausa(){
        if (palco) palco.dataset.pausado = String(travas.fora || travas.foco);
      }
      var trocarBase = trocarPasso;
      trocarPasso = function(btn){ trocarBase(btn); reiniciarBarra(btn); };

      var ultimoAvanco = 0;
      function avancarPassoDe(origem){
        var agora = Date.now();
        if (agora - ultimoAvanco < 400) return;
        ultimoAvanco = agora;
        var i = passos.indexOf(origem);
        if (i < 0) return;
        trocarPasso(passos[(i + 1) % passos.length]);
      }

      passos.forEach(function(b){
        b.addEventListener('click', function(){
          // Clique é intenção de avançar: solta a pausa e recomeça a contagem.
          travas.foco = false;
          aplicarPausa();
          // No mobile, tocar no card ativo avança para o próximo passo
          var ehMobile = window.innerWidth < 768;
          if (ehMobile && b.getAttribute('aria-selected') === 'true'){
            avancarPassoDe(b);
          } else {
            trocarPasso(b);
          }
        });
        var barra = barraDe(b);
        if (!barra) return;
        barra.addEventListener('animationend', function(ev){
          if (ev.animationName !== 'preencher') return;
          if (b.getAttribute('aria-selected') !== 'true') return;
          avancarPassoDe(b);
        });
      });

      setas(passos, trocarPasso);

      if (palco && !palco.querySelector('.passos__toque')){
        var toquePasso = document.createElement('div');
        toquePasso.className = 'passos__toque';
        toquePasso.setAttribute('aria-hidden', 'true');
        toquePasso.innerHTML = '<button class="passos__toque-ant" type="button" aria-label="Passo anterior"></button><button class="passos__toque-prox" type="button" aria-label="Próximo passo"></button>';
        palco.appendChild(toquePasso);

        var bAnt = toquePasso.querySelector('.passos__toque-ant');
        var bProx = toquePasso.querySelector('.passos__toque-prox');
        if (bAnt){
          bAnt.addEventListener('click', function(e){
            e.stopPropagation();
            var ativo = passos.findIndex(function(b){ return b.getAttribute('aria-selected') === 'true'; });
            var idx = (ativo - 1 + passos.length) % passos.length;
            trocarPasso(passos[idx]);
          });
        }
        if (bProx){
          bProx.addEventListener('click', function(e){
            e.stopPropagation();
            var ativo = passos.findIndex(function(b){ return b.getAttribute('aria-selected') === 'true'; });
            var idx = (ativo + 1) % passos.length;
            trocarPasso(passos[idx]);
          });
        }
      }

      // WCAG 2.2.2 — conteúdo que troca sozinho precisa de como parar. A pausa é o
      // foco de TECLADO dentro do palco: quem está lendo com o teclado ganha tempo.
      //
      // Duas coisas que estavam aqui e saíram, porque juntas travavam o rodízio de
      // vez (relatado pelo William, 21/08 — 20h36):
      //   · pausa por ponteiro sobre o palco — depois de clicar num bloco o mouse
      //     fica naturalmente ali, então a barra nunca voltava a encher;
      //   · pausa por foco de qualquer origem — o clique dá foco ao botão, e o foco
      //     permanece nele. A pausa virava permanente.
      // Clicar é intenção de avançar, não de parar. Só `:focus-visible` pausa.
      if (palco){
        palco.addEventListener('focusin', function(){
          var a = document.activeElement;
          var porTeclado = false;
          try { porTeclado = !!(a && a.matches && a.matches(':focus-visible')); } catch (e) { porTeclado = false; }
          travas.foco = porTeclado;
          aplicarPausa();
        });
        palco.addEventListener('focusout', function(e){
          if (!palco.contains(e.relatedTarget)){ travas.foco = false; aplicarPausa(); }
        });
        // O rodízio só começa quando a seção aparece. Antes ele partia no `load`:
        // quem rolava até os passos chegava com a barra já cheia e o passo trocado
        // duas ou três vezes, o que lia como bug de carregamento.
        if (!semMov && 'IntersectionObserver' in window){
          var iniciado = false;
          new IntersectionObserver(function(ents){
            ents.forEach(function(en){
              travas.fora = !en.isIntersecting;
              if (en.isIntersecting && !iniciado){
                iniciado = true;
                reiniciarBarra(passos[0]);
              }
              aplicarPausa();
            });
          }, { threshold:0.35 }).observe(palco);
        } else {
          travas.fora = false;
          aplicarPausa();
        }
      }

      // =========================================================
      // DEMONSTRAÇÃO (#demonstracao) — INTERATIVIDADE DAS PROVAS
      // 1. Sliders comparativos antes/depois (Prova 1 e Prova 4 — idêntico ao PromptHub)
      // 2. Galeria estilo stories das 5 vistas (Prova 2)
      // 3. Visualizador 360° interativo com inércia (Prova 5)
      // =========================================================
      (function(){
        // --- 1. Sliders comparativos antes/depois (PromptHub parity) ---
        var comparadores = [].slice.call(document.querySelectorAll('.comparador'));
        comparadores.forEach(function(comp){
          var alca = comp.querySelector('.comparador__alca');
          if (!alca) return;

          function definirPos(p){
            var pos = Math.max(0, Math.min(100, p));
            comp.style.setProperty('--pos', pos + '%');
            if (parseFloat(alca.value) !== pos) alca.value = pos;
          }

          alca.addEventListener('input', function(){
            definirPos(parseFloat(alca.value));
          });
          definirPos(parseFloat(alca.value));

          if (typeof semMov !== 'undefined' && semMov) return;

          var interagiu = false;
          var armado = true;
          var visivel = false;

          alca.addEventListener('pointerdown', function(){
            interagiu = true;
          }, { once: true });

          function executarPeek(){
            var inicio = null;
            var valInicial = parseFloat(alca.value);
            var amp = 17;
            var dur = 1500;
            function quadro(agora){
              if (!interagiu){
                if (inicio === null) inicio = agora;
                var u = Math.min((agora - inicio) / dur, 1);
                var d = u * u * (3 - 2 * u);
                var f = valInicial - Math.sin(Math.PI * d) * amp;
                definirPos(f);
                if (u < 1){
                  requestAnimationFrame(quadro);
                } else {
                  definirPos(valInicial);
                }
              }
            }
            requestAnimationFrame(quadro);
          }

          function imagensProntas(){
            var imgs = comp.querySelectorAll('img');
            for (var i = 0; i < imgs.length; i++){
              if (!imgs[i].complete || !imgs[i].naturalWidth) return false;
            }
            return true;
          }

          var tentativasImg = 0;
          function agendarPeek(){
            if (interagiu || !armado || !visivel) return;
            if (!imagensProntas()){
              if (++tentativasImg > 20) return;
              setTimeout(agendarPeek, 250);
              return;
            }
            tentativasImg = 0;
            armado = false;
            setTimeout(function(){
              if (!interagiu && visivel) executarPeek();
            }, 500);
          }

          if ('IntersectionObserver' in window){
            var observador = new IntersectionObserver(function(entries){
              entries.forEach(function(entry){
                visivel = entry.isIntersecting;
                if (visivel){
                  agendarPeek();
                } else {
                  armado = true;
                }
              });
            }, { threshold: 0.4 });
            observador.observe(comp);
          }
        });

        // --- 2. Galeria estilo stories das 5 vistas ---
        var containerVistas = document.querySelector('.vistas-stories');
        if (containerVistas){
          var itensVistas = [].slice.call(containerVistas.querySelectorAll('.vistas-stories__item'));
          var barrasVistas = [].slice.call(containerVistas.querySelectorAll('.vistas-stories__barra'));
          var toqueAnt = containerVistas.querySelector('.vistas-stories__toque-ant');
          var toqueProx = containerVistas.querySelector('.vistas-stories__toque-prox');

          var indiceVista = 0;
          var DURACAO_VISTA = 5000;
          containerVistas.style.setProperty('--vista-dur', (DURACAO_VISTA / 1000) + 's');

          // Mesmo remédio dos passos (ver o comentário lá em cima): a barra é o
          // relógio. Antes eram dois — uma transição de CSS de 5s e um `setTimeout`
          // de 5s — e bastava a seção sair da tela (ou o ponteiro entrar) pra eles se
          // desencontrarem: o `setTimeout` parava, a barra continuava enchendo, e
          // quem chegava rolando encontrava a primeira vista parada com a barra
          // cheia, esperando 5s pra ir pra segunda. Era a "travada" do 1º pro 2º.
          var travasVistas = { fora: true, ponteiro: false, foco: false };
          function aplicarPausaVistas(){
            containerVistas.dataset.pausado = String(travasVistas.fora || travasVistas.ponteiro || travasVistas.foco);
          }

          function atualizarBarrasVistas(idx){
            barrasVistas.forEach(function(b, i){
              if (i < idx){ b.dataset.status = 'completa'; return; }
              if (i > idx){ b.dataset.status = 'pendente'; return; }
              b.dataset.status = 'ativa';
              var fill = b.querySelector('i');
              if (!fill) return;
              // Sem isto a barra não recomeça ao voltar pra vista que já estava ativa.
              fill.style.animation = 'none';
              void fill.offsetWidth;
              fill.style.animation = '';
            });
          }

          function irParaVista(idx){
            indiceVista = (idx + itensVistas.length) % itensVistas.length;
            barrasVistas.forEach(function(barra, i){
              barra.setAttribute('aria-selected', String(i === indiceVista));
              barra.tabIndex = (i === indiceVista ? 0 : -1);
            });
            itensVistas.forEach(function(it, i){
              it.dataset.ativo = String(i === indiceVista);
            });
            atualizarBarrasVistas(indiceVista);
          }

          function proximaVista(){ irParaVista(indiceVista + 1); }
          function anteriorVista(){ irParaVista(indiceVista - 1); }

          var ultimoAvancoVista = 0;
          barrasVistas.forEach(function(barra){
            var fill = barra.querySelector('i');
            if (!fill) return;
            fill.addEventListener('animationend', function(ev){
              if (ev.animationName !== 'preencher') return;
              if (barra.dataset.status !== 'ativa') return;
              var agora = Date.now();
              if (agora - ultimoAvancoVista < 400) return;
              ultimoAvancoVista = agora;
              proximaVista();
            });
          });

          barrasVistas.forEach(function(barra, i){
            barra.addEventListener('click', function(e){
              e.stopPropagation();
              irParaVista(i);
            });
            barra.addEventListener('keydown', function(e){
              if (e.key === 'ArrowRight'){ e.preventDefault(); proximaVista(); if (barrasVistas[(i + 1) % barrasVistas.length]) barrasVistas[(i + 1) % barrasVistas.length].focus(); }
              else if (e.key === 'ArrowLeft'){ e.preventDefault(); anteriorVista(); if (barrasVistas[(i - 1 + barrasVistas.length) % barrasVistas.length]) barrasVistas[(i - 1 + barrasVistas.length) % barrasVistas.length].focus(); }
            });
          });

          if (toqueAnt){
            toqueAnt.addEventListener('click', function(e){
              e.stopPropagation();
              anteriorVista();
            });
          }
          if (toqueProx){
            toqueProx.addEventListener('click', function(e){
              e.stopPropagation();
              proximaVista();
            });
          }

          // No mouse (desktop): pausa no hover
          // Igual ao story do Instagram: pausa só enquanto está pressionado, no dedo
          // e no mouse. Passar o ponteiro por cima NÃO para — depois de clicar numa
          // barrinha o mouse fica naturalmente parado sobre a imagem, e o ródizio
          // nunca mais voltava a andar. É a mesma decisão que os passos já tinham
          // tomado em 21/08, pelo mesmo motivo.
          containerVistas.addEventListener('pointerdown', function(){
            travasVistas.ponteiro = true;
            aplicarPausaVistas();
          });
          function soltarVistas(){
            if (travasVistas.ponteiro){
              travasVistas.ponteiro = false;
              aplicarPausaVistas();
            }
          }
          containerVistas.addEventListener('pointerup', soltarVistas);
          containerVistas.addEventListener('pointercancel', soltarVistas);
          // Arrastou pra fora do quadro sem soltar o botão: o `pointerup` acontece
          // lá fora e nunca chega aqui. Sem isto a pausa ficaria presa pra sempre.
          containerVistas.addEventListener('pointerleave', soltarVistas);

          // WCAG 2.2.2 — conteúdo que troca sozinho precisa de como parar, e segurar
          // o botão não serve pra quem navega por teclado. Só `:focus-visible` pausa:
          // clique também dá foco ao botão, e o foco fica nele, então pausar por foco
          // de qualquer origem travaria o ródizio de vez.
          containerVistas.addEventListener('focusin', function(){
            var a = document.activeElement;
            var porTeclado = false;
            try { porTeclado = !!(a && a.matches && a.matches(':focus-visible')); } catch (e) { porTeclado = false; }
            travasVistas.foco = porTeclado;
            aplicarPausaVistas();
          });
          containerVistas.addEventListener('focusout', function(e){
            if (!containerVistas.contains(e.relatedTarget)){
              travasVistas.foco = false;
              aplicarPausaVistas();
            }
          });

          if ('IntersectionObserver' in window){
            new IntersectionObserver(function(entries){
              entries.forEach(function(entry){
                travasVistas.fora = !entry.isIntersecting;
                aplicarPausaVistas();
              });
            }, { threshold: 0.15 }).observe(containerVistas);
          } else {
            travasVistas.fora = false;
          }

          aplicarPausaVistas();
          irParaVista(0);
        }

        // --- 3. Visualizador 360° interativo com inércia e render equirretangular ---
        var visor = document.getElementById('visor-360');
        var canvas = document.getElementById('canvas-360');
        if (visor && canvas){
          var ctx = canvas.getContext('2d');
          if (ctx){
            var img360 = new Image();
            var img360Carregada = false;
            img360.src = '/home/360-sala-03.jpg';
            img360.onload = function(){
              img360Carregada = true;
              desenhar360();
            };

            // Começa apontando para o centro da sala (área de estar / janela com sol / mesa de jantar)
            var yaw = Math.PI;
            var pitch = 0;
            var velYaw = 0;
            var velPitch = 0;
            var arrastando360 = false;
            var visivel360 = true;
            var ultX = 0, ultY = 0;

            function redimensionar360(){
              var rect = visor.getBoundingClientRect();
              var dpr = Math.min(window.devicePixelRatio || 1, 2);
              var w = Math.round(rect.width * dpr);
              var h = Math.round(rect.height * dpr);
              if (canvas.width !== w || canvas.height !== h){
                canvas.width = w;
                canvas.height = h;
              }
            }
            redimensionar360();

            function desenhar360(){
              var w = canvas.width;
              var h = canvas.height;
              if (w === 0 || h === 0) return;

              ctx.save();
              if (!img360Carregada){
                ctx.fillStyle = '#0e1015';
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
                return;
              }

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              var ar = w / h;
              // Sem zoom: 144° de abertura horizontal (era 0.45π, 81°). O visor recorta
              // o equirretangular direto, então abrir muito não estica os cantos como
              // uma projeção em perspectiva faria — lê como panorama, e mostra o dobro
              // do ambiente de uma vez.
              var hfov = Math.PI * 0.8;
              var vfov = (ar >= 1) ? (hfov / ar) : (hfov * (h / w));
              var hfovEff = (ar >= 1) ? hfov : (vfov * ar);

              var maxPitch = Math.max(0.2, Math.min(0.5, (Math.PI - vfov) * 0.5 - 0.05));
              var minPitch = -maxPitch;
              pitch = Math.max(minPitch, Math.min(maxPitch, pitch));

              var IW = img360.naturalWidth || 4096;
              var IH = img360.naturalHeight || 2048;

              var uMin = ((yaw - hfovEff * 0.5) / (2 * Math.PI)) % 1;
              if (uMin < 0) uMin += 1;
              var uRange = hfovEff / (2 * Math.PI);
              var sx = uMin * IW;
              var sw = uRange * IW;

              var vTop = (Math.PI * 0.5 - (pitch + vfov * 0.5)) / Math.PI;
              var vRange = vfov / Math.PI;
              var sy = Math.max(0, Math.min(IH, vTop * IH));
              var sh = Math.max(1, Math.min(IH - sy, vRange * IH));

              if (sx + sw <= IW){
                ctx.drawImage(img360, sx, sy, sw, sh, 0, 0, w, h);
              } else {
                // Costura panorâmica circular suave na transição 360°
                var sw1 = IW - sx;
                var dw1 = (sw1 / sw) * w;
                ctx.drawImage(img360, sx, sy, sw1, sh, 0, 0, dw1, h);

                var sw2 = sw - sw1;
                var dw2 = w - dw1;
                ctx.drawImage(img360, 0, sy, sw2, sh, dw1, 0, dw2, h);
              }

              ctx.restore();
            }

            function loop360(){
              if (!visivel360){
                requestAnimationFrame(loop360);
                return;
              }

              if (!arrastando360){
                if (Math.abs(velYaw) > 0.0001 || Math.abs(velPitch) > 0.0001){
                  yaw += velYaw;
                  pitch += velPitch;
                  velYaw *= 0.92;
                  velPitch *= 0.92;
                  if (Math.abs(velYaw) < 0.0001) velYaw = 0;
                  if (Math.abs(velPitch) < 0.0001) velPitch = 0;
                } else if (!(typeof semMov !== 'undefined' && semMov)){
                  // Volta a girar sozinho a partir do ângulo em que a pessoa soltou. Havia
                  // aqui uma trava que, no primeiro toque, desligava o giro automático pra
                  // sempre — quem arrastava uma vez nunca mais via ele voltar.
                  yaw += 0.0008;
                }
              }

              desenhar360();
              requestAnimationFrame(loop360);
            }

            visor.addEventListener('pointerdown', function(e){
              if (e.button !== 0 && e.pointerType === 'mouse') return;
              arrastando360 = true;
              ultX = e.clientX;
              ultY = e.clientY;
              velYaw = 0;
              velPitch = 0;
              if (visor.setPointerCapture) {
                try { visor.setPointerCapture(e.pointerId); } catch(err){}
              }
            });

            visor.addEventListener('pointermove', function(e){
              if (!arrastando360) return;
              var dx = e.clientX - ultX;
              var dy = e.clientY - ultY;
              yaw -= dx * 0.0035;
              pitch += dy * 0.0025;
              velYaw = -dx * 0.003;
              velPitch = dy * 0.002;
              ultX = e.clientX;
              ultY = e.clientY;
            });

            function soltar360(e){
              if (!arrastando360) return;
              arrastando360 = false;
              if (e && e.pointerId != null && visor.releasePointerCapture){
                try { visor.releasePointerCapture(e.pointerId); } catch(err){}
              }
            }
            visor.addEventListener('pointerup', soltar360);
            visor.addEventListener('pointercancel', soltar360);

            visor.addEventListener('keydown', function(e){
              if (e.key === 'ArrowLeft'){ yaw -= 0.05; }
              else if (e.key === 'ArrowRight'){ yaw += 0.05; }
              else if (e.key === 'ArrowUp'){ pitch += 0.04; }
              else if (e.key === 'ArrowDown'){ pitch -= 0.04; }
            });

            if ('IntersectionObserver' in window){
              new IntersectionObserver(function(entries){
                entries.forEach(function(entry){
                  visivel360 = entry.isIntersecting;
                });
              }, { threshold: 0.1 }).observe(visor);
            }

            if ('ResizeObserver' in window){
              new ResizeObserver(function(){
                redimensionar360();
                desenhar360();
              }).observe(visor);
            } else {
              window.addEventListener('resize', redimensionar360);
            }

            requestAnimationFrame(loop360);
          }
        }
      })();

      var ops = [].slice.call(document.querySelectorAll('.switch__op'));
      var paineis = [].slice.call(document.querySelectorAll('.painel'));
      function trocarOnde(btn){
        ops.forEach(function(b){ b.setAttribute('aria-selected', String(b===btn)); });
        paineis.forEach(function(p){
          var ativo = p.dataset.painel === btn.dataset.onde;
          p.setAttribute('aria-hidden', String(!ativo));
        });
        roving(ops, btn);
      }
      ops.forEach(function(b){ b.addEventListener('click', function(){ trocarOnde(b); }); });
      setas(ops, trocarOnde);

      [].slice.call(document.querySelectorAll('.faq__gat')).forEach(function(b,i){
        // `aria-expanded` sozinho diz que algo abriu, mas não diz o quê. O par
        // id + aria-controls é o que aponta pra região que apareceu.
        var resp = b.nextElementSibling;
        if (resp){
          resp.id = 'faq-resp-' + i;
          resp.setAttribute('role', 'region');
          b.setAttribute('aria-controls', resp.id);
          b.id = 'faq-gat-' + i;
          resp.setAttribute('aria-labelledby', b.id);
        }
        b.addEventListener('click', function(){
          b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded')!=='true'));
        });
      });

      var burger = pegarOuVazio('burger');
      var menu = pegarOuVazio('menu');
      function abrirMenu(abrir){
        burger.setAttribute('aria-expanded', String(abrir));
        menu.hidden = !abrir;
      }
      burger.addEventListener('click', function(){
        abrirMenu(burger.getAttribute('aria-expanded')!=='true');
      });
      // Fechar não pode depender só do botão: quem toca num link ia pra seção com o
      // menu ainda por cima dela, e quem usa teclado não tinha como sair.
      menu.addEventListener('click', function(e){
        if (e.target.closest('a')) abrirMenu(false);
      });
      document.addEventListener('keydown', function(e){
        if (e.key === 'Escape' && burger.getAttribute('aria-expanded')==='true'){
          abrirMenu(false);
          burger.focus();
        }
      });

      /* Contador de creditos removido em 30/08 (decisoes_por_secao.md, Secao 08,
         decisao de design 1). A secao virou oferta, nao tabela de preco, e
         credito e unidade de custo: animar o numero fazia o olho parar na
         metrica que nao decide a compra. O contador tambem corrompia a copy
         nova — ele achava o "16" de "upscale 16K" e animava dentro do rotulo,
         que aparecia como "upscale 0K" enquanto a animacao rodava. */

      var alvos = [].slice.call(document.querySelectorAll('.revelar'));
      if (!('IntersectionObserver' in window)) {
        alvos.forEach(function(e){ e.dataset.vis='true'; });
      } else {
        var obs = new IntersectionObserver(function(es){
          es.forEach(function(e){ if(e.isIntersecting){ e.target.dataset.vis='true'; obs.unobserve(e.target); } });
        }, { threshold:0.12 });
        alvos.forEach(function(e){ obs.observe(e); });
        setTimeout(function(){ alvos.forEach(function(e){ e.dataset.vis='true'; }); }, 3500);
      }

      // ===== Esteira do CTA: anda sozinha, arrasta com o ponteiro, amplia no clique
      // Nomes prefixados com `est` de propósito: o script inteiro é uma IIFE só, e
      // `var` repetido aqui quebraria o carrossel de Ferramentas sem erro no console.
      (function esteiraCTA(){
        var estCaixa = document.querySelector('.esteira');
        var estTrilho = estCaixa && estCaixa.querySelector('.esteira__trilho');
        if (!estCaixa || !estTrilho) return;

        var estOriginais = [].slice.call(estTrilho.children);
        var estN = estOriginais.length;
        var estPeriodo = 0;

        // A POSIÇÃO COM FRAÇÃO MORA AQUI, e não no `scrollLeft`.
        //
        // Numa tela sem retina (devicePixelRatio 1) o navegador arredonda o
        // `scrollLeft` para pixel inteiro na hora de guardar. Medido em 07/09/2026:
        // escrever `x + 0,4` devolve `x`, e `x + 0,5` devolve `x + 1`. Ou seja,
        // qualquer passo menor que meio pixel é jogado fora.
        //
        // A esteira anda 30 px por segundo, então o passo por quadro é 30 dividido
        // pela taxa da tela:
        //
        //     60 Hz → 0,50 px  → sobrevive (e vira 1, dobrando a velocidade)
        //     75 Hz → 0,40 px  → some
        //     90 Hz → 0,33 px  → some
        //    120 Hz → 0,25 px  → some
        //
        // Numa tela de 120 Hz a esteira ficava PARADA, e era esse o "às vezes não
        // rola": o mesmo site anda num monitor e congela no outro, e um notebook
        // que troca de 120 para 60 na bateria muda de comportamento sozinho.
        //
        // Guardando a posição aqui e ESCREVENDO o acumulado, a fração sobrevive
        // entre os quadros. O `scrollLeft` continua arredondando na hora de pintar,
        // que é o certo, mas para de comer o movimento.
        var estPos = 0;

        function estMontar(){
          // Volta ao estado de origem antes de recalcular (troca de largura).
          while (estTrilho.children.length > estN) estTrilho.removeChild(estTrilho.lastChild);
          var vao = parseFloat(getComputedStyle(estTrilho).gap) || 0;
          var larg = estOriginais[0].getBoundingClientRect().width;
          estPeriodo = estN * (larg + vao);
          var copias = Math.max(3, Math.ceil((estCaixa.clientWidth * 2) / estPeriodo) + 2);
          for (var c = 1; c < copias; c++){
            for (var i = 0; i < estN; i++){
              var cl = estOriginais[i].cloneNode(true);
              // Cópia não é parada de tabulação nem item de leitor de tela: o mesmo
              // render apareceria 3 vezes na navegação por teclado.
              cl.setAttribute('aria-hidden','true');
              cl.setAttribute('tabindex','-1');
              cl.dataset.copia = '1';
              estTrilho.appendChild(cl);
            }
          }
          var segunda = estTrilho.children[estN];
          if (segunda) estPeriodo = segunda.offsetLeft - estTrilho.children[0].offsetLeft;
          // A fita de luz recebe o mesmo número de cópias, senão ela acaba antes.
          if (luzTrilho){
            while (luzTrilho.children.length > luzOriginais.length) luzTrilho.removeChild(luzTrilho.lastChild);
            for (var lc = 1; lc < copias; lc++)
              for (var li = 0; li < luzOriginais.length; li++)
                luzTrilho.appendChild(luzOriginais[li].cloneNode(true));
          }
          estPos = estPeriodo;
          estCaixa.scrollLeft = estPos;
          estSincronizarLuz();
        }
        // A volta é dada em `estPos`, não no `scrollLeft`: se o salto fosse feito
        // no DOM, a fração acumulada aqui ficaria para trás e a esteira daria um
        // tranco de até um pixel a cada volta.
        function estNormalizar(){
          if (!estPeriodo) return;
          if (estPos >= estPeriodo * 2) estPos -= estPeriodo;
          else if (estPos <= 0) estPos += estPeriodo;
          else return;
          estCaixa.scrollLeft = estPos;
        }
        // A fita de luz repete a mesma sequência e recebe o MESMO deslocamento da
        // fita de cima, então cada brilho fica exatamente atrás da sua imagem.
        var luzTrilho = document.querySelector('.cta__luz-trilho');
        var luzOriginais = luzTrilho ? [].slice.call(luzTrilho.children) : [];
        function estSincronizarLuz(){
          if (luzTrilho) luzTrilho.style.transform = 'translateX(' + (-estCaixa.scrollLeft) + 'px)';
        }
        // Rolagem que NÃO veio daqui (roda do mouse, trackpad, teclado, barra)
        // move o `scrollLeft` sem passar por `estPos`. Quando os dois divergem mais
        // de um pixel, quem manda é o DOM: foi a pessoa que mexeu. Abaixo disso é
        // só o arredondamento da nossa própria escrita, e reajustar aí desfaria a
        // fração que este acumulador existe pra guardar.
        estCaixa.addEventListener('scroll', function(){
          if (Math.abs(estCaixa.scrollLeft - estPos) > 1) estPos = estCaixa.scrollLeft;
          estNormalizar();
          estSincronizarLuz();
        }, { passive:true });
        estMontar();

        // Movimento contínuo por rAF, no lugar do `@keyframes`.
        //
        // A velocidade agora é em PIXELS POR SEGUNDO, não "um período a cada 46s".
        // Com a conta antiga, acrescentar imagens acelerava a esteira: o período
        // crescia e o tempo continuava o mesmo. Com 26 cards ela passou de 149 px/s.
        // Fixo em 30 px/s, o número de imagens deixa de mexer no ritmo. Nessa
        // velocidade um card leva uns 10s pra atravessar — ritmo de ambiente, dá
        // tempo de olhar cada imagem sem ela fugir.
        //
        // E o passo vai multiplicado pelo tempo real do quadro: num monitor de
        // 120 Hz o rAF dispara o dobro de vezes, e um passo fixo por quadro dobrava
        // a velocidade. O teto de 50ms evita o pulo ao voltar de outra aba.
        //
        // 60 e não 30: até 07/09/2026 o `scrollLeft` arredondava o passo de 0,5px
        // para 1px inteiro a cada quadro, e quem via a esteira andar via 60 px/s,
        // não os 30 escritos aqui. Consertado o arredondamento (ver `estPos` lá em
        // cima), 30 deixaria a esteira metade da velocidade que ela sempre teve na
        // tela. O número que estava no ar vira o número escrito.
        var EST_VEL = 60;
        var estPegou = false, estParado = false, estForaDaTela = true;
        var estVel = 0;   // px por quadro do lançamento
        var estAnterior = 0;
        function estAndar(agora){
          var dt = estAnterior ? Math.min((agora - estAnterior) / 1000, 0.05) : 0;
          estAnterior = agora;
          if (!estPegou && !estParado && !estForaDaTela && estVel === 0){
            estPos += EST_VEL * dt;
            estCaixa.scrollLeft = estPos;
          }
          if (estVel !== 0){
            estPos += estVel;
            estCaixa.scrollLeft = estPos;
            estVel *= 0.94;
            if (Math.abs(estVel) < 0.4) estVel = 0;
          }
          // Sincroniza a luz TODO quadro, não só no evento de rolagem: durante a
          // inércia o `scroll` chega assíncrono e a luz ficava um quadro atrás.
          estSincronizarLuz();
          requestAnimationFrame(estAndar);
        }
        if (!semMov) requestAnimationFrame(estAndar);

        if ('IntersectionObserver' in window){
          new IntersectionObserver(function(es){
            es.forEach(function(e){ estForaDaTela = !e.isIntersecting; });
          }, { threshold:0 }).observe(estCaixa);
        } else { estForaDaTela = false; }

        // No mouse (desktop): pausa no hover. No touch (mobile): não pausa no hover (evita congelamento após toque)
        estCaixa.addEventListener('pointerenter', function(e){
          if (!e.pointerType || e.pointerType === 'mouse') estParado = true;
        });
        estCaixa.addEventListener('pointerleave', function(e){
          if (!e.pointerType || e.pointerType === 'mouse') estParado = false;
        });

        // Arraste 1:1 com inércia, igual ao carrossel de Ferramentas.
        var estX0 = 0, estScroll0 = 0, estMoveu = false, estUltX = 0, estUltT = 0, estV = 0;
        // Quem foi pego no `pointerdown` precisa ficar guardado: com
        // `setPointerCapture` no contêiner, o `click` que vem depois é reapontado
        // para o contêiner, e `e.target.closest('.esteira__item')` volta nulo — o
        // clique de verdade nunca abriria a lupa. (Um `.click()` programático não
        // passa por captura, então esse defeito não aparece nesse tipo de teste.)
        var estAlvo = null;
        estCaixa.addEventListener('pointerdown', function(e){
          if (e.button !== 0) return;
          estPegou = true; estMoveu = false; estV = 0; estVel = 0;
          estAlvo = e.target.closest ? e.target.closest('.esteira__item') : null;
          estX0 = estUltX = e.clientX; estUltT = e.timeStamp;
          estScroll0 = estPos;   // a posição com fração, não a arredondada
          estCaixa.setPointerCapture(e.pointerId);
        });
        estCaixa.addEventListener('pointermove', function(e){
          if (!estPegou) return;
          var dx = e.clientX - estX0;
          if (!estMoveu && Math.abs(dx) > 4){ estMoveu = true; estCaixa.dataset.arrastando = 'true'; }
          // O arraste manda no acumulador também, senão o quadro seguinte reescreve
          // o `scrollLeft` com a posição de antes do gesto e a esteira volta.
          if (estMoveu){ estPos = estScroll0 - dx; estCaixa.scrollLeft = estPos; }
          var dt = e.timeStamp - estUltT;
          if (dt > 0) estV = (e.clientX - estUltX) / dt;
          estUltX = e.clientX; estUltT = e.timeStamp;
        });
        function estSoltar(e){
          if (!estPegou) return;
          estPegou = false;
          estParado = false;
          estCaixa.dataset.arrastando = 'false';
          if (e && e.pointerId != null && estCaixa.hasPointerCapture(e.pointerId)) estCaixa.releasePointerCapture(e.pointerId);
          if (estMoveu && !semMov && Math.abs(estV) > 0.08) estVel = -estV * 16;
          // Parado no lugar = clique: abre. Arrastou = gesto, não abre nada.
          if (!estMoveu && estAlvo) abrirLupa(estAlvo);
          estAlvo = null;
          if (estMoveu) setTimeout(function(){ estMoveu = false; }, 0);
        }
        estCaixa.addEventListener('pointerup', estSoltar);
        estCaixa.addEventListener('pointercancel', estSoltar);

        // ===== Lupa
        var VAZIO = '/home/e2216a7e9b.gif';
        var lupa = document.createElement('div');
        lupa.className = 'lupa';
        lupa.setAttribute('role','dialog');
        lupa.setAttribute('aria-modal','true');
        lupa.setAttribute('aria-label','Render ampliado');
        lupa.innerHTML =
          '<button class="lupa__fechar" type="button" aria-label="Fechar">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
          '<button class="lupa__nav lupa__nav--ant" type="button" aria-label="Imagem anterior">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' +
          '</button>' +
          '<button class="lupa__nav lupa__nav--prox" type="button" aria-label="Próxima imagem">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>' +
          '</button>' +
          '<img class="lupa__foto" src="' + VAZIO + '" alt="">';
        (document.querySelector('.hm') || document.body).appendChild(lupa);
        var lupaFoto = lupa.querySelector('.lupa__foto');
        var lupaFechar = lupa.querySelector('.lupa__fechar');
        var lupaAnt = lupa.querySelector('.lupa__nav--ant');
        var lupaProx = lupa.querySelector('.lupa__nav--prox');
        var lupaVeioDe = null;

        function mostrarNaLupa(botao){
          var img = botao.querySelector('img');
          if (!img) return false;
          lupaVeioDe = botao;
          // A imagem da esteira é miniatura de 320x400 — ampliá-la ficaria borrada.
          // Cada botão carrega a versão de 1000x1250 em `data-grande`, que é a que
          // a lupa mostra. A miniatura é o fallback.
          lupaFoto.src = botao.dataset.grande || img.src;
          lupaFoto.alt = img.alt || 'Render ampliado';
          return true;
        }

        // Passa pra próxima sem fechar: troca só a foto, a caixa continua aberta.
        // A esteira tem cópias do mesmo trilho, então a lista dá a volta sozinha e
        // nunca chega num fim.
        function navegarLupa(passo){
          if (!lupaVeioDe) return;
          var itens = [].slice.call(estTrilho.querySelectorAll('.esteira__item'));
          var i = itens.indexOf(lupaVeioDe);
          if (i < 0) return;
          mostrarNaLupa(itens[(i + passo + itens.length) % itens.length]);
        }
        lupaAnt.addEventListener('click', function(e){ e.stopPropagation(); navegarLupa(-1); });
        lupaProx.addEventListener('click', function(e){ e.stopPropagation(); navegarLupa(1); });

        function abrirLupa(botao){
          if (!mostrarNaLupa(botao)) return;
          lupa.dataset.aberta = 'false';
          document.body.style.overflow = 'hidden';
          requestAnimationFrame(function(){ lupa.dataset.aberta = 'true'; lupaFechar.focus(); });
        }
        function fecharLupa(){
          if (!lupa.dataset.aberta) return;
          lupa.dataset.aberta = 'false';
          document.body.style.overflow = '';
          setTimeout(function(){ delete lupa.dataset.aberta; lupaFoto.src = VAZIO; }, 170);
          if (lupaVeioDe) lupaVeioDe.focus();
          lupaVeioDe = null;
        }
        // Só o teclado passa por aqui: Enter/Espaço num botão focado geram um
        // `click` com `detail === 0`. O do ponteiro já foi tratado no `pointerup`,
        // e atender os dois abriria a lupa duas vezes.
        estCaixa.addEventListener('click', function(e){
          if (e.detail !== 0) return;
          var alvo = e.target.closest('.esteira__item');
          if (alvo) abrirLupa(alvo);
        });
        lupa.addEventListener('click', function(e){
          if (e.target === lupa || e.target.closest('.lupa__fechar')) fecharLupa();
        });
        document.addEventListener('keydown', function(e){
          if (!lupa.dataset.aberta) return;
          if (e.key === 'Escape'){ fecharLupa(); return; }
          if (e.key === 'ArrowLeft'){ e.preventDefault(); navegarLupa(-1); return; }
          if (e.key === 'ArrowRight'){ e.preventDefault(); navegarLupa(1); return; }
          // Foco preso nos três botões do diálogo, circulando entre eles.
          if (e.key === 'Tab'){
            e.preventDefault();
            var alvos = [lupaAnt, lupaProx, lupaFechar];
            var i = alvos.indexOf(document.activeElement);
            var passo = e.shiftKey ? -1 : 1;
            alvos[(i + passo + alvos.length) % alvos.length].focus();
          }
        });

        var estRedim;
        window.addEventListener('resize', function(){
          clearTimeout(estRedim);
          estRedim = setTimeout(function(){ estMontar(); }, 200);
        });
      })();

      /* --- contador animado da autora (padrão PromptHub) ---
         Mola com amortecimento crítico (resposta 0,9s): arranca
         rápido e assenta sem passar do alvo. O HTML já traz o
         valor final, então sem JS nada quebra. */
      (function(){
        var alvo = document.getElementById('numero-alunos');
        if (!alvo) return;
        if (!('IntersectionObserver' in window)) return;

        var ate = parseInt(alvo.getAttribute('data-ate'), 10);
        var fim = alvo.textContent;
        var resposta = 0.9;
        var w = (2 * Math.PI) / resposta;
        var k = w * w, c = 2 * w;

        function contar(){
          var x = 0, v = 0, anterior = null;
          function passo(t){
            if (anterior === null) anterior = t;
            var dt = Math.min((t - anterior) / 1000, 1 / 30);
            anterior = t;
            var a = -k * (x - ate) - c * v;
            v += a * dt;
            x += v * dt;
            if (Math.abs(ate - x) < ate * 0.0025){
              alvo.textContent = fim;
              return;
            }
            alvo.textContent = Math.round(x).toLocaleString('pt-BR');
            window.requestAnimationFrame(passo);
          }
          window.requestAnimationFrame(passo);
        }

        new IntersectionObserver(function(entradas, obs){
          if (!entradas[0].isIntersecting) return;
          obs.disconnect();
          alvo.textContent = '0';
          contar();
        }, { threshold: 0.6 }).observe(alvo);
      })();

    })();
    })();
  } catch (e) {
    console.warn('[home] bloco 1 nao rodou:', e && e.message);
  }

  // ── bloco 2 do artefato ──
  try {
    (function(){
    // Barra de cookies (LGPD). A escolha mora no localStorage; a barra só aparece
      // enquanto não houver escolha. O `gtag('consent','update')` vai junto pra
      // quando o GTM entrar: sem a função carregada ainda, o push cru na dataLayer
      // é o formato que o gtag.js reconhece quando chega.
      (function(){
        var barra = document.querySelector('.cookie-bar');
        if (!barra) return;
        var CHAVE = 'cora_cookie_consent';
        var escolhido = null;
        try { escolhido = localStorage.getItem(CHAVE); } catch (e) {}
        if (escolhido) return;

        barra.hidden = false;

        function decidir(aceitou){
          try { localStorage.setItem(CHAVE, aceitou ? 'accepted' : 'rejected'); } catch (e) {}
          try {
            window.dataLayer = window.dataLayer || [];
            var gtag = typeof window.gtag === 'function'
              ? window.gtag
              : function(){ window.dataLayer.push(arguments); };
            var v = aceitou ? 'granted' : 'denied';
            gtag('consent', 'update', {
              ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v
            });
            window.dataLayer.push({ event: aceitou ? 'cookie_consent_accept' : 'cookie_consent_reject' });
          } catch (e) {}
          barra.hidden = true;
        }

        barra.addEventListener('click', function(ev){
          var b = ev.target.closest('[data-cookie-acao]');
          if (!b) return;
          decidir(b.dataset.cookieAcao === 'aceitar');
        });
      })();
    })();
  } catch (e) {
    console.warn('[home] bloco 2 nao rodou:', e && e.message);
  }

  // ── bloco 3 do artefato ──
  try {
    (function(){
    /* Preenche tudo que está marcado com data-plano a partir do dados-planos.js,
         e monta a lista de marcas do rodapé. O HTML já nasce com o valor escrito,
         então sem JavaScript a página continua correta. */
      (function(){
        var d = window.CORA_PLANOS;
        if (!d) return;
        [].forEach.call(document.querySelectorAll('[data-plano]'), function(el){
          var v = el.getAttribute('data-plano').split('.').reduce(function(o,k){
            return o && o[k];
          }, d);
          if (v !== undefined && v !== null) el.textContent = v;
        });
        var m = document.querySelector('[data-marcas]');
        if (m && d.marcas && d.marcas.length){
          var lista = d.marcas.slice();
          var ultima = lista.pop();
          m.textContent = lista.length ? lista.join(', ') + ' e ' + ultima : ultima;
        }
      })();
    })();
  } catch (e) {
    console.warn('[home] bloco 3 nao rodou:', e && e.message);
  }
}
