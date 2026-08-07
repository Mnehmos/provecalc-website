"""Tests for the hosted sidecar's killable computation worker."""

from concurrent.futures import ThreadPoolExecutor

import pytest

from src.sandbox import (
    MAX_WORKER_RESULT_BYTES,
    _decode_worker_message,
    _encode_worker_message,
    run_isolated,
)


def test_isolated_evaluation_preserves_compute_contract():
    result = run_isolated("compute.evaluate", "2 + 3", None)

    assert result["success"] is True
    assert result["numeric_result"] == 5


def test_isolated_worker_honors_short_deadline(monkeypatch):
    monkeypatch.setenv("PROVECALC_COMPUTE_TIMEOUT_SECONDS", "0.1")

    result = run_isolated("compute.evaluate", "2 + 3", None)

    assert result["success"] is False
    assert "timed out" in result["error"]


def test_worker_ipc_enforces_near_limit_and_rejects_corruption():
    message = _encode_worker_message(True, "x" * (MAX_WORKER_RESULT_BYTES - 256))
    assert _decode_worker_message(message)[0] is True

    with pytest.raises(ValueError, match="32 MiB"):
        _encode_worker_message(True, "x" * MAX_WORKER_RESULT_BYTES)
    with pytest.raises(ValueError, match="corrupted IPC"):
        _decode_worker_message(b"not-a-pickle")


def test_isolated_workers_can_run_concurrently():
    with ThreadPoolExecutor(max_workers=3) as executor:
        results = list(executor.map(
            lambda _: run_isolated("compute.evaluate", "2 + 3", None),
            range(3),
        ))

    assert [result["numeric_result"] for result in results] == [5, 5, 5]
