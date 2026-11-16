import React from 'react';
import { router } from 'expo-router';
import RegisterScreen from '../screens/RegisterScreen';
import { useSession } from '../contexts/SessionContext';

export default function RegisterRoute() {
  const { setSession } = useSession();
  return (
    <RegisterScreen
      onNavigateToLogin={() => router.replace('/login')}
      onRegisterSuccess={(data) => {
        setSession(data);
        if (router.canDismiss()) router.dismissAll();
        router.replace('/onboarding');
      }}
    />
  );
}
