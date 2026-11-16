import React, { useState, useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import CharacterCreationScreen from './src/screens/CharacterCreationScreen';
import FocusScreen from './src/screens/FocusScreen';
import TasksScreen from './src/screens/TasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { loadSavedAvatar } from './src/components/CharacterAvatar';
import { FAVICON_SVG } from './src/components/svgAssets';
import { ToastContainer } from './src/utils/toast';
import { parseProfileLink } from './src/components/ProfileQrCode';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('focus');
  const [isFocusing, setIsFocusing] = useState(false);
  const [session, setSession] = useState(null);
  const [avatarConfig, setAvatarConfig] = useState(() => loadSavedAvatar());
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [friendInvite, setFriendInvite] = useState(null);

  useEffect(() => {
    const handleUrl = (url) => {
      const invite = parseProfileLink(url);
      if (invite) setFriendInvite(invite);
    };
    Linking.getInitialURL().then(handleUrl).catch((error) => {
      console.error('Não foi possível abrir o convite:', error);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (friendInvite && currentScreen === 'focus') setActiveTab('profile');
  }, [friendInvite, currentScreen]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Everquest';
      const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(FAVICON_SVG)}`;
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/svg+xml';
      link.href = svgDataUrl;
    }
  }, []);

  const isLightBg =
    currentScreen === 'register' ||
    (currentScreen === 'focus' &&
      activeTab !== 'profile' &&
      activeTab !== 'tasks' &&
      !isFocusing);

  return (
    <>
      <StatusBar
        style={isLightBg ? 'dark' : 'light'}
        backgroundColor={
          currentScreen === 'character_creation' ||
          (currentScreen === 'focus' &&
            (activeTab === 'profile' || activeTab === 'tasks'))
            ? '#000C56'
            : isLightBg
            ? '#FFFFFF'
            : '#725CFF'
        }
      />

      {currentScreen === 'register' && (
        <RegisterScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
          onRegisterSuccess={(data) => {
            setSession(data);
            setCurrentScreen('onboarding');
          }}
        />
      )}

      {currentScreen === 'onboarding' && (
        <OnboardingScreen
          user={session?.user || session}
          onComplete={() => {
            setIsEditingAvatar(false);
            setCurrentScreen('character_creation');
          }}
        />
      )}

      {currentScreen === 'character_creation' && (
        <CharacterCreationScreen
          initialConfig={avatarConfig}
          isEditing={isEditingAvatar}
          onCancel={() => {
            setActiveTab('profile');
            setCurrentScreen('focus');
          }}
          onComplete={(savedConfig) => {
            setAvatarConfig(savedConfig);
            setActiveTab(isEditingAvatar ? 'profile' : 'focus');
            setIsEditingAvatar(false);
            setCurrentScreen('focus');
          }}
        />
      )}

      {currentScreen === 'focus' &&
        (activeTab === 'profile' ? (
          <ProfileScreen
            user={session?.user || session}
            avatarConfig={avatarConfig}
            friendInvite={friendInvite}
            onConsumeFriendInvite={() => setFriendInvite(null)}
            activeTab={activeTab}
            onChangeTab={(tabId) => setActiveTab(tabId)}
            onEditCharacter={() => {
              setIsEditingAvatar(true);
              setCurrentScreen('character_creation');
            }}
          />
        ) : activeTab === 'tasks' ? (
          <TasksScreen
            user={session?.user || session}
            activeTab={activeTab}
            onChangeTab={(tabId) => setActiveTab(tabId)}
          />
        ) : (
          <FocusScreen
            user={session?.user || session}
            activeTab={activeTab}
            onChangeTab={(tabId) => setActiveTab(tabId)}
            onFocusStateChange={(focusing) => setIsFocusing(focusing)}
          />
        ))}

      {currentScreen === 'login' && (
        <LoginScreen
          onRegister={() => setCurrentScreen('register')}
          onLoginSuccess={(data) => {
            setSession(data);
            if (data?.user?.avatarConfig) {
              setAvatarConfig(data.user.avatarConfig);
            }
            setActiveTab('focus');
            setCurrentScreen('focus');
          }}
        />
      )}

      <ToastContainer />
    </>
  );
}
