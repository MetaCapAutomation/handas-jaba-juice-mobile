import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, StyleSheet, Dimensions,
  Image, Animated, StatusBar as RNStatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width: W, height: H } = Dimensions.get('window');
const HEADER_H = Math.round(H * 0.36);

// ─── Schemas ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// ─── Error mapper ─────────────────────────────────────────────────────────────
function mapAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password. Please try again.';
  if (msg.includes('Email not confirmed')) return 'Please verify your email before signing in.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('Password should be at least')) return 'Password must be at least 6 characters.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a moment.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Check your connection and try again.';
  return msg;
}

// ─── Toast banner ─────────────────────────────────────────────────────────────
type ToastType = 'error' | 'success' | 'info';
interface ToastData { type: ToastType; message: string }

function ToastBanner({ toast, onDismiss }: { toast: ToastData | null; onDismiss: () => void }) {
  if (!toast) return null;
  const cfg = {
    error:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  icon: 'alert-circle'       as const, iconColor: '#FF8FA3', text: '#FFCDD8' },
    success: { bg: 'rgba(245,49,127,0.15)', border: 'rgba(245,49,127,0.4)', icon: 'checkmark-circle'   as const, iconColor: '#F5317F', text: '#FDCDE5' },
    info:    { bg: 'rgba(66,89,197,0.18)',  border: 'rgba(66,89,197,0.4)',  icon: 'information-circle' as const, iconColor: '#7B93E8', text: '#BDC8F5' },
  }[toast.type];

  return (
    <View style={[ts.wrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
      <Text style={[ts.msg, { color: cfg.text }]} numberOfLines={3}>{toast.message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={17} color={cfg.iconColor} />
      </TouchableOpacity>
    </View>
  );
}
const ts = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 },
  msg:  { flex: 1, fontSize: 13.5, fontWeight: '500', lineHeight: 18 },
});

// ─── Rounded input field ───────────────────────────────────────────────────────
interface FieldProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  focused?: boolean;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  rightElement?: React.ReactNode;
}
function Field({ icon, placeholder, value, onChangeText, onFocus, onBlur, focused, error, secureTextEntry, keyboardType, autoCapitalize, rightElement }: FieldProps) {
  return (
    <View style={fs.wrap}>
      <View style={[fs.box, focused && fs.boxFocused, !!error && fs.boxError]}>
        <Ionicons name={icon as any} size={18} color={focused ? '#F9BE00' : error ? '#EF4444' : 'rgba(255,255,255,0.4)'} style={fs.icon} />
        <TextInput
          style={fs.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
        />
        {rightElement}
      </View>
      {!!error && <Text style={fs.err}>{error}</Text>}
    </View>
  );
}
const fs = StyleSheet.create({
  wrap:       { marginBottom: 12 },
  box:        { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', height: 54, paddingHorizontal: 14 },
  boxFocused: { borderColor: '#F9BE00', backgroundColor: 'rgba(249,190,0,0.1)' },
  boxError:   { borderColor: '#FCA5A5', backgroundColor: 'rgba(239,68,68,0.1)' },
  icon:       { marginRight: 10 },
  input:      { flex: 1, fontSize: 15, color: '#FFFFFF', height: '100%' },
  err:        { color: '#FF8FA3', fontSize: 12, marginTop: 5, marginLeft: 4 },
});

// ─── Eye toggle button ─────────────────────────────────────────────────────────
function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={19} color="#94A3B8" />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [showLP, setShowLP] = useState(false);
  const [showRP, setShowRP] = useState(false);
  const [showRC, setShowRC] = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { control: lc, handleSubmit: ls, formState: { errors: le } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });
  const { control: rc, handleSubmit: rs, formState: { errors: re } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const switchTab = (t: 'login' | 'register') => {
    setTab(t);
    Animated.spring(tabAnim, { toValue: t === 'login' ? 0 : 1, useNativeDriver: true, tension: 80, friction: 11 }).start();
    dismissToast();
  };

  const showToast = useCallback((type: ToastType, message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ type, message });
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismissToast = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  };

  // ── Login submit ─────────────────────────────────────────────────────────────
  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email.trim(),
      password: data.password,
    });
    setLoading(false);
    if (error) {
      showToast('error', mapAuthError(error.message));
      return;
    }
    router.replace('/');
  };

  // ── Register submit ───────────────────────────────────────────────────────────
  const handleRegister = async (data: RegisterForm) => {
    setLoading(true);
    const parts = data.fullName.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || null;

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (error) {
      setLoading(false);
      showToast('error', mapAuthError(error.message));
      return;
    }

    if (!authData.user || authData.user.identities?.length === 0) {
      setLoading(false);
      showToast('error', 'An account with this email already exists. Please sign in.');
      setTab('login');
      Animated.spring(tabAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 11 }).start();
      return;
    }

    await Promise.allSettled([
      supabase.from('profiles').insert({
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone_number: data.phone.trim(),
      }),
      supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'user',
      }),
    ]);

    if (authData.session) {
      await supabase.auth.signOut();
    }

    setLoading(false);
    setTab('login');
    Animated.spring(tabAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 11 }).start();
    showToast('success', 'Account created! Sign in with your credentials.');
  };

  // ── Toggle pill geometry ───────────────────────────────────────────────────────
  const TOGGLE_W = W - 48;
  const PILL_W = (TOGGLE_W - 8) / 2;
  const pillX = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 4 + PILL_W] });

  const fo = (key: string) => () => setFocused(key);
  const fb = () => setFocused(null);
  const isFocused = (key: string) => focused === key;

  return (
    <View style={s.screen}>
      <RNStatusBar barStyle="light-content" backgroundColor="#F5317F" />

      {/* ── Pink gradient header with logo ── */}
      <View style={[s.header, { height: HEADER_H + insets.top }]}>
        {/* Decorative circles */}
        <View style={s.decorCircle1} />
        <View style={s.decorCircle2} />
        <View style={s.decorCircle3} />
        <View style={s.decorCircle4} />
        <View style={s.decorCircle5} />
        <View style={[s.headerContent, { paddingTop: insets.top + 12 }]}>
          <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.appTagline}>Fresh. Cold. Delivered.</Text>
        </View>
      </View>

      {/* ── White card ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>

            {/* Toast */}
            <ToastBanner toast={toast} onDismiss={dismissToast} />

            {/* Tab toggle */}
            <View style={[s.toggleWrap, { width: TOGGLE_W }]}>
              <Animated.View style={[s.togglePill, { width: PILL_W, transform: [{ translateX: pillX }] }]} />
              {(['login', 'register'] as const).map((t) => (
                <TouchableOpacity key={t} style={[s.toggleBtn, { width: PILL_W }]} onPress={() => switchTab(t)} activeOpacity={0.85}>
                  <Text style={[s.toggleTxt, tab === t && s.toggleTxtActive]}>
                    {t === 'login' ? 'Sign In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ─── Login form ─── */}
            {tab === 'login' && (
              <View>
                <Controller control={lc} name="email" render={({ field: { onChange, value } }) => (
                  <Field icon="mail-outline" placeholder="Email address" value={value ?? ''} onChangeText={onChange}
                    onFocus={fo('l-email')} onBlur={fb} focused={isFocused('l-email')}
                    keyboardType="email-address" error={le.email?.message} />
                )} />
                <Controller control={lc} name="password" render={({ field: { onChange, value } }) => (
                  <Field icon="lock-closed-outline" placeholder="Password" value={value ?? ''} onChangeText={onChange}
                    onFocus={fo('l-pass')} onBlur={fb} focused={isFocused('l-pass')}
                    secureTextEntry={!showLP} error={le.password?.message}
                    rightElement={<EyeBtn show={showLP} onToggle={() => setShowLP(v => !v)} />} />
                )} />

                <TouchableOpacity style={s.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={s.forgotTxt}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={ls(handleLogin)} disabled={loading} activeOpacity={0.87}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Sign In</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* ─── Register form ─── */}
            {tab === 'register' && (
              <View>
                <Controller control={rc} name="fullName" render={({ field: { onChange, value } }) => (
                  <Field icon="person-outline" placeholder="Full name" value={value ?? ''} onChangeText={onChange}
                    onFocus={fo('r-name')} onBlur={fb} focused={isFocused('r-name')}
                    autoCapitalize="words" error={re.fullName?.message} />
                )} />
                <Controller control={rc} name="email" render={({ field: { onChange, value } }) => (
                  <Field icon="mail-outline" placeholder="Email address" value={value ?? ''} onChangeText={onChange}
                    onFocus={fo('r-email')} onBlur={fb} focused={isFocused('r-email')}
                    keyboardType="email-address" error={re.email?.message} />
                )} />
                <Controller control={rc} name="phone" render={({ field: { onChange, value } }) => (
                  <Field icon="call-outline" placeholder="Phone number (+254...)" value={value ?? ''} onChangeText={onChange}
                    onFocus={fo('r-phone')} onBlur={fb} focused={isFocused('r-phone')}
                    keyboardType="phone-pad" error={re.phone?.message} />
                )} />
                <Controller control={rc} name="password" render={({ field: { onChange, value } }) => (
                  <Field icon="lock-closed-outline" placeholder="Password" value={value ?? ''} onChangeText={onChange}
                    onFocus={fo('r-pass')} onBlur={fb} focused={isFocused('r-pass')}
                    secureTextEntry={!showRP} error={re.password?.message}
                    rightElement={<EyeBtn show={showRP} onToggle={() => setShowRP(v => !v)} />} />
                )} />
                <Controller control={rc} name="confirmPassword" render={({ field: { onChange, value } }) => (
                  <Field icon="lock-closed-outline" placeholder="Confirm password" value={value ?? ''} onChangeText={onChange}
                    onFocus={fo('r-confirm')} onBlur={fb} focused={isFocused('r-confirm')}
                    secureTextEntry={!showRC} error={re.confirmPassword?.message}
                    rightElement={<EyeBtn show={showRC} onToggle={() => setShowRC(v => !v)} />} />
                )} />

                <TouchableOpacity style={[s.btn, loading && s.btnDisabled, { marginTop: 8 }]} onPress={rs(handleRegister)} disabled={loading} activeOpacity={0.87}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Create Account</Text>}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1B1F3B' },
  flex:   { flex: 1 },

  // ── Pink header ──
  header: {
    backgroundColor: '#F5317F',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  decorCircle1: {
    position: 'absolute',
    width: W * 1.3,
    height: W * 1.3,
    borderRadius: W * 0.65,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -W * 0.65,
    right: -W * 0.35,
  },
  decorCircle2: {
    position: 'absolute',
    width: W * 0.75,
    height: W * 0.75,
    borderRadius: W * 0.375,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -W * 0.2,
    left: -W * 0.15,
  },
  decorCircle3: {
    position: 'absolute',
    width: W * 0.55,
    height: W * 0.55,
    borderRadius: W * 0.275,
    backgroundColor: 'rgba(232,84,32,0.45)',
    top: W * 0.02,
    right: -W * 0.08,
  },
  decorCircle4: {
    position: 'absolute',
    width: W * 0.42,
    height: W * 0.42,
    borderRadius: W * 0.21,
    backgroundColor: 'rgba(66,89,197,0.38)',
    bottom: W * 0.06,
    left: -W * 0.08,
  },
  decorCircle5: {
    position: 'absolute',
    width: W * 0.28,
    height: W * 0.28,
    borderRadius: W * 0.14,
    backgroundColor: 'rgba(249,190,0,0.3)',
    top: W * 0.12,
    left: W * 0.18,
  },
  headerContent: {
    alignItems: 'center',
    paddingBottom: 24,
    zIndex: 2,
  },
  logo: { width: 140, height: 140 },
  appTagline: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },

  // ── Dark card ──
  scroll: { flexGrow: 1 },
  card: {
    flex: 1,
    backgroundColor: '#1B1F3B',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    minHeight: 480,
  },

  // ── Toggle pill ──
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 50,
    height: 48,
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  togglePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#F5317F',
    borderRadius: 50,
    shadowColor: '#F5317F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  toggleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleTxt:       { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  toggleTxtActive: { color: '#FFFFFF' },

  // ── Form ──
  forgotRow: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 4 },
  forgotTxt: { color: '#F9BE00', fontSize: 13.5, fontWeight: '600' },
  btn: {
    backgroundColor: '#F5317F',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#C4165F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.72 },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
