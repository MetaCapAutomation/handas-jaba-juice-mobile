import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const APP_VERSION = '1.0.0';

// ─── Settings row types ───────────────────────────────────────────────────────
type SettingsRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

function SettingsGroup({ title, rows }: { title?: string; rows: SettingsRow[] }) {
  return (
    <View style={s.group}>
      {title ? <Text style={s.groupTitle}>{title}</Text> : null}
      <View style={s.groupCard}>
        {rows.map((row, i) => (
          <TouchableOpacity
            key={row.label}
            style={[s.row, i < rows.length - 1 && s.rowBorder]}
            onPress={row.onPress}
            activeOpacity={0.7}
          >
            <View style={[s.rowIcon, row.destructive && s.rowIconRed]}>
              <Ionicons name={row.icon} size={20} color={row.destructive ? '#EF4444' : '#6B7280'} />
            </View>
            <Text style={[s.rowLabel, row.destructive && s.rowLabelRed]}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={row.destructive ? '#EF4444' : '#D1D5DB'} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Sign-out confirmation modal ──────────────────────────────────────────────
function SignOutModal({
  visible,
  loading,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <View style={m.iconWrap}>
            <Ionicons name="log-out-outline" size={28} color="#F5317F" />
          </View>
          <Text style={m.title}>Sign Out?</Text>
          <Text style={m.subtitle}>You can always sign back in with your email and password.</Text>
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={m.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.confirmBtn, m.confirmBtnGreen]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={m.confirmTxt}>Sign Out</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Delete account modal (2-step) ───────────────────────────────────────────
function DeleteAccountModal({
  visible,
  step,
  password,
  showPassword,
  loading,
  error,
  onPasswordChange,
  onTogglePassword,
  onCancel,
  onNextStep,
  onConfirmDelete,
  onBackStep,
}: {
  visible: boolean;
  step: 1 | 2;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onCancel: () => void;
  onNextStep: () => void;
  onConfirmDelete: () => void;
  onBackStep: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={m.overlay}>
          <View style={m.sheet}>

            {step === 1 ? (
              /* ── Step 1: Warning ── */
              <>
                <View style={[m.iconWrap, m.iconWrapRed]}>
                  <Ionicons name="trash-outline" size={28} color="#EF4444" />
                </View>
                <Text style={[m.title, { color: '#EF4444' }]}>Delete Account</Text>
                <Text style={m.subtitle}>This action is permanent and cannot be undone.</Text>

                <View style={del.consequenceBox}>
                  {[
                    'Your profile and personal information',
                    'Your login access to this app',
                    'All saved preferences',
                  ].map((item) => (
                    <View key={item} style={del.consequenceRow}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Text style={del.consequenceTxt}>{item}</Text>
                    </View>
                  ))}
                  <View style={del.keepRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#5DC9A0" />
                    <Text style={del.keepTxt}>Order history is retained for our records</Text>
                  </View>
                </View>

                <View style={m.btnRow}>
                  <TouchableOpacity style={m.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                    <Text style={m.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[m.confirmBtn, m.confirmBtnRed]} onPress={onNextStep} activeOpacity={0.85}>
                    <Text style={m.confirmTxt}>Continue</Text>
                    <Ionicons name="arrow-forward" size={15} color="#fff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ── Step 2: Password confirmation ── */
              <>
                <TouchableOpacity style={del.backRow} onPress={onBackStep}>
                  <Ionicons name="arrow-back" size={18} color="#64748B" />
                  <Text style={del.backTxt}>Back</Text>
                </TouchableOpacity>

                <View style={[m.iconWrap, m.iconWrapRed]}>
                  <Ionicons name="shield-outline" size={28} color="#EF4444" />
                </View>
                <Text style={m.title}>Confirm your identity</Text>
                <Text style={m.subtitle}>Enter your password to permanently delete your account.</Text>

                {/* Password field */}
                <View style={[del.passWrap, error ? del.passWrapErr : null]}>
                  <Ionicons name="lock-closed-outline" size={18} color={error ? '#EF4444' : '#94A3B8'} style={{ marginRight: 10 }} />
                  <TextInput
                    style={del.passInput}
                    placeholder="Your password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={onPasswordChange}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={onTogglePassword} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                {!!error && (
                  <View style={del.errRow}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={del.errTxt}>{error}</Text>
                  </View>
                )}

                <View style={m.btnRow}>
                  <TouchableOpacity style={m.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                    <Text style={m.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[m.confirmBtn, m.confirmBtnRed, loading && { opacity: 0.7 }]}
                    onPress={onConfirmDelete}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={m.confirmTxt}>Delete Account</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Modal shared styles ──────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingHorizontal: 0 },
  sheet:           { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  iconWrap:        { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  iconWrapRed:     { backgroundColor: '#FEF2F2' },
  title:           { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  subtitle:        { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btnRow:          { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:       { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  cancelTxt:       { fontSize: 15, fontWeight: '600', color: '#64748B' },
  confirmBtn:      { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  confirmBtnGreen: { backgroundColor: '#F5317F' },
  confirmBtnRed:   { backgroundColor: '#EF4444' },
  confirmTxt:      { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Delete-specific styles ───────────────────────────────────────────────────
const del = StyleSheet.create({
  consequenceBox: { backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14, gap: 10, marginBottom: 8 },
  consequenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  consequenceTxt: { flex: 1, fontSize: 13.5, color: '#991B1B', lineHeight: 18 },
  keepRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#FEE2E2' },
  keepTxt:        { flex: 1, fontSize: 13, color: '#166534', lineHeight: 18 },
  backRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backTxt:        { fontSize: 14, color: '#64748B', fontWeight: '500' },
  passWrap:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', height: 54, paddingHorizontal: 14, marginBottom: 8 },
  passWrapErr:    { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  passInput:      { flex: 1, fontSize: 15, color: '#0F172A', height: '100%' },
  errRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  errTxt:         { color: '#EF4444', fontSize: 12.5, fontWeight: '500' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();

  const [showSignOut, setShowSignOut]     = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const [showDelete, setShowDelete]       = useState(false);
  const [deleteStep, setDeleteStep]       = useState<1 | 2>(1);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePass, setShowDeletePass] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  // ── Sign out ──────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    setSignOutLoading(true);
    await signOut();
    setShowSignOut(false);
    setSignOutLoading(false);
    // Navigate to root — index.tsx sees no session and routes to login
    router.replace('/');
  };

  // ── Delete account ────────────────────────────────────────────────────────────
  const openDelete = () => {
    setDeleteStep(1);
    setDeletePassword('');
    setDeleteError('');
    setShowDeletePass(false);
    setShowDelete(true);
  };

  const cancelDelete = () => {
    setShowDelete(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    if (!user?.email) return;
    const pw = deletePassword.trim();
    if (!pw) { setDeleteError('Please enter your password'); return; }

    setDeleteLoading(true);
    setDeleteError('');

    // Step 1: verify password
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pw,
    });

    if (authError) {
      setDeleteLoading(false);
      setDeleteError('Incorrect password. Please try again.');
      return;
    }

    // Step 2: call delete-account edge function (auth JWT auto-attached by supabase client)
    const { error: fnError } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });

    if (fnError) {
      setDeleteLoading(false);
      let msg = 'Failed to delete account. Please try again.';
      try {
        if ((fnError as any).context) {
          const body = await (fnError as any).context.json().catch(() => ({}));
          if (body?.error) msg = body.error;
        }
      } catch {}
      setDeleteError(msg);
      return;
    }

    // Account deleted — sign out locally and go to login
    setDeleteLoading(false);
    setShowDelete(false);
    await signOut();
    router.replace('/');
  };

  // ── Row definitions ────────────────────────────────────────────────────────────
  const accountRows: SettingsRow[] = [
    { icon: 'person-outline',           label: 'Account',         onPress: () => router.push('/account-settings') },
    { icon: 'notifications-outline',    label: 'Notifications',   onPress: () => router.push('/notifications') },
    { icon: 'shield-outline',           label: 'Privacy Policy',  onPress: () => router.push('/privacy-policy') },
    { icon: 'information-circle-outline', label: 'About App',     onPress: () => Alert.alert('Handas Jaba Juice', `Version ${APP_VERSION}\n\nFresh, cold-pressed juices delivered to your door.`) },
  ];

  const supportRows: SettingsRow[] = [
    { icon: 'help-circle-outline', label: 'Help Centre', onPress: () => router.push('/help-centre') },
  ];

  const dangerRows: SettingsRow[] = [
    { icon: 'log-out-outline', label: 'Sign Out',       onPress: () => setShowSignOut(true), destructive: true },
    { icon: 'trash-outline',   label: 'Delete Account', onPress: openDelete,                  destructive: true },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#F5317F" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.title}>Settings & Support</Text>

        {user && (
          <View style={s.userCard}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{(user.email ?? 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.email} numberOfLines={1}>{user.email}</Text>
              <Text style={s.role}>Customer</Text>
            </View>
          </View>
        )}

        <SettingsGroup rows={accountRows} />
        <SettingsGroup title="Support" rows={supportRows} />
        <SettingsGroup title="Account Management" rows={dangerRows} />
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Sign-out modal */}
      <SignOutModal
        visible={showSignOut}
        loading={signOutLoading}
        onCancel={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
      />

      {/* Delete account modal */}
      <DeleteAccountModal
        visible={showDelete}
        step={deleteStep}
        password={deletePassword}
        showPassword={showDeletePass}
        loading={deleteLoading}
        error={deleteError}
        onPasswordChange={(v) => { setDeletePassword(v); setDeleteError(''); }}
        onTogglePassword={() => setShowDeletePass((p) => !p)}
        onCancel={cancelDelete}
        onNextStep={() => setDeleteStep(2)}
        onConfirmDelete={handleDeleteConfirm}
        onBackStep={() => { setDeleteStep(1); setDeleteError(''); setDeletePassword(''); }}
      />
    </SafeAreaView>
  );
}

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#1B1F3B' },
  scroll: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 20 },
  title:  { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5317F',
    borderRadius: 16, padding: 14, marginBottom: 20,
    shadowColor: '#F5317F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, gap: 12,
  },
  avatar:    { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { color: '#fff', fontSize: 20, fontWeight: '700' },
  email:     { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  role:      { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  group:      { marginBottom: 20 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  groupCard:  { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3, overflow: 'hidden' },

  row:          { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, gap: 12 },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowIcon:      { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowIconRed:   { backgroundColor: '#FEF2F2' },
  rowLabel:     { flex: 1, fontSize: 15, fontWeight: '500', color: '#111111' },
  rowLabelRed:  { color: '#EF4444' },
});
