"""Vercel Python serverless function for diabetes predictions.

The training script saves complete scikit-learn pipelines in /models. Keeping
preprocessing and the estimator together prevents training/serving drift.
"""

from __future__ import annotations

import json
import math
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from model_utils import IQRClipper  # noqa: F401 - required when joblib unpickles pipelines


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
MAX_BODY_BYTES = 16 * 1024
REQUIRED_FIELDS = {
    "gender",
    "age",
    "hypertension",
    "heart_disease",
    "smoking_history",
    "bmi",
    "HbA1c_level",
    "blood_glucose_level",
}


def _json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":"), allow_nan=False).encode("utf-8")


def _send(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = b"" if status == 204 else _json_bytes(payload)
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


_ARTIFACT_CACHE: tuple[Any, Any, dict[str, Any]] | None = None


def _load_artifacts() -> tuple[Any, Any, dict[str, Any]]:
    global _ARTIFACT_CACHE
    if _ARTIFACT_CACHE is not None:
        return _ARTIFACT_CACHE
    rf_path = MODEL_DIR / "random_forest.joblib"
    gb_path = MODEL_DIR / "gradient_boosting.joblib"
    metadata_path = MODEL_DIR / "metadata.json"
    missing = [str(path.relative_to(ROOT)) for path in (rf_path, gb_path, metadata_path) if not path.exists()]
    if missing:
        raise FileNotFoundError("Model artifacts are not available.")
    _ARTIFACT_CACHE = (
        joblib.load(rf_path),
        joblib.load(gb_path),
        json.loads(metadata_path.read_text(encoding="utf-8")),
    )
    return _ARTIFACT_CACHE


def _validate(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("JSON body must be an object")
    missing = sorted(REQUIRED_FIELDS - payload.keys())
    if missing:
        raise ValueError(f"Missing fields: {', '.join(missing)}")

    cleaned = {field: payload[field] for field in REQUIRED_FIELDS}

    numeric_limits = {
        "age": (0, 120),
        "hypertension": (0, 1),
        "heart_disease": (0, 1),
        "bmi": (5, 100),
        "HbA1c_level": (2, 20),
        "blood_glucose_level": (20, 500),
    }
    for field, (low, high) in numeric_limits.items():
        if isinstance(payload[field], bool):
            raise ValueError(f"{field} must be numeric")
        try:
            value = float(payload[field])
        except (TypeError, ValueError, OverflowError) as exc:
            raise ValueError(f"{field} must be numeric") from exc
        if not math.isfinite(value):
            raise ValueError(f"{field} must be finite")
        if field in {"hypertension", "heart_disease"} and value not in {0, 1}:
            raise ValueError(f"{field} must be exactly 0 or 1")
        if not low <= value <= high:
            raise ValueError(f"{field} must be between {low} and {high}")
        cleaned[field] = int(value) if field in {"hypertension", "heart_disease"} else value

    if not isinstance(cleaned["gender"], str) or cleaned["gender"] not in {"Female", "Male", "Other"}:
        raise ValueError("gender must be Female, Male, or Other")
    allowed_smoking = {"never", "No Info", "current", "former", "ever", "not current"}
    if not isinstance(cleaned["smoking_history"], str) or cleaned["smoking_history"] not in allowed_smoking:
        raise ValueError("smoking_history contains an unsupported category")
    return cleaned


def _model_result(model: Any, row: pd.DataFrame) -> dict[str, Any]:
    probability = float(model.predict_proba(row)[0][1])
    if not math.isfinite(probability) or not 0 <= probability <= 1:
        raise ValueError("Model returned an invalid probability")
    return {
        "label": "Higher likelihood" if probability >= 0.5 else "Lower likelihood",
        "probability": round(probability * 100, 1),
    }


class handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        # Request URLs and bodies may contain profile data. Do not log them.
        pass

    def do_OPTIONS(self) -> None:  # noqa: N802 - Vercel handler API
        _send(self, 204, {})

    def do_POST(self) -> None:  # noqa: N802 - Vercel handler API
        if self.headers.get("Transfer-Encoding"):
            _send(self, 400, {"ok": False, "error": "Use a Content-Length header.", "code": "INVALID_INPUT"})
            return
        lengths = self.headers.get_all("Content-Length", [])
        if len(lengths) != 1 or not lengths[0].isascii() or not lengths[0].isdecimal():
            _send(self, 400, {"ok": False, "error": "A valid Content-Length is required.", "code": "INVALID_INPUT"})
            return
        # Compare the decimal length before conversion, including very long headers.
        length_text = lengths[0].lstrip("0") or "0"
        if len(length_text) > len(str(MAX_BODY_BYTES)) or int(length_text) > MAX_BODY_BYTES:
            _send(self, 413, {"ok": False, "error": "The request body is too large.", "code": "PAYLOAD_TOO_LARGE"})
            return
        length = int(length_text)
        try:
            raw = self.rfile.read(length)
            if len(raw) != length:
                raise ValueError("The request body is incomplete")
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeError, ValueError, RecursionError):
            _send(self, 400, {"ok": False, "error": "Send a valid JSON object.", "code": "INVALID_INPUT"})
            return
        try:
            cleaned = _validate(payload)
        except ValueError as exc:
            _send(self, 400, {"ok": False, "error": str(exc), "code": "INVALID_INPUT"})
            return
        try:
            random_forest, gradient_boosting, metadata = _load_artifacts()
            row = pd.DataFrame([cleaned])
            results = {
                "random_forest": _model_result(random_forest, row),
                "gradient_boosting": _model_result(gradient_boosting, row),
            }
            _send(
                self,
                200,
                {
                    "ok": True,
                    "predictions": results,
                    "model_metrics": metadata.get("metrics", {}),
                    "model_version": metadata.get("trained_at", "local training run"),
                },
            )
        except FileNotFoundError:
            _send(self, 503, {"ok": False, "error": "The trained models are temporarily unavailable. Please try again later.", "code": "MODELS_NOT_READY"})
        except Exception:  # Do not expose artifact paths or internal exception details.
            _send(self, 503, {"ok": False, "error": "The prediction service is temporarily unavailable. Please try again later.", "code": "PREDICTION_UNAVAILABLE"})
