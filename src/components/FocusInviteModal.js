import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchConfirmedFriends } from '../services/friendService';
import { usePreferences } from '../contexts/PreferencesContext';
import { toast } from '../utils/toast';

export default function FocusInviteModal({
  visible, onClose, token, userId, session, durationSeconds, busy, onInvite, onAction,
}) {
  const { colors } = usePreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const pending = session?.status === 'pending';
  const isHost = pending && session.hostId === userId;

  useEffect(() => {
    if (!visible || pending) return undefined;
    let active = true;
    fetchConfirmedFriends(token).then((result) => {
      if (active) setFriends(result.friends);
    }).catch((loadError) => {
      if (active) setError(loadError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [visible, pending, token, reload]);

  const invite = async (friend) => {
    setError('');
    setNotice('');
    try {
      const result = await onInvite(friend.id, durationSeconds);
      if (result.pushStatus === 'unavailable') {
        setNotice('Seu amigo não tem notificações registradas. Ele pode ver o convite na tela de foco.');
      } else if (result.pushStatus !== 'queued') {
        setNotice('O convite foi criado, mas a notificação pode não ter sido entregue.');
      }
    } catch (inviteError) {
      setError(inviteError.message);
    }
  };

  const act = async (name) => {
    setError('');
    try {
      const result = await onAction(name);
      if (name === 'accept' && result.pushStatus && result.pushStatus !== 'queued') {
        toast.warn('Sessão iniciada, mas não foi possível notificar o anfitrião.');
      }
      if (name !== 'accept') onClose();
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar convite" />
        <View style={styles.sheet}>
          <View style={styles.heading}>
            <Text style={styles.title}>Focar com amigo</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar">
              <Text style={styles.close}>×</Text>
            </TouchableOpacity>
          </View>
          {pending ? (
            <>
              <Text style={styles.description}>
                {isHost
                  ? `Aguardando ${session.guestName} aceitar o convite.`
                  : `${session.hostName} convidou você para focar junto.`}
              </Text>
              <Text style={styles.description}>
                {session.durationSeconds ? `Temporizador: ${session.durationSeconds / 60} minutos` : 'Cronômetro progressivo'}
              </Text>
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => act(isHost ? 'cancel' : 'decline')} accessibilityRole="button">
                  <Text style={styles.secondaryText}>{isHost ? 'Cancelar convite' : 'Recusar'}</Text>
                </TouchableOpacity>
                {!isHost && (
                  <TouchableOpacity style={styles.primary} disabled={busy} onPress={() => act('accept')} accessibilityRole="button">
                    <Text style={styles.primaryText}>Aceitar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                {durationSeconds
                  ? `Convide para um temporizador de ${durationSeconds / 60} minutos.`
                  : 'Convide para um cronômetro progressivo.'}
                {' '}Para alterar, configure o relógio antes de convidar.
              </Text>
              {loading ? <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando amigos" /> : null}
              {!loading && !error && !friends.length
                ? <Text style={styles.description}>Você ainda não tem amigos confirmados.</Text>
                : null}
              <ScrollView style={styles.list}>
                {friends.map((friend) => (
                  <View key={friend.id} style={styles.friend}>
                    <View style={styles.friendName}>
                      <Text style={styles.name}>{friend.characterName}</Text>
                      <Text style={styles.username}>{friend.username}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.primary}
                      disabled={busy}
                      onPress={() => invite(friend)}
                      accessibilityRole="button"
                      accessibilityLabel={`Convidar ${friend.characterName} para focar`}
                    >
                      <Text style={styles.primaryText}>Convidar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              {error ? (
                <TouchableOpacity accessibilityRole="button" onPress={() => {
                  setError('');
                  setLoading(true);
                  setReload((value) => value + 1);
                }}>
                  <Text style={styles.retry}>Tentar novamente</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          {busy ? <ActivityIndicator color={colors.accent} accessibilityLabel="Enviando" /> : null}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 12, 86, 0.45)' },
  sheet: {
    maxHeight: '75%', width: '100%', maxWidth: 430, alignSelf: 'center',
    backgroundColor: colors.isDark ? colors.elevated : '#EAE4FF',
    borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 36,
  },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: colors.text, fontSize: 21, fontWeight: '800' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  close: { color: colors.text, fontSize: 30, lineHeight: 34 },
  description: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  notice: { color: colors.text, fontSize: 13, marginBottom: 12 },
  list: { flexGrow: 0 },
  friend: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(113,83,253,0.2)' },
  friendName: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  username: { color: colors.secondary, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  primary: { backgroundColor: '#7153FD', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#7153FD', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  secondaryText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  retry: { color: colors.accent, fontWeight: '700', marginTop: 12 },
  error: { color: '#C83242', fontSize: 13, marginTop: 12 },
});
