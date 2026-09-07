# Os geradores

Estes scripts são o que liga **o artefato do William** ao **site publicado**.
Eles moravam numa pasta temporária de sessão e foram salvos aqui em 06/09/2026
para não morrerem junto com a conversa.

## A regra que eles existem para sustentar

> A página publicada tem que ser idêntica ao artefato aprovado.

Editar o CSS da página à mão quebra isso na primeira mudança: o artefato passa
a dizer uma coisa e o site outra, e ninguém sabe qual dos dois é o certo.
Então o caminho é sempre o mesmo:

    editar o artefato  →  rodar o gerador  →  conferir  →  commitar

Todo arquivo gerado abre com um cabeçalho dizendo "NÃO editar aqui".

---

## `gerar-css-artefato.py`

Pega o `<style>` de um artefato e escreve uma folha escopada numa classe.

```
python gerar-css-artefato.py <artefato.html> <destino.css> <escopo>
python gerar-css-artefato.py suporte.html ../app/suporte-pagina.css sp
```

**Por que escopado:** o `globals.css` tem doze mil linhas. Em vez de discutir
com elas, o desenho aprovado entra inteiro sob `.sp`, `.pr`, `.hm`. Um seletor
com prefixo tem especificidade maior que o mesmo sem, então ele ganha do molde
antigo sem `!important` e sem apagar nada de ninguém.

**O que ele NÃO deixa passar, e por quê:**

- `@font-face` — a fonte já é servida pelo site.
- O `overflow` de `body`/`html` — descido para o embrulho da página, ele
  transformava o `.hm` em contexto de rolagem e o cabeçalho grudado parava de
  grudar.
- `.ao-topo` e o aviso de cookies — no site são componentes com estilo
  próprio. Duas fontes de verdade para a mesma peça é o começo de um
  desencontro.

Ele imprime `seletores sem escopo: N` no fim. **Se não for zero, alguma regra
vai vazar para o site inteiro.**

## `montar-home.py`

Escreve `lib/home-motor.js` e `components/HomeCora.js` a partir de
`scratchpad/home-limpa.html` (que sai do `tirar-assets-home.py`).

Cada bloco de `<script>` do artefato entra na sua própria IIFE dentro do seu
próprio `try`. Sem o `try`, um bloco que não acha o elemento que virou
componente do React derruba o efeito inteiro, e a home vira tela branca. Foi
exatamente o que aconteceu.

Ele também traduz os links: no artefato eles apontam para arquivos soltos
(`precos.html`) porque a página abre do disco, e publicados viram 404. **E
reprova qualquer `href` que sobre como `#` ou terminando em `.html`** — foi
assim que seis links mortos apareceram de uma vez.

## `tirar-assets-home.py`

Tira os 9,4 MB de base64 de dentro do `index.html` do William e põe em
`public/home/`. Roda antes do `montar-home.py`.

## `gerar-css-conta.py`

O mesmo de `gerar-css-artefato.py`, para as telas de conta (`.tc`).

**A armadilha que ele resolve:** a DM Sans do site tem `size-adjust: 88%`, que
encolhe todo o texto em 12%. O gerador escreve uma família irmã, `'DM Sans
TC'`, sem o `size-adjust`, e aplica só dentro do escopo. Sem isso a tela sai
menor que o artefato e ninguém entende por quê.

## `base_suporte.py`, `dados_faq.py`, `sup-c.py`

O artefato da página de suporte, em código. `python sup-c.py` reescreve o
`suporte-c.html`, e daí o `gerar-css-artefato.py` refaz a folha.

`base_suporte.py` tem a **faixa dos Promptadores** em SVG: círculo avança um
diâmetro, meia-lua avança um raio, vão avança um diâmetro, sequência
`ODD_ODO_DO`. O erro fácil é fazer toda forma avançar um diâmetro, e aí a
meia-lua deixa um buraco atrás dela.

## `../../cora-auth/gerar-documentos-legais.js`

Este mora no `cora-auth`. Lê os Termos e a Política do `lib/i18n.js` daqui,
calcula o SHA-256 e escreve o `documentos-legais.js` de lá, que é o texto
congelado que fica guardado junto de cada aceite.

**Rodar toda vez que um dos dois documentos mudar, com uma versão nova:**

```
node gerar-documentos-legais.js 2026-10-15
```

Subir texto novo sem trocar a versão é o erro que anula a prova: dois textos
diferentes com o mesmo carimbo.
