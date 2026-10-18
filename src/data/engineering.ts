/**
 * Discipline landing pages and worked examples.
 *
 * Every number in `examples` was evaluated by ProveCalc's own compute engine (SymPy + Pint), the
 * same engine the desktop app uses, from the givens listed with it. Change a given and the results
 * must be recomputed with the engine; never edit a result by hand.
 */

export type DisciplineSlug = "structural" | "mechanical" | "aerospace" | "civil";

export interface Given {
  symbol: string; // LaTeX
  label: string;
  value: string; // LaTeX, with units
}

export interface Step {
  label: string;
  equation: string; // LaTeX: the relation used
  result: string; // LaTeX: the engine's value
}

export interface WorkedExample {
  slug: string;
  title: string;
  /** The search phrasing the page answers, used for its <title>. */
  seoTitle: string;
  description: string;
  disciplines: DisciplineSlug[];
  course: string;
  problem: string;
  givens: Given[];
  steps: Step[];
  answer: string;
  /** What working it in ProveCalc catches or keeps that a hand or spreadsheet calc would not. */
  inProveCalc: string;
  keywords: string[];
}

export interface Discipline {
  slug: DisciplineSlug;
  name: string;
  seoTitle: string;
  description: string;
  headline: string;
  intro: string;
  calculations: string[];
  reasons: { title: string; body: string }[];
}

/** The product promise, worded once so every page says the same thing. */
export const OWNERSHIP_LINES = [
  {
    title: "Buy once, own it forever",
    body: "$200 one time. No subscription, no renewal, and the version you bought keeps working.",
  },
  {
    title: "No connection needed",
    body: "Works offline. The only network use is checking for updates and a one-time activation check.",
  },
  {
    title: "AI-native, never required",
    body: "The assistant drafts on the same worksheet you work on. You can do everything without it, and it never does the math: the engine does, with units, and checks it.",
  },
];

export const examples: WorkedExample[] = [
  {
    slug: "simply-supported-beam-bending-stress",
    title: "Simply supported beam: reactions, maximum moment and bending stress",
    seoTitle: "Simply Supported Beam with UDL and Point Load: Reactions, Max Moment, Bending Stress",
    description:
      "Worked example: a 6 m W310×39 steel beam with a 12 kN/m uniform load and a 30 kN point load. Reactions, location of zero shear, maximum moment and bending stress checked against 0.6·Fy.",
    disciplines: ["structural", "civil", "mechanical"],
    course: "Mechanics of Materials · Steel Design",
    problem:
      "A simply supported steel beam AB spans 6 m. It carries a uniformly distributed load of 12 kN/m over its full length (self-weight included) and a concentrated load of 30 kN at 2 m from support A. The beam is a W310×39 of ASTM A992 steel. Taking the allowable bending stress as 0.6·Fy, find the reactions, the maximum bending moment and where it occurs, and whether the beam is adequate in bending.",
    givens: [
      { symbol: "L", label: "Span", value: "6\\ \\mathrm{m}" },
      { symbol: "w", label: "Uniform load", value: "12\\ \\mathrm{kN/m}" },
      { symbol: "P", label: "Point load", value: "30\\ \\mathrm{kN}" },
      { symbol: "a", label: "Point load from A", value: "2\\ \\mathrm{m}" },
      { symbol: "S_x", label: "Section modulus, W310×39", value: "547 \\times 10^{3}\\ \\mathrm{mm^3}" },
      { symbol: "F_y", label: "Yield strength, A992", value: "345\\ \\mathrm{MPa}" },
    ],
    steps: [
      { label: "Moments about A give the reaction at B", equation: "R_B = \\dfrac{wL^2/2 + Pa}{L}", result: "R_B = 46\\ \\mathrm{kN}" },
      { label: "Vertical equilibrium gives the reaction at A", equation: "R_A = wL + P - R_B", result: "R_A = 56\\ \\mathrm{kN}" },
      { label: "Shear is zero beyond the point load, at", equation: "x_m = \\dfrac{R_A - P}{w}", result: "x_m = 2.167\\ \\mathrm{m}" },
      { label: "The moment there is the maximum", equation: "M_{max} = R_A x_m - \\dfrac{w x_m^2}{2} - P(x_m - a)", result: "M_{max} = 88.17\\ \\mathrm{kN\\cdot m}" },
      { label: "Bending stress from the elastic section modulus", equation: "\\sigma_{max} = \\dfrac{M_{max}}{S_x}", result: "\\sigma_{max} = 161.2\\ \\mathrm{MPa}" },
      { label: "Allowable bending stress", equation: "\\sigma_{allow} = 0.6\\,F_y", result: "\\sigma_{allow} = 207\\ \\mathrm{MPa}" },
    ],
    answer: "R_A = 56 kN, R_B = 46 kN, M_max = 88.17 kN·m at 2.17 m from A, and σ_max = 161.2 MPa < 207 MPa: the W310×39 is adequate in bending.",
    inProveCalc:
      "The free body diagram node solves the same reactions and draws the shear and moment diagrams, so the zero-shear location is checked two ways. Units carry through every line: kN·m divided by mm³ comes out in MPa without a conversion step to get wrong.",
    keywords: ["simply supported beam reactions", "maximum bending moment", "bending stress W shape", "beam with UDL and point load", "zero shear location"],
  },
  {
    slug: "cantilever-beam-tip-deflection",
    title: "Cantilever beam: tip deflection under a point load",
    seoTitle: "Cantilever Beam Deflection Example: Point Load at the Tip (PL³/3EI)",
    description:
      "Worked example: tip deflection and fixed-end moment of a 2.5 m steel cantilever with a 5 kN point load, using δ = PL³/3EI with units checked.",
    disciplines: ["mechanical", "structural"],
    course: "Mechanics of Materials",
    problem:
      "A steel cantilever 2.5 m long carries a 5 kN load at its free end. Its second moment of area is 8.5 × 10⁶ mm⁴ and E = 200 GPa. Find the tip deflection and the moment at the fixed end.",
    givens: [
      { symbol: "P", label: "Tip load", value: "5\\ \\mathrm{kN}" },
      { symbol: "L", label: "Length", value: "2.5\\ \\mathrm{m}" },
      { symbol: "E", label: "Elastic modulus", value: "200\\ \\mathrm{GPa}" },
      { symbol: "I", label: "Second moment of area", value: "8.5 \\times 10^{6}\\ \\mathrm{mm^4}" },
    ],
    steps: [
      { label: "Tip deflection of a cantilever with an end load", equation: "\\delta = \\dfrac{PL^3}{3EI}", result: "\\delta = 15.32\\ \\mathrm{mm}" },
      { label: "Moment at the fixed end", equation: "M_{max} = PL", result: "M_{max} = 12.5\\ \\mathrm{kN\\cdot m}" },
    ],
    answer: "The tip deflects 15.32 mm, and the fixed end carries 12.5 kN·m.",
    inProveCalc:
      "Mixing kN, m, GPa and mm⁴ is where hand calculations go wrong by a factor of a thousand. The engine converts every unit itself and reports the deflection in the unit you ask for.",
    keywords: ["cantilever beam deflection", "PL^3/3EI", "tip deflection point load", "cantilever deflection example"],
  },
  {
    slug: "euler-column-buckling-load",
    title: "Euler buckling load of a pinned column",
    seoTitle: "Euler Column Buckling Example: Critical Load and Factor of Safety",
    description:
      "Worked example: the Euler critical load of a 3 m pinned-pinned steel column, and its factor of safety against a 120 kN service load.",
    disciplines: ["structural", "mechanical", "aerospace"],
    course: "Mechanics of Materials · Structural Stability",
    problem:
      "A 3 m steel column is pinned at both ends (K = 1). Its least second moment of area is 2.5 × 10⁶ mm⁴ and E = 200 GPa. Find the Euler buckling load and the factor of safety for a 120 kN axial service load.",
    givens: [
      { symbol: "E", label: "Elastic modulus", value: "200\\ \\mathrm{GPa}" },
      { symbol: "I", label: "Least second moment of area", value: "2.5 \\times 10^{6}\\ \\mathrm{mm^4}" },
      { symbol: "K", label: "Effective length factor (pinned-pinned)", value: "1" },
      { symbol: "L", label: "Length", value: "3\\ \\mathrm{m}" },
      { symbol: "P_{service}", label: "Service load", value: "120\\ \\mathrm{kN}" },
    ],
    steps: [
      { label: "Euler critical load", equation: "P_{cr} = \\dfrac{\\pi^2 E I}{(KL)^2}", result: "P_{cr} = 548.3\\ \\mathrm{kN}" },
      { label: "Factor of safety against buckling", equation: "FS = \\dfrac{P_{cr}}{P_{service}}", result: "FS = 4.57" },
    ],
    answer: "P_cr = 548.3 kN, so the factor of safety against buckling is 4.57.",
    inProveCalc:
      "The effective length factor is a given you can change, so pinned, fixed and fixed-free cases are one edit apart, and every dependent result is marked stale until it is recomputed.",
    keywords: ["Euler buckling load", "column buckling example", "critical load formula", "effective length factor"],
  },
  {
    slug: "solid-shaft-torsion-shear-stress",
    title: "Solid shaft in torsion: torque, shear stress and angle of twist",
    seoTitle: "Shaft Torsion Example: Torque from Power and RPM, Shear Stress, Angle of Twist",
    description:
      "Worked example: a 30 mm solid steel shaft transmitting 15 kW at 1450 rpm. Torque from power, polar moment, maximum shear stress τ = Tc/J and angle of twist.",
    disciplines: ["mechanical", "aerospace"],
    course: "Mechanics of Materials · Machine Design",
    problem:
      "A 30 mm solid steel shaft (G = 80 GPa) transmits 15 kW at 1450 rpm. Over a length of 0.8 m, find the torque, the maximum shear stress and the angle of twist.",
    givens: [
      { symbol: "P", label: "Power", value: "15\\ \\mathrm{kW}" },
      { symbol: "n", label: "Speed", value: "1450\\ \\mathrm{rpm}" },
      { symbol: "d", label: "Diameter", value: "30\\ \\mathrm{mm}" },
      { symbol: "G", label: "Shear modulus", value: "80\\ \\mathrm{GPa}" },
      { symbol: "L", label: "Length", value: "0.8\\ \\mathrm{m}" },
    ],
    steps: [
      { label: "Torque from power and speed", equation: "T = \\dfrac{P}{\\omega}", result: "T = 98.79\\ \\mathrm{N\\cdot m}" },
      { label: "Polar moment of a solid shaft", equation: "J = \\dfrac{\\pi d^4}{32}", result: "J = 79\\,522\\ \\mathrm{mm^4}" },
      { label: "Maximum shear stress at the surface", equation: "\\tau_{max} = \\dfrac{T\\,(d/2)}{J}", result: "\\tau_{max} = 18.63\\ \\mathrm{MPa}" },
      { label: "Angle of twist", equation: "\\phi = \\dfrac{TL}{GJ}", result: "\\phi = 0.712^{\\circ}" },
    ],
    answer: "T = 98.79 N·m, τ_max = 18.63 MPa and the shaft twists 0.712° over 0.8 m.",
    inProveCalc:
      "Power over rpm only gives N·m once rpm is read as revolutions per minute in radians per second; the engine does that conversion itself, and the angle of twist comes out in degrees on request.",
    keywords: ["shaft torsion example", "torque from power and rpm", "shear stress Tc/J", "angle of twist", "polar moment of inertia solid shaft"],
  },
  {
    slug: "wing-lift-coefficient-cruise",
    title: "Lift coefficient needed at cruise",
    seoTitle: "Lift Coefficient Example: Required CL for Level Flight at Altitude",
    description:
      "Worked example: the lift coefficient a 1200 kg light aircraft needs for level flight at 65 m/s at 3000 m, from L = ½ρV²S·CL.",
    disciplines: ["aerospace"],
    course: "Introduction to Flight · Aircraft Performance",
    problem:
      "A 1200 kg light aircraft with a 16.2 m² wing cruises at 65 m/s at 3000 m, where the standard-atmosphere density is 0.9093 kg/m³. In level flight lift equals weight. Find the dynamic pressure and the lift coefficient required.",
    givens: [
      { symbol: "m", label: "Mass", value: "1200\\ \\mathrm{kg}" },
      { symbol: "g", label: "Gravity", value: "9.81\\ \\mathrm{m/s^2}" },
      { symbol: "\\rho", label: "Air density at 3000 m (ISA)", value: "0.9093\\ \\mathrm{kg/m^3}" },
      { symbol: "V", label: "True airspeed", value: "65\\ \\mathrm{m/s}" },
      { symbol: "S", label: "Wing area", value: "16.2\\ \\mathrm{m^2}" },
    ],
    steps: [
      { label: "Weight, which lift must equal", equation: "W = mg", result: "W = 11.77\\ \\mathrm{kN}" },
      { label: "Dynamic pressure", equation: "q = \\tfrac{1}{2}\\rho V^2", result: "q = 1921\\ \\mathrm{Pa}" },
      { label: "Required lift coefficient", equation: "C_L = \\dfrac{W}{qS}", result: "C_L = 0.378" },
    ],
    answer: "q = 1921 Pa and the wing needs C_L = 0.378 for level flight.",
    inProveCalc:
      "A lift coefficient is dimensionless, and the engine shows the units cancelling. Enter a density in the wrong unit and the result keeps leftover units instead of passing as a plausible number.",
    keywords: ["lift coefficient example", "required CL level flight", "dynamic pressure", "lift equation"],
  },
  {
    slug: "hydrostatic-force-on-vertical-gate",
    title: "Hydrostatic force on a vertical gate",
    seoTitle: "Hydrostatic Force on a Vertical Gate: Resultant and Center of Pressure",
    description:
      "Worked example: the resultant water force on a 3 m deep, 2 m wide vertical gate and where it acts, from the triangular pressure distribution.",
    disciplines: ["civil", "mechanical"],
    course: "Fluid Mechanics · Statics",
    problem:
      "Water stands 3 m deep against a vertical gate 2 m wide, with the free surface at the top of the gate. Taking the specific weight of water as 9.81 kN/m³, find the resultant force on the gate and its line of action.",
    givens: [
      { symbol: "\\gamma", label: "Specific weight of water", value: "9.81\\ \\mathrm{kN/m^3}" },
      { symbol: "h", label: "Depth of water", value: "3\\ \\mathrm{m}" },
      { symbol: "b", label: "Gate width", value: "2\\ \\mathrm{m}" },
    ],
    steps: [
      { label: "Resultant of the triangular pressure distribution", equation: "F_R = \\dfrac{\\gamma b h^2}{2}", result: "F_R = 88.29\\ \\mathrm{kN}" },
      { label: "It acts at the centroid of the pressure triangle, above the bottom", equation: "y_p = \\dfrac{h}{3}", result: "y_p = 1\\ \\mathrm{m}" },
    ],
    answer: "F_R = 88.29 kN, acting 1 m above the bottom of the gate (2 m below the surface).",
    inProveCalc:
      "The fluid pressure load in the free body diagram applies the same γ·depth pressure to the face and solves the gate's supports with it, so the resultant is checked against the hinge reactions.",
    keywords: ["hydrostatic force on a gate", "center of pressure", "fluid pressure on vertical surface", "resultant hydrostatic force"],
  },
  {
    slug: "plane-wall-conduction-heat-loss",
    title: "Heat loss by conduction through a plane wall",
    seoTitle: "Plane Wall Conduction Example: Heat Loss and Thermal Resistance",
    description:
      "Worked example: steady conduction through a 200 mm brick wall of 20 m² with a 25 K temperature difference, from Fourier's law, with the thermal resistance.",
    disciplines: ["mechanical", "civil"],
    course: "Heat Transfer",
    problem:
      "A brick wall 200 mm thick and 20 m² in area (k = 0.72 W/m·K) has a 25 K temperature difference across it. Assuming steady one-dimensional conduction, find the heat loss and the wall's thermal resistance.",
    givens: [
      { symbol: "k", label: "Thermal conductivity", value: "0.72\\ \\mathrm{W/(m\\cdot K)}" },
      { symbol: "A", label: "Area", value: "20\\ \\mathrm{m^2}" },
      { symbol: "L", label: "Thickness", value: "0.2\\ \\mathrm{m}" },
      { symbol: "\\Delta T", label: "Temperature difference", value: "25\\ \\mathrm{K}" },
    ],
    steps: [
      { label: "Fourier's law for a plane wall", equation: "q = \\dfrac{kA\\,\\Delta T}{L}", result: "q = 1800\\ \\mathrm{W}" },
      { label: "Thermal resistance of the wall", equation: "R_{th} = \\dfrac{L}{kA}", result: "R_{th} = 0.0139\\ \\mathrm{K/W}" },
    ],
    answer: "The wall loses 1800 W, and its thermal resistance is 0.0139 K/W.",
    inProveCalc:
      "Units carry through every line: W/(m·K) times m² times K over m comes out in watts, and the resistance in K/W, with no conversion step to get wrong.",
    keywords: ["plane wall conduction", "Fourier's law example", "heat loss through a wall", "thermal resistance"],
  },
];

export const disciplines: Discipline[] = [
  {
    slug: "structural",
    name: "Structural engineering",
    seoTitle: "Structural Engineering Calculation Software: Beams, Columns, Trusses",
    description:
      "Structural calculations in a reviewable worksheet: beams, columns, trusses and free body diagrams with units checked on every line. Buy once, works offline, AI optional.",
    headline: "Structural calcs another engineer can check line by line",
    intro:
      "Loads, reactions, member forces and code checks in one worksheet: every given, equation and intermediate value visible, every unit checked, and the result traceable when a reviewer asks where a number came from.",
    calculations: [
      "Beam reactions, shear and moment diagrams from a free body diagram",
      "Bending, shear and deflection checks against allowables",
      "Column buckling and effective length",
      "Plane and space trusses by the method of joints",
      "Section properties: centroids and moments of inertia of composite shapes, steel W, C, L and HSS shapes",
      "Distributed and hydrostatic loads on bodies",
    ],
    reasons: [
      { title: "A calculation package, not a spreadsheet", body: "Reviewers read the equations, not cell references. Export the worksheet to PDF, Word or HTML for submittals." },
      { title: "Units that cannot drift", body: "kN, m, MPa and mm⁴ mix freely; the engine converts and flags anything dimensionally wrong before it reaches a drawing." },
      { title: "Diagrams that solve themselves", body: "Draw supports and loads; the engine solves the reactions and draws V and M, and reports a statically indeterminate or unstable structure instead of guessing." },
    ],
  },
  {
    slug: "mechanical",
    name: "Mechanical engineering",
    seoTitle: "Mechanical Engineering Calculation Software: Stress, Shafts, Heat Transfer",
    description:
      "Mechanical engineering calculations with units checked: stress and deflection, shafts in torsion, friction, fluids and heat transfer. Buy once, works offline, AI optional.",
    headline: "Mechanical calcs with the units checked for you",
    intro:
      "From a shaft sized for power and speed to a wall's heat loss, ProveCalc keeps the givens, the relations and the results on one worksheet and checks the units at every step, so a calculation reads like the hand calc it replaces.",
    calculations: [
      "Stress, strain and deflection of beams and members",
      "Shafts in torsion: torque from power and speed, shear stress, twist",
      "Dry friction, wedges, belt friction and band brakes",
      "Fluid statics and pressure on surfaces",
      "Conduction and thermal resistance",
      "Vectors: moments, forces along lines, dot and cross products with units",
    ],
    reasons: [
      { title: "rpm, kW and N·m without conversion slips", body: "The engine handles rotational units, temperature differences and mixed systems, and reports results in the unit you ask for." },
      { title: "Solve for any unknown", body: "State the relation once and solve it for whichever variable you need, symbolically or numerically, with the solve recorded." },
      { title: "Yours to keep", body: "$200 once, offline, with worksheets as open files on your machine. No subscription for a tool you use every week." },
    ],
  },
  {
    slug: "aerospace",
    name: "Aerospace engineering",
    seoTitle: "Aerospace Engineering Calculation Software: Performance, Loads, Structures",
    description:
      "Aerospace calculations in a unit-checked worksheet: lift and drag, flight performance, buckling and torsion of thin structures. Buy once, works offline, AI optional.",
    headline: "Aerospace calcs where every unit is accounted for",
    intro:
      "Performance and loads work mixes SI, imperial and atmospheric data. ProveCalc keeps every quantity with its unit, confirms that coefficients really are dimensionless, and leaves a worksheet you can hand to a reviewer.",
    calculations: [
      "Lift, drag and required lift coefficient at a flight condition",
      "Dynamic pressure and airspeed at altitude",
      "Column buckling and effective length",
      "Torsion of shafts: torque, shear stress and twist",
      "Vector moments and forces in three dimensions",
      "Space trusses, solved joint by joint and drawn in 3D",
    ],
    reasons: [
      { title: "Dimensionless means dimensionless", body: "Every result carries its units, so a CL or a factor of safety that comes out with leftover units is visible at once instead of passing as a plausible number." },
      { title: "Works where you work", body: "Offline by design: the calculation never leaves your machine, which matters for controlled data." },
      { title: "AI that drafts, not decides", body: "Ask the assistant to set up a calculation from a sketch or a problem statement; it proposes worksheet steps you review, and the engine computes them." },
    ],
  },
  {
    slug: "civil",
    name: "Civil engineering",
    seoTitle: "Civil Engineering Calculation Software: Loads, Beams, Hydrostatics",
    description:
      "Civil engineering calculations with traceable steps and checked units: loads, beams, retaining and hydrostatic forces, heat loss. Buy once, works offline, AI optional.",
    headline: "Civil calcs that hold up in review",
    intro:
      "Tributary loads, beam checks and hydrostatic forces in one worksheet, with assumptions written down next to the numbers they affect and every unit checked by the engine.",
    calculations: [
      "Load takedown and tributary areas",
      "Beam reactions, moments and bending checks",
      "Hydrostatic forces on gates and walls",
      "Centroids and moments of inertia of sections",
      "Heat loss through building assemblies",
      "Unit-aware solving for any unknown",
    ],
    reasons: [
      { title: "Assumptions on the record", body: "Assumptions live in a ledger next to the calculation, where a reviewer sees them with the numbers they affect." },
      { title: "Exports for submittals", body: "Print or export to PDF, Word or HTML with the steps and units intact." },
      { title: "No license server", body: "Buy once and it keeps working offline; the only network use is checking for updates and a one-time activation check." },
    ],
  },
];

export function examplesFor(discipline: DisciplineSlug): WorkedExample[] {
  return examples.filter((example) => example.disciplines.includes(discipline));
}

export const SITE = "https://provecalc.com";
