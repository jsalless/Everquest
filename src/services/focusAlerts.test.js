const assert = require('node:assert/strict');
const { test } = require('node:test');

test('alerta web respeita permissão, som e cancelamento ao pausar/sair', async (t) => {
  const descriptors = new Map(['Notification', 'setTimeout', 'clearTimeout'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const pending = new Map();
  const delivered = [];
  let nextId = 0;
  globalThis.setTimeout = (callback, delay) => { const id = ++nextId; pending.set(id, { callback, delay }); return id; };
  globalThis.clearTimeout = (id) => pending.delete(id);
  globalThis.Notification = class {
    static permission = 'granted';
    constructor(title, options) { delivered.push({ title, options }); }
  };
  const service = await import('./focusAlerts.js');
  const preferences = { focusNotifications: true, soundEnabled: false };
  assert.equal(await service.scheduleFocusAlert(Date.now() + 5000, { focusNotifications: false }), null);
  const id = await service.scheduleFocusAlert(Date.now() + 5000, preferences);
  assert.ok([...pending.values()][0].delay > 0);
  await service.cancelFocusAlert(id);
  assert.equal(pending.size, 0);
  await service.scheduleFocusAlert(Date.now() + 5000, preferences);
  const [deliveredId, scheduled] = [...pending.entries()][0];
  pending.delete(deliveredId);
  scheduled.callback();
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].options.silent, true);
  await service.scheduleFocusAlert(Date.now() + 5000, preferences);
  await service.cancelAllFocusAlerts();
  assert.equal(pending.size, 0);
  globalThis.Notification.permission = 'denied';
  await assert.rejects(service.scheduleFocusAlert(Date.now() + 5000, preferences), /Permita notificações/);
});
