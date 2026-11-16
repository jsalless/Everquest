import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

export const NAV_TABS = [
  { id: 'map', label: 'Mapa' },
  { id: 'shop', label: 'Loja' },
  { id: 'focus', label: 'Foco' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'profile', label: 'Perfil' },
];

// Coordenadas exatas extraídas do protótipo (viewBox 690 x 127)
// Barra azul-marinho: largura 690, altura 115 (y de 12 até 127), raio dos cantos R = 22
// Círculo rosa ativo: raio = 42.5 (diâmetro 85), centro cy = 42 (12 + 30)
// Recorte em U concêntrico: raio = 58 centrado em (cx, 42), ombros superiores com raio = 22
const VIEWBOX_W = 690;
const VIEWBOX_H = 127;
const BAR_TOP_Y = 12;
const BAR_BOT_Y = 127;
const BAR_CORNER_R = 22;

const PINK_CY = 42; // BAR_TOP_Y + 30
const PINK_R = 42.5;
const INACTIVE_CY = 69.5; // Centro vertical da barra azul (12 + 115 / 2)

const TAB_CENTERS = [104, 224, 344.5, 464.5, 585];

function getBarPathWithNotch(cx) {
  // Geometria de círculos tangentes entre o ombro (r=22, centro em cx±80, y=34)
  // e o arco principal do recorte em U (r=58, centro em cx, y=42)
  const shoulderOffset = 80;
  const tangentDx = 58.11;
  const tangentY = BAR_TOP_Y + 24.19; // 36.19

  const nL = cx - shoulderOffset;
  const nR = cx + shoulderOffset;
  const tL = cx - tangentDx;
  const tR = cx + tangentDx;

  return [
    `M ${BAR_CORNER_R} ${BAR_TOP_Y}`,
    `L ${nL.toFixed(2)} ${BAR_TOP_Y}`,
    // Ombro superior esquerdo (arco circular r=22)
    `A 22 22 0 0 1 ${tL.toFixed(2)} ${tangentY.toFixed(2)}`,
    // Cavidade principal em U concêntrica ao círculo rosa (arco circular r=58)
    `A 58 58 0 0 0 ${tR.toFixed(2)} ${tangentY.toFixed(2)}`,
    // Ombro superior direito (arco circular r=22)
    `A 22 22 0 0 1 ${nR.toFixed(2)} ${BAR_TOP_Y}`,
    `L ${VIEWBOX_W - BAR_CORNER_R} ${BAR_TOP_Y}`,
    // Canto superior direito (r=22)
    `A ${BAR_CORNER_R} ${BAR_CORNER_R} 0 0 1 ${VIEWBOX_W} ${BAR_TOP_Y + BAR_CORNER_R}`,
    `L ${VIEWBOX_W} ${BAR_BOT_Y - BAR_CORNER_R}`,
    // Canto inferior direito (r=22)
    `A ${BAR_CORNER_R} ${BAR_CORNER_R} 0 0 1 ${VIEWBOX_W - BAR_CORNER_R} ${BAR_BOT_Y}`,
    `L ${BAR_CORNER_R} ${BAR_BOT_Y}`,
    // Canto inferior esquerdo (r=22)
    `A ${BAR_CORNER_R} ${BAR_CORNER_R} 0 0 1 0 ${BAR_BOT_Y - BAR_CORNER_R}`,
    `L 0 ${BAR_TOP_Y + BAR_CORNER_R}`,
    // Canto superior esquerdo (r=22)
    `A ${BAR_CORNER_R} ${BAR_CORNER_R} 0 0 1 ${BAR_CORNER_R} ${BAR_TOP_Y}`,
    'Z',
  ].join(' ');
}

function NavIcon({ id, color, size = 22 }) {
  switch (id) {
    case 'map':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M2 5.5L7.8 3V18.5L2 21V5.5Z" fill={color} />
          <Path d="M9.3 3L14.7 5.5V21L9.3 18.5V3Z" fill={color} />
          <Path d="M16.2 5.5L22 3V18.5L16.2 21V5.5Z" fill={color} />
        </Svg>
      );
    case 'shop':
    case 'duel':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Toldo superior da loja */}
          <Path
            d="M3.6 3.5C3.0 3.5 2.5 3.9 2.3 4.5L1.3 8.5C1.1 9.4 1.6 10.4 2.5 10.8C3.5 11.2 4.7 11.0 5.5 10.2C6.3 11.1 7.6 11.3 8.7 10.7C9.1 10.5 9.4 10.3 9.6 10.0C10.4 11.0 11.8 11.3 13.0 10.7C13.4 10.5 13.8 10.3 14.0 10.0C14.8 11.0 16.2 11.3 17.4 10.7C17.8 10.5 18.1 10.3 18.4 10.0C19.2 10.9 20.4 11.2 21.5 10.8C22.4 10.4 22.9 9.4 22.7 8.5L21.7 4.5C21.5 3.9 21.0 3.5 20.4 3.5H3.6Z"
            fill={color}
          />
          {/* Estrutura inferior da loja com porta e vitrine */}
          <Path
            d="M4 12.2V19.5C4 20.3 4.7 21 5.5 21H18.5C19.3 21 20 20.3 20 19.5V12.2C19.1 12.4 18.1 12.2 17.3 11.7C16.0 12.4 14.4 12.3 13.2 11.6C12.0 12.3 10.4 12.4 9.1 11.7C8.0 12.3 6.6 12.4 5.5 11.8C5.0 12.0 4.5 12.2 4 12.2ZM7.5 14.5H11.5V19H7.5V14.5ZM13.5 14.5H16.5V17.5H13.5V14.5Z"
            fill={color}
          />
        </Svg>
      );
    case 'focus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 2.5H19V4.5H17.5V5.2C17.5 7.8 15.9 10.1 13.6 11.4L12.6 12L13.6 12.6C15.9 13.9 17.5 16.2 17.5 18.8V19.5H19V21.5H5V19.5H6.5V18.8C6.5 16.2 8.1 13.9 10.4 12.6L11.4 12L10.4 11.4C8.1 10.1 6.5 7.8 6.5 5.2V4.5H5V2.5ZM8.5 4.5V5.2C8.5 7.0 9.6 8.6 11.3 9.6L12 10L12.7 9.6C14.4 8.6 15.5 7.0 15.5 5.2V4.5H8.5ZM12 14L11.3 14.4C9.9 15.2 8.9 16.5 8.6 18H15.4C15.1 16.5 14.1 15.2 12.7 14.4L12 14Z"
            fill={color}
          />
          <Path d="M9.8 6.5H14.2L12 8.6L9.8 6.5Z" fill={color} />
        </Svg>
      );
    case 'tasks':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 2.5C9 1.9 9.4 1.5 10 1.5H14C14.6 1.5 15 1.9 15 2.5V4H9V2.5Z"
            fill={color}
          />
          <Path
            d="M6.5 3.5H8V5.2C8 5.8 8.4 6.2 9 6.2H15C15.6 6.2 16 5.8 16 5.2V3.5H17.5C18.6 3.5 19.5 4.4 19.5 5.5V19.5C19.5 20.6 18.6 21.5 17.5 21.5H6.5C5.4 21.5 4.5 20.6 4.5 19.5V5.5C4.5 4.4 5.4 3.5 6.5 3.5ZM8 10.5V12.5H16V10.5H8ZM8 14.5V16.5H13.5V14.5H8Z"
            fill={color}
          />
        </Svg>
      );
    case 'profile':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="7.5" r="3.8" fill={color} />
          <Path
            d="M4.8 20.2C4.8 16.2 8.0 13.8 12 13.8C16.0 13.8 19.2 16.2 19.2 20.2H4.8Z"
            fill={color}
          />
        </Svg>
      );
  }
}

export default function Navbar({
  activeTab = 'focus',
  onChangeTab,
  disabled = false,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);
  // Largura e altura sempre proporcionais ao viewBox 690 x 127 para nunca distorcer os círculos
  const barWidth = Math.min(containerWidth - 36, 356);
  const scale = barWidth / VIEWBOX_W;
  const barHeight = Math.round(VIEWBOX_H * scale);

  const activeIndex = Math.max(
    0,
    NAV_TABS.findIndex((t) => t.id === activeTab)
  );

  // Valor animado contínuo para a posição horizontal (cx) do recorte em U e do círculo rosa
  const cxAnim = useRef(new Animated.Value(TAB_CENTERS[activeIndex])).current;
  const [currentCx, setCurrentCx] = useState(TAB_CENTERS[activeIndex]);

  // Valores animados individuais (0 = inativo, 1 = ativo) para elevar suavemente cada ícone
  const tabAnims = useRef(
    NAV_TABS.map((_, i) => new Animated.Value(i === activeIndex ? 1 : 0))
  ).current;

  useEffect(() => {
    const id = cxAnim.addListener(({ value }) => {
      setCurrentCx(value);
    });
    return () => {
      cxAnim.removeListener(id);
    };
  }, [cxAnim]);

  useEffect(() => {
    const targetCx = TAB_CENTERS[activeIndex];

    Animated.parallel([
      Animated.spring(cxAnim, {
        toValue: targetCx,
        stiffness: 180,
        damping: 20,
        mass: 0.9,
        useNativeDriver: false,
      }),
      ...tabAnims.map((anim, idx) =>
        Animated.spring(anim, {
          toValue: idx === activeIndex ? 1 : 0,
          stiffness: 200,
          damping: 19,
          mass: 0.85,
          useNativeDriver: false,
        })
      ),
    ]).start();
  }, [activeIndex, cxAnim, tabAnims]);

  const barPath = getBarPathWithNotch(currentCx);
  const iconSize = Math.round(38 * scale);
  const hitBoxSize = Math.max(44, Math.round(84 * scale));

  return (
    <View style={styles.wrapper} pointerEvents={disabled ? 'none' : 'auto'}>
      <View style={{ width: barWidth, height: barHeight, position: 'relative' }}>
        {/* Barra SVG com proporção 690:127 exata e animação fluida do recorte + círculo rosa */}
        <Svg
          width={barWidth}
          height={barHeight}
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          style={StyleSheet.absoluteFill}
        >
          <Path d={barPath} fill="#000C56" />
          <Circle cx={currentCx} cy={PINK_CY} r={PINK_R} fill="#FBA0FE" />
        </Svg>

        {/* Ícones das 5 abas com animação vertical suave ao ativar/desativar */}
        {NAV_TABS.map((tab, index) => {
          const isActive = index === activeIndex;
          const centerX = TAB_CENTERS[index] * scale;
          const inactiveCenterY = INACTIVE_CY * scale;
          const activeCenterY = PINK_CY * scale;

          const translateY = tabAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, activeCenterY - inactiveCenterY],
          });

          const iconScale = tabAnims[index].interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 0.92, 1.05],
          });

          return (
            <Animated.View
              key={tab.id}
              style={[
                styles.tabItemHolder,
                {
                  width: hitBoxSize,
                  height: hitBoxSize,
                  left: centerX - hitBoxSize / 2,
                  top: inactiveCenterY - hitBoxSize / 2,
                  transform: [{ translateY }, { scale: iconScale }],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={disabled}
                onPress={() => onChangeTab && onChangeTab(tab.id)}
                style={styles.tabTouchArea}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                <NavIcon
                  id={tab.id}
                  size={iconSize}
                  color={isActive ? '#000C56' : '#FFFFFF'}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 18,
  },
  tabItemHolder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTouchArea: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
});
