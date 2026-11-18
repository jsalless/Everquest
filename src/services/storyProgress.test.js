import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeStoryLevel, loadStoryProgress } from './storyProgress.js';

function memoryStorage() {
  const records = new Map();
  return {
    getItem: async (key) => records.get(key) ?? null,
    setItem: async (key, value) => { records.set(key, value); },
  };
}

test('desbloqueia as fases em ordem e mantém o progresso isolado por conta', async () => {
  const storage = memoryStorage();
  await assert.rejects(completeStoryLevel(storage, 'alice', 1), /fase anterior/);
  assert.equal(await completeStoryLevel(storage, 'alice', 0), 1);
  assert.equal(await loadStoryProgress(storage, 'alice'), 1);
  assert.equal(await loadStoryProgress(storage, 'bob'), 0);
  assert.equal(await completeStoryLevel(storage, 'alice', 1), 2);
  assert.equal(await completeStoryLevel(storage, 'alice', 0), 2);
});

test('uma falha ao salvar não libera a próxima fase', async () => {
  const storage = memoryStorage();
  storage.setItem = async () => { throw new Error('Armazenamento indisponível'); };
  await assert.rejects(completeStoryLevel(storage, 'alice', 0), /Armazenamento indisponível/);
  assert.equal(await loadStoryProgress(storage, 'alice'), 0);
});
