export const metadata = {
  title: 'Termos de Uso — Cora Render',
};

const ATUALIZADO = '19 de julho de 2026';

export default function Termos() {
  return (
    <div className="legal-wrap">
      <a href="/" className="legal-voltar">← Voltar</a>

      <h1 className="legal-titulo">Termos de Uso</h1>
      <p className="legal-data">Última atualização: {ATUALIZADO}</p>

      <p className="legal-p">
        Estes Termos de Uso regem o uso do <strong>Cora Render</strong> — o plugin para SketchUp, o
        site <a href="https://corarender.com" className="legal-link">corarender.com</a> e os serviços
        relacionados, oferecidos pelo <strong>9BARRA7 STUDIO LTDA.</strong>, CNPJ 43.879.950/0001-40
        (“O 9BARRA7”, “nós”). Ao criar uma conta ou usar o serviço, você concorda com estes Termos.
      </p>

      <section className="legal-sec">
        <h2 className="legal-h2">1. Aceitação</h2>
        <p className="legal-p">
          Para criar uma conta é obrigatório marcar que leu e aceita estes Termos de Uso e a nossa{' '}
          <a href="/privacidade" className="legal-link">Política de Privacidade</a>. Sem esse aceite, a
          conta não é criada. Se você não concorda com estes Termos, não use o serviço.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">2. O que é o Cora Render</h2>
        <p className="legal-p">
          O Cora Render é uma ferramenta que usa inteligência artificial para gerar imagens, vídeos,
          upscales e recursos relacionados a partir de modelos 3D e imagens que você fornece. Os
          resultados são gerados <strong>automaticamente por modelos de IA</strong> e, por natureza,
          podem conter erros, imprecisões, artefatos, ou se afastar do projeto original — alterando
          elementos, cores, proporções, materiais ou detalhes. Isso é uma característica esperada da
          tecnologia e não é considerado defeito do serviço.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">3. Conta e cadastro</h2>
        <p className="legal-p">
          Para usar o serviço você precisa criar uma conta com informações verdadeiras e mantê-las
          atualizadas. Você é responsável por manter a sua senha em segurança e por toda atividade
          feita na sua conta. Avise-nos imediatamente em caso de uso não autorizado. O serviço é voltado
          a profissionais e ao público adulto; menores de 18 anos só devem usá-lo com consentimento e
          supervisão dos pais ou responsáveis.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">4. Planos, créditos e pagamento</h2>
        <p className="legal-p">
          O Cora Render funciona por planos e/ou créditos. Cada geração (render, upscale, vídeo etc.)
          consome uma quantidade de créditos informada no serviço. Os pagamentos são processados pela
          Stripe; o 9BARRA7 não armazena os dados do seu cartão. Assinaturas são renovadas
          automaticamente no período contratado até que você cancele. Preços e a quantidade de créditos
          por operação podem mudar, e mudanças passam a valer a partir do próximo ciclo de cobrança.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">5. Cancelamento e reembolso</h2>
        <p className="legal-p">
          Você pode cancelar a sua assinatura a qualquer momento; o cancelamento encerra a renovação
          seguinte, e você mantém o acesso até o fim do período já pago. Conforme o art. 49 do Código de
          Defesa do Consumidor, você tem direito de arrependimento em até <strong>7 (sete) dias</strong>{' '}
          a partir da primeira contratação, com devolução do valor pago, desde que os créditos ainda não
          tenham sido utilizados. Créditos já consumidos em gerações não são reembolsáveis, por
          representarem custo de processamento efetivamente incorrido.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">6. Uso aceitável</h2>
        <p className="legal-p">Ao usar o Cora Render, você concorda em não:</p>
        <ul className="legal-lista">
          <li>enviar conteúdo ilegal, ofensivo, ou que viole direitos de terceiros (incluindo direitos
            autorais e de imagem);</li>
          <li>usar o serviço para gerar conteúdo enganoso, difamatório ou que prejudique terceiros;</li>
          <li>tentar burlar limites, créditos ou mecanismos de segurança;</li>
          <li>fazer engenharia reversa, copiar ou revender o serviço sem autorização;</li>
          <li>sobrecarregar ou interferir no funcionamento da plataforma.</li>
        </ul>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">7. Seu conteúdo e as imagens geradas</h2>
        <p className="legal-p">
          Você continua responsável pelos modelos e imagens que envia e declara ter os direitos
          necessários sobre eles. Você concede ao 9BARRA7 a autorização necessária para processar esse
          conteúdo e prestar o serviço (incluindo o envio aos provedores de IA). Ressalvado o conteúdo
          original de terceiros, você pode usar as imagens e vídeos gerados, inclusive para fins
          comerciais. Como os resultados são criados por IA, não garantimos que sejam únicos ou
          exclusivos, nem nos responsabilizamos por eventual semelhança com resultados de outros usuários.
        </p>
        <p className="legal-p">
          Ao usar o serviço, você autoriza o 9BARRA7 a usar as imagens e os vídeos gerados na
          plataforma para <strong>divulgação e promoção do Cora Render</strong> — em portfólio, site,
          redes sociais e materiais de marketing.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">8. Propriedade intelectual da plataforma</h2>
        <p className="legal-p">
          O software, a marca, o design e os demais elementos do Cora Render são de titularidade do
          9BARRA7 e protegidos por lei. Estes Termos não transferem a você qualquer direito sobre a
          plataforma além do uso permitido enquanto a sua conta estiver ativa.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">9. Disponibilidade, instabilidade e mudanças no serviço</h2>
        <p className="legal-p">
          Trabalhamos para manter o serviço no ar, mas ele pode passar por manutenções, atualizações,
          lentidão, instabilidade ou indisponibilidade temporária. Boa parte do serviço depende de
          provedores externos de IA e de infraestrutura, que estão sujeitos às próprias falhas e
          disponibilidades. Podemos alterar, adicionar ou remover funcionalidades a qualquer momento.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">10. Limitação de responsabilidade</h2>
        <p className="legal-p">
          O Cora Render é fornecido “no estado em que se encontra”, sem garantia de resultado. Na máxima
          extensão permitida em lei, o 9BARRA7 <strong>não se responsabiliza</strong> por:
        </p>
        <ul className="legal-lista">
          <li>erros, imprecisões, artefatos ou resultados inesperados gerados pela IA, nem por
            diferenças em relação ao projeto original;</li>
          <li>instabilidade, lentidão, falhas ou indisponibilidade da plataforma ou dos provedores de
            IA e de infraestrutura;</li>
          <li>quaisquer perdas ou danos decorrentes do uso ou da impossibilidade de uso do serviço,
            incluindo prejuízos financeiros, perda de trabalho, atrasos ou perda de prazos de entrega e
            perda de oportunidades;</li>
          <li>pela perda de imagens ou resultados que você não tenha salvo por conta própria — o
            histórico tem prazo de exclusão e pode passar por falhas, então guarde uma cópia de tudo
            que for importante.</li>
        </ul>
        <p className="legal-p">
          Você é responsável por revisar os resultados antes de usá-los e por manter cópias do seu
          próprio trabalho. Nada nestes Termos afasta direitos garantidos ao consumidor pela legislação
          aplicável.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">11. Suspensão e encerramento</h2>
        <p className="legal-p">
          Em caso de violação destes Termos ou da lei, o 9BARRA7 pode suspender ou{' '}
          <strong>cancelar a sua conta imediatamente e sem reembolso</strong> de valores ou créditos.
          Você também pode encerrar a sua conta quando quiser. Encerrada a conta, o acesso ao serviço e
          ao conteúdo associado pode ser removido, respeitados os prazos legais de guarda descritos na
          Política de Privacidade.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">12. Alterações nestes Termos</h2>
        <p className="legal-p">
          Podemos atualizar estes Termos de tempos em tempos. Alterações relevantes serão comunicadas
          pelos nossos canais, e a data de “última atualização” no topo será modificada. O uso continuado
          após as mudanças significa concordância com a nova versão.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">13. Lei aplicável e foro</h2>
        <p className="legal-p">
          Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro da comarca de Santa Cruz do
          Sul/RS para dirimir eventuais questões, ressalvado o direito do consumidor de acionar o foro do
          seu domicílio.
        </p>
      </section>

      <section className="legal-sec">
        <h2 className="legal-h2">14. Contato</h2>
        <p className="legal-p">
          Dúvidas sobre estes Termos ou suporte:{' '}
          <a href="mailto:cora@corarender.com" className="legal-link">cora@corarender.com</a>.
          Respondemos as solicitações de suporte em até <strong>3 (três) dias úteis</strong>.
        </p>
        <p className="legal-p">
          9BARRA7 STUDIO LTDA. — CNPJ 43.879.950/0001-40 — R. Vera Cruz, 152, Arroio Grande,
          Santa Cruz do Sul/RS, CEP 96.830-540.
        </p>
      </section>
    </div>
  );
}
