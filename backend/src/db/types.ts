export interface Species {
  species_id: string;           // 'KR-001'
  ioc_taxon_id: string;
  name_ko: string;
  name_sci: string;
  name_en: string;
  order_ko: string;
  family_ko: string;
  rarity_tier: 'common' | 'migrant' | 'rare' | 'legendary';
  sensitivity_tier: 1 | 2 | 3;
  points: number;
  aba_code: number;
  is_locked_free: boolean;
  cultural_heritage_no: string | null;
  iucn_status: string | null;
  size_cm: number | null;
  habitat_ko: string | null;
  seasonal_presence: Record<string, boolean>;  // {jan:bool,...,dec:bool}
  fun_fact_ko: string | null;
  created_at: Date;
}

export interface User {
  user_id: string;              // UUID
  cognito_sub: string;
  nickname: string;
  profile_image_key: string | null;
  oauth_provider: 'kakao' | 'apple' | 'google';
  oauth_sub: string;
  gps_consent: boolean;
  gps_consent_at: Date | null;
  terms_agreed_at: Date | null;
  privacy_agreed_at: Date | null;
  marketing_agreed_at: Date | null;
  ai_training_opt_in: boolean;
  ai_training_opt_in_at: Date | null;
  total_points: number;
  streak_days: number;
  last_sighting_at: Date | null;
  species_count: number;
  subscription_tier: 'free' | 'premium';
  subscription_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface AiFeedback {
  feedback_id: string;
  user_id: string;
  sighting_id: string;
  photo_s3_key: string;
  ai_species_id: string | null;
  ai_confidence: number | null;
  ai_top3: Array<{ species_id: string; confidence: number }> | null;
  user_selected_species_id: string;
  was_corrected: boolean;
  model_version: string | null;
  training_consent: boolean;
  created_at: Date;
}

export interface Sighting {
  sighting_id: string;          // UUID
  user_id: string;              // UUID → users.user_id
  species_id: string;           // → species.species_id
  location: { lat: number; lng: number } | null;  // geography → JS 표현
  location_accuracy_m: number | null;
  altitude_m: number | null;
  photo_s3_key: string;
  photo_cdn_url: string | null;
  thumbnail_s3_key: string | null;
  exif_stripped: boolean;
  ai_species_id: string | null;
  ai_confidence: number | null;  // 0.0000~1.0000
  ai_top3: Array<{ species_id: string; confidence: number }> | null;
  ai_model_version: string | null;
  ai_inference_ms: number | null;
  is_ai_confirmed: boolean;
  is_manually_verified: boolean;
  points_earned: number;
  is_first_for_user: boolean;
  observed_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// sightings API 응답: location은 obscure_coordinate 적용 후
export interface SightingResponse extends Omit<Sighting, 'deleted_at'> {
  location: { lat: number; lng: number } | null;  // 난독화된 좌표
}

// species API 응답: 잠긴 종은 상세정보 숨김
export interface SpeciesResponse {
  species_id: string;
  name_ko: string;
  name_sci: string;
  name_en: string;
  rarity_tier: Species['rarity_tier'];
  sensitivity_tier: Species['sensitivity_tier'];
  points: number;
  is_locked_free: boolean;
  // 잠긴 종은 아래 필드 null 반환
  habitat_ko: string | null;
  seasonal_presence: Species['seasonal_presence'] | null;
  fun_fact_ko: string | null;
}
