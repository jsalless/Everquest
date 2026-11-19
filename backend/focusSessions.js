const {
  ACTIVE_STATUSES,
  elapsedMilliseconds,
  effectiveStatus,
  transition,
} = require('./focusSessionState');

const SESSION_INCLUDE = {
  host: { select: { character_name: true } },
  guest: { select: { character_name: true } },
};
const INVITATION_LIFETIME_MS = 15 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serializeSession(row, now) {
  return {
    id: row.id,
    hostId: row.host_id,
    guestId: row.guest_id,
    hostName: row.host.character_name,
    guestName: row.guest.character_name,
    status: effectiveStatus(row, now),
    durationSeconds: row.duration_seconds,
    elapsedMs: elapsedMilliseconds(row, now),
    serverTime: now,
    expiresAt: row.expires_at,
  };
}

async function lockParticipants(tx, ids) {
  for (const id of [...new Set(ids)].sort()) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`focus:${id}`}))::text`;
  }
}

async function settleSessions(tx, ids, now) {
  const rows = await tx.focusSession.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      OR: [{ host_id: { in: ids } }, { guest_id: { in: ids } }],
    },
  });
  for (const row of rows) {
    const status = effectiveStatus(row, now);
    if (status !== row.status) {
      await tx.focusSession.update({
        where: { id: row.id },
        data: {
          status,
          elapsed_ms: elapsedMilliseconds(row, now),
          running_since: null,
        },
      });
    }
  }
}

async function createFocusSession(prisma, hostId, { friendId, durationSeconds }) {
  if (typeof friendId !== 'string' || !friendId.trim() || friendId.trim() === hostId ||
      !Number.isInteger(durationSeconds) || durationSeconds < 0 ||
      durationSeconds > 7200 || durationSeconds % 300 !== 0) {
    return { status: 400, detail: 'Amigo ou duração de foco inválida.' };
  }
  const guestId = friendId.trim();
  return prisma.$transaction(async (tx) => {
    await lockParticipants(tx, [hostId, guestId]);
    const now = Date.now();
    await settleSessions(tx, [hostId, guestId], now);
    const friendship = await tx.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { user_id: hostId, friend_id: guestId },
          { user_id: guestId, friend_id: hostId },
        ],
      },
    });
    if (!friendship) {
      return { status: 403, detail: 'Você só pode convidar amigos confirmados.' };
    }
    const busy = await tx.focusSession.findFirst({
      where: {
        status: { in: ACTIVE_STATUSES },
        OR: [
          { host_id: { in: [hostId, guestId] } },
          { guest_id: { in: [hostId, guestId] } },
        ],
      },
    });
    if (busy) {
      return { status: 409, detail: 'Você ou seu amigo já possui uma sessão ou convite em andamento.' };
    }
    const row = await tx.focusSession.create({
      data: {
        host_id: hostId,
        guest_id: guestId,
        duration_seconds: durationSeconds,
        expires_at: new Date(now + INVITATION_LIFETIME_MS),
      },
      include: SESSION_INCLUDE,
    });
    return { status: 201, session: serializeSession(row, now) };
  });
}

async function getFocusSession(prisma, userId, sessionId) {
  if (sessionId && !UUID.test(sessionId)) return null;
  return prisma.$transaction(async (tx) => {
    await lockParticipants(tx, [userId]);
    const now = Date.now();
    await settleSessions(tx, [userId], now);
    const row = await tx.focusSession.findFirst({
      where: {
        ...(sessionId ? { id: sessionId } : { status: { in: ACTIVE_STATUSES } }),
        OR: [{ host_id: userId }, { guest_id: userId }],
      },
      include: SESSION_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return row ? serializeSession(row, now) : null;
  });
}

async function changeFocusSession(prisma, userId, sessionId, action) {
  if (!UUID.test(sessionId)) return { status: 404, detail: 'Sessão não encontrada.' };
  const initial = await prisma.focusSession.findFirst({
    where: { id: sessionId, OR: [{ host_id: userId }, { guest_id: userId }] },
  });
  if (!initial) return { status: 404, detail: 'Sessão não encontrada.' };

  return prisma.$transaction(async (tx) => {
    await lockParticipants(tx, [initial.host_id, initial.guest_id]);
    const now = Date.now();
    await settleSessions(tx, [initial.host_id, initial.guest_id], now);
    const row = await tx.focusSession.findUnique({
      where: { id: sessionId }, include: SESSION_INCLUDE,
    });
    if (!row) return { status: 404, detail: 'Sessão não encontrada.' };
    const changes = transition(row, userId, action, now);
    if (!changes) {
      return {
        status: 409,
        detail: 'Essa ação não está disponível nesta sessão.',
        session: serializeSession(row, now),
      };
    }
    const updated = await tx.focusSession.update({
      where: { id: sessionId }, data: changes, include: SESSION_INCLUDE,
    });
    return { status: 200, session: serializeSession(updated, now) };
  });
}

module.exports = { createFocusSession, getFocusSession, changeFocusSession };
