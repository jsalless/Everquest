const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

const source = transformSync(fs.readFileSync(require.resolve('./focusPush.native.js'), 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;

function setup({ granted = true, environment = 'standalone', getToken, registerDevice, storage = new Map() } = {}) {
  const registered = [];
  const removed = [];
  const tokenOptions = [];
  let tokenListener;
  let responseListener;
  const notifications = {
    __esModule: true,
    AndroidImportance: { HIGH: 4 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ granted, canAskAgain: false }),
    getExpoPushTokenAsync: async (options) => {
      tokenOptions.push(options);
      if (getToken) return getToken();
      return { data: options.devicePushToken ? 'ExpoPushToken[new]' : 'ExpoPushToken[old]' };
    },
    addPushTokenListener: (listener) => { tokenListener = listener; return { remove() {} }; },
    addNotificationResponseReceivedListener: (listener) => { responseListener = listener; return { remove() {} }; },
    getLastNotificationResponse: () => null,
    clearLastNotificationResponse: () => {},
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    console,
    require: (name) => {
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === 'expo-constants') return {
        __esModule: true,
        default: { executionEnvironment: environment, expoConfig: { extra: { eas: { projectId: 'project' } } } },
        ExecutionEnvironment: { StoreClient: 'storeClient' },
      };
      if (name === 'expo-notifications') return notifications;
      if (name === './focusAlerts') return {};
      if (name === './sessionStorage') return {
        getItem: async (key) => storage.get(key) || null,
        setItem: async (key, value) => storage.set(key, value),
        removeItem: async (key) => storage.delete(key),
      };
      if (name === './focusSessionService') return {
        registerFocusDevice: async (auth, token) => {
          registered.push({ auth, token });
          if (registerDevice) await registerDevice();
        },
        unregisterFocusDevice: async (auth, token) => removed.push({ auth, token }),
      };
      throw new Error(`Dependência inesperada: ${name}`);
    },
  });
  return {
    service: exports, registered, removed, tokenOptions,
    emitToken: (token) => tokenListener(token),
    emitResponse: (response) => responseListener(response),
  };
}

test('registra token, acompanha rotação sem obter novamente o token nativo e remove ao sair', async () => {
  const state = setup();
  await state.service.registerFocusPush('auth');
  state.service.subscribeFocusPushToken('auth', (error) => { throw error; });
  const nativeToken = { type: 'android', data: 'native-token' };
  state.emitToken(nativeToken);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.tokenOptions[1].devicePushToken, nativeToken);
  assert.equal(state.registered[1].token, 'ExpoPushToken[new]');
  assert.equal(state.removed[0].token, 'ExpoPushToken[old]');
  await state.service.unregisterFocusPush('auth');
  assert.equal(state.removed[1].token, 'ExpoPushToken[new]');
});

test('informa falta de permissão ou necessidade de build e só abre convites de foco', async () => {
  await assert.rejects(setup({ granted: false }).service.registerFocusPush('auth'), /Permita notificações/);
  await assert.rejects(setup({ environment: 'storeClient' }).service.registerFocusPush('auth'), /build de desenvolvimento/);
  const state = setup();
  let opened = 0;
  state.service.subscribeFocusPush(() => { opened += 1; });
  state.emitResponse({ notification: { request: { content: { data: { type: 'other' } } } } });
  state.emitResponse({ notification: { request: { content: { data: { type: 'focus-invite' } } } } });
  assert.equal(opened, 1);
});

test('sair não espera token pendente nem registra dispositivo depois do logout', async () => {
  let release;
  const state = setup({ getToken: () => new Promise((resolve) => { release = resolve; }) });
  const pending = state.service.registerFocusPush('auth');
  await new Promise((resolve) => setImmediate(resolve));
  await state.service.unregisterFocusPush('auth');
  release({ data: 'ExpoPushToken[old]' });
  await pending;
  assert.equal(state.registered.length, 0);
});

test('registro que termina após logout remove o dispositivo com a sessão anterior', async () => {
  let release;
  const state = setup({ registerDevice: () => new Promise((resolve) => { release = resolve; }) });
  const pending = state.service.registerFocusPush('auth');
  await new Promise((resolve) => setImmediate(resolve));
  await state.service.unregisterFocusPush('auth');
  release();
  await pending;
  assert.equal(state.removed[0].auth, 'auth');
  assert.equal(state.removed[0].token, 'ExpoPushToken[old]');
});

test('logout remove o token salvo mesmo após reiniciar o aplicativo', async () => {
  const storage = new Map();
  await setup({ storage }).service.registerFocusPush('auth');
  const restarted = setup({ storage, granted: false });
  await restarted.service.unregisterFocusPush('auth');
  assert.equal(restarted.removed[0].token, 'ExpoPushToken[old]');
  assert.equal(storage.size, 0);
});
