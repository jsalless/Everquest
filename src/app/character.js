import React from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import CharacterCreationScreen from '../screens/CharacterCreationScreen';
import { useSession } from '../contexts/SessionContext';
import { fetchShop, saveServerAvatar } from '../services/shopService';
import { saveSession } from '../services/authService';

export default function CharacterRoute() {
  const { session, setSession, avatarConfig, setAvatarConfig } = useSession();
  const { editing, slot } = useLocalSearchParams();
  if (!session) return <Redirect href="/login" />;
  const goToProfile = () => {
    if (editing === 'true' && router.canGoBack()) router.back();
    else router.replace({ pathname: '/', params: { tab: 'profile' } });
  };
  return (
    <CharacterCreationScreen
      initialConfig={avatarConfig}
      initialCategory={slot}
      isEditing={editing === 'true'}
      loadWardrobe={session.shop_token ? fetchShop : undefined}
      shopToken={session.shop_token}
      onSave={session.shop_token ? saveServerAvatar : undefined}
      onCancel={goToProfile}
      onComplete={async (saved) => {
        const updated = await saveSession({
          ...session,
          needsOnboarding: false,
          user: { ...session.user, avatarConfig: saved },
        });
        setSession(updated);
        setAvatarConfig(saved);
        if (editing === 'true') goToProfile();
        else router.replace('/');
      }}
    />
  );
}
