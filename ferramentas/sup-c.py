# -*- coding: utf-8 -*-
"""OPCAO C, terceira volta - a resposta antes do formulario.

A aposta: boa parte do que chega no suporte ja esta respondido. A pagina abre
com as duvidas que mais aparecem e so depois oferece o formulario. Quem se
resolve ali nao abre chamado, e quem abre ja chega com a duvida filtrada.

── O que mudou nesta volta ──
  · as pilulas do filtro sairam. No lugar entrou o indice das paginas legais,
    que ja esta no ar: fio fino na esquerda, lima no item ativo. Pilula nao e
    vocabulario nosso, e a coluna da esquerda estava vazia de qualquer jeito.
  · a faixa dos Promptadores entrou como borda de cima do bloco do
    formulario, que e o lugar dela no cartao do e-mail
  · o reembolso parou de prometer automatico
  · a pergunta sobre divulgacao saiu, ver cerebro/status.md

As perguntas e as respostas moram em dados_faq.py.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base_suporte import *          # noqa
from dados_faq import GRUPOS, PERGUNTAS, contar

CSS = u"""
/* ── o topo mora DENTRO da coluna ───────────────────────────────────────────
   Antes o titulo e o subtitulo eram uma faixa de largura inteira em cima da
   grade. Com isso a linha do titulo passava por cima da coluna das perguntas,
   e o bloco de cima nao batia com o de baixo: dois blocos de texto na mesma
   borda esquerda, com larguras diferentes, leem como desalinho.
   Aqui os dois viraram um so, dentro da coluna da esquerda.

   O preco e que o titulo nao cabe mais numa linha nessa largura. A quebra fica
   em "Como podemos / ajudar?", que e onde ela cai sozinha, e e a mesma forma
   de duas linhas que a coluna ja tinha. */
.faq-grade{ display:grid; grid-template-columns:1fr; gap:clamp(24px,3vw,40px);
  align-items:start; padding-top:clamp(26px,3vw,40px); }
@media (min-width:900px){
  .faq-grade{ grid-template-columns:34fr 66fr; gap:var(--e-8); }
  .faq-lado{ position:sticky; top:calc(var(--altura-cabecalho) + var(--e-6)); }
}
.faq-lado h1{ margin-top:var(--e-3); font-size:clamp(30px,3.5vw,42px);
  letter-spacing:-.032em; line-height:1.1; }
.faq-lado > p{ margin-top:var(--e-4); font-size:15px; color:var(--ink2); line-height:1.55; }

/* ── o voltar ───────────────────────────────────────────────────────────────
   O mesmo controle das paginas de Termos e Privacidade, que ja esta no ar:
   pilula com contorno, e nao texto solto, porque texto solto no meio de outro
   texto nao se le como controle.

   Ele fica ACIMA do olho, no comeco da coluna, que e onde a leitura comeca e
   onde se procura a saida. */
.sp-topo{ padding-top:clamp(28px,3.2vw,44px); }
.sp-voltar{ display:flex; width:fit-content; align-items:center; gap:7px; padding:8px 16px 8px 13px;
  border:1px solid var(--line); border-radius:var(--r-pill);
  font-size:13.5px; font-weight:500; color:var(--ink2);
  text-decoration:none; white-space:nowrap; background:none;
  font-family:inherit; cursor:pointer;
  transition:border-color var(--tr-rapida) var(--easing),
             color var(--tr-rapida) var(--easing); }
@media (hover:hover) and (pointer:fine){
  .sp-voltar:hover{ border-color:var(--ink); color:var(--ink); }
}

/* ── o indice ───────────────────────────────────────────────────────────────
   O mesmo controle das paginas de Termos e Privacidade, que ja estao no ar:
   fio de 2px na esquerda, e o item ativo com o lima da marca em 3px. A
   contagem do lado diz o tamanho de cada grupo sem precisar abrir. */
.indice{ margin-top:var(--e-6); display:grid; gap:2px; }
.indice button{ display:flex; align-items:center; justify-content:space-between;
  gap:var(--e-3); width:100%; padding:8px 14px; border:0;
  border-left:2px solid var(--line); background:none; color:var(--ink2);
  font-family:inherit; font-size:13.5px; line-height:1.45; text-align:left;
  cursor:pointer;
  transition:color var(--tr-rapida) var(--easing),
             border-color var(--tr-rapida) var(--easing); }
.indice button[aria-pressed="true"]{ color:var(--ink); font-weight:500;
  border-left-color:var(--lima); border-left-width:3px; }
.indice .qt{ font-size:12px; color:var(--ink3); font-variant-numeric:tabular-nums; }
@media (hover:hover) and (pointer:fine){
  .indice button:hover{ color:var(--ink); border-left-color:var(--ink3); }
  .indice button[aria-pressed="true"]:hover{ border-left-color:var(--lima); }
}

.faq-item{ border-bottom:1px solid var(--line); }
.faq-item[hidden]{ display:none; }
.faq-gat{ width:100%; display:flex; justify-content:space-between; align-items:center;
  gap:var(--e-4); padding:19px 0; text-align:left; border:none; background:none;
  cursor:pointer; font-family:inherit; font-weight:500;
  font-size:clamp(15.5px,1.2vw,17px); letter-spacing:-.015em; line-height:1.35;
  color:var(--ink); }
@media (min-width:768px){ .faq-gat{ padding:22px 0; } }
.faq-ic{ flex:none; color:var(--ink3); display:inline-flex;
  transition:transform var(--tr-padrao) var(--easing), color var(--tr-padrao) var(--easing); }
.faq-gat[aria-expanded="true"] .faq-ic{ transform:rotate(45deg); color:var(--ink); }
@media (hover:hover) and (pointer:fine){ .faq-gat:hover .faq-ic{ color:var(--ink); } }
.faq-resp{ display:grid; grid-template-rows:0fr;
  transition:grid-template-rows var(--tr-acordeao) var(--easing); }
.faq-gat[aria-expanded="true"] + .faq-resp{ grid-template-rows:1fr; }
.faq-resp > div{ overflow:hidden; }
.faq-txt{ padding-bottom:22px; font-size:15px; line-height:1.62; color:var(--ink2);
  max-width:60ch; }

/* ── a virada ───────────────────────────────────────────────────────────────
   A faixa dos Promptadores fecha as perguntas e abre o formulario, do mesmo
   jeito que ela abre o cartao do e-mail. Geometria descrita em
   cerebro/specs/emails.md e desenhada em base_suporte.py.

   A ALTURA e a mesma da faixa do PromptHub, medida em 07/09/2026 na porta do
   `escolher` (`.porta__faixa` no cora-promptadores): `clamp(140px,23vh,220px)`,
   que da 207px numa janela de 900 de altura. Antes eram 8vw com teto de 112,
   ou seja, metade. E `vh` e nao `vw` porque foi assim que ela nasceu la, e o
   pedido foi a MESMA altura: com outra unidade as duas so coincidiriam numa
   largura de tela. */
.faixa{ height:clamp(140px,23vh,220px); background-color:@CHAO@;
  background-image:@FAIXA@; background-repeat:repeat-x;
  background-position:left center; background-size:auto 100%; }
.sup-virada{ background:var(--paper); border-bottom:1px solid var(--line); }
.sup-form{ max-width:640px; margin-inline:auto; }
.sup-form__cab{ text-align:center; }
.sup-form__cab h2{ margin-top:var(--e-3); font-size:clamp(22px,2.6vw,30px); }
.sup-form__cab p{ margin-top:var(--e-3); font-size:15px; color:var(--ink2); }
.sup-form form{ margin-top:var(--e-7); display:grid; gap:var(--e-5); }
/* `background-color`, e nao o atalho `background`: o atalho apagaria a seta
   do campo, que e um background-image. */
.sup-form .campo input,.sup-form .campo textarea,.sup-form .gat{ background-color:var(--wash); }
.sup-form .campo input:focus,.sup-form .campo textarea:focus,.sup-form .gat.aberto{
  background-color:var(--paper); }

/* ── dropdown da marca ──────────────────────────────────────────────────────
   O <select> do sistema pinta a lista com o azul do Windows, que nao e nossa
   cor e nao respeita nem a fonte nem o raio dos outros campos. Este e o mesmo
   desenho do CoraSelect que o painel ja usa, vestido com a paleta nova. */
.sel{ position:relative; }
.gat{ display:flex; align-items:center; gap:var(--e-2); width:100%; height:50px;
  padding:0 var(--e-5); border:1px solid var(--line); border-radius:var(--r-pill);
  background:var(--paper); color:var(--ink); font-family:inherit; font-size:15px;
  text-align:left; cursor:pointer;
  transition:border-color var(--tr-padrao) var(--easing),
             box-shadow var(--tr-padrao) var(--easing),
             background-color var(--tr-padrao) var(--easing); }
.gat.vazio{ color:var(--ink3); }
.gat.aberto{ border-color:var(--ink); box-shadow:0 0 0 3px rgba(17,17,17,.08); }
@media (hover:hover) and (pointer:fine){ .gat:hover{ border-color:var(--ink3); } }
.gat__rot{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.gat__seta{ flex:none; color:var(--ink3);
  transition:transform var(--tr-padrao) var(--easing); }
.gat.aberto .gat__seta{ transform:rotate(180deg); color:var(--ink); }
.pop{ position:absolute; left:0; right:0; top:calc(100% + 6px); z-index:60;
  padding:6px; background:var(--paper); border:1px solid var(--line2);
  border-radius:var(--rc); box-shadow:0 14px 38px rgba(17,17,17,.13);
  max-height:288px; overflow-y:auto; }
.pop[hidden]{ display:none; }
.op{ display:flex; align-items:center; gap:var(--e-3); width:100%;
  padding:10px 14px; border:0; border-radius:var(--r-md); background:none;
  color:var(--ink2); font-family:inherit; font-size:14.5px; text-align:left;
  cursor:pointer; transition:background-color var(--tr-rapida) var(--easing),
                             color var(--tr-rapida) var(--easing); }
.op__mira{ flex:none; width:7px; height:7px; border-radius:50%;
  background:transparent; transition:background-color var(--tr-rapida) var(--easing); }
.op[aria-selected="true"]{ background:var(--lima); color:var(--ink); font-weight:500; }
.op[aria-selected="true"] .op__mira{ background:var(--ink); }
@media (hover:hover) and (pointer:fine){
  .op:hover{ background:var(--wash2); color:var(--ink); }
  .op[aria-selected="true"]:hover{ background:var(--lima-esc); }
}

/* ── campo que faltou ───────────────────────────────────────────────────────
   O aviso e a borda vermelha andam juntos: so a frase em cima obriga a
   procurar qual campo, e so a borda nao diz o que aconteceu. */
.sup-erro{ margin-bottom:var(--e-2); padding:12px 18px; border-radius:var(--r-md);
  background:#FCEDEC; border:1px solid #E9BFBB; color:#8E2620;
  font-size:14px; line-height:1.5; }
.campo input.erro,.campo textarea.erro,.gat.erro{ border-color:#C8342A; }
.campo input.erro:focus,.campo textarea.erro:focus{
  border-color:#C8342A; box-shadow:0 0 0 3px rgba(200,52,42,.12); }

/* ── depois de enviar ───────────────────────────────────────────────────────
   Ocupa o lugar do formulario, e nao aparece embaixo dele. Deixar o
   formulario vazio na tela depois do envio convida a mandar de novo, e ai
   chegam duas mensagens iguais no suporte.

   O circulo lima e o mesmo sinal de conclusao das telas de conta. */
.sup-ok{ text-align:center; display:grid; justify-items:center; gap:var(--e-4); }
.sup-ok__marca{ width:58px; height:58px; border-radius:50%; background:var(--lima);
  display:grid; place-items:center; color:var(--ink); }
.sup-ok h2{ font-size:clamp(22px,2.6vw,30px); }
.sup-ok p{ font-size:15px; color:var(--ink2); max-width:44ch; }
.sup-ok strong{ color:var(--ink); font-weight:600; }
.sup-ok .miudo{ font-size:13.5px; color:var(--ink3); }
.sup-ok .btn{ margin-top:var(--e-3); }
[hidden]{ display:none !important; }

.sup-pe{ margin-top:var(--e-5); text-align:center; font-size:14px; color:var(--ink2); }
.sup-pe a{ color:var(--ink); text-decoration:underline; text-underline-offset:3px;
  text-decoration-thickness:1px; text-decoration-color:var(--line2); }
.sup-pe a:hover{ text-decoration-color:var(--ink); }
"""

CSS = CSS.replace("@FAIXA@", faixa_uri()).replace("@CHAO@", CORES_FAIXA["chao"])

TOTAL = len(PERGUNTAS)


def item(i, grupo, p, r):
    # Todas nascem FECHADAS. Com uma aberta, a pagina em repouso ja empurrava
    # as outras catorze pra baixo por uma resposta que ninguem pediu, e a
    # primeira pergunta ganhava um peso que ela nao tem.
    return (
        u'<div class="faq-item" data-g="%s">'
        u'<button class="faq-gat" type="button" aria-expanded="false">'
        u'<span>%s</span>'
        u'<span class="faq-ic" aria-hidden="true">'
        u'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        u'stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>'
        u'</span></button>'
        u'<div class="faq-resp"><div><div class="faq-txt">%s</div></div></div>'
        u'</div>' % (grupo, p, r)
    )


INDICE = (
    u'<div class="indice" role="group" aria-label="Filtrar por assunto">'
    u'<button type="button" aria-pressed="true" data-f="tudo">'
    u'<span>Todos os assuntos</span><span class="qt">%d</span></button>' % TOTAL
    + u"".join(u'<button type="button" aria-pressed="false" data-f="%s">'
               u'<span>%s</span><span class="qt">%d</span></button>'
               % (k, n, contar(k)) for k, n in GRUPOS)
    + u'</div>')

OPS = u"".join(
    u'<button class="op" type="button" role="option" aria-selected="false" data-v="%s">'
    u'<span class="op__mira" aria-hidden="true"></span><span>%s</span></button>' % (c, c)
    for c in CATEGORIAS
)

CORPO = u"""<main id="conteudo">
  <div class="env sp-topo">
    <a class="sp-voltar" href="/">&larr; Voltar</a>
  </div>

  <section class="env" id="faq" style="padding-bottom:clamp(48px,6vw,88px)">
    <div class="faq-grade">
      <div class="faq-lado">
        <span class="olho">Suporte</span>
        <h1>Como podemos ajudar?</h1>
        <p>Comece por aqui. Se a sua d&uacute;vida n&atilde;o estiver na lista,
           o formul&aacute;rio fica logo&nbsp;abaixo.</p>
        @INDICE@
      </div>
      <div class="faq-lista" id="faq-lista">@ITENS@</div>
    </div>
  </section>

  <div class="faixa" aria-hidden="true"></div>

  <section class="secao sup-virada">
    <div class="env sup-form">
      <div class="sup-form__cab">
        <span class="olho">N&atilde;o achou aqui?</span>
        <h2>Ent&atilde;o escreve pra gente</h2>
        <p>A gente responde no seu e-mail em at&eacute; 3 dias &uacute;teis.</p>
      </div>

      <form onsubmit="return false">
        <div class="dupla">
          <div class="campo">
            <label for="c-nome">Nome</label>
            <input id="c-nome" value="Marilia Fischer">
          </div>
          <div class="campo">
            <label for="c-email">Seu e-mail</label>
            <input id="c-email" type="email" value="marilia@9barra7.com">
          </div>
        </div>

        <div class="campo">
          <label id="rot-assunto">Assunto</label>
          <div class="sel">
            <button class="gat vazio" type="button" id="gat" aria-haspopup="listbox"
                    aria-expanded="false" aria-labelledby="rot-assunto gat-rot">
              <span class="gat__rot" id="gat-rot">Selecione uma categoria&hellip;</span>
              <svg class="gat__seta" width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round"
                   stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="pop" id="pop" role="listbox" aria-labelledby="rot-assunto" hidden>@OPS@</div>
          </div>
        </div>

        <div class="campo">
          <label for="c-msg">Mensagem</label>
          <textarea id="c-msg" placeholder="Conte o que aconteceu&hellip;"></textarea>
        </div>

        <button class="btn btn--lima btn--largo" type="submit">Enviar mensagem</button>
      </form>

      <p class="sup-pe" id="pe">Prefere escrever direto?
        <a href="mailto:cora@corarender.com">cora@corarender.com</a></p>

      <div class="sup-ok" id="ok" hidden>
        <span class="sup-ok__marca" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </span>
        <h2>Mensagem enviada</h2>
        <p>A gente recebeu o seu contato e responde no
           <strong>marilia@9barra7.com</strong> em at&eacute; 3 dias &uacute;teis.</p>
        <p class="miudo">Uma confirma&ccedil;&atilde;o acabou de sair para esse mesmo
           endere&ccedil;o, com a c&oacute;pia do que voc&ecirc; escreveu.</p>
        <a class="btn btn--linha" href="#conteudo">Ver as perguntas frequentes</a>
      </div>
    </div>
  </section>
</main>"""

CORPO = (CORPO
         .replace("@ITENS@", u"".join(item(i, g, p, r)
                                      for i, (g, p, r) in enumerate(PERGUNTAS)))
         .replace("@INDICE@", INDICE)
         .replace("@OPS@", OPS))

JS = u"""<script>
  /* acordeao: um aberto por vez */
  (function(){
    var gatilhos = document.querySelectorAll('.faq-gat');
    gatilhos.forEach(function(g){
      g.addEventListener('click', function(){
        var aberto = g.getAttribute('aria-expanded') === 'true';
        gatilhos.forEach(function(o){ o.setAttribute('aria-expanded','false'); });
        g.setAttribute('aria-expanded', String(!aberto));
      });
    });
  })();

  /* indice: filtra a lista e devolve a borda de cima pro primeiro visivel */
  (function(){
    var botoes = document.querySelectorAll('.indice button');
    var itens = document.querySelectorAll('.faq-item');
    botoes.forEach(function(b){
      b.addEventListener('click', function(){
        botoes.forEach(function(o){ o.setAttribute('aria-pressed','false'); });
        b.setAttribute('aria-pressed','true');
        var alvo = b.dataset.f;
        itens.forEach(function(it){
          it.hidden = !(alvo === 'tudo' || it.dataset.g === alvo);
          // Trocar de grupo fecha tudo: uma resposta que ficasse aberta da
          // lista anterior apareceria solta no meio da lista nova.
          it.querySelector('.faq-gat').setAttribute('aria-expanded','false');
        });
      });
    });
  })();

  /* dropdown da marca */
  (function(){
    var gat = document.getElementById('gat');
    var pop = document.getElementById('pop');
    var rot = document.getElementById('gat-rot');
    if (!gat || !pop) return;

    function fechar(){
      pop.hidden = true;
      gat.setAttribute('aria-expanded','false');
      gat.classList.remove('aberto');
    }
    gat.addEventListener('click', function(e){
      e.stopPropagation();
      var abrindo = pop.hidden;
      pop.hidden = !abrindo;
      gat.setAttribute('aria-expanded', String(abrindo));
      gat.classList.toggle('aberto', abrindo);
    });
    pop.querySelectorAll('.op').forEach(function(op){
      op.addEventListener('click', function(){
        pop.querySelectorAll('.op').forEach(function(o){ o.setAttribute('aria-selected','false'); });
        op.setAttribute('aria-selected','true');
        rot.textContent = op.dataset.v;
        gat.classList.remove('vazio');
        fechar();
      });
    });
    document.addEventListener('click', function(e){
      if (!pop.hidden && !pop.contains(e.target)) fechar();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !pop.hidden) { fechar(); gat.focus(); }
    });
  })();

  /* o envio, so pra mostrar como fica. No site quem faz isso e o React. */
  (function(){
    var form = document.querySelector('.sup-form form');
    var cab = document.querySelector('.sup-form__cab');
    var pe = document.getElementById('pe');
    var ok = document.getElementById('ok');
    if (!form || !ok) return;
    form.addEventListener('submit', function(){
      form.hidden = true;
      cab.hidden = true;
      pe.hidden = true;
      ok.hidden = false;
    });
  })();
</script>"""

salvar(os.path.join(os.path.dirname(os.path.abspath(__file__)), "suporte-c.html"),
       pagina(u"Suporte com Respostas", CSS, CORPO, JS))
