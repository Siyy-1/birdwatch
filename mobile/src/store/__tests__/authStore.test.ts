import { useAuthStore } from '../authStore'

// 외부 의존성 전체 mock
jest.mock('../../services/auth', () => ({
  restoreSession: jest.fn(),
  signInWithKakao: jest.fn(),
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithDevLogin: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock('../../services/api', () => ({
  usersApi: { me: jest.fn(), update: jest.fn(), updateConsent: jest.fn(), completeOnboarding: jest.fn() },
  apiClient: { post: jest.fn() },
}))

jest.mock('../../services/storage/db', () => ({
  getDb: jest.fn().mockResolvedValue({}),
  upsertUserProfile: jest.fn().mockResolvedValue(undefined),
}))

import * as auth from '../../services/auth'
import { usersApi } from '../../services/api'

const mockAuth = auth as jest.Mocked<typeof auth>
const mockUsersApi = usersApi as jest.Mocked<typeof usersApi>

const mockUser = {
  user_id: 'user-uuid',
  nickname: '테스터',
  profile_image_key: null,
  oauth_provider: 'kakao' as const,
  gps_consent: false,
  gps_consent_at: null,
  terms_agreed_at: '2026-01-01T00:00:00Z',
  privacy_agreed_at: '2026-01-01T00:00:00Z',
  marketing_agreed_at: null,
  ai_training_opt_in: false,
  ai_training_opt_in_at: null,
  total_points: 0,
  streak_days: 0,
  last_sighting_at: null,
  species_count: 0,
  subscription_tier: 'free' as const,
  subscription_expires_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 각 테스트 전 store 초기화
    useAuthStore.setState({
      status: 'unknown',
      user: null,
      userId: null,
      isLoading: false,
      error: null,
      needsOnboarding: false,
    })
  })

  it('초기 상태: status=unknown, user=null', () => {
    const { status, user, isLoading } = useAuthStore.getState()
    expect(status).toBe('unknown')
    expect(user).toBeNull()
    expect(isLoading).toBe(false)
  })

  describe('restoreSession', () => {
    it('세션 없으면 status=unauthenticated', async () => {
      mockAuth.restoreSession.mockResolvedValue(null)

      await useAuthStore.getState().restoreSession()

      expect(useAuthStore.getState().status).toBe('unauthenticated')
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('세션 있고 me() 성공 → status=authenticated, user 설정', async () => {
      mockAuth.restoreSession.mockResolvedValue({
        userId: 'user-uuid',
        accessToken: 'token',
        idToken: null,
      })
      mockUsersApi.me.mockResolvedValue({ data: { data: mockUser } } as any)

      await useAuthStore.getState().restoreSession()

      const state = useAuthStore.getState()
      expect(state.status).toBe('authenticated')
      expect(state.user?.user_id).toBe('user-uuid')
    })

    it('약관 동의 시각이 없으면 needsOnboarding=true', async () => {
      mockAuth.restoreSession.mockResolvedValue({
        userId: 'user-uuid',
        accessToken: 'token',
        idToken: null,
      })
      mockUsersApi.me.mockResolvedValue({
        data: {
          data: {
            ...mockUser,
            terms_agreed_at: null,
            privacy_agreed_at: null,
          },
        },
      } as any)

      await useAuthStore.getState().restoreSession()

      expect(useAuthStore.getState().needsOnboarding).toBe(true)
    })

    it('세션 있지만 me() 실패 → status=unauthenticated', async () => {
      mockAuth.restoreSession.mockResolvedValue({
        userId: 'user-uuid',
        accessToken: 'token',
        idToken: null,
      })
      mockUsersApi.me.mockRejectedValue(new Error('network error'))

      await useAuthStore.getState().restoreSession()

      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })
  })

  describe('signInWithKakao', () => {
    it('로그인 중 isLoading=true, 완료 후 false', async () => {
      let resolveMe!: (v: any) => void
      mockAuth.signInWithKakao.mockResolvedValue({ userId: 'user-uuid', accessToken: 'token', idToken: null })
      mockUsersApi.me.mockReturnValue(new Promise(r => { resolveMe = r }))

      const loginPromise = useAuthStore.getState().signInWithKakao()
      expect(useAuthStore.getState().isLoading).toBe(true)

      resolveMe({ data: { data: mockUser } })
      await loginPromise

      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('로그인 성공 → status=authenticated', async () => {
      mockAuth.signInWithKakao.mockResolvedValue({ userId: 'user-uuid', accessToken: 'token', idToken: null })
      mockUsersApi.me.mockResolvedValue({ data: { data: mockUser } } as any)

      await useAuthStore.getState().signInWithKakao()

      expect(useAuthStore.getState().status).toBe('authenticated')
    })

    it('로그인 실패 → error 설정, status=unauthenticated', async () => {
      mockAuth.signInWithKakao.mockRejectedValue(new Error('카카오 로그인 취소됨'))

      await useAuthStore.getState().signInWithKakao()

      const state = useAuthStore.getState()
      expect(state.status).toBe('unauthenticated')
      expect(state.error).toBe('카카오 로그인 취소됨')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('signOut', () => {
    it('signOut 후 status=unauthenticated, user=null', async () => {
      // 먼저 로그인 상태로 설정
      useAuthStore.setState({ status: 'authenticated', user: mockUser, userId: 'user-uuid' })
      mockAuth.signOut.mockResolvedValue(undefined)

      await useAuthStore.getState().signOut()

      const state = useAuthStore.getState()
      expect(state.status).toBe('unauthenticated')
      expect(state.user).toBeNull()
      expect(state.userId).toBeNull()
    })
  })

  describe('clearError', () => {
    it('error를 null로 초기화', () => {
      useAuthStore.setState({ error: '이전 에러' })
      useAuthStore.getState().clearError()
      expect(useAuthStore.getState().error).toBeNull()
    })
  })

  describe('updateAiTrainingOptIn', () => {
    it('전역 AI 학습 동의를 갱신한다', async () => {
      useAuthStore.setState({ status: 'authenticated', user: mockUser, userId: 'user-uuid' })
      mockUsersApi.update.mockResolvedValue({ data: { data: { ai_training_opt_in: true } } } as any)

      await useAuthStore.getState().updateAiTrainingOptIn(true)

      expect((mockUsersApi.update as any).mock.calls[0][0].ai_training_opt_in).toBe(true)
      expect(useAuthStore.getState().user?.ai_training_opt_in).toBe(true)
    })
  })
})
