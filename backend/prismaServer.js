const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');

function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(`everquest_salt_${String(password || '')}`)
    .digest('hex');
}

const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 8000);
const XP_PER_LEVEL = 100;

const CHEST_TIERS_CONFIG = {
  wood: { id: 'wood', name: 'Wood', label: 'Baú Wood', coins: 3, xp: 5 },
  iron: { id: 'iron', name: 'Iron', label: 'Baú Iron', coins: 5, xp: 10 },
  gold: { id: 'gold', name: 'Gold', label: 'Baú Gold', coins: 10, xp: 20 },
};

const DAILY_QUEST_POOLS = {
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

const DEFAULT_AVATAR_CONFIG = {
  race: 'human',
  skinColor: '#F4C2A8',
  hair: 'hair1',
  hairColor: '#1B0700',
  shirtColor: '#7153FD',
  pantsColor: '#272E59',
};

const SEED_ADVENTURERS = [
  {
    id: 'friend-1',
    email: 'ayla@everquest.app',
    username: 'aylamoon',
    character_name: 'Ayla',
    level: 7,
    xp: 640,
    coins: 45,
    avatar_config: {
      race: 'human',
      skinColor: '#F4C2A8',
      hair: 'hair2',
      hairColor: '#8D3B1E',
      shirtColor: '#7153FD',
      pantsColor: '#272E59',
    },
    auto_friend: true,
  },
  {
    id: 'friend-2',
    email: 'kael@everquest.app',
    username: 'kaelstorm',
    character_name: 'Kael',
    level: 5,
    xp: 420,
    coins: 30,
    avatar_config: {
      race: 'human',
      skinColor: '#D5896B',
      hair: 'hair6',
      hairColor: '#0F0F14',
      shirtColor: '#222123',
      pantsColor: '#18181F',
    },
    auto_friend: true,
  },
  {
    id: 'friend-3',
    email: 'grok@everquest.app',
    username: 'grokzen',
    character_name: 'Grok',
    level: 9,
    xp: 840,
    coins: 80,
    avatar_config: {
      race: 'goblin',
      hair: 'hair4',
      hairColor: '#E2E8F0',
      shirtColor: '#2E7D32',
      pantsColor: '#4E311F',
    },
    auto_friend: true,
  },
  {
    id: 'friend-4',
    email: 'lyra@everquest.app',
    username: 'lyrastar',
    character_name: 'Lyra',
    level: 4,
    xp: 335,
    coins: 25,
    avatar_config: {
      race: 'human',
      skinColor: '#E5A687',
      hair: 'hair5',
      hairColor: '#E6B84D',
      shirtColor: '#FBA0FE',
      pantsColor: '#392682',
    },
    auto_friend: true,
  },
  {
    id: 'friend-5',
    email: 'dante@everquest.app',
    username: 'dantev',
    character_name: 'Dante',
    level: 6,
    xp: 550,
    coins: 40,
    avatar_config: {
      race: 'human',
      skinColor: '#8D4A32',
      hair: 'hair3',
      hairColor: '#1B0700',
      shirtColor: '#B71C1C',
      pantsColor: '#18181F',
    },
    auto_friend: true,
  },
  {
    id: 'friend-6',
    email: 'ziggs@everquest.app',
    username: 'ziggsfoco',
    character_name: 'Ziggs',
    level: 3,
    xp: 245,
    coins: 15,
    avatar_config: {
      race: 'goblin',
      hair: 'hair1',
      hairColor: '#7153FD',
      shirtColor: '#1B3B8B',
      pantsColor: '#272E59',
    },
    auto_friend: true,
  },
  {
    id: 'friend-7',
    email: 'orion@everquest.app',
    username: 'orionblade',
    character_name: 'Orion',
    level: 8,
    xp: 710,
    coins: 55,
    avatar_config: {
      race: 'human',
      skinColor: '#E5A687',
      hair: 'hair6',
      hairColor: '#E2E8F0',
      shirtColor: '#1B3B8B',
      pantsColor: '#18181F',
    },
    auto_friend: false,
  },
  {
    id: 'friend-8',
    email: 'mira@everquest.app',
    username: 'mirasun',
    character_name: 'Mira',
    level: 5,
    xp: 430,
    coins: 35,
    avatar_config: {
      race: 'goblin',
      hair: 'hair2',
      hairColor: '#E6B84D',
      shirtColor: '#7153FD',
      pantsColor: '#392682',
    },
    auto_friend: false,
  },
];

const SEED_BADGES = [
  {
    id: 'badge1',
    title: 'Primeira tarefa',
    description: 'Conclua sua primeira tarefa',
    image: 'badge1',
    goal_type: 'tasks_completed',
    goal_target: 1,
  },
  {
    id: 'badge2',
    title: 'Construindo comunidade',
    description: 'Atinja o número de 10 amigos',
    image: 'badge2',
    goal_type: 'friends_count',
    goal_target: 10,
  },
  {
    id: 'badge3',
    title: 'Suma transcendência',
    description: 'Foque por 30 horas',
    image: 'badge3',
    goal_type: 'focus_hours',
    goal_target: 30,
  },
];

function formatDatePtBr(dateValue) {
  if (!dateValue) return null;
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return null;
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}

function getGoalSummaryLabel(goalType, goalTarget, progress) {
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
  if (goalType === 'focus_sessions') {
    return `${curr}/${target} sessões de foco`;
  }
  return `${curr}/${target}`;
}

function serializeBadgeForUser(badgeRow, userBadgeRow) {
  const goalTarget = Math.max(1, Number(badgeRow.goal_target) || 1);
  const progress = Math.min(
    goalTarget,
    Math.max(0, Number(userBadgeRow?.progress) || 0)
  );
  const unlocked = Boolean(userBadgeRow?.unlocked || progress >= goalTarget);
  const unlockedAtIso = userBadgeRow?.unlocked_at
    ? new Date(userBadgeRow.unlocked_at).toISOString()
    : null;

  return {
    id: badgeRow.id,
    title: badgeRow.title,
    description: badgeRow.description,
    image: badgeRow.image || 'badge1',
    goalType: badgeRow.goal_type,
    goalTarget,
    goal: {
      type: badgeRow.goal_type,
      target: goalTarget,
      progress,
      label: getGoalSummaryLabel(badgeRow.goal_type, goalTarget, progress),
    },
    progress,
    unlocked,
    unlockedAt: formatDatePtBr(userBadgeRow?.unlocked_at) || null,
    unlockedAtIso,
  };
}

async function ensureDefaultBadges() {
  for (const b of SEED_BADGES) {
    await prisma.badge.upsert({
      where: { id: b.id },
      update: {
        title: b.title,
        description: b.description,
        image: b.image,
        goal_type: b.goal_type,
        goal_target: b.goal_target,
      },
      create: {
        id: b.id,
        title: b.title,
        description: b.description,
        image: b.image,
        goal_type: b.goal_type,
        goal_target: b.goal_target,
      },
    });
  }
}

async function evaluateUserBadges(userId, extraStats = {}) {
  await ensureDefaultBadges();

  const profRow = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profRow) {
    await ensureUserProfileAndDefaultFriends({
      userId,
      username: userId,
      characterName: 'Johnn',
    });
  }

  const [allBadges, existingUserBadges, activityRows, friendsCountDb] =
    await Promise.all([
      prisma.badge.findMany({ orderBy: { created_at: 'asc' } }),
      prisma.userBadge.findMany({ where: { user_id: userId } }),
      prisma.dailyActivityCounter.findMany({ where: { user_id: userId } }),
      prisma.friendship.count({
        where: {
          status: 'accepted',
          OR: [{ user_id: userId }, { friend_id: userId }],
        },
      }),
    ]);

  let totalTasksCompleted = activityRows.reduce(
    (acc, r) => acc + (Number(r.tasks_completed) || 0),
    0
  );
  let totalFocusSeconds = activityRows.reduce(
    (acc, r) => acc + (Number(r.focus_seconds) || 0),
    0
  );
  let totalFocusSessions = activityRows.reduce(
    (acc, r) => acc + (Number(r.focus_sessions) || 0),
    0
  );

  if (
    extraStats.tasksCompletedTotal !== undefined &&
    extraStats.tasksCompletedTotal !== null
  ) {
    totalTasksCompleted = Math.max(
      totalTasksCompleted,
      Number(extraStats.tasksCompletedTotal) || 0
    );
  }
  if (
    extraStats.focusSecondsTotal !== undefined &&
    extraStats.focusSecondsTotal !== null
  ) {
    totalFocusSeconds = Math.max(
      totalFocusSeconds,
      Number(extraStats.focusSecondsTotal) || 0
    );
  }

  const totalFriends = Math.max(
    friendsCountDb,
    Number(extraStats.friendsCount) || 0
  );
  const totalFocusHours = Math.max(
    Math.floor(totalFocusSeconds / 3600),
    Number(extraStats.focusHours) || 0
  );

  const userBadgeMap = {};
  existingUserBadges.forEach((ub) => {
    userBadgeMap[ub.badge_id] = ub;
  });

  const newlyUnlocked = [];
  const serializedBadges = [];

  for (const badge of allBadges) {
    const targetVal = Math.max(1, Number(badge.goal_target) || 1);
    let metricVal = 0;

    if (badge.goal_type === 'tasks_completed') {
      metricVal = totalTasksCompleted;
    } else if (badge.goal_type === 'friends_count') {
      metricVal = totalFriends;
    } else if (badge.goal_type === 'focus_hours') {
      metricVal = totalFocusHours;
    } else if (badge.goal_type === 'focus_sessions') {
      metricVal = totalFocusSessions;
    }

    const prevUb = userBadgeMap[badge.id];
    const wasUnlocked = Boolean(prevUb?.unlocked);
    const nextProgress = Math.min(targetVal, Math.max(0, metricVal));
    const isNowUnlocked = Boolean(nextProgress >= targetVal);
    const nextUnlockedAt = isNowUnlocked
      ? prevUb?.unlocked_at || new Date()
      : null;

    const upsertedUb = await prisma.userBadge.upsert({
      where: {
        user_id_badge_id: {
          user_id: userId,
          badge_id: badge.id,
        },
      },
      update: {
        progress: nextProgress,
        unlocked: isNowUnlocked,
        unlocked_at: nextUnlockedAt,
      },
      create: {
        user_id: userId,
        badge_id: badge.id,
        progress: nextProgress,
        unlocked: isNowUnlocked,
        unlocked_at: nextUnlockedAt,
      },
    });

    const formatted = serializeBadgeForUser(badge, upsertedUb);
    serializedBadges.push(formatted);
    if (isNowUnlocked && !wasUnlocked) {
      newlyUnlocked.push(formatted);
    }
  }

  const unlockedBadges = serializedBadges.filter((b) => b.unlocked);

  return {
    badges: serializedBadges,
    unlockedBadges,
    newlyUnlocked,
    stats: {
      tasksCompleted: totalTasksCompleted,
      friendsCount: totalFriends,
      focusHours: totalFocusHours,
      focusSeconds: totalFocusSeconds,
    },
  };
}

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateLevelInfo(totalXp) {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_PER_LEVEL;
  const progressPercent = Math.min(
    100,
    Math.round((currentLevelXp / XP_PER_LEVEL) * 100)
  );
  return {
    level,
    totalXp: safeXp,
    currentLevelXp,
    xpForNextLevel: XP_PER_LEVEL,
    progressPercent,
  };
}

function normalizeUsername(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/\s+/g, '');
  return cleaned || 'aventureiro';
}

function serializeProfile(row) {
  const uname = String(row.username || 'aventureiro').replace(/^@/, '');
  const xpVal = Number(row.xp) || 0;
  const lvlInfo = calculateLevelInfo(xpVal);
  let avatarCfg = row.avatar_config;
  if (typeof avatarCfg === 'string') {
    try {
      avatarCfg = JSON.parse(avatarCfg);
    } catch (_) {
      avatarCfg = DEFAULT_AVATAR_CONFIG;
    }
  }
  if (avatarCfg && typeof avatarCfg === 'object') {
    const { _authHash, ...publicAvatarConfig } = avatarCfg;
    avatarCfg = publicAvatarConfig;
  }
  return {
    id: row.id,
    email: row.email || null,
    username: `@${uname}`,
    rawUsername: uname,
    characterName: row.character_name || 'Aventureiro',
    level: lvlInfo.level,
    xp: xpVal,
    coins: Number(row.coins) || 0,
    avatarConfig: avatarCfg || DEFAULT_AVATAR_CONFIG,
  };
}

function serializeDailyQuest(row) {
  const tierMeta = CHEST_TIERS_CONFIG[row.tier] || CHEST_TIERS_CONFIG.wood;
  return {
    id: row.id,
    userId: row.user_id,
    dateKey: row.quest_date,
    tier: row.tier,
    questId: row.quest_id,
    title: row.title,
    metric: row.metric,
    target: Number(row.target) || 1,
    progress: Number(row.progress) || 0,
    completed: Boolean(row.completed),
    claimed: Boolean(row.claimed),
    claimedAt: row.claimed_at ? new Date(row.claimed_at).toISOString() : null,
    coins: Number(row.coins ?? tierMeta.coins),
    xp: Number(row.xp ?? tierMeta.xp),
  };
}

function computeQuestProgressFromCounters(metric, target, counters) {
  const safeTarget = Math.max(1, Number(target) || 1);
  const focusSessions = Math.max(0, Number(counters?.focus_sessions) || 0);
  const focusSeconds = Math.max(0, Number(counters?.focus_seconds) || 0);
  const tasksCompleted = Math.max(0, Number(counters?.tasks_completed) || 0);
  const tasksCreated = Math.max(0, Number(counters?.tasks_created) || 0);

  let rawVal = 0;
  if (metric === 'focus_sessions') rawVal = focusSessions;
  else if (metric === 'focus_15m') rawVal = focusSeconds >= 15 * 60 ? 1 : 0;
  else if (metric === 'tasks_created_today') rawVal = tasksCreated;
  else if (metric === 'tasks_completed') rawVal = tasksCompleted;
  else if (metric === 'combo_tasks_focus') {
    rawVal = Math.min(2, tasksCompleted) + Math.min(1, focusSessions);
  }

  return Math.min(safeTarget, Math.max(0, rawVal));
}

async function ensureUserProfileAndDefaultFriends({
  userId,
  username,
  characterName = 'Johnn',
  email = null,
  xp = null,
  coins = null,
  avatarConfig = null,
}) {
  let normUsername = normalizeUsername(username || userId);
  const existing = await prisma.profile.findUnique({ where: { id: userId } });

  const collision = await prisma.profile.findFirst({
    where: {
      username: { equals: normUsername, mode: 'insensitive' },
      NOT: { id: userId },
    },
  });
  if (collision) {
    normUsername = `${normUsername}_${userId.slice(0, 4)}`;
  }

  if (!existing) {
    const finalXp = Math.max(0, Number(xp) || 0);
    const finalCoins = Math.max(0, Number(coins) || 0);
    const finalLevel = calculateLevelInfo(finalXp).level;

    const created = await prisma.profile.create({
      data: {
        id: userId,
        email: email || `${normUsername}@everquest.app`,
        username: normUsername,
        character_name: (characterName || 'Johnn').trim() || 'Johnn',
        level: finalLevel,
        xp: finalXp,
        coins: finalCoins,
        avatar_config: avatarConfig || DEFAULT_AVATAR_CONFIG,
      },
    });

    for (const adv of SEED_ADVENTURERS) {
      if (!adv.auto_friend || adv.id === userId) continue;
      await prisma.friendship
        .upsert({
          where: {
            user_id_friend_id: { user_id: userId, friend_id: adv.id },
          },
          update: {},
          create: {
            user_id: userId,
            friend_id: adv.id,
            status: 'accepted',
          },
        })
        .catch(() => {});
    }

    return serializeProfile(created);
  }

  const nextXp =
    xp !== null && xp !== undefined
      ? Math.max(Number(existing.xp) || 0, Number(xp) || 0)
      : Number(existing.xp) || 0;
  const nextCoins =
    coins !== null && coins !== undefined
      ? Math.max(Number(existing.coins) || 0, Number(coins) || 0)
      : Number(existing.coins) || 0;
  const nextLevel = calculateLevelInfo(nextXp).level;

  const existingAvatarObj =
    typeof existing.avatar_config === 'object' && existing.avatar_config
      ? existing.avatar_config
      : DEFAULT_AVATAR_CONFIG;
  const mergedAvatarConfig = avatarConfig
    ? {
        ...existingAvatarObj,
        ...avatarConfig,
        ...(existingAvatarObj._authHash
          ? { _authHash: existingAvatarObj._authHash }
          : {}),
      }
    : existingAvatarObj;

  const updated = await prisma.profile.update({
    where: { id: userId },
    data: {
      username: normUsername,
      character_name:
        (characterName || existing.character_name || 'Johnn').trim() || 'Johnn',
      level: nextLevel,
      xp: nextXp,
      coins: nextCoins,
      avatar_config: mergedAvatarConfig,
    },
  });

  return serializeProfile(updated);
}

async function getOrCreateActivityCounters(userId, dateKey) {
  return prisma.dailyActivityCounter.upsert({
    where: {
      user_id_activity_date: { user_id: userId, activity_date: dateKey },
    },
    update: {},
    create: {
      user_id: userId,
      activity_date: dateKey,
      focus_sessions: 0,
      focus_seconds: 0,
      tasks_completed: 0,
      tasks_created: 0,
    },
  });
}

async function ensureDailyQuestsAndEvaluate(userId, dateKey) {
  const counters = await getOrCreateActivityCounters(userId, dateKey);
  const existingRows = await prisma.dailyQuest.findMany({
    where: { user_id: userId, quest_date: dateKey },
  });
  const existingByTier = {};
  existingRows.forEach((r) => {
    existingByTier[r.tier] = r;
  });

  const prevRows = await prisma.dailyQuest.findMany({
    where: { user_id: userId, quest_date: { lt: dateKey } },
    orderBy: { quest_date: 'desc' },
    take: 3,
  });
  const prevByTier = {};
  prevRows.forEach((r) => {
    prevByTier[r.tier] = r.quest_id;
  });
  const hasEverHadQuests = prevRows.length > 0 || existingRows.length > 0;

  for (const tierKey of ['wood', 'iron', 'gold']) {
    if (existingByTier[tierKey]) continue;
    const tierCfg = CHEST_TIERS_CONFIG[tierKey];
    const pool = DAILY_QUEST_POOLS[tierKey];
    let chosen = pool[0];
    if (hasEverHadQuests) {
      const candidates = pool.filter((q) => q.id !== prevByTier[tierKey]);
      const list = candidates.length > 0 ? candidates : pool;
      chosen = list[Math.floor(Math.random() * list.length)];
    }

    const progressVal = computeQuestProgressFromCounters(
      chosen.metric,
      chosen.target,
      counters
    );
    const isCompleted = progressVal >= chosen.target;

    await prisma.dailyQuest.upsert({
      where: {
        user_id_quest_date_tier: {
          user_id: userId,
          quest_date: dateKey,
          tier: tierKey,
        },
      },
      update: {},
      create: {
        user_id: userId,
        quest_date: dateKey,
        tier: tierKey,
        quest_id: chosen.id,
        title: chosen.title,
        metric: chosen.metric,
        target: chosen.target,
        progress: progressVal,
        completed: isCompleted,
        claimed: false,
        coins: tierCfg.coins,
        xp: tierCfg.xp,
      },
    });
  }

  const currentQuests = await prisma.dailyQuest.findMany({
    where: { user_id: userId, quest_date: dateKey },
  });

  for (const row of currentQuests) {
    const targetVal = Math.max(1, Number(row.target) || 1);
    let newProgress = row.progress;
    let newCompleted = row.completed;

    if (row.claimed) {
      newProgress = targetVal;
      newCompleted = true;
    } else {
      newProgress = computeQuestProgressFromCounters(
        row.metric,
        targetVal,
        counters
      );
      newCompleted = Boolean(row.completed || newProgress >= targetVal);
      if (newCompleted && newProgress < targetVal) {
        newProgress = targetVal;
      }
    }

    if (newProgress !== row.progress || newCompleted !== row.completed) {
      await prisma.dailyQuest.update({
        where: { id: row.id },
        data: { progress: newProgress, completed: newCompleted },
      });
    }
  }

  const finalRows = await prisma.dailyQuest.findMany({
    where: { user_id: userId, quest_date: dateKey },
  });
  const tierOrder = { wood: 1, iron: 2, gold: 3 };
  finalRows.sort((a, b) => (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99));
  return finalRows.map(serializeDailyQuest);
}

async function seedDatabase() {
  for (const adv of SEED_ADVENTURERS) {
    await prisma.profile.upsert({
      where: { id: adv.id },
      update: {
        character_name: adv.character_name,
        level: adv.level,
        avatar_config: adv.avatar_config,
      },
      create: {
        id: adv.id,
        email: adv.email,
        username: adv.username,
        character_name: adv.character_name,
        level: adv.level,
        xp: adv.xp,
        coins: adv.coins,
        avatar_config: adv.avatar_config,
      },
    });
  }

  await ensureDefaultBadges();

  await ensureUserProfileAndDefaultFriends({
    userId: 'guest-jsalless',
    username: 'jsalless',
    characterName: 'Johnn',
    email: 'jsalless@everquest.app',
  });
  await ensureDailyQuestsAndEvaluate('guest-jsalless', getTodayDateKey());
  await evaluateUserBadges('guest-jsalless');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const path = parsedUrl.pathname.replace(/\/$/, '') || '/';
  const qs = parsedUrl.searchParams;

  try {
    if (req.method === 'GET' && path === '/health') {
      return sendJson(res, 200, {
        status: 'ok',
        service: 'Everquest Prisma + Supabase PostgreSQL API',
      });
    }

    if (req.method === 'POST' && path === '/auth/register') {
      const payload = await readJsonBody(req);
      const rawEmail = String(payload.email || '')
        .trim()
        .toLowerCase();
      const rawUsername = String(payload.username || '').trim();
      const rawPassword = String(payload.password || '');

      if (!rawEmail || !rawEmail.includes('@')) {
        return sendJson(res, 400, { detail: 'Informe um e-mail válido.' });
      }
      if (!rawUsername) {
        return sendJson(res, 400, { detail: 'Informe um nome de usuário.' });
      }
      if (rawPassword.length < 6) {
        return sendJson(res, 400, {
          detail: 'A senha deve ter pelo menos 6 caracteres.',
        });
      }

      const existingByEmail = await prisma.profile.findFirst({
        where: { email: { equals: rawEmail, mode: 'insensitive' } },
      });
      if (existingByEmail) {
        return sendJson(res, 400, {
          detail: 'Este e-mail já está cadastrado.',
        });
      }

      const newUserId = crypto.randomUUID();
      const profile = await ensureUserProfileAndDefaultFriends({
        userId: newUserId,
        username: rawUsername,
        characterName: rawUsername,
        email: rawEmail,
        xp: 0,
        coins: 0,
        avatarConfig: {
          ...DEFAULT_AVATAR_CONFIG,
          _authHash: hashPassword(rawPassword),
        },
      });
      await ensureDailyQuestsAndEvaluate(newUserId, getTodayDateKey());

      return sendJson(res, 200, {
        message: 'Conta criada e autenticada com sucesso!',
        access_token: `eq_token_${profile.id}`,
        refresh_token: `eq_refresh_${profile.id}`,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.rawUsername,
          user_metadata: {
            username: profile.rawUsername,
            display_name: profile.characterName,
          },
        },
      });
    }

    if (req.method === 'POST' && path === '/auth/login') {
      const payload = await readJsonBody(req);
      const rawEmail = String(payload.email || '')
        .trim()
        .toLowerCase();
      const rawPassword = String(payload.password || '');

      if (!rawEmail || !rawPassword) {
        return sendJson(res, 400, {
          detail: 'Informe seu e-mail e senha.',
        });
      }

      const found = await prisma.profile.findFirst({
        where: { email: { equals: rawEmail, mode: 'insensitive' } },
      });

      if (!found) {
        return sendJson(res, 401, {
          detail: 'E-mail ou senha incorretos.',
        });
      }

      const storedHash =
        typeof found.avatar_config === 'object' && found.avatar_config
          ? found.avatar_config._authHash
          : null;
      if (storedHash && storedHash !== hashPassword(rawPassword)) {
        return sendJson(res, 401, {
          detail: 'E-mail ou senha incorretos.',
        });
      }

      const profile = serializeProfile(found);
      await ensureDailyQuestsAndEvaluate(profile.id, getTodayDateKey());

      return sendJson(res, 200, {
        access_token: `eq_token_${profile.id}`,
        refresh_token: `eq_refresh_${profile.id}`,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.rawUsername,
          avatarConfig: { ...profile.avatarConfig, characterName: profile.characterName },
          user_metadata: {
            username: profile.rawUsername,
            display_name: profile.characterName,
          },
        },
      });
    }

    if (req.method === 'GET' && path === '/auth/me') {
      const authHeader = String(req.headers.authorization || '');
      if (!authHeader.startsWith('Bearer ')) {
        return sendJson(res, 401, { detail: 'Token de autenticação ausente' });
      }
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const userId = token.replace(/^eq_token_/, '');
      const found = await prisma.profile.findUnique({ where: { id: userId } });
      if (!found) {
        return sendJson(res, 401, { detail: 'Token inválido ou expirado' });
      }
      const profile = serializeProfile(found);
      return sendJson(res, 200, {
        id: profile.id,
        email: profile.email,
        username: profile.rawUsername,
        user_metadata: {
          username: profile.rawUsername,
          display_name: profile.characterName,
        },
      });
    }

    if (req.method === 'POST' && path === '/profiles/sync') {
      const payload = await readJsonBody(req);
      const userId = String(payload.user_id || 'guest-jsalless').trim();
      const profile = await ensureUserProfileAndDefaultFriends({
        userId,
        username: payload.username || 'jsalless',
        characterName: payload.character_name || 'Johnn',
        email: payload.email || null,
        xp: payload.xp,
        coins: payload.coins,
        avatarConfig: payload.avatar_config,
      });
      return sendJson(res, 200, {
        profile,
        levelInfo: calculateLevelInfo(profile.xp),
      });
    }

    if (req.method === 'GET' && path === '/progression') {
      const userId = (qs.get('user_id') || 'guest-jsalless').trim();
      const targetDate = (qs.get('date_key') || getTodayDateKey()).trim();
      const focusSessions = Number(qs.get('focus_sessions') || 0);
      const focusSeconds = Number(qs.get('focus_seconds') || 0);
      const tasksCompleted = Number(qs.get('tasks_completed') || 0);
      const tasksCreated = Number(qs.get('tasks_created') || 0);

      let profRow = await prisma.profile.findUnique({ where: { id: userId } });
      const profile = profRow
        ? serializeProfile(profRow)
        : await ensureUserProfileAndDefaultFriends({
            userId,
            username: userId,
            characterName: 'Johnn',
          });

      const counters = await getOrCreateActivityCounters(userId, targetDate);
      const nextFs = Math.max(counters.focus_sessions, focusSessions);
      const nextFsec = Math.max(counters.focus_seconds, focusSeconds);
      const nextTc = Math.max(counters.tasks_completed, tasksCompleted);
      const nextTcr = Math.max(counters.tasks_created, tasksCreated);

      if (
        nextFs !== counters.focus_sessions ||
        nextFsec !== counters.focus_seconds ||
        nextTc !== counters.tasks_completed ||
        nextTcr !== counters.tasks_created
      ) {
        await prisma.dailyActivityCounter.update({
          where: {
            user_id_activity_date: {
              user_id: userId,
              activity_date: targetDate,
            },
          },
          data: {
            focus_sessions: nextFs,
            focus_seconds: nextFsec,
            tasks_completed: nextTc,
            tasks_created: nextTcr,
          },
        });
      }

      const dailyQuests = await ensureDailyQuestsAndEvaluate(userId, targetDate);
      const finalCounters = await getOrCreateActivityCounters(userId, targetDate);
      const badgeEvaluation = await evaluateUserBadges(userId);

      return sendJson(res, 200, {
        profile,
        levelInfo: calculateLevelInfo(profile.xp),
        rewards: {
          xp: profile.xp,
          coins: profile.coins,
          level: profile.level,
        },
        dailyQuests,
        activityCounters: finalCounters,
        badges: badgeEvaluation.badges,
        unlockedBadges: badgeEvaluation.unlockedBadges,
      });
    }

    if (req.method === 'POST' && path === '/daily-quests/progress') {
      const payload = await readJsonBody(req);
      const userId = String(payload.user_id || 'guest-jsalless').trim();
      const targetDate = String(payload.date_key || getTodayDateKey()).trim();

      const profRow = await prisma.profile.findUnique({ where: { id: userId } });
      if (!profRow) {
        await ensureUserProfileAndDefaultFriends({
          userId,
          username: userId,
          characterName: 'Johnn',
        });
      }

      const beforeQuests = await ensureDailyQuestsAndEvaluate(userId, targetDate);
      const wasCompletedByTier = {};
      beforeQuests.forEach((q) => {
        wasCompletedByTier[q.tier] = Boolean(q.completed);
      });

      const counters = await getOrCreateActivityCounters(userId, targetDate);
      let nextFs =
        counters.focus_sessions + (Number(payload.focus_sessions_delta) || 0);
      let nextFsec =
        counters.focus_seconds + (Number(payload.focus_seconds_delta) || 0);
      let nextTc =
        counters.tasks_completed + (Number(payload.tasks_completed_delta) || 0);
      let nextTcr =
        counters.tasks_created + (Number(payload.tasks_created_delta) || 0);

      if (payload.focus_sessions_total !== undefined && payload.focus_sessions_total !== null) {
        nextFs = Math.max(nextFs, Number(payload.focus_sessions_total) || 0);
      }
      if (payload.focus_seconds_total !== undefined && payload.focus_seconds_total !== null) {
        nextFsec = Math.max(nextFsec, Number(payload.focus_seconds_total) || 0);
      }
      if (payload.tasks_completed_total !== undefined && payload.tasks_completed_total !== null) {
        nextTc = Math.max(0, Number(payload.tasks_completed_total) || 0);
      }
      if (payload.tasks_created_total !== undefined && payload.tasks_created_total !== null) {
        nextTcr = Math.max(nextTcr, Number(payload.tasks_created_total) || 0);
      }

      const updatedCounters = await prisma.dailyActivityCounter.update({
        where: {
          user_id_activity_date: {
            user_id: userId,
            activity_date: targetDate,
          },
        },
        data: {
          focus_sessions: Math.max(0, nextFs),
          focus_seconds: Math.max(0, nextFsec),
          tasks_completed: Math.max(0, nextTc),
          tasks_created: Math.max(0, nextTcr),
        },
      });

      const afterQuests = await ensureDailyQuestsAndEvaluate(userId, targetDate);
      const newlyCompleted = afterQuests.filter(
        (q) => q.completed && !wasCompletedByTier[q.tier]
      );
      const badgeEvaluation = await evaluateUserBadges(userId);

      return sendJson(res, 200, {
        dailyQuests: afterQuests,
        newlyCompleted,
        activityCounters: updatedCounters,
        badges: badgeEvaluation.badges,
        unlockedBadges: badgeEvaluation.unlockedBadges,
        newlyUnlockedBadges: badgeEvaluation.newlyUnlocked,
      });
    }

    if (req.method === 'POST' && path === '/daily-quests/claim') {
      const payload = await readJsonBody(req);
      const userId = String(payload.user_id || 'guest-jsalless').trim();
      const tierKey = String(payload.tier || '')
        .trim()
        .toLowerCase();
      const targetDate = String(payload.date_key || getTodayDateKey()).trim();

      if (!CHEST_TIERS_CONFIG[tierKey]) {
        return sendJson(res, 400, { detail: 'Tier de baú inválido.' });
      }

      await ensureDailyQuestsAndEvaluate(userId, targetDate);
      const questRow = await prisma.dailyQuest.findUnique({
        where: {
          user_id_quest_date_tier: {
            user_id: userId,
            quest_date: targetDate,
            tier: tierKey,
          },
        },
      });

      if (!questRow) {
        return sendJson(res, 404, { detail: 'Missão diária não encontrada.' });
      }
      if (questRow.claimed) {
        return sendJson(res, 409, {
          detail: 'Você já resgatou a recompensa desta missão hoje.',
        });
      }
      if (!questRow.completed || questRow.progress < questRow.target) {
        return sendJson(res, 400, {
          detail:
            'Esta missão ainda não foi concluída. Cumpra os requisitos para resgatar a recompensa!',
        });
      }

      const tierMeta = CHEST_TIERS_CONFIG[tierKey];
      const rewardCoins = Number(questRow.coins || tierMeta.coins);
      const rewardXp = Number(questRow.xp || tierMeta.xp);

      await prisma.dailyQuest.update({
        where: { id: questRow.id },
        data: { claimed: true, claimed_at: new Date() },
      });

      const profNow = await prisma.profile.findUnique({ where: { id: userId } });
      const nextXp = (Number(profNow?.xp) || 0) + rewardXp;
      const nextCoins = (Number(profNow?.coins) || 0) + rewardCoins;
      const nextLevelInfo = calculateLevelInfo(nextXp);

      const updatedProfRow = await prisma.profile.update({
        where: { id: userId },
        data: {
          xp: nextXp,
          coins: nextCoins,
          level: nextLevelInfo.level,
        },
      });

      const updatedProfile = serializeProfile(updatedProfRow);
      const updatedQuests = await ensureDailyQuestsAndEvaluate(userId, targetDate);

      return sendJson(res, 200, {
        message: `${tierMeta.label} resgatado! +${rewardCoins} moedas e +${rewardXp} XP!`,
        rewardGranted: {
          tier: tierKey,
          label: tierMeta.label,
          coins: rewardCoins,
          xp: rewardXp,
          title: questRow.title,
        },
        profile: updatedProfile,
        levelInfo: nextLevelInfo,
        rewards: {
          xp: updatedProfile.xp,
          coins: updatedProfile.coins,
          level: updatedProfile.level,
        },
        dailyQuests: updatedQuests,
      });
    }

    if (req.method === 'GET' && path === '/friend-requests') {
      const userId = (qs.get('user_id') || '').trim();
      if (!userId) return sendJson(res, 400, { detail: 'Usuário obrigatório.' });
      const relations = await prisma.friendship.findMany({
        where: {
          status: 'pending',
          OR: [{ user_id: userId }, { friend_id: userId }],
        },
        include: { user: true },
        orderBy: { created_at: 'desc' },
      });
      return sendJson(res, 200, {
        incoming: relations.filter((r) => r.friend_id === userId).map((r) => ({
          id: r.id,
          user: serializeProfile(r.user),
        })),
        outgoingIds: relations.filter((r) => r.user_id === userId).map((r) => r.friend_id),
      });
    }

    if (req.method === 'POST' && (path === '/friend-requests' || path === '/friends')) {
      const payload = await readJsonBody(req);
      const userId = String(payload.user_id || '').trim();
      if (!userId) return sendJson(res, 400, { detail: 'Usuário obrigatório.' });
      if (!String(payload.friend_id || payload.friend_username || '').trim()) {
        return sendJson(res, 400, { detail: 'Informe o usuário que deseja convidar.' });
      }
      const sender = await prisma.profile.findUnique({ where: { id: userId } });
      if (!sender) return sendJson(res, 404, { detail: 'Seu perfil não foi encontrado.' });
      const target = payload.friend_id
        ? await prisma.profile.findUnique({ where: { id: String(payload.friend_id).trim() } })
        : await prisma.profile.findFirst({
            where: { username: { equals: normalizeUsername(payload.friend_username), mode: 'insensitive' } },
          });
      if (!target) return sendJson(res, 404, { detail: 'Usuário não encontrado.' });
      if (target.id === userId) return sendJson(res, 400, { detail: 'Você não pode adicionar a si mesmo.' });
      const existing = await prisma.$transaction(async (tx) => {
        const pairKey = [userId, target.id].sort().join(':');
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${pairKey}))`;
        const relation = await tx.friendship.findFirst({
          where: { OR: [
            { user_id: userId, friend_id: target.id },
            { user_id: target.id, friend_id: userId },
          ] },
        });
        if (!relation) {
          await tx.friendship.create({
            data: { user_id: userId, friend_id: target.id, status: 'pending' },
          });
        }
        return relation;
      });
      if (existing) {
        return sendJson(res, 409, {
          detail: existing.status === 'accepted'
            ? 'Vocês já são amigos.'
            : existing.friend_id === userId
              ? 'Este usuário já enviou um pedido para você. Confira os pendentes.'
              : 'Você já enviou um pedido para este usuário.',
        });
      }
      return sendJson(res, 201, { message: `Pedido enviado para ${target.character_name}!` });
    }

    if (req.method === 'POST' && /^\/friend-requests\/[^/]+\/accept$/.test(path)) {
      const payload = await readJsonBody(req);
      const userId = String(payload.user_id || '').trim();
      const requestId = decodeURIComponent(path.split('/')[2]);
      if (!userId) return sendJson(res, 400, { detail: 'Usuário obrigatório.' });
      const updated = await prisma.friendship.updateMany({
        where: { id: requestId, friend_id: userId, status: 'pending' },
        data: { status: 'accepted' },
      });
      if (!updated.count) return sendJson(res, 404, { detail: 'Pedido pendente não encontrado.' });
      return sendJson(res, 200, { message: 'Pedido de amizade aceito!' });
    }

    if (req.method === 'GET' && path === '/friends') {
      const userId = (qs.get('user_id') || 'guest-jsalless').trim();
      const searchTerm = (qs.get('q') || '')
        .trim()
        .toLowerCase()
        .replace(/^@/, '');

      const userExists = await prisma.profile.findUnique({
        where: { id: userId },
      });
      if (!userExists) {
        await ensureUserProfileAndDefaultFriends({
          userId,
          username: userId,
          characterName: 'Johnn',
        });
      }

      const relations = await prisma.friendship.findMany({
        where: {
          status: 'accepted',
          OR: [{ user_id: userId }, { friend_id: userId }],
        },
        include: {
          user: true,
          friend: true,
        },
      });

      const allFriends = relations
        .map((rel) => {
          const other = rel.user_id === userId ? rel.friend : rel.user;
          return {
            ...serializeProfile(other),
            friendshipId: rel.id,
            status: rel.status,
            since: rel.created_at,
          };
        })
        .sort((a, b) =>
          a.characterName.localeCompare(b.characterName, 'pt-BR')
        );

      const filtered = searchTerm
        ? allFriends.filter(
            (f) =>
              f.characterName.toLowerCase().includes(searchTerm) ||
              f.username.toLowerCase().includes(searchTerm) ||
              f.rawUsername.toLowerCase().includes(searchTerm)
          )
        : allFriends;

      return sendJson(res, 200, {
        total: allFriends.length,
        count: filtered.length,
        friends: filtered,
      });
    }

    if (req.method === 'GET' && path === '/users/search') {
      const userId = (qs.get('user_id') || 'guest-jsalless').trim();
      const searchTerm = (qs.get('q') || '')
        .trim()
        .toLowerCase()
        .replace(/^@/, '');

      const relations = await prisma.friendship.findMany({
        where: {
          status: 'accepted',
          OR: [{ user_id: userId }, { friend_id: userId }],
        },
      });
      const friendIds = new Set(
        relations.map((r) => (r.user_id === userId ? r.friend_id : r.user_id))
      );

      const profiles = await prisma.profile.findMany({
        where: {
          NOT: { id: userId },
          ...(searchTerm
            ? {
                OR: [
                  { username: { contains: searchTerm, mode: 'insensitive' } },
                  {
                    character_name: {
                      contains: searchTerm,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: { character_name: 'asc' },
        take: 25,
      });

      const users = profiles.map((p) => ({
        ...serializeProfile(p),
        isFriend: friendIds.has(p.id),
      }));

      return sendJson(res, 200, { users });
    }

    if (req.method === 'DELETE' && path.startsWith('/friends/')) {
      const friendId = decodeURIComponent(path.split('/friends/')[1] || '');
      const userId = (qs.get('user_id') || 'guest-jsalless').trim();

      await prisma.friendship.deleteMany({
        where: {
          OR: [
            { user_id: userId, friend_id: friendId },
            { user_id: friendId, friend_id: userId },
          ],
        },
      });

      const totalFriends = await prisma.friendship.count({
        where: {
          status: 'accepted',
          OR: [{ user_id: userId }, { friend_id: userId }],
        },
      });

      const badgeEvaluation = await evaluateUserBadges(userId, {
        friendsCount: totalFriends,
      });

      return sendJson(res, 200, {
        message: 'Amizade removida com sucesso.',
        removedFriendId: friendId,
        total: totalFriends,
        badges: badgeEvaluation.badges,
        unlockedBadges: badgeEvaluation.unlockedBadges,
      });
    }

    if (req.method === 'GET' && path === '/badges') {
      const userId = (qs.get('user_id') || 'guest-jsalless').trim();
      const tasksCompletedTotal = qs.has('tasks_completed')
        ? Number(qs.get('tasks_completed') || 0)
        : undefined;
      const focusSecondsTotal = qs.has('focus_seconds')
        ? Number(qs.get('focus_seconds') || 0)
        : undefined;
      const friendsCount = qs.has('friends_count')
        ? Number(qs.get('friends_count') || 0)
        : undefined;

      const evaluation = await evaluateUserBadges(userId, {
        tasksCompletedTotal,
        focusSecondsTotal,
        friendsCount,
      });

      return sendJson(res, 200, {
        total: evaluation.badges.length,
        unlockedCount: evaluation.unlockedBadges.length,
        badges: evaluation.badges,
        unlockedBadges: evaluation.unlockedBadges,
        newlyUnlocked: evaluation.newlyUnlocked,
        stats: evaluation.stats,
      });
    }

    if (req.method === 'POST' && path === '/badges') {
      const payload = await readJsonBody(req);
      const rawTitle = String(payload.title || payload.titulo || '').trim();
      const rawDescription = String(
        payload.description || payload.descricao || ''
      ).trim();
      const rawImage = String(
        payload.image || payload.imagem || 'badge1'
      ).trim();

      const goalObj =
        typeof payload.goal === 'object' && payload.goal
          ? payload.goal
          : typeof payload.objetivo === 'object' && payload.objetivo
            ? payload.objetivo
            : null;

      const rawGoalType = String(
        payload.goal_type ||
          payload.goalType ||
          goalObj?.type ||
          goalObj?.goal_type ||
          'tasks_completed'
      ).trim();
      const rawGoalTarget = Math.max(
        1,
        Number(
          payload.goal_target ??
            payload.goalTarget ??
            goalObj?.target ??
            goalObj?.goal_target ??
            1
        ) || 1
      );

      if (!rawTitle) {
        return sendJson(res, 400, {
          detail: 'Informe o título da insígnia.',
        });
      }
      if (!rawDescription) {
        return sendJson(res, 400, {
          detail: 'Informe a descrição da insígnia.',
        });
      }

      const slugId =
        String(payload.id || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-') ||
        `badge-${rawTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}`;

      const savedBadge = await prisma.badge.upsert({
        where: { id: slugId },
        update: {
          title: rawTitle,
          description: rawDescription,
          image: rawImage || 'badge1',
          goal_type: rawGoalType,
          goal_target: rawGoalTarget,
        },
        create: {
          id: slugId,
          title: rawTitle,
          description: rawDescription,
          image: rawImage || 'badge1',
          goal_type: rawGoalType,
          goal_target: rawGoalTarget,
        },
      });

      const userId = String(payload.user_id || 'guest-jsalless').trim();
      const evaluation = await evaluateUserBadges(userId);
      const userBadgeItem =
        evaluation.badges.find((b) => b.id === savedBadge.id) ||
        serializeBadgeForUser(savedBadge, null);

      return sendJson(res, 200, {
        message: `Insígnia "${savedBadge.title}" criada com sucesso!`,
        badge: userBadgeItem,
        badges: evaluation.badges,
      });
    }

    if (req.method === 'POST' && path === '/badges/evaluate') {
      const payload = await readJsonBody(req);
      const userId = String(payload.user_id || 'guest-jsalless').trim();
      const evaluation = await evaluateUserBadges(userId, {
        tasksCompletedTotal: payload.tasks_completed_total,
        focusSecondsTotal: payload.focus_seconds_total,
        friendsCount: payload.friends_count,
        focusHours: payload.focus_hours,
      });

      return sendJson(res, 200, {
        total: evaluation.badges.length,
        unlockedCount: evaluation.unlockedBadges.length,
        badges: evaluation.badges,
        unlockedBadges: evaluation.unlockedBadges,
        newlyUnlocked: evaluation.newlyUnlocked,
        stats: evaluation.stats,
      });
    }

    return sendJson(res, 404, { detail: 'Rota não encontrada' });
  } catch (err) {
    return sendJson(res, 500, {
      detail: err?.message || 'Erro interno no servidor Prisma',
    });
  }
});

if (require.main === module) {
  seedDatabase()
    .then(() => {
      if (process.argv.includes('--seed-only')) {
        console.log('Seed concluído com sucesso no PostgreSQL do Supabase via Prisma!');
        process.exit(0);
      }
      server.listen(PORT, '0.0.0.0', () => {
        console.log(
          `Everquest Prisma + Supabase PostgreSQL API rodando em http://localhost:${PORT}`
        );
      });
    })
    .catch((err) => {
      console.error('Erro ao inicializar Prisma Server:', err);
      process.exit(1);
    });
}

