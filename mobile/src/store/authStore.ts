/**
 * authStore.ts — Zustand 인증 상태
 */
import { create } from 'zustand'
import type { User } from '../types/api'
import * as auth from '../services/auth'
import { usersApi } from '../services/api'
import { getDb, upsertUserProfile } from '../services/storage/db'

type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated'

interface OnboardingState {
  termsAgreed:     boolean
  privacyAgreed:   boolean
  marketingAgreed: boolean
  gpsConsented:    boolean
}

interface AuthState {
  status:      AuthStatus
  user:        User | null
  userId:      string | null

  // 진행 중 상태
  isLoading:   boolean
  error:       string | null

  // 온보딩 (처음 가입 시)
  needsOnboarding: boolean
  onboarding:  OnboardingState

  // 액션
  restoreSession:      () => Promise<void>
  signInWithKakao:     () => Promise<void>
  signInWithApple:     () => Promise<void>
  signInWithGoogle:    () => Promise<void>
  signInWithDevLogin:  (email: string) => Promise<void>
  signOut:             () => Promise<void>
  refreshUser:         () => Promise<void>
  updateGpsConsent:    (consent: boolean) => Promise<void>
  setOnboarding:       (partial: Partial<OnboardingState>) => void
  clearError:          () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status:          'unknown',
  user:            null,
  userId:          null,
  isLoading:       false,
  error:           null,
  needsOnboarding: false,
  onboarding: {
    termsAgreed:     false,
    privacyAgreed:   false,
    marketingAgreed: false,
    gpsConsented:    false,
  },

  restoreSession: async () => {
    const session = await auth.restoreSession()
    if (!session) {
      set({ status: 'unauthenticated' })
      return
    }
    set({ userId: session.userId })
    await get().refreshUser()
  },

  signInWithKakao: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await auth.signInWithKakao()
      set({ userId: result.userId })
      await get().refreshUser()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '카카오 로그인 실패', status: 'unauthenticated' })
    } finally {
      set({ isLoading: false })
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await auth.signInWithApple()
      set({ userId: result.userId })
      await get().refreshUser()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Apple 로그인 실패', status: 'unauthenticated' })
    } finally {
      set({ isLoading: false })
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await auth.signInWithGoogle()
      set({ userId: result.userId })
      await get().refreshUser()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Google 로그인 실패', status: 'unauthenticated' })
    } finally {
      set({ isLoading: false })
    }
  },

  signInWithDevLogin: async (email: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await auth.signInWithDevLogin(email)
      set({ userId: result.userId })
      await get().refreshUser()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '개발용 로그인 실패', status: 'unauthenticated' })
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    await auth.signOut()
    set({ status: 'unauthenticated', user: null, userId: null })
  },

  refreshUser: async () => {
    try {
      const res = await usersApi.me()
      const user: User = res.data.data
      const db = await getDb()
      await upsertUserProfile(db, user)

      // 온보딩 필요 여부: terms 동의 여부로 판단
      const needsOnboarding = !user.terms_agreed_at

      set({ user, status: 'authenticated', needsOnboarding })
    } catch {
      set({ status: 'unauthenticated', user: null })
    }
  },

  updateGpsConsent: async (consent: boolean) => {
    const { user } = get()
    if (!user) return
    await usersApi.updateConsent(consent)
    set({ user: { ...user, gps_consent: consent } })
  },

  setOnboarding: (partial) => {
    set((state) => ({ onboarding: { ...state.onboarding, ...partial } }))
  },

  clearError: () => set({ error: null }),
}))
