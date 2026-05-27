import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Animated, RefreshControl,
  Modal, KeyboardAvoidingView, Platform, Image, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

// ── Types ──────────────────────────────────────────────────────────────────────
type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
};

type TicketResponse = {
  id: string;
  content: string;
  responder_name: string | null;
  responder_role: string | null;
  is_internal: boolean;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
};

const CATEGORIES = [
  { id: 'general',       label: 'General Enquiry',   emoji: '💬' },
  { id: 'order_issue',   label: 'Order Issue',        emoji: '📦' },
  { id: 'payment',       label: 'Payment',            emoji: '💳' },
  { id: 'delivery',      label: 'Delivery',           emoji: '🚴' },
  { id: 'product',       label: 'Product Quality',    emoji: '🥤' },
  { id: 'refund',        label: 'Refund / Return',    emoji: '↩️' },
  { id: 'account',       label: 'Account',            emoji: '👤' },
  { id: 'other',         label: 'Other',              emoji: '📋' },
];

function statusConfig(status: Ticket['status']) {
  switch (status) {
    case 'open':         return { label: 'Open',        bg: '#DBEAFE', color: '#1D4ED8' };
    case 'in_progress':  return { label: 'In Progress', bg: '#FEF9C3', color: '#854D0E' };
    case 'resolved':     return { label: 'Resolved',    bg: '#D1FAE5', color: '#0F7A5A' };
    case 'closed':       return { label: 'Closed',      bg: '#F3F4F6', color: '#6B7280' };
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7)  return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function HelpCentreScreen() {
  const { user } = useAuthStore();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search + filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, description, status, priority, category, created_at, updated_at, attachment_url, attachment_name')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setTickets((data as Ticket[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView('detail');
  };

  const onRefresh = () => { setRefreshing(true); fetchTickets(); };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || dateFilter !== 'all' || categoryFilter !== 'all';

  const filteredTickets = useMemo(() => {
    const now = new Date();
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((ticket) => {
      // Search filter
      if (q) {
        const matchSubject = ticket.subject.toLowerCase().includes(q);
        const matchNumber  = ticket.ticket_number.toLowerCase().includes(q);
        if (!matchSubject && !matchNumber) return false;
      }
      // Date filter
      if (dateFilter !== 'all') {
        const d = new Date(ticket.created_at);
        if (dateFilter === 'today') {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'week') {
          if (d < new Date(now.getTime() - 7 * 86400000)) return false;
        } else if (dateFilter === 'month') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      // Category filter
      if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
      return true;
    });
  }, [tickets, searchQuery, dateFilter, categoryFilter]);

  if (view === 'create') {
    return (
      <CreateTicketView
        user={user}
        onCreated={() => { fetchTickets(); setView('list'); }}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'detail' && selectedTicket) {
    return (
      <TicketDetailView
        ticket={selectedTicket}
        user={user}
        onBack={() => { setView('list'); fetchTickets(); }}
        onTicketUpdated={(t) => setSelectedTicket(t)}
      />
    );
  }

  // ── List view ──
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#E85420" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Help Centre</Text>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => setView('create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={s.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* ── Banner ── */}
      <View style={s.banner}>
        <View style={s.bannerIconWrap}>
          <Ionicons name="headset" size={28} color="#F5317F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle}>How can we help?</Text>
          <Text style={s.bannerSub}>Submit a ticket and our team will get back to you shortly.</Text>
        </View>
      </View>

      {/* ── Search + Filters ── */}
      {!loading && (
        <View style={s.filterSection}>
          {/* Search bar */}
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by subject or ticket #..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Date filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
          >
            {(['all', 'today', 'week', 'month'] as const).map((f) => {
              const label = f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month';
              const active = dateFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setDateFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={s.chipDivider} />
            {/* Category chips */}
            <TouchableOpacity
              style={[s.chip, categoryFilter === 'all' && s.chipActive]}
              onPress={() => setCategoryFilter('all')}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, categoryFilter === 'all' && s.chipTextActive]}>All Categories</Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setCategoryFilter(cat.id)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12, marginRight: 4 }}>{cat.emoji}</Text>
                  <Text style={[s.chipText, active && s.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active filter count badge */}
          {hasActiveFilters && (
            <View style={s.activeFilterRow}>
              <View style={s.activeFilterBadge}>
                <Ionicons name="filter" size={12} color="#C4165F" style={{ marginRight: 4 }} />
                <Text style={s.activeFilterText}>Filters active</Text>
              </View>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={s.clearFiltersText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#F5317F" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5317F" colors={['#F5317F']} />
          }
        >
          {tickets.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              </View>
              <Text style={s.emptyTitle}>No tickets yet</Text>
              <Text style={s.emptySub}>Tap "New" to create your first support ticket.</Text>
              <TouchableOpacity style={s.emptyCreateBtn} onPress={() => setView('create')}>
                <Text style={s.emptyCreateText}>Create a Ticket</Text>
              </TouchableOpacity>
            </View>
          ) : filteredTickets.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              </View>
              <Text style={s.emptyTitle}>No results found</Text>
              <Text style={s.emptySub}>No tickets match your current search or filters.</Text>
              <TouchableOpacity style={s.emptyCreateBtn} onPress={clearFilters}>
                <Text style={s.emptyCreateText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={openTicket} />)
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Ticket card ────────────────────────────────────────────────────────────────
function TicketCard({ ticket, onPress }: { ticket: Ticket; onPress: (t: Ticket) => void }) {
  const sc = statusConfig(ticket.status);
  const cat = CATEGORIES.find((c) => c.id === ticket.category);

  return (
    <TouchableOpacity style={tc.card} onPress={() => onPress(ticket)} activeOpacity={0.85}>
      <View style={tc.topRow}>
        <Text style={tc.number}>#{ticket.ticket_number}</Text>
        <View style={[tc.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[tc.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>
      <Text style={tc.subject} numberOfLines={2}>{ticket.subject}</Text>
      <View style={tc.metaRow}>
        <View style={tc.catChip}>
          <Text style={{ fontSize: 12, marginRight: 4 }}>{cat?.emoji}</Text>
          <Text style={tc.catText}>{cat?.label ?? ticket.category}</Text>
        </View>
        <Text style={tc.time}>{timeAgo(ticket.updated_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Create ticket view ─────────────────────────────────────────────────────────
function CreateTicketView({
  user, onCreated, onBack,
}: {
  user: any;
  onCreated: () => void;
  onBack: () => void;
}) {
  const [subject, setSubject]   = useState('');
  const [description, setDesc]  = useState('');
  const [category, setCat]      = useState('general');
  const [attachment, setAttach] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop() ?? 'jpg';
      const name  = `attachment_${Date.now()}.${ext}`;
      const type  = asset.mimeType ?? `image/${ext}`;
      setAttach({ uri: asset.uri, name, type });
    }
  };

  const removeAttachment = () => setAttach(null);

  const submit = async () => {
    if (!subject.trim())      { setError('Please enter a subject.'); return; }
    if (!description.trim())  { setError('Please describe your issue.'); return; }
    if (!user)                { setError('You must be signed in.'); return; }
    setError('');
    setSubmit(true);

    try {
      let attachment_url: string | null  = null;
      let attachment_name: string | null = null;
      let attachment_type: string | null = null;

      // Upload attachment if present
      if (attachment) {
        const resp = await fetch(attachment.uri);
        const blob = await resp.blob();
        const path = `tickets/${user.id}/${attachment.name}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('support-attachments')
          .upload(path, blob, { contentType: attachment.type, upsert: true });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from('support-attachments')
            .getPublicUrl(uploadData.path);
          attachment_url  = urlData?.publicUrl ?? null;
          attachment_name = attachment.name;
          attachment_type = attachment.type;
        }
      }

      // Generate ticket number
      const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;

      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone_number')
        .eq('user_id', user.id)
        .single();

      const customerName = profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || user.email
        : user.email;

      const { data: ticket, error: insertErr } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          subject: subject.trim(),
          description: description.trim(),
          category,
          status: 'open',
          priority: 'medium',
          source: 'customer',
          user_id: user.id,
          customer_name: customerName,
          customer_email: user.email,
          customer_phone: profile?.phone_number ?? null,
          attachment_url,
          attachment_name,
          attachment_type,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      onCreated();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmit(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Ticket</Text>
        <View style={{ width: 80 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={f.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!!error && (
            <View style={f.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={f.errorText}>{error}</Text>
            </View>
          )}

          {/* Subject */}
          <Text style={f.label}>Subject <Text style={f.required}>*</Text></Text>
          <TextInput
            style={f.input}
            placeholder="Briefly describe your issue"
            placeholderTextColor="#9CA3AF"
            value={subject}
            onChangeText={setSubject}
            maxLength={120}
          />

          {/* Category */}
          <Text style={[f.label, { marginTop: 18 }]}>Category <Text style={f.required}>*</Text></Text>
          <View style={f.catGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[f.catChip, category === cat.id && f.catChipActive]}
                onPress={() => setCat(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16, marginBottom: 4 }}>{cat.emoji}</Text>
                <Text style={[f.catChipText, category === cat.id && f.catChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={[f.label, { marginTop: 18 }]}>Description <Text style={f.required}>*</Text></Text>
          <TextInput
            style={[f.input, f.textArea]}
            placeholder="Provide as much detail as possible..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDesc}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* Attachment */}
          <Text style={[f.label, { marginTop: 18 }]}>Attachment <Text style={f.optional}>(optional)</Text></Text>
          {attachment ? (
            <View style={f.attachWrap}>
              {attachment.type.startsWith('image') ? (
                <Image source={{ uri: attachment.uri }} style={f.attachThumb} resizeMode="cover" />
              ) : (
                <View style={f.attachIcon}>
                  <Ionicons name="document-attach" size={28} color="#6B7280" />
                </View>
              )}
              <View style={f.attachInfo}>
                <Text style={f.attachName} numberOfLines={1}>{attachment.name}</Text>
                <Text style={f.attachType}>{attachment.type}</Text>
              </View>
              <TouchableOpacity onPress={removeAttachment} style={f.attachRemove}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={f.attachBtn} onPress={pickImage} activeOpacity={0.8}>
              <Ionicons name="attach" size={22} color="#6B7280" style={{ marginRight: 10 }} />
              <Text style={f.attachBtnText}>Attach image or file</Text>
            </TouchableOpacity>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[f.submitBtn, submitting && { opacity: 0.75 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#FFFFFF" />
              : <>
                  <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={f.submitText}>Submit Ticket</Text>
                </>
            }
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Ticket detail view ─────────────────────────────────────────────────────────
function TicketDetailView({
  ticket, user, onBack, onTicketUpdated,
}: {
  ticket: Ticket;
  user: any;
  onBack: () => void;
  onTicketUpdated: (t: Ticket) => void;
}) {
  const insets = useSafeAreaInsets();
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [reply, setReply]         = useState('');
  const [replyAttach, setReplyAttach] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const sc = statusConfig(ticket.status);
  const cat = CATEGORIES.find((c) => c.id === ticket.category);

  const fetchResponses = useCallback(async () => {
    const { data } = await supabase
      .from('ticket_responses')
      .select('id, content, responder_name, responder_role, is_internal, created_at, attachment_url, attachment_name')
      .eq('ticket_id', ticket.id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });
    setResponses((data as TicketResponse[]) ?? []);
    setLoading(false);
  }, [ticket.id]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  // Realtime responses
  useEffect(() => {
    const ch = supabase
      .channel(`ticket_${ticket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_responses', filter: `ticket_id=eq.${ticket.id}` },
        () => fetchResponses()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticket.id, fetchResponses]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop() ?? 'jpg';
      const name  = `reply_${Date.now()}.${ext}`;
      const type  = asset.mimeType ?? `image/${ext}`;
      setReplyAttach({ uri: asset.uri, name, type });
    }
  };

  const sendReply = async () => {
    if (!reply.trim() && !replyAttach) { setSendError('Please enter a message.'); return; }
    if (!user) return;
    setSendError('');
    setSending(true);

    try {
      let attachment_url: string | null  = null;
      let attachment_name: string | null = null;
      let attachment_type: string | null = null;

      if (replyAttach) {
        const resp = await fetch(replyAttach.uri);
        const blob = await resp.blob();
        const path = `tickets/${user.id}/replies/${replyAttach.name}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('support-attachments')
          .upload(path, blob, { contentType: replyAttach.type, upsert: true });
        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from('support-attachments')
            .getPublicUrl(uploadData.path);
          attachment_url  = urlData?.publicUrl ?? null;
          attachment_name = replyAttach.name;
          attachment_type = replyAttach.type;
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      const name = profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || user.email
        : user.email;

      const { error: insertErr } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id:      ticket.id,
          responder_id:   user.id,
          responder_name: name,
          responder_email: user.email,
          responder_role: 'customer',
          content:        reply.trim(),
          is_internal:    false,
          attachment_url,
          attachment_name,
          attachment_type,
        });

      if (insertErr) throw insertErr;

      setReply('');
      setReplyAttach(null);
      fetchResponses();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (err: any) {
      setSendError(err?.message ?? 'Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          <Text style={s.headerTitle} numberOfLines={1}>#{ticket.ticket_number}</Text>
        </View>
        <View style={[sc_badge.badge, { backgroundColor: sc.bg }]}>
          <Text style={[sc_badge.text, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={d.scrollContent}
        >
          {/* Ticket summary */}
          <View style={d.summaryCard}>
            <Text style={d.subject}>{ticket.subject}</Text>
            <View style={d.metaRow}>
              <View style={d.catChip}>
                <Text style={{ fontSize: 13, marginRight: 4 }}>{cat?.emoji}</Text>
                <Text style={d.catText}>{cat?.label ?? ticket.category}</Text>
              </View>
              <Text style={d.metaTime}>{timeAgo(ticket.created_at)}</Text>
            </View>
            {ticket.description ? (
              <Text style={d.description}>{ticket.description}</Text>
            ) : null}
            {ticket.attachment_url && (
              <TouchableOpacity style={d.attachRow}>
                <Ionicons name="attach" size={14} color="#6B7280" />
                <Text style={d.attachText} numberOfLines={1}>{ticket.attachment_name ?? 'Attachment'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Responses */}
          {loading ? (
            <ActivityIndicator color="#F5317F" style={{ marginTop: 24 }} />
          ) : responses.length === 0 ? (
            <View style={d.noRepliesWrap}>
              <Ionicons name="chatbubbles-outline" size={32} color="#D1D5DB" />
              <Text style={d.noRepliesText}>No replies yet. We'll respond soon!</Text>
            </View>
          ) : (
            responses.map((resp) => (
              <ResponseBubble key={resp.id} resp={resp} isCustomer={resp.responder_role === 'customer'} />
            ))
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Reply bar — hide if resolved/closed */}
        {(ticket.status === 'open' || ticket.status === 'in_progress') && (
          <View style={[d.replyContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom + 4, 20) : 14 }]}>
            {!!sendError && (
              <Text style={d.replyError}>{sendError}</Text>
            )}

            {replyAttach && (
              <View style={d.replyAttachPreview}>
                {replyAttach.type.startsWith('image') ? (
                  <Image source={{ uri: replyAttach.uri }} style={d.replyThumb} resizeMode="cover" />
                ) : (
                  <Ionicons name="document" size={20} color="#6B7280" />
                )}
                <Text style={d.replyAttachName} numberOfLines={1}>{replyAttach.name}</Text>
                <TouchableOpacity onPress={() => setReplyAttach(null)}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            <View style={d.replyRow}>
              <TouchableOpacity style={d.attachIconBtn} onPress={pickImage}>
                <Ionicons name="attach" size={22} color="#6B7280" />
              </TouchableOpacity>
              <TextInput
                style={d.replyInput}
                placeholder="Type your reply..."
                placeholderTextColor="#9CA3AF"
                value={reply}
                onChangeText={setReply}
                multiline
                maxLength={1000}
                onFocus={() => {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
                }}
              />
              <TouchableOpacity
                style={[d.sendBtn, (!reply.trim() && !replyAttach) && d.sendBtnDisabled]}
                onPress={sendReply}
                disabled={sending || (!reply.trim() && !replyAttach)}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Ionicons name="send" size={18} color="#FFFFFF" />
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(ticket.status === 'resolved' || ticket.status === 'closed') && (
          <View style={d.closedBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#5DC9A0" style={{ marginRight: 8 }} />
            <Text style={d.closedBannerText}>This ticket is {ticket.status}. Open a new ticket if you need further help.</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ResponseBubble({ resp, isCustomer }: { resp: TicketResponse; isCustomer: boolean }) {
  return (
    <View style={[b.wrap, isCustomer ? b.wrapRight : b.wrapLeft]}>
      {!isCustomer && (
        <View style={b.agentAvatar}>
          <Ionicons name="headset" size={16} color="#F5317F" />
        </View>
      )}
      <View style={[b.bubble, isCustomer ? b.bubbleCustomer : b.bubbleAgent]}>
        {!isCustomer && (
          <Text style={b.agentName}>{resp.responder_name ?? 'Support'}</Text>
        )}
        <Text style={[b.content, isCustomer ? b.contentCustomer : b.contentAgent]}>
          {resp.content}
        </Text>
        {resp.attachment_url && (
          <View style={b.attachRow}>
            <Ionicons name="attach" size={12} color={isCustomer ? 'rgba(255,255,255,0.8)' : '#9CA3AF'} />
            <Text style={[b.attachText, isCustomer && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
              {resp.attachment_name ?? 'Attachment'}
            </Text>
          </View>
        )}
        <Text style={[b.time, isCustomer && { color: 'rgba(255,255,255,0.7)' }]}>
          {timeAgo(resp.created_at)}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1B1F3B' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#E85420',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginHorizontal: 12 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5317F', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#C4165F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  newBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 4 },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  bannerIconWrap: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF0F7',
    alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
  },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 2 },
  bannerSub:   { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingTop: 12, paddingHorizontal: 16 },

  emptyWrap:      { paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyIconWrap:  {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  emptySub:       { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyCreateBtn: {
    backgroundColor: '#F5317F', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyCreateText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Search + filter
  filterSection: { paddingTop: 12, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF', padding: 0 },
  chipRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  chipActive:     { backgroundColor: '#FFF0F7', borderColor: '#F5317F' },
  chipText:       { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  chipTextActive: { color: '#C4165F', fontWeight: '700' },
  chipDivider:    { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 4, borderRadius: 1 },
  activeFilterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 8,
  },
  activeFilterBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF0F7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  activeFilterText: { fontSize: 12, color: '#C4165F', fontWeight: '600' },
  clearFiltersText: { fontSize: 13, color: '#F5317F', fontWeight: '700' },
});

const tc = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  number: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 12, fontWeight: '700' },
  subject: { fontSize: 15, fontWeight: '600', color: '#111111', marginBottom: 10, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  catText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  time:    { fontSize: 12, color: '#9CA3AF' },
});

const f = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  label:         { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  required:      { color: '#EF4444' },
  optional:      { color: '#9CA3AF', fontWeight: '400' },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111111', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  textArea: { height: 120, paddingTop: 14 },
  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  catChip: {
    alignItems: 'center', justifyContent: 'center',
    width: '22%', paddingVertical: 12, borderRadius: 14,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent',
  },
  catChipActive: { backgroundColor: '#FFF0F7', borderColor: '#F5317F' },
  catChipText:   { fontSize: 11, color: '#6B7280', fontWeight: '500', textAlign: 'center' },
  catChipTextActive: { color: '#C4165F', fontWeight: '700' },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  attachBtnText: { color: '#6B7280', fontSize: 14 },
  attachWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  attachThumb: { width: 52, height: 52, borderRadius: 8, marginRight: 12 },
  attachIcon:  {
    width: 52, height: 52, borderRadius: 8, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  attachInfo:  { flex: 1 },
  attachName:  { fontSize: 13, fontWeight: '600', color: '#111111', marginBottom: 2 },
  attachType:  { fontSize: 11, color: '#9CA3AF' },
  attachRemove: { padding: 4 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5317F', borderRadius: 14, height: 54,
    marginTop: 24,
    shadowColor: '#C4165F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, color: '#EF4444', fontSize: 13, fontWeight: '500' },
});

const d = StyleSheet.create({
  scrollContent: { paddingTop: 12 },
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  subject: { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 10, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  catChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  catText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  metaTime: { fontSize: 12, color: '#9CA3AF' },
  description: { fontSize: 14, color: '#374151', lineHeight: 20 },
  attachRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  attachText: { flex: 1, fontSize: 12, color: '#6B7280' },
  noRepliesWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noRepliesText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  replyContainer: {
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 14,
  },
  replyError: { fontSize: 12, color: '#EF4444', marginBottom: 6 },
  replyAttachPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: 8, marginBottom: 8,
  },
  replyThumb: { width: 40, height: 40, borderRadius: 6 },
  replyAttachName: { flex: 1, fontSize: 12, color: '#374151' },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  attachIconBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  replyInput: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111111',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F5317F',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  closedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FEF8', paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#A7F3D0',
  },
  closedBannerText: { flex: 1, fontSize: 13, color: '#0F7A5A', lineHeight: 18 },
});

const b = StyleSheet.create({
  wrap:     { paddingHorizontal: 16, marginBottom: 12 },
  wrapLeft: { alignItems: 'flex-start', flexDirection: 'row' },
  wrapRight:{ justifyContent: 'flex-end' },
  agentAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFF0F7',
    alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 4,
  },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
  bubbleAgent:    { backgroundColor: '#FFFFFF', borderTopLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleCustomer: { backgroundColor: '#F5317F', borderTopRightRadius: 4 },
  agentName: { fontSize: 11, fontWeight: '700', color: '#F5317F', marginBottom: 4 },
  content:         { fontSize: 14, lineHeight: 19 },
  contentAgent:    { color: '#111111' },
  contentCustomer: { color: '#FFFFFF' },
  attachRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  attachText: { fontSize: 11, color: '#9CA3AF' },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
});

const sc_badge = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text:  { fontSize: 12, fontWeight: '700' },
});
