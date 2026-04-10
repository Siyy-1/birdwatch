---
name: birdwatch-feature
description: "BirdWatch 새 기능 구현 오케스트레이터. Claude 에이전트 팀이 기술 스펙을 작성하고, Codex가 실제 코드를 구현하고, Claude가 보안/PIPA/QA 리뷰하는 3단계 파이프라인. 새 화면 개발, API 엔드포인트 추가, DB 스키마 변경을 포함한 기능 개발 요청이 오면 반드시 이 스킬을 사용할 것. '/birdwatch-feature', '기능 구현해줘', 'FR-XXX 구현', '화면 만들어줘'로 시작하는 요청에 사용한다."
---

# BirdWatch Feature — Codex 구현 + Claude 리뷰 오케스트레이터

**분업 원칙:**
- **Claude 에이전트 팀**: 요구사항 해석 → 레이어별 기술 스펙 작성 (판단 작업)
- **Codex**: 스펙을 코드로 변환 (구현 작업, 토큰 절약)
- **Claude 리뷰 팀**: 보안/PIPA/QA 검증 (판단 작업)

## 실행 모드: 에이전트 팀 (스펙) + 서브 에이전트 Codex (구현) + 서브 에이전트 (리뷰)

## 에이전트 구성

| 역할 | 에이전트 | 담당 | 실행 방식 |
|------|---------|------|---------|
| 스펙 작성 | birdwatch-api + birdwatch-db + birdwatch-mobile | 레이어별 기술 스펙 | 에이전트 팀 |
| 구현 | codex:codex-rescue | 스펙 → 실제 코드 | 서브 에이전트 (background) |
| 보안 리뷰 | birdwatch-security | PIPA + 취약점 | 서브 에이전트 |
| QA 검증 | birdwatch-qa | 경계면 정합성 | 서브 에이전트 |

## 워크플로우

### Phase 1: 요구사항 분석

1. PRD FR 번호 및 수락 기준 파악
2. 영향 레이어 결정:
   - **풀스택**: DB + API + 모바일 (3개 스펙 파일 생성)
   - **백엔드만**: DB + API (2개 스펙 파일)
   - **프론트엔드만**: 모바일 (1개 스펙 파일)
3. PIPA 관련 여부 확인 (GPS, 사진, 개인정보 포함 시 security 리뷰 필수)
4. `_workspace/00_requirements.md` 저장

### Phase 2: 스펙 팀 구성 (에이전트 팀)

Claude 에이전트 팀이 레이어별 **기술 스펙 파일**을 작성한다. 이 스펙이 Codex에게 줄 지시서가 된다.

```
TeamCreate(
  team_name: "spec-team-{fr-id}",
  members: [
    { name: "db-spec", agent_type: "birdwatch-db", model: "opus",
      prompt: "_workspace/00_requirements.md 읽고 DB 마이그레이션 스펙 작성.
      출력: _workspace/spec_db_{feature}.md
      형식: birdwatch-codex-delegate 스킬의 'DB 마이그레이션 스펙' 형식 따를 것.
      완료 시 api-spec에게 SendMessage (테이블 변경 내용 전달)." },

    { name: "api-spec", agent_type: "birdwatch-api", model: "opus",
      prompt: "_workspace/00_requirements.md 읽고 Fastify API 엔드포인트 스펙 작성.
      db-spec의 스키마 변경 내용을 SendMessage로 받은 후 작성 시작.
      출력: _workspace/spec_api_{feature}.md
      형식: birdwatch-codex-delegate 스킬의 'API 엔드포인트 스펙' 형식 따를 것.
      민감종 좌표 반환 시 obscure_coordinate() 적용 여부 명시 필수.
      완료 시 mobile-spec에게 SendMessage (응답 타입 전달)." },

    { name: "mobile-spec", agent_type: "birdwatch-mobile", model: "opus",
      prompt: "_workspace/00_requirements.md 읽고 React Native 컴포넌트 스펙 작성.
      api-spec의 응답 타입을 SendMessage로 받은 후 작성 시작.
      출력: _workspace/spec_mobile_{feature}.md
      형식: birdwatch-codex-delegate 스킬의 'React Native 컴포넌트 스펙' 형식 따를 것." }
  ]
)
```

작업 등록 (의존성 포함):
```
TaskCreate(tasks: [
  { title: "DB 스펙 작성", assignee: "db-spec" },
  { title: "API 스펙 작성", assignee: "api-spec", depends_on: ["DB 스펙 작성"] },
  { title: "모바일 스펙 작성", assignee: "mobile-spec", depends_on: ["API 스펙 작성"] }
])
```

스펙 팀 완료 후 팀 정리:
```
TeamDelete(spec-team-{fr-id})
```

> 스펙 작성은 순차 의존이 강하므로 팀 내 SendMessage 체인이 핵심.
> db → api → mobile 순서로 스펙이 완성된다.

### Phase 3: Codex 구현 (서브 에이전트, background)

스펙 파일들을 Codex에게 건네 실제 코드를 작성시킨다.

**풀스택 기능**: DB → API → 모바일 순서 (순차, 각 레이어가 이전 레이어에 의존)

```
# Step 3-1: DB 마이그레이션 구현
Agent(
  subagent_type: "codex:codex-rescue",
  run_in_background: true,
  prompt: """
<task>
_workspace/spec_db_{feature}.md 를 읽고 DB 마이그레이션 파일을 구현하라.
출력 위치: db/migrations/에 새 파일 생성
</task>

<structured_output_contract>
완료 후 반환:
1. 생성한 파일 경로
2. UP/DOWN 섹션 요약
3. 스펙에서 모호했던 부분과 내린 결정
</structured_output_contract>

<default_follow_through_policy>
geography(Point, 4326) 타입 사용, 인덱스는 CONCURRENTLY, UP/DOWN 모두 포함.
모호한 부분은 BirdWatch PRD의 관련 FR 수락 기준을 참고한다.
</default_follow_through_policy>

<completeness_contract>
SQL 문법 오류 없는지 확인 후 완료 표시.
</completeness_contract>

<action_safety>
스펙에 명시된 테이블/함수만 수정. 기존 마이그레이션 파일 수정 금지.
</action_safety>
"""
)
```

DB 완료 확인 후:
```
# Step 3-2: API 구현
Agent(
  subagent_type: "codex:codex-rescue",
  run_in_background: true,
  prompt: """
<task>
_workspace/spec_api_{feature}.md 와 방금 생성된 DB 마이그레이션을 읽고
Fastify API 엔드포인트를 구현하라.
</task>
... (동일 XML 구조)
"""
)
```

API 완료 확인 후:
```
# Step 3-3: 모바일 구현
Agent(
  subagent_type: "codex:codex-rescue",
  run_in_background: true,
  prompt: """
<task>
_workspace/spec_mobile_{feature}.md 를 읽고 React Native 컴포넌트를 구현하라.
</task>
... (동일 XML 구조)
"""
)
```

> **background 실행 시**: 각 단계 완료를 기다린 후 다음 단계 시작 (순차 의존).
> Codex 결과물은 실제 프로젝트 파일로 저장된다.

### Phase 4: Claude 리뷰 팀 (서브 에이전트, 병렬)

Codex 구현 완료 후, Claude 에이전트들이 병렬로 리뷰한다.

```
# 병렬 실행 (단일 메시지에 두 Agent 호출)
Agent(
  subagent_type: "birdwatch-security", model: "opus",
  prompt: "FR-{id} Codex 구현 리뷰. 
  검토 파일: Codex가 생성한 실제 파일들 (spec 파일에 출력 경로 명시됨).
  체크포인트: GPS 좌표 노출, EXIF 처리, JWT 연결, SQL 인젝션, 로그 개인정보.
  완료 시 _workspace/review_security_{feature}.md 저장.",
  run_in_background: true
)

Agent(
  subagent_type: "birdwatch-qa", model: "opus",
  prompt: "FR-{id} Codex 구현 통합 검증.
  _workspace/spec_api_{feature}.md 의 응답 타입 ↔ Codex가 생성한 모바일 타입 비교.
  구독 로직 게이팅, 좌표 난독화 정합성 확인.
  완료 시 _workspace/review_qa_{feature}.md 저장.",
  run_in_background: true
)
```

### Phase 5: 리뷰 결과 처리

두 리뷰 완료 후:

1. 리뷰 보고서 읽기:
   - `_workspace/review_security_{feature}.md`
   - `_workspace/review_qa_{feature}.md`

2. **🔴 BLOCKER 발견 시**: 해당 레이어를 Codex에게 재위임
   ```
   Agent(
     subagent_type: "codex:codex-rescue",
     prompt: """
   <task>
   _workspace/review_security_{feature}.md 의 BLOCKER 항목을 수정하라.
   수정 범위: 지적된 파일과 줄 번호만. 다른 코드 변경 금지.
   </task>
   <action_safety>BLOCKER로 표시된 항목만 수정. 관련 없는 변경 금지.</action_safety>
   """
   )
   ```
   수정 후 security/qa 에이전트로 해당 부분만 재검증.

3. **🟡 MAJOR 이하**: 보고서에 기록하고 사용자에게 알림 후 진행 결정 위임

### Phase 6: 정리

1. `_workspace/` 보존 (스펙 파일, 리뷰 보고서 모두 포함)
2. 사용자에게 완료 보고:
   - Codex가 생성한 파일 목록
   - 보안 리뷰 결과 요약 (BLOCKER 수정 여부)
   - QA 발견 사항
   - 남은 TODO

## 데이터 흐름

```
[리더: 요구사항 분석]
        │
        ▼
[에이전트 팀: 스펙 작성]
  db-spec → api-spec → mobile-spec
  (SendMessage 체인으로 타입 공유)
        │
        ▼ (스펙 파일 3개)
[Codex: 순차 구현]
  DB 마이그레이션 → API routes → RN 컴포넌트
        │
        ▼ (실제 코드 파일)
[Claude 리뷰: 병렬]
  birdwatch-security ↔ birdwatch-qa
  (교차 발견 공유)
        │
        ▼
[BLOCKER → Codex 재수정 → 재검증]
        │
        ▼
[사용자에게 완료 보고]
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 스펙 팀 SendMessage 체인 블로킹 | 리더가 TaskGet으로 확인 후 수동 SendMessage |
| Codex 구현 실패 (컴파일 오류) | 오류 메시지와 스펙 파일을 함께 Codex에 재위임 `--resume-last` |
| Codex가 스펙 외 파일 수정 | 해당 변경 reverted + `<action_safety>` 강화 후 재실행 |
| BLOCKER 2회 수정 후에도 미해결 | 사용자에게 에스컬레이션, 수동 수정 요청 |
| QA에서 타입 불일치 발견 | spec_api 파일 수정 후 API + 모바일 Codex 재실행 |

## 테스트 시나리오

### 정상 흐름 (FR-040: 도감 그리드 뷰)
1. Phase 1: 풀스택 기능, PIPA 관련 없음
2. Phase 2: db-spec (스키마 확인 — 변경 없음) → api-spec (GET /species) → mobile-spec (도감 그리드)
3. Phase 3: DB 스킵 (변경 없음) → Codex API → Codex 모바일
4. Phase 4: security (is_locked 잠금 로직 점검) + qa (API `is_locked` ↔ 모바일 타입 비교)
5. Phase 5: BLOCKER 0 → 완료 보고

### 에러 흐름 (FR-034: 민감종 좌표 난독화, Codex가 난독화 누락)
1. Phase 3: Codex가 obscure_coordinate() 없이 좌표 직접 반환하는 API 생성
2. Phase 4: security-reviewer가 BLOCKER 탐지
3. Phase 5: Codex에게 `--resume-last`로 BLOCKER만 수정 위임
4. 수정 후 security 재검증 → PASS
5. 완료 보고에 "초기 구현에서 좌표 난독화 누락, Codex 재수정 완료" 명시
