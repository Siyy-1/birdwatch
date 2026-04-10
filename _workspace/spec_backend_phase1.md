# Backend Phase 1 스펙 — Fastify TypeScript 스캐폴딩

## 목적
BirdWatch 백엔드 API 서버 기반 구조를 생성한다.
Node.js + Fastify v4 + TypeScript + PostgreSQL 15 (PostGIS 3.4)

## 출력 파일 (Codex 담당)

| 파일 | 내용 |
|------|------|
| `backend/package.json` | 의존성 + 스크립트 |
| `backend/tsconfig.json` | TypeScript 설정 |
| `backend/.env.example` | 환경변수 목록 |
| `backend/src/db/types.ts` | DB 테이블 TypeScript 인터페이스 |

---

## 파일 1: package.json

```json
{
  "name": "birdwatch-backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/postgres": "^5.3.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^4.0.0",
    "aws-jwt-verify": "^4.0.1",
    "pg": "^8.12.0",
    "zod": "^3.23.8",
    "pino": "^9.4.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "tsx": "^4.16.5",
    "@types/node": "^20.14.14",
    "@types/pg": "^8.11.6",
    "vitest": "^2.0.5",
    "@typescript-eslint/eslint-plugin": "^7.18.0",
    "@typescript-eslint/parser": "^7.18.0",
    "eslint": "^8.57.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## 파일 2: tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 파일 3: .env.example

```
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database (RDS PostgreSQL 15 + PostGIS)
DATABASE_URL=postgresql://birdwatch:password@localhost:5432/birdwatch

# AWS Cognito (JWT 검증)
COGNITO_USER_POOL_ID=ap-northeast-2_XXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=ap-northeast-2

# AWS S3 / CloudFront
S3_BUCKET=birdwatch-photos-prod
S3_REGION=ap-northeast-2
CLOUDFRONT_DOMAIN=cdn.birdwatch.kr

# AI Inference (TensorFlow Serving on ECS Fargate)
AI_INFERENCE_URL=http://localhost:8501/v1/models/birdwatch:predict
AI_MODEL_VERSION=v1.0.0
AI_CONFIDENCE_THRESHOLD=0.85

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## 파일 4: src/db/types.ts

DB 테이블에 정확히 대응하는 TypeScript 인터페이스.
카멜케이스 변환 없이 DB 컬럼명 그대로 사용 (snake_case).

### species 테이블 (20260404_000001)
```typescript
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
```

### users 테이블 (20260404_000007)
```typescript
export interface User {
  user_id: string;              // UUID
  cognito_sub: string;
  nickname: string;
  profile_image_key: string | null;
  oauth_provider: 'kakao' | 'apple' | 'google';
  oauth_sub: string;
  gps_consent: boolean;
  gps_consent_at: Date | null;
  terms_agreed_at: Date;
  privacy_agreed_at: Date;
  marketing_agreed_at: Date | null;
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
```

### sightings 테이블 (20260404_000008)
geography 컬럼은 PostGIS → JSON 변환 시 {lat, lng} 객체로 표현.
```typescript
export interface Sighting {
  sighting_id: string;          // UUID
  user_id: string;              // UUID → users.user_id
  species_id: string;           // → species.species_id
  location: { lat: number; lng: number };  // geography → JS 표현
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
```

### 응답 DTO (API 반환용, 좌표 난독화 적용 후)
```typescript
// sightings API 응답: location은 obscure_coordinate 적용 후
export interface SightingResponse extends Omit<Sighting, 'deleted_at'> {
  location: { lat: number; lng: number };  // 난독화된 좌표
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
```

---

## 참조 파일
- `db/migrations/20260404_000001_create_species_table.sql` — species 스키마
- `db/migrations/20260404_000007_create_users_table.sql` — users 스키마
- `db/migrations/20260404_000008_create_sightings_table.sql` — sightings 스키마
- `db/functions/obscure_coordinate.sql` — 좌표 난독화 함수 (sensitivity_tier, is_owner)
