"""ProveCalc Python SDK for headless automation and scripting.

Usage:
    from provecalc import Worksheet

    ws = Worksheet.load("beam_analysis.worksheet")
    ws.set_given("F", 100, "N")
    result = ws.solve("deflection")
    print(f"δ = {result.value:.3f} {result.unit}")
    ws.export_csv("results.csv")
"""

from .worksheet import Worksheet
from .models import (
    WorksheetDocument,
    WorksheetNode,
    BaseNode,
    GivenNode,
    EquationNode,
    ResultNode,
    SolveGoalNode,
    ConstraintNode,
    TextNode,
    AnnotationNode,
    PlotNode,
    Assumption,
    ValueWithUnit,
    Unit,
    SolveResult,
)
from .client import SidecarClient
from .export import export_csv, export_json

__version__ = "0.1.0"

__all__ = [
    "Worksheet",
    "WorksheetDocument",
    "WorksheetNode",
    "BaseNode",
    "GivenNode",
    "EquationNode",
    "ResultNode",
    "SolveGoalNode",
    "ConstraintNode",
    "TextNode",
    "AnnotationNode",
    "PlotNode",
    "Assumption",
    "ValueWithUnit",
    "Unit",
    "SolveResult",
    "SidecarClient",
    "export_csv",
    "export_json",
]
