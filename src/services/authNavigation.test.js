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
