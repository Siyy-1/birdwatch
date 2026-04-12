/** API 응답 타입 — backend/src/db/types.ts와 대응 */

export type RarityTier = 'common' | 'migrant' | 'rare' | 'legendary'
export type OAuthProvider = 'kakao' | 'apple' | 'google'
export type SubscriptionTier = 'free' | 'premium'

export interface Species {
  species_id: string
  name_ko: string
  name_sci: string | null
  name_en: string | null
  rarity_tier: RarityTier
  sensitivity_tier: 1 | 2 | 3
  points: number
  is_locked_free: boolean
  cultural_heritage_no: string | null
  iucn_status: string | null
  size_cm: number | null
  habitat_ko: string | null
  seasonal_presence: Record<string, boolean> | null  // {jan:bool,...,dec:bool}
  fun_fact_ko: string | null
}

export interface User {
  user_id: string
  nickname: string
  profile_image_key: string | null
  oauth_provider: OAuthProvider
  gps_consent: boolean
  gps_consent_at: string | null
  terms_agreed_at: string | null
  privacy_agreed_at: string | null
  marketing_agreed_at: string | null
  ai_training_opt_in: boolean
  ai_training_opt_in_at: string | null
  total_points: number
  streak_days: number
  last_sighting_at: string | null
  species_count: number
  subscription_tier: SubscriptionTier
  subscription_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface AiTop3Item {
  species_id: string
  confidence: number
}

export interface Sighting {
  sighting_id: string
  user_id: string
  species_id: string
  name_ko: string
  lat: number | null
  lng: number | null
  location_accuracy_m: number | null
  altitude_m: number | null
  photo_cdn_url: string | null
  thumbnail_s3_key: string | null
  ai_species_id: string | null
  ai_confidence: number | null
  ai_top3: AiTop3Item[] | null
  ai_model_version: string | null
  is_ai_confirmed: boolean
  is_manually_verified: boolean
  points_earned: number
  is_first_for_user: boolean
  observed_at: string
  created_at: string
}

export interface CreateSightingRequest {
  species_id: string
  lat?: number | null
  lng?: number | null
  location_accuracy_m?: number
  altitude_m?: number
  photo_s3_key: string
  thumbnail_s3_key?: string
  exif_stripped: boolean
  ai_species_id?: string
  ai_confidence?: number
  ai_top3?: AiTop3Item[]
  ai_model_version?: string
  ai_inference_ms?: number
  ai_training_consent?: boolean
  observed_at: string
}

export interface CreateSightingResponse {
  sighting_id: string
  points_earned: number
  is_first_for_user: boolean
  is_ai_confirmed: boolean
  created_at: string
}

/** 페이지네이션 래퍼 */
export interface Paginated<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

/** 단일 항목 래퍼 */
export interface ApiResponse<T> {
  data: T
}

/** AI 식별 결과 (TF Serving 응답 → 백엔드 가공) */
export interface AiIdentifyResult {
  species_id: string
  species: Species
  confidence: number
  top3: Array<{ species: Species; confidence: number }>
  model_version: string
  inference_ms: number
}

export interface CompleteOnboardingRequest {
  terms_agreed: true
  privacy_agreed: true
  marketing_agreed?: boolean
  gps_consent?: boolean
  ai_training_opt_in?: boolean
}
