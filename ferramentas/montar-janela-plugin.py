# -*- coding: utf-8 -*-
"""
Monta o artefato da janela do plugin a partir das folhas de produção.

    python montar-janela-plugin.py

Le  : cora-plugin-janela.fonte.html
      ../app/globals.css        (as regras que MEDEM)
      ../app/cora-pagina.css    (a folha escopada em `.co`, que PINTA)
      ../app/painel-pagina.css  (a máscara do logo)
      ../public/img/*.webp      (as fotos do feed)
Faz : cora-plugin-janela.html

POR QUE ASSIM
O artefato tem que ser o site, e não uma cópia do site desenhada de novo.
Copiar as regras à mão desencontra na primeira mudança do `/app`, e aí ninguém
sabe qual dos dois é o certo. Este script traz as folhas inteiras.

A ORDEM NÃO PODE INVERTER
`globals.css` antes de `cora-pagina.css`, igual ao `app/layout.js`: a folha
escopada em `.co` vence a global por especificidade, e é ela quem manda na cor.
Invertido, a janela sai com a peça certa e o desenho errado.

O QUE SAI DO GLOBALS
Só as regras cujo seletor fala de `.cr-*`, `.cmp*`, `.cora-dd-*`, `.am*`,
`.kel*`, `.sul*`, `.fic*` e `.pl-*`, que são as do painel e do feed. O resto do
molde do site não tem o que fazer dentro de uma janela do SketchUp.

Os `@media` saem inteiros: a janela tem largura fixa, e o responsivo do site
mediria a do navegador, que aqui não quer dizer nada.
"""

import base64
import io
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(AQUI)

FONTE = os.path.join(AQUI, 'cora-plugin-janela.fonte.html')
SAIDA = os.path.join(AQUI, 'cora-plugin-janela.html')

# Os seletores que interessam dentro do globals.
ALVO = re.compile(
    r'(^|[\s,>+~])\.(cr-|cmp\b|cmp__|cora-dd-|am\b|am__|am--|kel\b|kel__'
    r'|sul\b|sul__|fic\b|fic__|fic--|pl-sala|pl-luz|ta--curta'
    # o seletor de cor, o campo do @, o painel de filtros, as janelas
    r'|cor\b|cor__|cref\b|cref-|ft\b|ft-|ft__|cf\b|cf-|nm-|ps-b|dt\b|dt-'
    # a aba Editar e as duas telas de pincel
    r'|ed-|pn-'
    # e o visualizador, que e o `Visualizador.js` inteiro
    r'|vz\b|vz-)'
)

# A barra de rolagem e o `color-scheme` moram em seletores sem classe nenhuma.
# Sem eles, no tema escuro a barra sai branca no meio do painel preto.
GERAIS = re.compile(r'::-webkit-scrollbar|^:root(\[data-theme[^\]]*\])?$')

FOTOS = ['painel-escritorio.webp', 'painel-cozinha.webp',
         'painel-varanda.webp', 'painel-fachada.webp']


def sem_comentario(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def sem_arroba(css):
    """Tira `@media`, `@supports` e afins, com o bloco inteiro deles."""
    fora = []
    i, n = 0, len(css)
    while i < n:
        if css[i] == '@':
            abre = css.find('{', i)
            if abre < 0:
                break
            nivel, k = 0, abre
            while k < n:
                if css[k] == '{':
                    nivel += 1
                elif css[k] == '}':
                    nivel -= 1
                    if nivel == 0:
                        break
                k += 1
            i = k + 1
        else:
            prox = css.find('@', i)
            if prox < 0:
                fora.append(css[i:])
                break
            fora.append(css[i:prox])
            i = prox
    return ''.join(fora)


def peneirar_globals(css):
    css = sem_arroba(sem_comentario(css))
    regras = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        seletor = ' '.join(m.group(1).split())
        corpo = ' '.join(m.group(2).split())
        if not corpo:
            continue
        # `[data-tip]` e o `::after` dele sao genericos do globals, e sem eles
        # nenhum tooltip do trilho ou do feed tem texto.
        boas = [p.strip() for p in seletor.split(',')
                if ALVO.search(' ' + p.strip())
                or p.strip().startswith('[data-tip]')
                or GERAIS.search(p.strip())]
        if boas:
            regras.append(', '.join(boas) + '{' + corpo + '}')
    return regras


# ══════════════════════════════════════════════════════════════════════
#  O TAMANHO DO TEXTO
#
# As folhas de produção medem para uma tela de navegador, onde a coluna do
# formulário divide a página com o resto do painel. Dentro de uma janela do
# SketchUp a mesma coluna tem 400px encostados na barra do modelo, e o corpo
# de texto do site fica grande ali.
#
# Descer cada `font-size` à mão desencontraria da web na primeira mudança do
# `/app`. Então o tamanho é um botão só, apertado na hora de montar: todo
# `font-size` em px e os tokens `--t-*` descem juntos, e a proporção entre
# eles continua a mesma do site. O piso existe porque abaixo dele o texto
# para de ser legível na tela de 100%.
#
# Vale para o artefato e para o plugin: o `portar-janela.py` importa esta
# função daqui, e não tem uma cópia dela.
# ══════════════════════════════════════════════════════════════════════
FATOR = 0.9
PISO = 9.5


def _medida(px):
    n = max(PISO, round(px * FATOR, 1))
    return ('%.1f' % n).rstrip('0').rstrip('.') + 'px'


def encolher(css):
    css = re.sub(r'(font-size\s*:\s*)([\d.]+)px',
                 lambda m: m.group(1) + _medida(float(m.group(2))), css)
    css = re.sub(r'(--t-[a-z0-9-]+\s*:\s*)([\d.]+)px',
                 lambda m: m.group(1) + _medida(float(m.group(2))), css)
    return css


def ler(caminho):
    return io.open(caminho, encoding='utf-8').read()


def foto_uri(nome):
    caminho = os.path.join(SITE, 'public', 'img', nome)
    dados = base64.b64encode(open(caminho, 'rb').read()).decode('ascii')
    return "url('data:image/webp;base64," + dados + "')"


def main():
    fonte = ler(FONTE)

    globais = peneirar_globals(ler(os.path.join(SITE, 'app', 'globals.css')))
    cora = ler(os.path.join(SITE, 'app', 'cora-pagina.css'))
    globais = [encolher(r) for r in globais]
    cora = encolher(cora)

    # A marca é uma máscara PNG, e ela mora no painel-pagina.css.
    painel = ler(os.path.join(SITE, 'app', 'painel-pagina.css'))
    m = re.search(r"--marca:url\('(data:image/png;base64,[^']+)'\)", painel)
    if not m:
        raise SystemExit('não achei a --marca no painel-pagina.css')

    tokens = ['  --marca:url(\'' + m.group(1) + '\');']
    for i, nome in enumerate(FOTOS, start=1):
        tokens.append('  --foto%d:%s;' % (i, foto_uri(nome)))
    extra = '.jn{\n' + '\n'.join(tokens) + '\n}\n'

    saida = fonte
    saida = saida.replace('/*@GLOBAIS@*/', '\n'.join(globais))
    saida = saida.replace('/*@CORA@*/', cora + '\n' + extra)

    aviso = ('<!-- ARQUIVO GERADO por montar-janela-plugin.py.\n'
             '     NÃO editar aqui: editar cora-plugin-janela.fonte.html e rodar o\n'
             '     script de novo, senão os dois desencontram na primeira mudança. -->\n')
    saida = aviso + saida

    io.open(SAIDA, 'w', encoding='utf-8', newline='').write(saida)

    print('regras do globals: %d' % len(globais))
    print('cora-pagina.css:   %d bytes' % len(cora))
    print('escrito:           %s (%.1f KB)' % (os.path.basename(SAIDA), len(saida) / 1024.0))


if __name__ == '__main__':
    main()
