# -*- coding: utf-8 -*-
"""Escreve app/telas-de-conta.css no cora-site.

O painel, o cartao e os campos vem do painel_comum, que recorta o
modelo-painel.html: os mesmos blocos que montam os artefatos de revisao. O que
e escrito aqui direto e so o que existe so em producao (a rolagem do cartao
alto, os degraus de compressao, e as pecas do cadastro).

Tudo sai escopado em `.tc`, que entra no LoginSplit. Escopar resolve dois
problemas de uma vez: o CSS novo ganha das regras antigas do globals.css sem
precisar apagar nada de um arquivo de 12 mil linhas (0,2,0 contra 0,1,0), e
nada vaza pras telas internas do app, que seguem como estao.
"""
import io, re
import painel_comum as pc

SAIDA = ("Z:/Meus Arquivos/9barra7 Academy/Cora Render/Visual Studio Code/"
         "cora-site/app/telas-de-conta.css")


def escopar(css, escopo=".tc"):
    """Poe `.tc ` na frente de cada seletor. @keyframes e :root passam direto:
    keyframes nao tem seletor de elemento, e as fichas de cor precisam valer no
    documento todo."""
    saida, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            saida.append(css[i:]); break
        cabeca = css[i:j]
        prof, k = 1, j + 1
        while k < n and prof:
            if css[k] == "{": prof += 1
            elif css[k] == "}": prof -= 1
            k += 1
        corpo = css[j:k]
        sel = cabeca.strip()
        limpo = re.sub(r"/\*.*?\*/", "", sel, flags=re.S).strip()
        if limpo.startswith("@media") or limpo.startswith("@supports"):
            saida.append(cabeca + "{" + escopar(corpo[1:-1], escopo) + "}")
        elif limpo.startswith("@") or not limpo:
            saida.append(cabeca + corpo)
        elif limpo in (":root", "html", "body", "*", "html,body"):
            saida.append(cabeca + corpo)
        else:
            partes = [p.strip() for p in limpo.split(",") if p.strip()]
            novos = [p if p.startswith(escopo) else escopo + " " + p for p in partes]
            comentario = sel[:len(sel) - len(limpo)] if sel.endswith(limpo) else ""
            saida.append(("\n" if comentario else "") + comentario + ",\n".join(novos) + corpo)
        i = k
    return "".join(saida)


CABECA = u"""/* ============================================================================
   TELAS DE CONTA — entrar, criar conta, esqueci a senha, nova senha, verificar
   ============================================================================
   Escopado em `.tc`, que o LoginSplit poe na moldura. Duas razoes:

     1. As regras antigas destas telas continuam no globals.css. `.tc .algo`
        tem especificidade 0,2,0 e ganha de `.algo`, entao o visual novo vale
        sem apagar nada de um arquivo de 12 mil linhas.
     2. Nada vaza pras telas internas do app (/app, /conta, /workspace), que
        seguem como estao.

   ARQUIVO GERADO por gerar-css-conta.py. Editar la, nao aqui.
   ============================================================================ */

/* Fichas de cor da marca. No :root de proposito: as animacoes resolvem
   variavel no elemento, e o ModalFiscal nasce fora do `.tc`. Os nomes nao
   colidem com os tokens do site. */
:root{
  --lima:#C4FBA7; --lima-esc:#a9ef86;
  --turquesa:#ADECDF; --osso:#F4F4F4; --preto:#000000;
  /* O turquesa como TEXTO no branco da 1,33:1, ou seja, some. Pra texto usamos
     a mesma matiz (168 graus) escurecida ate 6,3:1. Como PREENCHIMENTO ele vai
     cheio, que ali da 14,2:1 com texto preto. */
  --turq-texto:#196C5B;
  --e-2:8px; --e-3:12px; --e-4:16px; --e-5:24px; --e-6:32px; --e-7:48px;
  --r-pill:100px;
  --tr-padrao:180ms; --easing:cubic-bezier(0.16,1,0.3,1);
}

/* `hidden` tem que ganhar de qualquer display de classe: a regra do navegador
   e de prioridade menor que a nossa, entao `.reqs{display:grid}` deixava o
   checklist na tela mesmo com o atributo posto. */
.tc [hidden]{ display:none !important; }

/* ═══════════════ a fonte, em tamanho nominal ═══════════════
   A DM Sans do site vai com `size-adjust:88%`. Isso veio do plugin, onde ela
   precisava bater a altura-x da Degular antiga. No site o efeito e que TODO
   texto sai 12% menor do que o numero escrito no CSS: um corpo de 14px chega
   na tela como 12,3px.

   E por isso que estas telas nunca fechavam com o artefato. Os corpos batiam
   no CSS e nao no vidro: a mesma frase, no mesmo 14px, media 506px no
   artefato e 444px aqui, que e exatamente 88%.

   `size-adjust` e descritor de @font-face, nao propriedade, entao nao da pra
   desligar por seletor. A saida e uma familia irma, mesmo arquivo, sem o
   ajuste, usada so dentro do `.tc`. O resto do site segue como estava. */
@font-face{
  font-family:'DM Sans TC';
  src:url('/fontes/DMSans-latin.woff2') format('woff2');
  font-weight:100 1000; font-style:normal; font-display:swap;
  unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face{
  font-family:'DM Sans TC';
  src:url('/fontes/DMSans-latin-ext.woff2') format('woff2');
  font-weight:100 1000; font-style:normal; font-display:swap;
  unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
.tc, .tc *{
  font-family:'DM Sans TC','DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
}


/* ═══════════════ a moldura ═══════════════ */
/* O molde antigo continua mandando em tudo que o `.tc` nao desmancha, e ele
   nao desmancha o que nao nomeia. Duas herancas escapavam:
   1. `.login-split` do globals traz `padding:16px; gap:16px`, e o painel
      ficava flutuando em vez de sangrar ate a borda.
   2. `.login-card` do globals traz moldura, raio e `padding:40px 36px`. O
      `.login-form-lado .login-card` que zera isso la pede um ancestral que
      o LoginSplit novo nao tem, entao nunca pegava.
   Zerar aqui, e nao no globals, e de proposito: o globals atende telas que
   ainda usam o molde antigo. */
.tc.login-split{
  min-height:100dvh; display:grid; grid-template-columns:1fr;
  background:var(--paper); color:var(--ink);
  padding:0; gap:0;
}
.tc .login-card{ border:0; border-radius:0; background:transparent; padding:0; }
/* A pilula do passo abraca o proprio texto. Ela e um bloco dentro de um
   cartao em coluna flex, entao por padrao esticava de ponta a ponta. */
.tc .cad-passo-tag{ display:inline-block; align-self:flex-start; width:auto; }
/* O rodape legal do site fica ABAIXO da tela de conta, que ocupa a janela
   inteira e nao rola. Sessenta e quatro pixels pendurados ali poem barra de
   rolagem na pagina e comem 9px de largura do painel. O desenho aprovado nao
   tem esse rodape aqui, e os elos dele seguem no resto do site. */
body:has(.tc.login-split) .rodape-legal{ display:none; }
/* O molde antigo poe 18px embaixo do campo de senha e 18px acima do botao. No
   desenho aprovado o respiro e um so, de 32px, e vem do botao. */
.tc .senha-campo{ margin-bottom:0; }
.tc .login-card .btn{ margin-top:var(--e-6); }
@media (min-width:900px){
  .tc.login-split{ grid-template-columns:1.05fr 1fr; }
  /* Quem rola e o lado do formulario, senao o painel rolaria junto e a barra
     preta sairia da tela. Mas centralizar DENTRO do proprio contentor que rola
     corta o topo quando o cartao passa da altura da tela (o cadastro com o
     checklist aberto passa). Entao o contentor so rola, e quem centraliza e o
     `.cartao-area`, que cresce junto e nunca estoura. Ela precisa EXISTIR no
     LoginSplit: sem ela a regra cairia no proprio cartao, que ganharia
     `min-height:100%` mais `align-items:center` e centralizaria o texto.

     `width:100%` nao e enfeite: `.lado-form` tem `place-items:center`, e
     `justify-items` tambem vale pra caixa de bloco (vira `justify-self`),
     entao sem isto o filho encolhe ate o conteudo. */
  .tc.login-split{ height:100dvh; overflow:hidden; }
  .tc .lado-form{ display:block; overflow-y:auto; }
  .tc .cartao-area{
    width:100%; min-height:100%;
    display:flex; flex-direction:column; justify-content:center; align-items:center;
  }
  .tc .cartao{ max-width:360px; }
}

"""

RESTO = u"""

/* ═══════════════ pecas do cadastro ═══════════════ */

/* Pilula turquesa em vez de texto colorido: assim a cor da marca aparece na
   cor certa, e o texto fica preto por cima. */
.tc .cad-passo-tag{
  display:inline-block; margin:0 0 var(--e-3); padding:5px 12px;
  background:var(--turquesa); color:var(--ink); border-radius:var(--r-pill);
  font-size:10.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase;
}
.tc .cad-passo-tag + .login-titulo{ margin-top:0; }
.tc .cartao h1, .tc .login-titulo{ text-wrap:balance; }
.tc .cartao__apoio, .tc .login-sub{ text-wrap:pretty; }
.tc .junto{ white-space:nowrap; }

/* ---- senha: checklist como ficha flutuante ----
   No fluxo ele empurrava ~150px e era o que estourava a tela. Flutuando sob o
   campo, aparece enquanto a pessoa digita e o resto do cartao nao se mexe.
   Cobre o campo de repetir por um instante, o que nao atrapalha: ninguem
   repete a senha antes de terminar de escrever a primeira. */
.tc .cs-senha, .tc .senha-campo{ position:relative; }
.tc .cs-reqs{
  position:absolute; top:calc(100% + 6px); left:0; right:0; z-index:20;
  list-style:none; margin:0; padding:var(--e-3) var(--e-4);
  background:var(--paper); border:1px solid var(--line); border-radius:18px;
  box-shadow:0 14px 38px rgba(17,17,17,.14);
  display:grid; gap:5px;
}
.tc .cs-req{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--ink3); transition:color 150ms var(--easing); }
.tc .cs-req-ic{ display:inline-flex; align-items:center; justify-content:center; width:15px; height:15px; flex:0 0 auto; color:var(--ink3); }
.tc .cs-req--ok{ color:#256B2A; font-weight:500; }
.tc .cs-req--ok .cs-req-ic{ color:#256B2A; }
.tc .cs-nao-bate{ margin:var(--e-2) 0 0; font-size:12.5px; color:var(--alerta); }

/* ---- aceite dos termos ---- */
/* A frase inteira numa linha so. A 13px ela estourava os 333px que sobram
   ao lado da caixinha e largava "Privacidade." sozinha embaixo. A 11.5
   sobram uns 40px de folga, que e o bastante pra aguentar a fonte de
   sistema quando a DM Sans ainda nao carregou. */
.tc .cad-aceite{
  display:flex; align-items:flex-start; gap:10px; margin-top:var(--e-5);
  font-size:11.5px; line-height:1.55; color:var(--ink2); cursor:pointer;
}
.tc .cad-aceite input{
  flex:0 0 auto; width:17px; height:17px; margin-top:1px;
  accent-color:var(--turq-texto); cursor:pointer;
}
.tc .cad-aceite a{ color:var(--turq-texto); text-decoration:underline; text-underline-offset:2px; }
.tc .cad-aceite a:hover{ color:var(--ink); }
.tc .cad-aceite--erro{ color:var(--alerta); }

/* ---- as perguntas do passo 2 ---- */
.tc .cad-dd{ margin-bottom:0; }
.tc .cad-dd .cora-dd-btn{
  width:100%; height:50px; padding:0 var(--e-5); display:flex; align-items:center;
  justify-content:space-between; gap:10px; font-size:15px; text-align:left;
  color:var(--ink3); background:var(--paper);
  border:1px solid var(--line); border-radius:var(--r-pill);
}
.tc .cad-dd .cora-dd-btn:hover{ border-color:#d2d2cb; }
.tc .cora-dd--aberto .cora-dd-btn{ border-color:var(--ink); box-shadow:0 0 0 3px rgba(17,17,17,.08); }
.tc .cad-dd--erro .cora-dd-btn{ border-color:var(--alerta); background:#fdf3f2; }
.tc .cora-dd-lista{
  padding:6px; border:1px solid var(--line); border-radius:20px;
  box-shadow:0 14px 38px rgba(17,17,17,.13);
}
.tc .cora-dd-opt{ padding:11px var(--e-4); border-radius:var(--r-pill); font-size:14.5px; color:var(--ink); }
.tc .cora-dd-opt:hover{ background:var(--wash); color:var(--ink); }
.tc .cora-dd-opt--sel{ background:var(--turquesa); color:var(--ink); font-weight:600; }

.tc .cad-voltar{
  display:block; width:100%; margin-top:var(--e-4); padding:var(--e-2);
  background:none; border:0; font-family:inherit; font-size:14px;
  color:var(--ink2); cursor:pointer;
}
.tc .cad-voltar:hover{ color:var(--ink); }

.tc .obrig{ color:var(--alerta); font-weight:600; }
.tc .login-erro{
  margin-top:var(--e-3); padding:10px var(--e-4);
  background:#FDF3F2; border:1px solid #F0D3D0; border-radius:16px;
  color:var(--alerta); font-size:13px;
}
/* Sobrou roxo em elos que o globals.css pinta por classe. Aqui eles seguem a
   mesma regra do resto: turquesa escurecido, que passa no minimo de leitura.
   `.link-botao` e o "Reenviar codigo" da tela de verificar. */
.tc .link-botao,
.tc .login-sub a,
.tc .cs-nao-bate a{
  color:var(--turq-texto); font-weight:500;
}
.tc .link-botao:hover, .tc .login-sub a:hover{ color:var(--ink); }

.tc .link-inline{
  background:none; border:0; padding:0; font-family:inherit; font-size:inherit;
  color:var(--turq-texto); text-decoration:underline; text-underline-offset:2px; cursor:pointer;
}
.tc .link-inline:hover{ color:var(--ink); }
.tc .campo-erro{ border-color:var(--alerta) !important; background:#fdf3f2 !important; }

/* ---- rotulos e campos que ainda usam as classes antigas ---- */
.tc .login-label{
  display:block; margin:var(--e-5) 0 var(--e-2);
  font-size:13px; font-weight:500; color:var(--ink2);
}
.tc .login-input{
  width:100%; height:50px; margin:0; padding:0 var(--e-5);
  font-family:inherit; font-size:15px; color:var(--ink);
  background:var(--paper); border:1px solid var(--line); border-radius:var(--r-pill);
  transition:border-color var(--tr-padrao) var(--easing), box-shadow var(--tr-padrao) var(--easing);
}
.tc .login-input::placeholder{ color:var(--ink3); }
.tc .login-input:focus{ outline:0; border-color:var(--ink); box-shadow:0 0 0 3px rgba(17,17,17,.08); }
.tc .senha-campo .login-input{ padding-right:52px; }
.tc .senha-olho{
  position:absolute; right:12px; top:50%; transform:translateY(-50%);
  width:32px; height:32px; display:grid; place-items:center;
  background:none; border:0; border-radius:50%; color:var(--ink3); cursor:pointer;
}
.tc .senha-olho:hover{ color:var(--ink); }

.tc .login-logo{ display:block; margin-bottom:var(--e-7); }
.tc .login-logo img{ height:34px; width:auto; display:block; }
.tc .login-titulo{ font-size:34px; font-weight:500; letter-spacing:-.03em; line-height:1.1; text-align:left; margin:0; }
.tc .login-sub{ margin:var(--e-2) 0 0; color:var(--ink2); font-size:14.5px; text-align:left; }
.tc .login-card{ width:100%; max-width:360px; }
.tc .login-rodape{
  margin-top:var(--e-7); padding-top:var(--e-5); border-top:1px solid var(--line);
  text-align:center; font-size:14px; color:var(--ink2);
}
.tc .login-rodape a{ color:var(--ink); font-weight:600; text-decoration:none; }
.tc .login-rodape a:hover{ text-decoration:underline; text-underline-offset:2px; }
/* O rodape que e so um elo (esqueci a senha) nao leva risco em cima. */
.tc .login-rodape + .login-rodape{ margin-top:var(--e-4); padding-top:0; border-top:0; }

/* ---- botoes: tudo lima, o roxo saiu ---- */
.tc .btn{
  width:100%; height:50px; margin-top:var(--e-6);
  display:inline-flex; align-items:center; justify-content:center;
  font-family:inherit; font-size:15px; font-weight:600; letter-spacing:-.005em;
  border:0; border-radius:var(--r-pill); cursor:pointer;
  background:var(--lima); color:var(--ink);
  transition:background-color var(--tr-padrao) var(--easing), transform 120ms var(--easing);
}
.tc .btn:hover{ background:var(--lima-esc); }
.tc .btn:active{ transform:scale(.98); }
.tc .btn:disabled{ opacity:.55; cursor:default; transform:none; }
.tc .btn--verde, .tc .btn--roxo, .tc .btn--ink{ background:var(--lima); color:var(--ink); }
.tc .btn--verde:hover, .tc .btn--roxo:hover, .tc .btn--ink:hover{ background:var(--lima-esc); }
.tc .btn--ghost{ background:transparent; border:1px solid #d2d2cb; color:var(--ink); }
.tc .btn--ghost:hover{ background:var(--wash); }

/* ═══════════════ janela baixa, SO nas telas densas ═══════════════
   `.tc--denso` entra pelo LoginSplit e vale pro cadastro e pra nova senha,
   que tem campo demais pra caber em tela baixa. O login tem dois campos e
   sobra espaco: encolher ali era so perder tamanho de graca.
   O cadastro tem seis listas obrigatorias no passo 2. So as margens nao
   bastam, entao no segundo degrau o campo tambem cede, e ainda assim para em
   38px, que continua confortavel de tocar. */
@media (min-width:900px) and (max-height:900px){
  .tc--denso .lado-form{ padding-top:var(--e-4); padding-bottom:var(--e-4); }
  .tc--denso .login-logo{ margin-bottom:var(--e-4); }
  .tc--denso .login-logo img{ height:25px; }
  .tc--denso .login-titulo, .tc .cartao h1{ font-size:24px; }
  .tc--denso .login-sub, .tc .cartao__apoio{ font-size:13.5px; }
  .tc--denso .login-label, .tc .campo label{ margin-top:var(--e-3); margin-bottom:4px; font-size:12.5px; }
  .tc--denso .login-input, .tc .campo input, .tc .cad-dd .cora-dd-btn{ height:44px; }
  .tc--denso .cad-aceite{ margin-top:var(--e-3); }
  .tc--denso .btn{ height:46px; margin-top:var(--e-4); }
  .tc--denso .login-rodape{ margin-top:var(--e-4); padding-top:var(--e-3); font-size:13.5px; }
}
@media (min-width:900px) and (max-height:790px){
  .tc--denso .lado-form{ padding-top:var(--e-3); padding-bottom:var(--e-3); }
  .tc--denso .login-logo{ margin-bottom:10px; }
  .tc--denso .login-logo img{ height:21px; }
  .tc--denso .cad-passo-tag{ font-size:10px; padding:4px 10px; margin-bottom:6px; }
  .tc--denso .login-titulo, .tc .cartao h1{ font-size:21px; }
  .tc--denso .login-sub, .tc .cartao__apoio{ font-size:12.5px; }
  .tc--denso .login-label, .tc .campo label{ margin-top:9px; margin-bottom:3px; font-size:11.5px; }
  .tc--denso .login-input, .tc .campo input, .tc .cad-dd .cora-dd-btn{ height:38px; font-size:14px; }
  .tc--denso .cora-dd-opt{ padding:8px var(--e-3); font-size:13.5px; }
  .tc--denso .cad-aceite{ margin-top:10px; font-size:11px; }
  .tc--denso .btn{ height:40px; margin-top:12px; font-size:14px; }
  .tc--denso .login-rodape{ margin-top:12px; padding-top:9px; font-size:12.5px; }
  .tc--denso .cad-voltar{ margin-top:2px; font-size:12.5px; }
  .tc--denso .cs-reqs{ padding:10px var(--e-3); }
  .tc--denso .cs-req{ font-size:12px; }
}
@media (min-width:900px) and (max-height:730px){
  .tc--denso .login-logo{ margin-bottom:8px; }
  .tc--denso .login-titulo, .tc .cartao h1{ font-size:20px; }
  .tc--denso .login-label, .tc .campo label{ margin-top:7px; margin-bottom:2px; }
  .tc--denso .login-input, .tc .campo input, .tc .cad-dd .cora-dd-btn{ height:36px; }
  .tc--denso .btn{ height:38px; margin-top:10px; }
  .tc--denso .login-rodape{ margin-top:10px; padding-top:8px; }
}
"""

MODAL = u"""

/* ============================================================================
   JANELA DE NOTA FISCAL (ModalFiscal)
   ============================================================================
   Nasce fora do `.tc` (aparece em precos, assinatura e teams), entao tem
   escopo proprio: `.mf`.

   Duas decisoes que fogem do desenho antigo, e o motivo:

     1. Os 195 paises nao cabem numa lista flutuante. Ela era recortada pela
        borda da janela, e a janela ganhava barra de rolagem propria: duas
        barras, uma cortando a outra. Aqui escolher o pais abre uma VISTA
        dentro da propria janela.
     2. Tipo de documento tem duas opcoes. Lista suspensa pra escolher entre
        CPF e CNPJ e um clique a mais pra ver o que ja caberia na tela: virou
        um par de pilulas.
   ============================================================================ */

.mf-veu{
  position:fixed; inset:0; z-index:1000; overflow-y:auto;
  background:rgba(12,12,12,.52);
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
}
/* Quem rola e o veu, nunca a janela: se a janela rolasse, a lista de paises
   ficaria presa num contentor com barra propria. E quem centraliza e o
   `.mf-centro`, que cresce junto e nunca corta o topo. */
.mf-centro{ min-height:100%; display:flex; align-items:center; justify-content:center; padding:24px; }
.mf{
  width:100%; max-width:440px;
  background:var(--paper); border-radius:28px; padding:var(--e-6);
  box-shadow:0 30px 80px rgba(12,12,12,.30);
  color:var(--ink); text-align:left;
}
.mf-marca{ margin-bottom:var(--e-5); }
.mf-marca img{ height:24px; width:auto; display:block; }
.mf h3{ font-size:26px; font-weight:500; letter-spacing:-.03em; line-height:1.15; margin:0; text-wrap:balance; }
.mf-desc{ margin:var(--e-2) 0 0; color:var(--ink2); font-size:14.5px; text-wrap:pretty; }
.mf-campo{ margin-top:var(--e-5); }
.mf-rot{ display:block; margin-bottom:var(--e-2); font-size:13px; font-weight:500; color:var(--ink2); }

.mf-escolha{
  width:100%; height:50px; padding:0 var(--e-5); display:flex; align-items:center;
  justify-content:space-between; gap:10px; font-family:inherit; font-size:15px;
  text-align:left; color:var(--ink); background:var(--paper);
  border:1px solid var(--line); border-radius:var(--r-pill); cursor:pointer;
  transition:border-color var(--tr-padrao) var(--easing), box-shadow var(--tr-padrao) var(--easing);
}
.mf-escolha:hover{ border-color:#d2d2cb; }
.mf-escolha:focus-visible{ outline:0; border-color:var(--ink); box-shadow:0 0 0 3px rgba(17,17,17,.08); }
.mf-escolha svg{ flex:0 0 auto; color:var(--ink3); }

.mf-segmento{
  display:inline-flex; gap:4px; padding:4px;
  background:var(--wash); border:1px solid var(--line); border-radius:var(--r-pill);
}
.mf-segmento button{
  padding:9px 22px; border:0; border-radius:var(--r-pill); cursor:pointer;
  font-family:inherit; font-size:14px; color:var(--ink2); background:transparent;
  transition:background-color 150ms var(--easing), color 150ms var(--easing);
}
.mf-segmento button:hover{ color:var(--ink); }
.mf-segmento button[aria-pressed="true"]{ background:var(--ink); color:#fff; font-weight:500; }

.mf-input{
  width:100%; height:50px; padding:0 var(--e-5); font-family:inherit; font-size:15px;
  color:var(--ink); background:var(--paper);
  border:1px solid var(--line); border-radius:var(--r-pill);
  transition:border-color var(--tr-padrao) var(--easing), box-shadow var(--tr-padrao) var(--easing);
}
.mf-input::placeholder{ color:var(--ink3); }
.mf-input:focus{ outline:0; border-color:var(--ink); box-shadow:0 0 0 3px rgba(17,17,17,.08); }

.mf-erro{
  margin-top:var(--e-3); padding:10px var(--e-4);
  background:#FDF3F2; border:1px solid #F0D3D0; border-radius:16px;
  color:var(--alerta); font-size:13px;
}
.mf-acoes{ display:grid; grid-template-columns:1fr 1.4fr; gap:var(--e-3); margin-top:var(--e-6); }
.mf-acoes button{
  height:50px; display:inline-flex; align-items:center; justify-content:center;
  font-family:inherit; font-size:15px; font-weight:600; letter-spacing:-.005em;
  border:0; border-radius:var(--r-pill); cursor:pointer;
  transition:background-color var(--tr-padrao) var(--easing), transform 120ms var(--easing);
}
.mf-acoes button:disabled{ opacity:.55; cursor:default; }
.mf-cancelar{ background:transparent; border:1px solid #d2d2cb !important; color:var(--ink); }
.mf-cancelar:hover{ background:var(--wash); }
.mf-seguir{ background:var(--lima); color:var(--ink); }
.mf-seguir:hover{ background:var(--lima-esc); }

/* ---- a vista de escolher pais ---- */
.mf-topo{ display:flex; align-items:center; gap:var(--e-3); margin-bottom:var(--e-4); }
.mf-voltar{
  flex:0 0 auto; width:38px; height:38px; display:grid; place-items:center;
  background:var(--wash); border:1px solid var(--line); border-radius:50%;
  color:var(--ink); cursor:pointer;
}
.mf-voltar:hover{ background:#efefeb; }
.mf-topo h3{ font-size:19px; font-weight:500; letter-spacing:-.02em; }
.mf-busca{
  width:100%; height:46px; padding:0 var(--e-5); font-family:inherit; font-size:15px;
  color:var(--ink); background:var(--paper); border:1px solid var(--line);
  border-radius:var(--r-pill);
}
.mf-busca::placeholder{ color:var(--ink3); }
.mf-busca:focus{ outline:0; border-color:var(--ink); box-shadow:0 0 0 3px rgba(17,17,17,.08); }
.mf-lista{
  margin-top:var(--e-3); max-height:min(46dvh, 380px); overflow-y:auto;
  display:grid; gap:2px; padding-right:4px;
}
.mf-lista::-webkit-scrollbar{ width:8px; }
.mf-lista::-webkit-scrollbar-thumb{ background:#d2d2cb; border-radius:100px; }
.mf-lista::-webkit-scrollbar-track{ background:transparent; }
.mf-opt{
  padding:11px var(--e-5); border:0; border-radius:var(--r-pill); width:100%;
  font-family:inherit; font-size:15px; text-align:left;
  color:var(--ink); background:transparent; cursor:pointer;
  transition:background-color 120ms var(--easing);
}
.mf-opt:hover{ background:var(--wash); }
.mf-opt--sel{ background:var(--turquesa); font-weight:600; }
.mf-vazio{ padding:var(--e-5); color:var(--ink3); font-size:14px; text-align:center; }
"""

partes = [CABECA,
          "/* \u2550\u2550\u2550 painel da esquerda \u2550\u2550\u2550 */\n",
          escopar(pc.pecas()["css"]),
          "\n\n/* \u2550\u2550\u2550 cartao \u2550\u2550\u2550 */\n",
          escopar(pc.formulario()),
          "\n\n/* \u2550\u2550\u2550 campos comuns \u2550\u2550\u2550 */\n",
          escopar(pc.campos()),
          RESTO,
          MODAL]

s = "".join(partes)
io.open(SAIDA, "w", encoding="utf-8", newline="\n").write(s)
print("telas-de-conta.css: %.1f KB" % (len(s.encode("utf-8")) / 1024))
for k in (".tc .painel", ".tc.login-split", ".tc .cs-reqs", ".tc .cad-passo-tag",
          ".tc .btn--roxo", "@keyframes correr", "@keyframes preencher"):
    print("  %-20s %s" % (k, "ok" if k in s else "FALTA"))
