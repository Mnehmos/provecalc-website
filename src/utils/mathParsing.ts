/**
 * Math Expression Parsing Utilities
 *
 * Handles implicit multiplication and variable extraction from mathematical expressions.
 * Mirrors SymPy's implicit_multiplication_application behavior.
 */

/**
 * Known mathematical functions that should NOT be split.
 * These are common function names in both LaTeX and SymPy notation.
 */
const MATH_FUNCTIONS = new Set([
  // Trigonometric
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
  'arcsin', 'arccos', 'arctan', 'arccot', 'arcsec', 'arccsc',
  'asin', 'acos', 'atan', 'atan2',
  // Logarithmic/Exponential
  'log', 'ln', 'exp', 'log10', 'log2',
  // Roots and powers
  'sqrt', 'cbrt', 'root',
  // Other common functions
  'abs', 'sign', 'floor', 'ceil', 'round',
  'max', 'min', 'sum', 'prod',
  'factorial', 'gamma', 'beta',
  'erf', 'erfc',
  // SymPy specific
  'Abs', 'Symbol', 'Integer', 'Float', 'Rational',
  'diff', 'integrate', 'limit', 'series',
  'Matrix', 'det', 'trace',
]);

/**
 * Known mathematical constants that should NOT be split.
 */
const MATH_CONSTANTS = new Set([
  'pi', 'Pi', 'PI',
  'inf', 'Inf', 'oo',  // SymPy infinity
  'nan', 'NaN',
  'true', 'false', 'True', 'False',
]);

/**
 * Greek letter names (lowercase) - these should be treated as single variables
 */
const GREEK_LETTERS = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho',
  'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  // Uppercase variants
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho',
  'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
]);

const GREEK_COMMAND_REGEX = /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)(?=[^a-zA-Z]|$)/g;
const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;


/**
 * Normalize prime position to canonical suffix form.
 *
 * Moves `_prime` from mid-position to suffix so that variable names
 * are consistent regardless of whether they came from LaTeX (x'_{cg} → x_prime_cg)
 * or from AI output (x_cg_prime).
 *
 * Examples:
 * - `x_prime_cg` → `x_cg_prime`
 * - `x_prime_1` → `x_1_prime`
 * - `F_prime_i` → `F_i_prime`
 * - `x_prime` → `x_prime` (already at end, no change)
 * - `x_cg_prime` → `x_cg_prime` (already at end, no change)
 */
export function normalizePrimePosition(expr: string): string {
  if (!expr) return expr;
  // Match: (base)_prime_(remaining subscripts) and move _prime to end
  return expr.replace(
    /\b([a-zA-Z][a-zA-Z0-9]*)_prime_([a-zA-Z0-9]+(?:_[a-zA-Z0-9]+)*)\b/g,
    '$1_$2_prime',
  );
}

/**
 * Normalize LaTeX markup into plain algebraic form for parsing.
 *
 * Converts:
 * - `\frac{a}{b}` → `(a)/(b)`
 * - `\cdot` → `*`
 * - `_{cg}` → `_cg`, `^{2}` → `^2` (strip subscript/superscript braces)
 * - `\sum`, `\prod`, `\int` → removed (structural operators)
 * - `\sqrt{x}` → `sqrt(x)`, `\sin` → `sin`, etc.
 * - Remaining `\command` patterns → stripped
 */
export function normalizeLatex(expr: string): string {
  if (!expr) return expr;
  let r = expr;
  // Escaped underscores (\_) → plain underscores FIRST (before any other processing)
  r = r.replace(/\\_/g, '_');
  // LaTeX spacing commands: \; \, \! \: → remove
  // `\,` commonly appears between multiplied factors in imported LaTeX.
  r = r.replace(/\\,/g, '*');
  r = r.replace(/\\[;!:]/g, '');
  r = r.replace(GREEK_COMMAND_REGEX, '$1');
  // Strip subscript/superscript braces so nested braces don't break \frac parsing
  // _{cg_prime} → _cg_prime, ^{2} → ^2
  r = r.replace(/_\{([^}]*)\}/g, '_$1');
  r = r.replace(/\^\{([^}]*)\}/g, '^$1');
  // Unwrap common style wrappers before \frac parsing so nested braces don't break it
  // \mathbf{F} → F, \mathrm{x} → x
  r = r.replace(/\\(?:mathbf|mathrm|mathit|operatorname|text)\{([^}]*)\}/g, '$1');
  // \frac{a}{b} → (a)/(b) — safe now that inner braces are stripped
  r = r.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  // \cdot → *
  r = r.replace(/\\cdot/g, '*');
  // \times → *
  r = r.replace(/\\times/g, '*');
  // ^ → ** (LaTeX power to SymPy power)
  r = r.replace(/\^/g, '**');
  // \left, \right → remove (grouping decorators)
  r = r.replace(/\\left|\\right/g, '');
  // \sum, \prod, \int → remove (structural operators, not variables)
  r = r.replace(/\\(sum|prod|int)\b/g, '');
  // \sqrt{x} → sqrt(x), \sin → sin, etc. (known function commands)
  r = r.replace(/\\(sqrt|sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|arcsin|arccos|arctan|log|ln|exp|abs)\{([^}]*)\}/g, '$1($2)');
  r = r.replace(/\\(sqrt|sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|arcsin|arccos|arctan|log|ln|exp|abs)\b/g, '$1');
  // Convert prime notation to underscore: x' → x_prime, x'_cg → x_prime_cg
  // This keeps primed variables as single tokens for variable extraction
  r = r.replace(/([a-zA-Z])'/g, '$1_prime');
  // Strip remaining \command{content} patterns (e.g., \text{}, \mathrm{}) — keep content
  r = r.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  // Strip remaining \command patterns (no braces)
  r = r.replace(/\\[a-zA-Z]+/g, '');
  // Remove stray braces and backslashes
  r = r.replace(/[{}\\]/g, '');
  // |symbol| → symbol_mag for vector magnitude notation
  // e.g., |F| → F_mag, |F_x| → F_x_mag
  r = r.replace(/\|\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\|/g, '$1_mag');
  // Abs(symbol) → symbol_mag (keep compute symbols consistent)
  r = r.replace(/\bAbs\(([a-zA-Z][a-zA-Z0-9_]*)\)\b/g, '$1_mag');
  // Remaining |expr| → Abs(expr) for true absolute-value expressions
  r = r.replace(/\|([^|]+)\|/g, 'Abs($1)');
  // Normalize prime position: x_prime_cg → x_cg_prime (suffix canonical form)
  r = normalizePrimePosition(r);
  return r;
}

function splitEquation(expr: string): { lhs: string; rhs: string } {
  const parts = expr.split('=');
  if (parts.length < 2) {
    return { lhs: expr.trim(), rhs: '' };
  }
  return {
    lhs: parts[0]?.trim() || '',
    rhs: parts.slice(1).join('=').trim(),
  };
}

export interface EquationLikeFields {
  lhs?: string;
  rhs?: string;
  sympy?: string;
  latex?: string;
}

/**
 * Parse narrative equilibrium forms like:
 *   "sum M_A = 0: R_D L = W x_W + B d + C (2d)"
 * into a canonical constraint:
 *   "R_D*L - (W*x_W + B*d + C*(2*d)) = 0"
 */
function parseNarrativeEquality(expr: string): string | null {
  const normalized = expr.trim();
  if (!normalized.includes(':') || !normalized.includes('=')) return null;

  const tail = normalized.slice(normalized.lastIndexOf(':') + 1).trim();
  if (!tail) return null;

  const eqIndex = tail.indexOf('=');
  if (eqIndex < 0) return null;

  const left = tail.slice(0, eqIndex).trim();
  const right = tail.slice(eqIndex + 1).trim();
  if (!left || !right) return null;

  const leftExpr = addImplicitMultiplication(left);
  const rightExpr = addImplicitMultiplication(right);

  return `${leftExpr} - (${rightExpr}) = 0`;
}

/**
 * Canonicalize equation fields for compute and variable extraction.
 *
 * Handles legacy nodes where display LaTeX uses magnitude bars (|F|) but
 * stored lhs is plain F by upgrading lhs to F_mag when that mapping is clear.
 */
export function getCanonicalEquationFields(equation: EquationLikeFields): { lhs: string; rhs: string } {
  let lhs = (equation.lhs || '').trim();
  let rhs = (equation.rhs || '').trim();

  const normalizedLatex = equation.latex ? normalizeLatex(equation.latex) : '';
  const { lhs: latexLhs, rhs: latexRhs } = splitEquation(normalizedLatex);

  if (lhs && (/\\|\||[{}()]/.test(lhs) || !IDENTIFIER_RE.test(lhs))) {
    const normalizedLhs = splitEquation(normalizeLatex(lhs)).lhs;
    if (IDENTIFIER_RE.test(normalizedLhs)) {
      lhs = normalizedLhs;
    }
  }

  const legacyMagnitudeAlias =
    IDENTIFIER_RE.test(latexLhs) &&
    latexLhs.endsWith('_mag') &&
    lhs === latexLhs.replace(/_mag$/, '');

  if (
    (!IDENTIFIER_RE.test(lhs) && IDENTIFIER_RE.test(latexLhs)) ||
    legacyMagnitudeAlias ||
    (!lhs && IDENTIFIER_RE.test(latexLhs))
  ) {
    lhs = latexLhs;
  }

  if (!rhs && latexRhs) {
    rhs = latexRhs;
  } else if (rhs && /\\|\||[{}]/.test(rhs)) {
    rhs = normalizeLatex(rhs);
  }

  return { lhs, rhs };
}

/**
 * Build equation text suitable for sending to compute.
 */
export function getEquationSolveExpression(equation: EquationLikeFields): string {
  const sympy = (equation.sympy || '').trim();
  if (sympy) {
    const normalized = /\\/.test(sympy) ? normalizeLatex(sympy) : sympy;

    if (equation.latex) {
      const narrativeFromLatex = parseNarrativeEquality(normalizeLatex(equation.latex));
      if (narrativeFromLatex) return narrativeFromLatex;
    }

    const narrativeFromSympy = parseNarrativeEquality(normalized);
    if (narrativeFromSympy) return narrativeFromSympy;

    // Synthetic placeholder equations (eq_*) represent constraints, not unknowns.
    // Normalize `eq_Fy = expr` into `expr = 0` for solver input.
    const assignMatch = normalized.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (assignMatch && /^eq_[a-zA-Z0-9_]+$/.test(assignMatch[1])) {
      return `${assignMatch[2].trim()} = 0`;
    }

    // Also support SymPy Eq(...) form.
    const eqCallMatch = normalized.match(/^Eq\(\s*(eq_[a-zA-Z0-9_]+)\s*,\s*(.+)\)\s*$/);
    if (eqCallMatch) {
      return `${eqCallMatch[2].trim()} = 0`;
    }

    return normalized;
  }

  const { lhs, rhs } = getCanonicalEquationFields(equation);

  if (equation.latex) {
    const narrativeFromLatex = parseNarrativeEquality(normalizeLatex(equation.latex));
    if (narrativeFromLatex) return narrativeFromLatex;
  }

  const narrativeFromFields = parseNarrativeEquality(`${lhs} = ${rhs}`);
  if (narrativeFromFields) return narrativeFromFields;

  if (/^eq_[a-zA-Z0-9_]+$/.test(lhs) && rhs) {
    return `${rhs} = 0`;
  }
  if (lhs && rhs) return `${lhs} = ${rhs}`;
  if (equation.latex) return normalizeLatex(equation.latex);
  if (rhs) return lhs ? `${lhs} = ${rhs}` : rhs;
  return lhs;
}

/**
 * Build equation text for variable extraction.
 */
export function getEquationExtractionExpression(equation: EquationLikeFields): string {
  const { lhs, rhs } = getCanonicalEquationFields(equation);
  if (rhs) {
    if (equation.latex) {
      const narrativeFromLatex = parseNarrativeEquality(normalizeLatex(equation.latex));
      if (narrativeFromLatex) return narrativeFromLatex;
    }

    const narrativeFromFields = parseNarrativeEquality(`${lhs} = ${rhs}`);
    if (narrativeFromFields) return narrativeFromFields;

    // Synthetic placeholder LHS labels (eq_*) are equation IDs, not variables.
    // Use only the RHS for variable extraction so these do not leak into UI solve lists.
    if (/^eq_[a-zA-Z0-9_]+$/.test(lhs)) {
      return rhs;
    }
    return lhs ? `${lhs} ${rhs}` : rhs;
  }
  return getEquationSolveExpression(equation);
}

/**
 * Add implicit multiplication to an expression.
 *
 * Transforms:
 * - `bh` → `b*h` (consecutive single letters)
 * - `2x` → `2*x` (number followed by letter)
 * - `x(y+z)` → `x*(y+z)` (letter followed by parenthesis)
 * - `(x)(y)` → `(x)*(y)` (closing paren followed by opening paren)
 * - `(x)y` → `(x)*y` (closing paren followed by letter)
 *
 * Preserves:
 * - Function names: `sin`, `cos`, `sqrt`, etc.
 * - Greek letters: `alpha`, `beta`, `theta`, etc.
 * - Subscripted variables: `E_k`, `delta_v`, etc.
 *
 * @param expr - The expression string (SymPy format, not LaTeX)
 * @returns Expression with explicit multiplication operators
 */
export function addImplicitMultiplication(expr: string): string {
  if (!expr) return expr;

  let result = expr;

  // First, protect reserved words by marking them
  // We'll use a placeholder that won't appear in normal expressions
  const protectedWords: Map<string, string> = new Map();
  let placeholderIndex = 0;

  // Find and protect all reserved words (longer ones first to avoid partial matches)
  const allReserved = [...MATH_FUNCTIONS, ...MATH_CONSTANTS, ...GREEK_LETTERS]
    .sort((a, b) => b.length - a.length);

  for (const word of allReserved) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    if (regex.test(result)) {
      const placeholder = `__RESERVED_${placeholderIndex++}__`;
      protectedWords.set(placeholder, word);
      result = result.replace(regex, placeholder);
    }
  }

  // Also protect subscripted variables like E_k, v_0, delta_x, x_cg_prime
  // Use (?:_[a-zA-Z0-9]+)+ to match multi-segment subscripts (e.g. x_1_prime)
  const subscriptRegex = /\b([a-zA-Z]+(?:_[a-zA-Z0-9]+)+)\b/g;
  let match;
  while ((match = subscriptRegex.exec(result)) !== null) {
    const subscriptVar = match[1];
    const placeholder = `__RESERVED_${placeholderIndex++}__`;
    protectedWords.set(placeholder, subscriptVar);
    result = result.replace(new RegExp(`\\b${subscriptVar}\\b`, 'g'), placeholder);
  }

  // Now apply implicit multiplication rules to unprotected single letters

  // Rule 1: Number followed by letter (but not part of placeholder)
  // 2x → 2*x, but not 2__RESERVED
  result = result.replace(/(\d)([a-zA-Z])(?!_)/g, '$1*$2');

  // Rule 2: Letter followed by opening parenthesis
  // x( → x*(, but not __( (placeholder)
  result = result.replace(/([a-zA-Z])(?<!_)\(/g, '$1*(');

  // Rule 3: Closing parenthesis followed by letter or opening parenthesis
  // )x → )*x, )( → )*(
  result = result.replace(/\)([a-zA-Z(])/g, ')*$1');

  // Rule 4: Consecutive single letters (the main case for bh → b*h)
  // This is trickier - we need to split runs of single letters
  // Match sequences of 2+ lowercase letters that aren't placeholders
  result = result.replace(/(?<![_A-Z])([a-z])([a-z])(?![_a-z])/g, '$1*$2');

  // Repeat to handle longer sequences (abc → a*b*c needs multiple passes)
  for (let i = 0; i < 3; i++) {
    result = result.replace(/(?<![_A-Z])([a-z])([a-z])(?![_a-z])/g, '$1*$2');
  }

  // Restore protected words
  for (const [placeholder, word] of protectedWords) {
    result = result.replace(new RegExp(placeholder, 'g'), word);
  }

  return result;
}

/**
 * Extract variables from a mathematical expression.
 *
 * Applies implicit multiplication first, then extracts all unique identifiers
 * that are not functions or constants.
 *
 * @param expr - The expression string
 * @returns Array of unique variable names
 */
export function extractVariables(expr: string): string[] {
  if (!expr) return [];

  // Normalize LaTeX to plain algebraic form first
  const normalized = normalizeLatex(expr);

  // Apply implicit multiplication to properly separate variables
  const processed = addImplicitMultiplication(normalized);

  // Match all identifiers (including subscripted like E_k, x_cg)
  const matches = processed.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) || [];

  // Filter out functions and constants
  const variables = matches.filter(v =>
    !MATH_FUNCTIONS.has(v) &&
    !MATH_CONSTANTS.has(v)
  );

  // Return unique values
  return [...new Set(variables)];
}
