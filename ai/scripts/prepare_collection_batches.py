from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = PROJECT_ROOT / "ai" / "FULL_RETRAINING_MANIFEST.json"
DEFAULT_JSON_OUT = PROJECT_ROOT / "ai" / "COLLECTION_BATCHES.json"
DEFAULT_MD_OUT = PROJECT_ROOT / "ai" / "COLLECTION_BATCH_PLAN.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Split the full retraining manifest into executable collection batches.",
    )
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--json-out", default=str(DEFAULT_JSON_OUT))
    parser.add_argument("--md-out", default=str(DEFAULT_MD_OUT))
    parser.add_argument("--batch-size-p0", type=int, default=25)
    parser.add_argument("--batch-size-p1", type=int, default=25)
    parser.add_argument("--batch-size-p2", type=int, default=30)
    parser.add_argument("--batch-size-p3", type=int, default=30)
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def chunk_rows(rows: list[dict[str, Any]], chunk_size: int) -> list[list[dict[str, Any]]]:
    return [rows[index : index + chunk_size] for index in range(0, len(rows), chunk_size)]


def source_strategy(priority_band: str, row: dict[str, Any]) -> str:
    if priority_band == "P0":
        return "iNaturalist KR full collect -> GBIF fallback -> manual curation"
    if priority_band == "P1":
        return "iNaturalist KR top-up -> GBIF top-up -> force resplit"
    if priority_band == "P2":
        return "iNaturalist KR top-up only, GBIF if growth stalls"
    return "eval expansion after rebuild"


def build_batch(priority_band: str, batch_index: int, rows: list[dict[str, Any]]) -> dict[str, Any]:
    total_raw_deficit = sum(int(row["raw_deficit_to_pipeline_floor"]) for row in rows)
    species = []
    for row in rows:
        species.append(
            {
                "species_id": row["species_id"],
                "name_ko": row["name_ko"],
                "name_sci": row["name_sci"],
                "raw_count": row["raw_count"],
                "train_count": row["train_count"],
                "val_count": row["val_count"],
                "test_count": row["test_count"],
                "status": row["status"],
                "action": row["action"],
                "raw_deficit_to_pipeline_floor": row["raw_deficit_to_pipeline_floor"],
                "raw_deficit_to_prd_gate": row["raw_deficit_to_prd_gate"],
                "source_strategy": source_strategy(priority_band, row),
            }
        )

    return {
        "batch_id": f"{priority_band}-B{batch_index:02d}",
        "priority_band": priority_band,
        "species_count": len(rows),
        "total_raw_deficit_to_pipeline_floor": total_raw_deficit,
        "collection_order": f"{priority_band} batch {batch_index}",
        "species": species,
    }


def markdown_batch(batch: dict[str, Any]) -> str:
    lines = [
        f"### {batch['batch_id']}",
        "",
        f"- species: `{batch['species_count']}`",
        f"- total raw deficit to pipeline floor: `{batch['total_raw_deficit_to_pipeline_floor']}`",
        "",
        "| species_id | name_ko | raw | train | val | test | source |",
        "|---|---|---:|---:|---:|---:|---|",
    ]
    for species in batch["species"][:25]:
        lines.append(
            f"| {species['species_id']} | {species['name_ko']} | {species['raw_count']} | "
            f"{species['train_count']} | {species['val_count']} | {species['test_count']} | {species['source_strategy']} |"
        )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    manifest_payload = load_json(Path(args.manifest))
    manifest_rows = manifest_payload["manifest"]

    grouped: dict[str, list[dict[str, Any]]] = {"P0": [], "P1": [], "P2": [], "P3": []}
    for row in manifest_rows:
        priority_band = row["priority_band"]
        if priority_band in grouped:
            grouped[priority_band].append(row)

    batch_sizes = {
        "P0": args.batch_size_p0,
        "P1": args.batch_size_p1,
        "P2": args.batch_size_p2,
        "P3": args.batch_size_p3,
    }

    batches: list[dict[str, Any]] = []
    for priority_band in ("P0", "P1", "P2", "P3"):
        rows = grouped[priority_band]
        for batch_index, batch_rows in enumerate(chunk_rows(rows, batch_sizes[priority_band]), start=1):
            batches.append(build_batch(priority_band, batch_index, batch_rows))

    summary = {
        "priority_counts": {band: len(grouped[band]) for band in grouped},
        "batch_counts": {
            band: len([batch for batch in batches if batch["priority_band"] == band])
            for band in grouped
        },
        "batch_sizes": batch_sizes,
    }

    json_out = Path(args.json_out)
    md_out = Path(args.md_out)
    json_out.write_text(json.dumps({"summary": summary, "batches": batches}, indent=2, ensure_ascii=False), encoding="utf-8")

    md_lines = [
        "# Collection Batch Plan",
        "",
        "생성일: 2026-04-12",
        "",
        "## Source Order",
        "",
        "1. `iNaturalist KR`를 메인 수집원으로 사용",
        "2. `GBIF`를 보조 수집원으로 사용",
        "3. 그래도 부족한 종만 `manual curation`로 보완",
        "",
        "## Batch Summary",
        "",
        f"- P0 species: `{summary['priority_counts']['P0']}` / batches: `{summary['batch_counts']['P0']}`",
        f"- P1 species: `{summary['priority_counts']['P1']}` / batches: `{summary['batch_counts']['P1']}`",
        f"- P2 species: `{summary['priority_counts']['P2']}` / batches: `{summary['batch_counts']['P2']}`",
        f"- P3 species: `{summary['priority_counts']['P3']}` / batches: `{summary['batch_counts']['P3']}`",
        "",
        "## Immediate Execution Order",
        "",
        "1. P0 batches 전체를 `iNaturalist KR`로 먼저 시도",
        "2. P0에서 `raw 0` 유지 종은 `GBIF` fallback 큐로 이동",
        "3. P1 batches로 넘어가 low-shot class를 top-up",
        "4. P2/P3는 full rebuild 후 추가 라운드로 진행",
        "",
    ]

    for batch in batches:
        if batch["priority_band"] in {"P0", "P1"}:
            md_lines.extend([markdown_batch(batch), ""])

    md_out.write_text("\n".join(md_lines), encoding="utf-8")

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"Wrote JSON batches to {json_out}")
    print(f"Wrote Markdown plan to {md_out}")


if __name__ == "__main__":
    main()
