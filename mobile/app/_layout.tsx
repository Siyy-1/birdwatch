/**
 * _layout.tsx — 루트 레이아웃
 * 앱 초기화: DB, 오프라인 큐, 세션 복원
 * 인증 상태에 따라 (auth) 또는 (tabs)로 리다이렉트
 * 포그라운드 복귀 시 대기 중 업로드를 사용자 확인 후 진행
 */
import { useEffect, useRef } from 'react'
import { Alert, AppState, type AppStateStatus } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'

import { useAuthStore } from '../src/store/authStore'
import { initQueue, flushQueue, getPendingCount } from '../src/services/storage/offlineQueue'

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
  const queuePromptVisibleRef = useRef(false)

  // 앱 초기화
  useEffect(() => {
    const init = async () => {
      await initQueue()
      await restoreSession()
    }
    init()
  }, [])

  // 포그라운드 복귀 시 사용자 승인 후 큐 업로드
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current
      appStateRef.current = nextState

      // background/inactive → active 전환 시에만 확인
      if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        getPendingCount()
          .then((pendingCount) => {
            if (pendingCount < 1 || queuePromptVisibleRef.current) {
              return
            }

            queuePromptVisibleRef.current = true
            Alert.alert(
              '대기 중인 업로드',
              `보관된 목격 기록 ${pendingCount}건을 지금 업로드할까요?`,
              [
                {
                  text: '나중에',
                  style: 'cancel',
                  onPress: () => {
                    queuePromptVisibleRef.current = false
                  },
                },
                {
                  text: '업로드',
                  onPress: () => {
                    flushQueue()
                      .then((result) => {
                        if (result.review_ready > 0) {
                          Alert.alert(
                            '검토 대기',
                            `AI 분석이 끝난 ${result.review_ready}건을 검토해주세요.`,
                            [
                              {
                                text: '나중에',
                                style: 'cancel',
                              },
                              {
                                text: '지금 검토',
                                onPress: () => {
                                  router.push('/(tabs)/camera')
                                },
                              },
                            ],
                          )
                        } else if (result.synced > 0 || result.failed > 0) {
                          Alert.alert(
                            '업로드 결과',
                            `완료 ${result.synced}건, 실패 ${result.failed}건`,
                          )
                        }
                      })
                      .catch(() => {
                        Alert.alert('업로드 실패', '보관된 목격 기록 업로드에 실패했습니다. 다시 시도해주세요.')
                      })
                      .finally(() => {
                        queuePromptVisibleRef.current = false
                      })
                  },
                },
              ],
            )
          })
          .catch(() => {
            queuePromptVisibleRef.current = false
          })
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
