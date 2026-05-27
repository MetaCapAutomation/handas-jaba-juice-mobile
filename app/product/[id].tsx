import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, Animated, Dimensions, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../stores/cartStore';
import { SkeletonBox } from '../../components/SkeletonBox';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.min(370, SCREEN_HEIGHT * 0.43);
const CARD_OVERLAP = 48;
const RELATED_CARD_W = 138;

type Product = {
  id: string;
  short_name: string;
  full_description: string | null;
  badge: string | null;
  category: string;
  image_url: string | null;
  inventory: { name: string; price: number; stock: number } | null;
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, totalItems } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const addBtnScale = useRef(new Animated.Value(1)).current;
  const cartCount = totalItems();

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, short_name, full_description, badge, category, image_url, inventory:inventory_id(name, price, stock)')
      .eq('id', id as string)
      .single();

    if (data) {
      const p = data as unknown as Product;
      setProduct(p);
      fetchRelated(p.id);
    }
    setLoading(false);
  };

  // Fetch ALL products (not just same category) for "You May Also Like"
  const fetchRelated = async (currentId: string) => {
    const { data } = await supabase
      .from('products')
      .select('id, short_name, full_description, badge, category, image_url, inventory:inventory_id(name, price, stock)')
      .eq('is_archived', false)
      .eq('display_on_website', true)
      .neq('id', currentId)
      .limit(20);
    setRelated((data as unknown as Product[]) ?? []);
  };

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id,
        name: product.short_name,
        price: product.inventory?.price ?? 0,
        emoji: '🥤',
        image_url: product.image_url ?? undefined,
      });
    }
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
    Animated.sequence([
      Animated.spring(addBtnScale, { toValue: 0.94, useNativeDriver: true, speed: 30, bounciness: 0 }),
      Animated.spring(addBtnScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
    ]).start();
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        {/* Floating back button always visible */}
        <View style={styles.floatingButtons} pointerEvents="box-none">
          <SafeAreaView edges={['top']} pointerEvents="box-none">
            <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#111111" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
        {/* Hero skeleton */}
        <SkeletonBox width="100%" height={HERO_HEIGHT} borderRadius={0} />
        {/* Content card skeleton */}
        <View style={[styles.contentCard, { paddingTop: 20 }]}>
          <View style={styles.dragHandle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <SkeletonBox width={110} height={28} borderRadius={20} />
          </View>
          <SkeletonBox width="75%" height={28} borderRadius={8} style={{ marginBottom: 10 }} />
          <SkeletonBox width="45%" height={22} borderRadius={8} style={{ marginBottom: 24 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <SkeletonBox width={110} height={54} borderRadius={50} />
            <SkeletonBox style={{ flex: 1 }} height={54} borderRadius={16} />
          </View>
          <View style={styles.divider} />
          <SkeletonBox width="40%" height={13} borderRadius={6} style={{ marginBottom: 12 }} />
          <SkeletonBox width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
          <SkeletonBox width="90%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
          <SkeletonBox width="70%" height={14} borderRadius={6} />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.floatingButtons} pointerEvents="box-none">
          <SafeAreaView edges={['top']} pointerEvents="box-none">
            <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#111111" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>
        <View style={styles.loadingWrap}>
          <Text style={{ color: '#6B7280', fontSize: 15 }}>Product not found</Text>
        </View>
      </View>
    );
  }

  const price = product.inventory?.price ?? 0;
  const stock = product.inventory?.stock ?? 0;
  const inStock = stock > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Floating back + cart buttons ── */}
      <View style={styles.floatingButtons} pointerEvents="box-none">
        <SafeAreaView edges={['top']} style={styles.floatingBarInner} pointerEvents="box-none">
          <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#111111" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatingBtn} onPress={() => router.push('/(tabs)/cart')}>
            <Ionicons name="bag-outline" size={20} color="#111111" />
            {cartCount > 0 && (
              <View style={styles.floatingCartDot}>
                <Text style={styles.floatingCartDotText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces
      >
        {/* ── Hero image area ── */}
        <View style={styles.hero}>
          {/* Decorative background circles */}
          <View style={styles.bgCircle1} />
          <View style={styles.bgCircle2} />
          <View style={styles.bgCircle3} />

          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.heroImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.heroFallback}>
              <Text style={{ fontSize: 110 }}>🥤</Text>
            </View>
          )}

          {/* Badge floating on image */}
          {product.badge && (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{product.badge}</Text>
            </View>
          )}
        </View>

        {/* ── Content card — overlaps the hero ── */}
        <View style={styles.contentCard}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Category */}
          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{product.category}</Text>
            </View>
          </View>

          {/* Product name */}
          <Text style={styles.productName}>{product.short_name}</Text>

          {/* Price row */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>PRICE</Text>
              <Text style={styles.price}>KES {price.toLocaleString()}</Text>
            </View>
          </View>

          {/* ── Qty selector + Add to Cart ── */}
          <View style={styles.ctaRow}>
            {/* Quantity selector */}
            <View style={styles.qtyBox}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={16} color="#111111" />
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{qty}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, styles.qtyBtnPlus]}
                onPress={() => setQty((q) => q + 1)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Add to Cart */}
            <Animated.View style={[styles.addBtnWrap, { transform: [{ scale: addBtnScale }] }]}>
              <TouchableOpacity
                style={[
                  styles.addBtn,
                  !inStock && styles.addBtnDisabled,
                  addedFeedback && styles.addBtnSuccess,
                ]}
                onPress={handleAddToCart}
                disabled={!inStock}
                activeOpacity={0.88}
              >
                <Ionicons
                  name={addedFeedback ? 'checkmark-circle' : 'bag-add-outline'}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.addBtnText}>
                  {addedFeedback
                    ? 'Added!'
                    : `Add to Cart · KES ${(price * qty).toLocaleString()}`}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {qty > 1 && (
            <View style={styles.totalCallout}>
              <Text style={styles.totalCalloutText}>
                {qty} items · KES {(price * qty).toLocaleString()} total
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {product.full_description ? (
            <View style={styles.descBlock}>
              <Text style={styles.descLabel}>About this drink</Text>
              <Text style={styles.descText}>{product.full_description}</Text>
            </View>
          ) : (
            <View style={styles.descBlock}>
              <Text style={styles.descLabel}>About this drink</Text>
              <Text style={styles.descText}>
                A refreshing Handas Jaba juice made with the finest natural ingredients. Chilled, fresh, and full of flavour.
              </Text>
            </View>
          )}

          {/* ── You May Also Like ── */}
          {related.length > 0 && (
            <View style={styles.relatedSection}>
              <View style={styles.relatedHeader}>
                <Text style={styles.relatedTitle}>You May Also Like</Text>
                <Text style={styles.relatedMeta}>{related.length} drinks</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedList}
              >
                {related.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.relatedCard}
                    onPress={() => router.replace(`/product/${item.id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.relatedImgWrap}>
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.relatedImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={{ fontSize: 38 }}>🥤</Text>
                      )}
                      {item.badge && (
                        <View style={styles.relatedBadge}>
                          <Text style={styles.relatedBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.relatedInfo}>
                      <Text style={styles.relatedName} numberOfLines={2}>{item.short_name}</Text>
                      <Text style={styles.relatedCat} numberOfLines={1}>{item.category}</Text>
                      <View style={styles.relatedFooter}>
                        <Text style={styles.relatedPrice}>KES {item.inventory?.price ?? 0}</Text>
                        <TouchableOpacity
                          style={styles.relatedAddBtn}
                          onPress={() => addItem({
                            id: item.id,
                            name: item.short_name,
                            price: item.inventory?.price ?? 0,
                            emoji: '🥤',
                            image_url: item.image_url ?? undefined,
                          })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 48 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF0F7',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSkeleton: {
    height: HERO_HEIGHT,
    backgroundColor: '#FFF0F7',
  },

  // ── Floating buttons ──
  floatingButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  floatingBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  floatingBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingCartDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#F5317F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  floatingCartDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {},

  // ── Hero ──
  hero: {
    height: HERO_HEIGHT,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    borderRadius: SCREEN_WIDTH / 2,
    backgroundColor: 'rgba(245,49,127,0.06)',
    top: -SCREEN_WIDTH * 0.3,
    right: -SCREEN_WIDTH * 0.25,
  },
  bgCircle2: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: SCREEN_WIDTH * 0.325,
    backgroundColor: 'rgba(232,84,32,0.05)',
    bottom: -SCREEN_WIDTH * 0.15,
    left: -SCREEN_WIDTH * 0.12,
  },
  bgCircle3: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.2,
    backgroundColor: 'rgba(249,190,0,0.06)',
    bottom: SCREEN_WIDTH * 0.1,
    right: SCREEN_WIDTH * 0.05,
  },
  heroImage: {
    width: SCREEN_WIDTH * 0.75,
    height: HERO_HEIGHT * 0.8,
    zIndex: 2,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroBadge: {
    position: 'absolute',
    bottom: CARD_OVERLAP + 14,
    right: 26,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },

  // ── Content card (overlaps hero) ──
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -CARD_OVERLAP,
    paddingHorizontal: 22,
    paddingTop: 14,
    minHeight: SCREEN_HEIGHT - HERO_HEIGHT + CARD_OVERLAP,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 22,
  },

  // ── Meta row ──
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryPill: {
    backgroundColor: '#FFF0F7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FDCDE5',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C4165F',
    letterSpacing: 0.2,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FEF8',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  stockPillOut: {
    backgroundColor: '#FEF2F2',
  },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#5DC9A0',
    marginRight: 6,
  },
  stockDotOut: {
    backgroundColor: '#EF4444',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F7A5A',
  },
  stockTextOut: {
    color: '#EF4444',
  },

  // ── Name ──
  productName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111111',
    lineHeight: 32,
    marginBottom: 14,
    letterSpacing: -0.4,
  },

  // ── Price + rating ──
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 2,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F5317F',
    letterSpacing: -0.5,
  },
  starsGroup: {
    alignItems: 'flex-end',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 3,
  },
  ratingText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 22,
  },

  // ── Description ──
  descBlock: {
    marginBottom: 26,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  descText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 25,
  },

  // ── CTA row (qty + add to cart side by side) ──
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 50,
    paddingHorizontal: 5,
    paddingVertical: 5,
    gap: 4,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  qtyBtnPlus: {
    backgroundColor: '#E85420',
    shadowColor: '#E85420',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  qtyNum: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
    minWidth: 28,
    textAlign: 'center',
  },
  addBtnWrap: {
    flex: 1,
  },
  addBtn: {
    backgroundColor: '#F5317F',
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C4165F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 7,
  },
  addBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowColor: 'transparent',
    elevation: 0,
  },
  addBtnSuccess: {
    backgroundColor: '#C4165F',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // ── Qty total callout ──
  totalCallout: {
    backgroundColor: '#FFF0F7',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FDCDE5',
  },
  totalCalloutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C4165F',
  },

  // ── You May Also Like ──
  relatedSection: {
    marginTop: 28,
  },
  relatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  relatedTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.2,
  },
  relatedMeta: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  relatedList: {
    paddingRight: 6,
    gap: 12,
  },
  relatedCard: {
    width: RELATED_CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  relatedImgWrap: {
    height: 108,
    backgroundColor: '#F8FFF8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  relatedImg: {
    width: '100%',
    height: '100%',
  },
  relatedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  relatedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  relatedInfo: {
    padding: 10,
  },
  relatedName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 16,
    marginBottom: 3,
  },
  relatedCat: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  relatedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  relatedPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  relatedAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E85420',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
