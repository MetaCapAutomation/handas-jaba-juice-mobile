import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, StyleSheet, Dimensions,
  StatusBar as RNStatusBar,
} from 'react-native';

const { width: W } = Dimensions.get('window');
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const OTP_SECONDS = 120;

// ─── Toast banner ──────────────────────────────────────────────────────────────
type ToastType = 'error' | 'success' | 'info';
function ToastBanner({ toast, onDismiss }: { toast: { type: ToastType; message: string } | null; onDismiss: () => void }) {
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
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
  msg:  { flex: 1, fontSize: 13.5, fontWeight: '500', lineHeight: 18 },
});

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <View style={si.row}>
      {([1, 2, 3] as const).map((n) => (
        <View key={n} style={si.item}>
          <View style={[si.dot, current >= n && si.dotActive, current > n && si.dotDone]}>
            {current > n
              ? <Ionicons name="checkmark" size={11} color="#fff" />
              : <Text style={[si.num, current >= n && si.numActive]}>{n}</Text>
            }
          </View>
          {n < 3 && <View style={[si.line, current > n && si.lineDone]} />}
        </View>
      ))}
    </View>
  );
}
const si = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  item:     { flexDirection: 'row', alignItems: 'center' },
  dot:      { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dotActive:{ backgroundColor: '#F5317F', borderColor: '#F5317F' },
  dotDone:  { backgroundColor: '#C4165F', borderColor: '#C4165F' },
  num:      { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  numActive:{ color: '#fff' },
  line:     { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 6 },
  lineDone: { backgroundColor: '#F5317F' },
});

// ─── Rounded input box ─────────────────────────────────────────────────────────
function InputBox({
  icon, placeholder, value, onChangeText, onFocus, onBlur, focused, error,
  secureTextEntry, showToggle, onToggleSecure, keyboardType,
}: {
  icon: string; placeholder: string; value: string;
  onChangeText: (v: string) => void; onFocus?: () => void; onBlur?: () => void;
  focused?: boolean; error?: string; secureTextEntry?: boolean;
  showToggle?: boolean; onToggleSecure?: () => void; keyboardType?: any;
}) {
  return (
    <View style={ib.wrap}>
      <View style={[ib.box, focused && ib.focused, !!error && ib.errBox]}>
        <Ionicons name={icon as any} size={18} color={focused ? '#F9BE00' : error ? '#EF4444' : 'rgba(255,255,255,0.4)'} style={ib.icon} />
        <TextInput
          style={ib.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {showToggle !== undefined && (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={showToggle ? 'eye-outline' : 'eye-off-outline'} size={19} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={ib.errTxt}>{error}</Text>}
    </View>
  );
}
const ib = StyleSheet.create({
  wrap:    { marginBottom: 14 },
  box:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', height: 54, paddingHorizontal: 14 },
  focused: { borderColor: '#F9BE00', backgroundColor: 'rgba(249,190,0,0.1)' },
  errBox:  { borderColor: '#FCA5A5', backgroundColor: 'rgba(239,68,68,0.1)' },
  icon:    { marginRight: 10 },
  input:   { flex: 1, fontSize: 15, color: '#FFFFFF', height: '100%' },
  errTxt:  { color: '#FF8FA3', fontSize: 12, marginTop: 5, marginLeft: 4 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // Step 1
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  // Step 2
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 3
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newFocused, setNewFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step === 2) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const startTimer = () => {
    setSecondsLeft(OTP_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const showToast = useCallback((type: ToastType, message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Step 1: send OTP ──────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    setLoading(true);

    const { error } = await supabase.functions.invoke('send-password-otp', {
      body: { email: trimmed },
    });

    setLoading(false);
    if (error) {
      showToast('error', 'Failed to send code. Please try again.');
      return;
    }
    setStep(2);
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────────
  const handleVerifyOtp = () => {
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Enter all 6 digits'); return; }
    if (secondsLeft === 0) { setOtpError('Code has expired. Request a new one.'); return; }
    setOtpError('');
    setStep(3);
  };

  const handleOtpChange = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setOtpError('');
    if (digit && idx < 5) setTimeout(() => otpRefs.current[idx + 1]?.focus(), 10);
  };

  const handleOtpKey = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ── Step 3: reset password ────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPass.length < 6) { setPassError('Password must be at least 6 characters'); return; }
    if (newPass !== confirmPass) { setPassError('Passwords do not match'); return; }
    setPassError('');
    setLoading(true);

    const { error } = await supabase.functions.invoke('reset-password-otp', {
      body: { email: email.trim().toLowerCase(), otp: otp.join(''), newPassword: newPass },
    });

    setLoading(false);
    if (error) {
      let msg = 'Something went wrong. Please try again.';
      try {
        // FunctionsHttpError carries the response body in context
        if ((error as any).context) {
          const body = await (error as any).context.json().catch(() => ({}));
          if (body?.error) msg = body.error;
        }
      } catch {}
      showToast('error', msg);
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setTimeout(() => { setStep(1); setOtp(['', '', '', '', '', '']); }, 2200);
      }
      return;
    }

    showToast('success', 'Password updated! Redirecting to sign in…');
    setTimeout(() => router.replace('/(auth)/login'), 1800);
  };

  const goBack = () => {
    if (step === 1) { router.back(); return; }
    if (step === 2) { if (timerRef.current) clearInterval(timerRef.current); }
    setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const isOtpExpired = secondsLeft === 0;
  const isTimerUrgent = secondsLeft > 0 && secondsLeft <= 30;

  return (
    <View style={s.screen}>
      <RNStatusBar barStyle="light-content" backgroundColor="#F5317F" />

      {/* ── Pink header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        {/* Decorative blobs */}
        <View style={s.blob1} />
        <View style={s.blob2} />
        <View style={s.blob3} />
        <TouchableOpacity style={s.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.lockCircle}>
            <Ionicons name="lock-open-outline" size={30} color="#fff" />
          </View>
          <Text style={s.headerTitle}>Reset Password</Text>
          <Text style={s.headerSub}>
            {step === 1 && 'Enter your email to receive a code'}
            {step === 2 && 'Check your inbox for the 6-digit code'}
            {step === 3 && 'Create a strong new password'}
          </Text>
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

            <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
            <StepIndicator current={step} />

            {/* ── Step 1: Email ── */}
            {step === 1 && (
              <View>
                <Text style={s.stepTitle}>Enter your email</Text>
                <Text style={s.stepSub}>
                  We'll send a 6-digit code to your email. It expires in 2 minutes.
                </Text>
                <InputBox
                  icon="mail-outline"
                  placeholder="Email address"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  focused={emailFocused}
                  keyboardType="email-address"
                  error={emailError}
                />
                <TouchableOpacity
                  style={[s.btn, loading && s.btnOff, { marginTop: 12 }]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.87}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <View style={s.btnInner}>
                      <Text style={s.btnTxt}>Send Code</Text>
                      <Ionicons name="paper-plane-outline" size={17} color="#fff" style={{ marginLeft: 8 }} />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={s.backLink} onPress={() => router.replace('/(auth)/login')}>
                  <Ionicons name="arrow-back-outline" size={15} color="#64748B" />
                  <Text style={s.backLinkTxt}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <View>
                <Text style={s.stepTitle}>Enter verification code</Text>
                <Text style={s.stepSub}>
                  Sent to <Text style={s.emailHighlight}>{email}</Text>
                </Text>

                {/* 6 OTP digit cells */}
                <View style={s.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(r) => { otpRefs.current[i] = r; }}
                      style={[
                        s.otpCell,
                        digit && s.otpCellFilled,
                        otpRefs.current[i] && s.otpCellFocused,
                        !!otpError && s.otpCellError,
                      ]}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, i)}
                      onKeyPress={({ nativeEvent: { key } }) => handleOtpKey(key, i)}
                      keyboardType="numeric"
                      maxLength={1}
                      textAlign="center"
                      selectTextOnFocus
                    />
                  ))}
                </View>
                {!!otpError && <Text style={s.otpErr}>{otpError}</Text>}

                {/* Timer */}
                <View style={s.timerRow}>
                  <Ionicons
                    name={isOtpExpired ? 'time' : 'time-outline'}
                    size={16}
                    color={isOtpExpired ? '#EF4444' : isTimerUrgent ? '#F97316' : '#64748B'}
                  />
                  <Text style={[s.timerTxt, isTimerUrgent && s.timerUrgent, isOtpExpired && s.timerExpired]}>
                    {isOtpExpired ? 'Code expired' : `Expires in ${formatTime(secondsLeft)}`}
                  </Text>
                </View>

                {isOtpExpired ? (
                  <TouchableOpacity
                    style={s.resendBtn}
                    onPress={() => { setOtp(['', '', '', '', '', '']); setStep(1); }}
                  >
                    <Ionicons name="refresh-outline" size={15} color="#F5317F" />
                    <Text style={s.resendTxt}>Request a new code</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[s.btn, { marginTop: 20 }]}
                  onPress={handleVerifyOtp}
                  activeOpacity={0.87}
                >
                  <View style={s.btnInner}>
                    <Text style={s.btnTxt}>Verify Code</Text>
                    <Ionicons name="shield-checkmark-outline" size={17} color="#fff" style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 3: New password ── */}
            {step === 3 && (
              <View>
                <Text style={s.stepTitle}>Create new password</Text>
                <Text style={s.stepSub}>
                  Your new password will work on all Handas Jaba Juice platforms.
                </Text>

                <InputBox
                  icon="lock-closed-outline"
                  placeholder="New password"
                  value={newPass}
                  onChangeText={(v) => { setNewPass(v); setPassError(''); }}
                  onFocus={() => setNewFocused(true)}
                  onBlur={() => setNewFocused(false)}
                  focused={newFocused}
                  secureTextEntry={!showNew}
                  showToggle={showNew}
                  onToggleSecure={() => setShowNew((v) => !v)}
                />
                <InputBox
                  icon="lock-closed-outline"
                  placeholder="Confirm new password"
                  value={confirmPass}
                  onChangeText={(v) => { setConfirmPass(v); setPassError(''); }}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  focused={confirmFocused}
                  error={passError}
                  secureTextEntry={!showConfirm}
                  showToggle={showConfirm}
                  onToggleSecure={() => setShowConfirm((v) => !v)}
                />

                {/* Strength hint */}
                {newPass.length > 0 && newPass.length < 8 && (
                  <View style={s.hintRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#F97316" />
                    <Text style={s.hintTxt}>Use at least 8 characters for a strong password</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.btn, loading && s.btnOff, { marginTop: 16 }]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.87}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <View style={s.btnInner}>
                      <Text style={s.btnTxt}>Update Password</Text>
                      <Ionicons name="checkmark-circle-outline" size={17} color="#fff" style={{ marginLeft: 8 }} />
                    </View>
                  )}
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    backgroundColor: '#F5317F',
    overflow: 'hidden',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerCenter: { alignItems: 'center' },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub:   { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },
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
    paddingBottom: 56,
    minHeight: 480,
  },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  stepSub:   { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 21, marginBottom: 24 },
  emailHighlight: { color: '#F9BE00', fontWeight: '700' },
  btn: {
    backgroundColor: '#F5317F',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C4165F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  btnOff:   { opacity: 0.72 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnTxt:   { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  backLink:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 6 },
  backLinkTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
  // OTP
  otpRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  otpCell: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  otpCellFocused: { borderColor: '#F9BE00', backgroundColor: 'rgba(249,190,0,0.12)' },
  otpCellFilled:  { borderColor: '#F5317F', backgroundColor: 'rgba(245,49,127,0.15)' },
  otpCellError:   { borderColor: '#FCA5A5', backgroundColor: 'rgba(239,68,68,0.12)' },
  otpErr:  { color: '#FF8FA3', fontSize: 12, textAlign: 'center', marginBottom: 12, marginTop: 4 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  timerTxt: { fontSize: 13.5, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  timerUrgent: { color: '#F97316' },
  timerExpired: { color: '#FF8FA3', fontWeight: '700' },
  resendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 6 },
  resendTxt: { color: '#F9BE00', fontSize: 14, fontWeight: '600' },
  // Password strength
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6, marginBottom: 10, marginLeft: 4 },
  hintTxt: { color: '#F97316', fontSize: 12 },
  // Header blobs
  blob1: { position: 'absolute', width: W * 0.55, height: W * 0.55, borderRadius: W * 0.275, backgroundColor: 'rgba(232,84,32,0.4)', top: -W * 0.1, right: -W * 0.1 },
  blob2: { position: 'absolute', width: W * 0.38, height: W * 0.38, borderRadius: W * 0.19, backgroundColor: 'rgba(66,89,197,0.35)', bottom: 0, left: -W * 0.05 },
  blob3: { position: 'absolute', width: W * 0.25, height: W * 0.25, borderRadius: W * 0.125, backgroundColor: 'rgba(249,190,0,0.28)', top: W * 0.1, left: W * 0.25 },
});
