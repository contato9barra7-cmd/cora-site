# -*- coding: utf-8 -*-
"""Monta ferramentas/filtros-admin.html: quatro desenhos do dropdown de filtros.

O botao Filtros do admin abre um dropdown. Sao quatro jeitos de desenhar esse
dropdown, com os mesmos sete filtros dentro. A casca (menu lateral, cabecalho,
folha do painel e a do admin) e COPIADA de painel.html e de admin-css.css: o
dropdown precisa ser visto dentro da tela de verdade, e nao numa pagina branca.

As quatro opcoes sao montadas a partir de UMA lista de filtros, logo abaixo. E
isso que garante que as quatro tenham exatamente o mesmo conteudo dentro.

Rodar de dentro de cora-site:  python ferramentas/montar-filtros.py
"""
import io
import os
import re


def pedaco_dd(painel):
    """O dropdown de demonstracao do painel.

    Ele mora no `<style data-demo>`, e nao no `<style>` de producao, porque no
    site o dropdown e componente e a lista dele sai por um PORTAL: o estilo de
    verdade esta no globals.css.
    """
    i = painel.index('.dd{ position:relative')
    j = painel.index('.demo-dd{', i)
    return chr(10) + chr(10) + painel[i:j].rstrip()


AQUI = os.path.dirname(os.path.abspath(__file__))
css_opcoes = io.open(os.path.join(AQUI, 'filtros-css.css'), encoding='utf-8').read()
css_admin = io.open(os.path.join(AQUI, 'admin-css.css'), encoding='utf-8').read()

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

# ═══════════════════════════════════════════════════════════════════════════
#  OS SETE FILTROS, num lugar so.
# ═══════════════════════════════════════════════════════════════════════════
FILTROS = [
    (u'Período', u'Últimos 12 meses',
     [u'Todos', u'Este mês', u'Últimos 12 meses', u'Um ano específico', u'Escolher as datas']),
    (u'Situação', u'Qualquer', [u'Qualquer', u'Quase vencendo', u'Cancelado']),
    (u'Profissão', u'Arquitetura',
     [u'Qualquer', u'Arquitetura', u'Design de interiores', u'Engenharia', u'Paisagismo',
      u'Estudante', u'Outra']),
    (u'Como conheceu', u'Qualquer',
     [u'Qualquer', u'Instagram', u'YouTube', u'Indicação', u'Busca no Google', u'Anúncio', u'Outro']),
    (u'Renderizador', u'Qualquer',
     [u'Qualquer', u'Nenhum', u'V-Ray', u'Enscape', u'Lumion', u'D5 Render', u'Twinmotion', u'Outro']),
    (u'País', u'Brasil', [u'Qualquer país', u'Brasil', u'Portugal', u'México', u'Estados Unidos']),
    (u'Estado', u'São Paulo',
     [u'Qualquer estado', u'São Paulo', u'Rio de Janeiro', u'Minas Gerais', u'Paraná', u'Pernambuco']),
]

TIQUE = (u'<svg class="fx__tique" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
         u'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
         u'<path d="m3 8.5 3.5 3.5L13 5"/></svg>')
SETA_DD = (u'<svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
           u'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
           u'<path d="M4 6l4 4 4-4"/></svg>')
NEUTROS = (u'Qualquer', u'Qualquer país', u'Qualquer estado', u'Todos')


def campo(rotulo, valor, opcoes):
    """O controle padrao do Cora, com o rotulo dentro."""
    return (u'<div class="dd dd--rotulo" data-dd data-ops="%s"><button class="dd__bt" type="button">'
            u'<span class="dd__mio"><span class="dd__rot">%s</span>'
            u'<span class="dd__val">%s</span></span>%s</button></div>'
            % (u'|'.join(opcoes), rotulo, valor, SETA_DD))


def opcoes_de(valor, opcoes):
    return u''.join(
        u'<button class="fx__op%s" type="button"><span>%s</span>%s</button>'
        % (u' fx__op--sel' if o == valor else u'', o, TIQUE) for o in opcoes)


linhas1 = u''.join(
    u'<button class="fx__linha%s" type="button" data-entra="%d">%s <b>%s</b><i></i></button>'
    % (u'' if v not in NEUTROS else u' fx__linha--limpo', n, r, v)
    for n, (r, v, _) in enumerate(FILTROS))
telas1 = u''.join(
    u'<div class="fx1__lista" data-tela1="%d" hidden>%s</div>' % (n, opcoes_de(v, ops))
    for n, (r, v, ops) in enumerate(FILTROS))

campos = u''.join(campo(r, v, ops) for r, v, ops in FILTROS)

secoes4 = u''.join(
    u'<div class="fx4__sec"><div class="fx4__rot">%s</div>%s</div>' % (r, opcoes_de(v, ops))
    for r, v, ops in FILTROS)

BUSCA = (u'<div class="adm-busca">'
         u'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
         u'stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
         u'<input class="perfil-input" placeholder="Buscar por nome, e-mail ou CPF"></div>')

PE = (u'<div class="fx__pe"><span class="fx__conta">5 de 19</span>'
      u'<button class="as-btn-cta">Ver 5 contas</button></div>')


def botao(n):
    return (u'<button class="adm-btn-linha" data-abre="%d">'
            u'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
            u'stroke-linecap="round"><path d="M3 5h18M6 12h12M10 19h4"/></svg>'
            u'Filtros <span class="adm-btn-n">3</span></button>' % n)


NOTAS = [
    (u'Menu que entra',
     u'Uma coluna estreita, uma linha por filtro, com o valor escolhido à direita. '
     u'Clicar numa linha troca o miolo pelas opções daquele filtro, com um voltar em cima.',
     u'<b>A favor</b> é o mais estreito dos quatro, e cabe qualquer número de filtros sem '
     u'crescer. Cada lista de opções aparece inteira, sem rolagem. '
     u'<b>Contra</b> mudar três filtros exige entrar e voltar três vezes.'),
    (u'Campos empilhados',
     u'O dropdown fica largo e traz os sete campos, um embaixo do outro, com o mesmo '
     u'controle do resto do site.',
     u'<b>A favor</b> tudo à mão, e o controle é o mesmo do perfil e do login. '
     u'<b>Contra</b> sete campos numa coluna precisam rolar, e cada um ainda abre a sua '
     u'própria lista por cima.'),
    (u'Duas colunas',
     u'O mesmo da anterior, em duas colunas. Os sete cabem sem rolar nenhuma vez.',
     u'<b>A favor</b> vê os sete de uma vez, e o pé com a contagem fica sempre visível. '
     u'<b>Contra</b> 620px de dropdown é quase um painel, e no telefone ele volta a ser '
     u'uma coluna só.'),
    (u'Tudo aberto',
     u'Sem campo e sem entrar em lugar nenhum: cada filtro é uma seção com as opções à '
     u'vista, uma embaixo da outra. Rola por dentro.',
     u'<b>A favor</b> é o menor número de cliques possível, um por filtro, e o que está '
     u'escolhido se lê de relance. '
     u'<b>Contra</b> é o mais comprido dos quatro, e listas grandes deixam a rolagem longa.'),
]

POPS = {
    1: (u'<div class="fx__pop fx1" data-pop="1" hidden>'
        u'<div class="fx__cab" data-cab1><h3>Filtros</h3></div>'
        u'<div class="fx1__lista" data-tela1="raiz">%s</div>%s%s</div>'
        % (linhas1, telas1, PE)),
    2: (u'<div class="fx__pop fx2" data-pop="2" hidden>'
        u'<div class="fx__cab"><h3>Filtros</h3>'
        u'<button class="adm-limpar">limpar tudo</button></div>'
        u'<div class="fx2__corpo">%s</div>%s</div>' % (campos, PE)),
    3: (u'<div class="fx__pop fx3" data-pop="3" hidden>'
        u'<div class="fx__cab"><h3>Filtros</h3>'
        u'<button class="adm-limpar">limpar tudo</button></div>'
        u'<div class="fx3__corpo">%s</div>%s</div>' % (campos, PE)),
    4: (u'<div class="fx__pop fx4" data-pop="4" hidden>'
        u'<div class="fx__cab"><h3>Filtros</h3>'
        u'<button class="adm-limpar">limpar tudo</button></div>'
        u'<div class="fx4__corpo">%s</div>%s</div>' % (secoes4, PE)),
}

secoes = []
for n in range(1, 5):
    titulo, oque, pros = NOTAS[n - 1]
    secoes.append(
        u'<section data-op="%d"%s>'
        u'<div class="esc__nota"><h2>%s</h2><p>%s</p><p>%s</p>'
        u'<p class="esc__dica">Clique em <b>Filtros</b> aqui embaixo para abrir.</p></div>'
        u'<div class="fx-barra">%s<div class="fx">%s%s</div></div>'
        u'<div class="conta-card adm-card"><p class="adm-vazio">A tabela fica aqui, '
        u'e o dropdown abre por cima dela.</p></div>'
        u'</section>'
        % (n, u'' if n == 1 else u' hidden', titulo, oque, pros, BUSCA, botao(n), POPS[n]))

CORPO = (u"""    <div class="esc">
      <p class="eyebrow">Admin &middot; o dropdown de filtros</p>
      <h1>Quatro jeitos de abrir os filtros</h1>
      <p class="esc__p">O botão Filtros abre um dropdown. São os mesmos sete filtros nos
        quatro (período, situação, profissão, como conheceu, renderizador, país e estado),
        mudando só o desenho de dentro. Os quatro abrem de verdade: clique em Filtros.</p>
      <div class="esc__btns">
        <button class="esc__bt on" data-op="1">1 &middot; Menu que entra</button>
        <button class="esc__bt" data-op="2">2 &middot; Campos empilhados</button>
        <button class="esc__bt" data-op="3">3 &middot; Duas colunas</button>
        <button class="esc__bt" data-op="4">4 &middot; Tudo aberto</button>
      </div>
    </div>
""" + u''.join(secoes))

CABECA = u"""<title>Dropdown de filtros</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">

<!--
     QUATRO DESENHOS DO DROPDOWN DE FILTROS DO ADMIN

     O botao Filtros abre um dropdown. Sao quatro jeitos de desenhar esse
     dropdown, ancorado no mesmo botao, com os mesmos sete filtros dentro.
     Os quatro abrem de verdade.

     Este arquivo e MONTADO por `ferramentas/montar-filtros.py`, que copia a
     casca do painel.html e monta as quatro a partir de UMA lista de filtros.
     Editar o HTML direto e trabalho perdido.
-->

<style>
@@CSS_OPCOES@@
</style>

<style data-demo>
/* A folha do painel e a do admin, copiadas na montagem. */
@@CSS_PAINEL@@

@@CSS_ADMIN@@

[hidden]{ display:none!important; }
</style>

"""

RODAPE = u"""
    </div>
  </main>
</div>

<script>
  /* So a demonstracao. No site quem abre o dropdown e o estado do componente. */
  var d = document;
  var NOMES = @@NOMES@@;

  function fecharDds() {
    d.querySelectorAll('.dd--aberto').forEach(function (x) {
      x.classList.remove('dd--aberto');
      var l = x.querySelector('.dd__lista');
      if (l) l.remove();
    });
  }

  function fecharPops() {
    d.querySelectorAll('.fx__pop').forEach(function (p) { p.hidden = true; });
    d.querySelectorAll('[data-abre]').forEach(function (b) { b.classList.remove('adm-btn-linha--on'); });
    fecharDds();
  }

  d.querySelectorAll('.esc__bt').forEach(function (b) {
    b.addEventListener('click', function () {
      d.querySelectorAll('.esc__bt').forEach(function (o) { o.classList.toggle('on', o === b); });
      d.querySelectorAll('section[data-op]').forEach(function (s) {
        s.hidden = s.dataset.op !== b.dataset.op;
      });
      fecharPops();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  d.querySelectorAll('[data-abre]').forEach(function (bt) {
    bt.addEventListener('click', function (e) {
      e.stopPropagation();
      var pop = d.querySelector('.fx__pop[data-pop="' + bt.dataset.abre + '"]');
      var jaAberto = pop && !pop.hidden;
      fecharPops();
      if (pop && !jaAberto) {
        pop.hidden = false;
        bt.classList.add('adm-btn-linha--on');
      }
    });
  });
  d.querySelectorAll('.fx__pop').forEach(function (p) {
    p.addEventListener('click', function (e) { e.stopPropagation(); });
  });
  d.addEventListener('click', fecharPops);
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharPops(); });

  /* Opcao 1: entrar e voltar dentro do proprio dropdown. */
  function verTela1(qual) {
    var pop = d.querySelector('.fx__pop[data-pop="1"]');
    pop.querySelector('[data-tela1="raiz"]').hidden = qual !== 'raiz';
    pop.querySelectorAll('[data-tela1]').forEach(function (t) {
      if (t.dataset.tela1 === 'raiz') return;
      t.hidden = t.dataset.tela1 !== String(qual);
    });
    var cab = pop.querySelector('[data-cab1]');
    if (qual === 'raiz') {
      cab.innerHTML = '<h3>Filtros</h3>';
      return;
    }
    cab.innerHTML = '<button class="fx__voltar" type="button" data-volta><i></i>'
      + NOMES[qual] + '</button>';
    cab.querySelector('[data-volta]').addEventListener('click', function (e) {
      e.stopPropagation();
      verTela1('raiz');
    });
  }
  d.querySelectorAll('[data-entra]').forEach(function (l) {
    l.addEventListener('click', function (e) { e.stopPropagation(); verTela1(l.dataset.entra); });
  });

  /* Escolher marca a opcao e desmarca as irmas. */
  d.querySelectorAll('.fx__op').forEach(function (o) {
    o.addEventListener('click', function (e) {
      e.stopPropagation();
      o.parentElement.querySelectorAll('.fx__op').forEach(function (x) {
        x.classList.remove('fx__op--sel');
      });
      o.classList.add('fx__op--sel');
      var pop = o.closest('.fx__pop');
      if (pop && pop.dataset.pop === '1') {
        var tela = o.closest('[data-tela1]');
        if (tela) {
          var linha = d.querySelector('[data-entra="' + tela.dataset.tela1 + '"]');
          if (linha) {
            var nome = o.querySelector('span').textContent;
            linha.querySelector('b').textContent = nome;
            linha.classList.toggle('fx__linha--limpo',
              ['Qualquer', 'Qualquer país', 'Qualquer estado', 'Todos'].indexOf(nome) >= 0);
          }
        }
        verTela1('raiz');
      }
    });
  });

  /* Os campos das opcoes 2 e 3 abrem a lista deles. */
  d.querySelectorAll('[data-ops]').forEach(function (dd) {
    var bt = dd.querySelector('.dd__bt');
    var val = dd.querySelector('.dd__val');
    if (!bt || !val) return;
    bt.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var jaAberto = dd.classList.contains('dd--aberto');
      fecharDds();
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
          fecharDds();
        });
        lista.appendChild(op);
      });
      dd.appendChild(lista);
      dd.classList.add('dd--aberto');
    });
  });

  /* Limpar limpa de verdade: tudo volta para a primeira opcao de cada grupo. */
  d.querySelectorAll('.adm-limpar').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var pop = b.closest('.fx__pop');
      if (!pop) return;
      pop.querySelectorAll('.fx4__sec, [data-tela1]').forEach(function (sec) {
        sec.querySelectorAll('.fx__op').forEach(function (o, i) {
          o.classList.toggle('fx__op--sel', i === 0);
        });
      });
      pop.querySelectorAll('[data-ops]').forEach(function (dd) {
        dd.querySelector('.dd__val').textContent = dd.dataset.ops.split('|')[0];
      });
    });
  });
</script>
"""

FORA = (CABECA
        .replace('@@CSS_OPCOES@@', css_opcoes)
        .replace('@@CSS_PAINEL@@', css_painel)
        .replace('@@CSS_ADMIN@@', css_admin))

nomes = u'{' + u','.join(u'"%d":"%s"' % (n, r) for n, (r, _, _) in enumerate(FILTROS)) + u'}'
RODAPE = RODAPE.replace('@@NOMES@@', nomes)

MIOLO = (u'  <main class="app-main">\n    <div class="app-main-conteudo">\n'
         u'    <div class="admin-wrap" style="max-width:1180px;margin:0 auto">\n'
         + CORPO + u'\n    </div>\n')

io.open('ferramentas/filtros-admin.html', 'w', encoding='utf-8').write(FORA + casca + MIOLO + RODAPE)
print('filtros-admin.html: %.1f KB' % (os.path.getsize('ferramentas/filtros-admin.html') / 1024.0))
