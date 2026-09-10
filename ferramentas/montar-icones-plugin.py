# -*- coding: utf-8 -*-
"""
Monta o artefato dos icones da barra do SketchUp.

    python montar-icones-plugin.py

Le  : cora-plugin-icones.fonte.html          (o molde)
      glifos-plugin.py                       (os 23 desenhos refeitos)
      ../../cora-plugin/src/ui/icons/*.png   (os que estao na barra HOJE)
      ../../cora-plugin/icon@2x.png          (a marca, vira mascara)
      o icone 3D do rebranding, se estiver no disco
Faz : cora-plugin-icones.html

POR QUE OS PNGS DE HOJE ENTRAM
Porque o pedido e refinar, e nao trocar. Sem o de hoje ao lado nao da para
julgar se o refeito continua sendo o mesmo desenho.

O TRACO VEM POR VARIAVEL
Cada `<symbol>` pinta com `var(--tinta)`. Seletor descendente nao atravessa a
fronteira do `<use>`, propriedade personalizada atravessa, porque ela herda.
"""

import base64
import importlib.util
import io
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(AQUI)
RAIZ = os.path.dirname(SITE)

FONTE = os.path.join(AQUI, 'cora-plugin-icones.fonte.html')
SAIDA = os.path.join(AQUI, 'cora-plugin-icones.html')
GLIFOS = os.path.join(AQUI, 'glifos-plugin.py')

ICONES_HOJE = os.path.join(RAIZ, 'cora-plugin', 'src', 'ui', 'icons')
# A SILHUETA, e nao o `icon@2x.png`: desde que o icone virou pastilha, o
# arquivo dele nao serve mais de mascara (mascarar por ele daria um
# quadrado). A silhueta e o que sobrou da marca original.
MARCA = os.path.join(RAIZ, 'cora-plugin', 'marca-9barra7.png')
PELOS = os.path.join('D:' + os.sep, 'Escritório', 'Identidade Visual',
                     '#Rebranding 2026', 'Ícones 3D e Texturas',
                     '9BARRA7_ICONE_3D_008.png')

# O traco e o mesmo nos 23. Quem quiser mudar muda aqui, e muda em todos.
TRACO = ('fill:none;stroke:var(--tinta,#2B2B2B);stroke-width:1.5;'
         'stroke-linecap:round;stroke-linejoin:round')


def carregar_glifos():
    spec = importlib.util.spec_from_file_location('glifos', GLIFOS)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.GLIFOS


def uri_png(caminho):
    return 'data:image/png;base64,' + base64.b64encode(open(caminho, 'rb').read()).decode('ascii')


def pelos_uri(caminho, lado=160):
    from PIL import Image
    im = Image.open(caminho).convert('RGBA')
    cx = im.getbbox()
    if cx:
        im = im.crop(cx)
    l = max(im.size)
    q = Image.new('RGBA', (l, l), (0, 0, 0, 0))
    q.paste(im, ((l - im.size[0]) // 2, (l - im.size[1]) // 2))
    q = q.resize((lado, lado), Image.LANCZOS)
    b = io.BytesIO()
    q.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode('ascii')


def main():
    molde = io.open(FONTE, encoding='utf-8').read()
    glifos = carregar_glifos()

    simbolos = ['<svg width="0" height="0" style="position:absolute" aria-hidden="true">']
    dados = []
    faltando = []
    for gid, fam, nome, corpo, nota in glifos:
        simbolos.append('  <symbol id="g-%s" viewBox="0 0 24 24"><g style="%s">%s</g></symbol>'
                        % (gid, TRACO, corpo))
        png = os.path.join(ICONES_HOJE, 'cora_%s.png' % gid)
        if os.path.exists(png):
            antes = uri_png(png)
        else:
            antes = ''
            faltando.append(gid)
        dados.append({'id': gid, 'fam': fam, 'nome': nome, 'nota': nota, 'antes': antes})
    simbolos.append('</svg>')

    marca = uri_png(MARCA)
    try:
        pelos = pelos_uri(PELOS)
        nota_pelos = 'com o ícone 3D'
    except Exception as e:
        pelos = 'none'
        nota_pelos = 'SEM o ícone 3D (%s)' % type(e).__name__

    tokens = ":root{\n  --marca9:url('%s');\n  --pelos:url('%s');\n}" % (marca, pelos)

    saida = molde
    saida = saida.replace('/*@TOKENS@*/', tokens)
    saida = saida.replace('/*@SIMBOLOS@*/', '\n'.join(simbolos))
    saida = saida.replace('/*@DADOS@*/', json.dumps(dados, ensure_ascii=False))

    aviso = ('<!-- ARQUIVO GERADO por montar-icones-plugin.py.\n'
             '     NÃO editar aqui: os desenhos moram em glifos-plugin.py e o molde em\n'
             '     cora-plugin-icones.fonte.html. -->\n')
    io.open(SAIDA, 'w', encoding='utf-8', newline='').write(aviso + saida)

    print('desenhos: %d' % len(glifos))
    if faltando:
        print('sem PNG de hoje: %s' % ', '.join(faltando))
    print('pelos:    %s' % nota_pelos)
    print('escrito:  %s (%.1f KB)' % (os.path.basename(SAIDA), (len(saida) + len(aviso)) / 1024.0))


if __name__ == '__main__':
    main()
