import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, ActivityIndicator, Alert, Image, Modal,
  TouchableWithoutFeedback, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { SkeletonBox } from '../components/SkeletonBox';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  location: string | null;
  avatar_url: string | null;
};

type AddressSuggestion = { placeId: string; description: string };

export default function AccountSettingsScreen() {
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    phone_number: '',
    location: '',
    avatar_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);

  // Location autocomplete
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<AddressSuggestion[]>([]);
  const [locationSuggestionsLoading, setLocationSuggestionsLoading] = useState(false);
  const [locationFocused, setLocationFocused] = useState(false);
  const locationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('first_name, last_name, phone_number, location, avatar_url')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setLocationSearch(data.location ?? '');
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone_number: profile.phone_number,
        location: profile.location,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } else {
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const openActionSheet = () => {
    setCameraPermissionDenied(false);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => setActionSheetVisible(false);

  // Uses blob — more reliable than ArrayBuffer on Android
  const uploadAvatar = async (uri: string, mimeType?: string | null) => {
    if (!user) return;
    setUploadingAvatar(true);
    closeActionSheet();
    try {
      const uriExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(uriExt) ? uriExt : 'jpg';
      const contentType = mimeType ?? (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
      const path = `${user.id}/avatar.${ext}`;

      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Could not read image (HTTP ${response.status})`);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType, upsert: true });

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message || 'Could not upload photo. Please try again.');
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) {
        Alert.alert('Error', 'Photo uploaded but profile could not be updated.');
        return;
      }

      setProfile((p) => ({ ...p, avatar_url: avatarUrl }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Upload Error', msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setCameraPermissionDenied(true);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      await uploadAvatar(asset.uri, asset.mimeType);
    } else {
      closeActionSheet();
    }
  };

  const handleChooseFromLibrary = async () => {
    closeActionSheet();
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      await uploadAvatar(asset.uri, asset.mimeType);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    closeActionSheet();
    setUploadingAvatar(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);
      if (error) {
        Alert.alert('Error', 'Could not remove photo. Please try again.');
        return;
      }
      setProfile((p) => ({ ...p, avatar_url: null }));
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Location autocomplete
  const searchLocation = useCallback((text: string) => {
    setLocationSearch(text);
    setProfile((p) => ({ ...p, location: text }));
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    if (text.length < 2) { setLocationSuggestions([]); return; }
    setLocationSuggestionsLoading(true);
    locationDebounce.current = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('google-maps-proxy', {
          body: { action: 'autocomplete', input: text },
        });
        setLocationSuggestions(data?.predictions ?? []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLocationSuggestionsLoading(false);
      }
    }, 350);
  }, []);

  const selectLocationSuggestion = (item: AddressSuggestion) => {
    setLocationSearch(item.description);
    setProfile((p) => ({ ...p, location: item.description }));
    setLocationSuggestions([]);
    setLocationFocused(false);
  };

  const avatarInitial = (profile.first_name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#9F7FC3" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <SkeletonBox width={80} height={80} borderRadius={40} style={{ marginBottom: 10 }} />
            <SkeletonBox width={160} height={14} borderRadius={7} />
          </View>
          <View style={[styles.formCard, { padding: 16, gap: 20 }]}>
            {[1, 2].map((i) => (
              <View key={i} style={{ gap: 8 }}>
                <SkeletonBox width={80} height={11} borderRadius={5} />
                <SkeletonBox width="90%" height={18} borderRadius={6} />
              </View>
            ))}
          </View>
          <View style={[styles.formCard, { padding: 16, gap: 20 }]}>
            {[1, 2].map((i) => (
              <View key={i} style={{ gap: 8 }}>
                <SkeletonBox width={100} height={11} borderRadius={5} />
                <SkeletonBox width="85%" height={18} borderRadius={6} />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={openActionSheet}
              activeOpacity={0.85}
              disabled={uploadingAvatar}
            >
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{avatarInitial}</Text>
                </View>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
              {!uploadingAvatar && (
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>

          {/* Personal info */}
          <View style={styles.formCard}>
            <Field
              label="First Name"
              value={profile.first_name ?? ''}
              onChangeText={(v) => setProfile((p) => ({ ...p, first_name: v }))}
              placeholder="Enter first name"
            />
            <Field
              label="Last Name"
              value={profile.last_name ?? ''}
              onChangeText={(v) => setProfile((p) => ({ ...p, last_name: v }))}
              placeholder="Enter last name"
              last
            />
          </View>

          {/* Contact & address */}
          <View style={styles.formCard}>
            <Field
              label="Phone Number"
              value={profile.phone_number ?? ''}
              onChangeText={(v) => setProfile((p) => ({ ...p, phone_number: v }))}
              placeholder="+254..."
              keyboardType="phone-pad"
            />

            {/* Delivery Address with autocomplete */}
            <View style={fieldStyles.wrapper}>
              <View style={styles.locationLabelRow}>
                <Text style={fieldStyles.label}>Delivery Address</Text>
                {locationSuggestionsLoading && (
                  <ActivityIndicator size="small" color="#F5317F" style={{ marginLeft: 6 }} />
                )}
              </View>
              <View style={[styles.locationInputRow, locationFocused && styles.locationInputRowFocused]}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={locationFocused ? '#F5317F' : '#9CA3AF'}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={fieldStyles.input}
                  value={locationSearch}
                  onChangeText={searchLocation}
                  onFocus={() => setLocationFocused(true)}
                  onBlur={() => setTimeout(() => setLocationFocused(false), 200)}
                  placeholder="Search your delivery address"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {locationSearch.length > 0 && (
                  <TouchableOpacity onPress={() => { setLocationSearch(''); setLocationSuggestions([]); setProfile((p) => ({ ...p, location: '' })); }}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {locationSuggestions.length > 0 && (
                <View style={styles.locationSuggestions}>
                  {locationSuggestions.map((item, i) => (
                    <TouchableOpacity
                      key={item.placeId || String(i)}
                      style={[styles.locationSuggRow, i > 0 && styles.locationSuggBorder]}
                      onPress={() => selectLocationSuggestion(item)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.locationSuggIconWrap}>
                        <Ionicons name="location-outline" size={14} color="#F5317F" />
                      </View>
                      <Text style={styles.locationSuggText} numberOfLines={2}>{item.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Avatar Action Sheet */}
      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeActionSheet}
      >
        <TouchableWithoutFeedback onPress={closeActionSheet}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.actionSheetContainer}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Profile Photo</Text>

            {cameraPermissionDenied && (
              <View style={styles.permissionBanner}>
                <Ionicons name="warning-outline" size={16} color="#B45309" />
                <Text style={styles.permissionText}>
                  Camera access was denied. Please enable it in your device Settings.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.sheetOption} onPress={handleTakePhoto}>
              <View style={styles.sheetOptionIcon}>
                <Ionicons name="camera-outline" size={22} color="#F5317F" />
              </View>
              <Text style={styles.sheetOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity style={styles.sheetOption} onPress={handleChooseFromLibrary}>
              <View style={styles.sheetOptionIcon}>
                <Ionicons name="images-outline" size={22} color="#F5317F" />
              </View>
              <Text style={styles.sheetOptionText}>Choose from Library</Text>
            </TouchableOpacity>

            {profile.avatar_url && (
              <>
                <View style={styles.sheetDivider} />
                <TouchableOpacity style={styles.sheetOption} onPress={handleRemovePhoto}>
                  <View style={styles.sheetOptionIcon}>
                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  </View>
                  <Text style={[styles.sheetOptionText, styles.sheetOptionDestructive]}>
                    Remove Photo
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.sheetCancelBtn} onPress={closeActionSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, last,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  last?: boolean;
}) {
  return (
    <View style={[fieldStyles.wrapper, !last && fieldStyles.border]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    color: '#FFFFFF',
  },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B1F3B' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#9F7FC3',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrapper: { width: 80, height: 80, marginBottom: 10, position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E85420', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' },
  avatarLoadingOverlay: {
    position: 'absolute', top: 0, left: 0, width: 80, height: 80,
    borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F5317F', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F8F8F8',
  },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },

  formCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden',
  },

  // Location autocomplete
  locationLabelRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
  },
  locationInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  locationInputRowFocused: {
    borderColor: '#F5317F',
  },
  locationSuggestions: {
    marginTop: 8, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  locationSuggRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12,
  },
  locationSuggBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  locationSuggIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0,
  },
  locationSuggText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },

  saveBtn: {
    backgroundColor: '#F5317F', borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: '#C4165F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Action sheet modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  actionSheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  actionSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 36, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '700', color: '#111111',
    textAlign: 'center', marginBottom: 20,
  },
  permissionBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8,
  },
  permissionText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  sheetOptionIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  sheetOptionText: { fontSize: 15, fontWeight: '500', color: '#111111' },
  sheetOptionDestructive: { color: '#EF4444' },
  sheetDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 54 },
  sheetCancelBtn: {
    marginTop: 16, backgroundColor: '#F3F4F6', borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
