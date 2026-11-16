import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '../services/preferencesService';
import { toast } from '../utils/toast';
import type { AppPreferences } from '../services/preferencesService';

type ThemeColors = {
  isDark: boolean;
  background: string; surface: string; elevated: string;
  text: string; secondary: string; border: string;
  accent: string; accentSoft: string; danger: string;
};
type PreferencesValue = {
  preferences: AppPreferences;
  colors: ThemeColors;
  isSaving: boolean;
  updatePreferences: (patch: Partial<AppPreferences>) => Promise<AppPreferences>;
};
const PreferencesContext = createContext<PreferencesValue | null>(null);

export const LIGHT_COLORS: ThemeColors = Object.freeze({
  isDark: false,
  background: '#F7F5FF', surface: '#FFFFFF', elevated: '#F2F0FA',
  text: '#000C56', secondary: '#77718D', border: '#E8E4F2',
  accent: '#7153FD', accentSoft: '#F0ECFF', danger: '#C73559',
});

export const DARK_COLORS: ThemeColors = Object.freeze({
  isDark: true,
  background: '#101226', surface: '#1C2039', elevated: '#272C49',
  text: '#F4F2FF', secondary: '#BBB6D3', border: '#383D5A',
  accent: '#AC98FF', accentSoft: '#30294F', danger: '#FF8FA7',
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    loadPreferences(AsyncStorage)
      .then(setPreferences)
      .catch((error) => {
        console.error('Falha ao carregar preferências:', error);
        toast.error('Não foi possível carregar suas preferências. Usando o padrão nesta sessão.');
      })
      .finally(() => setReady(true));
  }, []);

  const updatePreferences = async (patch: Partial<AppPreferences>) => {
    if (saving.current) throw new Error('Aguarde a preferência anterior ser salva.');
    saving.current = true;
    setIsSaving(true);
    try {
      const saved = await savePreferences(AsyncStorage, { ...preferences, ...patch });
      setPreferences(saved);
      return saved;
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };
  const colors = preferences.theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, isSaving, colors }}>
      {ready ? children : (
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando preferências" />
        </View>
      )}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('As preferências precisam de um PreferencesProvider.');
  return context;
}
