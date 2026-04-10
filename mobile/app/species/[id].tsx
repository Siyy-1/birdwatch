/**
 * species/[id].tsx — 조류 종 상세 화면
 * Expo Router 동적 라우트. collection 탭에서 router.push('/species/KR-001') 형태로 진입.
 */
import React, { useState, useEffect, useCallback, type ReactElement } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { speciesApi, sightingsApi } from '../../src/services/api'
import type { Species, Sighting, RarityTier } from '../../src/types/api'
import { Colors } from '../../src/constants/colors'
import { RARITY_LABEL, RARITY_COLOR, RARITY_BG } from '../../src/constants/rarity'

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

// ---------------------------------------------------------------------------
// SeasonalPresence 컴포넌트
// ---------------------------------------------------------------------------

interface SeasonalPresenceProps {
  seasonal_presence: Record<string, boolean>
}

function SeasonalPresence({ seasonal_presence }: SeasonalPresenceProps): ReactElement {
  return (
    <View style={styles.seasonRow}>
      {MONTH_KEYS.map((key, i) => {
        const present = seasonal_presence[key] === true
        return (
          <View key={key} style={styles.seasonItem}>
            <View
              style={[
                styles.seasonDot,
                { backgroundColor: present ? Colors.secondary : Colors.text.disabled },
              ]}
            />
            <Text style={styles.seasonLabel}>{MONTH_LABELS[i]}</Text>
          </View>
        )
      })}
    </View>
  )
}

// ---------------------------------------------------------------------------
// InfoRow 컴포넌트
// ---------------------------------------------------------------------------

interface InfoRowProps {
  label: string
  value: string | null | undefined
}

function InfoRow({ label, value }: InfoRowProps): ReactElement | null {
  if (value == null || value === '') return null
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// SpeciesDetailScreen
// ---------------------------------------------------------------------------

export default function SpeciesDetailScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [species, setSpecies] = useState<Species | null>(null)
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 풀스크린 사진 모달 상태
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null)

  // hooks는 early return 전에 모두 선언해야 함 (Rules of Hooks)
  const openFullscreen = useCallback((url: string): void => {
    setFullscreenUrl(url)
  }, [])

  const closeFullscreen = useCallback((): void => {
    setFullscreenUrl(null)
  }, [])

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function load(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const [speciesRes, sightingsRes] = await Promise.all([
          speciesApi.get(id),
          sightingsApi.list({ species_id: id, limit: 50 }),
        ])

        if (cancelled) return

        const speciesData: Species = speciesRes.data.data
        setSpecies(speciesData)

        const sightingsList: Sighting[] = sightingsRes.data.data
        setSightings(sightingsList)
      } catch {
        if (!cancelled) {
          setError('종 정보를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  // ---------------------------------------------------------------------------
  // 로딩 / 오류 상태 (early return — 모든 hook 선언 이후)
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    )
  }

  if (error != null || species == null) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error ?? '데이터를 불러올 수 없습니다.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // ---------------------------------------------------------------------------
  // 파생 값
  // ---------------------------------------------------------------------------

  const isCollected = sightings.length > 0
  const isLocked = species.is_locked_free
  const rarityColor = RARITY_COLOR[species.rarity_tier]
  const rarityBg = RARITY_BG[species.rarity_tier]
  const photos = sightings.filter((s) => s.photo_cdn_url != null)

  // ---------------------------------------------------------------------------
  // 렌더
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      {/* ── 1. 헤더 영역 ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Text style={styles.headerBackIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {species.name_ko}
          </Text>
          {species.name_sci != null && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {species.name_sci}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 2. 대표 이미지 영역 ── */}
        <View style={[styles.imagePlaceholder, { backgroundColor: rarityBg }]}>
          <Text style={styles.imagePlaceholderEmoji}>🐦</Text>

          {isLocked && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockOverlayEmoji}>🔒</Text>
              <Text style={styles.lockOverlayText}>Explorer Pass 필요</Text>
            </View>
          )}
        </View>

        {/* ── 3. 정보 카드 ── */}
        <View style={styles.infoCard}>
          {/* 희귀도 배지 + 포인트 */}
          <View style={styles.infoCardTopRow}>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
              <Text style={styles.rarityBadgeText}>{RARITY_LABEL[species.rarity_tier]}</Text>
            </View>
            <Text style={styles.pointsText}>+{species.points} pt</Text>
          </View>

          {/* 수집 여부 뱃지 */}
          <View style={styles.infoCardBottomRow}>
            <View
              style={[
                styles.collectedBadge,
                { backgroundColor: isCollected ? Colors.success : Colors.text.disabled },
              ]}
            >
              <Text style={styles.collectedBadgeText}>
                {isCollected ? '✓ 수집됨' : '미수집'}
              </Text>
            </View>

            {/* 첫 발견 보너스 — 첫 번째 사이팅 기준 */}
            {isCollected && sightings[0]?.is_first_for_user === true && (
              <Text style={styles.firstFoundText}>
                첫 발견 +{sightings[0].points_earned}pt
              </Text>
            )}
          </View>
        </View>

        {/* ── 4. 상세 정보 섹션 (잠금 해제 시만) ── */}
        {!isLocked && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>상세 정보</Text>

            <View style={styles.detailCard}>
              <InfoRow label="영어명" value={species.name_en} />
              <InfoRow
                label="크기"
                value={species.size_cm != null ? `${species.size_cm} cm` : null}
              />
              <InfoRow label="서식지" value={species.habitat_ko} />
              <InfoRow label="IUCN 현황" value={species.iucn_status} />
              <InfoRow label="천연기념물" value={species.cultural_heritage_no} />
            </View>

            {/* 계절 현황 */}
            {species.seasonal_presence != null && (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>계절 현황</Text>
                <SeasonalPresence seasonal_presence={species.seasonal_presence} />
              </View>
            )}

            {/* 재미있는 사실 */}
            {species.fun_fact_ko != null && species.fun_fact_ko !== '' && (
              <View style={styles.funFactCard}>
                <Text style={styles.funFactTitle}>재미있는 사실</Text>
                <Text style={styles.funFactText}>{species.fun_fact_ko}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── 5. 잠금 안내 (is_locked_free=true) ── */}
        {isLocked && (
          <View style={styles.lockedSection}>
            <Text style={styles.lockedText}>
              이 종의 상세 정보는 Explorer Pass에서 확인할 수 있습니다
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => router.push('/subscription')}
              accessibilityRole="button"
            >
              <Text style={styles.upgradeBtnText}>업그레이드</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 6. 내 사진 캐러셀 ── */}
        {photos.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>내 사진 {photos.length}장</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosScrollContent}
            >
              {photos.map((s) => (
                <TouchableOpacity
                  key={s.sighting_id}
                  onPress={() => openFullscreen(s.photo_cdn_url!)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${species.name_ko} 사진 크게 보기`}
                  style={styles.photoThumbWrapper}
                >
                  <Image
                    source={{ uri: s.photo_cdn_url! }}
                    style={styles.photoThumb}
                    contentFit="cover"
                    transition={200}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ── 풀스크린 사진 모달 ── */}
      <Modal
        visible={fullscreenUrl != null}
        transparent
        animationType="fade"
        onRequestClose={closeFullscreen}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          {fullscreenUrl != null && (
            <Image
              source={{ uri: fullscreenUrl }}
              style={styles.modalImage}
              contentFit="contain"
            />
          )}
          <Pressable
            style={styles.modalCloseBtn}
            onPress={closeFullscreen}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <Text style={styles.modalCloseBtnText}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // 레이아웃
  container: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    padding: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // 오류 상태
  errorText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backBtnText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.accent,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  headerBackIcon: {
    fontSize: 28,
    color: Colors.primary,
    lineHeight: 32,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 1,
  },

  // 이미지 플레이스홀더
  imagePlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imagePlaceholderEmoji: {
    fontSize: 64,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  lockOverlayEmoji: {
    fontSize: 36,
  },
  lockOverlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // 정보 카드
  infoCard: {
    backgroundColor: Colors.bg.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    gap: 10,
  },
  infoCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rarityBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rarityBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  pointsText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  collectedBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  collectedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  firstFoundText: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '600',
  },

  // 상세 정보 섹션
  detailSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  detailCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    gap: 8,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    width: 90,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },

  // 계절 현황
  seasonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  seasonItem: {
    alignItems: 'center',
    gap: 4,
  },
  seasonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  seasonLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
  },

  // 재미있는 사실 카드
  funFactCard: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  funFactTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  funFactText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // 내 사진 캐러셀
  photosSection: {
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  photosScrollContent: {
    paddingVertical: 4,
    gap: 8,
  },
  photoThumbWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
  },
  photoThumb: {
    width: 100,
    height: 100,
  },

  // 풀스크린 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 18,
    color: Colors.text.inverse,
    fontWeight: '600',
    lineHeight: 22,
  },

  // 잠금 안내
  lockedSection: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  lockedText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
})
