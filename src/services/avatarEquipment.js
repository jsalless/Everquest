const catalog = require('./shopCatalog.json');

const DEFAULT_EQUIPMENT = Object.freeze({
  head: 'none',
  shirt: 'shirt1',
  pants: 'leg1',
  shoes: 'shoe1',
  weapon: 'none',
});

const STARTER_EQUIPMENT = [
  { id: 'head-traveler', slot: 'head', name: 'Chapéu de Viajante', color: '#573B83', accent: '#F9D58C', stats: { armor: 1 } },
  { id: 'weapon-wood', slot: 'weapon', name: 'Espada de Madeira', color: '#AF7748', accent: '#FFD39F', stats: { damage: 3 } },
];

const equipmentById = new Map([...STARTER_EQUIPMENT, ...catalog].map((item) => [item.id, item]));
const starterIds = new Set(STARTER_EQUIPMENT.map(({ id }) => id));
const BASE_STATS = { damage: 5, health: 100, armor: 0, magic: 0 };
const AVATAR_STAT_LABELS = [
  { id: 'damage', label: 'Dano', color: '#FFD18C' },
  { id: 'health', label: 'Vida', color: '#FFAFC1' },
  { id: 'armor', label: 'Armadura', color: '#A8D9FF' },
  { id: 'magic', label: 'Magia', color: '#DFB4FF' },
];

function formatEquipmentBonuses(stats) {
  return AVATAR_STAT_LABELS
    .filter(({ id }) => stats?.[id])
    .map(({ id, label }) => `${stats[id] > 0 ? '+' : ''}${stats[id]} ${label.toLowerCase()}`);
}

function isAllowedEquipment(slot, id, ownedItemIds) {
  if (!Object.hasOwn(DEFAULT_EQUIPMENT, slot)) return false;
  if (id === DEFAULT_EQUIPMENT[slot] || id === 'none') return true;
  if (slot === 'head' && (id === 'helmet2' || id === 'helmet3')) return true;
  if ((slot === 'shirt' && id === 'shirt2') || (slot === 'pants' && id === 'leg2')) return true;
  return equipmentById.get(id)?.slot === slot && (starterIds.has(id) || ownedItemIds.includes(id));
}

function getAvatarStats(config) {
  const totals = { ...BASE_STATS };
  for (const slot of Object.keys(DEFAULT_EQUIPMENT)) {
    const item = equipmentById.get(config?.[slot]);
    if (item?.slot !== slot || !item.stats) continue;
    for (const stat of Object.keys(totals)) totals[stat] += item.stats[stat] ?? 0;
  }
  return totals;
}

module.exports = { AVATAR_STAT_LABELS, DEFAULT_EQUIPMENT, STARTER_EQUIPMENT, formatEquipmentBonuses, getAvatarStats, isAllowedEquipment };
