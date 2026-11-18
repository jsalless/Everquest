import catalog from './shopCatalog.json';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export { catalog };

async function requestShop(token, path, method = 'GET', body, signal) {
  if (!token) throw new Error('Entre pela sua conta do servidor para comprar peças.');
  let response;
  try {
    response = await fetch(`${API_URL}/shop${path}`, {
      method,
      signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar à loja. Tente novamente.');
  }
  const data = await response.json().catch(() => {
    throw new Error('A loja está indisponível no momento. Tente novamente.');
  });
  if (!response.ok) throw new Error(data.detail || 'Não foi possível concluir a operação.');
  return data;
}

export function fetchShop(token, signal) {
  return requestShop(token, '', 'GET', undefined, signal);
}

export function buyShopItem(token, itemId) {
  return requestShop(token, '/purchase', 'POST', { itemId });
}

export async function saveServerAvatar(token, avatarConfig) {
  return (await requestShop(token, '/avatar', 'PATCH', { avatarConfig })).avatarConfig;
}
