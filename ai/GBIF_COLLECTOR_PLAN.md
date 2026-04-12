# GBIF Collector Plan

최종 업데이트: 2026-04-12

이 문서는 BirdWatch AI full rebuild에서 `GBIF`를 어떤 역할로 쓸지 정리한 계획 문서다.

## 역할

`GBIF`는 메인 수집원이 아니라 `iNaturalist KR`의 보조 수집원이다.

우선순위:
1. `iNaturalist KR`
2. `GBIF`
3. `manual curation`

## GBIF를 쓰는 경우

- `iNaturalist KR`에서 raw가 계속 `0` 또는 매우 낮게 남는 종
- 희귀종 / 계절종 / 국내 관찰 사진이 적은 종
- `P0` batch를 먼저 돌린 뒤에도 pipeline floor에 못 미치는 종

## 수집 원칙

- `species_map_full.json`의 `species_id / name_sci / name_ko`를 기준으로 쿼리
- BirdWatch에서 상업적으로 사용 가능한 라이선스만 허용
- 라이선스가 불명확하거나 비상업 제한이 있으면 제외
- media URL, source URL, license, attribution을 metadata에 남김
- 이미지 저장 경로는 기존 raw 구조와 동일하게 유지

예상 metadata 필드:
- `species_id`
- `name_sci`
- `name_ko`
- `source = gbif`
- `gbif_occurrence_id`
- `media_url`
- `source_page_url`
- `license`
- `publisher`
- `country`
- `event_date`
- `recorded_by`

## 권장 필터 방향

- 우선 한국 관련 레코드 우선
- 한국 레코드가 부족하면 동아시아권 확장 검토
- 그래도 부족하면 전지구 레코드 중 형태 구분에 도움이 되는 종만 제한적으로 사용

즉, 범위 확장은 이 순서로 본다:
- `KR only`
- `East Asia`
- `Global fallback`

## 파이프라인 연결 방식

### 1. raw 단계

- `collect_gbif.py`가 `data/retrain_v1_1_0/raw/KR-xxx_*` 경로에 저장
- 기존 `collect_inaturalist.py`와 같은 species dir 구조 사용

### 2. metadata 단계

- 각 species dir의 `metadata.json`에 source 구분 필드 추가
- 기존 iNaturalist metadata와 함께 병합 가능해야 함

### 3. preprocess 단계

- 이후 단계는 source와 무관하게 동일
- EXIF 제거, 리사이즈, split, augmentation 공통 처리

## 구현 시 필요한 것

- `ai/scripts/collect_gbif.py`
- 재시도 / rate limit / resumable download
- license allowlist
- source metadata merge 정책
- `--species_id`, `--species_map`, `--min_images`, `--output_dir` CLI 인자

## 추천 운영 규칙

- `P0` species는 `iNaturalist` 실행 후 곧바로 `GBIF` fallback 여부 판정
- `P1` species는 일정 수준까지 `iNaturalist` top-up 후 부족한 종만 `GBIF` 사용
- `GBIF`만으로 채운 종은 후속 평가에서 confusion pair를 별도 확인

## 현재 결론

- 지금 당장 필요한 것은 `GBIF`를 메인으로 대체하는 게 아니다.
- 먼저 `P0/P1 batch`를 `iNaturalist KR`로 돌리고,
- 남는 zero-shot / low-shot 종을 `GBIF` collector로 메우는 방식이 맞다.
