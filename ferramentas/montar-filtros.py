# -*- coding: utf-8 -*-
"""Monta ferramentas/filtros-admin.html: quatro desenhos do dropdown de filtros.

O botao Filtros do admin abre um dropdown. Sao quatro jeitos de desenhar esse
dropdown, com os mesmos sete filtros dentro.

OS QUATRO FICAM ABERTOS NA TELA, lado a lado. A primeira versao escondia cada
um atras de um clique no botao Filtros, e comparar quatro coisas que so
aparecem uma de cada vez nao e comparar.

As quatro sao montadas a partir de UMA lista de filtros, logo abaixo. E isso
que garante que as quatro tenham exatamente o mesmo conteudo dentro.

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

painel = io.open('ferramentas/painel.html', encoding='utf-8').read()
m = re.search(r"<style>(.*?)</style>", painel, re.S)
assert m, 'nao achei o <style> do painel'
# So os tokens e os componentes compartilhados. A casca (menu, cabecalho) nao
# entra: esta pagina e uma folha de comparacao, e o menu so roubaria 240px de
# largura de quatro dropdowns que precisam caber lado a lado.
css_painel = m.group(1) + pedaco_dd(painel)

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

PE = (u'<div class="fx__pe"><span class="fx__conta">5 de 19</span>'
      u'<button class="as-btn-cta">Ver 5 contas</button></div>')

POPS = {
    1: (u'<div class="fx__pop fx1" data-pop="1">'
        u'<div class="fx__cab" data-cab1><h3>Filtros</h3></div>'
        u'<div class="fx1__lista" data-tela1="raiz">%s</div>%s%s</div>'
        % (linhas1, telas1, PE)),
    2: (u'<div class="fx__pop fx2" data-pop="2">'
        u'<div class="fx__cab"><h3>Filtros</h3>'
        u'<button class="adm-limpar">limpar tudo</button></div>'
        u'<div class="fx2__corpo">%s</div>%s</div>' % (campos, PE)),
    3: (u'<div class="fx__pop fx3" data-pop="3">'
        u'<div class="fx__cab"><h3>Filtros</h3>'
        u'<button class="adm-limpar">limpar tudo</button></div>'
        u'<div class="fx3__corpo">%s</div>%s</div>' % (campos, PE)),
    4: (u'<div class="fx__pop fx4" data-pop="4">'
        u'<div class="fx__cab"><h3>Filtros</h3>'
        u'<button class="adm-limpar">limpar tudo</button></div>'
        u'<div class="fx4__corpo">%s</div>%s</div>' % (secoes4, PE)),
}

NOTAS = [
    (u'Menu que entra', u'290 de largura',
     u'Uma linha por filtro, com o valor escolhido à direita. Clicar numa linha troca o '
     u'miolo pelas opções daquele filtro, com um voltar em cima. <b>Experimente clicar '
     u'em Profissão.</b>',
     u'<b>A favor</b> é o mais estreito dos quatro, e cabe qualquer número de filtros sem '
     u'crescer. Cada lista de opções aparece inteira, sem rolagem. '
     u'<b>Contra</b> mudar três filtros exige entrar e voltar três vezes.'),
    (u'Campos empilhados', u'370 de largura',
     u'Os sete campos um embaixo do outro, com o mesmo controle do perfil e do login. '
     u'<b>Os campos abrem.</b>',
     u'<b>A favor</b> tudo à mão, e o controle é o mesmo do resto do site. '
     u'<b>Contra</b> sete campos numa coluna precisam rolar, e cada um ainda abre a sua '
     u'própria lista por cima.'),
    (u'Duas colunas', u'620 de largura',
     u'O mesmo da anterior, em duas colunas. Os sete cabem sem rolar nenhuma vez, e o pé '
     u'com a contagem fica sempre visível.',
     u'<b>A favor</b> vê os sete de uma vez. '
     u'<b>Contra</b> 620px de dropdown é quase um painel, e no telefone ele volta a ser '
     u'uma coluna só.'),
    (u'Tudo aberto', u'330 de largura',
     u'Sem campo e sem entrar em lugar nenhum: cada filtro é uma seção com as opções à '
     u'vista, uma embaixo da outra. Rola por dentro.',
     u'<b>A favor</b> é o menor número de cliques possível, um por filtro, e o que está '
     u'escolhido se lê de relance. '
     u'<b>Contra</b> é o mais comprido dos quatro, e listas grandes deixam a rolagem longa.'),
]

celulas = []
for n in range(1, 5):
    titulo, medida, oque, pros = NOTAS[n - 1]
    celulas.append(
        u'<div class="cel%s">'
        u'<div class="cel__cab"><span class="cel__n">%d</span><h2>%s</h2></div>'
        u'<p class="cel__p">%s</p><p class="cel__p">%s</p>'
        u'<div class="palco">%s</div>'
        u'</div>'
        % (u' cel--larga' if n == 3 else u'', n, titulo, oque, pros, POPS[n]))

CORPO = (u"""  <div class="esc">
    <p class="eyebrow">Admin &middot; o dropdown de filtros</p>
    <h1>Quatro jeitos de abrir os filtros</h1>
    <p class="esc__p">O botão Filtros do admin abre um dropdown. Aqui estão os quatro
      desenhos possíveis, <b>os quatro abertos e funcionando</b>, com os mesmos sete
      filtros dentro: período, situação, profissão, como conheceu, renderizador, país e
      estado. Clique à vontade em qualquer um deles. Me diz o número.</p>
  </div>

  <div class="grade">
""" + u''.join(celulas) + u"""
  </div>
""")

CABECA = u"""<title>Dropdown de filtros</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">

<!--
     QUATRO DESENHOS DO DROPDOWN DE FILTROS DO ADMIN

     Os quatro ficam ABERTOS na tela, lado a lado, e os quatro funcionam. A
     primeira versao escondia cada um atras de um clique no botao Filtros, e
     comparar quatro coisas que so aparecem uma de cada vez nao e comparar.

     A casca do painel (menu lateral, cabecalho) nao entra aqui de proposito:
     esta e uma folha de comparacao, e o menu so roubaria 240px de largura de
     quatro dropdowns que precisam caber lado a lado. O contexto ja foi visto
     no artefato do admin.

     Este arquivo e MONTADO por `ferramentas/montar-filtros.py`, que monta as
     quatro a partir de UMA lista de filtros. Editar o HTML direto e trabalho
     perdido.
-->

<style>
@@CSS_PAINEL@@

@@CSS_OPCOES@@

[hidden]{ display:none!important; }
</style>

"""

RODAPE = u"""
<script>
  /* So a demonstracao. No site quem guarda o estado e o componente. */
  var d = document;
  var NOMES = @@NOMES@@;

  function fecharDds(menos) {
    d.querySelectorAll('.dd--aberto').forEach(function (x) {
      if (x === menos) return;
      x.classList.remove('dd--aberto');
      var l = x.querySelector('.dd__lista');
      if (l) l.remove();
    });
  }

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
    cab.querySelector('[data-volta]').addEventListener('click', function () { verTela1('raiz'); });
  }
  d.querySelectorAll('[data-entra]').forEach(function (l) {
    l.addEventListener('click', function () { verTela1(l.dataset.entra); });
  });

  /* Escolher marca a opcao e desmarca as irmas. */
  d.querySelectorAll('.fx__op').forEach(function (o) {
    o.addEventListener('click', function () {
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
  d.addEventListener('click', function () { fecharDds(); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharDds(); });

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
        .replace('@@CSS_PAINEL@@', css_painel)
        .replace('@@CSS_OPCOES@@', css_opcoes))

nomes = u'{' + u','.join(u'"%d":"%s"' % (n, r) for n, (r, _, _) in enumerate(FILTROS)) + u'}'
RODAPE = RODAPE.replace('@@NOMES@@', nomes)

io.open('ferramentas/filtros-admin.html', 'w', encoding='utf-8').write(
    FORA + u'<div class="env">\n' + CORPO + u'</div>\n' + RODAPE)
print('filtros-admin.html: %.1f KB' % (os.path.getsize('ferramentas/filtros-admin.html') / 1024.0))
