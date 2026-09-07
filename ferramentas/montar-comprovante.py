# -*- coding: utf-8 -*-
"""Monta ferramentas/comprovante-aceite.html, a folha A4 do aceite.

Ela existe para ter valor de prova. Traz na mesma folha as cinco coisas que
respondem "quem aceitou o que, quando e de onde", e o TEXTO INTEIRO da versao
aceita. Todos esses campos ja existem na tabela `aceites` do cora-auth:
conta_id, email, documento_id, ip, navegador, onde e criado_em, mais o texto
versionado em `documentos_legais`.

A marca e a faixa sao copiadas do painel.html na montagem, para o comprovante
nao ter uma copia propria que envelhece sozinha.

Rodar de dentro de cora-site:  python ferramentas/montar-comprovante.py
"""
import io
import os
import re

painel = io.open('ferramentas/painel.html', encoding='utf-8').read()


def token(nome):
    m = re.search(r'^\s*--%s:\s*(.+?);\s*$' % re.escape(nome), painel, re.M)
    assert m, 'nao achei --' + nome
    return m.group(1)


MARCA = token('marca')
FAIXA = token('faixa-deitada')

# ═══════════════════════════════════════════════════════════════════════════
#  O TEXTO DA VERSAO ACEITA
#
#  Aqui vai um trecho de exemplo. No sistema ele sai inteiro de
#  `documentos_legais`, e e por isso que a folha nao tem "continua em", nem
#  link: o comprovante REPRODUZ o texto, ele nao aponta para ele. Um link pode
#  mudar de conteudo depois. O papel nao.
# ═══════════════════════════════════════════════════════════════════════════
# Uma aceitacao grava DUAS linhas em `aceites`, uma por documento: o
# Os textos legais moram em docs_legais.py, e nao aqui: a janela de comprovante
# dentro do admin usa exatamente os mesmos. Duas copias do mesmo texto legal e
# a receita para uma envelhecer sem ninguem notar.
import sys
sys.path.insert(0, SCR if 'SCR' in dir() else os.path.dirname(os.path.abspath(__file__)))
from docs_legais import DOCUMENTOS, TEXTOS as CLAUSULAS_DE, blocos

TEXTOS = dict((k, blocos(v)) for k, v in CLAUSULAS_DE.items())

# Cada documento vira uma secao propria, com a sua versao e a sua data de
# aceite no cabecalho. As duas datas coincidem hoje, mas o comprovante nao
# assume isso: um reaceite pode cobrir so o documento que mudou.
documentos = u''.join(
    u'<section class="doc__sec">'
    u'<div class="doc__sec-cab">'
    u'<h3>%s</h3>'
    u'<p>Versão <b>%s</b>, em vigor desde %s<br>'
    u'Aceita por esta conta em <b>%s</b></p>'
    u'</div>%s</section>'
    % (d['nome'], d['versao'], d['vigor'], d['aceito'], TEXTOS[d['clausulas']])
    for d in DOCUMENTOS)

HTML = u"""<title>Comprovante de aceite</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">

<!--
     O COMPROVANTE DE ACEITE, EM A4

     Ele existe para ter valor de prova. Cinco coisas na mesma folha respondem
     a pergunta inteira: quem aceitou, o que, quando, de onde, e o texto.

     O TEXTO VAI INTEIRO, e nao um link para ele. E o que separa um
     comprovante de um recibo: um link pode mudar de conteudo depois. E por
     isso a folha pode passar de uma pagina, e as regras de quebra sao
     explicitas: `break-inside: avoid` em cada clausula, para nenhuma partir
     no meio, e o cabecalho de identificacao nunca se separa da folha 1.

     Todos os campos ja existem na tabela `aceites` do cora-auth (conta_id,
     email, documento_id, ip, navegador, onde, criado_em) mais o texto
     versionado em `documentos_legais`. Nao e promessa: e o que ja esta
     gravado.
-->

<style>
:root{
  --ink:#111111; --ink2:#5B5B57; --ink3:#8E8E88;
  --paper:#FFFFFF; --wash:#F1F1EE; --wash2:#EFEFEB;
  --line:#E4E4DF; --line2:#D2D2CB;
  --lima:#C4FBA7; --lima-esc:#A5F37D;
  --pill:100px;
  --fonte:'DM Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --marca:@@MARCA@@;
  --faixa:@@FAIXA@@;

  --folha-l:210mm; --folha-a:296mm; --folha-pad:16mm; --folha-faixa:15mm;

  /* A MESA e a FOLHA sao duas coisas. O papel e papel nos dois temas: um
     comprovante impresso nao muda de cor. O que acompanha o tema de quem
     abre e a mesa em que ele esta apoiado. */
  --mesa:#F1F1EE; --mesa-tx:#111111; --mesa-tx2:#5B5B57; --mesa-tx3:#8E8E88;
  --mesa-sombra:rgba(17,17,17,.14);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --mesa:#16160F; --mesa-tx:#F4F4EE; --mesa-tx2:#B8B8AF; --mesa-tx3:#8E8E88;
    --mesa-sombra:rgba(0,0,0,.5);
  }
}
:root[data-theme="dark"]{
  --mesa:#16160F; --mesa-tx:#F4F4EE; --mesa-tx2:#B8B8AF; --mesa-tx3:#8E8E88;
  --mesa-sombra:rgba(0,0,0,.5);
}
*,*::before,*::after{ box-sizing:border-box; }
body{
  margin:0; background:var(--mesa); color:var(--mesa-tx);
  font-family:var(--fonte); line-height:1.55; -webkit-font-smoothing:antialiased;
}

/* ── a moldura da tela, que nao existe no papel ── */
.tela{ padding:clamp(18px,4vw,44px); display:grid; gap:20px; justify-items:center; }
.tela__topo{ width:var(--folha-l); max-width:100%; }
.olho{ font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--mesa-tx3); }
h1{ margin:10px 0 0; font-size:clamp(24px,3.4vw,32px); font-weight:500; letter-spacing:-.034em; line-height:1.12; text-wrap:balance; }
.sub{ margin:12px 0 0; font-size:15px; color:var(--mesa-tx2); max-width:62ch; text-wrap:pretty; }
.acoes{ margin-top:18px; display:flex; gap:10px; flex-wrap:wrap; }
.bt{
  height:44px; padding:0 22px; border:0; border-radius:var(--pill);
  background:var(--lima); color:#111111;
  font-family:inherit; font-size:14px; font-weight:600; cursor:pointer;
}
.bt:hover{ background:var(--lima-esc); }
.bt:focus-visible{ outline:2px solid var(--mesa-tx); outline-offset:3px; }

/* ── A FOLHA ── */
.doc{
  width:var(--folha-l); min-height:var(--folha-a);
  background:var(--paper); color:var(--ink); overflow:hidden;
  display:flex; flex-direction:column;
  box-shadow:0 18px 44px var(--mesa-sombra);
}
.doc__faixa{
  height:var(--folha-faixa); flex:none;
  background:var(--faixa) repeat-x left center;
  background-size:calc(var(--folha-faixa) * 8) 100%;
}
.doc__miolo{ flex:1; display:flex; flex-direction:column; padding:var(--folha-pad); }
.doc__marca{
  width:34mm; height:8mm; background:var(--ink);
  -webkit-mask:var(--marca) no-repeat left center / contain;
  mask:var(--marca) no-repeat left center / contain;
}

.doc__tit{ margin:12mm 0 0; font-size:25px; font-weight:500; letter-spacing:-.03em; line-height:1.15; }
.doc__num{ margin:2mm 0 0; font-size:12px; color:var(--ink3); font-variant-numeric:tabular-nums; }

/* AS QUATRO CAIXAS DA IDENTIFICACAO.
   Elas nunca se separam da primeira folha: quem confere le a identificacao
   antes do texto, e uma identificacao na pagina 3 nao serve. */
.doc__quem{
  margin-top:11mm; display:grid; grid-template-columns:1fr 1fr; gap:7mm 8mm;
  break-inside:avoid; page-break-inside:avoid;
}
.doc__bloco span{
  display:block; margin-bottom:2mm; font-size:9.5px; font-weight:700;
  letter-spacing:.14em; text-transform:uppercase; color:var(--ink3);
}
.doc__bloco p{ margin:0; font-size:12.5px; color:var(--ink2); line-height:1.65; }
.doc__bloco b{ color:var(--ink); font-weight:600; }

.doc__texto{ margin-top:11mm; }
.doc__texto > span{
  display:block; margin-bottom:4mm; font-size:9.5px; font-weight:700;
  letter-spacing:.14em; text-transform:uppercase; color:var(--ink3);
}
.doc__aviso{
  margin:0 0 5mm; padding:4mm 5mm; border-left:3px solid var(--lima);
  background:var(--wash2); font-size:11.5px; color:var(--ink2); line-height:1.6;
  break-inside:avoid;
}
/* Nenhuma clausula parte no meio entre duas paginas. Uma clausula cortada
   levanta a duvida de sempre: falta alguma coisa aqui? */
/* Cada documento e uma secao com o proprio cabecalho: versao e data de
   aceite. O cabecalho nunca se separa da primeira clausula dele. */
.doc__sec + .doc__sec{ margin-top:9mm; break-before:auto; }
.doc__sec-cab{
  margin-bottom:5mm; padding-bottom:3mm; border-bottom:1px solid var(--line);
  break-after:avoid; page-break-after:avoid; break-inside:avoid;
}
.doc__sec-cab h3{ margin:0; font-size:15px; font-weight:600; letter-spacing:-.016em; }
.doc__sec-cab p{ margin:1.5mm 0 0; font-size:11px; color:var(--ink3); line-height:1.6; }
.doc__sec-cab b{ color:var(--ink2); font-weight:600; }
.doc__cl{ break-inside:avoid; page-break-inside:avoid; margin-bottom:5mm; }
.doc__cl h4{ margin:0 0 1.5mm; font-size:12.5px; font-weight:600; letter-spacing:-.012em; }
.doc__cl p{ margin:0; font-size:12px; color:var(--ink2); line-height:1.7; text-align:justify; text-wrap:pretty; }
.doc__cl b{ color:var(--ink); font-weight:600; }

.doc__pe{
  margin-top:auto; padding-top:8mm; border-top:1px solid var(--line);
  break-inside:avoid;
}
/* Parágrafos separados, e não emendados por <br>: são dois assuntos, e um
   <br> entre eles fazia os dois lerem como um bloco só de letra miúda. */
.doc__pe p{
  margin:0 0 4mm; font-size:10.5px; color:var(--ink3);
  line-height:1.7; text-wrap:pretty;
}
.doc__pe p:last-child{ margin-bottom:0; }
.doc__pe b{ color:var(--ink2); font-weight:600; }
.doc__quem-somos{ padding-top:3mm; border-top:1px solid var(--line); }
/* A licenca da base de IP e CC BY, e CC BY pede credito visivel. Ele vive no
   rodape junto do resto da identificacao, nao perdido no meio do texto. */
.doc__credito{ font-size:9px; }

/* A identificação CRUA do navegador, do jeito que ela está gravada. A linha
   legível acima é conveniência; esta é a prova. Um documento que só mostra
   "Chrome 128" pede que se confie na tradução de quem imprimiu. */
.doc__ua{
  margin:2mm 0 0; padding:2mm 3mm; border-radius:4px; background:var(--wash2);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:8.5px; color:var(--ink3); line-height:1.5; word-break:break-all;
}

/* A localizacao lida do IP. Ela fica visivelmente ABAIXO do IP e em letra
   menor de proposito: o IP e o fato registrado, a cidade e leitura dele. Num
   documento que pode ir para a Justica, misturar as duas coisas na mesma linha
   seria apresentar uma inferencia com a mesma forca de um registro. */
.doc__est{
  margin:2mm 0 0; font-size:9.5px; color:var(--ink3); line-height:1.6;
  text-wrap:pretty;
}
.doc__est b{ color:var(--ink2); font-weight:600; }

/* ── O PAPEL ── */
@page{ size:A4; margin:0; }
@media print{
  body{ background:none; }
  .tela{ padding:0; display:block; }
  .tela__topo{ display:none; }
  .doc{
    box-shadow:none; margin:0;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
  }
  /* A faixa e a marca so aparecem na primeira folha: repetir a marca em cada
     pagina de um documento juridico faz parecer papel timbrado de tres
     documentos diferentes. */
  .doc__faixa{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
</style>

<div class="tela">
  <div class="tela__topo">
    <span class="olho">Cora Render &middot; admin</span>
    <h1>O comprovante de aceite</h1>
    <p class="sub">É o que sai quando você clica em Comprovante numa linha dos Aceites.
      Em A4, com o texto inteiro da versão aceita. Aperte o botão e escolha
      "Salvar como PDF" no destino.</p>
    <div class="acoes">
      <button class="bt" onclick="window.print()">Salvar em PDF</button>
    </div>
  </div>

  <div class="doc">
    <div class="doc__faixa" aria-hidden="true"></div>
    <div class="doc__miolo">
      <div class="doc__marca" role="img" aria-label="Cora Render"></div>

      <div class="doc__tit">Comprovante de aceite</div>
      <div class="doc__num">Registro nº 0000418 &middot; emitido em 7 de setembro de 2026</div>

      <div class="doc__quem">
        <div class="doc__bloco">
          <span>Quem aceitou</span>
          <p><b>Marilia Fischer</b><br>marilia@corarender.com<br>
            CPF 000.000.000-00<br>Conta nº 3617</p>
        </div>
        <div class="doc__bloco">
          <span>O que foi aceito</span>
          <p><b>Termos de Uso</b>, versão 2026-09-07<br>
            <b>Política de Privacidade</b>, versão 2026-08-14<br>
            os dois na íntegra, mais adiante nesta folha</p>
        </div>
        <div class="doc__bloco">
          <span>Quando</span>
          <p>Termos, em <b>7 de setembro de 2026</b><br>
            Privacidade, em <b>24 de agosto de 2026</b><br>
            horário de Brasília (UTC&minus;3)</p>
        </div>
        <div class="doc__bloco">
          <span>De onde</span>
          <p>Endereço de IP <b>177.85.0.0</b><br>
            Chrome 128 no Windows 11</p>
          <p class="doc__ua">Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
            (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36</p>
          <p class="doc__est">Pelo IP, a conexão saiu de <b>Curitiba, Paraná, Brasil</b>.
            Isso é leitura de uma base pública de faixas de IP, e não o endereço da
            pessoa: em celular e em VPN costuma apontar outra cidade. O que está
            registrado é o IP.</p>
        </div>
      </div>

      <div class="doc__texto">
        <span>O texto aceito, na íntegra</span>
        <p class="doc__aviso">Abaixo estão os dois documentos por inteiro, cada um na
          versão que esta conta aceitou. Não é resumo nem link: é o texto que estava
          escrito no dia.</p>
        @@CLAUSULAS@@
      </div>

      <div class="doc__pe">
        <p><b>De onde sai cada informação desta folha.</b> No instante em que a pessoa
          aceita, o sistema grava a conta, o e-mail, qual versão de qual documento, o
          endereço de IP público, a identificação do navegador e a data e hora com fuso. O
          texto de cada versão fica guardado inteiro e <b>não pode ser editado depois</b>:
          uma alteração entra como versão nova e a anterior continua onde está. É isso que
          permite reproduzir aqui, hoje, exatamente o que estava escrito no dia do aceite.</p>
        <p>Quando um documento muda, a pessoa é avisada na tela e precisa aceitar de novo
          antes de continuar usando. Cada novo aceite gera um registro próprio, e este
          comprovante passa a mostrar a versão mais recente que ela aceitou.</p>
        <p class="doc__quem-somos">9BARRA7 Academy &middot; CNPJ 43.879.950/0001-40 &middot;
          contato@corarender.com &middot; corarender.com<br>
          <span class="doc__credito">Localização por IP: DB-IP (db-ip.com), sob licença
            CC BY 4.0</span></p>
      </div>
    </div>
  </div>
</div>
"""

saida = (HTML.replace('@@MARCA@@', MARCA)
             .replace('@@FAIXA@@', FAIXA)
             .replace('@@CLAUSULAS@@', documentos))
io.open('ferramentas/comprovante-aceite.html', 'w', encoding='utf-8').write(saida)
print('comprovante-aceite.html: %.1f KB'
      % (os.path.getsize('ferramentas/comprovante-aceite.html') / 1024.0))
