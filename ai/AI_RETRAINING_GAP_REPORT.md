# AI Retraining Gap Report

생성일: 2026-04-12

## 요약

- 목표 종 수: `300`
- 현재 학습 종 수: `141`
- 누락 종 수: `159`
- 현재 커버리지: `47.0%`
- 현재 eval top-1 accuracy: `0.625`
- 현재 eval top-5 accuracy: `0.8991477489471436`
- 목표 미달 train class 수(`< 150`): `127`
- val split 없는 class 수: `35`
- test split 없는 class 수: `17`

## 판단

- 현재 모델은 `300종 출시 기준`을 만족하지 못한다.
- 가장 큰 갭은 `정확도`보다 먼저 `학습 커버리지 부족`이다.
- 현재 재학습 트랙의 1차 목표는 `159개 누락 종`을 학습 입력에 편입하는 것이다.
- 그 다음 목표는 기존 141개 학습 종도 `class별 최소 장수`와 `val/test 분리 품질`을 재정비하는 것이다.

## 우선 액션

1. `missing_species` 159종부터 데이터 수집 큐 생성
2. 현재 141종 중 low-shot class 보강
3. `species_map_full.json`을 기준으로 재수집/전처리/TFRecord를 다시 생성
4. `v1.1.0` 재학습 후 전체 top-1/top-3와 confusion report 재평가

## 누락 종 샘플 30개

| species_id | name_ko | name_sci | train | val | test | total |
|---|---|---|---:|---:|---:|---:|
| KR-001 | 황새 | Ciconia boyciana | 0 | 0 | 0 | 0 |
| KR-004 | 두루미 | Grus japonensis | 0 | 0 | 0 | 0 |
| KR-005 | 재두루미 | Antigone vipio | 0 | 0 | 0 | 0 |
| KR-006 | 흑두루미 | Grus monacha | 0 | 0 | 0 | 0 |
| KR-007 | 저어새 | Platalea minor | 0 | 0 | 0 | 0 |
| KR-010 | 검독수리 | Aquila chrysaetos | 0 | 0 | 0 | 0 |
| KR-020 | 넓적부리도요 | Calidris pygmaea | 0 | 0 | 0 | 0 |
| KR-021 | 황다리도요 | Tringa guttifer | 0 | 0 | 0 | 0 |
| KR-022 | 노랑부리백로 | Egretta eulophotes | 0 | 0 | 0 | 0 |
| KR-023 | 검은머리갈매기 | Ichthyaetus saundersi | 0 | 0 | 0 | 0 |
| KR-024 | 알락꼬리마도요 | Numenius madagascariensis | 0 | 0 | 0 | 0 |
| KR-030 | 큰기러기 | Anser fabalis | 0 | 0 | 0 | 0 |
| KR-033 | 호반새 | Halcyon coromanda | 0 | 0 | 0 | 0 |
| KR-034 | 청호반새 | Halcyon pileata | 0 | 0 | 0 | 0 |
| KR-037 | 꾀꼬리 | Oriolus chinensis | 0 | 0 | 0 | 0 |
| KR-038 | 흰눈썹황금새 | Ficedula zanthopygia | 0 | 0 | 0 | 0 |
| KR-043 | 흰배지빠귀 | Turdus pallidus | 0 | 0 | 0 | 0 |
| KR-051 | 까치 | Pica serica | 0 | 0 | 0 | 0 |
| KR-054 | 붉은머리오목눈이 | Sinosuthora webbiana | 0 | 0 | 0 | 0 |
| KR-055 | 딱새 | Phoenicurus auroreus | 0 | 0 | 0 | 0 |
| KR-056 | 직박구리 | Hypsipetes amaurotis | 0 | 0 | 0 | 0 |
| KR-058 | 곤줄박이 | Sittiparus varius | 0 | 0 | 0 | 0 |
| KR-061 | 멧비둘기 | Streptopelia orientalis | 0 | 0 | 0 | 0 |
| KR-063 | 큰부리까마귀 | Corvus macrorhynchos | 0 | 0 | 0 | 0 |
| KR-064 | 방울새 | Chloris sinica | 0 | 0 | 0 | 0 |
| KR-101 | 참수리 | Haliaeetus pelagicus | 0 | 0 | 0 | 0 |
| KR-103 | 가창오리 | Sibirionetta formosa | 0 | 0 | 0 | 0 |
| KR-105 | 흰이마기러기 | Anser erythropus | 0 | 0 | 0 | 0 |
| KR-106 | 흑비오리 | Mergus squamatus | 0 | 0 | 0 | 0 |
| KR-107 | 뿔쇠오리 | Synthliboramphus wumizusume | 0 | 0 | 0 | 0 |

## 학습되었지만 train 장수가 낮은 종 25개

| species_id | name_ko | name_sci | train | val | test | total |
|---|---|---|---:|---:|---:|---:|
| KR-002 | 고니 | Cygnus columbianus | 10 | 0 | 0 | 10 |
| KR-040 | 중부리도요 | Numenius phaeopus | 10 | 0 | 0 | 10 |
| KR-123 | 바다비오리 | Mergus serrator | 10 | 0 | 0 | 10 |
| KR-124 | 흰비오리 | Mergus albellus | 10 | 0 | 0 | 10 |
| KR-131 | 큰논병아리 | Podiceps grisegena | 10 | 0 | 0 | 10 |
| KR-135 | 황로 | Bubulcus ibis | 10 | 0 | 0 | 10 |
| KR-158 | 댕기쇠오리 | Netta rufina | 10 | 0 | 0 | 10 |
| KR-192 | 비둘기매 | Falco columbarius | 10 | 0 | 0 | 10 |
| KR-202 | 검은딱새 | Saxicola maurus | 10 | 0 | 0 | 10 |
| KR-262 | 쇠제비갈매기 | Sternula albifrons | 10 | 0 | 0 | 10 |
| KR-269 | 검은머리물떼새 | Haematopus ostralegus | 10 | 0 | 0 | 10 |
| KR-271 | 뒷부리장다리물떼새 | Recurvirostra avosetta | 10 | 0 | 0 | 10 |
| KR-274 | 큰부리제비갈매기 | Hydroprogne caspia | 10 | 0 | 0 | 10 |
| KR-276 | 검은제비갈매기 | Chlidonias niger | 10 | 0 | 0 | 10 |
| KR-277 | 종다리도요 | Calidris temminckii | 10 | 0 | 0 | 10 |
| KR-288 | 쇠황조롱이 | Falco columbarius | 10 | 0 | 0 | 10 |
| KR-311 | 솔잣새 | Loxia curvirostra | 10 | 0 | 0 | 10 |
| KR-008 | 독수리 | Aegypius monachus | 10 | 0 | 1 | 11 |
| KR-009 | 흰꼬리수리 | Haliaeetus albicilla | 10 | 0 | 1 | 11 |
| KR-014 | 원앙 | Aix galericulata | 10 | 0 | 1 | 11 |
| KR-039 | 쇠솔새 | Phylloscopus inornatus | 10 | 0 | 1 | 11 |
| KR-116 | 고방오리 | Anas acuta | 10 | 0 | 1 | 11 |
| KR-125 | 흰뺨오리 | Bucephala clangula | 10 | 0 | 1 | 11 |
| KR-132 | 해오라기 | Nycticorax nycticorax | 10 | 0 | 1 | 11 |
| KR-178 | 쇠부엉이 | Asio flammeus | 10 | 0 | 1 | 11 |

## val split이 없는 종 25개

| species_id | name_ko | name_sci | train | val | test | total |
|---|---|---|---:|---:|---:|---:|
| KR-002 | 고니 | Cygnus columbianus | 10 | 0 | 0 | 10 |
| KR-040 | 중부리도요 | Numenius phaeopus | 10 | 0 | 0 | 10 |
| KR-123 | 바다비오리 | Mergus serrator | 10 | 0 | 0 | 10 |
| KR-124 | 흰비오리 | Mergus albellus | 10 | 0 | 0 | 10 |
| KR-131 | 큰논병아리 | Podiceps grisegena | 10 | 0 | 0 | 10 |
| KR-135 | 황로 | Bubulcus ibis | 10 | 0 | 0 | 10 |
| KR-158 | 댕기쇠오리 | Netta rufina | 10 | 0 | 0 | 10 |
| KR-192 | 비둘기매 | Falco columbarius | 10 | 0 | 0 | 10 |
| KR-202 | 검은딱새 | Saxicola maurus | 10 | 0 | 0 | 10 |
| KR-262 | 쇠제비갈매기 | Sternula albifrons | 10 | 0 | 0 | 10 |
| KR-269 | 검은머리물떼새 | Haematopus ostralegus | 10 | 0 | 0 | 10 |
| KR-271 | 뒷부리장다리물떼새 | Recurvirostra avosetta | 10 | 0 | 0 | 10 |
| KR-274 | 큰부리제비갈매기 | Hydroprogne caspia | 10 | 0 | 0 | 10 |
| KR-276 | 검은제비갈매기 | Chlidonias niger | 10 | 0 | 0 | 10 |
| KR-277 | 종다리도요 | Calidris temminckii | 10 | 0 | 0 | 10 |
| KR-288 | 쇠황조롱이 | Falco columbarius | 10 | 0 | 0 | 10 |
| KR-311 | 솔잣새 | Loxia curvirostra | 10 | 0 | 0 | 10 |
| KR-008 | 독수리 | Aegypius monachus | 10 | 0 | 1 | 11 |
| KR-009 | 흰꼬리수리 | Haliaeetus albicilla | 10 | 0 | 1 | 11 |
| KR-014 | 원앙 | Aix galericulata | 10 | 0 | 1 | 11 |
| KR-039 | 쇠솔새 | Phylloscopus inornatus | 10 | 0 | 1 | 11 |
| KR-116 | 고방오리 | Anas acuta | 10 | 0 | 1 | 11 |
| KR-125 | 흰뺨오리 | Bucephala clangula | 10 | 0 | 1 | 11 |
| KR-132 | 해오라기 | Nycticorax nycticorax | 10 | 0 | 1 | 11 |
| KR-178 | 쇠부엉이 | Asio flammeus | 10 | 0 | 1 | 11 |

## test split이 없는 종 25개

| species_id | name_ko | name_sci | train | val | test | total |
|---|---|---|---:|---:|---:|---:|
| KR-002 | 고니 | Cygnus columbianus | 10 | 0 | 0 | 10 |
| KR-040 | 중부리도요 | Numenius phaeopus | 10 | 0 | 0 | 10 |
| KR-123 | 바다비오리 | Mergus serrator | 10 | 0 | 0 | 10 |
| KR-124 | 흰비오리 | Mergus albellus | 10 | 0 | 0 | 10 |
| KR-131 | 큰논병아리 | Podiceps grisegena | 10 | 0 | 0 | 10 |
| KR-135 | 황로 | Bubulcus ibis | 10 | 0 | 0 | 10 |
| KR-158 | 댕기쇠오리 | Netta rufina | 10 | 0 | 0 | 10 |
| KR-192 | 비둘기매 | Falco columbarius | 10 | 0 | 0 | 10 |
| KR-202 | 검은딱새 | Saxicola maurus | 10 | 0 | 0 | 10 |
| KR-262 | 쇠제비갈매기 | Sternula albifrons | 10 | 0 | 0 | 10 |
| KR-269 | 검은머리물떼새 | Haematopus ostralegus | 10 | 0 | 0 | 10 |
| KR-271 | 뒷부리장다리물떼새 | Recurvirostra avosetta | 10 | 0 | 0 | 10 |
| KR-274 | 큰부리제비갈매기 | Hydroprogne caspia | 10 | 0 | 0 | 10 |
| KR-276 | 검은제비갈매기 | Chlidonias niger | 10 | 0 | 0 | 10 |
| KR-277 | 종다리도요 | Calidris temminckii | 10 | 0 | 0 | 10 |
| KR-288 | 쇠황조롱이 | Falco columbarius | 10 | 0 | 0 | 10 |
| KR-311 | 솔잣새 | Loxia curvirostra | 10 | 0 | 0 | 10 |
