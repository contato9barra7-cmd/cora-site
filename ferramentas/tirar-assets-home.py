# -*- coding: utf-8 -*-
"""Tira os 9,4 MB de base64 de dentro do index.html e poe em /public.

O artefato da home tem 9,66 MB, e 98% disso e data: URI: um video de 3,96 MB
no hero, 2,77 MB de imagem e a fonte embutida. Isso funciona num arquivo
solto, que abre direto do disco, mas nao serve pra pagina publicada: o
navegador teria que baixar tudo antes de pintar a primeira linha, e nada
disso entra em cache separado nem e reaproveitado entre paginas.

Fora do HTML, cada arquivo vira um pedido proprio, com cache proprio, e o
video pode ate ser buscado sob demanda.

A fonte NAO sai pra /public: o site ja serve a DM Sans, e um segundo arquivo
da mesma fonte so faria peso.

Saidas:
  cora-site/public/home/*            os arquivos
  scratchpad/home-limpa.html         o HTML apontando pra eles
"""
import base64, hashlib, io, os, re, shutil, sys

RAIZ = "Z:/Meus Arquivos/9barra7 Academy/Cora Render/Visual Studio Code/"
ORIGEM = RAIZ + "cora-render-site-william/index.html"
PUB = RAIZ + "cora-site/public/home"
SCR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scratchpad")

EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
       "image/gif": "gif", "video/mp4": "mp4", "font/woff2": "woff2",
       "image/svg+xml": "svg"}

os.makedirs(PUB, exist_ok=True)
# A pasta de rascunho nao vem no repositorio, entao ela nasce aqui. Sem isto o
# script fazia todo o trabalho e morria na ultima linha, na hora de escrever.
os.makedirs(SCR, exist_ok=True)
html = io.open(ORIGEM, encoding="utf-8").read()
print("entrada: %.2f MB" % (len(html.encode("utf-8")) / 1048576.0))

vistos, salvos, pulados = {}, [], 0


def guardar(m):
    global pulados
    tipo, dados = m.group(1), m.group(2)
    if tipo not in EXT:
        return m.group(0)
    if tipo == "font/woff2":
        # o site ja serve a DM Sans; um segundo arquivo igual so pesa
        pulados_local = 1
        return m.group(0)
    bruto = base64.b64decode(dados)
    # o mesmo arquivo aparece mais de uma vez (o logo, por exemplo): guarda um so
    chave = hashlib.sha1(bruto).hexdigest()[:10]
    if chave in vistos:
        return vistos[chave]
    nome = "%s.%s" % (chave, EXT[tipo])
    with open(os.path.join(PUB, nome), "wb") as f:
        f.write(bruto)
    caminho = "/home/" + nome
    vistos[chave] = caminho
    salvos.append((nome, len(bruto)))
    return caminho


html = re.sub(r"data:([a-z]+/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)", guardar, html)

# a fonte embutida sai junto com o @font-face que a usa: o site ja tem a dela
antes = len(html)
html = re.sub(r"@font-face\s*\{[^}]*data:font/woff2[^}]*\}", "", html)
print("@font-face embutido removido: %d bytes" % (antes - len(html)))

# ── os arquivos que ja eram soltos ──
esteira_de = RAIZ + "cora-render-site-william/imagens/esteira"
esteira_pra = os.path.join(PUB, "esteira")
if os.path.isdir(esteira_de):
    if os.path.isdir(esteira_pra):
        shutil.rmtree(esteira_pra)
    shutil.copytree(esteira_de, esteira_pra)
    n = len(os.listdir(esteira_pra))
    peso = sum(os.path.getsize(os.path.join(esteira_pra, f)) for f in os.listdir(esteira_pra))
    print("esteira: %d arquivos, %.1f MB" % (n, peso / 1048576.0))
html = html.replace("imagens/esteira/", "/home/esteira/")

trezentos = RAIZ + "cora-render-site-william/360-sala-03.jpg"
if os.path.isfile(trezentos):
    shutil.copy2(trezentos, os.path.join(PUB, "360-sala-03.jpg"))
    print("360-sala-03.jpg: %.0f KB" % (os.path.getsize(trezentos) / 1024.0))
html = re.sub(r'(["\'(])360-sala-03\.jpg', r'\1/home/360-sala-03.jpg', html)

io.open(os.path.join(SCR, "home-limpa.html"), "w", encoding="utf-8", newline="\n").write(html)

print()
print("arquivos extraidos do base64: %d" % len(salvos))
for nome, tam in sorted(salvos, key=lambda x: -x[1])[:6]:
    print("   %-22s %.2f MB" % (nome, tam / 1048576.0))
print()
print("saida: %.2f MB de HTML  (era %.2f MB)"
      % (len(html.encode("utf-8")) / 1048576.0,
         os.path.getsize(ORIGEM) / 1048576.0))
sobrou = len(re.findall(r"data:[a-z]+/[a-z0-9.+-]+;base64", html))
print("data: URI restante no HTML:", sobrou)
