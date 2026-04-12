# BirdWatch 작업 재개 요약

최종 업데이트: 2026-04-11  
이 문서만 보면 현재 상태와 다음 작업 우선순위를 파악할 수 있다.  
`BIRDWATCH_QA_2026-04-11.md`는 보관용으로만 두고, 이후 작업 기준 문서는 `RESUME.md` 하나로 본다.

## 기준 문서 우선순위

`사용자 지시 > BirdWatch_PRD.md > RESUME.md > .claude/agents/*`

## 현재 제품 방향

- 제품 정의: `AI 조류 식별 + 수집형 도감 + 가벼운 탐조 SNS`
- 지도 스택: `Google Maps` 확정
- SNS 범위: `좋아요`만 우선 도입
- 제외 범위: `댓글`, `캡션`, `팔로우`, `DM`, `스토리`
- 갤러리 탭: 단순 목록이 아니라 `birding feed`
- 마이페이지: `프로필 헤더 + 게시물 그리드 + 도감/기록`

## 이미 반영된 핵심 구현

- GPS 비동의/실패 시에도 촬영 및 sighting 저장 가능
- 온보딩 동의 시점 수정
  - 회원 생성 시 자동 동의 제거
  - 온보딩 완료 시점에만 약관/개인정보 동의 기록
- KST 기준으로 스트릭 / AI 일일 제한 계산
- 지도 탭에서 PIPA 동의 없이 바로 OS 위치 권한 요청하지 않도록 수정
- EXIF 2중 제거 방향 반영 시작
  - 모바일 업로드 전 1차 제거
  - 서버/Lambda 2차 제거 정책 유지
- 오프라인 큐 1차 개편
  - 자동 flush 제거
  - 네트워크 복구 후 사용자 확인 1회 뒤 진행
  - `식별 전 사진 큐` 저장
  - 복구 후 `업로드 -> AI 분석 -> 리뷰 후 저장`
- AI 결과 리뷰 기능 1차 구현
  - top 후보 검토
  - 직접 검색으로 종 수정
  - 최종 선택 후 저장
- AI 피드백 루프 1차 구현
  - `users.ai_training_opt_in`
  - `ai_feedback`
  - 전역 동의 기본값 `OFF`
  - 저장 시 건별 override 가능

## 지금 남아 있는 핵심 작업

### P0

- 실제 운영/개발 경로에서 서버 측 EXIF 2차 제거 검증
- DB 마이그레이션 실환경 적용 확인
- 카메라 실기기 E2E 확인
  - 촬영
  - 업로드
  - AI 결과 리뷰
  - 저장

### P1

- 갤러리 탭 SNS 피드 재설계
  - `사진 + 종 정보 + 지역 + 시간 + 좋아요`
  - hearts-only
  - public post detail
- 마이페이지 프로필 재설계
  - 프로필 헤더
  - 게시물 그리드
  - 도감/기록 진입
  - public profile
- 오프라인 큐 고도화
  - retry 정책
  - queued review 복구 UX
  - FIFO / timestamp 보존 검증
- AI 피드백 루프 운영화
  - export
  - 검수
  - 재학습 파이프라인 연결
- 지도 보강
  - 클러스터링
  - 희귀도별 핀
  - sighting detail 연결

## 현재 품질 상태

- Backend tests: `26/26 passed`
- Mobile tests: `45/45 passed`
- Backend TypeScript: passed
- Mobile TypeScript: passed
- Lint:
  - Backend: `9 warnings`
  - Mobile: `18 warnings`

## 현재 기준에서 중요한 파일

- 제품 기준: [BirdWatch_PRD.md](/C:/workspace/Project_2/BirdWatch_PRD.md)
- 재개 기준: [RESUME.md](/C:/workspace/Project_2/RESUME.md)

- 모바일 핵심
  - [camera.tsx](/C:/workspace/Project_2/mobile/app/(tabs)/camera.tsx)
  - [AIResultReviewSheet.tsx](/C:/workspace/Project_2/mobile/src/components/AIResultReviewSheet.tsx)
  - [offlineQueue.ts](/C:/workspace/Project_2/mobile/src/services/storage/offlineQueue.ts)
  - [imageSanitizer.ts](/C:/workspace/Project_2/mobile/src/services/media/imageSanitizer.ts)
  - [photoPipeline.ts](/C:/workspace/Project_2/mobile/src/services/media/photoPipeline.ts)
  - [profile.tsx](/C:/workspace/Project_2/mobile/app/(tabs)/profile.tsx)

- 백엔드 핵심
  - [sightings.ts](/C:/workspace/Project_2/backend/src/routes/v1/sightings.ts)
  - [users.ts](/C:/workspace/Project_2/backend/src/routes/v1/users.ts)
  - [upload.ts](/C:/workspace/Project_2/backend/src/routes/v1/upload.ts)

- DB 마이그레이션
  - [20260411_000011_allow_pending_onboarding_and_locationless_sightings.sql](/C:/workspace/Project_2/db/migrations/20260411_000011_allow_pending_onboarding_and_locationless_sightings.sql)
  - [20260411_000012_add_ai_feedback_and_training_opt_in.sql](/C:/workspace/Project_2/db/migrations/20260411_000012_add_ai_feedback_and_training_opt_in.sql)

## 다음 작업 시작점

다음 세션에서는 이 순서로 이어가면 된다.

1. 갤러리 탭을 birding feed로 재설계
2. 마이페이지를 profile-first 구조로 재설계
3. 그 다음 오프라인 큐 복구 UX와 AI feedback export를 보강
