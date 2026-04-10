---
name: birdwatch-species
description: "BirdWatch 조류 종 데이터 추가/수정/검증 전문 스킬. IOC World Bird List, NIBR 한국 조류 체크리스트, ABA 희귀도 코드, 천연기념물 지정 여부, GBIF occurrence 데이터를 기반으로 정확한 종 레코드를 생성한다. 새 종 추가, 종 정보 수정, 희귀도 등급 변경, 종 DB 검증이 필요할 때 반드시 이 스킬을 사용할 것."
---

# BirdWatch Species — 조류 종 데이터 관리

BirdWatch의 종 DB에 정확한 데이터를 유지하기 위한 스킬. 300종 한국 조류의 추가, 수정, 검증을 담당한다.

## 종 레코드 구조

```sql
-- species 테이블 핵심 컬럼
species_id     VARCHAR(10)  -- 예: KR-142 (국내 고유 ID)
ioc_taxon_id   VARCHAR(20)  -- IOC World Bird List 분류 ID
name_ko        VARCHAR(100) -- NIBR 한국명 (공식 한국어 이름)
name_sci       VARCHAR(150) -- IOC 학명 (genus + species)
name_en        VARCHAR(150) -- IOC 영명
order_ko       VARCHAR(50)  -- 목 (한국어): 파랑새목
family_ko      VARCHAR(50)  -- 과 (한국어): 파랑새과
rarity_tier    VARCHAR(20)  -- 'common' | 'migrant' | 'rare' | 'legendary'
sensitivity_tier INT        -- 1(천연기념물) | 2(멸종위기) | 3(일반)
points         INT          -- 1(common) | 3(migrant) | 10(rare) | 25(legendary)
aba_code       INT          -- ABA 코드 1-5 (한국 적용)
is_locked_free BOOLEAN      -- true = 프리티어 잠금 (희귀종/천연기념물)
cultural_heritage_no VARCHAR(20) -- 천연기념물 번호 (예: 제202호)
iucn_status    VARCHAR(10)  -- LC | NT | VU | EN | CR
size_cm        INT          -- 평균 몸길이
habitat_ko     TEXT         -- 서식지 설명 (한국어)
seasonal_presence JSONB     -- 월별 한국 출현 여부 {"jan":true, ...}
fun_fact_ko    TEXT         -- 재미있는 사실 1문장 (한국어)
```

## 희귀도 분류 기준

| 티어 | 한국명 | 기준 | 포인트 | sensitivity_tier | is_locked_free |
|------|-------|------|--------|-----------------|---------------|
| common | 텃새 | ABA 코드 1-2, 연중 상주 | 1 | 3 | false |
| migrant | 나그네새 | ABA 코드 3, 계절성 방문 | 3 | 3 | false (일부 true) |
| rare | 희귀종 | ABA 코드 4, 비정기/희소 | 10 | 2 또는 3 | true |
| legendary | 천연기념물 | 문화재청 지정 조류 | 25 | 1 | true |

**프리티어 잠금 배분**: 전체 300종 중 100종이 `is_locked_free = true`
- 천연기념물 전체 (~50종)
- 희귀종 전체 (~30종)
- 나그네새 일부 (~20종, 희귀한 계절성 방문종)

## 데이터 소스 우선순위

1. **학명/영명/분류**: IOC World Bird List v14.x (최신 권위)
2. **한국명**: NIBR 한국 조류 체크리스트 (국립생물자원관)
3. **희귀도**: ABA Checklist Committee 코드 + GBIF 한국 출현 빈도 보정
4. **천연기념물**: 문화재청 고시 (현행)
5. **멸종위기종**: IUCN Red List 최신 평가
6. **출현 시기**: GBIF 한국 관찰 데이터 (cc BY 4.0)

## 종 레코드 작성 절차

1. IOC 분류로 기본 정보 설정 (학명, 영명, 분류)
2. NIBR 체크리스트로 한국명 확인 (없으면 직역 + 전문가 검토 주석)
3. ABA 코드 설정, 한국 GBIF 데이터로 보정
4. 문화재청 목록 조회 → 천연기념물 번호 설정
5. IUCN 상태 확인
6. GBIF seasonal data로 `seasonal_presence` JSON 생성
7. `fun_fact_ko` 작성 — 1문장, 생동감 있게 (예: "물총새는 시속 40km로 다이빙합니다")
8. `is_locked_free` 기준 적용
9. 마이그레이션 SQL 생성

## 마이그레이션 SQL 형식

```sql
-- UP: 새 종 추가
INSERT INTO species (
  species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no,
  iucn_status, size_cm, habitat_ko, seasonal_presence, fun_fact_ko
) VALUES (
  'KR-142', 'ioc14-alc-att', '물총새', 'Alcedo atthis', 'Common Kingfisher',
  '파랑새목', '물총새과', 'common', 3, 1,
  1, false, NULL,
  'LC', 16,
  '하천, 호수, 연못 주변의 흙벽에 굴을 파고 서식한다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '물총새는 시속 40km로 수면을 향해 다이빙하며 물고기를 사냥합니다'
);

-- DOWN (필요 시)
DELETE FROM species WHERE species_id = 'KR-142';
```

## 검증 체크리스트

새 종 레코드 작성 완료 후 확인:
- [ ] `species_id`가 KR-XXX 형식이고 기존 ID와 중복 없음
- [ ] `name_ko`가 NIBR 공식 명칭과 일치
- [ ] `name_sci`가 IOC v14.x 권위 학명과 일치
- [ ] 천연기념물이면 `sensitivity_tier = 1`, `is_locked_free = true`, `cultural_heritage_no` 설정
- [ ] `seasonal_presence` JSON의 달 키가 12개 (jan~dec)
- [ ] `fun_fact_ko`가 정확하고 흥미로운 한 문장
- [ ] `points`가 티어 기준과 일치

## 자주 혼동되는 종 (주의)

- 두루미 (Grus japonensis, 천연기념물 #202) vs 재두루미 (Grus vipio, 천연기념물 #203)
- 흰꼬리수리 (Haliaeetus albicilla) vs 참수리 (Haliaeetus pelagicus)
- 황조롱이 (Falco tinnunculus, 천연기념물 #323) vs 매 (Falco peregrinus, 천연기념물 #323-7)

혼동 가능한 종 작업 시 NIBR 체크리스트 원문을 반드시 참조한다.
