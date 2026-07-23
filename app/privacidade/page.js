export const metadata = {
  title: 'Política de Privacidade — Cora Render',
};

const ATUALIZADO = '18 de julho de 2026';

export default function Privacidade() {
  return (
    <div className="legal-wrap">
      <a href="/" className="legal-voltar">← Voltar</a>

      <h1 className="legal-titulo">Política de Privacidade</h1>
      <p className="legal-data">Última atualização: {ATUALIZADO}</p>

      <p className="legal-p">
        Esta Política de Privacidade explica como o <strong>9BARRA7 STUDIO LTDA.</strong> coleta,
        usa, compartilha e protege os seus dados pessoais quando você usa o <strong>Cora Render</strong>{' '}
        (o plugin para SketchUp, o site {' '}
        <a href="https://corarender.com" className="legal-link">corarender.com</a> e os serviços
        relacionados). Ela segue a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <section className="legal-sec">
        <h2 className="legal-h2">1. Quem é o responsável pelos seus dados</h2>
        <p className="legal-p">
          O controlador dos dados é o <strong>9BARRA7 STUDIO LTDA.</strong>, inscrito no
          CNPJ nº <strong>43.879.950/0001-40</strong>, com sede na R. Vera Cruz, 152, Bairro
          Arroio Grande, Santa Cruz do Sul/RS, CEP 96.830-540.
        </p>
        <p className="legal-p">
          Para qualquer assunto relacionado a privacidade e proteção de dados, o contato é{' '}
          <a href="mailto:cora@corarender.com" className="legal-link">cora@corarender.com</a>.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">2. Quais dados coletamos</h2>
        <p className="legal-p">Coletamos apenas o necessário para oferecer e melhorar o serviço:</p>
        <ul className="legal-lista">
          <li><strong>Dados de cadastro e conta:</strong> nome, e-mail, senha (guardada de forma
            criptografada), e, conforme o caso, CPF, telefone, endereço, profissão, o renderizador
            que você usa, como conheceu o Cora Render, gênero e localização (cidade, estado e país).</li>
          <li><strong>Dados de cobrança:</strong> plano contratado, histórico de créditos e recargas.
            Os dados de pagamento (como cartão) são processados diretamente pela Stripe — o 9BARRA7
            não armazena o número do seu cartão.</li>
          <li><strong>Conteúdo de uso:</strong> as imagens e capturas do seu modelo 3D que você envia
            para renderização, as descrições/prompts, as imagens geradas, o histórico de renders,
            materiais e preferências (tema, idioma).</li>
          <li><strong>Dados técnicos:</strong> endereço IP, tipo de dispositivo e navegador, registros
            de acesso, sessões e dispositivos conectados, e tokens de autenticação.</li>
          <li><strong>Cookies e medição:</strong> cookies essenciais de login/sessão e ferramentas de
            análise e marketing (veja a seção 7).</li>
        </ul>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">3. Como e por que usamos os seus dados</h2>
        <p className="legal-p">Usamos os seus dados para as seguintes finalidades e bases legais:</p>
        <ul className="legal-lista">
          <li>Criar e gerenciar a sua conta e prestar o serviço — <em>execução de contrato</em>.</li>
          <li>Gerar renders, upscales, vídeos e demais recursos com inteligência artificial, o que
            inclui enviar as imagens e descrições necessárias aos provedores de IA — <em>execução de contrato</em>.</li>
          <li>Processar pagamentos, controlar créditos e cumprir obrigações fiscais — <em>execução de
            contrato</em> e <em>obrigação legal</em>.</li>
          <li>Enviar novidades, promoções e dicas (newsletter) — <em>legítimo interesse</em>, e você
            pode cancelar a qualquer momento.</li>
          <li>Garantir segurança, prevenir fraudes e abusos — <em>legítimo interesse</em> e <em>obrigação legal</em>.</li>
          <li>Entender o uso e melhorar o produto — <em>legítimo interesse</em>.</li>
        </ul>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">4. Com quem compartilhamos</h2>
        <p className="legal-p">
          Não vendemos os seus dados. Compartilhamos o mínimo necessário com prestadores que operam
          o serviço em nosso nome (operadores), por categoria e sempre limitados à finalidade contratada:
        </p>
        <ul className="legal-lista">
          <li><strong>Processador de pagamentos</strong> — para processar assinaturas e cobranças com segurança.</li>
          <li><strong>Provedores de inteligência artificial</strong> — para gerar imagens, vídeos e textos a partir do conteúdo que você envia.</li>
          <li><strong>Ferramentas de análise e marketing</strong> — para medir o uso e divulgar o serviço.</li>
          <li><strong>Serviço de envio de e-mails</strong> — para mensagens da conta (confirmação, recuperação de senha) e newsletter.</li>
          <li><strong>Provedores de infraestrutura e armazenamento em nuvem</strong> — hospedagem, banco de dados e guarda das imagens geradas.</li>
        </ul>
        <p className="legal-p">
          Esses prestadores tratam os dados apenas conforme as nossas instruções e não podem usá-los
          para fins próprios. Também podemos compartilhar dados quando exigido por lei, ordem judicial
          ou autoridade competente.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">5. Transferência internacional</h2>
        <p className="legal-p">
          Alguns desses prestadores estão localizados fora do Brasil (por exemplo, nos Estados Unidos
          ou na União Europeia). Quando isso acontece, adotamos salvaguardas para que os seus dados
          continuem protegidos conforme a LGPD.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">6. Por quanto tempo guardamos</h2>
        <p className="legal-p">
          Mantemos os seus dados enquanto a sua conta estiver ativa e pelo tempo necessário para cumprir
          as finalidades acima. Dados fiscais e de cobrança são guardados pelos prazos exigidos por lei.
          As imagens do seu histórico ficam disponíveis até você excluí-las ou encerrar a conta. Após os
          prazos aplicáveis, os dados são eliminados ou anonimizados.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">7. Cookies e tecnologias de rastreamento</h2>
        <p className="legal-p">
          Usamos cookies essenciais, necessários para o login e o funcionamento do site, e cookies de
          análise e marketing, usados para entender como o site é utilizado e para divulgar o serviço.
          Esses cookies são carregados por meio de um gerenciador de tags.
        </p>
        <p className="legal-p">
          <strong>Consentimento:</strong> ao acessar o site, você vê um aviso de cookies e pode
          <strong> aceitar</strong> ou <strong>recusar</strong> os cookies de análise e marketing.
          Eles só são ativados <strong>depois</strong> do seu aceite — antes disso, ficam desligados.
          Os cookies essenciais são sempre carregados, por serem necessários ao funcionamento do serviço.
        </p>
        <p className="legal-p">
          Você pode mudar sua escolha a qualquer momento, limpando os cookies do site pelo seu navegador
          (o aviso aparece de novo) ou bloqueando cookies nas configurações do navegador.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">8. Os seus direitos</h2>
        <p className="legal-p">Pela LGPD, você pode, a qualquer momento:</p>
        <ul className="legal-lista">
          <li>confirmar se tratamos os seus dados e acessá-los;</li>
          <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>pedir a portabilidade dos seus dados;</li>
          <li>obter informação sobre com quem compartilhamos;</li>
          <li>revogar consentimento e se opor a determinados tratamentos.</li>
        </ul>
        <p className="legal-p">
          Para exercer qualquer um desses direitos, escreva para{' '}
          <a href="mailto:cora@corarender.com" className="legal-link">cora@corarender.com</a>.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">9. Segurança</h2>
        <p className="legal-p">
          Adotamos medidas técnicas e organizacionais para proteger os seus dados, como conexões
          criptografadas (HTTPS), senhas guardadas de forma criptografada e controle de acesso.
          Nenhum sistema é 100% infalível, mas trabalhamos continuamente para reduzir riscos.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">10. Menores de idade</h2>
        <p className="legal-p">
          O Cora Render é voltado a profissionais e ao público adulto. Menores de 18 anos só devem
          usar o serviço com o consentimento e a supervisão dos pais ou responsáveis. Não coletamos
          intencionalmente dados de menores de 18 anos sem esse consentimento; se identificarmos um
          cadastro nessas condições, poderemos removê-lo.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">11. Alterações nesta política</h2>
        <p className="legal-p">
          Podemos atualizar esta política de tempos em tempos. Quando isso acontecer, alteramos a data
          de "última atualização" no topo e, em mudanças relevantes, avisamos pelos nossos canais.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">12. Contato</h2>
        <p className="legal-p">
          Dúvidas, pedidos ou reclamações sobre privacidade e proteção de dados:{' '}
          <a href="mailto:cora@corarender.com" className="legal-link">cora@corarender.com</a>.
        </p>
        <p className="legal-p">
          9BARRA7 STUDIO LTDA. — CNPJ 43.879.950/0001-40 — R. Vera Cruz, 152, Arroio Grande,
          Santa Cruz do Sul/RS, CEP 96.830-540.
        </p>
      </section>
    </div>
  );
}
