import React, { createContext, useContext, useState } from 'react';
import { loadSavedAvatar } from '../components/CharacterAvatar';

type AvatarConfig = Record<string, unknown>;
type AccountUser = {
  id: string;
  email?: string;
  username?: string;
  avatarConfig?: AvatarConfig;
  user_metadata?: { username?: string; display_name?: string };
};
type SessionData = { user: AccountUser; access_token?: string; refresh_token?: string };
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
  const [session, setSession] = useState<SessionData | null>(null);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(() => loadSavedAvatar());
  const [friendInvite, setFriendInvite] = useState<FriendInvite | null>(null);
  const [isFocusing, setIsFocusing] = useState(false);
  return (
    <SessionContext.Provider value={{
      session, setSession, avatarConfig, setAvatarConfig,
      friendInvite, setFriendInvite, isFocusing, setIsFocusing,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('A sessão precisa de um SessionProvider.');
  return context;
}
