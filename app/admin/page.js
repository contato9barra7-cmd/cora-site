'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import EmailAssinantes from '../../components/EmailAssinantes';
import DropdownCora from '../../components/DropdownCora';
import FichaConta from '../../components/FichaConta';
import { useIdioma } from '../../lib/i18n';
import { lerConta, adminListarAssinantes, adminDadosFiscais, adminCompras, adminFaturas, adminSincronizarStripe } from '../../lib/auth';
import PainelAceites from '../../components/PainelAceites';


function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtCpf(c) {
  if (!c || c.length !== 11) return c || '—';
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
// Célula "CPF / ID": CPF formatado (Brasil) ou o documento internacional + país.
function DocFiscal({ cpf, doc_intl, doc_pais }) {
  if (cpf && cpf.length === 11) return <span className="idcel">{fmtCpf(cpf)}</span>;
  if (doc_intl) return (
    <span className="idcel">{doc_intl}{doc_pais ? <span className="admin-pais-tag">{doc_pais}</span> : null}</span>
  );
  return <span>—</span>;
}
// Texto plano do documento (para CSV/busca).
function docFiscalTexto(o) {
  if (o.cpf && o.cpf.length === 11) return o.cpf;
  if (o.doc_intl) return o.doc_intl + (o.doc_pais ? ` (${o.doc_pais})` : '');
  return '';
}
function fmtValor(centavos, moeda) {
  if (!centavos) return '—';
  const v = (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  // Espaco fixo entre a moeda e o numero: ver a nota em precos/page.js.
  return (moeda === 'brl' || !moeda ? 'R$ ' : (moeda.toUpperCase() + ' ')) + v;
}

export default function Admin() {
  const router = useRouter();
  const { t } = useIdioma();
  const [carregando, setCarregando] = useState(true);
  const [negado, setNegado] = useState(false);
  const [assinantes, setAssinantes] = useState([]);
  const [painelFiltros, setPainelFiltros] = useState(false);

  // Paginação: com centenas de assinantes a página fica pesada e não há como
  // chegar ao fim da lista.
  const [porPag, setPorPag] = useState(50);
  const [pag, setPag]       = useState(1);
  const [busca, setBusca] = useState('');
  // Qual conta a Ficha deve abrir quando se clica numa linha da tabela.
  const [fichaAbrir, setFichaAbrir] = useState(null);
  const [aba, setAba] = useState('pagantes'); // 'pagantes' | 'trial' | 'convidados' | 'cancelados' | 'compras' | 'faturas' | 'aceites' | 'ficha'
  const [filtroData, setFiltroData] = useState('todos'); // todos | mes | 12meses | ano | periodo
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()));
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [filtroStatus, setFiltroStatus] = useState(''); // '' | vencendo | cancelado
  const [filtroProfissao, setFiltroProfissao] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [filtroRender, setFiltroRender] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPais, setFiltroPais] = useState('');
  const [verGeo, setVerGeo] = useState(false);
  const [erro, setErro] = useState('');
  const [exportando, setExportando] = useState(false);
  const [emailAberto, setEmailAberto] = useState(false);
  const [dadosFiscais, setDadosFiscais] = useState(null); // { email: {telefone, endereco} }
  const [carregandoFiscais, setCarregandoFiscais] = useState(false);
  const [verPerfil, setVerPerfil] = useState(false); // troca colunas de cobrança pelas respostas do cadastro
  const [meuId, setMeuId] = useState(null);

  // Rótulos traduzidos das respostas do cadastro (marcas ficam literais).
  const RENDER_LBL = { nao: t('adm_r_nao'), vray: 'V-Ray', corona: 'Corona', enscape: 'Enscape', lumion: 'Lumion', dhistudio: 'D5/IA', outro: t('adm_outro') };
  const PROFISSAO_LBL = { arquiteto: t('adm_p_arquiteto'), designer_interiores: t('adm_p_designer'), archviz: 'Archviz', engenheiro: t('adm_p_engenheiro'), estudante: t('adm_p_estudante'), paisagista: t('adm_p_paisagista'), outro: t('adm_outro') };
  const ORIGEM_LBL = { instagram: 'Instagram', youtube: 'YouTube', google: 'Google', indicacao: t('adm_o_indicacao'), tiktok: 'TikTok', anuncio: t('adm_o_anuncio'), outro: t('adm_outro') };
  const TAMANHO_LBL = { autonomo: t('adm_t_autonomo'), '2a5': t('adm_t_2a5'), '6a20': t('adm_t_6a20'), '20mais': t('adm_t_20mais') };
  const VOLUME_LBL = { menos10: t('adm_v_menos10'), '10a20': t('adm_v_10a20'), mais20: t('adm_v_mais20') };
  const GENERO_LBL = { feminino: t('adm_g_feminino'), masculino: t('adm_g_masculino'), nao_binario: t('adm_g_nao_binario'), nao_informar: t('adm_g_nao_informar') };

  async function mostrarFiscais() {
    if (dadosFiscais) { setDadosFiscais(null); return; } // toggle
    setCarregandoFiscais(true);
    setErro('');
    try {
      const linhas = await adminDadosFiscais();
      const mapa = {};
      linhas.forEach(l => { mapa[l.email] = { telefone: l.telefone, cep: l.cep, endereco: l.endereco }; });
      setDadosFiscais(mapa);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregandoFiscais(false);
    }
  }

  const [menuExport, setMenuExport] = useState(false);
  const [compras, setCompras] = useState([]);

  /* ── AS FATURAS ──
     Carregam quando a aba abre, e não junto com o resto. A rota vai ao Stripe
     e pagina até quatro vezes: pendurar isso na abertura do admin faria toda
     visita pagar por uma tela que nem sempre é a que se veio ver. */
  const [faturas, setFaturas] = useState(null);   // null = ainda não pedi
  const [avisoFaturas, setAvisoFaturas] = useState(null);
  const [buscandoFaturas, setBuscandoFaturas] = useState(false);

  useEffect(() => {
    if (aba !== 'faturas' || faturas !== null || buscandoFaturas) return;
    setBuscandoFaturas(true);
    adminFaturas()
      .then((d) => { setFaturas(d.faturas); setAvisoFaturas(d.aviso); })
      .catch((e) => { setFaturas([]); setAvisoFaturas(e.message); })
      .finally(() => setBuscandoFaturas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  const faturasFiltradas = (faturas || []).filter((f) => {
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return [f.nome, f.email, f.numero, f.descricao]
      .some((v) => (v || '').toLowerCase().includes(q));
  });

  // O total só conta o que foi PAGO. Somar fatura em aberto seria anunciar
  // dinheiro que ainda não entrou.
  const totalFaturas = faturasFiltradas
    .filter((f) => f.status === 'paga')
    .reduce((soma, f) => soma + (f.total_centavos || 0), 0);

  function exportarFaturas() {
    setMenuExport(false);
    baixarCSV('faturas',
      [t('adm_h_data'), t('adm_h_numero'), t('adm_h_tipo_cobranca'), t('adm_h_comprador'),
       t('adm_csv_email'), t('adm_h_compra'), t('adm_status'), t('adm_csv_valor_rs')],
      faturasFiltradas.map((f) => [
        fmtData(f.data),
        f.numero || '—',
        f.origem === 'recarga' ? t('adm_fat_recarga') : t('adm_fat_plano'),
        f.nome || '—',
        f.email || '—',
        f.descricao || '—',
        f.status === 'paga' ? t('pn_paga') : t('pn_aberta'),
        ((f.total_centavos || 0) / 100).toFixed(2).replace('.', ','),
      ]));
  }

  useEffect(() => {
    // catch com log (não vazio): uma falha em compras/sincronização deixava a
    // aba Recargas vazia sem nenhum sinal, e o admin concluía "não houve compra"
    // sobre dados que na verdade não carregaram.
    adminCompras().then(setCompras).catch((e) => { console.error('[admin] compras:', e); });
    // sincroniza os valores com o Stripe em segundo plano (sem travar a tela)
    adminSincronizarStripe()
      .then((n) => { if (n > 0) carregar(); })
      .catch((e) => { console.error('[admin] sincronizar stripe:', e); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sincronizando, setSincronizando] = useState(false);

  async function sincronizarStripe() {
    setSincronizando(true); setErro('');
    try {
      const n = await adminSincronizarStripe();
      await carregar();
      setErro(n > 0 ? `${n} ${t('adm_sync_ok_a')}` : t('adm_nada_sincronizar'));
    } catch (e) { setErro(e.message); }
    finally { setSincronizando(false); }
  }

  function limparFiltros() {
    setFiltroData('todos');
    setAnoFiltro(String(new Date().getFullYear()));
    setDataDe(''); setDataAte('');
    setFiltroStatus('');
    setFiltroProfissao(''); setFiltroOrigem(''); setFiltroRender('');
    setFiltroEstado(''); setFiltroPais('');
  }

  // Campos como telefone, CPF e CEP são numéricos mas devem virar TEXTO no Excel,
  // senão ele converte para notação científica (ex: 5,552E+12).
  const COLUNAS_TEXTO = ['telefone', 'cpf', 'cep'];

  // Relatório geográfico: agrupa por estado (BR) e por país.
  // A receita é toda exibida como R$ e não há câmbio: somar centavos de moedas
  // diferentes (USD + BRL) num único total inflava o valor. Então a RECEITA
  // conta só linhas em BRL (número honesto); a CONTAGEM de clientes inclui todos.
  const ehBRL = (a) => (a.moeda || 'brl').toString().toLowerCase() === 'brl';
  function relatorioGeo() {
    const pagantes = assinantes.filter(a => a.id !== meuId && !a.eh_convidado && !a.eh_trial);
    const totalClientes = pagantes.length;
    const totalValor = pagantes.reduce((s, a) => s + (ehBRL(a) ? (a.valor_centavos || 0) : 0), 0);

    const agrupa = (campo) => {
      const mapa = {};
      pagantes.forEach(a => {
        const k = (a[campo] || '').toUpperCase() || '—';
        if (!mapa[k]) mapa[k] = { n: 0, valor: 0 };
        mapa[k].n += 1;
        mapa[k].valor += (ehBRL(a) ? (a.valor_centavos || 0) : 0);
      });
      return Object.entries(mapa)
        .map(([k, v]) => ({
          chave: k,
          n: v.n,
          valor: v.valor,
          pctClientes: totalClientes ? Math.round((v.n / totalClientes) * 100) : 0,
          pctValor: totalValor ? Math.round((v.valor / totalValor) * 100) : 0,
        }))
        .sort((a, b) => b.n - a.n);
    };
    return {
      paises:  agrupa('pais'),
      estados: agrupa('estado'),
      cidades: agrupa('cidade'),
      totalClientes, totalValor
    };
  }

  const geo = relatorioGeo();

  function exportarGeo() {
    setMenuExport(false);
    if (!geo.totalClientes) { setErro(t('adm_sem_geo')); return; }
    const linhas = [];
    geo.paises.forEach(p => linhas.push([
      t('adm_csv_pais'), p.chave, p.n, `${p.pctClientes}%`,
      ((p.valor || 0) / 100).toFixed(2), `${p.pctValor}%`,
    ]));
    geo.estados.forEach(e => linhas.push([
      t('adm_csv_estado'), e.chave, e.n, `${e.pctClientes}%`,
      ((e.valor || 0) / 100).toFixed(2), `${e.pctValor}%`,
    ]));
    geo.cidades.forEach(c => linhas.push([
      t('adm_csv_cidade'), c.chave, c.n, `${c.pctClientes}%`,
      ((c.valor || 0) / 100).toFixed(2), `${c.pctValor}%`,
    ]));
    baixarCSV('origem-geografica',
      [t('adm_csv_tipo'), t('adm_csv_local'), t('adm_csv_clientes'), t('adm_csv_pct_clientes'), t('adm_csv_receita'), t('adm_csv_pct_receita')],
      linhas);
  }

  function baixarCSV(nomeArq, cabecalho, linhas) {
    const idxTexto = cabecalho
      .map((c, i) => COLUNAS_TEXTO.includes(String(c).toLowerCase().trim()) ? i : -1)
      .filter(i => i >= 0);
    const esc = (v, i) => {
      let raw = String(v ?? '');
      // Anti-injeção de fórmula: célula começando com = + - @ (ou TAB/CR) é
      // avaliada como fórmula pelo Excel/LibreOffice. Nome/endereço vêm do
      // cadastro do usuário — um "=HYPERLINK(...)" exfiltraria dados no PC do
      // admin. Prefixa com apóstrofo para forçar texto (só quando não é uma
      // coluna já protegida com ="...").
      if (raw && !idxTexto.includes(i) && /^[=+\-@\t\r]/.test(raw)) raw = "'" + raw;
      const s = raw.replace(/"/g, '""');
      // ="valor" faz o Excel tratar como texto puro
      if (idxTexto.includes(i) && s) return `="${s}"`;
      return `"${s}"`;
    };
    const corpo = linhas.map(l => l.map((v, i) => esc(v, i)).join(';'));
    const csv = '﻿' + [cabecalho.map(c => `"${c}"`).join(';'), ...corpo].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const hoje = new Date().toISOString().slice(0, 10);
    link.download = `cora-${nomeArq}-${hoje}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportarFiscais() {
    setMenuExport(false); setExportando(true); setErro('');
    try {
      // Usa os MESMOS dados da tela (que já têm valor/plano/assentos)
      // e completa com telefone/CEP/endereço vindos do Stripe.
      const pagantes = assinantes.filter(a =>
        a.id !== meuId && !a.eh_convidado && !a.eh_trial
      );
      if (!pagantes.length) { setErro(t('adm_sem_assinante_export')); return; }

      let mapa = dadosFiscais;
      if (!mapa) {
        const linhas = await adminDadosFiscais();
        mapa = {};
        linhas.forEach(l => { mapa[l.email] = { telefone: l.telefone, cep: l.cep, endereco: l.endereco }; });
      }

      baixarCSV('assinantes-fiscais',
        [t('adm_csv_nome'), t('adm_csv_email'), t('adm_h_cpfid'), t('adm_h_telefone'), t('adm_h_cep'), t('adm_h_endereco'), t('adm_csv_cidade'), t('adm_csv_estado'), t('adm_csv_pais'), t('adm_h_plano'), t('adm_csv_assentos'), t('adm_csv_assinou_em'), t('adm_csv_renova_em'), t('adm_csv_renovacoes'), t('adm_csv_valor_rs')],
        pagantes.map(a => [
          a.nome, a.email, docFiscalTexto(a),
          mapa[a.email]?.telefone || '',
          mapa[a.email]?.cep || '',
          mapa[a.email]?.endereco || '',
          a.cidade || '', a.estado || '', a.pais || '',
          a.eh_dono_equipe ? `Teams (${a.plano_exibicao === 'teams' ? t('adm_equipe_l') : a.plano})` : a.plano,
          a.assentos || 1,
          a.assinou_em ? new Date(a.assinou_em).toLocaleDateString('pt-BR') : '',
          a.renova_em ? new Date(a.renova_em).toLocaleDateString('pt-BR') : '',
          a.renovacoes || 0,
          ((a.valor_centavos || 0) / 100).toFixed(2),
        ]));
    } catch (e) { setErro(e.message); } finally { setExportando(false); }
  }

  async function exportarRecargas() {
    setMenuExport(false);
    if (!compras.length) { setErro(t('adm_sem_recarga_export')); return; }
    setExportando(true); setErro('');
    try {
      // busca telefone/CEP/endereço no Stripe para completar os dados fiscais
      let mapa = dadosFiscais;
      if (!mapa) {
        const linhas = await adminDadosFiscais();
        mapa = {};
        linhas.forEach(l => { mapa[l.email] = { telefone: l.telefone, cep: l.cep, endereco: l.endereco }; });
      }
      baixarCSV('recargas-fiscais',
        [t('adm_h_data'), t('adm_h_comprador'), t('adm_csv_email'), t('adm_h_cpfid'), t('adm_h_telefone'), t('adm_h_cep'), t('adm_h_endereco'), t('adm_h_compra'), t('adm_h_creditos'), t('adm_h_destino'), t('adm_csv_valor_rs')],
        compras.map(c => [
          c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '',
          c.nome, c.email, docFiscalTexto(c),
          mapa[c.email]?.telefone || '',
          mapa[c.email]?.cep || '',
          mapa[c.email]?.endereco || '',
          c.descricao, c.creditos,
          (c.destino_email && c.destino_email !== c.email) ? c.destino_email : '',
          ((c.valor_centavos || 0) / 100).toFixed(2),
        ]));
    } catch (e) { setErro(e.message); } finally { setExportando(false); }
  }

  function exportarTrafego(tipo) {
    setMenuExport(false);
    const base = assinantes.filter(a => a.id !== meuId);
    let lista, nome;
    if (tipo === 'assinantes') { lista = base.filter(a => !a.eh_convidado && !a.eh_trial); nome = 'trafego-assinantes'; }
    else if (tipo === 'trial') { lista = base.filter(a => a.eh_trial); nome = 'trafego-trial'; }
    else { lista = base.filter(a => a.eh_convidado); nome = 'trafego-membros'; }
    if (!lista.length) { setErro(t('adm_sem_conta_categoria')); return; }
    baixarCSV(nome,
      [t('adm_csv_nome'), t('adm_csv_email'), t('adm_h_genero'), t('adm_profissao'), t('adm_h_origem'), t('adm_renderizador'), t('adm_h_tamanho'), t('adm_h_projetos'), t('adm_h_cadastro')],
      lista.map(a => [
        a.nome, a.email,
        GENERO_LBL[a.genero] || a.genero || '',
        PROFISSAO_LBL[a.profissao] || a.profissao,
        ORIGEM_LBL[a.origem] || a.origem,
        RENDER_LBL[a.usa_render] || a.usa_render,
        TAMANHO_LBL[a.tamanho] || a.tamanho,
        VOLUME_LBL[a.volume] || a.volume,
        a.criado_em ? new Date(a.criado_em).toLocaleDateString('pt-BR') : '',
      ]));
  }

  async function exportarContador() {
    // mantida por compatibilidade — chama a fiscal
    return exportarFiscais();
  }

  useEffect(() => {
    const c = lerConta();
    if (!c) { router.push('/login'); return; }
    setMeuId(c.id);
    carregar();
  }, [router]);

  async function carregar() {
    setErro('');
    try {
      const lista = await adminListarAssinantes();
      setAssinantes(lista);
      setCarregando(false);
    } catch (e) {
      // só nega acesso se for realmente permissão; senão mostra o erro real
      const msg = (e.message || '').toLowerCase();
      if (msg.includes('admin') || msg.includes('permiss') || msg.includes('acesso') || msg.includes('401') || msg.includes('403')) {
        setNegado(true);
      } else {
        setErro(t('promp_erro_carregar') + ' ' + e.message);
      }
      setCarregando(false);
    }
  }




  // Trocar de aba, filtrar ou buscar recomeça da primeira página: continuar na
  // página 7 de uma lista que agora tem 2 mostraria uma tela vazia.
  useEffect(() => { setPag(1); }, [aba, busca, filtroData, anoFiltro, dataDe, dataAte,
    filtroStatus, filtroProfissao, filtroOrigem, filtroRender, filtroEstado, filtroPais]);

  if (carregando) return <AppShell><div className="admin-wrap"><p>{t('comum_carregando')}</p></div></AppShell>;

  if (negado) {
    return (
      <AppShell>
      <div className="admin-wrap">
        <h1>{t('promp_acesso_restrito')}</h1>
        <p>{t('adm_area_admins')}</p>
        <Link href="/conta" className="btn btn--roxo" style={{ width: 'auto', display: 'inline-block', padding: '10px 22px' }}>
          {t('promp_voltar_conta')}
        </Link>
      </div>
      </AppShell>
    );
  }

  const filtrados = assinantes.filter(a => {
    if (a.id === meuId) return false; // não mostra a própria conta admin
    // separa por aba
    if (aba === 'convidados') { if (!a.eh_convidado) return false; }
    else if (aba === 'trial') { if (!a.eh_trial) return false; }
    else if (aba === 'pagantes') { if (a.eh_convidado || a.eh_trial || a.assinatura_status === 'cancelado') return false; }
    else if (aba === 'cancelados') { if (a.eh_convidado || a.eh_trial || a.assinatura_status !== 'cancelado') return false; }
    // filtro de data
    if (!passaFiltroData(a)) return false;
    // status (quase vencendo / cancelado)
    if (filtroStatus === 'vencendo') {
      const ref = a.renova_em || a.expira_em;
      if (!ref) return false;
      const dias = (new Date(ref) - new Date()) / (1000 * 60 * 60 * 24);
      if (dias < 0 || dias > 7) return false;
    }
    if (filtroStatus === 'cancelado' && a.assinatura_status !== 'cancelado') return false;
    // filtros de perfil (trial)
    if (filtroProfissao && a.profissao !== filtroProfissao) return false;
    if (filtroOrigem && a.origem !== filtroOrigem) return false;
    if (filtroRender && a.usa_render !== filtroRender) return false;
    if (filtroEstado && (a.estado || '').toUpperCase() !== filtroEstado) return false;
    if (filtroPais && (a.pais || '').toUpperCase() !== filtroPais) return false;
    // busca textual
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return (a.nome || '').toLowerCase().includes(q)
      || (a.email || '').toLowerCase().includes(q)
      || (a.cpf || '').includes(q)
      || (a.doc_intl || '').toLowerCase().includes(q)
      || (a.doc_pais || '').toLowerCase().includes(q);
  }).sort((a, b) => {
    // na aba de membros, agrupa por equipe (mesmo time junto)
    if (aba === 'convidados') {
      const ea = (a.equipe_participa_nome || '').toLowerCase();
      const eb = (b.equipe_participa_nome || '').toLowerCase();
      if (ea !== eb) return ea < eb ? -1 : 1;
    }
    return 0;
  });

  // ── Os filtros ligados ──
  const chipsAtivos = [
    filtroData !== 'todos' && {
      chave: 'data',
      rotulo: { mes: t('adm_este_mes'), '12meses': t('adm_ult12'),
                ano: `${t('adm_ano')} ${anoFiltro}`, periodo: t('adm_intervalo_c') }[filtroData] || t('adm_periodo'),
      limpar: () => { setFiltroData('todos'); setDataDe(''); setDataAte(''); }
    },
    filtroStatus && {
      chave: 'status',
      rotulo: filtroStatus === 'vencendo' ? t('adm_quase_vencendo') : t('adm_cancelados_c'),
      limpar: () => setFiltroStatus('')
    },
    filtroProfissao && {
      chave: 'prof',
      rotulo: PROFISSAO_LBL[filtroProfissao] || filtroProfissao,
      limpar: () => setFiltroProfissao('')
    },
    filtroOrigem && {
      chave: 'origem',
      rotulo: t('adm_origem_p') + ' ' + filtroOrigem,
      limpar: () => setFiltroOrigem('')
    },
    filtroRender && {
      chave: 'render',
      rotulo: t('adm_render_p') + ' ' + filtroRender,
      limpar: () => setFiltroRender('')
    },
    filtroPais && {
      chave: 'pais',
      rotulo: t('adm_pais_p') + ' ' + filtroPais,
      limpar: () => setFiltroPais('')
    },
    filtroEstado && {
      chave: 'estado',
      rotulo: t('adm_estado_p') + ' ' + filtroEstado,
      limpar: () => setFiltroEstado('')
    }
  ].filter(Boolean);

  const nFiltros = chipsAtivos.length;

  // O total da aba, SEM filtro: é a régua contra a qual "9 de 43" faz sentido.
  // 'pagantes' e 'cancelados' são conjuntos DISJUNTOS (status cancelado ou não);
  // o else genérico contava ativos+cancelados juntos, inflando o "de Y" na aba
  // Cancelados (mostrava '3 de 43' em vez de '3 de 3').
  const totalAba = assinantes.filter((a) => {
    if (a.id === meuId) return false;
    if (aba === 'convidados') return !!a.eh_convidado;
    if (aba === 'trial')      return !!a.eh_trial;
    if (aba === 'cancelados') return !a.eh_convidado && !a.eh_trial && a.assinatura_status === 'cancelado';
    if (aba === 'pagantes')   return !a.eh_convidado && !a.eh_trial && a.assinatura_status !== 'cancelado';
    return !a.eh_convidado && !a.eh_trial;
  }).length;

  const nPags   = Math.max(1, Math.ceil(filtrados.length / porPag));
  const pagAtual = Math.min(pag, nPags);   // filtrar pode encolher a lista sob os pés
  const pagina  = filtrados.slice((pagAtual - 1) * porPag, pagAtual * porPag);
  const mostrarPerfil   = (aba === 'trial' || verPerfil);
  const mostrarCobranca = (aba === 'pagantes' && !verPerfil);

  const totalConvidados = assinantes.filter(a => a.eh_convidado && a.id !== meuId).length;
  const totalTrial = assinantes.filter(a => a.eh_trial && a.id !== meuId).length;
  // contas "reais" = exclui a própria conta admin e os convidados de equipe
  const contasReais = assinantes.filter(a => a.id !== meuId && !a.eh_convidado);
  const totalContas = contasReais.length;
  const pagos = contasReais.filter(a => (a.plano !== 'free' || a.eh_dono_equipe) && a.status === 'ativo' && a.assinatura_status !== 'cancelado').length;
  const totalCancelados = contasReais.filter(a => a.assinatura_status === 'cancelado').length;

  // filtro de data (aplicado sobre assinou_em pra pagantes, criado_em pra trial)
  function passaFiltroData(a) {
    if (filtroData === 'todos') return true;
    const campo = aba === 'trial' ? a.criado_em : (a.assinou_em || a.criado_em);
    if (!campo) return filtroData === 'todos';
    const d = new Date(campo);
    const agora = new Date();
    if (filtroData === 'mes') {
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    }
    if (filtroData === '12meses') {
      const limite = new Date(); limite.setMonth(limite.getMonth() - 12);
      return d >= limite;
    }
    if (filtroData === 'ano') {
      return d.getFullYear() === parseInt(anoFiltro, 10);
    }
    if (filtroData === 'periodo') {
      const de = dataDe ? new Date(dataDe) : null;
      const ate = dataAte ? new Date(dataAte + 'T23:59:59') : null;
      if (de && d < de) return false;
      if (ate && d > ate) return false;
      return true;
    }
    return true;
  }

  return (
    <AppShell>
    {/* `ad` é a classe da página. O desenho aprovado do admin vive em
        admin-pagina.css, escopado nela: assim ele ganha do molde antigo por
        especificidade, sem `!important`, e nada dele vaza para o resto do
        site. A folha é GERADA a partir de ferramentas/admin.html, que é o
        artefato. Mexer no desenho é mexer lá e rodar o gerador, nunca editar
        a folha. */}
    <div className="ad">
    <div className="admin-wrap">
      {/* A mesma cabeça de Minha conta e Assinatura: olho, nome grande e uma
          linha de apoio. Os números ficam na linha, e não em pastilhas: a
          tela já tem pastilha demais sendo botão, campo e selo. */}
      <div className="adm-cabeca">
        <div className="conta-cabeca">
          <div className="conta-cabeca__txt">
            <p className="eyebrow">{t('adm_eyebrow')}</p>
            <h1 className="conta-cabeca__nome">{t('adm_titulo')}</h1>
            <p className="conta-cabeca__email">
              {totalContas} {t('adm_contas')}, {pagos} {t('adm_medida_pago')} {t('adm_e')} {totalTrial} {t('adm_medida_teste')}.
            </p>
          </div>
        </div>
        <div className="adm-acoes">
          <button className="as-btn-cta" style={{ height: 44 }} onClick={() => setEmailAberto(true)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 6l8 6 8-6" /></svg>
            {t('promp_enviar_email')}
          </button>
          <button
            className={'adm-ico' + (dadosFiscais ? ' adm-ico--on' : '')}
            onClick={mostrarFiscais}
            disabled={carregandoFiscais}
            data-tip={dadosFiscais ? t('adm_ocultar_fiscais') : t('adm_ver_fiscais')}
            aria-label={dadosFiscais ? t('adm_ocultar_fiscais') : t('adm_ver_fiscais')}
          >
            {carregandoFiscais ? (
              <span className="adm-girando" />
            ) : (
              <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <path d="M5 2.5h7l3 3v12H5z" strokeLinejoin="round"/>
                <path d="M12 2.5v3h3M7.5 9h5M7.5 12h5M7.5 15h3" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          <button
            className={'adm-ico' + (verPerfil ? ' adm-ico--on' : '')}
            onClick={() => setVerPerfil(v => !v)}
            data-tip={verPerfil ? t('adm_ver_cobranca') : t('adm_ver_cadastro')}
            aria-label={verPerfil ? t('adm_ver_cobranca') : t('adm_ver_cadastro')}
          >
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <path d="M7 4h9M7 10h9M7 16h9" strokeLinecap="round"/>
              <circle cx="3.5" cy="4" r="1.2"/>
              <circle cx="3.5" cy="10" r="1.2"/>
              <circle cx="3.5" cy="16" r="1.2"/>
            </svg>
          </button>

          {geo.totalClientes > 0 && (
            <button
              className={'adm-ico' + (verGeo ? ' adm-ico--on' : '')}
              onClick={() => setVerGeo(true)}
              data-tip={t('adm_origem_geo')}
              aria-label={t('adm_origem_geo')}
            >
              <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 10-11 0c0 4.4 5.5 9 5.5 9z" strokeLinejoin="round"/>
                <circle cx="10" cy="8.5" r="2"/>
              </svg>
            </button>
          )}

          <div className="adm-export">
            <button
              className={'adm-ico' + (menuExport ? ' adm-ico--on' : '')}
              onClick={() => setMenuExport(!menuExport)}
              disabled={exportando}
              data-tip={t('adm_exportar_csv')}
              aria-label={t('adm_exportar_csv')}
            >
              {exportando ? (
                <span className="adm-girando" />
              ) : (
                <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
                     stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 2.5v10m0 0l-3.5-3.5M10 12.5l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.5 14.5v2a1 1 0 001 1h11a1 1 0 001-1v-2" strokeLinecap="round"/>
                </svg>
              )}
            </button>
            {menuExport && (
              <div className="adm-export__menu" onMouseLeave={() => setMenuExport(false)}>

                <div className="adm-export__grupo">{t('adm_grupo_fiscal')}</div>

                <button className="adm-export__item" onClick={exportarFiscais}>
                  <strong>{t('adm_exp_assinantes')}</strong>
                  <em>{t('adm_exp_assinantes_d')}</em>
                </button>

                <button className="adm-export__item" onClick={exportarRecargas}>
                  <strong>{t('adm_exp_recargas')}</strong>
                  <em>{t('adm_exp_recargas_d')}</em>
                </button>

                <button className="adm-export__item" onClick={exportarFaturas}
                        disabled={!faturas || !faturas.length}>
                  <strong>{t('adm_exp_faturas')}</strong>
                  <em>{t('adm_exp_faturas_d')}</em>
                </button>

                <div className="adm-export__sep" />
                <div className="adm-export__grupo">{t('adm_grupo_trafego')}</div>

                <button className="adm-export__item" onClick={() => exportarTrafego('assinantes')}>
                  <strong>{t('adm_exp_assinantes')}</strong>
                  <em>{t('adm_exp_traf_assinantes_d')}</em>
                </button>

                <button className="adm-export__item" onClick={() => exportarTrafego('membros')}>
                  <strong>{t('adm_exp_membros')}</strong>
                </button>

                <button className="adm-export__item" onClick={() => exportarTrafego('trial')}>
                  <strong>{t('adm_exp_trial')}</strong>
                </button>

                <button className="adm-export__item" onClick={exportarGeo}>
                  <strong>{t('adm_origem_geo')}</strong>
                  <em>{t('adm_exp_geo_d')}</em>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {erro && <div className="login-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      {verGeo && geo.totalClientes > 0 && (
        <div className="cr-overlay cr-overlay--alto" onClick={() => setVerGeo(false)}>
          <div className="adm-geo-janela" onClick={(e) => e.stopPropagation()}>

            <div className="adm-geo-cab-j">
              <div>
                <strong>{t('adm_origem_geo')}</strong>
                <span>
                  {geo.totalClientes} {geo.totalClientes === 1 ? t('adm_cliente') : t('adm_clientes')}
                  {' · '}{fmtValor(geo.totalValor, 'brl')}{t('adm_por_mes')}
                </span>
              </div>

              <div className="adm-geo-cab-acoes">
                <button className="adm-btn-linha" onClick={exportarGeo}>
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                       stroke="currentColor" strokeWidth="1.6">
                    <path d="M10 3v9m0 0l-3-3m3 3l3-3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 15v2h12v-2" strokeLinecap="round"/>
                  </svg>
                  CSV
                </button>

                <button className="cr-modal-x" onClick={() => setVerGeo(false)} aria-label={t('ws_fechar')}>
                  <svg viewBox="0 0 20 20" width="18" height="18" fill="none"
                       stroke="currentColor" strokeWidth="1.6">
                    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="adm-geo-scroll">
    <div className="adm-geo-corpo">

                  <div className="adm-geo">
                    <div className="adm-geo-sub">{t('adm_por_pais')}</div>
                    {geo.paises.map(p => (
                      <div key={p.chave} className="adm-geo-linha">
                        <div className="adm-geo-cab">
                          <span className="adm-geo-k">{p.chave}</span>
                          <span className="adm-geo-v">
                            {p.n} · <b>{fmtValor(p.valor, 'brl')}</b>
                          </span>
                        </div>
                        <div className="adm-geo-barra">
                          <div className="adm-geo-fill admin-geo-fill--n"
                               style={{ width: `${p.pctClientes}%` }} />
                          <div className="adm-geo-fill admin-geo-fill--r"
                               style={{ width: `${p.pctValor}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="adm-geo-cols">
                    <div className="adm-geo">
                      <div className="adm-geo-sub">{t('adm_por_estado')}</div>
                      {geo.estados.map(e => (
                        <div key={e.chave} className="adm-geo-linha">
                          <div className="adm-geo-cab">
                            <span className="adm-geo-k">{e.chave}</span>
                            <span className="adm-geo-v">
                              {e.n} · <b>{fmtValor(e.valor, 'brl')}</b>
                            </span>
                          </div>
                          <div className="adm-geo-barra">
                            <div className="adm-geo-fill admin-geo-fill--n"
                                 style={{ width: `${e.pctClientes}%` }} />
                            <div className="adm-geo-fill admin-geo-fill--r"
                                 style={{ width: `${e.pctValor}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="adm-geo">
                      <div className="adm-geo-sub">{t('adm_por_cidade')}</div>
                      {geo.cidades.map(c => (
                        <div key={c.chave} className="adm-geo-linha">
                          <div className="adm-geo-cab">
                            <span className="adm-geo-k">{c.chave}</span>
                            <span className="adm-geo-v">
                              {c.n} · <b>{fmtValor(c.valor, 'brl')}</b>
                            </span>
                          </div>
                          <div className="adm-geo-barra">
                            <div className="adm-geo-fill admin-geo-fill--n"
                                 style={{ width: `${c.pctClientes}%` }} />
                            <div className="adm-geo-fill admin-geo-fill--r"
                                 style={{ width: `${c.pctValor}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="adm-geo-legenda">
                    <span><i className="adm-geo-p admin-geo-p--n" />{t('adm_legenda_clientes')}</span>
                    <span><i className="adm-geo-p admin-geo-p--r" />{t('adm_legenda_receita')}</span>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      <div className="adm-abas" role="tablist">
        <button className={'adm-aba' + (aba === 'pagantes' ? ' ativa' : '')} onClick={() => setAba('pagantes')}>
          {t('adm_aba_assinantes')} <b>{pagos}</b>
        </button>
        <button className={'adm-aba' + (aba === 'trial' ? ' ativa' : '')} onClick={() => setAba('trial')}>
          {t('adm_aba_trial')} <b>{totalTrial}</b>
        </button>
        <button className={'adm-aba' + (aba === 'convidados' ? ' ativa' : '')} onClick={() => setAba('convidados')}>
          {t('adm_aba_membros')} <b>{totalConvidados}</b>
        </button>
        <button className={'adm-aba' + (aba === 'cancelados' ? ' ativa' : '')} onClick={() => setAba('cancelados')}>
          {t('adm_aba_cancelados')} <b>{totalCancelados}</b>
        </button>
        <button className={'adm-aba' + (aba === 'compras' ? ' ativa' : '')} onClick={() => setAba('compras')}>
          {t('adm_aba_recargas')} <b>{compras.length}</b>
        </button>
        {/* Recargas é a nossa tabela. Faturas é ela MAIS o que só existe no
            Stripe, que é o que faltava para o dono conferir um mês inteiro
            sem abrir dois painéis. */}
        <button className={'adm-aba' + (aba === 'faturas' ? ' ativa' : '')} onClick={() => setAba('faturas')}>
          {t('adm_aba_faturas')}
          {faturas !== null && <b>{faturas.length}</b>}
        </button>
        {/* A prova do aceite dos Termos. Fica aqui, e nao numa pagina propria,
            porque a pergunta que leva ate ela ("essa pessoa aceitou?") nasce
            do mesmo lugar que as outras abas: uma duvida sobre um cliente. */}
        <button className={'adm-aba' + (aba === 'aceites' ? ' ativa' : '')} onClick={() => setAba('aceites')}>
          {t('adm_aba_aceites')}
        </button>
        {/* Ficha da conta: busca uma pessoa e mostra tudo dela numa tela.
            As outras abas sao listagens; esta e o inverso — um cliente por vez,
            que e como uma pergunta de suporte chega. */}
        <button className={'adm-aba' + (aba === 'ficha' ? ' ativa' : '')} onClick={() => setAba('ficha')}>
          {t('adm_aba_ficha')}
        </button>
      </div>

      {aba === 'ficha' && (
        <div style={{ marginTop: 18 }}><FichaConta abrirConta={fichaAbrir} /></div>
      )}

      {aba === 'aceites' && (
        <div style={{ marginTop: 18 }}><PainelAceites /></div>
      )}

      {/* A barra de filtro/busca e das LISTAGENS. Na ficha ela nao se aplica —
          escondida por estilo em vez de condicional, para nao mexer no
          aninhamento do JSX que segue abaixo. Os blocos de conteudo ja sao
          condicionais por aba, entao nada mais precisa ser escondido. */}
      <div className="adm-barra" style={aba === 'ficha' ? { display: 'none' } : undefined}>
        <div className="adm-busca">
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none"
               stroke="currentColor" strokeWidth="1.6">
            <circle cx="9" cy="9" r="5.5"/>
            <path d="M13 13l4 4" strokeLinecap="round"/>
          </svg>
          <input
            className="perfil-input"
            type="text"
            placeholder={t('adm_busca_ph')}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <button
          className={'adm-btn-linha' + (painelFiltros ? ' adm-btn-linha--on' : '')}
          onClick={() => setPainelFiltros(true)}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none"
               stroke="currentColor" strokeWidth="1.6">
            <path d="M3 6h14M6 10h8M8 14h4" strokeLinecap="round"/>
          </svg>
          {t('adm_filtros')}
          {nFiltros > 0 && <em>{nFiltros}</em>}
        </button>

      </div>

      {/* Os filtros ligados, para poder tirar um sem abrir o painel */}
      {nFiltros > 0 && (
        <div className="adm-filtros-linha">
          {chipsAtivos.map((c) => (
            <button key={c.chave} className="adm-filtro" onClick={c.limpar}>
              {c.rotulo}
              <svg viewBox="0 0 20 20" width="12" height="12" fill="none"
                   stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round"/>
              </svg>
            </button>
          ))}
          <button className="adm-limpar" onClick={limparFiltros}>{t('adm_limpar')}</button>

          <span className="adm-quantos">
            <b>{filtrados.length}</b> {t('ws_de')} {totalAba}
          </span>
        </div>
      )}

      {(aba === 'convidados' || aba === 'trial') && (
        <p className="adm-vazio">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
               stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="10" r="7.5"/>
            <path d="M10 9v4.5M10 6.5v.5" strokeLinecap="round"/>
          </svg>
          {aba === 'convidados' ? t('adm_aviso_convidados') : t('adm_aviso_trial')}
        </p>
      )}

      {painelFiltros && (
        <div className="adm-gaveta" onClick={() => setPainelFiltros(false)}>
          <div className="adm-gaveta__folha" onClick={(e) => e.stopPropagation()}>

            <div className="adm-gaveta__cab">
              <strong>{t('adm_filtros')}</strong>
              <button onClick={() => setPainelFiltros(false)} aria-label={t('ws_fechar')}>
                <svg viewBox="0 0 20 20" width="17" height="17" fill="none"
                     stroke="currentColor" strokeWidth="1.6">
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="adm-gaveta__corpo">

              <div className="adm-gaveta__g">
                <label>{t('adm_periodo')}</label>
                <DropdownCora
                  valor={filtroData}
                  onEscolher={(v) => setFiltroData(v)}
                  opcoes={[
                    { v: 'todos', n: t('adm_qualquer') },
                    { v: 'mes', n: t('adm_este_mes') },
                    { v: '12meses', n: t('adm_ult12') },
                    { v: 'ano', n: t('adm_ano_especifico') },
                    { v: 'periodo', n: t('adm_intervalo') },
                  ]}
                />

                {filtroData === 'ano' && (
                  <input type="number" min="2024" max="2100" value={anoFiltro}
                         onChange={(e) => setAnoFiltro(e.target.value)} />
                )}

                {filtroData === 'periodo' && (
                  <div className="adm-opcoes">
                    <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
                    <span>{t('promp_ate')}</span>
                    <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
                  </div>
                )}
              </div>

              {aba === 'pagantes' && (
                <div className="adm-gaveta__g">
                  <label>{t('adm_status')}</label>
                  <DropdownCora
                    valor={filtroStatus}
                    onEscolher={(v) => setFiltroStatus(v)}
                    opcoes={[
                      { v: '', n: t('promp_f_todos') },
                      { v: 'vencendo', n: t('adm_quase_vencendo') },
                    ]}
                  />
                </div>
              )}

              <div className="adm-gaveta__g">
                <label>{t('adm_profissao')}</label>
                <DropdownCora
                  valor={filtroProfissao}
                  onEscolher={(v) => setFiltroProfissao(v)}
                  opcoes={[
                    { v: '', n: t('adm_qualquer') },
                    { v: 'arquiteto', n: t('adm_p_arquiteto') },
                    { v: 'designer_interiores', n: t('adm_p_designer') },
                    { v: 'archviz', n: 'Archviz' },
                    { v: 'engenheiro', n: t('adm_p_engenheiro') },
                    { v: 'estudante', n: t('adm_p_estudante') },
                    { v: 'paisagista', n: t('adm_p_paisagista') },
                    { v: 'outro', n: t('adm_outro') },
                  ]}
                />
              </div>

              <div className="adm-gaveta__g">
                <label>{t('adm_como_conheceu')}</label>
                <DropdownCora
                  valor={filtroOrigem}
                  onEscolher={(v) => setFiltroOrigem(v)}
                  opcoes={[
                    { v: '', n: t('adm_qualquer') },
                    { v: 'instagram', n: 'Instagram' },
                    { v: 'youtube', n: 'YouTube' },
                    { v: 'google', n: 'Google' },
                    { v: 'indicacao', n: t('adm_o_indicacao') },
                    { v: 'tiktok', n: 'TikTok' },
                    { v: 'anuncio', n: t('adm_o_anuncio') },
                    { v: 'outro', n: t('adm_outro') },
                  ]}
                />
              </div>

              <div className="adm-gaveta__g">
                <label>{t('adm_renderizador')}</label>
                <DropdownCora
                  valor={filtroRender}
                  onEscolher={(v) => setFiltroRender(v)}
                  opcoes={[
                    { v: '', n: t('adm_qualquer') },
                    { v: 'nao', n: t('adm_r_nao') },
                    { v: 'vray', n: 'V-Ray' },
                    { v: 'corona', n: 'Corona' },
                    { v: 'enscape', n: 'Enscape' },
                    { v: 'lumion', n: 'Lumion' },
                    { v: 'dhistudio', n: 'D5 / IA' },
                    { v: 'outro', n: t('adm_outro') },
                  ]}
                />
              </div>

              <div className="adm-gaveta__g">
                <label>{t('adm_localizacao')}</label>

                <DropdownCora
                  valor={filtroPais}
                  onEscolher={(v) => setFiltroPais(v)}
                  opcoes={[
                    { v: '', n: t('adm_qualquer_pais') },
                    ...[...new Set(assinantes.map(a => (a.pais || '').toUpperCase()).filter(Boolean))].sort().map(p => ({ v: p, n: p })),
                  ]}
                />

                <div style={{ marginTop: 8 }}>
                  <DropdownCora
                    valor={filtroEstado}
                    onEscolher={(v) => setFiltroEstado(v)}
                    opcoes={[
                      { v: '', n: t('adm_qualquer_estado') },
                      ...[...new Set(assinantes.map(a => (a.estado || '').toUpperCase()).filter(Boolean))].sort().map(uf => ({ v: uf, n: uf })),
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="adm-gaveta__pe">
              <button className="adm-btn-linha" onClick={limparFiltros}>
                {t('adm_limpar_filtros')}
              </button>
              <button className="as-btn-cta" onClick={() => setPainelFiltros(false)}>
                {t('adm_ver')} {filtrados.length} {filtrados.length === 1 ? t('adm_resultado') : t('adm_resultados')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A ficha e uma tela inteira, nao uma listagem: nao entra neste ternario.
          Sem o `null` explicito ela caia no ELSE e a tabela geral de contas
          aparecia solta embaixo da ficha aberta. */}
      {aba === 'ficha' ? null : aba === 'faturas' ? (
        <div className="conta-card adm-card">
          {/* O aviso aparece quando o Stripe não respondeu. Sem ele a tela
              mostraria só as recargas e daria a entender que não houve fatura
              de plano nenhuma, que é o pior jeito de errar numa tela de
              dinheiro. */}
          {avisoFaturas && <p className="adm-vazio">{avisoFaturas}</p>}

          {buscandoFaturas ? (
            <p className="adm-vazio">{t('adm_fat_buscando')}</p>
          ) : (
            <>
              <div className="fat-rolo">
              <table className="fat">
                <thead>
                  <tr>
                    <th>{t('adm_h_data')}</th>
                    <th>{t('adm_h_numero')}</th>
                    <th>{t('adm_h_tipo_cobranca')}</th>
                    <th>{t('adm_h_comprador')}</th>
                    <th>{t('adm_h_compra')}</th>
                    <th>{t('adm_status')}</th>
                    <th>{t('adm_h_valor')}</th>
                    <th>{t('adm_h_documento')}</th>
                  </tr>
                </thead>
                <tbody>
                  {faturasFiltradas.map((f) => (
                    <tr key={f.id}>
                      <td>{fmtData(f.data)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{f.numero || '—'}</td>
                      <td>
                        {f.origem === 'recarga' ? t('adm_fat_recarga') : t('adm_fat_plano')}
                        {/* Pró-rata é a diferença cobrada numa troca de plano
                            no meio do mês. Sem dizer isso, ela parece uma
                            mensalidade com o valor errado. */}
                        {f.motivo === 'subscription_update' && (
                          <div className="adm-sub">{t('adm_fat_prorata')}</div>
                        )}
                      </td>
                      <td>
                        <div className="adm-nome">{f.nome || t('adm_fat_sem_conta')}</div>
                        <div className="adm-sub">
                          <span className="adm-sub-txt" title={f.email || ''}>{f.email || '—'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, maxWidth: 260 }}>{f.descricao}</td>
                      <td>
                        <span className={'fat-selo' + (f.status === 'paga' ? '' : ' fat-selo--aberta')}>
                          {f.status === 'paga' ? t('pn_paga') : t('pn_aberta')}
                        </span>
                      </td>
                      <td>{fmtValor(f.total_centavos, f.moeda)}</td>
                      <td>
                        {f.pdf
                          ? <a className="fat-ver" href={f.pdf} target="_blank" rel="noopener noreferrer">{t('adm_fat_abrir')}</a>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {faturasFiltradas.length === 0
                ? <p className="adm-vazio">{t('adm_fat_vazio')}</p>
                : (
                  <p className="adm-total">
                    {faturasFiltradas.length} {t('adm_fat_conta')} {fmtValor(totalFaturas, 'brl')} {t('adm_fat_pago')}
                  </p>
                )}
            </>
          )}
        </div>
      ) : aba === 'compras' ? (
        <div className="conta-card adm-card">
          <div className="fat-rolo">
          <table className="fat">
            <thead>
              <tr>
                <th>{t('adm_h_data')}</th>
                <th>{t('adm_h_comprador')}</th>
                <th>{t('adm_h_cpfid')}</th>
                {dadosFiscais && <th>{t('adm_h_telefone')}</th>}
                {dadosFiscais && <th>{t('adm_h_cep')}</th>}
                {dadosFiscais && <th>{t('adm_h_endereco')}</th>}
                <th>{t('adm_h_compra')}</th>
                <th>{t('adm_h_creditos')}</th>
                <th>{t('adm_h_destino')}</th>
                <th>{t('adm_h_valor')}</th>
              </tr>
            </thead>
            <tbody>
              {compras.filter(c => {
                const q = busca.toLowerCase().trim();
                if (!q) return true;
                return (c.nome || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
              }).map(c => (
                <tr key={c.id}>
                  <td>{fmtData(c.criado_em)}</td>
                  <td>
                    <div className="adm-nome">{c.nome || '—'}</div>
                    <div className="adm-sub"><span className="adm-sub-txt" title={c.email}>{c.email}</span></div>
                  </td>
                  <td><DocFiscal cpf={c.cpf} doc_intl={c.doc_intl} doc_pais={c.doc_pais} /></td>
                  {dadosFiscais && <td>{dadosFiscais[c.email]?.telefone || '—'}</td>}
                  {dadosFiscais && <td>{dadosFiscais[c.email]?.cep || '—'}</td>}
                  {dadosFiscais && <td style={{ fontSize: 13, maxWidth: 220 }}>{dadosFiscais[c.email]?.endereco || '—'}</td>}
                  <td>{c.descricao}</td>
                  <td>{(c.creditos || 0).toLocaleString('pt-BR')}</td>
                  <td style={{ fontSize: 13 }}>{c.destino_email && c.destino_email !== c.email ? c.destino_email : '—'}</td>
                  <td>{fmtValor(c.valor_centavos, c.moeda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {compras.length === 0 && <p className="adm-vazio">{t('adm_compras_vazio')}</p>}
        </div>
      ) : (
      <div className="conta-card adm-card">
        <div className="fat-rolo">
        <table className={'fat' + (mostrarPerfil ? ' fat--compacto' : '')}>
          <thead>
            <tr>
              <th>{t('adm_h_nome_email')}</th>
              {!mostrarPerfil && <th>{t('adm_h_cpfid')}</th>}
              {dadosFiscais && <th>{t('adm_h_telefone')}</th>}
              {dadosFiscais && <th>{t('adm_h_cep')}</th>}
              {dadosFiscais && <th>{t('adm_h_endereco')}</th>}
              {!mostrarPerfil && <th>{t('adm_h_plano')}</th>}
              {aba === 'convidados' && <th>{t('adm_h_equipe')}</th>}
              {mostrarPerfil && <th>{t('adm_h_genero')}</th>}
              {mostrarPerfil && <th>{t('adm_profissao')}</th>}
              {mostrarPerfil && <th>{t('adm_h_origem')}</th>}
              {mostrarPerfil && <th>{t('adm_h_usa_render')}</th>}
              {mostrarPerfil && <th>{t('adm_h_tamanho')}</th>}
              {mostrarPerfil && <th>{t('adm_h_projetos')}</th>}
              {mostrarPerfil && <th>{t('adm_h_cidade')}</th>}
              {mostrarPerfil && <th>{t('adm_h_estado')}</th>}
              {mostrarPerfil && <th>{t('adm_h_pais')}</th>}
              {mostrarPerfil && <th>{t('adm_h_cadastro')}</th>}
              {mostrarCobranca && <th>{t('adm_h_valor')}</th>}
              {mostrarCobranca && <th>{t('adm_h_assinou')}</th>}
              {mostrarCobranca && <th>{t('adm_h_renova')}</th>}
              {mostrarCobranca && <th>{t('adm_h_renov')}</th>}
              {aba === 'cancelados' && <th>{t('adm_h_cancelado_em')}</th>}
              <th>{t('adm_status')}</th>
              {!mostrarPerfil && <th>{t('adm_h_creditos')}</th>}
              <th>{t('adm_h_ficha')}</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map(a => (
              <tr key={a.id}>
                <td>
                  <div className="adm-nome">{a.nome || '—'}</div>
                  {/* O e-mail vai num span próprio para poder cortar com reticências
                      sem levar o selo "não verificado" junto — ver .admin-email-txt. */}
                  <div className="adm-sub">
                    <span className="adm-sub-txt" title={a.email}>{a.email}</span>
                    {!a.email_verificado && <span className="adm-tag-nv">{t('adm_nao_verificado')}</span>}
                  </div>
                </td>
                {!mostrarPerfil && <td><DocFiscal cpf={a.cpf} doc_intl={a.doc_intl} doc_pais={a.doc_pais} /></td>}
                {dadosFiscais && <td>{dadosFiscais[a.email]?.telefone || '—'}</td>}
                {dadosFiscais && <td>{dadosFiscais[a.email]?.cep || '—'}</td>}
                {dadosFiscais && <td style={{ fontSize: 13, maxWidth: 220 }}>{dadosFiscais[a.email]?.endereco || '—'}</td>}
                {!mostrarPerfil && (
                <td>
                  {a.eh_dono_equipe ? (
                    <span className="fat-selo fat-selo--equipe">
                      Teams · {a.assentos || '?'} {t('adm_teams_assentos')}
                    </span>
                  ) : (
                    /* Só leitura: trocar plano é ação, e ação agora é na Ficha. */
                    <span style={{ textTransform: 'capitalize' }}>{a.plano}</span>
                  )}
                </td>
                )}
                {aba === 'convidados' && (
                  <td style={{ fontSize: 13 }}>
                    <div>{a.equipe_participa_nome || '—'}</div>
                    <div className="adm-sub"><span className="adm-sub-txt" title={a.equipe_dono_email || ''}>{a.equipe_dono_email || ''}</span></div>
                  </td>
                )}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{GENERO_LBL[a.genero] || a.genero || '—'}</td>}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{PROFISSAO_LBL[a.profissao] || a.profissao || '—'}</td>}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{ORIGEM_LBL[a.origem] || a.origem || '—'}</td>}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{RENDER_LBL[a.usa_render] || a.usa_render || '—'}</td>}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{TAMANHO_LBL[a.tamanho] || a.tamanho || '—'}</td>}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{VOLUME_LBL[a.volume] || a.volume || '—'}</td>}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{a.cidade || '—'}</td>}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{a.estado || '—'}</td>}
                {mostrarPerfil && <td style={{ fontSize: 13 }}>{a.pais || '—'}</td>}
                {mostrarPerfil && <td>{fmtData(a.criado_em)}</td>}
                {mostrarCobranca && <td>{a.valor_centavos ? fmtValor(a.valor_centavos, a.moeda) : '—'}</td>}
                {mostrarCobranca && <td>{fmtData(a.assinou_em)}</td>}
                {mostrarCobranca && <td>{fmtData(a.renova_em)}</td>}
                {mostrarCobranca && <td style={{ textAlign: 'center' }}>{a.renovacoes || 0}</td>}
                {aba === 'cancelados' && <td>{a.cancelado_em ? fmtData(a.cancelado_em) : '—'}</td>}
                <td><span className={'fat-selo' + (a.assinatura_status === 'cancelado' || a.status !== 'ativo' ? ' fat-selo--aberta' : '')}>{a.assinatura_status === 'cancelado' ? t('adm_st_cancelado') : a.status}</span></td>
                {!mostrarPerfil && <td>{a.plano === 'free' && !a.eh_dono_equipe ? '—' : `${a.creditos_restantes}/${a.creditos_total}`}</td>}
                {/* As tabelas viraram lista. Cancelar, deletar e trocar plano
                    moram na Ficha, junto da conta: com a ação aqui, era fácil
                    aplicar na linha de cima ou de baixo — e são irreversíveis.
                    Aqui fica só o atalho que leva para lá. */}
                <td className="fat__acao">
                  <div className="adm-acoes-linha">
                    <button
                      className="fat-ver"
                      onClick={() => { setFichaAbrir({ id: a.id, seq: Date.now() }); setAba('ficha'); }}
                    >
                      {t('adm_abrir_ficha')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtrados.length === 0 && <p className="adm-vazio">{t('adm_conta_nao_encontrada')}</p>}

        {filtrados.length > 0 && (
          <div className="adm-pag">
            <div className="adm-pag-qtd">
              <span>{t('adm_mostrar')}</span>
              <select
                value={porPag}
                onChange={(e) => { setPorPag(+e.target.value); setPag(1); }}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
              </select>
              <span>{t('ws_de')} {filtrados.length}</span>
            </div>

            {nPags > 1 && (
              <div className="adm-pag-nums">
                <button
                  className="adm-pag-seta"
                  onClick={() => setPag(pagAtual - 1)}
                  disabled={pagAtual === 1}
                  aria-label={t('adm_pag_anterior')}
                >
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                       stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 4l-5 6 5 6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {(() => {
                  const ini = Math.max(1, Math.min(pagAtual - 2, nPags - 4));
                  const fim = Math.min(nPags, ini + 4);
                  const ns  = [];
                  for (let k = ini; k <= fim; k++) ns.push(k);
                  return ns.map((n) => (
                    <button
                      key={n}
                      className={'admin-pag-n' + (n === pagAtual ? ' admin-pag-n--on' : '')}
                      onClick={() => setPag(n)}
                    >
                      {n}
                    </button>
                  ));
                })()}

                <button
                  className="adm-pag-seta"
                  onClick={() => setPag(pagAtual + 1)}
                  disabled={pagAtual === nPags}
                  aria-label={t('adm_pag_proxima')}
                >
                  <svg viewBox="0 0 20 20" width="14" height="14" fill="none"
                       stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 4l5 6-5 6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
    {emailAberto && <EmailAssinantes onClose={() => setEmailAberto(false)} />}
    </div>
    </AppShell>
  );
}
