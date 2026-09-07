# -*- coding: utf-8 -*-
"""Monta ferramentas/admin.html a partir da casca do painel.

A casca (menu lateral, cabecalho, tokens, cartao, tabela, selo) e COPIADA do
painel.html, e nao reescrita: e o que garante que o admin seja a mesma tela e
nao uma imitacao que envelhece sozinha. Rodar de dentro de cora-site.
"""
import io
import os
import re

# as pecas moram ao lado deste arquivo, em ferramentas/
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


SCR = os.path.dirname(os.path.abspath(__file__))
css_admin = io.open(os.path.join(SCR, 'admin-css.css'), encoding='utf-8').read()
corpo = io.open(os.path.join(SCR, 'admin-corpo.html'), encoding='utf-8').read()

painel = io.open('ferramentas/painel.html', encoding='utf-8').read()

m = re.search(r"<style>(.*?)</style>", painel, re.S)
assert m, 'nao achei o <style> do painel'
css_painel = m.group(1) + pedaco_dd(painel)

i = painel.index('<div class="app-shell"')
j = painel.index('<main class="app-main">')
casca = painel[i:j]

# a tarja de personificacao nao pertence a esta tela
casca = re.sub(r'\s*<!-- .. a tarja.*?</div>\n', '\n', casca, flags=re.S, count=1)

# no painel quem nasce ativo e o Inicio; aqui e o Admin
casca = casca.replace('class="app-nav-item ativo" data-vai="inicio"',
                      'class="app-nav-item" data-vai="inicio"')

# o item Admin do menu nasce ativo
casca = re.sub(
    r'(<a[^>]*class="app-nav-item)(")((?:(?!</a>).)*?<span class="app-nav-lbl">Admin</span>)',
    r'\1 ativo\2\3', casca, flags=re.S)

# o cabecalho recebe a padronagem, como em Minha conta
casca = casca.replace('<header class="app-header">',
                      '<header class="app-header app-header--faixa">')
casca = casca.replace('<span class="app-header-aqui">Início</span>',
                      '<span class="app-header-aqui">Admin</span>')

# ── O SUBMENU DO ADMIN ──
# Admin abre em tres telas. Elas moram no menu lateral, e nao numa fila de
# oito abas em cima da tabela: cada tela carrega so os seus controles, e e
# isso que a barra unica nao conseguia dizer.
#
# Dinheiro vem primeiro e nasce aberta: ela e a dashboard. Quem entra no admin
# quer saber quanto entrou, e nao quem esta cadastrado.
SUBMENU = (
    chr(10) + '        <div class="app-nav-sub">'
    + '<a href="#" class="ativo" data-tela-adm="dinheiro">Dinheiro <b>30</b></a>'
    + '<a href="#" data-tela-adm="contas">Contas <b>19</b></a>'
    + '<a href="#" data-tela-adm="registros">Registros <b>40</b></a>'
    + '</div>')
casca = casca.replace('<span class="app-nav-lbl">Admin</span>' + chr(10) + '        </a>',
                      '<span class="app-nav-lbl">Admin</span>' + chr(10) + '        </a>' + SUBMENU, 1)

# ═══════════════════════════════════════════════════════════════════════════
#  O DROPDOWN DOS FILTROS
#
#  Os sete filtros num lugar so. O montador escreve os sete campos dentro do
#  dropdown, cada um com o rotulo dentro do proprio controle: e a opcao 2 das
#  quatro que o dono viu em ferramentas/filtros-admin.html.
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
    # Receber novidades e um interruptor que ATRAVESSA os quatro estados de
    # conta: um assinante pode ter ligado ou desligado. Como aba ele fingia
    # ser um quinto tipo de pessoa. Como filtro ele e o que e.
    (u'Novidades', u'Tanto faz', [u'Tanto faz', u'Só quem recebe', u'Só quem desligou']),
]

SETA_DD = (u'<svg class="dd__seta" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
           u'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
           u'<path d="M4 6l4 4 4-4"/></svg>')


def campo(rotulo, valor, opcoes):
    return (u'<div class="dd dd--rotulo" data-dd data-ops="%s">'
            u'<button class="dd__bt" type="button"><span class="dd__mio">'
            u'<span class="dd__rot">%s</span><span class="dd__val">%s</span></span>%s'
            u'</button></div>'
            % (u'|'.join(opcoes), rotulo, valor, SETA_DD))


NL = chr(10)
DROPDOWN = (
    u'          <div class="adm-pop" id="pop-filtros" hidden>' + NL
    + u'            <div class="adm-pop__cab"><h2>Filtros</h2>'
    + u'<button class="adm-limpar">limpar tudo</button></div>' + NL
    + u'            <div class="adm-pop__corpo">'
    + u''.join(campo(r, v, ops) for r, v, ops in FILTROS)
    + u'</div>' + NL
    + u'            <div class="adm-pop__pe">'
    + u'<span class="adm-pop__conta">5 de 19</span>'
    + u'<button class="as-btn-cta">Ver 5 contas</button></div>' + NL
    + u'          </div>')

corpo = corpo.replace('@@DROPDOWN@@', DROPDOWN)

CABECA = io.open(os.path.join(SCR, 'admin-cabeca.txt'), encoding='utf-8').read()
RODAPE = io.open(os.path.join(SCR, 'admin-rodape.txt'), encoding='utf-8').read()

FORA = (CABECA
        .replace('@@CSS_ADMIN@@', css_admin)
        .replace('@@CSS_PAINEL@@', css_painel))

MIOLO = ('  <main class="app-main">\n    <div class="app-main-conteudo">\n'
         '    <div class="admin-wrap" style="max-width:1180px;margin:0 auto">\n'
         + corpo + '\n    </div>\n')

io.open('ferramentas/admin.html', 'w', encoding='utf-8').write(FORA + casca + MIOLO + RODAPE)
print('admin.html: %.1f KB' % (os.path.getsize('ferramentas/admin.html') / 1024.0))
