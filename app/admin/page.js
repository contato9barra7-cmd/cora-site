'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { lerConta, adminListarAssinantes, adminMudarPlano, adminCancelar, adminDadosFiscais, adminDeletarConta, adminCompras } from '../../lib/auth';

const PLANOS = ['free', 'starter', 'pro', 'studio'];

function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtCpf(c) {
  if (!c || c.length !== 11) return c || '—';
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
function fmtValor(centavos, moeda) {
  if (!centavos) return '—';
  const v = (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  return (moeda === 'brl' || !moeda ? 'R$ ' : (moeda.toUpperCase() + ' ')) + v;
}

export default function Admin() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [negado, setNegado] = useState(false);
  const [assinantes, setAssinantes] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('pagantes'); // 'pagantes' | 'trial' | 'convidados'
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
  const [ocupado, setOcupado] = useState(null); // id da conta em ação
  const [exportando, setExportando] = useState(false);
  const [dadosFiscais, setDadosFiscais] = useState(null); // { email: {telefone, endereco} }
  const [carregandoFiscais, setCarregandoFiscais] = useState(false);
  const [meuId, setMeuId] = useState(null);

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

  useEffect(() => {
    adminCompras().then(setCompras).catch(() => {});
  }, []);

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

  // Relatório geográfico: agrupa por estado (BR) e por país
  function relatorioGeo() {
    const pagantes = assinantes.filter(a => a.id !== meuId && !a.eh_convidado && !a.eh_trial);
    const totalClientes = pagantes.length;
    const totalValor = pagantes.reduce((s, a) => s + (a.valor_centavos || 0), 0);

    const agrupa = (campo) => {
      const mapa = {};
      pagantes.forEach(a => {
        const k = (a[campo] || '').toUpperCase() || '—';
        if (!mapa[k]) mapa[k] = { n: 0, valor: 0 };
        mapa[k].n += 1;
        mapa[k].valor += (a.valor_centavos || 0);
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
    return { estados: agrupa('estado'), paises: agrupa('pais'), totalClientes, totalValor };
  }

  const geo = relatorioGeo();

  function exportarGeo() {
    setMenuExport(false);
    if (!geo.totalClientes) { setErro('Sem dados de localização ainda.'); return; }
    const linhas = [];
    geo.estados.forEach(e => linhas.push([
      'Estado', e.chave, e.n, `${e.pctClientes}%`,
      ((e.valor || 0) / 100).toFixed(2), `${e.pctValor}%`,
    ]));
    geo.paises.forEach(p => linhas.push([
      'País', p.chave, p.n, `${p.pctClientes}%`,
      ((p.valor || 0) / 100).toFixed(2), `${p.pctValor}%`,
    ]));
    baixarCSV('origem-geografica',
      ['Tipo', 'Local', 'Clientes', '% dos clientes', 'Receita (R$)', '% da receita'],
      linhas);
  }

  function baixarCSV(nomeArq, cabecalho, linhas) {
    const idxTexto = cabecalho
      .map((c, i) => COLUNAS_TEXTO.includes(String(c).toLowerCase().trim()) ? i : -1)
      .filter(i => i >= 0);
    const esc = (v, i) => {
      const s = String(v ?? '').replace(/"/g, '""');
      // ="valor" faz o Excel tratar como texto puro
      if (idxTexto.includes(i) && s) return `="${s}"`;
      return `"${s}"`;
    };
    const corpo = linhas.map(l => l.map((v, i) => esc(v, i)).join(';'));
    const csv = '\uFEFF' + [cabecalho.map(c => `"${c}"`).join(';'), ...corpo].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const hoje = new Date().toISOString().slice(0, 10);
    link.download = `cora-${nomeArq}-${hoje}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const RENDER_LBL = { nao: 'Nenhum', vray: 'V-Ray', corona: 'Corona', enscape: 'Enscape', lumion: 'Lumion', dhistudio: 'D5/IA', outro: 'Outro' };
  const PROFISSAO_LBL = { arquiteto: 'Arquiteto(a)', designer_interiores: 'Designer de interiores', archviz: 'Archviz', engenheiro: 'Engenheiro(a)', estudante: 'Estudante', paisagista: 'Paisagista', outro: 'Outro' };
  const ORIGEM_LBL = { instagram: 'Instagram', youtube: 'YouTube', google: 'Google', indicacao: 'Indicação', tiktok: 'TikTok', anuncio: 'Anúncio', outro: 'Outro' };
  const TAMANHO_LBL = { autonomo: 'Só eu (autônomo)', '2a5': '2 a 5 pessoas', '6a20': '6 a 20 pessoas', '20mais': 'Mais de 20 pessoas' };
  const VOLUME_LBL = { menos10: 'Menos de 10', '10a20': 'Entre 10 e 20', mais20: 'Mais de 20' };

  async function exportarFiscais() {
    setMenuExport(false); setExportando(true); setErro('');
    try {
      // Usa os MESMOS dados da tela (que já têm valor/plano/assentos)
      // e completa com telefone/CEP/endereço vindos do Stripe.
      const pagantes = assinantes.filter(a =>
        a.id !== meuId && !a.eh_convidado && !a.eh_trial
      );
      if (!pagantes.length) { setErro('Nenhum assinante para exportar.'); return; }
      console.log('[export] pagantes:', pagantes.map(a => ({
        email: a.email, valor_centavos: a.valor_centavos, tipo: typeof a.valor_centavos
      })));

      let mapa = dadosFiscais;
      if (!mapa) {
        const linhas = await adminDadosFiscais();
        mapa = {};
        linhas.forEach(l => { mapa[l.email] = { telefone: l.telefone, cep: l.cep, endereco: l.endereco }; });
      }

      baixarCSV('assinantes-fiscais',
        ['Nome', 'Email', 'CPF', 'Telefone', 'CEP', 'Endereço', 'Cidade', 'Estado', 'País', 'Plano', 'Assentos', 'Assinou em', 'Renova em', 'Renovações', 'Valor (R$)'],
        pagantes.map(a => [
          a.nome, a.email, a.cpf,
          mapa[a.email]?.telefone || '',
          mapa[a.email]?.cep || '',
          mapa[a.email]?.endereco || '',
          a.cidade || '', a.estado || '', a.pais || '',
          a.eh_dono_equipe ? `Teams (${a.plano_exibicao === 'teams' ? 'equipe' : a.plano})` : a.plano,
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
    if (!compras.length) { setErro('Nenhuma recarga para exportar.'); return; }
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
        ['Data', 'Comprador', 'Email', 'CPF', 'Telefone', 'CEP', 'Endereço', 'Compra', 'Créditos', 'Destino', 'Valor (R$)'],
        compras.map(c => [
          c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR') : '',
          c.nome, c.email, c.cpf,
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
    if (!lista.length) { setErro('Nenhuma conta nessa categoria.'); return; }
    baixarCSV(nome,
      ['Nome', 'Email', 'Profissão', 'Origem', 'Renderizador', 'Tamanho equipe', 'Projetos/ano', 'Cadastro'],
      lista.map(a => [
        a.nome, a.email,
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
      setNegado(true);
      setCarregando(false);
    }
  }

  async function mudarPlano(id, plano, email, planoAtual) {
    if (plano === planoAtual) return;
    if (!confirm(`Mudar o plano de ${email} de "${planoAtual}" para "${plano}"?\n\nIsso altera o plano no nosso sistema imediatamente.`)) {
      // recarrega para o dropdown voltar ao valor original
      await carregar();
      return;
    }
    setOcupado(id);
    setErro('');
    try {
      await adminMudarPlano(id, plano);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function deletar(id, email) {
    if (!confirm(`Deletar a conta de ${email}?\n\nEsta ação é PERMANENTE e apaga a conta, plano e créditos. Não pode ser desfeita.`)) return;
    setOcupado(id);
    setErro('');
    try {
      await adminDeletarConta(id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  async function cancelar(id, email) {
    if (!confirm(`Cancelar o plano de ${email}? A conta volta para Free.`)) return;
    setOcupado(id);
    setErro('');
    try {
      await adminCancelar(id);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  if (carregando) return <AppShell><div className="admin-wrap"><p>Carregando...</p></div></AppShell>;

  if (negado) {
    return (
      <AppShell>
      <div className="admin-wrap">
        <h1>Acesso restrito</h1>
        <p>Esta área é exclusiva para administradores.</p>
        <Link href="/conta" className="btn btn--roxo" style={{ width: 'auto', display: 'inline-block', padding: '10px 22px' }}>
          Voltar para minha conta
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
    else if (aba === 'pagantes') { if (a.eh_convidado || a.eh_trial) return false; }
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
      || (a.cpf || '').includes(q);
  }).sort((a, b) => {
    // na aba de membros, agrupa por equipe (mesmo time junto)
    if (aba === 'convidados') {
      const ea = (a.equipe_participa_nome || '').toLowerCase();
      const eb = (b.equipe_participa_nome || '').toLowerCase();
      if (ea !== eb) return ea < eb ? -1 : 1;
    }
    return 0;
  });

  const totalConvidados = assinantes.filter(a => a.eh_convidado && a.id !== meuId).length;
  const totalTrial = assinantes.filter(a => a.eh_trial && a.id !== meuId).length;
  // contas "reais" = exclui a própria conta admin e os convidados de equipe
  const contasReais = assinantes.filter(a => a.id !== meuId && !a.eh_convidado);
  const totalContas = contasReais.length;
  const pagos = contasReais.filter(a => (a.plano !== 'free' || a.eh_dono_equipe) && a.status === 'ativo').length;

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
    <div className="admin-wrap">
      <div className="admin-topo">
        <div>
          <h1>Painel de administração</h1>
          <p className="admin-sub">{totalContas} contas · {pagos} com plano pago ativo</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn--ghost"
            style={{ width: 'auto', margin: 0, padding: '8px 18px' }}
            onClick={mostrarFiscais}
            disabled={carregandoFiscais}
          >
            {carregandoFiscais ? 'Carregando...' : (dadosFiscais ? 'Ocultar dados fiscais' : 'Ver dados fiscais')}
          </button>
          <div className="admin-export-wrap">
            <button
              className="btn btn--verde"
              style={{ width: 'auto', margin: 0, padding: '8px 18px' }}
              onClick={() => setMenuExport(!menuExport)}
              disabled={exportando}
            >
              {exportando ? 'Gerando...' : 'Exportar .CSV'}
            </button>
            {menuExport && (
              <div className="admin-export-menu" onMouseLeave={() => setMenuExport(false)}>
                <div className="admin-export-grupo">Fiscal</div>
                <button className="admin-export-item" onClick={exportarFiscais}>Assinantes</button>
                <button className="admin-export-item" onClick={exportarRecargas}>Recargas</button>
                <div className="admin-export-grupo">Tráfego</div>
                <button className="admin-export-item" onClick={() => exportarTrafego('assinantes')}>Assinantes</button>
                <button className="admin-export-item" onClick={() => exportarTrafego('trial')}>Trial</button>
                <button className="admin-export-item" onClick={() => exportarTrafego('membros')}>Membros de equipe</button>
                <div className="admin-export-grupo">Relatórios</div>
                <button className="admin-export-item" onClick={exportarGeo}>Origem geográfica</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {erro && <div className="login-erro" style={{ marginBottom: 16 }}>{erro}</div>}

      {geo.totalClientes > 0 && (
        <div className="admin-geo">
          <div className="admin-geo-topo">
            <h2 className="admin-geo-titulo">Origem geográfica</h2>
            <button className="admin-geo-toggle" onClick={() => setVerGeo(!verGeo)}>
              {verGeo ? 'Ocultar' : 'Ver relatório'}
            </button>
          </div>
          {verGeo && (
            <div className="admin-geo-cols">
              <div>
                <div className="admin-geo-sub">Por estado</div>
                {geo.estados.map(e => (
                  <div key={e.chave} className="admin-geo-linha">
                    <span className="admin-geo-k">{e.chave}</span>
                    <div className="admin-geo-barra">
                      <div className="admin-geo-fill" style={{ width: `${e.pctClientes}%` }} />
                    </div>
                    <span className="admin-geo-v">
                      {e.pctClientes}% · {e.n} {e.n === 1 ? 'cliente' : 'clientes'}
                      {e.valor > 0 && <em> · {fmtValor(e.valor, 'brl')} ({e.pctValor}% da receita)</em>}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <div className="admin-geo-sub">Por país</div>
                {geo.paises.map(p => (
                  <div key={p.chave} className="admin-geo-linha">
                    <span className="admin-geo-k">{p.chave}</span>
                    <div className="admin-geo-barra">
                      <div className="admin-geo-fill" style={{ width: `${p.pctClientes}%` }} />
                    </div>
                    <span className="admin-geo-v">
                      {p.pctClientes}% · {p.n} {p.n === 1 ? 'cliente' : 'clientes'}
                      {p.valor > 0 && <em> · {fmtValor(p.valor, 'brl')} ({p.pctValor}% da receita)</em>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="admin-abas">
        <button className={'admin-aba' + (aba === 'pagantes' ? ' ativa' : '')} onClick={() => setAba('pagantes')}>
          Assinantes ({pagos})
        </button>
        <button className={'admin-aba' + (aba === 'trial' ? ' ativa' : '')} onClick={() => setAba('trial')}>
          Trial ({totalTrial})
        </button>
        <button className={'admin-aba' + (aba === 'convidados' ? ' ativa' : '')} onClick={() => setAba('convidados')}>
          Membros de equipe ({totalConvidados})
        </button>
        <button className={'admin-aba' + (aba === 'compras' ? ' ativa' : '')} onClick={() => setAba('compras')}>
          Recargas ({compras.length})
        </button>
      </div>
      {aba === 'convidados' && (
        <p className="admin-sub" style={{ marginBottom: 12 }}>
          Estas contas recebem acesso via equipe (não pagam individualmente) e não entram no export do contador.
        </p>
      )}
      {aba === 'trial' && (
        <p className="admin-sub" style={{ marginBottom: 12 }}>
          Contas em teste grátis (plano Free). Dados de perfil úteis para tráfego e segmentação.
        </p>
      )}

      <div className="admin-filtros">
        <select className="admin-filtro-sel" value={filtroData} onChange={(e) => setFiltroData(e.target.value)}>
          <option value="todos">Período</option>
          <option value="mes">Este mês</option>
          <option value="12meses">Últimos 12 meses</option>
          <option value="ano">Ano específico</option>
          <option value="periodo">Intervalo de datas</option>
        </select>
        {filtroData === 'ano' && (
          <input className="admin-filtro-sel" type="number" min="2024" max="2100" value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} style={{ width: 90 }} />
        )}
        {filtroData === 'periodo' && (
          <>
            <input className="admin-filtro-sel" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
            <span style={{ color: 'var(--ink3)', fontSize: 13 }}>até</span>
            <input className="admin-filtro-sel" type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
          </>
        )}
        <select className="admin-filtro-sel" value={filtroProfissao} onChange={(e) => setFiltroProfissao(e.target.value)}>
          <option value="">Profissão</option>
          <option value="arquiteto">Arquiteto(a)</option>
          <option value="designer_interiores">Designer de interiores</option>
          <option value="archviz">Archviz</option>
          <option value="engenheiro">Engenheiro(a)</option>
          <option value="estudante">Estudante</option>
          <option value="paisagista">Paisagista</option>
          <option value="outro">Outro</option>
        </select>
        <select className="admin-filtro-sel" value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)}>
          <option value="">Origem</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="google">Google</option>
          <option value="indicacao">Indicação</option>
          <option value="tiktok">TikTok</option>
          <option value="anuncio">Anúncio</option>
          <option value="outro">Outro</option>
        </select>
        <select className="admin-filtro-sel" value={filtroRender} onChange={(e) => setFiltroRender(e.target.value)}>
          <option value="">Renderizador</option>
          <option value="nao">Nenhum</option>
          <option value="vray">V-Ray</option>
          <option value="corona">Corona</option>
          <option value="enscape">Enscape</option>
          <option value="lumion">Lumion</option>
          <option value="dhistudio">D5 / IA</option>
          <option value="outro">Outro</option>
        </select>
        {aba === 'pagantes' && (
          <select className="admin-filtro-sel" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="vencendo">Quase vencendo</option>
            <option value="cancelado">Cancelados</option>
          </select>
        )}
        <select className="admin-filtro-sel" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Estado</option>
          {[...new Set(assinantes.map(a => (a.estado || '').toUpperCase()).filter(Boolean))].sort().map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
        <select className="admin-filtro-sel" value={filtroPais} onChange={(e) => setFiltroPais(e.target.value)}>
          <option value="">País</option>
          {[...new Set(assinantes.map(a => (a.pais || '').toUpperCase()).filter(Boolean))].sort().map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button className="admin-filtro-limpar" onClick={limparFiltros}>Limpar tudo</button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome, email ou CPF..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="admin-busca"
      />

      {aba === 'compras' ? (
        <div className="admin-tabela-wrap">
          <table className="admin-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Comprador</th>
                <th>CPF</th>
                {dadosFiscais && <th>Telefone</th>}
                {dadosFiscais && <th>CEP</th>}
                {dadosFiscais && <th>Endereço</th>}
                <th>Compra</th>
                <th>Créditos</th>
                <th>Destino</th>
                <th>Valor</th>
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
                    <div className="admin-nome">{c.nome || '—'}</div>
                    <div className="admin-email">{c.email}</div>
                  </td>
                  <td>{fmtCpf(c.cpf)}</td>
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
          {compras.length === 0 && <p className="admin-vazio">Nenhuma compra avulsa ainda.</p>}
        </div>
      ) : (
      <div className="admin-tabela-wrap">
        <table className="admin-tabela">
          <thead>
            <tr>
              <th>Nome / Email</th>
              <th>CPF</th>
              {dadosFiscais && <th>Telefone</th>}
              {dadosFiscais && <th>CEP</th>}
              {dadosFiscais && <th>Endereço</th>}
              <th>Plano</th>
              {aba === 'convidados' && <th>Equipe</th>}
              {aba === 'trial' && <th>Profissão</th>}
              {aba === 'trial' && <th>Origem</th>}
              {aba === 'trial' && <th>Usa render</th>}
              {aba === 'trial' && <th>Equipe</th>}
              {aba === 'trial' && <th>Projetos/ano</th>}
              {aba === 'trial' && <th>Cadastro</th>}
              {aba === 'pagantes' && <th>Valor</th>}
              {aba === 'pagantes' && <th>Assinou</th>}
              {aba === 'pagantes' && <th>Renova em</th>}
              {aba === 'pagantes' && <th>Renov.</th>}
              <th>Status</th>
              <th>Créditos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(a => (
              <tr key={a.id}>
                <td>
                  <div className="admin-nome">{a.nome || '—'}</div>
                  <div className="admin-email">{a.email}{!a.email_verificado && <span className="admin-tag-nv">não verificado</span>}</div>
                </td>
                <td>{fmtCpf(a.cpf)}</td>
                {dadosFiscais && <td>{dadosFiscais[a.email]?.telefone || '—'}</td>}
                {dadosFiscais && <td>{dadosFiscais[a.email]?.cep || '—'}</td>}
                {dadosFiscais && <td style={{ fontSize: 13, maxWidth: 220 }}>{dadosFiscais[a.email]?.endereco || '—'}</td>}
                <td>
                  {a.eh_dono_equipe ? (
                    <span className="admin-badge" style={{ background: '#eef0ff', color: '#4b46b3' }}>
                      Teams · {a.assentos || '?'} assentos
                    </span>
                  ) : (
                    <select
                      value={a.plano}
                      disabled={ocupado === a.id}
                      onChange={(e) => mudarPlano(a.id, e.target.value, a.email, a.plano)}
                      className="admin-select"
                    >
                      {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                </td>
                {aba === 'convidados' && (
                  <td style={{ fontSize: 13 }}>
                    <div>{a.equipe_participa_nome || '—'}</div>
                    <div className="admin-email">{a.equipe_dono_email || ''}</div>
                  </td>
                )}
                {aba === 'trial' && <td style={{ fontSize: 13 }}>{PROFISSAO_LBL[a.profissao] || a.profissao || '—'}</td>}
                {aba === 'trial' && <td style={{ fontSize: 13 }}>{ORIGEM_LBL[a.origem] || a.origem || '—'}</td>}
                {aba === 'trial' && <td style={{ fontSize: 13 }}>{RENDER_LBL[a.usa_render] || a.usa_render || '—'}</td>}
                {aba === 'trial' && <td style={{ fontSize: 13 }}>{TAMANHO_LBL[a.tamanho] || a.tamanho || '—'}</td>}
                {aba === 'trial' && <td style={{ fontSize: 13 }}>{VOLUME_LBL[a.volume] || a.volume || '—'}</td>}
                {aba === 'trial' && <td>{fmtData(a.criado_em)}</td>}
                {aba === 'pagantes' && <td>{a.valor_centavos ? fmtValor(a.valor_centavos, a.moeda) : '—'}</td>}
                {aba === 'pagantes' && <td>{fmtData(a.assinou_em)}</td>}
                {aba === 'pagantes' && <td>{fmtData(a.renova_em)}</td>}
                {aba === 'pagantes' && <td style={{ textAlign: 'center' }}>{a.renovacoes || 0}</td>}
                <td><span className={'admin-badge ' + (a.assinatura_status === 'cancelado' ? 'off' : (a.status === 'ativo' ? 'ok' : 'off'))}>{a.assinatura_status === 'cancelado' ? 'cancelado' : a.status}</span></td>
                <td>{a.plano === 'free' && !a.eh_dono_equipe ? '—' : `${a.creditos_restantes}/${a.creditos_total}`}</td>
                <td>
                  <div className="admin-acoes">
                    {a.plano !== 'free' && (
                      <button
                        className="admin-btn-cancelar"
                        disabled={ocupado === a.id}
                        onClick={() => cancelar(a.id, a.email)}
                      >
                        Cancelar
                      </button>
                    )}
                    <a
                      href={`https://dashboard.stripe.com/test/customers?email=${encodeURIComponent(a.email)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn-stripe"
                    >
                      Stripe
                    </a>
                    <button
                      className="admin-btn-deletar"
                      disabled={ocupado === a.id}
                      onClick={() => deletar(a.id, a.email)}
                      title="Deletar conta"
                    >
                      Deletar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <p className="admin-vazio">Nenhuma conta encontrada.</p>}
      </div>
      )}
    </div>
    </AppShell>
  );
}
