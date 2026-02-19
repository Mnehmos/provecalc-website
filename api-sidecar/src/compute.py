"""
Compute Engine - Symbolic and numeric computation using SymPy
"""

import logging
from typing import Optional, Dict, Any, List, Tuple, Union
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
from sympy import latex, simplify as sp_simplify, solve as sp_solve, diff, integrate as sp_integrate
from sympy import Symbol, symbols, Eq, N
from sympy import lambdify
import numpy as np
from scipy.optimize import fsolve, brentq, newton
import re

try:
    from .parsing import parse_equation
except ImportError:
    from parsing import parse_equation

logger = logging.getLogger(__name__)


class ComputeEngine:
    """
    Compute engine for mathematical operations.

    This engine handles all computation - the LLM proposes, this validates and computes.
    """

    def __init__(self):
        # Standard transformations for parsing
        self.transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

        # Cache for parsed symbols
        self._symbol_cache: Dict[str, Symbol] = {}

        # Physical constants (value, unit)
        self.constants: Dict[str, Tuple[float, str]] = {
            "c": (299792458, "m/s"),  # Speed of light
            "G": (6.67430e-11, "m^3/(kg*s^2)"),  # Gravitational constant
            "h": (6.62607015e-34, "J*s"),  # Planck constant
            "k_B": (1.380649e-23, "J/K"),  # Boltzmann constant
            "N_A": (6.02214076e23, "1/mol"),  # Avogadro constant
            "R": (8.314462618, "J/(mol*K)"),  # Gas constant
            "e": (1.602176634e-19, "C"),  # Elementary charge
            "m_e": (9.1093837015e-31, "kg"),  # Electron mass
            "m_p": (1.67262192369e-27, "kg"),  # Proton mass
            "epsilon_0": (8.8541878128e-12, "F/m"),  # Vacuum permittivity
            "mu_0": (1.25663706212e-6, "H/m"),  # Vacuum permeability
            "g": (9.80665, "m/s^2"),  # Standard gravity
            "atm": (101325, "Pa"),  # Standard atmosphere
            "sigma": (5.670374419e-8, "W/(m^2*K^4)"),  # Stefan-Boltzmann constant
        }

    def _get_symbol(self, name: str) -> Symbol:
        """Get or create a symbol."""
        if name not in self._symbol_cache:
            self._symbol_cache[name] = Symbol(name, real=True)
        return self._symbol_cache[name]

    def _parse_expression(self, expr_str: str, local_dict: Optional[Dict] = None) -> sp.Expr:
        """Parse a string expression into a SymPy expression."""
        if local_dict is None:
            local_dict = {}

        # Strip LaTeX formatting before parsing
        expr_str = re.sub(r'\^{([^}]*)}', r'^\1', expr_str)   # ^{2} → ^2
        expr_str = re.sub(r'_{([^}]*)}', r'_\1', expr_str)    # _{x} → _x
        # Convert LaTeX function braces to parens: sqrt{...} → sqrt(...)
        expr_str = re.sub(r'(sqrt|sin|cos|tan|asin|acos|atan|atan2|log|ln|exp|abs)\{([^}]*)\}',
                          r'\1(\2)', expr_str)
        # Strip \frac{a}{b} → (a)/(b)
        expr_str = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', expr_str)
        # Strip LaTeX operators: \cdot → *, \times → *
        expr_str = expr_str.replace('\\cdot', '*').replace('\\times', '*')
        # Strip \left, \right decorators
        expr_str = re.sub(r'\\left|\\right', '', expr_str)
        # Strip structural operators: \sum, \prod, \int (not solvable without bounds)
        expr_str = re.sub(r'\\(sum|prod|int)\b', '', expr_str)
        # Strip remaining \command sequences
        expr_str = re.sub(r'\\[a-zA-Z]+', '', expr_str)
        # Clean up stray braces
        expr_str = expr_str.replace('{', '').replace('}', '')

        # Add common symbols
        common_symbols = ['x', 'y', 'z', 't', 'a', 'b', 'c', 'n', 'm', 'r', 'theta', 'phi']
        for s in common_symbols:
            if s not in local_dict:
                local_dict[s] = self._get_symbol(s)

        # Parse with transformations
        try:
            return parse_expr(expr_str, local_dict=local_dict, transformations=self.transformations)
        except Exception as e:
            raise ValueError(f"Failed to parse expression '{expr_str}': {e}")

    def evaluate(self, expression: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Evaluate a mathematical expression.

        Args:
            expression: Mathematical expression string
            variables: Optional dict of variable values

        Returns:
            Dict with symbolic_result, numeric_result, latex
        """
        try:
            # Build local dict with variable values
            local_dict = {}
            if variables:
                for name, value in variables.items():
                    if isinstance(value, dict):
                        # Value with unit: {"value": 5, "unit": "m"}
                        local_dict[name] = value.get("value", 0)
                    else:
                        local_dict[name] = value

            # Parse expression
            expr = self._parse_expression(expression, local_dict)

            # Simplify
            simplified = sp_simplify(expr)

            # Try numeric evaluation
            numeric_result = None
            try:
                evaluated = N(simplified)
                if evaluated.is_number:
                    numeric_result = float(evaluated)
            except (TypeError, ValueError, AttributeError, OverflowError) as e:
                logger.debug("Numeric evaluation failed for '%s': %s", expression, e)

            return {
                "success": True,
                "symbolic_result": str(simplified),
                "numeric_result": numeric_result,
                "latex": latex(simplified),
            }
        except Exception as e:
            logger.error("evaluate failed for '%s': %s", expression, e)
            return {"success": False, "error": str(e)}

    def solve(
        self,
        equations: List[str],
        target: str,
        method: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Solve equations for a target variable.

        Args:
            equations: List of equation strings (e.g., ["F = m*a", "a = 9.8"])
            target: Variable to solve for
            method: "symbolic", "numeric", or "auto"
            variables: Optional dict of known variable values (e.g., {"m": {"value": 12, "unit": "kg"}})

        Returns:
            Dict with solutions, method_used, steps
        """
        try:
            target_sym = self._get_symbol(target)
            parsed_eqs = []
            steps = []

            # Build local_dict with target and variable symbols for consistent parsing
            # This ensures symbols match when SymPy solves the equation
            local_dict = {target: target_sym}

            # Pre-populate local_dict with ALL multi-character and underscored
            # identifiers found in equation strings. Without this, implicit
            # multiplication splits "Fx" into "F*x" and "conv_lbf_to_N" into
            # separate tokens, breaking multi-step equation chains.
            _BUILTIN_FUNCS = {
                'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
                'exp', 'log', 'ln', 'abs', 'pi', 'Abs', 'sign', 'ceiling',
                'floor', 'Min', 'Max', 'Piecewise', 'factorial',
            }
            for eq_str in equations:
                # Match identifiers: letters/underscores followed by alphanumeric/underscores
                for token in re.findall(r'[A-Za-z_]\w*', eq_str):
                    if token not in local_dict and token not in _BUILTIN_FUNCS:
                        local_dict[token] = self._get_symbol(token)

            # Build substitution dict from known variables
            subs_dict = {}
            if variables:
                for name, value in variables.items():
                    if name == target:
                        # Don't substitute the variable we're solving for
                        continue
                    sym = self._get_symbol(name)
                    local_dict[name] = sym  # Add to local_dict for parsing
                    if isinstance(value, dict):
                        # Value with unit: {"value": 5, "unit": "m"}
                        subs_dict[sym] = value.get("value", 0)
                    else:
                        subs_dict[sym] = value

                if subs_dict:
                    steps.append({
                        "description": "Known values",
                        "expression": ", ".join(f"{k} = {v}" for k, v in subs_dict.items()),
                        "latex": None,
                    })

            for eq_str in equations:
                lhs, rhs = parse_equation(eq_str)

                lhs_expr = self._parse_expression(lhs, local_dict)
                rhs_expr = self._parse_expression(rhs, local_dict)
                eq = Eq(lhs_expr, rhs_expr)
                parsed_eqs.append(eq)

                steps.append({
                    "description": f"Parse equation: {eq_str}",
                    "expression": str(eq),
                    "latex": latex(eq),
                })

            # Solve symbolically
            unknowns: List[Symbol] = []
            if len(parsed_eqs) == 1:
                solutions = sp_solve(parsed_eqs[0], target_sym)
            else:
                # System of equations: solve for ALL unknowns so SymPy can
                # chain through intermediate variables (e.g. Fx = Fx_lbf*conv,
                # rho = sqrt(Fx**2 + Fy**2) — solving for rho alone won't
                # substitute Fx).
                all_free = set()
                for eq in parsed_eqs:
                    all_free.update(eq.free_symbols)
                # Unknowns = free symbols that are NOT in the known-values dict
                known_syms = set(subs_dict.keys())
                unknowns = sorted(all_free - known_syms, key=str)
                solutions = sp_solve(parsed_eqs, unknowns)

            # --- Normalise solutions into a flat list of expressions for target ---
            target_solutions: List[sp.Expr] = []

            if isinstance(solutions, list):
                for sol in solutions:
                    if isinstance(sol, tuple):
                        # System solve returns tuples ordered like `unknowns`
                        try:
                            idx = unknowns.index(target_sym)
                            target_solutions.append(sol[idx])
                        except (ValueError, IndexError):
                            pass
                    elif isinstance(sol, dict):
                        if target_sym in sol:
                            target_solutions.append(sol[target_sym])
                    else:
                        # Single-equation solve returns bare expressions
                        target_solutions.append(sol)
            elif isinstance(solutions, dict):
                if target_sym in solutions:
                    target_solutions.append(solutions[target_sym])
                else:
                    # Try string match
                    for var, sol in solutions.items():
                        if str(var) == target:
                            target_solutions.append(sol)

            # --- Fallback: if system solve failed, try individual equations ---
            if not target_solutions and len(parsed_eqs) > 1:
                logger.info(
                    "System solve returned no solutions for '%s'; "
                    "falling back to individual equations",
                    target,
                )
                for i, eq in enumerate(parsed_eqs):
                    if target_sym not in eq.free_symbols:
                        continue
                    try:
                        individual = sp_solve(eq, target_sym)
                        if not individual:
                            continue
                        candidates = individual if isinstance(individual, list) else [individual]

                        # Verify candidates against the OTHER equations.
                        # If substituting makes a fully-evaluable equation
                        # false, the system is contradictory.
                        other_eqs = parsed_eqs[:i] + parsed_eqs[i + 1:]
                        verified = []
                        for cand in candidates:
                            contradicted = False
                            for other in other_eqs:
                                if target_sym not in other.free_symbols:
                                    continue
                                substituted = other.subs(target_sym, cand)
                                # Eq(1, 2) evaluates to S.false
                                if substituted is sp.S.false:
                                    contradicted = True
                                    break
                                # Bare expression form: numeric and != 0
                                if substituted.is_number and substituted != 0:
                                    contradicted = True
                                    break
                            if not contradicted:
                                verified.append(cand)

                        if verified:
                            target_solutions.extend(verified)
                            steps.append({
                                "description": f"Solved from: {eq}",
                                "expression": str(verified),
                                "latex": None,
                            })
                            break  # Use first equation that yields a result
                    except Exception as e:
                        logger.debug(
                            "Individual equation solve failed for '%s': %s",
                            eq, e,
                        )

            # --- Format solutions ---
            solution_values = []
            for sol in target_solutions:
                sol_simplified = sp_simplify(sol)

                symbolic_str = str(sol_simplified)
                symbolic_latex = latex(sol_simplified)

                # Try numeric evaluation with variable substitution
                numeric = None
                try:
                    if subs_dict:
                        sol_substituted = sol_simplified.subs(subs_dict)
                        steps.append({
                            "description": "Substitute known values",
                            "expression": str(sol_substituted),
                            "latex": latex(sol_substituted),
                        })
                        evaluated = N(sol_substituted)
                    else:
                        evaluated = N(sol_simplified)

                    if evaluated.is_number:
                        numeric = float(evaluated)
                except (TypeError, ValueError, AttributeError, OverflowError) as e:
                    logger.debug("Numeric conversion failed for solution of '%s': %s", target, e)

                solution_values.append({
                    "variable": target,
                    "symbolic": symbolic_str,
                    "numeric": numeric,
                    "latex": symbolic_latex,
                })

            if solution_values:
                steps.append({
                    "description": f"Solution for {target}",
                    "expression": solution_values[0]["symbolic"],
                    "latex": solution_values[0].get("latex"),
                })
                if solution_values[0].get("numeric") is not None:
                    steps.append({
                        "description": f"Numeric result",
                        "expression": f"{target} = {solution_values[0]['numeric']}",
                        "latex": f"{target} = {solution_values[0]['numeric']}",
                    })

            return {
                "success": True,
                "solutions": solution_values,
                "method_used": "symbolic" if not subs_dict else "symbolic+numeric",
                "steps": steps,
            }
        except Exception as e:
            logger.error("solve failed for target '%s': %s", target, e)
            return {"success": False, "error": str(e)}

    def solve_numeric(
        self,
        equations: List[str],
        target: str,
        variables: Optional[Dict[str, Any]] = None,
        method: str = "auto",
        initial_guess: float = 1.0,
        bounds: Optional[Tuple[float, float]] = None,
    ) -> Dict[str, Any]:
        """
        Solve equations numerically for transcendental equations.

        Args:
            equations: List of equation strings (e.g., ["x = cos(x)"])
            target: Variable to solve for
            variables: Optional dict of known variable values
            method: "fsolve" | "brentq" | "newton" | "auto"
            initial_guess: Starting point for numeric solver
            bounds: Tuple (min, max) for bracketed methods like brentq

        Returns:
            Dict with solutions, method_used, residual
        """
        try:
            target_sym = self._get_symbol(target)
            steps = []

            # Build local_dict with variable symbols
            local_dict = {target: target_sym}
            subs_dict = {}

            if variables:
                for name, value in variables.items():
                    if name == target:
                        continue
                    sym = self._get_symbol(name)
                    local_dict[name] = sym
                    if isinstance(value, dict):
                        subs_dict[sym] = value.get("value", 0)
                    else:
                        subs_dict[sym] = value

            # Parse equations into expressions (LHS - RHS = 0 form)
            expressions = []
            for eq_str in equations:
                lhs, rhs = parse_equation(eq_str)

                lhs_expr = self._parse_expression(lhs, local_dict)
                rhs_expr = self._parse_expression(rhs, local_dict)
                # Convert to f(x) = 0 form
                expr = lhs_expr - rhs_expr
                expressions.append(expr)

                steps.append({
                    "description": f"Parse equation: {eq_str}",
                    "expression": f"{lhs_expr} - ({rhs_expr}) = 0",
                    "latex": latex(expr),
                })

            # Substitute known values
            substituted_exprs = []
            for expr in expressions:
                if subs_dict:
                    expr = expr.subs(subs_dict)
                substituted_exprs.append(expr)

            if subs_dict:
                steps.append({
                    "description": "Substitute known values",
                    "expression": str(subs_dict),
                    "latex": None,
                })

            # For single equation, create numeric function
            if len(substituted_exprs) == 1:
                expr = substituted_exprs[0]

                # Check if only target variable remains
                free_vars = expr.free_symbols
                if free_vars - {target_sym}:
                    undefined = [str(v) for v in free_vars - {target_sym}]
                    return {
                        "success": False,
                        "error": f"Undefined variables: {', '.join(undefined)}"
                    }

                # Convert to numeric function
                f = lambdify(target_sym, expr, modules=['numpy'])

                # Choose method
                method_used = method
                solution = None
                residual = None

                if method == "auto":
                    # Try symbolic first
                    try:
                        sym_solutions = sp_solve(expr, target_sym)
                        if sym_solutions and isinstance(sym_solutions, list):
                            # Found symbolic solution, evaluate it
                            numeric = float(N(sym_solutions[0]))
                            steps.append({
                                "description": "Symbolic solution found",
                                "expression": str(sym_solutions[0]),
                                "latex": latex(sym_solutions[0]),
                            })
                            return {
                                "success": True,
                                "solutions": [{
                                    "variable": target,
                                    "symbolic": str(sym_solutions[0]),
                                    "numeric": numeric,
                                    "latex": latex(sym_solutions[0]),
                                }],
                                "method_used": "symbolic",
                                "residual": float(f(numeric)),
                                "steps": steps,
                            }
                    except Exception:
                        pass
                    # Fall back to numeric
                    method_used = "fsolve"

                steps.append({
                    "description": f"Using numeric method: {method_used}",
                    "expression": f"Initial guess: {initial_guess}",
                    "latex": None,
                })

                if method_used in ["fsolve", "auto"]:
                    result = fsolve(f, initial_guess, full_output=True)
                    solution = float(result[0][0])
                    residual = float(f(solution))
                    method_used = "fsolve"

                elif method_used == "brentq":
                    if bounds is None:
                        bounds = (-10.0, 10.0)
                    try:
                        solution = brentq(f, bounds[0], bounds[1])
                        residual = float(f(solution))
                    except ValueError as e:
                        return {
                            "success": False,
                            "error": f"brentq failed: {e}. Ensure bounds bracket a root."
                        }

                elif method_used == "newton":
                    try:
                        # Compute derivative for Newton's method
                        df_expr = diff(expr, target_sym)
                        df = lambdify(target_sym, df_expr, modules=['numpy'])
                        solution = newton(f, initial_guess, fprime=df)
                        residual = float(f(solution))
                    except Exception as e:
                        return {
                            "success": False,
                            "error": f"Newton's method failed: {e}"
                        }

                if solution is not None:
                    steps.append({
                        "description": f"Numeric solution",
                        "expression": f"{target} ≈ {solution:.10g}",
                        "latex": f"{target} \\approx {solution:.10g}",
                    })

                    return {
                        "success": True,
                        "solutions": [{
                            "variable": target,
                            "symbolic": None,
                            "numeric": solution,
                            "latex": f"{target} \\approx {solution:.10g}",
                        }],
                        "method_used": method_used,
                        "residual": residual,
                        "steps": steps,
                    }

            # Multi-equation system (use fsolve)
            else:
                all_vars = set()
                for expr in substituted_exprs:
                    all_vars.update(expr.free_symbols)

                if target_sym not in all_vars:
                    return {
                        "success": False,
                        "error": f"Target variable {target} not in equations"
                    }

                var_list = list(all_vars)
                fs = [lambdify(var_list, expr, modules=['numpy']) for expr in substituted_exprs]

                def system(vals):
                    val_dict = dict(zip(var_list, vals))
                    return [float(f(*[val_dict[v] for v in var_list])) for f in fs]

                x0 = [initial_guess] * len(var_list)
                result = fsolve(system, x0, full_output=True)
                solutions_arr = result[0]

                target_idx = var_list.index(target_sym)
                solution = float(solutions_arr[target_idx])
                residual = float(np.max(np.abs(system(solutions_arr))))

                steps.append({
                    "description": f"Numeric solution (system)",
                    "expression": f"{target} ≈ {solution:.10g}",
                    "latex": f"{target} \\approx {solution:.10g}",
                })

                return {
                    "success": True,
                    "solutions": [{
                        "variable": target,
                        "symbolic": None,
                        "numeric": solution,
                        "latex": f"{target} \\approx {solution:.10g}",
                    }],
                    "method_used": "fsolve (system)",
                    "residual": residual,
                    "steps": steps,
                }

        except Exception as e:
            logger.error("solve_numeric failed for target '%s': %s", target, e)
            return {"success": False, "error": str(e)}

    def simplify(self, expression: str) -> Dict[str, Any]:
        """Simplify an expression."""
        try:
            expr = self._parse_expression(expression)
            simplified = sp_simplify(expr)

            numeric_result = None
            try:
                evaluated = N(simplified)
                if evaluated.is_number:
                    numeric_result = float(evaluated)
            except (TypeError, ValueError, AttributeError, OverflowError) as e:
                logger.debug("Numeric evaluation failed in simplify for '%s': %s", expression, e)

            return {
                "success": True,
                "symbolic_result": str(simplified),
                "numeric_result": numeric_result,
                "latex": latex(simplified),
            }
        except Exception as e:
            logger.error("simplify failed for '%s': %s", expression, e)
            return {"success": False, "error": str(e)}

    def differentiate(self, expression: str, variable: str, order: int = 1) -> Dict[str, Any]:
        """Differentiate an expression."""
        try:
            expr = self._parse_expression(expression)
            var_sym = self._get_symbol(variable)

            result = diff(expr, var_sym, order)
            simplified = sp_simplify(result)

            return {
                "success": True,
                "symbolic_result": str(simplified),
                "latex": latex(simplified),
            }
        except Exception as e:
            logger.error("differentiate failed for '%s' wrt '%s': %s", expression, variable, e)
            return {"success": False, "error": str(e)}

    def integrate(
        self,
        expression: str,
        variable: str,
        limits: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """Integrate an expression."""
        try:
            expr = self._parse_expression(expression)
            var_sym = self._get_symbol(variable)

            if limits:
                result = sp_integrate(expr, (var_sym, limits[0], limits[1]))
            else:
                result = sp_integrate(expr, var_sym)

            simplified = sp_simplify(result)

            numeric_result = None
            if limits:
                try:
                    evaluated = N(simplified)
                    if evaluated.is_number:
                        numeric_result = float(evaluated)
                except (TypeError, ValueError, AttributeError, OverflowError) as e:
                    logger.debug("Numeric evaluation failed in integrate for '%s': %s", expression, e)

            return {
                "success": True,
                "symbolic_result": str(simplified),
                "numeric_result": numeric_result,
                "latex": latex(simplified),
            }
        except Exception as e:
            logger.error("integrate failed for '%s' over '%s': %s", expression, variable, e)
            return {"success": False, "error": str(e)}

    def get_constant(self, name: str) -> Tuple[float, str]:
        """Get a physical constant by name."""
        if name in self.constants:
            return self.constants[name]
        raise ValueError(f"Unknown constant: {name}")

    def list_constants(self) -> List[Dict[str, Any]]:
        """List all available constants."""
        return [
            {"name": name, "value": value, "unit": unit}
            for name, (value, unit) in self.constants.items()
        ]

    def analyze_system(
        self,
        equations: List[str],
        known_variables: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a system of equations for determinacy.

        Args:
            equations: List of equation strings
            known_variables: List of variable names that have defined values

        Returns:
            Dict with:
            - equation_count: Number of equations
            - variable_count: Number of unknown variables
            - known_count: Number of known variables
            - unknowns: List of unknown variable names
            - knowns: List of known variable names
            - status: "determined" | "under_determined" | "over_determined"
            - message: Human-readable explanation
            - solvable_for: List of variables that can be uniquely solved for
        """
        try:
            known_set = set(known_variables or [])
            all_variables = set()
            parsed_eqs = []

            # Build local_dict with known variable symbols so subscripted
            # names like F_r, F_x are parsed as single symbols (not F*r).
            local_dict: Dict[str, Symbol] = {}
            for name in (known_variables or []):
                local_dict[name] = self._get_symbol(name)

            # Parse all equations and collect variables
            for eq_str in equations:
                lhs, rhs = parse_equation(eq_str)

                try:
                    lhs_expr = self._parse_expression(lhs, local_dict)
                    rhs_expr = self._parse_expression(rhs, local_dict)
                    eq = Eq(lhs_expr, rhs_expr)
                    parsed_eqs.append(eq)

                    # Collect free symbols (variables)
                    all_variables.update(str(s) for s in eq.free_symbols)
                except Exception:
                    # If parsing fails, try to extract variables from string
                    import re
                    vars_in_eq = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b', eq_str)
                    all_variables.update(v for v in vars_in_eq
                                        if v not in ['sin', 'cos', 'tan', 'exp', 'log', 'sqrt'])

            # Calculate unknowns (variables not in known set)
            unknowns = all_variables - known_set
            knowns = all_variables & known_set

            equation_count = len(equations)
            unknown_count = len(unknowns)

            # Determine system status
            if equation_count == unknown_count:
                status = "determined"
                message = f"System is well-determined: {equation_count} equation(s) for {unknown_count} unknown(s)"
            elif equation_count < unknown_count:
                status = "under_determined"
                missing = unknown_count - equation_count
                message = f"System is under-determined: {equation_count} equation(s) but {unknown_count} unknown(s). Need {missing} more equation(s) or value(s)."
            else:
                status = "over_determined"
                extra = equation_count - unknown_count
                message = f"System is over-determined: {equation_count} equation(s) for only {unknown_count} unknown(s). May have {extra} redundant or conflicting equation(s)."

            # Determine which variables can be solved for
            solvable_for = []
            if status in ["determined", "over_determined"] and parsed_eqs:
                # A variable is solvable if we have at least as many equations as unknowns
                # For now, if determined or over-determined, all unknowns are potentially solvable
                solvable_for = list(unknowns)
            elif status == "under_determined" and parsed_eqs and unknowns:
                # In under-determined systems, we might still solve for some variables
                # if they appear in equations with enough constraints
                # For simplicity, list all unknowns but mark system as under-determined
                solvable_for = list(unknowns)

            return {
                "success": True,
                "equation_count": equation_count,
                "variable_count": len(all_variables),
                "unknown_count": unknown_count,
                "known_count": len(knowns),
                "unknowns": sorted(list(unknowns)),
                "knowns": sorted(list(knowns)),
                "all_variables": sorted(list(all_variables)),
                "status": status,
                "message": message,
                "solvable_for": sorted(solvable_for),
            }
        except Exception as e:
            logger.error("analyze_system failed: %s", e)
            return {"success": False, "error": str(e)}
