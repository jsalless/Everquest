const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const { getAvatarStats } = require('../src/services/avatarEquipment');

const hash = (password) => crypto.createHash('sha256').update(`everquest_salt_${password}`).digest('hex');

function setup() {
  const profiles = [
    { id: 'alice', username: 'alice', email: 'alice@example.com', character_name: 'Maga', xp: 250, coins: 5, avatar_config: { hair: 'hair2', _authHash: hash('old-pass') } },
    { id: 'bob', username: 'bob', email: 'bob@example.com', character_name: 'Guerreiro', avatar_config: {} },
  ];
  const writes = [];
  const wardrobe = new Set();
  const matches = (row, where) => Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((entry) => matches(row, entry));
    if (value && typeof value === 'object') {
      if ('not' in value) return row[key] !== value.not;
      if ('equals' in value) return String(row[key]).toLowerCase() === value.equals.toLowerCase();
    }
    return row[key] === value;
  });
  const prisma = {
    profile: {
      findUnique: async ({ where }) => profiles.find((row) => row.id === where.id) || null,
      findUniqueOrThrow: async ({ where }) => ({
        coins: profiles.find((row) => row.id === where.id).coins,
        wardrobeItems: [...wardrobe].filter((key) => key.startsWith(`${where.id}:`))
          .map((key) => ({ item_id: key.split(':')[1] })),
      }),
      findFirst: async ({ where }) => profiles.find((row) => matches(row, where)) || null,
      update: async ({ where, data }) => {
        writes.push(data);
        const row = profiles.find((item) => item.id === where.id);
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }) => {
        const row = profiles.find((item) => item.id === where.id);
        if (where.coins && row.coins < where.coins.gte) return { count: 0 };
        if (where.avatar_config && row.avatar_config._authHash !== where.avatar_config.equals) return { count: 0 };
        if (data.coins) row.coins -= data.coins.decrement;
        else Object.assign(row, data);
        return { count: 1 };
      },
    },
    wardrobeItem: {
      create: async ({ data }) => {
        const key = `${data.user_id}:${data.item_id}`;
        if (wardrobe.has(key)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
        wardrobe.add(key);
      },
    },
    $transaction: async (run) => {
      const before = new Set(wardrobe);
      try {
        return await run(prisma);
      } catch (error) {
        wardrobe.clear();
        before.forEach((key) => wardrobe.add(key));
        throw error;
      }
    },
  };
  let handler;
  const context = vm.createContext({
    require: (name) => name === 'http' ? { createServer: (callback) => { handler = callback; return {}; } } :
      name === '@prisma/client' ? { PrismaClient: function () { return prisma; } } : require(name),
    module: { exports: {} }, process: { env: {}, argv: [] }, console, Buffer, URL,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'prismaServer.js'), 'utf8'), context);
  vm.runInContext('ensureDailyQuestsAndEvaluate = async () => ({})', context);
  const request = (url, body, token = 'eq_token_alice', method = 'PATCH') => new Promise((resolve) => {
    const req = new EventEmitter();
    Object.assign(req, { method, url, headers: { authorization: token ? `Bearer ${token}` : '' } });
    const res = {
      writeHead(status) { this.status = status; },
      end(data) { resolve({ status: this.status, body: JSON.parse(data) }); },
    };
    handler(req, res);
    setImmediate(() => {
      req.emit('data', JSON.stringify(body));
      req.emit('end');
    });
  });
  return { request, writes, profiles, prisma };
}

test('alterações de conta exigem autenticação e senha atual, sem aceitar perfis sem senha', async () => {
  const { request, writes } = setup();
  const payload = { username: 'newalice', email: 'new@example.com', current_password: 'old-pass' };
  assert.equal((await request('/auth/account', payload, null)).status, 401);
  assert.equal((await request('/auth/account', { ...payload, current_password: 'wrong' })).status, 401);
  assert.equal((await request('/auth/account', payload, 'eq_token_bob')).status, 401);
  assert.equal(writes.length, 0);
});

test('alterar usuário e e-mail mantém identidade, personagem, avatar e progresso', async () => {
  const { request, profiles } = setup();
  const result = await request('/auth/account', { username: ' NewAlice ', email: ' NEW@example.com ', current_password: 'old-pass' });
  assert.equal(result.status, 200);
  assert.equal(result.body.user.id, 'alice');
  assert.equal(result.body.user.username, 'newalice');
  assert.equal(result.body.user.email, 'new@example.com');
  assert.equal(result.body.user.user_metadata.display_name, 'Maga');
  assert.equal(result.body.user.avatarConfig.hair, 'hair2');
  assert.equal(result.body.user.avatarConfig._authHash, undefined);
  assert.equal(profiles[0].xp, 250);
  assert.equal(profiles[0].avatar_config._authHash, hash('old-pass'));
});

test('validação e conflitos de usuário/e-mail não escrevem dados', async () => {
  const { request, writes } = setup();
  const valid = { username: 'alice', email: 'alice@example.com', current_password: 'old-pass' };
  assert.equal((await request('/auth/account', { ...valid, email: 'invalid' })).status, 400);
  assert.equal((await request('/auth/account', { ...valid, username: 'a b' })).status, 400);
  assert.equal((await request('/auth/account', { ...valid, email: 'BOB@example.com' })).status, 409);
  assert.equal((await request('/auth/account', { ...valid, username: 'BOB' })).status, 409);
  assert.equal((await request('/auth/password', { current_password: 'old-pass', new_password: '123' })).status, 400);
  assert.equal((await request('/auth/password', { current_password: 'old-pass', new_password: 'old-pass' })).status, 400);
  assert.equal(writes.length, 0);
});

test('troca de senha invalida a antiga no login sem alterar o avatar', async () => {
  const { request, profiles } = setup();
  const changed = await request('/auth/password', { current_password: 'old-pass', new_password: 'new-pass' });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.user.avatarConfig._authHash, undefined);
  assert.equal(profiles[0].avatar_config.hair, 'hair2');
  assert.equal(profiles[0].avatar_config._authHash, hash('new-pass'));
  assert.equal((await request('/auth/login', { email: 'alice@example.com', password: 'old-pass' }, null, 'POST')).status, 401);
  assert.equal((await request('/auth/login', { email: 'alice@example.com', password: 'new-pass' }, null, 'POST')).status, 200);
});

test('conflito concorrente do banco retorna erro explícito', async () => {
  const { request, prisma } = setup();
  prisma.profile.update = async () => { throw Object.assign(new Error('duplicate'), { code: 'P2002' }); };
  const result = await request('/auth/account', { username: 'newalice', email: 'new@example.com', current_password: 'old-pass' });
  assert.equal(result.status, 409);
});

test('loja autentica a conta, usa o preço do servidor e não cobra a mesma peça duas vezes', async () => {
  const { request, profiles } = setup();
  profiles[0].coins = 40;
  assert.equal((await request('/shop', {}, 'eq_token_alice', 'GET')).status, 401);
  const login = await request('/auth/login', { email: 'alice@example.com', password: 'old-pass' }, null, 'POST');
  const token = login.body.shop_token;
  assert.equal((await request('/shop/purchase', { itemId: 'unknown' }, token, 'POST')).status, 404);
  const buy = () => request('/shop/purchase', { itemId: 'shirt-astral', price: 1, userId: 'bob' }, token, 'POST');
  assert.deepEqual((await buy()).body, { coins: 15, ownedItemIds: ['shirt-astral'] });
  assert.deepEqual((await buy()).body, { coins: 15, ownedItemIds: ['shirt-astral'] });
  assert.equal((await request('/shop/purchase', { itemId: 'pants-guardian' }, token, 'POST')).status, 409);
  await request('/profiles/sync', { user_id: 'alice', coins: 40 }, null, 'POST');
  assert.deepEqual((await request('/shop', {}, token, 'GET')).body, { coins: 15, ownedItemIds: ['shirt-astral'] });
});

test('personalização só aceita roupas já compradas na categoria correta e persiste após login', async () => {
  const { request, profiles } = setup();
  profiles[0].coins = 25;
  const login = () => request('/auth/login', { email: 'alice@example.com', password: 'old-pass' }, null, 'POST');
  const token = (await login()).body.shop_token;
  const avatarConfig = {
    characterName: 'Maga', race: 'human', hair: 'hair2', eyes: 'eye1',
    shirt: 'shirt-astral', pants: 'leg1', shoes: 'shoe1',
    skinColor: '#D5896B', hairColor: '#1B0700', shirtColor: '#222123',
    pantsColor: '#272E59', shoesColor: '#487762',
  };
  assert.equal((await request('/shop/avatar', { avatarConfig }, token)).status, 400);
  await request('/shop/purchase', { itemId: 'shirt-astral' }, token, 'POST');
  assert.equal((await request('/shop/avatar', { avatarConfig: { ...avatarConfig, pants: 'shirt-astral' } }, token)).status, 400);
  assert.deepEqual((await request('/shop/avatar', { avatarConfig }, token)).body.avatarConfig, {
    ...avatarConfig, head: 'none', weapon: 'none',
  });
  assert.equal((await login()).body.user.avatarConfig.shirt, 'shirt-astral');

  const updatedEquipment = { ...avatarConfig, head: 'head-traveler', weapon: 'weapon-wood' };
  assert.equal((await request('/shop/avatar', { avatarConfig: { ...updatedEquipment, head: 'weapon-wood' } }, token)).status, 400);
  assert.deepEqual((await request('/shop/avatar', { avatarConfig: updatedEquipment }, token)).body.avatarConfig, updatedEquipment);
  const legacySave = await request('/shop/avatar', { avatarConfig }, token);
  assert.equal(legacySave.body.avatarConfig.head, 'head-traveler');
  assert.equal((await login()).body.user.avatarConfig.weapon, 'weapon-wood');
});

test('atributos somam somente o equipamento no espaço correto e voltam ao remover a peça', () => {
  const equipped = {
    head: 'head-traveler', shirt: 'shirt-forest', pants: 'pants-dusk', shoes: 'shoes-ember', weapon: 'weapon-wood',
  };
  assert.deepEqual(getAvatarStats(equipped), { damage: 10, health: 110, armor: 3, magic: 2 });
  assert.deepEqual(getAvatarStats({ ...equipped, head: 'weapon-wood', weapon: 'none' }), {
    damage: 7, health: 110, armor: 2, magic: 2,
  });
});
