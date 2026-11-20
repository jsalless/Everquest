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

test('as três expressões renderizam sobrancelhas na cor do cabelo sem mudar as íris ou os brilhos', () => {
  for (const [eyes, name] of [['eye1', 'eyes'], ['eye2', 'eyes2'], ['eye3', 'eyes3']]) {
    const art = fs.readFileSync(path.join(__dirname, `../../assets/avatar/${name}.svg`), 'utf8');
    assert.ok(avatar.EYES_OPTIONS.some(({ id }) => id === eyes));
    const outline = art.match(/<path d="([^"]+)" fill="black"/)[1];
    for (const avatarStyle of ['classic', 'new']) {
      for (const [race, background] of [['human', 'white'], ['goblin', '#FFEF64']]) {
        const xml = avatar.default({
          config: { avatarStyle, race, eyes, hair: 'none', eyeColor: '#2E7D32', hairColor: '#7153FD' },
        }).props.xml;
        const eyeLayer = xml.slice(xml.indexOf(`<path d="${outline}"`)).split('</g>')[0];
        assert.ok(eyeLayer.startsWith(`<path d="${outline}"`));
        assert.equal((eyeLayer.match(/fill="#7153FD"/g) || []).length, 2);
        assert.equal((eyeLayer.match(/fill="#2E7D32"/g) || []).length, 4);
        assert.equal((eyeLayer.match(new RegExp(`<path\\b[^>]*fill="${background}"`, 'g')) || []).length, 2);
        assert.equal((eyeLayer.match(/<circle\b[^>]*fill="white"/g) || []).length, 2);
      }
    }
    assert.ok(!avatar.default({ config: { eyes: 'none' } }).props.xml.includes(outline));
  }
  const defaultXml = avatar.default({ config: {} }).props.xml;
  assert.equal((defaultXml.match(/fill="#33C0E2"/g) || []).length, 4);
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

test('cabelo curto, túnica e calça novos aparecem juntos e mantêm as cores escolhidas', () => {
  const config = {
    hair: 'hair2', shirt: 'shirt2', pants: 'leg2',
    hairColor: '#7153FD', shirtColor: '#B71C1C', pantsColor: '#234930',
    skinColor: '#B86B4B',
  };
  const saved = avatar.saveAvatarConfig(config);
  assert.equal(avatar.loadSavedAvatar().hair, 'hair2');
  for (const avatarStyle of ['classic', 'new']) {
    for (const race of ['human', 'goblin']) {
      const xml = avatar.default({ config: { ...saved, avatarStyle, race } }).props.xml;
      assert.match(xml, /<path d="M121\.232 4\.91284[^"]+" fill="#7153FD"/);
      assert.match(xml, /<path d="M101\.212 8\.77794[^"]+" fill="#B71C1C"/);
      assert.match(xml, /<path d="M54\.1185 4\.43178[^"]+" fill="#234930"/);
      const skin = race === 'goblin' ? '#91D56B' : config.skinColor;
      assert.match(xml, new RegExp(`<path d="M126\\.971 5\\.74397[^"]+" fill="${skin}"`));
    }
  }
});

test('helmet3 aparece em ambas as raças e no avatar clássico sem alterar os olhos', () => {
  const asset = fs.readFileSync(path.join(__dirname, '../../assets/avatar/helmet3.svg'), 'utf8').trim();
  assert.equal(assets.HELMET3_SVG.trim(), asset);
  for (const race of ['human', 'goblin']) {
    for (const avatarStyle of ['classic', 'new']) {
      const xml = avatar.default({ config: { race, avatarStyle, head: 'helmet3' } }).props.xml;
      assert.match(xml, /M112\.116 0\.234409/);
      assert.equal((xml.match(/fill="#33C0E2"/g) || []).length, 4);
    }
  }
  assert.doesNotMatch(avatar.default({ config: { head: 'helmet2' } }).props.xml, /M112\.116 0\.234409/);
});
