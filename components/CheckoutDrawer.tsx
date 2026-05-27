import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Modal, TouchableOpacity,
  ScrollView, TextInput, Dimensions, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { PaymentWebViewModal } from './PaymentWebViewModal';
import { BottomAlert } from './BottomAlert';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.72;

interface CheckoutDrawerProps {
  visible: boolean;
  onClose: () => void;
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  deliveryFee: number;
  deliveryAddress: string;
}

type ProfileData = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export function CheckoutDrawer({
  visible,
  onClose,
  couponCode,
  discountAmount,
  subtotal,
  deliveryFee,
  deliveryAddress,
}: CheckoutDrawerProps) {
  const { user } = useAuthStore();
  const { items, clearCart } = useCartStore();

  const translateY = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const [initializing, setInitializing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const cancelInFlight = useRef(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const total = subtotal - discountAmount + deliveryFee;

  useEffect(() => {
    if (visible) {
      loadProfile();
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.55,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: DRAWER_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('user_id', user.id)
      .single();
    if (data) setProfile(data as ProfileData);
  };

  const handleClose = (afterClose?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: DRAWER_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { onClose(); afterClose?.(); });
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert('Not logged in', 'Please sign in to place an order.');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('No address', 'Please set a delivery address in the order summary.');
      return;
    }

    setInitializing(true);
    try {
      const orderRef = `HJ-${Date.now()}`;
      const amount = Math.round(total);

      const { data: initData, error: initError } = await supabase.functions.invoke('initialize-payment', {
        body: {
          email: user.email,
          amount,
          reference: orderRef,
          callback_url: 'handasjabajuice://payment-callback',
          metadata: {
            user_id: user.id,
            order_ref: orderRef,
            delivery_address: deliveryAddress,
          },
        },
      });

      if (initError || !initData?.authorization_url) {
        Alert.alert('Payment Error', 'Could not start payment. Please try again.');
        return;
      }

      const ref = initData.reference ?? orderRef;
      cancelInFlight.current = false;
      setPaymentRef(ref);
      setPaymentUrl(initData.authorization_url);
      setPaymentVisible(true);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setInitializing(false);
    }
  };

  const handlePaymentSuccess = async (reference: string) => {
    if (!user) {
      Alert.alert('Session expired', 'Please sign in again and check your orders — your payment may have gone through.');
      return;
    }
    setPaymentVisible(false);
    setVerifying(true);

    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
        body: { reference },
      });

      const paymentConfirmed =
        verifyData?.status === 'success' ||
        verifyData?.data?.status === 'success';

      if (!paymentConfirmed) {
        Alert.alert(
          'Payment Not Confirmed',
          verifyError
            ? 'Could not verify payment. Check your orders — if payment went through it will appear shortly.'
            : 'Your payment was not confirmed. Your cart is still saved.',
          [{ text: 'OK' }]
        );
        return;
      }

      const firstName = profile?.first_name ?? '';
      const lastName = profile?.last_name ?? '';
      const customerName = [firstName, lastName].filter(Boolean).join(' ') || null;

      const { error: orderError } = await supabase.from('orders').insert({
        user_id: user!.id,
        order_number: reference,
        status: 'paid',
        total_amount: total,
        delivery_address: deliveryAddress,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
        notes: deliveryInstructions.trim() || null,
        customer_name: customerName,
        customer_email: user!.email ?? null,
        payment_reference: reference,
        coupon_code: couponCode ?? null,
        discount_amount: discountAmount,
        delivery_fee: deliveryFee,
      });

      if (orderError) {
        Alert.alert(
          'Payment Received',
          'Payment confirmed! There was a minor issue saving your order. Our team will resolve this — please check your orders screen.',
          [{ text: 'OK' }]
        );
      }

      handleClose(() => {
        clearCart();
        router.push('/(tabs)/orders');
      });
    } catch {
      Alert.alert('Error', 'Payment may have gone through but we could not confirm. Please check your orders screen.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePaymentCancel = async () => {
    setPaymentVisible(false);
    if (!paymentRef || cancelInFlight.current) return;
    cancelInFlight.current = true;
    try {
      const { data } = await supabase.functions.invoke('verify-payment', {
        body: { reference: paymentRef },
      });
      const paid = data?.status === 'success' || data?.data?.status === 'success';
      if (paid) await handlePaymentSuccess(paymentRef);
    } catch {
      /* silent */
    } finally {
      cancelInFlight.current = false;
    }
  };

  if (!visible) return null;

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const isProcessing = initializing || verifying || paymentVisible;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => handleClose()}
        statusBarTranslucent
      >
        <View style={styles.container}>
          <Animated.View
            style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="auto"
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              onPress={() => handleClose()}
              activeOpacity={1}
            />
          </Animated.View>

          <Animated.View style={[styles.drawer, { transform: [{ translateY }] }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.drawerTitle}>Confirm Order</Text>

            {verifying && (
              <View style={styles.verifyingOverlay}>
                <ActivityIndicator size="large" color="#F5317F" />
                <Text style={styles.verifyingText}>Confirming payment…</Text>
                <Text style={styles.verifyingSubtext}>Please wait a moment</Text>
              </View>
            )}

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Summary chip */}
                <View style={styles.summaryChip}>
                  <Ionicons name="bag-outline" size={17} color="#F5317F" />
                  <Text style={styles.summaryChipText}>
                    {items.length} {items.length === 1 ? 'item' : 'items'} · KES {total.toLocaleString()}
                  </Text>
                </View>

                {/* Delivery address — read-only confirmation */}
                <Text style={styles.sectionLabel}>Delivering to</Text>
                <View style={styles.addressCard}>
                  <View style={styles.addressIconBox}>
                    <Ionicons name="location" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    {displayName ? <Text style={styles.addressName}>{displayName}</Text> : null}
                    <Text style={styles.addressText} numberOfLines={3}>
                      {deliveryAddress || 'No address set'}
                    </Text>
                  </View>
                </View>

                {/* Delivery instructions */}
                <Text style={styles.sectionLabel}>Delivery instructions</Text>
                <TextInput
                  style={styles.instructionsInput}
                  placeholder="E.g. Leave at the door, call on arrival..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  value={deliveryInstructions}
                  onChangeText={setDeliveryInstructions}
                  textAlignVertical="top"
                />

                <View style={styles.estimatedRow}>
                  <Text style={styles.estimatedLabel}>Estimated delivery time:</Text>
                  <Text style={styles.estimatedValue}>30 – 45 min</Text>
                </View>

                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>KES {total.toLocaleString()}</Text>
                </View>
                <View style={{ height: 12 }} />
              </ScrollView>
            </KeyboardAvoidingView>

            <SafeAreaView edges={['bottom']} style={styles.placeOrderArea}>
              <TouchableOpacity
                style={[styles.placeOrderBtn, isProcessing && styles.placeOrderBtnLoading]}
                onPress={handlePlaceOrder}
                disabled={isProcessing}
                activeOpacity={0.88}
              >
                {isProcessing ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" style={{ marginRight: 10 }} />
                    <Text style={styles.placeOrderText}>
                      {initializing ? 'Preparing payment…' : 'Confirming payment…'}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.btnIconWrap}>
                      <Ionicons name="card-outline" size={18} color="#F5317F" />
                    </View>
                    <Text style={styles.placeOrderText}>
                      Pay  KES {total.toLocaleString()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      <PaymentWebViewModal
        visible={paymentVisible}
        authorizationUrl={paymentUrl}
        reference={paymentRef}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#000000' },
  drawer: {
    height: DRAWER_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16,
  },
  drawerTitle: { fontSize: 20, fontWeight: '700', color: '#111111', marginBottom: 18 },

  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20, borderRadius: 24,
  },
  verifyingText: { fontSize: 17, fontWeight: '700', color: '#111111', marginTop: 16, marginBottom: 6 },
  verifyingSubtext: { fontSize: 14, color: '#9CA3AF' },

  scrollContent: { paddingBottom: 12 },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF0F7', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 22, gap: 9,
  },
  summaryChipText: { fontSize: 14, fontWeight: '600', color: '#111111' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8,
  },
  addressCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF0F7', borderRadius: 16,
    padding: 14, marginBottom: 20, gap: 10,
    borderWidth: 1, borderColor: '#FDCDE5',
  },
  addressIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5317F', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  addressName: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 2 },
  addressText: { fontSize: 13, color: '#374151', lineHeight: 18 },

  instructionsInput: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111111',
    borderWidth: 1, borderColor: '#F3F4F6',
    minHeight: 80, marginBottom: 20,
  },
  estimatedRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  estimatedLabel: { fontSize: 14, color: '#6B7280' },
  estimatedValue: { fontSize: 14, fontWeight: '700', color: '#111111' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#111111' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#F5317F' },

  placeOrderArea: {
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingTop: 14, paddingBottom: 8,
  },
  placeOrderBtn: {
    backgroundColor: '#F5317F', borderRadius: 16, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, gap: 10,
    shadowColor: '#C4165F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  placeOrderBtnLoading: { backgroundColor: '#C4165F' },
  btnIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  placeOrderText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
});
