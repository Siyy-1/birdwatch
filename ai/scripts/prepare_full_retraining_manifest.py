from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FULL_MAP = PROJECT_ROOT / "data" / "species_map_full.json"
DEFAULT_RAW_DIR = PROJECT_ROOT / "data" / "raw"
DEFAULT_STATS = PROJECT_ROOT / "data" / "processed" / "stats.json"
DEFAULT_LABEL_MAP = PROJECT_ROOT / "ai" / "models" / "label_map.json"
DEFAULT_CSV_OUT = PROJECT_ROOT / "ai" / "FULL_RETRAINING_MANIFEST.csv"
DEFAULT_JSON_OUT = PROJECT_ROOT / "ai" / "FULL_RETRAINING_MANIFEST.json"
DEFAULT_MD_OUT = PROJECT_ROOT / "ai" / "FULL_RETRAINING_SUMMARY.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare a full 300-species recollect/reprocess/retrain manifest.",
    )
    parser.add_argument("--full-map", default=str(DEFAULT_FULL_MAP))
    parser.add_argument("--raw-dir", default=str(DEFAULT_RAW_DIR))
    parser.add_argument("--stats", default=str(DEFAULT_STATS))
    parser.add_argument("--label-map", default=str(DEFAULT_LABEL_MAP))
    parser.add_argument("--csv-out", default=str(DEFAULT_CSV_OUT))
    parser.add_argument("--json-out", default=str(DEFAULT_JSON_OUT))
    parser.add_argument("--md-out", default=str(DEFAULT_MD_OUT))
    parser.add_argument(
        "--pipeline-min-raw",
        type=int,
        default=200,
        help="Current pipeline floor from collect/preprocess defaults.",
    )
    parser.add_argument(
        "--pipeline-min-train",
        type=int,
        default=150,
        help="Current pipeline augmentation target per class.",
    )
    parser.add_argument(
        "--prd-min-val",
        type=int,
        default=50,
        help="PRD validation minimum images per species.",
    )
    parser.add_argument(
        "--split-train",
        type=float,
        default=0.8,
    )
    parser.add_argument(
        "--split-val",
        type=float,
        default=0.1,
    )
    parser.add_argument(
        "--split-test",
        type=float,
        default=0.1,
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def count_raw_images(raw_dir: Path) -> dict[str, int]:
    counts: dict[str, int] = {}
    if not raw_dir.exists():
        return counts

    for species_dir in sorted(path for path in raw_dir.iterdir() if path.is_dir()):
        species_id = species_dir.name.split("_", 1)[0]
        image_count = sum(
            1
            for file_path in species_dir.iterdir()
            if file_path.is_file() and file_path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        )
        counts[species_id] = image_count
    return counts


def derive_prd_raw_target(prd_min_val: int, split_val: float, split_test: float) -> int:
    # With the current 80/10/10 split, a 50-image validation minimum implies 500 processed images.
    min_for_val = int((prd_min_val / split_val) + 0.999999)
    min_for_test = int((prd_min_val / split_test) + 0.999999)
    return max(min_for_val, min_for_test)


def classify_priority(
    raw_count: int,
    train_count: int,
    val_count: int,
    test_count: int,
    in_label_map: bool,
    pipeline_min_raw: int,
    pipeline_min_train: int,
    prd_min_val: int,
) -> tuple[str, str]:
    if raw_count == 0:
        return "P0", "missing_raw"
    if not in_label_map:
        return "P0", "not_in_training_set"
    if val_count == 0 or test_count == 0:
        return "P1", "split_gap"
    if train_count < 50 or raw_count < 50:
        return "P1", "critical_low_shot"
    if train_count < pipeline_min_train or raw_count < pipeline_min_raw:
        return "P2", "below_pipeline_floor"
    if val_count < prd_min_val or test_count < prd_min_val:
        return "P3", "below_prd_validation_gate"
    return "P4", "ready_for_full_retrain"


def markdown_table(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "_none_"

    lines = [
        "| priority | species_id | name_ko | raw | train | val | test | action |",
        "|---|---|---|---:|---:|---:|---:|---|",
    ]
    for row in rows:
        lines.append(
            f"| {row['priority_band']} | {row['species_id']} | {row['name_ko']} | "
            f"{row['raw_count']} | {row['train_count']} | {row['val_count']} | {row['test_count']} | {row['action']} |"
        )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()

    full_map = load_json(Path(args.full_map))
    stats = load_json(Path(args.stats))
    label_map = load_json(Path(args.label_map))
    raw_counts = count_raw_images(Path(args.raw_dir))

    prd_raw_target = derive_prd_raw_target(
        prd_min_val=args.prd_min_val,
        split_val=args.split_val,
        split_test=args.split_test,
    )

    manifest_rows: list[dict[str, Any]] = []
    for species in full_map:
        species_id = species["species_id"]
        stat = stats.get(species_id, {})
        raw_count = int(raw_counts.get(species_id, 0) or 0)
        train_count = int(stat.get("train_count", 0) or 0)
        val_count = int(stat.get("val_count", 0) or 0)
        test_count = int(stat.get("test_count", 0) or 0)
        total_processed = train_count + val_count + test_count
        in_label_map = species_id in label_map

        priority_band, status = classify_priority(
            raw_count=raw_count,
            train_count=train_count,
            val_count=val_count,
            test_count=test_count,
            in_label_map=in_label_map,
            pipeline_min_raw=args.pipeline_min_raw,
            pipeline_min_train=args.pipeline_min_train,
            prd_min_val=args.prd_min_val,
        )

        if priority_band == "P0":
            action = "collect_from_zero_then_preprocess"
        elif priority_band == "P1":
            action = "recollect_and_force_full_resplit"
        elif priority_band == "P2":
            action = "top_up_data_then_reprocess"
        elif priority_band == "P3":
            action = "expand_eval_coverage"
        else:
            action = "keep_for_full_rebuild"

        manifest_rows.append(
            {
                "species_id": species_id,
                "name_ko": species.get("name_ko", ""),
                "name_sci": species.get("name_sci", ""),
                "raw_count": raw_count,
                "train_count": train_count,
                "val_count": val_count,
                "test_count": test_count,
                "total_processed": total_processed,
                "in_label_map": in_label_map,
                "priority_band": priority_band,
                "status": status,
                "action": action,
                "pipeline_min_raw_target": args.pipeline_min_raw,
                "pipeline_min_train_target": args.pipeline_min_train,
                "prd_min_val_target": args.prd_min_val,
                "prd_implied_raw_target": prd_raw_target,
                "raw_deficit_to_pipeline_floor": max(0, args.pipeline_min_raw - raw_count),
                "raw_deficit_to_prd_gate": max(0, prd_raw_target - raw_count),
                "train_deficit_to_pipeline_floor": max(0, args.pipeline_min_train - train_count),
                "val_deficit_to_prd_gate": max(0, args.prd_min_val - val_count),
                "test_deficit_to_prd_gate": max(0, args.prd_min_val - test_count),
            }
        )

    priority_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3, "P4": 4}
    manifest_rows.sort(key=lambda row: (priority_order[row["priority_band"]], row["raw_count"], row["train_count"], row["species_id"]))

    summary = {
        "target_species_count": len(manifest_rows),
        "raw_species_dirs": len(raw_counts),
        "pipeline_min_raw_target": args.pipeline_min_raw,
        "pipeline_min_train_target": args.pipeline_min_train,
        "prd_min_val_target": args.prd_min_val,
        "prd_implied_raw_target": prd_raw_target,
        "priority_counts": {
            band: sum(1 for row in manifest_rows if row["priority_band"] == band)
            for band in ("P0", "P1", "P2", "P3", "P4")
        },
        "raw_under_pipeline_floor": sum(1 for row in manifest_rows if row["raw_count"] < args.pipeline_min_raw),
        "raw_under_prd_gate": sum(1 for row in manifest_rows if row["raw_count"] < prd_raw_target),
        "train_under_pipeline_floor": sum(1 for row in manifest_rows if row["train_count"] < args.pipeline_min_train),
        "val_under_prd_gate": sum(1 for row in manifest_rows if row["val_count"] < args.prd_min_val),
        "test_under_prd_gate": sum(1 for row in manifest_rows if row["test_count"] < args.prd_min_val),
        "not_in_label_map": sum(1 for row in manifest_rows if not row["in_label_map"]),
    }

    csv_path = Path(args.csv_out)
    json_path = Path(args.json_out)
    md_path = Path(args.md_out)
    csv_path.parent.mkdir(parents=True, exist_ok=True)

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(manifest_rows[0].keys()))
        writer.writeheader()
        writer.writerows(manifest_rows)

    json_path.write_text(
        json.dumps({"summary": summary, "manifest": manifest_rows}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    md_text = f"""# Full Retraining Summary

Generated: 2026-04-12

## Summary

- Target species: `{summary["target_species_count"]}`
- Species currently in label map: `{summary["target_species_count"] - summary["not_in_label_map"]}`
- Species missing from label map: `{summary["not_in_label_map"]}`
- Species with raw `< {args.pipeline_min_raw}`: `{summary["raw_under_pipeline_floor"]}`
- Species with train `< {args.pipeline_min_train}`: `{summary["train_under_pipeline_floor"]}`
- Species with val `< {args.prd_min_val}`: `{summary["val_under_prd_gate"]}`
- Species with test `< {args.prd_min_val}`: `{summary["test_under_prd_gate"]}`
- PRD-implied raw target under current `80/10/10` split: `{prd_raw_target}`

## Key Finding

- This should be treated as a **full 300-species rebuild**, not a partial top-up.
- `300` raw species directories exist, but only `141` species made it into the trained label map.
- `286` species are still below the current pipeline floor of `200` raw images.
- Under the current `80/10/10` split, the PRD requirement of `50` validation images per species implies about `{prd_raw_target}` processed images per species.

## Priority Bands

- `P0`: no usable raw images or missing entirely from training output
- `P1`: extremely low-shot or broken split quality
- `P2`: below current pipeline floor
- `P3`: usable for training but below PRD evaluation gate
- `P4`: already suitable for the next full rebuild

## Top P0/P1 Items

{markdown_table([row for row in manifest_rows if row["priority_band"] in {"P0", "P1"}][:40])}
"""
    md_path.write_text(md_text, encoding="utf-8")

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"Wrote CSV manifest to {csv_path}")
    print(f"Wrote JSON manifest to {json_path}")
    print(f"Wrote Markdown summary to {md_path}")


if __name__ == "__main__":
    main()
