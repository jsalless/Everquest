import React from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import CharacterCreationScreen from '../screens/CharacterCreationScreen';
import { useSession } from '../contexts/SessionContext';

export default function CharacterRoute() {
  const { session, avatarConfig, setAvatarConfig } = useSession();
  const { editing } = useLocalSearchParams();
  if (!session) return <Redirect href="/login" />;
  const goToProfile = () => {
    if (editing === 'true' && router.canGoBack()) router.back();
    else router.replace({ pathname: '/', params: { tab: 'profile' } });
  };
  return (
    <CharacterCreationScreen
      initialConfig={avatarConfig}
      isEditing={editing === 'true'}
      onCancel={goToProfile}
      onComplete={(saved) => {
        setAvatarConfig(saved);
        if (editing === 'true') goToProfile();
        else router.replace('/');
      }}
    />
  );
}
