const assert = require('node:assert/strict');
const { test } = require('node:test');
const { elapsedMilliseconds, effectiveStatus, transition } = require('./focusSessionState');

const now = Date.parse('2026-01-01T12:00:00Z');
const pending = {
  host_id: 'host',
  guest_id: 'guest',
  status: 'pending',
  duration_seconds: 300,
  elapsed_ms: 0,
  running_since: null,
  expires_at: new Date(now + 60000),
};

test('apenas o convidado pode aceitar um convite ainda válido', () => {
  assert.equal(transition(pending, 'host', 'accept', now), null);
  assert.equal(transition(pending, 'other', 'accept', now), null);
  assert.equal(transition(pending, 'guest', 'accept', now).status, 'running');
  assert.equal(transition(pending, 'guest', 'accept', now + 60000), null);
  assert.equal(effectiveStatus(pending, now + 60000), 'expired');
});

test('pausa e retomada são exclusivas do anfitrião e preservam o tempo', () => {
  const running = { ...pending, ...transition(pending, 'guest', 'accept', now) };
  assert.equal(transition(running, 'guest', 'pause', now + 15000), null);
  const paused = { ...running, ...transition(running, 'host', 'pause', now + 15000) };
  assert.equal(elapsedMilliseconds(paused, now + 30000), 15000);
  const resumed = { ...paused, ...transition(paused, 'host', 'resume', now + 30000) };
  assert.equal(elapsedMilliseconds(resumed, now + 40000), 25000);
});

test('temporizador concluído não pode ser pausado e limita o tempo focado', () => {
  const running = { ...pending, ...transition(pending, 'guest', 'accept', now) };
  assert.equal(effectiveStatus(running, now + 310000), 'completed');
  assert.equal(elapsedMilliseconds(running, now + 310000), 300000);
  assert.equal(transition(running, 'host', 'pause', now + 310000), null);
});

test('cronômetro progressivo continua sem limite', () => {
  const running = {
    ...pending, duration_seconds: 0,
    ...transition(pending, 'guest', 'accept', now),
  };
  assert.equal(elapsedMilliseconds(running, now + 600000), 600000);
  assert.equal(effectiveStatus(running, now + 600000), 'running');
});

test('convites podem ser recusados pelo convidado ou cancelados pelo anfitrião', () => {
  assert.equal(transition(pending, 'host', 'decline', now), null);
  assert.equal(transition(pending, 'guest', 'cancel', now), null);
  assert.equal(transition(pending, 'guest', 'decline', now).status, 'declined');
  assert.equal(transition(pending, 'host', 'cancel', now).status, 'cancelled');
});

test('somente o anfitrião pode encerrar uma sessão em andamento', () => {
  const running = { ...pending, ...transition(pending, 'guest', 'accept', now) };
  assert.equal(transition(running, 'guest', 'stop', now + 10000), null);
  assert.deepEqual(transition(running, 'host', 'stop', now + 10000), {
    status: 'completed', elapsed_ms: 10000, running_since: null, completed_at: new Date(now + 10000),
  });
});
