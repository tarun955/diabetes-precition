from __future__ import annotations

import json
import math
import threading
import unittest
from http.client import HTTPConnection
from typing import Any

from api.predict import MAX_BODY_BYTES
from scripts.serve_api import LocalAPIHandler
from http.server import ThreadingHTTPServer


DEFAULT_PROFILE = {
    "gender": "Female",
    "age": 45,
    "hypertension": 0,
    "heart_disease": 0,
    "smoking_history": "never",
    "bmi": 27.5,
    "HbA1c_level": 5.7,
    "blood_glucose_level": 120,
}


class PredictionApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), LocalAPIHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.host, cls.port = cls.server.server_address

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def request(self, method: str, path: str, body: Any = None) -> tuple[int, dict[str, str], dict[str, Any]]:
        encoded = None if body is None else json.dumps(body, allow_nan=True).encode("utf-8")
        connection = HTTPConnection(self.host, self.port, timeout=10)
        headers = {"Content-Type": "application/json"} if encoded is not None else {}
        if encoded is not None:
            headers["Content-Length"] = str(len(encoded))
        connection.request(method, path, body=encoded, headers=headers)
        response = connection.getresponse()
        raw = response.read()
        connection.close()
        payload = json.loads(raw.decode("utf-8")) if raw else {}
        return response.status, {key.lower(): value for key, value in response.getheaders()}, payload

    def test_actual_artifacts_return_finite_results_for_different_profiles(self) -> None:
        status, headers, default_body = self.request("POST", "/api/predict", DEFAULT_PROFILE)
        higher_glucose = {**DEFAULT_PROFILE, "blood_glucose_level": 240}
        higher_status, _, higher_body = self.request("POST", "/api/predict", higher_glucose)

        self.assertEqual(status, 200)
        self.assertEqual(higher_status, 200)
        self.assertEqual(headers.get("cache-control"), "no-store")
        self.assertTrue(default_body["ok"])
        self.assertTrue(higher_body["ok"])

        default_predictions = default_body["predictions"]
        higher_predictions = higher_body["predictions"]
        self.assertNotEqual(default_predictions, higher_predictions)
        for predictions in (default_predictions, higher_predictions):
            self.assertEqual(set(predictions), {"random_forest", "gradient_boosting"})
            for result in predictions.values():
                self.assertEqual(set(result), {"label", "probability"})
                self.assertIn(result["label"], {"Lower likelihood", "Higher likelihood"})
                self.assertTrue(math.isfinite(result["probability"]))
                self.assertGreaterEqual(result["probability"], 0)
                self.assertLessEqual(result["probability"], 100)

    def test_metadata_route_is_available_without_cache(self) -> None:
        status, headers, body = self.request("GET", "/api/metadata")

        self.assertEqual(status, 200)
        self.assertEqual(headers.get("cache-control"), "no-store")
        self.assertTrue(body["ok"])

    def test_invalid_http_payloads_are_rejected(self) -> None:
        cases = [
            ("JSON array", [DEFAULT_PROFILE]),
            ("missing field", {key: value for key, value in DEFAULT_PROFILE.items() if key != "age"}),
            ("fractional hypertension", {**DEFAULT_PROFILE, "hypertension": 0.5}),
            ("non-finite glucose", {**DEFAULT_PROFILE, "blood_glucose_level": "nan"}),
        ]
        for name, payload in cases:
            with self.subTest(name=name):
                status, _, body = self.request("POST", "/api/predict", payload)
                self.assertEqual(status, 400)
                self.assertFalse(body["ok"])
                self.assertEqual(body["code"], "INVALID_INPUT")

    def test_oversized_http_payload_is_rejected(self) -> None:
        payload = b"{" + (b"x" * MAX_BODY_BYTES) + b"}"
        connection = HTTPConnection(self.host, self.port, timeout=10)
        connection.request(
            "POST",
            "/api/predict",
            body=payload,
            headers={"Content-Type": "application/json", "Content-Length": str(len(payload))},
        )
        response = connection.getresponse()
        body = json.loads(response.read().decode("utf-8"))
        connection.close()

        self.assertEqual(response.status, 413)
        self.assertEqual(body["code"], "PAYLOAD_TOO_LARGE")


if __name__ == "__main__":
    unittest.main()
