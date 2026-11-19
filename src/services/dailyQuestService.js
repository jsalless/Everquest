import { loadSavedTasks } from './taskService';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');

const SUPABASE_URL = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://gfnlbnsezgrkmtzewube.supabase.co'
).replace(/\/$/, '');

const SUPABASE_API_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_s5Dz7ucCwttYh-2ipIojwg_SYrzmYyq';

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_API_KEY,
    Authorization: `Bearer ${SUPABASE_API_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function syncQuestsAndCountersToSupabase(userKey, todayKey, quests, stats) {
  if (!SUPABASE_URL || !SUPABASE_API_KEY) return;
  try {
    if (stats) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/daily_activity_counters?on_conflict=user_id,activity_date`,
        {
          method: 'POST',
          headers: getSupabaseHeaders({
            Prefer: 'resolution=merge-duplicates,return=minimal',
          }),
          body: JSON.stringify({
            user_id: userKey,
            activity_date: todayKey,
            focus_sessions: stats.focusSessionsToday || 0,
            focus_seconds: stats.focusSecondsToday || 0,
            tasks_completed: stats.tasksCompletedToday || 0,
            tasks_created: stats.tasksCreatedToday || 0,
          }),
        }
      );
      if (!response.ok) throw new Error(`Contadores: HTTP ${response.status}`);
    }

    if (Array.isArray(quests) && quests.length > 0) {
      const payload = quests.map((q) => ({
        user_id: userKey,
        quest_date: todayKey,
        tier: q.tier,
        quest_id: q.questId || `${q.tier}_default`,
        title: q.title,
        metric: q.metric || 'focus_sessions',
        target: Math.max(1, Number(q.target) || 1),
        progress: Math.max(0, Number(q.progress) || 0),
        completed: Boolean(q.completed),
        claimed: Boolean(q.claimed),
        claimed_at: q.claimedAt || null,
        coins: Number(q.coins) || 0,
        xp: Number(q.xp) || 0,
      }));
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/daily_quests?on_conflict=user_id,quest_date,tier`,
        {
          method: 'POST',
          headers: getSupabaseHeaders({
            Prefer: 'resolution=merge-duplicates,return=minimal',
          }),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error(`Missões: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Não foi possível sincronizar as missões com o Supabase:', error);
  }
}

const REWARDS_STORAGE_KEY = 'everquest_user_rewards_v1';
const DAILY_QUESTS_STORAGE_KEY = 'everquest_daily_quests_v1';
const FOCUS_DAILY_STATS_KEY = 'everquest_focus_daily_stats_v1';

export const XP_PER_LEVEL = 100;

export function getLevelProgressFromXp(totalXp = 0) {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_PER_LEVEL;
  const xpForNextLevel = XP_PER_LEVEL;
  const progressPercent = Math.min(
    100,
    Math.round((currentLevelXp / xpForNextLevel) * 100)
  );

  return {
    level,
    totalXp: safeXp,
    currentLevelXp,
    xpForNextLevel,
    progressPercent,
  };
}

export const CHEST_TIERS = {
  wood: {
    id: 'wood',
    name: 'Wood',
    label: 'Baú Wood',
    coins: 3,
    xp: 5,
    accentColor: '#9E5D37',
    badgeBg: '#F6EADF',
    cardBg: '#FBF8F5',
    borderColor: '#E6D2C0',
  },
  iron: {
    id: 'iron',
    name: 'Iron',
    label: 'Baú Iron',
    coins: 5,
    xp: 10,
    accentColor: '#52687A',
    badgeBg: '#E6EEF4',
    cardBg: '#F7FAFC',
    borderColor: '#CEDCE6',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    label: 'Baú Gold',
    coins: 10,
    xp: 20,
    accentColor: '#B7791F',
    badgeBg: '#FEF3C7',
    cardBg: '#FFFDF5',
    borderColor: '#F4DF96',
  },
};

export const DAILY_QUEST_POOLS = {
  wood: [
    {
      id: 'wood_focus_1',
      title: 'Realize uma sessão de foco',
      target: 1,
      metric: 'focus_sessions',
    },
    {
      id: 'wood_focus_15m',
      title: 'Acumule 15 minutos em sessão de foco',
      target: 1,
      metric: 'focus_15m',
    },
    {
      id: 'wood_task_create',
      title: 'Planeje uma tarefa para o seu dia',
      target: 1,
      metric: 'tasks_created_today',
    },
  ],
  iron: [
    {
      id: 'iron_task_1',
      title: 'Realize uma tarefa',
      target: 1,
      metric: 'tasks_completed',
    },
    {
      id: 'iron_focus_2',
      title: 'Realize duas sessões de foco',
      target: 2,
      metric: 'focus_sessions',
    },
    {
      id: 'iron_task_priority',
      title: 'Conclua uma tarefa pendente hoje',
      target: 1,
      metric: 'tasks_completed',
    },
  ],
  gold: [
    {
      id: 'gold_task_3',
      title: 'Realize três tarefas',
      target: 3,
      metric: 'tasks_completed',
    },
    {
      id: 'gold_focus_3',
      title: 'Realize três sessões de foco no dia',
      target: 3,
      metric: 'focus_sessions',
    },
    {
      id: 'gold_combo',
      title: 'Realize duas tarefas e uma sessão de foco',
      target: 3,
      metric: 'combo_tasks_focus',
    },
  ],
};

let memoryRewardsByUser = {};
let memoryDailyQuestsByUser = {};

export function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getUserKey(user) {
  if (!user) return 'guest-jsalless';
  const raw =
    user.id ||
    user.email ||
    user?.user_metadata?.username ||
    user.username ||
    'guest-jsalless';
  return String(raw).trim().toLowerCase();
}

export function loadUserRewards(user) {
  const userKey = getUserKey(user);
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryRewardsByUser = parsed;
        }
      }
    }
  } catch (_) {}

  const current = memoryRewardsByUser[userKey] || {
    coins: 0,
    xp: 0,
    claimedCount: 0,
  };

  return {
    coins: Number(current.coins) || 0,
    xp: Number(current.xp) || 0,
    claimedCount: Number(current.claimedCount) || 0,
  };
}

export function saveUserRewards(user, nextRewards) {
  const userKey = getUserKey(user);
  const current = loadUserRewards(user);
  const sanitized = {
    coins: Math.max(
      0,
      Number(nextRewards.coins !== undefined ? nextRewards.coins : current.coins) || 0
    ),
    xp: Math.max(
      0,
      Number(nextRewards.xp !== undefined ? nextRewards.xp : current.xp) || 0
    ),
    claimedCount: Math.max(
      0,
      Number(
        nextRewards.claimedCount !== undefined
          ? nextRewards.claimedCount
          : current.claimedCount
      ) || 0
    ),
    updatedAt: new Date().toISOString(),
  };

  memoryRewardsByUser = {
    ...memoryRewardsByUser,
    [userKey]: sanitized,
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        REWARDS_STORAGE_KEY,
        JSON.stringify(memoryRewardsByUser)
      );
    }
  } catch (_) {}

  return sanitized;
}

function pickRandomItem(list, excludeId = null) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const candidates =
    excludeId && list.length > 1
      ? list.filter((item) => item.id !== excludeId)
      : list;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] || list[0];
}

export function getTodayActivityStats(todayKey = getTodayKey()) {
  let focusSessionsToday = 0;
  let focusSecondsToday = 0;
  let tasksCompletedToday = 0;
  let tasksCreatedToday = 0;

  try {
    if (typeof localStorage !== 'undefined') {
      const rawFocusStats = localStorage.getItem(FOCUS_DAILY_STATS_KEY);
      if (rawFocusStats) {
        const parsedStats = JSON.parse(rawFocusStats);
        const dayEntry = parsedStats?.[todayKey];
        if (dayEntry && typeof dayEntry === 'object') {
          focusSessionsToday = Math.max(
            0,
            Number(dayEntry.sessionsCount) ||
              (Array.isArray(dayEntry.sessions) ? dayEntry.sessions.length : 0)
          );
          focusSecondsToday = Math.max(0, Number(dayEntry.totalSeconds) || 0);
        }
      }
    }
  } catch (_) {}

  loadSavedTasks().forEach((task) => {
    if (task?.completed && task?.completedAtDate === todayKey) {
      tasksCompletedToday += 1;
    }
    if (task?.createdAtDate === todayKey) {
      tasksCreatedToday += 1;
    }
  });

  return {
    focusSessionsToday,
    focusSecondsToday,
    tasksCompletedToday,
    tasksCreatedToday,
  };
}

function computeAutoProgress(quest, stats) {
  const target = Math.max(1, Number(quest.target) || 1);
  if (quest.claimed) {
    return {
      progress: target,
      target,
      completed: true,
    };
  }

  let current = 0;
  switch (quest.metric) {
    case 'focus_sessions':
      current = stats.focusSessionsToday;
      break;
    case 'focus_15m':
      current = stats.focusSecondsToday >= 15 * 60 ? 1 : 0;
      break;
    case 'tasks_created_today':
      current = stats.tasksCreatedToday;
      break;
    case 'tasks_completed':
      current = stats.tasksCompletedToday;
      break;
    case 'combo_tasks_focus':
      current =
        Math.min(2, stats.tasksCompletedToday) +
        Math.min(1, stats.focusSessionsToday);
      break;
    default:
      current = 0;
  }

  const effectiveProgress = Math.min(target, Math.max(0, current));
  const completed = Boolean(quest.completed) || effectiveProgress >= target;

  return {
    progress: completed ? target : effectiveProgress,
    target,
    completed,
  };
}

function createDailyQuestsForDate(
  dateKey,
  useDefaultExamplesFirst = false,
  previousQuests = null
) {
  const prevByTier = {};
  if (Array.isArray(previousQuests)) {
    previousQuests.forEach((q) => {
      if (q?.tier) prevByTier[q.tier] = q.questId;
    });
  }

  return ['wood', 'iron', 'gold'].map((tierKey) => {
    const tierConfig = CHEST_TIERS[tierKey];
    const pool = DAILY_QUEST_POOLS[tierKey] || [];
    const chosen = useDefaultExamplesFirst
      ? pool[0]
      : pickRandomItem(pool, prevByTier[tierKey]);

    return {
      tier: tierKey,
      questId: chosen.id,
      title: chosen.title,
      metric: chosen.metric,
      target: chosen.target || 1,
      progress: 0,
      completed: false,
      claimed: false,
      coins: tierConfig.coins,
      xp: tierConfig.xp,
      dateKey,
    };
  });
}

function loadRawDailyState() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryDailyQuestsByUser = parsed;
        }
      }
    }
  } catch (_) {}
  return memoryDailyQuestsByUser;
}

function saveRawDailyState(nextMap) {
  memoryDailyQuestsByUser = nextMap;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        DAILY_QUESTS_STORAGE_KEY,
        JSON.stringify(memoryDailyQuestsByUser)
      );
    }
  } catch (_) {}
}

export function loadDailyQuests(user) {
  const userKey = getUserKey(user);
  const todayKey = getTodayKey();
  const stateMap = loadRawDailyState();
  const existing = stateMap[userKey];

  let quests;
  if (
    !existing ||
    existing.dateKey !== todayKey ||
    !Array.isArray(existing.quests)
  ) {
    const isFirstEver = !existing;
    quests = createDailyQuestsForDate(todayKey, isFirstEver, existing?.quests);
    saveRawDailyState({
      ...stateMap,
      [userKey]: {
        dateKey: todayKey,
        quests,
      },
    });
  } else {
    quests = existing.quests;
  }

  const stats = getTodayActivityStats(todayKey);
  const syncedQuests = quests.map((q) => {
    const tierInfo = CHEST_TIERS[q.tier] || CHEST_TIERS.wood;
    const { progress, target, completed } = computeAutoProgress(q, stats);
    return {
      ...q,
      coins: tierInfo.coins,
      xp: tierInfo.xp,
      progress,
      target,
      completed,
    };
  });

  saveRawDailyState({
    ...memoryDailyQuestsByUser,
    [userKey]: {
      dateKey: todayKey,
      quests: syncedQuests,
    },
  });

  return syncedQuests;
}

/**
 * Busca do banco de dados o XP, Nível, Moedas e as 3 Daily Quests do dia,
 * já enviando os contadores automáticos de atividade realizada pelo usuário hoje.
 */
export async function fetchUserProgressionAndQuests(user) {
  const userKey = getUserKey(user);
  const todayKey = getTodayKey();
  const stats = getTodayActivityStats(todayKey);

  try {
    const params = new URLSearchParams({
      user_id: userKey,
      date_key: todayKey,
      focus_sessions: String(stats.focusSessionsToday),
      focus_seconds: String(stats.focusSecondsToday),
      tasks_completed: String(stats.tasksCompletedToday),
      tasks_created: String(stats.tasksCreatedToday),
    });

    const res = await fetch(`${API_URL}/progression?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const dbRewards = saveUserRewards(user, {
        xp: data?.rewards?.xp ?? data?.profile?.xp ?? 0,
        coins: data?.rewards?.coins ?? data?.profile?.coins ?? 0,
      });

      const dbQuests = Array.isArray(data.dailyQuests)
        ? data.dailyQuests.map((q) => {
            const tierInfo = CHEST_TIERS[q.tier] || CHEST_TIERS.wood;
            return {
              ...q,
              coins: Number(q.coins ?? tierInfo.coins),
              xp: Number(q.xp ?? tierInfo.xp),
              progress: Number(q.progress) || 0,
              target: Math.max(1, Number(q.target) || 1),
              completed: Boolean(q.completed),
              claimed: Boolean(q.claimed),
            };
          })
        : loadDailyQuests(user);

      saveRawDailyState({
        ...loadRawDailyState(),
        [userKey]: {
          dateKey: todayKey,
          quests: dbQuests,
        },
      });

      return {
        rewards: dbRewards,
        levelInfo: getLevelProgressFromXp(dbRewards.xp),
        dailyQuests: dbQuests,
        fromDatabase: true,
      };
    }
  } catch (_) {
    // Fallback local caso o backend FastAPI esteja offline
  }

  const localRewards = loadUserRewards(user);
  const localQuests = loadDailyQuests(user);

  if (SUPABASE_URL && SUPABASE_API_KEY) {
    try {
      const [pRes, qRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(
            userKey
          )}&limit=1`,
          { headers: getSupabaseHeaders() }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/daily_quests?user_id=eq.${encodeURIComponent(
            userKey
          )}&quest_date=eq.${encodeURIComponent(todayKey)}`,
          { headers: getSupabaseHeaders() }
        ),
      ]);
      if (!pRes.ok || !qRes.ok) {
        throw new Error(`Consulta de perfil/missões: HTTP ${pRes.status}/${qRes.status}`);
      }

      let mergedRewards = localRewards;
      if (pRes.ok) {
        const pRows = await pRes.json();
        if (Array.isArray(pRows) && pRows[0]) {
          mergedRewards = saveUserRewards(user, {
            xp: Math.max(localRewards.xp, Number(pRows[0].xp) || 0),
            coins: Math.max(localRewards.coins, Number(pRows[0].coins) || 0),
          });
        }
      }

      let mergedQuests = localQuests;
      if (qRes.ok) {
        const qRows = await qRes.json();
        if (Array.isArray(qRows) && qRows.length === 3) {
          const tierOrder = { wood: 1, iron: 2, gold: 3 };
          mergedQuests = qRows
            .sort((a, b) => (tierOrder[a.tier] || 9) - (tierOrder[b.tier] || 9))
            .map((r) => {
              const tierInfo = CHEST_TIERS[r.tier] || CHEST_TIERS.wood;
              const autoState = computeAutoProgress(
                {
                  metric: r.metric,
                  target: r.target,
                  completed: r.completed,
                  claimed: r.claimed,
                },
                stats
              );
              return {
                tier: r.tier,
                questId: r.quest_id,
                title: r.title,
                metric: r.metric,
                target: autoState.target,
                progress: autoState.progress,
                completed: autoState.completed,
                claimed: Boolean(r.claimed),
                claimedAt: r.claimed_at,
                coins: Number(r.coins ?? tierInfo.coins),
                xp: Number(r.xp ?? tierInfo.xp),
                dateKey: todayKey,
              };
            });
          saveRawDailyState({
            ...loadRawDailyState(),
            [userKey]: {
              dateKey: todayKey,
              quests: mergedQuests,
            },
          });
        }
      }

      await syncQuestsAndCountersToSupabase(
        userKey,
        todayKey,
        mergedQuests,
        stats
      );

      return {
        rewards: mergedRewards,
        levelInfo: getLevelProgressFromXp(mergedRewards.xp),
        dailyQuests: mergedQuests,
        fromDatabase: true,
      };
    } catch (error) {
      console.error('Não foi possível carregar as missões do Supabase:', error);
    }
  }

  return {
    rewards: localRewards,
    levelInfo: getLevelProgressFromXp(localRewards.xp),
    dailyQuests: localQuests,
    fromDatabase: false,
  };
}

/**
 * Sincroniza automaticamente o progresso de atividades (sessão de foco concluída,
 * tarefa criada ou tarefa concluída) com o banco de dados e verifica se alguma
 * Daily Quest acabou de ser concluída automaticamente.
 */
export async function syncDailyActivityProgress(user, eventOptions = {}) {
  const userKey = getUserKey(user);
  const todayKey = getTodayKey();

  const beforeLocal = loadDailyQuests(user);
  const wasCompletedByTier = {};
  beforeLocal.forEach((q) => {
    wasCompletedByTier[q.tier] = Boolean(q.completed);
  });

  const stats = getTodayActivityStats(todayKey);

  try {
    const res = await fetch(`${API_URL}/daily-quests/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userKey,
        date_key: todayKey,
        event_type: eventOptions.eventType || 'sync_counters',
        focus_sessions_delta: Number(eventOptions.focusSessionsDelta) || 0,
        focus_seconds_delta: Number(eventOptions.focusSecondsDelta) || 0,
        tasks_completed_delta: Number(eventOptions.tasksCompletedDelta) || 0,
        tasks_created_delta: Number(eventOptions.tasksCreatedDelta) || 0,
        focus_sessions_total: stats.focusSessionsToday,
        focus_seconds_total: stats.focusSecondsToday,
        tasks_completed_total: stats.tasksCompletedToday,
        tasks_created_total: stats.tasksCreatedToday,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const dbQuests = Array.isArray(data.dailyQuests) ? data.dailyQuests : [];
      if (dbQuests.length > 0) {
        saveRawDailyState({
          ...loadRawDailyState(),
          [userKey]: {
            dateKey: todayKey,
            quests: dbQuests,
          },
        });
      }
      return {
        dailyQuests: dbQuests,
        newlyCompleted: Array.isArray(data.newlyCompleted)
          ? data.newlyCompleted
          : [],
      };
    }
  } catch (_) {
    // Continua com avaliação automática local caso o backend esteja offline
  }

  const afterLocal = loadDailyQuests(user);
  const newlyCompleted = afterLocal.filter(
    (q) => q.completed && !wasCompletedByTier[q.tier]
  );

  await syncQuestsAndCountersToSupabase(userKey, todayKey, afterLocal, stats);

  return {
    dailyQuests: afterLocal,
    newlyCompleted,
  };
}

/**
 * Reivindica ("Resgatar recompensas") uma Daily Quest que JÁ FOI concluída
 * automaticamente pelo cumprimento dos requisitos.
 * Não permite concluir a missão manualmente!
 */
export async function claimDailyQuestReward(user, tierKey, { serverManaged = false } = {}) {
  const userKey = getUserKey(user);
  const todayKey = getTodayKey();

  // Sincroniza contadores antes de resgatar
  await syncDailyActivityProgress(user);

  try {
    const res = await fetch(`${API_URL}/daily-quests/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userKey,
        tier: tierKey,
        date_key: todayKey,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.detail ||
          'Esta missão ainda não foi concluída. Cumpra os requisitos para resgatar a recompensa!'
      );
    }

    const updatedRewards = saveUserRewards(user, {
      xp: data?.rewards?.xp ?? data?.profile?.xp ?? 0,
      coins: data?.rewards?.coins ?? data?.profile?.coins ?? 0,
    });

    const updatedQuests = Array.isArray(data.dailyQuests)
      ? data.dailyQuests
      : loadDailyQuests(user);

    saveRawDailyState({
      ...loadRawDailyState(),
      [userKey]: {
        dateKey: todayKey,
        quests: updatedQuests,
      },
    });

    return {
      quests: updatedQuests,
      rewards: updatedRewards,
      levelInfo: getLevelProgressFromXp(updatedRewards.xp),
      rewardGranted: data.rewardGranted,
      message: data.message,
    };
  } catch (err) {
    if (
      err.message &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('Network request failed')
    ) {
      throw err;
    }

    if (serverManaged) {
      throw new Error('Não foi possível confirmar o resgate no servidor. Verifique a conexão e tente novamente.');
    }

    // Fallback local caso o servidor FastAPI esteja offline (também exige completed === true)
    const currentQuests = loadDailyQuests(user);
    const targetQuest = currentQuests.find((q) => q.tier === tierKey);

    if (!targetQuest) {
      throw new Error('Missão diária não encontrada.');
    }
    if (targetQuest.claimed) {
      throw new Error('Você já resgatou a recompensa desta missão hoje.');
    }
    if (!targetQuest.completed || targetQuest.progress < targetQuest.target) {
      throw new Error(
        'Esta missão ainda não foi concluída. Cumpra os requisitos para resgatar a recompensa!'
      );
    }

    const tierConfig = CHEST_TIERS[tierKey] || CHEST_TIERS.wood;
    const rewardGranted = {
      tier: tierKey,
      label: tierConfig.label,
      coins: tierConfig.coins,
      xp: tierConfig.xp,
      title: targetQuest.title,
    };

    const updatedQuests = currentQuests.map((q) =>
      q.tier === tierKey
        ? {
            ...q,
            claimed: true,
            claimedAt: new Date().toISOString(),
          }
        : q
    );

    saveRawDailyState({
      ...loadRawDailyState(),
      [userKey]: {
        dateKey: todayKey,
        quests: updatedQuests,
      },
    });

    const currentRewards = loadUserRewards(user);
    const updatedRewards = saveUserRewards(user, {
      coins: currentRewards.coins + rewardGranted.coins,
      xp: currentRewards.xp + rewardGranted.xp,
      claimedCount: currentRewards.claimedCount + 1,
    });
    const nextLevelInfo = getLevelProgressFromXp(updatedRewards.xp);

    if (SUPABASE_URL && SUPABASE_API_KEY) {
      try {
        const [, profileResponse] = await Promise.all([
          syncQuestsAndCountersToSupabase(
            userKey,
            todayKey,
            updatedQuests,
            getTodayActivityStats(todayKey)
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(
              userKey
            )}`,
            {
              method: 'PATCH',
              headers: getSupabaseHeaders({ Prefer: 'return=minimal' }),
              body: JSON.stringify({
                xp: updatedRewards.xp,
                coins: updatedRewards.coins,
                level: nextLevelInfo.level,
              }),
            }
          ),
        ]);
        if (!profileResponse.ok) {
          throw new Error(`Atualização de perfil: HTTP ${profileResponse.status}`);
        }
      } catch (error) {
        console.error('Não foi possível sincronizar as recompensas com o Supabase:', error);
      }
    }

    return {
      quests: updatedQuests,
      rewards: updatedRewards,
      levelInfo: nextLevelInfo,
      rewardGranted,
      message: `${rewardGranted.label} resgatado! +${rewardGranted.coins} moedas e +${rewardGranted.xp} XP!`,
    };
  }
}
