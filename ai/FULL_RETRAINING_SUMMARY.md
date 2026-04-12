# Full Retraining Summary

Generated: 2026-04-12

## Summary

- Target species: `300`
- Species currently in label map: `141`
- Species missing from label map: `159`
- Species with raw `< 200`: `286`
- Species with train `< 150`: `286`
- Species with val `< 50`: `300`
- Species with test `< 50`: `300`
- PRD-implied raw target under current `80/10/10` split: `500`

## Key Finding

- This should be treated as a **full 300-species rebuild**, not a partial top-up.
- `300` raw species directories exist, but only `141` species made it into the trained label map.
- `286` species are still below the current pipeline floor of `200` raw images.
- Under the current `80/10/10` split, the PRD requirement of `50` validation images per species implies about `500` processed images per species.

## Priority Bands

- `P0`: no usable raw images or missing entirely from training output
- `P1`: extremely low-shot or broken split quality
- `P2`: below current pipeline floor
- `P3`: usable for training but below PRD evaluation gate
- `P4`: already suitable for the next full rebuild

## Top P0/P1 Items

| priority | species_id | name_ko | raw | train | val | test | action |
|---|---|---|---:|---:|---:|---:|---|
| P0 | KR-001 | 황새 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-004 | 두루미 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-005 | 재두루미 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-006 | 흑두루미 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-007 | 저어새 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-010 | 검독수리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-020 | 넓적부리도요 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-021 | 황다리도요 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-022 | 노랑부리백로 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-023 | 검은머리갈매기 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-024 | 알락꼬리마도요 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-030 | 큰기러기 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-033 | 호반새 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-034 | 청호반새 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-037 | 꾀꼬리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-038 | 흰눈썹황금새 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-043 | 흰배지빠귀 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-051 | 까치 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-054 | 붉은머리오목눈이 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-055 | 딱새 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-056 | 직박구리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-058 | 곤줄박이 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-061 | 멧비둘기 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-063 | 큰부리까마귀 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-064 | 방울새 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-101 | 참수리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-103 | 가창오리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-105 | 흰이마기러기 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-106 | 흑비오리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-107 | 뿔쇠오리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-108 | 물꿩 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-112 | 사다새 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-121 | 검은머리흰죽지 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-122 | 비오리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-126 | 검둥오리 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-133 | 중백로 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-136 | 흰날개해오라기 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-137 | 덤불해오라기 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-138 | 큰덤불해오라기 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
| P0 | KR-140 | 흑기러기 | 0 | 0 | 0 | 0 | collect_from_zero_then_preprocess |
