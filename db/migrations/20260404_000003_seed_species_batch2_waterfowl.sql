-- Migration: 조류 종 시드 데이터 Batch 2 (60종) — 수조류
-- Date: 2026-04-04
-- Description: 천연기념물 2종 + 희귀종 10종 + 나그네새 34종 + 텃새 14종
-- Source: IOC World Bird List v14.x, NIBR 한국 조류 체크리스트, 문화재청 천연기념물 목록
-- Depends: 20260404_000001_create_species_table.sql

-- UP
BEGIN;

-- ============================================================
-- SECTION 1: 천연기념물 (Legendary) — sensitivity_tier=1, points=25
-- ============================================================

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES

('KR-101', 'ioc14-hal-pel', '참수리', 'Haliaeetus pelagicus', 'Steller''s Sea Eagle',
  '수리목', '수리과', 'legendary', 1, 25,
  3, TRUE, '제243-3호',  -- ※ 번호 문화재청 재확인 필요
  'VU',
  95,
  '동해안과 강 하구에서 월동하며 물고기와 오리류를 사냥한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '참수리는 날개를 펼치면 2.5m에 달하는 세계 최대 수리 중 하나로, 전 세계 4,000마리 미만이 생존합니다'),

('KR-102', 'ioc14-pla-leu', '노랑부리저어새', 'Platalea leucorodia', 'Eurasian Spoonbill',
  '사다새목', '저어새과', 'legendary', 1, 25,
  3, TRUE, '제206호', 'LC',
  86,
  '서해안 갯벌과 하구 습지에서 월동하며 주걱형 부리를 수평으로 저어 먹이를 잡는다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '노랑부리저어새는 눈이 노란 저어새와 달리 눈이 붉으며, 번식기에 머리에 화려한 댕기 깃이 돋아납니다');

-- ============================================================
-- SECTION 2: 희귀종 (Rare) — points=10, is_locked_free=TRUE
-- ============================================================

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES

('KR-103', 'ioc14-sib-for', '가창오리', 'Sibirionetta formosa', 'Baikal Teal',
  '기러기목', '오리과', 'rare', 3, 10,
  3, TRUE, NULL, 'NT',
  40,
  '금강 하구와 주남저수지에서 수십만 마리가 집결해 장관을 이루는 겨울철새',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '가창오리 수십만 마리가 저녁에 함께 날아오르며 그리는 군무는 세계 10대 자연 현상으로 꼽힙니다'),

('KR-104', 'ioc14-ans-cyg', '개리', 'Anser cygnoides', 'Swan Goose',
  '기러기목', '오리과', 'rare', 2, 10,
  3, TRUE, NULL, 'VU',
  88,
  '한강, 금강 하구 등 넓은 강 하구와 갯벌에서 소수 집단이 월동한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '개리는 가축 거위의 조상으로, 부리 위에 독특한 혹이 있어 다른 기러기류와 구별됩니다'),

('KR-105', 'ioc14-ans-ery', '흰이마기러기', 'Anser erythropus', 'Lesser White-fronted Goose',
  '기러기목', '오리과', 'rare', 2, 10,
  3, TRUE, NULL, 'VU',
  60,
  '큰기러기·쇠기러기 무리에 섞여 한국 남서부 논과 습지에서 소수 월동한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흰이마기러기는 같은 속의 쇠기러기보다 눈 주위 흰 테두리가 넓어 노란 안경을 쓴 것처럼 보입니다'),

('KR-106', 'ioc14-mer-squ', '흑비오리', 'Mergus squamatus', 'Scaly-sided Merganser',
  '기러기목', '오리과', 'rare', 2, 10,
  3, TRUE, NULL, 'VU',
  58,
  '맑은 산간 계류와 강 상류에서 월동하며 물속을 잠수해 물고기를 사냥한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흑비오리는 옆구리의 비늘 무늬가 특징이며 전 세계 4,000마리 미만이 생존하는 위기종입니다'),

('KR-107', 'ioc14-syn-wum', '뿔쇠오리', 'Synthliboramphus wumizusume', 'Japanese Murrelet',
  '도요목', '바다쇠오리과', 'rare', 2, 10,
  3, TRUE, NULL, 'VU',
  26,
  '동해 무인도에서 번식하고 겨울에는 해상을 떠돌며 소형 어류와 갑각류를 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":false,"jul":false,"aug":false,"sep":false,"oct":false,"nov":true,"dec":true}',
  '뿔쇠오리는 부화 직후 바다로 이동하는 조숙성 새끼를 부양하는 독특한 번식 전략을 가집니다'),

('KR-108', 'ioc14-hyd-chi', '물꿩', 'Hydrophasianus chirurgus', 'Pheasant-tailed Jacana',
  '도요목', '물꿩과', 'rare', 3, 10,
  4, TRUE, NULL, 'LC',
  31,
  '연잎이 넓게 덮인 연못과 수초 습지에서 번식하는 희귀 여름철새',
  '{"jan":false,"feb":false,"mar":false,"apr":false,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '물꿩은 수컷이 단독으로 알을 품고 새끼를 기르는 역할분담을 하는 드문 조류입니다'),

('KR-109', 'ioc14-bot-ste', '알락해오라기', 'Botaurus stellaris', 'Eurasian Bittern',
  '사다새목', '왜가리과', 'rare', 3, 10,
  3, TRUE, NULL, 'LC',
  75,
  '넓은 갈대밭과 습지에 숨어 살며 위협받으면 부리를 하늘로 향해 갈대처럼 위장한다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '알락해오라기의 저음 울음소리는 낮은 주파수 덕에 수km 밖까지 전달됩니다'),

('KR-110', 'ioc14-cyg-olo', '혹고니', 'Cygnus olor', 'Mute Swan',
  '기러기목', '오리과', 'rare', 3, 10,
  3, TRUE, NULL, 'LC',
  152,
  '큰 호수나 강 하구에 드물게 나타나는 겨울철새로 부리 기부의 검은 혹이 특징이다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '혹고니는 날개를 반쯤 펼치고 헤엄치는 위협 자세가 인상적이며, 동유럽에서는 왕실의 상징이었습니다'),

('KR-111', 'ioc14-gru-gru', '검은목두루미', 'Grus grus', 'Common Crane',
  '두루미목', '두루미과', 'rare', 3, 10,
  3, TRUE, NULL, 'LC',
  115,
  '낙동강 하구와 남해안 논에 소수 월동하며 두루미·재두루미 무리에 섞여 지낸다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '검은목두루미는 이름과 달리 목이 회색이며, 눈앞의 붉은 반점으로 다른 두루미류와 구별됩니다'),

('KR-112', 'ioc14-pel-phi', '사다새', 'Pelecanus philippensis', 'Spot-billed Pelican',
  '사다새목', '사다새과', 'rare', 3, 10,
  4, TRUE, NULL, 'NT',
  152,
  '서해안 해안이나 대형 저수지에 드물게 출현하는 나그네새',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '사다새의 부리 밑 피부 주머니는 물고기를 쉬 담는 그물망 역할로, 한 번에 13리터까지 담을 수 있습니다');

-- ============================================================
-- SECTION 3: 나그네새/겨울·여름철새 (Migrant) — sensitivity_tier=3, points=3
-- ============================================================

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES

('KR-113', 'ioc14-ana-pla', '청둥오리', 'Anas platyrhynchos', 'Mallard',
  '기러기목', '오리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  58,
  '도시 공원 연못부터 강 하구까지 어디서나 볼 수 있는 대표적인 겨울철새',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '청둥오리 수컷의 초록빛 머리는 빛 반사에 의한 구조색으로, 각도에 따라 파란빛으로도 보입니다'),

('KR-114', 'ioc14-ana-cre', '발구지', 'Anas crecca', 'Eurasian Teal',
  '기러기목', '오리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  36,
  '하천, 저수지, 논 등 내륙 수계에서 무리지어 월동하는 소형 오리',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '발구지는 한국에서 "쇠오리"로도 불리며, 깜짝 놀라면 수직으로 날아오르는 습성이 있습니다'),

('KR-115', 'ioc14-spa-cly', '넓적부리', 'Spatula clypeata', 'Northern Shoveler',
  '기러기목', '오리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  51,
  '논, 습지, 저수지에서 납작한 주걱 부리로 물을 걸러 먹으며 월동한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '넓적부리는 부리 가장자리에 빗살 구조가 있어 물속 플랑크톤과 조류를 걸러 먹습니다'),

('KR-116', 'ioc14-ana-acu', '고방오리', 'Anas acuta', 'Northern Pintail',
  '기러기목', '오리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  63,
  '강 하구, 논, 저수지에서 월동하며 수컷의 긴 꼬리 깃이 특징이다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '고방오리는 오리류 중 가장 날렵한 체형으로 시속 110km의 빠른 비행을 자랑합니다'),

('KR-117', 'ioc14-mar-str', '알락오리', 'Mareca strepera', 'Gadwall',
  '기러기목', '오리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  51,
  '내륙 호수와 저수지에서 월동하며 수초와 수생식물을 주로 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '알락오리 수컷은 화려하지 않은 갈색 깃털이지만 날개를 펼치면 흰 거울 무늬가 드러납니다'),

('KR-118', 'ioc14-mar-pen', '홍머리오리', 'Mareca penelope', 'Eurasian Wigeon',
  '기러기목', '오리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  48,
  '강 하구와 간척지 논에서 무리지어 월동하며 풀을 뜯어 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '홍머리오리 수컷의 호각 같은 휘파람 소리는 겨울 갯벌의 배경 음악으로 친숙합니다'),

('KR-119', 'ioc14-ayt-fer', '흰죽지', 'Aythya ferina', 'Common Pochard',
  '기러기목', '오리과', 'migrant', 2, 3,
  2, FALSE, NULL, 'VU',
  46,
  '저수지와 강에서 잠수하며 수초와 소형 무척추동물을 먹는 겨울철새',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흰죽지는 전 세계적으로 개체 수가 급감해 VU 등급으로 올라선 오리로, 한국이 중요한 월동지입니다'),

('KR-120', 'ioc14-ayt-ful', '댕기흰죽지', 'Aythya fuligula', 'Tufted Duck',
  '기러기목', '오리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  44,
  '저수지, 댐, 강에서 흰죽지와 함께 무리지어 월동하며 잠수 사냥을 한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '댕기흰죽지 수컷의 뒤통수에서 늘어지는 긴 댕기 깃은 번식기 암컷에게 어필하는 장식입니다'),

('KR-121', 'ioc14-ayt-mar', '검은머리흰죽지', 'Aythya marila', 'Greater Scaup',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  47,
  '서해와 남해 연안, 큰 강 하구에서 무리지어 월동하는 잠수오리',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '검은머리흰죽지는 수심 6m까지 잠수해 조개와 수서곤충을 채집하는 탁월한 잠수 능력을 가집니다'),

('KR-122', 'ioc14-mer-mer', '비오리', 'Mergus merganser', 'Common Merganser',
  '기러기목', '오리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  65,
  '맑은 산간 강과 댐 저수지에서 물고기를 잡는 겨울철새',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '비오리의 부리 안쪽에는 톱니 구조가 있어 미끄러운 물고기를 놓치지 않고 잡을 수 있습니다'),

('KR-123', 'ioc14-mer-ser', '바다비오리', 'Mergus serrator', 'Red-breasted Merganser',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  58,
  '해안과 강 하구에서 무리지어 빠르게 잠수하며 물고기를 사냥한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '바다비오리는 수면에서 달리듯 도움닫기 해야 날아오를 수 있는 무거운 잠수오리입니다'),

('KR-124', 'ioc14-mer-alb', '흰비오리', 'Mergus albellus', 'Smew',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  41,
  '내륙 강과 저수지에서 드물게 월동하며 수컷은 흑백의 화려한 무늬가 특징이다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흰비오리 수컷은 얼굴에 검은 가면을 쓴 듯한 무늬 때문에 영어로 "판다 오리"라는 별명이 있습니다'),

('KR-125', 'ioc14-buc-cla', '흰뺨오리', 'Bucephala clangula', 'Common Goldeneye',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  46,
  '해안과 강 하구에서 드물게 월동하며 노란 눈이 특징인 잠수오리',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흰뺨오리는 수컷이 고개를 뒤로 젖혔다 빠르게 앞으로 치는 독특한 구애 행동을 반복합니다'),

('KR-126', 'ioc14-mel-ame', '검둥오리', 'Melanitta americana', 'Black Scoter',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  49,
  '서해와 남해 연안 해역에서 무리지어 월동하며 홍합과 조개를 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '검둥오리는 전신이 검은 수컷과 달리 암컷은 갈색에 뺨이 희어 성별 이형성이 뚜렷합니다'),

('KR-127', 'ioc14-tad-fer', '황오리', 'Tadorna ferruginea', 'Ruddy Shelduck',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  63,
  '강 하구와 내륙 호수를 경유하는 나그네새로 주황빛 체색이 선명하다',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '황오리는 쌍을 이루면 평생 함께하며 서로 그루밍으로 유대를 강화하는 일부일처 오리입니다'),

('KR-128', 'ioc14-tad-tad', '혹부리오리', 'Tadorna tadorna', 'Common Shelduck',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  62,
  '서해안 갯벌과 강 하구에서 월동하며 조개와 갯지렁이를 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '혹부리오리 수컷은 번식기에 부리 기부에 붉은 혹이 커지며 이를 통해 건강 상태를 과시합니다'),

('KR-129', 'ioc14-pod-cri', '뿔논병아리', 'Podiceps cristatus', 'Great Crested Grebe',
  '논병아리목', '논병아리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  48,
  '저수지, 강, 해안에서 겨울을 나며 잠수해 물고기를 잡는다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '뿔논병아리의 구애 행동은 암수가 나란히 수면 위를 달리는 "러시" 동작이 백미입니다'),

('KR-130', 'ioc14-pod-nig', '검은목논병아리', 'Podiceps nigricollis', 'Black-necked Grebe',
  '논병아리목', '논병아리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  31,
  '해안과 내륙 수면에서 소수 무리로 월동하며 수서곤충과 소형 어류를 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '검은목논병아리는 깃털에 기름기가 없어 잠수에 최적화되었지만 물에 젖으면 빠져나오기 힘듭니다'),

('KR-131', 'ioc14-pod-gri', '큰논병아리', 'Podiceps grisegena', 'Red-necked Grebe',
  '논병아리목', '논병아리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  43,
  '해안과 큰 강에서 드물게 월동하며 노란 부리 기부가 특징이다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '큰논병아리는 비행을 거의 하지 않으며, 위협받으면 물속으로 숨거나 수면을 달려 탈출합니다'),

('KR-132', 'ioc14-nyc-nyc', '해오라기', 'Nycticorax nycticorax', 'Black-crowned Night Heron',
  '사다새목', '왜가리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  61,
  '도심 하천, 저수지, 논 습지에서 번식하고 야간에 물고기를 사냥하는 여름철새',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '해오라기는 주로 밤에 활동하며 "꽤꽤" 소리로 야간 비행 중임을 알립니다'),

('KR-133', 'ioc14-ard-int', '중백로', 'Ardea intermedia', 'Intermediate Egret',
  '사다새목', '왜가리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  68,
  '논, 습지, 하천에서 번식하는 중형 백로로 쇠백로와 중대백로 사이 크기이다',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '중백로는 눈앞의 황록색 라인이 번식기에 더 선명해지며 무리지어 왜가리류 번식지에서 둥지를 틉니다'),

('KR-134', 'ioc14-egr-gar', '쇠백로', 'Egretta garzetta', 'Little Egret',
  '사다새목', '왜가리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  60,
  '논, 갯벌, 강가에서 흔히 볼 수 있는 소형 백로로 노란 발이 특징이다',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '쇠백로는 뒷발로 물속을 저어 물고기를 놀라게 한 뒤 잡는 "발 교란 사냥" 기법을 씁니다'),

('KR-135', 'ioc14-bub-ibi', '황로', 'Bubulcus ibis', 'Eastern Cattle Egret',
  '사다새목', '왜가리과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  50,
  '논, 풀밭, 가축 방목지에서 볼 수 있으며 번식기에 몸이 주황빛으로 물드는 여름철새',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '황로는 소나 경운기 뒤를 따라다니며 놀란 곤충을 잡아먹는 공생 행동이 유명합니다'),

('KR-136', 'ioc14-ard-bac', '흰날개해오라기', 'Ardeola bacchus', 'Chinese Pond Heron',
  '사다새목', '왜가리과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  45,
  '논, 연못, 습지 주변 수풀에서 번식하며 주황색과 흰색이 대비되는 여름철새',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '흰날개해오라기는 앉아 있을 때 갈색으로 보이지만 날면 놀라울 정도로 새하얀 날개가 드러납니다'),

('KR-137', 'ioc14-ixo-sin', '덤불해오라기', 'Ixobrychus sinensis', 'Yellow Bittern',
  '사다새목', '왜가리과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  36,
  '갈대밭, 논, 수초 습지에서 번식하는 소형 왜가리로 노란빛 체색이 갈대와 닮았다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '덤불해오라기는 위협받으면 목을 세우고 부리를 하늘로 향해 갈대처럼 완벽하게 위장합니다'),

('KR-138', 'ioc14-ixo-eur', '큰덤불해오라기', 'Ixobrychus eurhythmus', 'Von Schrenck''s Bittern',
  '사다새목', '왜가리과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  38,
  '논과 갈대밭을 이동 시 경유하는 드문 나그네새로 덤불해오라기보다 체색이 어둡다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '큰덤불해오라기는 수컷의 날개 무늬로 성별을 구분할 수 있는 왜가리과의 희귀 나그네새입니다'),

('KR-139', 'ioc14-ard-pur', '붉은왜가리', 'Ardea purpurea', 'Purple Heron',
  '사다새목', '왜가리과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  90,
  '갈대밭과 습지 주변을 통과하는 나그네새로 목과 가슴에 붉은빛 줄무늬가 특징이다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '붉은왜가리는 왜가리보다 날씬한 목과 굵은 줄무늬 덕에 갈대밭에서 더욱 완벽히 위장합니다'),

('KR-140', 'ioc14-bra-ber', '흑기러기', 'Branta bernicla', 'Brent Goose',
  '기러기목', '오리과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  60,
  '서해안 갯벌과 해안 초지에서 소수 월동하는 소형 기러기',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흑기러기는 거의 검은 체색이라 겨울 서해 갯벌에서 눈에 띄지 않게 먹이를 찾습니다'),

('KR-141', 'ioc14-gal-cin', '뜸부기', 'Gallicrex cinerea', 'Watercock',
  '두루미목', '뜸부기과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  43,
  '논과 갈대밭에서 번식하는 여름철새로 야간에 "뜸-뜸" 울며 논에서 벌레를 잡는다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '뜸부기 수컷은 번식기에 이마의 붉은 방패 모양 판이 커지며 울음소리도 웅장해집니다'),

('KR-142', 'ioc14-cal-leu', '슴새', 'Calonectris leucomelas', 'Streaked Shearwater',
  '슴새목', '슴새과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  48,
  '독도, 제주도 등 무인도에서 번식하고 바다 위를 넘나들며 물고기를 잡는 여름철새',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '슴새는 낮에는 먹이활동을 하고 밤에만 번식지로 돌아오는 야행성 습성을 가집니다'),

('KR-143', 'ioc14-syn-ant', '바다쇠오리', 'Synthliboramphus antiquus', 'Ancient Murrelet',
  '도요목', '바다쇠오리과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  26,
  '동해 해상에서 월동하며 잠수해 작은 물고기와 갑각류를 먹는 해양성 겨울철새',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '바다쇠오리 새끼는 부화 이틀 후 부모의 부름에 응답해 스스로 등지를 떠나 바다로 걸어갑니다'),

('KR-144', 'ioc14-gav-ste', '아비', 'Gavia stellata', 'Red-throated Loon',
  '아비목', '아비과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  58,
  '동해와 서해 연안 해상에서 월동하며 잠수해 물고기를 잡는 겨울철새',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '아비는 날기 위해 수면을 길게 달려야 하지만 잠수는 수심 30m까지 가능한 해양 전문 사냥꾼입니다'),

('KR-145', 'ioc14-gav-arc', '큰아비', 'Gavia arctica', 'Arctic Loon',
  '아비목', '아비과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  68,
  '해안과 연안 바다에서 아비와 함께 월동하며 잠수해 어류를 사냥한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '큰아비의 울음소리는 날카롭고 길게 이어지는 야성적 소리로 북극의 상징이자 겨울 바다 분위기를 자아냅니다');

-- ============================================================
-- SECTION 4: 텃새/흔한 수조류 (Common) — sensitivity_tier=3, points=1
-- ============================================================

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES

('KR-146', 'ioc14-ana-zon', '흰뺨검둥오리', 'Anas zonorhyncha', 'Eastern Spot-billed Duck',
  '기러기목', '오리과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  60,
  '도심 공원 연못부터 강 하구까지 어디서나 볼 수 있는 한국의 대표 텃새 오리',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '흰뺨검둥오리는 도시 적응력이 높아 한강 공원에서 사람 손을 먹으며 번식하는 개체군이 있습니다'),

('KR-147', 'ioc14-tac-ruf', '논병아리', 'Tachybaptus ruficollis', 'Little Grebe',
  '논병아리목', '논병아리과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  27,
  '도심 하천, 연못, 논에서 흔히 볼 수 있는 소형 잠수성 텃새',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '논병아리는 알을 낳으면 자리를 비울 때 식물 부스러기로 덮어 포식자로부터 알을 숨깁니다'),

('KR-148', 'ioc14-pha-cap', '가마우지', 'Phalacrocorax capillatus', 'Japanese Cormorant',
  '사다새목', '가마우지과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  84,
  '해안, 섬, 하구에서 무리지어 번식하며 잠수해 물고기를 잡는 텃새',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '가마우지는 잠수 후 깃털이 젖어 무거워지므로 날개를 펴 햇빛에 말리는 자세가 특징입니다'),

('KR-149', 'ioc14-pha-car', '민물가마우지', 'Phalacrocorax carbo', 'Great Cormorant',
  '사다새목', '가마우지과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  90,
  '강, 호수, 저수지에서 연중 볼 수 있으며 무리 지어 나무 위에서 잠을 자는 텃새',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '민물가마우지는 사냥 시 눈을 보호하는 녹색 눈꺼풀이 있으며 수심 10m까지 잠수할 수 있습니다'),

('KR-150', 'ioc14-ful-atr', '물닭', 'Fulica atra', 'Eurasian Coot',
  '두루미목', '뜸부기과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  38,
  '저수지, 공원 연못, 강에서 연중 볼 수 있으며 흰 이마판이 특징인 친숙한 텃새',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '물닭은 발에 수영에 적합한 판 모양의 변형 발가락이 있어 오리처럼 헤엄치면서도 달릴 수 있습니다'),

('KR-151', 'ioc14-gal-chl', '쇠물닭', 'Gallinula chloropus', 'Common Moorhen',
  '두루미목', '뜸부기과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  33,
  '갈대밭과 수초가 있는 연못, 습지에서 연중 서식하는 텃새로 빨간 이마판이 특징이다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '쇠물닭은 고개를 앞뒤로 흔들며 걷고 헤엄치는 특유의 동작으로 쉽게 알아볼 수 있습니다'),

('KR-152', 'ioc14-pha-pel', '쇠가마우지', 'Phalacrocorax pelagicus', 'Pelagic Cormorant',
  '사다새목', '가마우지과', 'common', 3, 1,
  2, FALSE, NULL, 'LC',
  72,
  '동해와 서해 바위 해안에서 번식하며 연안 해역에서 잠수 사냥을 하는 텃새',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '쇠가마우지는 가마우지류 중 가장 날씬하며 빠른 날갯짓으로 좁은 해안 절벽 사이를 누빕니다'),

('KR-153', 'ioc14-por-pus', '쇠뜸부기', 'Porzana pusilla', 'Baillon''s Crake',
  '두루미목', '뜸부기과', 'common', 3, 1,
  3, FALSE, NULL, 'LC',
  18,
  '갈대밭과 수초 습지를 이동 시 통과하는 소형 뜸부기류로 봄가을에 발견된다',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '쇠뜸부기는 몸집이 참새만큼 작아 좁은 수초 사이를 재빠르게 돌아다니며 거의 눈에 띄지 않습니다'),

('KR-154', 'ioc14-hir-his', '흰줄박이오리', 'Histrionicus histrionicus', 'Harlequin Duck',
  '기러기목', '오리과', 'common', 3, 1,
  3, FALSE, NULL, 'LC',
  43,
  '동해 바위 해안에서 드물게 월동하며 수컷은 화려한 흰 반점 무늬가 특징이다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흰줄박이오리는 빠른 유속의 바위 계류에서 번식하는 탓에 조류 도감의 "숨은 보석"으로 불립니다'),

('KR-155', 'ioc14-uria-aal', '바다오리', 'Uria aalge', 'Common Murre',
  '도요목', '바다쇠오리과', 'common', 3, 1,
  3, FALSE, NULL, 'LC',
  42,
  '동해 연안 해상에서 드물게 월동하며 잠수해 물고기를 잡는 해양성 겨울철새',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '바다오리는 직립자세로 서는 모습이 펭귄을 닮았으며, 잠수 깊이 180m의 기록을 세운 바 있습니다'),

('KR-156', 'ioc14-ans-cae', '흰기러기', 'Anser caerulescens', 'Snow Goose',
  '기러기목', '오리과', 'common', 3, 1,
  4, FALSE, NULL, 'LC',
  75,
  '서해안 해안과 강 하구에 드물게 출현하는 흰색 기러기로, 기러기 무리에 섞여 발견된다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흰기러기는 전신이 새하얗지만 날개 끝만 검어 비행 중에도 쉽게 구별되는 북미 기러기입니다');

COMMIT;

-- DOWN
BEGIN;
DELETE FROM species WHERE species_id IN (
  'KR-101','KR-102','KR-103','KR-104','KR-105','KR-106','KR-107','KR-108',
  'KR-109','KR-110','KR-111','KR-112','KR-113','KR-114','KR-115','KR-116',
  'KR-117','KR-118','KR-119','KR-120','KR-121','KR-122','KR-123','KR-124',
  'KR-125','KR-126','KR-127','KR-128','KR-129','KR-130','KR-131','KR-132',
  'KR-133','KR-134','KR-135','KR-136','KR-137','KR-138','KR-139','KR-140',
  'KR-141','KR-142','KR-143','KR-144','KR-145','KR-146','KR-147','KR-148',
  'KR-149','KR-150','KR-151','KR-152','KR-153','KR-154','KR-155','KR-156'
);
COMMIT;
