import pytest

from src.parsing import SafeExpressionError, safe_parse_expression
from src.units import UnitRegistry


@pytest.mark.parametrize(
    "expression",
    [
        "__import__('os').system('echo unsafe')",
        "x.__class__",
        "open('secret.txt')",
        "[x for x in range(4)]",
        "x; y",
        "Symbol('x')",
    ],
)
def test_compute_parser_rejects_python_or_container_syntax(expression):
    with pytest.raises(SafeExpressionError):
        safe_parse_expression(expression)


def test_compute_parser_supports_latex_subset():
    expression = safe_parse_expression(r"\frac{P L^3}{48 E I}")
    assert "L**3" in str(expression)


def test_unit_parser_rejects_expression_syntax():
    result = UnitRegistry().check_units("__import__('os')")
    assert result["consistent"] is False
