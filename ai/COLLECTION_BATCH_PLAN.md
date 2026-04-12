# Collection Batch Plan

생성일: 2026-04-12

## Source Order

1. `iNaturalist KR`를 메인 수집원으로 사용
2. `GBIF`를 보조 수집원으로 사용
3. 그래도 부족한 종만 `manual curation`로 보완

## Batch Summary

- P0 species: `159` / batches: `7`
- P1 species: `105` / batches: `5`
- P2 species: `22` / batches: `1`
- P3 species: `14` / batches: `1`

## Immediate Execution Order

1. P0 batches 전체를 `iNaturalist KR`로 먼저 시도
2. P0에서 `raw 0` 유지 종은 `GBIF` fallback 큐로 이동
3. P1 batches로 넘어가 low-shot class를 top-up
4. P2/P3는 full rebuild 후 추가 라운드로 진행

### P0-B01

- species: `25`
- total raw deficit to pipeline floor: `5000`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-001 | 황새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-004 | 두루미 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-005 | 재두루미 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-006 | 흑두루미 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-007 | 저어새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-010 | 검독수리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-020 | 넓적부리도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-021 | 황다리도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-022 | 노랑부리백로 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-023 | 검은머리갈매기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-024 | 알락꼬리마도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-030 | 큰기러기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-033 | 호반새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-034 | 청호반새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-037 | 꾀꼬리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-038 | 흰눈썹황금새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-043 | 흰배지빠귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-051 | 까치 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-054 | 붉은머리오목눈이 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-055 | 딱새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-056 | 직박구리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-058 | 곤줄박이 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-061 | 멧비둘기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-063 | 큰부리까마귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-064 | 방울새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |

### P0-B02

- species: `25`
- total raw deficit to pipeline floor: `5000`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-101 | 참수리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-103 | 가창오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-105 | 흰이마기러기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-106 | 흑비오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-107 | 뿔쇠오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-108 | 물꿩 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-112 | 사다새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-121 | 검은머리흰죽지 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-122 | 비오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-126 | 검둥오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-133 | 중백로 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-136 | 흰날개해오라기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-137 | 덤불해오라기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-138 | 큰덤불해오라기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-140 | 흑기러기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-141 | 뜸부기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-142 | 슴새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-143 | 바다쇠오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-144 | 아비 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-146 | 흰뺨검둥오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-148 | 가마우지 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-152 | 쇠가마우지 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-153 | 쇠뜸부기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-154 | 흰줄박이오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-155 | 바다오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |

### P0-B03

- species: `25`
- total raw deficit to pipeline floor: `5000`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-156 | 흰기러기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-157 | 흰눈썹오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-159 | 흰뺨오리사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-160 | 쇠흰뺨오리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-161 | 크낙새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-166 | 올빼미 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-167 | 흑비둘기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-168 | 아무르매 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-169 | 흰배바다수리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-170 | 솔부엉이 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-171 | 까막딱따구리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-173 | 비둘기조롱이 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-174 | 조롱이 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-176 | 말똥가리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-177 | 큰말똥가리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-180 | 소쩍새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-182 | 파랑새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-185 | 바늘꼬리칼새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-186 | 쏙독새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-188 | 큰오색딱따구리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-189 | 양비둘기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-190 | 두견이 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-191 | 벙어리뻐꾸기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-194 | 매사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-195 | 개구리매 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |

### P0-B04

- species: `25`
- total raw deficit to pipeline floor: `5000`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-197 | 쇠딱따구리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-199 | 찌르레기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-200 | 검은지빠귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-201 | 개똥지빠귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-203 | 바다직박구리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-204 | 울새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-205 | 유리딱새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-206 | 황금새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-207 | 큰유리새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-208 | 솔딱새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-209 | 쇠솔딱새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-210 | 흰눈썹딱새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-214 | 두견이사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-215 | 노랑지빠귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-216 | 흰눈썹지빠귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-217 | 되지빠귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-218 | 호랑지빠귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-222 | 북방쇠박새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-223 | 뱁새(동박새) | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-224 | 붉은부리찌르레기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-225 | 청박새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-228 | 붉은가슴도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-229 | 도둑갈매기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-234 | 왕눈물떼새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-235 | 큰왕눈물떼새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |

### P0-B05

- species: `25`
- total raw deficit to pipeline floor: `5000`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-238 | 금빛물떼새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-239 | 흰목물떼새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-243 | 좀도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-244 | 메추라기도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-246 | 뒷부리도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-248 | 큰꺅도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-251 | 지느러미발도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-255 | 쇠부리도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-256 | 재갈매기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-260 | 흰갈매기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-263 | 큰제비갈매기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-264 | 붉은어깨도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-265 | 도요사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-267 | 흑꼬리도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-268 | 괭이갈매기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-272 | 왕물떼새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-278 | 붉은가슴흰죽지도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-280 | 민댕기물떼새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-281 | 왜가리물떼새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-282 | 분홍발기러기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-284 | 노랑발도요 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-285 | 세가락메추라기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-286 | 검은머리쑥새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-287 | 섬개개비 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-289 | 홍여새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |

### P0-B06

- species: `25`
- total raw deficit to pipeline floor: `5000`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-290 | 호랑지빠귀사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-291 | 산솔새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-292 | 되솔새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-293 | 두견솔새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-294 | 휘파람새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-295 | 개개비 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-296 | 쇠개개비 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-298 | 노랑턱멧새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-299 | 촉새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-300 | 쑥새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-301 | 흰배멧새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-302 | 알락할미새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-304 | 긴발톱할미새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-305 | 밭종다리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-309 | 멋쟁이새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-310 | 양진이 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-313 | 숲새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-316 | 쇠찌르레기 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-323 | 삼색멧새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-324 | 쑥새류 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-326 | 바위종다리 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-327 | 물까마귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-328 | 개개비사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-329 | 쇠개개비사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-330 | 긴다리개개비 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |

### P0-B07

- species: `9`
- total raw deficit to pipeline floor: `1800`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-334 | 흰털발제비 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-335 | 긴꼬리딱새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-336 | 붉은배지빠귀 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-337 | 쇠유리새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-340 | 큰덤불해오라기사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-342 | 긴꼬리솔새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-343 | 긴꼬리딱새사촌 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-345 | 홍방울새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |
| KR-346 | 붉은멧새 | 0 | 0 | 0 | 0 | iNaturalist KR full collect -> GBIF fallback -> manual curation |

### P1-B01

- species: `25`
- total raw deficit to pipeline floor: `4947`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-002 | 고니 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-123 | 바다비오리 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-124 | 흰비오리 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-131 | 큰논병아리 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-192 | 비둘기매 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-262 | 쇠제비갈매기 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-274 | 큰부리제비갈매기 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-276 | 검은제비갈매기 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-288 | 쇠황조롱이 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-311 | 솔잣새 | 1 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-040 | 중부리도요 | 2 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-135 | 황로 | 2 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-158 | 댕기쇠오리 | 2 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-202 | 검은딱새 | 2 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-269 | 검은머리물떼새 | 2 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-271 | 뒷부리장다리물떼새 | 2 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-277 | 종다리도요 | 2 | 10 | 0 | 0 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-125 | 흰뺨오리 | 3 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-178 | 쇠부엉이 | 3 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-253 | 학도요 | 3 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-014 | 원앙 | 4 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-039 | 쇠솔새 | 4 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-116 | 고방오리 | 4 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-227 | 큰뒷부리도요 | 4 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-233 | 흰물떼새 | 4 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |

### P1-B02

- species: `25`
- total raw deficit to pipeline floor: `4805`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-279 | 꼬마도요 | 4 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-331 | 귀제비 | 4 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-341 | 노랑눈썹솔새 | 4 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-008 | 독수리 | 5 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-132 | 해오라기 | 5 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-219 | 진홍가슴 | 5 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-317 | 종다리 | 5 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-350 | 봄솔새 | 5 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-009 | 흰꼬리수리 | 6 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-226 | 긴발톱도요 | 6 | 10 | 0 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-109 | 알락해오라기 | 8 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-249 | 멧도요 | 8 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-349 | 개똥지빠귀사촌 | 8 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-036 | 뻐꾸기 | 9 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-117 | 알락오리 | 9 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-118 | 홍머리오리 | 10 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-165 | 참매 | 10 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-181 | 개미잡이 | 10 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-230 | 큰도요 | 10 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-241 | 삑삑도요 | 10 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-250 | 마도요 | 10 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-283 | 흰죽지제비갈매기 | 10 | 10 | 1 | 1 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-236 | 댕기물떼새 | 11 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-314 | 쇠종다리 | 11 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-139 | 붉은왜가리 | 12 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |

### P1-B03

- species: `25`
- total raw deficit to pipeline floor: `4602`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-163 | 물수리 | 12 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-318 | 시베리아할미새 | 12 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-102 | 노랑부리저어새 | 13 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-240 | 청다리도요 | 13 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-306 | 논종다리 | 13 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-325 | 유럽발발이 | 13 | 10 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-237 | 개꿩 | 14 | 11 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-332 | 갈색제비 | 14 | 11 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-031 | 쇠기러기 | 15 | 12 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-111 | 검은목두루미 | 15 | 12 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-245 | 세가락도요 | 15 | 12 | 1 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-266 | 황금물떼새 | 16 | 12 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-275 | 흰수염제비갈매기 | 16 | 12 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-333 | 집제비 | 16 | 12 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-041 | 되새 | 17 | 13 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-221 | 진박새 | 17 | 13 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-242 | 민물도요 | 17 | 13 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-270 | 장다리물떼새 | 17 | 13 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-297 | 큰개개비 | 17 | 13 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-232 | 꼬마물떼새 | 18 | 14 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-254 | 붉은발도요 | 18 | 14 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-115 | 넓적부리 | 19 | 15 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-261 | 제비갈매기 | 20 | 16 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-338 | 검은딱새사촌 | 20 | 16 | 2 | 2 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-220 | 쇠박새 | 21 | 16 | 2 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |

### P1-B04

- species: `25`
- total raw deficit to pipeline floor: `4145`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-012 | 매 | 22 | 17 | 2 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-145 | 큰아비 | 22 | 17 | 2 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-231 | 쇠갈매기 | 23 | 18 | 2 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-322 | 쑥새사촌 | 23 | 18 | 2 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-127 | 황오리 | 25 | 20 | 2 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-321 | 흰눈썹멧새 | 25 | 20 | 2 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-315 | 흰눈썹솔새 | 26 | 20 | 3 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-114 | 발구지 | 28 | 22 | 3 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-247 | 꺅도요 | 29 | 23 | 3 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-348 | 큰유리딱새 | 29 | 23 | 3 | 3 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-252 | 깝작도요 | 31 | 24 | 3 | 4 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-120 | 댕기흰죽지 | 34 | 27 | 3 | 4 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-179 | 칡부엉이 | 34 | 27 | 3 | 4 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-198 | 콩새 | 34 | 27 | 3 | 4 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-308 | 콩새 | 34 | 27 | 3 | 4 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-307 | 황여새 | 36 | 28 | 4 | 4 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-050 | 참새 | 40 | 38 | 7 | 7 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-060 | 꿩 | 41 | 32 | 4 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-119 | 흰죽지 | 42 | 33 | 4 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-104 | 개리 | 45 | 36 | 4 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-128 | 혹부리오리 | 45 | 36 | 4 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-320 | 방울새사촌 | 46 | 36 | 5 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-344 | 검은머리방울새 | 46 | 36 | 5 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-134 | 쇠백로 | 47 | 37 | 5 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-259 | 갈매기 | 48 | 38 | 5 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |

### P1-B05

- species: `5`
- total raw deficit to pipeline floor: `730`

| species_id | name_ko | raw | train | val | test | source |
|---|---|---:|---:|---:|---:|---|
| KR-319 | 노랑발노랑할미새 | 49 | 39 | 5 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-187 | 청딱따구리 | 50 | 40 | 5 | 5 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-164 | 솔개 | 54 | 43 | 5 | 6 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-147 | 논병아리 | 58 | 46 | 6 | 6 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
| KR-172 | 새호리기 | 59 | 47 | 6 | 6 | iNaturalist KR top-up -> GBIF top-up -> force resplit |
