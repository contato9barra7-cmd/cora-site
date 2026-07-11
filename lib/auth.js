// ============================================================================
//  CLIENTE DE AUTENTICAÇÃO — conversa com o cora-auth (Railway)
//  Guarda o token no navegador para manter a pessoa logada.
// ============================================================================

const AUTH_URL = 'https://cora-auth-production.up.railway.app';

// ---- token: guardar / ler / apagar (no navegador) -------------------------
export function salvarSessao(token, conta) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cora_token', token);
  localStorage.setItem('cora_conta', JSON.stringify(conta));
}
export function lerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cora_token');
}
export function lerConta() {
  if (typeof window === 'undefined') return null;
  const c = localStorage.getItem('cora_conta');
  return c ? JSON.parse(c) : null;
}
export function sair() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cora_token');
  localStorage.removeItem('cora_conta');
}

// ---- criar conta (Free de 7 dias) -----------------------------------------
// Agora NÃO loga direto: retorna { precisa_verificar, email }.
// A pessoa confirma o email na tela de verificação.
export async function registrar({ email, senha, nome }) {
  const r = await fetch(`${AUTH_URL}/auth/registrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha, nome }),
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Não foi possível criar a conta');
  return dados; // { ok, precisa_verificar, email }
}

// ---- verificar email (código de 6 dígitos) → loga -------------------------
export async function verificar({ email, codigo }) {
  const r = await fetch(`${AUTH_URL}/auth/verificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, codigo }),
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Não foi possível verificar');
  salvarSessao(dados.token, dados.conta);
  return dados.conta;
}

// ---- reenviar código de verificação ---------------------------------------
export async function reenviarCodigo(email) {
  const r = await fetch(`${AUTH_URL}/auth/reenviar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return r.ok;
}

// ---- iniciar checkout (assinar plano ou comprar recarga) ------------------
// Precisa estar logado. Redireciona para a página de pagamento do Stripe.
export async function iniciarCheckout(priceId, guiaPreAberta) {
  const token = lerToken();
  if (typeof window !== 'undefined') localStorage.removeItem('cora_equipe_pendente');
  if (!token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cora_checkout_pendente', priceId);
      window.location.href = '/cadastro';
    }
    return;
  }
  const r = await fetch(`${AUTH_URL}/stripe/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ price_id: priceId }),
  });
  const dados = await r.json();
  if (!r.ok) {
    if (guiaPreAberta) guiaPreAberta.close();
    if (dados.precisa_cpf) {
      const err = new Error('CPF necessário');
      err.precisaCpf = true;
      throw err;
    }
    if (dados.ja_tem_plano) {
      const err = new Error('Você já tem um plano ativo');
      err.jaTemPlano = true;
      throw err;
    }
    throw new Error(dados.erro || 'Não foi possível iniciar o pagamento');
  }
  if (dados.url && typeof window !== 'undefined') {
    // Usa a guia já aberta no clique, ou abre uma nova.
    if (guiaPreAberta) guiaPreAberta.location.href = dados.url;
    else window.open(dados.url, '_blank');
    window.location.href = '/conta';
  }
}

// ---- salvar CPF na conta (validado no servidor) ---------------------------
export async function salvarCPF(cpf) {
  const token = lerToken();
  if (!token) throw new Error('Não autenticado');
  const r = await fetch(`${AUTH_URL}/conta/cpf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ cpf }),
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'CPF inválido');
  return true;
}

// ---- abrir portal de gerenciamento de assinatura (Stripe) -----------------
export async function abrirPortal(guiaPreAberta) {
  const token = lerToken();
  if (!token) { if (guiaPreAberta) guiaPreAberta.close(); return; }
  const r = await fetch(`${AUTH_URL}/stripe/portal`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) {
    if (guiaPreAberta) guiaPreAberta.close();
    throw new Error(dados.erro || 'Não foi possível abrir o gerenciamento');
  }
  if (dados.url && typeof window !== 'undefined') {
    // Abre em nova guia (consistente com o checkout).
    if (guiaPreAberta) guiaPreAberta.location.href = dados.url;
    else window.open(dados.url, '_blank');
  }
}

// ---- rebuscar dados frescos da conta (do servidor) ------------------------
export async function atualizarConta() {
  const token = lerToken();
  if (!token) return null;
  const r = await fetch(`${AUTH_URL}/conta`, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (!r.ok) return null;
  const dados = await r.json();
  const conta = dados.conta || dados;
  if (typeof window !== 'undefined') {
    localStorage.setItem('cora_conta', JSON.stringify(conta));
  }
  return conta;
}

// ---- retomar checkout que ficou pendente (clicou assinar sem conta) --------
export async function retomarCheckoutPendente() {
  if (typeof window === 'undefined') return false;
  const priceId = localStorage.getItem('cora_checkout_pendente');
  if (!priceId) return false;
  localStorage.removeItem('cora_checkout_pendente');
  try {
    await iniciarCheckout(priceId);
    return true;
  } catch (e) {
    return false;
  }
}
export async function entrar({ email, senha }) {
  const r = await fetch(`${AUTH_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  const dados = await r.json();
  if (!r.ok) {
    // conta existe mas email não confirmado
    if (dados.precisa_verificar) {
      const err = new Error(dados.erro || 'Confirme seu email antes de entrar.');
      err.precisaVerificar = true;
      err.email = dados.email || email;
      throw err;
    }
    throw new Error(dados.erro || 'Email ou senha incorretos');
  }
  salvarSessao(dados.token, dados.conta);
  return dados.conta;
}

// ---- ADMIN ----------------------------------------------------------------
export async function adminListarAssinantes() {
  const token = lerToken();
  if (!token) throw new Error('Não autenticado');
  const r = await fetch(`${AUTH_URL}/admin/assinantes`, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Acesso negado');
  return dados.assinantes || [];
}

export async function adminMudarPlano(contaId, plano) {
  const token = lerToken();
  const r = await fetch(`${AUTH_URL}/admin/conta/${contaId}/plano`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ plano }),
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao mudar plano');
  return true;
}

export async function adminCancelar(contaId) {
  const token = lerToken();
  const r = await fetch(`${AUTH_URL}/admin/conta/${contaId}/cancelar`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao cancelar');
  return true;
}

export async function adminDadosFiscais() {
  const token = lerToken();
  const r = await fetch(`${AUTH_URL}/admin/dados-fiscais`, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao buscar dados fiscais');
  return dados.linhas || [];
}

export async function adminDeletarConta(contaId) {
  const token = lerToken();
  const r = await fetch(`${AUTH_URL}/admin/conta/${contaId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao deletar conta');
  return true;
}

// ---- foto de perfil (base64 no banco, igual ao plugin) --------------------
export async function salvarFoto(fotoUrl) {
  const token = lerToken();
  if (!token) throw new Error('Não autenticado');
  const r = await fetch(`${AUTH_URL}/conta`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ foto_url: fotoUrl }),
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao salvar foto');
  // atualiza a conta guardada no navegador com a nova foto
  if (dados.conta) {
    localStorage.setItem('cora_conta', JSON.stringify(dados.conta));
  }
  return dados.conta;
}

// ---- perfil: salvar campos gerais -----------------------------------------
export async function salvarPerfil(campos) {
  const token = lerToken();
  if (!token) throw new Error('Não autenticado');
  const r = await fetch(`${AUTH_URL}/conta`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(campos),
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao salvar');
  if (dados.conta) localStorage.setItem('cora_conta', JSON.stringify(dados.conta));
  return dados.conta;
}

// ---- deletar a própria conta ----------------------------------------------
export async function deletarMinhaConta() {
  const token = lerToken();
  const r = await fetch(`${AUTH_URL}/conta`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) {
    const err = new Error(dados.erro || 'Erro ao deletar conta');
    if (dados.tem_plano_ativo) err.temPlanoAtivo = true;
    throw err;
  }
  return true;
}

// ---- aplicar tema (claro/escuro/sistema) no site --------------------------
export function aplicarTema(tema) {
  if (typeof document === 'undefined') return;
  let efetivo = tema;
  if (tema === 'sistema') {
    efetivo = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else if (tema === 'escuro') {
    efetivo = 'dark';
  } else if (tema === 'claro') {
    efetivo = 'light';
  }
  document.documentElement.setAttribute('data-theme', efetivo === 'dark' ? 'dark' : 'light');
  try { localStorage.setItem('cora_tema', tema); } catch (e) {}
}

// ---- dispositivos (PCs conectados) ----------------------------------------
export async function listarDispositivos() {
  const token = lerToken();
  if (!token) throw new Error('Não autenticado');
  const r = await fetch(`${AUTH_URL}/device/listar`, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao listar dispositivos');
  return dados.dispositivos || [];
}

export async function removerDispositivo(id) {
  const token = lerToken();
  const r = await fetch(`${AUTH_URL}/device/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao remover dispositivo');
  return true;
}

// ---- download do plugin (link protegido do R2) ----------------------------
export async function baixarPlugin() {
  const token = lerToken();
  if (!token) throw new Error('Não autenticado');
  const r = await fetch(`${AUTH_URL}/plugin/download`, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro ao gerar o download');
  return dados.url;
}

// ---- iniciar checkout de EQUIPE (assinar Teams) ---------------------------
// Precisa estar logado. Se não estiver, guarda a intenção e manda pro cadastro.
export async function iniciarCheckoutEquipe(plano, assentos, guiaPreAberta) {
  const token = lerToken();
  if (typeof window !== 'undefined') localStorage.removeItem('cora_checkout_pendente');
  if (!token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cora_equipe_pendente', JSON.stringify({ plano, assentos }));
      window.location.href = '/cadastro';
    }
    return;
  }
  const r = await fetch(`${AUTH_URL}/stripe/checkout-equipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ plano, assentos }),
  });
  const dados = await r.json();
  if (!r.ok) {
    if (guiaPreAberta) guiaPreAberta.close();
    if (dados.precisa_cpf) {
      const err = new Error('CPF necessário');
      err.precisaCpf = true;
      throw err;
    }
    if (dados.ja_tem_equipe) {
      const err = new Error('Você já tem uma equipe ativa');
      err.jaTemEquipe = true;
      throw err;
    }
    throw new Error(dados.erro || 'Não foi possível iniciar o pagamento');
  }
  if (dados.url && typeof window !== 'undefined') {
    if (guiaPreAberta) guiaPreAberta.location.href = dados.url;
    else window.open(dados.url, '_blank');
    // a guia original volta pra conta; o workspace só abre após o pagamento (success_url)
    window.location.href = '/conta';
  }
}

// ---- retomar compra de EQUIPE pendente (após login/cadastro) ---------------
// Se a pessoa tentou assinar equipe sem conta, guardamos a escolha.
// Após logar, mandamos ela de volta pra /teams pra concluir (CPF + pagamento).
export function temEquipePendente() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('cora_equipe_pendente');
}
export function lerEquipePendente() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('cora_equipe_pendente')); }
  catch (e) { return null; }
}
export function limparEquipePendente() {
  if (typeof window !== 'undefined') localStorage.removeItem('cora_equipe_pendente');
}
