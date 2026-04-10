/**
 * gallery.tsx — 갤러리 탭 화면
 * 커뮤니티가 공유한 조류 사진 피드, 지역/희귀도 필터, 하트 토글 (optimistic update)
 */
import React, {
  useState,
  useCallback,
  useRef,
  type ReactElement,
} from 'react'
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  type ListRenderItemInfo,
} from 'react-native'
import { Image } from 'expo-image'
import { useFocusEffect, useRouter } from 'expo-router'
import { galleryApi } from '../../src/services/api'
import { Colors } from '../../src/constants/colors'
import { RARITY_LABEL, RARITY_COLOR } from '../../src/constants/rarity'
import { formatRelativeTime } from '../../src/utils/time'
import type { RarityTier } from '../../src/types/api'

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

interface GalleryPost {
  post_id: string
  species_id: string
  species_name_ko: string
  rarity_tier: RarityTier
  photo_cdn_url: string
  location_province: string | null
  hearts_count: number
  is_hearted: boolean
  nickname: string
  created_at: string
}

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 20

// 갤러리 필터에서 노출하는 희귀도 (API 정책상 rare/legendary 제외)
type GalleryRarityFilter = 'all' | 'common' | 'migrant'

const RARITY_FILTER_OPTIONS: { key: GalleryRarityFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'common', label: '일반' },
  { key: 'migrant', label: '나그네' },
]

// key: API province 파라미터로 전송할 값 (백엔드 getProvince() 반환값과 일치해야 함)
// label: 칩에 표시할 UI 텍스트
const PROVINCE_OPTIONS: { key: string | null; label: string }[] = [
  { key: null, label: '전국' },
  { key: '서울특별시,경기도', label: '서울/경기' },
  { key: '강원도', label: '강원도' },
  { key: '충청남도,충청북도', label: '충청도' },
  { key: '전라남도,전라북도', label: '전라도' },
  { key: '경상남도,경상북도', label: '경상도' },
  { key: '제주특별자치도', label: '제주도' },
]

// ---------------------------------------------------------------------------
// 유틸 함수
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// RarityBadge — collection.tsx 패턴과 동일
// ---------------------------------------------------------------------------

function RarityBadge({ rarity_tier }: { rarity_tier: RarityTier }): ReactElement {
  return (
    <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLOR[rarity_tier] }]}>
      <Text style={styles.rarityBadgeText}>{RARITY_LABEL[rarity_tier]}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// HeartButton — optimistic update 포함
// ---------------------------------------------------------------------------

interface HeartButtonProps {
  postId: string
  isHearted: boolean
  heartsCount: number
  onToggle: (postId: string, currentHearted: boolean) => void
}

function HeartButton({ postId, isHearted, heartsCount, onToggle }: HeartButtonProps): ReactElement {
  return (
    <TouchableOpacity
      style={styles.heartButton}
      onPress={() => onToggle(postId, isHearted)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={isHearted ? '좋아요 취소' : '좋아요'}
      accessibilityState={{ selected: isHearted }}
    >
      <Text style={[styles.heartIcon, isHearted && styles.heartIconFilled]}>
        {isHearted ? '♥' : '♡'}
      </Text>
      <Text style={styles.heartCount}>{heartsCount}</Text>
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// GalleryCard
// ---------------------------------------------------------------------------

interface GalleryCardProps {
  post: GalleryPost
  onHeartToggle: (postId: string, currentHearted: boolean) => void
  onPress: (post: GalleryPost) => void
}

function GalleryCard({ post, onHeartToggle, onPress }: GalleryCardProps): ReactElement {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(post)}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`${post.species_name_ko} 상세 보기`}
    >
      {/* 사진 */}
      <Image
        source={{ uri: post.photo_cdn_url }}
        style={styles.cardImage}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
      />

      {/* 카드 하단 정보 */}
      <View style={styles.cardBody}>
        {/* 종명 + 희귀도 배지 */}
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardSpeciesName} numberOfLines={1}>
            {post.species_name_ko}
          </Text>
          <RarityBadge rarity_tier={post.rarity_tier} />
        </View>

        {/* 닉네임 + 위치 + 시간 */}
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardNickname} numberOfLines={1}>
            {post.nickname}
          </Text>
          {post.location_province !== null && (
            <>
              <Text style={styles.cardMetaDot}>·</Text>
              <Text style={styles.cardProvince} numberOfLines={1}>
                {post.location_province}
              </Text>
            </>
          )}
          <Text style={styles.cardMetaDot}>·</Text>
          <Text style={styles.cardTimeAgo}>{formatRelativeTime(post.created_at)}</Text>
        </View>
      </View>

      {/* 하트 버튼 — 카드 우하단 */}
      <View style={styles.heartWrapper}>
        <HeartButton
          postId={post.post_id}
          isHearted={post.is_hearted}
          heartsCount={post.hearts_count}
          onToggle={onHeartToggle}
        />
      </View>
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// GalleryScreen
// ---------------------------------------------------------------------------

export default function GalleryScreen(): ReactElement {
  const router = useRouter()

  // 피드 상태
  const [posts, setPosts] = useState<GalleryPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  // 필터 상태
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [selectedRarity, setSelectedRarity] = useState<GalleryRarityFilter>('all')

  // 필터 최신값을 ref로 유지 (클로저 stale 방지)
  const provinceRef = useRef<string | null>(null)
  const rarityRef = useRef<GalleryRarityFilter>('all')
  const pageRef = useRef(1)
  const isLoadingRef = useRef(false)

  // ---------------------------------------------------------------------------
  // 피드 로드
  // ---------------------------------------------------------------------------

  const loadPosts = useCallback(async (targetPage: number, reset: boolean): Promise<void> => {
    if (isLoadingRef.current && !reset) return

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const res = await galleryApi.list({
        page: targetPage,
        limit: PAGE_LIMIT,
        province: provinceRef.current ?? undefined,
        rarity_tier: rarityRef.current !== 'all' ? rarityRef.current : undefined,
      })

      const items: GalleryPost[] = res.data.data
      const pagination = res.data.pagination

      setPosts((prev) => (reset ? items : [...prev, ...items]))
      setHasMore(targetPage < pagination.total_pages)
      setPage(targetPage)
      pageRef.current = targetPage
    } catch {
      // API 미구현 기간 동안 graceful fallback — 빈 배열 유지
      if (reset) {
        setPosts([])
        setHasMore(false)
      }
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // 화면 포커스 시 초기 로드
  // ---------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      provinceRef.current = selectedProvince
      rarityRef.current = selectedRarity
      loadPosts(1, true)
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ---------------------------------------------------------------------------
  // 필터 변경 핸들러
  // ---------------------------------------------------------------------------

  const handleProvinceChange = useCallback(
    (province: string | null): void => {
      setSelectedProvince(province)
      provinceRef.current = province
      loadPosts(1, true)
    },
    [loadPosts],
  )

  const handleRarityChange = useCallback(
    (rarity: GalleryRarityFilter): void => {
      setSelectedRarity(rarity)
      rarityRef.current = rarity
      loadPosts(1, true)
    },
    [loadPosts],
  )

  // ---------------------------------------------------------------------------
  // 무한 스크롤
  // ---------------------------------------------------------------------------

  const handleEndReached = useCallback((): void => {
    if (!isLoadingRef.current && hasMore) {
      loadPosts(pageRef.current + 1, false)
    }
  }, [hasMore, loadPosts])

  // ---------------------------------------------------------------------------
  // Pull-to-refresh
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true)
    await loadPosts(1, true)
    setIsRefreshing(false)
  }, [loadPosts])

  // ---------------------------------------------------------------------------
  // 하트 토글 — optimistic update
  // ---------------------------------------------------------------------------

  const handleHeartToggle = useCallback(
    async (postId: string, currentHearted: boolean): Promise<void> => {
      // 1. 즉시 UI 반영
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId
            ? {
                ...p,
                is_hearted: !currentHearted,
                hearts_count: currentHearted ? p.hearts_count - 1 : p.hearts_count + 1,
              }
            : p,
        ),
      )

      // 2. 서버 요청 — 실패 시 롤백
      try {
        if (currentHearted) {
          await galleryApi.unheart(postId)
        } else {
          await galleryApi.heart(postId)
        }
      } catch {
        // 롤백
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId
              ? {
                  ...p,
                  is_hearted: currentHearted,
                  hearts_count: currentHearted ? p.hearts_count + 1 : p.hearts_count - 1,
                }
              : p,
          ),
        )
      }
    },
    [],
  )

  // ---------------------------------------------------------------------------
  // 카드 탭 — 종 상세 페이지 이동
  // ---------------------------------------------------------------------------

  const handleCardPress = useCallback(
    (post: GalleryPost): void => {
      router.push(`/species/${post.species_id}`)
    },
    [router],
  )

  // ---------------------------------------------------------------------------
  // FlatList 렌더 함수
  // ---------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<GalleryPost>): ReactElement => (
      <GalleryCard
        post={item}
        onHeartToggle={handleHeartToggle}
        onPress={handleCardPress}
      />
    ),
    [handleHeartToggle, handleCardPress],
  )

  const keyExtractor = useCallback((item: GalleryPost): string => item.post_id, [])

  const ListFooterComponent = useCallback(
    (): ReactElement | null =>
      isLoading && !isRefreshing ? (
        <ActivityIndicator color={Colors.primary} style={styles.footerLoader} />
      ) : null,
    [isLoading, isRefreshing],
  )

  const ListEmptyComponent = useCallback(
    (): ReactElement | null =>
      !isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🐦</Text>
          <Text style={styles.emptyText}>아직 공유된 사진이 없어요</Text>
        </View>
      ) : null,
    [isLoading],
  )

  // ---------------------------------------------------------------------------
  // 렌더
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>갤러리</Text>
        <TouchableOpacity
          style={styles.myShareButton}
          onPress={() => router.push('/my-gallery')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="내 공유 목록"
        >
          <Text style={styles.myShareButtonText}>내 공유</Text>
        </TouchableOpacity>
      </View>

      {/* 필터 바 */}
      <View style={styles.filterBar}>
        {/* 지역 필터 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScrollRow}
        >
          {PROVINCE_OPTIONS.map((opt) => {
            const isSelected = selectedProvince === opt.key
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => handleProvinceChange(opt.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* 희귀도 필터 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScrollRow}
        >
          {RARITY_FILTER_OPTIONS.map((opt) => {
            const isSelected = selectedRarity === opt.key
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                onPress={() => handleRarityChange(opt.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* 초기 로딩 스피너 */}
      {isLoading && posts.length === 0 && (
        <View style={styles.initialLoader}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      )}

      {/* 피드 */}
      <FlatList<GalleryPost>
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={8}
        contentContainerStyle={posts.length === 0 ? styles.flatListEmpty : styles.flatListContent}
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
  },

  // 헤더
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.accent,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  myShareButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myShareButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  myShareButtonDisabled: {
    backgroundColor: Colors.accent,
    opacity: 0.45,
  },
  myShareButtonTextDisabled: {
    color: Colors.text.disabled,
  },

  // 필터 바
  filterBar: {
    backgroundColor: Colors.bg.primary,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.accent,
  },
  filterScrollRow: {
    flexGrow: 0,
  },
  filterScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    minWidth: 44,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipSelected: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  filterChipTextSelected: {
    color: Colors.text.inverse,
  },

  // 로더
  initialLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
  },

  // FlatList
  flatListContent: {
    paddingVertical: 8,
  },
  flatListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // 카드
  card: {
    backgroundColor: Colors.bg.card,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 300,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSpeciesName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  cardNickname: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  cardMetaDot: {
    fontSize: 13,
    color: Colors.text.disabled,
  },
  cardProvince: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  cardTimeAgo: {
    fontSize: 13,
    color: Colors.text.disabled,
  },

  // 하트
  heartWrapper: {
    position: 'absolute',
    bottom: 14,
    right: 14,
  },
  heartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 48,
    minHeight: 36,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  heartIcon: {
    fontSize: 18,
    color: Colors.text.disabled,
  },
  heartIconFilled: {
    color: Colors.error,
  },
  heartCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },

  // 희귀도 배지
  rarityBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  rarityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.inverse,
  },

  // 빈 상태
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.text.secondary,
  },
})
