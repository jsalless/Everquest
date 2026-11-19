const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

const source = transformSync(fs.readFileSync(path.join(__dirname, 'friendService.js'), 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;

function service(fetch) {
  const exports = {};
  vm.runInNewContext(source, {
    exports, fetch, URLSearchParams, console: { error() {} }, process: { env: {} },
  });
  return exports;
}

test('amizades exigem token e enviam a sessão assinada ao servidor', async () => {
  const requests = [];
  const api = service(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ friends: [], total: 0 }) };
  });
  await assert.rejects(api.fetchConfirmedFriends(null), /conta do servidor/);
  await api.fetchConfirmedFriends('signed-token');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer signed-token');
});

test('falhas não retornam lista local nem indicam sucesso falso', async () => {
  const api = service(async () => { throw new Error('offline'); });
  await assert.rejects(api.fetchUserFriends('signed-token'), /conectar ao servidor/);
});

test('remoção informa quando o amigo foi removido mas a atualização falhou', async () => {
  let calls = 0;
  const api = service(async () => {
    calls += 1;
    if (calls === 1) return { ok: true, json: async () => ({}) };
    throw new Error('offline');
  });
  await assert.rejects(api.removeFriendRelationship('signed-token', 'bob'), /Amigo removido, mas/);
});

test('sincronização de perfil informa quando servidor e Supabase recusam a gravação', async () => {
  const api = service(async () => ({ ok: false, status: 403 }));
  await assert.rejects(
    api.syncUserProfileToBackend({ user: { id: 'alice' } }),
    /Não foi possível sincronizar/
  );
});
