---
name: birdwatch-codex-delegate
description: "BirdWatch에서 Codex(GPT)에게 구현을 위임하고 Claude가 리뷰하는 패턴. 토큰 집약적인 반복 코드 작성(SQL 마이그레이션, Fastify route, React Native 컴포넌트)은 Codex가 담당하고, 판단이 필요한 PIPA 검토/QA/보안 감사는 Claude가 담당한다. birdwatch-feature, birdwatch-debug 내부에서 자동 사용되는 내부 스킬."
---

# BirdWatch Codex Delegate — Codex 위임 + Claude 리뷰 패턴

BirdWatch 하네스에서 **Codex(구현)** + **Claude(리뷰)** 분업을 정의하는 내부 스킬.

## 역할 분담 원칙

| 작업 유형 | 담당 | 이유 |
|---------|------|------|
| API route 구현 (Fastify handler, Zod 스키마) | **Codex** | 반복적 패턴, 토큰 집약 |
| DB 마이그레이션 SQL 작성 | **Codex** | 결정론적, 스펙→코드 직결 |
| React Native 컴포넌트 코드 | **Codex** | 구조적 패턴 반복, 토큰 多 |
| PostGIS 공간 함수 구현 | **Codex** | SQL 작성 = 기계적 |
| 300종 SEED SQL 생성 | **Codex** | 극도로 반복적, 토큰 낭비 |
| 버그 수정 코드 작성 | **Codex** | 진단 후 좁은 범위 fix |
| PIPA 동의 플로우 설계 | **Claude** | 법적 판단 필요 |
| 보안 취약점 탐지 | **Claude** | 맥락 이해, 판단 |
| QA 경계면 비교 | **Claude** | 양쪽을 동시에 읽고 불일치 판단 |
| 요구사항 → 기술 스펙 변환 | **Claude** | PRD 해석, 설계 결정 |
| 희귀도 분류 결정 | **Claude** | IOC/ABA/NIBR 전문 판단 |

## Codex 위임 호출 패턴

`codex:codex-rescue` subagent_type으로 호출. 내부에서 `codex-companion.mjs task --write` 실행.

```
Agent(
  subagent_type: "codex:codex-rescue",
  prompt: "<spec_path>를 읽고 구현하라. [XML 프롬프트]",
  run_in_background: true  # 구현 작업은 시간 소요 → 항상 background
)
```

> `model` 파라미터는 기본값 사용. Codex가 자체 모델을 선택한다.

## Codex 프롬프트 구조 (BirdWatch 표준)

모든 Codex 위임 프롬프트는 아래 XML 구조를 따른다:

```xml
<task>
{구현 대상}을 구현하라.
스펙: {spec_file_path}를 읽고 정확히 따르라.
출력 파일: {output_path}
</task>

<structured_output_contract>
완료 후 반환:
1. 생성/수정한 파일 목록
2. 구현 요약 (3줄 이내)
3. 스펙에서 모호했던 부분과 내린 결정
4. 미구현 항목 (있을 경우)
</structured_output_contract>

<default_follow_through_policy>
스펙이 명확하면 묻지 말고 진행한다.
모호한 부분은 BirdWatch PRD의 Acceptance Criteria를 우선 참고한다.
</default_follow_through_policy>

<completeness_contract>
파일 생성 후 TypeScript 컴파일 오류가 없는지 확인한다.
SQL은 문법 오류가 없는지 확인한다.
</completeness_contract>

<action_safety>
스펙에 명시된 파일만 수정한다.
관련 없는 리팩토링, 포맷팅, 파일 삭제는 하지 않는다.
</action_safety>
```

## 레이어별 Codex 위임 스펙 형식

### DB 마이그레이션 스펙 (`_workspace/spec_db_{feature}.md`)

```markdown
## DB 마이그레이션 스펙: {기능명}

### 변경 목적
{왜 이 변경이 필요한지}

### 테이블 변경
- 테이블: {table_name}
- 추가 컬럼: [{name, type, nullable, default, comment}]
- 삭제 컬럼: [{}]
- 추가 인덱스: [{name, type, columns, where_clause}]

### PostGIS 함수 (필요 시)
{함수명, 파라미터, 반환 타입, 동작 설명}

### 파일 출력 위치
db/migrations/YYYYMMDD_HHMMSS_{description}.sql

### 준수 사항
- UP / DOWN 섹션 포함
- geography(Point, 4326) 타입 사용 (geometry 아님)
- 인덱스는 CONCURRENTLY 옵션 사용
- 개인정보 컬럼에 PIPA 주석 포함
```

### API 엔드포인트 스펙 (`_workspace/spec_api_{feature}.md`)

```markdown
## API 엔드포인트 스펙: {기능명}

### 엔드포인트
- Method + Path: POST /v1/sightings
- 인증 필요: YES (JWT Bearer)
- 프리티어 제한: YES (daily_limit 체크)

### 요청 스키마 (Zod)
{필드명, 타입, 검증 규칙}

### 응답 스키마
성공 (200): { data: { ... } }
에러: { error: { code, message(한국어) } }

### 비즈니스 로직
1. {단계별 로직}
2. 민감종 좌표 난독화: obscure_coordinate() 적용
3. 배지 트리거: 조건 충족 시 badges 테이블 INSERT

### 파일 출력 위치
src/routes/v1/{feature}.ts
src/services/{feature}.service.ts (로직 분리 필요 시)

### 참조할 기존 파일
src/routes/v1/users.ts (패턴 참조)
src/plugins/auth.ts (JWT 미들웨어 사용법)
```

### React Native 컴포넌트 스펙 (`_workspace/spec_mobile_{feature}.md`)

```markdown
## 모바일 컴포넌트 스펙: {기능명}

### 화면/컴포넌트 목록
- {ComponentName}: {역할}

### 상태 관리
- Zustand store: {storeName}, 필드: [{name, type}]
- TanStack Query: useQuery({queryKey}, {endpoint})

### UI 요구사항
- 모든 텍스트: 한국어
- 터치 타깃: iOS 44pt 이상
- 로딩 상태: ActivityIndicator 표시
- 에러 상태: 한국어 메시지 + 재시도 버튼

### API 연동
호출 엔드포인트: {method} {path}
응답 타입: (스펙 파일 또는 인라인 정의)

### 파일 출력 위치
src/screens/{FeatureName}Screen.tsx
src/components/{ComponentName}.tsx (재사용 컴포넌트)
src/hooks/use{Feature}.ts (커스텀 훅)

### 참조할 기존 파일
src/screens/MapScreen.tsx (패턴 참조)
```

## Claude 리뷰 체크포인트 (Codex 산출물 검토 시)

Codex 구현 완료 후 Claude 에이전트가 반드시 확인:

**모든 레이어 공통:**
- [ ] TypeScript 컴파일 오류 없음
- [ ] 스펙 파일의 모든 항목 구현됨
- [ ] 스펙에 없는 파일을 임의로 수정하지 않음

**API (birdwatch-security 담당):**
- [ ] GPS 좌표가 응답에 직접 포함될 경우 `obscure_coordinate()` 적용됨
- [ ] 인증 미들웨어가 올바르게 연결됨 (게스트 접근 차단)
- [ ] 에러 메시지가 한국어
- [ ] SQL이 parameterized query (문자열 연결 없음)
- [ ] 로그에 개인정보 (GPS, 사진 URL) 포함 없음

**DB (birdwatch-db 담당):**
- [ ] `geography` 타입 사용 (geometry 아님)
- [ ] GiST 인덱스 있음 (geography 컬럼 추가 시)
- [ ] DOWN 섹션 완전함

**모바일 (birdwatch-mobile 담당):**
- [ ] GPS는 foreground-only 권한만 요청
- [ ] 오프라인 상태에서 크래시 없음 (네트워크 오류 처리)
- [ ] 민감종 좌표를 직접 렌더링하지 않음 (서버에서 이미 난독화된 값 표시)

## 언제 Codex를 background로 실행하는가

| 작업 규모 | 실행 방식 |
|---------|---------|
| 단일 컴포넌트 / 단일 route | foreground (빠름) |
| 2개 이상 파일 + DB 마이그레이션 | background (시간 소요) |
| 300종 SEED 데이터 생성 | background (필수) |
| 전체 기능 풀스택 구현 | background (필수) |

background 실행 시 결과는 `codex:result` 또는 `codex:status`로 확인.
