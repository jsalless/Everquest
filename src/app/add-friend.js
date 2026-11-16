import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSession } from '../contexts/SessionContext';
import { parseProfileLink } from '../components/ProfileQrCode';

export default function FriendInviteRoute() {
  const { id } = useLocalSearchParams();
  const { setFriendInvite } = useSession();
  useEffect(() => {
    const invite = parseProfileLink(`everquest://add-friend?id=${encodeURIComponent(String(id || ''))}`);
    if (invite) setFriendInvite(invite);
    router.replace({ pathname: '/', params: { tab: 'profile' } });
  }, [id, setFriendInvite]);
  return null;
}
