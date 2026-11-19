const ACTIVE_STATUSES = ['pending', 'running', 'paused'];

function elapsedMilliseconds(session, now = Date.now()) {
  const elapsed = session.elapsed_ms +
    (session.status === 'running' && session.running_since
      ? Math.max(0, now - new Date(session.running_since).getTime())
      : 0);
  return session.duration_seconds > 0
    ? Math.min(elapsed, session.duration_seconds * 1000)
    : elapsed;
}

function effectiveStatus(session, now = Date.now()) {
  if (session.status === 'pending' && now >= new Date(session.expires_at).getTime()) {
    return 'expired';
  }
  if (session.status === 'running' && session.duration_seconds > 0 &&
      elapsedMilliseconds(session, now) >= session.duration_seconds * 1000) {
    return 'completed';
  }
  return session.status;
}

function transition(session, userId, action, now = Date.now()) {
  const status = effectiveStatus(session, now);
  const isHost = session.host_id === userId;
  const isGuest = session.guest_id === userId;
  if (!isHost && !isGuest) return null;

  if (action === 'accept' && isGuest && status === 'pending') {
    return { status: 'running', running_since: new Date(now) };
  }
  if (action === 'decline' && isGuest && status === 'pending') {
    return { status: 'declined' };
  }
  if (action === 'cancel' && isHost && status === 'pending') {
    return { status: 'cancelled' };
  }
  if (action === 'pause' && isHost && status === 'running') {
    return { status: 'paused', elapsed_ms: elapsedMilliseconds(session, now), running_since: null };
  }
  if (action === 'resume' && isHost && status === 'paused') {
    return { status: 'running', running_since: new Date(now) };
  }
  if (action === 'stop' && isHost && (status === 'running' || status === 'paused')) {
    return { status: 'completed', elapsed_ms: elapsedMilliseconds(session, now), running_since: null };
  }
  return null;
}

module.exports = { ACTIVE_STATUSES, elapsedMilliseconds, effectiveStatus, transition };
