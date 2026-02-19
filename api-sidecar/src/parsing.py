"""
Shared parsing utilities for the compute engine.
"""

from typing import Tuple


def parse_equation(eq_str: str) -> Tuple[str, str]:
    """
    Split an equation string into LHS and RHS.

    Handles both ':=' (definition) and '=' (equation) forms.
    If no '=' sign is present, treats the string as 'expr = 0'.

    Args:
        eq_str: Equation string (e.g., "F = m*a", "x := 5", "x^2 - 1")

    Returns:
        Tuple of (lhs, rhs) stripped of whitespace
    """
    if ":=" in eq_str:
        lhs, rhs = eq_str.split(":=", 1)
    elif "=" in eq_str:
        lhs, rhs = eq_str.split("=", 1)
    else:
        return (eq_str.strip(), "0")
    return (lhs.strip(), rhs.strip())
