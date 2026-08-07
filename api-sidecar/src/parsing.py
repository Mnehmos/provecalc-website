"""Bounded, allowlisted parsing for user-supplied mathematical expressions.

This module deliberately does not use ``eval``, SymPy's ``parse_expr`` or
Pint's expression parser. Expressions arrive from the UI and from AI
proposals, so the parser must be a small language boundary rather than a
Python-expression convenience wrapper.
"""

from dataclasses import dataclass
import re
from typing import Any, Callable, List, Mapping, Optional, Tuple

import sympy as sp


MAX_EXPRESSION_LENGTH = 4096
MAX_TOKENS = 512
MAX_PARSE_DEPTH = 64
MAX_AST_NODES = 512
MAX_IDENTIFIER_LENGTH = 64
MAX_NUMERIC_DIGITS = 100
MAX_EXPONENT = 1000


class SafeExpressionError(ValueError):
    """Raised when an expression is outside the supported safe grammar."""


@dataclass(frozen=True)
class _Token:
    kind: str
    value: str
    position: int


_NUMBER_RE = re.compile(r"(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?")
_IDENTIFIER_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def _consume_group(expression: str, start: int) -> Tuple[str, int]:
    if start >= len(expression) or expression[start] != "{":
        raise SafeExpressionError("Expected a braced LaTeX group")
    depth = 1
    index = start + 1
    while index < len(expression):
        char = expression[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return expression[start + 1:index], index + 1
        index += 1
    raise SafeExpressionError("Unbalanced LaTeX braces")


def _replace_braced_command(expression: str, command: str, replacement: str) -> str:
    needle = f"\\{command}"
    result: List[str] = []
    cursor = 0
    while True:
        found = expression.find(needle, cursor)
        if found < 0:
            result.append(expression[cursor:])
            return "".join(result)
        result.append(expression[cursor:found])
        group_start = found + len(needle)
        if group_start >= len(expression) or expression[group_start] != "{":
            raise SafeExpressionError(f"LaTeX \\{command} requires one braced argument")
        body, cursor = _consume_group(expression, group_start)
        result.append(replacement.format(body=normalize_latex_expression(body)))


def normalize_latex_expression(expression: str) -> str:
    if not isinstance(expression, str):
        raise SafeExpressionError("Expression must be text")
    normalized = expression.strip()
    if len(normalized) > MAX_EXPRESSION_LENGTH:
        raise SafeExpressionError(
            f"Expression exceeds the {MAX_EXPRESSION_LENGTH}-character limit"
        )
    normalized = normalized.replace("\\left", "").replace("\\right", "")
    normalized = re.sub(r"\\(?:,|;|:|!|quad|qquad)\s*", "", normalized)
    normalized = normalized.replace("\\cdot", "*").replace("\\times", "*")
    normalized = normalized.replace("\\div", "/")

    if "\\frac" in normalized:
        result: List[str] = []
        cursor = 0
        while True:
            found = normalized.find("\\frac", cursor)
            if found < 0:
                result.append(normalized[cursor:])
                normalized = "".join(result)
                break
            result.append(normalized[cursor:found])
            first, after_first = _consume_group(normalized, found + len("\\frac"))
            second, after_second = _consume_group(normalized, after_first)
            result.append(
                f"({normalize_latex_expression(first)})/({normalize_latex_expression(second)})"
            )
            cursor = after_second

    for command in ("sqrt", "sin", "cos", "tan", "asin", "acos", "atan", "log", "ln", "exp", "abs"):
        if f"\\{command}" in normalized:
            normalized = _replace_braced_command(normalized, command, f"{command}({{body}})")

    greek_commands = {
        "pi": "pi", "theta": "theta", "alpha": "alpha", "beta": "beta",
        "gamma": "gamma", "delta": "delta", "lambda": "lambda", "mu": "mu",
        "nu": "nu", "rho": "rho", "sigma": "sigma", "phi": "phi",
        "varphi": "phi", "omega": "omega", "epsilon": "epsilon",
        "varepsilon": "epsilon",
    }
    for command, identifier in greek_commands.items():
        normalized = normalized.replace(f"\\{command}", identifier)

    normalized = re.sub(r"_\{([A-Za-z][A-Za-z0-9_]*)\}", r"_\1", normalized)
    normalized = normalized.replace("{", "(").replace("}", ")")
    if "\\" in normalized:
        raise SafeExpressionError("Unsupported LaTeX command")
    return normalized


def _tokenize(expression: str) -> List[_Token]:
    if not isinstance(expression, str):
        raise SafeExpressionError("Expression must be text")
    if len(expression) > MAX_EXPRESSION_LENGTH:
        raise SafeExpressionError(
            f"Expression exceeds the {MAX_EXPRESSION_LENGTH}-character limit"
        )
    tokens: List[_Token] = []
    index = 0
    while index < len(expression):
        char = expression[index]
        if char.isspace():
            index += 1
            continue
        number_match = _NUMBER_RE.match(expression, index)
        if number_match:
            value = number_match.group(0)
            mantissa = re.split(r"[eE]", value, maxsplit=1)[0]
            exponent_match = re.search(r"[eE]([+-]?\d+)$", value)
            if len(re.sub(r"\D", "", mantissa)) > MAX_NUMERIC_DIGITS:
                raise SafeExpressionError("Numeric literal is too long")
            if exponent_match and abs(int(exponent_match.group(1))) > MAX_EXPONENT:
                raise SafeExpressionError("Numeric exponent exceeds the safety limit")
            tokens.append(_Token("number", value, index))
            index = number_match.end()
        else:
            identifier_match = _IDENTIFIER_RE.match(expression, index)
            if identifier_match:
                value = identifier_match.group(0)
                if len(value) > MAX_IDENTIFIER_LENGTH or "__" in value:
                    raise SafeExpressionError("Identifier is not allowed")
                tokens.append(_Token("identifier", value, index))
                index = identifier_match.end()
            elif expression.startswith("**", index):
                tokens.append(_Token("operator", "**", index))
                index += 2
            elif char in "+-*/^(),":
                kind = "comma" if char == "," else "operator"
                tokens.append(_Token(kind, char, index))
                index += 1
            else:
                raise SafeExpressionError(f"Unsupported character {char!r} at position {index}")
        if len(tokens) > MAX_TOKENS:
            raise SafeExpressionError(f"Expression exceeds the {MAX_TOKENS}-token limit")
    tokens.append(_Token("eof", "", len(expression)))
    return tokens


class _SafeExpressionParser:
    _FUNCTIONS: Mapping[str, Tuple[Callable[..., sp.Expr], int, int]] = {
        "abs": (sp.Abs, 1, 1), "acos": (sp.acos, 1, 1), "acosh": (sp.acosh, 1, 1),
        "asin": (sp.asin, 1, 1), "asinh": (sp.asinh, 1, 1), "atan": (sp.atan, 1, 1),
        "atan2": (sp.atan2, 2, 2), "atanh": (sp.atanh, 1, 1), "ceiling": (sp.ceiling, 1, 1),
        "cos": (sp.cos, 1, 1), "cosh": (sp.cosh, 1, 1), "exp": (sp.exp, 1, 1),
        "floor": (sp.floor, 1, 1), "log": (sp.log, 1, 2), "ln": (sp.log, 1, 1),
        "pow": (sp.Pow, 2, 2), "sign": (sp.sign, 1, 1), "sin": (sp.sin, 1, 1),
        "sinh": (sp.sinh, 1, 1), "sqrt": (sp.sqrt, 1, 1), "tan": (sp.tan, 1, 1),
        "tanh": (sp.tanh, 1, 1),
    }
    _CONSTANTS: Mapping[str, sp.Expr] = {
        "e": sp.E, "inf": sp.oo, "oo": sp.oo, "pi": sp.pi,
    }

    def __init__(self, expression: str, symbols: Optional[Mapping[str, Any]] = None,
                 symbol_factory: Optional[Callable[[str], sp.Expr]] = None) -> None:
        self.tokens = _tokenize(normalize_latex_expression(expression))
        self.symbols = dict(symbols or {})
        self.symbol_factory = symbol_factory or (lambda name: sp.Symbol(name, real=True))
        self.index = 0
        self.depth = 0
        self.node_count = 0

    def _current(self) -> _Token:
        return self.tokens[self.index]

    def _advance(self) -> _Token:
        token = self._current()
        self.index += 1
        return token

    def _accept(self, value: str) -> bool:
        if self._current().value == value:
            self.index += 1
            return True
        return False

    def _expect(self, value: str) -> None:
        if not self._accept(value):
            token = self._current()
            raise SafeExpressionError(f"Expected {value!r} at position {token.position}")

    def _node(self, value: Any) -> sp.Expr:
        self.node_count += 1
        if self.node_count > MAX_AST_NODES:
            raise SafeExpressionError("Expression is too complex")
        return value

    def _enter(self) -> None:
        self.depth += 1
        if self.depth > MAX_PARSE_DEPTH:
            raise SafeExpressionError("Expression nesting exceeds the safety limit")

    def _leave(self) -> None:
        self.depth -= 1

    def parse(self) -> sp.Expr:
        if self._current().kind == "eof":
            raise SafeExpressionError("Expression is empty")
        result = self._parse_add_sub()
        token = self._current()
        if token.kind != "eof":
            raise SafeExpressionError(f"Unexpected token {token.value!r} at position {token.position}")
        return result

    def _parse_add_sub(self) -> sp.Expr:
        self._enter()
        try:
            result = self._parse_mul_div()
            while self._current().value in ("+", "-"):
                operator = self._advance().value
                right = self._parse_mul_div()
                result = self._node(result + right if operator == "+" else result - right)
            return result
        finally:
            self._leave()

    def _starts_implicit_factor(self) -> bool:
        return self._current().kind in ("number", "identifier") or self._current().value == "("

    def _parse_mul_div(self) -> sp.Expr:
        self._enter()
        try:
            result = self._parse_unary()
            while True:
                if self._current().value in ("*", "/"):
                    operator = self._advance().value
                    right = self._parse_unary()
                    result = self._node(result * right if operator == "*" else result / right)
                elif self._starts_implicit_factor():
                    result = self._node(result * self._parse_unary())
                else:
                    return result
        finally:
            self._leave()

    def _parse_unary(self) -> sp.Expr:
        if self._accept("+"):
            return self._parse_unary()
        if self._accept("-"):
            return self._node(-self._parse_unary())
        return self._parse_power()

    def _parse_power(self) -> sp.Expr:
        self._enter()
        try:
            result = self._parse_primary()
            if self._current().value in ("^", "**"):
                self._advance()
                exponent = self._parse_unary()
                if isinstance(exponent, sp.Integer) and abs(int(exponent)) > MAX_EXPONENT:
                    raise SafeExpressionError("Power exponent exceeds the safety limit")
                result = self._node(sp.Pow(result, exponent))
            return result
        finally:
            self._leave()

    def _parse_primary(self) -> sp.Expr:
        token = self._current()
        if token.kind == "number":
            self._advance()
            if any(marker in token.value for marker in (".", "e", "E")):
                return self._node(sp.Float(token.value))
            return self._node(sp.Integer(token.value))
        if token.kind == "identifier":
            name = self._advance().value
            function = self._FUNCTIONS.get(name)
            if function is not None:
                if self._accept("("):
                    arguments: List[sp.Expr] = []
                    if self._current().value != ")":
                        arguments.append(self._parse_add_sub())
                        while self._accept(","):
                            arguments.append(self._parse_add_sub())
                    self._expect(")")
                else:
                    if not self._starts_implicit_factor() and self._current().value not in ("+", "-"):
                        raise SafeExpressionError(f"Function {name!r} requires an argument")
                    arguments = [self._parse_unary()]
                minimum, maximum = function[1], function[2]
                if not minimum <= len(arguments) <= maximum:
                    raise SafeExpressionError(f"Function {name!r} expects {minimum} or {maximum} argument(s)")
                return self._node(function[0](*arguments))
            if self._current().value == "(":
                raise SafeExpressionError("Function calls are limited to the allowlist")
            if name in self.symbols:
                return self._node(self.symbols[name])
            if name in self._CONSTANTS:
                return self._node(self._CONSTANTS[name])
            return self._node(self.symbol_factory(name))
        if self._accept("("):
            self._enter()
            try:
                result = self._parse_add_sub()
            finally:
                self._leave()
            self._expect(")")
            return result
        raise SafeExpressionError(
            f"Expected a number, identifier, or parenthesized expression at position {token.position}"
        )


def safe_parse_expression(expression: str, local_dict: Optional[Mapping[str, Any]] = None,
                          symbol_factory: Optional[Callable[[str], sp.Expr]] = None) -> sp.Expr:
    return _SafeExpressionParser(expression, local_dict, symbol_factory).parse()


def parse_equation(eq_str: str) -> Tuple[str, str]:
    if not isinstance(eq_str, str):
        raise SafeExpressionError("Equation must be text")
    if len(eq_str) > MAX_EXPRESSION_LENGTH:
        raise SafeExpressionError(f"Equation exceeds the {MAX_EXPRESSION_LENGTH}-character limit")
    if ":=" in eq_str:
        if eq_str.count(":=") != 1:
            raise SafeExpressionError("Equation must contain one definition operator")
        lhs, rhs = eq_str.split(":=", 1)
    elif "=" in eq_str:
        if eq_str.count("=") != 1:
            raise SafeExpressionError("Equation must contain one equality operator")
        lhs, rhs = eq_str.split("=", 1)
    else:
        return (eq_str.strip(), "0")
    lhs, rhs = lhs.strip(), rhs.strip()
    if not lhs or not rhs:
        raise SafeExpressionError("Equation requires non-empty left and right sides")
    return (lhs, rhs)
