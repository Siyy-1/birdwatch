"""birdwatch_v1.0.0.h5  →  birdwatch_v1.0.0.tflite (INT8 + SELECT_TF_OPS)"""
import argparse
import logging
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def convert(model_path: Path, output_path: Path, tfrecord_dir: Path) -> None:
    logger.info("모델 로드: %s", model_path)
    model = keras.models.load_model(str(model_path), compile=False)
    model.summary(print_fn=lambda x: None)

    # representative dataset (val or train tfrecords)
    tfrecord_files = sorted(tfrecord_dir.glob("val/**/*.tfrecord")) or \
                     sorted(tfrecord_dir.glob("val-*.tfrecord"))
    if not tfrecord_files:
        tfrecord_files = sorted(tfrecord_dir.glob("train/**/*.tfrecord"))[:1] or \
                         sorted(tfrecord_dir.glob("train-*.tfrecord"))[:1]

    if tfrecord_files:
        logger.info("Representative dataset: %s", [f.name for f in tfrecord_files])

        feature_desc = {
            "image/encoded":       tf.io.FixedLenFeature([], tf.string),
            "image/class/label":   tf.io.FixedLenFeature([], tf.int64),
        }

        def _parse(example):
            feat = tf.io.parse_single_example(example, feature_desc)
            img = tf.io.decode_jpeg(feat["image/encoded"], channels=3)
            img = tf.image.resize(img, [260, 260])
            img = tf.cast(img, tf.float32) / 255.0
            return img

        raw_ds = tf.data.TFRecordDataset(
            [str(f) for f in tfrecord_files]
        ).map(_parse, num_parallel_calls=1)

        def representative_data_gen():
            for img in raw_ds.batch(1).take(200):
                yield [img]
    else:
        logger.warning("TFRecord 없음 — 랜덤 데이터로 대체 (정확도 낮을 수 있음)")

        def representative_data_gen():
            for _ in range(200):
                yield [np.random.rand(1, 260, 260, 3).astype(np.float32)]

    logger.info("TFLite 변환 시작 (INT8 + SELECT_TF_OPS)...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_data_gen
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS_INT8,
        tf.lite.OpsSet.SELECT_TF_OPS,
    ]
    converter.inference_input_type = tf.float32
    converter.inference_output_type = tf.float32

    tflite_model = converter.convert()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(tflite_model)
    size_mb = len(tflite_model) / 1024 / 1024
    logger.info("저장 완료: %s (%.1f MB)", output_path, size_mb)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--tfrecord_dir", default="/workspace/data/tfrecords")
    args = parser.parse_args()

    convert(Path(args.model), Path(args.output), Path(args.tfrecord_dir))
