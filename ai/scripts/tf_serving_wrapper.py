"""
tf_serving_wrapper.py — BirdWatch TFLite 추론 서버
FastAPI 기반 경량 HTTP 서버 (포트 8001)

엔드포인트:
  POST /predict  — base64 JSON 또는 multipart 이미지 → top-K 예측 반환
  GET  /health   — 서버 상태 확인

모델 스펙:
  - EfficientNet-Lite B2 TFLite (SELECT_TF_OPS)
  - 입력: 260×260 RGB [0, 1] 또는 양자화 텐서
  - 출력: N개 클래스 softmax 확률 벡터
"""

from __future__ import annotations

import base64
import json
import os
import time
from copy import deepcopy
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import io

# ── 환경변수 ──────────────────────────────────────────────────────────────────

MODEL_PATH   = Path(os.environ.get("MODEL_PATH",    "/models/birdwatch_v1.0.0.tflite"))
LABEL_PATH   = Path(os.environ.get("LABEL_MAP_PATH", "/models/label_map.json"))
FALLBACK_MODEL_PATH = Path(os.environ.get("FALLBACK_MODEL_PATH", "/models/birdwatch_v1.0.0.h5"))
MODEL_VERSION = os.environ.get("MODEL_VERSION", "v1.0.0")
TOP_K         = int(os.environ.get("TOP_K", "3"))
INPUT_SIZE    = 260  # EfficientNet-Lite B2 native input size
EAGER_LOAD_KERAS_FALLBACK = os.environ.get("EAGER_LOAD_KERAS_FALLBACK", "true").lower() == "true"

# ── TFLite Interpreter 초기화 ─────────────────────────────────────────────────

def _load_interpreter():
    """
    SELECT_TF_OPS delegate를 포함한 TFLite interpreter를 로드한다.
    tensorflow 패키지가 있으면 그쪽 TFLite를 사용하고,
    없으면 tflite_runtime으로 폴백한다.
    """
    try:
        import tensorflow as tf
        interpreter = tf.lite.Interpreter(
            model_path=str(MODEL_PATH),
            experimental_delegates=[
                tf.lite.experimental.load_delegate("libtensorflowlite_flex_delegate.so")
            ] if _flex_delegate_available() else [],
        )
    except (ImportError, AttributeError):
        # tflite_runtime 폴백
        from tflite_runtime.interpreter import Interpreter, load_delegate  # type: ignore
        try:
            interpreter = Interpreter(
                model_path=str(MODEL_PATH),
                experimental_delegates=[load_delegate("libtensorflowlite_flex_delegate.so")],
            )
        except ValueError:
            # delegate 없이 로드 (SELECT_TF_OPS 없는 환경)
            interpreter = Interpreter(model_path=str(MODEL_PATH))

    interpreter.allocate_tensors()
    return interpreter


def _flex_delegate_available() -> bool:
    """libtensorflowlite_flex_delegate.so 존재 여부 확인"""
    import ctypes.util
    return ctypes.util.find_library("tensorflowlite_flex_delegate") is not None


def _load_label_map(path: Path) -> dict[int, str]:
    """label_map.json을 읽어 index → species_id 역매핑 반환"""
    with open(path, encoding="utf-8") as f:
        raw: dict[str, int] = json.load(f)
    # raw: { "KR-001": 0, "KR-002": 1, ... }
    return {v: k for k, v in raw.items()}


# 모듈 로드 시 단 한 번만 초기화
print(f"[tf_serving_wrapper] 모델 로드 중: {MODEL_PATH}")
interpreter = _load_interpreter()
input_details  = interpreter.get_input_details()
output_details = interpreter.get_output_details()
index_to_species: dict[int, str] = _load_label_map(LABEL_PATH)
num_classes = len(index_to_species)
active_inference_backend = "tflite"
keras_fallback_model = None
keras_fallback_ready = False
keras_fallback_error: str | None = None
print(
    f"[tf_serving_wrapper] 로드 완료 — 클래스 수: {num_classes}, "
    f"입력 shape: {input_details[0]['shape']}, 버전: {MODEL_VERSION}"
)

# ── 전처리 ────────────────────────────────────────────────────────────────────

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    JPEG/PNG bytes → (1, INPUT_SIZE, INPUT_SIZE, 3) float32 [0, 1]

    1. PIL로 디코딩
    2. RGB 변환 (RGBA, 그레이스케일 등 처리)
    3. INPUT_SIZE × INPUT_SIZE 리사이즈 (LANCZOS)
    4. float32 정규화 [0, 1]
    5. 배치 차원 추가
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        raise ValueError(f"이미지 디코딩 실패: {exc}") from exc

    if img.mode != "RGB":
        img = img.convert("RGB")

    img = img.resize((INPUT_SIZE, INPUT_SIZE), Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0   # [0, 1]
    return np.expand_dims(arr, axis=0)               # (1, H, W, 3)


def adapt_input_tensor(tensor: np.ndarray, input_detail: dict) -> np.ndarray:
    """모델 입력 dtype/quantization 스펙에 맞게 텐서를 변환한다."""
    input_dtype = np.dtype(input_detail["dtype"])

    if np.issubdtype(input_dtype, np.floating):
        return tensor.astype(input_dtype, copy=False)

    if np.issubdtype(input_dtype, np.integer):
        scale, zero_point = input_detail["quantization"]
        if scale != 0:
            return (tensor / scale + zero_point).astype(input_dtype)
        return tensor.astype(input_dtype)

    raise ValueError(f"지원하지 않는 입력 dtype: {input_dtype}")


def invoke_with_dtype_fallback(input_detail: dict, tensor: np.ndarray) -> None:
    """TFLite/Flex delegate dtype 불일치 시 부동소수 텐서를 1회 재시도한다."""
    try:
        interpreter.set_tensor(input_detail["index"], tensor)
        interpreter.invoke()
        return
    except RuntimeError as exc:
        message = str(exc)
        input_dtype = np.dtype(input_detail["dtype"])
        if not np.issubdtype(input_dtype, np.floating):
            raise

        fallback_dtype: type[np.generic] | None = None
        if "Expected tensor of type half but got type float" in message:
            fallback_dtype = np.float16
        elif "Expected tensor of type float but got type half" in message:
            fallback_dtype = np.float32

        if fallback_dtype is None or np.dtype(fallback_dtype) == tensor.dtype:
            raise

        interpreter.set_tensor(input_detail["index"], tensor.astype(fallback_dtype))
        interpreter.invoke()


def normalize_dtype_config(node):
    """mixed_float16로 저장된 모델 config를 CPU-safe float32 정책으로 치환한다."""
    if isinstance(node, dict):
        normalized = {}
        for key, value in node.items():
            if key == "dtype":
                if isinstance(value, dict) and value.get("class_name") == "Policy":
                    cfg = dict(value.get("config", {}))
                    cfg["name"] = "float32"
                    normalized[key] = {"class_name": "Policy", "config": cfg}
                    continue
                if value in ("float16", "mixed_float16"):
                    normalized[key] = "float32"
                    continue
            normalized[key] = normalize_dtype_config(value)
        return normalized

    if isinstance(node, list):
        return [normalize_dtype_config(item) for item in node]

    return node


def load_keras_fallback_model():
    """CPU에서 mixed_precision 문제를 피하기 위해 float32 정책으로 fallback 모델을 재구성한다."""
    global keras_fallback_model, keras_fallback_ready, keras_fallback_error

    if keras_fallback_model is not None:
        return keras_fallback_model

    if not FALLBACK_MODEL_PATH.exists():
        raise FileNotFoundError(f"fallback model not found: {FALLBACK_MODEL_PATH}")

    import tensorflow as tf

    print(f"[tf_serving_wrapper] Keras fallback 로드 중: {FALLBACK_MODEL_PATH}")
    source_model = tf.keras.models.load_model(str(FALLBACK_MODEL_PATH), compile=False)
    config = normalize_dtype_config(deepcopy(source_model.get_config()))
    fallback_model = tf.keras.Model.from_config(config)
    fallback_model.set_weights(
        [
            np.array(weight, dtype=np.float32) if np.issubdtype(weight.dtype, np.floating) else weight
            for weight in source_model.get_weights()
        ]
    )
    keras_fallback_model = fallback_model
    keras_fallback_ready = True
    keras_fallback_error = None
    print("[tf_serving_wrapper] Keras fallback 로드 완료")
    return keras_fallback_model


def run_keras_fallback_inference(tensor: np.ndarray) -> np.ndarray:
    fallback_model = load_keras_fallback_model()
    raw_output = fallback_model(tensor.astype(np.float32, copy=False), training=False).numpy()[0]
    if np.isnan(raw_output).any():
        raise RuntimeError("Keras fallback produced NaN outputs")
    return raw_output.astype(np.float32, copy=False)


# ── 추론 ──────────────────────────────────────────────────────────────────────

def run_inference(image_bytes: bytes, top_k: int = TOP_K) -> dict:
    """
    이미지 bytes를 받아 추론 결과를 반환한다.

    반환 형태:
    {
        "predictions": [{"species_id": "KR-142", "confidence": 0.91}, ...],
        "model_version": "v1.0.0",
        "inference_ms": 312
    }
    """
    global active_inference_backend

    input_detail = input_details[0]
    base_tensor = preprocess_image(image_bytes)
    tensor = adapt_input_tensor(base_tensor, input_detail)

    t0 = time.monotonic()
    if active_inference_backend == "keras":
        raw_output = run_keras_fallback_inference(base_tensor)
    else:
        try:
            invoke_with_dtype_fallback(input_detail, tensor)
            raw_output = interpreter.get_tensor(output_details[0]["index"])[0]  # shape: (num_classes,)

            # INT8 출력 역양자화 → float 확률
            out_detail = output_details[0]
            if out_detail["dtype"] in (np.uint8, np.int8):
                scale, zero_point = out_detail["quantization"]
                if scale != 0:
                    raw_output = (raw_output.astype(np.float32) - zero_point) * scale
            elif np.issubdtype(np.dtype(out_detail["dtype"]), np.floating):
                raw_output = raw_output.astype(np.float32, copy=False)
        except Exception as exc:
            if not FALLBACK_MODEL_PATH.exists():
                raise
            print(f"[tf_serving_wrapper] TFLite 추론 실패, Keras fallback으로 전환: {exc}")
            active_inference_backend = "keras"
            raw_output = run_keras_fallback_inference(base_tensor)

    inference_ms = int((time.monotonic() - t0) * 1000)

    # softmax (이미 softmax가 적용된 경우 재적용해도 순위는 동일)
    exp_out = np.exp(raw_output - np.max(raw_output))
    probs = exp_out / exp_out.sum()

    # top-K 인덱스 추출
    top_k_clamped = min(top_k, num_classes)
    top_indices = np.argsort(probs)[::-1][:top_k_clamped]

    predictions = [
        {
            "species_id": index_to_species.get(int(idx), f"UNKNOWN-{idx}"),
            "confidence": float(round(float(probs[idx]), 6)),
        }
        for idx in top_indices
    ]

    return {
        "predictions": predictions,
        "model_version": MODEL_VERSION,
        "inference_ms": inference_ms,
        "inference_backend": active_inference_backend,
    }


# ── FastAPI 앱 ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="BirdWatch TF Serving Wrapper",
    description="EfficientNet-Lite B2 INT8 TFLite 추론 서버",
    version=MODEL_VERSION,
)


@app.on_event("startup")
async def warm_keras_fallback() -> None:
    """첫 요청 timeout을 피하기 위해 CPU-safe fallback 모델을 미리 로드한다."""
    global keras_fallback_error

    if not EAGER_LOAD_KERAS_FALLBACK or not FALLBACK_MODEL_PATH.exists():
        return

    try:
        load_keras_fallback_model()
    except Exception as exc:
        keras_fallback_error = str(exc)
        print(f"[tf_serving_wrapper] Keras fallback preload 실패: {exc}")


@app.get("/health")
async def health():
    """서버 및 모델 상태 확인"""
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "model_path": str(MODEL_PATH),
        "fallback_model_path": str(FALLBACK_MODEL_PATH),
        "num_classes": num_classes,
        "input_size": INPUT_SIZE,
        "inference_backend": active_inference_backend,
        "keras_fallback_ready": keras_fallback_ready,
        "keras_fallback_error": keras_fallback_error,
        "eager_load_keras_fallback": EAGER_LOAD_KERAS_FALLBACK,
    }


@app.post("/predict")
async def predict(
    file: Optional[UploadFile] = File(default=None),
    image_base64: Optional[str] = Form(default=None),
):
    """
    이미지를 받아 top-K 예측 결과를 반환한다.

    입력 방식 (둘 중 하나):
      - multipart: `file` 필드에 이미지 파일 업로드
      - JSON form: `image_base64` 필드에 base64 인코딩 이미지 문자열

    응답:
    {
        "predictions": [{"species_id": "KR-142", "confidence": 0.91}, ...],
        "model_version": "v1.0.0",
        "inference_ms": 312
    }
    """
    if file is not None:
        image_bytes = await file.read()
    elif image_base64 is not None:
        # data:image/jpeg;base64,... 프리픽스 제거
        b64_data = image_base64
        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(b64_data)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"base64 디코딩 실패: {exc}") from exc
    else:
        raise HTTPException(
            status_code=400,
            detail="이미지를 제공해주세요. `file`(multipart) 또는 `image_base64`(form) 중 하나가 필요합니다.",
        )

    if not image_bytes:
        raise HTTPException(status_code=400, detail="빈 이미지입니다.")

    try:
        result = run_inference(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"추론 실패: {exc}") from exc

    return JSONResponse(content=result)


# ── JSON body 방식 추가 지원 (/predict/json) ──────────────────────────────────

from pydantic import BaseModel  # noqa: E402 (임포트 순서 허용)


class PredictJsonBody(BaseModel):
    image_base64: str
    top_k: Optional[int] = TOP_K


@app.post("/predict/json")
async def predict_json(body: PredictJsonBody):
    """
    JSON body로 base64 이미지를 받아 예측 결과를 반환한다.
    백엔드 서비스에서 multipart 없이 호출할 때 사용.

    요청:
    { "image_base64": "<base64 string>", "top_k": 3 }
    """
    b64_data = body.image_base64
    if "," in b64_data:
        b64_data = b64_data.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(b64_data)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"base64 디코딩 실패: {exc}") from exc

    if not image_bytes:
        raise HTTPException(status_code=400, detail="빈 이미지입니다.")

    effective_top_k = body.top_k if body.top_k and 1 <= body.top_k <= num_classes else TOP_K

    try:
        result = run_inference(image_bytes, top_k=effective_top_k)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"추론 실패: {exc}") from exc

    return JSONResponse(content=result)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "tf_serving_wrapper:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8001")),
        log_level="info",
        workers=1,   # TFLite interpreter는 단일 인스턴스 공유 (thread-safe 아님)
    )
