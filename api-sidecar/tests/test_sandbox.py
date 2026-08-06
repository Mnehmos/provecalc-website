"""Tests for the hosted sidecar's killable computation worker."""

from src.sandbox import run_isolated


def test_isolated_evaluation_preserves_compute_contract():
    result = run_isolated("compute.evaluate", "2 + 3", None)

    assert result["success"] is True
    assert result["numeric_result"] == 5


def test_isolated_worker_honors_short_deadline(monkeypatch):
    monkeypatch.setenv("PROVECALC_COMPUTE_TIMEOUT_SECONDS", "0.1")

    result = run_isolated("compute.evaluate", "2 + 3", None)

    assert result["success"] is False
    assert "timed out" in result["error"]
