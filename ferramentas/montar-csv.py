# -*- coding: utf-8 -*-
"""Monta ferramentas/csv-admin.html e os cinco CSV de exemplo.

Os cinco arquivos que o botao Exportar do admin gera, com as colunas de
verdade lidas do proprio codigo. O artefato mostra cada um como planilha, e
os `.csv` ao lado abrem no Excel de verdade.

Rodar de dentro de cora-site:  python ferramentas/montar-csv.py
"""
import io
import os
import re


def pedaco_dd(painel):
    i = painel.index('.dd{ position:relative')
    j = painel.index('.demo-dd{', i)
    return chr(10) + chr(10) + painel[i:j].rstrip()


painel = io.open('ferramentas/painel.html', encoding='utf-8').read()
m = re.search(r"<style>(.*?)</style>", painel, re.S)
assert m, 'nao achei o <style> do painel'
css_painel = m.group(1) + pedaco_dd(painel)

# ═══════════════════════════════════════════════════════════════════════════
#  OS CINCO ARQUIVOS
#
#  As colunas sao as de app/admin/page.js. Se uma mudar la, muda aqui: este
#  arquivo e o MODELO, e modelo que mente e pior que modelo nenhum.
# ═══════════════════════════════════════════════════════════════════════════
ARQUIVOS = [
    dict(
        id='fiscais',
        nome='cora-assinantes-fiscais-2026-09-07.csv',
        titulo='Assinantes, fiscal',
        oque='Quem paga, com o documento e o endereço que a contabilidade pede. '
             'Sai só quem tem plano ativo.',
        cols=['Nome', 'Email', 'CPF / ID', 'Telefone', 'CEP', 'Endereço', 'Cidade',
              'Estado', 'País', 'Plano', 'Assentos', 'Assinou em', 'Renova em',
              'Renovações', 'Valor (R$)'],
        linhas=[
            ['Marilia Fischer', 'marilia@corarender.com', '000.000.000-00',
             '(11) 90000-0000', '01310-100', 'Av. Paulista, 1000', 'São Paulo', 'SP',
             'BR', 'pro', '', '24/01/2026', '24/09/2026', '7', '197,00'],
            ['Estúdio Norte', 'contato@estudionorte.com.br', '00.000.000/0001-00',
             '(41) 90000-0000', '80010-010', 'R. XV de Novembro, 200', 'Curitiba', 'PR',
             'BR', 'studio', '5', '11/03/2026', '11/09/2026', '6', '497,00'],
            ['Joana Reis', 'joana@arquitetura.com', '000.000.000-00',
             '(21) 90000-0000', '22011-000', 'R. Barata Ribeiro, 50', 'Rio de Janeiro',
             'RJ', 'BR', 'starter', '', '02/03/2026', '02/10/2026', '6', '97,00'],
        ],
    ),
    dict(
        id='recargas',
        nome='cora-recargas-fiscais-2026-09-07.csv',
        titulo='Recargas, fiscal',
        oque='Só as compras avulsas, com o documento de quem comprou. O destino diz '
             'para qual assento o crédito foi, quando é equipe.',
        cols=['Data', 'Comprador', 'Email', 'CPF / ID', 'Telefone', 'CEP', 'Endereço',
              'Compra', 'Créditos', 'Destino', 'Valor (R$)'],
        linhas=[
            ['29/08/2026', 'Estúdio Norte', 'contato@estudionorte.com.br',
             '00.000.000/0001-00', '(41) 90000-0000', '80010-010',
             'R. XV de Novembro, 200', 'Recarga 12.000 créditos', '12000',
             'bruno@estudionorte.com.br', '140,00'],
            ['19/08/2026', 'Marilia Fischer', 'marilia@corarender.com',
             '000.000.000-00', '(11) 90000-0000', '01310-100', 'Av. Paulista, 1000',
             'Recarga 5.000 créditos', '5000', '', '65,00'],
        ],
    ),
    dict(
        id='faturas',
        nome='cora-faturas-2026-09-07.csv',
        titulo='Faturas',
        oque='Plano e recarga juntos, do jeito que a tela mostra. O plano vem do '
             'Stripe e a recarga da nossa tabela.',
        cols=['Data', 'Número', 'Tipo', 'Comprador', 'Email', 'Compra', 'Status',
              'Valor (R$)'],
        linhas=[
            ['02/09/2026', 'QBPKH43R-0003', 'Plano', 'Marilia Fischer',
             'marilia@corarender.com', 'Cora Render Pro, mensal', 'Paga', '197,00'],
            ['29/08/2026', 'REC-01287', 'Recarga', 'Estúdio Norte',
             'contato@estudionorte.com.br', 'Recarga de 12.000 créditos', 'Paga', '140,00'],
            ['12/08/2026', 'FJPFTZJ8-0002', 'Plano', '',
             'queridoinacio05@gmail.com', 'Cora Render Studio, mensal', 'Aberta', '297,00'],
        ],
    ),
    dict(
        id='trafego',
        nome='cora-trafego-assinantes-2026-09-07.csv',
        titulo='Tráfego, por público',
        oque='O que a pessoa respondeu no cadastro. Sai em três recortes: assinantes, '
             'membros de equipe e quem está no teste.',
        cols=['Nome', 'Email', 'Gênero', 'Profissão', 'Origem', 'Renderizador',
              'Tamanho equipe', 'Projetos/ano', 'Cadastro'],
        linhas=[
            ['Marilia Fischer', 'marilia@corarender.com', '', 'Arquitetura',
             'Indicação', 'V-Ray', '2 a 5', '10 a 30', '24/01/2026'],
            ['Rafael Antunes', 'rafael@atelie.arq.br', '', 'Arquitetura', 'Instagram',
             'Enscape', 'Só eu', 'até 10', '02/09/2026'],
        ],
    ),
    dict(
        id='geo',
        nome='cora-origem-geografica-2026-09-07.csv',
        titulo='Origem geográfica',
        oque='Contas e receita por país e por estado. A receita conta só o que está '
             'em real: somar dólar com real num total só inflaria o número.',
        cols=['Tipo', 'Local', 'Clientes', '% dos clientes', 'Receita (R$)',
              '% da receita'],
        linhas=[
            ['País', 'BR', '16', '84,2%', '1285,00', '86,7%'],
            ['País', 'PT', '2', '10,5%', '197,00', '13,3%'],
            ['País', 'MX', '1', '5,3%', '0,00', '0,0%'],
            ['Estado', 'SP', '9', '47,4%', '788,00', '53,2%'],
            ['Estado', 'PR', '4', '21,1%', '497,00', '33,5%'],
        ],
    ),
]

# As colunas que saem como TEXTO no Excel. Sem isso ele come o zero da
# esquerda do CEP e transforma telefone em conta de menos.
COLUNAS_TEXTO = ('telefone', 'cpf', 'cep')


def eh_texto(col):
    return col.lower().strip() in COLUNAS_TEXTO or col.lower().strip() == 'cpf / id'


def csv_de(a):
    """O arquivo, exatamente como o navegador baixa.

    Ponto e virgula como separador, BOM na frente e `="..."` nas colunas de
    texto. E o apostrofo de guarda em qualquer celula que comece com = + - @,
    que e o que impede uma formula vinda do cadastro de rodar no computador de
    quem abre.
    """
    def esc(v, i):
        bruto = u'' if v is None else unicode(v) if str is bytes else str(v)
        if bruto and not eh_texto(a['cols'][i]) and bruto[0] in u'=+-@\t\r':
            bruto = u"'" + bruto
        v2 = bruto.replace(u'"', u'""')
        if eh_texto(a['cols'][i]) and v2:
            return u'="%s"' % v2
        return u'"%s"' % v2

    linhas = [u';'.join(u'"%s"' % c for c in a['cols'])]
    for l in a['linhas']:
        linhas.append(u';'.join(esc(v, i) for i, v in enumerate(l)))
    return u'﻿' + u'\r\n'.join(linhas) + u'\r\n'


PASTA = 'ferramentas/csv-exemplo'
if not os.path.isdir(PASTA):
    os.makedirs(PASTA)
for a in ARQUIVOS:
    io.open(os.path.join(PASTA, a['nome']), 'w', encoding='utf-8', newline='').write(csv_de(a))

# ── a planilha na tela ──
def tabela(a):
    cab = u''.join(u'<th>%s</th>' % c for c in a['cols'])
    corpo = u''
    for n, l in enumerate(a['linhas']):
        tds = u''.join(
            u'<td%s>%s</td>' % (u' class="pl__txt"' if eh_texto(a['cols'][i]) else u'',
                                v if v else u'<i></i>')
            for i, v in enumerate(l))
        corpo += u'<tr><th class="pl__n">%d</th>%s</tr>' % (n + 2, tds)
    letras = u''.join(u'<th>%s</th>' % chr(65 + i) for i in range(len(a['cols'])))
    return (u'<div class="pl"><div class="pl__rolo"><table>'
            u'<thead><tr><th class="pl__n"></th>%s</tr>'
            u'<tr><th class="pl__n">1</th>%s</tr></thead>'
            u'<tbody>%s</tbody></table></div></div>' % (letras, cab, corpo))


secoes = u''.join(
    u'<section class="arq">'
    u'<div class="arq__cab"><div><h2>%s</h2><p class="arq__nome">%s</p></div></div>'
    u'<p class="arq__p">%s</p>%s</section>'
    % (a['titulo'], a['nome'], a['oque'], tabela(a))
    for a in ARQUIVOS)

CSS = u"""
body{ margin:0; background:var(--wash); color:var(--ink);
  font-family:var(--fonte); font-size:15px; line-height:1.55; -webkit-font-smoothing:antialiased; }
*,*::before,*::after{ box-sizing:border-box; }
.env{ max-width:1240px; margin:0 auto; padding:clamp(22px,4vw,44px) clamp(16px,3vw,32px) 90px; }
h1{ margin:8px 0 0; font-size:clamp(26px,3.6vw,34px); font-weight:500; letter-spacing:-.034em; line-height:1.1; }
.sub{ margin:14px 0 0; font-size:15.5px; color:var(--ink2); line-height:1.6; max-width:70ch; text-wrap:pretty; }
.sub b{ color:var(--ink); font-weight:600; }
.sub code{ padding:2px 7px; border-radius:6px; background:var(--wash2);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px; }

.arq{ margin-top:30px; padding:24px clamp(18px,2vw,26px) 26px;
  background:var(--paper); border:1px solid var(--line); border-radius:var(--r); }
.arq__cab{ display:flex; align-items:flex-start; justify-content:space-between; gap:18px; flex-wrap:wrap; }
.arq__cab h2{ margin:0; font-size:19px; font-weight:600; letter-spacing:-.022em; }
.arq__nome{ margin:5px 0 0; font-size:12.5px; color:var(--ink3);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
.arq__cab .as-btn-cta{ height:40px; padding:0 20px; font-size:13.5px; }
.arq__p{ margin:12px 0 0; font-size:14px; color:var(--ink2); line-height:1.6; max-width:76ch; text-wrap:pretty; }

/* A PLANILHA
   Ela imita o Excel de propósito: cabeçalho de letras, coluna de números e
   linhas de grade. É o que faz a pessoa reconhecer o que vai abrir, em vez
   de olhar mais uma tabela do site. */
.pl{ margin-top:18px; border:1px solid var(--line2); border-radius:12px; overflow:hidden; }
.pl__rolo{ overflow-x:auto; }
.pl table{ border-collapse:collapse; width:100%; font-size:13px;
  font-variant-numeric:tabular-nums; white-space:nowrap; }
.pl th,.pl td{ border-right:1px solid var(--line); border-bottom:1px solid var(--line);
  padding:8px 12px; text-align:left; font-weight:400; color:var(--ink2); }
.pl thead tr:first-child th{ background:var(--wash2); color:var(--ink3);
  font-size:11px; font-weight:600; letter-spacing:.06em; text-align:center; }
.pl thead tr:nth-child(2) th{ background:var(--paper); color:var(--ink);
  font-weight:600; letter-spacing:-.01em; }
.pl .pl__n{ background:var(--wash2); color:var(--ink3); font-size:11px;
  text-align:center; width:34px; position:sticky; left:0; z-index:1; }
.pl tbody tr:hover td{ background:var(--wash); }
.pl td i{ display:inline-block; width:14px; height:1px; background:var(--line2); vertical-align:middle; }
/* As colunas que saem entre ="" no arquivo. */
.pl__txt{ color:var(--ink); }
.pl__txt::after{ content:''; }
"""

CABECA = u"""<title>Exportações do admin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">

<!--
     OS CINCO ARQUIVOS QUE O BOTAO EXPORTAR GERA

     As colunas sao lidas de app/admin/page.js. Modelo que mente e pior que
     modelo nenhum: se uma coluna mudar la, tem que mudar aqui.

     Este arquivo e MONTADO por `ferramentas/montar-csv.py`, que escreve
     tambem os `.csv` de exemplo em ferramentas/csv-exemplo/.
-->

<style>
@@CSS_PAINEL@@

@@CSS@@
</style>

"""

CORPO = u"""<div class="env">
  <p class="eyebrow">Admin &middot; exportar</p>
  <h1>Os cinco arquivos que saem do Exportar</h1>
  <p class="sub">É assim que cada um abre no Excel. Três decisões que valem para os cinco:
    o separador é <code>;</code> e não vírgula, porque o Excel em português espera ponto e
    vírgula. O arquivo leva um <b>BOM</b> na frente, senão o acento vira caractere estranho.
    E <b>telefone, CPF e CEP saem entre <code>="..."</code></b>, porque sem isso o Excel come
    o zero da esquerda do CEP e transforma telefone em conta de menos.</p>
  <p class="sub">Tem mais uma, que é de segurança: qualquer célula que comece com
    <code>=</code>, <code>+</code>, <code>-</code> ou <code>@</code> ganha um apóstrofo na
    frente. Nome e endereço vêm do cadastro, e sem isso alguém poderia escrever uma fórmula
    no próprio nome e ela rodaria no computador de quem abre o arquivo.</p>
""" + secoes + u"""
</div>
"""

FORA = CABECA.replace('@@CSS_PAINEL@@', css_painel).replace('@@CSS@@', CSS)
io.open('ferramentas/csv-admin.html', 'w', encoding='utf-8').write(FORA + CORPO)
print('csv-admin.html: %.1f KB' % (os.path.getsize('ferramentas/csv-admin.html') / 1024.0))
for a in ARQUIVOS:
    print('  ' + a['nome'])
