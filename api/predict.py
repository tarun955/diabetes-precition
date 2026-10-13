"""Vercel Python serverless function for diabetes predictions.

The training script saves complete scikit-learn pipelines in /models. Keeping
preprocessing and the estimator together prevents training/serving drift.
"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from model_utils import IQRClipper  # noqa: F401 - required when joblib unpickles pipelines


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
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
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


def _send(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = _json_bytes(payload)
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
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
        raise FileNotFoundError(
            "Model artifacts are missing. Run `python scripts/train_models.py --data-file <CSV>` "
            f"before deploying. Missing: {', '.join(missing)}"
        )
    _ARTIFACT_CACHE = (
        joblib.load(rf_path),
        joblib.load(gb_path),
        json.loads(metadata_path.read_text(encoding="utf-8")),
    )
    return _ARTIFACT_CACHE


def _validate(payload: dict[str, Any]) -> dict[str, Any]:
    missing = sorted(REQUIRED_FIELDS - payload.keys())
    if missing:
        raise ValueError(f"Missing fields: {', '.join(missing)}")

    cleaned = dict(payload)
    cleaned["gender"] = str(payload["gender"])
    cleaned["smoking_history"] = str(payload["smoking_history"])

    numeric_limits = {
        "age": (0, 120),
        "hypertension": (0, 1),
        "heart_disease": (0, 1),
        "bmi": (5, 100),
        "HbA1c_level": (2, 20),
        "blood_glucose_level": (20, 500),
    }
    for field, (low, high) in numeric_limits.items():
        try:
            value = float(payload[field])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{field} must be numeric") from exc
        if not low <= value <= high:
            raise ValueError(f"{field} must be between {low} and {high}")
        cleaned[field] = int(value) if field in {"hypertension", "heart_disease"} else value

    if cleaned["gender"] not in {"Female", "Male", "Other"}:
        raise ValueError("gender must be Female, Male, or Other")
    allowed_smoking = {"never", "No Info", "current", "former", "ever", "not current"}
    if cleaned["smoking_history"] not in allowed_smoking:
        raise ValueError("smoking_history contains an unsupported category")
    return cleaned


def _model_result(model: Any, row: pd.DataFrame) -> dict[str, Any]:
    probability = float(model.predict_proba(row)[0][1])
    return {
        "label": "Higher likelihood" if probability >= 0.5 else "Lower likelihood",
        "class": int(probability >= 0.5),
        "probability": round(probability * 100, 1),
        "risk_band": "High" if probability >= 0.65 else "Moderate" if probability >= 0.35 else "Low",
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:  # noqa: N802 - Vercel handler API
        _send(self, 204, {})

    def do_POST(self) -> None:  # noqa: N802 - Vercel handler API
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("JSON body must be an object")
            cleaned = _validate(payload)
            random_forest, gradient_boosting, metadata = _load_artifacts()
            row = pd.DataFrame([cleaned])
            results = {
                "random_forest": _model_result(random_forest, row),
                "gradient_boosting": _model_result(gradient_boosting, row),
            }
            scores = {
                key: float(value.get("roc_auc", value.get("f1", 0)))
                for key, value in metadata.get("metrics", {}).items()
            }
            recommended = max(scores, key=scores.get) if scores else "gradient_boosting"
            _send(
                self,
                200,
                {
                    "ok": True,
                    "predictions": results,
                    "recommended_model": recommended,
                    "recommendation_reason": "Selected from the validation ROC-AUC recorded during training.",
                    "model_metrics": metadata.get("metrics", {}),
                    "model_version": metadata.get("trained_at", "local training run"),
                },
            )
        except FileNotFoundError as exc:
            _send(self, 503, {"ok": False, "error": str(exc), "code": "MODELS_NOT_READY"})
        except (ValueError, json.JSONDecodeError) as exc:
            _send(self, 400, {"ok": False, "error": str(exc), "code": "INVALID_INPUT"})
        except Exception as exc:  # keep serverless responses JSON-shaped
            _send(self, 500, {"ok": False, "error": f"Prediction failed: {exc}", "code": "PREDICTION_ERROR"})
