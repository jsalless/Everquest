const crypto = require('node:crypto');
const catalog = require('../src/services/shopCatalog.json');
const { DEFAULT_EQUIPMENT, isAllowedEquipment } = require('../src/services/avatarEquipment');

const signingKey = process.env.SHOP_SESSION_SECRET || crypto.randomBytes(32);
const itemById = new Map(catalog.map((item) => [item.id, item]));

function sign(payload, passwordHash) {
  return crypto.createHmac('sha256', signingKey).update(`${payload}:${passwordHash}`).digest('base64url');
}

function issueShopToken(userId, passwordHash) {
  const payload = `${userId}.${Date.now() + 7 * 86400_000}`;
  return `${payload}.${sign(payload, passwordHash)}`;
}

async function authenticateShop(prisma, authorization) {
  const token = /^Bearer ([\w-]+)\.(\d+)\.([\w-]{43})$/.exec(authorization || '');
  if (!token || Number(token[2]) <= Date.now()) return null;
  const profile = await prisma.profile.findUnique({ where: { id: token[1] } });
  const passwordHash = profile?.avatar_config?._authHash;
  if (!passwordHash) return null;
  const expected = sign(`${token[1]}.${token[2]}`, passwordHash);
  return crypto.timingSafeEqual(Buffer.from(token[3]), Buffer.from(expected)) ? profile : null;
}

async function getShopState(prisma, userId) {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { coins: true, wardrobeItems: { select: { item_id: true } } },
  });
  return { coins: profile.coins, ownedItemIds: profile.wardrobeItems.map(({ item_id }) => item_id) };
}

async function purchaseItem(prisma, userId, itemId) {
  const item = itemById.get(itemId);
  if (!item) return { status: 404, detail: 'Esta peça não está no catálogo.' };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.wardrobeItem.create({ data: { user_id: userId, item_id: item.id } });
      const { count } = await tx.profile.updateMany({
        where: { id: userId, coins: { gte: item.price } },
        data: { coins: { decrement: item.price } },
      });
      if (!count) throw new Error('INSUFFICIENT_COINS');
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_COINS') {
      return { status: 409, detail: 'Você não tem moedas suficientes para esta peça.' };
    }
    if (error.code !== 'P2002') throw error;
  }
  return { status: 200, ...await getShopState(prisma, userId) };
}

async function saveShopAvatar(prisma, profile, config) {
  if (!config || typeof config !== 'object') return null;
  const characterName = typeof config.characterName === 'string' ? config.characterName.trim() : '';
  if (!characterName || characterName.length > 24) return null;

  const { ownedItemIds } = await getShopState(prisma, profile.id);
  const avatar = {};
  for (const slot of Object.keys(DEFAULT_EQUIPMENT)) {
    // Older clients omit the new slots; preserve the saved equipment in that case.
    const id = (slot === 'head' || slot === 'weapon') && config[slot] === undefined
      ? profile.avatar_config[slot] ?? DEFAULT_EQUIPMENT[slot]
      : config[slot];
    if (!isAllowedEquipment(slot, id, ownedItemIds)) return null;
    avatar[slot] = id;
  }
  const choices = { race: /^(human|goblin)$/, hair: /^(hair[1-6]|none)$/, eyes: /^(eye[1-3]|none)$/ };
  for (const field of ['skinColor', 'hairColor', 'shirtColor', 'pantsColor', 'shoesColor']) {
    choices[field] = /^#[\da-f]{6}$/i;
  }
  for (const [field, pattern] of Object.entries(choices)) {
    if (typeof config[field] !== 'string' || !pattern.test(config[field])) return null;
    avatar[field] = config[field];
  }
  const eyeColor = config.eyeColor === undefined ? profile.avatar_config.eyeColor : config.eyeColor;
  if (eyeColor !== undefined) {
    if (typeof eyeColor !== 'string' || !/^#[\da-f]{6}$/i.test(eyeColor)) return null;
    avatar.eyeColor = eyeColor;
  }
  const { _authHash } = profile.avatar_config;
  const { count } = await prisma.profile.updateMany({
    where: { id: profile.id, avatar_config: { path: ['_authHash'], equals: _authHash } },
    data: { character_name: characterName, avatar_config: { ...avatar, _authHash } },
  });
  return count ? { ...avatar, characterName } : null;
}

module.exports = { issueShopToken, authenticateShop, getShopState, purchaseItem, saveShopAvatar };
