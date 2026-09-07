# -*- coding: utf-8 -*-
"""Monta a home do React a partir do artefato do William.

Gera dois arquivos:

  lib/home-motor.js        os scripts do artefato, empacotados
  components/HomeCora.js   a marcacao, mais o efeito que liga o motor

── Por que a marcacao entra como HTML e nao como JSX ──
Sao 500 linhas de marcacao com seis sistemas interativos amarrados nela por
id, classe e data-attribute. Reescrever isso a mao em JSX seria reescrever o
desenho, com chance de errar num atributo e so descobrir na tela. Entrando
como HTML, o que o William desenhou chega intacto, byte a byte.

O preco disso e que o texto fica em portugues, cravado. A troca pra ingles e
espanhol vem depois, puxando as frases pra chaves de traducao. Fica anotado
como o proximo passo, nao esquecido.

── Por que os scripts entram como modulo e nao como <script> ──
Como modulo, o empacotador cuida deles e o React controla quando rodam: uma
vez por montagem, junto com o DOM que eles esperam. Com <script> solto,
navegar pra outra pagina e voltar deixaria os ouvintes duplicados ou o motor
sem rodar, dependendo do caminho.

Cada bloco do artefato entra na sua propria IIFE, que e como ele ja vivia na
pagina: assim nenhuma variavel de um bloco esbarra na de outro.
"""
import io, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SCR = os.path.join(AQUI, "scratchpad")
SITE = ("Z:/Meus Arquivos/9barra7 Academy/Cora Render/Visual Studio Code/cora-site/")

html = io.open(os.path.join(SCR, "home-limpa.html"), encoding="utf-8").read()

# ── a marcacao: so o <main>, que o cabecalho e o rodape sao componentes ──
m = re.search(r"<main id=\"conteudo\">(.*?)</main>", html, re.S)
if not m:
    print("nao achei o <main>"); sys.exit(1)
corpo = m.group(1).strip()

# ── os destinos dos botoes ───────────────────────────────────────────────────
# No artefato os links apontam pra arquivos soltos na mesma pasta
# (`precos.html`, `conta.html`) ou pra lugar nenhum (`#`), porque la a pagina
# abria do disco. No site publicado o primeiro caso vira 404 e o segundo vira
# clique que nao faz nada.
#
# A troca fica AQUI e nao no artefato: o artefato e a pagina do William, que
# tem que continuar abrindo sozinha do disco pra ele conferir o desenho.
# Os tres botoes de plano nao tem a mesma classe (o do meio e `btn--escuro`,
# porque e o destacado), entao a troca casa pelo que vem DEPOIS do href, que e
# igual nos tres.
ELOS = [
    (u'href="#">Assinar', u'href="/precos#planos">Assinar'),
    (u'href="conta.html#criar-conta"', u'href="/cadastro"'),
    (u'href="precos.html"', u'href="/precos"'),
]
for velho, novo in ELOS:
    if velho not in corpo:
        print("AVISO: nao achei o elo %r" % velho[:46])
    corpo = corpo.replace(velho, novo)

# Nenhum link pode sobrar apontando pra lugar nenhum nem pra arquivo solto.
import re as _re
sobrou = [h for h in _re.findall(r'href="([^"]*)"', corpo)
          if h == "#" or h.endswith(".html")]
if sobrou:
    print("AINDA QUEBRADOS:", sobrou)

# ── os scripts ──
blocos = []
for s in re.finditer(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S):
    codigo = s.group(1).strip()
    if not codigo or "classList.add('js')" in codigo:
        continue
    # O bloco que amarra a seta de voltar ao topo no aviso de cookies fica de
    # fora: no site as duas pecas sao componentes com logica propria, e duas
    # fontes de verdade pra mesma coisa e o comeco de um desencontro.
    if "getElementById('ao-topo')" in codigo and len(codigo) < 3000:
        continue
    blocos.append(codigo)

MOTOR = u'''// ═══════════════════════════════════════════════════════════════════════════
//  MOTOR DA HOME
//
//  Gerado por montar-home.py a partir dos <script> de index.html, que e o
//  desenho aprovado. NAO editar aqui: editar o artefato e rodar o script de
//  novo, senao os dois desencontram na primeira mudanca.
//
//  Cada bloco do artefato entra na sua propria IIFE, que e como ele ja vivia
//  na pagina: assim nenhuma variavel de um bloco esbarra na de outro.
//
//  O que roda aqui: carrossel de ferramentas com filtros e arraste, rodizio
//  dos tres passos, dois comparadores antes e depois, galeria das cinco
//  vistas, visor 360 em canvas, abas plugin e web, acordeao do FAQ, esteira
//  de fotos com lupa, contador de alunos e o observador de revelacao.
// ═══════════════════════════════════════════════════════════════════════════

/* eslint-disable */

export function iniciarHome(numeros) {
  if (typeof window === 'undefined') return;

  // O artefato le os numeros dos planos de `window.CORA_PLANOS`, que la vinha
  // de um arquivo solto. Aqui eles vem de lib/planos.js, que e a fonte unica
  // do site: assim a home, a pagina de precos e o checkout nao divergem.
  if (numeros) window.CORA_PLANOS = numeros;

  // A pagina do artefato marcava <html class="js"> pra o CSS saber que o
  // script rodou. Varias regras de estado dependem disso.
  document.documentElement.classList.add('js');

@BLOCOS@
}
'''

partes = []
for i, b in enumerate(blocos, 1):
    # Cada bloco vai num try proprio. O artefato era uma pagina inteira, e
    # alguns blocos amarram em pecas que aqui viraram componentes do React (o
    # menu do cabecalho, o aviso de cookies, a seta de voltar ao topo). Esses
    # nao acham o elemento e estouram. Sem o try, um estouro derruba o efeito
    # inteiro e a home vira tela branca: era exatamente o que acontecia.
    # Com ele, o bloco que falha avisa no console e os outros seguem.
    miolo = "\n".join("    " + l if l.strip() else l for l in b.split("\n"))
    partes.append(
        u"  // ── bloco %d do artefato ──\n"
        u"  try {\n"
        u"    (function(){\n%s\n    })();\n"
        u"  } catch (e) {\n"
        u"    console.warn('[home] bloco %d nao rodou:', e && e.message);\n"
        u"  }" % (i, miolo, i))

MOTOR = MOTOR.replace("@BLOCOS@", "\n\n".join(partes))

# ── o menu do cabecalho ──
# No artefato o burger e a gaveta viviam na propria pagina. Aqui eles sao do
# componente Cabecalho, que serve a home E a pagina de precos, entao a logica
# tem que morar la. O trecho do artefato que amarrava os dois procurava
# `#burger` e `#menu`, nao achava, e estourava. Como ele fica no MEIO do bloco
# maior, levava junto as 300 linhas depois dele: acordeao do FAQ, esteira,
# contador de alunos e o observador de revelacao.
#
# `pegarOuVazio` devolve um elemento solto quando o id nao existe. O trecho
# roda inteiro, amarra em coisa nenhuma, e o que vem depois segue vivo.
MOTOR = MOTOR.replace(
    "export function iniciarHome(numeros) {",
    "// Devolve um elemento solto quando o id nao existe no DOM. Ver a nota em\n"
    "// montar-home.py sobre o menu do cabecalho.\n"
    "function pegarOuVazio(id) {\n"
    "  return document.getElementById(id) || document.createElement('div');\n"
    "}\n\n"
    "export function iniciarHome(numeros) {")
# ── a lupa das fotos ──
# O artefato cria a lupa e pendura ela no `body`. Ali ela funcionava, porque no
# artefato o CSS era global. Aqui o CSS da home e escopado em `.hm`, e o que
# nasce fora desse embrulho nao recebe estilo nenhum: a lupa aparecia como uma
# imagem gigante solta no fim da pagina, sem fundo escuro e sem estado fechado.
# Era isso que parecia "abrir outra pagina" ao clicar numa foto da esteira.
#
# Pendurada no embrulho, ela pega o estilo e volta a ser sobreposicao.
MOTOR = MOTOR.replace(
    "document.body.appendChild(lupa);",
    "(document.querySelector('.hm') || document.body).appendChild(lupa);")

for _id in ("burger", "menu"):
    MOTOR = MOTOR.replace("document.getElementById('%s')" % _id,
                          "pegarOuVazio('%s')" % _id)
io.open(SITE + "lib/home-motor.js", "w", encoding="utf-8", newline="\n").write(MOTOR)

# ── o componente ──
COMP = u'''\'use client\';

// ═══════════════════════════════════════════════════════════════════════════
//  A HOME
//
//  Gerado por montar-home.py a partir de index.html, que e o desenho do
//  William. NAO editar a marcacao aqui: editar o artefato e rodar o script.
//
//  ── Por que a marcacao entra como HTML ──
//  Sao seis sistemas interativos amarrados na marcacao por id, classe e
//  data-attribute. Reescrever isso a mao em JSX seria reescrever o desenho,
//  com chance de errar num atributo e so descobrir na tela. Assim ele chega
//  intacto.
//
//  O preco e que o texto fica em portugues, cravado. Puxar as frases pra
//  chaves de traducao e o proximo passo, e ele nao depende de mais nada:
//  a marcacao ja esta no lugar certo.
//
//  ── Por que o motor roda num efeito ──
//  Uma vez por montagem, junto com o DOM que ele espera. O React so pinta o
//  HTML; quem amarra os ouvintes e o motor, depois.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from \'react\';
import Cabecalho from \'./Cabecalho\';
import AoTopo from \'./AoTopo\';
import { iniciarHome } from \'../lib/home-motor\';
import { planos, descontoAnual } from \'../lib/planos\';

// Os numeros que a marcacao do artefato preenche por `data-plano`. Vem de
// lib/planos.js pra a home, a pagina de precos e o checkout nao divergirem.
function numerosDosPlanos() {
  const por = {};
  planos.forEach((p) => {
    if (!p.mensal) return;
    const mes = Math.round(p.mensal * (1 - descontoAnual));
    por[p.id] = {
      mensal: String(p.mensal),
      anualMes: String(mes),
      anualTotal: (mes * 12).toLocaleString(\'pt-BR\'),
      creditos: p.creditos ? p.creditos.toLocaleString(\'pt-BR\') : \'\',
      imagens: p.imagens ? String(p.imagens) : \'\',
    };
  });
  return Object.assign({ resolucao: \'1,5K\' }, por);
}

const MARCACAO = @MARCACAO@;

export default function HomeCora() {
  const palco = useRef(null);

  useEffect(() => {
    if (!palco.current) return;
    iniciarHome(numerosDosPlanos());
  }, []);

  return (
    <div className="hm">
      <Cabecalho aqui="home" />
      <main id="conteudo" ref={palco} dangerouslySetInnerHTML={{ __html: MARCACAO }} />
      <AoTopo />
    </div>
  );
}
'''

import json
COMP = COMP.replace("@MARCACAO@", json.dumps(corpo, ensure_ascii=False))
io.open(SITE + "components/HomeCora.js", "w", encoding="utf-8", newline="\n").write(COMP)

print("lib/home-motor.js     %.1f KB, %d blocos" % (len(MOTOR) / 1024.0, len(blocos)))
print("components/HomeCora.js %.1f KB de marcacao" % (len(corpo) / 1024.0))
