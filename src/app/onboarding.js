import React from 'react';
import { Redirect, router } from 'expo-router';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useSession } from '../contexts/SessionContext';

export default function OnboardingRoute() {
  const { session } = useSession();
  if (!session) return <Redirect href="/login" />;
  return (
    <OnboardingScreen
      user={session.user || session}
      onComplete={() => router.replace('/character')}
    />
  );
}
