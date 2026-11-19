const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

const source = transformSync(fs.readFileSync(path.join(__dirname, 'focusSessionService.js'), 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;

function service(fetch) {
  const exports = {};
  vm.runInNewContext(source, {
    exports, fetch, AbortController, setTimeout, clearTimeout, process: { env: {} },
  });
  return exports;
}

test('relógio compartilhado acompanha execução, pausa e limite do temporizador', () => {
  const { sharedFocusSeconds } = service(() => {});
  const base = { elapsedMs: 12000, receivedAt: 100000, durationSeconds: 60 };
  assert.equal(sharedFocusSeconds({ ...base, status: 'running' }, 105000), 43);
  assert.equal(sharedFocusSeconds({ ...base, status: 'paused' }, 150000), 48);
  assert.equal(sharedFocusSeconds({ ...base, status: 'running' }, 200000), 0);
  assert.equal(sharedFocusSeconds({ ...base, status: 'running', durationSeconds: 0 }, 105000), 17);
});

test('convite envia duração e autenticação, e exige confirmação do servidor', async () => {
  let request;
  const api = service(async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({}) };
  });
  await assert.rejects(api.inviteFocusFriend('token', 'bob', 300), /não confirmou/);
  assert.match(request.url, /\/focus-sessions$/);
  assert.equal(request.options.headers.Authorization, 'Bearer token');
  assert.equal(JSON.parse(request.options.body).durationSeconds, 300);
});

test('respostas sem sessão e indisponibilidade não são apresentadas como sucesso', async () => {
  await assert.rejects(service(async () => ({
    ok: true, json: async () => ({}),
  })).fetchFocusSession('token'), /não informou/);
  await assert.rejects(service(async () => {
    throw new Error('offline');
  }).fetchFocusSession('token'), /conectar ao servidor/);
});
