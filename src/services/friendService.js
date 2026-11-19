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

async function requestFriendApi(token, path, options = {}) {
  if (!token) throw new Error('Entre pela sua conta do servidor para acessar amizades.');
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor de amizades.');
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('O servidor de amizades retornou uma resposta inválida.');
  }
  if (!response.ok) {
    throw new Error(data.detail || 'Não foi possível processar o pedido de amizade.');
  }
  return data;
}

export function fetchFriendRequests(token) {
  return requestFriendApi(token, '/friend-requests');
}

export function fetchConfirmedFriends(token) {
  return requestFriendApi(token, '/friends');
}

export function sendFriendRequest(token, { friendId, friendUsername }) {
  return requestFriendApi(token, '/friend-requests', {
    method: 'POST',
    body: JSON.stringify({
      friend_id: friendId || null,
      friend_username: friendUsername || null,
    }),
  });
}

export function acceptFriendRequest(token, requestId) {
  return requestFriendApi(token, `/friend-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST',
  });
}

export function fetchUserFriends(token, searchQuery = '') {
  const params = new URLSearchParams();
  if (searchQuery.trim()) params.set('q', searchQuery.trim());
  return requestFriendApi(token, `/friends?${params.toString()}`);
}

export async function searchRegisteredUsers(token, searchQuery = '') {
  const params = new URLSearchParams();
  if (searchQuery.trim()) params.set('q', searchQuery.trim());
  const data = await requestFriendApi(token, `/users/search?${params.toString()}`);
  return data.users;
}

export async function removeFriendRelationship(token, friendId) {
  await requestFriendApi(token, `/friends/${encodeURIComponent(friendId)}`, {
    method: 'DELETE',
  });
  try {
    return await fetchConfirmedFriends(token);
  } catch {
    throw new Error('Amigo removido, mas não foi possível atualizar a lista.');
  }
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

  let serverError;
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
    if (res.ok) return await res.json();
    serverError = new Error(`O servidor de perfis respondeu com erro ${res.status}.`);
  } catch (error) {
    serverError = error;
  }

  if (SUPABASE_URL && SUPABASE_API_KEY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_API_KEY,
          Authorization: `Bearer ${SUPABASE_API_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
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
      if (!response.ok) {
        throw new Error(`O serviço de perfis respondeu com erro ${response.status}.`);
      }
      return await response.json();
    } catch (error) {
      console.error('Não foi possível sincronizar o perfil:', serverError, error);
      throw new Error('Não foi possível sincronizar seu perfil com o servidor.');
    }
  }
  console.error('Não foi possível sincronizar o perfil:', serverError);
  throw new Error('Não foi possível sincronizar seu perfil com o servidor.');
}
