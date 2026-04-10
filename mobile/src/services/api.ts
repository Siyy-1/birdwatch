/**
 * api.ts — BirdWatch 백엔드 HTTP 클라이언트
 * - JWT Bearer 토큰 자동 주입
 * - 401 시 토큰 갱신 후 재시도
 * - 네트워크 오류 시 isNetworkError 플래그 반환
 */
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export const STORAGE_KEYS = {
  ACCESS_TOKEN:  'bw_access_token',
  REFRESH_TOKEN: 'bw_refresh_token',
  USER_ID:       'bw_user_id',
} as const

// ---------------------------------------------------------------------------
// Axios 인스턴스
// ---------------------------------------------------------------------------

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processRefreshQueue(error: unknown, accessToken?: string) {
  for (const queuedRequest of refreshQueue) {
    if (error || !accessToken) {
      queuedRequest.reject(error)
    } else {
      queuedRequest.resolve(accessToken)
    }
  }
  refreshQueue = []
}

function withAuthorizationHeader(
  config: RetryableAxiosRequestConfig,
  accessToken: string,
): RetryableAxiosRequestConfig {
  const headers = AxiosHeaders.from(config.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  config.headers = headers
  return config
}

// 요청 인터셉터: AccessToken 주입
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터: 401 처리
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN)
    if (!refreshToken) {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN)
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then((accessToken) => {
        return apiClient(withAuthorizationHeader(originalRequest, accessToken))
      })
    }

    isRefreshing = true

    try {
      const response = await axios.post<{ access_token: string }>(
        `${BASE_URL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken },
      )

      const { access_token } = response.data
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access_token)

      apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`

      processRefreshQueue(null, access_token)

      return apiClient(withAuthorizationHeader(originalRequest, access_token))
    } catch (refreshError) {
      processRefreshQueue(refreshError)
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN)
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// ---------------------------------------------------------------------------
// Species API
// ---------------------------------------------------------------------------

export const speciesApi = {
  list: (params?: { page?: number; limit?: number; rarity_tier?: string; search?: string }) =>
    apiClient.get('/api/v1/species', { params }),

  get: (speciesId: string) =>
    apiClient.get(`/api/v1/species/${speciesId}`),
}

// ---------------------------------------------------------------------------
// Sightings API
// ---------------------------------------------------------------------------

export const sightingsApi = {
  list: (params?: { page?: number; limit?: number; species_id?: string }) =>
    apiClient.get('/api/v1/sightings', { params }),

  collectedSpecies: () =>
    apiClient.get<{ data: { species_ids: string[] } }>('/api/v1/sightings/collected-species'),

  get: (sightingId: string) =>
    apiClient.get(`/api/v1/sightings/${sightingId}`),

  create: (body: import('./storage/offlineQueue').QueuedSighting) =>
    apiClient.post('/api/v1/sightings', body),

  delete: (sightingId: string) =>
    apiClient.delete(`/api/v1/sightings/${sightingId}`),
}

// ---------------------------------------------------------------------------
// Users API
// ---------------------------------------------------------------------------

export const usersApi = {
  me: () =>
    apiClient.get('/api/v1/users/me'),

  update: (body: { nickname?: string; profile_image_key?: string; marketing_agreed?: boolean }) =>
    apiClient.patch('/api/v1/users/me', body),

  updateConsent: (gps_consent: boolean) =>
    apiClient.post('/api/v1/users/me/consent', { gps_consent }),

  withdraw: () =>
    apiClient.delete('/api/v1/users/me'),
}

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Gallery API
// ---------------------------------------------------------------------------

export const galleryApi = {
  list: (params?: { page?: number; limit?: number; province?: string; rarity_tier?: string; mine?: boolean }) =>
    apiClient.get('/api/v1/gallery', { params }),
  share: (body: { sighting_id: string; share_location: boolean }) =>
    apiClient.post('/api/v1/gallery', body),
  unshare: (postId: string) =>
    apiClient.delete(`/api/v1/gallery/${postId}`),
  heart: (postId: string) =>
    apiClient.post(`/api/v1/gallery/${postId}/heart`),
  unheart: (postId: string) =>
    apiClient.delete(`/api/v1/gallery/${postId}/heart`),
}

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: string })?.error ?? '알 수 없는 오류가 발생했습니다'
  }
  return '네트워크 오류가 발생했습니다'
}
