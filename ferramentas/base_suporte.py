# -*- coding: utf-8 -*-
"""Pecas compartilhadas pelos quatro artefatos da pagina de suporte.

Todos os quatro usam o MESMO sistema visual das paginas ja aprovadas:
tokens do artefato do William, DM Sans, botao pilula, faixa lima, cabecalho
grudado e o rodape fino que o site ja mostra hoje. O que muda entre eles e
so a arquitetura da pagina, nao a identidade.
"""
import base64, io, os

RAIZ = "Z:/Meus Arquivos/9barra7 Academy/Cora Render/Visual Studio Code/"
IMG = RAIZ + "cora-site/public/img/"


def b64(nome):
    with open(IMG + nome, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")


LOGO_CORA = b64("logo-cora.png")

FONTE = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2'
    '?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap">'
)

# -----------------------------------------------------------------------------
#  O CSS base. Copiado dos tokens do artefato aprovado, sem inventar nada.
# -----------------------------------------------------------------------------
CSS = u"""
:root{
  --ink:#111111; --ink2:#5b5b57; --ink3:#8e8e88;
  --paper:#ffffff; --wash:#f6f6f4; --wash2:#efefeb; --preto:#000000;
  --line:#e4e4df; --line2:#d2d2cb;
  --lima:#c4fba7; --lima-esc:#a5f37d;
  --turquesa:#adecdf; --periwinkle:#a3a6fa;
  --sobre-escuro:rgba(255,255,255,.72); --linha-escura:rgba(255,255,255,.14);
  --fonte:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --rc:20px; --r-pill:100px; --r-md:12px; --r-sm:8px;
  --largura-max:1200px; --gutter:clamp(16px,3.5vw,32px);
  --altura-cabecalho:60px; --secao-y:clamp(56px,6vw,88px);
  --e-1:4px; --e-2:8px; --e-3:12px; --e-4:16px; --e-5:24px;
  --e-6:32px; --e-7:48px; --e-8:64px; --e-9:80px;
  --tr-padrao:.2s; --tr-rapida:.12s; --tr-press:.1s; --tr-acordeao:.24s;
  --easing:cubic-bezier(.16,1,.3,1);
}
@media (min-width:1024px){ :root{ --gutter:32px; --altura-cabecalho:72px; } }

*,*::before,*::after{ box-sizing:border-box; margin:0; padding:0; }
html{ scroll-behavior:smooth; }
body{
  background:var(--wash); color:var(--ink);
  font-family:var(--fonte); font-size:16px; line-height:1.55;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
  min-height:100vh; display:flex; flex-direction:column;
}
h1,h2,h3,h4{ font-weight:500; text-wrap:balance; }
h1{ font-size:clamp(30px,4.2vw,52px); letter-spacing:-.035em; line-height:1.12; }
h2{ font-size:clamp(24px,3vw,36px); letter-spacing:-.03em; line-height:1.15; }
h3{ font-size:clamp(18px,2vw,22px); letter-spacing:-.02em; line-height:1.25; }
p{ text-wrap:pretty; }
a{ color:inherit; }
.env{ width:100%; max-width:var(--largura-max); margin-inline:auto; padding-inline:var(--gutter); }
.sr-only{ position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
[id]{ scroll-margin-top:calc(var(--altura-cabecalho) + var(--e-4)); }
:focus-visible{ outline:2px solid var(--ink); outline-offset:2px; }

/* botoes oficiais */
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:var(--e-2);
  width:fit-content; min-width:160px; min-height:48px;
  padding:var(--e-3) var(--e-5); white-space:nowrap;
  border-radius:var(--r-pill); border:1px solid transparent;
  font-family:inherit; font-weight:600; font-size:15px; letter-spacing:-.005em;
  line-height:1.2; text-align:center; text-decoration:none; cursor:pointer;
  transition:transform var(--tr-press) var(--easing),
             background-color var(--tr-padrao) var(--easing),
             border-color var(--tr-padrao) var(--easing),
             color var(--tr-padrao) var(--easing);
}
.btn:active{ transform:scale(.97); }
.btn--largo{ width:100%; }
.btn--lima{ background:var(--lima); color:var(--ink); }
.btn--escuro{ background:var(--ink); color:var(--paper); }
.btn--linha{ border-color:var(--ink3); color:var(--ink); background:transparent; }
.btn--claro{ background:var(--paper); color:var(--ink); border-color:var(--line); }
.btn[disabled]{ background:var(--wash2); color:var(--ink3); cursor:not-allowed; }
.btn[disabled]:active{ transform:none; }
@media (hover:hover) and (pointer:fine){
  .btn--lima:hover{ background:var(--lima-esc); }
  .btn--escuro:hover{ background:#242424; }
  .btn--linha:hover{ background:var(--wash2); border-color:var(--ink); }
  .btn--claro:hover{ background:var(--wash2); }
  .btn[disabled]:hover{ background:var(--wash2); }
}

/* cabecalho */
.cabecalho{ position:sticky; top:0; z-index:50; background:var(--wash);
  border-bottom:1px solid var(--line); }
.cabecalho__interno{ position:relative; display:flex; align-items:center;
  gap:var(--e-5); min-height:var(--altura-cabecalho); }
.cabecalho__marca{ margin-right:auto; display:inline-flex; align-items:center; min-height:44px; }
.cabecalho__marca img{ width:auto; height:20px; }
@media (min-width:1024px){ .cabecalho__marca img{ height:24px; } }
.cabecalho__nav{ display:none; gap:var(--e-5); font-size:15px; letter-spacing:-.005em; }
.cabecalho__nav a{ display:inline-flex; align-items:center; min-height:44px;
  padding-inline:var(--e-2); border-radius:var(--r-sm); color:var(--ink2);
  text-decoration:none; transition:color var(--tr-rapida) var(--easing); }
.cabecalho__acoes{ display:none; gap:var(--e-2); }
.cabecalho__acoes .btn{ min-width:0; min-height:40px; padding:var(--e-2) var(--e-4); font-size:14px; }
.burger{ display:flex; align-items:center; justify-content:center; width:44px; height:44px;
  margin-left:auto; border-radius:var(--r-sm); border:none; background:transparent;
  color:var(--ink); cursor:pointer; transition:background-color var(--tr-padrao) var(--easing); }
@media (hover:hover) and (pointer:fine){
  .cabecalho__nav a:hover{ color:var(--ink); }
  .burger:hover{ background:var(--wash2); }
}
@media (min-width:900px){
  .cabecalho__nav{ display:flex; }
  .cabecalho__acoes{ display:flex; margin-left:auto; }
  .burger{ display:none; }
}
.menu{ display:grid; gap:var(--e-2); padding:var(--e-4) var(--gutter) var(--e-6);
  border-top:1px solid var(--line); background:var(--paper); }
.menu a{ display:flex; align-items:center; min-height:44px; padding:var(--e-3) 0;
  font-size:17px; letter-spacing:-.015em; color:var(--ink); text-decoration:none; }
.menu__acoes{ display:grid; gap:var(--e-2); margin-top:var(--e-4); }
.menu[hidden]{ display:none; }
@media (min-width:900px){ .menu{ display:none; } }

/* conteudo */
main{ flex:1; }
.secao{ padding-block:var(--secao-y); }
.olho{ display:inline-block; font-size:11.5px; font-weight:600; letter-spacing:.14em;
  text-transform:uppercase; color:var(--ink3); }

/* campos */
.campo{ display:grid; gap:var(--e-2); }
.campo > label{ font-size:13px; font-weight:500; color:var(--ink2); }
.campo input,.campo select,.campo textarea{
  width:100%; font-family:inherit; font-size:15px; color:var(--ink);
  background:var(--paper); border:1px solid var(--line);
  transition:border-color var(--tr-padrao) var(--easing),
             box-shadow var(--tr-padrao) var(--easing);
}
.campo input,.campo select{ height:50px; padding:0 var(--e-5); border-radius:var(--r-pill); }
.campo textarea{ min-height:150px; padding:var(--e-4) var(--e-5); border-radius:var(--rc);
  resize:vertical; line-height:1.55; }
.campo input::placeholder,.campo textarea::placeholder{ color:var(--ink3); }
.campo input:focus,.campo select:focus,.campo textarea:focus{
  outline:0; border-color:var(--ink); box-shadow:0 0 0 3px rgba(17,17,17,.08); }
.campo select{
  appearance:none; cursor:pointer; padding-right:48px;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238e8e88' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
  background-repeat:no-repeat; background-position:right 20px center;
}
.dupla{ display:grid; gap:var(--e-4); }
@media (min-width:640px){ .dupla{ grid-template-columns:1fr 1fr; } }
.ajuda{ font-size:13px; color:var(--ink3); line-height:1.5; }

/* rodape fino, o mesmo que o site ja usa hoje */
.rodape-legal{ padding:22px var(--gutter) 26px; text-align:center;
  font-size:12.5px; color:var(--ink3); border-top:1px solid var(--line);
  background:var(--wash); }
.rodape-legal a{ color:inherit; text-decoration:none; opacity:.9; }
.rodape-legal a:hover{ opacity:1; text-decoration:underline; }
.rodape-legal .sep{ margin:0 8px; opacity:.5; }
"""

CABECALHO = u"""<header class="cabecalho">
  <div class="env cabecalho__interno">
    <a class="cabecalho__marca" href="#" aria-label="Cora Render">
      <img src="@LOGO@" alt="Cora Render" width="1000" height="241">
    </a>
    <nav class="cabecalho__nav" aria-label="Principal">
      <a href="#">Como funciona</a>
      <a href="#">Ferramentas</a>
      <a href="#">Planos</a>
      <a href="#faq">Perguntas frequentes</a>
    </nav>
    <div class="cabecalho__acoes">
      <a class="btn btn--claro" href="#">Entrar</a>
      <a class="btn btn--escuro" href="#">Criar conta</a>
    </div>
    <button class="burger" type="button" id="burger" aria-expanded="false" aria-controls="menu">
      <span class="sr-only">Abrir menu</span>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
  <div class="menu" id="menu" hidden>
    <a href="#">Como funciona</a>
    <a href="#">Ferramentas</a>
    <a href="#">Planos</a>
    <a href="#faq">Perguntas frequentes</a>
    <div class="menu__acoes">
      <a class="btn btn--lima btn--largo" href="#">Criar conta</a>
      <a class="btn btn--linha btn--largo" href="#">Entrar</a>
    </div>
  </div>
</header>""".replace("@LOGO@", LOGO_CORA)

RODAPE = u"""<footer class="rodape-legal">
  <span>&copy; 2026 Cora Render &middot; 9BARRA7 Academy</span>
  <span class="sep">&middot;</span><a href="#">Suporte</a>
  <span class="sep">&middot;</span><a href="#">Termos de Uso</a>
  <span class="sep">&middot;</span><a href="#">Pol&iacute;tica de Privacidade</a>
</footer>"""

JS_MENU = u"""<script>
  (function(){
    var b = document.getElementById('burger'), m = document.getElementById('menu');
    if (!b || !m) return;
    b.addEventListener('click', function(){
      var aberto = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!aberto));
      m.hidden = aberto;
    });
  })();
</script>"""

CATEGORIAS = [
    u"Cobran\u00e7a e assinatura",
    u"Cr\u00e9ditos",
    u"Plugin do SketchUp",
    u"Problema t\u00e9cnico (bug)",
    u"Resultado da IA / render",
    u"Conta e acesso",
    u"D\u00favida de uso",
    u"Sugest\u00e3o / feedback",
    u"Privacidade e meus dados",
    u"Outro",
]


def opcoes():
    fora = u'<option value="">Selecione uma categoria&hellip;</option>'
    return fora + u"".join(u'<option>%s</option>' % c for c in CATEGORIAS)


def pagina(titulo, css_extra, corpo, js_extra=u""):
    return (
        u'<title>%s</title>\n%s\n<style>%s\n%s</style>\n\n%s\n\n%s\n\n%s\n%s\n'
        % (titulo, FONTE, CSS, css_extra, CABECALHO, corpo, RODAPE, JS_MENU + js_extra)
    )


def salvar(caminho, conteudo):
    d = os.path.dirname(caminho)
    if d and not os.path.isdir(d):
        os.makedirs(d)
    io.open(caminho, "w", encoding="utf-8", newline="\n").write(conteudo)
    print("%-30s %6.1f KB" % (os.path.basename(caminho),
                              len(conteudo.encode("utf-8")) / 1024.0))


# ─────────────────────────────────────────────────────────────────────────────
#  A FAIXA
#
#  A mesma geometria dos Promptadores que os e-mails usam, descrita em
#  cerebro/specs/emails.md:
#
#    · circulo cheio ocupa e avanca UM DIAMETRO
#    · meia-lua com a reta a esquerda ocupa e avanca UM RAIO, porque so a
#      metade direita do disco e pintada
#    · vao avanca UM DIAMETRO
#    · sequencia ODD_ODO_DO
#
#  O erro facil e fazer toda forma avancar um diametro. Ai a meia-lua deixa um
#  buraco atras dela e a faixa vira bolinha solta em vez de desenho continuo.
#
#  No e-mail a faixa e PNG, porque cliente de e-mail nao renderiza SVG direito.
#  Aqui ela e SVG: o desenho e o mesmo, mas nasce nitido em qualquer tela e nao
#  custa um pedido de rede.
#
#  O ladrilho tem 8 unidades de largura por 1 de altura, que e exatamente uma
#  sequencia. Repetido na horizontal, ele e cortado pela borda direita, como no
#  cartao do e-mail.
# ─────────────────────────────────────────────────────────────────────────────
SEQUENCIA = "ODD_ODO_DO"


def faixa_svg(chao=None, forma=None):
    chao = chao or CORES_FAIXA["chao"]
    forma = forma or CORES_FAIXA["forma"]
    partes, x = [], 0.0
    for c in SEQUENCIA:
        if c == "O":
            partes.append('<circle cx="%g" cy=".5" r=".5"/>' % (x + 0.5))
            x += 1.0
        elif c == "D":
            # Semicirculo: a reta fica em pe na esquerda, a barriga vai pra
            # direita. Meio disco, entao ocupa e avanca meio diametro.
            partes.append('<path d="M%g,0 A.5.5 0 0 1 %g,1 Z"/>' % (x, x))
            x += 0.5
        else:
            x += 1.0
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="%g" height="1" '
        'viewBox="0 0 %g 1" preserveAspectRatio="none">'
        '<rect width="%g" height="1" fill="%s"/>'
        '<g fill="%s">%s</g></svg>'
    ) % (x, x, x, chao, forma, "".join(partes))
    return svg


CORES_FAIXA = {"chao": "#C4FBA7", "forma": "#ADECDF"}


def faixa_uri(chao=None, forma=None):
    """A faixa como data: URI, pronta pra entrar num background-image."""
    import urllib.parse
    return "url(\"data:image/svg+xml,%s\")" % urllib.parse.quote(
        faixa_svg(chao, forma), safe="")
