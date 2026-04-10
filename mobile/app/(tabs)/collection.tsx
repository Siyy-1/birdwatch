/**
 * collection.tsx — 도감 탭 화면
 * 전체 조류 종 목록, 검색, 희귀도 필터, 수집 여부 표시
 */
import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactElement,
} from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  type ListRenderItemInfo,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { speciesApi, apiClient } from '../../src/services/api'
import { useAuthStore } from '../../src/store/authStore'
import { Colors } from '../../src/constants/colors'
import { RARITY_LABEL, RARITY_COLOR, RARITY_BG } from '../../src/constants/rarity'
import { RarityBadge } from '../../src/components/RarityBadge'
import type { Species, RarityTier } from '../../src/types/api'

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 20

type FilterOption = RarityTier | 'all'

// FlatList data 아이템 — 종 아이템 또는 섹션 구분선
type SectionDivider = {
  type: 'divider'
  label: string
  count: number
}
type FlatListItem = Species | SectionDivider

function isDivider(item: FlatListItem): item is SectionDivider {
  return (item as SectionDivider).type === 'divider'
}

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'common', label: 'common' },
  { key: 'migrant', label: 'migrant' },
  { key: 'rare', label: 'rare' },
  { key: 'legendary', label: 'legendary' },
]

// ---------------------------------------------------------------------------
// SpeciesItem 인라인 컴포넌트
// ---------------------------------------------------------------------------

interface SpeciesItemProps {
  species: Species
  isCollected: boolean
  isLocked: boolean
}

function SpeciesItem({ species, isCollected, isLocked }: SpeciesItemProps): ReactElement {
  const placeholderBg = RARITY_BG[species.rarity_tier]

  return (
    <View style={styles.itemContainer}>
      {/* 썸네일 영역 — Species 타입에 이미지 URL 필드 없음, 플레이스홀더 표시 */}
      <View style={[styles.itemImageWrapper, { backgroundColor: placeholderBg }]}>
        <Text style={styles.itemImagePlaceholder}>🐦</Text>

        {/* 잠금 오버레이 */}
        {isLocked && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}

        {/* 수집 완료 뱃지 */}
        {isCollected && (
          <View style={styles.collectedBadge}>
            <Text style={styles.collectedBadgeText}>✓</Text>
          </View>
        )}
      </View>

      {/* 정보 영역 */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemNameKo} numberOfLines={1}>
          {species.name_ko}
        </Text>
        {species.name_sci != null && (
          <Text style={styles.itemNameSci} numberOfLines={1}>
            {species.name_sci}
          </Text>
        )}
        <View style={styles.itemBadgeRow}>
          <RarityBadge rarity_tier={species.rarity_tier} />
          <Text style={styles.itemPoints}>{species.points}pt</Text>
        </View>
        <Text
          style={[
            styles.itemCollectedLabel,
            isCollected ? styles.itemCollectedYes : styles.itemCollectedNo,
          ]}
        >
          {isCollected ? '수집됨 ✓' : '미수집'}
        </Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// CollectionScreen
// ---------------------------------------------------------------------------

export default function CollectionScreen(): ReactElement {
  const router = useRouter()

  // 인증 상태
  const user = useAuthStore((s) => s.user)
  const subscriptionTier = user?.subscription_tier ?? 'free'

  // 목록 상태
  const [species, setSpecies] = useState<Species[]>([])
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [totalSpecies, setTotalSpecies] = useState(0)

  // 검색 / 필터 상태
  const [searchText, setSearchText] = useState('')
  const [selectedRarity, setSelectedRarity] = useState<FilterOption>('all')

  // debounce 타이머 ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 현재 검색·필터 값을 ref로 보관 (클로저 최신값 보장)
  const searchRef = useRef(searchText)
  const rarityRef = useRef(selectedRarity)

  // ---------------------------------------------------------------------------
  // 수집 목록 로드
  // ---------------------------------------------------------------------------

  const loadCollected = useCallback(async (): Promise<void> => {
    try {
      const res = await apiClient.get<{ data: { species_ids: string[] } }>(
        '/api/v1/sightings/collected-species',
      )
      setCollectedIds(new Set(res.data.data.species_ids))
    } catch {
      // keep existing state on network error
    }
  }, [])

  // ---------------------------------------------------------------------------
  // 종 목록 전체 로드 (페이지네이션 없이 모두 한번에)
  // 300종 이하 유한 목록이므로 전체 로드가 클라이언트 정렬에 더 적합
  // ---------------------------------------------------------------------------

  const loadSpecies = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      // 1페이지로 총 페이지 수 파악
      const firstRes = await speciesApi.list({
        page: 1,
        limit: PAGE_LIMIT,
        rarity_tier: rarityRef.current !== 'all' ? rarityRef.current : undefined,
        search: searchRef.current.trim() || undefined,
      })
      const firstItems: Species[] = firstRes.data.data
      const { total_pages, total } = firstRes.data.pagination
      setTotalSpecies(total)

      if (total_pages <= 1) {
        setSpecies(firstItems)
        return
      }

      // 나머지 페이지 병렬 fetch
      const restRes = await Promise.all(
        Array.from({ length: total_pages - 1 }, (_, i) =>
          speciesApi.list({
            page: i + 2,
            limit: PAGE_LIMIT,
            rarity_tier: rarityRef.current !== 'all' ? rarityRef.current : undefined,
            search: searchRef.current.trim() || undefined,
          }),
        ),
      )

      setSpecies([
        ...firstItems,
        ...restRes.flatMap((r) => r.data.data as Species[]),
      ])
    } catch {
      // 네트워크 오류 시 조용히 처리
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // 초기 로드 + 화면 포커스 시 재로드
  // ---------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      searchRef.current = searchText
      rarityRef.current = selectedRarity
      // 수집 ID + 전체 종 목록을 병렬 로드 → 둘 다 완료된 상태에서 정렬
      Promise.all([loadCollected(), loadSpecies()])
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ---------------------------------------------------------------------------
  // 검색 debounce
  // ---------------------------------------------------------------------------

  const handleSearchChange = useCallback(
    (text: string): void => {
      setSearchText(text)
      searchRef.current = text

      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current)
      }
      debounceTimer.current = setTimeout(() => {
        loadSpecies()
      }, 500)
    },
    [loadSpecies],
  )

  // ---------------------------------------------------------------------------
  // 필터 변경
  // ---------------------------------------------------------------------------

  const handleRarityChange = useCallback(
    (rarity: FilterOption): void => {
      setSelectedRarity(rarity)
      rarityRef.current = rarity
      loadSpecies()
    },
    [loadSpecies],
  )

  // ---------------------------------------------------------------------------
  // Pull-to-refresh
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true)
    await Promise.all([loadCollected(), loadSpecies()])
    setIsRefreshing(false)
  }, [loadSpecies, loadCollected])

  // ---------------------------------------------------------------------------
  // FlatList 렌더 함수
  // ---------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<FlatListItem>): ReactElement => {
      // 구분선 아이템
      if (isDivider(item)) {
        return (
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionDividerText}>
              {item.label} ({item.count})
            </Text>
          </View>
        )
      }

      // 종 아이템
      const isCollected = collectedIds.has(item.species_id)
      const isLocked = item.is_locked_free && subscriptionTier === 'free'
      return (
        <TouchableOpacity
          onPress={() => router.push(`/species/${item.species_id}`)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={item.name_ko}
        >
          <SpeciesItem
            species={item}
            isCollected={isCollected}
            isLocked={isLocked}
          />
        </TouchableOpacity>
      )
    },
    [collectedIds, subscriptionTier, router],
  )

  const keyExtractor = useCallback(
    (item: FlatListItem): string =>
      isDivider(item) ? `divider-${item.label}` : item.species_id,
    [],
  )

  const ListFooterComponent = useCallback(
    (): ReactElement | null =>
      isLoading && !isRefreshing ? (
        <ActivityIndicator
          color={Colors.primary}
          style={{ padding: 16 }}
        />
      ) : null,
    [isLoading, isRefreshing],
  )

  const ListEmptyComponent = useCallback(
    (): ReactElement | null =>
      !isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🐦</Text>
          <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
        </View>
      ) : null,
    [isLoading],
  )

  // ---------------------------------------------------------------------------
  // 수집 개수 계산
  // ---------------------------------------------------------------------------

  const collectedCount = collectedIds.size

  // ---------------------------------------------------------------------------
  // 정렬된 목록 파생값 — 수집한 종 먼저, 미수집 종 뒤로
  // species 자체는 변형하지 않고 파생값만 생성
  // ---------------------------------------------------------------------------

  const sortedSpecies = useMemo((): FlatListItem[] => {
    const collected: Species[] = []
    const uncollected: Species[] = []

    for (const s of species) {
      if (collectedIds.has(s.species_id)) {
        collected.push(s)
      } else {
        uncollected.push(s)
      }
    }

    const result: FlatListItem[] = []

    if (collected.length > 0) {
      result.push({ type: 'divider', label: '수집한 종', count: collected.length })
      result.push(...collected)
    }

    if (uncollected.length > 0) {
      result.push({ type: 'divider', label: '미수집', count: uncollected.length })
      result.push(...uncollected)
    }

    return result
  }, [species, collectedIds])

  // ---------------------------------------------------------------------------
  // 렌더
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>도감</Text>
        <Text style={styles.headerCount}>
          {collectedCount} / {totalSpecies}종
        </Text>
      </View>

      {/* 검색창 */}
      <TextInput
        style={styles.searchInput}
        value={searchText}
        onChangeText={handleSearchChange}
        placeholder="종 이름으로 검색..."
        placeholderTextColor={Colors.text.disabled}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {/* 필터 탭 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterScrollContainer}
      >
        {FILTER_OPTIONS.map((opt) => {
          const isSelected = selectedRarity === opt.key
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.filterBtn,
                isSelected
                  ? styles.filterBtnSelected
                  : styles.filterBtnUnselected,
              ]}
              onPress={() => handleRarityChange(opt.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  isSelected
                    ? styles.filterBtnTextSelected
                    : styles.filterBtnTextUnselected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* 종 목록 */}
      <FlatList<FlatListItem>
        data={sortedSpecies}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        extraData={collectedIds}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        contentContainerStyle={species.length === 0 ? styles.flatListEmpty : undefined}
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // 컨테이너
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerCount: {
    fontSize: 14,
    color: Colors.text.secondary,
  },

  // 검색창
  searchInput: {
    margin: 8,
    padding: 10,
    backgroundColor: Colors.bg.secondary,
    borderRadius: 10,
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.accent,
  },

  // 필터 탭
  filterScrollContainer: {
    backgroundColor: Colors.bg.primary,
  },
  filterScroll: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnSelected: {
    backgroundColor: Colors.primary,
  },
  filterBtnUnselected: {
    backgroundColor: Colors.accent,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterBtnTextSelected: {
    color: Colors.text.inverse,
  },
  filterBtnTextUnselected: {
    color: Colors.text.primary,
  },

  // 종 아이템
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  itemImageWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  itemImagePlaceholder: {
    fontSize: 36,
  },
  // (itemImage 사용 안 함 — Species 타입에 이미지 URL 필드 없음)

  // 잠금 오버레이
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 22,
  },

  // 수집 뱃지 (이미지 우상단)
  collectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectedBadgeText: {
    fontSize: 11,
    color: Colors.text.inverse,
    fontWeight: '700',
  },

  // 아이템 정보
  itemInfo: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 3,
  },
  itemNameKo: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  itemNameSci: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  itemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  itemPoints: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  itemCollectedLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  itemCollectedYes: {
    color: Colors.success,
  },
  itemCollectedNo: {
    color: Colors.text.disabled,
  },

  // 희귀도 뱃지
  rarityBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rarityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // 섹션 구분선
  sectionDivider: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: Colors.bg.secondary,
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    letterSpacing: 0.3,
  },

  // 빈 상태
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    color: Colors.text.secondary,
    marginTop: 8,
    fontSize: 14,
  },

  // FlatList 빈 상태일 때 contentContainerStyle
  flatListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
})
