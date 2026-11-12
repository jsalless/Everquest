const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SECRET_KEY = process.env.EXPO_PUBLIC_SUPABASE_SECRET_KEY || '';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

let memorySession = null;

export function saveSession(sessionData) {
  memorySession = sessionData;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('everquest_session', JSON.stringify(sessionData));
    }
  } catch (_) { }
}

export function getSession() {
  if (memorySession) return memorySession;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('everquest_session');
      if (raw) {
        memorySession = JSON.parse(raw);
        return memorySession;
      }
    }
  } catch (_) { }
  return null;
}

export function clearSession() {
  memorySession = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('everquest_session');
    }
  } catch (_) { }
}

function translateError(msg = '') {
  const lower = msg.toLowerCase();
  if (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('user already exists')
  ) {
    return 'Este e-mail já está cadastrado.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (lower.includes('email rate limit exceeded')) {
    return 'Limite de tentativas excedido. Tente novamente em instantes.';
  }
  return msg;
}

export async function registerUser({ username, email, password }) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(translateError(data.detail || 'Erro ao criar conta'));
    }
    saveSession(data);
    return data;
  } catch (err) {
    if (
      err.message &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('Network request failed')
    ) {
      throw err;
    }

    // Fallback direto usando a Admin API com email_confirm: true (nunca cai em email rate limit!)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: username },
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      const raw =
        createData.msg ||
        createData.error_description ||
        createData.message ||
        'Erro ao criar conta';
      throw new Error(translateError(raw));
    }

    // Já realiza o auto-login imediato
    const loginRes = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }
    );
    const loginData = loginRes.ok ? await loginRes.json() : {};

    const sessionPayload = {
      message: 'Conta criada e autenticada com sucesso!',
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token,
      user: loginData.user || createData,
    };
    saveSession(sessionPayload);
    return sessionPayload;
  }
}

export async function loginUser({ email, password }) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        translateError(data.detail || 'E-mail ou senha inválidos')
      );
    }
    saveSession(data);
    return data;
  } catch (err) {
    if (
      err.message &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('Network request failed')
    ) {
      throw err;
    }

    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      const raw =
        data.msg ||
        data.error_description ||
        data.message ||
        'E-mail ou senha inválidos';
      throw new Error(translateError(raw));
    }
    saveSession(data);
    return data;
  }
}
