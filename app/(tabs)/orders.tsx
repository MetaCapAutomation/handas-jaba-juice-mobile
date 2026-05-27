import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, TextInput, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Tables, Enums } from '../../types/database';
import { SkeletonBox } from '../../components/SkeletonBox';

type Order = Tables<'orders'>;
type OrderStatus = Enums<'order_status'>;
type DateFilter = 'all' | 'today' | 'week' | 'month';

const { width: SCREEN_W } = Dimensions.get('window');

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:          { label: 'Pending',          bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' },
  paid:             { label: 'Paid',             bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  processing:       { label: 'Processing',       bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  confirmed:        { label: 'Confirmed',        bg: '#F5F3FF', text: '#5B21B6', dot: '#7C3AED' },
  out_for_delivery: { label: 'On the way',       bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  delivered:        { label: 'Delivered',        bg: '#F0FEF8', text: '#0F7A5A', dot: '#5DC9A0' },
  cancelled:        { label: 'Cancelled',        bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' },
};

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

export default function OrdersScreen() {
  const { user } = useAuthStore();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
    if (!user) return;
    const channel = supabase
      .channel('customer-orders')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders, user]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) => {
        const numMatch = o.order_number.toLowerCase().includes(q);
        const items = Array.isArray(o.items) ? o.items as { name?: string }[] : [];
        const itemMatch = items.some((i) => i.name?.toLowerCase().includes(q));
        return numMatch || itemMatch;
      });
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter((o) => {
        const d = new Date(o.created_at);
        if (dateFilter === 'today') return d.toDateString() === now.toDateString();
        if (dateFilter === 'week') return d >= new Date(now.getTime() - 7 * 86400000);
        if (dateFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    return result;
  }, [orders, searchQuery, dateFilter]);

  const tabBarH = 68 + (bottomInset > 0 ? bottomInset - 4 : 12);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#4259C5" />
        <View style={styles.headerBlock}>
          <Text style={styles.screenTitle}>My Orders</Text>
          <Text style={styles.screenSubtitle}>Track your juice deliveries</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <SkeletonBox width={120} height={13} borderRadius={6} />
                <SkeletonBox width={70} height={22} borderRadius={11} />
              </View>
              <SkeletonBox width="60%" height={13} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonBox width="40%" height={13} borderRadius={6} style={{ marginBottom: 12 }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <SkeletonBox width={80} height={18} borderRadius={9} />
                <SkeletonBox width={60} height={18} borderRadius={9} />
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4259C5" />
      {/* Header */}
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>My Orders</Text>
            <Text style={styles.screenSubtitle}>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.6)" style={{ marginLeft: 14 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order # or item..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 12 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Date filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {DATE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, dateFilter === f.key && styles.filterChipActive]}
              onPress={() => setDateFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, dateFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {filteredOrders.length === 0 ? (
        <View style={styles.centered}>
          {orders.length === 0 ? (
            <>
              <View style={styles.emptyIllustration}>
                <Ionicons name="bag-handle-outline" size={52} color="#F5317F" />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>
                Start shopping to see your orders here
              </Text>
              <TouchableOpacity
                style={styles.shopBtn}
                onPress={() => router.push('/(tabs)/shop')}
                activeOpacity={0.88}
              >
                <Ionicons name="storefront-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.shopBtnText}>Shop Now</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="search-outline" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Try a different search or filter</Text>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setSearchQuery(''); setDateFilter('all'); }}>
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarH + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOrders(); }}
              tintColor="#F5317F"
              colors={['#F5317F']}
            />
          }
        >
          {filteredOrders.map((order) => {
            const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const items = Array.isArray(order.items) ? order.items as { name: string; qty: number }[] : [];
            const isDelivered = order.status === 'delivered';
            const isCancelled = order.status === 'cancelled';

            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } } as any)}
                activeOpacity={0.88}
              >
                {/* Card top: order number + status */}
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <View style={styles.orderIconWrap}>
                      <Ionicons
                        name={isDelivered ? 'checkmark-circle' : isCancelled ? 'close-circle' : 'time-outline'}
                        size={18}
                        color={isDelivered ? '#5DC9A0' : isCancelled ? '#EF4444' : '#F59E0B'}
                      />
                    </View>
                    <View>
                      <Text style={styles.orderNumber}>{order.order_number}</Text>
                      <Text style={styles.orderDate}>{formatDate(order.created_at)} · {formatTime(order.created_at)}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: config.dot }]} />
                    <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Items preview */}
                <View style={styles.cardItems}>
                  {items.slice(0, 2).map((item, i) => (
                    <Text key={i} style={styles.cardItemText} numberOfLines={1}>
                      · {item.name} × {item.qty}
                    </Text>
                  ))}
                  {items.length > 2 && (
                    <Text style={styles.cardMoreText}>+{items.length - 2} more items</Text>
                  )}
                </View>

                {/* Footer: total + arrow */}
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardTotalLabel}>Total paid</Text>
                    <Text style={styles.cardTotalAmount}>KES {order.total_amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1B1F3B',
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Header
  headerBlock: {
    backgroundColor: '#4259C5',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    marginBottom: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    paddingHorizontal: 10,
    height: '100%',
  },
  filterList: {
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  filterChipTextActive: {
    color: '#4259C5',
  },

  // Orders list
  list: { flex: 1 },
  listContent: {
    padding: 16,
    gap: 12,
  },

  // Order card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  orderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  orderDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardItems: {
    gap: 3,
    marginBottom: 14,
  },
  cardItemText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  cardMoreText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTotalLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  cardTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.3,
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5317F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyIllustration: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  shopBtn: {
    backgroundColor: '#F5317F',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#C4165F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
