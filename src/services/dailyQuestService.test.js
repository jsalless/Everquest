const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('@babel/core');

test('fallback de missões não sobrescreve contadores de foco registrados pelo servidor', async () => {
  const source = transformSync(fs.readFileSync(require.resolve('./dailyQuestService.js'), 'utf8'), {
    babelrc: false,
    configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code;
  const requests = [];
  const exports = {};
  vm.runInNewContext(source, {
    exports, console, process: { env: {} }, URLSearchParams,
    require: (name) => {
      if (name === './taskService') return { loadSavedTasks: () => [] };
      if (name === './focusStatistics') return { getFocusStatsSnapshot: () => ({}) };
      throw new Error(`Dependência inesperada: ${name}`);
    },
    fetch: async (url) => {
      requests.push(url);
      if (url.includes('/daily-quests/progress')) throw new Error('servidor offline');
      return { ok: true };
    },
  });
  await exports.syncDailyActivityProgress({ id: 'alice' }, { focusSessionsDelta: 1 });
  assert.ok(requests.some((url) => url.includes('/rest/v1/daily_quests')));
  assert.equal(requests.some((url) => url.includes('/rest/v1/daily_activity_counters')), false);
});
