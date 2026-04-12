from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FULL_MAP = PROJECT_ROOT / "data" / "species_map_full.json"
DEFAULT_LABEL_MAP = PROJECT_ROOT / "ai" / "models" / "label_map.json"
DEFAULT_STATS = PROJECT_ROOT / "data" / "processed" / "stats.json"
DEFAULT_HISTORY = PROJECT_ROOT / "ai" / "models" / "training_history.json"
DEFAULT_JSON_OUT = PROJECT_ROOT / "ai" / "AI_RETRAINING_GAP_REPORT.json"
DEFAULT_MD_OUT = PROJECT_ROOT / "ai" / "AI_RETRAINING_GAP_REPORT.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze BirdWatch model coverage against the 300-species launch target.",
    )
    parser.add_argument("--full-map", default=str(DEFAULT_FULL_MAP))
    parser.add_argument("--label-map", default=str(DEFAULT_LABEL_MAP))
    parser.add_argument("--stats", default=str(DEFAULT_STATS))
    parser.add_argument("--history", default=str(DEFAULT_HISTORY))
    parser.add_argument("--json-out", default=str(DEFAULT_JSON_OUT))
    parser.add_argument("--md-out", default=str(DEFAULT_MD_OUT))
    parser.add_argument(
        "--min-train-target",
        type=int,
        default=150,
        help="Desired minimum train images per class for the next retraining target.",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def format_species_rows(species_rows: list[dict[str, Any]]) -> str:
    if not species_rows:
        return "_없음_"

    lines = ["| species_id | name_ko | name_sci | train | val | test | total |", "|---|---|---|---:|---:|---:|---:|"]
    for row in species_rows:
        lines.append(
            f"| {row['species_id']} | {row['name_ko']} | {row['name_sci']} | "
            f"{row.get('train_count', 0)} | {row.get('val_count', 0)} | {row.get('test_count', 0)} | {row.get('total_count', 0)} |"
        )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()

    full_map_path = Path(args.full_map)
    label_map_path = Path(args.label_map)
    stats_path = Path(args.stats)
    history_path = Path(args.history)
    json_out_path = Path(args.json_out)
    md_out_path = Path(args.md_out)

    full_map = load_json(full_map_path)
    label_map = load_json(label_map_path)
    stats = load_json(stats_path)
    history = load_json(history_path)

    full_by_id = {row["species_id"]: row for row in full_map}
    full_ids = [row["species_id"] for row in full_map]
    label_ids = set(label_map.keys())
    stats_ids = set(stats.keys())

    covered_rows: list[dict[str, Any]] = []
    missing_rows: list[dict[str, Any]] = []
    under_target_rows: list[dict[str, Any]] = []
    no_val_rows: list[dict[str, Any]] = []
    no_test_rows: list[dict[str, Any]] = []

    for species_id in full_ids:
        species = full_by_id[species_id]
        stat = stats.get(species_id, {})
        train_count = int(stat.get("train_count", 0) or 0)
        val_count = int(stat.get("val_count", 0) or 0)
        test_count = int(stat.get("test_count", 0) or 0)
        total_count = train_count + val_count + test_count

        row = {
            "species_id": species_id,
            "name_ko": species.get("name_ko", ""),
            "name_sci": species.get("name_sci", ""),
            "train_count": train_count,
            "val_count": val_count,
            "test_count": test_count,
            "total_count": total_count,
            "in_label_map": species_id in label_ids,
            "in_processed_stats": species_id in stats_ids,
        }

        if species_id in label_ids:
            covered_rows.append(row)
        else:
            missing_rows.append(row)

        if species_id in label_ids and train_count < args.min_train_target:
            under_target_rows.append(row)
        if species_id in label_ids and val_count == 0:
            no_val_rows.append(row)
        if species_id in label_ids and test_count == 0:
            no_test_rows.append(row)

    covered_rows.sort(key=lambda row: (row["train_count"], row["total_count"], row["species_id"]))
    missing_rows.sort(key=lambda row: row["species_id"])
    under_target_rows.sort(key=lambda row: (row["train_count"], row["total_count"], row["species_id"]))
    no_val_rows.sort(key=lambda row: (row["total_count"], row["species_id"]))
    no_test_rows.sort(key=lambda row: (row["total_count"], row["species_id"]))

    eval_metrics = history.get("eval", {})
    summary = {
        "target_species_count": len(full_ids),
        "trained_species_count": len(covered_rows),
        "missing_species_count": len(missing_rows),
        "coverage_ratio": round(len(covered_rows) / len(full_ids), 4) if full_ids else 0,
        "eval_accuracy": eval_metrics.get("accuracy"),
        "eval_top5_accuracy": eval_metrics.get("top5_accuracy"),
        "classes_under_train_target": len(under_target_rows),
        "classes_without_val_split": len(no_val_rows),
        "classes_without_test_split": len(no_test_rows),
        "recommended_min_train_target": args.min_train_target,
    }

    report = {
        "summary": summary,
        "missing_species": missing_rows,
        "covered_but_under_train_target": under_target_rows,
        "covered_without_val_split": no_val_rows,
        "covered_without_test_split": no_test_rows,
        "weakest_covered_species": covered_rows[:25],
    }

    json_out_path.parent.mkdir(parents=True, exist_ok=True)
    json_out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    md = f"""# AI Retraining Gap Report

생성일: 2026-04-12

## 요약

- 목표 종 수: `{summary["target_species_count"]}`
- 현재 학습 종 수: `{summary["trained_species_count"]}`
- 누락 종 수: `{summary["missing_species_count"]}`
- 현재 커버리지: `{summary["coverage_ratio"] * 100:.1f}%`
- 현재 eval top-1 accuracy: `{summary["eval_accuracy"]}`
- 현재 eval top-5 accuracy: `{summary["eval_top5_accuracy"]}`
- 목표 미달 train class 수(`< {args.min_train_target}`): `{summary["classes_under_train_target"]}`
- val split 없는 class 수: `{summary["classes_without_val_split"]}`
- test split 없는 class 수: `{summary["classes_without_test_split"]}`

## 판단

- 현재 모델은 `300종 출시 기준`을 만족하지 못한다.
- 가장 큰 갭은 `정확도`보다 먼저 `학습 커버리지 부족`이다.
- 현재 재학습 트랙의 1차 목표는 `159개 누락 종`을 학습 입력에 편입하는 것이다.
- 그 다음 목표는 기존 141개 학습 종도 `class별 최소 장수`와 `val/test 분리 품질`을 재정비하는 것이다.

## 우선 액션

1. `missing_species` 159종부터 데이터 수집 큐 생성
2. 현재 141종 중 low-shot class 보강
3. `species_map_full.json`을 기준으로 재수집/전처리/TFRecord를 다시 생성
4. `v1.1.0` 재학습 후 전체 top-1/top-3와 confusion report 재평가

## 누락 종 샘플 30개

{format_species_rows(missing_rows[:30])}

## 학습되었지만 train 장수가 낮은 종 25개

{format_species_rows(under_target_rows[:25])}

## val split이 없는 종 25개

{format_species_rows(no_val_rows[:25])}

## test split이 없는 종 25개

{format_species_rows(no_test_rows[:25])}
"""
    md_out_path.write_text(md, encoding="utf-8")

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"Wrote JSON report to {json_out_path}")
    print(f"Wrote Markdown report to {md_out_path}")


if __name__ == "__main__":
    main()
