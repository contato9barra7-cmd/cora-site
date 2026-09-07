# -*- coding: utf-8 -*-
"""Escreve app/precos-pagina.css a partir do <style> do precos.html aprovado.

A mesma tatica que funcionou nas telas de conta: em vez de discutir com as
doze mil linhas do globals.css, o desenho aprovado entra inteiro, escopado
numa classe. Tudo aqui depende de `.pr`, entao nada vaza pro resto do site e
nada do resto do site precisa ser apagado.

Duas coisas mudam na copia:

1. O bloco `:root` do artefato vira `.pr`. Se ele entrasse como `:root` de
   verdade, redefiniria `--wash`, `--rc` e companhia pro site todo, e essas
   variaveis ja existem no globals com outro valor.

2. Todo seletor ganha o prefixo `.pr `. Um seletor com prefixo tem
   especificidade maior que o mesmo seletor sem, entao ele ganha do molde
   antigo sem precisar de `!important` e sem apagar nada.

O que NAO vem: `@font-face`, porque a fonte ja e servida pelo site, as regras
de `body`/`html`, que sao do documento e nao da pagina, e a seta de voltar ao
topo mais o aviso de cookies, que no site sao componentes com estilo proprio.
Deixar os dois entrarem daria duas fontes de verdade pra mesma peca.
"""
import io, os, re, sys

# uso: python gerar-css-artefato.py <artefato.html> <destino.css> <escopo>
#   escopo e a classe da pagina, sem o ponto. Ex.: pr, hm
if len(sys.argv) != 4:
    print(__doc__); sys.exit(2)
ORIGEM, DESTINO, ESCOPO = sys.argv[1], sys.argv[2], "." + sys.argv[3]

bruto = io.open(ORIGEM, encoding="utf-8").read()
m = re.search(r"<style>(.*?)</style>", bruto, re.S)
if not m:
    print("nao achei o <style> do artefato"); sys.exit(1)
css = m.group(1)

# ── as regras que nao atravessam ──
# body e html sao do documento; o reset do site ja cuida deles.
FORA = ("body", "html", "*", "::selection", ":focus-visible", "img", "svg",
        "button", "input", "a", "h1", "h2", "h3", "h4", "p", "ul", "ol", "li",
        "table", "th", "td", "figure", "blockquote", "code")


# `overflow` de `body`/`html` NAO desce pro embrulho da pagina.
#
# No artefato o `overflow-x:hidden` mora no body, e ali ele so impede rolagem
# lateral. Virando `.hm`/`.pr`, ele transforma o embrulho num CONTENTOR DE
# ROLAGEM, e ai o `position:sticky` do cabecalho passa a grudar no embrulho em
# vez de grudar na janela. Resultado: o cabecalho para de acompanhar a rolagem
# e some no topo. O site ja cuida da rolagem lateral no proprio body.
veio_do_documento = False


def sem_overflow(corpo):
    return re.sub(r"\s*overflow[a-z-]*\s*:[^;}]+;?", "", corpo)


def prefixar(seletor):
    """`.plano` vira `.pr .plano`. `:root` vira `.pr`. Um seletor de elemento
    solto (`p`, `h2`) tambem ganha o prefixo, senao ele pegaria a pagina toda
    quando o CSS entrasse no site."""
    partes = []
    for s in seletor.split(","):
        s = s.strip()
        if not s:
            continue
        if s in (":root", "html", "body"):
            partes.append(ESCOPO)
            global veio_do_documento
            veio_do_documento = True
        elif s.startswith("@") or s.startswith("from") or s.startswith("to") or re.match(r"^\d+%$", s):
            partes.append(s)
        elif s.startswith(ESCOPO):
            partes.append(s)
        else:
            partes.append(ESCOPO + " " + s)
    return ", ".join(partes)


# ── o percurso ──
# A primeira versao pegava "tudo antes da proxima chave" como seletor. Isso
# quebra dentro de @media: a chave de FECHAMENTO da regra interna entrava no
# seletor seguinte, e o fecho do proprio @media virava um seletor chamado "}".
# Aqui o percurso anda caractere a caractere e so trata como seletor o que vem
# depois de um fecho de bloco, o que resolve os dois casos.
saida = []
i, n = 0, len(css)
cabeca = []            # o seletor sendo montado
pilha = []             # o que cada nivel aberto e: "arroba" ou "regra"

while i < n:
    c = css[i]

    if css.startswith("/*", i):
        j = css.find("*/", i + 2)
        j = n if j < 0 else j + 2
        saida.append(css[i:j])
        i = j
        continue

    if c == "{":
        bruto = "".join(cabeca)
        limpo = bruto.strip()
        cabeca = []
        if limpo.startswith("@"):
            if limpo.startswith("@font-face"):
                # pula o bloco inteiro: a fonte ja e servida pelo site
                prof, i = 1, i + 1
                while i < n and prof:
                    if css[i] == "{": prof += 1
                    elif css[i] == "}": prof -= 1
                    i += 1
                continue
            if limpo.startswith("@keyframes"):
                # dentro de keyframes os seletores sao 0%/100%: passa inteiro
                ini_kf, prof, i = i, 1, i + 1
                while i < n and prof:
                    if css[i] == "{": prof += 1
                    elif css[i] == "}": prof -= 1
                    i += 1
                saida.append(bruto + css[ini_kf:i])
                continue
            saida.append(bruto + "{")
            pilha.append("arroba")
        else:
            pula = ("ao-topo" in limpo) or ("cookie" in limpo)
            if pula:
                prof, i = 1, i + 1
                while i < n and prof:
                    if css[i] == "{": prof += 1
                    elif css[i] == "}": prof -= 1
                    i += 1
                continue
            veio_do_documento = False
            cabecalho_pronto = prefixar(bruto)
            saida.append(cabecalho_pronto + "{")
            pilha.append("regra-documento" if veio_do_documento else "regra")
        i += 1
        continue

    if c == "}":
        resto = "".join(cabeca).strip()
        if resto:
            bloco = "".join(cabeca)
            if pilha and pilha[-1] == "regra-documento":
                bloco = sem_overflow(bloco)
            saida.append(bloco)
        cabeca = []
        saida.append("}")
        if pilha:
            pilha.pop()
        i += 1
        continue

    cabeca.append(c)
    i += 1

if "".join(cabeca).strip():
    saida.append("".join(cabeca))

texto = "".join(saida)
import re as _re
texto = _re.sub(r"@media[^{]*\{\s*\}", "", texto)

CABECA = u"""/* ============================================================================
   PAGINA DO ARTEFATO, ESCOPADA

   Gerado por gerar-css-artefato.py a partir do <style> do artefato, que e o
   desenho aprovado. NAO editar aqui: editar o artefato e rodar o script de
   novo, senao os dois desencontram na primeira mudanca.

   Tudo depende da classe da pagina. Isso resolve dois problemas de
   uma vez: o desenho aprovado ganha do molde antigo por especificidade, sem
   `!important`, e nada dele vaza pras outras telas do site.

   O bloco de variaveis do artefato virou essa classe em vez de `:root` de
   proposito: ele redefine `--wash`, `--rc` e outras que ja existem no
   globals com outro valor, e como `:root` isso mudaria o site inteiro.
   ========================================================================= */

"""

# ── a fonte em tamanho nominal ──
# A DM Sans do site vai com `size-adjust:88%`, herdado do plugin. No site isso
# encolhe TODO texto em 12%, e e por isso que a pagina nao fecha com o
# artefato: os corpos batem no CSS e nao na tela. `size-adjust` e descritor de
# @font-face, nao propriedade, entao nao da pra desligar por seletor: a saida
# e uma familia irma, mesmo arquivo, sem o ajuste, usada so dentro de `.pr`.
# A mesma solucao ja esta em telas-de-conta.css.
FONTE = u"""
/* ── a fonte, em tamanho nominal ──
   Ver a nota no gerador: o site serve a DM Sans com size-adjust de 88%, o que
   encolhe todo texto em 12% e faz a pagina nunca fechar com o artefato. Como
   size-adjust e descritor de @font-face, a unica saida e uma familia irma,
   mesmo arquivo, sem o ajuste, usada so aqui dentro. */
@font-face{
  font-family:'DM Sans TC';
  src:url('/fontes/DMSans-latin.woff2') format('woff2');
  font-weight:100 1000; font-style:normal; font-display:swap;
  unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face{
  font-family:'DM Sans TC';
  src:url('/fontes/DMSans-latin-ext.woff2') format('woff2');
  font-weight:100 1000; font-style:normal; font-display:swap;
  unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@ESC@, @ESC@ *{
  font-family:'DM Sans TC','DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
}
""".replace("@ESC@", ESCOPO)

io.open(DESTINO, "w", encoding="utf-8", newline="\n").write(CABECA + texto.strip() + "\n" + FONTE)
print("precos-pagina.css: %.1f KB" % (os.path.getsize(DESTINO) / 1024.0))

# conferencia: nenhum seletor solto que possa vazar
solto = [l for l in io.open(DESTINO, encoding="utf-8").read().split("\n")
         if re.match(r"^[.#a-zA-Z\[][^{@}]*\{", l) and ESCOPO not in l.split("{")[0]]
print("seletores sem escopo:", len(solto))
for s in solto[:8]:
    print("   " + s[:80])
