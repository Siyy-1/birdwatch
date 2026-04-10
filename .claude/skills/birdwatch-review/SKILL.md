---
name: birdwatch-review
description: "BirdWatch 코드 리뷰 오케스트레이터. 보안(PIPA/취약점)+성능(쿼리/API 레이턴시)+통합 정합성을 에이전트 팀으로 동시 검토하고 통합 보고서를 생성한다. 코드 리뷰, PR 리뷰, 보안 감사, 구현 품질 검토 요청 시 반드시 이 스킬을 사용할 것. '/birdwatch-review', '코드 리뷰해줘', 'PR 검토', '보안 점검해줘'로 시작하는 요청에 사용한다."
---

# BirdWatch Review — 코드 리뷰 오케스트레이터

BirdWatch 코드베이스의 보안, 성능, 통합 정합성을 에이전트 팀(팬아웃/팬인)으로 병렬 검토하는 스킬.

## 실행 모드: 에이전트 팀 (팬아웃/팬인)

## 에이전트 구성

| 팀원 | 에이전트 파일 | 검토 영역 | 출력 |
|------|------------|---------|------|
| security-reviewer | birdwatch-security | PIPA, 취약점, 토큰, 좌표 노출 | `_workspace/review_security.md` |
| qa-validator | birdwatch-qa | 경계면 정합성, 타입 불일치, 엣지 케이스 | `_workspace/review_qa.md` |
| (리더) | — | 통합 보고서 | `_workspace/review_final.md` |

성능 리뷰는 리더가 직접 수행 (쿼리 플랜, API 레이턴시 추정).

## 워크플로우

### Phase 1: 리뷰 범위 파악

1. 입력 확인:
   - 파일 경로 목록 또는 PR diff
   - 리뷰 집중 영역 (보안 집중? 전체?)
   - 관련 PRD FR 번호

2. `_workspace/00_review_scope.md`에 범위 기록

3. 영향 레이어 파악:
   - 모바일 전용: security-reviewer + qa-validator
   - 백엔드 전용: security-reviewer + qa-validator
   - 풀스택: 전원

### Phase 2: 팀 구성 및 병렬 검토

```
TeamCreate(
  team_name: "review-team",
  members: [
    { name: "security-reviewer", agent_type: "birdwatch-security", model: "opus",
      prompt: "아래 파일들의 보안/PIPA 리뷰. 체크포인트: GPS 좌표 노출, EXIF 처리, JWT 저장, SQL 인젝션, 레이트 리밋. 발견 즉시 qa-validator에게도 SendMessage (연관 정합성 이슈가 있을 수 있음). 완료 시 _workspace/review_security.md 저장." },
    { name: "qa-validator", agent_type: "birdwatch-qa", model: "opus",
      prompt: "아래 파일들의 통합 정합성 검증. API 응답 ↔ 모바일 타입 비교, 구독 로직 게이팅, 좌표 난독화 정합성 확인. security-reviewer에게 보안 연관 이슈 SendMessage. 완료 시 _workspace/review_qa.md 저장." }
  ]
)
```

팀원들이 자체 조율하며 검토:
- security-reviewer와 qa-validator는 관련 발견사항을 서로 공유
- 보안 이슈가 정합성 버그로 이어지거나 그 반대의 경우 즉시 공유

### Phase 3: 성능 검토 (리더 직접)

팀원 검토와 병렬로 리더가 직접 수행:
- DB 쿼리: `EXPLAIN ANALYZE` 없이 작성된 PostGIS 공간 쿼리 식별
- N+1 쿼리 패턴: 루프 내 DB 조회 여부
- API 응답 크기: 불필요한 필드 포함 여부 (모바일 데이터 낭비)
- 배터리: GPS 폴링 간격이 NFR-BAT-001 (카메라 10초, 지도 30초) 준수 여부
- 결과: `_workspace/review_performance.md`

### Phase 4: 통합 보고서 생성

1. 세 보고서 통합:
   - `_workspace/review_security.md`
   - `_workspace/review_qa.md`
   - `_workspace/review_performance.md`

2. 우선순위 분류:
   - 🔴 BLOCKER: 보안 취약점, PIPA 위반, 데이터 손실 가능성
   - 🟡 MAJOR: 기능 버그, 성능 문제, 타입 불일치
   - 🟢 MINOR: 코드 스타일, 최적화 제안

3. `_workspace/review_final.md` 저장

### Phase 5: 정리

1. 팀원들에게 종료 요청 (SendMessage)
2. TeamDelete
3. `_workspace/` 보존
4. 사용자에게 보고 (BLOCKER 우선 강조)

## 보고서 형식

```markdown
# BirdWatch 코드 리뷰: {파일/기능명}
검토 일시: {날짜}

## 요약
- 🔴 BLOCKER: N건
- 🟡 MAJOR: N건
- 🟢 MINOR: N건

## BLOCKER 상세

### [SEC-001] GPS 좌표 평문 로그 기록 (PIPA 위반)
- 파일: `src/routes/sightings.ts:45`
- 발견: `logger.info({ lat, lng })` — GPS 좌표가 로그에 평문 기록됨
- 위험: PIPA 제6조 위반 (목적 외 처리)
- 수정: 로그에서 좌표 필드 제거

## MAJOR 상세
...

## MINOR 상세
...

## 검증 통과 항목
- [x] 좌표 난독화 Tier 1/2 정상 동작 확인
- [x] presigned URL 15분 만료 설정 확인
```

## BLOCKER 발견 시 Codex 수정 루프

리뷰에서 🔴 BLOCKER가 발견되면 Codex에게 좁은 범위 수정을 위임하고 Claude가 재검증한다.

```
# Phase 4-A: Codex에게 BLOCKER 수정 위임
Agent(
  subagent_type: "codex:codex-rescue",
  prompt: """
<task>
_workspace/review_final.md 의 BLOCKER 항목을 수정하라.
각 BLOCKER에 파일 경로와 줄 번호가 명시되어 있다.
</task>

<structured_output_contract>
완료 후 반환:
1. BLOCKER 항목별 수정 내용 (파일:줄번호)
2. 수정 이유 (각 BLOCKER의 위험을 어떻게 해소했는지)
</structured_output_contract>

<action_safety>
BLOCKER로 표시된 항목만 수정한다.
MAJOR, MINOR 항목은 수정하지 않는다.
관련 없는 리팩토링, 포맷팅 변경 금지.
</action_safety>
"""
)

# Phase 4-B: Codex 수정 후 Claude 재검증 (BLOCKER 항목만)
Agent(
  subagent_type: "birdwatch-security", model: "opus",
  prompt: "_workspace/review_final.md 의 BLOCKER 항목이 Codex에 의해 수정됐다.
  수정된 코드가 실제로 BLOCKER를 해소했는지 재검증.
  출력: _workspace/review_recheck.md"
)
```

수정 루프 최대 2회. 2회 후에도 BLOCKER 잔존 시 사용자에게 에스컬레이션.

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 팀원 1명 실패 | 1회 재시도 → 실패 시 리더가 해당 영역 직접 검토, 보고서에 명시 |
| 검토 파일 없음 | 해당 영역 "코드 미구현"으로 기록 |
| 상충 발견 (보안 vs 정합성) | 양쪽 보고서에 출처 병기, 삭제 안 함 |
| Codex가 BLOCKER 외 코드 수정 | git diff로 확인 후 의도치 않은 변경 revert |
| 2회 수정 후에도 BLOCKER 잔존 | 보고서와 함께 사용자에게 수동 수정 요청 |

## 테스트 시나리오

### 정상 흐름 (FR-034 민감종 좌표 난독화 구현 리뷰)
1. 파일 목록: `db/functions/obscure_coordinate.sql`, `src/routes/sightings.ts`
2. 팀 구성 (security + qa)
3. security-reviewer: Tier 분기 로직, 본인 여부 체크 확인
4. qa-validator: API 응답 shape ↔ 모바일 타입 비교
5. 리더: PostGIS 쿼리 성능 확인
6. 통합 보고서: BLOCKER 0건, Codex 수정 루프 불필요 → 통과

### 에러 흐름 (GPS 좌표 로그 노출 발견 → Codex 수정)
1. security-reviewer: `logger.info({ lat, lng })` 발견 → BLOCKER 판정
2. qa-validator에게 SendMessage: "GPS 좌표 로그 노출 발견, 관련 analytics 이벤트도 확인"
3. qa-validator: PostHog 이벤트에서도 좌표 포함 확인 → BLOCKER 추가
4. 통합 보고서: BLOCKER 2건
5. Codex 수정 루프: 두 BLOCKER 모두 좁은 범위 fix (로그 필드 제거)
6. security-reviewer 재검증: BLOCKER 0건 확인
7. 완료 보고에 "BLOCKER 2건 발견, Codex 수정 완료" 명시
