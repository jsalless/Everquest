const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request(token, path, method = 'GET', body, signal) {
  if (!token) throw new Error('Entre pela sua conta do servidor para focar com amigos.');
  const started = Date.now();
  let response;
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort);
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (timedOut) throw new Error('O servidor de foco demorou a responder. Tente novamente.');
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar ao servidor de foco.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
  const received = Date.now();
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('O servidor de foco retornou uma resposta inválida.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('O servidor de foco retornou uma resposta inválida.');
  }
  if (!response.ok) throw new Error(data.detail || 'Não foi possível atualizar a sessão de foco.');
  if (data.session) {
    const session = data.session;
    if (typeof session.id !== 'string' || typeof session.hostId !== 'string' ||
        typeof session.guestId !== 'string' ||
        !['pending', 'running', 'paused', 'completed', 'declined', 'cancelled', 'expired'].includes(session.status) ||
        !Number.isFinite(session.elapsedMs) || session.elapsedMs < 0 ||
        !Number.isFinite(session.durationSeconds) || session.durationSeconds < 0) {
      throw new Error('O servidor retornou uma sessão de foco inválida.');
    }
    data.session = {
      ...session,
      receivedAt: received,
      elapsedMs: session.elapsedMs + (session.status === 'running' ? (received - started) / 2 : 0),
    };
  }
  return data;
}

export async function fetchFocusSession(token, sessionId, signal) {
  const suffix = sessionId ? `/${encodeURIComponent(sessionId)}` : '';
  const data = await request(token, `/focus-sessions${suffix}`, 'GET', undefined, signal);
  if (!Object.prototype.hasOwnProperty.call(data, 'session')) {
    throw new Error('O servidor não informou a sessão de foco.');
  }
  return data.session;
}

export async function inviteFocusFriend(token, friendId, durationSeconds) {
  const result = await request(token, '/focus-sessions', 'POST', { friendId, durationSeconds });
  if (!result.session) throw new Error('O servidor não confirmou o convite.');
  return result;
}

export async function updateFocusSession(token, sessionId, action) {
  const result = await request(token, `/focus-sessions/${encodeURIComponent(sessionId)}/${action}`, 'POST');
  if (!result.session) throw new Error('O servidor não confirmou a alteração da sessão.');
  return result;
}

export async function fetchFocusHistory(token, cursor, signal) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const data = await request(token, `/focus-sessions/history${suffix}`, 'GET', undefined, signal);
  if (!Array.isArray(data.sessions) || (data.nextCursor !== null && typeof data.nextCursor !== 'string')) {
    throw new Error('O servidor retornou um histórico de foco inválido.');
  }
  for (const session of data.sessions) {
    if (typeof session.id !== 'string' || session.status !== 'completed' ||
        typeof session.credited !== 'boolean' || !Number.isFinite(session.elapsedMs) ||
        session.elapsedMs < 0 || !Number.isFinite(session.durationSeconds) || session.durationSeconds < 0 ||
        (session.credited && (typeof session.creditedDate !== 'string' ||
          !Number.isInteger(session.creditedOffset) || session.creditedOffset < -840 || session.creditedOffset > 720)) ||
        !session.completedAt || !Number.isFinite(new Date(session.completedAt).getTime())) {
      throw new Error('O servidor retornou uma sessão concluída inválida.');
    }
  }
  return data;
}

export async function creditFocusSession(token, sessionId, offsetMinutes, signal) {
  const data = await request(token, `/focus-sessions/${encodeURIComponent(sessionId)}/credit`,
    'POST', { offsetMinutes }, signal);
  if (typeof data.credited !== 'boolean' || (data.credited &&
      (typeof data.dateKey !== 'string' || !Number.isInteger(data.offsetMinutes) ||
       data.offsetMinutes < -840 || data.offsetMinutes > 720))) {
    throw new Error('O servidor não confirmou a sessão de foco.');
  }
  return data;
}

export async function registerFocusDevice(token, deviceToken) {
  const result = await request(token, '/focus-push-device', 'POST', { token: deviceToken });
  if (result.ok !== true) throw new Error('O servidor não confirmou o registro das notificações.');
}

export async function unregisterFocusDevice(token, deviceToken) {
  const result = await request(token, '/focus-push-device', 'DELETE', { token: deviceToken });
  if (result.ok !== true) throw new Error('O servidor não confirmou a remoção das notificações.');
}

export function sharedFocusSeconds(session, now = Date.now()) {
  const elapsed = session.elapsedMs +
    (session.status === 'running' ? Math.max(0, now - session.receivedAt) : 0);
  return session.durationSeconds > 0
    ? Math.max(0, Math.ceil((session.durationSeconds * 1000 - elapsed) / 1000))
    : Math.floor(elapsed / 1000);
}
