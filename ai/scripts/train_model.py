"""
train_model.py — BirdWatch EfficientNetB2 학습 스크립트

파이프라인:
  data/processed/  →  EfficientNetB2 전이학습  →  SavedModel  →  TFLite INT8

사용법:
  # 전체 학습
  python ai/scripts/train_model.py

  # 소규모 테스트 (--max_images_per_class 로 제한)
  python ai/scripts/train_model.py --max_images_per_class 30 --epochs 3

  # 재개 (저장된 체크포인트에서)
  python ai/scripts/train_model.py --resume

출력:
  ai/models/
    birdwatch_{version}.keras       — Keras 전체 모델
    birdwatch_{version}.tflite      — INT8 양자화 TFLite
    label_map.json                  — {species_id: int_index}
    training_history.json           — epoch별 loss/accuracy
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

# TF 로그 억제 (WARNING만 표시)
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import tensorflow as tf
from tensorflow import keras

# ---------------------------------------------------------------------------
# GPU 설정 (import 직후 즉시 실행)
# ---------------------------------------------------------------------------

def _configure_gpu() -> str:
    """GPU 메모리 그로스 설정. GPU 없으면 CPU 모드."""
    gpus = tf.config.list_physical_devices("GPU")
    if gpus:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        # Mixed precision: float16 연산, float32 변수 (GPU 2배 속도향상)
        keras.mixed_precision.set_global_policy("mixed_float16")
        device = f"GPU x{len(gpus)} (mixed_float16)"
    else:
        # CPU: MKL 스레드 최적화
        tf.config.threading.set_inter_op_parallelism_threads(0)  # auto
        tf.config.threading.set_intra_op_parallelism_threads(0)  # auto
        device = "CPU (MKL)"
    return device


DEVICE_INFO = _configure_gpu()

# ---------------------------------------------------------------------------
# 상수
# ---------------------------------------------------------------------------

IMAGE_SIZE = 260          # EfficientNetB2 입력 크기
BATCH_SIZE = 64           # GPU: 64, CPU 메모리 부족 시 --batch_size 32로 조정
INITIAL_EPOCHS = 15       # 헤드만 학습 (베이스 동결) — GPU 기준
FINETUNE_EPOCHS = 25      # 전체 미세조정
FINETUNE_AT_LAYER = 200   # EfficientNetB2에서 이 레이어부터 언동결
LEARNING_RATE_HEAD = 1e-3
LEARNING_RATE_FINETUNE = 5e-6  # mixed precision 시 더 작은 lr
DROPOUT_RATE = 0.3
TARGET_TOP1_ACCURACY = 0.85
MODEL_VERSION = "v1.0.0"

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
MODELS_DIR = PROJECT_ROOT / "ai" / "models"
CHECKPOINT_DIR = PROJECT_ROOT / "ai" / "checkpoints"


# ---------------------------------------------------------------------------
# 로거
# ---------------------------------------------------------------------------

def configure_logging() -> logging.Logger:
    logger = logging.getLogger("train_model")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s",
                            datefmt="%H:%M:%S")
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)

    log_dir = PROJECT_ROOT / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    fh = logging.FileHandler(
        log_dir / f"train_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log",
        encoding="utf-8",
    )
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger


logger = configure_logging()


# ---------------------------------------------------------------------------
# 인수 파싱
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="BirdWatch EfficientNetB2 학습 스크립트"
    )
    parser.add_argument(
        "--processed_dir", default=str(PROCESSED_DIR),
        help="data/processed/ 경로 (train/val/test 하위 디렉토리 포함)",
    )
    parser.add_argument(
        "--output_dir", default=str(MODELS_DIR),
        help="학습 완료 모델 저장 경로",
    )
    parser.add_argument(
        "--version", default=MODEL_VERSION,
        help="모델 버전 태그 (예: v1.0.0)",
    )
    parser.add_argument(
        "--batch_size", type=int, default=BATCH_SIZE,
    )
    parser.add_argument(
        "--initial_epochs", type=int, default=INITIAL_EPOCHS,
        help="헤드 학습 epoch 수 (베이스 동결 상태)",
    )
    parser.add_argument(
        "--finetune_epochs", type=int, default=FINETUNE_EPOCHS,
        help="미세조정 epoch 수 (베이스 일부 언동결)",
    )
    parser.add_argument(
        "--max_images_per_class", type=int, default=None,
        help="클래스당 최대 이미지 수 (테스트용 제한, None=전체 사용)",
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="체크포인트에서 학습 재개",
    )
    parser.add_argument(
        "--skip_tflite", action="store_true",
        help="TFLite 변환 건너뜀 (빠른 테스트용)",
    )
    parser.add_argument(
        "--epochs", type=int, default=None,
        help="initial_epochs + finetune_epochs 합산 대신 총 epoch 수 직접 지정 (헤드만 학습)",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# 데이터셋 빌드
# ---------------------------------------------------------------------------

def build_label_map(train_dir: Path) -> Dict[str, int]:
    """train/ 하위 폴더명(species_id)을 알파벳 순으로 정렬해 int 인덱스 부여."""
    classes = sorted([d.name for d in train_dir.iterdir() if d.is_dir()])
    if not classes:
        raise RuntimeError(f"train 폴더에 클래스 디렉토리가 없습니다: {train_dir}")
    return {cls: idx for idx, cls in enumerate(classes)}


def limit_dataset(dataset: tf.data.Dataset, max_per_class: int,
                  num_classes: int) -> tf.data.Dataset:
    """클래스당 최대 이미지 수 제한 (테스트 전용)."""
    counts: Dict[int, int] = {i: 0 for i in range(num_classes)}

    def _filter(image: tf.Tensor, label: tf.Tensor) -> bool:
        lbl = int(label.numpy())
        if counts[lbl] < max_per_class:
            counts[lbl] += 1
            return True
        return False

    return dataset.filter(
        lambda img, lbl: tf.py_function(_filter, [img, lbl], tf.bool)
    )


def make_dataset(
    split_dir: Path,
    label_map: Dict[str, int],
    batch_size: int,
    augment: bool = False,
    max_per_class: int | None = None,
) -> Tuple[tf.data.Dataset, int]:
    """split_dir(train/val/test)에서 tf.data.Dataset 생성."""

    all_paths: List[str] = []
    all_labels: List[int] = []

    for species_id, idx in label_map.items():
        species_dir = split_dir / species_id
        if not species_dir.exists():
            continue
        images = [
            str(p) for p in species_dir.iterdir()
            if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
        ]
        if max_per_class:
            images = images[:max_per_class]
        all_paths.extend(images)
        all_labels.extend([idx] * len(images))

    total = len(all_paths)
    if total == 0:
        raise RuntimeError(f"이미지가 없습니다: {split_dir}")

    logger.info("  %s: %d 이미지, %d 클래스",
                split_dir.name, total, len(label_map))

    path_ds = tf.data.Dataset.from_tensor_slices(
        (all_paths, all_labels)
    )

    def load_image(path: tf.Tensor, label: tf.Tensor):
        img = tf.io.read_file(path)
        img = tf.image.decode_jpeg(img, channels=3)
        img = tf.image.resize(img, [IMAGE_SIZE, IMAGE_SIZE])
        img = tf.cast(img, tf.float32) / 255.0   # [0,1] 정규화
        return img, label

    def augment_fn(img: tf.Tensor, label: tf.Tensor):
        img = tf.image.random_flip_left_right(img)
        img = tf.image.random_brightness(img, max_delta=0.2)
        img = tf.image.random_contrast(img, lower=0.85, upper=1.15)
        img = tf.image.rot90(img, k=tf.random.uniform([], 0, 4, dtype=tf.int32))
        return img, label

    ds = path_ds.map(load_image, num_parallel_calls=tf.data.AUTOTUNE)

    if augment:
        ds = ds.map(augment_fn, num_parallel_calls=tf.data.AUTOTUNE)

    ds = (ds
          .shuffle(min(total, 5000), seed=42)
          .batch(batch_size, drop_remainder=True)   # drop_remainder: mixed precision 안정성
          .cache()                                   # GPU 메모리에 캐싱 (반복 epoch 가속)
          .prefetch(tf.data.AUTOTUNE))

    return ds, total


# ---------------------------------------------------------------------------
# 모델 빌드
# ---------------------------------------------------------------------------

def build_model(num_classes: int) -> keras.Model:
    """EfficientNetB2 기반 분류 모델 (전이학습용 헤드)."""
    base = keras.applications.EfficientNetB2(
        include_top=False,
        weights="imagenet",
        input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
        pooling="avg",
    )
    base.trainable = False   # Phase 1: 베이스 동결

    inputs = keras.Input(shape=(IMAGE_SIZE, IMAGE_SIZE, 3), name="image")
    # EfficientNetB2는 내부적으로 [0,255] 입력을 기대하므로 rescale
    x = keras.layers.Rescaling(255.0, name="rescale")(inputs)
    x = base(x, training=False)
    x = keras.layers.Dropout(DROPOUT_RATE, name="dropout")(x)
    # float32로 캐스팅 후 softmax: mixed_float16에서 수치 안정성 보장
    x = keras.layers.Dense(num_classes, name="logits")(x)
    outputs = keras.layers.Activation("softmax", dtype="float32", name="predictions")(x)

    model = keras.Model(inputs, outputs, name="birdwatch_efficientnetb2")
    return model, base


def compile_model(model: keras.Model, lr: float) -> None:
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=lr),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy", keras.metrics.SparseTopKCategoricalAccuracy(k=5, name="top5_accuracy")],
    )


# ---------------------------------------------------------------------------
# 콜백
# ---------------------------------------------------------------------------

def make_callbacks(checkpoint_path: Path, phase: str) -> List[keras.callbacks.Callback]:
    return [
        keras.callbacks.ModelCheckpoint(
            filepath=str(checkpoint_path / f"best_{phase}.h5"),
            save_best_only=True,
            monitor="val_accuracy",
            verbose=1,
            save_format="h5",
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
        keras.callbacks.CSVLogger(
            str(checkpoint_path / f"log_{phase}.csv"),
            append=True,
        ),
    ]


# ---------------------------------------------------------------------------
# TFLite 변환 (INT8 양자화)
# ---------------------------------------------------------------------------

def convert_to_tflite_int8(
    model: keras.Model,
    representative_ds: tf.data.Dataset,
    output_path: Path,
) -> None:
    """Full integer quantization (INT8) — TFLite 변환."""
    logger.info("TFLite INT8 변환 시작...")

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]

    def representative_data_gen():
        for images, _ in representative_ds.unbatch().batch(1).take(200):
            yield [images]

    converter.representative_dataset = representative_data_gen
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS_INT8,
        tf.lite.OpsSet.SELECT_TF_OPS,  # EfficientNet mixed_float16 ops 지원
    ]
    converter.inference_input_type = tf.float32
    converter.inference_output_type = tf.float32

    tflite_model = converter.convert()
    output_path.write_bytes(tflite_model)
    size_mb = len(tflite_model) / 1024 / 1024
    logger.info("TFLite INT8 저장: %s (%.1f MB)", output_path, size_mb)


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    processed_dir = Path(args.processed_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    train_dir = processed_dir / "train"
    val_dir = processed_dir / "val"
    test_dir = processed_dir / "test"

    for d in (train_dir, val_dir, test_dir):
        if not d.exists():
            logger.error("디렉토리 없음: %s", d)
            sys.exit(1)

    # ------------------------------------------------------------------
    # 1. 레이블 맵
    # ------------------------------------------------------------------
    logger.info("레이블 맵 빌드...")
    label_map = build_label_map(train_dir)
    num_classes = len(label_map)
    logger.info("클래스 수: %d", num_classes)

    label_map_path = output_dir / "label_map.json"
    label_map_path.write_text(
        json.dumps(label_map, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    logger.info("레이블 맵 저장: %s", label_map_path)

    # ------------------------------------------------------------------
    # 2. 데이터셋
    # ------------------------------------------------------------------
    logger.info("데이터셋 로드...")
    train_ds, train_total = make_dataset(
        train_dir, label_map, args.batch_size,
        augment=True, max_per_class=args.max_images_per_class
    )
    val_ds, val_total = make_dataset(
        val_dir, label_map, args.batch_size,
        augment=False, max_per_class=args.max_images_per_class
    )
    test_ds, _ = make_dataset(
        test_dir, label_map, args.batch_size,
        augment=False, max_per_class=args.max_images_per_class
    )

    # ------------------------------------------------------------------
    # 3. 모델 빌드
    # ------------------------------------------------------------------
    logger.info("모델 빌드 (EfficientNetB2, num_classes=%d)...", num_classes)
    model, base_model = build_model(num_classes)
    model.summary(print_fn=logger.info)

    # 재개 모드
    if args.resume:
        ckpt = CHECKPOINT_DIR / "best_head.h5"
        if ckpt.exists():
            logger.info("체크포인트 로드: %s", ckpt)
            model = keras.models.load_model(str(ckpt))
        else:
            logger.warning("체크포인트 없음, 처음부터 학습")

    # ------------------------------------------------------------------
    # 4. Phase 1: 헤드 학습 (베이스 동결)
    # ------------------------------------------------------------------
    history_all = {}

    if args.epochs is not None:
        # 단순 모드 (테스트용): 헤드만, 지정된 epoch 수
        logger.info("실행 디바이스: %s", DEVICE_INFO)
        logger.info("=== 단순 모드: %d epoch 헤드 학습 ===", args.epochs)
        compile_model(model, LEARNING_RATE_HEAD)
        callbacks = make_callbacks(CHECKPOINT_DIR, "head")
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=args.epochs,
            callbacks=callbacks,
            verbose=1,
        )
        history_all["head"] = history.history
    else:
        # 전체 모드: Phase 1 (헤드) → Phase 2 (미세조정)
        logger.info("=== Phase 1: 헤드 학습 (%d epochs) ===", args.initial_epochs)
        compile_model(model, LEARNING_RATE_HEAD)
        h1 = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=args.initial_epochs,
            callbacks=make_callbacks(CHECKPOINT_DIR, "head"),
            verbose=1,
        )
        history_all["phase1"] = h1.history

        val_acc = max(h1.history.get("val_accuracy", [0]))
        logger.info("Phase 1 최고 val_accuracy: %.4f", val_acc)

        # ------------------------------------------------------------------
        # 5. Phase 2: 미세조정 (베이스 상위 레이어 언동결)
        # ------------------------------------------------------------------
        logger.info("=== Phase 2: 미세조정 (%d epochs, layer >%d 언동결) ===",
                    args.finetune_epochs, FINETUNE_AT_LAYER)
        base_model.trainable = True
        for layer in base_model.layers[:FINETUNE_AT_LAYER]:
            layer.trainable = False

        compile_model(model, LEARNING_RATE_FINETUNE)
        h2 = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=args.finetune_epochs,
            initial_epoch=0,
            callbacks=make_callbacks(CHECKPOINT_DIR, "finetune"),
            verbose=1,
        )
        history_all["phase2"] = h2.history

        val_acc = max(h2.history.get("val_accuracy", [0]))
        logger.info("Phase 2 최고 val_accuracy: %.4f", val_acc)
        if val_acc >= TARGET_TOP1_ACCURACY:
            logger.info("목표 달성: top-1 >= %.0f%%", TARGET_TOP1_ACCURACY * 100)
        else:
            logger.warning("목표 미달: %.4f < %.2f (추가 학습 필요)", val_acc, TARGET_TOP1_ACCURACY)

    # ------------------------------------------------------------------
    # 6. 테스트 평가
    # ------------------------------------------------------------------
    logger.info("테스트셋 평가...")
    results = model.evaluate(test_ds, verbose=1)
    metric_names = model.metrics_names
    eval_results = dict(zip(metric_names, results))
    logger.info("테스트 결과: %s", eval_results)

    # ------------------------------------------------------------------
    # 7. 모델 저장 (Keras 포맷)
    # ------------------------------------------------------------------
    keras_path = output_dir / f"birdwatch_{args.version}.h5"
    model.save(str(keras_path), save_format="h5")
    logger.info("Keras 모델 저장: %s", keras_path)

    # ------------------------------------------------------------------
    # 8. 학습 이력 저장
    # ------------------------------------------------------------------
    history_path = output_dir / "training_history.json"

    # numpy float → python float 변환
    def _convert(obj):
        if isinstance(obj, (np.float32, np.float64)):
            return float(obj)
        if isinstance(obj, (np.int32, np.int64)):
            return int(obj)
        return obj

    serializable = {
        phase: {k: [_convert(v) for v in vals] for k, vals in h.items()}
        for phase, h in history_all.items()
    }
    serializable["eval"] = {k: _convert(v) for k, v in eval_results.items()}
    history_path.write_text(
        json.dumps(serializable, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    logger.info("학습 이력 저장: %s", history_path)

    # ------------------------------------------------------------------
    # 9. TFLite INT8 변환
    # ------------------------------------------------------------------
    if not args.skip_tflite:
        tflite_path = output_dir / f"birdwatch_{args.version}.tflite"
        try:
            convert_to_tflite_int8(model, val_ds, tflite_path)
        except Exception as exc:
            logger.error("TFLite 변환 실패 (skip): %s", exc)
    else:
        logger.info("TFLite 변환 건너뜀 (--skip_tflite)")

    logger.info("=== 학습 완료 ===")
    logger.info("모델: %s", keras_path)
    logger.info("레이블 맵: %s", label_map_path)


if __name__ == "__main__":
    main()
