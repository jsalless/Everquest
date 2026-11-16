const pendingAlerts = new Map();

export async function requestFocusPermission() {
  if (typeof Notification === 'undefined') {
    throw new Error('Este navegador não oferece notificações. Use o aplicativo no celular.');
  }
  return (await Notification.requestPermission()) === 'granted';
}

export async function scheduleFocusAlert(deadline, preferences) {
  if (!preferences.focusNotifications) return null;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    throw new Error('Permita notificações no navegador para receber o alerta de foco.');
  }
  const identifier = `everquest-focus-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  pendingAlerts.set(identifier, setTimeout(() => {
    pendingAlerts.delete(identifier);
    new Notification('Missão de foco concluída!', {
      body: 'Bom trabalho, viajante. Sua sessão de foco chegou ao fim.',
      silent: !preferences.soundEnabled,
      tag: 'everquest-focus',
    });
  }, Math.max(0, deadline - Date.now())));
  return identifier;
}

export async function cancelFocusAlert(identifier) {
  if (!identifier) return;
  clearTimeout(pendingAlerts.get(identifier));
  pendingAlerts.delete(identifier);
}

export async function cancelAllFocusAlerts() {
  await Promise.all([...pendingAlerts.keys()].map(cancelFocusAlert));
}

export async function playFocusHaptic(preferences) {
  if (preferences.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([150, 75, 150]);
  }
}
