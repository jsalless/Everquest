import React from 'react';
import { router } from 'expo-router';
import LoginScreen from '../screens/LoginScreen';
import { useSession } from '../contexts/SessionContext';

export default function LoginRoute() {
  const { setSession, setAvatarConfig, setIsFocusing } = useSession();
  return (
    <LoginScreen
      onRegister={() => router.push('/register')}
      onLoginSuccess={(data) => {
        setSession(data);
        setIsFocusing(false);
        if (data?.user?.avatarConfig) setAvatarConfig(data.user.avatarConfig);
        if (router.canDismiss()) router.dismissAll();
        router.replace('/');
      }}
    />
  );
}
