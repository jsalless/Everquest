const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const { createFocusSession, getFocusSession, changeFocusSession } = require('./focusSessions');
const { issueShopToken } = require('./shop');

function database() {
  const rows = [];
  const profiles = {
    alice: { character_name: 'Alice' },
    bob: { character_name: 'Bob' },
  };
  const matches = (row, where) => Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((part) => matches(row, part));
    if (value && typeof value === 'object' && value.in) return value.in.includes(row[key]);
    return row[key] === value;
  });
  const includeNames = (row, include) => row && include
    ? { ...row, host: profiles[row.host_id], guest: profiles[row.guest_id] }
    : row;
  const db = {
    $queryRaw: async () => [],
    $transaction: async (fn) => fn(db),
    friendship: {
      findFirst: async ({ where }) => matches({
        status: 'accepted', user_id: 'alice', friend_id: 'bob',
      }, where) ? { id: 'friendship' } : null,
    },
    focusSession: {
      findMany: async ({ where }) => rows.filter((row) => matches(row, where)),
      findFirst: async ({ where, include }) => includeNames(rows.find((row) => matches(row, where)), include),
      findUnique: async ({ where, include }) => includeNames(rows.find((row) => row.id === where.id), include),
      create: async ({ data, include }) => {
        const row = {
          ...data, id: randomUUID(), status: 'pending', elapsed_ms: 0,
          running_since: null, created_at: new Date(),
        };
        rows.push(row);
        return includeNames(row, include);
      },
      update: async ({ where, data, include }) => {
        const row = rows.find((item) => item.id === where.id);
        Object.assign(row, data);
        return includeNames(row, include);
      },
    },
  };
  return { db, rows };
}

test('convites exigem amizade e duração válida e bloqueiam sessões simultâneas', async () => {
  const { db } = database();
  assert.equal((await createFocusSession(db, 'alice', { friendId: 'alice ', durationSeconds: 300 })).status, 400);
  assert.equal((await createFocusSession(db, 'alice', { friendId: 'bob', durationSeconds: 301 })).status, 400);
  assert.equal((await createFocusSession(db, 'alice', { friendId: 'other', durationSeconds: 300 })).status, 403);
  const created = await createFocusSession(db, 'alice', { friendId: 'bob', durationSeconds: 300 });
  assert.equal(created.status, 201);
  assert.equal(created.session.status, 'pending');
  assert.equal((await createFocusSession(db, 'bob', { friendId: 'alice', durationSeconds: 300 })).status, 409);
});

test('aceite inicia a sessão e só anfitrião controla pausas e término', async () => {
  const { db } = database();
  const { session } = await createFocusSession(db, 'alice', { friendId: 'bob', durationSeconds: 300 });
  assert.equal(await getFocusSession(db, 'other', session.id), null);
  assert.equal((await changeFocusSession(db, 'alice', session.id, 'accept')).status, 409);
  assert.equal((await changeFocusSession(db, 'bob', session.id, 'accept')).session.status, 'running');
  assert.equal((await changeFocusSession(db, 'bob', session.id, 'pause')).status, 409);
  assert.equal((await changeFocusSession(db, 'alice', session.id, 'pause')).session.status, 'paused');
  assert.equal((await changeFocusSession(db, 'alice', session.id, 'resume')).session.status, 'running');
  assert.equal((await changeFocusSession(db, 'alice', session.id, 'stop')).session.status, 'completed');
  assert.equal(await getFocusSession(db, 'bob'), null);
});

test('convites vencidos liberam os participantes e não podem ser aceitos', async () => {
  const { db, rows } = database();
  const { session } = await createFocusSession(db, 'alice', { friendId: 'bob', durationSeconds: 0 });
  rows[0].expires_at = new Date(Date.now() - 1000);
  assert.equal((await changeFocusSession(db, 'bob', session.id, 'accept')).status, 409);
  assert.equal((await getFocusSession(db, 'bob', session.id)).status, 'expired');
  assert.equal((await createFocusSession(db, 'alice', { friendId: 'bob', durationSeconds: 0 })).status, 201);
});

test('rotas de foco exigem sessão assinada e não expõem sessões a terceiros', async () => {
  const { db } = database();
  db.profile = {
    findUnique: async ({ where }) => ['alice', 'bob', 'other'].includes(where.id)
      ? { id: where.id, avatar_config: { _authHash: 'private' } }
      : null,
  };
  db.pushDevice = { findMany: async () => [] };
  let handler;
  const context = vm.createContext({
    require: (name) => name === 'http' ? { createServer: (fn) => { handler = fn; return {}; } } :
      name === '@prisma/client' ? { PrismaClient: function () { return db; } } : require(name),
    module: { exports: {} }, process: { env: {}, argv: [] }, console, Buffer, URL,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'prismaServer.js'), 'utf8'), context);
  const request = (method, url, body, actor) => new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = actor ? { authorization: `Bearer ${issueShopToken(actor, 'private')}` } : {};
    const res = {
      writeHead(status) { this.status = status; },
      end(value) { resolve({ status: this.status, body: JSON.parse(value) }); },
    };
    handler(req, res);
    setImmediate(() => {
      if (body) req.emit('data', JSON.stringify(body));
      req.emit('end');
    });
  });
  assert.equal((await request('GET', '/focus-sessions')).status, 401);
  const created = await request('POST', '/focus-sessions', { friendId: 'bob', durationSeconds: 300 }, 'alice');
  assert.equal(created.status, 201);
  assert.equal(created.body.pushStatus, 'unavailable');
  const url = `/focus-sessions/${created.body.session.id}`;
  assert.equal((await request('GET', url, null, 'other')).status, 404);
  assert.equal((await request('POST', `${url}/accept`, null, 'alice')).status, 409);
  assert.equal((await request('POST', `${url}/accept`, null, 'bob')).body.session.status, 'running');
});
