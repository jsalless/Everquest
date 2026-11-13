import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import CharacterAvatar, {
  DEFAULT_AVATAR_CONFIG,
  RACE_OPTIONS,
  HUMAN_SKIN_COLORS,
  HAIR_OPTIONS,
  HAIR_COLORS,
  EYES_OPTIONS,
  SHIRT_OPTIONS,
  SHIRT_COLORS,
  PANTS_OPTIONS,
  PANTS_COLORS,
  SHOES_OPTIONS,
  SHOES_COLORS,
  loadSavedAvatar,
  saveAvatarConfig,
} from '../components/CharacterAvatar';
import { toast } from '../utils/toast';

const CATEGORIES = [
  { id: 'race', label: 'Raça' },
  { id: 'hair', label: 'Cabelo' },
  { id: 'eyes', label: 'Olhos' },
  { id: 'shirt', label: 'Camisa' },
  { id: 'pants', label: 'Calça' },
  { id: 'shoes', label: 'Calçado' },
];

function CategoryIcon({ categoryId, active }) {
  const color = active ? '#FBA0FE' : '#7B72A6';

  if (categoryId === 'race') {
    return (
      <Svg width={24} height={24} viewBox="0 0 28 28" fill="none">
        <Circle cx="14" cy="8.5" r="4.5" stroke={color} strokeWidth="2.2" />
        <Path
          d="M 6.5 23.5 C 6.5 18.2 9.8 15.5 14 15.5 C 18.2 15.5 21.5 18.2 21.5 23.5"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (categoryId === 'hair') {
    // Ícone de pente (igual ao 3º ícone da imagem 1)
    return (
      <Svg width={24} height={24} viewBox="0 0 28 28" fill="none">
        <Path
          d="M 6 10 C 6 7.8 7.8 6 10 6 H 21 C 22.1 6 23 6.9 23 8 V 11 H 6 V 10 Z"
          stroke={color}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <Path
          d="M 8 11 V 20 M 12 11 V 20 M 16 11 V 20 M 20 11 V 20"
          stroke={color}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (categoryId === 'eyes') {
    return (
      <Svg width={24} height={24} viewBox="0 0 28 28" fill="none">
        <Circle cx="9.5" cy="11" r="3.4" stroke={color} strokeWidth="2.2" />
        <Circle cx="18.5" cy="11" r="3.4" stroke={color} strokeWidth="2.2" />
        <Circle cx="9.5" cy="11" r="1.2" fill={color} />
        <Circle cx="18.5" cy="11" r="1.2" fill={color} />
        <Path
          d="M 10.5 19.5 Q 14 22.5 17.5 19.5"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (categoryId === 'shirt') {
    return (
      <Svg width={24} height={24} viewBox="0 0 28 28" fill="none">
        <Path
          d="M 9.5 6.5 L 5 10.5 L 7.8 14 L 9.5 12.2 V 22 H 18.5 V 12.2 L 20.2 14 L 23 10.5 L 18.5 6.5 Q 14 9.5 9.5 6.5 Z"
          stroke={color}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (categoryId === 'pants') {
    return (
      <Svg width={24} height={24} viewBox="0 0 28 28" fill="none">
        <Path
          d="M 8.5 6.5 H 19.5 L 20.5 22.5 H 15.8 L 14 13.5 L 12.2 22.5 H 7.5 L 8.5 6.5 Z"
          stroke={color}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <Rect
          x="8.5"
          y="6.5"
          width="11"
          height="3.2"
          stroke={color}
          strokeWidth="1.8"
        />
      </Svg>
    );
  }

  // Calçado
  return (
    <Svg width={24} height={24} viewBox="0 0 28 28" fill="none">
      <Path
        d="M 5 18.5 C 5 15 8.5 14 11.5 14 L 14 10 H 19.5 L 21 16.5 C 22.5 17 23.5 18 23.5 20.5 H 5 V 18.5 Z"
        stroke={color}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function CharacterCreationScreen({
  initialConfig,
  onComplete,
  isEditing = false,
  onCancel,
}) {
  const [avatarConfig, setAvatarConfig] = useState(() => {
    const saved = initialConfig || loadSavedAvatar() || DEFAULT_AVATAR_CONFIG;
    return {
      ...DEFAULT_AVATAR_CONFIG,
      ...saved,
      characterName: isEditing ? saved.characterName || 'Johnn' : '',
    };
  });
  const [activeCategory, setActiveCategory] = useState('race');
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);

  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);

  const handleSelectField = (field, value) => {
    setAvatarConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOpenNameStep = () => {
    setIsNameModalVisible(true);
  };

  const handleConfirmCharacter = () => {
    const cleanName = (avatarConfig.characterName || '').trim();
    if (!cleanName) {
      toast.warn('Escolha um nome para o seu personagem antes de continuar!');
      return;
    }

    const finalConfig = {
      ...avatarConfig,
      characterName: cleanName,
    };
    const saved = saveAvatarConfig(finalConfig);
    setIsNameModalVisible(false);

    toast.success(
      isEditing
        ? `Personagem ${cleanName} atualizado!`
        : `Bem-vindo à jornada, ${cleanName}!`
    );

    if (onComplete) {
      onComplete(saved);
    }
  };

  const getCurrentSection = () => {
    switch (activeCategory) {
      case 'race':
        return {
          swatchTitle: avatarConfig.race === 'human' ? 'Tom de pele' : null,
          swatches:
            avatarConfig.race === 'human'
              ? HUMAN_SKIN_COLORS.map((c) => ({
                  id: c.id,
                  color: c.id,
                  selected: (avatarConfig.skinColor || '#D5896B') === c.id,
                  onSelect: () => handleSelectField('skinColor', c.id),
                }))
              : [],
          gridTitle: 'Raça',
          cards: RACE_OPTIONS.map((r) => ({
            id: r.id,
            name: r.name,
            selected: avatarConfig.race === r.id,
            previewConfig: { ...avatarConfig, race: r.id },
            onSelect: () => handleSelectField('race', r.id),
          })),
        };

      case 'hair':
        return {
          swatchTitle: 'Cor do cabelo',
          swatches: HAIR_COLORS.map((c) => ({
            id: c.id,
            color: c.id,
            selected: avatarConfig.hairColor === c.id,
            onSelect: () => handleSelectField('hairColor', c.id),
          })),
          gridTitle: 'Cabelo',
          cards: HAIR_OPTIONS.map((h) => ({
            id: h.id,
            name: h.name,
            selected: avatarConfig.hair === h.id,
            previewConfig: { ...avatarConfig, hair: h.id },
            onSelect: () => handleSelectField('hair', h.id),
          })),
        };

      case 'eyes':
        return {
          swatchTitle: null,
          swatches: [],
          gridTitle: 'Olhos',
          cards: EYES_OPTIONS.map((e) => ({
            id: e.id,
            name: e.name,
            selected: avatarConfig.eyes === e.id,
            previewConfig: { ...avatarConfig, eyes: e.id },
            onSelect: () => handleSelectField('eyes', e.id),
          })),
        };

      case 'shirt':
        return {
          swatchTitle: 'Cor da camisa',
          swatches: SHIRT_COLORS.map((c) => ({
            id: c.id,
            color: c.id,
            selected: avatarConfig.shirtColor === c.id,
            onSelect: () => handleSelectField('shirtColor', c.id),
          })),
          gridTitle: 'Camisa',
          cards: SHIRT_OPTIONS.map((s) => ({
            id: s.id,
            name: s.name,
            selected: avatarConfig.shirt === s.id,
            previewConfig: { ...avatarConfig, shirt: s.id },
            onSelect: () => handleSelectField('shirt', s.id),
          })),
        };

      case 'pants':
        return {
          swatchTitle: 'Cor da calça',
          swatches: PANTS_COLORS.map((c) => ({
            id: c.id,
            color: c.id,
            secondaryColor: '#FFEF64',
            selected: avatarConfig.pantsColor === c.id,
            onSelect: () => handleSelectField('pantsColor', c.id),
          })),
          gridTitle: 'Calça',
          cards: PANTS_OPTIONS.map((p) => ({
            id: p.id,
            name: p.name,
            selected: avatarConfig.pants === p.id,
            previewConfig: { ...avatarConfig, pants: p.id },
            onSelect: () => handleSelectField('pants', p.id),
          })),
        };

      case 'shoes':
      default:
        return {
          swatchTitle: 'Cor do calçado',
          swatches: SHOES_COLORS.map((c) => ({
            id: c.id,
            color: c.id,
            selected: avatarConfig.shoesColor === c.id,
            onSelect: () => handleSelectField('shoesColor', c.id),
          })),
          gridTitle: 'Calçado',
          cards: SHOES_OPTIONS.map((sh) => ({
            id: sh.id,
            name: sh.name,
            selected: avatarConfig.shoes === sh.id,
            previewConfig: { ...avatarConfig, shoes: sh.id },
            onSelect: () => handleSelectField('shoes', sh.id),
          })),
        };
    }
  };

  const section = getCurrentSection();

  return (
    <View style={styles.root}>
      <View style={[styles.mobileFrame, { width: containerWidth }]}>
        {/* Topo: Palco com Preview ao Vivo do Personagem (#000C56) */}
        <View style={styles.avatarStage}>
          <View style={styles.stageTopBar}>
            {isEditing && onCancel ? (
              <TouchableOpacity
                style={styles.cancelHeaderBtn}
                activeOpacity={0.8}
                onPress={onCancel}
              >
                <Text style={styles.cancelHeaderBtnText}>Voltar</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSpacer} />
            )}

            <Text style={styles.stageHeaderTitle}>Criar Personagem</Text>

            <TouchableOpacity
              style={styles.doneHeaderBtn}
              activeOpacity={0.85}
              onPress={handleOpenNameStep}
            >
              <Text style={styles.doneHeaderBtnText}>Avançar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.avatarPreviewHolder}>
            <CharacterAvatar
              config={avatarConfig}
              width={220}
              height={240}
              cropToWaist={false}
            />
          </View>
        </View>

        {/* Barra de Categorias dos Assets */}
        <View style={styles.categoryBar}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryTab,
                  isActive && styles.categoryTabActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveCategory(cat.id)}
              >
                <CategoryIcon categoryId={cat.id} active={isActive} />
                <Text
                  style={[
                    styles.categoryTabText,
                    isActive && styles.categoryTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Painel Inferior de Opções */}
        <ScrollView
          style={styles.optionsScroll}
          contentContainerStyle={styles.optionsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {section.swatchTitle && section.swatches.length > 0 ? (
            <>
              <Text style={styles.sectionHeading}>{section.swatchTitle}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.swatchesRow}
              >
                {section.swatches.map((sw) => (
                  <TouchableOpacity
                    key={`sw-${sw.id}`}
                    activeOpacity={0.85}
                    onPress={sw.onSelect}
                    style={[
                      styles.swatchOuterBox,
                      sw.selected && styles.swatchOuterBoxActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.swatchInnerColor,
                        { backgroundColor: sw.color },
                      ]}
                    >
                      {sw.secondaryColor ? (
                        <View
                          style={[
                            styles.swatchBeltStripe,
                            { backgroundColor: sw.secondaryColor },
                          ]}
                        />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.sectionHeading}>{section.gridTitle}</Text>
          <View style={styles.cardsGrid}>
            {section.cards.map((card) => (
              <TouchableOpacity
                key={`card-${card.id}`}
                activeOpacity={0.85}
                onPress={card.onSelect}
                style={[
                  styles.previewCard,
                  card.selected && styles.previewCardActive,
                ]}
              >
                <View style={styles.cardAvatarViewport}>
                  <CharacterAvatar
                    config={card.previewConfig}
                    width={126}
                    height={142}
                    cropToWaist={false}
                  />
                </View>
                <View
                  style={[
                    styles.cardFooterLabelBox,
                    card.selected && styles.cardFooterLabelBoxActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cardFooterLabel,
                      card.selected && styles.cardFooterLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {card.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Modal Final: Dar um Nome para o Personagem (ex.: Johnn) */}
      <Modal
        visible={isNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNameModalVisible(false)}
      >
        <View style={styles.nameModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsNameModalVisible(false)}
          />

          <View
            style={[
              styles.nameModalCard,
              { width: Math.min(containerWidth - 36, 370) },
            ]}
          >
            <View style={styles.nameModalAvatarCircle}>
              <CharacterAvatar
                config={avatarConfig}
                width={136}
                height={136}
                cropToWaist={true}
              />
            </View>

            <Text style={styles.nameModalTitle}>
              Qual será o nome do seu personagem?
            </Text>
            <Text style={styles.nameModalSubtitle}>
              Esse nome aparecerá em destaque no topo do seu perfil.
            </Text>

            <TextInput
              style={styles.nameTextInput}
              placeholder="Ex.: Johnn"
              placeholderTextColor="#8B82B8"
              value={avatarConfig.characterName}
              onChangeText={(txt) => handleSelectField('characterName', txt)}
              maxLength={24}
              autoFocus
            />

            <View style={styles.nameModalActions}>
              <TouchableOpacity
                style={styles.nameModalBackBtn}
                activeOpacity={0.8}
                onPress={() => setIsNameModalVisible(false)}
              >
                <Text style={styles.nameModalBackBtnText}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nameModalConfirmBtn}
                activeOpacity={0.88}
                onPress={handleConfirmCharacter}
              >
                <Text style={styles.nameModalConfirmBtnText}>
                  {isEditing ? 'Salvar' : 'Concluir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000836',
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    backgroundColor: '#040C3E',
  },
  avatarStage: {
    width: '100%',
    backgroundColor: '#000C56',
    paddingTop: 18,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stageTopBar: {
    width: '100%',
    paddingHorizontal: 18,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 68,
  },
  cancelHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  cancelHeaderBtnText: {
    color: '#EAE4FF',
    fontSize: 13,
    fontWeight: '700',
  },
  stageHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  doneHeaderBtn: {
    backgroundColor: '#7153FD',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  doneHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  avatarPreviewHolder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  categoryBar: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#081252',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(113, 83, 253, 0.28)',
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 2,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  categoryTabActive: {
    borderBottomColor: '#FBA0FE',
    backgroundColor: 'rgba(251, 160, 254, 0.08)',
  },
  categoryTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7B72A6',
  },
  categoryTabTextActive: {
    color: '#FBA0FE',
    fontWeight: '800',
  },
  optionsScroll: {
    flex: 1,
    backgroundColor: '#050E42',
  },
  optionsScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 22,
  },
  swatchOuterBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: 'rgba(123, 114, 166, 0.45)',
    backgroundColor: '#0A165C',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  swatchOuterBoxActive: {
    borderColor: '#FBA0FE',
    backgroundColor: 'rgba(251, 160, 254, 0.16)',
  },
  swatchInnerColor: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  swatchBeltStripe: {
    width: '100%',
    height: 9,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginBottom: 24,
  },
  previewCard: {
    width: '48%',
    backgroundColor: '#0A165C',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: 'rgba(123, 114, 166, 0.38)',
    overflow: 'hidden',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  previewCardActive: {
    borderColor: '#FBA0FE',
    backgroundColor: '#101F78',
  },
  cardAvatarViewport: {
    width: '100%',
    height: 144,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    overflow: 'hidden',
  },
  cardFooterLabelBox: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 12, 86, 0.55)',
    alignItems: 'center',
  },
  cardFooterLabelBoxActive: {
    backgroundColor: 'rgba(251, 160, 254, 0.22)',
  },
  cardFooterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D3CCFF',
  },
  cardFooterLabelActive: {
    color: '#FBA0FE',
    fontWeight: '900',
  },
  bottomFinishButton: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: '#7153FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  bottomFinishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  /* Modal de Nome do Personagem */
  nameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 8, 54, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  nameModalCard: {
    backgroundColor: '#EAE4FF',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000C56',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  nameModalAvatarCircle: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: '#000C56',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#7153FD',
  },
  nameModalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#000C56',
    textAlign: 'center',
    marginBottom: 6,
  },
  nameModalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E4679',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  nameTextInput: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#7153FD',
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800',
    color: '#000C56',
    textAlign: 'center',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  nameModalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  nameModalBackBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 12, 86, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  nameModalBackBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000C56',
  },
  nameModalConfirmBtn: {
    flex: 1.4,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#7153FD',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  nameModalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
