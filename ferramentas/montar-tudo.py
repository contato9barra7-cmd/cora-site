# -*- coding: utf-8 -*-
"""Refaz TODOS os artefatos e todas as folhas geradas, numa passada.

O PROBLEMA QUE ELE RESOLVE: as pecas do site sao ligadas umas nas outras. O
artefato do convite le o CSS das telas de conta, a grade animada e o motor do
LoginSplit; o do admin copia a casca do painel; a folha do painel sai do
artefato do painel. Mudar o login e deixar o resto parado nao quebra nada na
hora: so faz o artefato passar a mostrar uma tela que o produto nao tem mais, e
isso ninguem ve ate alguem decidir errado olhando ele.

    npm run artefatos

Roda na ordem certa: primeiro quem PRODUZ (o artefato do painel gera a folha do
painel), depois quem CONSOME (o admin copia a casca do painel ja pronta).

Nao toca no git nem publica: so refaz os arquivos. Publicar continua sendo uma
decisao de quem esta olhando.
"""
import io
import os
import subprocess
import sys

SCR = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(SCR)

# (o que roda, o que ele produz, por que nesta ordem)
PASSOS = [
    (['gerar-css-artefato.py', 'ferramentas/painel.html', 'app/painel-pagina.css', 'pn'],
     'app/painel-pagina.css',
     'a folha do painel sai do artefato do painel'),

    (['montar-admin.py'], 'ferramentas/admin.html',
     'o admin copia a casca do painel, entao vem depois dele'),
    (['gerar-css-artefato.py', 'ferramentas/admin.html', 'app/admin-pagina.css', 'ad'],
     'app/admin-pagina.css',
     'e a folha do admin sai do artefato que acabou de ser montado'),

    (['montar-convite.py'], 'ferramentas/convite.html',
     'le o CSS das telas de conta, a grade e o motor do LoginSplit'),
    (['montar-cancelar.py'], 'ferramentas/cancelar.html', ''),
    (['montar-comprovante.py'], 'ferramentas/comprovante-aceite.html', ''),
    (['montar-filtros.py'], 'ferramentas/filtros-admin.html', ''),
    (['montar-csv.py'], 'ferramentas/csv-admin.html', ''),
]


def rodar(passo):
    args, saida, porque = passo
    caminho = os.path.join(SCR, args[0])
    if not os.path.exists(caminho):
        return ('pulado', args[0], 'o script nao existe')
    r = subprocess.run([sys.executable, caminho] + args[1:], cwd=SITE,
                       capture_output=True, text=True)
    if r.returncode != 0:
        erro = (r.stderr or r.stdout).strip().split('\n')[-1]
        return ('FALHOU', args[0], erro[:120])
    alvo = os.path.join(SITE, saida)
    tam = os.path.getsize(alvo) / 1024.0 if os.path.exists(alvo) else 0
    return ('ok', args[0], '%s (%.0f KB)' % (saida, tam))


print('')
falhas = 0
for passo in PASSOS:
    estado, nome, detalhe = rodar(passo)
    if estado == 'FALHOU':
        falhas += 1
    print('  %-8s %-28s %s' % (estado, nome, detalhe))
    if passo[2]:
        print('           %s' % passo[2])

print('')
if falhas:
    print('  %d montador(es) falharam. Nada foi publicado.' % falhas)
    sys.exit(1)

print('  Tudo refeito. Publique os artefatos que mudaram.')
