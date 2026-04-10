from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import requests
from requests import Response, Session
from tqdm import tqdm


API_URL = "https://api.inaturalist.org/v1/observations"
DEFAULT_PLACE_ID = 7184
DEFAULT_TAXON_ID = 3
DEFAULT_QUALITY_GRADE = "research"
DEFAULT_PER_PAGE = 200
DEFAULT_MIN_IMAGES = 200
DEFAULT_MAX_IMAGES = 500
REQUEST_SLEEP_SECONDS = 0.5
RETRY_ATTEMPTS = 3
BACKOFF_SECONDS = 1.0
DEFAULT_SPECIES_MAP = [
    {
        "species_id": "KR-001",
        "name_sci": "Ciconia boyciana",
        "name_ko": "Oriental Stork",
    },
    {
        "species_id": "KR-002",
        "name_sci": "Cygnus columbianus",
        "name_ko": "Tundra Swan",
    },
]


@dataclass(frozen=True)
class SpeciesRecord:
    species_id: str
    name_sci: str
    name_ko: str = ""


def configure_logging() -> logging.Logger:
    project_root = Path(__file__).resolve().parents[2]
    log_dir = project_root / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"collect_{datetime.now().strftime('%Y%m%d')}.log"

    logger = logging.getLogger("collect_inaturalist")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)
    return logger


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect bird observation images from the iNaturalist Open API."
    )
    parser.add_argument(
        "--species_id",
        help="Collect a single species by species_id (for example KR-001).",
    )
    parser.add_argument(
        "--species_map",
        default="data/species_map.json",
        help="Path to species mapping JSON. Falls back to an embedded sample map if missing.",
    )
    parser.add_argument(
        "--min_images",
        type=int,
        default=DEFAULT_MIN_IMAGES,
        help="Minimum number of images to collect per species.",
    )
    parser.add_argument(
        "--max_images",
        type=int,
        default=DEFAULT_MAX_IMAGES,
        help="Maximum number of images to collect per species.",
    )
    parser.add_argument(
        "--output_dir",
        default="data/raw",
        help="Directory where downloaded images and metadata will be stored.",
    )
    parser.add_argument(
        "--place_id",
        type=int,
        default=DEFAULT_PLACE_ID,
        help="iNaturalist place_id filter. Default is South Korea.",
    )
    parser.add_argument(
        "--taxon_id",
        type=int,
        default=DEFAULT_TAXON_ID,
        help="iNaturalist taxon_id filter. Default is Aves (3).",
    )
    parser.add_argument(
        "--quality_grade",
        default=DEFAULT_QUALITY_GRADE,
        help="iNaturalist observation quality grade filter.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="HTTP timeout in seconds for API and image download requests.",
    )
    return parser.parse_args()


def slugify_scientific_name(name: str) -> str:
    return "".join(char if char.isalnum() else "_" for char in name).strip("_")


def load_species_map(species_map_path: Path, logger: logging.Logger) -> List[SpeciesRecord]:
    if species_map_path.exists():
        records = json.loads(species_map_path.read_text(encoding="utf-8"))
        logger.info("Loaded species map from %s", species_map_path)
    else:
        logger.warning(
            "Species map not found at %s. Falling back to embedded sample entries.",
            species_map_path,
        )
        records = DEFAULT_SPECIES_MAP

    species_records: List[SpeciesRecord] = []
    for item in records:
        if "species_id" not in item or "name_sci" not in item:
            continue
        species_records.append(
            SpeciesRecord(
                species_id=item["species_id"],
                name_sci=item["name_sci"],
                name_ko=item.get("name_ko", ""),
            )
        )
    return species_records


def load_existing_metadata(metadata_path: Path) -> Dict[str, Dict]:
    if not metadata_path.exists():
        return {}
    try:
        payload = json.loads(metadata_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    existing: Dict[str, Dict] = {}
    for entry in payload:
        key = metadata_key(entry.get("observation_id"), entry.get("photo_id"))
        existing[key] = entry
    return existing


def metadata_key(observation_id: object, photo_id: object) -> str:
    return f"{observation_id}:{photo_id}"


def stable_image_name(observation_id: int, photo_id: int) -> str:
    return f"obs_{observation_id}_photo_{photo_id}.jpg"


def normalize_photo_url(url: str) -> str:
    return url.replace("/square.", "/large.")


def rate_limited_get(
    session: Session,
    url: str,
    *,
    logger: logging.Logger,
    timeout: float,
    params: Optional[Dict] = None,
    is_api_call: bool = False,
) -> Response:
    last_error: Optional[Exception] = None
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            if is_api_call:
                time.sleep(REQUEST_SLEEP_SECONDS)
            response = session.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            wait_seconds = BACKOFF_SECONDS * (2 ** (attempt - 1))
            logger.warning(
                "Request failed (%s) on attempt %s/%s for %s. Retrying in %.1fs.",
                exc,
                attempt,
                RETRY_ATTEMPTS,
                url,
                wait_seconds,
            )
            if attempt == RETRY_ATTEMPTS:
                break
            time.sleep(wait_seconds)
    assert last_error is not None
    raise last_error


def fetch_observation_page(
    session: Session,
    *,
    species: SpeciesRecord,
    page: int,
    args: argparse.Namespace,
    logger: logging.Logger,
) -> Dict:
    params = {
        "taxon_id": args.taxon_id,
        "place_id": args.place_id,
        "quality_grade": args.quality_grade,
        "has": "photos",
        "per_page": DEFAULT_PER_PAGE,
        "page": page,
        "order": "desc",
        "order_by": "created_at",
        "taxon_name": species.name_sci,
    }
    response = rate_limited_get(
        session,
        API_URL,
        logger=logger,
        timeout=args.timeout,
        params=params,
        is_api_call=True,
    )
    return response.json()


def iter_species(records: Iterable[SpeciesRecord], species_id: Optional[str]) -> List[SpeciesRecord]:
    if species_id is None:
        return list(records)
    return [record for record in records if record.species_id == species_id]


def collect_species(
    session: Session,
    species: SpeciesRecord,
    args: argparse.Namespace,
    logger: logging.Logger,
) -> None:
    species_dir = Path(args.output_dir) / f"{species.species_id}_{slugify_scientific_name(species.name_sci)}"
    species_dir.mkdir(parents=True, exist_ok=True)
    metadata_path = species_dir / "metadata.json"
    existing_metadata = load_existing_metadata(metadata_path)

    existing_images = {path.name for path in species_dir.glob("*.jpg")}
    collected_count = sum(1 for _ in existing_images)
    target_count = min(max(args.min_images, 0), max(args.max_images, 0))
    if target_count <= 0:
        raise ValueError("Both --min_images and --max_images must be positive.")

    if collected_count >= target_count:
        logger.info(
            "Skipping %s because %s images already exist (target=%s).",
            species.species_id,
            collected_count,
            target_count,
        )
        return

    progress = tqdm(
        total=target_count,
        initial=min(collected_count, target_count),
        desc=f"{species.species_id}",
        unit="img",
    )

    page = 1
    seen_keys = set(existing_metadata)
    while collected_count < target_count:
        payload = fetch_observation_page(
            session,
            species=species,
            page=page,
            args=args,
            logger=logger,
        )
        results = payload.get("results", [])
        if not results:
            logger.info("No more results for %s at page %s.", species.species_id, page)
            break

        for observation in results:
            for photo in observation.get("photos", []):
                key = metadata_key(observation.get("id"), photo.get("id"))
                if key in seen_keys and stable_image_name(observation["id"], photo["id"]) in existing_images:
                    continue

                image_name = stable_image_name(observation["id"], photo["id"])
                image_path = species_dir / image_name
                image_url = normalize_photo_url(photo["url"])

                if image_name not in existing_images:
                    try:
                        image_response = rate_limited_get(
                            session,
                            image_url,
                            logger=logger,
                            timeout=args.timeout,
                        )
                    except requests.RequestException as exc:
                        logger.error(
                            "Failed to download image for %s (%s): %s",
                            species.species_id,
                            image_url,
                            exc,
                        )
                        continue
                    image_path.write_bytes(image_response.content)
                    existing_images.add(image_name)
                    collected_count += 1
                    progress.update(1)

                metadata_entry = {
                    "species_id": species.species_id,
                    "name_sci": species.name_sci,
                    "name_ko": species.name_ko,
                    "observation_id": observation.get("id"),
                    "photo_id": photo.get("id"),
                    "file_name": image_name,
                    "url": image_url,
                    "observed_on": observation.get("observed_on"),
                    "quality_grade": observation.get("quality_grade"),
                    "observer": (observation.get("user") or {}).get("login"),
                    "location": observation.get("location"),
                    "license_code": photo.get("license_code"),
                }
                existing_metadata[key] = metadata_entry
                seen_keys.add(key)

                if collected_count >= target_count:
                    break
            if collected_count >= target_count:
                break
        page += 1

    progress.close()
    ordered_metadata = sorted(
        existing_metadata.values(),
        key=lambda item: (item.get("observation_id") or 0, item.get("photo_id") or 0),
    )
    metadata_path.write_text(
        json.dumps(ordered_metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logger.info(
        "Collected %s images for %s into %s.",
        collected_count,
        species.species_id,
        species_dir,
    )


def main() -> None:
    args = parse_args()
    logger = configure_logging()
    species_map_path = Path(args.species_map)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    records = iter_species(load_species_map(species_map_path, logger), args.species_id)
    if not records:
        raise SystemExit(f"No species matched --species_id={args.species_id!r}.")

    with requests.Session() as session:
        session.headers.update({"User-Agent": "BirdWatchAI/1.0 (+https://example.local)"})
        for species in tqdm(records, desc="Species", unit="species"):
            collect_species(session, species, args, logger)


if __name__ == "__main__":
    main()
