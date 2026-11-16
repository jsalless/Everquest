const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SECRET_KEY = process.env.EXPO_PUBLIC_SUPABASE_SECRET_KEY || '';
const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

let memorySession = null;
let memoryUsers = [];

function getLocalUsers() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('everquest_local_users');
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (_) {}
  return memoryUsers;
}

function saveLocalUsers(users) {
  memoryUsers = users;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('everquest_local_users', JSON.stringify(users));
    }
  } catch (_) {}
}

function buildLocalSession({ email, username }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const resolvedUsername =
    (username || '').trim() ||
    (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail) ||
    'viajante';

  return {
    message: 'Autenticado com sucesso!',
    access_token: `local_access_${Date.now()}`,
    refresh_token: `local_refresh_${Date.now()}`,
    user: {
      id: `local_${cleanEmail || Date.now()}`,
      email: cleanEmail,
      username: resolvedUsername,
      user_metadata: {
        username: resolvedUsername,
        display_name: resolvedUsername,
      },
    },
  };
}

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

function isNetworkOrParseError(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('unexpected token') ||
    msg.includes('json')
  );
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
    if (!isNetworkOrParseError(err)) {
      throw err;
    }

    if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
      try {
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
      } catch (supaErr) {
        if (!isNetworkOrParseError(supaErr)) {
          throw supaErr;
        }
      }
    }

    // Fallback local quando backend/Supabase não estão configurados no ambiente
    const users = getLocalUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email === normalizedEmail);
    if (existing) {
      throw new Error('Este e-mail já está cadastrado.');
    }
    users.push({
      username: username.trim(),
      email: normalizedEmail,
      password,
    });
    saveLocalUsers(users);

    const localSession = buildLocalSession({ email: normalizedEmail, username });
    saveSession(localSession);
    return localSession;
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
    if (!isNetworkOrParseError(err)) {
      throw err;
    }

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
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
      } catch (supaErr) {
        if (!isNetworkOrParseError(supaErr)) {
          throw supaErr;
        }
      }
    }

    // Fallback local quando backend/Supabase não estão ativos ou sem .env
    const users = getLocalUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const foundUser = users.find((u) => u.email === normalizedEmail);
    if (foundUser && foundUser.password !== password) {
      throw new Error('E-mail ou senha incorretos.');
    }

    const localSession = buildLocalSession({
      email: normalizedEmail,
      username: foundUser?.username,
    });
    saveSession(localSession);
    return localSession;
  }
}
