import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { Stack, router, useLocalSearchParams, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PreferencesProvider, usePreferences } from '../contexts/PreferencesContext';
import { SessionProvider, useSession } from '../contexts/SessionContext';
import { FAVICON_SVG } from '../components/svgAssets';
import { parseProfileLink } from '../components/ProfileQrCode';
import { ToastContainer, toast } from '../utils/toast';
import { registerFocusPush, subscribeFocusPush, subscribeFocusPushToken } from '../services/focusPush';

function Navigation() {
  const { preferences, colors } = usePreferences();
  const { session, setFriendInvite, isFocusing } = useSession();
  const [focusNotifications, setFocusNotifications] = useState(0);
  const handledFocusNotification = useRef(0);
  const pathname = usePathname();
  const { tab } = useLocalSearchParams();
  useEffect(() => {
    const handleUrl = (url: string | null | undefined) => {
      const invite = parseProfileLink(url);
      if (invite) setFriendInvite(invite);
    };
    Linking.getInitialURL().then(handleUrl).catch((error) => {
      console.error('Não foi possível abrir o convite:', error);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Everquest';
      let icon = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      icon.href = `data:image/svg+xml;utf8,${encodeURIComponent(FAVICON_SVG)}`;
    }
    return () => subscription.remove();
  }, [setFriendInvite]);
  useEffect(() => subscribeFocusPush(() => setFocusNotifications((value) => value + 1)), []);
  useEffect(() => {
    if (focusNotifications === handledFocusNotification.current || !session || session.needsOnboarding || isFocusing) return;
    handledFocusNotification.current = focusNotifications;
    router.replace({ pathname: '/', params: { tab: 'focus' } });
  }, [focusNotifications, session, isFocusing]);
  useEffect(() => {
    const token = session?.shop_token;
    if (!token || session?.needsOnboarding) return undefined;
    const report = (error: Error) => {
      console.error('Falha ao registrar notificações de foco:', error.message);
      toast.warn(error.message || 'Não foi possível ativar as notificações de foco.');
    };
    registerFocusPush(token).catch(report);
    return subscribeFocusPushToken(token, report);
  }, [session?.shop_token, session?.needsOnboarding]);
  const lightStatus = preferences.theme === 'dark' || isFocusing ||
    ['/login', '/onboarding', '/character', '/settings'].includes(pathname) ||
    (pathname === '/' && (tab === 'profile' || tab === 'shop'));
  return (
    <>
      <StatusBar style={lightStatus ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <>
      <PreferencesProvider>
        <SessionProvider><Navigation /></SessionProvider>
      </PreferencesProvider>
      <ToastContainer />
    </>
  );
}
