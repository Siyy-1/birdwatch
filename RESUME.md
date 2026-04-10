# BirdWatch 재시작 가이드

## 현재 상태 (2026-04-09)

### 완료된 작업
- [x] DB 마이그레이션 (000001~000010)
- [x] Backend Fastify API (routes: auth, species, sightings, upload, ai, users, gallery)
- [x] Mock Auth `/api/v1/auth/dev-login` 엔드포인트
- [x] TF Serving 컨테이너 + docker-compose 통합
- [x] Mobile 전체 화면 (camera, collection, profile, map, species/[id], login, onboarding, subscription)
- [x] Android 실기기 빌드 및 설치 완료 (R3CT10LJH4A)
- [x] Docker 스택 전체 구동 (postgres healthy, tf-serving healthy, backend healthy)
- [x] DB 마이그레이션 수동 실행 + PostGIS 설치 완료
- [x] dev-login API 정상 동작 확인
- [x] E2E 백엔드 플로우 검증 (presign → 로컬 업로드 → AI mock → sighting 저장)
- [x] Mobile 라우팅 버그 수정 (`(auth)` 그룹명, Stack.Screen 선언 제거)
- [x] MapLibre `null` bridge 에러 수정 (CircleLayer 표현식)
- [x] Map 화면 `res.data.data as Paginated` 이중 접근 버그 수정
- [x] Camera 업로드 방식 변경: `fetch+blob` → `FileSystem.uploadAsync`
- [x] **Terraform 인프라 전체 작성** (modules: vpc, rds, s3, cognito, ecs — 22개 파일)
  - VPC: 10.0.0.0/16, 3-AZ, NAT GW, SG 4종
  - RDS: PostgreSQL 16.3, Multi-AZ, 암호화
  - S3+CloudFront: OAC, Lambda@Edge EXIF 제거
  - Cognito: Kakao/Google/Apple OIDC, PKCE 앱 클라이언트
  - ECS Fargate: ECR×2, ALB, Auto Scaling, HTTPS 조건부
- [x] **GitHub Actions CI/CD 전체 작성** (3개 워크플로우)
  - `backend-ci.yml`: lint+tsc+vitest → ECR push → ECS redeploy (main)
  - `mobile-ci.yml`: lint+tsc → EAS preview (main) → EAS production (v*.*.* 태그)
  - `terraform-ci.yml`: fmt+validate → plan PR 코멘트 → apply (main+환경게이트)
- [x] **EAS 빌드 설정** (`eas.json`, `app.json` runtimeVersion/updates 추가)
- [x] **GitHub Secrets 설정 가이드** (`.github/SECRETS.md` — AWS OIDC CLI 커맨드 포함)
- [x] **Backend 테스트 전체 작성 + 통과** (vitest, 24개 테스트)
  - `vitest.config.ts`, `src/__tests__/helpers.ts` (pgResult, createTestJwt, mockUserRow)
  - `auth.test.ts` (5), `species.test.ts` (7), `ai.test.ts` (5), `gallery.test.ts` (7)
- [x] **Mobile 테스트 전체 작성 + 통과** (jest, 43개 테스트)
  - `babel.config.js` 추가 (babel-preset-expo, Flow 타입 변환)
  - `time.test.ts` (13), `badges.test.ts` (21), `authStore.test.ts` (9)
- [x] **지도 탭 Vworld 타일 전환 + 버그 수정 (2026-04-09)**
  - `ANDROID_SDK_HOME` / `ANDROID_USER_HOME` 충돌로 빌드 실패 → `unset ANDROID_SDK_HOME` 후 빌드
  - 백엔드 `localhost:3000` network error → `wslrelay.exe`가 IPv6 루프백 선점, 백엔드 컨테이너 재시작으로 해결
  - MapLibre `setAccessToken('')` → 기본 데모 스타일(`demotiles.maplibre.org`) 로드 → `setAccessToken(null)` 으로 수정
  - `styleJSON` prop → 네이티브가 인식하는 실제 prop명은 `mapStyle` 이었음 (조용히 무시되던 버그)
  - OSM 타일 → **Vworld 국토지리정보원 타일** 전환 (API 키: `.env`의 `EXPO_PUBLIC_VWORLD_API_KEY`)
  - 지도 줌 제한: `minZoomLevel=6.5` / `maxZoomLevel=18`
  - 지도 패닝 범위 제한: 한반도 bounding box (`sw:[124,33]` ~ `ne:[132.5,38.9]`)

### 중단된 이유
지도 탭 Vworld 전환 완료. 다음 세션에서 카메라 E2E 테스트 및 오프라인 큐 검증 진행 예정.

---

## 재시작 절차

### Step 1: 백엔드 스택 기동
```bash
cd /c/workspace/Project_2
docker compose up -d
# 헬스체크 확인 (약 60초 소요)
docker compose ps
```

> **주의**: postgres 볼륨이 살아있으면 DB 초기화 자동 스킵됨.
> 볼륨이 날아갔을 경우 → 아래 "DB 재초기화" 섹션 참고.

### Step 2: ADB 포트 포워딩 (기기 연결 후)
```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081
```

### Step 3: Metro 번들러 실행
```bash
cd /c/workspace/Project_2/mobile
npx expo start --port 8081
```

### Step 4: 앱 실행
기기에서 **BirdWatch 앱** (Expo Go 아님) 직접 실행.
로그인: `dev@test.com` (비밀번호 불필요, dev-login)

---

## DB 재초기화 (볼륨 삭제 후 필요한 경우)

```bash
# PostGIS 확장 설치
docker exec birdwatch-postgres psql -U birdwatch -d birdwatch -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# UP 섹션만 추출해서 마이그레이션 실행
for f in $(ls /c/workspace/Project_2/db/migrations/*.sql | sort); do
  echo -n "Running: $(basename $f) ... "
  sed -n '/^-- UP$/,/^-- DOWN$/{/^-- UP$/d;/^-- DOWN$/d;p}' "$f" | \
    docker exec -i birdwatch-postgres psql -U birdwatch -d birdwatch 2>&1 | tail -1
done

# UP/DOWN 마커 없는 파일 (000010) 별도 실행
docker exec -i birdwatch-postgres psql -U birdwatch -d birdwatch < \
  /c/workspace/Project_2/db/migrations/20260405_000010_create_ai_identification_logs.sql

# obscure_coordinate 함수 설치
docker exec -i birdwatch-postgres psql -U birdwatch -d birdwatch < \
  /c/workspace/Project_2/db/functions/obscure_coordinate.sql
```

---

## 해결된 주요 이슈 목록

| # | 문제 | 해결 |
|---|------|------|
| 1 | `db/functions` 중첩 마운트 불가 | `obscure_coordinate.sql` → migrations 복사, compose 마운트 제거 |
| 2 | tf-serving 헬스체크 HEAD→405 | `--spider` → `-O /dev/null` |
| 3 | Windows node_modules 이미지 오염 | `backend/.dockerignore` 추가 |
| 4 | Alpine tsx symlink shebang 실패 | CMD → `node /app/node_modules/tsx/dist/cli.mjs watch` |
| 5 | pino-pretty 미설치 | app.ts에서 transport 제거 |
| 6 | @fastify/postgres v6 Fastify 4.x 불호환 | `^5.0.0`으로 다운그레이드 |
| 7 | `pg.Pool is not a constructor` | app.ts의 잘못된 `pg: {}` 옵션 제거 |
| 8 | DB PostGIS 미설치 + 마이그레이션 미실행 | 수동 설치 + UP 섹션만 실행 |
| 9 | dev-login `oauth_sub`, `gps_consent_at` NOT NULL | INSERT에 컬럼 추가 |
| 10 | S3 presign AWS 자격증명 없음 | dev 모드: 로컬 업로드 엔드포인트 mock 추가 |
| 11 | TF Serving float16/float32 타입 불일치 | dev 모드: 참새/까치/박새 mock 응답 사용 |
| 12 | Mobile 라우트명 `"auth"` → `"(auth)"` | _layout.tsx 수정 + Stack.Screen 제거 |
| 13 | MapLibre `null` bridge 에러 | CircleLayer 표현식 `['>', confidence, 0]` 로 변경 |
| 14 | Map 화면 `res.data.data as Paginated` 이중 접근 | `res.data as Paginated` 로 수정 |
| 15 | Camera `fetch+blob` PUT 업로드 실패 | `FileSystem.uploadAsync` (BINARY_CONTENT) 로 교체 |
| 16 | `callTfServing` 함수명 불일치 | `callServingWrapper`로 수정 |
| 17 | `fastify.httpErrors` undefined (401→500) | `@fastify/sensible@5` 설치 + app.ts 등록 |
| 18 | vitest `PORT: '0'` Zod positive() 검증 실패 | `PORT: '3999'`로 변경 |
| 19 | vitest mock 순서 오류 (species COUNT) | COUNT 쿼리 먼저, 데이터 쿼리 나중으로 수정 |
| 20 | 인증 라우트 mock 누락 (gallery/ai POST) | HS256 auth DB 쿼리용 mock을 첫 번째로 추가 |
| 21 | Mobile Jest Flow 타입 변환 실패 | `babel.config.js` + `babel-preset-expo` 추가 |
| 22 | Cognito Apple Sign-In 리소스 없음 | `count = 4개 변수 모두 있을 때 1 : 0` 조건부 추가 |
| 23 | `ANDROID_SDK_HOME` / `ANDROID_USER_HOME` 충돌 → 빌드 실패 | `unset ANDROID_SDK_HOME` 후 빌드 (시스템 환경변수에서 제거 권장) |
| 24 | `wslrelay.exe`가 `[::1]:3000` 선점 → 백엔드 network error | 백엔드 컨테이너 재시작으로 Docker 포워딩 복구 |
| 25 | MapLibre `setAccessToken('')` → 기본 데모 스타일 로드 | `setAccessToken(null)` 으로 변경 |
| 26 | MapView `styleJSON` prop → 네이티브에서 무시됨 | 올바른 prop명 `mapStyle` 로 변경 |
| 27 | 지도 범위 밖으로 패닝 시 검은 화면 | Camera `maxBounds` 한반도 bounding box 설정 |

---

## 남은 개발 작업

| 우선순위 | 작업 | 비고 |
|---------|------|------|
| **P0** | 카메라 E2E 플로우 기기 테스트 | 촬영 → 업로드 → AI 결과 → 저장 |
| **P0** | GitHub Secrets 등록 | `.github/SECRETS.md` 가이드 참고, AWS OIDC 설정 포함 |
| P1 | Terraform 실제 배포 | `infra/terraform/` → S3 백엔드 활성화 후 `terraform apply` |
| P1 | 지도 마커 렌더링 기기 확인 | Vworld 전환 후 sightings 마커 실제 표시 여부 확인 필요 |
| P1 | 오프라인 큐 동작 확인 | offlineQueue.ts + SQLite, 네트워크 끊김 시나리오 테스트 |
| P2 | AI 모델 실제 추론 | tf-serving float16 타입 불일치 수정 필요 |
| P2 | 구독 화면 플로우 | subscription.tsx → 결제 미연동 상태 확인 |
| P2 | `ANDROID_SDK_HOME` 환경변수 영구 제거 | 시스템 환경변수에서 삭제하면 빌드 시 `unset` 불필요 |

---

## 테스트 실행 방법

```bash
# Backend (vitest) — 24개 테스트
cd /c/workspace/Project_2/backend
npx vitest run --reporter=verbose

# Mobile (jest) — 43개 테스트
cd /c/workspace/Project_2/mobile
npx jest --testPathPattern="src/(utils|constants|store)/__tests__" --no-coverage
```

---

## 핵심 파일 위치

| 항목 | 경로 |
|------|------|
| Docker 구성 | `/c/workspace/Project_2/docker-compose.yml` |
| Backend 진입점 | `/c/workspace/Project_2/backend/src/server.ts` |
| Dev Login 엔드포인트 | `/c/workspace/Project_2/backend/src/routes/v1/auth.ts` |
| 로컬 업로드 mock | `/c/workspace/Project_2/backend/src/routes/v1/upload.ts` |
| AI mock (dev) | `/c/workspace/Project_2/backend/src/routes/v1/ai.ts` |
| API 클라이언트 | `/c/workspace/Project_2/mobile/src/services/api.ts` |
| 카메라 화면 | `/c/workspace/Project_2/mobile/app/(tabs)/camera.tsx` |
| 지도 화면 | `/c/workspace/Project_2/mobile/app/(tabs)/index.tsx` |
| AI 모델 | `/c/workspace/Project_2/ai/models/birdwatch_v1.0.0.tflite` |
| DB 마이그레이션 | `/c/workspace/Project_2/db/migrations/` |
| Terraform 인프라 | `/c/workspace/Project_2/infra/terraform/` |
| GitHub Actions | `/c/workspace/Project_2/.github/workflows/` |
| GitHub Secrets 가이드 | `/c/workspace/Project_2/.github/SECRETS.md` |
| Backend 테스트 헬퍼 | `/c/workspace/Project_2/backend/src/__tests__/helpers.ts` |
| Metro 설정 | `/c/workspace/Project_2/mobile/metro.config.js` |
