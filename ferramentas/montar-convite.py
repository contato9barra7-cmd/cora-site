# -*- coding: utf-8 -*-
"""Monta ferramentas/convite.html a partir das PECAS REAIS da tela de entrada.

A primeira versao deste artefato foi desenhada a mao: cores parecidas, fontes
por aproximacao, uma grade de quadrados no lugar da grade animada. Ficou perto,
e perto nao serve: um artefato que nao e a tela nao pode ser usado para decidir
sobre a tela.

Este monta a partir da fonte:

  app/telas-de-conta.css     o CSS, inteiro, escopado em `.tc`
  components/GradeCora.js    a grade animada, com as duracoes de cada celula
  components/LoginSplit.js   os slides e a duracao da rotacao
  public/img/*               os logos e as cinco fotos, embutidas em base64

O que ele NAO copia e a logica do React: a rotacao dos slides aqui e um
`setInterval` de vinte linhas, com as mesmas duracoes. E demonstracao, e nao o
motor: o motor mora no componente.

Rodar de dentro de cora-site:  python ferramentas/montar-convite.py
"""
import base64
import io
import json
import os
import re

SCR = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(SCR)


def ler(caminho):
    return io.open(os.path.join(SITE, caminho), encoding='utf-8').read()


def embutir(caminho):
    """A imagem vira data URI: o artefato tem que abrir sozinho, sem servidor."""
    with open(os.path.join(SITE, caminho), 'rb') as f:
        dados = base64.b64encode(f.read()).decode('ascii')
    tipo = 'image/webp' if caminho.endswith('.webp') else 'image/png'
    return 'data:%s;base64,%s' % (tipo, dados)


# ── 1. o CSS: AS TRES FOLHAS, NA ORDEM DO layout.js ──────────────────────
#
# A primeira versao carregava so o `telas-de-conta.css`, e por isso a tela
# chegava ACHATADA: aquela folha nao e a tela, e a CAMADA DE CIMA dela. As
# regras base (o reset, `.login-card` com o seu recuo, `.login-titulo` em 28px,
# `.link-botao` sem borda) moram no globals, e o `.tc` so as sobrescreve onde
# precisa. Sem a de baixo, o botao de link ganhava a borda padrao do navegador
# e cada medida caia no valor de fabrica.
#
# A ordem importa e e a mesma do `app/layout.js`: globals, responsivo, e por
# ultimo o `.tc`, que ganha por vir depois e por ter mais especificidade.
css = u'\n'.join([
    u'/* ══ app/globals.css ══ */',        ler('app/globals.css'),
    u'/* ══ app/responsivo.css ══ */',     ler('app/responsivo.css'),
    u'/* ══ app/telas-de-conta.css ══ */', ler('app/telas-de-conta.css'),
])

# ── 2. a grade, do proprio GradeCora ──────────────────────────────────────
# O arquivo e gerado por `gerar-grade.py` e a lista mora nele como literal.
# Ler a lista de la e o que mantem o artefato e a tela com a MESMA grade: uma
# copia colada aqui envelheceria na primeira vez que a semente mudasse.
fonte_grade = ler('components/GradeCora.js')
m = re.search(r'export const GRADE = (\[.*?\n\]);', fonte_grade, re.S)
assert m, 'nao achei a GRADE em GradeCora.js'
bruto = m.group(1)
# JS para JSON: chaves sem aspas e virgula sobrando
bruto = re.sub(r'(\{|,)\s*([a-z])\s*:', r'\1"\2":', bruto)
bruto = re.sub(r',(\s*[\]\}])', r'\1', bruto)
GRADE = json.loads(bruto)

colunas = []
for ci, coluna in enumerate(GRADE):
    celulas = []
    for cel in coluna + coluna:          # dobrada, para a rolagem fechar sem emenda
        estilo = '--i:%d' % cel['i']
        if 'g' in cel:
            estilo += ';--tgiro:%s;animation-delay:%s' % (cel['g'], cel['a'])
        celulas.append('<div class="%s" style="%s"></div>' % (cel['c'], estilo))
    colunas.append(
        '<div class="coluna-pad" style="--c:%d"><div class="tira">%s</div></div>'
        % (ci, ''.join(celulas)))
grade_html = '<div class="campo-pad" aria-hidden="true">%s</div>' % ''.join(colunas)

# ── 3. os slides, do proprio LoginSplit ───────────────────────────────────
fonte_split = ler('components/LoginSplit.js')
slides = re.findall(r"img: '(/img/[^']+)'", fonte_split)
assert len(slides) == 5, 'esperava 5 slides, achei %d' % len(slides)
dur_grade = re.search(r'DUR_GRADE = (\d+)', fonte_split).group(1)
dur_foto = re.search(r'DUR_FOTO = (\d+)', fonte_split).group(1)

# as frases do painel, do dicionario
i18n = ler('lib/i18n.js')
def frase(chave):
    """As chaves nem sempre moram sozinhas numa linha: algumas dividem a linha
    com outras, com ou sem espaco depois dos dois-pontos. O corte e pela CHAVE,
    e nao pela linha."""
    padrao = r"[\s{]" + re.escape(chave) + r"\s*:\s*(['\"])(.*?)\1\s*,"
    m = re.search(padrao, i18n)
    return m.group(2) if m else ''

# A grade, que e o primeiro slide, usa a frase SEM numero: ela e a de abertura,
# e as numeradas de 2 a 6 acompanham as cinco fotos.
FRASES = [('login_visual_frase', 'login_visual_sub')] + [
    ('login_visual_frase_%d' % n, 'login_visual_sub_%d' % n) for n in range(2, 7)]
textos = [[frase(a), frase(b)] for a, b in FRASES]
faltando = [a for (a, _), t in zip(FRASES, textos) if not t[0]]
assert not faltando, 'nao achei no dicionario: %s' % faltando

slides_html = ''.join(
    '<div class="slide slide--img" data-ativo="false"><img src="%s" alt=""></div>'
    % embutir(s.lstrip('/').replace('img/', 'public/img/', 1)) for s in slides)

barras_html = ''.join('<button class="barra" type="button"></button>'
                      for _ in range(len(slides) + 1))

logo9 = embutir('public/img/logo-9barra7.png')
logoc = embutir('public/img/logo-cora.png')

# ── 4. a pagina ───────────────────────────────────────────────────────────
HTML = u"""<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A tela do convite</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">

<!-- ══════════════════════════════════════════════════════════════════════
     GERADO por ferramentas/montar-convite.py. Nao editar aqui.

     O CSS abaixo e o `app/telas-de-conta.css` INTEIRO, sem uma virgula de
     diferenca, e a grade animada vem do `GradeCora.js`. E por isso que o que
     se ve aqui e o que a pessoa ve: fonte, tamanho, respiro e animacao sao os
     mesmos objetos, e nao uma imitacao que envelhece.
     ══════════════════════════════════════════════════════════════════════ -->
<style>
%(css)s
</style>

<style>
/* So a moldura desta demonstracao. Ela vem DEPOIS das tres folhas, e precisa
   desfazer o `display:flex` que o globals poe no body para o rodape colar no
   pe das paginas publicas: aqui nao ha rodape, e o flex esticava a moldura. */
body{ margin:0; display:block; min-height:0; background:#F4F4F4;
  font-family:'DM Sans',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
.demo-topo{ max-width:1180px; margin:0 auto; padding:30px 20px 0; }
.demo-eb{ margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:.14em;
  text-transform:uppercase; color:#5B5B57; }
.demo-topo h1{ margin:0 0 8px; font-size:26px; font-weight:600;
  letter-spacing:-.03em; color:#111; }
.demo-topo p{ margin:0; max-width:66ch; font-size:14.5px; line-height:1.55;
  color:#5B5B57; text-wrap:pretty; }
.demo-barra{ display:flex; gap:6px; flex-wrap:wrap; margin:20px 0 18px;
  padding:6px; border-radius:100px; background:#111; width:max-content;
  max-width:100%%; }
.demo-barra button{ border:0; border-radius:100px; padding:8px 16px;
  cursor:pointer; font-family:inherit; font-size:13.5px; background:transparent;
  color:#F2F2EF; }
.demo-barra button[data-on]{ background:#C4FBA7; color:#111; font-weight:600; }
/* A TELA VAI DE PONTA A PONTA, como no site.
   Ela estava dentro de uma moldura de 1180px com recuo dos lados, e por isso
   chegava ACHATADA: o `.tc.login-split` divide a largura em 1.05fr / 1fr, e
   com 100px a menos os dois lados encolhem juntos. A proporcao continuava
   certa, mas o painel perdia 73px e o cartao ficava espremido contra a borda.
   Aqui ela recebe a largura da janela e a altura de `100dvh` menos o topo
   desta demonstracao, que e o mesmo calculo do site (la o desconto e a altura
   do aviso de cookies). */
.demo-moldura{ margin:0 0 40px; }
.demo-moldura .login-split{ height:calc(100dvh - 210px); min-height:560px; }
.demo-nota{ max-width:1180px; margin:0 auto; padding:0 20px 60px; }
.demo-nota div{ padding:18px 20px; border-radius:14px; background:#fff;
  border:1px solid #E4E4DF; font-size:13.5px; line-height:1.55; color:#5B5B57;
  margin-bottom:12px; text-wrap:pretty; }
.demo-nota b{ color:#111; }
</style>
</head>
<body>

<div class="demo-topo">
  <p class="demo-eb">Equipe &middot; quem foi convidado</p>
  <h1>A tela do convite</h1>
  <p>É onde cai quem clica no link do e-mail &ldquo;Marilia te convidou para a equipe&rdquo;.
    São três estados, e o que muda entre eles é só o miolo do cartão. A casca, as fotos e
    a grade animada são as mesmas do login: este arquivo é montado a partir delas.</p>

  <div class="demo-barra" id="estados">
    <button data-estado="login" data-on>Ainda não tem conta</button>
    <button data-estado="ok">Convite aceito</button>
    <button data-estado="erro">Convite indisponível</button>
  </div>
</div>

<div class="demo-moldura">
<main class="login-split tc">

  <div class="painel" id="painel">
    <div class="slide slide--grade" data-ativo="true">
      %(grade)s
    </div>
    %(slides)s

    <div class="marca">
      <a href="#"><img src="%(logo9)s" alt="9barra7 Academy" width="300" height="36"></a>
    </div>

    <div class="rodape-painel">
      <div class="texto">
        <p class="frase"></p>
        <p class="apoio"></p>
        <div class="barras" role="tablist" aria-label="Telas do painel">%(barras)s</div>
      </div>
    </div>
  </div>

  <div class="lado-form">
    <div class="cartao-area">
      <div class="login-card">
        <a href="#" class="login-logo">
          <img src="%(logoc)s" alt="Cora Render" width="266" height="64">
        </a>

        <!-- ── 1 &middot; AINDA NAO TEM CONTA ──
             O estado mais comum, e por isso o que abre. Quem recebe um convite
             quase nunca e cliente ainda.
             UM BOTAO SO, e e o de criar conta. Antes eram dois lado a lado, do
             mesmo tamanho, e dois botoes iguais nao dizem qual e o caminho.
             Quem ja tem conta entra pelo elo de baixo, que e onde o login poe o
             "criar conta" e o cadastro poe o "entrar". -->
        <div data-tela="login">
          <h1 class="login-titulo">Aceite o convite</h1>
          <p class="login-sub">Entre ou crie a sua conta para ocupar o assento na equipe.</p>
          <button class="btn btn--verde">Criar conta grátis</button>
          <p class="login-rodape">
            Já tem conta? <button class="link-botao">Fazer login</button>
          </p>
        </div>

        <div data-tela="ok" hidden>
          <h1 class="login-titulo">Bem-vindo à equipe</h1>
          <p class="login-sub">O seu acesso está ativo. Os créditos vêm do plano da equipe.</p>
          <button class="btn btn--verde">Ir para minha conta</button>
        </div>

        <!-- Convite vencido, ja aceito, ou de uma equipe que encerrou. A frase
             cobre o caso mais provavel e mais tranquilizador antes de tudo. -->
        <div data-tela="erro" hidden>
          <h1 class="login-titulo">Convite indisponível</h1>
          <p class="login-sub">Se você já aceitou, o seu acesso está ativo, e é só entrar
            na sua conta.</p>
          <button class="btn btn--verde">Ir para minha conta</button>
        </div>
      </div>
    </div>
  </div>

</main>
</div>

<div class="demo-nota">
  <div><b>A casca traz junto o que a tela solta não tinha.</b> Ela mede a altura do aviso
    de cookies em tempo real e devolve o respiro: solto, o aviso cobria o pé desta tela, e
    no celular o botão ficava atrás dele. O logo leva de volta para a home, que era a
    única saída que não existia aqui.</div>
  <div><b>A grade e as fotos giram sozinhas</b>, com as durações do próprio componente:
    %(durgrade)s ms na grade, que fica mais tempo por ser a primeira coisa que a pessoa vê
    e ter animação própria, e %(durfoto)s ms em cada foto. Dá para clicar nas barrinhas.</div>
  <div><b>O painel some abaixo de 900px.</b> No celular fica só o cartão. Estreite a
    janela para ver.</div>
</div>

<script>
(function () {
  /* A ROTACAO. No site ela e o motor do LoginSplit, com pausa no hover, no
     foco e quando a aba sai de vista, mais as setas invisiveis dos lados.
     Aqui e o essencial: trocar de slide e escrever a frase. As duracoes sao
     as de la, lidas do arquivo na hora de montar. */
  var TEXTOS = %(textos)s;
  var DUR_GRADE = %(durgrade)s, DUR_FOTO = %(durfoto)s;
  var painel = document.getElementById('painel');
  var slides = [].slice.call(painel.querySelectorAll('.slide'));
  var barras = [].slice.call(painel.querySelectorAll('.barra'));
  var frase = painel.querySelector('.frase');
  var apoio = painel.querySelector('.apoio');
  var atual = 0, tempo = null;

  function mostrar(n) {
    atual = (n + slides.length) %% slides.length;
    slides.forEach(function (s, i) { s.dataset.ativo = i === atual ? 'true' : 'false'; });
    barras.forEach(function (b, i) {
      b.dataset.status = i < atual ? 'completa' : (i > atual ? 'pendente' : 'ativa');
    });
    var t = TEXTOS[atual] || ['', ''];
    frase.textContent = t[0];
    apoio.textContent = t[1];
    clearTimeout(tempo);
    tempo = setTimeout(function () { mostrar(atual + 1); },
                       atual === 0 ? DUR_GRADE : DUR_FOTO);
  }
  barras.forEach(function (b, i) { b.addEventListener('click', function () { mostrar(i); }); });
  mostrar(0);

  /* trocar de estado */
  var barraEstados = document.getElementById('estados');
  barraEstados.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    document.querySelectorAll('[data-tela]').forEach(function (t) {
      t.hidden = t.dataset.tela !== b.dataset.estado;
    });
    barraEstados.querySelectorAll('button').forEach(function (o) {
      if (o === b) o.setAttribute('data-on', ''); else o.removeAttribute('data-on');
    });
  });
})();
</script>
</body>
</html>
""" % {
    'css': css,
    'grade': grade_html,
    'slides': slides_html,
    'barras': barras_html,
    'logo9': logo9,
    'logoc': logoc,
    'durgrade': dur_grade,
    'durfoto': dur_foto,
    'textos': json.dumps(textos, ensure_ascii=False),
}

destino = os.path.join(SCR, 'convite.html')
io.open(destino, 'w', encoding='utf-8', newline='\n').write(HTML)
print('convite.html: %.1f KB' % (os.path.getsize(destino) / 1024.0))
