-- Migration: 조류 종 시드 데이터 Batch 1 (50종)
-- Date: 2026-04-04
-- Description: 천연기념물 14종 + 희귀종 5종 + 나그네새 14종 + 텃새 17종
-- Source: IOC World Bird List v14.x, NIBR 한국 조류 체크리스트, 문화재청 천연기념물 목록
-- ※ cultural_heritage_no 중 일부는 문화재청 현행 고시와 대조 검토 필요 (주석 표시)

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

('KR-001', 'ioc14-cic-boy', '황새', 'Ciconia boyciana', 'Oriental Stork',
  '황새목', '황새과', 'legendary', 1, 25,
  4, TRUE, '제199호', 'EN',
  112,
  '넓은 농경지, 논, 강가, 습지에 서식하며 고목에 대형 둥지를 튼다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '황새는 한 번 짝을 맺으면 평생 같은 배우자와 함께하는 일부일처의 새입니다'),

('KR-002', 'ioc14-cyg-col', '고니', 'Cygnus columbianus', 'Tundra Swan',
  '기러기목', '오리과', 'legendary', 1, 25,
  3, TRUE, '제201-1호', 'LC',
  120,
  '강 하구, 호수, 만, 해안 습지에서 월동하며 무리지어 생활한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '고니는 순백의 깃털을 유지하기 위해 하루에 수백 번 털을 다듬는 정성스러운 새입니다'),

('KR-003', 'ioc14-cyg-cyg', '큰고니', 'Cygnus cygnus', 'Whooper Swan',
  '기러기목', '오리과', 'legendary', 1, 25,
  3, TRUE, '제201-2호', 'LC',
  155,
  '큰 강 하구와 호수에서 월동하며 V자 편대를 이루어 비행한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '큰고니의 "후우-후우" 울음소리는 3km 밖에서도 들릴 만큼 크고 장엄합니다'),

('KR-004', 'ioc14-gru-jap', '두루미', 'Grus japonensis', 'Red-crowned Crane',
  '두루미목', '두루미과', 'legendary', 1, 25,
  4, TRUE, '제202호', 'EN',
  150,
  '철원 평야, 임진강 일대의 논과 습지에서 월동하며 전 세계 개체 수가 약 2,750마리에 불과하다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '두루미는 암수가 함께 하늘을 향해 목을 뻗고 동시에 우는 "유니즌 콜"로 평생의 인연을 확인합니다'),

('KR-005', 'ioc14-ant-vip', '재두루미', 'Antigone vipio', 'White-naped Crane',
  '두루미목', '두루미과', 'legendary', 1, 25,
  3, TRUE, '제203호', 'VU',
  130,
  '철원, 연천, 한강 하구 등 넓은 농경지와 습지에서 두루미와 함께 월동한다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '재두루미는 붉은 이마가 없고 목 뒤에 하얀 줄무늬가 있어 두루미와 구별됩니다'),

('KR-006', 'ioc14-gru-mon', '흑두루미', 'Grus monacha', 'Hooded Crane',
  '두루미목', '두루미과', 'legendary', 1, 25,
  3, TRUE, '제228호', 'VU',
  100,
  '순천만, 주남저수지 등 남부 습지와 논에서 월동하며 수만 마리가 집결한다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '순천만에는 매년 겨울 전 세계 흑두루미의 70% 이상이 한꺼번에 모여듭니다'),

('KR-007', 'ioc14-pla-min', '저어새', 'Platalea minor', 'Black-faced Spoonbill',
  '사다새목', '저어새과', 'legendary', 1, 25,
  4, TRUE, '제205호', 'EN',
  76,
  '서해안 무인도에서 번식하고 하구, 갯벌, 논에서 먹이를 찾는다',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '저어새는 주걱처럼 생긴 부리를 물속에서 좌우로 저으며 물고기를 사냥합니다'),

('KR-008', 'ioc14-aeg-mon', '독수리', 'Aegypius monachus', 'Cinereous Vulture',
  '수리목', '수리과', 'legendary', 1, 25,
  3, TRUE, '제243호', 'NT',
  110,
  '해발이 낮은 산지와 농경지 상공을 활공하며 사체를 찾아 무리지어 생활한다',
  '{"jan":true,"feb":true,"mar":false,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '독수리는 위산이 매우 강해 탄저균 등 세균에 감염된 사체도 안전하게 소화할 수 있습니다'),

('KR-009', 'ioc14-hal-alb', '흰꼬리수리', 'Haliaeetus albicilla', 'White-tailed Eagle',
  '수리목', '수리과', 'legendary', 1, 25,
  3, TRUE, '제243-4호', 'LC',  -- ※ 번호 문화재청 재확인 필요
  85,
  '강 하구, 호수, 해안에서 월동하며 물고기와 수조류를 사냥한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흰꼬리수리는 날개를 펼치면 최대 2.4m에 달해 한국에서 볼 수 있는 가장 큰 수리입니다'),

('KR-010', 'ioc14-aqu-chr', '검독수리', 'Aquila chrysaetos', 'Golden Eagle',
  '수리목', '수리과', 'legendary', 1, 25,
  4, TRUE, '제204호', 'LC',
  90,
  '험준한 산악 지형에서 단독으로 생활하며 토끼, 꿩 등 중형 동물을 사냥한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '검독수리는 시속 320km로 급강하하여 먹잇감을 포획하는 맹금류의 제왕입니다'),

('KR-011', 'ioc14-fal-tin', '황조롱이', 'Falco tinnunculus', 'Common Kestrel',
  '매목', '매과', 'legendary', 1, 25,
  2, TRUE, '제323호', 'LC',
  34,
  '도시, 농경지, 산지 어디서나 볼 수 있으며 전봇대, 건물 옥상 등 높은 곳에서 사냥한다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '황조롱이는 공중에 정지비행(호버링)을 하면서 땅 위의 작은 먹이를 찾아내는 유일한 한국 맹금류입니다'),

('KR-012', 'ioc14-fal-per', '매', 'Falco peregrinus', 'Peregrine Falcon',
  '매목', '매과', 'legendary', 1, 25,
  3, TRUE, '제323-7호', 'LC',  -- ※ 번호 문화재청 재확인 필요
  45,
  '해안 절벽, 도심 고층 건물에 둥지를 틀고 비둘기, 오리 등 조류를 사냥한다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '매는 사냥 급강하 시 시속 389km를 기록한 지구상에서 가장 빠른 동물입니다'),

('KR-013', 'ioc14-bub-bub', '수리부엉이', 'Bubo bubo', 'Eurasian Eagle-Owl',
  '올빼미목', '올빼미과', 'legendary', 1, 25,
  2, TRUE, '제324호', 'LC',
  70,
  '산지 절벽이나 바위 틈에서 번식하며 주로 야간에 사냥하는 한국 최대의 올빼미류이다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '수리부엉이의 눈은 사람 눈보다 약 100배 어두운 곳에서도 물체를 볼 수 있습니다'),

('KR-014', 'ioc14-aix-gal', '원앙', 'Aix galericulata', 'Mandarin Duck',
  '기러기목', '오리과', 'legendary', 1, 25,
  2, TRUE, '제327호', 'LC',
  45,
  '맑은 계류와 숲속 호수에서 서식하며 나무 구멍에 둥지를 튼다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '원앙 수컷의 화려한 깃털은 번식기에만 나타나며, 번식 후에는 암컷과 비슷한 갈색으로 바뀝니다');

-- ============================================================
-- SECTION 2: 희귀종 (Rare) — sensitivity_tier=1 또는 2, points=10
-- ============================================================

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES

('KR-020', 'ioc14-cal-pyg', '넓적부리도요', 'Calidris pygmaea', 'Spoon-billed Sandpiper',
  '도요목', '도요과', 'rare', 2, 10,
  4, TRUE, NULL, 'CR',
  15,
  '갯벌과 조간대에서 작은 무척추동물을 주걱형 부리로 걸러 먹는다',
  '{"jan":false,"feb":false,"mar":false,"apr":false,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '넓적부리도요는 전 세계 개체 수가 600마리 미만으로 지구에서 가장 희귀한 새 중 하나입니다'),

('KR-021', 'ioc14-tri-gut', '황다리도요', 'Tringa guttifer', 'Nordmann''s Greenshank',
  '도요목', '도요과', 'rare', 2, 10,
  4, TRUE, NULL, 'EN',
  32,
  '갯벌과 조간대에서 작은 물고기와 갑각류를 사냥하며 이동 시기에 서해안을 경유한다',
  '{"jan":false,"feb":false,"mar":false,"apr":false,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '황다리도요는 전 세계에 1,000마리도 남지 않았으며 한국 갯벌이 생존에 필수적인 경유지입니다'),

('KR-022', 'ioc14-egr-eul', '노랑부리백로', 'Egretta eulophotes', 'Chinese Egret',
  '사다새목', '왜가리과', 'rare', 2, 10,
  4, TRUE, NULL, 'VU',
  65,
  '서해안 무인도에서 번식하고 갯벌과 조간대에서 먹이를 구한다',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '노랑부리백로는 번식기에만 부리가 노랗게 물들며 전 세계 개체의 절반 이상이 한국에서 번식합니다'),

('KR-023', 'ioc14-ich-sau', '검은머리갈매기', 'Ichthyaetus saundersi', 'Saunders''s Gull',
  '도요목', '갈매기과', 'rare', 2, 10,
  4, TRUE, NULL, 'VU',
  33,
  '갯벌과 조간대에서 게, 갯지렁이를 주식으로 하며 서해안에서 소규모 군집을 이룬다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '검은머리갈매기는 전 세계에 약 14,000마리만 남아 있으며 한국 갯벌이 핵심 서식지입니다'),

('KR-024', 'ioc14-num-mad', '알락꼬리마도요', 'Numenius madagascariensis', 'Far Eastern Curlew',
  '도요목', '도요과', 'rare', 2, 10,
  4, TRUE, NULL, 'EN',
  60,
  '갯벌의 깊은 구멍 속 갯지렁이와 게를 긴 부리로 꺼내 먹는다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '알락꼬리마도요의 부리는 아래로 굽어 있으며 몸통 길이의 절반에 달해 도요류 중 가장 깁니다');

-- ============================================================
-- SECTION 3: 나그네새 (Migrant) — sensitivity_tier=3, points=3
-- ============================================================

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES

('KR-030', 'ioc14-ans-fab', '큰기러기', 'Anser fabalis', 'Bean Goose',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  85,
  '한강, 낙동강 하구, 전남 논에서 대규모로 월동하며 볏짚과 풀뿌리를 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '큰기러기 무리는 이동 시 가장 강한 개체가 앞에서 기류를 만들어 뒤따르는 동료의 체력을 30% 절감시킵니다'),

('KR-031', 'ioc14-ans-alb', '쇠기러기', 'Anser albifrons', 'Greater White-fronted Goose',
  '기러기목', '오리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  75,
  '한강, 임진강 일대에서 큰기러기와 함께 월동하며 논과 습지에서 먹이를 구한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '쇠기러기 이마의 흰 테두리는 나이가 들수록 넓어져 경험 많은 개체를 한눈에 알아볼 수 있습니다'),

('KR-032', 'ioc14-alc-att', '물총새', 'Alcedo atthis', 'Common Kingfisher',
  '파랑새목', '물총새과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  16,
  '맑은 하천, 호수, 연못 주변의 흙벽에 굴을 파고 서식하며 물고기를 주식으로 한다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '물총새는 시속 40km로 수면을 향해 다이빙하며 물속 굴절을 보정하는 특수한 시각 능력을 가집니다'),

('KR-033', 'ioc14-hal-cor', '호반새', 'Halcyon coromanda', 'Ruddy Kingfisher',
  '파랑새목', '호반새과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  27,
  '울창한 계곡 숲 속 물가에서 여름을 보내며 물고기와 개구리를 사냥한다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '호반새의 주황빛 몸통과 붉은 부리는 어두운 숲 속에서도 단번에 눈을 사로잡는 강렬한 색입니다'),

('KR-034', 'ioc14-hal-pil', '청호반새', 'Halcyon pileata', 'Black-capped Kingfisher',
  '파랑새목', '호반새과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  28,
  '하천, 해안, 논 주변 나무에 앉아 물고기와 가재를 사냥하는 여름철새이다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '청호반새는 하늘색 날개와 검은 머리, 붉은 부리가 조화를 이루어 한국에서 가장 화려한 새로 꼽힙니다'),

('KR-035', 'ioc14-hir-rus', '제비', 'Hirundo rustica', 'Barn Swallow',
  '참새목', '제비과', 'migrant', 3, 3,
  1, FALSE, NULL, 'LC',
  17,
  '사람이 사는 마을 처마 밑에 둥지를 틀고 농경지, 하천 상공을 비행하며 곤충을 사냥한다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '제비는 동아프리카까지 왕복 2만km를 이동하며 번식지인 한국의 마을로 매년 정확히 돌아옵니다'),

('KR-036', 'ioc14-cuc-can', '뻐꾸기', 'Cuculus canorus', 'Common Cuckoo',
  '뻐꾸기목', '뻐꾸기과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  33,
  '산지와 농경지 주변 숲에서 살며 다른 새의 둥지에 알을 낳는 탁란을 한다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":false,"oct":false,"nov":false,"dec":false}',
  '뻐꾸기 새끼는 부화하자마자 다른 알과 새끼를 둥지 밖으로 밀어버리는 본능적 행동을 합니다'),

('KR-037', 'ioc14-ori-chi', '꾀꼬리', 'Oriolus chinensis', 'Black-naped Oriole',
  '참새목', '꾀꼬리과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  27,
  '활엽수림과 공원 나무 위에서 과일과 곤충을 먹으며 멀리서도 들리는 맑은 소리로 운다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":false,"oct":false,"nov":false,"dec":false}',
  '꾀꼬리 수컷의 선명한 노란 몸통과 검은 줄무늬는 동남아에서 한국까지 이동하는 여름 나그네입니다'),

('KR-038', 'ioc14-fic-zan', '흰눈썹황금새', 'Ficedula zanthopygia', 'Yellow-rumped Flycatcher',
  '참새목', '딱새과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  13,
  '산지와 공원의 활엽수림에서 번식하며 날아다니는 곤충을 공중에서 낚아채 사냥한다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '흰눈썹황금새 수컷은 황금빛 가슴과 흰 눈썹이 조화를 이루는 한국에서 볼 수 있는 가장 작고 화려한 새입니다'),

('KR-039', 'ioc14-phy-ino', '쇠솔새', 'Phylloscopus inornatus', 'Yellow-browed Warbler',
  '참새목', '솔새과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  11,
  '이동 시기에 숲 가장자리, 공원, 정원에서 흔히 볼 수 있는 소형 나그네새이다',
  '{"jan":false,"feb":false,"mar":false,"apr":false,"may":true,"jun":false,"jul":false,"aug":false,"sep":true,"oct":true,"nov":false,"dec":false}',
  '쇠솔새는 몸무게가 6g에 불과하지만 히말라야에서 한국까지 수천 km를 단숨에 이동합니다'),

('KR-040', 'ioc14-num-pha', '중부리도요', 'Numenius phaeopus', 'Whimbrel',
  '도요목', '도요과', 'migrant', 3, 3,
  3, FALSE, NULL, 'LC',
  43,
  '이동 시기에 갯벌과 해안에서 하루살이 등 무척추동물을 활 모양 부리로 잡아먹는다',
  '{"jan":false,"feb":false,"mar":false,"apr":true,"may":true,"jun":false,"jul":false,"aug":true,"sep":true,"oct":false,"nov":false,"dec":false}',
  '중부리도요는 매년 알래스카에서 호주까지 왕복 24,000km를 이동하며 한국 갯벌에서 에너지를 보충합니다'),

('KR-041', 'ioc14-fri-mon', '되새', 'Fringilla montifringilla', 'Brambling',
  '참새목', '되새과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  16,
  '활엽수림, 농경지, 공원에서 씨앗을 먹으며 겨울을 나고 봄에 북쪽으로 돌아간다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '되새는 너도밤나무 열매가 풍성한 해에 수십만 마리가 한꺼번에 한반도를 방문합니다'),

('KR-042', 'ioc14-mot-cin', '노랑할미새', 'Motacilla cinerea', 'Grey Wagtail',
  '참새목', '할미새과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  19,
  '맑은 산지 계류와 강가 바위 위를 쉴 새 없이 걸으며 꼬리를 위아래로 흔든다',
  '{"jan":false,"feb":false,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":false,"dec":false}',
  '노랑할미새는 걸을 때마다 꼬리를 위아래로 끊임없이 흔드는데 이 행동의 정확한 이유는 아직 연구 중입니다'),

('KR-043', 'ioc14-tur-pal', '흰배지빠귀', 'Turdus pallidus', 'Pale Thrush',
  '참새목', '지빠귀과', 'migrant', 3, 3,
  2, FALSE, NULL, 'LC',
  24,
  '겨울철 수풀, 공원, 산기슭에서 열매와 지렁이를 먹으며 봄에 북상한다',
  '{"jan":true,"feb":true,"mar":true,"apr":false,"may":false,"jun":false,"jul":false,"aug":false,"sep":false,"oct":true,"nov":true,"dec":true}',
  '흰배지빠귀는 도심 공원에서도 겨울을 나며 사람을 크게 경계하지 않아 가까이서 관찰할 수 있습니다');

-- ============================================================
-- SECTION 4: 텃새 (Common) — sensitivity_tier=3, points=1
-- ============================================================

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES

('KR-050', 'ioc14-pas-mon', '참새', 'Passer montanus', 'Eurasian Tree Sparrow',
  '참새목', '참새과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  14,
  '농경지, 마을, 도시 어디서나 사람 가까이 살며 씨앗과 곤충을 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '참새는 한국에서 가장 흔한 새지만 최근 30년간 도시화로 개체 수가 급격히 줄고 있습니다'),

('KR-051', 'ioc14-pic-ser', '까치', 'Pica serica', 'Korean Magpie',
  '참새목', '까마귀과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  46,
  '농경지, 도시, 공원 등 사람이 사는 곳 어디서나 적응하며 무엇이든 잘 먹는 잡식성이다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '까치는 거울 속 자신을 인식하는 자아인식 능력이 있는 몇 안 되는 동물 중 하나입니다'),

('KR-052', 'ioc14-par-maj', '박새', 'Parus major', 'Great Tit',
  '참새목', '박새과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  15,
  '숲, 공원, 정원에서 살며 겨울에는 먹이를 찾아 집 주변까지 접근하는 친숙한 새이다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '박새는 40가지 이상의 서로 다른 울음소리를 사용하여 복잡한 의사소통을 하는 것으로 밝혀졌습니다'),

('KR-053', 'ioc14-aeg-cau', '오목눈이', 'Aegithalos caudatus', 'Long-tailed Tit',
  '참새목', '오목눈이과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  14,
  '숲 가장자리와 관목지에서 작은 무리를 이루어 생활하며 거미와 작은 곤충을 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '오목눈이는 이끼와 거미줄로 만든 공 모양 둥지 안에 최대 2,000개의 깃털을 깔아 단열재로 활용합니다'),

('KR-054', 'ioc14-sin-web', '붉은머리오목눈이', 'Sinosuthora webbiana', 'Vinous-throated Parrotbill',
  '참새목', '붉은머리오목눈이과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  12,
  '갈대밭, 덤불, 초지에서 작은 무리를 이루어 갈대 씨앗과 곤충을 먹으며 숨어산다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '붉은머리오목눈이는 갈대밭에서 무리가 한꺼번에 날아오를 때 "치치치" 소리를 내 서로의 위치를 알립니다'),

('KR-055', 'ioc14-pho-aur', '딱새', 'Phoenicurus auroreus', 'Daurian Redstart',
  '참새목', '딱새과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  15,
  '산지와 마을 주변 나무 위에서 꼬리를 떨며 낮은 곳에 앉아 곤충을 잡는다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '딱새는 꼬리를 양쪽으로 "딱딱" 흔들어 경계를 표시하는 행동에서 이름이 유래했습니다'),

('KR-056', 'ioc14-hyp-ama', '직박구리', 'Hypsipetes amaurotis', 'Brown-eared Bulbul',
  '참새목', '직박구리과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  27,
  '도시, 공원, 산림 어디서나 서식하며 과일, 꽃꿀, 곤충을 가리지 않고 먹는다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '직박구리는 도시 소음 속에서도 자신의 노래가 들리도록 점점 더 높은 음높이로 진화 중입니다'),

('KR-057', 'ioc14-mot-alb', '흰할미새', 'Motacilla alba', 'White Wagtail',
  '참새목', '할미새과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  18,
  '하천, 호수, 논, 도시 광장 등 열린 공간에서 꼬리를 위아래로 흔들며 걸어 다닌다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '흰할미새는 밤에 도시 불빛 아래 수십 마리가 모여 잠드는 도시 적응의 대표적 성공 사례입니다'),

('KR-058', 'ioc14-sit-var', '곤줄박이', 'Sittiparus varius', 'Varied Tit',
  '참새목', '박새과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  14,
  '산지 활엽수림에서 도토리와 씨앗을 저장하고 먹는 텃새로 나무줄기를 거꾸로 내려올 수 있다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '곤줄박이는 가을에 도토리를 수백 곳에 나누어 묻어두고 몇 달 후 95% 이상을 정확히 찾아냅니다'),

('KR-059', 'ioc14-gar-gla', '어치', 'Garrulus glandarius', 'Eurasian Jay',
  '참새목', '까마귀과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  34,
  '산지 활엽수림에서 도토리를 즐겨 먹으며 까치와 달리 숲 속을 선호한다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '어치는 도토리 수천 개를 묻어두었다가 겨울에 찾아내며 찾지 못한 것들이 참나무 숲을 만듭니다'),

('KR-060', 'ioc14-pha-col', '꿩', 'Phasianus colchicus', 'Common Pheasant',
  '닭목', '꿩과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  87,
  '농경지, 초지, 숲 가장자리에서 살며 씨앗, 곤충, 열매를 가리지 않고 먹는 대형 텃새이다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '꿩 수컷은 번식기에 날개를 "퍼덕" 세게 쳐 큰 소리를 내는 행동으로 영역과 매력을 과시합니다'),

('KR-061', 'ioc14-str-ori', '멧비둘기', 'Streptopelia orientalis', 'Oriental Turtle Dove',
  '비둘기목', '비둘기과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  33,
  '산지와 농경지, 도시 공원에서 씨앗과 곡식을 먹으며 집비둘기보다 조용하게 생활한다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '멧비둘기는 목 뒤의 체크무늬 깃털 패턴이 개체마다 달라 마치 지문처럼 개체 식별에 활용됩니다'),

('KR-062', 'ioc14-cor-cor', '까마귀', 'Corvus corone', 'Carrion Crow',
  '참새목', '까마귀과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  50,
  '농경지, 산지, 도시 주변에서 무엇이든 먹는 잡식성으로 사람의 도구 사용 행동을 모방한다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '까마귀는 차도 위에 호두를 놓아 자동차로 깨는 도구 사용 행동을 스스로 개발한 지능적인 새입니다'),

('KR-063', 'ioc14-cor-mac', '큰부리까마귀', 'Corvus macrorhynchos', 'Large-billed Crow',
  '참새목', '까마귀과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  57,
  '도시, 산지, 농경지에서 까마귀보다 큰 부리로 더 단단한 먹이도 처리하며 서식한다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '큰부리까마귀는 죽은 동료를 둘러싸고 수 분간 조용히 서 있는 행동이 관찰되어 "장례" 문화가 있다는 주장도 있습니다'),

('KR-064', 'ioc14-chl-sin', '방울새', 'Chloris sinica', 'Oriental Greenfinch',
  '참새목', '되새과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  14,
  '산지 숲 가장자리와 농경지에서 풀씨를 먹으며 겨울에는 무리지어 먹이를 찾는다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '방울새 수컷은 봄에 나무 꼭대기에서 날갯짓을 하며 공중에 떠서 구애 노래를 부릅니다'),

('KR-065', 'ioc14-cor-cor-2', '왜가리', 'Ardea cinerea', 'Grey Heron',
  '사다새목', '왜가리과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  98,
  '하천, 호수, 논, 해안 등 물가 어디서나 흔히 볼 수 있는 대형 텃새이다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '왜가리는 물가에 꼼짝 않고 서서 최대 30분을 기다리다 순식간에 부리로 물고기를 낚아챕니다'),

('KR-066', 'ioc14-bub-ibe', '중대백로', 'Ardea alba', 'Great Egret',
  '사다새목', '왜가리과', 'common', 3, 1,
  1, FALSE, NULL, 'LC',
  90,
  '논, 하천, 습지에서 왜가리와 함께 물고기와 개구리를 사냥하는 흰색 대형 왜가리이다',
  '{"jan":true,"feb":true,"mar":true,"apr":true,"may":true,"jun":true,"jul":true,"aug":true,"sep":true,"oct":true,"nov":true,"dec":true}',
  '중대백로는 번식기에 등에 길고 가는 장식 깃털이 자라 과거 유럽 모자 장식으로 남획되어 멸종 위기에 처했습니다');

COMMIT;

-- DOWN
BEGIN;
DELETE FROM species WHERE species_id IN (
  'KR-001','KR-002','KR-003','KR-004','KR-005','KR-006','KR-007',
  'KR-008','KR-009','KR-010','KR-011','KR-012','KR-013','KR-014',
  'KR-020','KR-021','KR-022','KR-023','KR-024',
  'KR-030','KR-031','KR-032','KR-033','KR-034','KR-035','KR-036',
  'KR-037','KR-038','KR-039','KR-040','KR-041','KR-042','KR-043',
  'KR-050','KR-051','KR-052','KR-053','KR-054','KR-055','KR-056',
  'KR-057','KR-058','KR-059','KR-060','KR-061','KR-062','KR-063',
  'KR-064','KR-065','KR-066'
);
COMMIT;
