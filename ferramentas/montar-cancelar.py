# -*- coding: utf-8 -*-
"""Monta ferramentas/cancelar.html, o caminho do cancelamento.

Cinco telas: a assinatura com a saida visivel, o "tem certeza", a confirmacao,
o periodo que ainda corre e o bloqueio quando ele acaba.

A casca (menu lateral, cabecalho, tokens, cartao) e COPIADA do painel.html, e
nao reescrita: e o que garante que estas telas sejam o produto e nao uma
imitacao que envelhece sozinha. Mesma mecanica de montar-admin.py.

Rodar de dentro de cora-site:  python ferramentas/montar-cancelar.py
"""
import io
import os
import re

SCR = os.path.dirname(os.path.abspath(__file__))
css_tela = io.open(os.path.join(SCR, 'cancelar-css.css'), encoding='utf-8').read()
corpo = io.open(os.path.join(SCR, 'cancelar-corpo.html'), encoding='utf-8').read()

painel = io.open('ferramentas/painel.html', encoding='utf-8').read()

m = re.search(r"<style>(.*?)</style>", painel, re.S)
assert m, 'nao achei o <style> do painel'
css_painel = m.group(1)

i = painel.index('<div class="app-shell"')
j = painel.index('<main class="app-main">')
casca = painel[i:j]

# a tarja de personificacao nao pertence a estas telas
casca = re.sub(r'\s*<!-- .. a tarja.*?</div>\n', '\n', casca, flags=re.S, count=1)

# quem nasce ativo aqui e Assinatura
casca = casca.replace('class="app-nav-item ativo" data-vai="inicio"',
                      'class="app-nav-item" data-vai="inicio"')
casca = re.sub(
    r'(<a[^>]*class="app-nav-item)(")((?:(?!</a>).)*?<span class="app-nav-lbl">Assinatura</span>)',
    r'\1 ativo\2\3', casca, flags=re.S)

casca = casca.replace('<header class="app-header">',
                      '<header class="app-header app-header--faixa">')
casca = casca.replace('<span class="app-header-aqui">Inicio</span>',
                      '<span class="app-header-aqui">Assinatura</span>')
casca = casca.replace('<span class="app-header-aqui">Início</span>',
                      '<span class="app-header-aqui">Assinatura</span>')

CABECA = u"""<title>Cancelar a assinatura</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">

<!--
     O CAMINHO DO CANCELAMENTO

     Cinco telas, na ordem em que a pessoa passa por elas. As abas de cima sao
     da DEMONSTRACAO: no produto cada uma aparece no seu momento.

     A decisao que atravessa as cinco: em nenhuma delas o cancelamento e
     tratado como erro. Nao ha vermelho de alerta, nao ha icone de perigo, e o
     botao de ficar nao e maior que o de sair.

     Esconder a saida e o padrao escuro classico das assinaturas, e ele custa
     caro de verdade: quem nao acha como cancelar pede estorno no banco, e uma
     contestacao custa a taxa, o valor e a reputacao junto ao adquirente. Sair
     facil e mais barato que segurar a forca.

     COMO ESTE ARQUIVO E FEITO
     Ele e MONTADO, nao escrito a mao. O `style data-demo` recebe a folha
     inteira do painel, copiada na hora da montagem: ela nao entra na folha
     gerada, e nao precisa, porque no site ela ja chega pelo painel-pagina.css.
     Mexer no desenho e mexer aqui e rodar o montador, nunca editar o HTML.
-->

<style data-demo>
@@CSS_PAINEL@@

/* A demonstracao: as abas trocam de tela. No produto, quem troca e o
   momento. */
.adm-cabeca{ margin-bottom:18px; }
.adm-abas{
  display:flex; gap:4px; margin-bottom:20px; flex-wrap:wrap;
  border-bottom:1px solid var(--line);
}
.adm-aba{
  padding:10px 14px 12px; border:0; background:none; cursor:pointer;
  font:inherit; font-size:14px; color:var(--ink3);
  border-bottom:2px solid transparent; margin-bottom:-1px;
}
.adm-aba:hover{ color:var(--ink); }
.adm-aba.ativa{ color:var(--ink); font-weight:600; border-bottom-color:var(--lima); }
.adm-dl{ margin:14px 0 0; display:grid; gap:0; }
.adm-dl > div{
  display:flex; align-items:baseline; justify-content:space-between; gap:16px;
  padding:11px 0; border-bottom:1px solid var(--line);
}
.adm-dl > div:last-child{ border-bottom:0; }
.adm-dl dt{ margin:0; font-size:13.5px; color:var(--ink3); }
.adm-dl dd{ margin:0; font-size:13.5px; color:var(--ink); text-align:right; }
</style>

<style>
@@CSS_TELA@@
</style>
"""

RODAPE = u"""    </div>
  </main>
</div>

<script>
  /* So a demonstracao: no produto quem decide a tela e o estado da conta. */
  var d = document;
  function mostrar(qual) {
    d.querySelectorAll('[data-tela]').forEach(function (t) {
      t.hidden = t.dataset.tela !== qual;
    });
    d.querySelectorAll('.adm-aba').forEach(function (a) {
      a.classList.toggle('ativa', a.dataset.aba === qual);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  d.querySelectorAll('.adm-aba').forEach(function (a) {
    a.addEventListener('click', function () { mostrar(a.dataset.aba); });
  });
  /* Os botoes de dentro das telas andam pelo caminho, para dar para percorrer
     o fluxo inteiro como a pessoa percorre. */
  d.querySelectorAll('[data-abre]').forEach(function (b) {
    b.addEventListener('click', function () { mostrar(b.dataset.abre); });
  });
</script>
"""

FORA = (CABECA
        .replace('@@CSS_PAINEL@@', css_painel)
        .replace('@@CSS_TELA@@', css_tela))

MIOLO = ('  <main class="app-main">\n    <div class="app-main-conteudo">\n'
         '    <div style="max-width:860px;margin:0 auto">\n'
         + corpo + '\n    </div>\n')

io.open('ferramentas/cancelar.html', 'w', encoding='utf-8').write(FORA + casca + MIOLO + RODAPE)
print('cancelar.html: %.1f KB' % (os.path.getsize('ferramentas/cancelar.html') / 1024.0))
