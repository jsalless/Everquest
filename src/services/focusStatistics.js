import AsyncStorage from '@react-native-async-storage/async-storage';
import { creditFocusSession, fetchFocusHistory } from './focusSessionService';

const SOLO_KEY = 'everquest_focus_daily_stats_v1';
const SHARED_KEY = 'everquest_shared_focus_stats_v1:';
let soloStats = {};
let loadPromise;
let writes = Promise.resolve();

function parseStats(raw) {
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('As estatísticas de foco salvas são inválidas.');
  }
  for (const day of Object.values(parsed)) {
    if (!day || typeof day !== 'object' || Array.isArray(day) ||
        !Number.isFinite(day.totalSeconds) || day.totalSeconds < 0 ||
        !Number.isInteger(day.sessionsCount) || day.sessionsCount < 0 ||
        (day.sessions != null && (!Array.isArray(day.sessions) ||
          day.sessions.some((session) => !session || typeof session.time !== 'string')))) {
      throw new Error('As estatísticas de foco salvas são inválidas.');
    }
  }
  return parsed;
}

export function getFocusStatsSnapshot() {
  return soloStats;
}

export function loadFocusStats() {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(SOLO_KEY).then((raw) => {
      soloStats = parseStats(raw);
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise.then(() => soloStats);
}

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addSession(stats, session, date, key = dateKey(date)) {
  const day = stats[key] || { totalSeconds: 0, sessionsCount: 0, sessions: [] };
  stats[key] = {
    totalSeconds: day.totalSeconds + session.durationSeconds,
    sessionsCount: day.sessionsCount + 1,
    sessions: [session, ...(day.sessions || [])].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 30),
  };
}

export function recordSoloFocus(seconds, mode, focoTotal) {
  const operation = writes.then(async () => {
    await loadFocusStats();
    const now = new Date();
    const next = { ...soloStats };
    addSession(next, {
      id: `${Date.now()}`, time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      durationSeconds: seconds, mode, focoTotal,
    }, now);
    soloStats = next;
    await AsyncStorage.setItem(SOLO_KEY, JSON.stringify(next));
    return next;
  });
  writes = operation.then(() => undefined, (error) => {
    console.error('Não foi possível salvar as estatísticas de foco:', error.message);
  });
  return operation;
}

export async function loadSharedFocusStats(userId) {
  return parseStats(await AsyncStorage.getItem(`${SHARED_KEY}${userId}`));
}

export function mergeFocusStats(solo, shared) {
  const result = { ...solo };
  for (const [key, day] of Object.entries(shared)) {
    const existing = result[key] || { totalSeconds: 0, sessionsCount: 0, sessions: [] };
    result[key] = {
      totalSeconds: existing.totalSeconds + day.totalSeconds,
      sessionsCount: existing.sessionsCount + day.sessionsCount,
      sessions: [...(existing.sessions || []), ...(day.sessions || [])]
        .sort((a, b) => b.time.localeCompare(a.time)).slice(0, 30),
    };
  }
  return result;
}

export async function recoverSharedFocusStats(token, userId, signal) {
  let cursor = null;
  const seen = new Set();
  const stats = {};
  do {
    const page = await fetchFocusHistory(token, cursor, signal);
    for (const session of page.sessions) {
      if (seen.has(session.id)) throw new Error('O servidor retornou sessões de foco duplicadas.');
      seen.add(session.id);
      const seconds = Math.floor(session.elapsedMs / 1000);
      if (!seconds) continue;
      const date = new Date(session.completedAt);
      let offset = session.credited ? session.creditedOffset : date.getTimezoneOffset();
      let creditedDate = session.creditedDate;
      if (!session.credited) {
        const credit = await creditFocusSession(token, session.id, offset, signal);
        if (!credit.credited) throw new Error('O servidor não creditou a sessão de foco.');
        offset = credit.offsetMinutes;
        creditedDate = credit.dateKey;
      }
      const localTime = new Date(date.getTime() - offset * 60000);
      const key = localTime.toISOString().slice(0, 10);
      if (creditedDate !== key) {
        throw new Error('O servidor retornou uma data de foco inválida.');
      }
      addSession(stats, {
        id: session.id,
        time: `${String(localTime.getUTCHours()).padStart(2, '0')}:${String(localTime.getUTCMinutes()).padStart(2, '0')}`,
        durationSeconds: seconds,
        mode: session.durationSeconds ? 'Temporizador' : 'Cronômetro',
        focoTotal: false,
      }, date, key);
    }
    if (page.nextCursor && (page.nextCursor === cursor || !seen.has(page.nextCursor))) {
      throw new Error('O servidor retornou uma página de foco inválida.');
    }
    cursor = page.nextCursor;
  } while (cursor);
  await AsyncStorage.setItem(`${SHARED_KEY}${userId}`, JSON.stringify(stats));
  return { stats };
}
