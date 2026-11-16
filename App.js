import React, { useEffect } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import FocusScreen from './src/screens/FocusScreen';
import TasksScreen from './src/screens/TasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { useSession } from './src/contexts/SessionContext';

export default function App() {
  const { tab } = useLocalSearchParams();
  const activeTab = typeof tab === 'string' ? tab : 'focus';
  const {
    session, avatarConfig, friendInvite, setFriendInvite, setIsFocusing,
  } = useSession();
  useEffect(() => {
    if (session && friendInvite && activeTab !== 'profile') {
      router.replace({ pathname: '/', params: { tab: 'profile' } });
    }
  }, [session, friendInvite, activeTab]);

  if (!session) return <Redirect href="/login" />;
  const onChangeTab = (nextTab) => router.replace({ pathname: '/', params: { tab: nextTab } });
  const user = session.user || session;
  if (activeTab === 'profile') {
    return (
      <ProfileScreen
        key={user.id}
        user={user}
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
  return (
    <FocusScreen
      user={user}
      activeTab={activeTab}
      onChangeTab={onChangeTab}
      onFocusStateChange={setIsFocusing}
    />
  );
}
