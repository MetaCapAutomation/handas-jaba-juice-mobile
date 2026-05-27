import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { Tables, Enums } from '../../types/database';

type Order = Tables<'orders'>;
type OrderStatus = Enums<'order_status'>;

type StatusStep = {
  key: OrderStatus | 'paid';
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const STATUS_STEPS: StatusStep[] = [
  { key: 'pending', label: 'Order Placed', description: 'We received your order', icon: 'receipt-outline' },
  { key: 'processing', label: 'Preparing', description: 'Crafting your fresh juices', icon: 'flask-outline' },
  { key: 'confirmed', label: 'Confirmed', description: 'Order is ready for dispatch', icon: 'checkmark-circle-outline' },
  { key: 'out_for_delivery', label: 'On the Way', description: 'Rider is heading to you', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'Delivered', description: 'Enjoy your fresh juice!', icon: 'happy-outline' },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0,
  paid: 0,
  processing: 1,
  confirmed: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: -1,
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; accent: string }> = {
  pending:          { bg: '#F3F4F6', text: '#374151', accent: '#9CA3AF' },
  paid:             { bg: '#EFF6FF', text: '#1D4ED8', accent: '#3B82F6' },
  processing:       { bg: '#FFFBEB', text: '#92400E', accent: '#F59E0B' },
  confirmed:        { bg: '#F5F3FF', text: '#5B21B6', accent: '#7C3AED' },
  out_for_delivery: { bg: '#FFF7ED', text: '#9A3412', accent: '#F97316' },
  delivered:        { bg: '#F0FEF8', text: '#0F7A5A', accent: '#5DC9A0' },
  cancelled:        { bg: '#FEF2F2', text: '#991B1B', accent: '#EF4444' },
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchOrder();

    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setOrder(payload.new as Order);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id as string)
      .single();
    setOrder(data ?? null);
    setLoading(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#4259C5" />
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#4259C5' }}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#F5317F" />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#4259C5" />
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#4259C5' }}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>Order not found</Text>
        </View>
      </View>
    );
  }

  const currentIndex = STATUS_ORDER[order.status];
  const isCancelled = order.status === 'cancelled';
  const statusColor = STATUS_COLORS[order.status];
  const items = Array.isArray(order.items) ? order.items as { name: string; qty: number; price?: number }[] : [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#4259C5" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#4259C5' }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Order identity card */}
        <View style={styles.identityCard}>
          <View style={styles.identityTop}>
            <View>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
              <Text style={styles.orderMeta}>
                {formatDate(order.created_at)} at {formatTime(order.created_at)}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusColor.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor.accent }]} />
              <Text style={[styles.statusPillText, { color: statusColor.text }]}>
                {STATUS_LABELS[order.status]}
              </Text>
            </View>
          </View>
          <View style={styles.identityDivider} />
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Order Total</Text>
            <Text style={styles.amountValue}>KES {order.total_amount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Tracking roadmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Tracking</Text>

          {isCancelled ? (
            <View style={styles.cancelledCard}>
              <View style={styles.cancelledIconWrap}>
                <Ionicons name="close-circle" size={32} color="#EF4444" />
              </View>
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledDesc}>
                This order was cancelled. If you have any questions, please contact support.
              </Text>
            </View>
          ) : (
            <View style={styles.roadmap}>
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = currentIndex > index;
                const isActive = currentIndex === index;
                const isLast = index === STATUS_STEPS.length - 1;

                return (
                  <View key={step.key} style={styles.roadmapRow}>
                    {/* Left: connector line + circle */}
                    <View style={styles.roadmapLeft}>
                      <View style={[
                        styles.stepCircle,
                        isCompleted && styles.stepCircleCompleted,
                        isActive && styles.stepCircleActive,
                      ]}>
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : isActive ? (
                          <View style={styles.stepActiveDot} />
                        ) : (
                          <View style={styles.stepInactiveDot} />
                        )}
                      </View>
                      {!isLast && (
                        <View style={[
                          styles.stepLine,
                          isCompleted && styles.stepLineCompleted,
                        ]} />
                      )}
                    </View>

                    {/* Right: step info */}
                    <View style={[styles.roadmapContent, !isLast && { marginBottom: 0 }]}>
                      <View style={[
                        styles.stepCard,
                        isActive && styles.stepCardActive,
                        isCompleted && styles.stepCardCompleted,
                      ]}>
                        <View style={[
                          styles.stepIconBox,
                          isActive && styles.stepIconBoxActive,
                          isCompleted && styles.stepIconBoxCompleted,
                        ]}>
                          <Ionicons
                            name={step.icon}
                            size={18}
                            color={isCompleted ? '#0F7A5A' : isActive ? '#FFFFFF' : '#9CA3AF'}
                          />
                        </View>
                        <View style={styles.stepText}>
                          <Text style={[
                            styles.stepLabel,
                            isActive && styles.stepLabelActive,
                            isCompleted && styles.stepLabelCompleted,
                          ]}>
                            {step.label}
                          </Text>
                          <Text style={[
                            styles.stepDesc,
                            (isActive || isCompleted) && styles.stepDescActive,
                          ]}>
                            {step.description}
                          </Text>
                        </View>
                        {isActive && (
                          <View style={styles.activePulse}>
                            <View style={styles.activePulseDot} />
                          </View>
                        )}
                      </View>
                      {!isLast && <View style={{ height: 8 }} />}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          <View style={styles.itemsCard}>
            {items.map((item, i) => (
              <View key={i} style={[styles.itemRow, i < items.length - 1 && styles.itemRowBorder]}>
                <View style={styles.itemBullet}>
                  <Text style={styles.itemBulletText}>🥤</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.qty}</Text>
                </View>
                {item.price !== undefined && (
                  <Text style={styles.itemPrice}>KES {(item.price * item.qty).toLocaleString()}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Delivery info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryRow}>
              <Ionicons name="location-outline" size={18} color="#6B7280" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deliveryLabel}>Delivery Address</Text>
                <Text style={styles.deliveryValue}>{order.delivery_address}</Text>
              </View>
            </View>
            {order.delivery_phone && (
              <View style={[styles.deliveryRow, { marginTop: 14 }]}>
                <Ionicons name="call-outline" size={18} color="#6B7280" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.deliveryLabel}>Contact</Text>
                  <Text style={styles.deliveryValue}>{order.delivery_phone}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Price breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.priceCard}>
            {order.discount_amount !== null && order.discount_amount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabelText}>Discount</Text>
                <Text style={[styles.priceValue, { color: '#5DC9A0' }]}>−KES {order.discount_amount.toLocaleString()}</Text>
              </View>
            )}
            {order.delivery_fee !== null && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabelText}>Delivery Fee</Text>
                <Text style={styles.priceValue}>KES {order.delivery_fee.toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceTotalLabel}>Total</Text>
              <Text style={styles.priceTotalValue}>KES {order.total_amount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1B1F3B',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#4259C5',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // Identity card
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  identityTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.3,
  },
  orderMeta: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 3,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  identityDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },

  // Section
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  // Cancelled card
  cancelledCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelledIconWrap: {
    marginBottom: 12,
  },
  cancelledTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 8,
  },
  cancelledDesc: {
    fontSize: 14,
    color: '#B91C1C',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Roadmap
  roadmap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  roadmapRow: {
    flexDirection: 'row',
  },
  roadmapLeft: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleCompleted: {
    backgroundColor: '#5DC9A0',
    borderColor: '#5DC9A0',
  },
  stepCircleActive: {
    backgroundColor: '#F5317F',
    borderColor: '#F5317F',
  },
  stepActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  stepInactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginTop: 2,
    marginBottom: 2,
  },
  stepLineCompleted: {
    backgroundColor: '#5DC9A0',
  },
  roadmapContent: {
    flex: 1,
    paddingBottom: 0,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 62,
  },
  stepCardActive: {
    backgroundColor: '#F5317F',
    borderColor: '#F5317F',
  },
  stepCardCompleted: {
    backgroundColor: '#F0FEF8',
    borderColor: '#A7F3D0',
  },
  stepIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  stepIconBoxActive: {
    backgroundColor: '#C4165F',
  },
  stepIconBoxCompleted: {
    backgroundColor: '#D1FAE5',
  },
  stepText: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  stepLabelActive: {
    color: '#FFFFFF',
  },
  stepLabelCompleted: {
    color: '#0F7A5A',
  },
  stepDesc: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  stepDescActive: {
    color: '#6B7280',
  },
  activePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(245,49,127,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  activePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F5317F',
  },

  // Items
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemBullet: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF0F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemBulletText: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },

  // Delivery card
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  deliveryValue: {
    fontSize: 14,
    color: '#111111',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Price card
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  priceLabelText: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  priceTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  priceTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.3,
  },
});
