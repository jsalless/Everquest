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
    completedAt: row.completed_at || (row.status === 'completed' ? row.updated_at : null),
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
          ...(status === 'completed' ? {
            completed_at: new Date(new Date(row.running_since).getTime() +
              row.duration_seconds * 1000 - row.elapsed_ms),
          } : {}),
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

async function getFocusHistory(prisma, userId, cursor) {
  if (cursor && !UUID.test(cursor)) return null;
  return prisma.$transaction(async (tx) => {
    await lockParticipants(tx, [userId]);
    const now = Date.now();
    await settleSessions(tx, [userId], now);
    const rows = await tx.focusSession.findMany({
      where: {
        status: 'completed',
        OR: [{ host_id: userId }, { guest_id: userId }],
      },
      include: { ...SESSION_INCLUDE, credits: { where: { user_id: userId } } },
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: 101,
    });
    const page = rows.slice(0, 100);
    return {
      sessions: page.map((row) => ({
        ...serializeSession(row, now),
        credited: row.credits.length > 0,
        creditedDate: row.credits[0]?.date_key || null,
        creditedOffset: row.credits[0]?.timezone_offset_minutes ?? null,
      })),
      nextCursor: rows.length > 100 ? page[page.length - 1].id : null,
    };
  });
}

async function creditFocusSession(prisma, userId, sessionId, offsetMinutes) {
  if (!UUID.test(sessionId) || !Number.isInteger(offsetMinutes) ||
      offsetMinutes < -840 || offsetMinutes > 720) {
    return { status: 400, detail: 'Sessão ou fuso horário inválido.' };
  }
  return prisma.$transaction(async (tx) => {
    await lockParticipants(tx, [userId]);
    const now = Date.now();
    await settleSessions(tx, [userId], now);
    const row = await tx.focusSession.findFirst({
      where: { id: sessionId, status: 'completed', OR: [{ host_id: userId }, { guest_id: userId }] },
    });
    if (!row) return { status: 404, detail: 'Sessão concluída não encontrada.' };
    const completedAt = row.completed_at || row.updated_at;
    const completed = new Date(completedAt).getTime();
    if (!Number.isFinite(completed)) {
      return { status: 400, detail: 'Data de conclusão inválida.' };
    }
    const dateKey = new Date(completed - offsetMinutes * 60000).toISOString().slice(0, 10);
    const seconds = Math.floor(row.elapsed_ms / 1000);
    if (seconds <= 0) return { status: 200, credited: false };
    const inserted = await tx.focusSessionCredit.createMany({
      data: [{
        session_id: sessionId, user_id: userId, date_key: dateKey,
        timezone_offset_minutes: offsetMinutes,
      }],
      skipDuplicates: true,
    });
    if (inserted.count) {
      await tx.dailyActivityCounter.upsert({
        where: { user_id_activity_date: { user_id: userId, activity_date: dateKey } },
        create: {
          user_id: userId, activity_date: dateKey, focus_sessions: 1, focus_seconds: seconds,
        },
        update: { focus_sessions: { increment: 1 }, focus_seconds: { increment: seconds } },
      });
      return { status: 200, credited: true, dateKey, offsetMinutes };
    }
    const existing = await tx.focusSessionCredit.findUnique({
      where: { session_id_user_id: { session_id: sessionId, user_id: userId } },
    });
    return {
      status: 200, credited: true, dateKey: existing.date_key,
      offsetMinutes: existing.timezone_offset_minutes,
    };
  });
}

module.exports = {
  createFocusSession, getFocusSession, changeFocusSession, getFocusHistory, creditFocusSession,
};
