/**
 * Symbol-to-Unit Inference
 *
 * Suggests units based on common engineering symbol conventions.
 * Uses pattern matching on symbol names to infer likely physical quantities.
 */

export interface UnitSuggestion {
  unit: string;
  quantity: string;
  confidence: 'high' | 'medium' | 'low';
  alternatives?: string[];
}

/**
 * Common physics/engineering symbol patterns and their associated quantities
 */
const SYMBOL_PATTERNS: Array<{
  pattern: RegExp;
  quantity: string;
  defaultUnit: string;
  alternativeUnits: string[];
  confidence: 'high' | 'medium' | 'low';
}> = [
  // Force symbols
  { pattern: /^[Ff](?:_\w+)?$/, quantity: 'force', defaultUnit: 'N', alternativeUnits: ['kN', 'lbf', 'MN'], confidence: 'high' },
  { pattern: /^[Pp](?:_\w+)?$/, quantity: 'force/power', defaultUnit: 'N', alternativeUnits: ['kN', 'W', 'kW'], confidence: 'medium' },
  { pattern: /^[Ww](?:_\w+)?$/, quantity: 'force/weight', defaultUnit: 'N', alternativeUnits: ['kN', 'lbf'], confidence: 'medium' },

  // Mass symbols
  { pattern: /^[Mm](?:_\w+)?$/, quantity: 'mass', defaultUnit: 'kg', alternativeUnits: ['g', 'lb', 'ton'], confidence: 'high' },
  { pattern: /^(?:mass|Mass)(?:_\w+)?$/, quantity: 'mass', defaultUnit: 'kg', alternativeUnits: ['g', 'lb'], confidence: 'high' },

  // Length/distance symbols
  { pattern: /^[LlDdRrHhXxYyZz](?:_\w+)?$/, quantity: 'length', defaultUnit: 'm', alternativeUnits: ['cm', 'mm', 'ft', 'in'], confidence: 'medium' },
  { pattern: /^(?:length|dist|distance|height|width|depth|radius|diameter)(?:_\w+)?$/i, quantity: 'length', defaultUnit: 'm', alternativeUnits: ['cm', 'mm', 'ft'], confidence: 'high' },

  // Area symbols
  { pattern: /^[Aa](?:rea)?(?:_\w+)?$/, quantity: 'area', defaultUnit: 'm^2', alternativeUnits: ['cm^2', 'mm^2', 'ft^2', 'in^2'], confidence: 'medium' },

  // Volume symbols
  { pattern: /^[Vv](?:ol)?(?:_\w+)?$/, quantity: 'volume/velocity', defaultUnit: 'm^3', alternativeUnits: ['L', 'mL', 'gal', 'm/s'], confidence: 'low' },

  // Time symbols
  { pattern: /^[Tt](?:_\w+)?$/, quantity: 'time', defaultUnit: 's', alternativeUnits: ['min', 'hr', 'ms'], confidence: 'high' },
  { pattern: /^(?:time|duration)(?:_\w+)?$/i, quantity: 'time', defaultUnit: 's', alternativeUnits: ['min', 'hr'], confidence: 'high' },

  // Velocity symbols
  { pattern: /^[Vv](?:_\w+)?$/, quantity: 'velocity', defaultUnit: 'm/s', alternativeUnits: ['km/h', 'mph', 'ft/s'], confidence: 'medium' },
  { pattern: /^(?:vel|velocity|speed)(?:_\w+)?$/i, quantity: 'velocity', defaultUnit: 'm/s', alternativeUnits: ['km/h', 'mph'], confidence: 'high' },
  { pattern: /^[Uu](?:_\w+)?$/, quantity: 'velocity', defaultUnit: 'm/s', alternativeUnits: ['km/h', 'ft/s'], confidence: 'medium' },

  // Acceleration symbols
  { pattern: /^[Aa](?:_\w+)?$/, quantity: 'acceleration', defaultUnit: 'm/s^2', alternativeUnits: ['ft/s^2', 'g'], confidence: 'medium' },
  { pattern: /^(?:acc|accel)(?:_\w+)?$/i, quantity: 'acceleration', defaultUnit: 'm/s^2', alternativeUnits: ['ft/s^2'], confidence: 'high' },
  { pattern: /^g$/, quantity: 'gravitational acceleration', defaultUnit: 'm/s^2', alternativeUnits: ['ft/s^2'], confidence: 'high' },

  // Angular symbols
  { pattern: /^(?:theta|phi|psi|alpha|beta|gamma|angle)(?:_\w+)?$/i, quantity: 'angle', defaultUnit: 'rad', alternativeUnits: ['deg'], confidence: 'high' },
  { pattern: /^[θφψαβγ](?:_\w+)?$/, quantity: 'angle', defaultUnit: 'rad', alternativeUnits: ['deg'], confidence: 'high' },

  // Angular velocity
  { pattern: /^(?:omega|ω)(?:_\w+)?$/i, quantity: 'angular velocity', defaultUnit: 'rad/s', alternativeUnits: ['rpm', 'deg/s'], confidence: 'high' },

  // Torque/moment
  { pattern: /^[Mm](?:_\w+)?$/, quantity: 'moment/torque', defaultUnit: 'N*m', alternativeUnits: ['kN*m', 'ft*lbf'], confidence: 'low' },
  { pattern: /^(?:torque|moment|tau|τ)(?:_\w+)?$/i, quantity: 'torque', defaultUnit: 'N*m', alternativeUnits: ['kN*m'], confidence: 'high' },

  // Pressure/stress
  { pattern: /^[Pp](?:_\w+)?$/, quantity: 'pressure', defaultUnit: 'Pa', alternativeUnits: ['kPa', 'MPa', 'psi', 'bar'], confidence: 'low' },
  { pattern: /^(?:pressure|stress|sigma|σ)(?:_\w+)?$/i, quantity: 'pressure/stress', defaultUnit: 'Pa', alternativeUnits: ['kPa', 'MPa', 'psi'], confidence: 'high' },

  // Energy/work
  { pattern: /^[EeWwUu](?:_\w+)?$/, quantity: 'energy', defaultUnit: 'J', alternativeUnits: ['kJ', 'kWh', 'BTU'], confidence: 'low' },
  { pattern: /^(?:energy|work|KE|PE)(?:_\w+)?$/i, quantity: 'energy', defaultUnit: 'J', alternativeUnits: ['kJ', 'kWh'], confidence: 'high' },

  // Power
  { pattern: /^[Pp](?:ower)?(?:_\w+)?$/i, quantity: 'power', defaultUnit: 'W', alternativeUnits: ['kW', 'MW', 'hp'], confidence: 'medium' },

  // Temperature
  { pattern: /^[Tt](?:emp)?(?:_\w+)?$/i, quantity: 'temperature', defaultUnit: 'K', alternativeUnits: ['degC', 'degF'], confidence: 'low' },
  { pattern: /^(?:temp|temperature)(?:_\w+)?$/i, quantity: 'temperature', defaultUnit: 'K', alternativeUnits: ['degC', 'degF'], confidence: 'high' },

  // Current
  { pattern: /^[Ii](?:_\w+)?$/, quantity: 'current', defaultUnit: 'A', alternativeUnits: ['mA', 'kA'], confidence: 'medium' },
  { pattern: /^(?:current)(?:_\w+)?$/i, quantity: 'current', defaultUnit: 'A', alternativeUnits: ['mA'], confidence: 'high' },

  // Voltage
  { pattern: /^[VvEe](?:_\w+)?$/, quantity: 'voltage', defaultUnit: 'V', alternativeUnits: ['mV', 'kV'], confidence: 'low' },
  { pattern: /^(?:voltage|emf)(?:_\w+)?$/i, quantity: 'voltage', defaultUnit: 'V', alternativeUnits: ['mV', 'kV'], confidence: 'high' },

  // Resistance
  { pattern: /^[Rr](?:_\w+)?$/, quantity: 'resistance', defaultUnit: 'ohm', alternativeUnits: ['kohm', 'Mohm'], confidence: 'low' },
  { pattern: /^(?:resistance)(?:_\w+)?$/i, quantity: 'resistance', defaultUnit: 'ohm', alternativeUnits: ['kohm'], confidence: 'high' },

  // Frequency
  { pattern: /^[Ff](?:req)?(?:_\w+)?$/i, quantity: 'frequency', defaultUnit: 'Hz', alternativeUnits: ['kHz', 'MHz', 'GHz'], confidence: 'low' },
  { pattern: /^(?:frequency|freq)(?:_\w+)?$/i, quantity: 'frequency', defaultUnit: 'Hz', alternativeUnits: ['kHz', 'MHz'], confidence: 'high' },

  // Density
  { pattern: /^(?:rho|ρ|density)(?:_\w+)?$/i, quantity: 'density', defaultUnit: 'kg/m^3', alternativeUnits: ['g/cm^3', 'lb/ft^3'], confidence: 'high' },

  // Viscosity
  { pattern: /^(?:mu|μ|viscosity)(?:_\w+)?$/i, quantity: 'dynamic viscosity', defaultUnit: 'Pa*s', alternativeUnits: ['cP'], confidence: 'high' },
  { pattern: /^(?:nu|ν)(?:_\w+)?$/i, quantity: 'kinematic viscosity', defaultUnit: 'm^2/s', alternativeUnits: ['cSt'], confidence: 'high' },

  // Stiffness/spring constant
  { pattern: /^[Kk](?:_\w+)?$/, quantity: 'stiffness', defaultUnit: 'N/m', alternativeUnits: ['kN/m', 'lbf/in'], confidence: 'medium' },

  // Coefficient of friction
  { pattern: /^(?:mu|μ)(?:_[sk])?$/, quantity: 'friction coefficient', defaultUnit: '', alternativeUnits: [], confidence: 'high' },

  // Dimensionless numbers
  { pattern: /^(?:Re|Reynolds)(?:_\w+)?$/i, quantity: 'Reynolds number', defaultUnit: '', alternativeUnits: [], confidence: 'high' },
  { pattern: /^(?:Ma|Mach)(?:_\w+)?$/i, quantity: 'Mach number', defaultUnit: '', alternativeUnits: [], confidence: 'high' },
  { pattern: /^(?:Nu|Nusselt)(?:_\w+)?$/i, quantity: 'Nusselt number', defaultUnit: '', alternativeUnits: [], confidence: 'high' },
  { pattern: /^(?:Pr|Prandtl)(?:_\w+)?$/i, quantity: 'Prandtl number', defaultUnit: '', alternativeUnits: [], confidence: 'high' },

  // Flow rate
  { pattern: /^[Qq](?:_\w+)?$/, quantity: 'volumetric flow rate', defaultUnit: 'm^3/s', alternativeUnits: ['L/s', 'gpm'], confidence: 'medium' },
  { pattern: /^(?:mdot|m_dot)$/i, quantity: 'mass flow rate', defaultUnit: 'kg/s', alternativeUnits: ['lb/s'], confidence: 'high' },
];

/**
 * Infer unit suggestion from a symbol name
 */
export function inferUnitFromSymbol(symbol: string): UnitSuggestion | null {
  // Normalize the symbol (trim whitespace)
  const normalized = symbol.trim();

  if (!normalized) return null;

  // Check each pattern
  for (const entry of SYMBOL_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return {
        unit: entry.defaultUnit,
        quantity: entry.quantity,
        confidence: entry.confidence,
        alternatives: entry.alternativeUnits.length > 0 ? entry.alternativeUnits : undefined,
      };
    }
  }

  return null;
}

/**
 * Get all possible unit suggestions for a symbol (including alternatives)
 */
export function getAllUnitSuggestions(symbol: string): UnitSuggestion[] {
  const suggestions: UnitSuggestion[] = [];
  const normalized = symbol.trim();

  if (!normalized) return suggestions;

  // Collect all matching patterns
  for (const entry of SYMBOL_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      suggestions.push({
        unit: entry.defaultUnit,
        quantity: entry.quantity,
        confidence: entry.confidence,
        alternatives: entry.alternativeUnits.length > 0 ? entry.alternativeUnits : undefined,
      });
    }
  }

  return suggestions;
}

/**
 * Format suggestion for display
 */
export function formatSuggestion(suggestion: UnitSuggestion): string {
  if (!suggestion.unit) {
    return `${suggestion.quantity} (dimensionless)`;
  }
  return `${suggestion.quantity}: ${suggestion.unit}`;
}
