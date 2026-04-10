from __future__ import annotations

import argparse
import json
import os
import random
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

import piexif
from PIL import Image, ImageEnhance, ImageOps, UnidentifiedImageError
from sklearn.model_selection import train_test_split
from tqdm import tqdm


TARGET_SIZE = 260
MIN_RESOLUTION = 100
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
RANDOM_SEED = 42


@dataclass(frozen=True)
class OutputAssignment:
    source_path: str
    species_id: str
    split: str
    output_name: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Preprocess raw bird images into train/val/test datasets."
    )
    parser.add_argument(
        "--input_dir",
        default="data/raw",
        help="Directory containing raw per-species image folders.",
    )
    parser.add_argument(
        "--output_dir",
        default="data/processed",
        help="Directory where processed train/val/test folders will be written.",
    )
    parser.add_argument(
        "--min_train_per_class",
        type=int,
        default=150,
        help="Minimum train images per class after augmentation.",
    )
    return parser.parse_args()


def determine_worker_count() -> int:
    cpu_total = os.cpu_count() or 1
    return max(1, cpu_total - 2)


def build_processed_image(image: Image.Image) -> bytes:
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size
    crop_size = min(width, height)
    left = (width - crop_size) // 2
    upper = (height - crop_size) // 2
    image = image.crop((left, upper, left + crop_size, upper + crop_size))
    image = image.resize((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=95, exif=piexif.dump({}))
    return buffer.getvalue()


def process_single_image(source_path: str) -> Tuple[str, bool, bytes | str]:
    path = Path(source_path)
    try:
        with Image.open(path) as image:
            width, height = image.size
            if width < MIN_RESOLUTION or height < MIN_RESOLUTION:
                return source_path, False, "below_min_resolution"
            return source_path, True, build_processed_image(image)
    except (UnidentifiedImageError, OSError, ValueError):
        return source_path, False, "corrupt_or_unsupported"


def save_bytes(target_path: Path, payload: bytes) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(payload)


def load_processed_entries(processed_list_path: Path) -> set[str]:
    if not processed_list_path.exists():
        return set()
    return {
        line.strip()
        for line in processed_list_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }


def append_processed_entries(processed_list_path: Path, entries: Iterable[str]) -> None:
    items = [entry for entry in entries if entry]
    if not items:
        return
    with processed_list_path.open("a", encoding="utf-8") as handle:
        for entry in items:
            handle.write(f"{entry}\n")


def collect_species_inputs(input_dir: Path) -> Dict[str, List[Path]]:
    species_inputs: Dict[str, List[Path]] = {}
    if not input_dir.exists():
        return species_inputs

    for species_dir in sorted(path for path in input_dir.iterdir() if path.is_dir()):
        species_id = species_dir.name.split("_", 1)[0]
        images = sorted(
            path
            for path in species_dir.iterdir()
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
        )
        if images:
            species_inputs[species_id] = images
    return species_inputs


def split_species_images(images: Sequence[Path]) -> Dict[str, List[Path]]:
    items = list(images)
    if not items:
        return {"train": [], "val": [], "test": []}
    if len(items) >= 10:
        train_items, temp_items = train_test_split(
            items,
            test_size=0.2,
            random_state=RANDOM_SEED,
            shuffle=True,
        )
        val_items, test_items = train_test_split(
            temp_items,
            test_size=0.5,
            random_state=RANDOM_SEED,
            shuffle=True,
        )
        return {"train": sorted(train_items), "val": sorted(val_items), "test": sorted(test_items)}

    ordered = sorted(items)
    n_items = len(ordered)
    train_count = max(1, int(round(n_items * 0.8)))
    remaining = max(0, n_items - train_count)
    val_count = remaining // 2
    test_count = remaining - val_count
    train_items = ordered[:train_count]
    val_items = ordered[train_count : train_count + val_count]
    test_items = ordered[train_count + val_count : train_count + val_count + test_count]
    return {"train": train_items, "val": val_items, "test": test_items}


def build_assignments(species_inputs: Dict[str, List[Path]]) -> List[OutputAssignment]:
    assignments: List[OutputAssignment] = []
    for species_id, images in species_inputs.items():
        split_map = split_species_images(images)
        for split, split_images in split_map.items():
            for source_path in split_images:
                assignments.append(
                    OutputAssignment(
                        source_path=str(source_path),
                        species_id=species_id,
                        split=split,
                        output_name=f"{source_path.stem}.jpg",
                    )
                )
    return assignments


def build_output_relative_path(assignment: OutputAssignment) -> str:
    return f"{assignment.split}/{assignment.species_id}/{assignment.output_name}"


def augment_image(processed_bytes: bytes, variation_index: int) -> bytes:
    rng = random.Random(RANDOM_SEED + variation_index)
    with Image.open(BytesIO(processed_bytes)) as image:
        image = image.convert("RGB")

        if rng.random() < 0.5:
            image = ImageOps.mirror(image)

        brightness_factor = rng.uniform(0.8, 1.2)
        contrast_factor = rng.uniform(0.85, 1.15)
        rotation_angle = rng.uniform(-15.0, 15.0)

        image = ImageEnhance.Brightness(image).enhance(brightness_factor)
        image = ImageEnhance.Contrast(image).enhance(contrast_factor)
        image = image.rotate(rotation_angle, resample=Image.Resampling.BICUBIC)
        image = ImageOps.fit(image, (TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)

        output = BytesIO()
        image.save(output, format="JPEG", quality=95, exif=piexif.dump({}))
        return output.getvalue()


def write_base_images(
    processed_payloads: Dict[str, bytes],
    assignments: Sequence[OutputAssignment],
    output_dir: Path,
    processed_entries: set[str],
    processed_list_path: Path,
) -> None:
    new_entries: List[str] = []

    for assignment in tqdm(assignments, desc="Write processed", unit="img"):
        relative_path = build_output_relative_path(assignment)
        target_path = output_dir / relative_path
        if target_path.exists():
            processed_entries.add(relative_path)
            continue

        payload = processed_payloads.get(assignment.source_path)
        if payload is None:
            continue
        save_bytes(target_path, payload)
        processed_entries.add(relative_path)
        new_entries.append(relative_path)

    append_processed_entries(processed_list_path, new_entries)


def generate_augmentations(
    processed_payloads: Dict[str, bytes],
    assignments: Sequence[OutputAssignment],
    output_dir: Path,
    processed_entries: set[str],
    processed_list_path: Path,
    min_train_per_class: int,
) -> None:
    train_assignments: Dict[str, List[OutputAssignment]] = {}
    for assignment in assignments:
        if assignment.split == "train" and assignment.source_path in processed_payloads:
            train_assignments.setdefault(assignment.species_id, []).append(assignment)

    new_entries: List[str] = []
    species_items = sorted(train_assignments.items())
    for species_id, items in tqdm(species_items, desc="Augment classes", unit="class"):
        target_dir = output_dir / "train" / species_id
        target_dir.mkdir(parents=True, exist_ok=True)
        existing_train_images = sorted(target_dir.glob("*.jpg"))
        deficit = max(0, min_train_per_class - len(existing_train_images))
        if deficit == 0 or not items:
            continue

        for index in range(deficit):
            source_assignment = items[index % len(items)]
            variation_index = index + len(existing_train_images)
            relative_path = f"train/{species_id}/aug_{variation_index:05d}.jpg"
            target_path = output_dir / relative_path
            if relative_path in processed_entries and target_path.exists():
                continue
            augmented_bytes = augment_image(
                processed_payloads[source_assignment.source_path],
                variation_index=variation_index,
            )
            save_bytes(target_path, augmented_bytes)
            processed_entries.add(relative_path)
            new_entries.append(relative_path)

    append_processed_entries(processed_list_path, new_entries)


def compute_stats(output_dir: Path) -> Dict[str, Dict[str, int]]:
    stats: Dict[str, Dict[str, int]] = {}
    for split in ("train", "val", "test"):
        split_dir = output_dir / split
        if not split_dir.exists():
            continue
        for species_dir in sorted(path for path in split_dir.iterdir() if path.is_dir()):
            stats.setdefault(species_dir.name, {"train_count": 0, "val_count": 0, "test_count": 0})
            stats[species_dir.name][f"{split}_count"] = len(list(species_dir.glob("*.jpg")))
    return stats


def main() -> None:
    args = parse_args()
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    for split in ("train", "val", "test"):
        (output_dir / split).mkdir(parents=True, exist_ok=True)

    processed_list_path = output_dir / "processed_list.txt"
    processed_entries = load_processed_entries(processed_list_path)

    species_inputs = collect_species_inputs(input_dir)
    assignments = build_assignments(species_inputs)
    process_queue = []
    for assignment in assignments:
        relative_path = build_output_relative_path(assignment)
        target_path = output_dir / relative_path
        if target_path.exists():
            processed_entries.add(relative_path)
            continue
        process_queue.append(assignment.source_path)

    unique_queue = sorted(set(process_queue))
    processed_payloads: Dict[str, bytes] = {}
    if unique_queue:
        with ProcessPoolExecutor(max_workers=determine_worker_count()) as executor:
            iterator = executor.map(process_single_image, unique_queue)
            for source_path, is_valid, payload in tqdm(
                iterator,
                total=len(unique_queue),
                desc="Preprocess raw",
                unit="img",
            ):
                if is_valid:
                    processed_payloads[source_path] = payload  # type: ignore[assignment]

    for assignment in assignments:
        relative_path = build_output_relative_path(assignment)
        target_path = output_dir / relative_path
        if assignment.split != "train":
            continue
        if assignment.source_path in processed_payloads:
            continue
        if target_path.exists():
            processed_entries.add(relative_path)
            processed_payloads[assignment.source_path] = target_path.read_bytes()

    write_base_images(
        processed_payloads,
        assignments,
        output_dir,
        processed_entries,
        processed_list_path,
    )
    generate_augmentations(
        processed_payloads,
        assignments,
        output_dir,
        processed_entries,
        processed_list_path,
        min_train_per_class=args.min_train_per_class,
    )

    stats = compute_stats(output_dir)
    (output_dir / "stats.json").write_text(
        json.dumps(stats, indent=2, sort_keys=True),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
