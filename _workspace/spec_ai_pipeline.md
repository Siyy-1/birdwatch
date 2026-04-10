# AI 파이프라인 스펙 — 한국 조류 EfficientNet-Lite B2 학습 데이터 수집 및 전처리

## 목적
BirdWatch AI 식별 모델(EfficientNet-Lite B2 INT8) 학습을 위한 한국 조류 이미지 데이터셋을
iNaturalist Open API에서 수집, 전처리, TFRecord로 변환하는 파이프라인을 구축한다.

## 타겟 모델
- 아키텍처: EfficientNet-Lite B2
- 입력: 260×260 RGB
- 출력: 300 클래스 (한국 조류 300종, species_id KR-001~KR-350)
- 최종 형태: INT8 양자화 TFLite 모델
- 성능 목표: top-1 accuracy ≥ 85% (한국 조류 이미지 기준)

## 학습 데이터 출처
1. **iNaturalist Open API** (메인): 한국(KR) 관찰 기록 조류 이미지
2. **GBIF API** (보조): 국내 조류 이미지 보완
3. **데이터 보강**: 회전, 밝기 조절, 좌우 반전, 크롭 등 augmentation

## 출력 파일 (3개 스크립트)

| 파일 | 역할 |
|------|------|
| `ai/scripts/collect_inaturalist.py` | iNaturalist API 이미지 수집 |
| `ai/scripts/preprocess_images.py` | 전처리 (리사이즈, EXIF 제거, 정규화) |
| `ai/scripts/generate_tfrecords.py` | train/val/test TFRecord 생성 |

---

## 스크립트 1: collect_inaturalist.py

### 기능
- iNaturalist API v1 (`https://api.inaturalist.org/v1/observations`) 호출
- 한국(place_id=7184 or country_code=KR) 조류(taxon_id=3) 관찰 기록 수집
- 각 종별 최소 200장, 최대 500장 수집
- 메타데이터(관찰 날짜, 위치, 관찰자, 품질 등급) JSON으로 저장
- 이미 다운로드된 이미지는 건너뜀 (재시작 가능)

### 입력
- `data/species_map.json`: species_id ↔ 학명 매핑
  ```json
  [{"species_id": "KR-001", "name_sci": "Ciconia boyciana", "name_ko": "황새"}, ...]
  ```
  → 이 파일은 스크립트가 직접 생성하거나 hard-code해도 됨

### 출력 디렉토리 구조
```
data/raw/
  KR-001_Ciconia_boyciana/
    image_001.jpg
    image_002.jpg
    ...
    metadata.json     # [{observation_id, url, observed_on, quality_grade, ...}]
  KR-002_Cygnus_columbianus/
    ...
```

### API 파라미터
```python
params = {
    "taxon_id": 3,           # 조류(Aves)
    "place_id": 7184,        # South Korea
    "quality_grade": "research",
    "has": ["photos"],
    "per_page": 200,
    "page": 1,
    "order": "desc",
    "order_by": "created_at"
}
```

### 요구사항
- 레이트 리밋 준수: 요청 간 0.5초 대기
- 네트워크 오류 시 3회 재시도 (exponential backoff)
- `--species_id` CLI 인자로 특정 종만 수집 가능
- `--min_images N` 인자: 종별 최소 이미지 수 (기본 200)
- `--output_dir PATH` 인자: 출력 디렉토리 (기본 `data/raw/`)
- 진행률 tqdm으로 표시
- 오류 로그: `logs/collect_{날짜}.log`

---

## 스크립트 2: preprocess_images.py

### 기능
1. EXIF 완전 제거 (Piexif 라이브러리 — PIPA 준수)
2. 이미지 리사이즈: 260×260 center-crop (EfficientNet-Lite B2 입력 크기)
3. 품질 필터링: 최소 해상도 100×100 미만 제거
4. 손상된 이미지 제거
5. 클래스별 augmentation (학습 이미지 부족 종만):
   - 수평 반전 (p=0.5)
   - 밝기 ±20%
   - 대비 ±15%
   - 회전 ±15도
6. train/val/test 분할 (80/10/10 stratified)

### 입력
- `data/raw/` 디렉토리 (collect_inaturalist.py 출력)

### 출력
```
data/processed/
  train/
    KR-001/  image_001.jpg ...
    KR-002/  ...
  val/
    KR-001/  ...
  test/
    KR-001/  ...
  stats.json  # {species_id: {train_count, val_count, test_count}}
```

### 요구사항
- `--input_dir`, `--output_dir`, `--min_train_per_class N` (기본 150) CLI 인자
- 처리 완료 이미지 목록 `processed_list.txt`에 기록 (재실행 시 스킵)
- 병렬 처리: `ProcessPoolExecutor` workers=CPU-2
- 진행률 tqdm으로 표시

---

## 스크립트 3: generate_tfrecords.py

### 기능
1. `data/processed/` → TFRecord 파일 생성
2. 클래스 라벨 매핑 파일 생성 (`label_map.json`: species_id → int index)
3. train/val/test 각각 shard 단위 TFRecord 생성 (shard당 1,000장)

### TFRecord 스키마
```python
feature = {
    'image/encoded': tf.train.Feature(bytes_list=...),   # JPEG bytes
    'image/format': tf.train.Feature(bytes_list=...),    # b'jpeg'
    'image/class/label': tf.train.Feature(int64_list=...), # 0~299
    'image/class/species_id': tf.train.Feature(bytes_list=...), # b'KR-001'
    'image/height': tf.train.Feature(int64_list=...),
    'image/width': tf.train.Feature(int64_list=...),
}
```

### 출력
```
data/tfrecords/
  train/  train-00000-of-NNNNN.tfrecord ...
  val/    val-00000-of-NNNNN.tfrecord ...
  test/   test-00000-of-NNNNN.tfrecord ...
  label_map.json   # {"KR-001": 0, "KR-002": 1, ...}
  dataset_info.json # {total_images, num_classes, split_sizes, ...}
```

### 요구사항
- `--input_dir`, `--output_dir`, `--shard_size N` (기본 1000) CLI 인자
- 데이터 무결성 검증: 출력 TFRecord 레코드 수 확인
- tqdm 진행률 표시

---

## 의존성 (requirements.txt에 추가)
```
requests>=2.31.0
Pillow>=10.0.0
piexif>=1.1.3
tqdm>=4.66.0
tensorflow>=2.13.0
numpy>=1.24.0
scikit-learn>=1.3.0  # train/val/test stratified split
```

---

## 디렉토리 구조 (전체)
```
ai/
  scripts/
    collect_inaturalist.py
    preprocess_images.py
    generate_tfrecords.py
  requirements.txt
  README.md
data/
  raw/          # collect 출력
  processed/    # preprocess 출력
  tfrecords/    # generate 출력
logs/
```

## 검증 체크리스트
- [ ] collect: 각 종 디렉토리에 이미지 존재, metadata.json 유효
- [ ] preprocess: 모든 이미지 260×260, EXIF 없음 확인
- [ ] tfrecords: 레코드 수 = 처리된 이미지 수
- [ ] label_map: 300종 모두 포함
