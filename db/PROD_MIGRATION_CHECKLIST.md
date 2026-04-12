# BirdWatch 운영 DB 마이그레이션 체크리스트

대상 변경:

- `20260411_000011_allow_pending_onboarding_and_locationless_sightings.sql`
- `20260411_000012_add_ai_feedback_and_training_opt_in.sql`

목표:

- 온보딩 전 약관 미동의 상태 허용
- GPS 비동의 사용자의 위치 없는 sighting 저장 허용
- AI training opt-in / `ai_feedback` 스키마 반영

이 문서는 `RESUME.md` 기준 최신 결정사항을 운영 DB에 반영할 때 사용하는 runbook이다.

## 0. Go / No-Go 기준

진행 가능:

- 백엔드 코드가 이미 현재 스키마를 전제로 배포되어 있거나 같은 릴리즈 윈도우에 함께 배포된다.
- 운영 DB 접속 경로가 확보되어 있다.
- 최근 백업/스냅샷 시점을 확인했다.
- staging에서 동일 절차를 먼저 수행했다.

즉시 중단:

- staging 미검증
- 현재 운영 DB 상태를 모른 채 baseline 하려는 경우
- `status` 결과에 `changed` 항목이 있는 경우
- 백엔드가 구 스키마 전용 버전인데 DB만 먼저 올리려는 경우

## 1. 사전 준비

1. 대상 환경을 확정한다.
   - `staging`
   - `production`

2. 현재 배포된 백엔드 커밋을 기록한다.

3. 최근 DB 백업/스냅샷 존재 여부를 확인한다.
   - RDS 자동 백업 최신 시각
   - 필요 시 수동 스냅샷 생성

4. DB 접속 방법을 확정한다.
   - 앱 서버/배스천/SSM 세션 중 하나
   - `DATABASE_URL`을 안전하게 주입할 수 있는 쉘

5. 작업자 로그를 남긴다.
   - 시작 시각
   - 작업자
   - 대상 환경
   - 대상 마이그레이션 파일

## 2. 비프로덕션 선적용

운영 전에 반드시 비프로덕션 환경에서 먼저 실행한다.

현재 자동화 기준 기본 비프로덕션 환경은 `dev`다.
별도 `staging`이 실제로 프로비저닝되어 있다면 staging를 우선 사용한다.

dev 기준 사전 검증 상세 절차는 다음 문서를 본다.

- `_workspace/P0_DEV_VERIFICATION_RUNBOOK.md`

```powershell
cd backend
npm run db:migrate:doctor
npm run db:migrate:status
```

기대 결과:

- `gallery_posts`, `gallery_hearts`까지 이미 존재하거나 상태를 해석할 수 있어야 한다.
- `users.terms_agreed_at`, `users.privacy_agreed_at`, `sightings.location`의 nullable 여부가 현재 상태로 출력되어야 한다.
- `tracked_migrations`가 0이어도 이상은 아니다. 이 경우 legacy DB일 수 있다.

## 3. baseline 판단

`schema_migrations` 추적이 없는 기존 DB는 baseline이 필요할 수 있다.

현재 BirdWatch legacy dev DB에서 확인된 기준:

- `gallery_posts`, `gallery_hearts` 존재
- `ai_feedback` 없음
- `users.terms_agreed_at`, `privacy_agreed_at` = `NOT NULL`
- `sightings.location` = `NOT NULL`

이 상태라면 아래처럼 해석한다.

- `20260408_000011_create_gallery_tables.sql`까지는 이미 반영됨
- `20260411_000011`, `20260411_000012`만 pending

그 경우 baseline 기준 파일:

```text
20260408_000011_create_gallery_tables.sql
```

주의:

- baseline은 "이미 DB에 존재하는 변경"만 마킹한다.
- 확신이 없으면 baseline 하지 말고 DB 구조를 먼저 직접 확인한다.

## 4. staging 적용 절차

legacy DB이고 `20260408_000011`까지 반영된 상태라면:

```powershell
cd backend
npm run db:migrate:baseline -- --through 20260408_000011_create_gallery_tables.sql
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:doctor
```

이미 `schema_migrations`가 있고 pending만 남아 있다면:

```powershell
cd backend
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:doctor
```

비프로덕션 성공 기준:

- `status`: `Pending 0`, `Changed 0`
- `doctor`: 아래 상태 확인
  - `users.terms_agreed_at` = `YES`
  - `users.privacy_agreed_at` = `YES`
  - `sightings.location` = `YES`
  - `users.ai_training_opt_in` 존재
  - `users.ai_training_opt_in_at` 존재
  - `ai_feedback` 존재

## 5. 비프로덕션 기능 검증

적용 후 최소 스모크 테스트:

1. 온보딩 완료 API
   - `POST /api/v1/users/me/onboarding`
   - 기존 사용자/신규 사용자 모두 에러 없이 동작

2. 위치 없는 sighting 저장
   - GPS 비동의 사용자로 `POST /api/v1/sightings`
   - `lat/lng` 없이 저장 성공

3. AI 리뷰 저장
   - `POST /api/v1/sightings`에 AI review 데이터 포함
   - `ai_feedback` row 생성 확인

4. 기존 gallery/feed 조회
   - gallery 관련 API 회귀 없음

## 6. 운영 적용 절차

비프로덕션 검증이 끝나면 운영에서 같은 순서로 실행한다.

권장 순서:

1. 운영 백업/스냅샷 재확인
2. 운영 DB 현재 상태 확인
3. 필요 시 baseline
4. pending migration 적용
5. `status` / `doctor` 재확인
6. 백엔드 smoke test
7. 결과 기록

운영 명령 예시:

```powershell
cd backend
npm run db:migrate:doctor
npm run db:migrate:status
```

legacy 운영 DB라면:

```powershell
npm run db:migrate:baseline -- --through 20260408_000011_create_gallery_tables.sql
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:doctor
```

추적이 이미 있는 운영 DB라면:

```powershell
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:doctor
```

GitHub Actions로 실행할 경우:

- workflow: `.github/workflows/db-migrate.yml`
- 먼저 `target_environment=dev` 또는 실제 staging가 있으면 `staging`으로 검증
- `target_environment=prod`
- 필요 시 `baseline_through=20260408_000011_create_gallery_tables.sql`
- 실제 적용이면 `apply_pending=true`
- production 적용 시 `confirm_production=prod-apply`
- 실행 방식은 GitHub runner 직접 DB 접속이 아니라 ECS one-off task 방식이어야 한다

## 7. 운영 적용 후 확인

필수 확인:

- 에러 로그에 `column does not exist`, `relation does not exist` 없음
- `users/me` 조회 정상
- 온보딩 완료 API 정상
- 위치 없는 sighting 저장 정상
- AI 결과 저장 시 `ai_feedback` insert 정상

권장 확인:

- 최근 15분 API 5xx 증가 여부
- DB lock/slow query 이상 여부
- gallery API 회귀 여부

## 7.5. 트러블슈팅 메모

실제 dev ECS one-off task 검증에서 확인된 대표 실패 패턴:

- `no pg_hba.conf entry ... no encryption`
  - 원인: ECS/Fargate에서 RDS 접속 시 TLS 없이 접속
  - 조치: backend 앱과 migration 스크립트가 production/RDS 연결에서 `ssl`을 사용해야 한다

- `password authentication failed for user "birdwatch"`
  - 원인: SSM `DATABASE_URL`과 실제 RDS master password drift
  - 조치: SSM을 현재 소스 오브 트루스로 본다면 RDS master password를 해당 값으로 재동기화한 뒤 다시 실행

- `type geography does not exist`
  - 원인: PostGIS extension 미설치 상태에서 `geography` 타입 migration 실행
  - 조치: `20260404_000007a_enable_postgis.sql`이 먼저 적용돼야 한다

- `ENOENT: no such file or directory, scandir '/db/migrations'`
  - 원인: migration runner가 container runtime 경로와 맞지 않는 위치를 탐색
  - 조치: migration runner가 `src` 실행과 `dist` 실행 둘 다 지원하도록 경로 해석을 사용해야 한다

## 8. 롤백 판단

이번 변경은 DDL 중심이라 완전 자동 롤백보다 "장애 차단 후 수동 복구 판단"이 현실적이다.

즉시 롤백 검토:

- 백엔드가 신규 컬럼을 읽지 못해 운영 장애 발생
- 마이그레이션 직후 주요 API에서 연속 5xx 발생
- `status`에 예상치 못한 `changed` 또는 누락 발생

롤백 전 원칙:

- 먼저 애플리케이션 로그와 `doctor/status` 결과를 보존한다.
- 이미 신규 컬럼/테이블에 데이터가 쓰인 경우 DOWN 적용은 신중히 판단한다.
- 필요 시 앱 트래픽을 줄이거나 임시로 이전 앱 버전/maintenance 대응을 우선한다.

## 9. 작업 기록 템플릿

```text
환경:
작업자:
시작 시각:
종료 시각:
배포 커밋:

사전 doctor 결과:
사전 status 결과:

baseline 여부:
baseline 기준 파일:

적용 명령:

사후 doctor 결과:
사후 status 결과:

스모크 테스트 결과:

이상 여부:
후속 조치:
```

## 10. 현재 한계

현재 기준 운영 앱 배포 파이프라인은 DB migration을 자동으로 포함하지 않는다.

- ECS 배포는 앱 이미지만 갱신한다.
- Terraform apply는 인프라만 반영한다.
- DB migration은 별도 수동 workflow로 실행해야 한다.

다음 단계 후보:

- migration workflow를 main 브랜치에 반영
- production 환경에서 동일 ECS one-off task 경로 검증
- 운영용 `DATABASE_URL` / RDS master password drift 방지 절차 정리
