const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

function setup(granted = true, { platform = 'android', iosStatus } = {}) {
  const channels = [];
  const scheduled = [];
  const canceled = [];
  let handler;
  const notifications = {
    AndroidImportance: { HIGH: 6 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: (value) => { handler = value; },
    getPermissionsAsync: async () => ({
      granted,
      canAskAgain: false,
      ...(iosStatus === undefined ? {} : { ios: { status: iosStatus } }),
    }),
    setNotificationChannelAsync: async (id, value) => channels.push({ id, ...value }),
    scheduleNotificationAsync: async (value) => { scheduled.push(value); return value.identifier; },
    cancelScheduledNotificationAsync: async (id) => canceled.push(id),
    getAllScheduledNotificationsAsync: async () => [
      { identifier: 'focus-alert', content: { data: { type: 'everquest-focus' } } },
      { identifier: 'other-alert', content: { data: { type: 'other' } } },
    ],
  };
  const source = fs.readFileSync(require.resolve('./focusAlerts.native.js'), 'utf8');
  const compiled = transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-notifications') return notifications;
      if (name === 'expo-haptics') return {};
      throw new Error(`Unexpected dependency: ${name}`);
    },
    Date, Math,
  });
  return { service: exports, channels, scheduled, canceled, getHandler: () => handler };
}

test('alertas nativos usam prazo absoluto e canais distintos para som/vibração', async () => {
  const { service, channels, scheduled, getHandler } = setup();
  const deadline = Date.now() + 300000;
  const quiet = { focusNotifications: true, soundEnabled: false, vibrationEnabled: false };
  await service.scheduleFocusAlert(deadline, quiet);
  await service.scheduleFocusAlert(deadline, { ...quiet, soundEnabled: true, vibrationEnabled: true });
  assert.notEqual(channels[0].id, channels[1].id);
  assert.equal(channels[0].enableVibrate, false);
  assert.equal(channels[0].sound, null);
  assert.equal(channels[1].enableVibrate, true);
  assert.equal(channels[1].sound, 'default');
  assert.equal(scheduled[0].trigger.date.getTime(), deadline);
  assert.equal(scheduled[0].content.sound, false);
  assert.equal((await getHandler().handleNotification({ request: { content: { sound: null } } })).shouldPlaySound, false);
});

test('permissão negada não agenda alertas; sair cancela somente alertas de foco', async () => {
  const { service, scheduled, canceled } = setup(false);
  assert.equal(await service.requestFocusPermission({ soundEnabled: true, vibrationEnabled: true }), false);
  await assert.rejects(service.scheduleFocusAlert(Date.now() + 5000, { focusNotifications: true }), /bloqueadas/);
  assert.equal(scheduled.length, 0);
  await service.cancelAllFocusAlerts();
  assert.deepEqual(canceled, ['focus-alert']);
});

test('iOS agenda alertas com autorização completa ou provisória sem criar canais Android', async () => {
  for (const granted of [true, false]) {
    const { service, channels, scheduled } = setup(granted, { platform: 'ios', iosStatus: granted ? 2 : 3 });
    const preferences = { focusNotifications: true, soundEnabled: true, vibrationEnabled: true };
    const deadline = Date.now() + 300000;
    assert.equal(await service.requestFocusPermission(preferences), true);
    await service.scheduleFocusAlert(deadline, preferences);
    assert.equal(channels.length, 0);
    assert.equal(scheduled.length, 1);
    assert.equal(scheduled[0].trigger.date.getTime(), deadline);
    assert.equal(scheduled[0].content.sound, 'default');
  }
});
