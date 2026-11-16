const assert = require('node:assert/strict');
const { test } = require('node:test');

let moduleId = 0;

async function loadFreshService() {
  return import(`./taskService.js?test=${moduleId++}`);
}

function useStorage(t, initialTasks) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored = initialTasks === undefined ? null : JSON.stringify(initialTasks);
  const writes = [];
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => stored,
      setItem: (key, value) => {
        writes.push(key);
        stored = value;
      },
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });
  return { writes, read: () => JSON.parse(stored) };
}

test('armazenamento de tarefas sem exemplos automáticos', async (t) => {
  await t.test('primeiro acesso começa vazio e não grava exemplos', async (t) => {
    const storage = useStorage(t);
    const service = await loadFreshService();
    assert.deepEqual(service.loadSavedTasks(), []);
    assert.deepEqual(storage.writes, []);
  });

  await t.test('remove os quatro exemplos antigos sem alterar tarefas reais', async (t) => {
    const manualTasks = [
      { id: 'task-123', title: 'Estudar', completed: true, createdByUser: true },
      { id: 'legacy-task', title: 'Planejar a semana', completed: false },
    ];
    const storage = useStorage(t, [
      { id: 'task-mock-1', completed: false },
      manualTasks[0],
      { id: 'task-mock-2', completed: false },
      { id: 'task-mock-3', completed: false },
      manualTasks[1],
      { id: 'task-mock-4', completed: true },
    ]);
    const service = await loadFreshService();
    assert.deepEqual(service.loadSavedTasks(), manualTasks);
    assert.deepEqual(storage.read(), manualTasks);
    assert.equal(storage.writes.length, 1);
    assert.deepEqual((await loadFreshService()).loadSavedTasks(), manualTasks);
  });

  await t.test('salvar e esvaziar a lista não recria exemplos ao reabrir', async (t) => {
    useStorage(t, []);
    const service = await loadFreshService();
    const task = { id: 'task-456', title: 'Minha tarefa', completed: false };
    service.saveTasksList([task]);
    const reopened = await loadFreshService();
    assert.deepEqual(reopened.loadSavedTasks(), [task]);
    reopened.saveTasksList([]);
    assert.deepEqual((await loadFreshService()).loadSavedTasks(), []);
  });

  await t.test('sem armazenamento local só mantém tarefas criadas em memória', async (t) => {
    useStorage(t);
    delete globalThis.localStorage;
    const service = await loadFreshService();
    assert.deepEqual(service.loadSavedTasks(), []);
    const task = { id: 'task-789', title: 'Tarefa no celular' };
    service.saveTasksList([task]);
    assert.deepEqual(service.loadSavedTasks(), [task]);
    service.saveTasksList([]);
    assert.deepEqual(service.loadSavedTasks(), []);
  });
});
