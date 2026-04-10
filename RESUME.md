# BirdWatch 재시작 가이드

## 현재 상태 (2026-04-10)

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
- [x] **Mobile 테스트 전체 작성 + 통과** (jest, 43개 테스트)
- [x] **지도 탭 Vworld 타일 전환 + 버그 수정 (2026-04-09)**

#### 2026-04-10 추가 완료 작업

- [x] **지도 탭 Google Maps 교체**
  - MapLibre → react-native-maps 1.14.0 (PROVIDER_GOOGLE)
  - Android API 키: `AIzaSyBv2HnIQh0CW0VVzwlMWJLqRn0301KHaAs`
  - iOS API 키: `AIzaSyDetDDXjGi7vMETsw3pGHsu60hy6IxVCEw`
  - 마커 표시, 내 위치 버튼, 하단 카드 팝업 구현
  - toolbarEnabled=false (경로찾기 버튼 제거)

- [x] **AWS 인프라 구축 (dev 환경)**
  - IAM Role: `birdwatch-github-actions` (OIDC, AdministratorAccess)
    - ARN: `arn:aws:iam::217770239239:role/birdwatch-github-actions`
    - Trust: `repo:Siyy-1/birdwatch:ref:refs/heads/main` + `environment:production`
  - Terraform S3 backend: `birdwatch-terraform-state` + DynamoDB `birdwatch-terraform-lock`
  - Terraform apply 완료 (dev):
    - VPC / 서브넷 / 보안그룹
    - RDS: `birdwatch-dev.crmmyguco7l9.ap-northeast-2.rds.amazonaws.com:5432` (PostgreSQL 16.6)
    - S3: `birdwatch-photos-dev`
    - CloudFront: `d1qfcnvsv0dgn3.cloudfront.net`
    - Cognito User Pool: `ap-northeast-2_02B00gBTS`, Client ID: `3rn92feur0tejqandll7lcs1q4`
    - Cognito Domain: `birdwatch-dev.auth.ap-northeast-2.amazoncognito.com`
    - ECR: `birdwatch-backend-dev`, `birdwatch-tf-serving-dev`
    - ECS Cluster: `birdwatch-dev`, Service: `birdwatch-dev-backend` (running ✅)
    - ALB: `birdwatch-dev-alb-947231738.ap-northeast-2.elb.amazonaws.com`

- [x] **GitHub 설정**
  - 레포: `https://github.com/Siyy-1/birdwatch` (public)
  - `production` 환경: Required Reviewer = Siyy-1
  - GitHub CLI: `/c/Program Files/GitHub CLI/gh.exe`
  - Secrets: AWS_ROLE_ARN, AWS_DEPLOY_ROLE_ARN, AWS_TERRAFORM_ROLE_ARN, EXPO_TOKEN,
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_MAPS_API_KEY_ANDROID,
    GOOGLE_MAPS_API_KEY_IOS, TF_DB_PASSWORD, TF_KAKAO_CLIENT_ID, TF_KAKAO_CLIENT_SECRET
  - Variables: AWS_REGION=ap-northeast-2, ENVIRONMENT=dev,
    EAS_PROJECT_ID=1a4d75d7-cbee-4008-b37e-a9f45bb3ddef, EXPO_OWNER=siyyy

- [x] **SSM 파라미터 (Terraform 관리)**
  - `/birdwatch/dev/database_url` (SecureString)
  - `/birdwatch/dev/jwt_secret` (SecureString, random_password로 생성)
  - `/birdwatch/dev/model_path` = `/models/birdwatch_v1.0.0.tflite`

- [x] **Terraform 드리프트 해소**
  - ECS task definition에 환경변수 추가 (COGNITO_*, S3_BUCKET, CLOUDFRONT_DOMAIN 등)
  - ECS task execution role에 SSM read 정책 추가
  - tf-serving container를 `essential=false`로 변경 (AI sidecar 실패 시 백엔드 생존)
  - healthcheck: `wget` → `node fetch` (alpine 이미지 호환)
  - `ssm.tf` 신규: SSM 파라미터 Terraform으로 관리
  - `random` provider 추가 (jwt_secret 생성)
  - `infra/terraform/.terraform.lock.hcl` 커밋 포함

- [x] **CI/CD 안정화**
  - backend-ci.yml: `timeout-minutes: 10` + ECS 이벤트 덤프 on failure
  - mobile-ci.yml: EAS_PROJECT_ID/EXPO_OWNER 주입, EAS_SUBMIT_ENABLED 가드
  - terraform-ci.yml: TF version 1.14.8, secret 이름 통일
  - Backend CI/CD: ✅ 완전 통과 (lint+test+ECR+ECS)
  - Terraform CI/CD: ✅ 완전 통과 (apply 자동화)
  - Mobile CI/CD: ✅ lint+test 통과, EAS preview 빌드 자동화

- [x] **Mobile EAS 설정 완성**
  - `eas.json`: 모든 플레이스홀더를 실제 Cognito/CDN 값으로 교체
  - `mobile/app.config.js`: EAS_PROJECT_ID/EXPO_OWNER 동적 주입
  - `mobile/.eslintrc.json`: ESLint 설정 추가
  - `mobile/src/types/jest-globals.d.ts`: Jest 글로벌 타입 선언
  - EAS 프로젝트: `@siyyy/birdwatch` (ID: `1a4d75d7-cbee-4008-b37e-a9f45bb3ddef`)

- [x] **ECR tf-serving에 nginx:alpine placeholder 이미지 푸시**
  - tf-serving이 essential=false이므로 백엔드는 정상 동작

---

## 재시작 절차

### Step 1: 백엔드 스택 기동 (로컬 개발)
```bash
cd /c/workspace/Project_2
docker compose up -d
docker compose ps
```

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

## AWS 도구 경로 (Windows)
```bash
AWS="/c/Program Files/Amazon/AWSCLIV2/aws"
TF="/c/Users/SY/AppData/Local/Microsoft/WinGet/Packages/Hashicorp.Terraform_Microsoft.Winget.Source_8wekyb3d8bbwe/terraform.exe"
GH="/c/Program Files/GitHub CLI/gh.exe"

# Git Bash에서 AWS CLI 경로 파싱 오류 방지
export MSYS_NO_PATHCONV=1
```

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

## 남은 개발 작업

| 우선순위 | 작업 | 비고 |
|---------|------|------|
| **P0** | RDS PostGIS 설치 + DB 마이그레이션 실행 | AWS RDS에 직접 접속하여 실행 필요. Bastion 또는 SSM Session Manager 경유 |
| **P0** | api.birdwatch.kr 도메인 + ACM + HTTPS | ALB에 HTTPS 리스너 추가, Terraform `acm_certificate_arn` 적용 |
| **P0** | 카메라 E2E 플로우 기기 테스트 | 촬영 → 업로드 → AI 결과 → 저장 (로컬 환경) |
| **P1** | tf-serving 실제 AI 이미지 ECR 푸시 | `docker build -f ai/Dockerfile.serving` 후 `birdwatch-tf-serving-dev`에 push |
| **P1** | 지도 마커 렌더링 기기 확인 | Google Maps 전환 후 sightings 마커 실제 표시 여부 확인 필요 |
| **P1** | 오프라인 큐 동작 확인 | offlineQueue.ts + SQLite, 네트워크 끊김 시나리오 테스트 |
| **P2** | AI 모델 실제 추론 | tf-serving float16 타입 불일치 수정 필요 |
| **P2** | 구독 화면 플로우 | subscription.tsx → 결제 미연동 상태 확인 |
| **P2** | EAS Submit 설정 | App Store/Play Store 계정 준비 후 `EAS_SUBMIT_ENABLED=true` Variable 추가 |
| **P2** | `ANDROID_SDK_HOME` 환경변수 영구 제거 | 시스템 환경변수에서 삭제하면 빌드 시 `unset` 불필요 |
| **P3** | Mobile lint 경고 정리 | camera.tsx useEffect deps, onboarding.tsx unused vars 등 18개 warning |
| **P3** | Backend lint 경고 정리 | PresignResponse, TfServingResponse unused 등 7개 warning |

### P0: RDS PostGIS + 마이그레이션 실행 방법
```bash
# SSM Session Manager로 RDS 접속 (Bastion 없는 경우)
# 1. ECS 태스크에서 psql 실행
AWS="/c/Program Files/Amazon/AWSCLIV2/aws"
TASK_ARN=$("$AWS" ecs list-tasks --cluster birdwatch-dev --service-name birdwatch-dev-backend \
  --query 'taskArns[0]' --output text --region ap-northeast-2)

"$AWS" ecs execute-command \
  --cluster birdwatch-dev \
  --task "$TASK_ARN" \
  --container backend \
  --interactive \
  --command "psql \$DATABASE_URL -c 'CREATE EXTENSION IF NOT EXISTS postgis;'" \
  --region ap-northeast-2
```

### P0: api.birdwatch.kr HTTPS 설정
1. AWS ACM에서 `api.birdwatch.kr` 인증서 발급 (ap-northeast-2)
2. `infra/terraform/variables.tf`의 `acm_certificate_arn` 업데이트
3. `terraform apply` → ALB HTTPS 리스너 자동 생성
4. Route 53 또는 DNS에서 `api.birdwatch.kr` → ALB DNS 연결

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
| 28 | react-native-maps 1.27.2 + RN 0.74 호환 불가 | 1.14.0으로 다운그레이드 |
| 29 | compileSdk 35 → expo-modules-core Kotlin 오류 | compileSdk 34, androidx.core:core-ktx:1.13.1 강제 |
| 30 | Google Maps 빈 화면 (INVALID_ARGUMENT) | Maps SDK for Android 활성화 + API 키 제한 해제 |
| 31 | Terraform RDS engine_version 16.3 미지원 | 16.6으로 변경 |
| 32 | Terraform Cognito schema 수정 불가 | `lifecycle { ignore_changes = [schema] }` 추가 |
| 33 | RDS `shared_preload_libraries = postgis-3` 오류 | `pg_stat_statements`로 변경 (PostGIS는 CREATE EXTENSION으로 설치) |
| 34 | ECS task execution role SSM 권한 없음 | IAM inline policy 추가 (`ssm:GetParameters`) |
| 35 | ECS backend 환경변수 누락 (COGNITO_*, S3_BUCKET 등) | Task definition 수동 → Terraform으로 관리 전환 |
| 36 | ECR birdwatch-tf-serving-dev 이미지 없음 | nginx:alpine placeholder 이미지 push |
| 37 | mobile package-lock.json 미동기화 | `npm install` 후 재커밋 |
| 38 | OIDC sub claim 불일치 (environment:production) | trust-policy에 `environment:production` 조건 추가 |

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
| 지도 화면 (Google Maps) | `/c/workspace/Project_2/mobile/app/(tabs)/index.tsx` |
| AI 모델 | `/c/workspace/Project_2/ai/models/birdwatch_v1.0.0.tflite` |
| DB 마이그레이션 | `/c/workspace/Project_2/db/migrations/` |
| Terraform 인프라 | `/c/workspace/Project_2/infra/terraform/` |
| Terraform SSM 파라미터 | `/c/workspace/Project_2/infra/terraform/ssm.tf` |
| GitHub Actions | `/c/workspace/Project_2/.github/workflows/` |
| GitHub Secrets 가이드 | `/c/workspace/Project_2/.github/SECRETS.md` |
| Backend 테스트 헬퍼 | `/c/workspace/Project_2/backend/src/__tests__/helpers.ts` |
| Mobile EAS 설정 | `/c/workspace/Project_2/mobile/eas.json` |
| Mobile app.config | `/c/workspace/Project_2/mobile/app.config.js` |
| Metro 설정 | `/c/workspace/Project_2/mobile/metro.config.js` |
