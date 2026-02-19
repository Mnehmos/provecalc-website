/**
 * Physical Constants Database
 *
 * Contains common physical and mathematical constants with their values,
 * symbols, and descriptions. Used for smart constant detection and labeling.
 */

export interface PhysicalConstant {
  symbol: string;
  name: string;
  value: number;
  unit?: string;
  category: 'universal' | 'electromagnetic' | 'atomic' | 'physico-chemical' | 'mathematical' | 'engineering';
  aliases?: string[];
  description?: string;
  /** Relative tolerance for matching (default: 1e-6) */
  tolerance?: number;
}

/**
 * Database of physical and mathematical constants
 */
export const PHYSICAL_CONSTANTS: PhysicalConstant[] = [
  // Universal Constants
  {
    symbol: 'c',
    name: 'Speed of Light',
    value: 299792458,
    unit: 'm/s',
    category: 'universal',
    aliases: ['c_0', 'speedOfLight'],
    description: 'Speed of light in vacuum',
  },
  {
    symbol: 'G',
    name: 'Gravitational Constant',
    value: 6.67430e-11,
    unit: 'm^3/(kg*s^2)',
    category: 'universal',
    aliases: ['G_N'],
    description: 'Newtonian constant of gravitation',
  },
  {
    symbol: 'h',
    name: 'Planck Constant',
    value: 6.62607015e-34,
    unit: 'J*s',
    category: 'universal',
    aliases: ['h_planck'],
    description: 'Planck constant',
  },
  {
    symbol: 'ℏ',
    name: 'Reduced Planck Constant',
    value: 1.054571817e-34,
    unit: 'J*s',
    category: 'universal',
    aliases: ['hbar', 'h_bar'],
    description: 'h/(2π)',
  },

  // Electromagnetic Constants
  {
    symbol: 'e',
    name: 'Elementary Charge',
    value: 1.602176634e-19,
    unit: 'C',
    category: 'electromagnetic',
    aliases: ['q_e', 'electron_charge'],
    description: 'Charge of an electron',
  },
  {
    symbol: 'ε_0',
    name: 'Vacuum Permittivity',
    value: 8.8541878128e-12,
    unit: 'F/m',
    category: 'electromagnetic',
    aliases: ['epsilon_0', 'permittivity'],
    description: 'Electric constant',
  },
  {
    symbol: 'μ_0',
    name: 'Vacuum Permeability',
    value: 1.25663706212e-6,
    unit: 'H/m',
    category: 'electromagnetic',
    aliases: ['mu_0', 'permeability'],
    description: 'Magnetic constant',
  },
  {
    symbol: 'k_e',
    name: 'Coulomb Constant',
    value: 8.9875517923e9,
    unit: 'N*m^2/C^2',
    category: 'electromagnetic',
    aliases: ['k_coulomb'],
    description: '1/(4πε₀)',
  },

  // Atomic and Nuclear Constants
  {
    symbol: 'm_e',
    name: 'Electron Mass',
    value: 9.1093837015e-31,
    unit: 'kg',
    category: 'atomic',
    aliases: ['electron_mass'],
    description: 'Rest mass of electron',
  },
  {
    symbol: 'm_p',
    name: 'Proton Mass',
    value: 1.67262192369e-27,
    unit: 'kg',
    category: 'atomic',
    aliases: ['proton_mass'],
    description: 'Rest mass of proton',
  },
  {
    symbol: 'm_n',
    name: 'Neutron Mass',
    value: 1.67492749804e-27,
    unit: 'kg',
    category: 'atomic',
    aliases: ['neutron_mass'],
    description: 'Rest mass of neutron',
  },
  {
    symbol: 'u',
    name: 'Atomic Mass Unit',
    value: 1.66053906660e-27,
    unit: 'kg',
    category: 'atomic',
    aliases: ['amu', 'dalton'],
    description: 'Unified atomic mass unit',
  },
  {
    symbol: 'a_0',
    name: 'Bohr Radius',
    value: 5.29177210903e-11,
    unit: 'm',
    category: 'atomic',
    aliases: ['bohr_radius'],
    description: 'Radius of lowest hydrogen orbit',
  },

  // Physico-Chemical Constants
  {
    symbol: 'N_A',
    name: 'Avogadro Constant',
    value: 6.02214076e23,
    unit: '1/mol',
    category: 'physico-chemical',
    aliases: ['avogadro', 'L'],
    description: 'Number of entities per mole',
  },
  {
    symbol: 'k_B',
    name: 'Boltzmann Constant',
    value: 1.380649e-23,
    unit: 'J/K',
    category: 'physico-chemical',
    aliases: ['k_boltzmann'],
    description: 'Entropy per degree of freedom',
  },
  {
    symbol: 'R',
    name: 'Gas Constant',
    value: 8.314462618,
    unit: 'J/(mol*K)',
    category: 'physico-chemical',
    aliases: ['R_gas', 'molar_gas_constant'],
    description: 'Universal gas constant',
  },
  {
    symbol: 'σ',
    name: 'Stefan-Boltzmann Constant',
    value: 5.670374419e-8,
    unit: 'W/(m^2*K^4)',
    category: 'physico-chemical',
    aliases: ['sigma_sb', 'stefan_boltzmann'],
    description: 'Blackbody radiation constant',
  },

  // Mathematical Constants
  {
    symbol: 'π',
    name: 'Pi',
    value: 3.141592653589793,
    category: 'mathematical',
    aliases: ['pi'],
    description: 'Ratio of circumference to diameter',
    tolerance: 1e-10,
  },
  {
    symbol: 'e',
    name: "Euler's Number",
    value: 2.718281828459045,
    category: 'mathematical',
    aliases: ['euler'],
    description: 'Base of natural logarithm',
    tolerance: 1e-10,
  },
  {
    symbol: 'φ',
    name: 'Golden Ratio',
    value: 1.618033988749895,
    category: 'mathematical',
    aliases: ['phi', 'golden_ratio'],
    description: '(1 + √5)/2',
    tolerance: 1e-10,
  },
  {
    symbol: '√2',
    name: 'Square Root of 2',
    value: 1.4142135623730951,
    category: 'mathematical',
    aliases: ['sqrt2'],
    description: 'Pythagoras constant',
    tolerance: 1e-10,
  },

  // Engineering Constants
  {
    symbol: 'g',
    name: 'Standard Gravity',
    value: 9.80665,
    unit: 'm/s^2',
    category: 'engineering',
    aliases: ['g_0', 'gravity', 'g_n'],
    description: 'Standard acceleration due to gravity',
    tolerance: 0.01, // Allow 9.8, 9.81, etc.
  },
  {
    symbol: 'atm',
    name: 'Standard Atmosphere',
    value: 101325,
    unit: 'Pa',
    category: 'engineering',
    aliases: ['atmosphere', 'p_atm'],
    description: 'Standard atmospheric pressure',
  },
  {
    symbol: 'R_air',
    name: 'Gas Constant for Air',
    value: 287.058,
    unit: 'J/(kg*K)',
    category: 'engineering',
    aliases: ['R_specific_air'],
    description: 'Specific gas constant for dry air',
  },
];

/**
 * Check if units are compatible for constant matching
 * - If a unit is provided and constant has no unit, they are NOT compatible
 * - If a unit is provided and constant has a unit, they must match (normalized)
 * - If no unit is provided, always compatible
 */
function isUnitCompatible(providedUnit: string | undefined, constantUnit: string | undefined): boolean {
  // If no unit provided, compatible with anything
  if (!providedUnit) {
    return true;
  }

  // If unit provided but constant has no unit, NOT compatible
  // (e.g., π should not match when unit is 'm/s')
  if (!constantUnit) {
    return false;
  }

  // Both have units - compare normalized forms
  const normalizedProvided = providedUnit.replace(/\s+/g, '');
  const normalizedConstant = constantUnit.replace(/\s+/g, '');
  return normalizedProvided === normalizedConstant;
}

/**
 * Find a constant that matches the given value within tolerance
 */
export function findMatchingConstant(
  value: number,
  unit?: string,
  symbol?: string
): PhysicalConstant | null {
  // First, check if symbol matches any constant
  if (symbol) {
    const bySymbol = PHYSICAL_CONSTANTS.find(
      c => c.symbol === symbol ||
           c.aliases?.includes(symbol) ||
           c.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (bySymbol) {
      // Check unit compatibility first
      if (!isUnitCompatible(unit, bySymbol.unit)) {
        // Symbol matches but unit doesn't - don't return this match
        // Fall through to value-based matching
      } else {
        // Verify value is close
        const tolerance = bySymbol.tolerance || 1e-6;
        const relativeError = Math.abs(value - bySymbol.value) / Math.abs(bySymbol.value);
        if (relativeError < tolerance) {
          return bySymbol;
        }
      }
    }
  }

  // Then check by value match
  for (const constant of PHYSICAL_CONSTANTS) {
    // Check unit compatibility first
    if (!isUnitCompatible(unit, constant.unit)) {
      continue; // Unit incompatible, skip
    }

    const tolerance = constant.tolerance || 1e-6;

    // Handle very small numbers differently
    let matches = false;
    if (Math.abs(constant.value) < 1e-20 || Math.abs(value) < 1e-20) {
      // For very small numbers, use absolute tolerance
      matches = Math.abs(value - constant.value) < tolerance * Math.abs(constant.value);
    } else {
      // For normal numbers, use relative tolerance
      const relativeError = Math.abs(value - constant.value) / Math.abs(constant.value);
      matches = relativeError < tolerance;
    }

    if (matches) {
      return constant;
    }
  }

  return null;
}

/**
 * Get all constants in a category
 */
export function getConstantsByCategory(category: PhysicalConstant['category']): PhysicalConstant[] {
  return PHYSICAL_CONSTANTS.filter(c => c.category === category);
}

/**
 * Search constants by name or symbol
 */
export function searchConstants(query: string): PhysicalConstant[] {
  const q = query.toLowerCase();
  return PHYSICAL_CONSTANTS.filter(c =>
    c.symbol.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.aliases?.some(a => a.toLowerCase().includes(q)) ||
    c.description?.toLowerCase().includes(q)
  );
}

/**
 * Format constant for display
 */
export function formatConstantDisplay(constant: PhysicalConstant): string {
  const unit = constant.unit ? ` ${constant.unit}` : '';
  return `${constant.name} (${constant.symbol}) = ${constant.value}${unit}`;
}
