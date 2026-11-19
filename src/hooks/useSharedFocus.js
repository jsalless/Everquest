import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  fetchFocusSession,
  inviteFocusFriend,
  sharedFocusSeconds,
  updateFocusSession,
} from '../services/focusSessionService';

export default function useSharedFocus(token, onTerminal) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sessionRef = useRef(null);
  const revision = useRef(0);
  const lastApplied = useRef(0);
  const mutationBusy = useRef(false);
  const terminalRef = useRef(onTerminal);

  useEffect(() => {
    terminalRef.current = onTerminal;
  }, [onTerminal]);

  const apply = useCallback((next, version) => {
    if (version < lastApplied.current) return;
    lastApplied.current = version;
    if (next && ['completed', 'declined', 'cancelled', 'expired'].includes(next.status)) {
      terminalRef.current(next);
      next = null;
    }
    sessionRef.current = next;
    setSession(next);
    setError('');
  }, []);

  const refresh = useCallback(async (signal) => {
    const version = ++revision.current;
    const next = await fetchFocusSession(token, sessionRef.current?.id, signal);
    if (!signal?.aborted) apply(next, version);
  }, [token, apply]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    let running = false;
    let timer;
    const controller = new AbortController();
    const poll = async () => {
      if (!active || running) return;
      if (mutationBusy.current) {
        timer = setTimeout(poll, 2000);
        return;
      }
      running = true;
      try {
        await refresh(controller.signal);
      } catch (pollError) {
        if (active && pollError.name !== 'AbortError') setError(pollError.message);
      } finally {
        running = false;
        if (active) timer = setTimeout(poll, 2000);
      }
    };
    poll();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(timer);
        poll();
      }
    });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
      subscription.remove();
    };
  }, [token, refresh]);

  useEffect(() => {
    if (session?.status !== 'running') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [session?.status]);

  const mutate = useCallback(async (operation) => {
    if (mutationBusy.current) throw new Error('Aguarde a operação anterior terminar.');
    mutationBusy.current = true;
    setBusy(true);
    const version = ++revision.current;
    try {
      const result = await operation();
      apply(result.session, version);
      return result;
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  }, [apply]);

  const invite = useCallback((friendId, durationSeconds) =>
    mutate(() => inviteFocusFriend(token, friendId, durationSeconds)), [mutate, token]);

  const action = useCallback((name) => {
    if (!sessionRef.current) throw new Error('A sessão de foco não está disponível.');
    return mutate(() => updateFocusSession(token, sessionRef.current.id, name));
  }, [mutate, token]);

  return {
    session, error, busy, invite, action,
    seconds: session ? sharedFocusSeconds(session, Math.max(now, session.receivedAt)) : 0,
  };
}
