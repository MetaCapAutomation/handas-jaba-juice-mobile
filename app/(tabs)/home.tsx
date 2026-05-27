import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  RefreshControl, StyleSheet, Dimensions, FlatList, Modal, Platform,
  StatusBar, Image, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { SkeletonBox } from '../../components/SkeletonBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

type Product = {
  id: string;
  short_name: string;
  badge: string | null;
  category: string;
  image_url: string | null;
  inventory: { name: string; price: number; stock: number } | null;
};

type AddressSuggestion = { placeId: string; description: string };

type PriceRange = { min: number; max: number | null; label: string };

const CATEGORIES = [
  { id: 'All',            emoji: '✨', label: 'All',            color: '#F5317F' },
  { id: 'Classic Range',  emoji: '🍹', label: 'Classic Range',  color: '#E85420' },
  { id: 'Premium Juices', emoji: '⭐', label: 'Premium Juices', color: '#4259C5' },
  { id: 'Tea Collection', emoji: '🍵', label: 'Tea Collection', color: '#9F7FC3' },
  { id: 'Value Range',    emoji: '💚', label: 'Value Range',    color: '#B8D427' },
];

const PRICE_RANGES: PriceRange[] = [
  { min: 0,   max: null, label: 'Any Price' },
  { min: 0,   max: 200,  label: 'Under KES 200' },
  { min: 200, max: 350,  label: 'KES 200–350' },
  { min: 350, max: 500,  label: 'KES 350–500' },
  { min: 500, max: null, label: 'Over KES 500' },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { addItem, totalItems } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const suggestionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriceRange, setFilterPriceRange] = useState<PriceRange>(PRICE_RANGES[0]);
  const [activeFilters, setActiveFilters] = useState(0);
  const filterSlideAnim = useRef(new Animated.Value(300)).current;

  const [unreadCount, setUnreadCount] = useState(0);

  const [deliveryAddress, setDeliveryAddress] = useState('Set delivery location');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<AddressSuggestion[]>([]);
  const [locationSuggestionsLoading, setLocationSuggestionsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDropPos, setLocationDropPos] = useState({ top: 0, left: 16, width: SCREEN_WIDTH - 32 });
  const locationCardRef = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null>(null);
  const locationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSearchInputRef = useRef<TextInput>(null);
  const chevronAnim = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();

  const firstName = user?.user_metadata?.first_name
    || user?.email?.split('@')[0]
    || 'there';

  const searchBarRef = useRef<View>(null);
  const [suggDropPos, setSuggDropPos] = useState({ top: 0, left: 16, width: SCREEN_WIDTH - 78 });

  const measureSearchBar = useCallback(() => {
    searchBarRef.current?.measureInWindow((x, y, w, h) => {
      setSuggDropPos({
        top: y + h + 6 - insets.top,
        left: x - insets.left,
        width: w,
      });
    });
  }, [insets]);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('id, short_name, badge, category, image_url, inventory:inventory_id(name, price, stock)')
      .eq('is_archived', false)
      .eq('display_on_website', true)
      .limit(30);
    setProducts((data as unknown as Product[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('location')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.location) setDeliveryAddress(data.location);
      });
  }, [user?.id]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchUnreadCount(); }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('home_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
        () => { fetchUnreadCount(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUnreadCount]);

  const updateSearchSuggestions = useCallback((text: string) => {
    if (suggestionDebounce.current) clearTimeout(suggestionDebounce.current);
    if (!text.trim()) { setSearchSuggestions([]); return; }
    suggestionDebounce.current = setTimeout(() => {
      const q = text.toLowerCase();
      const matches = products.filter((p) => p.short_name.toLowerCase().includes(q)).slice(0, 6);
      setSearchSuggestions(matches);
    }, 180);
  }, [products]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    updateSearchSuggestions(text);
  };

  const handleSearchFocus = () => {
    setSearchFocused(true);
    measureSearchBar();
    updateSearchSuggestions(search);
  };

  const handleSearchBlur = () => {
    setTimeout(() => setSearchFocused(false), 200);
  };

  const handleSuggestionPress = (item: Product) => {
    setSearch('');
    setSearchSuggestions([]);
    setSearchFocused(false);
    router.push(`/product/${item.id}`);
  };

  const openFilter = () => {
    setFilterVisible(true);
    Animated.spring(filterSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeFilter = () => {
    Animated.timing(filterSlideAnim, { toValue: 400, duration: 260, useNativeDriver: true }).start(() => setFilterVisible(false));
  };

  const applyFilter = () => {
    let count = 0;
    if (filterCategory !== 'All') count++;
    if (filterPriceRange.min !== 0 || filterPriceRange.max !== null) count++;
    setActiveFilters(count);
    setActiveCategory(filterCategory);
    closeFilter();
  };

  const resetFilter = () => {
    setFilterCategory('All');
    setFilterPriceRange(PRICE_RANGES[0]);
    setActiveFilters(0);
    setActiveCategory('All');
    closeFilter();
  };

  const openLocationDropdown = () => {
    locationCardRef.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
      setLocationDropPos({
        top: y + h + 6 - insets.top,
        left: x - insets.left,
        width: w,
      });
    });
    setLocationSearch('');
    setLocationSuggestions([]);
    setLocationDropdownOpen(true);
    Animated.timing(chevronAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => locationSearchInputRef.current?.focus(), 120);
  };

  const closeLocationDropdown = () => {
    setLocationDropdownOpen(false);
    setLocationSearch('');
    setLocationSuggestions([]);
    Animated.timing(chevronAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const searchLocationAddress = (text: string) => {
    setLocationSearch(text);
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    if (!text.trim()) { setLocationSuggestions([]); return; }
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
  };

  const selectLocationSuggestion = (item: AddressSuggestion) => {
    setDeliveryAddress(item.description);
    closeLocationDropdown();
    if (user) {
      supabase.from('profiles').update({ location: item.description }).eq('user_id', user.id).then(() => {});
    }
  };

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { data } = await supabase.functions.invoke('google-maps-proxy', {
        body: { action: 'reverse-geocode', lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
      const address = data?.description ?? data?.formatted_address ?? null;
      if (address) {
        setDeliveryAddress(address);
        if (user) {
          supabase.from('profiles').update({ location: address }).eq('user_id', user.id).then(() => {});
        }
      }
    } catch {
      // silently fail
    } finally {
      setLocationLoading(false);
      closeLocationDropdown();
    }
  };

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const onRefresh = () => { setRefreshing(true); fetchProducts(); };

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const price = p.inventory?.price ?? 0;
    const matchPrice = filterPriceRange.min === 0 && filterPriceRange.max === null
      ? true
      : price >= filterPriceRange.min && (filterPriceRange.max === null || price <= filterPriceRange.max);
    const matchSearch = search.trim() ? p.short_name.toLowerCase().includes(search.toLowerCase()) : true;
    return matchCat && matchPrice && matchSearch;
  });

  const renderProductCard = ({ item, index }: { item: Product; index: number }) => {
    const isRight = index % 2 === 1;
    return (
      <TouchableOpacity
        style={[styles.productCard, isRight && { marginLeft: 12 }]}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.productImageArea}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <Text style={styles.productEmoji}>🥤</Text>
          )}
          {item.badge && (
            <View style={styles.productBadge}>
              <Text style={styles.productBadgeText}>{item.badge}</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.short_name}</Text>
          <Text style={styles.productBrand}>Handas Jaba</Text>
          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>KES {item.inventory?.price ?? 0}</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => addItem({
                id: item.id,
                name: item.short_name,
                price: item.inventory?.price ?? 0,
                emoji: '🥤',
                image_url: item.image_url ?? undefined,
              })}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const showSuggestions = searchFocused && search.trim().length > 0 && searchSuggestions.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1B1F3B" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5317F" colors={['#F5317F']} />
        }
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── HEADER ─── */}
        <View style={styles.header}>
          <View style={styles.headerRow1}>
            <TouchableOpacity
              style={styles.headerLeft}
              onPress={() => router.push('/account-settings')}
              activeOpacity={0.75}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.greetingCol}>
                <Text style={styles.greetingSmall}>Good day 👋</Text>
                <Text style={styles.greetingName} numberOfLines={1}>Hi, {firstName}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push('/notifications')}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/cart')}>
                <Ionicons name="bag-outline" size={22} color="#FFFFFF" />
                {totalItems() > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{totalItems()}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── DELIVERY LOCATION CARD ─── */}
          <TouchableOpacity
            ref={locationCardRef as any}
            style={[styles.locationCard, locationDropdownOpen && styles.locationCardOpen]}
            onPress={locationDropdownOpen ? closeLocationDropdown : openLocationDropdown}
            activeOpacity={0.82}
          >
            <View style={styles.locationIconCircle}>
              <Ionicons name="location" size={15} color="#FFFFFF" />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>Delivering to</Text>
              <Text style={styles.locationAddress} numberOfLines={1}>{deliveryAddress}</Text>
            </View>
            <Animated.View style={[styles.locationChevronWrap, { transform: [{ rotate: chevronRotate }] }]}>
              <Ionicons name="chevron-down" size={14} color="#F5317F" />
            </Animated.View>
          </TouchableOpacity>

          <Text style={styles.heroHeading}>
            <Text style={styles.heroBlack}>Thirsty? </Text>
            <Text style={styles.heroGray}>Order & Drink</Text>
          </Text>
        </View>

        {/* ─── SEARCH + FILTER ─── */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <View
              ref={searchBarRef}
              onLayout={measureSearchBar}
              style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
            >
              <Ionicons name="search-outline" size={20} color={searchFocused ? '#F5317F' : 'rgba(255,255,255,0.7)'} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for drinks..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={search}
                onChangeText={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(''); setSearchSuggestions([]); }}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.filterBtn, activeFilters > 0 && styles.filterBtnActive]}
              onPress={openFilter}
              activeOpacity={0.85}
            >
              <Ionicons name="options-outline" size={19} color="#FFFFFF" />
              {activeFilters > 0 && (
                <View style={styles.filterActiveDot}>
                  <Text style={styles.filterActiveDotText}>{activeFilters}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── CATEGORIES ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          style={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => { setActiveCategory(cat.id); setFilterCategory(cat.id); }}
                style={[styles.categoryChip, { backgroundColor: isActive ? cat.color : 'rgba(255,255,255,0.1)' }]}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── PRODUCTS GRID ─── */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'All' ? 'Popular Near You' : activeCategory}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/shop')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.productRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.productCard, i % 2 === 1 && { marginLeft: 12 }]}>
                  <SkeletonBox width="100%" height={CARD_WIDTH * 0.7} borderRadius={0} />
                  <View style={{ padding: 12, gap: 8 }}>
                    <SkeletonBox width="80%" height={14} />
                    <SkeletonBox width="50%" height={11} />
                    <SkeletonBox width="60%" height={15} />
                  </View>
                </View>
              ))}
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🥤</Text>
              <Text style={styles.emptyText}>No drinks found</Text>
              {activeFilters > 0 && (
                <TouchableOpacity style={styles.clearFilterBtn} onPress={resetFilter}>
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              renderItem={renderProductCard}
              columnWrapperStyle={styles.productRow}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            />
          )}
        </View>
      </ScrollView>

      {/* ─── SEARCH SUGGESTIONS DROPDOWN ─── */}
      {showSuggestions && (
        <View
          style={[styles.suggestionsDrop, {
            top: suggDropPos.top,
            left: suggDropPos.left,
            width: suggDropPos.width,
          }]}
          pointerEvents="box-none"
        >
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false} style={{ maxHeight: 300 }}>
            {searchSuggestions.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.suggDropItem, i > 0 && styles.suggDropBorder]}
                onPress={() => handleSuggestionPress(item)}
                activeOpacity={0.75}
              >
                <View style={styles.suggDropImgWrap}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.suggDropImg} resizeMode="contain" />
                  ) : (
                    <Text style={{ fontSize: 20 }}>🥤</Text>
                  )}
                </View>
                <View style={styles.suggDropInfo}>
                  <Text style={styles.suggDropName} numberOfLines={1}>{item.short_name}</Text>
                  <Text style={styles.suggDropCat} numberOfLines={1}>{item.category}</Text>
                </View>
                <Text style={styles.suggDropPrice}>KES {item.inventory?.price ?? 0}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── LOCATION DROPDOWN ─── */}
      {locationDropdownOpen && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={closeLocationDropdown}
            activeOpacity={1}
          />
          <View
            style={[styles.locationDrop, {
              top: locationDropPos.top,
              left: locationDropPos.left,
              width: locationDropPos.width,
            }]}
          >
            {/* Use Current Location */}
            <TouchableOpacity
              style={styles.locationDropCurrentBtn}
              onPress={useCurrentLocation}
              activeOpacity={0.8}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#F5317F" style={{ marginRight: 10 }} />
              ) : (
                <View style={styles.locationDropCurrentIcon}>
                  <Ionicons name="navigate" size={15} color="#FFFFFF" />
                </View>
              )}
              <Text style={styles.locationDropCurrentText}>
                {locationLoading ? 'Detecting location…' : 'Use Current Location'}
              </Text>
              {!locationLoading && <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.locationDropDivider} />

            {/* Search input */}
            <View style={styles.locationDropSearchRow}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                ref={locationSearchInputRef}
                style={styles.locationDropInput}
                placeholder="Search area, street, landmark..."
                placeholderTextColor="#9CA3AF"
                value={locationSearch}
                onChangeText={searchLocationAddress}
                returnKeyType="search"
              />
              {locationSuggestionsLoading ? (
                <ActivityIndicator size="small" color="#F5317F" style={{ marginLeft: 6 }} />
              ) : locationSearch.length > 0 ? (
                <TouchableOpacity onPress={() => { setLocationSearch(''); setLocationSuggestions([]); }}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Suggestions list */}
            {locationSuggestions.length > 0 && (
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 240 }}
              >
                {locationSuggestions.map((item, i) => (
                  <TouchableOpacity
                    key={item.placeId || String(i)}
                    style={[styles.locationDropItem, i > 0 && styles.locationDropItemBorder]}
                    onPress={() => selectLocationSuggestion(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.locationDropItemIcon}>
                      <Ionicons name="location-outline" size={15} color="#F5317F" />
                    </View>
                    <Text style={styles.locationDropItemText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {locationSearch.trim().length > 0 && !locationSuggestionsLoading && locationSuggestions.length === 0 && (
              <View style={styles.locationDropEmpty}>
                <Text style={styles.locationDropEmptyText}>No suggestions found</Text>
              </View>
            )}

            {locationSearch.trim().length === 0 && !locationSuggestionsLoading && (
              <View style={styles.locationDropHint}>
                <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                <Text style={styles.locationDropHintText}>Type to search your delivery location</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* ─── FILTER BOTTOM SHEET ─── */}
      <Modal visible={filterVisible} transparent animationType="none" onRequestClose={closeFilter}>
        <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={closeFilter} />
        <Animated.View style={[styles.filterSheet, { transform: [{ translateY: filterSlideAnim }] }]}>
          <View style={styles.filterHandle} />
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter Products</Text>
            <TouchableOpacity onPress={resetFilter}>
              <Text style={styles.filterReset}>Reset</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filterSectionLabel}>CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, flexDirection: 'row', paddingBottom: 4 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.filterChip, filterCategory === cat.id && styles.filterChipActive]}
                onPress={() => setFilterCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={{ marginRight: 4 }}>{cat.emoji}</Text>
                <Text style={[styles.filterChipText, filterCategory === cat.id && styles.filterChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterSectionLabel, { marginTop: 20 }]}>PRICE RANGE</Text>
          <View style={styles.filterPriceGrid}>
            {PRICE_RANGES.map((range) => {
              const isActive = filterPriceRange.label === range.label;
              return (
                <TouchableOpacity
                  key={range.label}
                  style={[styles.filterPriceChip, isActive && styles.filterPriceChipActive]}
                  onPress={() => setFilterPriceRange(range)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPriceText, isActive && styles.filterPriceTextActive]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.filterApplyBtn} onPress={applyFilter} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.filterApplyText}>Apply Filters</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B1F3B' },
  scroll:   { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  // ─── Header ───
  header:      { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, backgroundColor: '#1B1F3B' },
  headerRow1:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E85420', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText:  { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  greetingCol: { flex: 1 },
  greetingSmall: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  greetingName:  { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  notifDot: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 17, height: 17, borderRadius: 8.5,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  notifDotText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // ─── Location card ───
  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF0F7', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16, gap: 10,
    borderWidth: 1.5, borderColor: '#FDCDE5',
    shadowColor: '#F5317F', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 2,
  },
  locationCardOpen: {
    borderColor: '#F5317F',
    shadowOpacity: 0.2,
  },
  locationIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F5317F', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  locationContent: { flex: 1 },
  locationLabel: {
    fontSize: 10, fontWeight: '700', color: '#C4165F',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  locationAddress: { fontSize: 13, fontWeight: '600', color: '#1B1F3B' },
  locationChevronWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FDCDE5', alignItems: 'center', justifyContent: 'center',
  },

  // ─── Location dropdown ───
  locationDrop: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  locationDropCurrentBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  locationDropCurrentIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F5317F', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, flexShrink: 0,
  },
  locationDropCurrentText: {
    flex: 1, fontSize: 13, fontWeight: '600', color: '#F5317F',
  },
  locationDropDivider: {
    height: 1, backgroundColor: '#F3F4F6',
  },
  locationDropSearchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  locationDropInput: {
    flex: 1, fontSize: 14, color: '#1B1F3B',
  },
  locationDropItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 14,
  },
  locationDropItemBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  locationDropItemIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, flexShrink: 0,
  },
  locationDropItemText: {
    flex: 1, fontSize: 13, color: '#374151', lineHeight: 18,
  },
  locationDropEmpty: {
    paddingVertical: 16, paddingHorizontal: 14, alignItems: 'center',
  },
  locationDropEmptyText: { fontSize: 13, color: '#9CA3AF' },
  locationDropHint: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
  },
  locationDropHintText: { fontSize: 13, color: '#9CA3AF', flex: 1 },

  heroHeading: { fontSize: 24 },
  heroBlack:   { color: '#F9BE00', fontWeight: '700', fontSize: 24 },
  heroGray:    { color: 'rgba(255,255,255,0.5)', fontWeight: '300', fontSize: 24 },

  // ─── Search ───
  searchSection: { paddingHorizontal: 16, marginBottom: 24, zIndex: 50 },
  searchContainer: { flexDirection: 'row', alignItems: 'center' },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 50,
    paddingHorizontal: 16, height: 50, marginRight: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  searchBarFocused: { borderColor: '#F5317F', backgroundColor: '#FFFFFF' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  filterBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#E85420', alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: '#F5317F' },
  filterActiveDot: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  filterActiveDotText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  // ─── Search suggestions dropdown ───
  suggestionsDrop: {
    position: 'absolute',
    backgroundColor: '#FFFFFF', borderRadius: 16, zIndex: 100,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 12, overflow: 'hidden',
  },
  suggDropItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
  suggDropBorder: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  suggDropImgWrap: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, overflow: 'hidden',
  },
  suggDropImg: { width: '100%', height: '100%' },
  suggDropInfo: { flex: 1 },
  suggDropName: { fontSize: 14, fontWeight: '600', color: '#1B1F3B', marginBottom: 2 },
  suggDropCat:  { fontSize: 12, color: '#9CA3AF' },
  suggDropPrice: { fontSize: 14, fontWeight: '700', color: '#F5317F', marginLeft: 8 },

  // ─── Categories ───
  categoriesScroll: { marginBottom: 24 },
  categoriesContent: { paddingHorizontal: 16 },
  categoryChip: {
    width: 78, height: 82, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  categoryEmoji: { fontSize: 24, marginBottom: 4 },
  categoryLabel: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  categoryLabelActive: { color: '#FFFFFF', fontWeight: '700' },

  // ─── Products ───
  productsSection: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  seeAll: { fontSize: 14, color: '#F9BE00', fontWeight: '600' },
  productRow: { justifyContent: 'flex-start' },
  productCard: {
    width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, overflow: 'hidden',
  },
  productImageArea: {
    height: CARD_WIDTH * 0.7, backgroundColor: '#FFF4E0',
    alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  productImage: { width: '100%', height: '100%' },
  productEmoji: { fontSize: 52 },
  productBadge: {
    position: 'absolute', top: 8, left: 10,
    backgroundColor: '#FFF4E0', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  productBadgeText: { fontSize: 10, fontWeight: '600', color: '#E85420' },
  productInfo: { padding: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1B1F3B', marginBottom: 2, lineHeight: 18 },
  productBrand: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: 15, fontWeight: '700', color: '#1B1F3B' },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#E85420', alignItems: 'center', justifyContent: 'center',
  },
  loadingContainer: { paddingTop: 60, alignItems: 'center' },
  emptyContainer: { paddingTop: 60, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.55)', fontSize: 16, marginBottom: 16 },
  clearFilterBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F5317F', borderRadius: 20 },
  clearFilterText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  // ─── Filter bottom sheet ───
  filterOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  filterSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 40,
  },
  filterHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 20,
  },
  filterTitle:  { fontSize: 18, fontWeight: '700', color: '#1B1F3B' },
  filterReset:  { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  filterSectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 12, marginHorizontal: 20,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: '#FFF0F7', borderColor: '#F5317F' },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterChipTextActive: { color: '#C4165F', fontWeight: '700' },
  filterPriceGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  filterPriceChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent',
  },
  filterPriceChipActive: { backgroundColor: '#FFF0F7', borderColor: '#F5317F' },
  filterPriceText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterPriceTextActive: { color: '#C4165F', fontWeight: '700' },
  filterApplyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5317F', borderRadius: 14, height: 54,
    marginHorizontal: 20, marginTop: 24,
    shadowColor: '#F5317F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  filterApplyText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
