import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { loadSavedAvatar } from '../components/CharacterAvatar';
import { restoreSession } from '../services/authService';
import { toast } from '../utils/toast';
import { usePreferences } from './PreferencesContext';

type AvatarConfig = Record<string, unknown>;
type AccountUser = {
  id: string;
  email?: string;
  username?: string;
  avatarConfig?: AvatarConfig;
  user_metadata?: { username?: string; display_name?: string };
};
type SessionData = { user: AccountUser; access_token?: string; refresh_token?: string; shop_token?: string; needsOnboarding?: boolean };
type FriendInvite = { friendId: string };
type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type SessionValue = {
  session: SessionData | null;
  setSession: StateSetter<SessionData | null>;
  avatarConfig: AvatarConfig | null;
  setAvatarConfig: StateSetter<AvatarConfig | null>;
  friendInvite: FriendInvite | null;
  setFriendInvite: StateSetter<FriendInvite | null>;
  isFocusing: boolean;
  setIsFocusing: StateSetter<boolean>;
};
const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { colors } = usePreferences();
  const [restoring, setRestoring] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(() => loadSavedAvatar());
  const [friendInvite, setFriendInvite] = useState<FriendInvite | null>(null);
  const [isFocusing, setIsFocusing] = useState(false);

  useEffect(() => {
    let active = true;
    restoreSession().then((restored) => {
      if (!active) return;
      setSession(restored);
      if (restored?.user.avatarConfig) setAvatarConfig(restored.user.avatarConfig);
    }).catch(() => {
      if (active) toast.warn('Não foi possível restaurar o login salvo. Entre novamente.');
    }).finally(() => {
      if (active) setRestoring(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <SessionContext.Provider value={{
      session, setSession, avatarConfig, setAvatarConfig,
      friendInvite, setFriendInvite, isFocusing, setIsFocusing,
    }}>
      {restoring ? (
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Restaurando sessão" />
        </View>
      ) : children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('A sessão precisa de um SessionProvider.');
  return context;
}
