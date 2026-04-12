# Full Retraining Runbook

최종 업데이트: 2026-04-12

이 문서는 BirdWatch AI를 `부분 보강`이 아니라 `전체 300종 재수집/전처리/재학습`으로 다시 준비하기 위한 실행 기준이다.

## 왜 전체 리빌드인가

- `300`종 full map은 이미 존재한다.
- 현재 label map에 실제 들어간 종은 `141`종뿐이다.
- `159`종은 학습 출력에서 완전히 빠져 있다.
- 현재 학습된 `141`종 중에서도 다수가 low-shot 상태다.
- 현재 raw 기준으로도 `200장` 미만 종이 대부분이라, 일부 종만 보강하는 방식으로는 PRD 목표를 맞추기 어렵다.

참고 산출물:
- [AI_RETRAINING_GAP_REPORT.md](/C:/workspace/Project_2/ai/AI_RETRAINING_GAP_REPORT.md)
- [FULL_RETRAINING_SUMMARY.md](/C:/workspace/Project_2/ai/FULL_RETRAINING_SUMMARY.md)
- [FULL_RETRAINING_MANIFEST.csv](/C:/workspace/Project_2/ai/FULL_RETRAINING_MANIFEST.csv)

## 중요한 기준 불일치

현재 파이프라인 기본값:
- 수집 기본: 종당 `200`장
- 전처리 목표: train `150`장
- split: `80/10/10`

PRD 기준:
- validation set 최소 `50`장 / species

의미:
- 현재 `80/10/10` split을 유지하면, PRD의 `val 50장` 기준을 만족하려면 species당 대략 `500`장 수준이 필요하다.
- 따라서 다음 재학습은 최소 두 단계로 보는 게 맞다.
  1. `파이프라인 floor`: 300종 전체를 학습 가능한 상태로 맞추기
  2. `PRD gate`: 검증용 장수와 계절/지역 다양성까지 채우기

## 이번 재학습의 목표

### 1차 목표: v1.1.0 full rebuild

- `300`종 전체가 label map에 포함될 것
- 모든 종이 raw `>= 200`
- 모든 종이 train `>= 150`
- split 누락(`val=0` 또는 `test=0`)이 없을 것

### 2차 목표: PRD accuracy gate

- 전체 `top-1 >= 0.80`
- 전체 `top-3 >= 0.92`
- species별 validation 품질과 confusion pair 리포트 확보

## 권장 디렉토리 전략

기존 산출물을 덮어쓰지 말고 버전별 경로를 사용한다.

권장 경로:
- raw: `data/retrain_v1_1_0/raw`
- processed: `data/retrain_v1_1_0/processed`
- tfrecords: `data/retrain_v1_1_0/tfrecords`
- models: `ai/models`

## 준비 단계

1. 최신 manifest 생성

```bash
python ai/scripts/analyze_training_coverage.py
python ai/scripts/prepare_full_retraining_manifest.py
```

2. 우선순위 확인

- `P0`: raw 0 또는 학습 출력 미포함
- `P1`: raw/train 매우 부족하거나 split 품질 깨짐
- `P2`: pipeline floor 미달
- `P3`: PRD 검증 gate 미달

3. 수집 계획 확정

- 전 종 `full recollect` 원칙
- 다만 실제 수집 실행 순서는 `P0 -> P1 -> P2 -> P3`

## 실행 순서

### Step 1. 원시 이미지 재수집

```bash
bash ai/scripts/run_training_pipeline.sh
```

권장 환경변수:

```bash
SPECIES_MAP=data/species_map_full.json
RAW_DIR=/workspace/data/retrain_v1_1_0/raw
PROCESSED_DIR=/workspace/data/retrain_v1_1_0/processed
TFRECORDS_DIR=/workspace/data/retrain_v1_1_0/tfrecords
MODEL_VERSION=v1.1.0
MIN_IMAGES=200
SKIP_PREPROCESS=1
SKIP_TFRECORDS=1
SKIP_TRAIN=1
```

### Step 2. 전처리 재생성

```bash
python ai/scripts/preprocess_images.py \
  --input_dir data/retrain_v1_1_0/raw \
  --output_dir data/retrain_v1_1_0/processed \
  --min_train_per_class 150
```

### Step 3. TFRecord 재생성

```bash
python ai/scripts/generate_tfrecords.py \
  --input_dir data/retrain_v1_1_0/processed \
  --output_dir data/retrain_v1_1_0/tfrecords
```

### Step 4. v1.1.0 재학습

```bash
python ai/scripts/train_model.py \
  --processed_dir data/retrain_v1_1_0/processed \
  --output_dir ai/models \
  --version v1.1.0 \
  --batch_size 64 \
  --initial_epochs 15 \
  --finetune_epochs 25
```

### Step 5. 재평가

- 전체 `top-1/top-3`
- rarity tier별 정확도
- 혼동쌍 상위 목록
- correction log와 비교

## 로컬 GPU / ECS trainer 준비

로컬:
- [docker-compose.gpu.yml](/C:/workspace/Project_2/ai/docker-compose.gpu.yml)
- [Dockerfile.gpu](/C:/workspace/Project_2/ai/Dockerfile.gpu)

AWS:
- [ecs_task_definition.json](/C:/workspace/Project_2/ai/ecs_task_definition.json)

## 다음 실무 액션

1. `FULL_RETRAINING_MANIFEST.csv` 기준으로 `P0/P1` 종부터 수집 큐 확정
2. 새 버전 경로(`retrain_v1_1_0`)로 raw/processed/tfrecords 재생성
3. `v1.1.0` full rebuild 실행
4. 결과가 pipeline floor만 만족하면 다음으로 PRD gate용 데이터 확장 라운드 진행
