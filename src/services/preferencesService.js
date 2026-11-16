/** @typedef {{ theme: 'light' | 'dark', focusNotifications: boolean, soundEnabled: boolean, vibrationEnabled: boolean }} AppPreferences */

export const PREFERENCES_KEY = 'everquest_preferences_v1';
/** @type {Readonly<AppPreferences>} */
export const DEFAULT_PREFERENCES = Object.freeze({
  theme: 'light',
  focusNotifications: false,
  soundEnabled: true,
  vibrationEnabled: true,
});

/** @returns {AppPreferences} */
export function normalizePreferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('As preferências salvas estão em um formato inválido.');
  }
  const result = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(DEFAULT_PREFERENCES)) {
    if (!(key in value)) continue;
    if (key === 'theme' ? !['light', 'dark'].includes(value[key]) : typeof value[key] !== 'boolean') {
      throw new Error('As preferências salvas contêm uma opção inválida.');
    }
    result[key] = value[key];
  }
  return result;
}

export async function loadPreferences(storage) {
  const raw = await storage.getItem(PREFERENCES_KEY);
  return raw === null ? { ...DEFAULT_PREFERENCES } : normalizePreferences(JSON.parse(raw));
}

export async function savePreferences(storage, value) {
  const preferences = normalizePreferences(value);
  await storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  return preferences;
}
