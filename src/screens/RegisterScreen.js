import { usePreferences } from '../contexts/PreferencesContext';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { LOGO_WHITE_SVG, REGISTER_ILLUSTRATION_SVG } from '../components/svgAssets';
import {
  BackArrowIcon,
  UserIcon,
  EmailIcon,
  LockIcon,
  EyeIcon,
} from '../components/Icons';
import { registerUser } from '../services/authService';
import { toast } from '../utils/toast';

export default function RegisterScreen({ onRegisterSuccess, onNavigateToLogin }) {
  const { colors } = usePreferences();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);
  const illustrationHeight = containerWidth * (445 / 610);
  const logoWidth = Math.min(containerWidth * 0.56, 224);
  const logoHeight = logoWidth * (93 / 322);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      toast.warn('Preencha todos os campos para criar sua conta.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas digitadas não coincidem.');
      return;
    }

    if (password.length < 6) {
      toast.warn('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      const result = await registerUser({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      toast.success('Conta criada com sucesso! Bem-vindo à aventura!');
      if (onRegisterSuccess) {
        onRegisterSuccess(result);
      }
    } catch (err) {
      toast.error(err.message || 'Não foi possível concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.mobileFrame, { width: containerWidth }]}>
            {/* Top Bar with Back Button + Logo */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.logoContainer}
                activeOpacity={0.85}
                onPress={onNavigateToLogin}
              >
                <SvgXml
                  xml={LOGO_WHITE_SVG}
                  width={logoWidth}
                  height={logoHeight}
                />
              </TouchableOpacity>
            </View>

            {/* Title & Subtitle */}
            <View style={styles.headerContainer}>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>
                  {'Conte-me sobre\nvocê, viajante!'}
                </Text>
              </View>
              <Text style={styles.subtitle}>
                Crie sua conta e embarque nessa aventura
              </Text>
            </View>

            {/* Form Inputs */}
            <View style={styles.formContainer}>
              {/* Username Input */}
              <View style={styles.inputWrapper}>
                <View style={styles.leftIconContainer}>
                  <UserIcon />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#8E8E93"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* E-mail Input */}
              <View style={[styles.inputWrapper, styles.inputSpacing]}>
                <View style={styles.leftIconContainer}>
                  <EmailIcon />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="E-mail"
                  placeholderTextColor="#8E8E93"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Senha Input */}
              <View style={[styles.inputWrapper, styles.inputSpacing]}>
                <View style={styles.leftIconContainer}>
                  <LockIcon />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>

              {/* Confirme sua senha Input */}
              <View style={[styles.inputWrapper, styles.inputSpacing]}>
                <View style={styles.leftIconContainer}>
                  <LockIcon />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Confirme sua senha"
                  placeholderTextColor="#8E8E93"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <EyeIcon visible={showConfirmPassword} />
                </TouchableOpacity>
              </View>

              {/* Cadastrar Button */}
              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleRegister}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.registerButtonText}>Cadastrar</Text>
                )}
              </TouchableOpacity>

              {/* Link to return to Login */}
              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkLabel}>Já possui conta? </Text>
                <TouchableOpacity
                  onPress={onNavigateToLogin}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLinkAction}>Entrar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Castle & Clouds Illustration */}
            <View style={styles.illustrationContainer} pointerEvents="none">
              <SvgXml
                xml={REGISTER_ILLUSTRATION_SVG}
                width={containerWidth}
                height={illustrationHeight}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
  },
  mobileFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 6,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    width: '100%',
    paddingHorizontal: 28,
    marginTop: 22,
    alignItems: 'center',
  },
  titleBlock: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '900',
    color: colors.isDark ? colors.text : '#000000',
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13.5,
    fontWeight: '400',
    color: colors.isDark ? colors.text : '#000000',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 52,
    marginTop: 28,
    zIndex: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    height: 46,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  inputSpacing: {
    marginTop: 22,
  },
  leftIconContainer: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
    height: '100%',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  eyeButton: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButton: {
    marginTop: 32,
    backgroundColor: '#6E59FF',
    borderRadius: 15,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6E59FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  registerButtonText: {
    color: colors.isDark ? colors.text : '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  loginLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginLinkLabel: {
    color: '#04083E',
    fontSize: 12.5,
    fontWeight: '600',
  },
  loginLinkAction: {
    color: '#6E59FF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  illustrationContainer: {
    width: '100%',
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
});
