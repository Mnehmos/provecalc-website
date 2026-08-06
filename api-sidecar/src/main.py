"""
mnehmos.worksheet Python Sidecar
================================
Compute engine for engineering calculations using SymPy and Pint.

Core Principle: The sidecar computes, validates, and returns structured results.
It never makes decisions - only the LLM proposes, and the engine verifies.
"""

import logging
import os
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Tuple, Literal, Annotated
import uvicorn

from .compute import ComputeEngine
from .sandbox import run_isolated
from .units import UnitRegistry, EquationUnitValidator, PhysicalDomainClassifier

logger = logging.getLogger(__name__)

app = FastAPI(
    title="mnehmos.worksheet Compute Engine",
    description="Symbolic and numeric computation with unit awareness",
    version="0.1.0",
)

# CORS: allow Railway frontend + dev origins
_ALLOWED_ORIGINS = [
    "http://localhost:3000",        # Next.js dev
    "http://localhost:1420",        # Tauri dev (desktop)
    "http://127.0.0.1:3000",
    "https://tauri.localhost",
    "tauri://localhost",
]

# Hosted computation is an explicit opt-in. If enabled, it must be reached
# through a server-to-server caller carrying the private bearer token; the
# browser client is intentionally disabled until that proxy exists.
_COMPUTE_ENABLED = os.environ.get("PROVECALC_COMPUTE_ENABLED") == "1"
_COMPUTE_TOKEN = os.environ.get("PROVECALC_COMPUTE_TOKEN", "")


@app.middleware("http")
async def protect_hosted_compute(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    if not _COMPUTE_ENABLED:
        return JSONResponse(
            {"error": "Hosted computation is disabled while the release gate is closed."},
            status_code=503,
        )
    authorization = request.headers.get("authorization", "")
    if not _COMPUTE_TOKEN or authorization != f"Bearer {_COMPUTE_TOKEN}":
        return JSONResponse({"error": "Hosted computation authorization required."}, status_code=401)
    return await call_next(request)

# Add Railway/production origins from env
_extra_origins = os.environ.get("PROVECALC_CORS_ORIGINS", "")
if _extra_origins:
    _ALLOWED_ORIGINS.extend([o.strip() for o in _extra_origins.split(",") if o.strip()])

if os.environ.get("PROVECALC_CORS_PERMISSIVE") == "1":
    _ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# Default configuration constants
PLOT_DEFAULT_POINT_COUNT = 100

MAX_EXPRESSION_LENGTH = 4096
MAX_EQUATIONS = 16
MAX_VARIABLES = 128
MAX_BATCH_UNITS = 128
BoundedExpression = Annotated[str, Field(min_length=1, max_length=MAX_EXPRESSION_LENGTH)]
BoundedIdentifier = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[A-Za-z_][A-Za-z0-9_]*$")]

# Initialize engines
compute = ComputeEngine()
units = UnitRegistry()
unit_validator = EquationUnitValidator(units)
domain_classifier = PhysicalDomainClassifier(units)


async def _run_isolated(operation: str, *args: Any) -> Any:
    """Keep process creation and the hard join timeout off the event loop."""

    return await asyncio.to_thread(run_isolated, operation, *args)


# Request/Response Models
class EvaluateRequest(BaseModel):
    expression: BoundedExpression
    variables: Optional[Dict[str, Any]] = Field(default=None, max_length=MAX_VARIABLES)


class ComputeResponse(BaseModel):
    success: bool
    symbolic_result: Optional[str] = None
    numeric_result: Optional[float] = None
    unit: Optional[str] = None
    latex: Optional[str] = None
    error: Optional[str] = None
    warnings: Optional[List[str]] = None


class CheckUnitsRequest(BaseModel):
    expression: BoundedExpression
    expected_unit: Optional[str] = None


class UnitCheckResponse(BaseModel):
    consistent: bool
    inferred_unit: Optional[str] = None
    si_base: Optional[str] = None
    dimensionality: Optional[str] = None
    error: Optional[str] = None
    details: Optional[str] = None


class SolveRequest(BaseModel):
    equations: List[BoundedExpression] = Field(min_length=1, max_length=MAX_EQUATIONS)
    target: BoundedIdentifier
    method: Optional[Literal["symbolic", "numeric", "auto"]] = None
    variables: Optional[Dict[str, Any]] = Field(default=None, max_length=MAX_VARIABLES)  # Known variable values


class SolveNumericRequest(BaseModel):
    equations: List[BoundedExpression] = Field(min_length=1, max_length=MAX_EQUATIONS)
    target: BoundedIdentifier
    variables: Optional[Dict[str, Any]] = Field(default=None, max_length=MAX_VARIABLES)  # Known variable values
    method: Literal["fsolve", "brentq", "newton", "auto"] = "auto"
    initial_guess: float = Field(default=1.0, allow_inf_nan=False)
    bounds: Optional[Tuple[float, float]] = None  # For brentq bracketed method


class SolutionValue(BaseModel):
    variable: str
    symbolic: Optional[str] = None
    numeric: Optional[float] = None
    unit: Optional[str] = None
    latex: Optional[str] = None
    residual: Optional[float] = None


class SolveStep(BaseModel):
    description: str
    expression: str
    latex: Optional[str] = None


class SystemAnalysis(BaseModel):
    equation_count: int
    unknown_count: int
    known_count: int
    unknowns: List[str]
    knowns: List[str]
    status: str  # "determined" | "under_determined" | "over_determined"
    message: str
    solvable_for: List[str]


class SolveResponse(BaseModel):
    success: bool
    solutions: Optional[List[SolutionValue]] = None
    method_used: Optional[str] = None
    residual: Optional[float] = None
    root_count: Optional[int] = None
    root_selection_required: Optional[bool] = None
    selection_policy: Optional[str] = None
    error: Optional[str] = None
    steps: Optional[List[SolveStep]] = None
    system_analysis: Optional[SystemAnalysis] = None


class ValidateEquationRequest(BaseModel):
    equation: BoundedExpression
    variables: Dict[str, Dict[str, Any]] = Field(max_length=MAX_VARIABLES)  # {var_name: {value: ..., unit: ...}}
    target: Optional[BoundedIdentifier] = None


class VariableAnalysis(BaseModel):
    unit: Optional[str] = None
    dimensions: Optional[Dict[str, int]] = None
    dimensions_str: Optional[str] = None
    quantity: Optional[str] = None
    status: str  # "ok", "suspicious", "parse_error", "no_unit"
    error: Optional[str] = None


class ValidateEquationResponse(BaseModel):
    valid: bool
    errors: List[str]
    warnings: List[str]
    variable_analysis: Dict[str, VariableAnalysis]
    suggestion: Optional[str] = None


class AnalyzeSystemRequest(BaseModel):
    equations: List[BoundedExpression] = Field(min_length=1, max_length=MAX_EQUATIONS)
    known_variables: Optional[List[BoundedIdentifier]] = Field(default=None, max_length=MAX_VARIABLES)


class AnalyzeSystemResponse(BaseModel):
    success: bool
    equation_count: Optional[int] = None
    variable_count: Optional[int] = None
    unknown_count: Optional[int] = None
    known_count: Optional[int] = None
    unknowns: Optional[List[str]] = None
    knowns: Optional[List[str]] = None
    all_variables: Optional[List[str]] = None
    status: Optional[str] = None
    message: Optional[str] = None
    solvable_for: Optional[List[str]] = None
    error: Optional[str] = None


class SimplifyRequest(BaseModel):
    expression: BoundedExpression


class DifferentiateRequest(BaseModel):
    expression: BoundedExpression
    variable: BoundedIdentifier
    order: int = Field(default=1, ge=1, le=16)


class IntegrateRequest(BaseModel):
    expression: BoundedExpression
    variable: BoundedIdentifier
    limits: Optional[Tuple[float, float]] = None


class PlotExpressionRequest(BaseModel):
    id: Annotated[str, Field(min_length=1, max_length=64)]
    expr: BoundedExpression
    variable: BoundedIdentifier
    label: Optional[str] = None
    color: Optional[str] = None


class PlotDataRequest(BaseModel):
    expressions: List[PlotExpressionRequest] = Field(min_length=1, max_length=8)
    x_min: float = Field(allow_inf_nan=False)
    x_max: float = Field(allow_inf_nan=False)
    point_count: int = Field(default=PLOT_DEFAULT_POINT_COUNT, ge=2, le=1000)
    variables: Optional[Dict[str, Any]] = Field(default=None, max_length=MAX_VARIABLES)  # Additional variable values


class PlotSeriesData(BaseModel):
    expression_id: str
    x: List[float]
    y: List[Optional[float]]
    label: Optional[str] = None
    color: Optional[str] = None
    error: Optional[str] = None


class PlotDataResponse(BaseModel):
    success: bool
    series: Optional[List[PlotSeriesData]] = None
    x_bounds: Optional[Tuple[float, float]] = None
    y_bounds: Optional[Tuple[float, float]] = None
    error: Optional[str] = None


# Lightweight response models for simple endpoints
class HealthResponse(BaseModel):
    status: str
    engine: str


class UnitConvertResponse(BaseModel):
    success: bool
    value: Optional[float] = None
    unit: Optional[str] = None
    error: Optional[str] = None


class UnitDimensionsResponse(BaseModel):
    success: bool
    unit: Optional[str] = None
    dimensions: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ConstantResponse(BaseModel):
    success: bool
    name: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    error: Optional[str] = None


class ConstantListItem(BaseModel):
    name: str
    value: float
    unit: str


class ConstantListResponse(BaseModel):
    constants: List[ConstantListItem]


class DomainListResponse(BaseModel):
    success: bool
    domains: Dict[str, Dict[str, str]]


# Health check
@app.get("/health", response_model=HealthResponse)
async def health_check():
    status = "healthy" if _COMPUTE_ENABLED and _COMPUTE_TOKEN else "disabled"
    return HealthResponse(status=status, engine="sympy+pint")


# Compute endpoints
@app.post("/compute/evaluate", response_model=ComputeResponse)
async def evaluate(request: EvaluateRequest):
    """Evaluate a mathematical expression."""
    try:
        result = await _run_isolated("compute.evaluate", request.expression, request.variables)
        return result
    except Exception as e:
        logger.error("POST /compute/evaluate failed: %s", e)
        return ComputeResponse(success=False, error=str(e))


@app.post("/compute/check_units", response_model=UnitCheckResponse)
async def check_units(request: CheckUnitsRequest):
    """Check unit consistency of an expression."""
    try:
        result = await _run_isolated("units.check_units", request.expression, request.expected_unit)
        return result
    except Exception as e:
        logger.error("POST /compute/check_units failed: %s", e)
        return UnitCheckResponse(consistent=False, error=str(e))


@app.post("/compute/solve", response_model=SolveResponse)
async def solve(request: SolveRequest):
    """Solve equations for a target variable."""
    try:
        # First analyze the system (exclude solve target from known vars)
        known_vars = list(request.variables.keys()) if request.variables else []
        if request.target and request.target in known_vars:
            known_vars = [v for v in known_vars if v != request.target]
        analysis = await _run_isolated("compute.analyze_system", request.equations, known_vars)

        # Solve the equations
        result = await _run_isolated(
            "compute.solve",
            request.equations,
            request.target,
            request.method,
            request.variables,
        )

        # Add system analysis to response
        if analysis.get("success"):
            result["system_analysis"] = {
                "equation_count": analysis["equation_count"],
                "unknown_count": analysis["unknown_count"],
                "known_count": analysis["known_count"],
                "unknowns": analysis["unknowns"],
                "knowns": analysis["knowns"],
                "status": analysis["status"],
                "message": analysis["message"],
                "solvable_for": analysis["solvable_for"],
            }

        return result
    except Exception as e:
        logger.error("POST /compute/solve failed for target '%s': %s", request.target, e)
        return SolveResponse(success=False, error=str(e))


@app.post("/compute/solve_numeric", response_model=SolveResponse)
async def solve_numeric(request: SolveNumericRequest):
    """
    Solve equations numerically for transcendental equations.

    For equations like x = cos(x) or e^x = x^2 where symbolic solving fails.

    Methods:
    - auto: Try symbolic first, fall back to numeric (default)
    - fsolve: General nonlinear solver from SciPy
    - brentq: Bracketed root finding (requires bounds)
    - newton: Newton-Raphson iteration (uses derivative)

    Returns numeric solution with residual (error measure).
    """
    try:
        result = await _run_isolated(
            "compute.solve_numeric",
            request.equations,
            request.target,
            request.variables,
            request.method,
            request.initial_guess,
            request.bounds,
        )
        return result
    except Exception as e:
        logger.error("POST /compute/solve_numeric failed for target '%s': %s", request.target, e)
        return SolveResponse(success=False, error=str(e))


@app.post("/compute/analyze_system", response_model=AnalyzeSystemResponse)
async def analyze_system(request: AnalyzeSystemRequest):
    """
    Analyze a system of equations for determinacy.

    Returns information about whether the system is:
    - determined: exactly enough equations for unknowns
    - under_determined: not enough equations (infinite solutions)
    - over_determined: too many equations (possibly inconsistent)

    Use this before solving to warn users about potential issues.
    """
    try:
        result = await _run_isolated(
            "compute.analyze_system",
            request.equations,
            request.known_variables,
        )
        return AnalyzeSystemResponse(**result)
    except Exception as e:
        logger.error("POST /compute/analyze_system failed: %s", e)
        return AnalyzeSystemResponse(success=False, error=str(e))


@app.post("/compute/validate_equation", response_model=ValidateEquationResponse)
async def validate_equation(request: ValidateEquationRequest):
    """
    Validate dimensional consistency of an equation before solving.

    Detects:
    - Incorrect units (e.g., Force with temperature: N·°F)
    - Dimensional mismatches between equation sides
    - Suggests corrections when possible

    Call this before /compute/solve to catch unit errors early.
    """
    try:
        result = await _run_isolated(
            "unit.validate_equation",
            request.equation,
            request.variables,
            request.target,
        )
        # Convert variable_analysis dict values to VariableAnalysis models
        var_analysis = {}
        for var_name, analysis in result.get("variable_analysis", {}).items():
            var_analysis[var_name] = VariableAnalysis(
                unit=analysis.get("unit"),
                dimensions=analysis.get("dimensions"),
                dimensions_str=analysis.get("dimensions_str"),
                quantity=analysis.get("quantity"),
                status=analysis.get("status", "unknown"),
                error=analysis.get("error")
            )
        return ValidateEquationResponse(
            valid=result.get("valid", False),
            errors=result.get("errors", []),
            warnings=result.get("warnings", []),
            variable_analysis=var_analysis,
            suggestion=result.get("suggestion")
        )
    except Exception as e:
        logger.error("POST /compute/validate_equation failed: %s", e)
        return ValidateEquationResponse(
            valid=False,
            errors=[str(e)],
            warnings=[],
            variable_analysis={},
            suggestion=None
        )


@app.post("/compute/simplify", response_model=ComputeResponse)
async def simplify(request: SimplifyRequest):
    """Simplify a mathematical expression."""
    try:
        result = await _run_isolated("compute.simplify", request.expression)
        return result
    except Exception as e:
        logger.error("POST /compute/simplify failed: %s", e)
        return ComputeResponse(success=False, error=str(e))


@app.post("/compute/differentiate", response_model=ComputeResponse)
async def differentiate(request: DifferentiateRequest):
    """Differentiate an expression."""
    try:
        result = await _run_isolated(
            "compute.differentiate",
            request.expression,
            request.variable,
            request.order,
        )
        return result
    except Exception as e:
        logger.error("POST /compute/differentiate failed: %s", e)
        return ComputeResponse(success=False, error=str(e))


@app.post("/compute/integrate", response_model=ComputeResponse)
async def integrate(request: IntegrateRequest):
    """Integrate an expression."""
    try:
        result = await _run_isolated(
            "compute.integrate",
            request.expression,
            request.variable,
            request.limits,
        )
        return result
    except Exception as e:
        logger.error("POST /compute/integrate failed: %s", e)
        return ComputeResponse(success=False, error=str(e))


@app.post("/compute/plot_data", response_model=PlotDataResponse)
async def generate_plot_data(request: PlotDataRequest):
    """
    Generate plot data by evaluating expressions over a range.

    For each expression, evaluates it at `point_count` evenly-spaced
    points between x_min and x_max.
    """
    try:
        result = await _run_isolated("plot_data", request.model_dump())
        return result
    except Exception as e:
        logger.error("POST /compute/plot_data failed: %s", e)
        return PlotDataResponse(success=False, error=str(e))


# Unit endpoints
@app.post("/units/convert", response_model=UnitConvertResponse)
async def convert_unit(value: float, from_unit: str, to_unit: str):
    """Convert a value from one unit to another."""
    try:
        result = await _run_isolated("units.convert", value, from_unit, to_unit)
        return UnitConvertResponse(success=True, value=result, unit=to_unit)
    except Exception as e:
        logger.error("POST /units/convert failed: %s", e)
        return UnitConvertResponse(success=False, error=str(e))


@app.get("/units/dimensions/{unit}", response_model=UnitDimensionsResponse)
async def get_dimensions(unit: str):
    """Get the dimensionality of a unit."""
    try:
        dims = await _run_isolated("units.get_dimensions", unit)
        return UnitDimensionsResponse(success=True, unit=unit, dimensions=dims)
    except Exception as e:
        logger.error("GET /units/dimensions failed for '%s': %s", unit, e)
        return UnitDimensionsResponse(success=False, error=str(e))


# Domain Classification Models
class DomainInfo(BaseModel):
    label: str
    color: str
    icon: str


class ClassifyDomainResponse(BaseModel):
    success: bool
    domain: Optional[str] = None
    quantity: Optional[str] = None
    icon: Optional[str] = None
    domain_info: Optional[DomainInfo] = None
    dimensions: Optional[Dict[str, int]] = None
    error: Optional[str] = None


class ClassifyBatchRequest(BaseModel):
    units: List[Annotated[str, Field(min_length=1, max_length=512)]] = Field(
        min_length=1,
        max_length=MAX_BATCH_UNITS,
    )


class ClassifyBatchItem(BaseModel):
    unit: str
    domain: str
    quantity: str
    icon: str
    domain_label: str
    domain_color: str
    success: bool = True
    error: Optional[str] = None


class ClassifyBatchResponse(BaseModel):
    success: bool
    results: Optional[List[ClassifyBatchItem]] = None
    error: Optional[str] = None


# Domain Classification endpoints
@app.get("/units/domain/{unit:path}")
async def classify_domain(unit: str):
    """
    Classify a unit by its physical domain.

    Returns the domain (mechanics, thermodynamics, electrical, etc.)
    and specific quantity name (density, force, pressure, etc.)
    """
    try:
        result = await _run_isolated("domain.classify", unit)
        has_error = "error" in result
        return ClassifyDomainResponse(
            success=not has_error,
            domain=result["domain"],
            quantity=result["quantity"],
            icon=result["icon"],
            domain_info=DomainInfo(**result["domain_info"]) if result.get("domain_info") else None,
            dimensions=result.get("dimensions"),
            error=result.get("error"),
        )
    except Exception as e:
        return ClassifyDomainResponse(success=False, error=str(e))


@app.post("/units/domain/batch")
async def classify_domains_batch(request: ClassifyBatchRequest):
    """
    Classify multiple units by their physical domains in one request.

    More efficient than individual calls for batch operations.
    Per-item errors are recorded individually rather than failing the whole batch.
    """
    results = []
    classified = await _run_isolated("domain.batch", request.units)
    for unit, result in zip(request.units, classified):
        try:
            if "error" in result:
                raise ValueError(result["error"])
            # Defensive access to nested fields
            domain_info = result.get("domain_info", {})
            results.append(ClassifyBatchItem(
                unit=unit,
                domain=result.get("domain", "unknown"),
                quantity=result.get("quantity", "unknown"),
                icon=result.get("icon", "?"),
                domain_label=domain_info.get("label", "Unknown"),
                domain_color=domain_info.get("color", "#9ca3af"),
                success=True,
            ))
        except Exception as e:
            # Record per-item failure without aborting the batch
            results.append(ClassifyBatchItem(
                unit=unit,
                domain="unknown",
                quantity="error",
                icon="⚠️",
                domain_label="Error",
                domain_color="#ef4444",
                success=False,
                error=str(e),
            ))
    return ClassifyBatchResponse(success=True, results=results)


@app.get("/units/domains", response_model=DomainListResponse)
async def list_domains():
    """List all available physical domains with their metadata."""
    return DomainListResponse(
        success=True,
        domains=domain_classifier.get_all_domains()
    )


# Constants endpoint
@app.get("/constants/{name}", response_model=ConstantResponse)
async def get_constant(name: str):
    """Get a physical constant by name."""
    try:
        value, unit = await _run_isolated("constants.get", name)
        return ConstantResponse(success=True, name=name, value=value, unit=unit)
    except Exception as e:
        logger.error("GET /constants/%s failed: %s", name, e)
        return ConstantResponse(success=False, error=str(e))


@app.get("/constants", response_model=ConstantListResponse)
async def list_constants():
    """List all available physical constants."""
    constants = await _run_isolated("constants.list")
    return ConstantListResponse(
        constants=[ConstantListItem(**c) for c in constants]
    )


# Document Export Models
class ExportDocxRequest(BaseModel):
    document_name: Annotated[str, Field(min_length=1, max_length=256)]
    nodes: List[Dict[str, Any]] = Field(min_length=1, max_length=512)
    assumptions: List[Dict[str, Any]] = Field(default_factory=list, max_length=256)
    metadata: Optional[Dict[str, Any]] = Field(default=None, max_length=128)
    source_revision: Optional[str] = Field(default=None, max_length=256)
    verification_summary: Dict[str, Any] = Field(default_factory=dict, max_length=32)
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list, max_length=512)


class ExportDocxResponse(BaseModel):
    success: bool
    data: Optional[str] = None  # Base64 encoded DOCX
    error: Optional[str] = None


@app.post("/export/docx", response_model=ExportDocxResponse)
async def export_to_docx(request: ExportDocxRequest):
    """Export worksheet to Word document format (.docx)."""
    try:
        import base64

        docx_bytes = await _run_isolated(
            "export.docx",
            request.document_name,
            request.nodes,
            request.assumptions,
            request.metadata,
            request.source_revision,
            request.verification_summary,
            request.audit_trail,
        )

        # Return as base64 encoded string
        return ExportDocxResponse(
            success=True,
            data=base64.b64encode(docx_bytes).decode('utf-8'),
        )
    except Exception as e:
        logger.error("POST /export/docx failed: %s", e)
        return ExportDocxResponse(
            success=False,
            error=str(e),
        )


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9743)
