#!/usr/bin/env bash
# =============================================================================
# ai/scripts/run_training_pipeline.sh — BirdWatch 전체 학습 파이프라인 오케스트레이터
# =============================================================================
#
# 실행 단계:
#   1. collect_inaturalist.py  — iNaturalist API 이미지 수집
#   2. preprocess_images.py    — EXIF 제거, 리사이즈, train/val/test 분할
#   3. generate_tfrecords.py   — TFRecord 변환 (shard 단위)
#   4. train_model.py          — Phase 1 (헤드) + Phase 2 (미세조정) + TFLite INT8 변환
#
# 사용법:
#   # 기본 실행 (컨테이너 내부 또는 로컬)
#   bash scripts/run_training_pipeline.sh
#
#   # 환경변수로 파라미터 재정의
#   MODEL_VERSION=v1.1.0 BATCH_SIZE=32 bash scripts/run_training_pipeline.sh
#
#   # Docker Compose를 통한 실행 (프로젝트 루트에서)
#   docker compose -f ai/docker-compose.gpu.yml run --rm trainer \
#     bash scripts/run_training_pipeline.sh
#
#   # 특정 단계만 건너뛰기 (이미 완료된 경우)
#   SKIP_COLLECT=1 bash scripts/run_training_pipeline.sh
#   SKIP_COLLECT=1 SKIP_PREPROCESS=1 bash scripts/run_training_pipeline.sh
#
# 환경변수:
#   SPECIES_MAP      종 매핑 파일 경로    (기본: data/species_map_full.json)
#   MIN_IMAGES       종별 최소 이미지 수  (기본: 200)
#   MODEL_VERSION    모델 버전 태그       (기본: v1.0.0)
#   BATCH_SIZE       학습 배치 크기       (기본: 64)
#   INITIAL_EPOCHS   Phase 1 epoch 수     (기본: 15)
#   FINETUNE_EPOCHS  Phase 2 epoch 수     (기본: 25)
#   RAW_DIR          원시 데이터 경로     (기본: /workspace/data/raw)
#   PROCESSED_DIR    전처리 출력 경로     (기본: /workspace/data/processed)
#   TFRECORDS_DIR    TFRecord 출력 경로   (기본: /workspace/data/tfrecords)
#   MODELS_DIR       모델 출력 경로       (기본: /workspace/ai/models)
#   LOG_DIR          로그 출력 경로       (기본: /workspace/logs)
#   SKIP_COLLECT     =1이면 수집 단계 건너뜀
#   SKIP_PREPROCESS  =1이면 전처리 단계 건너뜀
#   SKIP_TFRECORDS   =1이면 TFRecord 생성 단계 건너뜀
#   SKIP_TRAIN       =1이면 학습 단계 건너뜀
#
# PIPA 준수:
#   - EXIF 제거는 preprocess_images.py 단계에서 piexif로 처리
#   - 원시 이미지의 GPS/기기 정보는 processed/ 단계에서 완전 제거
#   - 모든 데이터는 서울 리전 EFS에만 저장 (타 리전 복제 금지)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 환경변수 기본값
# ---------------------------------------------------------------------------
SPECIES_MAP="${SPECIES_MAP:-data/species_map_full.json}"
MIN_IMAGES="${MIN_IMAGES:-200}"
MODEL_VERSION="${MODEL_VERSION:-v1.0.0}"
BATCH_SIZE="${BATCH_SIZE:-64}"
INITIAL_EPOCHS="${INITIAL_EPOCHS:-15}"
FINETUNE_EPOCHS="${FINETUNE_EPOCHS:-25}"

RAW_DIR="${RAW_DIR:-/workspace/data/raw}"
PROCESSED_DIR="${PROCESSED_DIR:-/workspace/data/processed}"
TFRECORDS_DIR="${TFRECORDS_DIR:-/workspace/data/tfrecords}"
MODELS_DIR="${MODELS_DIR:-/workspace/ai/models}"
LOG_DIR="${LOG_DIR:-/workspace/logs}"

SKIP_COLLECT="${SKIP_COLLECT:-0}"
SKIP_PREPROCESS="${SKIP_PREPROCESS:-0}"
SKIP_TFRECORDS="${SKIP_TFRECORDS:-0}"
SKIP_TRAIN="${SKIP_TRAIN:-0}"

# ---------------------------------------------------------------------------
# 유틸리티 함수
# ---------------------------------------------------------------------------

# 타임스탬프 포함 로그 출력
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] $*" | tee -a "${LOG_DIR}/pipeline_$(date '+%Y%m%d').log"
}

log_info()  { log "INFO " "$@"; }
log_ok()    { log "OK   " "$@"; }
log_warn()  { log "WARN " "$@"; }
log_error() { log "ERROR" "$@" >&2; }

# 단계 시작 배너
step_start() {
    local step_num="$1"
    local step_name="$2"
    echo ""
    echo "============================================================"
    log_info "STEP ${step_num}/4 시작: ${step_name}"
    echo "============================================================"
    STEP_START_TIME=$(date +%s)
}

# 단계 완료 + 소요 시간
step_done() {
    local step_num="$1"
    local step_name="$2"
    local elapsed=$(( $(date +%s) - STEP_START_TIME ))
    local minutes=$(( elapsed / 60 ))
    local seconds=$(( elapsed % 60 ))
    log_ok "STEP ${step_num}/4 완료: ${step_name} (소요: ${minutes}분 ${seconds}초)"
}

# 단계 건너뜀 알림
step_skip() {
    local step_num="$1"
    local step_name="$2"
    log_warn "STEP ${step_num}/4 건너뜀: ${step_name} (SKIP 플래그 설정됨)"
}

# ---------------------------------------------------------------------------
# 사전 검증
# ---------------------------------------------------------------------------
preflight_check() {
    log_info "사전 검증 시작..."

    # Python 확인
    if ! command -v python &>/dev/null; then
        log_error "python 명령어를 찾을 수 없습니다."
        exit 1
    fi

    # TensorFlow GPU 확인
    local gpu_count
    gpu_count=$(python -c "
import tensorflow as tf
gpus = tf.config.list_physical_devices('GPU')
print(len(gpus))
" 2>/dev/null || echo "0")

    if [ "${gpu_count}" -eq 0 ]; then
        log_warn "GPU를 감지하지 못했습니다. CPU 모드로 학습합니다 (속도 저하 예상)."
    else
        log_info "GPU ${gpu_count}개 감지됨. GPU 학습 모드로 실행합니다."
    fi

    # 필수 스크립트 존재 확인
    local scripts_dir
    scripts_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    for script in collect_inaturalist.py preprocess_images.py generate_tfrecords.py train_model.py; do
        if [ ! -f "${scripts_dir}/${script}" ]; then
            log_error "스크립트 없음: ${scripts_dir}/${script}"
            exit 1
        fi
    done

    # 종 매핑 파일 확인
    if [ ! -f "${SPECIES_MAP}" ]; then
        log_warn "종 매핑 파일 없음: ${SPECIES_MAP}"
        log_warn "collect_inaturalist.py가 파일을 생성하거나 내장 목록을 사용합니다."
    fi

    # 출력 디렉토리 생성
    mkdir -p "${RAW_DIR}" "${PROCESSED_DIR}" "${TFRECORDS_DIR}" "${MODELS_DIR}" "${LOG_DIR}"

    log_ok "사전 검증 완료."
}

# ---------------------------------------------------------------------------
# 단계별 스크립트 경로 설정
# ---------------------------------------------------------------------------
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# 파이프라인 실행
# ---------------------------------------------------------------------------
PIPELINE_START=$(date +%s)
STEP_START_TIME=${PIPELINE_START}

log_info "=========================================="
log_info "BirdWatch 학습 파이프라인 시작"
log_info "=========================================="
log_info "파라미터:"
log_info "  SPECIES_MAP     = ${SPECIES_MAP}"
log_info "  MIN_IMAGES      = ${MIN_IMAGES}"
log_info "  MODEL_VERSION   = ${MODEL_VERSION}"
log_info "  BATCH_SIZE      = ${BATCH_SIZE}"
log_info "  INITIAL_EPOCHS  = ${INITIAL_EPOCHS}"
log_info "  FINETUNE_EPOCHS = ${FINETUNE_EPOCHS}"
log_info "  RAW_DIR         = ${RAW_DIR}"
log_info "  PROCESSED_DIR   = ${PROCESSED_DIR}"
log_info "  TFRECORDS_DIR   = ${TFRECORDS_DIR}"
log_info "  MODELS_DIR      = ${MODELS_DIR}"

preflight_check

# ---------------------------------------------------------------------------
# STEP 1: 이미지 수집 (iNaturalist API)
# ---------------------------------------------------------------------------
if [ "${SKIP_COLLECT}" = "1" ]; then
    step_skip 1 "iNaturalist 이미지 수집"
else
    step_start 1 "iNaturalist 이미지 수집"

    python "${SCRIPTS_DIR}/collect_inaturalist.py" \
        --species_map "${SPECIES_MAP}" \
        --min_images "${MIN_IMAGES}" \
        --output_dir "${RAW_DIR}"

    step_done 1 "iNaturalist 이미지 수집"
fi

# ---------------------------------------------------------------------------
# STEP 2: 이미지 전처리 (EXIF 제거, 리사이즈, 분할)
# ---------------------------------------------------------------------------
if [ "${SKIP_PREPROCESS}" = "1" ]; then
    step_skip 2 "이미지 전처리 (EXIF 제거 + 리사이즈)"
else
    step_start 2 "이미지 전처리 (EXIF 제거 + 리사이즈)"

    # PIPA 준수: EXIF 완전 제거 (GPS, 기기 정보 포함)
    # preprocess_images.py 내부에서 piexif.remove() 처리
    python "${SCRIPTS_DIR}/preprocess_images.py" \
        --input_dir "${RAW_DIR}" \
        --output_dir "${PROCESSED_DIR}"

    step_done 2 "이미지 전처리 (EXIF 제거 + 리사이즈)"
fi

# ---------------------------------------------------------------------------
# STEP 3: TFRecord 생성
# ---------------------------------------------------------------------------
if [ "${SKIP_TFRECORDS}" = "1" ]; then
    step_skip 3 "TFRecord 생성"
else
    step_start 3 "TFRecord 생성"

    python "${SCRIPTS_DIR}/generate_tfrecords.py" \
        --input_dir "${PROCESSED_DIR}" \
        --output_dir "${TFRECORDS_DIR}" \
        --shard_size 1000

    step_done 3 "TFRecord 생성"
fi

# ---------------------------------------------------------------------------
# STEP 4: 모델 학습 (Phase 1 + Phase 2 + TFLite INT8 변환)
# ---------------------------------------------------------------------------
if [ "${SKIP_TRAIN}" = "1" ]; then
    step_skip 4 "모델 학습"
else
    step_start 4 "모델 학습 (EfficientNetB2 Phase 1 + Phase 2 + TFLite 변환)"

    python "${SCRIPTS_DIR}/train_model.py" \
        --processed_dir "${PROCESSED_DIR}" \
        --output_dir "${MODELS_DIR}" \
        --version "${MODEL_VERSION}" \
        --batch_size "${BATCH_SIZE}" \
        --initial_epochs "${INITIAL_EPOCHS}" \
        --finetune_epochs "${FINETUNE_EPOCHS}"

    step_done 4 "모델 학습"
fi

# ---------------------------------------------------------------------------
# 파이프라인 완료 요약
# ---------------------------------------------------------------------------
TOTAL_ELAPSED=$(( $(date +%s) - PIPELINE_START ))
TOTAL_MINUTES=$(( TOTAL_ELAPSED / 60 ))
TOTAL_SECONDS=$(( TOTAL_ELAPSED % 60 ))

echo ""
echo "=========================================="
log_ok "파이프라인 완료"
log_info "총 소요 시간: ${TOTAL_MINUTES}분 ${TOTAL_SECONDS}초"
echo "=========================================="
log_info "출력 파일:"
log_info "  모델:      ${MODELS_DIR}/birdwatch_${MODEL_VERSION}.h5"
log_info "  TFLite:    ${MODELS_DIR}/birdwatch_${MODEL_VERSION}.tflite"
log_info "  레이블 맵: ${MODELS_DIR}/label_map.json"
log_info "  학습 이력: ${MODELS_DIR}/training_history.json"
log_info "  파이프라인 로그: ${LOG_DIR}/pipeline_$(date '+%Y%m%d').log"
echo "=========================================="
