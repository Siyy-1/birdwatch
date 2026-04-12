# AI Data Pipeline

This directory contains a three-step dataset pipeline for the BirdWatch AI training workflow described in `_workspace/spec_ai_pipeline.md`.

## Files

- `scripts/collect_inaturalist.py`: Collects Korean bird observations from the iNaturalist API into `data/raw/`.
- `scripts/preprocess_images.py`: Removes EXIF with `piexif`, center-crops and resizes images to `260x260`, splits data into `train/val/test`, and augments underrepresented classes.
- `scripts/generate_tfrecords.py`: Converts processed images into sharded TFRecord datasets and writes label and dataset metadata.
- `scripts/analyze_training_coverage.py`: Compares the current trained label map and processed dataset coverage against the full 300-species target and writes a gap report into `_workspace/`.

## Install

```bash
pip install -r ai/requirements.txt
```

## Usage

```bash
python ai/scripts/collect_inaturalist.py --output_dir data/raw
python ai/scripts/preprocess_images.py --input_dir data/raw --output_dir data/processed
python ai/scripts/generate_tfrecords.py --input_dir data/processed --output_dir data/tfrecords
python ai/scripts/analyze_training_coverage.py
```

## Notes

- `collect_inaturalist.py` supports resumable downloads by skipping existing image files and merging `metadata.json`.
- The iNaturalist collector uses a built-in sample species map when `data/species_map.json` is missing. For the full 300-class production dataset, provide a complete mapping file.
- `preprocess_images.py` stores resumable output paths in `data/processed/processed_list.txt` when it runs.
- `generate_tfrecords.py` verifies that TFRecord record counts match the processed image count for each split.
- `analyze_training_coverage.py` currently reports the gap between the `300`-species launch target and the interim `141`-class trained model.
