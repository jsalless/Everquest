const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const { issueShopToken } = require('./shop');

test('inicialização não cria perfis nem amizades de demonstração', async () => {
  const writes = [];
  let listening = false;
  const prisma = {
    profile: {
      upsert: async (args) => { writes.push(args); return args.create; },
      findUnique: async () => null,
      findFirst: async () => null,
      create: async (args) => { writes.push(args); return args.data; },
    },
    friendship: {
      upsert: async (args) => { writes.push(args); return args.create; },
    },
    badge: { upsert: async () => ({}) },
  };
  const serverModule = { exports: {} };
  const requireStub = (name) => {
    if (name === 'http') {
      return { createServer: () => ({ listen: () => { listening = true; } }) };
    }
    if (name === '@prisma/client') {
      return { PrismaClient: function () { return prisma; } };
    }
    return require(name);
  };
  requireStub.main = serverModule;
  const context = vm.createContext({
    require: requireStub,
    module: serverModule,
    process: { env: {}, argv: [], exit: () => assert.fail('Inicialização falhou') },
    console, Buffer, URL,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'prismaServer.js'), 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(listening, true);
  assert.equal(writes.length, 0);
});

test('sincronizar um perfil real não adiciona amigos automaticamente', async () => {
  const createdProfiles = [];
  const createdFriendships = [];
  const prisma = {
    profile: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async ({ data }) => { createdProfiles.push(data); return data; },
    },
    friendship: {
      upsert: async ({ create }) => { createdFriendships.push(create); return create; },
    },
  };
  const context = vm.createContext({
    require: (name) => name === 'http' ? { createServer: () => ({}) } :
      name === '@prisma/client' ? { PrismaClient: function () { return prisma; } } : require(name),
    module: { exports: {} }, process: { env: {}, argv: [] }, console, Buffer, URL,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'prismaServer.js'), 'utf8'), context);
  await vm.runInContext(
    'ensureUserProfile({ userId: "real-user", username: "viajante", email: "viajante@example.com" })',
    context
  );
  assert.equal(createdProfiles.length, 1);
  assert.equal(createdProfiles[0].id, 'real-user');
  assert.equal(createdFriendships.length, 0);
});

test('pedidos precisam ser aceitos pelo destinatário antes de virar amizade', async () => {
  const profiles = new Map(['alice', 'bob'].map((id) => [id, {
    id, username: id, character_name: id, xp: 0, avatar_config: { _authHash: 'private' },
  }]));
  const friendships = [];
  const matches = (row, where) =>
    Object.entries(where).every(([key, value]) => {
      if (key === 'OR') return value.some((condition) => matches(row, condition));
      if (value && typeof value === 'object' && 'equals' in value) {
        return String(row[key]).toLowerCase() === value.equals.toLowerCase();
      }
      return row[key] === value;
    });
  const prisma = {
    profile: {
      findUnique: async ({ where }) => profiles.get(where.id) || null,
      findFirst: async ({ where }) => [...profiles.values()].find((row) => matches(row, where)) || null,
    },
    friendship: {
      findFirst: async ({ where }) => friendships.find((row) => matches(row, where)) || null,
      findMany: async ({ where, include }) => friendships.filter((row) => matches(row, where)).map((row) => ({
        ...row,
        ...(include?.user ? { user: profiles.get(row.user_id) } : {}),
        ...(include?.friend ? { friend: profiles.get(row.friend_id) } : {}),
      })),
      create: async ({ data }) => {
        const row = { ...data, id: 'request-1', created_at: new Date() };
        friendships.push(row);
        return row;
      },
      updateMany: async ({ where, data }) => {
        const rows = friendships.filter((row) => matches(row, where));
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
    },
    $queryRaw: async () => [],
    $transaction: async (callback) => callback(prisma),
  };
  let handler;
  const fakeHttp = { createServer: (callback) => { handler = callback; return {}; } };
  const context = vm.createContext({
    require: (name) => name === 'http' ? fakeHttp :
      name === '@prisma/client' ? { PrismaClient: function () { return prisma; } } : require(name),
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
      end(data) { resolve({ status: this.status, body: JSON.parse(data) }); },
    };
    handler(req, res);
    process.nextTick(() => {
      if (body) req.emit('data', JSON.stringify(body));
      req.emit('end');
    });
  });

  assert.equal((await request('POST', '/friend-requests', { user_id: 'alice', friend_id: 'bob' })).status, 401);
  assert.equal((await request('POST', '/friend-requests', { user_id: 'bob', friend_id: 'bob' }, 'alice')).status, 201);
  assert.equal((await request('GET', '/friends?user_id=alice', null, 'bob')).body.total, 0);
  const pending = await request('GET', '/friend-requests?user_id=alice', null, 'bob');
  assert.equal(pending.body.incoming.length, 1);
  assert.equal(pending.body.incoming[0].user.avatarConfig._authHash, undefined);
  assert.equal((await request('POST', '/friend-requests', { friend_id: 'alice' }, 'bob')).status, 409);
  assert.equal((await request('POST', '/friend-requests', { friend_id: 'alice' }, 'alice')).status, 400);
  assert.equal((await request('POST', '/friend-requests', { friend_id: 'missing' }, 'alice')).status, 404);
  assert.equal((await request('POST', '/friend-requests/request-1/accept', { user_id: 'bob' }, 'alice')).status, 404);
  assert.equal((await request('POST', '/friend-requests/request-1/accept', null, 'bob')).status, 200);
  assert.equal((await request('POST', '/friend-requests/request-1/accept', null, 'bob')).status, 404);
  assert.equal((await request('GET', '/friends', null, 'bob')).body.friends[0].id, 'alice');
});
