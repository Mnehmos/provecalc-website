/**
 * Web compute service: replaces the desktop's Tauri invoke() calls with HTTP
 * calls to the site's /api/compute relay, which adds the sidecar credential on
 * the server. The browser never talks to the sidecar directly.
 */

const API_URL = "/api/compute";

/** A failed compute call, carrying the sidecar's stable error code. */
export class ComputeApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string, readonly retryable: boolean) {
    super(message);
    this.name = "ComputeApiError";
  }

  /** Callers show String(error); keep that to the readable message. */
  override toString(): string {
    return this.message;
  }
}

async function failure(path: string, res: Response): Promise<ComputeApiError> {
  let code = "HTTP_ERROR";
  let message = "";
  let retryable = res.status === 429 || res.status >= 502;
  try {
    const body = await res.json();
    const err = body?.error;
    if (err && typeof err === "object") {
      if (typeof err.code === "string") code = err.code;
      if (typeof err.message === "string") message = err.message;
      if (typeof err.retryable === "boolean") retryable = err.retryable;
    } else if (typeof body?.detail === "string") {
      message = body.detail;
    }
  } catch {
    // Not JSON: keep the generic message below rather than a raw body.
  }
  if (!message) message = `The compute engine could not handle ${path} (HTTP ${res.status}).`;
  return new ComputeApiError(message, res.status, code, retryable);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failure(path, res);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw await failure(path, res);
  return res.json();
}

// --- Compute endpoints ---

/**
 * Give unitless knowns an explicit "dimensionless" unit. Without one, the
 * engine reads a bare symbol as a unit name, so an effective-length factor K
 * becomes kelvin and a dimensionally correct equation fails its check.
 */
function withExplicitUnits<T>(variables: T): T {
  if (!variables || typeof variables !== "object") return variables;
  const out: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(variables as Record<string, unknown>)) {
    if (entry && typeof entry === "object" && "value" in entry) {
      const unit = (entry as { unit?: unknown }).unit;
      out[name] = typeof unit === "string" && unit.trim() ? entry : { ...entry, unit: "dimensionless" };
    } else {
      out[name] = entry;
    }
  }
  return out as T;
}

export interface ComputeResponse {
  success: boolean;
  symbolic_result?: string | null;
  numeric_result?: number | null;
  unit?: string | null;
  latex?: string | null;
  error?: string | null;
  warnings?: string[] | null;
}

export async function evaluate(
  expression: string,
  variables?: Record<string, unknown>
): Promise<ComputeResponse> {
  return post("/compute/evaluate", { expression, variables: withExplicitUnits(variables) });
}

export interface UnitCheckResponse {
  consistent: boolean;
  inferred_unit?: string | null;
  si_base?: string | null;
  dimensionality?: string | null;
  error?: string | null;
  details?: string | null;
}

export async function checkUnits(
  expression: string,
  expectedUnit?: string
): Promise<UnitCheckResponse> {
  return post("/compute/check_units", {
    expression,
    expected_unit: expectedUnit,
  });
}

export interface SolutionValue {
  variable: string;
  symbolic?: string | null;
  numeric?: number | null;
  unit?: string | null;
  latex?: string | null;
}

export interface SolveStep {
  description: string;
  expression: string;
  latex?: string | null;
}

export interface SystemAnalysis {
  equation_count: number;
  unknown_count: number;
  known_count: number;
  unknowns: string[];
  knowns: string[];
  status: "determined" | "under_determined" | "over_determined";
  message: string;
  solvable_for: string[];
}

export interface SolveResponse {
  success: boolean;
  solutions?: SolutionValue[] | null;
  method_used?: string | null;
  residual?: number | null;
  error?: string | null;
  steps?: SolveStep[] | null;
  system_analysis?: SystemAnalysis | null;
}

export async function solveFor(
  equations: string[],
  target: string,
  variables?: Record<string, unknown>,
  method?: "symbolic" | "numeric" | "auto"
): Promise<SolveResponse> {
  return post("/compute/solve", { equations, target, variables: withExplicitUnits(variables), method });
}

export async function solveNumeric(
  equations: string[],
  target: string,
  variables?: Record<string, unknown>,
  options?: {
    method?: "auto" | "fsolve" | "brentq" | "newton";
    initial_guess?: number;
    bounds?: [number, number];
  }
): Promise<SolveResponse> {
  return post("/compute/solve_numeric", {
    equations,
    target,
    variables: withExplicitUnits(variables),
    ...options,
  });
}

export interface AnalyzeSystemResponse {
  success: boolean;
  equation_count?: number | null;
  variable_count?: number | null;
  unknown_count?: number | null;
  known_count?: number | null;
  unknowns?: string[] | null;
  knowns?: string[] | null;
  all_variables?: string[] | null;
  status?: string | null;
  message?: string | null;
  solvable_for?: string[] | null;
  error?: string | null;
}

export async function analyzeSystem(
  equations: string[],
  knownVariables?: string[]
): Promise<AnalyzeSystemResponse> {
  return post("/compute/analyze_system", {
    equations,
    known_variables: knownVariables,
  });
}

export interface ValidateEquationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variable_analysis: Record<string, { status?: string; unit?: string; dimensions?: Record<string, number>; dimensions_str?: string; quantity?: string; error?: string }>;
  suggestion?: string | null;
}

export async function validateEquation(
  equation: string,
  variables: Record<string, { value: number; unit?: string }>,
  target?: string
): Promise<ValidateEquationResponse> {
  return post("/compute/validate_equation", { equation, variables: withExplicitUnits(variables), target });
}

export async function simplify(expression: string): Promise<ComputeResponse> {
  return post("/compute/simplify", { expression });
}

export async function differentiate(
  expression: string,
  variable: string,
  order = 1
): Promise<ComputeResponse> {
  return post("/compute/differentiate", { expression, variable, order });
}

export async function integrate(
  expression: string,
  variable: string,
  limits?: [number, number]
): Promise<ComputeResponse> {
  return post("/compute/integrate", { expression, variable, limits });
}

export interface PlotDataResponse {
  success: boolean;
  series?: Array<{
    expression_id: string;
    x: number[];
    y: (number | null)[];
    label?: string | null;
    color?: string | null;
    error?: string | null;
  }> | null;
  x_bounds?: [number, number] | null;
  y_bounds?: [number, number] | null;
  error?: string | null;
}

export async function plotData(
  expressions: Array<{
    id: string;
    expr: string;
    variable: string;
    label?: string;
    color?: string;
  }>,
  xMin: number,
  xMax: number,
  pointCount = 100,
  variables?: Record<string, unknown>
): Promise<PlotDataResponse> {
  return post("/compute/plot_data", {
    expressions,
    x_min: xMin,
    x_max: xMax,
    point_count: pointCount,
    variables,
  });
}

// --- Unit endpoints ---

export interface UnitConvertResponse {
  success: boolean;
  value?: number | null;
  unit?: string | null;
  error?: string | null;
}

export async function convertUnits(
  value: number,
  fromUnit: string,
  toUnit: string
): Promise<UnitConvertResponse> {
  return post("/units/convert", { value, from_unit: fromUnit, to_unit: toUnit });
}

export async function getUnitDimensions(unit: string) {
  return get<{ success: boolean; unit?: string; dimensions?: Record<string, number>; error?: string }>(
    `/units/dimensions/${encodeURIComponent(unit)}`
  );
}

export async function classifyUnitDomain(unit: string) {
  return get<{
    success: boolean;
    domain?: string;
    quantity?: string;
    icon?: string;
    error?: string;
  }>(`/units/domain/${encodeURIComponent(unit)}`);
}

export async function classifyUnitsBatch(units: string[]) {
  return post<{
    success: boolean;
    results?: Array<{
      unit: string;
      domain: string;
      quantity: string;
      icon: string;
      success: boolean;
      error?: string;
    }>;
  }>("/units/domain/batch", { units });
}

export async function listDomains() {
  return get<{
    success: boolean;
    domains: Record<string, { label: string; color: string; icon: string }>;
  }>("/units/domains");
}

// --- Constants ---

export async function getConstant(name: string) {
  return get<{
    success: boolean;
    name?: string;
    value?: number;
    unit?: string;
    error?: string;
  }>(`/constants/${encodeURIComponent(name)}`);
}

export async function listConstants() {
  return get<{
    constants: Array<{ name: string; value: number; unit: string }>;
  }>("/constants");
}

// --- Export ---

export async function exportDocx(
  documentName: string,
  nodes: unknown[],
  assumptions?: unknown[],
  metadata?: Record<string, unknown>
) {
  return post<{
    success: boolean;
    data?: string | null; // base64
    error?: string | null;
  }>("/export/docx", {
    document_name: documentName,
    nodes,
    assumptions: assumptions || [],
    metadata,
  });
}

// --- Health ---

export async function healthCheck() {
  return get<{ status: string; engine: string }>("/health");
}

// --- Client-side helpers (ported from desktop computeService) ---

import type { WorksheetDocument, EquationNode, SolveGoalNode } from '../types/document';
import { getCanonicalEquationFields, getEquationSolveExpression } from '../utils/mathParsing';
import { extractKnownSymbolTable } from '../utils/solveContext';
import { logger, startTimer } from '../utils/logger';

// SystemAnalysis is defined locally above

interface Variable {
  value: number;
  unit?: string;
}

export interface SymbolTable {
  [symbol: string]: Variable;
}

export interface VariableAnalysis {
  unit?: string;
  dimensions?: Record<string, number>;
  dimensions_str?: string;
  quantity?: string;
  status: 'ok' | 'suspicious' | 'parse_error' | 'no_unit';
  error?: string;
}

// ValidateEquationResponse is defined earlier in the file

export function extractSymbolTable(document: WorksheetDocument): SymbolTable {
  return extractKnownSymbolTable(document);
}

export function extractEquations(document: WorksheetDocument): string[] {
  const equations: string[] = [];
  for (const node of document.nodes) {
    if (node.type === 'equation') {
      const eq = node as EquationNode;
      const eqString = getEquationSolveExpression(eq).trim();
      const { lhs, rhs } = getCanonicalEquationFields(eq);
      if (/^eq_[a-zA-Z0-9_]+$/.test(lhs) && rhs) {
        equations.push(`${rhs} = 0`);
        continue;
      }
      equations.push(eqString);
    }
  }
  return equations;
}

export function extractSolveGoals(document: WorksheetDocument): SolveGoalNode[] {
  return document.nodes.filter((n): n is SolveGoalNode => n.type === 'solve_goal');
}

/** Alias for useCompute compatibility */
export async function evaluateExpression(
  expression: string,
  symbolTable: SymbolTable
): Promise<ComputeResponse> {
  const timer = startTimer('evaluate_expression');
  logger.api.request('evaluate_expression', { expression });
  try {
    const result = await evaluate(expression, symbolTable);
    timer.complete({ success: result.success });
    return result;
  } catch (e) {
    timer.error(e);
    return { success: false, error: String(e) };
  }
}

/** Alias for validateEquation with SymbolTable */
export async function validateEquationWithSymbols(
  equation: string,
  symbolTable: SymbolTable,
  target?: string
): Promise<ValidateEquationResponse> {
  const timer = startTimer('validate_equation');
  try {
    const result = await post<ValidateEquationResponse>("/compute/validate_equation", {
      equation,
      variables: withExplicitUnits(symbolTable),
      target,
    });
    timer.complete({ valid: result.valid });
    return result;
  } catch (e) {
    timer.error(e);
    return { valid: false, errors: [String(e)], warnings: [], variable_analysis: {} };
  }
}

function simplifyUnitExpression(expr: string): string {
  let simplified = expr;
  simplified = simplified.replace(/Abs\(([^)]+)\)/g, '$1');
  if (/^(atan2|atan|asin|acos)\(/.test(simplified)) return 'rad';
  const sqrtMatch = simplified.match(/^sqrt\((.+)\)$/);
  if (sqrtMatch) {
    const inner = sqrtMatch[1];
    const terms = inner.split(/\s*\+\s*/);
    const units = terms.map(t => {
      const m = t.match(/^\(([^)]+)\)\s*\*{0,2}\s*\*?\s*2$/) ||
                t.match(/^\(([^)]+)\)\s*\^?\s*2$/);
      return m ? m[1].trim() : null;
    });
    if (units.length > 0 && units.every(u => u !== null && u === units[0])) {
      return units[0]!;
    }
  }
  simplified = simplified.replace(/\bsqrt\b/g, '');
  simplified = simplified.replace(/\bAbs\b/g, '');
  return simplified;
}

export function inferResultUnit(
  expression: string,
  symbolTable: SymbolTable
): string | undefined {
  let unitExpression = expression;
  for (const [symbol, variable] of Object.entries(symbolTable)) {
    const regex = new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    if (variable.unit) {
      unitExpression = unitExpression.replace(regex, `(${variable.unit})`);
    } else {
      // Dimensionless variable — replace with 1 so it drops out of unit expression
      unitExpression = unitExpression.replace(regex, '1');
    }
  }
  unitExpression = simplifyUnitExpression(unitExpression);
  return unitExpression;
}

export const UNIT_DIMENSIONS: Record<string, string> = {
  'm': '[length]', 'cm': '[length]', 'mm': '[length]', 'km': '[length]', 'ft': '[length]', 'in': '[length]',
  's': '[time]', 'min': '[time]', 'hr': '[time]',
  'kg': '[mass]', 'g': '[mass]', 'lb': '[mass]',
  'N': '[mass]*[length]/[time]^2', 'kN': '[mass]*[length]/[time]^2', 'lbf': '[mass]*[length]/[time]^2',
  'm/s': '[length]/[time]', 'km/h': '[length]/[time]', 'ft/s': '[length]/[time]',
  'J': '[mass]*[length]^2/[time]^2', 'kJ': '[mass]*[length]^2/[time]^2',
  'W': '[mass]*[length]^2/[time]^3', 'kW': '[mass]*[length]^2/[time]^3',
  'Pa': '[mass]/[length]/[time]^2', 'kPa': '[mass]/[length]/[time]^2', 'MPa': '[mass]/[length]/[time]^2', 'psi': '[mass]/[length]/[time]^2',
  'rad': '[angle]', 'deg': '[angle]',
  'K': '[temperature]', 'C': '[temperature]', 'F': '[temperature]',
};

export function suggestUnits(context: string): string[] {
  const suggestions: Record<string, string[]> = {
    velocity: ['m/s', 'km/h', 'mph', 'ft/s'],
    force: ['N', 'kN', 'lbf', 'MN'],
    length: ['m', 'cm', 'mm', 'km', 'ft', 'in'],
    mass: ['kg', 'g', 'lb', 'ton'],
    time: ['s', 'min', 'hr', 'ms'],
    energy: ['J', 'kJ', 'Wh', 'kWh', 'BTU'],
    power: ['W', 'kW', 'MW', 'hp'],
    pressure: ['Pa', 'kPa', 'MPa', 'psi', 'bar', 'atm'],
  };
  return suggestions[context] || ['m', 'kg', 's', 'N', 'J', 'W', 'Pa'];
}
