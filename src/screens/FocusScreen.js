import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Rect, Path, Line } from 'react-native-svg';
import Navbar from '../components/Navbar';
import { toast } from '../utils/toast';

const goblinFocoImage = require('../../assets/GoblinFoco.png');

export default function FocusScreen({
  activeTab = 'focus',
  onChangeTab,
  onFocusStateChange,
}) {
  const [isFocusing, setIsFocusing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const expandAnim = useRef(new Animated.Value(0)).current;
  const goblinFloatAnim = useRef(new Animated.Value(0)).current;

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);
  const circleSize = Math.min(Math.round(containerWidth * 0.79), 300);

  // Animação suave de levitação do Goblin durante o foco ativo (quando não pausado)
  useEffect(() => {
    let floatLoop;
    if (isFocusing && !isPaused) {
      floatLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(goblinFloatAnim, {
            toValue: -7,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(goblinFloatAnim, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      floatLoop.start();
    } else {
      goblinFloatAnim.stopAnimation();
      Animated.timing(goblinFloatAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
    return () => {
      if (floatLoop) floatLoop.stop();
    };
  }, [isFocusing, isPaused, goblinFloatAnim]);

  // Cronômetro do modo foco
  useEffect(() => {
    if (!isFocusing || isPaused) return undefined;

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isFocusing, isPaused]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    return `${mm} : ${ss}`;
  };

  const handleStartFocus = () => {
    setSeconds(0);
    setIsPaused(false);
    setIsFocusing(true);
    if (onFocusStateChange) onFocusStateChange(true);
    toast.info('Modo de foco iniciado! Concentre-se na sua missão.');

    Animated.timing(expandAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const handleStopFocus = () => {
    const focusedTime = formatTimer(seconds).replace(/\s/g, '');
    setIsFocusing(false);
    setIsPaused(false);
    if (onFocusStateChange) onFocusStateChange(false);
    toast.success(`Modo de foco finalizado! Tempo focado: ${focusedTime}`);

    Animated.timing(expandAnim, {
      toValue: 0,
      duration: 550,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setSeconds(0);
    });
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        toast.info('Cronômetro de foco pausado.');
      } else {
        toast.info('Cronômetro de foco retomado!');
      }
      return next;
    });
  };

  const handleTabPress = (tabId) => {
    if (isFocusing) return;
    if (onChangeTab) {
      onChangeTab(tabId);
    }
  };

  // Escala necessária para o círculo roxo cobrir toda a tela a partir do centro da imagem
  const maxDimension = Math.max(windowWidth, windowHeight, 900);
  const targetScale = Math.ceil((maxDimension * 2.3) / circleSize);

  const purpleScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, targetScale],
  });

  // Deslocamento vertical para posicionar o Goblin e o timer exatamente como no protótipo do modo foco
  const contentTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  const timerColor = expandAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: ['#000000', '#FFFFFF', '#FFFFFF'],
  });

  const timerScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.22],
  });

  const navbarOpacity = expandAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [1, 0, 0],
  });

  const navbarTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  return (
    <View style={styles.root}>
      <View style={[styles.mobileFrame, { width: containerWidth }]}>
        {/* Conteúdo Central: Goblin Foco + Timer + Controles */}
        <Animated.View
          style={[
            styles.centerContent,
            { transform: [{ translateY: contentTranslateY }] },
          ]}
        >
          <View
            style={[
              styles.goblinWrapper,
              { width: circleSize, height: circleSize },
            ]}
          >
            {/* Círculo Roxo (#725CFF) que se expande por toda a tela ao iniciar o foco */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.expandingPurpleCircle,
                {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                  transform: [{ scale: purpleScale }],
                },
              ]}
            />

            {/* Imagem do Goblin Foco (circular no estado inicial e sem corte lateral quando o roxo expande) */}
            <Animated.View
              style={[
                styles.goblinCircleMask,
                {
                  width: isFocusing ? circleSize * 1.09 : circleSize,
                  height: circleSize,
                  borderRadius: isFocusing ? 0 : circleSize / 2,
                  overflow: isFocusing ? 'visible' : 'hidden',
                  transform: [{ translateY: goblinFloatAnim }],
                },
              ]}
            >
              <Image
                source={goblinFocoImage}
                style={{
                  width: circleSize * 1.09,
                  height: circleSize,
                }}
                resizeMode="cover"
              />
            </Animated.View>
          </View>

          {/* Timer MM : SS */}
          <Animated.Text
            style={[
              styles.timerText,
              {
                color: timerColor,
                transform: [{ scale: timerScale }],
              },
            ]}
          >
            {formatTimer(seconds)}
          </Animated.Text>

          {/* Área de Ação: Botão "Iniciar foco" ou Botões Circulares (Parar / Pausar) */}
          <View style={styles.actionArea}>
            {!isFocusing ? (
              <TouchableOpacity
                style={styles.startFocusButton}
                activeOpacity={0.85}
                onPress={handleStartFocus}
              >
                <Text style={styles.startFocusButtonText}>Iniciar foco</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.focusControlsRow}>
                {/* Botão Parar / Sair do Foco (Azul-marinho #000C56 com quadrado branco) */}
                <TouchableOpacity
                  style={styles.stopCircleButton}
                  activeOpacity={0.85}
                  onPress={handleStopFocus}
                  accessibilityRole="button"
                  accessibilityLabel="Parar e sair do foco"
                >
                  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                    <Rect
                      x="2.5"
                      y="2.5"
                      width="13"
                      height="13"
                      rx="1.8"
                      stroke="#FFFFFF"
                      strokeWidth="1.8"
                    />
                  </Svg>
                </TouchableOpacity>

                {/* Botão Pausar / Retomar Foco (Rosa #FBA0FE com barras verticais escuras) */}
                <TouchableOpacity
                  style={styles.pauseCircleButton}
                  activeOpacity={0.85}
                  onPress={handleTogglePause}
                  accessibilityRole="button"
                  accessibilityLabel={isPaused ? 'Retomar foco' : 'Pausar foco'}
                >
                  {!isPaused ? (
                    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                      <Line
                        x1="6"
                        y1="3"
                        x2="6"
                        y2="15"
                        stroke="#000C56"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <Line
                        x1="12"
                        y1="3"
                        x2="12"
                        y2="15"
                        stroke="#000C56"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </Svg>
                  ) : (
                    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                      <Path
                        d="M5.5 3.5L14 9L5.5 14.5V3.5Z"
                        stroke="#000C56"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Navbar Inferior (visível apenas fora do modo de foco) */}
        <Animated.View
          pointerEvents={isFocusing ? 'none' : 'auto'}
          style={[
            styles.navbarHolder,
            {
              opacity: navbarOpacity,
              transform: [{ translateY: navbarTranslateY }],
            },
          ]}
        >
          <Navbar
            activeTab={activeTab}
            onChangeTab={handleTabPress}
            disabled={isFocusing}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mobileFrame: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    zIndex: 2,
  },
  goblinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  expandingPurpleCircle: {
    position: 'absolute',
    backgroundColor: '#7153FD',
  },
  goblinCircleMask: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    marginTop: 52,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1.2,
    zIndex: 2,
  },
  actionArea: {
    marginTop: 26,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  startFocusButton: {
    width: 244,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  startFocusButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  focusControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  stopCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000C56',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  pauseCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FBA0FE',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  navbarHolder: {
    width: '100%',
    zIndex: 2,
  },
});
