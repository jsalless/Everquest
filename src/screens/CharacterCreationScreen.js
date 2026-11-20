import { usePreferences } from '../contexts/PreferencesContext';
import React, { useEffect, useRef, useState } from 'react';
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
  normalizeHair,
  HAIR_COLORS,
  EYES_OPTIONS,
  EYE_COLORS,
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
import { catalog } from '../services/shopService';
import { AVATAR_STAT_LABELS, formatEquipmentBonuses, getAvatarStats, STARTER_EQUIPMENT } from '../services/avatarEquipment';

const APPEARANCE_CATEGORIES = [
  { id: 'race', label: 'Raça' },
  { id: 'hair', label: 'Cabelo' },
  { id: 'eyes', label: 'Olhos' },
];
const EQUIPMENT_CATEGORIES = [
  { id: 'head', label: 'Cabeça' },
  { id: 'shirt', label: 'Torso' },
  { id: 'pants', label: 'Pernas' },
  { id: 'shoes', label: 'Pés' },
  { id: 'weapon', label: 'Arma' },
];

function CategoryIcon({ categoryId, active }) {
  const color = active ? '#FBA0FE' : '#7B72A6';

  if (categoryId === 'head' || categoryId === 'weapon') {
    return (
      <Svg width={24} height={24} viewBox="0 0 28 28" fill="none">
        <Path
          d={categoryId === 'head'
            ? 'M 7 15 L 10 7 Q 14 4 18 7 L 21 15 M 14 14 C 27 14 27 22 14 22 C 1 22 1 14 14 14 Z'
            : 'M 11 15 L 18 6 L 23 5 L 22 10 L 13 17 M 9 13 L 15 19 M 12 16 L 6 22'}
          stroke={color}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

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
  initialCategory,
  loadWardrobe,
  shopToken,
  onSave,
  onComplete,
  isEditing = false,
  onCancel,
}) {
  const { colors } = usePreferences();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [avatarConfig, setAvatarConfig] = useState(() => {
    const saved = initialConfig || loadSavedAvatar() || DEFAULT_AVATAR_CONFIG;
    return {
      ...DEFAULT_AVATAR_CONFIG,
      ...saved,
      hair: normalizeHair(saved.hair),
      characterName: isEditing ? saved.characterName || 'Johnn' : '',
    };
  });
  const [activeCategory, setActiveCategory] = useState(() =>
    [...APPEARANCE_CATEGORIES, ...EQUIPMENT_CATEGORIES].some(({ id }) => id === initialCategory)
      ? initialCategory
      : 'race'
  );
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [ownedItems, setOwnedItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    if (!loadWardrobe) return undefined;
    const controller = new AbortController();
    loadWardrobe(shopToken, controller.signal)
      .then(({ ownedItemIds }) => {
        if (!controller.signal.aborted) setOwnedItems(ownedItemIds);
      })
      .catch((error) => {
        if (!controller.signal.aborted) toast.error(error.message);
      });
    return () => controller.abort();
  }, [loadWardrobe, shopToken]);

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

  const handleConfirmCharacter = async () => {
    if (saving.current) return;
    const cleanName = (avatarConfig.characterName || '').trim();
    if (!cleanName) {
      toast.warn('Escolha um nome para o seu personagem antes de continuar!');
      return;
    }

    const finalConfig = {
      ...avatarConfig,
      characterName: cleanName,
    };
    saving.current = true;
    setIsSaving(true);
    let saved;
    try {
      const savedConfig = onSave ? await onSave(shopToken, finalConfig) : finalConfig;
      saved = saveAvatarConfig(savedConfig);
    } catch (error) {
      toast.error(error.message);
      return;
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
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

  const equipmentSection = (slot, title, options, colors = [], swatchTitle, secondaryColor) => {
    const colorField = `${slot}Color`;
    const starter = STARTER_EQUIPMENT.filter((item) => item.slot === slot && item.id !== 'head-traveler');
    const owned = catalog.filter((item) => item.slot === slot && (ownedItems.includes(item.id) || avatarConfig[slot] === item.id));
    return {
      swatchTitle,
      swatches: options.some(({ id }) => id === avatarConfig[slot]) ? colors.map((color) => ({
        id: color.id,
        color: color.id,
        secondaryColor,
        selected: avatarConfig[colorField] === color.id,
        onSelect: () => handleSelectField(colorField, color.id),
      })) : [],
      gridTitle: title,
      cards: [...options, ...starter, ...owned].map(({ id, name, stats }) => ({
        id,
        name,
        bonuses: formatEquipmentBonuses(stats).join(' · '),
        selected: avatarConfig[slot] === id,
        previewConfig: { ...avatarConfig, [slot]: id },
        onSelect: () => handleSelectField(slot, id),
      })),
    };
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
          swatchTitle: 'Cor dos olhos',
          swatches: EYE_COLORS.map((c) => ({
            id: c.id,
            label: c.label,
            color: c.id,
            selected: avatarConfig.eyeColor === c.id,
            onSelect: () => handleSelectField('eyeColor', c.id),
          })),
          gridTitle: 'Olhos',
          cards: EYES_OPTIONS.map((e) => ({
            id: e.id,
            name: e.name,
            selected: avatarConfig.eyes === e.id,
            previewConfig: { ...avatarConfig, eyes: e.id },
            onSelect: () => handleSelectField('eyes', e.id),
          })),
        };

      case 'head':
        return equipmentSection('head', 'Equipamentos de cabeça', [
          { id: 'none', name: 'Sem equipamento' },
          { id: 'helmet2', name: 'Chapéu Arcano' },
          { id: 'helmet3', name: 'Óculos de Aventureiro' },
        ]);

      case 'shirt':
        return equipmentSection('shirt', 'Equipamentos de torso', SHIRT_OPTIONS, SHIRT_COLORS, 'Cor da camisa');
      case 'pants':
        return equipmentSection('pants', 'Equipamentos de pernas', PANTS_OPTIONS, PANTS_COLORS, 'Cor da bermuda', '#F1C8B2');

      case 'weapon':
        return equipmentSection('weapon', 'Armas', [{ id: 'none', name: 'Sem arma' }]);
      case 'shoes':
      default:
        return equipmentSection('shoes', 'Equipamentos de pés', SHOES_OPTIONS, SHOES_COLORS, 'Cor do calçado');
    }
  };

  const section = getCurrentSection();
  const stats = getAvatarStats(avatarConfig);
  const equipmentActive = EQUIPMENT_CATEGORIES.some(({ id }) => id === activeCategory);
  const categories = equipmentActive ? EQUIPMENT_CATEGORIES : APPEARANCE_CATEGORIES;

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

            <Text style={styles.stageHeaderTitle}>{isEditing ? 'Personalizar' : 'Criar Personagem'}</Text>

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
              height={192}
              cropToWaist={false}
            />
          </View>
          <View style={styles.statsPanel}>
            <Text style={styles.statsHeading} accessibilityRole="header">Atributos do personagem</Text>
            <View style={styles.statsRow}>
              {AVATAR_STAT_LABELS.map(({ id, label, color }) => (
                <View key={id} style={styles.statTile} accessible accessibilityLabel={`${label}: ${stats[id]}`}>
                  <Text style={[styles.statValue, { color }]}>{stats[id]}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sectionTabs}>
          {[{ label: 'Aparência', id: 'race', selected: !equipmentActive },
            { label: 'Equipamentos', id: 'head', selected: equipmentActive }].map(({ label, id, selected }) => (
            <TouchableOpacity
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.sectionTab, selected && styles.sectionTabActive]}
              onPress={() => !selected && setActiveCategory(id)}
            >
              <Text style={[styles.sectionTabText, selected && styles.categoryTabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.categoryBar}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
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
                    accessibilityRole="button"
                    accessibilityLabel={sw.label || sw.id}
                    accessibilityState={{ selected: sw.selected }}
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

          <Text style={styles.sectionHeading} accessibilityRole="header">{section.gridTitle}</Text>
          <View style={styles.cardsGrid}>
            {section.cards.map((card) => (
              <TouchableOpacity
                key={`card-${card.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: card.selected }}
                accessibilityLabel={card.bonuses ? `${card.name}, ${card.bonuses}` : card.name}
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
                  >
                    {card.name}
                  </Text>
                  {!!card.bonuses && <Text style={styles.cardBonus}>{card.bonuses}</Text>}
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
        onRequestClose={() => !saving.current && setIsNameModalVisible(false)}
      >
        <View style={styles.nameModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !saving.current && setIsNameModalVisible(false)}
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
              editable={!isSaving}
              onChangeText={(txt) => handleSelectField('characterName', txt)}
              maxLength={24}
              autoFocus
            />

            <View style={styles.nameModalActions}>
              <TouchableOpacity
                style={styles.nameModalBackBtn}
                disabled={isSaving}
                activeOpacity={0.8}
                onPress={() => setIsNameModalVisible(false)}
              >
                <Text style={styles.nameModalBackBtnText}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nameModalConfirmBtn}
                disabled={isSaving}
                activeOpacity={0.88}
                onPress={handleConfirmCharacter}
              >
                <Text style={styles.nameModalConfirmBtnText}>
                  {isSaving ? 'Salvando…' : isEditing ? 'Salvar' : 'Concluir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
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
  statsPanel: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  statsHeading: {
    color: '#D3CCFF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  statsRow: { flexDirection: 'row', gap: 5 },
  statTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111A6A',
    borderRadius: 10,
    paddingVertical: 5,
    borderColor: '#4C4D91',
    borderWidth: 1,
  },
  statValue: { fontSize: 19, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#E4DEFF', textAlign: 'center' },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#050E42',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sectionTab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#38366F',
  },
  sectionTabActive: { backgroundColor: '#1C215F', borderColor: '#C57BE9' },
  sectionTabText: { color: '#D3CCFF', fontSize: 13, fontWeight: '800' },
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
    textAlign: 'center',
  },
  cardBonus: { color: '#A8D9FF', fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' },
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
    backgroundColor: colors.isDark ? colors.elevated : '#EAE4FF',
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
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  nameModalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.isDark ? colors.secondary : '#4E4679',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  nameTextInput: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: '#7153FD',
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
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
    color: colors.text,
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
