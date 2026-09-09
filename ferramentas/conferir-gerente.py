# -*- coding: utf-8 -*-
"""Confere as tres camadas de cada rota liberada ao gerente.

   1. esta na ROTAS_DO_GERENTE (cora-auth)
   2. a rota e declarada COM authAdmin, que e o guarda que le a tabela
   3. existe funcao no site que chama esse caminho, e alguma tela usa a funcao

   Estar na lista nao basta: em 09/09 as quatro auditorias estavam na tabela,
   guardadas por outro porteiro, e nada disso funcionava.
"""
import io
import os
import re

# Este script mora em cora-site/ferramentas/, e le os TRES repositorios. Sobe
# tres niveis para achar a pasta que tem os quatro lado a lado.
BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

AUTH = io.open(os.path.join(BASE, 'cora-auth', 'index.js'),
               encoding='utf-8', errors='replace').read()
LIB = io.open(os.path.join(BASE, 'cora-site', 'lib', 'auth.js'),
              encoding='utf-8', errors='replace').read()

# ── 1. a tabela ────────────────────────────────────────────────────────────
i = AUTH.index('const ROTAS_DO_GERENTE = new Set([')
j = AUTH.index(']);', i)
tabela = re.findall(r"'([A-Z]+ /admin/[^']*)'", AUTH[i:j])

# ── 2. o guarda de cada rota declarada ─────────────────────────────────────
guarda = {}
for m in re.finditer(r"app\.(get|post|patch|delete)\('(/admin/[^']*)',\s*([A-Za-z_$][\w$]*)",
                     AUTH):
    guarda[m.group(1).upper() + ' ' + m.group(2)] = m.group(3)

# ── 3. quem no site chama cada caminho ─────────────────────────────────────
def pedacos(caminho):
    """Os trechos fixos do caminho, sem os parametros.

    Casar o caminho inteiro por expressao regular ja me deu um relatorio
    inteiro errado: o `re.escape` do Python 3.7+ nao poe barra antes de ':',
    e o padrao nao casava com nada. Comparar os pedacos fixos e mais burro e
    nao tem esse jeito de quebrar.
    """
    return [t for t in re.split(r':[A-Za-z]+', caminho) if t]

funcoes = {}
for m in re.finditer(r'export async function (\w+)\([^)]*\)\s*\{(.*?)\n\}', LIB, re.S):
    nome, corpo = m.group(1), m.group(2)
    for k in tabela:
        cam = k.split(' ', 1)[1]
        if all(t in corpo for t in pedacos(cam)):
            funcoes.setdefault(k, []).append(nome)

def sem_imports(txt):
    """O arquivo sem os `import`, inclusive os que ocupam varias linhas.

    Importar nao e usar. Este conferidor ja me deu um verde falso por causa
    disso: sabotei a unica chamada de `adminAuditoriaConsistencia` na ficha e
    ele nao reclamou, porque o nome continuava na linha do meio de um import
    quebrado em tres. Filtrar 'linha que comeca com import' nao alcanca a
    linha do meio. Corta-se o bloco inteiro, e nao a linha.
    """
    return re.sub(r'import\s[^;]*?;', ' ', txt, flags=re.S)

TELAS = {}
for pedaco in ['app', 'components']:
    for pasta, _, arqs in os.walk(os.path.join(BASE, 'cora-site', pedaco)):
        if 'node_modules' in pasta:
            continue
        for a in arqs:
            if not a.endswith('.js'):
                continue
            cam = os.path.join(pasta, a)
            TELAS[cam] = sem_imports(
                io.open(cam, encoding='utf-8', errors='replace').read())

def apelido(caminho):
    partes = caminho.replace(os.sep, '/').split('/')
    if 'components' in partes:
        return partes[-1]
    return '/'.join(partes[-3:-1])

def quem_usa(fn):
    """Onde a funcao e USADA, e nao so onde ela e chamada com parenteses.

    Procurar por `nome(` me deu um falso alarme: o EmailAssinantes guarda a
    funcao numa variavel antes (`const fn = adminContarPublicos`), e o
    relatorio disse que ninguem chamava a rota. O texto que chega aqui ja vem
    sem os imports, por `sem_imports`.
    """
    achados = [cam for cam, txt in TELAS.items()
               if re.search(r'\b' + fn + r'\b', txt)]
    return sorted(set(apelido(c) for c in achados))

# Rotas que estao na tabela DE PROPOSITO sem tela. Cada uma com o motivo, e o
# motivo tem que continuar verdade. Sem esta lista o relatorio choraria toda
# vez e ninguem mais leria.
SEM_TELA_DE_PROPOSITO = {
    'GET /admin/auditoria/extrato':
        'a aba Extrato da ficha mostra a mesma tabela `transacoes` com mais: '
        'o pareamento debito<->estorno e o desfecho do pedido',
}

print('')
print('%-46s %-11s %s' % ('ROTA', 'GUARDA', 'QUEM CHAMA NO SITE'))
print('-' * 110)
falhas = []
for k in tabela:
    g = guarda.get(k, 'NAO DECLARADA')
    fns = funcoes.get(k, [])
    usos = sorted(set(sum([quem_usa(f) for f in fns], [])))
    marca = ''
    if g != 'authAdmin':
        marca += '  <<< GUARDA ERRADO'
    if not usos:
        if k in SEM_TELA_DE_PROPOSITO:
            marca += '  (sem tela de proposito)'
        else:
            marca += '  <<< SEM TELA'
    if '<<<' in marca:
        falhas.append(k + marca)
    print('%-46s %-11s %s%s' % (k, g, ', '.join(usos) or '(nenhuma)', marca))

# ── A aba Imagens nao mora nesta tabela ────────────────────────────────────
# Ela e do cora-render-server, guardada pelo `exigirPainel`, que faz a propria
# consulta ao banco. Fica aqui porque foi decidida junto com o resto, e uma
# conferencia que ignora a unica rota de outro servidor nao confere o combinado.
REND = io.open(os.path.join(BASE, 'cora-render-server', 'index.js'),
               encoding='utf-8', errors='replace').read()
print('')
imagens_ok = ("app.get('/admin/geracoes/:contaId', exigirLogin, exigirPainel" in REND
              and "r.rows[0].gerente === true) return next()" in REND)
chama = quem_usa('adminGeracoesDaConta')
print('%-46s %-11s %s%s' % ('GET /admin/geracoes/:contaId (render-server)',
                            'exigirPainel', ', '.join(chama) or '(nenhuma)',
                            '' if (imagens_ok and chama) else '  <<< CONFERIR'))
if not (imagens_ok and chama):
    falhas.append('GET /admin/geracoes/:contaId  <<< CONFERIR')

print('')
print('%d rotas na tabela, mais a das imagens' % len(tabela))
if falhas:
    print('')
    print('PRECISAM DE OLHO:')
    for f in falhas:
        print('  ' + f)
    raise SystemExit(1)
print('todas com o guarda certo e com tela que chama')
for k, porque in SEM_TELA_DE_PROPOSITO.items():
    print('sem tela, e combinado: %s' % k)
    print('    %s' % porque)
