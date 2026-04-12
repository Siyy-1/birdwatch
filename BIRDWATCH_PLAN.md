# BirdWatch Development Plan

최종 업데이트: 2026-04-12

이 문서는 BirdWatch의 실행용 체크리스트다.

- 제품 정의: [BirdWatch_PRD.md](/C:/workspace/Project_2/BirdWatch_PRD.md)
- 세션 재개 메모: [RESUME.md](/C:/workspace/Project_2/RESUME.md)

## 문서 역할

- `BirdWatch_PRD.md`: 제품 방향, 요구사항, 범위 정의
- `BIRDWATCH_PLAN.md`: 현재 개발 순서와 완료/미완료 상태
- `RESUME.md`: 최근 작업, 다음 작업, 참고 규칙만 정리한 핸드오프 메모

## 잠금 결정사항

- 지도 스택은 `Google Maps`
- SNS 범위는 `hearts-only`
- 갤러리 탭은 단순 목록이 아니라 `birding feed`
- 마이페이지는 `profile-first`
- GPS 비동의/실패 시에도 `photo capture / AI identify / sighting save`는 가능하고 좌표만 비움
- 동의 기록은 `회원 생성 시점`이 아니라 `온보딩 완료 시점`
- 사진 개인정보 보호는 `모바일 업로드 전 1차 EXIF 제거 + 서버 2차 sanitize`
- 오프라인 큐는 `자동 flush`가 아니라 `연결 복구 후 사용자 확인 1회 뒤 진행`
- AI 결과는 저장 전 `review/correction` 가능
- AI 학습 동의 기본값은 `OFF`

## 현재 상태 요약

- `[x]` P0 핵심 검증 완료
- `[x]` dev 기준 `upload -> identify -> save` 실검증 완료
- `[x]` dev DB migration 실환경 확인 완료
- `[x]` 서버 EXIF 2차 제거 배포 환경 검증 완료
- `[x]` tf-serving cold-start timeout 완화 완료
- `[ ]` P1 제품 표면 작업 시작 전

## AI 모델 현재 상태

- 현재 배포 모델은 `ai/models/birdwatch_v1.0.0.*`
- 현재 `label_map.json` 기준 클래스 수는 `141`
- 현재 `300종` 대비 누락 종 수는 `159`
- 현재 `training_history.json` 평가 성능:
  - `top-1 accuracy = 0.625`
  - `top-5 accuracy = 0.899`
- 상세 gap report: [AI_RETRAINING_GAP_REPORT.md](/C:/workspace/Project_2/ai/AI_RETRAINING_GAP_REPORT.md)
- PRD 목표와 차이:
  - 목표 종 수: `300`
  - 목표 정확도: `top-1 >= 0.80`, `top-3 >= 0.92`
- 결론:
  - 현재 모델은 `중간 단계 모델`로 봐야 한다.
  - `300종 커버리지`와 `정확도 목표`를 만족하는 재학습 트랙이 필요하다.

## P0 체크리스트

- `[x]` 카메라 실기기 E2E 확인
- `[x]` DB 마이그레이션 로컬 적용 경로 정리
- `[x]` DB migration runbook 작성
- `[x]` DB migration GitHub workflow 정리
- `[x]` private RDS 대응용 ECS one-off migration 경로 검증
- `[x]` dev RDS minor upgrade (`16.6 -> 16.11`)
- `[x]` 서버 EXIF 2차 제거 실제 구현
- `[x]` dev 배포 환경에서 server-side sanitize 확인
- `[x]` dev 배포 환경에서 `identify -> save` 확인
- `[x]` tf-serving CPU fallback 및 cold-start preload 적용

## P1 우선순위

### 1. Birding Feed

- `[ ]` 갤러리 탭을 `birding feed`로 재설계
- `[ ]` 카드 정보: `사진 + 종 정보 + 지역 + 시간 + 좋아요`
- `[ ]` `public post detail` 화면 연결
- `[ ]` 민감종 비노출 / 위치 노출 규칙 점검

### 2. Profile-First My Page

- `[ ]` 프로필 헤더 재구성
- `[ ]` 게시물 그리드 구현
- `[ ]` 도감 / 기록 진입 구조 정리
- `[ ]` public profile 화면 정리

### 3. Offline Queue Hardening

- `[ ]` retry 정책 정리
- `[ ]` queued review 복구 UX 정리
- `[ ]` FIFO / original timestamp 보존 검증
- `[ ]` 실패 상태별 사용자 메시지 정리

### 4. AI Feedback Operations

- `[ ]` `ai_feedback` export 경로 정의
- `[ ]` 검수용 운영 포맷 정리
- `[ ]` 재학습 파이프라인 연결 포인트 정의
- `[ ]` opt-in / per-save override UX 재확인

### 5. Map Improvements

- `[ ]` 핀 클러스터링
- `[ ]` 희귀도별 핀 스타일
- `[ ]` sighting detail 연결
- `[ ]` current-location / consent / Seoul fallback UX 재점검

## 병렬 핵심 트랙: AI 모델 재학습

- `[ ]` 현재 학습 커버리지 기준 확정
  - `species_map_full.json` 소스 확정
  - 현재 `141` 클래스와 누락 종 목록 추출
- `[ ]` 데이터셋 갭 분석
  - 종별 이미지 수 분포 확인
  - 희귀종/계절종/오분류 상위 종 확인
  - train/val/test split 품질 점검
- `[ ]` 300종 학습 입력 정리
  - `300`종 species map 완성
  - 클래스별 최소 학습 장수 기준 재설정
  - 부족 종은 iNaturalist/GBIF/수동 큐레이션으로 보강
- `[ ]` 재학습 파이프라인 1차 실행
  - preprocessing
  - TFRecord 생성
  - `v1.1.0` 이상으로 재학습
- `[ ]` 평가 기준 문서화
  - 전체 `top-1/top-3`
  - rarity tier별 정확도
  - 혼동쌍(confusion pair) 리포트
  - reject/correction 로그와 대조
- `[ ]` 배포 게이트 정의
  - `300`종 전체 출시 가능 기준
  - 기준 미달 시 `고신뢰 subset` 출시 기준
  - rollback / fallback 기준
- `[ ]` 운영 피드백 루프 연결
  - `ai_feedback` export
  - 교정 데이터 클리닝
  - 다음 학습 배치 입력 포맷 확정

## P1.5 런치 준비

- `[ ]` PostHog 이벤트 계측 현황 점검
- `[ ]` Google Maps quota / key 운영 가드 점검
- `[ ]` PIPA / 민감종 좌표 난독화 E2E 재검토
- `[ ]` 앱스토어 제출 전 성능 / 배터리 / 오류 상태 점검

## 참고 파일

- 모바일 카메라/리뷰: [camera.tsx](/C:/workspace/Project_2/mobile/app/(tabs)/camera.tsx), [AIResultReviewSheet.tsx](/C:/workspace/Project_2/mobile/src/components/AIResultReviewSheet.tsx)
- 모바일 오프라인/미디어: [offlineQueue.ts](/C:/workspace/Project_2/mobile/src/services/storage/offlineQueue.ts), [imageSanitizer.ts](/C:/workspace/Project_2/mobile/src/services/media/imageSanitizer.ts), [photoPipeline.ts](/C:/workspace/Project_2/mobile/src/services/media/photoPipeline.ts)
- 프로필: [profile.tsx](/C:/workspace/Project_2/mobile/app/(tabs)/profile.tsx)
- 백엔드 업로드/AI/저장: [upload.ts](/C:/workspace/Project_2/backend/src/routes/v1/upload.ts), [ai.ts](/C:/workspace/Project_2/backend/src/routes/v1/ai.ts), [sightings.ts](/C:/workspace/Project_2/backend/src/routes/v1/sightings.ts)
- DB 운영: [PROD_MIGRATION_CHECKLIST.md](/C:/workspace/Project_2/db/PROD_MIGRATION_CHECKLIST.md)
