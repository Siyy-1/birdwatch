-- Migration: 조류 종 시드 데이터 Remaining 4 (KR-157~160)
-- Date: 2026-04-04
-- Description: Batch 2 누락 4종 수조류 데이터 추가
-- Source: DB Phase 2 spec

-- UP
BEGIN;

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES

('KR-157', 'ioc14-his-his', '흰눈썹오리', 'Histrionicus histrionicus', 'Harlequin Duck',
  '기러기목', '오리과', 'common', 3, 1,
  4, FALSE, NULL, 'LC',
  43,
  '겨울철 바위가 많은 해안과 하구에서 소규모 무리로 관찰되는 잠수성 오리이다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":false,"nov":true,"dec":true}',
  '흰눈썹오리 수컷은 급류와 파도 속에서도 안정적으로 잠수하며 조개와 갑각류를 먹습니다'),

('KR-158', 'ioc14-net-ruf', '댕기쇠오리', 'Netta rufina', 'Red-crested Pochard',
  '기러기목', '오리과', 'migrant', 3, 3,
  4, FALSE, NULL, 'LC',
  56,
  '큰 호수와 저수지에서 드물게 월동하는 방문종으로 깊은 물에서 수초와 수생무척추동물을 먹는다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":false,"nov":true,"dec":true}',
  '댕기쇠오리 수컷의 둥근 주황빛 머리와 붉은 부리는 멀리서도 쉽게 눈에 띕니다'),

('KR-159', 'ioc14-buc-alb', '흰뺨오리사촌', 'Bucephala albeola', 'Bufflehead',
  '기러기목', '오리과', 'common', 3, 1,
  5, FALSE, NULL, 'LC',
  36,
  '해안 만과 넓은 담수 수면에서 매우 드물게 관찰되는 작은 잠수오리이다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":false,"nov":true,"dec":true}',
  '흰뺨오리사촌은 작은 몸집 덕분에 수면 위에서 빠르게 튀어 오르듯 이륙하는 독특한 비행을 보입니다'),

('KR-160', 'ioc14-buc-isl', '쇠흰뺨오리', 'Bucephala islandica', 'Barrow''s Goldeneye',
  '기러기목', '오리과', 'common', 3, 1,
  5, FALSE, NULL, 'LC',
  48,
  '겨울철 해안과 큰 호수에서 극히 드물게 기록되는 잠수오리로 조개와 저서생물을 먹는다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":false,"nov":true,"dec":true}',
  '쇠흰뺨오리 수컷의 초승달 모양 흰 얼굴무늬는 다른 흰뺨오리류와 구별되는 핵심 특징입니다');

COMMIT;

-- DOWN
BEGIN;
DELETE FROM species WHERE species_id IN ('KR-157','KR-158','KR-159','KR-160');
COMMIT;
