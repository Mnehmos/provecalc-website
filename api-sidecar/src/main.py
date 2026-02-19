"""
mnehmos.worksheet Python Sidecar
================================
Compute engine for engineering calculations using SymPy and Pint.

Core Principle: The sidecar computes, validates, and returns structured results.
It never makes decisions - only the LLM proposes, and the engine verifies.
"""

import logging
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Tuple
import uvicorn
import numpy as np

logger = logging.getLogger(__name__)

from .compute import ComputeEngine
from .units import UnitRegistry, EquationUnitValidator, PhysicalDomainClassifier

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
PLOT_Y_PADDING_RATIO = 0.1

# Initialize engines
compute = ComputeEngine()
units = UnitRegistry()
unit_validator = EquationUnitValidator(units)
domain_classifier = PhysicalDomainClassifier(units)


# Request/Response Models
class EvaluateRequest(BaseModel):
    expression: str
    variables: Optional[Dict[str, Any]] = None


class ComputeResponse(BaseModel):
    success: bool
    symbolic_result: Optional[str] = None
    numeric_result: Optional[float] = None
    unit: Optional[str] = None
    latex: Optional[str] = None
    error: Optional[str] = None
    warnings: Optional[List[str]] = None


class CheckUnitsRequest(BaseModel):
    expression: str
    expected_unit: Optional[str] = None


class UnitCheckResponse(BaseModel):
    consistent: bool
    inferred_unit: Optional[str] = None
    si_base: Optional[str] = None
    dimensionality: Optional[str] = None
    error: Optional[str] = None
    details: Optional[str] = None


class SolveRequest(BaseModel):
    equations: List[str]
    target: str
    method: Optional[str] = None  # "symbolic", "numeric", "auto"
    variables: Optional[Dict[str, Any]] = None  # Known variable values


class SolveNumericRequest(BaseModel):
    equations: List[str]
    target: str
    variables: Optional[Dict[str, Any]] = None  # Known variable values
    method: str = "auto"  # "fsolve", "brentq", "newton", "auto"
    initial_guess: float = 1.0
    bounds: Optional[Tuple[float, float]] = None  # For brentq bracketed method


class SolutionValue(BaseModel):
    variable: str
    symbolic: Optional[str] = None
    numeric: Optional[float] = None
    unit: Optional[str] = None
    latex: Optional[str] = None


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
    error: Optional[str] = None
    steps: Optional[List[SolveStep]] = None
    system_analysis: Optional[SystemAnalysis] = None


class ValidateEquationRequest(BaseModel):
    equation: str
    variables: Dict[str, Dict[str, Any]]  # {var_name: {value: ..., unit: ...}}
    target: Optional[str] = None


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
    equations: List[str]
    known_variables: Optional[List[str]] = None


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
    expression: str


class DifferentiateRequest(BaseModel):
    expression: str
    variable: str
    order: int = 1


class IntegrateRequest(BaseModel):
    expression: str
    variable: str
    limits: Optional[Tuple[float, float]] = None


class PlotExpressionRequest(BaseModel):
    id: str
    expr: str
    variable: str
    label: Optional[str] = None
    color: Optional[str] = None


class PlotDataRequest(BaseModel):
    expressions: List[PlotExpressionRequest]
    x_min: float
    x_max: float
    point_count: int = PLOT_DEFAULT_POINT_COUNT
    variables: Optional[Dict[str, Any]] = None  # Additional variable values


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
    return HealthResponse(status="healthy", engine="sympy+pint")


# Compute endpoints
@app.post("/compute/evaluate", response_model=ComputeResponse)
async def evaluate(request: EvaluateRequest):
    """Evaluate a mathematical expression."""
    try:
        result = compute.evaluate(request.expression, request.variables)
        return result
    except Exception as e:
        logger.error("POST /compute/evaluate failed: %s", e)
        return ComputeResponse(success=False, error=str(e))


@app.post("/compute/check_units", response_model=UnitCheckResponse)
async def check_units(request: CheckUnitsRequest):
    """Check unit consistency of an expression."""
    try:
        result = units.check_units(request.expression, request.expected_unit)
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
        analysis = compute.analyze_system(request.equations, known_vars)

        # Solve the equations
        result = compute.solve(request.equations, request.target, request.method, request.variables)

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
        result = compute.solve_numeric(
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
        result = compute.analyze_system(request.equations, request.known_variables)
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
        result = unit_validator.validate_equation(
            request.equation,
            request.variables,
            request.target
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
        result = compute.simplify(request.expression)
        return result
    except Exception as e:
        logger.error("POST /compute/simplify failed: %s", e)
        return ComputeResponse(success=False, error=str(e))


@app.post("/compute/differentiate", response_model=ComputeResponse)
async def differentiate(request: DifferentiateRequest):
    """Differentiate an expression."""
    try:
        result = compute.differentiate(request.expression, request.variable, request.order)
        return result
    except Exception as e:
        logger.error("POST /compute/differentiate failed: %s", e)
        return ComputeResponse(success=False, error=str(e))


@app.post("/compute/integrate", response_model=ComputeResponse)
async def integrate(request: IntegrateRequest):
    """Integrate an expression."""
    try:
        result = compute.integrate(request.expression, request.variable, request.limits)
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
        series_list = []
        all_y_values = []

        # Generate x values
        x_values = np.linspace(request.x_min, request.x_max, request.point_count).tolist()

        for expr_req in request.expressions:
            y_values = []
            expr_error = None

            for x in x_values:
                try:
                    # Build variable dict with current x value
                    vars_dict = {expr_req.variable: x}
                    if request.variables:
                        vars_dict.update(request.variables)

                    # Evaluate the expression
                    result = compute.evaluate(expr_req.expr, vars_dict)

                    if result.get("success") and result.get("numeric_result") is not None:
                        val = result["numeric_result"]
                        # Replace non-finite values with None for JSON safety
                        if isinstance(val, (int, float)) and np.isfinite(val):
                            y_values.append(float(val))
                        else:
                            y_values.append(None)
                    else:
                        # Handle undefined points (asymptotes, etc.)
                        y_values.append(None)
                except Exception:
                    y_values.append(None)

            # Filter out None values for bounds calculation
            valid_y = [y for y in y_values if y is not None and np.isfinite(y)]
            if valid_y:
                all_y_values.extend(valid_y)

            series_list.append(PlotSeriesData(
                expression_id=expr_req.id,
                x=x_values,
                y=y_values,
                label=expr_req.label,
                color=expr_req.color,
                error=expr_error,
            ))

        # Calculate y bounds
        y_min = min(all_y_values) if all_y_values else 0
        y_max = max(all_y_values) if all_y_values else 1

        # Add padding to y bounds
        y_range = y_max - y_min
        if y_range == 0:
            y_range = 1
        y_min -= y_range * PLOT_Y_PADDING_RATIO
        y_max += y_range * PLOT_Y_PADDING_RATIO

        return PlotDataResponse(
            success=True,
            series=series_list,
            x_bounds=(request.x_min, request.x_max),
            y_bounds=(y_min, y_max),
        )
    except Exception as e:
        logger.error("POST /compute/plot_data failed: %s", e)
        return PlotDataResponse(success=False, error=str(e))


# Unit endpoints
@app.post("/units/convert", response_model=UnitConvertResponse)
async def convert_unit(value: float, from_unit: str, to_unit: str):
    """Convert a value from one unit to another."""
    try:
        result = units.convert(value, from_unit, to_unit)
        return UnitConvertResponse(success=True, value=result, unit=to_unit)
    except Exception as e:
        logger.error("POST /units/convert failed: %s", e)
        return UnitConvertResponse(success=False, error=str(e))


@app.get("/units/dimensions/{unit}", response_model=UnitDimensionsResponse)
async def get_dimensions(unit: str):
    """Get the dimensionality of a unit."""
    try:
        dims = units.get_dimensions(unit)
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
    units: List[str]


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
        result = domain_classifier.classify(unit)
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
    for unit in request.units:
        try:
            result = domain_classifier.classify(unit)
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
        value, unit = compute.get_constant(name)
        return ConstantResponse(success=True, name=name, value=value, unit=unit)
    except Exception as e:
        logger.error("GET /constants/%s failed: %s", name, e)
        return ConstantResponse(success=False, error=str(e))


@app.get("/constants", response_model=ConstantListResponse)
async def list_constants():
    """List all available physical constants."""
    return ConstantListResponse(
        constants=[ConstantListItem(**c) for c in compute.list_constants()]
    )


# Document Export Models
class ExportDocxRequest(BaseModel):
    document_name: str
    nodes: List[Dict[str, Any]]
    assumptions: List[Dict[str, Any]] = []
    metadata: Optional[Dict[str, Any]] = None


class ExportDocxResponse(BaseModel):
    success: bool
    data: Optional[str] = None  # Base64 encoded DOCX
    error: Optional[str] = None


@app.post("/export/docx", response_model=ExportDocxResponse)
async def export_to_docx(request: ExportDocxRequest):
    """Export worksheet to Word document format (.docx)."""
    try:
        from .docx_export import export_to_docx as do_export
        import base64

        docx_bytes = do_export(
            document_name=request.document_name,
            nodes=request.nodes,
            assumptions=request.assumptions,
            metadata=request.metadata,
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
