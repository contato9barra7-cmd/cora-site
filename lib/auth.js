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
export async function iniciarCheckout(priceId) {
  const token = lerToken();
  if (!token) {
    // não logado → manda pro cadastro, guardando o que ele queria comprar
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
  if (!r.ok) throw new Error(dados.erro || 'Não foi possível iniciar o pagamento');
  if (dados.url && typeof window !== 'undefined') {
    window.location.href = dados.url; // vai para a página de pagamento do Stripe
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
