import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

export default function ProfilePageHeader({ title, onBack, rightAction }) {
  const { top } = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: Math.max(22, top) }]}>
      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.8}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar para o perfil"
        hitSlop={3}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M19 12H5M11 6L5 12L11 18" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {rightAction || <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: '#000C56',
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2, textAlign: 'center', flexShrink: 1 },
  spacer: { width: 38 },
});
