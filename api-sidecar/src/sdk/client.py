"""HTTP client for communicating with the ProveCalc sidecar compute engine."""

from __future__ import annotations

import logging
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

DEFAULT_SIDECAR_URL = "http://127.0.0.1:9743"
HEALTH_TIMEOUT = 2.0
REQUEST_TIMEOUT = 30.0


class SidecarClient:
    """HTTP client wrapping calls to the Python sidecar (FastAPI)."""

    def __init__(self, base_url: str = DEFAULT_SIDECAR_URL, timeout: float = REQUEST_TIMEOUT):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(base_url=self.base_url, timeout=timeout)
        self._process: Optional[subprocess.Popen] = None

    def close(self):
        self._client.close()
        if self._process is not None:
            try:
                self._process.terminate()
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logger.warning("Sidecar did not terminate gracefully, killing")
                try:
                    self._process.kill()
                    self._process.wait(timeout=3)
                except (subprocess.TimeoutExpired, OSError):
                    logger.warning("Sidecar did not exit after kill; giving up")
            except OSError:
                pass  # Process already exited
            finally:
                self._process = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # --- Health ---

    def is_healthy(self) -> bool:
        try:
            resp = self._client.get("/health", timeout=HEALTH_TIMEOUT)
            return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    def ensure_running(self, max_wait: float = 15.0) -> None:
        """Start the sidecar if not already running, wait until healthy."""
        if self.is_healthy():
            return

        logger.info("Sidecar not running, starting...")
        self._start_sidecar()

        deadline = time.monotonic() + max_wait
        while time.monotonic() < deadline:
            if self.is_healthy():
                logger.info("Sidecar is ready")
                return
            time.sleep(0.5)

        raise RuntimeError(f"Sidecar did not become healthy within {max_wait}s")

    def _start_sidecar(self) -> None:
        """Start the sidecar process."""
        sidecar_dir = Path(__file__).resolve().parent.parent.parent  # sidecar/
        self._process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "src.main:app",
             "--host", "127.0.0.1", "--port", "9743"],
            cwd=str(sidecar_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    # --- Compute Endpoints ---

    def evaluate(self, expression: str, variables: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"expression": expression}
        if variables:
            payload["variables"] = variables
        return self._post("/compute/evaluate", payload)

    def solve(
        self,
        equations: List[str],
        target: str,
        method: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"equations": equations, "target": target}
        if method:
            payload["method"] = method
        if variables:
            payload["variables"] = variables
        return self._post("/compute/solve", payload)

    def solve_numeric(
        self,
        equations: List[str],
        target: str,
        method: Optional[str] = None,
        initial_guess: Optional[float] = None,
        variables: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"equations": equations, "target": target}
        if method:
            payload["method"] = method
        if initial_guess is not None:
            payload["initial_guess"] = initial_guess
        if variables:
            payload["variables"] = variables
        return self._post("/compute/solve_numeric", payload)

    def analyze_system(
        self,
        equations: List[str],
        known_variables: Optional[List[str]] = None,
        variables: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        if known_variables is not None and variables is not None:
            raise ValueError("Provide only one of known_variables or variables")
        if variables is not None:
            logger.warning("`variables` is deprecated; use `known_variables`")
            known_variables = list(variables.keys())
        payload: Dict[str, Any] = {"equations": equations}
        if known_variables is not None:
            payload["known_variables"] = known_variables
        return self._post("/compute/analyze_system", payload)

    def validate_equation(
        self,
        equation: str,
        variables: Dict[str, Dict[str, Any]],
        target: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"equation": equation, "variables": variables}
        if target:
            payload["target"] = target
        return self._post("/compute/validate_equation", payload)

    def simplify(self, expression: str) -> Dict[str, Any]:
        return self._post("/compute/simplify", {"expression": expression})

    def differentiate(
        self, expression: str, variable: str, order: int = 1
    ) -> Dict[str, Any]:
        return self._post("/compute/differentiate", {
            "expression": expression, "variable": variable, "order": order,
        })

    def integrate(
        self,
        expression: str,
        variable: str,
        limits: Optional[List[float]] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"expression": expression, "variable": variable}
        if limits:
            payload["limits"] = limits
        return self._post("/compute/integrate", payload)

    def plot_data(
        self,
        expression: str,
        variable: str,
        x_min: float,
        x_max: float,
        points: int = 200,
    ) -> Dict[str, Any]:
        return self._post("/compute/plot_data", {
            "expressions": [{"id": "1", "expr": expression, "variable": variable}],
            "x_min": x_min,
            "x_max": x_max,
            "point_count": points,
        })

    # --- Unit Endpoints ---

    def convert_units(self, value: float, from_unit: str, to_unit: str) -> Dict[str, Any]:
        resp = self._client.post(
            "/units/convert",
            params={"value": value, "from_unit": from_unit, "to_unit": to_unit},
        )
        resp.raise_for_status()
        return resp.json()

    def get_dimensions(self, unit: str) -> Dict[str, Any]:
        return self._get(f"/units/dimensions/{unit}")

    def classify_domain(self, unit: str) -> Dict[str, Any]:
        return self._get(f"/units/domain/{unit}")

    def check_units(self, expression: str, expected_unit: Optional[str] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {"expression": expression}
        if expected_unit:
            payload["expected_unit"] = expected_unit
        return self._post("/compute/check_units", payload)

    # --- Constants ---

    def get_constant(self, name: str) -> Dict[str, Any]:
        return self._get(f"/constants/{name}")

    def list_constants(self) -> Dict[str, Any]:
        return self._get("/constants")

    # --- Internal ---

    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        resp = self._client.post(path, json=payload)
        resp.raise_for_status()
        return resp.json()

    def _get(self, path: str) -> Dict[str, Any]:
        resp = self._client.get(path)
        resp.raise_for_status()
        return resp.json()
