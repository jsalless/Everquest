import { useEffect, useEffectEvent } from 'react';
import { AppState } from 'react-native';
import { cancelFocusAlert, playFocusHaptic, scheduleFocusAlert } from '../services/focusAlerts';
import { toast } from '../utils/toast';

export default function useFocusClock({ running, paused, isTimer, seconds, setSeconds, onFinish, preferences }) {
  const readSeconds = useEffectEvent(() => seconds);
  const finish = useEffectEvent(() => onFinish());
  useEffect(() => {
    if (!running || paused) return undefined;
    const startedAt = Date.now();
    const initialSeconds = readSeconds();
    const deadline = startedAt + initialSeconds * 1000;
    let disposed = false;
    let completed = false;
    let notificationId = null;
    const reportError = (error) => {
      console.error('Falha nos alertas de foco:', error);
      toast.error(error.message || 'Não foi possível atualizar o alerta de foco.');
    };
    if (isTimer) {
      scheduleFocusAlert(deadline, preferences).then((identifier) => {
        if (disposed) cancelFocusAlert(identifier).catch(reportError);
        else notificationId = identifier;
      }).catch(reportError);
    }
    // O relógio de parede mantém o prazo mesmo quando o sistema suspende o JavaScript.
    const tick = () => {
      if (completed) return;
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(isTimer ? remaining : initialSeconds + Math.floor((Date.now() - startedAt) / 1000));
      if (isTimer && remaining === 0) {
        completed = true;
        playFocusHaptic(preferences).catch(reportError);
        finish();
      }
    };
    const interval = setInterval(tick, 250);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      disposed = true;
      clearInterval(interval);
      subscription.remove();
      cancelFocusAlert(notificationId).catch(reportError);
    };
  }, [running, paused, isTimer, setSeconds, preferences]);
}
