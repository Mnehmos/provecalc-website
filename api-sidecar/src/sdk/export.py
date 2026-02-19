"""Export utilities for worksheets - CSV and JSON output."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Union

from .models import GivenNode, ResultNode, WorksheetDocument


def export_csv(document: WorksheetDocument, path: Union[str, Path]) -> None:
    """Export all givens and results as CSV.

    Columns: symbol, value, unit, type, description
    """
    path = Path(path)
    rows = []

    for node in document.nodes:
        if isinstance(node, GivenNode):
            rows.append({
                "symbol": node.symbol,
                "value": node.value.value,
                "unit": node.value.unit.expression if node.value.unit else "",
                "type": "given",
                "description": node.description or "",
            })
        elif isinstance(node, ResultNode):
            rows.append({
                "symbol": node.symbol,
                "value": node.value.value,
                "unit": node.value.unit.expression if node.value.unit else "",
                "type": "result",
                "description": node.symbolic_form or "",
            })

    fieldnames = ["symbol", "value", "unit", "type", "description"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def export_json(document: WorksheetDocument, path: Union[str, Path]) -> None:
    """Export the full document as formatted JSON."""
    path = Path(path)
    data = document.model_dump(by_alias=True, exclude_none=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
