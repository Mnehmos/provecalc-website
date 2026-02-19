"""
Unit Registry - Dimensional analysis using Pint
"""

import logging
from typing import Optional, Dict, Any, Tuple
import re
import pint

try:
    from .parsing import parse_equation
except ImportError:
    from parsing import parse_equation

logger = logging.getLogger(__name__)
from pint import UnitRegistry as PintRegistry, DimensionalityError


# SI Derived Units mapped by dimensionality
# Format: {(mass, length, time, current, temperature, amount, luminosity): (name, symbol)}
SI_DERIVED_UNITS = {
    # Mechanics
    (1, 1, -2, 0, 0, 0, 0): ("newton", "N"),           # Force: kg·m/s²
    (1, -1, -2, 0, 0, 0, 0): ("pascal", "Pa"),         # Pressure: kg/(m·s²)
    (1, 2, -2, 0, 0, 0, 0): ("joule", "J"),            # Energy: kg·m²/s²
    (1, 2, -3, 0, 0, 0, 0): ("watt", "W"),             # Power: kg·m²/s³

    # Electricity
    (0, 0, 1, 1, 0, 0, 0): ("coulomb", "C"),           # Charge: A·s
    (1, 2, -3, -1, 0, 0, 0): ("volt", "V"),            # Voltage: kg·m²/(A·s³)
    (1, 2, -3, -2, 0, 0, 0): ("ohm", "Ω"),             # Resistance: kg·m²/(A²·s³)
    (-1, -2, 4, 2, 0, 0, 0): ("farad", "F"),           # Capacitance: A²·s⁴/(kg·m²)
    (1, 2, -2, -2, 0, 0, 0): ("henry", "H"),           # Inductance: kg·m²/(A²·s²)
    (1, 2, -2, -1, 0, 0, 0): ("weber", "Wb"),          # Magnetic flux: kg·m²/(A·s²)
    (1, 0, -2, -1, 0, 0, 0): ("tesla", "T"),           # Magnetic field: kg/(A·s²)
    (-1, -2, 3, 2, 0, 0, 0): ("siemens", "S"),         # Conductance: A²·s³/(kg·m²)

    # Other
    (0, 0, -1, 0, 0, 0, 0): ("hertz", "Hz"),           # Frequency: 1/s
}


class UnitRegistry:
    """
    Unit registry for dimensional analysis.

    Wraps Pint to provide unit checking and conversion for engineering calculations.
    """

    def __init__(self):
        self.ureg = PintRegistry()
        self.Q_ = self.ureg.Quantity

        # Define any custom units
        self._define_custom_units()

    def _define_custom_units(self):
        """Define custom units not in standard Pint."""
        # Example custom definitions
        # self.ureg.define("ksi = 1000 * psi")
        pass

    def _format_base_unit(self, unit_str: str) -> str:
        """
        Format a Pint base unit string to a cleaner representation.

        Converts:
          - "meter ** 2" -> "m²"
          - "kilogram * meter / second ** 2" -> "kg·m/s²"
          - "meter" -> "m"
        """
        # Superscript mapping for exponents
        superscripts = {
            '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
            '-': '⁻'
        }

        # SI base unit abbreviations
        abbreviations = {
            'meter': 'm',
            'kilogram': 'kg',
            'second': 's',
            'ampere': 'A',
            'kelvin': 'K',
            'mole': 'mol',
            'candela': 'cd',
            'radian': 'rad',
        }

        result = unit_str

        # Replace full names with abbreviations
        for full, abbrev in abbreviations.items():
            result = result.replace(full, abbrev)

        # Convert " ** N" to superscript
        def replace_exp(match):
            exp = match.group(1)
            return ''.join(superscripts.get(c, c) for c in exp)

        result = re.sub(r' \*\* (-?\d+)', replace_exp, result)

        # Clean up multiplication and division
        result = result.replace(' * ', '·')
        result = result.replace(' / ', '/')

        return result

    def check_units(self, expression: str, expected_unit: Optional[str] = None) -> Dict:
        """
        Check unit consistency of an expression.

        Args:
            expression: Expression with units (e.g., "5 m/s * 2 s")
            expected_unit: Optional expected result unit

        Returns:
            Dict with consistency check results
        """
        logger.debug("check_units called with: '%s'", expression)
        try:
            # Parse the expression
            result = self.ureg.parse_expression(expression)
            logger.debug("Parsed result: %s, units: %s, dims: %s", result, result.units, result.dimensionality)

            # Get dimensionality
            dims = str(result.dimensionality)

            # Get SI base units
            si_base = None
            si_result = None
            try:
                si_result = result.to_base_units()
                si_base = f"{si_result.magnitude} {si_result.units}"
                logger.debug("Base units: %s", si_result.units)
            except Exception as e:
                # Log the error but continue - we'll use the original units
                logger.debug("to_base_units failed for %s: %s", expression, e)

            # Get simplified unit string from base units
            # e.g., "newton / pascal" -> "meter ** 2" -> "m²"
            simplified_unit = str(result.units)
            logger.debug("Initial simplified_unit: %s", simplified_unit)
            if si_result is not None:
                # Use the SI base unit representation (properly reduced)
                simplified_unit = self._format_base_unit(str(si_result.units))
                logger.debug("Final simplified_unit (formatted): %s", simplified_unit)

            # Check against expected
            if expected_unit:
                try:
                    expected = self.ureg.parse_units(expected_unit)
                    consistent = result.dimensionality == expected.dimensionality

                    if not consistent:
                        return {
                            "consistent": False,
                            "inferred_unit": simplified_unit,
                            "si_base": si_base,
                            "dimensionality": dims,
                            "error": f"Dimensionality mismatch: got {dims}, expected {expected.dimensionality}",
                        }
                except Exception as e:
                    return {
                        "consistent": False,
                        "error": f"Failed to parse expected unit: {e}",
                    }

            return {
                "consistent": True,
                "inferred_unit": simplified_unit,
                "si_base": si_base,
                "dimensionality": dims,
            }
        except DimensionalityError as e:
            return {
                "consistent": False,
                "error": f"Dimensionality error: {e}",
            }
        except Exception as e:
            return {
                "consistent": False,
                "error": f"Unit parsing error: {e}",
            }

    def convert(self, value: float, from_unit: str, to_unit: str) -> float:
        """
        Convert a value from one unit to another.

        Args:
            value: Numeric value
            from_unit: Source unit
            to_unit: Target unit

        Returns:
            Converted value
        """
        quantity = self.Q_(value, from_unit)
        converted = quantity.to(to_unit)
        return converted.magnitude

    def get_dimensions(self, unit: str) -> Dict[str, int]:
        """
        Get the dimensionality of a unit.

        Args:
            unit: Unit string

        Returns:
            Dict mapping dimension names to powers
        """
        parsed = self.ureg.parse_units(unit)
        dims = parsed.dimensionality

        # Convert to simple dict
        return dict(dims)

    def are_compatible(self, unit1: str, unit2: str) -> bool:
        """Check if two units are dimensionally compatible."""
        try:
            u1 = self.ureg.parse_units(unit1)
            u2 = self.ureg.parse_units(unit2)
            return u1.dimensionality == u2.dimensionality
        except (pint.UndefinedUnitError, ValueError, TypeError) as e:
            logger.debug("are_compatible failed for '%s' vs '%s': %s", unit1, unit2, e)
            return False

    def to_si(self, value: float, unit: str) -> tuple:
        """Convert a value to SI base units."""
        quantity = self.Q_(value, unit)
        si = quantity.to_base_units()
        return (si.magnitude, str(si.units))

    def simplify_unit(self, unit: str) -> str:
        """Simplify a compound unit expression."""
        parsed = self.ureg.parse_units(unit)
        # Try to reduce to a simpler form
        try:
            reduced = parsed.to_reduced_units()
            return str(reduced)
        except (pint.DimensionalityError, ValueError, TypeError) as e:
            logger.debug("simplify_unit reduction failed for '%s': %s", unit, e)
            return str(parsed)

    def _get_dimensionality_tuple(self, dims: dict) -> Optional[Tuple[int, ...]]:
        """Convert Pint dimensionality dict to a tuple for lookup.

        Returns None if any dimension has a fractional exponent (e.g., m^0.5),
        since those can't be matched against the integer-keyed taxonomy.
        """
        # Order: mass, length, time, current, temperature, amount, luminosity
        raw = (
            dims.get("[mass]", 0),
            dims.get("[length]", 0),
            dims.get("[time]", 0),
            dims.get("[current]", 0),
            dims.get("[temperature]", 0),
            dims.get("[substance]", 0),
            dims.get("[luminosity]", 0),
        )
        # Check for fractional exponents before truncating
        for val in raw:
            if float(val) != int(val):
                return None
        return tuple(int(v) for v in raw)

    def simplify_to_derived(self, value: float, unit: str) -> Dict[str, Any]:
        """
        Simplify a unit to SI derived units if possible.

        Args:
            value: Numeric value
            unit: Unit string (e.g., "kg*m/s**2")

        Returns:
            Dict with:
                - value: numeric value in simplified unit
                - raw_unit: original base units
                - simplified_unit: SI derived unit name if found
                - symbol: SI derived unit symbol if found
                - display: formatted display string
        """
        try:
            quantity = self.Q_(value, unit)

            # Convert to base SI units first
            base = quantity.to_base_units()
            raw_unit = str(base.units)

            # Get dimensionality tuple
            dims = dict(base.dimensionality)
            dim_tuple = self._get_dimensionality_tuple(dims)

            # Look up in SI derived units
            if dim_tuple in SI_DERIVED_UNITS:
                name, symbol = SI_DERIVED_UNITS[dim_tuple]
                # Convert to the derived unit
                derived = base.to(name)
                return {
                    "value": float(derived.magnitude),
                    "raw_unit": raw_unit,
                    "simplified_unit": name,
                    "symbol": symbol,
                    "display": f"{derived.magnitude} {symbol}",
                    "has_derived": True,
                }

            # No derived unit found, return base units
            return {
                "value": float(base.magnitude),
                "raw_unit": raw_unit,
                "simplified_unit": None,
                "symbol": None,
                "display": f"{base.magnitude} {raw_unit}",
                "has_derived": False,
            }
        except Exception as e:
            return {
                "value": value,
                "raw_unit": unit,
                "simplified_unit": None,
                "symbol": None,
                "display": f"{value} {unit}",
                "has_derived": False,
                "error": str(e),
            }

    def format_result(
        self,
        value: float,
        unit: str,
        prefer_simplified: bool = True
    ) -> Dict[str, Any]:
        """
        Format a computation result with both raw and simplified units.

        Args:
            value: Numeric value
            unit: Unit string
            prefer_simplified: If True, display shows simplified; else raw

        Returns:
            Dict with display string and both unit forms for toggling
        """
        result = self.simplify_to_derived(value, unit)

        if prefer_simplified and result.get("has_derived"):
            display = f"{result['value']:.6g} {result['symbol']}"
        else:
            display = f"{result['value']:.6g} {result['raw_unit']}"

        return {
            "display": display,
            "value": result["value"],
            "raw_unit": result["raw_unit"],
            "simplified_unit": result.get("simplified_unit"),
            "simplified_symbol": result.get("symbol"),
            "has_simplified": result.get("has_derived", False),
        }


# ============================================================================
# Physical Domain Classification
# ============================================================================

# Domain taxonomy with dimension patterns
# Format: {dimension_tuple: (domain, quantity_name, icon)}
# dimension_tuple = (mass, length, time, current, temperature, amount, luminosity)
DOMAIN_TAXONOMY = {
    # Mechanics - Motion
    (0, 1, 0, 0, 0, 0, 0): ("mechanics", "length", "📏"),
    (0, 2, 0, 0, 0, 0, 0): ("mechanics", "area", "⬜"),
    (0, 3, 0, 0, 0, 0, 0): ("mechanics", "volume", "📦"),
    (0, 1, -1, 0, 0, 0, 0): ("mechanics", "velocity", "🚀"),
    (0, 1, -2, 0, 0, 0, 0): ("mechanics", "acceleration", "⚡"),
    (0, 0, -1, 0, 0, 0, 0): ("mechanics", "frequency", "〰️"),
    (0, 0, 1, 0, 0, 0, 0): ("mechanics", "time", "⏱️"),

    # Mechanics - Force & Energy
    (1, 0, 0, 0, 0, 0, 0): ("mechanics", "mass", "⚖️"),
    (1, -3, 0, 0, 0, 0, 0): ("mechanics", "density", "🧊"),
    (1, 1, -2, 0, 0, 0, 0): ("mechanics", "force", "💪"),
    (1, -1, -2, 0, 0, 0, 0): ("mechanics", "pressure", "🎯"),
    (1, 2, -2, 0, 0, 0, 0): ("mechanics", "energy", "⚡"),
    (1, 2, -3, 0, 0, 0, 0): ("mechanics", "power", "🔋"),
    (1, 1, -1, 0, 0, 0, 0): ("mechanics", "momentum", "🎱"),
    (1, 2, -1, 0, 0, 0, 0): ("mechanics", "angular_momentum", "🌀"),
    (1, 0, -2, 0, 0, 0, 0): ("mechanics", "stiffness", "🔩"),
    (1, -1, -1, 0, 0, 0, 0): ("mechanics", "viscosity", "🍯"),

    # Thermodynamics
    (0, 0, 0, 0, 1, 0, 0): ("thermodynamics", "temperature", "🌡️"),
    (1, 2, -2, 0, -1, 0, 0): ("thermodynamics", "heat_capacity", "🔥"),
    (1, 1, -3, 0, -1, 0, 0): ("thermodynamics", "thermal_conductivity", "♨️"),
    (1, 2, -2, 0, 0, -1, 0): ("thermodynamics", "molar_energy", "🧪"),

    # Electrical
    (0, 0, 1, 1, 0, 0, 0): ("electrical", "charge", "⚡"),
    (0, 0, 0, 1, 0, 0, 0): ("electrical", "current", "🔌"),
    (1, 2, -3, -1, 0, 0, 0): ("electrical", "voltage", "⚡"),
    (1, 2, -3, -2, 0, 0, 0): ("electrical", "resistance", "Ω"),
    (-1, -2, 4, 2, 0, 0, 0): ("electrical", "capacitance", "🔋"),
    (1, 2, -2, -2, 0, 0, 0): ("electrical", "inductance", "🧲"),
    (-1, -2, 3, 2, 0, 0, 0): ("electrical", "conductance", "🔗"),

    # Magnetism
    (1, 2, -2, -1, 0, 0, 0): ("magnetism", "magnetic_flux", "🧲"),
    (1, 0, -2, -1, 0, 0, 0): ("magnetism", "magnetic_field", "🧲"),

    # Chemistry
    (0, 0, 0, 0, 0, 1, 0): ("chemistry", "amount", "🧪"),
    (1, 0, 0, 0, 0, -1, 0): ("chemistry", "molar_mass", "⚗️"),
    (0, -3, 0, 0, 0, 1, 0): ("chemistry", "concentration", "💧"),

    # Optics
    (0, 0, 0, 0, 0, 0, 1): ("optics", "luminous_intensity", "💡"),
    (0, -2, 0, 0, 0, 0, 1): ("optics", "illuminance", "☀️"),
}

# Domain metadata for display
DOMAIN_INFO = {
    "mechanics": {"label": "Mechanics", "color": "#3b82f6", "icon": "⚙️"},
    "thermodynamics": {"label": "Thermodynamics", "color": "#ef4444", "icon": "🔥"},
    "electrical": {"label": "Electrical", "color": "#eab308", "icon": "⚡"},
    "magnetism": {"label": "Magnetism", "color": "#8b5cf6", "icon": "🧲"},
    "chemistry": {"label": "Chemistry", "color": "#22c55e", "icon": "🧪"},
    "optics": {"label": "Optics", "color": "#f97316", "icon": "💡"},
    "dimensionless": {"label": "Dimensionless", "color": "#6b7280", "icon": "∅"},
    "unknown": {"label": "Unknown", "color": "#9ca3af", "icon": "❓"},
}


class PhysicalDomainClassifier:
    """
    Classifies physical quantities by their domain based on dimensions.

    Uses Pint's dimensional analysis to determine what physical domain
    a unit belongs to (mechanics, thermodynamics, electrical, etc.)
    """

    def __init__(self, registry: 'UnitRegistry'):
        self.registry = registry
        self.ureg = registry.ureg


    def classify(self, unit: str) -> Dict[str, Any]:
        """
        Classify a unit by its physical domain.

        Args:
            unit: Unit string (e.g., "kg/m³", "N", "Pa")

        Returns:
            Dict with domain classification:
                - domain: Domain name (mechanics, thermodynamics, etc.)
                - quantity: Specific quantity name (density, force, pressure)
                - icon: Display icon for the quantity
                - domain_info: Full domain metadata (label, color, icon)
                - dimensions: Raw dimension dict
        """
        try:
            parsed = self.ureg.parse_units(unit)
            dims = dict(parsed.dimensionality)
            dim_tuple = self.registry._get_dimensionality_tuple(dims)

            # Fractional exponents can't be matched against taxonomy
            if dim_tuple is None:
                domain = self._infer_domain_from_dims(dims)
                return {
                    "domain": domain,
                    "quantity": "fractional_compound",
                    "icon": DOMAIN_INFO.get(domain, DOMAIN_INFO["unknown"])["icon"],
                    "domain_info": DOMAIN_INFO.get(domain, DOMAIN_INFO["unknown"]),
                    "dimensions": dims,
                }

            # Check if dimensionless
            if dim_tuple == (0, 0, 0, 0, 0, 0, 0):
                return {
                    "domain": "dimensionless",
                    "quantity": "ratio",
                    "icon": "∅",
                    "domain_info": DOMAIN_INFO["dimensionless"],
                    "dimensions": {},
                }

            # Look up in taxonomy
            if dim_tuple in DOMAIN_TAXONOMY:
                domain, quantity, icon = DOMAIN_TAXONOMY[dim_tuple]
                return {
                    "domain": domain,
                    "quantity": quantity,
                    "icon": icon,
                    "domain_info": DOMAIN_INFO.get(domain, DOMAIN_INFO["dimensionless"]),
                    "dimensions": dims,
                }

            # Try to infer domain from dimension components
            domain = self._infer_domain_from_dims(dims)
            return {
                "domain": domain,
                "quantity": "compound",
                "icon": DOMAIN_INFO.get(domain, DOMAIN_INFO["dimensionless"])["icon"],
                "domain_info": DOMAIN_INFO.get(domain, DOMAIN_INFO["dimensionless"]),
                "dimensions": dims,
            }

        except Exception as e:
            return {
                "domain": "unknown",
                "quantity": "unknown",
                "icon": "❓",
                "domain_info": DOMAIN_INFO["unknown"],
                "dimensions": {},
                "error": str(e),
            }

    def _infer_domain_from_dims(self, dims: dict) -> str:
        """Infer domain from dimension components when not in taxonomy."""
        # Check for electrical (has current)
        if dims.get("[current]", 0) != 0:
            return "electrical"

        # Check for thermal (has temperature, no current)
        if dims.get("[temperature]", 0) != 0:
            return "thermodynamics"

        # Check for chemistry (has substance/amount)
        if dims.get("[substance]", 0) != 0:
            return "chemistry"

        # Check for optics (has luminosity)
        if dims.get("[luminosity]", 0) != 0:
            return "optics"

        # Default to mechanics
        return "mechanics"

    def get_all_domains(self) -> Dict[str, Dict]:
        """Return all available domain metadata."""
        return DOMAIN_INFO.copy()


# Dimension checking utilities for specific domains
class EngineeringUnits:
    """Common engineering unit checks."""

    def __init__(self, registry: UnitRegistry):
        self.registry = registry

    def is_force(self, unit: str) -> bool:
        """Check if unit represents force."""
        dims = self.registry.get_dimensions(unit)
        # Force = mass * length / time^2
        return dims.get("[mass]", 0) == 1 and dims.get("[length]", 0) == 1 and dims.get("[time]", 0) == -2

    def is_stress(self, unit: str) -> bool:
        """Check if unit represents stress/pressure."""
        dims = self.registry.get_dimensions(unit)
        # Stress = force / area = mass / (length * time^2)
        return dims.get("[mass]", 0) == 1 and dims.get("[length]", 0) == -1 and dims.get("[time]", 0) == -2

    def is_energy(self, unit: str) -> bool:
        """Check if unit represents energy."""
        dims = self.registry.get_dimensions(unit)
        # Energy = mass * length^2 / time^2
        return dims.get("[mass]", 0) == 1 and dims.get("[length]", 0) == 2 and dims.get("[time]", 0) == -2

    def is_power(self, unit: str) -> bool:
        """Check if unit represents power."""
        dims = self.registry.get_dimensions(unit)
        # Power = energy / time = mass * length^2 / time^3
        return dims.get("[mass]", 0) == 1 and dims.get("[length]", 0) == 2 and dims.get("[time]", 0) == -3

    def is_velocity(self, unit: str) -> bool:
        """Check if unit represents velocity."""
        dims = self.registry.get_dimensions(unit)
        return dims.get("[length]", 0) == 1 and dims.get("[time]", 0) == -1

    def is_acceleration(self, unit: str) -> bool:
        """Check if unit represents acceleration."""
        dims = self.registry.get_dimensions(unit)
        return dims.get("[length]", 0) == 1 and dims.get("[time]", 0) == -2


class EquationUnitValidator:
    """
    Validates dimensional consistency of equations before solving.

    This catches errors like F = 100 N·°F (force × temperature) before
    they propagate into nonsensical results.
    """

    def __init__(self, registry: UnitRegistry):
        self.registry = registry
        self.ureg = registry.ureg
        self.Q_ = registry.Q_

    def _dims_to_dict(self, dimensionality) -> Dict[str, int]:
        """Convert Pint dimensionality to a clean dict."""
        return {str(k): int(v) for k, v in dict(dimensionality).items() if v != 0}

    def _dims_to_str(self, dims: Dict[str, int]) -> str:
        """Format dimensions as a readable string."""
        if not dims:
            return "dimensionless"
        parts = []
        for dim, power in sorted(dims.items()):
            dim_name = dim.replace("[", "").replace("]", "")
            if power == 1:
                parts.append(dim_name)
            else:
                parts.append(f"{dim_name}^{power}")
        return " × ".join(parts)

    def _get_common_quantity_name(self, dims: Dict[str, int]) -> Optional[str]:
        """Map dimensions to common physical quantity names."""
        # Normalize keys to [dimension] format
        normalized = {}
        for k, v in dims.items():
            key = k if k.startswith("[") else f"[{k}]"
            normalized[key] = v

        quantity_map = {
            # Base quantities
            frozenset({("[mass]", 1)}): "mass",
            frozenset({("[length]", 1)}): "length",
            frozenset({("[time]", 1)}): "time",
            frozenset({("[temperature]", 1)}): "temperature",
            frozenset({("[current]", 1)}): "current",
            # Derived quantities
            frozenset({("[length]", 2)}): "area",
            frozenset({("[length]", 3)}): "volume",
            frozenset({("[length]", 1), ("[time]", -1)}): "velocity",
            frozenset({("[length]", 1), ("[time]", -2)}): "acceleration",
            frozenset({("[mass]", 1), ("[length]", 1), ("[time]", -2)}): "force",
            frozenset({("[mass]", 1), ("[length]", -1), ("[time]", -2)}): "pressure/stress",
            frozenset({("[mass]", 1), ("[length]", 2), ("[time]", -2)}): "energy/work",
            frozenset({("[mass]", 1), ("[length]", 2), ("[time]", -3)}): "power",
            frozenset({("[mass]", 1), ("[length]", 2), ("[time]", -3), ("[current]", -1)}): "voltage",
            frozenset({("[mass]", 1), ("[length]", 2), ("[time]", -3), ("[current]", -2)}): "resistance",
        }

        dims_set = frozenset((k, v) for k, v in normalized.items())
        return quantity_map.get(dims_set)

    def validate_equation(
        self,
        equation: str,
        variables: Dict[str, Dict[str, Any]],
        target: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate dimensional consistency of an equation with given variable units.

        Args:
            equation: Equation string (e.g., "P = F/A")
            variables: Dict of variable name -> {"value": ..., "unit": ...}
            target: Optional target variable we're solving for

        Returns:
            Dict with:
                - valid: bool - whether equation is dimensionally consistent
                - errors: List of error messages
                - warnings: List of warning messages
                - variable_analysis: Dict of variable -> dimension info
                - suggestion: Optional suggestion for fixing
        """
        logger.debug("validate_equation: %s", equation)
        logger.debug("variables: %s", variables)
        logger.debug("target: %s", target)

        errors = []
        warnings = []
        variable_analysis = {}

        # Parse equation sides
        _lhs_str, rhs_str = parse_equation(equation)
        if rhs_str == "0" and "=" not in equation:
            return {
                "valid": False,
                "errors": ["Equation must contain '=' sign"],
                "warnings": [],
                "variable_analysis": {},
                "suggestion": None
            }

        # Analyze each known variable
        for var_name, var_info in variables.items():
            unit_str = var_info.get("unit")
            if not unit_str:
                variable_analysis[var_name] = {
                    "unit": None,
                    "dimensions": None,
                    "quantity": None,
                    "status": "no_unit"
                }
                continue

            try:
                # Parse the unit
                unit = self.ureg.parse_units(unit_str)
                dims = self._dims_to_dict(unit.dimensionality)
                quantity = self._get_common_quantity_name(dims)

                variable_analysis[var_name] = {
                    "unit": unit_str,
                    "dimensions": dims,
                    "dimensions_str": self._dims_to_str(dims),
                    "quantity": quantity,
                    "status": "ok"
                }

                # Check for suspicious dimension combinations
                # Force should not have temperature, temperature should not have length, etc.
                if "[temperature]" in dims and any(d in dims for d in ["[mass]", "[length]"]) and dims.get("[temperature]", 0) > 0:
                    # This is suspicious - temperature mixed with mechanical quantities
                    # Exception: heat capacity (energy/temperature) is valid
                    if not (dims.get("[mass]", 0) == 1 and dims.get("[length]", 0) == 2
                            and dims.get("[time]", 0) == -2 and dims.get("[temperature]", 0) == -1):
                        warnings.append(
                            f"Variable '{var_name}' has unusual dimensions: {self._dims_to_str(dims)}. "
                            f"Temperature combined with mechanical quantities is often an error."
                        )
                        variable_analysis[var_name]["status"] = "suspicious"

            except Exception as e:
                variable_analysis[var_name] = {
                    "unit": unit_str,
                    "dimensions": None,
                    "quantity": None,
                    "status": "parse_error",
                    "error": str(e)
                }
                errors.append(f"Could not parse unit '{unit_str}' for variable '{var_name}': {e}")

        # Try to compute expected dimensions for target variable
        target_expected_dims = None
        if target and len([v for v in variables if v != target and variables[v].get("unit")]) >= 1:
            try:
                target_expected_dims = self._infer_target_dimensions(
                    equation, variables, target
                )
                if target_expected_dims:
                    expected_quantity = self._get_common_quantity_name(target_expected_dims)
                    variable_analysis[f"{target}_expected"] = {
                        "dimensions": target_expected_dims,
                        "dimensions_str": self._dims_to_str(target_expected_dims),
                        "quantity": expected_quantity,
                        "status": "inferred"
                    }
            except Exception as e:
                logger.debug("Could not infer target dimensions: %s", e)

        # Check if equation LHS and RHS have compatible dimensions
        # by attempting to evaluate with unit quantities
        dimensional_check = self._check_equation_balance(equation, variables)
        if not dimensional_check["balanced"]:
            errors.append(dimensional_check["error"])
        elif dimensional_check.get("warning"):
            warnings.append(dimensional_check["warning"])

        # Generate suggestion if there are errors
        suggestion = None
        if errors:
            # Try to identify which variable is likely wrong
            suspicious_vars = [v for v, info in variable_analysis.items()
                             if info.get("status") == "suspicious"]
            if suspicious_vars:
                var = suspicious_vars[0]
                expected_qty = variable_analysis.get(f"{var}_expected", {}).get("quantity")
                if expected_qty:
                    suggestion = f"Variable '{var}' should have dimensions of {expected_qty}. Check if the unit is correct."
                else:
                    suggestion = f"Variable '{var}' has unusual dimensions. Check if the unit is correct."

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "variable_analysis": variable_analysis,
            "suggestion": suggestion
        }

    def _infer_target_dimensions(
        self,
        equation: str,
        variables: Dict[str, Dict[str, Any]],
        target: str
    ) -> Optional[Dict[str, int]]:
        """
        Infer what dimensions the target variable should have.

        For P = F/A solving for A:
        - A = F/P
        - If F is force and P is pressure, A should be area
        """
        # Simple algebraic inference for common patterns
        # This handles cases like "P = F/A" -> A = F/P

        lhs, rhs = parse_equation(equation)

        # Collect dimensions for known variables
        known_dims = {}
        for var_name, var_info in variables.items():
            if var_name == target:
                continue
            unit_str = var_info.get("unit")
            if unit_str:
                try:
                    unit = self.ureg.parse_units(unit_str)
                    known_dims[var_name] = dict(unit.dimensionality)
                except (pint.UndefinedUnitError, ValueError, TypeError) as e:
                    logger.debug("Failed to parse unit '%s' for variable '%s': %s", unit_str, var_name, e)

        if not known_dims:
            return None

        # For simple equations, try dimensional algebra
        # This is a simplified approach - for complex equations we'd need symbolic analysis
        try:
            # Build a unit expression by substituting "1 unit" for each variable
            # and solving symbolically

            # Create placeholder quantities with the right dimensions
            test_expr = rhs
            for var_name, dims in known_dims.items():
                # Create a quantity with these dimensions
                unit_str = self._dims_to_unit_str(dims)
                if unit_str:
                    test_expr = test_expr.replace(var_name, f"(1 * {unit_str})")

            # Also handle LHS if it's not the target
            if lhs != target and lhs in known_dims:
                unit_str = self._dims_to_unit_str(known_dims[lhs])
                lhs_qty = self.ureg.parse_expression(f"1 * {unit_str}") if unit_str else None
            elif lhs != target and lhs in variables and variables[lhs].get("unit"):
                lhs_qty = self.ureg.parse_expression(f"1 * {variables[lhs]['unit']}")
            else:
                lhs_qty = None

            # Try to evaluate the RHS expression
            if target in rhs:
                # Target is on RHS - need to rearrange
                # For now, skip complex cases
                return None

            # Evaluate RHS to get expected dimensions
            rhs_qty = self.ureg.parse_expression(test_expr)

            if lhs == target:
                # Target is on LHS, so it should have RHS dimensions
                return self._dims_to_dict(rhs_qty.dimensionality)
            elif lhs_qty is not None:
                # LHS has known dimensions, target is somewhere in equation
                # This is more complex - would need symbolic solving
                return None

        except Exception as e:
            logger.debug("Dimension inference failed: %s", e)
            return None

        return None

    def _dims_to_unit_str(self, dims: Dict[str, int]) -> Optional[str]:
        """Convert dimensions dict back to a unit string."""
        if not dims:
            return "dimensionless"

        dim_to_unit = {
            "[mass]": "kg",
            "[length]": "m",
            "[time]": "s",
            "[temperature]": "K",
            "[current]": "A",
            "[substance]": "mol",
            "[luminosity]": "cd"
        }

        parts = []
        for dim, power in dims.items():
            dim_key = dim if dim.startswith("[") else f"[{dim}]"
            unit = dim_to_unit.get(dim_key)
            if unit:
                if power == 1:
                    parts.append(unit)
                else:
                    parts.append(f"{unit}**{power}")

        return " * ".join(parts) if parts else None

    def _check_equation_balance(
        self,
        equation: str,
        variables: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Check if equation LHS and RHS have compatible dimensions.

        Uses Pint to evaluate both sides with unit quantities.
        """
        lhs_str, rhs_str = parse_equation(equation)

        # Build expressions with units
        lhs_expr = lhs_str
        rhs_expr = rhs_str

        # Count how many variables we can substitute
        substituted = 0
        for var_name, var_info in variables.items():
            value = var_info.get("value", 1)
            unit = var_info.get("unit")

            if unit:
                replacement = f"({value} * {unit})"
                if var_name in lhs_expr:
                    lhs_expr = re.sub(rf'\b{re.escape(var_name)}\b', replacement, lhs_expr)
                    substituted += 1
                if var_name in rhs_expr:
                    rhs_expr = re.sub(rf'\b{re.escape(var_name)}\b', replacement, rhs_expr)
                    substituted += 1

        # If we couldn't substitute any variables, we can't check
        if substituted == 0:
            return {"balanced": True, "warning": "No units to validate"}

        # Neutralize unsubstituted variable names so Pint doesn't
        # interpret them as unit names (e.g. 'A' → Ampere, 'C' → Coulomb).
        # Collect all variable-like tokens from the ORIGINAL equation,
        # then determine which were NOT substituted (no unit info).
        _MATH_BUILTINS = {
            'pi', 'e', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
            'sqrt', 'log', 'ln', 'exp', 'abs', 'Abs',
        }
        var_pattern = re.compile(r'\b([A-Za-z_]\w*)\b')
        original_tokens = set(var_pattern.findall(lhs_str + " " + rhs_str)) - _MATH_BUILTINS
        substituted_vars = {name for name, info in variables.items() if info.get("unit")}
        unsubstituted_vars = original_tokens - substituted_vars

        # Replace unsubstituted variables with dimensionless 1
        lhs_has_unknowns = False
        rhs_has_unknowns = False
        for uv in unsubstituted_vars:
            if re.search(rf'\b{re.escape(uv)}\b', lhs_expr):
                lhs_expr = re.sub(rf'\b{re.escape(uv)}\b', '1', lhs_expr)
                lhs_has_unknowns = True
            if re.search(rf'\b{re.escape(uv)}\b', rhs_expr):
                rhs_expr = re.sub(rf'\b{re.escape(uv)}\b', '1', rhs_expr)
                rhs_has_unknowns = True

        # If both sides have unknowns, we can't meaningfully check
        if lhs_has_unknowns and rhs_has_unknowns:
            return {"balanced": True, "warning": "Cannot validate: unsubstituted variables on both sides"}

        try:
            # Try to evaluate both sides
            lhs_qty = self.ureg.parse_expression(lhs_expr)
            rhs_qty = self.ureg.parse_expression(rhs_expr)

            def _get_dims(qty):
                """Extract dimensionality dict, treating plain numbers as dimensionless."""
                if hasattr(qty, 'dimensionality'):
                    return self._dims_to_dict(qty.dimensionality)
                return {}  # plain int/float → dimensionless

            lhs_dims = _get_dims(lhs_qty)
            rhs_dims = _get_dims(rhs_qty)

            # If one side has unknowns (replaced with dimensionless 1),
            # we can't compare dimensions — the unknown will carry the
            # missing dimensions.  Report balanced.
            if lhs_has_unknowns or rhs_has_unknowns:
                known_side = "RHS" if lhs_has_unknowns else "LHS"
                known_dims = rhs_dims if lhs_has_unknowns else lhs_dims
                dim_str = self._dims_to_str(known_dims) if known_dims else "dimensionless"
                return {
                    "balanced": True,
                    "inferred_dims": known_dims,
                    "warning": f"{known_side} has dimensions {dim_str}",
                }

            if lhs_dims == rhs_dims:
                return {"balanced": True}
            else:
                return {
                    "balanced": False,
                    "error": (
                        f"Dimensional mismatch: LHS has dimensions {self._dims_to_str(lhs_dims)}, "
                        f"RHS has dimensions {self._dims_to_str(rhs_dims)}"
                    ),
                    "lhs_dims": lhs_dims,
                    "rhs_dims": rhs_dims
                }

        except Exception as e:
            # Parse errors often indicate variables without units - that's ok
            error_str = str(e)
            if "undefined" in error_str.lower() or "symbol" in error_str.lower():
                return {"balanced": True, "warning": f"Could not fully validate: {e}"}
            return {"balanced": True, "warning": f"Validation incomplete: {e}"}
