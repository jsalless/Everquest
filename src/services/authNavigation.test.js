const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

for (const route of ['login', 'register']) {
  for (const hasHistory of [false, true]) {
    test(`${route}: navega sem POP_TO_TOP inválido ${hasHistory ? 'com histórico' : 'na primeira tela'}`, () => {
      const routes = hasHistory ? ['/login', `/${route}`] : [`/${route}`];
      const router = {
        canDismiss: () => routes.length > 1,
        dismissAll: () => {
          assert.ok(routes.length > 1, 'POP_TO_TOP sem telas anteriores');
          routes.splice(1);
        },
        replace: (target) => { routes[routes.length - 1] = target; },
      };
      const exports = {};
      const source = fs.readFileSync(path.join(__dirname, '../app', `${route}.js`), 'utf8');
      const compiled = transformSync(source, {
        babelrc: false,
        configFile: false,
        plugins: [
          require.resolve('@babel/plugin-transform-react-jsx'),
          require.resolve('@babel/plugin-transform-modules-commonjs'),
        ],
      }).code;
      vm.runInNewContext(compiled, {
        exports,
        require: (name) => {
          if (name === 'react') return { createElement: (type, props) => ({ type, props }) };
          if (name === 'expo-router') return { router };
          if (name === '../contexts/SessionContext') {
            return { useSession: () => ({ setSession() {}, setAvatarConfig() {}, setIsFocusing() {} }) };
          }

          if (name.startsWith('../screens/')) return function Screen() {};
          throw new Error(`Dependência inesperada: ${name}`);
        },
      });
      const screen = exports.default();
      const onSuccess = route === 'login' ? screen.props.onLoginSuccess : screen.props.onRegisterSuccess;
      onSuccess({ user: { id: 'test-user' } });
      assert.deepEqual(routes, [route === 'login' ? '/' : '/onboarding']);
    });
  }
}

const authSource = transformSync(fs.readFileSync(path.join(__dirname, 'authService.js'), 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;

function openApp(storage, warn = () => {}) {
  const exports = {};
  vm.runInNewContext(authSource, {
    exports,
    process: { env: {} },
    require: (name) => {
      if (name === './sessionStorage') return storage;
      if (name === '../utils/toast') return { toast: { warn } };
      throw new Error(`Dependência inesperada: ${name}`);
    },
  });
  return exports;
}

function createStorage() {
  let saved = null;
  return {
    getItem: async () => saved,
    setItem: async (_key, value) => { saved = value; },
    removeItem: async () => { saved = null; },
  };
}

test('mantém a sessão e a etapa inicial após reabrir, sem gravar a senha', async () => {
  const storage = createStorage();
  await openApp(storage).saveSession({
    user: { id: 'alice', password: 'nao-gravar' },
    access_token: 'test-token',
    needsOnboarding: true,
    password: 'nao-gravar',
  });
  assert.doesNotMatch(await storage.getItem(), /nao-gravar|password/);
  const restored = await openApp(storage).restoreSession();
  assert.equal(restored.user.id, 'alice');
  assert.equal(restored.access_token, 'test-token');
  assert.equal(restored.needsOnboarding, true);
  await openApp(storage).saveSession({ ...restored, needsOnboarding: false });
  assert.equal((await openApp(storage).restoreSession()).needsOnboarding, undefined);
});

test('sair apaga a sessão de forma persistente e login salvo inválido não abre a conta', async () => {
  const storage = createStorage();
  await openApp(storage).saveSession({ user: { id: 'alice' } });
  const app = openApp(storage);
  await app.restoreSession();
  await app.clearSession();
  assert.equal(await openApp(storage).restoreSession(), null);
  await storage.setItem(null, '{"user":{}}');
  await assert.rejects(openApp(storage).restoreSession(), /login salvo estava inválido/);
  assert.equal(await openApp(storage).restoreSession(), null);
});

test('se o armazenamento falhar, avisa que a sessão atual não será lembrada', async () => {
  const storage = createStorage();
  storage.setItem = async () => { throw new Error('inaccessible'); };
  const warnings = [];
  const app = openApp(storage, (message) => warnings.push(message));
  await app.saveSession({ user: { id: 'alice' } });
  assert.match(warnings[0], /não foi possível lembrar/i);
  assert.equal((await app.restoreSession()).user.id, 'alice');
  assert.equal(await openApp(storage).restoreSession(), null);
});
