"""Worksheet - the main SDK class for headless ProveCalc automation.

Usage:
    from provecalc import Worksheet

    ws = Worksheet.load("beam_analysis.worksheet")

    # Parametric sweep
    for load in [100, 200, 300]:
        ws.set_given("F", load, "N")
        result = ws.solve("deflection")
        print(f"F={load}N → δ={result.value:.3f} {result.unit}")

    ws.export_csv("results.csv")
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from .client import SidecarClient
from .models import (
    Assumption,
    ConstraintNode,
    DocumentMetadata,
    EquationNode,
    GivenNode,
    HistoryEntry,
    NodeChange,
    ResultNode,
    SolutionStep,
    SolveGoalNode,
    SolveResult,
    TextNode,
    AnnotationNode,
    Unverified,
    Unit,
    ValueWithUnit,
    WorksheetDocument,
    WorksheetNode,
    make_user_provenance,
    make_computed_provenance,
    _now,
    _uuid,
)

logger = logging.getLogger(__name__)


class Worksheet:
    """High-level API for working with ProveCalc worksheets programmatically.

    Provides load/save/create operations on .worksheet files and
    wraps sidecar compute calls for headless automation.
    """

    def __init__(
        self,
        document: WorksheetDocument,
        client: Optional[SidecarClient] = None,
        auto_start: bool = True,
    ):
        self._doc = document
        self._client = client or SidecarClient()
        self._auto_start = auto_start

    # --- Factory Methods ---

    @classmethod
    def create(cls, name: str = "Untitled", **kwargs) -> Worksheet:
        """Create a new empty worksheet."""
        now = _now()
        doc = WorksheetDocument(
            id=_uuid(),
            name=name,
            created_at=now,
            updated_at=now,
            version="1.0.0",
            nodes=[],
            assumptions=[],
            history=[HistoryEntry(
                id=_uuid(),
                timestamp=now,
                description="Document created",
                changes=[],
                source="user",
            )],
            current_history_id="",
            audit_trail=[],
            metadata=DocumentMetadata(),
        )
        doc.current_history_id = doc.history[0].id
        return cls(doc, **kwargs)

    @classmethod
    def load(cls, path: Union[str, Path], **kwargs) -> Worksheet:
        """Load a worksheet from a .worksheet file."""
        path = Path(path)
        data = json.loads(path.read_text(encoding="utf-8"))
        doc = WorksheetDocument.model_validate(data)
        logger.info("Loaded worksheet '%s' with %d nodes", doc.name, len(doc.nodes))
        return cls(doc, **kwargs)

    # --- Properties ---

    @property
    def name(self) -> str:
        return self._doc.name

    @name.setter
    def name(self, value: str):
        self._doc.name = value

    @property
    def nodes(self) -> List[WorksheetNode]:
        return self._doc.nodes

    @property
    def assumptions(self) -> List[Assumption]:
        return self._doc.assumptions

    @property
    def document(self) -> WorksheetDocument:
        return self._doc

    # --- Node Access ---

    def get_node(self, node_id: str) -> Optional[WorksheetNode]:
        """Get a node by ID."""
        for node in self._doc.nodes:
            if node.id == node_id:
                return node
        return None

    def find_given(self, symbol: str) -> Optional[GivenNode]:
        """Find a given node by symbol name."""
        for node in self._doc.nodes:
            if isinstance(node, GivenNode) and node.symbol == symbol:
                return node
        return None

    def find_equation(self, lhs: str) -> Optional[EquationNode]:
        """Find an equation node by its left-hand side symbol."""
        for node in self._doc.nodes:
            if isinstance(node, EquationNode) and node.lhs == lhs:
                return node
        return None

    def find_result(self, symbol: str) -> Optional[ResultNode]:
        """Find the most recent result node for a symbol."""
        for node in reversed(self._doc.nodes):
            if isinstance(node, ResultNode) and node.symbol == symbol:
                return node
        return None

    def get_givens(self) -> Dict[str, GivenNode]:
        """Get all given nodes as a symbol -> node dict."""
        return {
            node.symbol: node
            for node in self._doc.nodes
            if isinstance(node, GivenNode)
        }

    def get_equations(self) -> List[EquationNode]:
        """Get all equation nodes."""
        return [n for n in self._doc.nodes if isinstance(n, EquationNode)]

    def get_results(self) -> Dict[str, ResultNode]:
        """Get all result nodes as a symbol -> node dict (latest per symbol)."""
        results: Dict[str, ResultNode] = {}
        for node in self._doc.nodes:
            if isinstance(node, ResultNode):
                results[node.symbol] = node
        return results

    # --- Node Mutation ---

    def add_given(
        self,
        symbol: str,
        value: float,
        unit: Optional[str] = None,
        description: Optional[str] = None,
    ) -> GivenNode:
        """Add a given (input parameter) node."""
        node = GivenNode(
            id=_uuid(),
            provenance=make_user_provenance(),
            verification=Unverified(),
            symbol=symbol,
            value=ValueWithUnit(
                value=value,
                unit=Unit(expression=unit) if unit else None,
            ),
            description=description,
        )
        self._doc.nodes.append(node)
        self._record_history(f"Added given: {symbol}", "create", node)
        self._doc.updated_at = _now()
        return node

    def set_given(self, symbol: str, value: float, unit: Optional[str] = None) -> GivenNode:
        """Set a given's value. Creates the given if it doesn't exist."""
        existing = self.find_given(symbol)
        if existing is None:
            return self.add_given(symbol, value, unit)

        existing.value.value = value
        if unit is not None:
            existing.value.unit = Unit(expression=unit)
        existing.verification = Unverified()
        self._mark_dependents_stale(existing.id)
        self._doc.updated_at = _now()
        return existing

    def add_equation(
        self,
        lhs: str,
        rhs: str,
        latex: Optional[str] = None,
        is_definition: bool = False,
    ) -> EquationNode:
        """Add an equation node. lhs and rhs are SymPy-compatible strings."""
        display_latex = latex or f"{lhs} = {rhs}"
        node = EquationNode(
            id=_uuid(),
            provenance=make_user_provenance(),
            verification=Unverified(),
            latex=display_latex,
            sympy=f"{lhs} = {rhs}",
            lhs=lhs,
            rhs=rhs,
            is_definition=is_definition or None,
        )
        self._doc.nodes.append(node)
        self._record_history(f"Added equation: {lhs} = {rhs}", "create", node)
        self._doc.updated_at = _now()
        return node

    def add_text(self, content: str, fmt: str = "markdown") -> TextNode:
        """Add a text/narrative node."""
        node = TextNode(
            id=_uuid(),
            provenance=make_user_provenance(),
            verification=Unverified(),
            content=content,
            format=fmt,
        )
        self._doc.nodes.append(node)
        self._doc.updated_at = _now()
        return node

    def add_constraint(
        self,
        sympy_expr: str,
        applies_to: Optional[List[str]] = None,
        description: Optional[str] = None,
    ) -> ConstraintNode:
        """Add a constraint node (e.g., 'x > 0')."""
        node = ConstraintNode(
            id=_uuid(),
            provenance=make_user_provenance(),
            verification=Unverified(),
            latex=sympy_expr,
            sympy=sympy_expr,
            description=description,
            applies_to=applies_to or [],
        )
        self._doc.nodes.append(node)
        self._doc.updated_at = _now()
        return node

    def add_assumption(
        self,
        statement: str,
        formal_expression: Optional[str] = None,
        scope: Optional[List[str]] = None,
    ) -> Assumption:
        """Add an assumption to the ledger."""
        assumption = Assumption(
            id=_uuid(),
            statement=statement,
            formal_expression=formal_expression,
            scope=scope or [],
            provenance=make_user_provenance(),
            active=True,
        )
        self._doc.assumptions.append(assumption)
        self._doc.updated_at = _now()
        return assumption

    def remove_node(self, node_id: str) -> bool:
        """Remove a node by ID."""
        for i, node in enumerate(self._doc.nodes):
            if node.id == node_id:
                self._doc.nodes.pop(i)
                self._doc.updated_at = _now()
                return True
        return False

    # --- Compute Operations ---

    def solve(
        self,
        target: str,
        method: Optional[str] = None,
    ) -> SolveResult:
        """Solve for a target variable using all equations and givens.

        Automatically starts the sidecar if needed.
        """
        if self._auto_start:
            self._client.ensure_running()

        # Collect equations and known variables (with unit metadata)
        equations = []
        variables: Dict[str, Any] = {}

        for node in self._doc.nodes:
            if isinstance(node, EquationNode):
                equations.append(f"{node.lhs} = {node.rhs}")
            elif isinstance(node, GivenNode):
                if node.value.unit:
                    variables[node.symbol] = {
                        "value": node.value.value,
                        "unit": node.value.unit.expression,
                    }
                else:
                    variables[node.symbol] = node.value.value

        if not equations:
            raise ValueError("No equations in worksheet to solve")

        # Call sidecar
        resp = self._client.solve(
            equations=equations,
            target=target,
            method=method,
            variables=variables if variables else None,
        )

        # Extract result
        solutions = resp.get("solutions", [])
        if not solutions:
            raise ValueError(f"No solution found for '{target}': {resp.get('error', 'unknown')}")

        solution = solutions[0]
        numeric_value = solution.get("numeric")
        symbolic = solution.get("symbolic", "")

        # Determine unit from givens if possible
        result_unit = None
        given = self.find_given(target)
        if given and given.value.unit:
            result_unit = given.value.unit.expression

        steps = [
            SolutionStep(description=s.get("description", ""), expression=s.get("expression", ""))
            for s in resp.get("steps", [])
        ]

        # Create result node
        result_node = ResultNode(
            id=_uuid(),
            provenance=make_computed_provenance([n.id for n in self._doc.nodes if isinstance(n, EquationNode)]),
            verification=Unverified(),
            symbol=target,
            value=ValueWithUnit(
                value=float(numeric_value) if numeric_value is not None else 0.0,
                unit=Unit(expression=result_unit) if result_unit else None,
            ),
            symbolic_form=str(symbolic),
            solve_goal_id="",
            residual=None,
            solution_steps=steps if steps else None,
        )
        self._doc.nodes.append(result_node)
        self._doc.updated_at = _now()

        return SolveResult(
            symbol=target,
            value=float(numeric_value) if numeric_value is not None else 0.0,
            unit=result_unit,
            symbolic_form=str(symbolic),
            steps=steps,
            node_id=result_node.id,
        )

    def evaluate(self, expression: str, variables: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """Evaluate a mathematical expression."""
        if self._auto_start:
            self._client.ensure_running()

        # Merge worksheet givens with explicit variables
        all_vars = {
            n.symbol: n.value.value
            for n in self._doc.nodes
            if isinstance(n, GivenNode)
        }
        if variables:
            all_vars.update(variables)

        return self._client.evaluate(expression, all_vars if all_vars else None)

    def check_units(self, expression: str, expected_unit: Optional[str] = None) -> Dict[str, Any]:
        """Check unit consistency of an expression."""
        if self._auto_start:
            self._client.ensure_running()
        return self._client.check_units(expression, expected_unit)

    # --- File Operations ---

    def save(self, path: Union[str, Path]) -> None:
        """Save the worksheet to a .worksheet file."""
        path = Path(path)
        self._doc.updated_at = _now()
        data = self._doc.model_dump(by_alias=True, exclude_none=True)
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        logger.info("Saved worksheet to %s", path)

    def export_json(self, path: Union[str, Path]) -> None:
        """Export the worksheet as formatted JSON."""
        from .export import export_json
        export_json(self._doc, path)

    def export_csv(self, path: Union[str, Path]) -> None:
        """Export givens and results as CSV."""
        from .export import export_csv
        export_csv(self._doc, path)

    # --- History ---

    def _record_history(self, description: str, change_type: str, node: WorksheetNode):
        entry = HistoryEntry(
            id=_uuid(),
            timestamp=_now(),
            description=description,
            changes=[NodeChange(
                type=change_type,
                node_id=node.id,
                after=node.model_dump(by_alias=True, exclude_none=True) if change_type != "delete" else None,
            )],
            source="user",
            parent_id=self._doc.current_history_id or None,
        )
        self._doc.history.append(entry)
        self._doc.current_history_id = entry.id

    def _mark_dependents_stale(self, node_id: str):
        """Mark all nodes that depend on node_id as stale (BFS)."""
        visited = set()
        queue = [node_id]
        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)
            for node in self._doc.nodes:
                if current in node.dependencies:
                    node.is_stale = True
                    queue.append(node.id)

    # --- Context Manager ---

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self._client.close()

    def __repr__(self) -> str:
        return f"Worksheet('{self._doc.name}', nodes={len(self._doc.nodes)})"
