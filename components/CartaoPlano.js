'use client';

// ═══════════════════════════════════════════════════════════════════════════
//  O CARTÃO DE UM PLANO
//
//  Ele nasceu dentro de /precos e saiu de lá quando a tela de Assinatura
//  passou a mostrar os mesmos planos. Duas cópias do mesmo cartão viveriam
//  duas semanas em paz e depois divergiriam na primeira mudança de preço, que
//  é exatamente o erro que o comentário do `plano__cred` já conta: a frase
//  escrita à mão ficou meses prometendo 10.000 créditos no Pro enquanto o
//  servidor concedia 20.000.
//
//  Tudo que ele mostra sai de `lib/planos.js`: nome, preço, créditos, imagens
//  e a lista de recursos. Trocar um número lá muda as duas telas de uma vez,
//  nos três idiomas.
//
//  O desenho mora em `precos-pagina.css`, escopado em `.pr`, e essa folha é
//  carregada no layout, para o site inteiro. Por isso a tela de Assinatura
//  embrulha os cartões num `<div className="pr">`: ela pega o desenho
//  aprovado inteiro, com o zoom do hover e o selo do destaque, sem uma linha
//  de CSS repetida.
// ═══════════════════════════════════════════════════════════════════════════

import { useIdioma, localeDeIdioma } from '../lib/i18n';
import { descontoAnual, RESOLUCAO_ANUNCIADA } from '../lib/planos';

// O espaço entre o R$ e o número é FIXO ( ). Com espaço normal o
// responsivo quebra "R$" numa linha e "140" na outra, e um preço partido no
// meio deixa de ser um preço. Escrito com a fuga e não com o caractere solto:
// nbsp no código-fonte é invisível, e some numa colagem.
export function brl(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }
export function brlInt(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }

// Traço de 2.2, ponta redonda, herdando a cor do item. O item apagado leva um
// X mais fino, para ele não competir com os que estão ligados.
export function Check({ on }) {
  return on ? (
    <svg className="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ) : (
    <svg className="ic-check ic-check--nao" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/*
  `p`        o plano, como ele vem de `lib/planos.js`
  `anual`    mostra o preço com o desconto do ano
  `atual`    este é o plano que a pessoa já assina, então o botão vira aviso
  `rotulo`   troca o texto do botão ("Mudar para o Pro" na Assinatura)
  `aoClicar` o que fazer no botão
  `ocupado`  desliga o botão enquanto o checkout abre
*/
export default function CartaoPlano({ p, anual, atual, rotulo, aoClicar, ocupado }) {
  const { t, idioma } = useIdioma();

  let preco;
  let cobranca = '';
  let risco = '';
  if (p.mensal === 0) {
    preco = t('precos_gratis');
    cobranca = t('precos_7dias');
  } else if (anual) {
    const mes = p.mensal * (1 - descontoAnual);
    preco = brl(mes);
    cobranca = brlInt(Math.round(mes * 12)) + ' ' + t('precos_cobrado_ano');
    risco = brlInt(p.mensal);
  } else {
    preco = brlInt(p.mensal);
    cobranca = t('precos_por_mes');
  }

  return (
    <article className={'plano' + (p.destaque ? ' plano--destaque' : '') + (atual ? ' plano--atual' : '')}>
      {atual
        ? <span className="plano__selo plano__selo--atual">{t('assinatura_seu_plano')}</span>
        : p.tagKey && <span className="plano__selo">{t(p.tagKey)}</span>}

      <div className="plano__cab">
        <h2 className="plano__nome">{p.nome}</h2>
        <p className="plano__desc">{t(p.descKey)}</p>
      </div>

      <div className="plano__preco-bloco">
        <div className="plano__preco">
          {risco && <span className="plano__risco">{risco}</span>}
          <span className="plano__valor">{preco}</span>
          {p.mensal > 0 && <span className="plano__per">{t('conta_mes')}</span>}
        </div>
        <p className="plano__cobranca">{cobranca}</p>
      </div>

      {/* Os NÚMEROS saem de lib/planos.js, e não de uma frase escrita em cada
          idioma. Escritos à mão, eles ficaram meses dizendo 10.000 créditos no
          Pro enquanto o servidor concedia 20.000, e prometendo 68 imagens onde
          cabiam 35. Agora muda o crédito num lugar só e a frase acompanha, nos
          três idiomas. O Free continua com chave própria porque ele não tem
          número nenhum para contar. */}
      <div className="plano__cred">
        {p.creditos ? (
          <>
            <p className="plano__credtxt">
              {p.creditos.toLocaleString(localeDeIdioma(idioma))} {t('pl_creditos_mes')}
            </p>
            <p className="plano__credsub">
              {p.imagens.toLocaleString(localeDeIdioma(idioma))} {t('pl_imagens_em')} {RESOLUCAO_ANUNCIADA}
            </p>
          </>
        ) : (
          <>
            <p className="plano__credtxt">{t(p.creditosTxtKey)}</p>
            <p className="plano__credsub">{t(p.creditosSubKey)}</p>
          </>
        )}
      </div>

      <div className="plano__cta">
        {atual ? (
          <p className="plano__aqui">{t('assinatura_esta_aqui')}</p>
        ) : (
          /* O botão escreve o nome do plano: "Assinar Pro", e não só
             "Assinar". Com quatro cartões lado a lado isso importa, porque o
             botão passa a dizer sozinho o que faz. O Free fica de fora, o
             rótulo dele é "Testar 7 dias". */
          <button type="button" className={'btn btn--largo btn--' + p.ctaEstilo}
                  disabled={ocupado} onClick={() => aoClicar && aoClicar(p.id)}>
            {rotulo
              ? rotulo.replace('{plano}', p.nome)
              : p.mensal === 0
                ? t(p.ctaKey)
                : t('assinar_plano').replace('{plano}', p.nome)}
          </button>
        )}
      </div>

      <ul className="plano__beneficios">
        {p.feats.map((f, i) => (
          <li key={i} className={f[0] ? '' : 'esta-fora'}>
            <Check on={f[0]} />
            <span className={i === 0 && /mais:/.test(t(f[1])) ? 'plano__beneficio-topo' : ''}>{t(f[1])}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
