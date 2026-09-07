# -*- coding: utf-8 -*-
"""Os textos legais que saem no comprovante de aceite.

MORAM AQUI, E EM UM LUGAR SO, porque dois montadores precisam deles: a folha
A4 (montar-comprovante.py) e a janela dentro do painel de admin
(montar-admin.py). Duas copias do mesmo texto legal e a receita para uma
envelhecer sem ninguem notar, e o texto que vale numa disputa e justamente o
que estava escrito no dia.

No sistema de verdade nada disto e lido daqui: o cora-auth guarda o texto
inteiro de cada versao em `documentos_legais`, e o comprovante REPRODUZ o que
esta gravado. Isto e o modelo, para desenhar a folha.
"""

# `gravarAceite` do cora-auth roda em cima de `DOCS_LEGAIS.documentos`. Por
# isso o comprovante traz os DOIS textos, cada um com a sua data e a sua
# versao. Hoje as duas datas coincidem, mas nao precisam: um reaceite pode
# cobrir so o documento que mudou.
DOCUMENTOS = [
    dict(
        nome=u'Termos de Uso',
        versao=u'2026-09-07',
        vigor=u'7 de setembro de 2026',
        aceito=u'7 de setembro de 2026, 09h14min02s',
        clausulas='TERMOS',
    ),
    dict(
        nome=u'Política de Privacidade',
        versao=u'2026-08-14',
        vigor=u'14 de agosto de 2026',
        aceito=u'24 de agosto de 2026, 14h02min37s',
        clausulas='PRIVACIDADE',
    ),
]

CLAUSULAS = [
    (u'1. O que é o Cora Render',
     u'O Cora Render é uma ferramenta que usa inteligência artificial para gerar '
     u'imagens, vídeos, upscales e recursos relacionados a partir de modelos 3D e '
     u'imagens que você fornece. O acesso acontece pela extensão do SketchUp e pela '
     u'versão web, com a mesma conta.'),
    (u'2. Os resultados gerados',
     u'As imagens são geradas <b>automaticamente por modelos de IA</b> e, por natureza, '
     u'podem conter erros, imprecisões, artefatos, ou se afastar do projeto original, '
     u'alterando elementos, cores, proporções, materiais ou detalhes. Isso é uma '
     u'característica esperada da tecnologia e não é considerado defeito do serviço.'),
    (u'3. Créditos, planos e recarga',
     u'Cada geração consome créditos conforme a tabela vigente, publicada na página de '
     u'planos. O crédito do plano é renovado a cada ciclo. A recarga avulsa vale 6 meses '
     u'e só é usada depois que o crédito do plano acaba. Crédito não usado no ciclo não '
     u'vira dinheiro nem é transferível.'),
    (u'4. O que você envia',
     u'Você declara ter direito sobre os modelos e as imagens que envia. O Cora Render '
     u'usa esse conteúdo apenas para executar a geração que você pediu, e não o utiliza '
     u'para treinar modelos.'),
    (u'5. Cancelamento',
     u'A assinatura pode ser cancelada a qualquer momento, e o acesso continua até o fim '
     u'do período já pago. Não há multa nem fidelidade.'),
    (u'6. Foro',
     u'Fica eleito o foro da comarca de Curitiba, Paraná, para dirimir questões oriundas '
     u'destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.'),
]

PRIVACIDADE = [
    (u'1. Quem trata os seus dados',
     u'A 9BARRA7 Academy, CNPJ 43.879.950/0001-40, é a controladora dos dados pessoais '
     u'tratados no Cora Render. O contato para assuntos de privacidade é '
     u'contato@corarender.com.'),
    (u'2. O que a gente guarda',
     u'Nome, e-mail, documento fiscal e endereço, quando você informa; os dados de '
     u'cobrança tratados pelo Stripe, sem que o número do cartão passe pelos nossos '
     u'servidores; as imagens que você gera e os ajustes usados nelas; e registros '
     u'técnicos de acesso, como endereço de IP, navegador, data e hora.'),
    (u'3. Para que a gente usa',
     u'Para executar a geração que você pede, cobrar o plano contratado, dar suporte, '
     u'cumprir obrigações fiscais e melhorar o produto. <b>As suas imagens não são '
     u'usadas para treinar modelos.</b>'),
    (u'4. Por quanto tempo',
     u'Enquanto a conta estiver ativa e pelo prazo exigido por lei nos dados fiscais e '
     u'de cobrança. As imagens do seu histórico ficam disponíveis até você excluí-las '
     u'ou encerrar a conta.'),
    (u'5. Acesso do suporte à sua conta',
     u'Para investigar problemas técnicos, membros autorizados da equipe podem acessar '
     u'temporariamente a plataforma visualizando-a a partir da sua conta, <b>apenas em '
     u'modo de leitura</b>. Cada acesso dura no máximo 30 minutos, exige autenticação '
     u'individual e fica registrado com quem acessou, a conta e a data. Você pode pedir '
     u'a relação desses acessos a qualquer momento.'),
    (u'6. Os seus direitos',
     u'Você pode pedir acesso, correção, portabilidade ou eliminação dos seus dados, nos '
     u'termos da Lei nº 13.709/2018, pelos canais de atendimento.'),
]


def blocos(lista, classe='doc__cl'):
    """As clausulas de um documento, uma por bloco.

    A classe vem de fora porque as duas telas nomeiam a mesma coisa de jeitos
    diferentes: `doc__cl` na folha A4, `cmp__cl` na janela do admin.
    """
    return u''.join(
        u'<div class="%s"><h4>%s</h4><p>%s</p></div>' % (classe, t, p)
        for t, p in lista)


TEXTOS = {'TERMOS': CLAUSULAS, 'PRIVACIDADE': PRIVACIDADE}
