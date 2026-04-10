from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import tensorflow as tf
from PIL import Image
from tqdm import tqdm


SUPPORTED_EXTENSIONS = {".jpg", ".jpeg"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert processed bird images into sharded TFRecord datasets."
    )
    parser.add_argument(
        "--input_dir",
        default="data/processed",
        help="Directory containing processed train/val/test image folders.",
    )
    parser.add_argument(
        "--output_dir",
        default="data/tfrecords",
        help="Directory where TFRecord shards and metadata will be written.",
    )
    parser.add_argument(
        "--shard_size",
        type=int,
        default=1000,
        help="Maximum number of records per shard.",
    )
    return parser.parse_args()


def bytes_feature(value: bytes) -> tf.train.Feature:
    return tf.train.Feature(bytes_list=tf.train.BytesList(value=[value]))


def int64_feature(value: int) -> tf.train.Feature:
    return tf.train.Feature(int64_list=tf.train.Int64List(value=[value]))


def list_split_images(input_dir: Path, split: str) -> List[Tuple[str, Path]]:
    split_dir = input_dir / split
    items: List[Tuple[str, Path]] = []
    if not split_dir.exists():
        return items

    for species_dir in sorted(path for path in split_dir.iterdir() if path.is_dir()):
        for image_path in sorted(species_dir.iterdir()):
            if image_path.is_file() and image_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                items.append((species_dir.name, image_path))
    return items


def build_label_map(input_dir: Path) -> Dict[str, int]:
    species_ids = set()
    for split in ("train", "val", "test"):
        split_dir = input_dir / split
        if not split_dir.exists():
            continue
        species_ids.update(path.name for path in split_dir.iterdir() if path.is_dir())
    return {species_id: index for index, species_id in enumerate(sorted(species_ids))}


def create_example(image_path: Path, species_id: str, label_index: int) -> tf.train.Example:
    encoded = image_path.read_bytes()
    with Image.open(image_path) as image:
        width, height = image.size

    features = {
        "image/encoded": bytes_feature(encoded),
        "image/format": bytes_feature(b"jpeg"),
        "image/class/label": int64_feature(label_index),
        "image/class/species_id": bytes_feature(species_id.encode("utf-8")),
        "image/height": int64_feature(height),
        "image/width": int64_feature(width),
    }
    return tf.train.Example(features=tf.train.Features(feature=features))


def shard_paths(split_output_dir: Path, split: str, total_items: int, shard_size: int) -> List[Path]:
    shard_count = max(1, math.ceil(total_items / shard_size))
    return [
        split_output_dir / f"{split}-{index:05d}-of-{shard_count:05d}.tfrecord"
        for index in range(shard_count)
    ]


def count_tfrecord_records(paths: Sequence[Path]) -> int:
    total = 0
    for path in paths:
        dataset = tf.data.TFRecordDataset(str(path))
        total += sum(1 for _ in dataset)
    return total


def write_split_records(
    split: str,
    items: Sequence[Tuple[str, Path]],
    label_map: Dict[str, int],
    output_dir: Path,
    shard_size: int,
) -> Dict[str, int]:
    split_output_dir = output_dir / split
    split_output_dir.mkdir(parents=True, exist_ok=True)

    expected_paths = shard_paths(split_output_dir, split, len(items), shard_size)
    if expected_paths and all(path.exists() for path in expected_paths):
        existing_count = count_tfrecord_records(expected_paths)
        if existing_count == len(items):
            return {"records": existing_count, "shards": len(expected_paths), "skipped": 1}

    for path in split_output_dir.glob("*.tfrecord"):
        path.unlink()

    written_records = 0
    for shard_index, shard_path in enumerate(expected_paths):
        shard_items = items[shard_index * shard_size : (shard_index + 1) * shard_size]
        with tf.io.TFRecordWriter(str(shard_path)) as writer:
            for species_id, image_path in tqdm(
                shard_items,
                desc=f"Write {split} shard {shard_index + 1}/{len(expected_paths)}",
                unit="img",
            ):
                example = create_example(image_path, species_id, label_map[species_id])
                writer.write(example.SerializeToString())
                written_records += 1

    verified_count = count_tfrecord_records(expected_paths)
    if verified_count != len(items):
        raise RuntimeError(
            f"Integrity check failed for split {split}: expected {len(items)} records, got {verified_count}."
        )
    return {"records": verified_count, "shards": len(expected_paths), "skipped": 0}


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    label_map = build_label_map(input_dir)
    (output_dir / "label_map.json").write_text(
        json.dumps(label_map, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    split_sizes: Dict[str, int] = {}
    shard_summary: Dict[str, Dict[str, int]] = {}
    total_images = 0

    for split in ("train", "val", "test"):
        items = list_split_images(input_dir, split)
        split_sizes[split] = len(items)
        total_images += len(items)
        if not items:
            shard_summary[split] = {"records": 0, "shards": 0, "skipped": 1}
            continue
        shard_summary[split] = write_split_records(
            split=split,
            items=items,
            label_map=label_map,
            output_dir=output_dir,
            shard_size=args.shard_size,
        )

    dataset_info = {
        "total_images": total_images,
        "num_classes": len(label_map),
        "split_sizes": split_sizes,
        "shard_size": args.shard_size,
        "shards": shard_summary,
        "verified_records": {
            split: summary["records"] for split, summary in shard_summary.items()
        },
    }
    (output_dir / "dataset_info.json").write_text(
        json.dumps(dataset_info, indent=2, sort_keys=True),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
