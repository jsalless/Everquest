import { usePreferences } from '../contexts/PreferencesContext';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import {
  LOGO_STEP3_SVG,
  ONBOARDING_STEP1_SVG,
  ONBOARDING_STEP2_SVG,
  ONBOARDING_STEP3_SVG,
} from '../components/svgAssets';
import { toast } from '../utils/toast';

const NEXT_ARROW_SVG = `<svg width="26" height="24" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 12H22M22 12L14.5 4.5M22 12L14.5 19.5" stroke="#725CFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export default function OnboardingScreen({ user, onComplete }) {
  const { colors } = usePreferences();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);

  const handleNext = () => {
    if (step < 2) {
      setStep((prev) => prev + 1);
    } else {
      const username =
        user?.user_metadata?.username ||
        user?.user?.user_metadata?.username ||
        user?.email ||
        'Viajante';
      toast.success(`Sua jornada começou, ${username}!`);
      if (onComplete) {
        onComplete();
      }
    }
  };

  if (step === 2) {
    const step3Height = containerWidth * (1035 / 610);
    const logoWidth = containerWidth * (545 / 610);
    const logoHeight = containerWidth * (158 / 610);
    const logoTop = containerWidth * (283 / 610);

    return (
      <View style={styles.step3Root}>
        <View style={[styles.step3Frame, { width: containerWidth }]}>
          <View style={styles.step3ArtworkContainer}>
            <SvgXml
              xml={ONBOARDING_STEP3_SVG}
              width={containerWidth}
              height={step3Height}
            />
            <View
              style={[
                styles.step3LogoOverlay,
                {
                  top: logoTop,
                  width: logoWidth,
                  height: logoHeight,
                },
              ]}
              pointerEvents="none"
            >
              <SvgXml
                xml={LOGO_STEP3_SVG}
                width={logoWidth}
                height={logoHeight}
              />
            </View>
          </View>

          <View style={styles.step3BottomArea}>
            <TouchableOpacity
              style={styles.startButton}
              activeOpacity={0.85}
              onPress={handleNext}
            >
              <Text style={styles.startButtonText}>Vamos nessa!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const isStep1 = step === 0;
  const svgXml = isStep1 ? ONBOARDING_STEP1_SVG : ONBOARDING_STEP2_SVG;
  const svgHeight = containerWidth * (isStep1 ? 669 / 610 : 710 / 610);

  return (
    <View style={styles.purpleRoot}>
      <View style={[styles.mobileFrame, { width: containerWidth }]}>
        {/* Top Artwork */}
        <View style={styles.topSection}>
          <View style={isStep1 ? styles.step1SvgWrapper : styles.step2SvgWrapper}>
            <SvgXml
              xml={svgXml}
              width={containerWidth}
              height={svgHeight}
            />
          </View>

          {/* Text Content */}
          <View style={styles.textSection}>
            <Text style={styles.heading}>
              {isStep1 ? 'REALIZE SUAS\nTAREFAS' : 'ENFRENTE SEUS\nAMIGOS'}
            </Text>
            <Text style={styles.description}>
              {isStep1
                ? 'Cumpra suas tarefas diárias ou\n“foque” para conseguir novos\nequipamentos'
                : 'Utilize seus equipamentos obtidos\npara duelar com seus amigos e\nconcluir o modo história'}
            </Text>
          </View>
        </View>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomBar}>
          {/* Progress Pill Indicator */}
          <View
            style={[
              styles.progressTrack,
              isStep1 ? styles.progressLeft : styles.progressCenter,
            ]}
          >
            <View style={styles.progressThumb} />
          </View>

          {/* Circular Next Button */}
          <TouchableOpacity
            style={styles.nextButton}
            activeOpacity={0.85}
            onPress={handleNext}
          >
            <SvgXml xml={NEXT_ARROW_SVG} width={25} height={24} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  purpleRoot: {
    flex: 1,
    backgroundColor: '#725CFF',
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 28,
  },
  topSection: {
    width: '100%',
  },
  step1SvgWrapper: {
    width: '100%',
    marginTop: 28,
    alignItems: 'center',
  },
  step2SvgWrapper: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
  },
  textSection: {
    paddingHorizontal: 18,
    marginTop: 22,
  },
  heading: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  description: {
    marginTop: 18,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  bottomBar: {
    width: '100%',
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  progressTrack: {
    width: 96,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#000000',
    paddingHorizontal: 3,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLeft: {
    justifyContent: 'flex-start',
  },
  progressCenter: {
    justifyContent: 'center',
  },
  progressThumb: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  nextButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  step3Root: {
    flex: 1,
    backgroundColor: '#FBA0FE',
    alignItems: 'center',
  },
  step3Frame: {
    flex: 1,
    backgroundColor: '#FBA0FE',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  step3ArtworkContainer: {
    width: '100%',
    backgroundColor: '#FBA0FE',
    alignItems: 'center',
    position: 'relative',
  },
  step3LogoOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step3BottomArea: {
    width: '100%',
    flex: 1,
    backgroundColor: '#FBA0FE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
    paddingTop: 12,
  },
  startButton: {
    width: 262,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', cursor: 'pointer' } : {}),
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
});

