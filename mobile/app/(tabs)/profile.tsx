/**
 * profile.tsx — BirdWatch 프로필 탭
 * 유저 통계, 최근 목격, GPS 동의 설정, 로그아웃을 제공합니다.
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'

import { Colors } from '../../src/constants/colors'
import { BADGES } from '../../src/constants/badges'
import { useAuthStore } from '../../src/store/authStore'
import { sightingsApi } from '../../src/services/api'
import type { Sighting } from '../../src/types/api'

// ---------------------------------------------------------------------------
// 유틸 함수
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}시간 전`
  return `${Math.floor(hrs / 24)}일 전`
}

// ---------------------------------------------------------------------------
// 인라인 컴포넌트: SectionHeader
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text.secondary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {title}
    </Text>
  )
}

// ---------------------------------------------------------------------------
// 인라인 컴포넌트: SightingRow
// ---------------------------------------------------------------------------

function SightingRow({ sighting }: { sighting: Sighting }) {
  return (
    <View style={styles.sightingRow}>
      {sighting.photo_cdn_url ? (
        <Image
          source={{ uri: sighting.photo_cdn_url }}
          style={styles.sightingThumbnail}
        />
      ) : (
        <View style={styles.sightingThumbnailPlaceholder}>
          <Text style={styles.sightingThumbnailIcon}>🐦</Text>
        </View>
      )}
      <View style={styles.sightingInfo}>
        <Text style={styles.sightingSpecies}>{sighting.species_id}</Text>
        <Text style={styles.sightingPoints}>+{sighting.points_earned}pt</Text>
      </View>
      <Text style={styles.sightingTime}>
        {formatRelativeTime(sighting.observed_at)}
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// 메인 화면
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const router = useRouter()
  const { user, signOut, updateGpsConsent, updateAiTrainingOptIn } = useAuthStore()
  const [recentSightings, setRecentSightings] = useState<Sighting[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 포커스 시 최근 목격 로드
  useFocusEffect(
    useCallback(() => {
      const loadRecentSightings = async () => {
        setIsLoading(true)
        try {
          const res = await sightingsApi.list({ limit: 5, page: 1 })
          setRecentSightings(res.data.data)
        } catch {
          // 네트워크 오류 시 기존 데이터 유지
        } finally {
          setIsLoading(false)
        }
      }

      loadRecentSightings()
    }, []),
  )

  // user가 null이면 로딩 표시
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  // ---------------------------------------------------------------------------
  // 통계 데이터
  // ---------------------------------------------------------------------------

  const stats = [
    { label: '포인트', value: formatNumber(user.total_points) + 'pt', icon: '🏆' },
    { label: '스트릭', value: `${user.streak_days}일`, icon: '🔥' },
    { label: '수집 종', value: `${user.species_count}종`, icon: '🐦' },
  ]

  // ---------------------------------------------------------------------------
  // 핸들러
  // ---------------------------------------------------------------------------

  const handleGpsConsent = async (value: boolean) => {
    try {
      await updateGpsConsent(value)
    } catch {
      Alert.alert('오류', 'GPS 동의 변경에 실패했습니다')
    }
  }

  const handleAiTrainingConsent = async (value: boolean) => {
    try {
      await updateAiTrainingOptIn(value)
    } catch {
      Alert.alert('오류', 'AI 학습 동의 변경에 실패했습니다')
    }
  }

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ])
  }

  // ---------------------------------------------------------------------------
  // 아바타
  // ---------------------------------------------------------------------------

  const cdnDomain = process.env.EXPO_PUBLIC_CDN_DOMAIN
  const avatarUri =
    user.profile_image_key && cdnDomain
      ? `https://${cdnDomain}/${user.profile_image_key}`
      : null

  // ---------------------------------------------------------------------------
  // 구독 뱃지
  // ---------------------------------------------------------------------------

  const isPremium = user.subscription_tier === 'premium'
  const badgeStyle = isPremium
    ? { backgroundColor: Colors.rarity.legendary }
    : { backgroundColor: '#E0E0E0' }
  const badgeTextStyle = isPremium
    ? { color: 'white' as const }
    : { color: '#666' as const }
  const badgeLabel = isPremium ? '✨ PREMIUM' : 'FREE'

  // ---------------------------------------------------------------------------
  // 렌더
  // ---------------------------------------------------------------------------

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <Text style={styles.headerText}>프로필</Text>

      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {user.nickname.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.nickname}>{user.nickname}</Text>
        <View style={[styles.subscriptionBadge, badgeStyle]}>
          <Text style={[styles.subscriptionBadgeText, badgeTextStyle]}>
            {badgeLabel}
          </Text>
        </View>
      </View>

      {/* 통계 3열 */}
      <View style={styles.statsContainer}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* 획득 배지 섹션 */}
      <SectionHeader title="획득 배지" />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={BADGES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.badgeList}
        renderItem={({ item }) => {
          const earned = item.condition({
            total_points: user.total_points,
            streak_days: user.streak_days,
            species_count: user.species_count,
          })
          return (
            <View style={[styles.badgeCard, earned ? styles.badgeCardEarned : styles.badgeCardLocked]}>
              <Text style={styles.badgeIcon}>{item.icon}</Text>
              <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]}>{item.name}</Text>
            </View>
          )
        }}
        style={styles.badgeFlatList}
      />

      {/* 최근 목격 섹션 */}
      <SectionHeader title="최근 목격" />
      <View style={styles.sightingsContainer}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={Colors.primary}
            style={{ padding: 16 }}
          />
        ) : recentSightings.length > 0 ? (
          recentSightings.map((sighting) => (
            <SightingRow key={sighting.sighting_id} sighting={sighting} />
          ))
        ) : (
          <Text
            style={{ color: Colors.text.secondary, textAlign: 'center', padding: 16 }}
          >
            아직 목격 기록이 없습니다 🐦
          </Text>
        )}
      </View>

      {/* 설정 섹션 */}
      <SectionHeader title="설정" />

      {/* GPS 동의 Switch */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>📍 GPS 위치 동의</Text>
        <Switch
          value={user?.gps_consent ?? false}
          onValueChange={handleGpsConsent}
          trackColor={{ false: '#E0E0E0', true: Colors.secondary }}
          thumbColor={user?.gps_consent ? Colors.primary : '#FFFFFF'}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingTextBox}>
          <Text style={styles.settingLabel}>🧠 AI 학습 개선 동의</Text>
          <Text style={styles.settingSubLabel}>
            촬영 이미지를 AI 품질 개선과 재학습에 활용합니다. 건별 저장 시에도 다시 변경할 수 있습니다.
          </Text>
        </View>
        <Switch
          value={user.ai_training_opt_in}
          onValueChange={handleAiTrainingConsent}
          trackColor={{ false: '#E0E0E0', true: Colors.secondary }}
          thumbColor={user.ai_training_opt_in ? Colors.primary : '#FFFFFF'}
        />
      </View>

      {/* Explorer Pass 업그레이드 CTA (free 유저만 표시) */}
      {user.subscription_tier === 'free' && (
        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => router.push('/subscription')}
          activeOpacity={0.85}
        >
          <Text style={styles.upgradeBtnText}>🌟 Explorer Pass 업그레이드</Text>
          <Text style={styles.upgradeBtnSub}>
            월 6,900원 · 무제한 AI 식별 · 전체 300종 도감
          </Text>
        </TouchableOpacity>
      )}

      {/* 로그아웃 */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Text style={styles.signOutText}>로그아웃</Text>
      </TouchableOpacity>

      {/* 하단 여백 */}
      <View style={{ height: 32 }} />
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
  },

  // 헤더
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    padding: 16,
  },

  // 프로필 카드
  profileCard: {
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    padding: 24,
    margin: 8,
    borderRadius: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nickname: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 8,
  },
  subscriptionBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  subscriptionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 통계
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  // 배지
  badgeFlatList: {
    marginBottom: 8,
  },
  badgeList: {
    paddingHorizontal: 8,
    gap: 8,
  },
  badgeCard: {
    width: 80,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  badgeCardEarned: {
    backgroundColor: '#F0F7F0',
  },
  badgeCardLocked: {
    backgroundColor: '#F5F5F5',
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: Colors.text.secondary,
  },

  // 목격 목록
  sightingsContainer: {
    backgroundColor: Colors.bg.card,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sightingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.bg.secondary,
  },
  sightingThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  sightingThumbnailPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sightingThumbnailIcon: {
    fontSize: 22,
  },
  sightingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sightingSpecies: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sightingPoints: {
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  sightingTime: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 8,
  },

  // 설정 행
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.bg.card,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  settingTextBox: {
    flex: 1,
    paddingRight: 12,
  },
  settingSubLabel: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.text.secondary,
  },

  // Explorer Pass 업그레이드 CTA
  upgradeBtn: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  upgradeBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  upgradeBtnSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },

  // 로그아웃
  signOutBtn: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: 15,
  },
})
