import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Navbar from '../components/Navbar';
import { ForestArtwork, StoryIcon, TrailLandmark } from '../components/StoryArtwork';
import { usePreferences } from '../contexts/PreferencesContext';
import { completeStoryLevel, loadStoryProgress, STORY_LEVELS } from '../services/storyProgress';

const POSITIONS = [0.34, 0.53, 0.68, 0.55, 0.33, 0.47];
const ROW_HEIGHT = 105;
const NODE_SIZE = 64;

export default function StoryScreen({ userId, onChangeTab }) {
  const { colors } = usePreferences();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const mapWidth = Math.min(width, 430) - 32;
  const [completed, setCompleted] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [openedIndex, setOpenedIndex] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadStoryProgress(AsyncStorage, userId).then((value) => {
      if (active) setCompleted(value);
    }).catch(() => {
      if (active) setLoadError('Não foi possível carregar o progresso da história.');
    });
    return () => { active = false; };
  }, [userId, attempt]);

  const activeLevel = openedIndex === null ? null : STORY_LEVELS[openedIndex];
  const isReplay = activeLevel && openedIndex < completed;
  const chapterFinished = completed === STORY_LEVELS.length;
  const points = STORY_LEVELS.map((_, index) => ({
    x: mapWidth * POSITIONS[index % POSITIONS.length],
    y: (index + 0.5) * ROW_HEIGHT,
  }));
  const segment = (point, previous) => {
    const midpoint = (point.y + previous.y) / 2;
    return ` C${previous.x} ${midpoint} ${point.x} ${midpoint} ${point.x} ${point.y}`;
  };
  const path = `M${points[0].x} ${points[0].y}` + points.slice(1).map((point, index) => segment(point, points[index])).join('');

  const closeLevel = () => {
    if (!savingRef.current) setOpenedIndex(null);
  };

  const finishLevel = async () => {
    if (openedIndex !== completed || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      setCompleted(await completeStoryLevel(AsyncStorage, userId, openedIndex));
      setOpenedIndex(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.frame}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none"><ForestArtwork /></View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTag}>CAPÍTULO 01</Text>
              <Text style={styles.heroTitle} accessibilityRole="header">Floresta dos{'\n'}Sussurros</Text>
              <Text style={styles.heroDescription}>A jornada começa entre as árvores.</Text>
              {completed !== null && (
                <Text
                  style={styles.heroProgress}
                  accessibilityLabel={chapterFinished ? 'Capítulo concluído' : `${completed} de ${STORY_LEVELS.length} fases concluídas`}
                  accessibilityLiveRegion="polite"
                >
                  {chapterFinished ? 'Capítulo concluído' : `${completed}/${STORY_LEVELS.length} fases`}
                </Text>
              )}
            </View>
          </View>
          {completed === null ? (
            loadError ? (
              <View style={styles.notice}>
                <Text accessibilityRole="alert" style={styles.secondary}>{loadError}</Text>
                <Pressable accessibilityRole="button" onPress={() => { setLoadError(''); setAttempt((value) => value + 1); }}>
                  <Text style={styles.retry}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando fases" />
          ) : (
            <View style={styles.trail}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width={mapWidth} height={ROW_HEIGHT * STORY_LEVELS.length}>
                  <Path d={path} fill="none" stroke={styles.trailLine.color} strokeWidth="5" strokeDasharray="2 10" strokeLinecap="round" />
                </Svg>
              </View>
              <View style={[styles.landmark, styles.forestLandmark]} pointerEvents="none"><TrailLandmark kind="trees" color={styles.landmarkInk.color} /></View>
              <View style={[styles.landmark, styles.ruinsLandmark]} pointerEvents="none"><TrailLandmark kind="ruins" color={styles.landmarkInk.color} /></View>
              {STORY_LEVELS.map((level, index) => {
                const done = index < completed;
                const locked = index > completed;
                const current = index === completed;
                const chest = level.kind === 'chest';
                const x = points[index].x;
                const left = x > mapWidth / 2;
                const labelOffset = left ? { right: mapWidth - x + 44, left: 0 } : { left: x + 44, right: 0 };
                const icon = done ? 'check' : locked && !chest ? 'lock' : level.kind;
                return (
                  <Pressable
                    key={level.title}
                    accessibilityRole="button"
                    accessibilityLabel={`Fase ${index + 1}: ${level.title}, ${done ? 'concluída' : locked ? 'bloqueada' : 'disponível'}`}
                    accessibilityState={{ disabled: locked }}
                    disabled={locked}
                    style={styles.levelRow}
                    onPress={() => { setSaveError(''); setOpenedIndex(index); }}
                  >
                    {({ pressed }) => (
                      <>
                        <View style={[styles.node, { left: x - NODE_SIZE / 2 }, done && styles.doneNode, current && styles.currentNode, chest && !done && (current ? styles.chestNode : styles.lockedChest), pressed && styles.pressed]}>
                          <StoryIcon kind={icon} color={done ? '#603C00' : current ? '#FFFFFF' : styles.lockInk.color} />
                        </View>
                        <View style={[styles.levelCopy, labelOffset, left && styles.levelCopyLeft]}>
                          <Text style={[styles.levelTag, current && styles.activeTag]}>{current ? 'JOGAR AGORA' : chest ? 'BAÚ DA HISTÓRIA' : `FASE ${String(index + 1).padStart(2, '0')}`}</Text>
                          <Text style={[styles.levelTitle, locked && styles.secondary]}>{level.title}</Text>
                        </View>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
        <Navbar activeTab="map" onChangeTab={onChangeTab} />
      </View>

      <Modal visible={!!activeLevel} onRequestClose={closeLevel} transparent animationType="fade">
        {activeLevel && (
          <View style={styles.overlay}>
            <View style={styles.dialog} accessibilityViewIsModal>
              <ScrollView contentContainerStyle={styles.dialogContent}>
                <Text style={styles.eyebrow}>CAPÍTULO 01  /  FASE {openedIndex + 1}</Text>
                <Text style={styles.title} accessibilityRole="header">{activeLevel.title}</Text>
                <Text style={styles.storyText}>{activeLevel.text}</Text>
                {!!saveError && <Text accessibilityRole="alert" style={styles.secondary}>{saveError}</Text>}
                <Pressable accessibilityRole="button" disabled={saving} style={styles.primaryButton} onPress={isReplay ? closeLevel : finishLevel}>
                  <Text style={styles.primaryText}>{isReplay ? 'Voltar à trilha' : saving ? 'Salvando…' : 'Concluir fase'}</Text>
                </Pressable>
                {!isReplay && (
                  <Pressable accessibilityRole="button" disabled={saving} style={styles.cancelButton} onPress={closeLevel}>
                    <Text style={styles.cancelText}>Voltar à trilha</Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  frame: { flex: 1, width: '100%', maxWidth: 430 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 8 },
  hero: { minHeight: 153, borderRadius: 19, backgroundColor: '#153F39', overflow: 'hidden', justifyContent: 'center' },
  heroCopy: { padding: 16, maxWidth: '70%' },
  heroTag: { color: '#D5F4A8', fontWeight: '900', fontSize: 10, letterSpacing: 1.6 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 27, marginTop: 6 },
  heroDescription: { color: '#EFFFE0', fontSize: 12, marginTop: 8 },
  heroProgress: { color: '#D5F4A8', fontSize: 12, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },
  trail: { width: '100%' },
  trailLine: { color: colors.isDark ? '#6A748D' : '#B3BCC5' },
  levelRow: { height: ROW_HEIGHT, justifyContent: 'center' },
  node: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, position: 'absolute', top: (ROW_HEIGHT - NODE_SIZE) / 2, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 6, backgroundColor: colors.elevated, borderBottomColor: colors.border },
  doneNode: { backgroundColor: '#FFC859', borderBottomColor: '#D89723' },
  currentNode: { backgroundColor: '#298461', borderBottomColor: '#18573D' },
  chestNode: { backgroundColor: '#866235', borderBottomColor: '#5D411D', borderRadius: 16 },
  lockedChest: { borderRadius: 16 },
  lockInk: { color: colors.secondary },
  pressed: { opacity: 0.75 },
  levelCopy: { position: 'absolute', gap: 3 },
  levelCopyLeft: { alignItems: 'flex-end' },
  levelTag: { color: colors.secondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  activeTag: { color: colors.isDark ? '#A8E3B7' : '#216247' },
  levelTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  secondary: { color: colors.secondary },
  landmark: { position: 'absolute' },
  forestLandmark: { left: 9, top: 52 },
  ruinsLandmark: { right: 9, top: 4 * ROW_HEIGHT + 77 },
  landmarkInk: { color: colors.isDark ? '#4C6962' : '#B7CBB5' },
  notice: { gap: 6, marginVertical: 12 },
  retry: { color: colors.accent, fontWeight: '800', paddingVertical: 8 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: '#101226B3' },
  dialog: { width: '100%', maxWidth: 380, maxHeight: '85%', borderRadius: 20, backgroundColor: colors.surface, overflow: 'hidden' },
  dialogContent: { padding: 20, gap: 12 },
  storyText: { color: colors.text, fontSize: 16, lineHeight: 24 },
  primaryButton: { backgroundColor: '#246D51', borderRadius: 11, minHeight: 46, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 9 },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
  cancelButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  cancelText: { color: colors.accent, fontWeight: '800' },
});
