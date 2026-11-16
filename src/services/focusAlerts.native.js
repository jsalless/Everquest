import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import * as Haptics from 'expo-haptics';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: Boolean(notification.request.content.sound),
    shouldSetBadge: false,
  }),
});

async function ensureChannel(preferences) {
  const channelId = `focus-${preferences.soundEnabled ? 'sound' : 'silent'}-${preferences.vibrationEnabled ? 'vibrate' : 'quiet'}`;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: `Fim do foco${preferences.soundEnabled ? ' com som' : ' silencioso'}${preferences.vibrationEnabled ? ' e vibração' : ''}`,
      importance: AndroidImportance.HIGH,
      sound: preferences.soundEnabled ? 'default' : null,
      enableVibrate: preferences.vibrationEnabled,
      vibrationPattern: preferences.vibrationEnabled ? [0, 250, 150, 250] : [0],
    });
  }
  return channelId;
}

function isAllowed(permission) {
  return permission.granted ||
    permission.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

export async function requestFocusPermission(preferences) {
  await ensureChannel(preferences);
  const existing = await Notifications.getPermissionsAsync();
  return isAllowed(existing.canAskAgain && !isAllowed(existing)
    ? await Notifications.requestPermissionsAsync()
    : existing);
}

export async function scheduleFocusAlert(deadline, preferences) {
  if (!preferences.focusNotifications) return null;
  if (!isAllowed(await Notifications.getPermissionsAsync())) {
    throw new Error('As notificações estão bloqueadas. Revise as permissões nas configurações do aparelho.');
  }
  const channelId = await ensureChannel(preferences);
  return Notifications.scheduleNotificationAsync({
    identifier: `everquest-focus-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    content: {
      title: 'Missão de foco concluída!',
      body: 'Bom trabalho, viajante. Sua sessão de foco chegou ao fim.',
      sound: preferences.soundEnabled ? 'default' : false,
      data: { type: 'everquest-focus' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(deadline),
      channelId,
    },
  });
}

export async function cancelFocusAlert(identifier) {
  if (identifier) await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllFocusAlerts() {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(pending
    .filter((item) => item.content.data?.type === 'everquest-focus')
    .map((item) => cancelFocusAlert(item.identifier)));
}

export async function playFocusHaptic(preferences) {
  if (preferences.vibrationEnabled && !preferences.focusNotifications) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
