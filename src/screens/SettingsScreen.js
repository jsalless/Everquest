import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ProfilePageHeader from '../components/ProfilePageHeader';
import { usePreferences } from '../contexts/PreferencesContext';
import { useSession } from '../contexts/SessionContext';
import { clearSession, updateAccount, updatePassword } from '../services/authService';
import { cancelAllFocusAlerts, requestFocusPermission } from '../services/focusAlerts';
import { toast } from '../utils/toast';

export default function SettingsScreen() {
  const { preferences, colors, updatePreferences, isSaving } = usePreferences();
  const { session, setSession, setFriendInvite, setIsFocusing } = useSession();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [section, setSection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [formError, setFormError] = useState('');
  const user = session?.user || {};
  const disabled = busy || isSaving;
  const accountName = user.user_metadata?.username || user.username || 'Aventureiro';

  const openSection = (next) => {
    setUsername(accountName);
    setEmail(user.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmation('');
    setFormError('');
    setSection(next);
  };
  const closeSection = () => {
    if (busy) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmation('');
    setSection(null);
  };
  const changePreference = async (patch) => {
    setBusy(true);
    try {
      if (patch.focusNotifications === true) {
        const allowed = await requestFocusPermission(preferences);
        if (!allowed) {
          throw new Error('Permissão negada. Ative as notificações nas configurações do aparelho ou navegador.');
        }
      }
      if (patch.focusNotifications === false) await cancelAllFocusAlerts();
      await updatePreferences(patch);
    } catch (error) {
      toast.error(error.message || 'Não foi possível salvar esta preferência.');
    } finally {
      setBusy(false);
    }
  };
  const saveAccountForm = async () => {
    setFormError('');
    if (!currentPassword) {
      setFormError('Informe sua senha atual para confirmar.');
      return;
    }
    if (section === 'password' && (newPassword.length < 6 || newPassword !== confirmation)) {
      setFormError(newPassword.length < 6 ? 'A nova senha deve ter pelo menos 6 caracteres.' : 'As senhas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      const updated = section === 'account'
        ? await updateAccount({ username, email, currentPassword })
        : await updatePassword({ currentPassword, newPassword });
      setSession(updated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setSection(null);
      toast.success(section === 'account' ? 'Dados da conta atualizados!' : 'Senha alterada com sucesso!');
    } catch (error) {
      setFormError(error.message || 'Não foi possível salvar as alterações.');
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    try {
      await cancelAllFocusAlerts();
      await clearSession();
      setSession(null);
      setFriendInvite(null);
      setIsFocusing(false);
      setSection(null);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/login');
    } catch (error) {
      setFormError(error.message || 'Não foi possível sair da conta. Tente novamente.');
      console.error('Falha ao sair da conta:', error);
    } finally {
      setBusy(false);
    }
  };
  const row = ({ icon, title, description, onPress, toggle, value, inactive = false, last = false }) => (
    <View key={title} style={[styles.row, !last && styles.divider]}>
      <View style={styles.rowIcon}><Feather name={icon} size={20} color={colors.accent} /></View>
      {toggle ? (
        <>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{title}</Text>
            {description && <Text style={styles.rowDescription}>{description}</Text>}
          </View>
          <Switch
            accessibilityLabel={title}
            accessibilityState={{ disabled: disabled || inactive, checked: value }}
            value={value}
            disabled={disabled || inactive}
            onValueChange={onPress}
            trackColor={{ false: colors.border, true: '#7153FD' }}
            thumbColor="#FFFFFF"
          />
        </>
      ) : (
        <TouchableOpacity
          style={styles.rowAction}
          activeOpacity={0.65}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{title}</Text>
            {description && <Text style={styles.rowDescription}>{description}</Text>}
          </View>
          <Feather name="chevron-right" size={19} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
  const field = (label, value, onChangeText, options = {}) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        placeholderTextColor={colors.secondary}
        selectionColor={colors.accent}
        {...options}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.frame}>
        <ProfilePageHeader
          title="Configurações"
          onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/', params: { tab: 'profile' } })}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        >
          <Text style={styles.sectionLabel}>CONTA</Text>
          <View style={styles.card}>
            {row({ icon: 'user', title: 'Editar conta', description: 'Alterar usuário e e-mail', onPress: () => openSection('account') })}
            {row({ icon: 'lock', title: 'Alterar senha', description: 'Mantenha sua conta protegida', onPress: () => openSection('password'), last: true })}
          </View>
          <Text style={styles.sectionHint}>Para personalizar o avatar, toque nele na tela de perfil.</Text>

          <Text style={styles.sectionLabel}>PREFERÊNCIAS</Text>
          <View style={styles.card}>
            {row({ icon: 'bell', title: 'Notificações de foco', description: 'Receber um aviso ao terminar o temporizador', toggle: true, value: preferences.focusNotifications, onPress: (value) => changePreference({ focusNotifications: value }) })}
          </View>
          <Text style={styles.sectionHint}>
            {Platform.OS === 'web'
              ? 'No navegador, mantenha esta aba aberta. Som e vibração dependem do suporte do navegador.'
              : 'No iOS, a vibração dos alertas em segundo plano segue os ajustes do sistema. O Android pode atrasar alertas para economizar bateria.'}
          </Text>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.permissionLink}
              onPress={() => Linking.openSettings().catch(() => toast.error('Não foi possível abrir os ajustes do aparelho.'))}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Permissões do aparelho</Text>
              <Feather name="external-link" size={13} color={colors.accent} />
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>APARÊNCIA</Text>
          <View style={styles.card}>
            <View style={styles.themeRow}>
              {[{ id: 'light', title: 'Claro', icon: 'sun' }, { id: 'dark', title: 'Escuro', icon: 'moon' }].map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  style={[styles.themeOption, preferences.theme === theme.id && styles.themeSelected]}
                  onPress={() => changePreference({ theme: theme.id })}
                  disabled={disabled}
                  accessibilityRole="radio"
                  accessibilityLabel={`Tema ${theme.title.toLowerCase()}`}
                  aria-checked={preferences.theme === theme.id}
                  accessibilityState={{ checked: preferences.theme === theme.id, disabled }}
                >
                  <Feather name={theme.icon} size={21} color={preferences.theme === theme.id ? colors.accent : colors.secondary} />
                  <Text style={styles.themeText}>{theme.title}</Text>
                  {preferences.theme === theme.id}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.sectionLabel}>INFORMAÇÕES</Text>
          <View style={styles.card}>
            {row({ icon: 'shield', title: 'Privacidade e termos', description: 'Documentos ainda não publicados', onPress: () => openSection('legal') })}
            {row({ icon: 'info', title: 'Sobre o Everquest', description: `Versão ${Constants.expoConfig?.version || '1.0.0'}`, onPress: () => openSection('about'), last: true })}
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => openSection('logout')}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
          >
            <Feather name="log-out" size={19} color={colors.danger} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
          <Text style={styles.footer}>EVERQUEST · UMA MISSÃO DE CADA VEZ</Text>
        </ScrollView>
      </View>

      <Modal visible={section !== null} transparent animationType="slide" onRequestClose={closeSection}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {{ account: 'Editar conta', password: 'Alterar senha', legal: 'Privacidade e termos', about: 'Sobre o Everquest', logout: 'Sair da conta?' }[section]}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeSection} disabled={busy} accessibilityRole="button" accessibilityLabel="Fechar configurações da seção">
                <Feather name="x" size={23} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {section === 'account' && (
                <>
                  <Text style={styles.sheetDescription}>Atualize seus dados de acesso. Seu personagem e seu progresso não serão alterados.</Text>
                  {field('Usuário', username, setUsername, { maxLength: 30, textContentType: 'username' })}
                  {field('E-mail', email, setEmail, { keyboardType: 'email-address', autoComplete: 'email', textContentType: 'emailAddress', maxLength: 254 })}
                  <Text style={styles.sectionHint}>O e-mail de acesso muda ao salvar. A confirmação por e-mail ainda não está disponível.</Text>
                </>
              )}
              {section === 'password' && (
                <Text style={styles.sheetDescription}>Escolha uma senha diferente da atual, com pelo menos 6 caracteres.</Text>
              )}
              {['account', 'password'].includes(section) && (
                <>
                  {field('Senha atual', currentPassword, setCurrentPassword, { secureTextEntry: true, autoComplete: 'current-password', textContentType: 'password' })}
                  {section === 'password' && (
                    <>
                      {field('Nova senha', newPassword, setNewPassword, { secureTextEntry: true, autoComplete: 'new-password', textContentType: 'newPassword' })}
                      {field('Confirmar nova senha', confirmation, setConfirmation, { secureTextEntry: true, autoComplete: 'new-password', textContentType: 'newPassword' })}
                    </>
                  )}
                  {formError ? <Text style={styles.error} accessibilityRole="alert">{formError}</Text> : null}
                  <TouchableOpacity style={styles.primaryButton} onPress={saveAccountForm} disabled={disabled} accessibilityRole="button" accessibilityLabel="Salvar alterações">
                    {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Salvar alterações</Text>}
                  </TouchableOpacity>
                </>
              )}
              {section === 'legal' && (
                <Text style={styles.sheetDescription}>A política de privacidade e os termos de uso ainda não foram publicados. Os documentos oficiais serão disponibilizados aqui quando estiverem prontos.</Text>
              )}
              {section === 'about' && (
                <>
                  <Text style={styles.aboutBrand}>Everquest</Text>
                  <Text style={styles.sheetDescription}>Transforme foco e organização em uma jornada. Planeje tarefas, conclua sessões de foco e evolua seu personagem.</Text>
                  <Text style={styles.sectionHint}>Versão {Constants.expoConfig?.version || '1.0.0'} · {Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'}</Text>
                </>
              )}
              {section === 'logout' && (
                <>
                  <Text style={styles.sheetDescription}>Você precisará entrar novamente para acessar sua conta. As preferências deste aparelho serão mantidas.</Text>
                  {formError ? <Text style={styles.error} accessibilityRole="alert">{formError}</Text> : null}
                  <TouchableOpacity style={[styles.primaryButton, styles.dangerButton]} disabled={busy} onPress={logout} accessibilityRole="button" accessibilityLabel="Confirmar saída">
                    {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Sair da conta</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} disabled={busy} onPress={closeSection} accessibilityRole="button"><Text style={styles.linkText}>Continuar minha jornada</Text></TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 430 },
  content: { padding: 20 },
  accountSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: colors.accentSoft, borderRadius: 20, marginBottom: 6 },
  initialCircle: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#7153FD', alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 23, fontWeight: '800', color: '#FFFFFF' },
  accountName: { fontWeight: '800', fontSize: 16, color: colors.text },
  sectionLabel: { color: colors.secondary, fontSize: 11, letterSpacing: 1.6, fontWeight: '800', marginTop: 24, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  rowAction: { flex: 1, minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowDescription: { color: colors.secondary, fontSize: 12, lineHeight: 18, marginTop: 3, flexShrink: 1 },
  sectionHint: { fontSize: 11, lineHeight: 17, color: colors.secondary, marginTop: 9, paddingHorizontal: 3 },
  permissionLink: { flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 },
  linkText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  themeRow: { flexDirection: 'row', padding: 12, gap: 10 },
  themeOption: { flex: 1, minHeight: 55, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  themeSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  themeText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  logoutButton: { flexDirection: 'row', minHeight: 54, gap: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: colors.border, marginTop: 26, backgroundColor: colors.surface },
  logoutText: { fontSize: 15, fontWeight: '800', color: colors.danger },
  footer: { textAlign: 'center', fontSize: 9, letterSpacing: 1.3, marginTop: 23, color: colors.secondary },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 5, 35, 0.6)', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 430, maxHeight: '90%', backgroundColor: colors.surface, padding: 24, borderTopLeftRadius: 27, borderTopRightRadius: 27 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 12 },
  sheetTitle: { fontSize: 21, fontWeight: '800', color: colors.text, flex: 1 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetDescription: { fontSize: 14, lineHeight: 22, color: colors.secondary, marginBottom: 16 },
  fieldGroup: { marginTop: 15 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, minHeight: 50, color: colors.text, fontSize: 15 },
  primaryButton: { borderRadius: 14, minHeight: 52, backgroundColor: '#7153FD', marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 14 },
  aboutBrand: { fontSize: 29, fontWeight: '900', color: colors.accent, marginBottom: 14 },
  dangerButton: { backgroundColor: '#B92D51' },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
