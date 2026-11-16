import React, { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PreferencesProvider, usePreferences } from '../contexts/PreferencesContext';
import { SessionProvider, useSession } from '../contexts/SessionContext';
import { FAVICON_SVG } from '../components/svgAssets';
import { parseProfileLink } from '../components/ProfileQrCode';
import { ToastContainer } from '../utils/toast';

function Navigation() {
  const { preferences, colors } = usePreferences();
  const { setFriendInvite, isFocusing } = useSession();
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
  const lightStatus = preferences.theme === 'dark' || isFocusing ||
    ['/login', '/onboarding', '/character', '/settings'].includes(pathname) ||
    (pathname === '/' && ['profile', 'tasks'].includes(String(tab)));
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
