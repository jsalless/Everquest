import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import FocusScreen from './src/screens/FocusScreen';
import { FAVICON_SVG } from './src/components/svgAssets';
import { ToastContainer } from './src/utils/toast';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('focus');
  const [isFocusing, setIsFocusing] = useState(false);
  const [session, setSession] = useState(null);

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
    (currentScreen === 'focus' && !isFocusing);

  return (
    <>
      <StatusBar
        style={isLightBg ? 'dark' : 'light'}
        backgroundColor={isLightBg ? '#FFFFFF' : '#725CFF'}
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
            setActiveTab('focus');
            setCurrentScreen('focus');
          }}
        />
      )}

      {currentScreen === 'focus' && (
        <FocusScreen
          activeTab={activeTab}
          onChangeTab={(tabId) => setActiveTab(tabId)}
          onFocusStateChange={(focusing) => setIsFocusing(focusing)}
        />
      )}

      {currentScreen === 'login' && (
        <LoginScreen
          onRegister={() => setCurrentScreen('register')}
          onLoginSuccess={(data) => {
            setSession(data);
            setActiveTab('focus');
            setCurrentScreen('focus');
          }}
        />
      )}

      <ToastContainer />
    </>
  );
}
