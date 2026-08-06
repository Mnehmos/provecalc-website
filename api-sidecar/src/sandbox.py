"""Killable process boundary for hosted symbolic computation."""

from __future__ import annotations

import multiprocessing as mp
import os
import pickle
import queue
from typing import Any

import numpy as np


DEFAULT_COMPUTE_TIMEOUT_SECONDS = 5.0
MAX_COMPUTE_TIMEOUT_SECONDS = 30.0
MAX_WORKER_INPUT_BYTES = 2 * 1024 * 1024
MAX_WORKER_RESULT_BYTES = 32 * 1024 * 1024


def _timeout_seconds() -> float:
    try:
        configured = float(os.environ.get("PROVECALC_COMPUTE_TIMEOUT_SECONDS", "5"))
    except ValueError:
        configured = DEFAULT_COMPUTE_TIMEOUT_SECONDS
    return min(max(configured, 0.1), MAX_COMPUTE_TIMEOUT_SECONDS)


def _plot_data(payload: dict[str, Any], compute: Any) -> dict[str, Any]:
    point_count = int(payload["point_count"])
    x_min = float(payload["x_min"])
    x_max = float(payload["x_max"])
    x_values = np.linspace(x_min, x_max, point_count).tolist()
    request_variables = payload.get("variables") or {}
    series_list: list[dict[str, Any]] = []
    all_y_values: list[float] = []

    for expression in payload["expressions"]:
        y_values: list[float | None] = []
        for x in x_values:
            try:
                variables = {expression["variable"]: x}
                variables.update(request_variables)
                result = compute.evaluate(expression["expr"], variables)
                value = result.get("numeric_result") if result.get("success") else None
                if isinstance(value, (int, float)) and np.isfinite(value):
                    numeric_value = float(value)
                    y_values.append(numeric_value)
                    all_y_values.append(numeric_value)
                else:
                    y_values.append(None)
            except Exception:
                y_values.append(None)
        series_list.append(
            {
                "expression_id": expression["id"],
                "x": x_values,
                "y": y_values,
                "label": expression.get("label"),
                "color": expression.get("color"),
                "error": None,
            }
        )

    y_min = min(all_y_values) if all_y_values else 0.0
    y_max = max(all_y_values) if all_y_values else 1.0
    y_range = y_max - y_min or 1.0
    padding = 0.1 * y_range
    return {
        "success": True,
        "series": series_list,
        "x_bounds": (x_min, x_max),
        "y_bounds": (y_min - padding, y_max + padding),
    }


def _execute(operation: str, args: tuple[Any, ...]) -> Any:
    from .compute import ComputeEngine
    from .units import EquationUnitValidator, PhysicalDomainClassifier, UnitRegistry

    compute = ComputeEngine()
    units = UnitRegistry()

    if operation == "compute.evaluate":
        return compute.evaluate(*args)
    if operation == "compute.solve":
        return compute.solve(*args)
    if operation == "compute.solve_numeric":
        return compute.solve_numeric(*args)
    if operation == "compute.analyze_system":
        return compute.analyze_system(*args)
    if operation == "compute.simplify":
        return compute.simplify(*args)
    if operation == "compute.differentiate":
        return compute.differentiate(*args)
    if operation == "compute.integrate":
        return compute.integrate(*args)
    if operation == "units.check_units":
        return units.check_units(*args)
    if operation == "units.convert":
        return units.convert(*args)
    if operation == "units.get_dimensions":
        return units.get_dimensions(*args)
    if operation == "unit.validate_equation":
        return EquationUnitValidator(units).validate_equation(*args)
    if operation == "domain.classify":
        return PhysicalDomainClassifier(units).classify(*args)
    if operation == "domain.batch":
        classifier = PhysicalDomainClassifier(units)
        results = []
        for unit in args[0]:
            try:
                results.append(classifier.classify(unit))
            except Exception as exc:
                results.append({"error": str(exc)})
        return results
    if operation == "constants.get":
        return compute.get_constant(*args)
    if operation == "constants.list":
        return compute.list_constants()
    if operation == "plot_data":
        return _plot_data(args[0], compute)
    if operation == "export.docx":
        from .docx_export import export_to_docx

        (
            document_name,
            nodes,
            assumptions,
            metadata,
            source_revision,
            verification_summary,
            audit_trail,
        ) = args
        return export_to_docx(
            document_name=document_name,
            nodes=nodes,
            assumptions=assumptions,
            metadata=metadata,
            source_revision=source_revision,
            verification_summary=verification_summary,
            audit_trail=audit_trail,
        )
    raise ValueError(f"Unsupported isolated operation: {operation}")


def _worker(operation: str, args: tuple[Any, ...], result_queue: Any) -> None:
    try:
        result = _execute(operation, args)
        if len(pickle.dumps(result, protocol=pickle.HIGHEST_PROTOCOL)) > MAX_WORKER_RESULT_BYTES:
            raise ValueError("isolated computation result exceeds the 32 MiB limit")
        result_queue.put((True, result))
    except BaseException as exc:  # pragma: no cover
        result_queue.put((False, f"{type(exc).__name__}: {exc}"))


def run_isolated(operation: str, *args: Any) -> Any:
    try:
        if len(pickle.dumps((operation, args), protocol=pickle.HIGHEST_PROTOCOL)) > MAX_WORKER_INPUT_BYTES:
            return {
                "success": False,
                "error": "Computation request exceeds the 2 MiB worker input limit.",
            }
    except (TypeError, ValueError, pickle.PickleError) as exc:
        return {"success": False, "error": f"Computation request is not serializable: {exc}"}

    context = mp.get_context("spawn")
    result_queue = context.Queue(maxsize=1)
    process = context.Process(target=_worker, args=(operation, args, result_queue), daemon=True)
    process.start()
    try:
        process.join(_timeout_seconds())
        if process.is_alive():
            process.terminate()
            process.join(1.0)
            if process.is_alive() and hasattr(process, "kill"):
                process.kill()
                process.join(1.0)
            return {
                "success": False,
                "error": (
                    f"Computation timed out after {_timeout_seconds():g} seconds; "
                    "reduce the expression or choose a bounded numeric method."
                ),
            }
        try:
            ok, value = result_queue.get(timeout=0.25)
        except queue.Empty:
            return {
                "success": False,
                "error": f"Computation worker exited without a result (exit code {process.exitcode}).",
            }
        if ok:
            return value
        return {"success": False, "error": f"Isolated computation failed: {value}"}
    finally:
        result_queue.close()
        result_queue.join_thread()
