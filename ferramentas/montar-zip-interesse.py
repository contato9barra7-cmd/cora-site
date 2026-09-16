"""Monta o zip da página de interesse para quem não tem acesso ao artefato
(William, Sobe). Abre direto do disco: a fonte vai embutida, porque o Chrome
recusa @font-face vindo de file://, e obrigado.html abre a segunda tela.

    python ferramentas/montar-zip-interesse.py

As imagens moram em ferramentas/scratchpad/lista (ignorada pelo git), e o zip
sai na área de trabalho do dono.
"""
import base64, os, shutil, tempfile, zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))

CORA = os.path.dirname(AQUI)
ORIGEM = CORA + '/ferramentas/cora-interesse.html'
ASSETS = os.path.join(AQUI, 'scratchpad', 'lista')
SAIDA = os.path.join(tempfile.gettempdir(), 'cora-pacote-interesse')
PASTA = 'cora-pagina-de-interesse'
ZIP = os.path.join(os.path.expanduser('~'), 'Desktop', 'Cora Render - Página de Interesse.zip')

raiz = os.path.join(SAIDA, PASTA)
if os.path.exists(SAIDA):
    shutil.rmtree(SAIDA)
os.makedirs(raiz)

s = open(ORIGEM, encoding='utf8').read()

# Fonte embutida: aberto do disco, o Chrome recusa @font-face vindo de file://
for nome in ('DMSans-latin.woff2', 'DMSans-latin-ext.woff2'):
    dados = base64.b64encode(open(os.path.join(CORA, 'public/fontes', nome), 'rb').read()).decode()
    alvo = "url('fontes/%s')" % nome
    assert s.count(alvo) == 1, alvo
    s = s.replace(alvo, "url(data:font/woff2;base64,%s)" % dados)

# Documento completo: cabeça com título e folhas, corpo com as telas
corte = s.index('<!-- ======================================================================\n     TELA 1')
cabeca, corpo = s[:corte], s[corte:]
html = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + cabeca + '</head>\n<body>\n' + corpo + '</body>\n</html>\n')
open(os.path.join(raiz, 'index.html'), 'w', encoding='utf8', newline='\n').write(html)

# Atalho para a página de obrigado
open(os.path.join(raiz, 'obrigado.html'), 'w', encoding='utf8', newline='\n').write(
    '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
    '<title>Obrigado · Lista do Cora Render</title>\n'
    '<meta http-equiv="refresh" content="0; url=index.html#obrigado">\n</head>\n'
    '<body><a href="index.html#obrigado">Abrir a página de obrigado</a></body>\n</html>\n')

# Imagens e vídeo
usados = ['img/logo-cora.png']
for pasta in ('home', 'onde', 'obrigado', 'obrigado/g'):
    for f in sorted(os.listdir(os.path.join(ASSETS, pasta))):
        caminho = pasta + '/' + f
        if os.path.isfile(os.path.join(ASSETS, caminho)):
            usados.append(caminho)
faltando = [u for u in usados if u.split('/')[-1] not in html and not u.startswith('obrigado/')]
assert not faltando, faltando
for u in usados:
    d = os.path.join(raiz, u)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    shutil.copy2(os.path.join(ASSETS, u), d)

leia = """Página de interesse do Cora Render (pré-lançamento)

COMO ABRIR
1. Descompacte a pasta inteira. Aberto de dentro do zip, as imagens não aparecem.
2. Abra o index.html no Chrome, no Edge ou no Safari.

AS DUAS PÁGINAS
A barra preta no pé da tela troca entre a página de interesse e a página de obrigado.
Preenchendo o formulário e clicando em "Entrar na lista", a página de obrigado também abre.
Para abrir direto na página de obrigado, use o obrigado.html.

É UM PROTÓTIPO
Nada do formulário é enviado.
O botão do grupo do WhatsApp ainda não tem o link do grupo.
Os links de Termos e de Política de Privacidade ainda não levam a lugar nenhum.

Setembro de 2026 · 9barra7
"""
open(os.path.join(raiz, 'LEIA-ME.txt'), 'w', encoding='utf-8-sig', newline='\r\n').write(leia)

if os.path.exists(ZIP):
    os.remove(ZIP)
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for pasta, _, arquivos in os.walk(raiz):
        for a in sorted(arquivos):
            cheio = os.path.join(pasta, a)
            z.write(cheio, os.path.relpath(cheio, SAIDA).replace('\\', '/'))
print('arquivos:', sum(len(f) for _, _, f in os.walk(raiz)))
print('zip:', round(os.path.getsize(ZIP) / 1024 / 1024, 1), 'MB ->', ZIP)
