# BirdWatch Resume

최종 업데이트: 2026-04-12

이 문서는 세션 재개용 메모다. 최근 완료 작업, 바로 다음 작업, 참고 기준만 남긴다.

## 최근 완료 작업

- `P0` 공식 마무리
- 실기기 카메라 E2E 확인 완료
- dev 기준 `upload -> identify -> save` 배포 환경 실검증 완료
- 서버 EXIF 2차 제거 구현 및 dev 배포 환경 검증 완료
- DB 마이그레이션 로컬/실환경 적용 경로 정리 완료
- private RDS 대응 `ECS one-off task` migration 경로 검증 완료
- dev RDS minor upgrade 완료: `PostgreSQL 16.6 -> 16.11`
- tf-serving CPU fallback 및 cold-start preload 적용 완료
- AI 재학습 트랙 착수
  - 현재 모델 `141`종 / `top-1 0.625`
  - `159`종 누락 확인
  - `full 300종 rebuild` manifest / runbook 준비 완료
  - 수집 배치 계획 및 GBIF 보강 계획 준비 완료

## 다음 작업

1. `P1` 시작: 갤러리 탭을 `birding feed`로 재설계
2. 병렬 핵심 트랙: `300종 full rebuild` 기준으로 raw 재수집 큐 실행
3. 새 버전 경로로 전처리 / TFRecord / `v1.1.0` 재학습 준비
4. 마이페이지를 `profile-first` 구조로 재설계
5. 오프라인 큐 복구 UX와 retry 정책 고도화
6. `ai_feedback` export / 검수 / 재학습 연결 정리
7. 지도 클러스터링 / 희귀도 핀 / sighting detail 연결

## 참고 규칙 / 문서

- 우선순위: `사용자 지시 > BirdWatch_PRD.md > BIRDWATCH_PLAN.md > RESUME.md > .claude/agents/*`
- `.claude/agents/*.md`는 참고용만 사용한다. 충돌 시 최신 결정은 `BirdWatch_PRD.md`와 `BIRDWATCH_PLAN.md` 기준으로 본다.
- 잠금 결정사항:
  - `Google Maps`
  - `hearts-only`
  - `birding feed`
  - `profile-first`
  - `location-optional save`
  - `mobile EXIF strip + server-side sanitize`
  - `offline queue no auto-flush`
  - `AI review before save`
  - `AI training opt-in default OFF`

참고 문서:
- 제품 기준: [BirdWatch_PRD.md](/C:/workspace/Project_2/BirdWatch_PRD.md)
- 전체 실행 계획: [BIRDWATCH_PLAN.md](/C:/workspace/Project_2/BIRDWATCH_PLAN.md)
- DB 운영 체크리스트: [PROD_MIGRATION_CHECKLIST.md](/C:/workspace/Project_2/db/PROD_MIGRATION_CHECKLIST.md)
- AI 재학습 gap report: [AI_RETRAINING_GAP_REPORT.md](/C:/workspace/Project_2/ai/AI_RETRAINING_GAP_REPORT.md)
- AI full rebuild summary: [FULL_RETRAINING_SUMMARY.md](/C:/workspace/Project_2/ai/FULL_RETRAINING_SUMMARY.md)
- AI full rebuild runbook: [FULL_RETRAINING_RUNBOOK.md](/C:/workspace/Project_2/ai/FULL_RETRAINING_RUNBOOK.md)
- AI collection batches: [COLLECTION_BATCH_PLAN.md](/C:/workspace/Project_2/ai/COLLECTION_BATCH_PLAN.md)
- AI GBIF plan: [GBIF_COLLECTOR_PLAN.md](/C:/workspace/Project_2/ai/GBIF_COLLECTOR_PLAN.md)
