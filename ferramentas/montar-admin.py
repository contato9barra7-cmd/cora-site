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
SCR = os.path.dirname(os.path.abspath(__file__))
css_admin = io.open(os.path.join(SCR, 'admin-css.css'), encoding='utf-8').read()
corpo = io.open(os.path.join(SCR, 'admin-corpo.html'), encoding='utf-8').read()

painel = io.open('ferramentas/painel.html', encoding='utf-8').read()

m = re.search(r"<style>(.*?)</style>", painel, re.S)
assert m, 'nao achei o <style> do painel'
css_painel = m.group(1)

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
