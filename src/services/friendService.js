import { Platform } from 'react-native';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');

const SUPABASE_URL = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://gfnlbnsezgrkmtzewube.supabase.co'
).replace(/\/$/, '');

const SUPABASE_API_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_SECRET_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_s5Dz7ucCwttYh-2ipIojwg_SYrzmYyq';

const LOCAL_FRIENDS_CACHE_PREFIX = 'everquest_friends_db_v1_';

const memoryCache = {};

async function requestFriendApi(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (error) {
    throw new Error('Não foi possível conectar ao servidor de amizades.');
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Não foi possível processar o pedido de amizade.');
  }
  return data;
}

export async function fetchFriendRequests(user) {
  const params = new URLSearchParams({ user_id: resolveUserId(user) });
  return requestFriendApi(`/friend-requests?${params.toString()}`);
}

export async function fetchConfirmedFriends(user) {
  const params = new URLSearchParams({ user_id: resolveUserId(user) });
  return requestFriendApi(`/friends?${params.toString()}`);
}

export async function sendFriendRequest(user, { friendId, friendUsername }) {
  return requestFriendApi('/friend-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: resolveUserId(user),
      friend_id: friendId || null,
      friend_username: friendUsername || null,
    }),
  });
}

export async function acceptFriendRequest(user, requestId) {
  return requestFriendApi(`/friend-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: resolveUserId(user) }),
  });
}

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_API_KEY,
    Authorization: `Bearer ${SUPABASE_API_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function mapSupabaseProfileRow(row) {
  const uname = String(row.username || 'aventureiro')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
  const xp = Number(row.xp) || 0;
  const level = Math.floor(xp / 100) + 1;
  return {
    id: row.id,
    email: row.email || null,
    username: `@${uname}`,
    rawUsername: uname,
    characterName: row.character_name || 'Aventureiro',
    level: Number(row.level) || level,
    xp,
    coins: Number(row.coins) || 0,
    avatarConfig:
      typeof row.avatar_config === 'object' && row.avatar_config
        ? row.avatar_config
        : {
            race: 'human',
            skinColor: '#F4C2A8',
            hair: 'hair1',
            hairColor: '#1B0700',
            shirtColor: '#7153FD',
            pantsColor: '#272E59',
          },
  };
}

export function resolveUserId(user) {
  if (!user) return 'guest-jsalless';
  const rawId =
    user.id ||
    user.email ||
    user?.user_metadata?.username ||
    user.username ||
    'guest-jsalless';
  return String(rawId).trim().toLowerCase();
}

export function resolveUsername(user) {
  const raw =
    user?.user_metadata?.username ||
    user?.username ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'jsalless';
  return String(raw).trim().toLowerCase().replace(/\s+/g, '');
}

function readLocalFriendsCache(userId) {
  const key = `${LOCAL_FRIENDS_CACHE_PREFIX}${userId}`;
  try {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.localStorage
    ) {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (_) {}
  if (Array.isArray(memoryCache[key])) {
    return memoryCache[key];
  }
  return [];
}

function writeLocalFriendsCache(userId, friendsList) {
  const key = `${LOCAL_FRIENDS_CACHE_PREFIX}${userId}`;
  memoryCache[key] = friendsList;
  try {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.localStorage
    ) {
      window.localStorage.setItem(key, JSON.stringify(friendsList));
    }
  } catch (_) {}
}

/**
 * Sincroniza o perfil atual do usuário com a tabela `profiles` (FastAPI ou Supabase PostgREST direto).
 */
export async function syncUserProfileToBackend({
  user,
  avatarConfig,
  level = 1,
  xp = 0,
  coins = 0,
}) {
  const userId = resolveUserId(user);
  const username = resolveUsername(user);
  const characterName = (avatarConfig?.characterName || '').trim() || 'Johnn';

  try {
    const res = await fetch(`${API_URL}/profiles/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        email: user?.email || null,
        username,
        character_name: characterName,
        level,
        xp,
        coins,
        avatar_config: avatarConfig || {},
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (_) {
    // Tenta diretamente no Supabase REST caso o servidor FastAPI local não esteja rodando
  }

  if (SUPABASE_URL && SUPABASE_API_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
        method: 'POST',
        headers: getSupabaseHeaders({
          Prefer: 'resolution=merge-duplicates,return=representation',
        }),
        body: JSON.stringify({
          id: userId,
          email: user?.email || null,
          username,
          character_name: characterName,
          level: Math.max(1, Number(level) || 1),
          xp: Math.max(0, Number(xp) || 0),
          coins: Math.max(0, Number(coins) || 0),
          avatar_config: avatarConfig || {},
        }),
      });
    } catch (_) {}
  }

  return null;
}

/**
 * Busca os amigos do usuário no banco de dados (FastAPI -> Supabase REST -> Cache local).
 */
export async function fetchUserFriends(user, searchQuery = '') {
  const userId = resolveUserId(user);
  const query = (searchQuery || '').trim();

  try {
    const params = new URLSearchParams({ user_id: userId });
    if (query) {
      params.set('q', query);
    }

    const res = await fetch(`${API_URL}/friends?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const friends = Array.isArray(data.friends) ? data.friends : [];
      if (!query) {
        writeLocalFriendsCache(userId, friends);
      }
      return {
        total: typeof data.total === 'number' ? data.total : friends.length,
        friends,
        fromDatabase: true,
      };
    }
  } catch (_) {
    // Continua para consulta direta ao Supabase REST
  }

  if (SUPABASE_URL && SUPABASE_API_KEY) {
    try {
      const fRes = await fetch(
        `${SUPABASE_URL}/rest/v1/friendships?or=(user_id.eq.${encodeURIComponent(
          userId
        )},friend_id.eq.${encodeURIComponent(userId)})&status=eq.accepted`,
        { headers: getSupabaseHeaders() }
      );

      if (fRes.ok) {
        const fRows = await fRes.json();
        if (Array.isArray(fRows)) {
          const otherIds = fRows.map((r) =>
            r.user_id === userId ? r.friend_id : r.user_id
          );

          if (otherIds.length === 0) {
            if (!query) writeLocalFriendsCache(userId, []);
            return { total: 0, friends: [], fromDatabase: true };
          }

          const inList = otherIds.map((id) => `"${id}"`).join(',');
          const pRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=in.(${inList})`,
            { headers: getSupabaseHeaders() }
          );

          if (pRes.ok) {
            const pRows = await pRes.json();
            const allFriends = (Array.isArray(pRows) ? pRows : [])
              .map(mapSupabaseProfileRow)
              .sort((a, b) =>
                a.characterName.localeCompare(b.characterName, 'pt-BR')
              );

            if (!query) {
              writeLocalFriendsCache(userId, allFriends);
            }

            const lowerQuery = query.toLowerCase().replace(/^@/, '');
            const filtered = lowerQuery
              ? allFriends.filter(
                  (f) =>
                    f.characterName.toLowerCase().includes(lowerQuery) ||
                    f.username.toLowerCase().includes(lowerQuery)
                )
              : allFriends;

            return {
              total: allFriends.length,
              friends: filtered,
              fromDatabase: true,
            };
          }
        }
      }
    } catch (_) {}
  }

  const cached = readLocalFriendsCache(userId);
  const lowerQuery = query.toLowerCase().replace(/^@/, '');
  const filtered = lowerQuery
    ? cached.filter(
        (f) =>
          (f.characterName || '').toLowerCase().includes(lowerQuery) ||
          (f.username || '').toLowerCase().includes(lowerQuery)
      )
    : cached;

  return {
    total: cached.length,
    friends: filtered,
    fromDatabase: false,
  };
}

/**
 * Busca usuários na tabela `profiles` para adicionar como amigo.
 */
export async function searchRegisteredUsers(user, searchQuery = '') {
  const userId = resolveUserId(user);
  const query = (searchQuery || '').trim();

  try {
    const params = new URLSearchParams({ user_id: userId });
    if (query) {
      params.set('q', query);
    }
    const res = await fetch(`${API_URL}/users/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.users) ? data.users : [];
    }
  } catch (_) {}

  if (SUPABASE_URL && SUPABASE_API_KEY) {
    try {
      const [pRes, fRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=neq.${encodeURIComponent(
            userId
          )}&limit=30`,
          { headers: getSupabaseHeaders() }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/friendships?or=(user_id.eq.${encodeURIComponent(
            userId
          )},friend_id.eq.${encodeURIComponent(userId)})&status=eq.accepted`,
          { headers: getSupabaseHeaders() }
        ),
      ]);

      if (pRes.ok && fRes.ok) {
        const pRows = await pRes.json();
        const fRows = await fRes.json();
        const friendIds = new Set(
          (Array.isArray(fRows) ? fRows : []).map((r) =>
            r.user_id === userId ? r.friend_id : r.user_id
          )
        );

        const lowerQuery = query.toLowerCase().replace(/^@/, '');
        return (Array.isArray(pRows) ? pRows : [])
          .map(mapSupabaseProfileRow)
          .filter(
            (u) =>
              !lowerQuery ||
              u.characterName.toLowerCase().includes(lowerQuery) ||
              u.username.toLowerCase().includes(lowerQuery)
          )
          .map((u) => ({
            ...u,
            isFriend: friendIds.has(u.id),
          }));
      }
    } catch (_) {}
  }

  throw new Error('Não foi possível carregar os aventureiros. Tente novamente.');
}

/**
 * Remove um amigo do banco de dados.
 */
export async function removeFriendRelationship(user, friendId) {
  const userId = resolveUserId(user);

  try {
    const params = new URLSearchParams({ user_id: userId });
    const res = await fetch(
      `${API_URL}/friends/${encodeURIComponent(friendId)}?${params.toString()}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      const updated = await fetchUserFriends(user, '');
      return {
        total: updated.total,
        friends: updated.friends,
      };
    }
  } catch (_) {}

  if (SUPABASE_URL && SUPABASE_API_KEY) {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/friendships?or=(and(user_id.eq.${encodeURIComponent(
          userId
        )},friend_id.eq.${encodeURIComponent(
          friendId
        )}),and(user_id.eq.${encodeURIComponent(
          friendId
        )},friend_id.eq.${encodeURIComponent(userId)}))`,
        {
          method: 'DELETE',
          headers: getSupabaseHeaders(),
        }
      );
    } catch (_) {}
  }

  const cached = readLocalFriendsCache(userId);
  const nextList = cached.filter((f) => f.id !== friendId);
  writeLocalFriendsCache(userId, nextList);
  return {
    total: nextList.length,
    friends: nextList,
  };
}
