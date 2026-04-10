# Species DB 스펙 — Batch 2~5 (나머지 250종)

## 목적
한국 조류 300종 시드 데이터 중 Batch 1(50종)에서 누락된 나머지 250종을 생성한다.

## 참조 파일 (반드시 읽을 것)
- `db/migrations/20260404_000001_create_species_table.sql` — 테이블 스키마
- `db/migrations/20260404_000002_seed_species_batch1.sql` — Batch 1 예시 (형식 동일하게)

## 출력 파일
아래 4개 파일을 각각 생성한다:
- `db/migrations/20260404_000003_seed_species_batch2_waterfowl.sql` — 수조류 (약 60종)
- `db/migrations/20260404_000004_seed_species_batch3_raptors_forest.sql` — 맹금류+산림조류 (약 65종)
- `db/migrations/20260404_000005_seed_species_batch4_shorebirds.sql` — 도요·물떼새·갈매기류 (약 60종)
- `db/migrations/20260404_000006_seed_species_batch5_passerines.sql` — 참새목 소형조류 (약 65종)

## 이미 사용된 species_id (중복 금지)
KR-001~014 (천연기념물), KR-020~024 (희귀종), KR-030~043 (나그네새), KR-050~066 (텃새)

## species_id 배정 규칙
- Batch 2: KR-101~KR-160
- Batch 3: KR-161~KR-225
- Batch 4: KR-226~KR-285
- Batch 5: KR-286~KR-350 (300종 초과 여유분 포함)

## SQL 형식 (Batch 1과 동일)

```sql
-- Migration: {설명}
-- Date: 2026-04-04

-- UP
BEGIN;

INSERT INTO species (species_id, ioc_taxon_id, name_ko, name_sci, name_en,
  order_ko, family_ko, rarity_tier, sensitivity_tier, points,
  aba_code, is_locked_free, cultural_heritage_no, iucn_status,
  size_cm, habitat_ko, seasonal_presence, fun_fact_ko)
VALUES
( ... ),
( ... );

COMMIT;

-- DOWN
BEGIN;
DELETE FROM species WHERE species_id IN (...);
COMMIT;
```

## 희귀도 규칙 (반드시 준수)

| rarity_tier | points | is_locked_free | sensitivity_tier | 비고 |
|------------|--------|----------------|-----------------|------|
| common     | 1      | FALSE          | 3               | 연중 상주 텃새 |
| migrant    | 3      | FALSE (대부분)  | 3               | 계절성 방문 |
| rare       | 10     | TRUE           | 2 또는 3        | IUCN VU 이상이면 2 |
| legendary  | 25     | TRUE           | 1               | 문화재청 지정 |

## seasonal_presence 형식
12개 키 필수: `{"jan":true/false,"feb":true/false,...,"dec":true/false}`
- 연중 텃새: 12개 모두 true
- 여름철새: apr~sep = true, 나머지 false
- 겨울철새: oct~mar = true, apr~sep = false
- 봄/가을 나그네새: mar~may + aug~oct = true, 나머지 false

## 데이터 정확성 규칙
1. 학명은 IOC World Bird List v14.x 기준
2. 한국명은 NIBR 한국 조류 체크리스트 기준
3. 천연기념물 번호가 불확실하면 주석으로 `-- ※ 문화재청 재확인 필요` 표시
4. IUCN 상태 모를 경우 'LC'로 기본값, 주석으로 표시
5. size_cm 모를 경우 NULL 허용
6. fun_fact_ko는 반드시 한국어 1문장, 생동감 있게 작성

---

## Batch 2: 수조류 (KR-101~KR-160)

### 추가 천연기념물 수조류
- 참수리 (Haliaeetus pelagicus) — ※ 번호 재확인
- 노랑부리저어새 (Platalea leucorodia)
- 혹고니 (Cygnus olor)
- 가창오리 (Sibirionetta formosa) — IUCN NT, 희귀종
- 검은목두루미 (Grus grus) — 한국 드문 겨울철새, rare

### 오리과 (Anatidae) 나그네새/겨울철새
- 흰뺨검둥오리 (Anas zonorhyncha) — 텃새/나그네새
- 청둥오리 (Anas platyrhynchos) — 겨울철새
- 발구지 (Anas crecca) — 겨울철새 (쇠오리)
- 넓적부리 (Spatula clypeata) — 겨울철새
- 고방오리 (Anas acuta) — 겨울철새
- 알락오리 (Mareca strepera) — 겨울철새 (Gadwall)
- 홍머리오리 (Mareca penelope) — 겨울철새 (Eurasian Wigeon)
- 흰죽지 (Aythya ferina) — 겨울철새
- 댕기흰죽지 (Aythya fuligula) — 겨울철새
- 검은머리흰죽지 (Aythya marila) — 겨울철새
- 비오리 (Mergus merganser) — 겨울철새
- 바다비오리 (Mergus serrator) — 겨울철새
- 흰비오리 (Mergus albellus) — 겨울철새 (Smew)
- 흰뺨오리 (Bucephala clangula) — 겨울철새
- 검둥오리 (Melanitta americana) — 겨울 해안
- 두루미오리 (희귀, 나그네새)

### 왜가리과 (Ardeidae)
- 해오라기 (Nycticorax nycticorax) — 여름철새 (Black-crowned Night Heron)
- 왜가리 (Ardea cinerea) — 이미 포함됨, 스킵
- 중백로 (Ardea intermedia) — 여름철새 (Intermediate Egret)
- 쇠백로 (Egretta garzetta) — 여름철새 (Little Egret)
- 황로 (Bubulcus ibis) — 여름철새 (Cattle Egret)
- 흰날개해오라기 (Ardeola bacchus) — 여름철새 (Chinese Pond Heron)
- 덤불해오라기 (Ixobrychus sinensis) — 여름철새
- 알락해오라기 (Botaurus stellaris) — 희귀 나그네새/겨울철새

### 기타 수조류
- 논병아리 (Tachybaptus ruficollis) — 텃새 (Little Grebe)
- 뿔논병아리 (Podiceps cristatus) — 겨울철새 (Great Crested Grebe)
- 검은목논병아리 (Podiceps nigricollis) — 겨울철새
- 가마우지 (Phalacrocorax capillatus) — 텃새 (Japanese Cormorant)
- 민물가마우지 (Microcarbo niger) — 텃새 (Little Cormorant)
- 사다새 (Pelecanus philippensis) — 희귀 나그네새
- 저어새 — 이미 포함
- 큰고니, 두루미 등 — 이미 포함
- 큰논병아리 (Podiceps grisegena) — 겨울철새
- 물닭 (Fulica atra) — 겨울철새/텃새 (Eurasian Coot)
- 쇠물닭 (Gallinula chloropus) — 텃새 (Common Moorhen)
- 물꿩 (Hydrophasianus chirurgus) — 희귀 여름철새
- 두루미 → 이미 포함

---

## Batch 3: 맹금류 + 산림조류 (KR-161~KR-225)

### 추가 맹금류 (수리목/매목)
- 솔개 (Milvus migrans) — 텃새/겨울철새 (Black Kite) ※ 천연기념물 여부 확인
- 새호리기 (Falco subbuteo) — 나그네새 (Eurasian Hobby)
- 비둘기조롱이 (Accipiter soloensis) — 나그네새 (Chinese Sparrowhawk)
- 새매 (Accipiter nisus) — 겨울철새 (Eurasian Sparrowhawk)
- 참매 (Accipiter gentilis) — 텃새 (Northern Goshawk) ※ 천연기념물 여부
- 말똥가리 (Buteo japonicus) — 겨울철새 (Eastern Buzzard)
- 큰말똥가리 (Buteo hemilasius) — 겨울철새 (Upland Buzzard)
- 흰꼬리수리 — 이미 포함
- 조롱이 (Accipiter gularis) — 나그네새 (Japanese Sparrowhawk)
- 흑수리 (Aquila clanga) — 희귀 겨울철새 (Greater Spotted Eagle) IUCN VU
- 물수리 (Pandion haliaetus) — 나그네새 (Osprey)
- 흑비둘기 (Columba jouyi) — 희귀종 (Ryukyu Pigeon, extinct/CR)
- 솔부엉이 (Ninox japonica) — 여름철새 (Northern Boobook)
- 쇠부엉이 (Asio flammeus) — 겨울철새 (Short-eared Owl)
- 칡부엉이 (Asio otus) — 겨울철새 (Long-eared Owl)
- 올빼미 (Strix uralensis) — 텃새 (Ural Owl)
- 소쩍새 (Otus sunia) — 여름철새 (Oriental Scops Owl)

### 딱따구리목 (Piciformes)
- 청딱따구리 (Picus canus) — 텃새 (Grey-headed Woodpecker)
- 오색딱따구리 (Dendrocopos major) — 텃새 (Great Spotted Woodpecker)
- 쇠딱따구리 (Yungipicus kizuki) — 텃새 (Japanese Pygmy Woodpecker)
- 큰오색딱따구리 (Dendrocopos leucotos) — 텃새 (White-backed Woodpecker)
- 까막딱따구리 (Dryocopus martius) — 텃새 (Black Woodpecker)
- 크낙새 (Dryocopus javensis) — 천연기념물/CR/한국 절멸 위기
- 개미잡이 (Jynx torquilla) — 나그네새 (Eurasian Wryneck)

### 파랑새목 (Coraciiformes) 추가
- 파랑새 (Eurystomus orientalis) — 여름철새 (Oriental Dollarbird)
- 후투티 (Upupa epops) — 나그네새 (Eurasian Hoopoe)

### 제비목, 기타 비참새목
- 칼새 (Apus apus) — 여름철새 (Common Swift)
- 바늘꼬리칼새 (Hirundapus caudacutus) — 나그네새 (White-throated Needletail)
- 쏙독새 (Caprimulgus jotaka) — 여름철새 (Gray Nightjar)
- 비둘기목 추가
  - 양비둘기 (Columba rupestris) — 텃새 (Hill Pigeon)
  - 흑비둘기 — 희귀/절멸 위기

---

## Batch 4: 도요·물떼새·갈매기류 (KR-226~KR-285)

### 물떼새과 (Charadriidae)
- 꼬마물떼새 (Charadrius dubius) — 여름철새 (Little Ringed Plover)
- 흰물떼새 (Charadrius alexandrinus) — 나그네새 (Kentish Plover)
- 왕눈물떼새 (Charadrius mongolus) — 나그네새 (Lesser Sand Plover)
- 큰왕눈물떼새 (Charadrius leschenaultii) — 나그네새 (Greater Sand Plover)
- 댕기물떼새 (Vanellus vanellus) — 겨울철새 (Northern Lapwing)
- 개꿩 (Pluvialis squatarola) — 나그네새 (Grey Plover)
- 금빛물떼새 (Pluvialis fulva) — 나그네새 (Pacific Golden Plover)
- 검은가슴물떼새 (Pluvialis apricaria) — 나그네새 (European Golden Plover) 희귀
- 흰목물떼새 (Charadrius placidus) — 텃새/여름철새

### 도요과 (Scolopacidae)
- 청다리도요 (Tringa nebularia) — 나그네새 (Common Greenshank)
- 삑삑도요 (Actitis hypoleucos) — 나그네새 (Common Sandpiper)
- 깝작도요 (Actitis hypoleucos) — 나그네새 참고, 다름 주의
- 민물도요 (Calidris alpina) — 나그네새 (Dunlin)
- 좀도요 (Calidris subminuta) — 나그네새 (Long-toed Stint)
- 메추라기도요 (Calidris acuminata) — 나그네새 (Sharp-tailed Sandpiper)
- 붉은가슴도요 (Calidris canutus) — 나그네새 (Red Knot)
- 세가락도요 (Calidris alba) — 나그네새 (Sanderling)
- 뒷부리도요 (Xenus cinereus) — 나그네새 (Terek Sandpiper)
- 꺅도요 (Gallinago gallinago) — 겨울철새 (Common Snipe)
- 큰꺅도요 (Gallinago hardwickii) — 나그네새 (Latham's Snipe)
- 도요 (Scolopax rusticola) — 겨울철새 (Eurasian Woodcock)
- 마도요 (Numenius arquata) — 나그네새 (Eurasian Curlew)
- 큰뒷부리도요 (Limosa lapponica) — 나그네새 (Bar-tailed Godwit)
- 큰도요 (Limosa limosa) — 나그네새 (Black-tailed Godwit)
- 지느러미발도요 (Phalaropus lobatus) — 나그네새 (Red-necked Phalarope)

### 갈매기과 (Laridae)
- 재갈매기 (Larus argentatus) — 겨울철새 (European Herring Gull)
- 큰재갈매기 (Larus cachinnans) — 겨울철새 (Caspian Gull) 
- 한국재갈매기 (Larus vegae) — 겨울철새 (Vega Gull)
- 괭이갈매기 (Larus crassirostris) — 텃새 (Black-tailed Gull)
- 붉은부리갈매기 (Chroicocephalus ridibundus) — 겨울철새 (Black-headed Gull)
- 쇠갈매기 (Hydrocoloeus minutus) — 나그네새 (Little Gull)
- 갈매기 (Larus canus) — 겨울철새 (Common Gull / Mew Gull)
- 흰갈매기 (Larus hyperboreus) — 희귀 겨울철새 (Glaucous Gull)
- 제비갈매기 (Sterna hirundo) — 여름철새 (Common Tern)
- 쇠제비갈매기 (Sternula albifrons) — 여름철새 (Little Tern)
- 큰제비갈매기 (Thalasseus bergii) — 나그네새 (Greater Crested Tern)
- 검은머리갈매기 — 이미 포함
- 도둑갈매기 (Stercorarius parasiticus) — 나그네새/희귀 (Parasitic Jaeger)

---

## Batch 5: 참새목 소형조류 (KR-286~KR-350)

### 지빠귀과 (Turdidae)
- 호랑지빠귀 (Zoothera aurea) — 나그네새 (White's Thrush)
- 되지빠귀 (Turdus hortulorum) — 나그네새 (Grey-backed Thrush)
- 개똥지빠귀 (Turdus eunomus) — 겨울철새 (Dusky Thrush)
- 노랑지빠귀 (Turdus naumanni) — 겨울철새 (Naumann's Thrush)
- 검은지빠귀 (Turdus merula) — 드문 나그네새 (Eurasian Blackbird)
- 흰눈썹지빠귀 (Turdus obscurus) — 나그네새 (Eyebrowed Thrush)

### 딱새과 (Muscicapidae)
- 울새 (Luscinia sibilans) — 나그네새 (Rufous-tailed Robin)
- 진홍가슴 (Luscinia svecica) — 나그네새 (Bluethroat)
- 유리딱새 (Tarsiger cyanurus) — 나그네새 (Red-flanked Bluetail)
- 검은딱새 (Saxicola maurus) — 나그네새 (Siberian Stonechat)
- 황금새 (Ficedula narcissina) — 나그네새 (Narcissus Flycatcher)
- 큰유리새 (Cyanoptila cyanomelana) — 나그네새 (Blue-and-white Flycatcher)
- 솔딱새 (Muscicapa griseisticta) — 나그네새 (Grey-streaked Flycatcher)
- 쇠솔딱새 (Muscicapa sibirica) — 나그네새 (Dark-sided Flycatcher)
- 왜가리딱새 — 주의 (왜가리와 혼동 금지)
- 바다직박구리 (Monticola solitarius) — 텃새 (Blue Rock Thrush)

### 솔새과 (Phylloscopidae)
- 산솔새 (Phylloscopus coronatus) — 나그네새 (Eastern Crowned Warbler)
- 되솔새 (Phylloscopus borealis) — 나그네새 (Arctic Warbler)
- 노랑눈썹솔새 — 이미 포함 (쇠솔새)
- 두견솔새 (Phylloscopus tenellipes) — 나그네새 (Pale-legged Leaf Warbler)
- 흰눈썹솔새 (Phylloscopus humei) — 나그네새 (Hume's Leaf Warbler)

### 휘파람새과 (Cettiidae/Acrocephalidae)
- 휘파람새 (Horornis diphone) — 여름철새 (Japanese Bush Warbler)
- 개개비 (Acrocephalus orientalis) — 여름철새 (Oriental Reed Warbler)
- 쇠개개비 (Acrocephalus bistrigiceps) — 여름철새 (Black-browed Reed Warbler)
- 큰개개비 (Acrocephalus arundinaceus) — 여름철새 (Great Reed Warbler)
- 섬개개비 (Locustella pleskei) — 희귀종 (Styan's Grasshopper Warbler) IUCN VU

### 박새과 (Paridae) 추가
- 진박새 (Periparus ater) — 텃새 (Coal Tit)
- 쇠박새 (Poecile palustris) — 텃새 (Marsh Tit)
- 북방쇠박새 (Poecile montanus) — 텃새 (Willow Tit)
- 청박새 (Cyanistes cyanus) — 드문 겨울철새 (Azure Tit)

### 기타 참새목
- 숲새 (Urosphena squameiceps) — 나그네새 (Asian Stubtail)
- 뱁새 (Zosterops japonicus) — 텃새 (Japanese White-eye)
- 동고비 (Sitta europaea) — 텃새 (Eurasian Nuthatch)
- 상모솔새 (Regulus regulus) — 겨울철새/나그네새 (Goldcrest)
- 굴뚝새 (Troglodytes troglodytes) — 텃새 (Eurasian Wren)
- 노랑턱멧새 (Emberiza elegans) — 텃새 (Yellow-throated Bunting)
- 촉새 (Emberiza spodocephala) — 겨울철새 (Masked Bunting)
- 쑥새 (Emberiza rustica) — 겨울철새 (Rustic Bunting)
- 검은머리쑥새 (Emberiza aureola) — 나그네새 (Yellow-breasted Bunting) IUCN CR
- 흰배멧새 (Emberiza pallasi) — 겨울철새 (Pallas's Reed Bunting)
- 노랑지빠귀 → 이미 지빠귀과에 포함
- 찌르레기 (Spodiopsar cineraceus) — 여름철새 (White-cheeked Starling)
- 북방쇠찌르레기 (Agropsar philippensis) — 나그네새 (Chestnut-cheeked Starling)
- 황여새 (Bombycilla garrulus) — 겨울철새 (Bohemian Waxwing) — 불규칙 방문
- 홍여새 (Bombycilla japonica) — 겨울철새 (Japanese Waxwing)
- 콩새 (Coccothraustes coccothraustes) — 겨울철새 (Hawfinch)
- 멋쟁이새 (Pyrrhula pyrrhula) — 겨울철새 (Eurasian Bullfinch)
- 양진이 (Carpodacus roseus) — 겨울철새 (Pallas's Rosefinch)
- 솔잣새 (Loxia curvirostra) — 불규칙 겨울철새 (Red Crossbill)
- 흰눈썹황금새 — 이미 포함
- 노랑할미새 — 이미 포함
- 긴발톱할미새 (Anthus richardi) — 나그네새 (Richard's Pipit)
- 밭종다리 (Anthus godlewskii) — 겨울철새 (Blyth's Pipit)
- 논종다리 (Anthus spinoletta) — 겨울철새 (Water Pipit)
- 종다리 (Alauda arvensis) — 텃새/겨울철새 (Eurasian Skylark)
- 쇠종다리 (Calandrella brachydactyla) — 나그네새 (Greater Short-toed Lark) 희귀
- 히스꾀꼬리 (희귀)

### 할미새과/기타
- 알락할미새 (Motacilla yarrellii) — 나그네새 (Pied Wagtail) 희귀
- 긴발톱할미새
- 검은등할미새 (Motacilla lugens) — 겨울철새 (White Wagtail subspecies)

---

## 중요 주의사항

1. **ioc_taxon_id**: `ioc14-{family abbreviation}-{species abbreviation}` 형식, 예: `ioc14-ans-fab`
2. **천연기념물**: 번호 확실한 것만 기입, 불확실하면 `-- ※ 재확인 필요` 주석 추가
3. **fun_fact_ko**: 각 종마다 흥미로운 한국어 1문장, 절대 영어 사용 금지
4. **habitat_ko**: 한국 내 실제 서식지 묘사, 한국어
5. **IUCN CR/EN/VU 종**: sensitivity_tier = 2 설정
6. **총 목표**: 250종 추가하여 Batch 1 포함 총 300종 달성
7. **DOWN 섹션**: 각 배치 파일 마지막에 DELETE 포함

## 검증
파일 생성 후 확인:
- 각 INSERT의 seasonal_presence JSON에 12개 키(jan~dec) 모두 존재하는지
- species_id 중복 없는지
- legendary 종의 is_locked_free = TRUE인지
- points가 티어와 일치하는지 (common=1, migrant=3, rare=10, legendary=25)
