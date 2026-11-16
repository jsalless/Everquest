import React from 'react';
import { Redirect } from 'expo-router';
import SettingsScreen from '../screens/SettingsScreen';
import { useSession } from '../contexts/SessionContext';

export default function SettingsRoute() {
  const { session } = useSession();
  return session ? <SettingsScreen /> : <Redirect href="/login" />;
}
