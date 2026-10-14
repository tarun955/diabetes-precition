"""Serve the real Vercel Python handlers locally: python scripts/serve_api.py."""

from __future__ import annotations

import sys
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

# Direct script execution starts with scripts/ on sys.path rather than the root.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api import metadata, predict  # noqa: E402


class LocalAPIHandler(predict.handler):
    def do_POST(self) -> None:  # noqa: N802
        if urlsplit(self.path).path == "/api/predict":
            predict.handler.do_POST(self)
        else:
            self._reject_route()

    def do_GET(self) -> None:  # noqa: N802
        if urlsplit(self.path).path == "/api/metadata":
            metadata.handler.do_GET(self)
        else:
            self._reject_route()

    def do_OPTIONS(self) -> None:  # noqa: N802
        if urlsplit(self.path).path == "/api/predict":
            predict.handler.do_OPTIONS(self)
        else:
            self._reject_route()

    def end_headers(self) -> None:
        # Metadata's production handler is unchanged; local responses are uncached.
        if self.command == "GET" and urlsplit(self.path).path == "/api/metadata":
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _reject_route(self) -> None:
        known = urlsplit(self.path).path in {"/api/predict", "/api/metadata"}
        predict._send(self, 405 if known else 404, {
            "ok": False,
            "error": "Method not allowed." if known else "API route not found.",
        })


def main() -> None:
    with ThreadingHTTPServer(("127.0.0.1", 8000), LocalAPIHandler) as server:
        print("Local Python API listening at http://127.0.0.1:8000", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
