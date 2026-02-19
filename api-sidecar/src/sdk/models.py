"""Pydantic models matching the ProveCalc .worksheet JSON schema.

These models mirror the TypeScript types in src/types/document.ts and
the Rust models in src-tauri/src/models/. The JSON uses snake_case
field names as serialized by Rust's serde.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

import pint
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..units import UnitRegistry as _UnitRegistry

logger = logging.getLogger(__name__)

# Use the shared UnitRegistry so custom units are available
_registry = _UnitRegistry()
_ureg = _registry.ureg


# --- Provenance ---

class UserProvenance(BaseModel):
    type: Literal["user"] = "user"
    timestamp: str

class LLMProvenance(BaseModel):
    type: Literal["llm"] = "llm"
    timestamp: str
    model: Optional[str] = None
    accepted_by: Optional[str] = None

class LibraryProvenance(BaseModel):
    type: Literal["library"] = "library"
    source: str
    timestamp: str

class ComputedProvenance(BaseModel):
    type: Literal["computed"] = "computed"
    from_nodes: List[str]
    timestamp: str

Provenance = Annotated[
    Union[UserProvenance, LLMProvenance, LibraryProvenance, ComputedProvenance],
    Field(discriminator="type"),
]


# --- Verification Status ---

class Unverified(BaseModel):
    status: Literal["unverified"] = "unverified"

class Verified(BaseModel):
    status: Literal["verified"] = "verified"
    timestamp: str
    engine_version: str

class VerificationFailed(BaseModel):
    status: Literal["failed"] = "failed"
    reason: str
    timestamp: str

class Pending(BaseModel):
    status: Literal["pending"] = "pending"

VerificationStatus = Annotated[
    Union[Unverified, Verified, VerificationFailed, Pending],
    Field(discriminator="status"),
]


# --- Value Types ---

class Unit(BaseModel):
    expression: str
    si_base: Optional[str] = None
    display_format: Optional[str] = None
    domain: Optional[Dict[str, Any]] = None

    @field_validator("expression")
    @classmethod
    def validate_unit_expression(cls, v: str) -> str:
        """Validate that the unit expression is parseable by Pint."""
        try:
            _ureg.parse_expression(v)
        except (pint.UndefinedUnitError, pint.errors.UndefinedUnitError) as e:
            raise ValueError(f"Invalid unit expression '{v}': {e}") from e
        return v

class ValueWithUnit(BaseModel):
    value: float
    unit: Optional[Unit] = None
    uncertainty: Optional[float] = None

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: Optional[Unit]) -> Optional[Unit]:
        """Ensure any provided Unit has a valid, Pint-parsed expression."""
        if v is not None and v.expression:
            try:
                parsed = _ureg.parse_expression(v.expression)
                # Normalize si_base if not already set
                if v.si_base is None:
                    v.si_base = str(parsed.to_base_units().units)
            except (pint.UndefinedUnitError, pint.errors.UndefinedUnitError):
                # Already validated in Unit; this is a safety net
                pass
        return v

class NodePosition(BaseModel):
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None

class DisplayConfig(BaseModel):
    show_in_export: bool = Field(alias="showInExport", default=True)
    show_in_document: bool = Field(alias="showInDocument", default=True)
    display_mode: str = Field(alias="displayMode", default="full")

    model_config = ConfigDict(populate_by_name=True)

class SemanticLink(BaseModel):
    id: str
    type: str
    url: Optional[str] = None
    title: Optional[str] = None
    citation: Optional[str] = None
    target_node_id: Optional[str] = Field(alias="targetNodeId", default=None)
    note: Optional[str] = None
    created_at: str = Field(alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)

class SliderRange(BaseModel):
    min: float
    max: float
    step: Optional[float] = None

class SolutionStep(BaseModel):
    description: str
    expression: str
    latex: Optional[str] = None

class InputFieldConfig(BaseModel):
    label: str
    input_type: str = Field(alias="inputType")
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    group: Optional[str] = None
    order: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True)


# --- Base Node ---

class BaseNode(BaseModel):
    """Common fields shared by all node types."""
    id: str
    provenance: Provenance
    verification: VerificationStatus
    dependencies: List[str] = Field(default_factory=list)
    dependents: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    position: Optional[NodePosition] = None
    display: Optional[DisplayConfig] = None
    metadata: Optional[Dict[str, Any]] = None
    semantic_links: Optional[List[SemanticLink]] = Field(alias="semanticLinks", default=None)
    is_stale: Optional[bool] = Field(alias="isStale", default=None)
    last_solved_at: Optional[str] = Field(alias="lastSolvedAt", default=None)

    model_config = ConfigDict(populate_by_name=True)


# --- Node Types ---

class TextNode(BaseNode):
    type: Literal["text"] = "text"
    content: str
    format: Optional[str] = None

class AnnotationNode(BaseNode):
    type: Literal["annotation"] = "annotation"
    content: str
    title: Optional[str] = None
    collapsed: Optional[bool] = None

class GivenNode(BaseNode):
    type: Literal["given"] = "given"
    symbol: str
    latex: Optional[str] = None
    value: ValueWithUnit
    description: Optional[str] = None
    constraints: Optional[List[str]] = None
    slider_range: Optional[SliderRange] = Field(alias="sliderRange", default=None)
    solution_steps: Optional[List[SolutionStep]] = Field(alias="solutionSteps", default=None)
    symbolic_form: Optional[str] = Field(alias="symbolicForm", default=None)
    input_field: Optional[InputFieldConfig] = Field(alias="inputField", default=None)

class EquationNode(BaseNode):
    type: Literal["equation"] = "equation"
    latex: str
    sympy: Optional[str] = None
    lhs: str
    rhs: str
    is_definition: Optional[bool] = None

class ConstraintNode(BaseNode):
    type: Literal["constraint"] = "constraint"
    latex: str
    sympy: str
    description: Optional[str] = None
    applies_to: List[str] = Field(default_factory=list)

class SolveGoalNode(BaseNode):
    type: Literal["solve_goal"] = "solve_goal"
    target_symbol: str
    method: Optional[str] = None
    initial_guess: Optional[float] = None

class ResultNode(BaseNode):
    type: Literal["result"] = "result"
    symbol: str
    latex: Optional[str] = None
    value: ValueWithUnit
    symbolic_form: Optional[str] = None
    solve_goal_id: str
    residual: Optional[float] = None
    solution_steps: Optional[List[SolutionStep]] = Field(alias="solutionSteps", default=None)


# --- Plot Types ---

class PlotExpression(BaseModel):
    id: str
    expr: str
    variable: str
    label: Optional[str] = None
    color: Optional[str] = None
    style: Optional[str] = None

class PlotRange(BaseModel):
    min: float
    max: float
    variable: str

class PlotOptions(BaseModel):
    title: Optional[str] = None
    x_label: Optional[str] = None
    y_label: Optional[str] = None
    grid: Optional[bool] = None
    legend: Optional[bool] = None
    show_points: Optional[bool] = None
    point_count: Optional[int] = None

class PlotSeriesData(BaseModel):
    expression_id: str
    x: List[float]
    y: List[float]
    label: Optional[str] = None
    color: Optional[str] = None

class PlotData(BaseModel):
    series: List[PlotSeriesData]
    computed_at: str
    x_bounds: List[float]
    y_bounds: List[float]

class PlotNode(BaseNode):
    type: Literal["plot"] = "plot"
    plot_type: str
    expressions: List[PlotExpression]
    x_range: PlotRange
    y_range: Optional[PlotRange] = None
    options: PlotOptions
    cached_data: Optional[PlotData] = None


# --- Discriminated Union ---

WorksheetNode = Annotated[
    Union[
        TextNode,
        GivenNode,
        EquationNode,
        ConstraintNode,
        SolveGoalNode,
        ResultNode,
        PlotNode,
        AnnotationNode,
    ],
    Field(discriminator="type"),
]


# --- Assumption ---

class Assumption(BaseModel):
    id: str
    statement: str
    formal_expression: Optional[str] = None
    latex: Optional[str] = None
    scope: List[str] = Field(default_factory=list)
    justification: Optional[str] = None
    provenance: Provenance
    active: bool = True


# --- History ---

class NodeChange(BaseModel):
    type: str
    node_id: str
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None

class HistoryEntry(BaseModel):
    id: str
    timestamp: str
    description: str
    changes: List[NodeChange] = Field(default_factory=list)
    source: str = "user"
    parent_id: Optional[str] = None


# --- Verification Audit ---

class GateResult(BaseModel):
    passed: bool
    details: Optional[str] = None
    residual: Optional[float] = None

class VerificationAuditEntry(BaseModel):
    id: str
    node_id: str
    timestamp: str
    engine_version: str
    passed: bool
    gates_checked: Dict[str, GateResult]
    inputs_used: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    assumptions_active: List[str] = Field(default_factory=list)
    provenance_at_verification: Provenance


# --- Document Metadata ---

class DocumentMetadata(BaseModel):
    author: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    unit_system: Optional[str] = None
    custom_units: Optional[Dict[str, str]] = None
    active_domain: Optional[str] = None


# --- Document Root ---

class WorksheetDocument(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str
    version: str = "1.0.0"
    nodes: List[WorksheetNode] = Field(default_factory=list)
    assumptions: List[Assumption] = Field(default_factory=list)
    history: List[HistoryEntry] = Field(default_factory=list)
    current_history_id: str = ""
    audit_trail: List[VerificationAuditEntry] = Field(default_factory=list)
    metadata: DocumentMetadata = Field(default_factory=DocumentMetadata)

    model_config = ConfigDict(populate_by_name=True)


# --- Solve Result (SDK convenience type) ---

class SolveResult(BaseModel):
    """Result from a solve operation, returned by Worksheet.solve()."""
    symbol: str
    value: float
    unit: Optional[str] = None
    symbolic_form: Optional[str] = None
    latex: Optional[str] = None
    steps: List[SolutionStep] = Field(default_factory=list)
    residual: Optional[float] = None
    node_id: Optional[str] = None


# --- Factory helpers ---

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _uuid() -> str:
    return str(uuid.uuid4())

def make_user_provenance() -> UserProvenance:
    return UserProvenance(timestamp=_now())

def make_computed_provenance(from_nodes: List[str]) -> ComputedProvenance:
    return ComputedProvenance(from_nodes=from_nodes, timestamp=_now())
