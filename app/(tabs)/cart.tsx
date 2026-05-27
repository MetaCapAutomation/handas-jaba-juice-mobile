import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, TextInput, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { CheckoutDrawer } from '../../components/CheckoutDrawer';

type AddressSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type CouponData = {
  code: string;
  type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
};

export default function CartScreen() {
  const { items, updateQty, subtotal, totalItems } = useCartStore();
  const { user } = useAuthStore();
  const { bottom: bottomInset } = useSafeAreaInsets();

  // ── Coupon ────────────────────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // ── Delivery address ──────────────────────────────────────────────────────────
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false);
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const addressSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Delivery fee ──────────────────────────────────────────────────────────────
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);

  // ── Checkout drawer ───────────────────────────────────────────────────────────
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  const sub = subtotal();
  const itemCount = totalItems();
  const discountAmount = appliedCoupon
    ? appliedCoupon.type === 'percentage'
      ? Math.round((sub * appliedCoupon.discount_value) / 100)
      : Math.min(appliedCoupon.discount_value, sub)
    : 0;
  const effectiveFee = deliveryFee ?? 0;
  const total = sub - discountAmount + effectiveFee;

  const tabBarH = 74 + (bottomInset > 0 ? bottomInset - 4 : 12);
  const CHECKOUT_BAR_H = 90;
  const scrollPadBottom = CHECKOUT_BAR_H + tabBarH + 8;

  // ── Load saved address on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('location')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.location) {
          setDeliveryAddress(data.location);
          calculateDeliveryFee(data.location);
        }
      });
  }, [user]);

  // ── Fee calculation ───────────────────────────────────────────────────────────
  const calculateDeliveryFee = async (address: string) => {
    setFeeLoading(true);
    setFeeError(false);
    setDeliveryFee(null);
    setDistanceKm(null);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-delivery-fee', {
        body: { delivery_address: address },
      });
      if (error || !data) throw new Error('fee-calc-failed');

      // Handle different response shapes from the edge function
      let fee: number | null = data.fee ?? data.delivery_fee ?? null;
      const distance: number | null = data.distance_km ?? null;

      if (fee === null && distance !== null) {
        // Calculate from distance using the defined formula
        fee = distance <= 2 ? 200 : Math.ceil(200 + (distance - 2) * 25);
      }
      if (fee === null) throw new Error('no-fee-in-response');

      setDeliveryFee(fee);
      setDistanceKm(distance);
    } catch {
      setFeeError(true);
    } finally {
      setFeeLoading(false);
    }
  };

  // ── Address autocomplete ──────────────────────────────────────────────────────
  const searchAddress = useCallback((text: string) => {
    setAddressSearch(text);
    if (addressSearchDebounce.current) clearTimeout(addressSearchDebounce.current);
    if (text.length < 2) { setAddressSuggestions([]); return; }
    addressSearchDebounce.current = setTimeout(async () => {
      setAddressSuggestionsLoading(true);
      try {
        const { data } = await supabase.functions.invoke('google-maps-proxy', {
          body: { action: 'autocomplete', input: text },
        });
        setAddressSuggestions(data?.predictions ?? []);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressSuggestionsLoading(false);
      }
    }, 350);
  }, []);

  const selectAddress = async (item: AddressSuggestion) => {
    const addr = item.description;
    setDeliveryAddress(addr);
    setAddressSearch('');
    setAddressSuggestions([]);
    setAddressDropdownOpen(false);
    if (user) {
      supabase.from('profiles').update({ location: addr }).eq('user_id', user.id).then(() => {});
    }
    await calculateDeliveryFee(addr);
  };

  const openAddressSearch = () => {
    setAddressDropdownOpen(true);
    setAddressSearch('');
    setAddressSuggestions([]);
  };

  // ── Coupon ────────────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError('');
    const { data } = await supabase
      .from('coupons')
      .select('code, type, discount_value, min_order_amount, is_active, expires_at, is_archived, max_uses, used_count')
      .eq('code', code)
      .single();
    setApplyingCoupon(false);
    if (!data || !data.is_active || data.is_archived) { setCouponError('Invalid or expired code'); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setCouponError('Invalid or expired code'); return; }
    if (data.max_uses !== null && data.used_count >= data.max_uses) { setCouponError('This coupon has reached its usage limit'); return; }
    if (sub < data.min_order_amount) { setCouponError(`Minimum order KES ${data.min_order_amount} required`); return; }
    setAppliedCoupon(data as CouponData);
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(''); setCouponError(''); };

  const canCheckout = !!deliveryAddress && deliveryFee !== null && !feeLoading && !feeError;

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9BE00" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#1B1F3B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Summary</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="bag-outline" size={48} color="#F5317F" />
          </View>
          <Text style={styles.emptyTitle}>Your bag is empty</Text>
          <Text style={styles.emptySubtitle}>Add fresh juices to get started</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/shop')}>
            <Ionicons name="storefront-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.browseBtnText}>Browse Shop</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9BE00" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1B1F3B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Order Summary</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPadBottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── ITEMS ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>YOUR ITEMS</Text>
          {items.map((item, idx) => (
            <View key={item.id} style={[styles.itemCard, idx < items.length - 1 && styles.itemCardBorder]}>
              <View style={styles.itemImageBox}>
                {item.image_url
                  ? <Image source={{ uri: item.image_url }} style={styles.itemImage} resizeMode="cover" />
                  : <Text style={{ fontSize: 26 }}>🥤</Text>
                }
              </View>
              <View style={styles.itemCenter}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemUnitPrice}>KES {item.price.toLocaleString()} each</Text>
                <Text style={styles.itemPrice}>KES {(item.price * item.qty).toLocaleString()}</Text>
              </View>
              <View style={styles.itemQtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, item.qty - 1)}>
                  <Ionicons name="remove" size={14} color="#374151" />
                </TouchableOpacity>
                <Text style={styles.qtyCount}>{item.qty}</Text>
                <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnPlus]} onPress={() => updateQty(item.id, item.qty + 1)}>
                  <Ionicons name="add" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.addMoreBtn} onPress={() => router.push('/(tabs)/shop')}>
          <Ionicons name="add-circle-outline" size={18} color="#F5317F" />
          <Text style={styles.addMoreText}>Add More Items</Text>
        </TouchableOpacity>

        {/* ── DELIVERY ADDRESS ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>DELIVERY ADDRESS</Text>

          {deliveryAddress && !addressDropdownOpen ? (
            // Confirmed address display
            <View style={styles.addressConfirmed}>
              <View style={styles.addressConfirmedIcon}>
                <Ionicons name="location" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressConfirmedText} numberOfLines={2}>{deliveryAddress}</Text>
                {feeLoading && (
                  <View style={styles.feeRow}>
                    <ActivityIndicator size="small" color="#F5317F" style={{ marginRight: 6 }} />
                    <Text style={styles.feeCalcText}>Calculating delivery fee…</Text>
                  </View>
                )}
                {feeError && !feeLoading && (
                  <Text style={styles.feeErrorText}>Could not calculate fee — try a different address</Text>
                )}
                {deliveryFee !== null && !feeLoading && (
                  <Text style={styles.feeOkText}>
                    KES {deliveryFee} delivery
                    {distanceKm !== null ? ` · ${distanceKm.toFixed(1)} km` : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.changeAddressBtn} onPress={openAddressSearch}>
                <Text style={styles.changeAddressBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Address search input
            <>
              <View style={[styles.addressSearchWrap, addressDropdownOpen && styles.addressSearchWrapFocused]}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.addressSearchInput}
                  placeholder="Search area, street, landmark…"
                  placeholderTextColor="#9CA3AF"
                  value={addressSearch}
                  onChangeText={searchAddress}
                  autoFocus={addressDropdownOpen}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {addressSuggestionsLoading ? (
                  <ActivityIndicator size="small" color="#F5317F" />
                ) : addressSearch.length > 0 ? (
                  <TouchableOpacity onPress={() => { setAddressSearch(''); setAddressSuggestions([]); }}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {addressSuggestions.length > 0 && (
                <View style={styles.addressSuggestions}>
                  {addressSuggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={item.placeId}
                      style={[styles.addressSuggRow, idx > 0 && styles.addressSuggBorder]}
                      onPress={() => selectAddress(item)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.addressSuggIconWrap}>
                        <Ionicons name="location-outline" size={14} color="#F5317F" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.addressSuggMain} numberOfLines={1}>{item.mainText}</Text>
                        <Text style={styles.addressSuggSub} numberOfLines={1}>{item.secondaryText}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {addressDropdownOpen && addressSuggestions.length === 0 && !addressSuggestionsLoading && addressSearch.length < 2 && (
                <Text style={styles.addressHint}>Type at least 2 characters to search</Text>
              )}
            </>
          )}
        </View>

        {/* ── COUPON ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>DISCOUNT CODE</Text>
          {appliedCoupon ? (
            <View style={styles.couponApplied}>
              <View style={styles.couponAppliedIcon}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.couponAppliedText}>
                {appliedCoupon.code} —{' '}
                {appliedCoupon.type === 'percentage'
                  ? `${appliedCoupon.discount_value}% off`
                  : `KES ${appliedCoupon.discount_value} off`}
              </Text>
              <TouchableOpacity onPress={removeCoupon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter promo code"
                  placeholderTextColor="#9CA3AF"
                  value={couponInput}
                  onChangeText={(t) => { setCouponInput(t); setCouponError(''); }}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleApplyCoupon}
                />
                <TouchableOpacity
                  style={[styles.applyBtn, applyingCoupon && { opacity: 0.7 }]}
                  onPress={handleApplyCoupon}
                  disabled={applyingCoupon}
                >
                  {applyingCoupon
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={styles.applyBtnText}>Apply</Text>
                  }
                </TouchableOpacity>
              </View>
              {couponError ? <Text style={styles.couponError}>{couponError}</Text> : null}
            </>
          )}
        </View>

        {/* ── ORDER TOTALS ── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>ORDER TOTALS</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>KES {sub.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery fee</Text>
            {feeLoading ? (
              <ActivityIndicator size="small" color="#F5317F" />
            ) : feeError ? (
              <Text style={[styles.totalValue, { color: '#EF4444' }]}>Error</Text>
            ) : deliveryFee !== null ? (
              <Text style={styles.totalValue}>KES {deliveryFee.toLocaleString()}</Text>
            ) : (
              <Text style={[styles.totalValue, { color: '#9CA3AF' }]}>Set address</Text>
            )}
          </View>
          {appliedCoupon && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#5DC9A0' }]}>
                −KES {discountAmount.toLocaleString()}
              </Text>
            </View>
          )}
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {canCheckout ? `KES ${total.toLocaleString()}` : '—'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── CHECKOUT BAR ── */}
      <View style={[styles.checkoutBar, { bottom: tabBarH + 8 }]}>
        <TouchableOpacity
          style={[styles.checkoutBtn, !canCheckout && styles.checkoutBtnDisabled]}
          onPress={() => canCheckout && setCheckoutVisible(true)}
          disabled={!canCheckout}
          activeOpacity={0.88}
        >
          <View style={[styles.checkoutLeft, !canCheckout && styles.checkoutLeftDisabled]}>
            {feeLoading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.checkoutCount}>{itemCount}</Text>
            }
          </View>
          <Text style={styles.checkoutText}>
            {!deliveryAddress
              ? 'Set Delivery Address'
              : feeLoading
              ? 'Calculating fee…'
              : feeError
              ? 'Address Not Found'
              : 'Checkout'}
          </Text>
          <Text style={styles.checkoutAmount}>
            {canCheckout ? `KES ${total.toLocaleString()}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <CheckoutDrawer
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        couponCode={appliedCoupon?.code}
        discountAmount={discountAmount}
        subtotal={sub}
        deliveryFee={effectiveFee}
        deliveryAddress={deliveryAddress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B1F3B' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#F9BE00',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(27,31,59,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1B1F3B' },
  headerBadge: {
    backgroundColor: 'rgba(27,31,59,0.15)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  headerBadgeText: { fontSize: 12, fontWeight: '600', color: '#1B1F3B' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  sectionBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2, marginBottom: 14,
  },

  // Items
  itemCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  itemCardBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemImageBox: {
    width: 60, height: 60, borderRadius: 14, backgroundColor: '#FFF0F7',
    alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden', flexShrink: 0,
  },
  itemImage: { width: '100%', height: '100%' },
  itemCenter: { flex: 1, marginRight: 10 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 3, lineHeight: 18 },
  itemUnitPrice: { fontSize: 11, color: '#9CA3AF', marginBottom: 3 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#F5317F' },
  itemQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnPlus: { backgroundColor: '#E85420' },
  qtyCount: { fontSize: 15, fontWeight: '700', color: '#111111', minWidth: 20, textAlign: 'center' },

  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 6,
    borderWidth: 1.5, borderColor: '#F5317F', borderRadius: 16, borderStyle: 'dashed',
  },
  addMoreText: { fontSize: 14, fontWeight: '600', color: '#F5317F' },

  // Delivery address
  addressConfirmed: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF0F7', borderRadius: 14,
    padding: 12, gap: 10,
    borderWidth: 1, borderColor: '#FDCDE5',
  },
  addressConfirmedIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5317F', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  addressConfirmedText: { fontSize: 13, fontWeight: '600', color: '#111111', lineHeight: 18, marginBottom: 4 },
  feeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  feeCalcText: { fontSize: 12, color: '#6B7280' },
  feeErrorText: { fontSize: 12, color: '#EF4444', marginTop: 2 },
  feeOkText: { fontSize: 12, color: '#C4165F', fontWeight: '600', marginTop: 2 },
  changeAddressBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', flexShrink: 0,
  },
  changeAddressBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  addressSearchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    paddingHorizontal: 12, height: 46,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  addressSearchWrapFocused: { borderColor: '#F5317F', backgroundColor: '#FFFFFF' },
  addressSearchInput: { flex: 1, fontSize: 14, color: '#111111' },
  addressSuggestions: {
    marginTop: 8, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  addressSuggRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12,
  },
  addressSuggBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  addressSuggIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0,
  },
  addressSuggMain: { fontSize: 13, fontWeight: '600', color: '#111111', marginBottom: 1 },
  addressSuggSub: { fontSize: 11, color: '#9CA3AF' },
  addressHint: { fontSize: 12, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },

  // Coupon
  couponRow: { flexDirection: 'row', gap: 10 },
  couponInput: {
    flex: 1, height: 46, backgroundColor: '#F9FAFB', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 14, color: '#111111',
    borderWidth: 1, borderColor: '#E5E7EB', letterSpacing: 1,
  },
  applyBtn: {
    backgroundColor: '#F5317F', borderRadius: 12, paddingHorizontal: 18,
    height: 46, alignItems: 'center', justifyContent: 'center', minWidth: 76,
  },
  applyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  couponApplied: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF0F7', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, gap: 10,
  },
  couponAppliedIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#F5317F', alignItems: 'center', justifyContent: 'center',
  },
  couponAppliedText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#C4165F' },
  couponError: { color: '#EF4444', fontSize: 12, marginTop: 8 },

  // Totals
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6,
  },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 14, fontWeight: '500', color: '#111111' },
  totalDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#111111' },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: '#111111' },

  // Checkout bar
  checkoutBar: { position: 'absolute', left: 16, right: 16 },
  checkoutBtn: {
    backgroundColor: '#111111', borderRadius: 18, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 14, elevation: 8,
  },
  checkoutBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  checkoutLeft: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#E85420', alignItems: 'center', justifyContent: 'center',
  },
  checkoutLeftDisabled: { backgroundColor: '#6B7280' },
  checkoutCount: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  checkoutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  checkoutAmount: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginRight: 10 },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111111', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 28 },
  browseBtn: {
    backgroundColor: '#F5317F', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#C4165F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  browseBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
