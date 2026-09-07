# -*- coding: utf-8 -*-
"""Monta ferramentas/filtros-admin.html, as quatro opcoes de filtro do admin.

A casca (menu lateral, cabecalho, folha do painel e a do admin) e COPIADA de
painel.html e de admin-css.css: as quatro opcoes precisam ser vistas dentro da
tela de verdade, e nao numa pagina branca.

Rodar de dentro de cora-site:  python ferramentas/montar-filtros.py
"""
import io
import os
import re

def pedaco_dd(painel):
    """O dropdown de demonstracao do painel.

    Ele mora no `<style data-demo>`, e nao no `<style>` de producao, porque no
    site o dropdown e componente e a lista dele sai por um PORTAL: o estilo de
    verdade esta no globals.css. Os montadores liam so o bloco de producao, e
    por isso os campos apareciam sem estilo nenhum.
    """
    i = painel.index('.dd{ position:relative')
    j = painel.index('.demo-dd{', i)
    return chr(10) + chr(10) + painel[i:j].rstrip()


AQUI = os.path.dirname(os.path.abspath(__file__))
css_opcoes = io.open(os.path.join(AQUI, 'filtros-css.css'), encoding='utf-8').read()
css_admin = io.open(os.path.join(AQUI, 'admin-css.css'), encoding='utf-8').read()
corpo = io.open(os.path.join(AQUI, 'filtros-corpo.html'), encoding='utf-8').read()

painel = io.open('ferramentas/painel.html', encoding='utf-8').read()
m = re.search(r"<style>(.*?)</style>", painel, re.S)
assert m, 'nao achei o <style> do painel'
css_painel = m.group(1) + pedaco_dd(painel)

i = painel.index('<div class="app-shell"')
j = painel.index('<main class="app-main">')
casca = painel[i:j]
casca = re.sub(r'\s*<!-- .. a tarja.*?</div>\n', '\n', casca, flags=re.S, count=1)
casca = casca.replace('class="app-nav-item ativo" data-vai="inicio"',
                      'class="app-nav-item" data-vai="inicio"')
casca = re.sub(
    r'(<a[^>]*class="app-nav-item)(")((?:(?!</a>).)*?<span class="app-nav-lbl">Admin</span>)',
    r'\1 ativo\2\3', casca, flags=re.S)
casca = casca.replace('<header class="app-header">',
                      '<header class="app-header app-header--faixa">')
casca = casca.replace('<span class="app-header-aqui">Início</span>',
                      '<span class="app-header-aqui">Admin</span>')

CABECA = u"""<title>Filtros do admin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">

<!--
     QUATRO JEITOS DE FILTRAR NO ADMIN

     Sao sete grupos de filtro: periodo, situacao, profissao, como conheceu,
     renderizador, pais e estado. A gaveta de agora empilha os sete numa
     coluna estreita e sobra buraco entre eles.

     O ERRO QUE ESTA PAGINA CORRIGE, e que vale para as quatro: a gaveta
     usava `display:grid` com `flex:1`, e o grid ESTICA as linhas para
     preencher a altura. Sete grupos curtos viravam sete grupos separados por
     um palmo de nada. `align-content:start` e o conserto.

     Este arquivo e MONTADO por `ferramentas/montar-filtros.py`, que copia a
     casca do painel.html e a folha do admin. Editar o HTML direto e trabalho
     perdido.
-->

<style>
@@CSS_OPCOES@@
</style>

<style data-demo>
/* A folha do painel e a do admin, copiadas na montagem. */
@@CSS_PAINEL@@

@@CSS_ADMIN@@

[hidden]{ display:none!important; }
/* O conserto da gaveta de agora, para dar para comparar com as outras tres. */
.adm-gaveta__corpo{ align-content:start; }
.adm-gaveta__g .dd{ margin-top:0; }
</style>

"""

RODAPE = u"""
    </div>
  </main>
</div>

<!-- ══════════════ 1 · A GAVETA ARRUMADA ══════════════ -->
<div class="adm-gaveta" id="gaveta" hidden style="z-index:300">
  <div class="adm-gaveta__folha">
    <div class="adm-gaveta__cab">
      <h2>Filtros</h2>
      <button class="adm-gaveta__x" id="fecha-gaveta" aria-label="Fechar">&times;</button>
    </div>
    <div class="adm-gaveta__corpo" style="grid-template-columns:1fr 1fr; gap:16px 16px">
      <div class="adm-gaveta__g"><div class="dd dd--rotulo" data-dd data-ops="Todos|Este mês|Últimos 12 meses|Um ano específico|Escolher as datas"><button class="dd__bt" type="button"><span class="dd__mio"><span class="dd__rot">Período</span><span class="dd__val">12 meses</span></span><svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></button></div></div>
      <div class="adm-gaveta__g"><div class="dd dd--rotulo" data-dd data-ops="Qualquer|Quase vencendo|Cancelado"><button class="dd__bt" type="button"><span class="dd__mio"><span class="dd__rot">Situação</span><span class="dd__val">Qualquer</span></span><svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></button></div></div>
      <div class="adm-gaveta__g"><div class="dd dd--rotulo" data-dd data-ops="Qualquer|Arquitetura|Design de interiores|Engenharia|Paisagismo|Estudante|Outra"><button class="dd__bt" type="button"><span class="dd__mio"><span class="dd__rot">Profissão</span><span class="dd__val">Arquitetura</span></span><svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></button></div></div>
      <div class="adm-gaveta__g"><div class="dd dd--rotulo" data-dd data-ops="Qualquer|Instagram|YouTube|Indicação|Busca no Google|Anúncio|Outro"><button class="dd__bt" type="button"><span class="dd__mio"><span class="dd__rot">Como conheceu</span><span class="dd__val">Qualquer</span></span><svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></button></div></div>
      <div class="adm-gaveta__g"><div class="dd dd--rotulo" data-dd data-ops="Qualquer|Nenhum|V-Ray|Enscape|Lumion|D5 Render|Twinmotion|Outro"><button class="dd__bt" type="button"><span class="dd__mio"><span class="dd__rot">Renderizador</span><span class="dd__val">Qualquer</span></span><svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></button></div></div>
      <div class="adm-gaveta__g"><div class="dd dd--rotulo" data-dd data-ops="Qualquer país|Brasil|Portugal|México|Estados Unidos"><button class="dd__bt" type="button"><span class="dd__mio"><span class="dd__rot">País</span><span class="dd__val">Brasil</span></span><svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></button></div></div>
      <div class="adm-gaveta__g" style="grid-column:1 / -1"><div class="dd dd--rotulo" data-dd data-ops="Qualquer estado|São Paulo|Rio de Janeiro|Minas Gerais|Paraná|Pernambuco"><button class="dd__bt" type="button"><span class="dd__mio"><span class="dd__rot">Estado</span><span class="dd__val">São Paulo</span></span><svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></button></div></div>
    </div>
    <div class="adm-gaveta__pe">
      <button class="adm-btn-linha">Limpar</button>
      <button class="as-btn-cta" id="ok-gaveta">Ver 5 contas</button>
    </div>
  </div>
</div>

<script>
  var d = document;

  d.querySelectorAll('.esc__bt').forEach(function (b) {
    b.addEventListener('click', function () {
      d.querySelectorAll('.esc__bt').forEach(function (o) { o.classList.toggle('on', o === b); });
      d.querySelectorAll('section[data-op]').forEach(function (s) {
        s.hidden = s.dataset.op !== b.dataset.op;
      });
      d.getElementById('gaveta').hidden = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  d.querySelector('[data-abre="1"]').addEventListener('click', function () {
    d.getElementById('gaveta').hidden = false;
  });
  d.getElementById('fecha-gaveta').addEventListener('click', function () {
    d.getElementById('gaveta').hidden = true;
  });
  d.getElementById('ok-gaveta').addEventListener('click', function () {
    d.getElementById('gaveta').hidden = true;
  });
  d.getElementById('gaveta').addEventListener('click', function (e) {
    if (e.target === this) this.hidden = true;
  });

  /* Opcao 4: cada botao abre so o seu menu. */
  d.querySelectorAll('.f4__bt').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var alvo = d.querySelector('.f4__menu[data-de="' + b.dataset.menu + '"]');
      var jaAberto = alvo && !alvo.hidden;
      d.querySelectorAll('.f4__menu').forEach(function (m) { m.hidden = true; });
      if (alvo && !jaAberto) {
        alvo.hidden = false;
        alvo.style.left = (b.offsetLeft) + 'px';
      }
    });
  });
  d.addEventListener('click', function () {
    d.querySelectorAll('.f4__menu').forEach(function (m) { m.hidden = true; });
  });
  d.querySelectorAll('.f4__op').forEach(function (o) {
    o.addEventListener('click', function (e) {
      e.stopPropagation();
      o.parentElement.querySelectorAll('.f4__op').forEach(function (x) { x.classList.remove('on'); });
      o.classList.add('on');
      o.parentElement.hidden = true;
    });
  });

  /* OS DROPDOWNS ABREM DE VERDADE.
     No site quem faz isto e o componente DropdownCora, que joga a lista num
     PORTAL no fim do documento. Aqui a lista nasce ao lado do botao, so para
     o desenho poder ser julgado. */
  function fecharTodos() {
    d.querySelectorAll('.dd--aberto').forEach(function (x) {
      x.classList.remove('dd--aberto');
      var l = x.querySelector('.dd__lista');
      if (l) l.remove();
    });
  }

  d.querySelectorAll('[data-ops]').forEach(function (dd) {
    var bt = dd.querySelector('.dd__bt');
    var val = dd.querySelector('.dd__val');
    if (!bt || !val) return;
    bt.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var jaAberto = dd.classList.contains('dd--aberto');
      fecharTodos();
      if (jaAberto) return;

      var lista = d.createElement('div');
      lista.className = 'dd__lista';
      dd.dataset.ops.split('|').forEach(function (nome) {
        var op = d.createElement('button');
        op.type = 'button';
        op.className = 'dd__op' + (nome === val.textContent ? ' dd__op--sel' : '');
        op.innerHTML = '<span></span>'
          + '<svg class="dd__tique" viewBox="0 0 16 16" fill="none" stroke="currentColor"'
          + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
          + '<path d="m3 8.5 3.5 3.5L13 5"/></svg>';
        op.firstChild.textContent = nome;
        op.addEventListener('click', function (ev) {
          ev.stopPropagation();
          val.textContent = nome;
          fecharTodos();
        });
        lista.appendChild(op);
      });
      dd.appendChild(lista);
      dd.classList.add('dd--aberto');
    });
  });

  d.addEventListener('click', fecharTodos);
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharTodos(); });
</script>
"""

FORA = (CABECA
        .replace('@@CSS_OPCOES@@', css_opcoes)
        .replace('@@CSS_PAINEL@@', css_painel)
        .replace('@@CSS_ADMIN@@', css_admin))

MIOLO = (u'  <main class="app-main">\n    <div class="app-main-conteudo">\n'
         u'    <div class="admin-wrap" style="max-width:1180px;margin:0 auto">\n'
         + corpo + u'\n    </div>\n')

io.open('ferramentas/filtros-admin.html', 'w', encoding='utf-8').write(FORA + casca + MIOLO + RODAPE)
print('filtros-admin.html: %.1f KB' % (os.path.getsize('ferramentas/filtros-admin.html') / 1024.0))
