import {
  BADGE1_SVG,
  BADGE2_SVG,
  BADGE3_SVG,
} from '../components/characterSvgAssets';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');

const BADGES_STORAGE_KEY = 'everquest_user_badges_v1';
const FOCUS_DAILY_STATS_KEY = 'everquest_focus_daily_stats_v1';
const TASKS_STORAGE_KEY = 'everquest_tasks_v1';

export const BADGE_SVG_MAP = {
  badge1: BADGE1_SVG,
  badge2: BADGE2_SVG,
  badge3: BADGE3_SVG,
};

/**
 * Converte qualquer SVG XML colorido para tons de cinza (para badges ainda não conquistadas).
 */
export function toGrayscaleSvg(svgXml) {
  if (!svgXml || typeof svgXml !== 'string') return '';
  return svgXml.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match, hex) => {
    let fullHex = hex;
    if (hex.length === 3) {
      fullHex = hex
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    const r = parseInt(fullHex.slice(0, 2), 16);
    const g = parseInt(fullHex.slice(2, 4), 16);
    const b = parseInt(fullHex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return match;
    }
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    // Suaviza o contraste para um aspecto metálico acinzentado de insígnia bloqueada
    const toned = Math.min(220, Math.max(92, Math.round(lum * 0.65 + 58)));
    const grayHex = toned.toString(16).padStart(2, '0').toUpperCase();
    return `#${grayHex}${grayHex}${grayHex}`;
  });
}

export const BADGE_GRAY_SVG_MAP = {
  badge1: toGrayscaleSvg(BADGE1_SVG),
  badge2: toGrayscaleSvg(BADGE2_SVG),
  badge3: toGrayscaleSvg(BADGE3_SVG),
};

export const DEFAULT_BADGES = [
  {
    id: 'badge1',
    title: 'Primeira tarefa',
    description: 'Conclua sua primeira tarefa',
    image: 'badge1',
    goalType: 'tasks_completed',
    goalTarget: 1,
    goal: {
      type: 'tasks_completed',
      target: 1,
      progress: 0,
      label: '0/1 tarefa concluída',
    },
    progress: 0,
    unlocked: false,
    unlockedAt: null,
    svgColor: BADGE1_SVG,
    svgGray: BADGE_GRAY_SVG_MAP.badge1,
    svg: BADGE_GRAY_SVG_MAP.badge1,
  },
  {
    id: 'badge2',
    title: 'Construindo comunidade',
    description: 'Atinja o número de 10 amigos',
    image: 'badge2',
    goalType: 'friends_count',
    goalTarget: 10,
    goal: {
      type: 'friends_count',
      target: 10,
      progress: 0,
      label: '0/10 amigos',
    },
    progress: 0,
    unlocked: false,
    unlockedAt: null,
    svgColor: BADGE2_SVG,
    svgGray: BADGE_GRAY_SVG_MAP.badge2,
    svg: BADGE_GRAY_SVG_MAP.badge2,
  },
  {
    id: 'badge3',
    title: 'Suma transcendência',
    description: 'Foque por 30 horas',
    image: 'badge3',
    goalType: 'focus_hours',
    goalTarget: 30,
    goal: {
      type: 'focus_hours',
      target: 30,
      progress: 0,
      label: '0/30h de foco',
    },
    progress: 0,
    unlocked: false,
    unlockedAt: null,
    svgColor: BADGE3_SVG,
    svgGray: BADGE_GRAY_SVG_MAP.badge3,
    svg: BADGE_GRAY_SVG_MAP.badge3,
  },
];

let memoryBadgesStore = {};

function getUserKey(user) {
  if (!user) return 'guest-jsalless';
  if (user.id) return String(user.id);
  const uname =
    user.user_metadata?.username ||
    user.username ||
    (user.email ? user.email.split('@')[0] : '');
  return uname ? `user-${uname.toLowerCase()}` : 'guest-jsalless';
}

function readLocalStorage(key, fallback) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch (_) {}
  return memoryBadgesStore[key] ?? fallback;
}

function writeLocalStorage(key, value) {
  memoryBadgesStore[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (_) {}
}

function getLocalActivitySnapshot() {
  let tasksCompleted = 0;
  let focusSeconds = 0;

  try {
    const rawTasks = readLocalStorage(TASKS_STORAGE_KEY, null);
    if (Array.isArray(rawTasks)) {
      tasksCompleted = rawTasks.filter((t) => Boolean(t?.completed)).length;
    }
  } catch (_) {}

  try {
    const rawFocus = readLocalStorage(FOCUS_DAILY_STATS_KEY, null);
    if (rawFocus && typeof rawFocus === 'object') {
      if (typeof rawFocus.focusSeconds === 'number') {
        focusSeconds = Math.max(0, rawFocus.focusSeconds);
      } else {
        Object.values(rawFocus).forEach((entry) => {
          if (entry && typeof entry === 'object') {
            focusSeconds += Math.max(0, Number(entry.focusSeconds) || 0);
          }
        });
      }
    }
  } catch (_) {}

  return {
    tasksCompleted,
    focusSeconds,
    focusHours: Math.floor(focusSeconds / 3600),
  };
}

export function resolveBadgeSvg(imageOrId) {
  const key = String(imageOrId || 'badge1')
    .trim()
    .toLowerCase();
  if (key.startsWith('<svg')) return imageOrId;
  if (BADGE_SVG_MAP[key]) return BADGE_SVG_MAP[key];
  if (key.includes('2')) return BADGE2_SVG;
  if (key.includes('3')) return BADGE3_SVG;
  return BADGE1_SVG;
}

export function resolveBadgeGraySvg(imageOrId) {
  const key = String(imageOrId || 'badge1')
    .trim()
    .toLowerCase();
  if (BADGE_GRAY_SVG_MAP[key]) return BADGE_GRAY_SVG_MAP[key];
  if (key.includes('2')) return BADGE_GRAY_SVG_MAP.badge2;
  if (key.includes('3')) return BADGE_GRAY_SVG_MAP.badge3;
  const colorSvg = resolveBadgeSvg(imageOrId);
  return toGrayscaleSvg(colorSvg);
}

export function formatGoalLabel(goalType, goalTarget, progress) {
  const target = Math.max(1, Number(goalTarget) || 1);
  const curr = Math.max(0, Number(progress) || 0);
  if (goalType === 'tasks_completed') {
    return `${curr}/${target} ${target === 1 ? 'tarefa concluída' : 'tarefas concluídas'}`;
  }
  if (goalType === 'friends_count') {
    return `${curr}/${target} amigos`;
  }
  if (goalType === 'focus_hours') {
    return `${curr}/${target}h de foco`;
  }
  return `${curr}/${target}`;
}

export function normalizeBadgeItem(raw) {
  const id = String(raw?.id || 'badge1');
  const image = String(raw?.image || id || 'badge1');
  const goalType = String(
    raw?.goalType || raw?.goal_type || raw?.goal?.type || 'tasks_completed'
  );
  const goalTarget = Math.max(
    1,
    Number(raw?.goalTarget ?? raw?.goal_target ?? raw?.goal?.target ?? 1) || 1
  );
  const progress = Math.min(
    goalTarget,
    Math.max(0, Number(raw?.progress ?? raw?.goal?.progress ?? 0) || 0)
  );
  // Só desbloqueia se o usuário cumpriu o objetivo necessário (progress >= goalTarget) ou já consta unlocked no banco
  const unlocked = Boolean(
    (raw?.unlocked && progress >= goalTarget) || progress >= goalTarget
  );
  const title = String(raw?.title || 'Insígnia');
  const description = String(raw?.description || '');
  const unlockedAt = unlocked
    ? raw?.unlockedAt ||
      raw?.unlocked_at ||
      new Date().toLocaleDateString('pt-BR')
    : null;

  const svgColor = resolveBadgeSvg(image);
  const svgGray = resolveBadgeGraySvg(image);

  return {
    id,
    title,
    description,
    image,
    goalType,
    goalTarget,
    goal: {
      type: goalType,
      target: goalTarget,
      progress,
      label:
        raw?.goal?.label || formatGoalLabel(goalType, goalTarget, progress),
    },
    progress,
    unlocked,
    unlockedAt,
    descriptionPrefix: `${description}. Objetivo (${formatGoalLabel(
      goalType,
      goalTarget,
      progress
    )}) — conquista `,
    svgColor,
    svgGray,
    svg: unlocked ? svgColor : svgGray,
  };
}

export function loadCachedUserBadges(user) {
  const userKey = getUserKey(user);
  const all = readLocalStorage(BADGES_STORAGE_KEY, {});
  const cached = all[userKey];
  if (Array.isArray(cached) && cached.length > 0) {
    return cached.map(normalizeBadgeItem);
  }
  return DEFAULT_BADGES.map(normalizeBadgeItem);
}

function saveCachedUserBadges(user, badges) {
  const userKey = getUserKey(user);
  const all = readLocalStorage(BADGES_STORAGE_KEY, {});
  const normalized = (badges || []).map(normalizeBadgeItem);
  all[userKey] = normalized;
  writeLocalStorage(BADGES_STORAGE_KEY, all);
  return normalized;
}

export async function fetchUserBadges(user, extraStats = {}) {
  const userKey = getUserKey(user);
  const localSnap = getLocalActivitySnapshot();

  const tasksCompletedVal =
    extraStats.tasksCompleted !== undefined
      ? Math.max(localSnap.tasksCompleted, Number(extraStats.tasksCompleted) || 0)
      : localSnap.tasksCompleted;
  const focusSecondsVal =
    extraStats.focusSeconds !== undefined
      ? Math.max(localSnap.focusSeconds, Number(extraStats.focusSeconds) || 0)
      : localSnap.focusSeconds;

  const params = new URLSearchParams({
    user_id: userKey,
    tasks_completed: String(tasksCompletedVal),
    focus_seconds: String(focusSecondsVal),
  });
  if (extraStats.friendsCount !== undefined) {
    params.set('friends_count', String(extraStats.friendsCount));
  }

  try {
    const res = await fetch(`${API_URL}/badges?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.badges) && data.badges.length > 0) {
        const normalized = saveCachedUserBadges(user, data.badges);
        return {
          badges: normalized,
          unlockedBadges: normalized.filter((b) => b.unlocked),
          newlyUnlocked: (data.newlyUnlocked || []).map(normalizeBadgeItem),
          stats: data.stats || null,
        };
      }
    }
  } catch (_) {}

  const fallback = loadCachedUserBadges(user);
  return {
    badges: fallback,
    unlockedBadges: fallback.filter((b) => b.unlocked),
    newlyUnlocked: [],
    stats: null,
  };
}

export async function createBadgeInBackend(user, payload) {
  const userKey = getUserKey(user);
  const response = await fetch(`${API_URL}/badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userKey,
      id: payload.id,
      title: payload.title,
      description: payload.description,
      image: payload.image || 'badge1',
      goal_type: payload.goalType || payload.goal_type || 'tasks_completed',
      goal_target: Number(payload.goalTarget ?? payload.goal_target ?? 1) || 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Não foi possível criar a insígnia.');
  }

  const badges = Array.isArray(data.badges)
    ? saveCachedUserBadges(user, data.badges)
    : loadCachedUserBadges(user);

  return {
    message: data.message || 'Insígnia criada com sucesso!',
    badge: data.badge ? normalizeBadgeItem(data.badge) : null,
    badges,
  };
}

export async function evaluateUserBadgesInBackend(user, stats = {}) {
  const userKey = getUserKey(user);
  try {
    const response = await fetch(`${API_URL}/badges/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userKey,
        tasks_completed_total: stats.tasksCompletedTotal,
        focus_seconds_total: stats.focusSecondsTotal,
        friends_count: stats.friendsCount,
        focus_hours: stats.focusHours,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      const normalized = saveCachedUserBadges(user, data.badges || []);
      return {
        badges: normalized,
        unlockedBadges: normalized.filter((b) => b.unlocked),
        newlyUnlocked: (data.newlyUnlocked || []).map(normalizeBadgeItem),
      };
    }
  } catch (_) {}

  const fallback = loadCachedUserBadges(user);
  return {
    badges: fallback,
    unlockedBadges: fallback.filter((b) => b.unlocked),
    newlyUnlocked: [],
  };
}
