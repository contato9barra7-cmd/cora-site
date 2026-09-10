# -*- coding: utf-8 -*-
"""
Monta o artefato de UMA aba do plugin, a partir das folhas de produção.

    python montar-aba-plugin.py batch
    python montar-aba-plugin.py editar

Le  : cora-plugin-<aba>.fonte.html
      cora-plugin-janela.fonte.html   (a moldura `.jn`, para não ter duas)
      ../app/globals.css, cora-pagina.css, painel-pagina.css
      ../public/img/*.webp
Faz : cora-plugin-<aba>.html

POR QUE ASSIM
Mesma regra da janela: o artefato tem que ser o site, e não uma cópia do
site desenhada de novo. Este script chama o MESMO peneirador e o MESMO
botão de tamanho do `montar-janela-plugin.py`, e recorta a moldura do fonte
da janela em vez de guardar uma segunda cópia dela.

E é UM script para todas as abas, e não um por aba: são onze, e onze cópias
do mesmo arquivo desencontram na primeira correção.
"""

import base64
import importlib.util
import io
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(AQUI)

JANELA = os.path.join(AQUI, 'cora-plugin-janela.fonte.html')
GERADOR = os.path.join(AQUI, 'montar-janela-plugin.py')

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
    return re.sub(r'\.jn \.foto\.(f\d|ref-[ab])\{[^}]*\}\n?', u'', fonte[ini:fim])


def foto_uri(nome):
    caminho = os.path.join(SITE, 'public', 'img', nome)
    dados = base64.b64encode(open(caminho, 'rb').read()).decode('ascii')
    return "url('data:image/webp;base64," + dados + "')"


def montar(aba):
    fonte_p = os.path.join(AQUI, 'cora-plugin-%s.fonte.html' % aba)
    saida_p = os.path.join(AQUI, 'cora-plugin-%s.html' % aba)
    if not os.path.exists(fonte_p):
        raise SystemExit(u'não achei o fonte: %s' % os.path.basename(fonte_p))

    mod = gerador()
    globais = [mod.encolher(r) for r in
               mod.peneirar_globals(ler(os.path.join(SITE, 'app', 'globals.css')))]
    cora = mod.encolher(ler(os.path.join(SITE, 'app', 'cora-pagina.css')))

    painel = ler(os.path.join(SITE, 'app', 'painel-pagina.css'))
    m = re.search(r"--marca:url\('(data:image/png;base64,[^']+)'\)", painel)
    if not m:
        raise SystemExit('não achei a --marca no painel-pagina.css')

    # Aqui a moldura não é um `.jn` que envolve tudo: cada quadro é um pedaço
    # solto da janela. Os tokens sobem para o `:root`.
    tokens = ["  --marca:url('" + m.group(1) + "');"]
    for i, nome in enumerate(FOTOS, start=1):
        tokens.append('  --foto%d:%s;' % (i, foto_uri(nome)))
    extra = ':root{\n' + '\n'.join(tokens) + '\n}\n'

    saida = ler(fonte_p)
    saida = saida.replace('/*@GLOBAIS@*/', '\n'.join(globais))
    saida = saida.replace('/*@CORA@*/', cora + '\n' + moldura(ler(JANELA)) + '\n' + extra)
    saida = ('<!-- ARQUIVO GERADO por montar-aba-plugin.py %s.\n'
             '     NÃO editar aqui: editar cora-plugin-%s.fonte.html e rodar o\n'
             '     script de novo, senão os dois desencontram na primeira mudança. -->\n'
             % (aba, aba)) + saida

    io.open(saida_p, 'w', encoding='utf-8', newline='').write(saida)
    print('regras do globals: %d' % len(globais))
    print('escrito:           %s (%.1f KB)' % (os.path.basename(saida_p), len(saida) / 1024.0))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('uso: python montar-aba-plugin.py <aba>   (ex.: batch, editar)')
    montar(sys.argv[1])
