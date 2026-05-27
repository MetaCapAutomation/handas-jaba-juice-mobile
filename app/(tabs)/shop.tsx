import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Image, StyleSheet,
  Animated, Modal, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../stores/cartStore';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonBox } from '../../components/SkeletonBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

type Product = {
  id: string;
  short_name: string;
  badge: string | null;
  category: string;
  full_description: string | null;
  image_url: string | null;
  inventory: { name: string; price: number; stock: number } | null;
};

type PriceRange = { min: number; max: number | null; label: string };

const PRICE_RANGES: PriceRange[] = [
  { min: 0,   max: null, label: 'Any Price' },
  { min: 0,   max: 200,  label: 'Under KES 200' },
  { min: 200, max: 350,  label: 'KES 200–350' },
  { min: 350, max: 500,  label: 'KES 350–500' },
  { min: 500, max: null, label: 'Over KES 500' },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { addItem, totalItems } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  // Search
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const suggestionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search bar ref for fixed dropdown positioning
  const searchBarRef = useRef<View>(null);
  const [suggDropPos, setSuggDropPos] = useState({ top: 0, left: 16, width: SCREEN_WIDTH - 78 });

  // Filter
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriceRange, setFilterPriceRange] = useState<PriceRange>(PRICE_RANGES[0]);
  const [activeFilters, setActiveFilters] = useState(0);
  const filterSlideAnim = useRef(new Animated.Value(300)).current;

  // Card scale animations
  const cardScales = useRef<Record<string, Animated.Value>>({}).current;

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('id, short_name, badge, category, full_description, image_url, inventory:inventory_id(name, price, stock)')
      .eq('is_archived', false)
      .eq('display_on_website', true)
      .order('created_at', { ascending: false })
      .limit(60);

    const prods = (data as unknown as Product[]) ?? [];
    setProducts(prods);
    const cats = Array.from(new Set(prods.map((p) => p.category))).sort();
    setCategories(['All', ...cats]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Measure search bar for dropdown positioning
  const measureSearchBar = useCallback(() => {
    searchBarRef.current?.measureInWindow((x, y, w, h) => {
      setSuggDropPos({
        top: y + h + 6 - insets.top,
        left: x - insets.left,
        width: w,
      });
    });
  }, [insets]);

  // Search suggestions
  const updateSearchSuggestions = useCallback((text: string) => {
    if (suggestionDebounce.current) clearTimeout(suggestionDebounce.current);
    if (!text.trim()) { setSearchSuggestions([]); return; }
    suggestionDebounce.current = setTimeout(() => {
      const q = text.toLowerCase();
      const matches = products
        .filter((p) => p.short_name.toLowerCase().includes(q))
        .slice(0, 6);
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

  // Filter
  const openFilter = () => {
    setFilterVisible(true);
    Animated.spring(filterSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeFilter = () => {
    Animated.timing(filterSlideAnim, {
      toValue: 400,
      duration: 260,
      useNativeDriver: true,
    }).start(() => setFilterVisible(false));
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

  // Filtered products
  const filtered = products.filter((p) => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const price = p.inventory?.price ?? 0;
    const matchPrice = filterPriceRange.min === 0 && filterPriceRange.max === null
      ? true
      : price >= filterPriceRange.min && (filterPriceRange.max === null || price <= filterPriceRange.max);
    const matchSearch = search.trim()
      ? p.short_name.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchCat && matchPrice && matchSearch;
  });

  const handleAddToCart = (item: Product) => {
    if (!cardScales[item.id]) cardScales[item.id] = new Animated.Value(1);
    addItem({
      id: item.id,
      name: item.short_name,
      price: item.inventory?.price ?? 0,
      emoji: '🥤',
      image_url: item.image_url ?? undefined,
    });
    Animated.sequence([
      Animated.spring(cardScales[item.id], { toValue: 1.4, useNativeDriver: true, speed: 40, bounciness: 0 }),
      Animated.spring(cardScales[item.id], { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();
  };

  const cartCount = totalItems();
  const showSuggestions = searchFocused && search.trim().length > 0 && searchSuggestions.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4259C5" />
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Shop</Text>
            <Text style={styles.headerSubtitle}>Fresh picks delivered fast</Text>
          </View>
          <TouchableOpacity
            style={styles.cartIconBtn}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <Ionicons name="bag-outline" size={22} color="#FFFFFF" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search bar + filter button */}
        <View style={styles.searchContainer}>
          <View
            ref={searchBarRef}
            onLayout={measureSearchBar}
            style={[styles.searchBar, searchFocused && styles.searchBarFocused]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={searchFocused ? '#F5317F' : 'rgba(255,255,255,0.7)'}
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder="Search all juices..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.searchInput}
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

      {/* ── Category chips ── */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setActiveCategory(cat);
                setFilterCategory(cat);
              }}
              style={[styles.categoryChip, activeCategory === cat && styles.categoryChipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryLabel, activeCategory === cat && styles.categoryLabelActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Product grid ── */}
      {loading ? (
        <View style={[styles.loadingContainer, { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingTop: 16, alignItems: 'flex-start' }]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: CARD_WIDTH, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <SkeletonBox width="100%" height={CARD_WIDTH * 0.7} borderRadius={0} />
              <View style={{ padding: 12, gap: 8 }}>
                <SkeletonBox width="80%" height={14} />
                <SkeletonBox width="50%" height={11} />
                <SkeletonBox width="60%" height={15} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          style={styles.productsScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor="#F5317F"
              colors={['#F5317F']}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🥤</Text>
              <Text style={styles.emptyText}>
                {activeFilters > 0 ? 'No products match filters' : 'No products found'}
              </Text>
              {activeFilters > 0 && (
                <TouchableOpacity style={styles.clearFilterBtn} onPress={resetFilter}>
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((item) => {
                if (!cardScales[item.id]) cardScales[item.id] = new Animated.Value(1);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.productCard}
                    onPress={() => router.push(`/product/${item.id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.productImageArea}>
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.productImage}
                          resizeMode="contain"
                        />
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
                      <Text style={styles.productBrand} numberOfLines={1}>Handas Jaba</Text>
                      <View style={styles.productFooter}>
                        <Text style={styles.productPrice}>KES {item.inventory?.price ?? 0}</Text>
                        <Animated.View style={{ transform: [{ scale: cardScales[item.id] }] }}>
                          <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => handleAddToCart(item)}
                          >
                            <Ionicons name="add" size={18} color="#FFFFFF" />
                          </TouchableOpacity>
                        </Animated.View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Search Suggestions Dropdown (fixed, outside scroll) ── */}
      {showSuggestions && (
        <View
          style={[styles.suggestionsDrop, {
            top: suggDropPos.top,
            left: suggDropPos.left,
            width: suggDropPos.width,
          }]}
          pointerEvents="box-none"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ maxHeight: 300 }}
          >
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

      {/* ── Filter Bottom Sheet ── */}
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, flexDirection: 'row', paddingBottom: 4 }}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
                onPress={() => setFilterCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>
                  {cat}
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
  container: {
    flex: 1,
    backgroundColor: '#1B1F3B',
  },

  // ── Header ──
  header: {
    backgroundColor: '#4259C5',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  cartIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F5317F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
    paddingHorizontal: 14,
    height: 46,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  searchBarFocused: {
    borderColor: '#F5317F',
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E85420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#F5317F',
  },
  filterActiveDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterActiveDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Categories ──
  categoriesWrapper: {
    backgroundColor: '#1B1F3B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    height: 52,
    justifyContent: 'center',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#F5317F',
    borderColor: '#F5317F',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ── Grid ──
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsScroll: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
    paddingBottom: 110,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: CARD_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  productImageArea: {
    height: CARD_WIDTH * 0.7,
    backgroundColor: '#FFF4E0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productEmoji: {
    fontSize: 48,
  },
  productBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  productBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 2,
    lineHeight: 18,
  },
  productBrand: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E85420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
    marginBottom: 16,
  },
  clearFilterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F5317F',
    borderRadius: 20,
  },
  clearFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // ── Suggestions dropdown ──
  suggestionsDrop: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  suggDropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  suggDropBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  suggDropImgWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFF0F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  suggDropImg: {
    width: '100%',
    height: '100%',
  },
  suggDropInfo: {
    flex: 1,
  },
  suggDropName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 2,
  },
  suggDropCat: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  suggDropPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5317F',
    marginLeft: 8,
  },

  // ── Filter bottom sheet ──
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  filterSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 40,
  },
  filterHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  filterReset: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#FFF0F7',
    borderColor: '#F5317F',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#C4165F',
    fontWeight: '700',
  },
  filterPriceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },
  filterPriceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterPriceChipActive: {
    backgroundColor: '#FFF0F7',
    borderColor: '#F5317F',
  },
  filterPriceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterPriceTextActive: {
    color: '#C4165F',
    fontWeight: '700',
  },
  filterApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5317F',
    borderRadius: 14,
    height: 54,
    marginHorizontal: 20,
    marginTop: 24,
    shadowColor: '#C4165F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  filterApplyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
