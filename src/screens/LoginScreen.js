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
import { LOGO_SVG, LOGIN_ILLUSTRATION_SVG } from '../components/svgAssets';
import { EmailIcon, LockIcon, EyeIcon, GoogleIcon } from '../components/Icons';
import { loginUser } from '../services/authService';
import { toast } from '../utils/toast';

export default function LoginScreen({
  onLoginSuccess,
  onForgotPassword,
  onGoogleSignIn,
  onRegister,
}) {
  const { colors } = usePreferences();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth, 430);
  const illustrationHeight = containerWidth * (394 / 604);
  const logoWidth = Math.min(containerWidth * 0.54, 220);
  const logoHeight = logoWidth * (93 / 322);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.warn('Informe seu e-mail e senha para entrar.');
      return;
    }

    try {
      setLoading(true);
      const data = await loginUser({ email: email.trim(), password });
      const username =
        data?.user?.user_metadata?.username ||
        data?.user?.email ||
        email.trim();
      toast.success(`Bem-vindo de volta, ${username}!`);
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }
    } catch (err) {
      toast.error(err.message || 'E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      toast.info('Recuperação de senha em breve!');
    }
  };

  const handleGoogleSignIn = () => {
    if (onGoogleSignIn) {
      onGoogleSignIn();
    } else {
      toast.info('Redirecionando para autenticação Google...');
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
            {/* Top Logo */}
            <View style={styles.logoContainer}>
              <SvgXml xml={LOGO_SVG} width={logoWidth} height={logoHeight} />
            </View>

            {/* Wizard Hero Illustration */}
            <View style={styles.illustrationContainer}>
              <SvgXml
                xml={LOGIN_ILLUSTRATION_SVG}
                width={containerWidth}
                height={illustrationHeight}
              />
            </View>

            {/* Welcome Text */}
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Bem vindo de volta!</Text>
              <Text style={styles.subtitle}>
                Entre na sua conta para continuar sua jornada
              </Text>
            </View>

            {/* Form Inputs & Primary Action */}
            <View style={styles.formContainer}>
              {/* E-mail Input */}
              <View style={styles.inputWrapper}>
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

              {/* Password Input */}
              <View style={[styles.inputWrapper, styles.passwordInputSpacing]}>
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

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueceu sua senha?
                </Text>
              </TouchableOpacity>

              {/* Entrar Button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Entrar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Social Login & Footer Section */}
            <View style={styles.socialSection}>
              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou continue com</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <View style={styles.googleButtonContent}>
                  <GoogleIcon width={18} height={18} />
                  <Text style={styles.googleButtonText}>
                    Sign in with Google
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Não possui conta? </Text>
                <TouchableOpacity onPress={onRegister} activeOpacity={0.7}>
                  <Text style={styles.footerLinkText}>Cadastro</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#6E59FF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 32,
  },
  mobileFrame: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  illustrationContainer: {
    marginTop: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    marginTop: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13.5,
    fontWeight: '400',
    color: '#F4F2FF',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 52,
    marginTop: 26,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 15,
    height: 46,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
  passwordInputSpacing: {
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 26,
    backgroundColor: '#02093B',
    borderRadius: 15,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  socialSection: {
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 34,
    alignItems: 'center',
  },
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  dividerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 14,
  },
  googleButton: {
    width: '94%',
    height: 38,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    marginLeft: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#04083E',
    fontSize: 12,
    fontWeight: '600',
  },
  footerLinkText: {
    color: '#04083E',
    fontSize: 12,
    fontWeight: '800',
  },
});
