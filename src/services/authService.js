import * as sessionStorage from './sessionStorage';
import { toast } from '../utils/toast';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SECRET_KEY = process.env.EXPO_PUBLIC_SUPABASE_SECRET_KEY || '';
const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

let memorySession = null;
let memoryUsers = [];
const SESSION_KEY = 'everquest_session';

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

function normalizeSession(data) {
  const { user, access_token, refresh_token, shop_token, needsOnboarding } = data ?? {};
  if (typeof user?.id !== 'string' || !user.id.trim()) {
    throw new Error('A sessão não contém uma conta válida.');
  }
  const { id, email, username, avatarConfig, user_metadata } = user;
  return {
    user: {
      id, email, username, avatarConfig,
      user_metadata: {
        username: user_metadata?.username,
        display_name: user_metadata?.display_name,
      },
    },
    access_token,
    refresh_token,
    shop_token,
    ...(needsOnboarding === true ? { needsOnboarding: true } : {}),
  };
}

export async function saveSession(sessionData) {
  const session = normalizeSession(sessionData);
  memorySession = session;
  try {
    await sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    toast.warn('Não foi possível lembrar seu login neste dispositivo. A sessão continua aberta por enquanto.');
  }
  return session;
}

export async function restoreSession() {
  if (memorySession) return memorySession;
  const raw = await sessionStorage.getItem(SESSION_KEY);
  if (raw === null) return null;
  try {
    memorySession = normalizeSession(JSON.parse(raw));
    return memorySession;
  } catch {
    await clearSession();
    throw new Error('O login salvo estava inválido e foi removido.');
  }
}

export async function clearSession() {
  try {
    await sessionStorage.removeItem(SESSION_KEY);
  } catch {
    throw new Error('Não foi possível remover a sessão deste aparelho. Tente novamente.');
  }
  memorySession = null;
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

async function updateAccountEndpoint(path, payload) {
  const session = memorySession;
  if (!session?.access_token) {
    throw new Error('Entre novamente para alterar sua conta.');
  }
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Nenhuma alteração foi salva.');
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Não foi possível salvar as alterações.');
  }
  if (!data.user?.id || data.user.id !== session.user?.id) {
    throw new Error('O servidor retornou uma conta inválida. Entre novamente.');
  }
  const updated = {
    ...session,
    ...(data.shop_token ? { shop_token: data.shop_token } : {}),
    user: { ...session.user, ...data.user },
  };
  return saveSession(updated);
}

export function updateAccount({ username, email, currentPassword }) {
  return updateAccountEndpoint('/auth/account', {
    username, email, current_password: currentPassword,
  });
}

export function updatePassword({ currentPassword, newPassword }) {
  return updateAccountEndpoint('/auth/password', {
    current_password: currentPassword, new_password: newPassword,
  });
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
    return saveSession({ ...data, needsOnboarding: true });
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
        return saveSession({ ...sessionPayload, needsOnboarding: true });
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
    return saveSession({ ...localSession, needsOnboarding: true });
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
    return saveSession(data);
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
        return saveSession(data);
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
    return saveSession(localSession);
  }
}
