import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { registerFocusDevice, unregisterFocusDevice } from './focusSessionService';
import { getItem, removeItem, setItem } from './sessionStorage';
import './focusAlerts';

const DEVICE_TOKEN_KEY = 'focusPushDeviceToken';
let registration = Promise.resolve();
let registeredDevice = null;
let generation = 0;
let registrationEnabled = false;

async function register(token, devicePushToken, attempt) {
  if (attempt !== generation) return null;
  if (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('Convites por notificação no Android exigem uma build de desenvolvimento.');
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('focus-invites', {
      name: 'Convites de foco',
      importance: AndroidImportance.HIGH,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  const allowed = (value) => value.granted ||
    value.ios?.status === IosAuthorizationStatus.PROVISIONAL;
  if (!allowed(permission) && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!allowed(permission)) {
    throw new Error('Permita notificações no aparelho para receber convites de foco.');
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('O projeto Expo não está configurado para notificações.');
  const deviceToken = (await Notifications.getExpoPushTokenAsync({
    projectId,
    ...(devicePushToken ? { devicePushToken } : {}),
  })).data;
  if (attempt !== generation) return null;
  const previous = registeredDevice || await getItem(DEVICE_TOKEN_KEY);
  if (attempt !== generation) return null;
  await registerFocusDevice(token, deviceToken);
  if (attempt !== generation) {
    await unregisterFocusDevice(token, deviceToken);
    return null;
  }
  try {
    await setItem(DEVICE_TOKEN_KEY, deviceToken);
  } catch (error) {
    console.error('Não foi possível salvar notificações de foco:', error.message);
    try {
      await unregisterFocusDevice(token, deviceToken);
    } catch (cleanupError) {
      console.error('Não foi possível remover o dispositivo de foco:', cleanupError.message);
    }
    throw new Error('Não foi possível salvar o registro de notificações neste aparelho.');
  }
  if (attempt !== generation) {
    await removeItem(DEVICE_TOKEN_KEY);
    await unregisterFocusDevice(token, deviceToken);
    return null;
  }
  registeredDevice = deviceToken;
  if (previous && previous !== deviceToken) {
    await unregisterFocusDevice(token, previous);
  }
  return deviceToken;
}

function queueRegistration(token, devicePushToken) {
  const attempt = generation;
  const operation = registration.then(() => register(token, devicePushToken, attempt));
  registration = operation.then(() => undefined, (error) => {
    console.error('Não foi possível registrar notificações de foco:', error.message);
  });
  return operation;
}

export function registerFocusPush(token) {
  registrationEnabled = true;
  return queueRegistration(token);
}

export async function unregisterFocusPush(token) {
  registrationEnabled = false;
  generation += 1;
  const device = registeredDevice || await getItem(DEVICE_TOKEN_KEY);
  registeredDevice = null;
  if (device && token) await unregisterFocusDevice(token, device);
  await removeItem(DEVICE_TOKEN_KEY);
}

export function subscribeFocusPush(callback) {
  const handle = (response) => {
    if (response?.notification.request.content.data?.type !== 'focus-invite') return;
    Notifications.clearLastNotificationResponse();
    callback();
  };
  handle(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}

export function subscribeFocusPushToken(token, onError) {
  const subscription = Notifications.addPushTokenListener((devicePushToken) => {
    if (registrationEnabled) queueRegistration(token, devicePushToken).catch(onError);
  });
  return () => subscription.remove();
}
