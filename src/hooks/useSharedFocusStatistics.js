import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  loadFocusStats, loadSharedFocusStats, recoverSharedFocusStats,
} from '../services/focusStatistics';
import { toast } from '../utils/toast';

export default function useSharedFocusStatistics(token, userId, activeTab) {
  const [snapshot, setSnapshot] = useState({ userId: null, stats: {}, version: 0 });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      try {
        await loadFocusStats();
        if (!userId) return;
        if (!token) {
          if (active) setSnapshot((previous) => ({
            userId, stats: {}, version: previous.version + 1,
          }));
          return;
        }
        const cached = await loadSharedFocusStats(userId);
        if (active) setSnapshot((previous) => ({ userId, stats: cached, version: previous.version }));
        const result = await recoverSharedFocusStats(token, userId, controller.signal);
        if (active) setSnapshot((previous) => ({ userId, stats: result.stats, version: previous.version + 1 }));
      } catch (error) {
        if (active && error.name !== 'AbortError') {
          console.error('Não foi possível atualizar as estatísticas de foco:', error.message);
          toast.error('Não foi possível atualizar as estatísticas de foco. Tente novamente.');
        }
      }
    };
    load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      controller.abort();
      subscription.remove();
    };
  }, [token, userId, activeTab, revision, refresh]);

  return {
    stats: token && snapshot.userId === userId ? snapshot.stats : {},
    version: snapshot.userId === userId ? snapshot.version : 0,
    refresh,
  };
}
