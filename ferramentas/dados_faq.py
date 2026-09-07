# -*- coding: utf-8 -*-
"""As perguntas do suporte, num lugar so.

Sao as duvidas de quem JA e cliente e travou em alguma coisa, que e o que de
fato chega no suporte. O FAQ da home cobre o outro lado, de quem ainda vai
comprar ("o que e", "substitui o V-Ray"), e nao se repete aqui.

── De onde vem cada resposta ──
Nada foi inventado. Cancelamento, reembolso e direitos sobre as imagens saem
dos Termos de Uso (termos_p5, termos_p7a). O acesso do suporte sai da Politica
de Privacidade (priv_p6). Credito, plugin e dispositivos saem do FAQ da home,
que o William desenhou e o 9barra7 aprovou.

── O que esta travado ──
  · a versao do SketchUp: hoje o plugin nao carrega antes de 2023
  · o reembolso parcial: a conta do consumido nao existe no admin
Os dois estao anotados em cerebro/status.md. A frase do SketchUp nao sobe
antes de o plugin carregar la.
"""

GRUPOS = [
    (u"conta", u"Conta e acesso"),
    (u"cobranca", u"Cobrança e créditos"),
    (u"plugin", u"Plugin e compatibilidade"),
    (u"dados", u"Direitos e dados"),
]

PERGUNTAS = [
    # ── conta ────────────────────────────────────────────────────────────────
    (u"conta", u"Não consigo entrar na minha conta.",
     u"Use o link <strong>Esqueci minha senha</strong> na tela de entrada. O e-mail de "
     u"redefinição chega em poucos minutos, e vale conferir a caixa de spam. Se ele nunca "
     u"chega, pode ser que a conta esteja em outro endereço. Escreva pra gente que a gente "
     u"localiza."),

    (u"conta", u"Não recebi o e-mail de confirmação.",
     u"Confira o spam e a lixeira primeiro. E-mail corporativo costuma segurar mensagem "
     u"automática. Se não estiver lá, peça o reenvio na tela de verificação. Se ainda assim "
     u"não chegar, escreva pra gente com o endereço que você usou no cadastro."),

    (u"conta", u"Como eu troco o e-mail da conta?",
     u"O e-mail é a chave do seu acesso, então ele não muda pelo painel. Escreva pra gente "
     u"a partir do endereço antigo dizendo qual é o novo, e a gente faz a troca sem mexer "
     u"no plano, nos créditos nem no histórico."),

    (u"conta", u"Apareceu que a minha conta está em uso em outro computador.",
     u"O plugin roda em até 2 computadores, com uso em um por vez, e a versão web aceita "
     u"até 3 dispositivos. Se você trocou de máquina, remova o dispositivo antigo no painel "
     u"da sua conta e entre de novo."),

    # ── cobranca e creditos ──────────────────────────────────────────────────
    (u"cobranca", u"Posso cancelar quando quiser?",
     u"Pode, sem fidelidade, com um clique nas configurações da sua conta. O cancelamento "
     u"encerra a <strong>renovação seguinte</strong>: o plano continua valendo até o fim do "
     u"período que você já pagou, com os créditos daquele ciclo disponíveis, e depois disso "
     u"não cobra de novo. Nada é cortado no meio do caminho."),

    # O texto NAO promete automatico de proposito. Hoje a devolucao parcial e
    # uma conta feita a mao: a tabela `transacoes` diz o que foi consumido, e
    # alguem emite o reembolso parcial no Stripe. Ver cerebro/status.md.
    (u"cobranca", u"Dá para pedir reembolso?",
     u"Dá, dentro de <strong>7 dias</strong> da contratação, que é o direito de "
     u"arrependimento do art. 49 do Código de Defesa do Consumidor. O valor devolvido "
     u"desconta os créditos que você já usou, porque o processamento deles já aconteceu. "
     u"Peça nas configurações da conta ou por aqui, que a gente faz a conta e devolve."),

    (u"cobranca", u"A cobrança não passou. E agora?",
     u"A cobrança é tentada de novo automaticamente nos dias seguintes. Para resolver na "
     u"hora, abra o portal de assinatura no painel da sua conta e atualize o cartão. "
     u"A gente não guarda o número do seu cartão em momento nenhum."),

    (u"cobranca", u"Onde eu vejo as minhas faturas e recibos?",
     u"No portal de assinatura, dentro do painel da sua conta. Lá ficam o histórico de "
     u"cobranças, os recibos e a troca de cartão."),

    (u"cobranca", u"A geração falhou. Perdi o crédito?",
     u"Não. Quando a geração falha, o crédito volta pro seu saldo automaticamente. Se você "
     u"viu o saldo cair sem receber a imagem, manda o horário aproximado e o que estava "
     u"gerando que a gente confere no registro."),

    (u"cobranca", u"O meu saldo não bate com o que eu esperava.",
     u"A cota do plano volta cheia na data da sua assinatura e não acumula de um mês pro "
     u"outro. As recargas avulsas valem por 6 meses e só entram depois que os créditos do "
     u"plano acabam. Cada operação tem um custo próprio, que muda conforme a resolução."),

    # ── plugin ───────────────────────────────────────────────────────────────
    (u"plugin", u"Instalei e o Cora não aparece no SketchUp.",
     u"Abra o Gerenciador de Extensões, no menu Janela do SketchUp, e veja se o Cora Render "
     u"está na lista e habilitado. Se estiver desligado, ligue e reinicie o SketchUp. Se nem "
     u"aparecer na lista, instale o arquivo .rbz de novo pelo botão de instalar extensão."),

    # TRAVADA: hoje o plugin nao carrega antes do SketchUp 2023, por causa do
    # `class TercosOverlay < Sketchup::Overlay`. Nao subir esta frase antes de
    # o plugin carregar em 2018. Ver cerebro/status.md.
    (u"plugin", u"Em qual versão do SketchUp o plugin funciona?",
     u"No SketchUp 2018 e nas versões mais novas, tanto no Windows quanto no macOS. A versão "
     u"web roda no navegador e não depende do SketchUp: ela parte de qualquer imagem "
     u"exportada de Revit, Archicad, 3ds Max ou Promob."),

    (u"plugin", u"Preciso de um computador potente?",
     u"Para gerar, não. A parte de IA roda na nuvem, e é de lá que sai a imagem. As "
     u"ferramentas de modelagem do plugin rodam na sua máquina, mas são leves, do tipo que "
     u"o SketchUp já aguenta sem esforço."),

    # ── direitos e dados ─────────────────────────────────────────────────────
    (u"dados", u"As imagens são minhas? Posso usar comercialmente?",
     u"São suas, e pode: projeto comercial, aprovação de cliente e portfólio. A ressalva é "
     u"o conteúdo original de terceiros que você tenha colocado na cena, que continua sendo "
     u"de quem é. Como o resultado vem de IA, a gente não garante que ele seja único."),

    (u"dados", u"A equipe de suporte consegue ver a minha conta?",
     u"Para investigar um problema, uma pessoa autorizada da equipe pode abrir a sua conta "
     u"em <strong>modo de leitura</strong>, por no máximo 30 minutos. Nesse acesso não dá "
     u"para alterar dados, comprar nem gerar imagem. Todo acesso fica registrado com quem "
     u"entrou e quando, e você pode pedir essa lista a qualquer momento."),
]

# Quantas perguntas cada grupo tem. Contado, nunca escrito a mao: um numero
# cravado no texto desencontra do conteudo na primeira pergunta que entra.
def contar(chave):
    return sum(1 for g, _, _ in PERGUNTAS if g == chave)


def por_extenso(n):
    nomes = {12: u"Doze", 13: u"Treze", 14: u"Catorze", 15: u"Quinze",
             16: u"Dezesseis", 17: u"Dezessete", 18: u"Dezoito"}
    return nomes.get(n, str(n))
