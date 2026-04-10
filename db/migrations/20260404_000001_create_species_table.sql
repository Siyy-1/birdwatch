-- Migration: species 테이블 생성
-- Date: 2026-04-04
-- Description: BirdWatch 조류 종 카탈로그 기반 테이블

-- UP
BEGIN;

CREATE TABLE species (
    -- 식별자
    species_id          VARCHAR(10)   PRIMARY KEY,             -- 예: KR-142
    ioc_taxon_id        VARCHAR(30)   NOT NULL,                -- IOC World Bird List 분류 ID

    -- 이름 (다국어)
    name_ko             VARCHAR(100)  NOT NULL,                -- NIBR 공식 한국명
    name_sci            VARCHAR(150)  NOT NULL,                -- IOC 학명 (genus species)
    name_en             VARCHAR(150)  NOT NULL,                -- IOC 영명

    -- 분류 (IOC 기준)
    order_ko            VARCHAR(50)   NOT NULL,                -- 목 (한국어)
    family_ko           VARCHAR(50)   NOT NULL,                -- 과 (한국어)

    -- 게임 희귀도
    rarity_tier         VARCHAR(20)   NOT NULL                 -- 'common' | 'migrant' | 'rare' | 'legendary'
                        CHECK (rarity_tier IN ('common', 'migrant', 'rare', 'legendary')),
    points              INTEGER       NOT NULL,                -- 1 | 3 | 10 | 25
    is_locked_free      BOOLEAN       NOT NULL DEFAULT FALSE,  -- 프리티어 잠금 여부

    -- 민감 등급 (좌표 난독화 기준)
    sensitivity_tier    INTEGER       NOT NULL DEFAULT 3       -- 1(천연기념물) | 2(멸종위기) | 3(일반)
                        CHECK (sensitivity_tier IN (1, 2, 3)),

    -- 법적 지정
    cultural_heritage_no VARCHAR(20)  NULL,                   -- 천연기념물 번호 (예: 제202호)
    iucn_status         VARCHAR(5)    NULL,                   -- LC | NT | VU | EN | CR | EW | EX

    -- 한국 ABA 코드 (희귀도 기준)
    aba_code            INTEGER       NULL
                        CHECK (aba_code BETWEEN 1 AND 5),

    -- 도감 콘텐츠
    size_cm             INTEGER       NULL,                   -- 평균 몸길이 (cm)
    habitat_ko          TEXT          NULL,                   -- 서식지 설명 (한국어)
    seasonal_presence   JSONB         NOT NULL,              -- {"jan":true/false, ..., "dec":true/false}
    fun_fact_ko         TEXT          NULL,                  -- 흥미로운 사실 1문장 (한국어)

    -- 메타
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- 검증
    CONSTRAINT species_points_tier_match CHECK (
        (rarity_tier = 'common'    AND points = 1)  OR
        (rarity_tier = 'migrant'   AND points = 3)  OR
        (rarity_tier = 'rare'      AND points = 10) OR
        (rarity_tier = 'legendary' AND points = 25)
    ),
    CONSTRAINT species_legendary_sensitivity CHECK (
        rarity_tier != 'legendary' OR sensitivity_tier = 1
    ),
    CONSTRAINT species_legendary_locked CHECK (
        rarity_tier != 'legendary' OR is_locked_free = TRUE
    ),
    CONSTRAINT species_legendary_heritage CHECK (
        rarity_tier != 'legendary' OR cultural_heritage_no IS NOT NULL
    )
);

-- 인덱스
CREATE INDEX species_rarity_tier_idx ON species (rarity_tier);
CREATE INDEX species_is_locked_free_idx ON species (is_locked_free);
CREATE INDEX species_sensitivity_tier_idx ON species (sensitivity_tier);
CREATE INDEX species_name_ko_idx ON species (name_ko);

-- seasonal_presence JSONB 인덱스 (월별 필터 쿼리용)
CREATE INDEX species_seasonal_presence_idx ON species USING GIN (seasonal_presence);

COMMENT ON TABLE species IS 'BirdWatch 조류 종 카탈로그. 300종 한국 조류. IOC World Bird List v14.x 기준.';
COMMENT ON COLUMN species.sensitivity_tier IS '1=천연기념물(좌표 252km² 난독화), 2=멸종위기(5km² 난독화), 3=일반(정확한 좌표)';
COMMENT ON COLUMN species.seasonal_presence IS '월별 한국 출현 여부. 키: jan,feb,mar,apr,may,jun,jul,aug,sep,oct,nov,dec';

COMMIT;

-- DOWN
BEGIN;
DROP TABLE IF EXISTS species CASCADE;
COMMIT;
