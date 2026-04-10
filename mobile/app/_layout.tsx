/**
 * _layout.tsx — 루트 레이아웃
 * 앱 초기화: DB, 오프라인 큐, 세션 복원
 * 인증 상태에 따라 (auth) 또는 (tabs)로 리다이렉트
 * 포그라운드 복귀 시 오프라인 큐 자동 flush
 */
import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'

import { useAuthStore } from '../src/store/authStore'
import { initQueue, flushQueue } from '../src/services/storage/offlineQueue'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
})

export default function RootLayout() {
  const { status, restoreSession } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  // 앱 초기화
  useEffect(() => {
    const init = async () => {
      await initQueue()
      await restoreSession()
    }
    init()
  }, [])

  // 포그라운드 복귀 시 오프라인 큐 자동 flush
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current
      appStateRef.current = nextState

      // background/inactive → active 전환 시에만 flush
      if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        flushQueue().catch(() => {/* 실패 무시 — 다음 복귀 시 재시도 */})
      }
    })

    return () => subscription.remove()
  }, [])

  // 인증 상태 변경 시 라우팅
  useEffect(() => {
    if (status === 'unknown') return

    const inAuthGroup = segments[0] === '(auth)'

    if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)')
    } else if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login')
    }
  }, [status, segments])

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </GestureHandlerRootView>
    </QueryClientProvider>
  )
}
