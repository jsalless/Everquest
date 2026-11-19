const assert = require('node:assert/strict');
const { test } = require('node:test');
const { registerPushDevice, unregisterPushDevice, notifyFocus, checkPushReceipts } = require('./focusPush');

function database() {
  const devices = [];
  const receipts = [];
  return {
    devices, receipts,
    pushDevice: {
      upsert: async ({ where, update, create }) => {
        const found = devices.find((row) => row.token === where.token);
        if (found) Object.assign(found, update);
        else devices.push({ ...create });
      },
      findMany: async ({ where }) => devices.filter((row) => row.user_id === where.user_id),
      deleteMany: async ({ where }) => {
        for (let i = devices.length - 1; i >= 0; i -= 1) {
          if (devices[i].token === where.token && (!where.user_id || devices[i].user_id === where.user_id)) {
            devices.splice(i, 1);
          }
        }
      },
    },
    pushReceipt: {
      create: async ({ data }) => receipts.push({ ...data, created_at: new Date() }),
      findMany: async ({ where }) => receipts.filter((row) => row.created_at <= where.created_at.lte),
      deleteMany: async ({ where }) => {
        let count = 0;
        for (let i = receipts.length - 1; i >= 0; i -= 1) {
          if (where.id === receipts[i].id ||
              (where.created_at && receipts[i].created_at < where.created_at.lt)) {
            receipts.splice(i, 1);
            count += 1;
          }
        }
        return { count };
      },
    },
  };
}

test('registra tokens válidos e só remove dispositivos do usuário autenticado', async () => {
  const db = database();
  assert.equal(await registerPushDevice(db, 'alice', 'invalid'), false);
  assert.equal(await registerPushDevice(db, 'alice', 'ExpoPushToken[abc-123]'), true);
  await unregisterPushDevice(db, 'bob', 'ExpoPushToken[abc-123]');
  assert.equal(db.devices.length, 1);
  await unregisterPushDevice(db, 'alice', 'ExpoPushToken[abc-123]');
  assert.equal(db.devices.length, 0);
});

test('push envia somente ao destinatário e registra ticket para conferir entrega', async () => {
  const db = database();
  await registerPushDevice(db, 'bob', 'ExpoPushToken[bob]');
  await registerPushDevice(db, 'alice', 'ExpoPushToken[alice]');
  let messages;
  const status = await notifyFocus(db, 'bob', false, async (_url, options) => {
    messages = JSON.parse(options.body);
    return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'ticket-1' }] }) };
  });
  assert.equal(status, 'queued');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'ExpoPushToken[bob]');
  assert.equal(db.receipts[0].id, 'ticket-1');
  db.receipts[0].created_at = new Date(Date.now() - 16 * 60000);
  await checkPushReceipts(db, async () => ({
    ok: true, json: async () => ({ data: { 'ticket-1': { status: 'ok' } } }),
  }));
  assert.equal(db.receipts.length, 0);
});

test('indisponibilidade de push é reportada sem simular entrega', async () => {
  const db = database();
  assert.equal(await notifyFocus(db, 'bob'), 'unavailable');
  await registerPushDevice(db, 'bob', 'ExpoPushToken[bob]');
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await notifyFocus(db, 'bob', false, async () => ({ ok: false, status: 503 })), 'failed');
  } finally {
    console.error = original;
  }
});
