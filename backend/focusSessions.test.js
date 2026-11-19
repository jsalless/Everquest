const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const {
  createFocusSession, getFocusSession, changeFocusSession, getFocusHistory, creditFocusSession,
} = require('./focusSessions');
const { issueShopToken } = require('./shop');

function database() {
  const rows = [];
  const credits = [];
  const counters = new Map();
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
      findMany: async ({ where, include, cursor, skip, take }) => {
        let result = rows.filter((row) => matches(row, where));
        if (include?.credits) {
          result = result.sort((a, b) => a.id.localeCompare(b.id));
          if (cursor) result = result.slice(result.findIndex((row) => row.id === cursor.id) + skip);
          if (take) result = result.slice(0, take);
          result = result.map((row) => ({
            ...includeNames(row, include),
            credits: credits.filter((credit) =>
              credit.session_id === row.id && credit.user_id === include.credits.where.user_id),
          }));
        }
        return result;
      },
      findFirst: async ({ where, include }) => includeNames(rows.find((row) => matches(row, where)), include),
      findUnique: async ({ where, include }) => includeNames(rows.find((row) => row.id === where.id), include),
      create: async ({ data, include }) => {
        const row = {
          ...data, id: randomUUID(), status: 'pending', elapsed_ms: 0,
          running_since: null, created_at: new Date(), updated_at: new Date(),
        };
        rows.push(row);
        return includeNames(row, include);
      },
      update: async ({ where, data, include }) => {
        const row = rows.find((item) => item.id === where.id);
        Object.assign(row, data, { updated_at: new Date() });
        return includeNames(row, include);
      },
    },
    focusSessionCredit: {
      findUnique: async ({ where }) => credits.find((credit) =>
        credit.session_id === where.session_id_user_id.session_id &&
        credit.user_id === where.session_id_user_id.user_id),
      createMany: async ({ data }) => {
        const credit = data[0];
        if (credits.some((item) => item.session_id === credit.session_id && item.user_id === credit.user_id)) {
          return { count: 0 };
        }
        credits.push(credit);
        return { count: 1 };
      },
    },
    dailyActivityCounter: {
      upsert: async ({ where, create, update }) => {
        const key = `${where.user_id_activity_date.user_id}:${where.user_id_activity_date.activity_date}`;
        const current = counters.get(key);
        counters.set(key, current ? {
          ...current,
          focus_sessions: current.focus_sessions + update.focus_sessions.increment,
          focus_seconds: current.focus_seconds + update.focus_seconds.increment,
        } : create);
      },
    },
  };
  return { db, rows, counters };
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

test('recupera conclusão enquanto o app estava fechado e credita uma vez por participante', async () => {
  const { db, rows, counters } = database();
  const { session } = await createFocusSession(db, 'alice', { friendId: 'bob', durationSeconds: 300 });
  await changeFocusSession(db, 'bob', session.id, 'accept');
  const endedAt = Date.now() - 60000;
  rows[0].running_since = new Date(endedAt - 300000);
  const history = await getFocusHistory(db, 'bob');
  assert.equal(history.sessions.length, 1);
  assert.equal(history.sessions[0].credited, false);
  assert.ok(Math.abs(new Date(history.sessions[0].completedAt).getTime() - endedAt) < 100);
  assert.equal((await getFocusHistory(db, 'other')).sessions.length, 0);
  const day = new Date(endedAt).toISOString().slice(0, 10);
  assert.equal((await creditFocusSession(db, 'other', session.id, 0)).status, 404);
  assert.equal((await creditFocusSession(db, 'bob', session.id, 900)).status, 400);
  assert.equal((await creditFocusSession(db, 'bob', session.id, 0)).credited, true);
  const repeated = await creditFocusSession(db, 'bob', session.id, 180);
  assert.equal(repeated.offsetMinutes, 0);
  assert.equal(repeated.dateKey, day);
  await creditFocusSession(db, 'alice', session.id, 0);
  assert.equal(counters.get(`bob:${day}`).focus_sessions, 1);
  assert.equal(counters.get(`bob:${day}`).focus_seconds, 300);
  assert.equal(counters.get(`alice:${day}`).focus_sessions, 1);
  assert.equal((await getFocusHistory(db, 'bob')).sessions[0].credited, true);
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
  await db.focusSession.update({ where: { id: created.body.session.id }, data: {
    running_since: new Date(Date.now() - 301000),
  } });
  const history = await request('GET', '/focus-sessions/history', null, 'bob');
  assert.equal(history.body.sessions.length, 1);
  assert.equal((await request('GET', '/focus-sessions/history', null, 'other')).body.sessions.length, 0);
  assert.equal((await request('POST', `${url}/credit`, { offsetMinutes: 0 }, 'other')).status, 404);
  assert.equal((await request('POST', `${url}/credit`, { offsetMinutes: 0 }, 'bob')).body.credited, true);
});
