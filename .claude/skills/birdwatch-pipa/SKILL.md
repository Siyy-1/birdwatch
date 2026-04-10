---
name: birdwatch-pipa
description: "BirdWatch PIPA(개인정보보호법) 준수 감사 스킬. GPS 동의 플로우, EXIF 제거, 민감종 좌표 난독화, 데이터 보존 정책, 서울 리전 격리를 코드베이스 전반에서 점검한다. PIPA 감사, 개인정보 보호 검토, 법적 컴플라이언스 확인이 필요할 때 반드시 이 스킬을 사용할 것. '/birdwatch-pipa', 'PIPA 점검', '개인정보 감사', '컴플라이언스 확인'으로 시작하는 요청에 사용한다."
---

# BirdWatch PIPA — 개인정보보호법 준수 감사

BirdWatch 코드베이스의 한국 개인정보보호법(PIPA) 준수 여부를 점검하는 스킬.

## PIPA 주요 의무 요약 (BirdWatch 관련)

| 의무 | 조항 | BirdWatch 구현 |
|------|------|--------------|
| 목적 명시 동의 | 제15조 | GPS 동의 화면 (FR-005) |
| 최소 수집 | 제16조 | EXIF 제거, 필요 최소 스코프 |
| 안전한 관리 | 제29조 | AES-256, TLS 1.2+, Keychain |
| 국내 보관 | 제39조의12 | ap-northeast-2 전용 |
| 파기 | 제21조 | 탈퇴 후 30일 하드 삭제 |
| 권리 보장 | 제35~38조 | 열람/정정/삭제 API |

## 감사 체크리스트

### 1. GPS 동의 플로우 (FR-005)

```
확인 포인트:
□ OS 위치 권한 요청 전 PIPA 동의 화면 선행 표시
□ 동의 내용 4가지 모두 포함:
  - 수집 목적 ("탐조 위치 기록 및 지도 표시")
  - 보존 기간 ("탈퇴 시까지, 탈퇴 후 30일 이내 파기")
  - 제3자 제공 ("없음, 민감종 좌표 자동 난독화")
  - 사용자 권리 ("동의 철회, 열람, 정정, 삭제 요청 가능")
□ 동의 기록 DB 저장: gps_consent, gps_consent_at, gps_consent_version
□ 거부 시 GPS 없는 제한 모드 동작 (앱 종료 아님)
□ 동의 없으면 좌표 저장 API 호출 시 403 반환
```

### 2. EXIF 제거

```
확인 포인트:
□ 클라이언트: 업로드 전 EXIF 스트립 (sharp/react-native-image-manipulator)
□ Lambda@Edge: S3 ObjectCreated 후 2차 제거
□ 원본 보관 없음 (덮어쓰기)
□ DB에 EXIF 데이터 저장 없음 (기기 모델, GPS 태그 등)
□ 로그에 EXIF 데이터 포함 없음
```

### 3. 좌표 데이터 처리

```
확인 포인트:
□ 좌표 ap-northeast-2 DB에만 저장
□ CloudFront 캐시에 좌표 포함 없음 (개인 데이터 캐싱 금지)
□ 로그 (CloudWatch, PostHog)에 좌표 평문 없음
□ API 응답 난독화 함수 모든 좌표 반환 엔드포인트에 적용
□ 삭제된 사이팅 좌표 30일 배치 하드 삭제 실행
□ Cross-Region Replication OFF 확인
```

### 4. 분석 (PostHog)

```
확인 포인트:
□ user_id: 실제 UUID가 아닌 pseudonymous hash
□ 이벤트 데이터에 GPS 좌표 없음
□ 이벤트 데이터에 사진 URL 없음
□ 데이터 보존 12개월 → 자동 삭제 설정
□ PostHog 서버: ap-northeast-2 (해외 이전 없음)
```

### 5. 사용자 권리 처리

```
확인 포인트:
□ 데이터 열람 API: 사용자 자신의 사이팅/사진 다운로드
□ 삭제 요청 API: 30일 이내 하드 삭제 보장
□ 동의 철회 API: 이후 GPS 수집 즉시 중단
□ 앱 내 개인정보 처리방침 접근 가능 (항상 노출)
□ 처리방침에 모든 수집 항목 명시
```

## 감사 보고서 형식

```markdown
# PIPA 감사 보고서
감사 일시: YYYY-MM-DD
감사 범위: {파일/모듈 목록}

## 결과 요약
- ✅ 준수: N건
- ⚠️ 개선 필요: N건
- ❌ 위반: N건

## 위반 사항

### [PIPA-001] GPS 좌표 CloudWatch 로그 노출
- 파일: src/routes/sightings.ts:89
- 내용: `console.log({ userId, lat, lng })` — 좌표 평문 로깅
- 위반 조항: PIPA 제29조 (안전 조치)
- 심각도: ❌ 위반
- 수정: 로그에서 lat/lng 필드 제거

## 개선 필요 사항

### [PIPA-002] 동의 버전 업데이트 미반영
- 상황: 개인정보 처리방침 v1.2 배포됐으나 앱 동의 화면 버전 v1.1
- 심각도: ⚠️ 개선 필요
- 수정: 동의 화면 version 파라미터 업데이트

## 준수 확인 항목
- [x] GPS 동의 화면 선행 표시
- [x] EXIF 이중 제거 (클라이언트 + Lambda@Edge)
...
```

## 자동 탐지 패턴

코드에서 PIPA 위반 가능성 패턴 탐지:

```
# GPS 좌표 로그 노출 패턴
grep -r "lat\|lng\|latitude\|longitude" src/ --include="*.ts" | grep -i "log\|console\|logger"

# pseudonymous hash 없이 userId를 직접 이벤트에 포함
grep -r "posthog\|analytics" src/ | grep "userId\|user_id"

# Cross-Region Replication 설정 확인
grep -r "ReplicationConfiguration" infra/
```
