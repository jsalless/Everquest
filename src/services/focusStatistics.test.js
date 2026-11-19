const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

const source = transformSync(fs.readFileSync(require.resolve('./focusStatistics.js'), 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;

function setup(storage = new Map(), api = {}) {
  const exports = {};
  vm.runInNewContext(source, {
    exports, console,
    require: (name) => {
      if (name === '@react-native-async-storage/async-storage') return {
        __esModule: true,
        default: {
          getItem: async (key) => storage.get(key) || null,
          setItem: async (key, value) => storage.set(key, value),
        },
      };
      if (name === './focusSessionService') return api;
      throw new Error(`Dependência inesperada: ${name}`);
    },
  });
  return exports;
}

test('sessões individuais sobrevivem a reinício e gravações simultâneas não se perdem', async () => {
  const storage = new Map();
  const service = setup(storage);
  await Promise.all([
    service.recordSoloFocus(40, 'Cronômetro', false),
    service.recordSoloFocus(60, 'Temporizador', true),
  ]);
  const restarted = setup(storage);
  assert.equal((await service.loadFocusStats())[service.dateKey(new Date())].sessionsCount, 2);
  const stats = await restarted.loadFocusStats();
  const day = stats[restarted.dateKey(new Date())];
  assert.equal(day.totalSeconds, 100);
  assert.equal(day.sessionsCount, 2);
});

test('recupera todas as páginas, credita apenas pendentes e mantém cache separado por usuário', async () => {
  const storage = new Map();
  const credits = [];
  const completedAt = new Date().toISOString();
  const offset = new Date(completedAt).getTimezoneOffset();
  const creditedDate = new Date(new Date(completedAt).getTime() - offset * 60000).toISOString().slice(0, 10);
  const session = (id, credited) => ({
    id, credited, completedAt, elapsedMs: 125000, durationSeconds: 300,
    creditedDate: credited ? creditedDate : null, creditedOffset: credited ? offset : null,
  });
  const service = setup(storage, {
    fetchFocusHistory: async (_token, cursor) => cursor
      ? { sessions: [session('second', true)], nextCursor: null }
      : { sessions: [session('first', false)], nextCursor: 'first' },
    creditFocusSession: async (_token, id, offsetMinutes) => {
      credits.push({ id, offsetMinutes });
      return { credited: true, dateKey: creditedDate, offsetMinutes };
    },
  });
  const result = await service.recoverSharedFocusStats('token', 'alice');
  const key = service.dateKey(new Date(completedAt));
  assert.equal(result.stats[key].sessionsCount, 2);
  assert.equal(result.stats[key].totalSeconds, 250);
  assert.equal(credits.length, 1);
  assert.equal(credits[0].id, 'first');
  const restarted = setup(storage);
  assert.equal((await restarted.loadSharedFocusStats('alice'))[key].sessionsCount, 2);
  assert.equal(Object.keys(await restarted.loadSharedFocusStats('bob')).length, 0);
  const combined = service.mergeFocusStats({
    [key]: { sessionsCount: 1, totalSeconds: 30, sessions: [] },
  }, result.stats);
  assert.equal(combined[key].sessionsCount, 3);
  assert.equal(combined[key].totalSeconds, 280);
});

test('histórico repetido é rejeitado em vez de contar sessão duas vezes', async () => {
  const completedAt = new Date().toISOString();
  const service = setup(new Map(), {
    fetchFocusHistory: async () => ({
      sessions: [{
        id: 'same', credited: true, completedAt, elapsedMs: 1000,
        creditedDate: completedAt.slice(0, 10), creditedOffset: 0,
      }],
      nextCursor: 'same',
    }),
  });
  await assert.rejects(service.recoverSharedFocusStats('token', 'alice'), /duplicadas|página/);
});

test('tentativa após falha do cache não credita novamente uma sessão já confirmada', async () => {
  const storage = new Map();
  const realSet = storage.set.bind(storage);
  let fails = true;
  storage.set = (key, value) => {
    if (fails) throw new Error('armazenamento indisponível');
    return realSet(key, value);
  };
  let credited = false;
  let calls = 0;
  const completedAt = new Date().toISOString();
  const offsetMinutes = new Date(completedAt).getTimezoneOffset();
  const creditedDate = new Date(new Date(completedAt).getTime() - offsetMinutes * 60000).toISOString().slice(0, 10);
  const service = setup(storage, {
    fetchFocusHistory: async () => ({
      sessions: [{
        id: 'one', credited, completedAt, elapsedMs: 1000,
        creditedDate, creditedOffset: offsetMinutes,
      }],
      nextCursor: null,
    }),
    creditFocusSession: async () => {
      credited = true;
      calls += 1;
      return { credited: true, dateKey: creditedDate, offsetMinutes };
    },
  });
  await assert.rejects(service.recoverSharedFocusStats('token', 'alice'), /armazenamento/);
  fails = false;
  await service.recoverSharedFocusStats('token', 'alice');
  assert.equal(calls, 1);
});
