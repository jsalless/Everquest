const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

function loadModule(filename, requireDependency) {
  const source = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  const compiled = transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [
      require.resolve('@babel/plugin-transform-react-jsx'),
      require.resolve('@babel/plugin-transform-modules-commonjs'),
    ],
  }).code;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: requireDependency });
  return exports;
}

const assets = loadModule('newAvatarSvgAssets.js', () => {
  throw new Error('Dependência inesperada nos SVGs');
});
const legacyAssets = new Proxy({}, { get: () => '<svg></svg>' });
const avatar = loadModule('CharacterAvatar.js', (name) => {
  if (name === 'react') return { createElement: (type, props) => ({ type, props }), useMemo: (fn) => fn() };
  if (name === 'react-native-svg') return { SvgXml: 'SvgXml' };
  if (name === '../services/shopService') return { catalog: [] };
  if (name === '../services/avatarEquipment') return { DEFAULT_EQUIPMENT: { head: 'none', shirt: 'shirt1', pants: 'leg1', shoes: 'shoe1', weapon: 'none' }, STARTER_EQUIPMENT: [] };
  if (name === './shopGarments') return { getGarmentSvg: () => '' };
  if (name === './characterSvgAssets') return legacyAssets;
  if (name === './newAvatarSvgAssets') return assets;
  throw new Error(`Dependência inesperada: ${name}`);
});

test('cor dos olhos altera as íris sem alterar os brilhos ou o fundo de cada raça', () => {
  for (const [race, background] of [['human', 'white'], ['goblin', '#FFEF64']]) {
    const xml = avatar.default({ config: { race, eyeColor: '#2E7D32' } }).props.xml;
    assert.equal((xml.match(/fill="#2E7D32"/g) || []).length, 2);
    assert.equal((xml.match(new RegExp(`<path\\b[^>]*fill="${background}"`, 'g')) || []).length >= 2, true);
    assert.equal((xml.match(/<circle\b[^>]*fill="white"/g) || []).length, 2);
    assert.doesNotMatch(xml, /#33C0E2/);
  }
  const defaultXml = avatar.default({ config: {} }).props.xml;
  assert.equal((defaultXml.match(/fill="#33C0E2"/g) || []).length, 2);
});

test('goblin usa seu próprio corpo e humano mantém o corpo com cor personalizável', () => {
  const goblinXml = avatar.default({ config: { race: 'goblin', head: 'helmet2' } }).props.xml;
  const humanXml = avatar.default({ config: { race: 'human', skinColor: '#B86B4B' } }).props.xml;
  const goblinEar = 'M230.797 87.7951C248.842 73.1432';
  assert.ok(goblinXml.includes(goblinEar));
  assert.ok(!humanXml.includes(goblinEar));
  assert.ok(humanXml.includes('fill="#B86B4B"'));
  assert.ok(goblinXml.includes('fill="#91D56B"'));
});
