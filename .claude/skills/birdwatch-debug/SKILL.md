---
name: birdwatch-debug
description: "BirdWatch 버그 디버깅 오케스트레이터. Claude 에이전트가 근본 원인을 진단하고, Codex가 좁은 범위의 수정 코드를 작성하고, Claude QA가 수정 결과를 검증하는 3단계 파이프라인. 버그 수정, 에러 분석, 예상치 못한 동작 조사가 필요할 때 반드시 이 스킬을 사용할 것. '/birdwatch-debug', '버그 수정', '에러 분석', '왜 안되는지 찾아줘'로 시작하는 요청에 사용한다."
---

# BirdWatch Debug — Claude 진단 + Codex 수정 + Claude 검증

**분업 원칙:**
- **Claude (진단)**: 증상 해석 → 관련 코드 읽기 → 근본 원인 특정 (맥락 이해 필요)
- **Codex (수정)**: 좁은 범위 fix 적용 (코드 작성 = 기계적)
- **Claude QA (검증)**: 수정 결과 확인 + regression 탐지 (판단 필요)

## 실행 모드: 서브 에이전트 (진단은 Claude, 수정은 Codex, 검증은 Claude)

## 증상 분류 → 진단 에이전트 매핑

| 증상 | 의심 레이어 | 진단 에이전트 |
|------|-----------|------------|
| 화면 깨짐, 렌더링 이상, 애니메이션 오류 | 모바일 | birdwatch-mobile |
| API 5xx/4xx, 응답 느림, 타임아웃 | 백엔드 | birdwatch-api |
| AI 식별 실패, 잘못된 결과, 추론 느림 | AI 파이프라인 | birdwatch-ai |
| DB 쿼리 에러, 데이터 불일치 | DB | birdwatch-db |
| 인증 실패, 토큰 오류, OAuth 문제 | 보안 | birdwatch-security |
| 좌표 원본 노출, PIPA 위반 | 보안/PIPA | birdwatch-security |
| API↔모바일 데이터 불일치 | 경계면 | birdwatch-qa |

## 워크플로우

### Phase 1: 증상 분석 (리더 직접)

증상 정보를 구조화하여 `_workspace/debug_symptoms.md` 저장:

```markdown
## 증상
- 에러: {에러 메시지 / 스택 트레이스}
- 재현 단계: {구체적 단계}
- 영향 범위: {특정 사용자? 전체? 특정 환경?}
- 최근 변경: {마지막 코드 변경 / 배포}

## 의심 레이어
- 1순위: {레이어} / 이유: {이유}
- 2순위: {레이어} (불명확 시)
```

### Phase 2: Claude 진단 (서브 에이전트)

**레이어가 명확한 경우** (단독 진단):
```
Agent(
  subagent_type: "birdwatch-{layer}", model: "opus",
  prompt: "_workspace/debug_symptoms.md 읽고 근본 원인 분석.
  코드를 읽어서 원인을 특정하라. 수정하지 말고 결과만 기록.
  출력: _workspace/debug_diagnosis.md
  형식:
    ## 근본 원인
    ## 증거 (파일:줄번호)
    ## 수정 방안 (좁은 범위)
    ## 수정 파일 목록"
)
```

**레이어가 불명확한 경우** (병렬 조사):
```
# 단일 메시지에 두 Agent 동시 호출
Agent(subagent_type: "birdwatch-api", model: "opus",
  prompt: "_workspace/debug_symptoms.md 읽고 백엔드 관점 진단.
  출력: _workspace/debug_diag_api.md", run_in_background: true)

Agent(subagent_type: "birdwatch-mobile", model: "opus",
  prompt: "_workspace/debug_symptoms.md 읽고 모바일 관점 진단.
  출력: _workspace/debug_diag_mobile.md", run_in_background: true)
```

두 보고서 비교 후 리더가 진짜 원인 레이어를 결정하여 `_workspace/debug_diagnosis.md` 작성.

### Phase 3: Codex 수정 (서브 에이전트)

진단 완료 후 Codex에게 **좁은 범위** fix를 위임한다.

```
Agent(
  subagent_type: "codex:codex-rescue",
  run_in_background: false,  # 수정 범위가 좁으면 foreground
  prompt: """
<task>
_workspace/debug_diagnosis.md 의 수정 방안을 적용하라.
수정 파일: {diagnosis에서 특정된 파일:줄번호}
</task>

<structured_output_contract>
완료 후 반환:
1. 수정한 파일과 변경 내용 요약
2. 수정이 진단의 근본 원인을 해결하는 이유
3. 수정 중 발견한 추가 이슈 (있을 경우)
</structured_output_contract>

<default_follow_through_policy>
진단 파일에 명시된 수정 방안을 정확히 따른다.
수정 방안이 모호하면 가장 보수적인 해석으로 진행한다.
</default_follow_through_policy>

<completeness_contract>
수정 후 TypeScript 컴파일 오류가 없는지 확인한다.
</completeness_contract>

<action_safety>
진단에서 지정한 파일과 줄 범위만 수정한다.
관련 없는 리팩토링, 포맷팅, 변수명 변경은 하지 않는다.
버그와 무관한 코드 개선을 발견해도 수정하지 않는다.
</action_safety>
"""
)
```

> **수정 범위가 여러 레이어**에 걸치는 경우: DB 수정 → API 수정 → 모바일 수정 순서로 순차 실행.
> 각 단계는 이전 단계 완료 후 시작 (의존성).

### Phase 4: Claude 검증 (서브 에이전트)

```
Agent(
  subagent_type: "birdwatch-qa", model: "opus",
  prompt: "_workspace/debug_diagnosis.md 와 Codex 수정 결과를 비교 검증.
  1) 버그가 실제로 수정됐는지 (증거 제시)
  2) 의도치 않은 regression 없는지 (수정 범위 주변 코드 확인)
  3) PIPA/보안 관련 버그였다면 birdwatch-security에게도 확인 요청
  출력: _workspace/debug_verification.md"
)
```

검증 결과:
- ✅ 수정 확인 → Phase 5 완료 보고
- ❌ 수정 불완전 → Codex에게 `--resume-last`로 추가 수정 위임 (최대 2회)
- 2회 후에도 실패 → 사용자에게 에스컬레이션

### Phase 5: 완료 보고

```markdown
## 버그 수정 완료: {증상 요약}

**근본 원인**: {1-2문장}
**수정 파일**: {파일:줄번호 목록}
**검증 결과**: 수정 확인, regression 없음

**재발 방지 제안** (선택):
- {근본 원인에서 도출된 예방 조치}
```

## 자주 발생하는 BirdWatch 버그 패턴

버그 유형을 빠르게 특정하는 데 참고한다.

### 좌표 난독화 누락
- **증상**: 민감종(천연기념물) 핀이 정확한 위치에 표시됨
- **진단 에이전트**: birdwatch-security
- **Codex 수정**: `obscure_coordinate()` 함수 호출 추가 (API route 1-2줄)
- **검증**: birdwatch-qa가 Tier 1 종 좌표 응답 확인

### 일일 AI ID 한도 타이밍 오류
- **증상**: Explorer Pass 사용자인데 한도 오류, 또는 KST 자정 후 한도 미리셋
- **진단**: birdwatch-api (streak/limit 로직의 timezone 처리)
- **Codex 수정**: KST → UTC 변환 로직 수정 (`UTC 15:00 = KST 00:00`)
- **검증**: birdwatch-qa가 경계값 (KST 23:59 → 00:00) 확인

### 스트릭 리셋 오류
- **증상**: 당일 사이팅 했는데 스트릭 리셋됨
- **진단**: birdwatch-api (streak 업데이트 로직, KST 날짜 비교)
- **Codex 수정**: `streak_last_date` 비교 시 KST 기준 날짜 사용
- **검증**: birdwatch-qa가 자정 전후 사이팅 시나리오 확인

### 오프라인 큐 타임스탬프 오류
- **증상**: 오프라인에서 찍은 사진의 사이팅 시간이 업로드 시간
- **진단**: birdwatch-api (큐 처리 시 `capture_at` vs `processed_at`)
- **Codex 수정**: 큐에서 꺼낼 때 원본 `capture_at` 사용
- **검증**: birdwatch-qa가 큐 처리 흐름의 타임스탬프 추적

### AI 식별 무한 로딩
- **증상**: "이 새는 뭘까?" 탭 후 응답 없음
- **진단**: birdwatch-ai (presigned URL 만료, ECS GPU 상태 확인)
- **진단 2**: birdwatch-infra (ECS 태스크 상태)
- **Codex 수정**: 타임아웃 핸들러 추가 또는 URL 재발급 로직

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 진단 에이전트가 원인 못 찾음 | 다음 순위 레이어 에이전트로 재시도 |
| Codex 수정 후 컴파일 오류 | `--resume-last`로 오류 메시지 전달, Codex 재수정 |
| Codex가 범위 외 파일 수정 | `git diff`로 확인 후 의도치 않은 변경 revert |
| 검증 2회 실패 | 사용자에게 진단 보고서 공유, 수동 수정 요청 |
| 보안/PIPA 버그 | birdwatch-security 즉시 병행 검토, 심각도에 따라 사용자 알림 |
