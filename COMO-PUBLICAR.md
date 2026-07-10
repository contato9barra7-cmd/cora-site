# Como publicar o site do Cora Render (GitHub + Vercel)

Este é o site do Cora Render feito em Next.js. Siga os passos abaixo uma vez;
depois vira rotina.

---

## Visão geral do fluxo

```
Seu computador  →  GitHub (guarda o código)  →  Vercel (publica no ar)
```

Toda vez que você mudar algo, atualiza no GitHub e o Vercel republica sozinho.

---

## PARTE 1 — Colocar o código no GitHub

### 1.1 Criar conta no GitHub
- Acesse https://github.com e crie uma conta (grátis).

### 1.2 Criar um repositório
- Clique no **+** no topo direito → **New repository**.
- Nome: `cora-site` (ou o que preferir).
- Deixe **Public** ou **Private** (tanto faz para o Vercel).
- **Não** marque "Add a README".
- Clique em **Create repository**.

### 1.3 Subir os arquivos
O jeito mais fácil sem usar terminal:
- Na página do repositório recém-criado, clique em **uploading an existing file**
  (link no meio da tela).
- Arraste **todos os arquivos e pastas** desta pasta (menos `node_modules`, que
  nem existe ainda) para a área de upload.
  - Importante: arraste o CONTEÚDO da pasta `cora-site`, não a pasta em si.
  - Os arquivos são: `app/`, `components/`, `lib/`, `public/`,
    `package.json`, `next.config.mjs`, `.gitignore`, e este guia.
- Clique em **Commit changes**.

---

## PARTE 2 — Publicar no Vercel

### 2.1 Criar conta no Vercel
- Acesse https://vercel.com e clique em **Sign Up**.
- Escolha **Continue with GitHub** (conecta as duas contas — mais fácil).

### 2.2 Importar o projeto
- No painel do Vercel, clique em **Add New… → Project**.
- Ele lista seus repositórios do GitHub. Escolha `cora-site` → **Import**.
- O Vercel detecta que é Next.js sozinho. **Não mude nada.**
- Clique em **Deploy**.
- Espere ~1 minuto. Quando terminar, ele mostra o site num endereço tipo
  `cora-site-xxxx.vercel.app`. **Já está no ar!**

---

## PARTE 3 — Ligar o domínio corarender.com

### 3.1 No Vercel
- Abra o projeto → aba **Settings → Domains**.
- Digite `corarender.com` → **Add**.
- O Vercel vai mostrar uns registros de DNS (uns valores tipo `A` e `CNAME`)
  que você precisa configurar na HostGator. **Anote/deixe essa tela aberta.**

### 3.2 Na HostGator
- Entre no painel da HostGator → área de **DNS** do domínio `corarender.com`.
- Adicione os registros que o Vercel pediu (copie exatamente os valores).
- Salve.

### 3.3 Esperar
- O DNS pode levar de alguns minutos até algumas horas para "propagar".
- Quando pronto, `corarender.com` mostra seu site. O Vercel avisa quando ativar.

> Se travar nessa parte de DNS, o suporte da HostGator (chat, em português)
> resolve rápido — é tarefa rotineira para eles.

---

## Como MUDAR o site depois

Quer trocar um preço, um texto, uma cor?

- **Preços, créditos, o que cada plano inclui:** edite só o arquivo
  `lib/planos.js`. É tudo texto simples, fácil de mexer.
- Depois de editar, suba o arquivo alterado pro GitHub (mesma tela de upload,
  ou editando direto pelo site do GitHub no lápis ✏️).
- O Vercel republica sozinho em ~1 minuto.

---

## O que já está pronto neste site

- **Página inicial** (`/`) — provisória, só um cabeçalho. Vamos preencher depois.
- **Página de preços** (`/precos`) — completa, com os 4 planos, toggle
  mensal/anual e recargas. Os botões "Assinar" ainda não fazem pagamento
  (isso é o Stripe, que a gente conecta na próxima etapa).

## Fonte da marca (opcional)

A fonte Degular Display é paga. Enquanto os arquivos dela não estiverem no
projeto, o site usa uma fonte parecida do sistema — nada quebra. Para adicionar
a Degular depois, coloque os arquivos `.woff2` numa pasta `public/fonts/` e me avise.
