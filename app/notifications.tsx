import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Animated, RefreshControl,
  Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

function notifIcon(type: string): { name: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; bg: string; color: string } {
  switch (type) {
    case 'order_update':    return { name: 'bag-handle',            bg: '#FFF0F7', color: '#F5317F' };
    case 'ticket_response': return { name: 'chatbubble-ellipses',   bg: '#EFF6FF', color: '#3B82F6' };
    case 'promo':           return { name: 'pricetag',              bg: '#FEF9C3', color: '#CA8A04' };
    case 'new_arrival':     return { name: 'star',                  bg: '#FDF4FF', color: '#A855F7' };
    case 'delivery':        return { name: 'bicycle',               bg: '#FFF7ED', color: '#F97316' };
    default:                return { name: 'notifications',          bg: '#F3F4F6', color: '#6B7280' };
  }
}

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fadeAnims = useRef<Record<string, Animated.Value>>({});

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications_screen')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
        () => { fetchNotifications(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markAsRead = async (notif: Notification) => {
    if (notif.is_read) {
      // Navigate if applicable
      navigateFromNotif(notif);
      return;
    }

    // Animate fade-in for read state
    if (!fadeAnims.current[notif.id]) {
      fadeAnims.current[notif.id] = new Animated.Value(1);
    }

    await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', notif.id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );

    navigateFromNotif(notif);
  };

  const navigateFromNotif = (notif: Notification) => {
    if (notif.type === 'order_update' && notif.metadata?.order_id) {
      router.push('/(tabs)/orders');
    } else if (notif.type === 'ticket_response' && notif.metadata?.ticket_id) {
      router.push('/help-centre');
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);
    await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#F5317F" />
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{unreadCount} unread</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={s.markAllBtn}
            onPress={markAllRead}
            disabled={markingAll}
          >
            {markingAll
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={s.markAllText}>Mark all read</Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.6)" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search notifications..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#F5317F" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
              tintColor="#F5317F" colors={['#F5317F']}
            />
          }
        >
          {filteredNotifications.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
              </View>
              <Text style={s.emptyTitle}>
                {search.trim() ? 'No results found' : 'No notifications yet'}
              </Text>
              <Text style={s.emptySub}>
                {search.trim()
                  ? 'Try a different search term'
                  : "We'll notify you about order updates and more"}
              </Text>
            </View>
          ) : (
            <>
              {/* Unread section */}
              {filteredNotifications.some((n) => !n.is_read) && (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>UNREAD</Text>
                  {filteredNotifications.filter((n) => !n.is_read).map((notif) =>
                    <NotifCard key={notif.id} notif={notif} onPress={markAsRead} />
                  )}
                </View>
              )}

              {/* Read section */}
              {filteredNotifications.some((n) => n.is_read) && (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>EARLIER</Text>
                  {filteredNotifications.filter((n) => n.is_read).map((notif) =>
                    <NotifCard key={notif.id} notif={notif} onPress={markAsRead} />
                  )}
                </View>
              )}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function NotifCard({ notif, onPress }: { notif: Notification; onPress: (n: Notification) => void }) {
  const icon = notifIcon(notif.type);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress(notif);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[c.card, !notif.is_read && c.cardUnread]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Unread indicator strip */}
        {!notif.is_read && <View style={c.unreadStrip} />}

        {/* Icon */}
        <View style={[c.iconWrap, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>

        {/* Content */}
        <View style={c.content}>
          <View style={c.contentTop}>
            <Text style={[c.title, !notif.is_read && c.titleUnread]} numberOfLines={1}>
              {notif.title}
            </Text>
            <Text style={c.time}>{timeAgo(notif.created_at)}</Text>
          </View>
          <Text style={c.message} numberOfLines={2}>{notif.message}</Text>

          {/* Tappable hint for navigable notifications */}
          {(notif.type === 'order_update' || notif.type === 'ticket_response') && (
            <View style={c.actionHint}>
              <Text style={c.actionHintText}>
                {notif.type === 'order_update' ? 'View order' : 'View ticket'}
              </Text>
              <Ionicons name="chevron-forward" size={12} color="#F5317F" />
            </View>
          )}
        </View>

        {/* Unread dot */}
        {!notif.is_read && <View style={c.dot} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1B1F3B' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#F5317F',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerBadge:  {
    marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  markAllBtn: { paddingHorizontal: 4, paddingVertical: 6 },
  markAllText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 14, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#FFFFFF' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingTop: 12 },

  emptyWrap: { paddingTop: 80, alignItems: 'center', paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  emptySub:   { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },

  section:      { marginBottom: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: 16, marginBottom: 8, marginTop: 8,
  },
});

const c = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', marginHorizontal: 16,
    borderRadius: 16, marginBottom: 8, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: '#FAFFFE',
    shadowOpacity: 0.09,
    elevation: 3,
  },
  unreadStrip: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    backgroundColor: '#F5317F', borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
  },
  content: { flex: 1 },
  contentTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 4,
  },
  title: { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151', marginRight: 8, lineHeight: 19 },
  titleUnread: { fontWeight: '700', color: '#111111' },
  time: { fontSize: 11, color: '#9CA3AF', flexShrink: 0, marginTop: 1 },
  message: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  actionHint: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6,
  },
  actionHintText: { fontSize: 12, color: '#F5317F', fontWeight: '600', marginRight: 2 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#F5317F', marginTop: 4, marginLeft: 4, flexShrink: 0,
  },
});
