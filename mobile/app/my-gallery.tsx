/**
 * my-gallery.tsx — 내 갤러리 공유 목록
 * 본인이 공유한 포스트만 표시. 공유 취소(삭제) 가능.
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  type ListRenderItemInfo,
} from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { galleryApi } from '../src/services/api'
import { Colors } from '../src/constants/colors'
import { RARITY_LABEL, RARITY_COLOR } from '../src/constants/rarity'
import { formatRelativeTime } from '../src/utils/time'
import type { RarityTier } from '../src/types/api'

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

interface MyPost {
  post_id: string
  species_id: string
  species_name_ko: string
  rarity_tier: RarityTier
  photo_cdn_url: string
  location_province: string | null
  hearts_count: number
  created_at: string
}

// ---------------------------------------------------------------------------
// MyGalleryScreen
// ---------------------------------------------------------------------------

export default function MyGalleryScreen() {
  const router = useRouter()
  const [posts, setPosts] = useState<MyPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadPosts = useCallback(async (nextPage = 1, reset = false) => {
    if (isLoading && !reset) return
    setIsLoading(true)
    try {
      const res = await galleryApi.list({ page: nextPage, limit: 20, mine: true })
      const data = res.data.data as MyPost[]
      const { total_pages } = res.data.pagination

      setPosts((prev) => reset ? data : [...prev, ...data])
      setPage(nextPage)
      setHasMore(nextPage < total_pages)
    } catch {
      Alert.alert('오류', '목록을 불러올 수 없습니다')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  useFocusEffect(
    useCallback(() => {
      loadPosts(1, true)
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadPosts(1, true)
    setIsRefreshing(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) loadPosts(page + 1)
  }, [hasMore, isLoading, page, loadPosts])

  const handleUnshare = useCallback((postId: string, speciesName: string) => {
    Alert.alert(
      '공유 취소',
      `${speciesName} 사진의 갤러리 공유를 취소할까요?`,
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(postId)
            try {
              await galleryApi.unshare(postId)
              setPosts((prev) => prev.filter((p) => p.post_id !== postId))
            } catch {
              Alert.alert('오류', '공유 취소에 실패했습니다')
            } finally {
              setDeletingId(null)
            }
          },
        },
      ],
    )
  }, [])

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MyPost>) => (
      <View style={styles.card}>
        <Image
          source={{ uri: item.photo_cdn_url }}
          style={styles.cardImage}
          contentFit="cover"
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardSpecies} numberOfLines={1}>
            {item.species_name_ko}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLOR[item.rarity_tier] }]}>
              <Text style={styles.rarityText}>{RARITY_LABEL[item.rarity_tier]}</Text>
            </View>
            {item.location_province && (
              <Text style={styles.province}>{item.location_province}</Text>
            )}
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.timeAgo}>{formatRelativeTime(item.created_at)}</Text>
            <Text style={styles.hearts}>♥ {item.hearts_count}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.unshareBtn}
          onPress={() => handleUnshare(item.post_id, item.species_name_ko)}
          disabled={deletingId === item.post_id}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {deletingId === item.post_id
            ? <ActivityIndicator size="small" color={Colors.text.disabled} />
            : <Text style={styles.unshareBtnText}>✕</Text>
          }
        </TouchableOpacity>
      </View>
    ),
    [deletingId, handleUnshare],
  )

  const keyExtractor = useCallback((item: MyPost) => item.post_id, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 공유</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>🖼️</Text>
              <Text style={styles.emptyText}>공유한 사진이 없습니다</Text>
              <Text style={styles.emptySubText}>
                카메라로 새를 찍고 갤러리에 공유해보세요
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading && posts.length > 0 ? (
            <ActivityIndicator color={Colors.primary} style={{ padding: 16 }} />
          ) : null
        }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.accent,
  },
  backBtn: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardImage: {
    width: 90,
    height: 90,
  },
  cardInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  cardSpecies: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rarityBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  province: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.text.disabled,
  },
  hearts: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  unshareBtn: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
  },
  unshareBtnText: {
    fontSize: 16,
    color: Colors.text.disabled,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
})
