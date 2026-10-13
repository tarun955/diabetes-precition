"""Small Vercel endpoint for the comparison dashboard."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
METADATA_PATH = ROOT / "models" / "metadata.json"


def _respond(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - Vercel handler API
        if not METADATA_PATH.exists():
            _respond(self, 503, {"ok": False, "error": "Model metadata is not available yet."})
            return
        try:
            metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
            _respond(self, 200, {"ok": True, **metadata})
        except Exception as exc:
            _respond(self, 500, {"ok": False, "error": f"Metadata could not be read: {exc}"})
