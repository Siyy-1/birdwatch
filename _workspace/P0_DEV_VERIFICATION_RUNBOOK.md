# P0 Dev Verification Runbook

기준 문서:

- `RESUME.md`

현재 P0 잔여 확인 항목:

1. DB migration 실환경 적용 확인
2. 서버 측 EXIF 2차 제거 실환경 확인

이 문서는 현재 저장소 기준 기본 비프로덕션 환경인 `dev`에서 위 두 항목을 닫기 위한 실행 순서를 정리한다.

## 1. 진행 순서

반드시 아래 순서로 진행한다.

1. GitHub Actions `DB Migration` workflow를 `dev` 대상으로 조회 모드 실행
2. 결과가 정상이면 필요 시 baseline/apply 실행
3. backend가 dev 환경에 배포돼 있는지 확인
4. 모바일 또는 API 클라이언트로 `업로드 → AI identify → 저장` 1회 수행
5. DB/로그/S3 상태를 보고 P0 완료 여부 판단

## 2. DB Migration workflow 실행

대상 workflow:

- `.github/workflows/db-migrate.yml`

### 2-1. 1차 실행: 조회만

GitHub Actions 수동 실행 입력값:

```text
target_environment = dev
apply_pending = false
baseline_through = (비움)
confirm_production = (비움)
```

기대 결과:

- `Pre-flight doctor` 성공
- `Pre-flight status` 성공
- `Post-flight status` 성공
- `Post-flight doctor` 성공

확인 포인트:

- `/birdwatch/dev/database_url` SSM 값이 실제로 존재하는지
- GitHub OIDC role이 `ssm:GetParameter`, `kms:Decrypt` 가능한지
- dev DB 접근이 가능한지

### 2-2. legacy dev DB일 경우

`doctor/status` 결과가 아래와 같으면 legacy DB로 본다.

- `gallery_posts`, `gallery_hearts` 있음
- `ai_feedback` 없음
- `terms_agreed_at`, `privacy_agreed_at`, `sightings.location` = `NOT NULL`
- `tracked_migrations = 0`

그 경우 2차 실행 입력값:

```text
target_environment = dev
apply_pending = true
baseline_through = 20260408_000011_create_gallery_tables.sql
confirm_production = (비움)
```

기대 결과:

- baseline 성공
- pending migration 적용 성공
- 최종 `Pending 0`, `Changed 0`

### 2-3. 이미 tracking이 있는 dev DB일 경우

입력값:

```text
target_environment = dev
apply_pending = true
baseline_through = (비움)
confirm_production = (비움)
```

## 3. DB 결과 확인 기준

최종 `doctor`에서 아래 상태가 보여야 한다.

- `users.terms_agreed_at` = `YES`
- `users.privacy_agreed_at` = `YES`
- `sightings.location` = `YES`
- `users.ai_training_opt_in` 존재
- `users.ai_training_opt_in_at` 존재
- `ai_feedback` 존재

최종 `status`에서 아래 상태가 보여야 한다.

- `Pending: 0`
- `Changed: 0`

## 4. EXIF 2차 제거 dev 검증

전제:

- dev backend가 현재 커밋 기준으로 배포돼 있어야 한다.
- 모바일 앱 또는 API 호출로 실제 업로드/identify/save를 수행할 수 있어야 한다.

현재 구현 기준 핵심 동작:

1. 모바일이 업로드 전 JPEG sanitize
2. 서버가 `POST /api/v1/ai/identify` 직전에 업로드 객체를 다시 sanitize
3. 서버가 sanitize 완료 흔적을 남김
4. `POST /api/v1/sightings`는 그 흔적이 없으면 저장 거부

## 5. 실제 검증 순서

### 5-1. 업로드

사진 1장을 선택하거나 촬영 후 업로드한다.

기대:

- `/api/v1/upload/presign` 성공
- 업로드 성공

### 5-2. AI identify

동일 사진으로 AI 식별을 수행한다.

기대:

- `/api/v1/ai/identify` 성공
- 200 응답
- 서버 로그에 이미지 로드/업로드 오류 없음

추가 확인:

- 이 시점이 서버-side sanitize가 실제로 수행되는 시점이다.

### 5-3. 저장

AI 리뷰 후 최종 저장을 수행한다.

기대:

- `/api/v1/sightings` 성공
- `SERVER_SANITIZATION_REQUIRED`가 나오지 않아야 함

실패 시 해석:

- `SERVER_SANITIZATION_REQUIRED`
  - identify 단계에서 sanitize 흔적이 남지 않았거나
  - 저장 API가 다른 키를 보고 있거나
  - dev/prod 경로별 저장 흔적 확인 로직이 맞지 않음

## 6. 로그/상태 확인 포인트

### backend 로그에서 보면 좋은 것

- `이미지 로드 실패`
- S3 `PutObject`/`HeadObject` 관련 오류
- `SERVER_SANITIZATION_REQUIRED`
- `INVALID_IMAGE`

### DB 확인 포인트

가능하면 아래를 확인한다.

- 저장된 `sightings.exif_stripped = true`
- AI 리뷰 저장을 했다면 `ai_feedback` row 생성

## 7. 판정 기준

P0를 `dev` 기준으로 통과로 볼 수 있는 조건:

- `DB Migration` workflow dev 실행 성공
- `doctor/status` 결과 정상
- `업로드 → AI identify → 저장` 실경로 1회 성공
- 저장 시 sanitize guard가 정상 통과

아직 미완료로 보는 조건:

- workflow가 SSM/권한 문제로 실패
- identify는 되지만 저장에서 `SERVER_SANITIZATION_REQUIRED`
- 이미지 객체 rewrite 실패
- DB migration이 `Pending > 0` 또는 `Changed > 0`

## 8. 실행 기록 템플릿

```text
실행 환경: dev
실행 일시:
실행자:

DB Migration workflow 1차 결과:
DB Migration workflow 2차 결과:

doctor 결과:
status 결과:

업로드 결과:
AI identify 결과:
저장 결과:

에러 로그:

판정:
후속 조치:
```
