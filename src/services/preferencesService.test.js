const assert = require('node:assert/strict');
const { test } = require('node:test');

test('preferências começam sem pedir permissão e sobrevivem ao reinício', async () => {
  const { loadPreferences, savePreferences } = await import('./preferencesService.js');
  let stored = null;
  const storage = { getItem: async () => stored, setItem: async (_, value) => { stored = value; } };
  const defaults = await loadPreferences(storage);
  assert.equal(defaults.focusNotifications, false);
  await savePreferences(storage, { ...defaults, theme: 'dark', soundEnabled: false, vibrationEnabled: false });
  assert.deepEqual(await loadPreferences(storage), { theme: 'dark', focusNotifications: false, soundEnabled: false, vibrationEnabled: false });
});

test('preferências inválidas e falhas de persistência não são tratadas como sucesso', async () => {
  const { loadPreferences, savePreferences } = await import('./preferencesService.js');
  await assert.rejects(loadPreferences({ getItem: async () => '{"theme":"other"}' }), /inválida/);
  await assert.rejects(loadPreferences({ getItem: async () => '{broken' }), SyntaxError);
  await assert.rejects(savePreferences({ setItem: async () => { throw new Error('disk full'); } }, { theme: 'dark' }), /disk full/);
});
