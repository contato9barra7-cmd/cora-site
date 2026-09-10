# -*- coding: utf-8 -*-
"""
Monta o artefato da aba Batch do plugin, a partir das folhas de produção.

    python montar-batch-plugin.py

Le  : cora-plugin-batch.fonte.html
      cora-plugin-janela.fonte.html   (a moldura `.jn`, para não ter duas)
      ../app/globals.css, cora-pagina.css, painel-pagina.css
      ../public/img/*.webp
Faz : cora-plugin-batch.html

POR QUE ASSIM
Mesma regra da janela: o artefato tem que ser o site, e não uma cópia do
site desenhada de novo. Este script chama o MESMO peneirador e o MESMO
botão de tamanho do `montar-janela-plugin.py`, e recorta a moldura do
fonte da janela em vez de manter uma segunda cópia dela. Se a moldura
mudar lá, muda aqui na próxima montagem.
"""

import base64
import importlib.util
import io
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(AQUI)

FONTE = os.path.join(AQUI, 'cora-plugin-batch.fonte.html')
JANELA = os.path.join(AQUI, 'cora-plugin-janela.fonte.html')
GERADOR = os.path.join(AQUI, 'montar-janela-plugin.py')
SAIDA = os.path.join(AQUI, 'cora-plugin-batch.html')

FOTOS = ['painel-escritorio.webp', 'painel-cozinha.webp',
         'painel-varanda.webp', 'painel-fachada.webp']


def ler(caminho):
    return io.open(caminho, encoding='utf-8').read()


def gerador():
    spec = importlib.util.spec_from_file_location('montar', GERADOR)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def moldura(fonte):
    """As regras `.jn*` do fonte da janela, sem as fotos de mentira dela."""
    ini = fonte.index(u'/* ── a janela ── */')
    fim = fonte.index(u'/* ── o banco de provas ── */')
    css = fonte[ini:fim]
    return re.sub(r'\.jn \.foto\.(f\d|ref-[ab])\{[^}]*\}\n?', u'', css)


def foto_uri(nome):
    caminho = os.path.join(SITE, 'public', 'img', nome)
    dados = base64.b64encode(open(caminho, 'rb').read()).decode('ascii')
    return "url('data:image/webp;base64," + dados + "')"


def main():
    mod = gerador()
    fonte = ler(FONTE)

    globais = [mod.encolher(r) for r in
               mod.peneirar_globals(ler(os.path.join(SITE, 'app', 'globals.css')))]
    cora = mod.encolher(ler(os.path.join(SITE, 'app', 'cora-pagina.css')))

    painel = ler(os.path.join(SITE, 'app', 'painel-pagina.css'))
    m = re.search(r"--marca:url\('(data:image/png;base64,[^']+)'\)", painel)
    if not m:
        raise SystemExit('não achei a --marca no painel-pagina.css')

    tokens = ["  --marca:url('" + m.group(1) + "');"]
    for i, nome in enumerate(FOTOS, start=1):
        tokens.append('  --foto%d:%s;' % (i, foto_uri(nome)))
    # Aqui a moldura nao e um `.jn` que envolve tudo: cada quadro e um
    # pedaco solto da janela. Os tokens sobem para o `:root`.
    extra = ':root{\n' + '\n'.join(tokens) + '\n}\n'

    saida = fonte
    saida = saida.replace('/*@GLOBAIS@*/', '\n'.join(globais))
    saida = saida.replace('/*@CORA@*/', cora + '\n' + moldura(ler(JANELA)) + '\n' + extra)

    aviso = ('<!-- ARQUIVO GERADO por montar-batch-plugin.py.\n'
             '     NÃO editar aqui: editar cora-plugin-batch.fonte.html e rodar o\n'
             '     script de novo, senão os dois desencontram na primeira mudança. -->\n')
    saida = aviso + saida

    io.open(SAIDA, 'w', encoding='utf-8', newline='').write(saida)
    print('regras do globals: %d' % len(globais))
    print('escrito:           %s (%.1f KB)' % (os.path.basename(SAIDA), len(saida) / 1024.0))


if __name__ == '__main__':
    main()
