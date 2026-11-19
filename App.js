import React, { useEffect } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import FocusScreen from './src/screens/FocusScreen';
import TasksScreen from './src/screens/TasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ShopScreen from './src/screens/ShopScreen';
import StoryScreen from './src/screens/StoryScreen';
import { useSession } from './src/contexts/SessionContext';
import useSharedFocusStatistics from './src/hooks/useSharedFocusStatistics';

export default function App() {
  const { tab } = useLocalSearchParams();
  const activeTab = typeof tab === 'string' ? tab : 'map';
  const {
    session, avatarConfig, friendInvite, setFriendInvite, setIsFocusing,
  } = useSession();
  const user = session?.user || session;
  const sharedStats = useSharedFocusStatistics(session?.shop_token, user?.id, activeTab);
  useEffect(() => {
    if (session && !session.needsOnboarding && friendInvite && activeTab !== 'profile') {
      router.replace({ pathname: '/', params: { tab: 'profile' } });
    }
  }, [session, friendInvite, activeTab]);

  if (!session) return <Redirect href="/login" />;
  if (session.needsOnboarding) return <Redirect href="/onboarding" />;
  const onChangeTab = (nextTab) => router.replace({ pathname: '/', params: { tab: nextTab } });
  if (activeTab === 'map') {
    return <StoryScreen key={user.id} userId={user.id} onChangeTab={onChangeTab} />;
  }
  if (activeTab === 'profile') {
    return (
      <ProfileScreen
        key={user.id}
        user={user}
        serverManaged={!!session.shop_token}
        friendToken={session.shop_token}
        focusStatsVersion={sharedStats.version}
        avatarConfig={avatarConfig}
        friendInvite={friendInvite}
        onConsumeFriendInvite={() => setFriendInvite(null)}
        activeTab={activeTab}
        onChangeTab={onChangeTab}
        onOpenSettings={() => router.push('/settings')}
        onEditCharacter={() => router.push({ pathname: '/character', params: { editing: 'true' } })}
      />
    );
  }
  if (activeTab === 'tasks') {
    return <TasksScreen user={user} activeTab={activeTab} onChangeTab={onChangeTab} />;
  }
  if (activeTab === 'shop') {
    return (
      <ShopScreen
        key={`${user.id}:${session.shop_token || ''}`}
        token={session.shop_token}
        onChangeTab={onChangeTab}
        onOpenWardrobe={(slot) => router.push({ pathname: '/character', params: { editing: 'true', slot } })}
      />
    );
  }
  return (
    <FocusScreen
      key={`${user.id}:${session.shop_token || ''}`}
      user={user}
      focusToken={session.shop_token}
      sharedFocusStats={sharedStats.stats}
      onSharedCompleted={sharedStats.refresh}
      activeTab={activeTab}
      onChangeTab={onChangeTab}
      onFocusStateChange={setIsFocusing}
    />
  );
}
