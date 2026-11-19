import { usePreferences } from '../contexts/PreferencesContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Share,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect, SvgXml } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CharacterAvatar from '../components/CharacterAvatar';
import ProfilePageHeader from '../components/ProfilePageHeader';
import ProfileQrCode, { buildProfileLink, parseProfileLink } from '../components/ProfileQrCode';
import { EverquestLogo2 } from '../components/QrCodeGenerator';
import {
  CHEST_WOOD_SVG,
  CHEST_IRON_SVG,
  CHEST_GOLD_SVG,
} from '../components/characterSvgAssets';
import Navbar from '../components/Navbar';
import { toast } from '../utils/toast';
import {
  CHEST_TIERS,
  getLevelProgressFromXp,
  loadDailyQuests,
  loadUserRewards,
  fetchUserProgressionAndQuests,
  claimDailyQuestReward,
} from '../services/dailyQuestService';
import {
  syncUserProfileToBackend,
  fetchUserFriends,
  searchRegisteredUsers,
  sendFriendRequest,
  fetchFriendRequests,
  fetchConfirmedFriends,
  acceptFriendRequest,
  removeFriendRelationship,
} from '../services/friendService';
import {
  DEFAULT_BADGES,
  loadCachedUserBadges,
  fetchUserBadges,
} from '../services/badgeService';

const CHEST_SVG_BY_TIER = {
  wood: CHEST_WOOD_SVG,
  iron: CHEST_IRON_SVG,
  gold: CHEST_GOLD_SVG,
};

export const MOCK_BADGES = DEFAULT_BADGES;

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

function CloseIcon({ size = 24, color = '#1A1A1A' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6L18 18M18 6L6 18"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CoinIcon({ size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9.5" fill="#F6CA46" stroke="#CF8B2E" strokeWidth="2" />
      <Circle cx="12" cy="12" r="5.5" stroke="#B7791F" strokeWidth="1.5" strokeDasharray="3 2" />
    </Svg>
  );
}

function XpSparkIcon({ size = 16, color = '#7153FD' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5L14.6 8.8L21.4 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.6 9.5L9.4 8.8L12 2.5Z"
        fill={color}
      />
    </Svg>
  );
}

function SearchLensIcon({ size = 18, color = '#7C8292' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="6.8" stroke={color} strokeWidth="2.1" />
      <Path
        d="M16.2 16.2L20.5 20.5"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ProfileScreen({
  user,
  serverManaged = false,
  friendToken,
  avatarConfig,
  activeTab = 'profile',
  onChangeTab,
  onEditCharacter,
  onOpenSettings,
  friendInvite,
  onConsumeFriendInvite,
}) {
  const { colors } = usePreferences();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);

  const [isAllBadgesVisible, setIsAllBadgesVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isFriendsModalVisible, setIsFriendsModalVisible] = useState(false);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [friendsTotalCount, setFriendsTotalCount] = useState(0);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  const [isAddFriendModalVisible, setIsAddFriendModalVisible] = useState(false);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [isSubmittingFriend, setIsSubmittingFriend] = useState(false);
  const [isQrVisible, setIsQrVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [outgoingIds, setOutgoingIds] = useState([]);
  const [requestsError, setRequestsError] = useState('');
  const [friendNotice, setFriendNotice] = useState('');
  const [requestsRevision, setRequestsRevision] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanHandled = useRef(false);

  const [userRewards, setUserRewards] = useState(() => loadUserRewards(user));
  const [dailyQuests, setDailyQuests] = useState(() => loadDailyQuests(user));
  const [badgesList, setBadgesList] = useState(() => loadCachedUserBadges(user));
  const [claimingTier, setClaimingTier] = useState(null);
  const [previousFriendInvite, setPreviousFriendInvite] = useState(friendInvite);

  if (friendInvite !== previousFriendInvite) {
    setPreviousFriendInvite(friendInvite);
    if (friendInvite) {
      setIsScanning(false);
      setIsAddFriendModalVisible(false);
      setFriendNotice('');
    }
  }

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
  const levelInfo = getLevelProgressFromXp(userRewards.xp);
  const profileLink = buildProfileLink(user);

  const filteredFriends = useMemo(() => {
    const query = friendsSearchQuery.trim().toLowerCase().replace(/^@/, '');
    if (!query) return friendsList;
    return friendsList.filter(
      (f) =>
        (f.characterName || '').toLowerCase().includes(query) ||
        (f.username || '').toLowerCase().includes(query)
    );
  }, [friendsList, friendsSearchQuery]);

  useEffect(() => {
    const loadedRewards = loadUserRewards(user);
    const loadedLevel = getLevelProgressFromXp(loadedRewards.xp);
    let isMounted = true;
    async function initProfileProgressionAndFriends() {
      try {
        if (!serverManaged) {
          try {
            await syncUserProfileToBackend({
              user,
              avatarConfig,
              level: loadedLevel.level,
              xp: loadedRewards.xp,
              coins: loadedRewards.coins,
            });
          } catch (error) {
            if (isMounted) toast.warn(error.message);
          }
        }
        if (!isMounted) return;

        const [progressionRes, badgesRes] = await Promise.all([
          fetchUserProgressionAndQuests(user),
          fetchUserBadges(user),
        ]);

        if (isMounted) {
          if (progressionRes?.rewards) {
            setUserRewards(progressionRes.rewards);
          }
          if (Array.isArray(progressionRes?.dailyQuests)) {
            setDailyQuests(progressionRes.dailyQuests);
          }
          if (Array.isArray(badgesRes?.badges) && badgesRes.badges.length > 0) {
            setBadgesList(badgesRes.badges);
          }
        }
        try {
          const friendsRes = await fetchUserFriends(friendToken, '');
          if (isMounted) {
            setFriendsList(friendsRes.friends);
            setFriendsTotalCount(friendsRes.total);
          }
        } catch (error) {
          if (isMounted) toast.error(error.message);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Não foi possível atualizar o perfil:', error);
          toast.error('Não foi possível atualizar o perfil. Tente novamente.');
        }
      } finally {
        if (isMounted) setIsLoadingFriends(false);
      }
    }
    initProfileProgressionAndFriends();

    return () => {
      isMounted = false;
    };
  }, [user, avatarConfig, serverManaged, friendToken]);

  useEffect(() => {
    if (!isAddFriendModalVisible) return;
    let active = true;
    async function loadDirectory() {
      try {
        const results = await searchRegisteredUsers(friendToken, addFriendQuery);
        if (active) {
          setDirectoryUsers(results);
        }
      } catch (error) {
        if (active) {
          setDirectoryUsers([]);
          toast.error(error.message);
        }
      }
    }
    loadDirectory();
    return () => {
      active = false;
    };
  }, [isAddFriendModalVisible, addFriendQuery, friendToken, friendsList]);

  useEffect(() => {
    if (!isAddFriendModalVisible) return;
    let active = true;
    fetchFriendRequests(friendToken).then((result) => {
      if (active) {
        setRequestsError('');
        setPendingRequests(result.incoming);
        setOutgoingIds(result.outgoingIds);
      }
    }).catch((error) => {
      if (active) {
        setPendingRequests([]);
        setOutgoingIds([]);
        setRequestsError(error.message);
      }
    });
    return () => { active = false; };
  }, [isAddFriendModalVisible, friendToken, requestsRevision]);

  async function handleAddFriend({ friendId, friendUsername }) {
    if (isSubmittingFriend) return;
    setIsSubmittingFriend(true);
    setFriendNotice('');
    try {
      const link = parseProfileLink(friendUsername);
      const res = await sendFriendRequest(friendToken, {
        friendId: link?.friendId || friendId,
        friendUsername: link ? null : friendUsername,
      });
      setAddFriendQuery('');
      toast.success(res.message);
      setFriendNotice(res.message);
      setRequestsRevision((revision) => revision + 1);
      if (friendInvite) onConsumeFriendInvite();
    } catch (err) {
      setFriendNotice(err.message || 'Erro ao enviar pedido.');
      toast.error(err.message || 'Erro ao enviar pedido.');
    } finally {
      setIsSubmittingFriend(false);
    }
  }

  async function handleAcceptFriend(request) {
    if (isSubmittingFriend) return;
    setIsSubmittingFriend(true);
    setFriendNotice('');
    try {
      const result = await acceptFriendRequest(friendToken, request.id);
      setPendingRequests((requests) => requests.filter((item) => item.id !== request.id));
      setFriendNotice(result.message);
      const updated = await fetchConfirmedFriends(friendToken);
      setFriendsList(updated.friends);
      setFriendsTotalCount(updated.total);
      setRequestsRevision((revision) => revision + 1);
      toast.success(result.message);
      fetchUserBadges(user, { friendsCount: updated.total }).then((badges) => {
        if (Array.isArray(badges?.badges)) setBadgesList(badges.badges);
      }).catch((error) => console.error('Não foi possível atualizar as insígnias:', error));
    } catch (error) {
      setFriendNotice(error.message || 'Não foi possível aceitar o pedido.');
      toast.error(error.message || 'Não foi possível aceitar o pedido.');
    } finally {
      setIsSubmittingFriend(false);
    }
  }

  async function openScanner() {
    try {
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission.granted) {
        setFriendNotice('Permita o acesso à câmera para ler o QR Code.');
        toast.error('Permita o acesso à câmera para ler o QR Code.');
        return;
      }
      scanHandled.current = false;
      setIsScanning(true);
    } catch {
      setFriendNotice('Não foi possível acessar a câmera.');
      toast.error('Não foi possível acessar a câmera.');
    }
  }

  async function handleRemoveFriend(friend) {
    try {
      const res = await removeFriendRelationship(friendToken, friend.id);
      setFriendsList(res.friends);
      setFriendsTotalCount(res.total);
      toast.info(`${friend.characterName} foi removido da sua lista de amigos.`);
      fetchUserBadges(user, { friendsCount: res.total }).then((bRes) => {
        if (Array.isArray(bRes?.badges)) setBadgesList(bRes.badges);
      }).catch((error) => {
        console.error('Não foi possível atualizar as insígnias:', error);
        toast.error('Amigo removido, mas não foi possível atualizar as insígnias.');
      });
    } catch (error) {
      toast.error(error.message || 'Não foi possível remover o amigo.');
    }
  }

  async function handleClaimQuest(tierKey) {
    if (claimingTier) return;
    setClaimingTier(tierKey);
    try {
      const { quests, rewards, rewardGranted, message } =
        await claimDailyQuestReward(user, tierKey, { serverManaged });
      setDailyQuests(quests);
      setUserRewards(rewards);

      if (!serverManaged) {
        const updatedLevel = getLevelProgressFromXp(rewards.xp);
        syncUserProfileToBackend({
          user,
          avatarConfig,
          level: updatedLevel.level,
          xp: rewards.xp,
          coins: rewards.coins,
        });
      }

      if (rewardGranted) {
        toast.success(
          message ||
            `${rewardGranted.label} resgatado! +${rewardGranted.coins} moedas e +${rewardGranted.xp} XP!`
        );
      }
    } catch (err) {
      toast.warn(
        err.message ||
          'Conclua os requisitos da missão para resgatar suas recompensas.'
      );
    } finally {
      setClaimingTier(null);
    }
  }

  // Somente as badges efetivamente conquistadas pelo usuário aparecem no perfil (máximo as 5 últimas)
  const unlockedBadges = useMemo(
    () => badgesList.filter((b) => Boolean(b.unlocked)),
    [badgesList]
  );
  const recentBadges = unlockedBadges.slice(0, 5);

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
                onPress={onOpenSettings}
                accessibilityRole="button"
                accessibilityLabel="Abrir configurações"
              >
                <GearIcon size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Avatar Centralizado usando os SVGs de assets/avatar/ (toque para editar personagem) */}
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
            {/* Barra de Progresso de Nível (Lv + XP) logo abaixo do personagem */}
            <View style={styles.levelProgressContainer}>
              <View style={styles.levelHeaderRow}>
                <View style={styles.levelBadgeRow}>
                  <View style={styles.levelBadgePill}>
                    <Text style={styles.levelBadgeText}>
                      Lv. {levelInfo.level}
                    </Text>
                  </View>
                </View>

                <View style={styles.levelXpCounterRow}>
                  <XpSparkIcon size={14} color="#7153FD" />
                  <Text style={styles.levelXpCounterText}>
                    {levelInfo.currentLevelXp}/{levelInfo.xpForNextLevel} XP
                  </Text>
                </View>
              </View>

              <View style={styles.levelBarTrack}>
                <View
                  style={[
                    styles.levelBarFill,
                    { width: `${levelInfo.progressPercent}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.handleRow}>
              <Text style={styles.handleText}>{handleTag}</Text>

              {/* Número de amigos do usuário (clicável para abrir a lista completa com busca) */}
              <TouchableOpacity
                style={styles.friendsCountButton}
                activeOpacity={0.8}
                onPress={() => {
                  setFriendsSearchQuery('');
                  setIsFriendsModalVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Ver lista de ${friendsTotalCount} amigos`}
              >
                <Text style={styles.friendsCountNumber}>
                  {friendsTotalCount}
                </Text>
                <Text style={styles.friendsCountLabel}>
                  {friendsTotalCount === 1 ? 'amigo' : 'amigos'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Botões: ADICIONAR AMIGOS + QR Code */}
            <View style={styles.friendsActionsRow}>
              <TouchableOpacity
                style={styles.addFriendsButton}
                activeOpacity={0.85}
                onPress={() => {
                  setAddFriendQuery('');
                  setRequestsError('');
                  setIsAddFriendModalVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Adicionar novos amigos"
              >
                <AddFriendIcon size={20} color="#FFFFFF" />
                <Text style={styles.addFriendsButtonText}>
                  ADICIONAR AMIGOS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.qrCodeButton}
                activeOpacity={0.85}
                onPress={() => setIsQrVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Mostrar meu QR Code"
              >
                <QrCodeIcon size={22} color="#7153FD" />
              </TouchableOpacity>
            </View>

            {/* Seção DAILY QUESTS agrupada em um só bloco */}
            <View style={styles.dailyQuestsSection}>
              <View style={styles.dailyQuestsHeaderRow}>
                <Text style={styles.dailyQuestsTitle}>DAILY QUESTS</Text>
              </View>

              <View style={styles.dailyQuestsGroupBox}>
                {dailyQuests.map((quest, index) => {
                  const tierMeta = CHEST_TIERS[quest.tier] || CHEST_TIERS.wood;
                  const chestSvg =
                    CHEST_SVG_BY_TIER[quest.tier] || CHEST_WOOD_SVG;
                  const isClaimed = Boolean(quest.claimed);
                  const isLast = index === dailyQuests.length - 1;
                  const progressRatio = Math.min(
                    1,
                    (Number(quest.progress) || 0) /
                    Math.max(1, Number(quest.target) || 1)
                  );

                  return (
                    <View
                      key={quest.tier}
                      style={[
                        styles.dailyQuestRowItem,
                        !isLast && styles.dailyQuestRowWithDivider,
                        isClaimed && styles.dailyQuestCardClaimed,
                      ]}
                    >
                      {/* Ícone do Baú sem fundo colorido */}
                      <View style={styles.questChestBox}>
                        <SvgXml xml={chestSvg} width={48} height={48} />
                      </View>

                      {/* Conteúdo central da Quest */}
                      <View style={styles.questCenterBody}>
                        <View style={styles.questTopMetaRow}>
                          <Text
                            style={[
                              styles.questTitleText,
                              isClaimed && styles.questTitleTextClaimed,
                            ]}
                          >
                            {quest.title}
                          </Text>

                          {/* Prêmios do Baú (Moedas + XP) */}
                          <View style={styles.questRewardsInline}>
                            <View style={styles.questRewardChipCoin}>
                              <CoinIcon size={13} />
                              <Text style={styles.questRewardChipCoinText}>
                                +{quest.coins} moedas
                              </Text>
                            </View>
                            <View style={styles.questRewardChipXp}>
                              <XpSparkIcon size={12} color="#7153FD" />
                              <Text style={styles.questRewardChipXpText}>
                                +{quest.xp} XP
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Barra de progresso + botão de resgate */}
                        <View style={styles.questBottomActionRow}>
                          <View style={styles.questProgressTrackWrap}>
                            <View style={styles.questProgressTrack}>
                              <View
                                style={[
                                  styles.questProgressFill,
                                  {
                                    width: `${Math.round(progressRatio * 100)}%`,
                                    backgroundColor: isClaimed
                                      ? '#9EA5B4'
                                      : tierMeta.accentColor,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.questProgressCounter}>
                              {quest.progress}/{quest.target}
                            </Text>
                          </View>

                          {(() => {
                            const isReadyToClaim =
                              Boolean(quest.completed) && !isClaimed;
                            return (
                              <TouchableOpacity
                                style={[
                                  styles.questClaimButton,
                                  isClaimed
                                    ? styles.questClaimButtonDone
                                    : isReadyToClaim
                                      ? styles.questClaimButtonReady
                                      : styles.questClaimButtonPending,
                                ]}
                                activeOpacity={isReadyToClaim ? 0.85 : 1}
                                disabled={
                                  !isReadyToClaim ||
                                  claimingTier === quest.tier
                                }
                                onPress={() => handleClaimQuest(quest.tier)}
                                accessibilityRole="button"
                                accessibilityLabel={
                                  isClaimed
                                    ? `Recompensa da missão ${quest.title} já resgatada`
                                    : isReadyToClaim
                                      ? `Resgatar recompensas do baú ${tierMeta.name}`
                                      : `Missão ${quest.title} em andamento (${quest.progress} de ${quest.target})`
                                }
                              >
                                <Text
                                  style={[
                                    styles.questClaimButtonText,
                                    isClaimed
                                      ? styles.questClaimButtonTextDone
                                      : !isReadyToClaim &&
                                        styles.questClaimButtonTextPending,
                                  ]}
                                >
                                  {isClaimed
                                    ? 'Resgatado ✓'
                                    : isReadyToClaim
                                      ? 'Resgatar recompensas'
                                      : 'Em andamento'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })()}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Seção CONQUISTAS: mostra somente as 5 últimas conquistadas e botão para visualizar todas */}
            <TouchableOpacity
              style={styles.achievementsHeaderRow}
              activeOpacity={0.8}
              onPress={() => setIsAllBadgesVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Visualizar todas as conquistas"
            >
              <Text style={styles.achievementsTitle}>CONQUISTAS</Text>
              <View style={styles.viewAllActionRow}>
                <Text style={styles.viewAllText}>Ver todas</Text>
                <ChevronRightIcon size={18} color="#7153FD" />
              </View>
            </TouchableOpacity>

            {recentBadges.length === 0 ? (
              <View style={styles.emptyAchievementsBox}>
                <Text style={styles.emptyAchievementsText}>
                  Você ainda não possui nenhuma conquista
                </Text>
              </View>
            ) : (
              <View style={styles.badgesRow}>
                {recentBadges.map((badge) => (
                  <TouchableOpacity
                    key={badge.id}
                    style={styles.profileBadgeItem}
                    activeOpacity={0.82}
                    onPress={() => setSelectedBadge(badge)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver conquista ${badge.title}`}
                  >
                    <SvgXml
                      xml={badge.svgColor || badge.svg}
                      width={62}
                      height={65}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Navbar Inferior Fixa */}
        <View style={styles.navbarWrapper}>
          <Navbar activeTab={activeTab} onChangeTab={onChangeTab} />
        </View>
      </View>

      {/* Modal: Todas as Insígnias / Conquistas (referência lado direito) */}
      <Modal
        visible={isAllBadgesVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsAllBadgesVisible(false)}
      >
        <View style={styles.modalScreenRoot}>
          <View style={[styles.modalMobileFrame, { width: containerWidth }]}>
            <ProfilePageHeader title="Insígnias" onBack={() => setIsAllBadgesVisible(false)} />

            <ScrollView
              style={styles.insigniasScroll}
              contentContainerStyle={styles.insigniasGridContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.insigniasGrid}>
                {badgesList.map((badge) => {
                  const isUnlocked = Boolean(badge.unlocked);
                  const badgeXml = isUnlocked
                    ? badge.svgColor || badge.svg
                    : badge.svgGray || badge.svg;
                  return (
                    <TouchableOpacity
                      key={badge.id}
                      style={styles.insigniaGridCard}
                      activeOpacity={0.82}
                      onPress={() => setSelectedBadge(badge)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver detalhes da insígnia ${badge.title}`}
                    >
                      <View
                        style={[
                          styles.insigniaIconHolder,
                          !isUnlocked && styles.insigniaIconHolderLocked,
                        ]}
                      >
                        <SvgXml xml={badgeXml} width={88} height={92} />
                      </View>
                      <Text
                        style={[
                          styles.insigniaGridLabel,
                          !isUnlocked && styles.insigniaGridLabelLocked,
                        ]}
                        numberOfLines={2}
                      >
                        {badge.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Visualização Expandida da Badge ao clicar (referência lado esquerdo) */}
      <Modal
        visible={Boolean(selectedBadge)}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setSelectedBadge(null)}
      >
        <View style={styles.modalScreenRoot}>
          <View
            style={[
              styles.expandedBadgeFrame,
              { width: containerWidth },
            ]}
          >
            <View style={styles.expandedTopBar}>
              <TouchableOpacity
                style={styles.expandedCloseBtn}
                activeOpacity={0.8}
                onPress={() => setSelectedBadge(null)}
                accessibilityRole="button"
                accessibilityLabel="Fechar visualização da conquista"
              >
                <CloseIcon size={24} color={colors.isDark ? colors.text : '#1A1A1A'} />
              </TouchableOpacity>
            </View>

            {selectedBadge ? (
              <View style={styles.expandedCenterContent}>
                <View
                  style={[
                    styles.expandedBadgeArtwork,
                    !selectedBadge.unlocked &&
                      styles.insigniaIconHolderLocked,
                  ]}
                >
                  <SvgXml
                    xml={
                      selectedBadge.unlocked
                        ? selectedBadge.svgColor || selectedBadge.svg
                        : selectedBadge.svgGray || selectedBadge.svg
                    }
                    width={250}
                    height={262}
                  />
                </View>

                <View
                  style={[
                    styles.expandedDatePill,
                    !selectedBadge.unlocked && styles.expandedDatePillLocked,
                  ]}
                >
                  <Text style={styles.expandedDateText}>
                    {selectedBadge.unlocked && selectedBadge.unlockedAt
                      ? selectedBadge.unlockedAt
                      : selectedBadge.goal?.label || 'Não conquistada'}
                  </Text>
                </View>

                <Text style={styles.expandedDescriptionText}>
                  {selectedBadge.description
                    ? `${selectedBadge.description} — insígnia `
                    : selectedBadge.descriptionPrefix}
                  <Text style={styles.expandedBadgeTitleBold}>
                    {selectedBadge.title}!
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Modal: Lista Completa de Amigos com Barra de Pesquisa */}
      <Modal
        visible={isFriendsModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsFriendsModalVisible(false)}
      >
        <View style={styles.modalScreenRoot}>
          <View style={[styles.modalMobileFrame, { width: containerWidth }]}>
            <ProfilePageHeader
              title={`Amigos (${friendsTotalCount})`}
              onBack={() => setIsFriendsModalVisible(false)}
              rightAction={(
                <TouchableOpacity
                  style={styles.friendsHeaderAddShortcut}
                  activeOpacity={0.85}
                  onPress={() => {
                    setIsFriendsModalVisible(false);
                    setAddFriendQuery('');
                    setRequestsError('');
                    setIsAddFriendModalVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar novo amigo"
                >
                  <AddFriendIcon size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            />

            {/* Barra de Pesquisa de Amigos */}
            <View style={styles.friendsSearchBarWrapper}>
              <View style={styles.friendsSearchInputBox}>
                <SearchLensIcon size={18} color="#7C8292" />
                <TextInput
                  style={styles.friendsSearchInput}
                  placeholder="Pesquisar amigo por nome ou @usuário..."
                  placeholderTextColor="#959BA8"
                  value={friendsSearchQuery}
                  onChangeText={setFriendsSearchQuery}
                />
                {friendsSearchQuery.length > 0 ? (
                  <TouchableOpacity
                    style={styles.friendsSearchClearBtn}
                    onPress={() => setFriendsSearchQuery('')}
                    accessibilityRole="button"
                    accessibilityLabel="Limpar pesquisa"
                  >
                    <CloseIcon size={16} color="#7C8292" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Lista de Amigos vinda do Banco de Dados */}
            <ScrollView
              style={styles.insigniasScroll}
              contentContainerStyle={styles.friendsListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {isLoadingFriends ? (
                <View style={styles.friendsEmptyBox}>
                  <Text style={styles.friendsEmptyTitle}>
                    Carregando seus amigos...
                  </Text>
                  <Text style={styles.friendsEmptySub}>
                    Buscando o relacionamento de amizade no banco de dados.
                  </Text>
                </View>
              ) : filteredFriends.length === 0 ? (
                <View style={styles.friendsEmptyBox}>
                  <Text style={styles.friendsEmptyTitle}>
                    Nenhum amigo encontrado
                  </Text>
                  <Text style={styles.friendsEmptySub}>
                    Tente buscar por outro nome ou @usuário, ou adicione novos amigos.
                  </Text>
                </View>
              ) : (
                <View style={styles.friendsListCardGroup}>
                  {filteredFriends.map((friend, index) => {
                    const isLast = index === filteredFriends.length - 1;
                    return (
                      <View
                        key={friend.id}
                        style={[
                          styles.friendListItemRow,
                          !isLast && styles.friendListItemDivider,
                        ]}
                      >
                        <View style={styles.friendAvatarCircle}>
                          <CharacterAvatar
                            config={friend.avatarConfig}
                            width={52}
                            height={52}
                            cropToWaist={true}
                          />
                        </View>

                        <View style={styles.friendInfoBody}>
                          <Text style={styles.friendCharacterName}>
                            {friend.characterName}
                          </Text>
                          <Text style={styles.friendUsernameText}>
                            {friend.username}
                          </Text>
                        </View>

                        <View style={styles.friendRightActions}>
                          <View style={styles.friendLevelBadge}>
                            <Text style={styles.friendLevelBadgeText}>
                              Lv. {friend.level}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.friendRemoveBtn}
                            activeOpacity={0.8}
                            onPress={() => handleRemoveFriend(friend)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remover ${friend.characterName} dos amigos`}
                          >
                            <CloseIcon size={15} color="#9096A6" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isQrVisible} transparent animationType="fade" onRequestClose={() => setIsQrVisible(false)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            <TouchableOpacity style={styles.qrClose} onPress={() => setIsQrVisible(false)} accessibilityRole="button" accessibilityLabel="Fechar QR Code">
              <CloseIcon color={colors.isDark ? colors.text : '#1A1A1A'} />
            </TouchableOpacity>
            <View style={styles.qrAvatar}>
              <CharacterAvatar config={avatarConfig} width={240} height={240} cropToWaist />
            </View>
            <View style={styles.qrCardFooter}>
              <View style={styles.qrIdentity}>
                <Text style={styles.qrName} numberOfLines={1}>{characterName}</Text>
                <Text style={styles.qrHandle} numberOfLines={1}>{handleTag}</Text>
                <EverquestLogo2 width={125} height={42} />
              </View>
              {profileLink ? <ProfileQrCode value={profileLink} size={140} /> : (
                <Text style={styles.qrHandle}>Entre na sua conta para gerar o QR Code.</Text>
              )}
            </View>
            {profileLink && (
              <>
                <Text selectable style={styles.qrLink}>{profileLink}</Text>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity style={styles.qrShare} onPress={async () => {
                    try {
                      await Share.share({ message: `Adicione-me no Everquest: ${profileLink}` });
                    } catch {
                      toast.error('Não foi possível compartilhar o convite.');
                    }
                  }} accessibilityRole="button">
                    <Text style={styles.addCandidateBtnText}>Compartilhar convite</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(friendInvite)} transparent animationType="fade" onRequestClose={onConsumeFriendInvite}>
        <View style={styles.qrOverlay}>
          <View style={styles.inviteCard}>
            <Text style={styles.qrName}>Convite de amizade</Text>
            <Text style={styles.qrHandle}>Deseja enviar um pedido para este aventureiro?</Text>
            {!!friendNotice && <Text style={styles.qrHandle}>{friendNotice}</Text>}
            <TouchableOpacity style={styles.qrShare} disabled={isSubmittingFriend} onPress={() => handleAddFriend(friendInvite)} accessibilityRole="button">
              <Text style={styles.addCandidateBtnText}>Enviar pedido</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConsumeFriendInvite} accessibilityRole="button">
              <Text style={styles.qrHandle}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAddFriendModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setIsScanning(false);
          setIsAddFriendModalVisible(false);
        }}
      >
        <View style={styles.modalScreenRoot}>
          <View style={[styles.modalMobileFrame, { width: containerWidth }]}>
            <ProfilePageHeader
              title="Adicionar Amigos"
              onBack={() => {
                if (isScanning) setIsScanning(false);
                else setIsAddFriendModalVisible(false);
              }}
            />

            {isScanning ? (
              <View style={styles.scannerContainer}>
                <Text style={styles.scannerText}>Aponte a câmera para o QR Code de um amigo.</Text>
                <CameraView
                  style={styles.scannerCamera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onMountError={() => {
                    setIsScanning(false);
                    setFriendNotice('Não foi possível iniciar a câmera.');
                    toast.error('Não foi possível iniciar a câmera.');
                  }}
                  onBarcodeScanned={({ data }) => {
                    if (scanHandled.current) return;
                    scanHandled.current = true;
                    const invite = parseProfileLink(data);
                    if (!invite) {
                      setIsScanning(false);
                      setFriendNotice('Este QR Code não é um convite do Everquest.');
                      toast.error('Este QR Code não é um convite do Everquest.');
                      return;
                    }
                    setIsScanning(false);
                    setAddFriendQuery(data);
                  }}
                />
              </View>
            ) : (
            <>
            <View style={styles.friendsSearchBarWrapper}>
              {!!friendNotice && <Text style={styles.friendNotice}>{friendNotice}</Text>}
              <View style={styles.friendsSearchInputBox}>
                <SearchLensIcon size={18} color="#7C8292" />
                <TextInput
                  style={styles.friendsSearchInput}
                  placeholder="Busque um usuário ou cole um convite"
                  placeholderTextColor="#959BA8"
                  value={addFriendQuery}
                  onChangeText={setAddFriendQuery}
                  autoCapitalize="none"
                />
                {addFriendQuery.trim().length > 0 ? (
                  <TouchableOpacity
                    style={styles.addByUsernameQuickBtn}
                    activeOpacity={0.85}
                    disabled={isSubmittingFriend}
                    onPress={() =>
                      handleAddFriend({ friendUsername: addFriendQuery.trim() })
                    }
                  >
                    <Text style={styles.addByUsernameQuickBtnText}>
                      Adicionar
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity style={styles.scanButton} onPress={openScanner} accessibilityRole="button">
                <Text style={styles.addCandidateBtnText}>Ler QR Code</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.insigniasScroll}
              contentContainerStyle={styles.friendsListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.directorySectionLabel}>PEDIDOS PENDENTES ({pendingRequests.length})</Text>
              {requestsError ? (
                <View style={styles.friendsEmptyBox}>
                  <Text style={styles.friendsEmptySub}>{requestsError}</Text>
                  <TouchableOpacity onPress={() => setRequestsRevision((revision) => revision + 1)} accessibilityRole="button">
                    <Text style={styles.friendLevelBadgeText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              ) : pendingRequests.length === 0 ? (
                <Text style={styles.pendingEmpty}>Nenhum pedido pendente.</Text>
              ) : (
                <View style={styles.friendsListCardGroup}>
                  {pendingRequests.map((request) => (
                    <View key={request.id} style={styles.friendListItemRow}>
                      <View style={styles.friendAvatarCircle}>
                        <CharacterAvatar config={request.user.avatarConfig} width={52} height={52} cropToWaist />
                      </View>
                      <View style={styles.friendInfoBody}>
                        <Text style={styles.friendCharacterName}>{request.user.characterName}</Text>
                        <Text style={styles.friendUsernameText}>{request.user.username}</Text>
                      </View>
                      <TouchableOpacity style={styles.addCandidateBtn} disabled={isSubmittingFriend} onPress={() => handleAcceptFriend(request)} accessibilityRole="button" accessibilityLabel={`Aceitar pedido de ${request.user.characterName}`}>
                        <Text style={styles.addCandidateBtnText}>Aceitar</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.directorySectionLabel}>
                AVENTUREIROS
              </Text>

              {directoryUsers.length === 0 ? (
                <View style={styles.friendsEmptyBox}>
                  <Text style={styles.friendsEmptyTitle}>
                    Nenhum usuário listado com esse filtro
                  </Text>
                  <Text style={styles.friendsEmptySub}>
                    Busque pelo nome de usuário ou cole um link de convite.
                  </Text>
                </View>
              ) : (
                <View style={styles.friendsListCardGroup}>
                  {directoryUsers.map((candidate, index) => {
                    const isLast = index === directoryUsers.length - 1;
                    return (
                      <View
                        key={candidate.id}
                        style={[
                          styles.friendListItemRow,
                          !isLast && styles.friendListItemDivider,
                        ]}
                      >
                        <View style={styles.friendAvatarCircle}>
                          <CharacterAvatar
                            config={candidate.avatarConfig}
                            width={52}
                            height={52}
                            cropToWaist={true}
                          />
                        </View>

                        <View style={styles.friendInfoBody}>
                          <Text style={styles.friendCharacterName}>
                            {candidate.characterName}
                          </Text>
                          <Text style={styles.friendUsernameText}>
                            {candidate.username} · Lv. {candidate.level}
                          </Text>
                        </View>

                        {candidate.isFriend || outgoingIds.includes(candidate.id) || pendingRequests.some((request) => request.user.id === candidate.id) ? (
                          <View style={styles.alreadyFriendPill}>
                            <Text style={styles.alreadyFriendPillText}>
                              {candidate.isFriend ? 'Amigo ✓' : outgoingIds.includes(candidate.id) ? 'Enviado' : 'Pendente'}
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addCandidateBtn}
                            activeOpacity={0.85}
                            disabled={isSubmittingFriend}
                            onPress={() =>
                              handleAddFriend({
                                friendId: candidate.id,
                                friendUsername: candidate.username,
                              })
                            }
                          >
                            <Text style={styles.addCandidateBtnText}>
                              + Adicionar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
            </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
  },
  qrClose: { alignSelf: 'flex-end', padding: 4 },
  qrAvatar: {
    backgroundColor: '#C6D9FF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  qrCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  qrIdentity: { flex: 1 },
  qrName: { fontSize: 24, fontWeight: '800', color: colors.isDark ? colors.text : '#222123' },
  qrHandle: { fontSize: 14, color: colors.isDark ? colors.secondary : '#7A8090', marginVertical: 5 },
  qrLink: { fontSize: 11, color: colors.isDark ? colors.secondary : '#7A8090', marginTop: 8 },
  qrShare: { backgroundColor: '#7153FD', padding: 12, borderRadius: 10, alignItems: 'center', marginVertical: 12 },
  inviteCard: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
  pendingEmpty: { color: colors.isDark ? colors.secondary : '#7A8090', marginBottom: 20 },
  pendingRefresh: { color: colors.accent, marginBottom: 12, fontWeight: '700' },
  friendNotice: { color: colors.isDark ? colors.text : '#2B2E3B', marginBottom: 8 },
  scanButton: { backgroundColor: '#7153FD', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  scannerContainer: { flex: 1, padding: 20 },
  scannerText: { color: colors.isDark ? colors.text : '#222123', marginBottom: 12, textAlign: 'center' },
  scannerCamera: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  levelProgressContainer: {
    width: '100%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.isDark ? colors.border : '#E5DEFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadgePill: {
    backgroundColor: '#000C56',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  levelTotalXpHint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.isDark ? colors.secondary : '#6E688F',
  },
  levelXpCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelXpCounterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5B3DF5',
  },
  levelBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.isDark ? colors.elevated : '#E2DCFA',
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7153FD',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  handleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.isDark ? colors.secondary : '#7A7A7A',
  },
  friendsCountButton: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    backgroundColor: colors.isDark ? colors.elevated : '#F4F2FF',
    borderWidth: 1,
    borderColor: colors.isDark ? colors.border : '#E1DAFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  friendsCountNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  friendsCountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  friendsSearchBarWrapper: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 6,
  },
  friendsSearchInputBox: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.isDark ? colors.border : '#E3E5EE',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendsSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.isDark ? colors.text : '#1C1E26',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  friendsSearchClearBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  friendsListContent: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
  },
  friendsListCardGroup: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.isDark ? colors.border : '#E6E8F0',
    overflow: 'hidden',
  },
  friendListItemRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  friendListItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFF0F6',
  },
  friendAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000C56',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  friendInfoBody: {
    flex: 1,
    gap: 2,
  },
  friendCharacterName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.isDark ? colors.text : '#1B1D26',
  },
  friendUsernameText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.isDark ? colors.secondary : '#7A8090',
  },
  friendLevelBadge: {
    backgroundColor: colors.isDark ? colors.elevated : '#F3F0FF',
    borderWidth: 1,
    borderColor: colors.isDark ? colors.border : '#DDD4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  friendLevelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  friendsEmptyBox: {
    width: '100%',
    paddingVertical: 38,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.isDark ? colors.border : '#E6E8F0',
    alignItems: 'center',
  },
  friendsEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.isDark ? colors.text : '#2B2E3B',
    marginBottom: 4,
  },
  friendsEmptySub: {
    fontSize: 13,
    color: colors.isDark ? colors.secondary : '#7A8090',
    textAlign: 'center',
  },
  friendsHeaderAddShortcut: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  friendRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.isDark ? colors.elevated : '#F4F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  addByUsernameQuickBtn: {
    backgroundColor: '#000C56',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  addByUsernameQuickBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  directorySectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.isDark ? colors.secondary : '#7A8090',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  alreadyFriendPill: {
    backgroundColor: '#EBF8F0',
    borderWidth: 1,
    borderColor: '#BDE5CC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  alreadyFriendPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#237A48',
  },
  addCandidateBtn: {
    backgroundColor: '#7153FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  addCandidateBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  friendsActionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
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
    marginBottom: 14,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  achievementsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.isDark ? colors.text : '#1E1E1E',
    letterSpacing: 0.3,
  },
  viewAllActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
    marginBottom: 8,
  },
  emptyAchievementsBox: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.isDark ? colors.elevated : '#FAF9FE',
    borderWidth: 1,
    borderColor: colors.isDark ? colors.border : '#E8E4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyAchievementsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.isDark ? colors.secondary : '#7C8292',
    textAlign: 'center',
  },
  profileBadgeItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  dailyQuestsSection: {
    width: '100%',
    marginBottom: 26,
  },
  dailyQuestsHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dailyQuestsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.isDark ? colors.text : '#1E1E1E',
    letterSpacing: 0.3,
  },
  dailyQuestsGroupBox: {
    width: '100%',
    backgroundColor: colors.isDark ? colors.elevated : '#FAF9FE',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.isDark ? colors.border : '#E5E1F8',
    overflow: 'hidden',
  },
  dailyQuestRowItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  dailyQuestRowWithDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EAE6F8',
  },
  dailyQuestCardClaimed: {
    opacity: 0.72,
    backgroundColor: colors.isDark ? colors.elevated : '#F3F4F7',
  },
  questChestBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questCenterBody: {
    flex: 1,
    gap: 6,
  },
  questTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  questRewardsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questRewardChipCoin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF6D6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  questRewardChipCoinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9C6512',
  },
  questRewardChipXp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.isDark ? colors.elevated : '#EFEAFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  questRewardChipXpText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6344F5',
  },
  questTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.isDark ? colors.text : '#1C1E26',
    lineHeight: 19,
  },
  questTitleTextClaimed: {
    color: colors.isDark ? colors.secondary : '#737987',
    textDecorationLine: 'line-through',
  },
  questBottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  questProgressTrackWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  questProgressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.isDark ? colors.elevated : '#E5E7EE',
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  questProgressCounter: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.isDark ? colors.secondary : '#686F7E',
  },
  questClaimButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  questClaimButtonPending: {
    backgroundColor: colors.isDark ? colors.elevated : '#EDEBF7',
    borderWidth: 1,
    borderColor: colors.isDark ? colors.border : '#DDD6F5',
    ...(Platform.OS === 'web' ? { cursor: 'default' } : {}),
  },
  questClaimButtonReady: {
    backgroundColor: '#7153FD',
  },
  questClaimButtonDone: {
    backgroundColor: colors.isDark ? colors.elevated : '#E2E5EC',
    ...(Platform.OS === 'web' ? { cursor: 'default' } : {}),
  },
  questClaimButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  questClaimButtonTextPending: {
    color: colors.isDark ? colors.secondary : '#6E688F',
  },
  questClaimButtonTextDone: {
    color: colors.isDark ? colors.secondary : '#6A7180',
  },
  navbarWrapper: {
    width: '100%',
  },

  /* Modal: Todas as Insígnias */
  modalScreenRoot: {
    flex: 1,
    backgroundColor: colors.isDark ? colors.elevated : '#FAF8F6',
    alignItems: 'center',
  },
  modalMobileFrame: {
    flex: 1,
    backgroundColor: colors.isDark ? colors.elevated : '#FAF8F6',
  },
  insigniasScroll: {
    flex: 1,
    width: '100%',
  },
  insigniasGridContent: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 36,
  },
  insigniasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 18,
    rowGap: 26,
  },
  insigniaGridCard: {
    width: 108,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  insigniaIconHolder: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insigniaIconHolderLocked: {
    opacity: 0.55,
    ...(Platform.OS === 'web' ? { filter: 'grayscale(100%)' } : {}),
  },
  insigniaGridLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.isDark ? colors.text : '#1E1E1E',
    textAlign: 'center',
    lineHeight: 17,
  },
  insigniaGridLabelLocked: {
    color: colors.isDark ? colors.secondary : '#8D93A2',
  },

  /* Modal: Visualização Expandida da Badge */
  expandedBadgeFrame: {
    flex: 1,
    backgroundColor: colors.isDark ? colors.elevated : '#FAF8F6',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 36,
  },
  expandedTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  expandedCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  expandedCenterContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: -24,
  },
  expandedBadgeArtwork: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  expandedDatePill: {
    backgroundColor: '#000C56',
    paddingVertical: 12,
    paddingHorizontal: 34,
    borderRadius: 12,
    marginBottom: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedDatePillLocked: {
    backgroundColor: '#8D93A2',
  },
  expandedDateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  expandedDescriptionText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.isDark ? colors.text : '#1A1A1A',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  expandedBadgeTitleBold: {
    fontWeight: '900',
    color: colors.isDark ? colors.text : '#1A1A1A',
  },
});
