import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect, SvgXml } from 'react-native-svg';
import CharacterAvatar from '../components/CharacterAvatar';
import { BADGE1_SVG, BADGE2_SVG } from '../components/characterSvgAssets';
import Navbar from '../components/Navbar';
import { toast } from '../utils/toast';

function GearIcon({ size = 28, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="1.9" />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AddFriendIcon({ size = 20, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7.5" r="4" fill={color} />
      <Path
        d="M2 19.5C2 16.2 5.1 14 9 14C12.9 14 16 16.2 16 19.5V20.5H2V19.5Z"
        fill={color}
      />
      <Path
        d="M19 8V14M16 11H22"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function QrCodeIcon({ size = 22, color = '#7153FD' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.5"
        y="3.5"
        width="6.5"
        height="6.5"
        rx="1.2"
        stroke={color}
        strokeWidth="2"
      />
      <Rect
        x="14"
        y="3.5"
        width="6.5"
        height="6.5"
        rx="1.2"
        stroke={color}
        strokeWidth="2"
      />
      <Rect
        x="3.5"
        y="14"
        width="6.5"
        height="6.5"
        rx="1.2"
        stroke={color}
        strokeWidth="2"
      />
      <Rect x="14" y="14" width="3" height="3" fill={color} />
      <Rect x="17.5" y="17.5" width="3" height="3" fill={color} />
      <Rect x="14" y="18" width="2.5" height="2.5" fill={color} />
      <Rect x="18" y="14" width="2.5" height="2.5" fill={color} />
    </Svg>
  );
}

function ChevronRightIcon({ size = 18, color = '#1A1A1A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6L15 12L9 18"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ProfileScreen({
  user,
  avatarConfig,
  activeTab = 'profile',
  onChangeTab,
  onEditCharacter,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);

  // Nome do personagem criado pelo usuário (ex.: "Johnn")
  const characterName =
    (avatarConfig?.characterName || '').trim() || 'Johnn';

  // Username da conta do usuário (ex.: "@jsalless")
  const rawUsername =
    user?.user_metadata?.username ||
    user?.username ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'jsalless';
  const handleTag = `@${rawUsername.toLowerCase().replace(/\s+/g, '')}`;

  return (
    <View style={styles.root}>
      <View style={[styles.mobileFrame, { width: containerWidth }]}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner Azul Escuro (#000C56) com Nome do Personagem, Engrenagem e Avatar */}
          <View style={styles.topNavyBanner}>
            <View style={styles.bannerHeaderRow}>
              <View style={styles.headerSideSpacer} />
              <Text style={styles.profileTitle}>{characterName}</Text>
              <TouchableOpacity
                style={styles.gearButton}
                activeOpacity={0.8}
                onPress={onEditCharacter}
                accessibilityRole="button"
                accessibilityLabel="Personalizar personagem"
              >
                <GearIcon size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Avatar Centralizado usando os SVGs de assets/ (toque para editar personagem) */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onEditCharacter}
              style={styles.avatarTouchContainer}
              accessibilityRole="button"
              accessibilityLabel="Toque para personalizar seu personagem"
            >
              <CharacterAvatar
                config={avatarConfig}
                width={275}
                height={258}
                cropToWaist={true}
              />
            </TouchableOpacity>
          </View>

          {/* Corpo Branco Inferior */}
          <View style={styles.whiteBodySection}>
            <View style={styles.handleRow}>
              <Text style={styles.handleText}>{handleTag}</Text>
            </View>

            {/* Botões: ADICIONAR AMIGOS + QR Code */}
            <View style={styles.friendsActionsRow}>
              <TouchableOpacity
                style={styles.addFriendsButton}
                activeOpacity={0.85}
                onPress={() =>
                  toast.info('Convite de amizade copiado para compartilhar!')
                }
              >
                <AddFriendIcon size={20} color="#FFFFFF" />
                <Text style={styles.addFriendsButtonText}>
                  ADICIONAR AMIGOS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrCodeButton}
                activeOpacity={0.85}
                onPress={() =>
                  toast.info('Seu QR Code de viajante está pronto!')
                }
              >
                <QrCodeIcon size={22} color="#7153FD" />
              </TouchableOpacity>
            </View>

            {/* Seção CONQUISTAS com os assets badge1.svg e badge2.svg */}
            <TouchableOpacity
              style={styles.achievementsHeaderRow}
              activeOpacity={0.8}
              onPress={() =>
                toast.info('Continue focando para desbloquear novas conquistas!')
              }
            >
              <Text style={styles.achievementsTitle}>CONQUISTAS</Text>
              <ChevronRightIcon size={18} color="#1A1A1A" />
            </TouchableOpacity>

            <View style={styles.badgesRow}>
              <SvgXml xml={BADGE1_SVG} width={76} height={80} />
              <SvgXml xml={BADGE2_SVG} width={76} height={80} />
            </View>
          </View>
        </ScrollView>

        {/* Navbar Inferior Fixa */}
        <View style={styles.navbarWrapper}>
          <Navbar activeTab={activeTab} onChangeTab={onChangeTab} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  topNavyBanner: {
    width: '100%',
    backgroundColor: '#000C56',
    paddingTop: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bannerHeaderRow: {
    width: '100%',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSideSpacer: {
    width: 34,
  },
  profileTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  gearButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  avatarTouchContainer: {
    marginTop: 4,
    marginBottom: -4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  whiteBodySection: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  handleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7A7A7A',
  },
  friendsActionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  addFriendsButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#000C56',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  addFriendsButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  qrCodeButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#000C56',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  achievementsHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  achievementsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1E1E',
    letterSpacing: 0.3,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navbarWrapper: {
    width: '100%',
  },
});
