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

// ---- entrar ----------------------------------------------------------------
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
