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

## `painel.html`

O artefato do painel: a moldura (`AppShell`) e a home de `/conta`, na
identidade nova. Ainda **não foi portado** — está aqui para aprovação.

Ele abre direto do disco, e a barra preta no rodapé troca tema (claro e
escuro) e estado da conta (Pro, teste, dono de equipe, membro, admin) para
ver a mesma tela pelos olhos de cada um.

Os nomes de classe são os que já estão em produção sempre que a peça
sobrevive, para a portagem ser troca de folha e não reescrita de componente.

Quando for portar:

```
python gerar-css-artefato.py painel.html ../app/painel-pagina.css pn
```

**Um cuidado que ainda não existe no gerador:** este é o primeiro artefato
com tema escuro. As regras dele estão escritas como
`:root[data-theme="dark"]`, e o `prefixar()` hoje transformaria isso em
`.pn :root[...]`, que não casa com nada, porque o atributo mora no `<html>`.
Antes de gerar, o `prefixar()` precisa aprender a jogar esse pedaço para
fora do escopo: `:root[data-theme="dark"] .x` vira
`[data-theme="dark"] .pn .x`.

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

**O que ele NÃO traz, e o que isso já custou:** o recorte é `<main>`, porque
cabeçalho e rodapé viram componentes. O cabeçalho virou. O rodapé não virou, e
o site inteiro ficou meses com a tira fina de links legais no lugar do rodapé
de quatro colunas do artefato. Hoje ele mora em `components/RodapeCora.js`,
com a marcação copiada do artefato e o estilo que já estava gerado aqui, e
`RodapeGlobal` o põe em todas as páginas públicas. **Se o rodapé mudar no
artefato, o componente não descobre sozinho.**

## `tirar-assets-home.py`

Tira os 9,4 MB de base64 de dentro do `index.html` do William e põe em
`public/home/`. Roda antes do `montar-home.py`.

## `gerar-css-conta.py` — ⚠ não roda hoje

O mesmo de `gerar-css-artefato.py`, para as telas de conta (`.tc`).

**Ele importa `painel_comum.py`, que lia o `modelo-painel.html`, e os dois
moravam numa pasta temporária de sessão que já foi embora.** Até alguém
refazer os dois, quem manda é o `app/telas-de-conta.css`, editado à mão, e o
cabeçalho do arquivo diz isso. Rodar o script como está só dá `ImportError`.

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

## `medir-esteira.js`

Mede se a esteira de renders da home está mesmo andando, e a que velocidade.

```
node medir-esteira.js https://corarender.com/?chave=...
```

**Por que ele existe:** o painel do navegador do Claude Code fica escondido, e
**página escondida não recebe `requestAnimationFrame` nem evento de
`scroll`**. Qualquer medida de movimento feita ali dá zero, e o zero é do
painel, não do site. Este script sobe um Chrome com porta de depuração e mede
por CDP, que é o único jeito de saber se a coisa anda.

Ele também serve de molde para medir qualquer outra animação da página.


## O admin: montado, e não escrito à mão

`ferramentas/admin.html` é **gerado** por `python ferramentas/montar-admin.py`,
rodado de dentro de `cora-site`. Editar o `admin.html` direto é trabalho
perdido: a próxima montagem passa por cima.

As peças, todas em `ferramentas/`:

| arquivo | o que é |
|---|---|
| `admin-css.css` | o CSS que **só o admin tem**. É este que vira `app/admin-pagina.css`. |
| `admin-corpo.html` | a marcação do miolo: a cabeça, as abas e as oito telas. |
| `admin-cabeca.txt` | o cabeçalho do arquivo, com os marcadores `@@CSS_ADMIN@@` e `@@CSS_PAINEL@@`. |
| `admin-rodape.txt` | a gaveta dos filtros e o script da demonstração. |

O montador **copia a casca do `painel.html`**: o menu lateral, o cabeçalho e a
folha inteira do painel. É por isso que o admin é a mesma tela e não uma
imitação que envelhece sozinha. A folha copiada entra num `<style data-demo>`,
que o gerador ignora, porque no site ela já chega pelo `painel-pagina.css`.

Depois de montar, gerar:

    python ferramentas/gerar-css-artefato.py ferramentas/admin.html app/admin-pagina.css ad
