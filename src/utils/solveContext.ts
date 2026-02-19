import type { EquationNode, WorksheetDocument } from '../types/document';
import { extractVariables, getEquationExtractionExpression } from './mathParsing';

export interface KnownSymbol {
  symbol: string;
  value: number;
  unit?: string;
  nodeId: string;
  source: 'given' | 'result';
}

/**
 * Extract known symbols from both Given and Result nodes.
 *
 * Precedence rule:
 * - Result nodes provide fallback values.
 * - Given nodes override Result values with the same symbol.
 */
export function extractKnownSymbols(document: WorksheetDocument | null | undefined): KnownSymbol[] {
  if (!document) return [];

  const bySymbol = new Map<string, KnownSymbol>();

  for (const node of document.nodes) {
    if (node.type !== 'result') continue;
    bySymbol.set(node.symbol, {
      symbol: node.symbol,
      value: node.value.value,
      unit: node.value.unit?.expression,
      nodeId: node.id,
      source: 'result',
    });
  }

  for (const node of document.nodes) {
    if (node.type !== 'given') continue;
    bySymbol.set(node.symbol, {
      symbol: node.symbol,
      value: node.value.value,
      unit: node.value.unit?.expression,
      nodeId: node.id,
      source: 'given',
    });
  }

  return [...bySymbol.values()];
}

export function extractKnownSymbolTable(document: WorksheetDocument | null | undefined): Record<string, { value: number; unit?: string }> {
  const table: Record<string, { value: number; unit?: string }> = {};
  for (const entry of extractKnownSymbols(document)) {
    table[entry.symbol] = { value: entry.value, unit: entry.unit };
  }
  return table;
}

export function getKnownSymbolSet(document: WorksheetDocument | null | undefined): Set<string> {
  return new Set(extractKnownSymbols(document).map((s) => s.symbol));
}

/**
 * Get node IDs that provide the listed symbols (using known-symbol precedence).
 */
export function getInputSymbolNodeIds(
  document: WorksheetDocument | null | undefined,
  symbols: string[],
  excludeSymbol?: string,
): string[] {
  const bySymbol = new Map(extractKnownSymbols(document).map((entry) => [entry.symbol, entry]));
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const symbol of symbols) {
    if (!symbol || symbol === excludeSymbol) continue;
    const entry = bySymbol.get(symbol);
    if (!entry) continue;
    if (seen.has(entry.nodeId)) continue;
    ids.push(entry.nodeId);
    seen.add(entry.nodeId);
  }

  return ids;
}

export function getEquationVariables(equation: EquationNode): string[] {
  return extractVariables(getEquationExtractionExpression(equation));
}

export function buildContributingNodeIds(
  document: WorksheetDocument | null | undefined,
  equationNodeId: string | undefined,
  equationVariables: string[],
  targetSymbol: string,
): string[] {
  const ids: string[] = [];
  if (equationNodeId) ids.push(equationNodeId);
  ids.push(...getInputSymbolNodeIds(document, equationVariables, targetSymbol));
  return [...new Set(ids)];
}

function normalizeUnitToken(token: string): string {
  return token
    .trim()
    .replace(/\s+/g, '')
    .replace(/\*\*/g, '^')
    .replace(/[\u00B7\u22C5\u00D7]/g, '*')
    .replace(/\u00B2/g, '^2')
    .replace(/\u00B3/g, '^3')
    .replace(/\u2074/g, '^4')
    .replace(/\u2212/g, '-')
    .replace(/^-+/, '');
}

function simplifyAdditiveUnitExpression(expression: string): string {
  const compact = expression.trim();
  if (!/[+-]/.test(compact)) return compact;

  const terms = compact
    .replace(/[()]/g, ' ')
    .split(/[+-]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (terms.length < 2) return compact;

  const normalizedTerms = terms.map(normalizeUnitToken);
  if (!normalizedTerms[0]) return compact;

  const allSame = normalizedTerms.every((term) => term === normalizedTerms[0]);
  return allSame ? terms[0].replace(/^-+/, '') : compact;
}

/**
 * Normalize solve-response unit strings for display/storage.
 */
export function normalizeSolveUnit(rawUnit?: string): string | undefined {
  if (!rawUnit) return undefined;
  const rhsMatch = rawUnit.match(/=\s*(.+)$/);
  const base = rhsMatch ? rhsMatch[1].trim() : rawUnit.trim();
  if (!base) return undefined;

  const simplified = simplifyAdditiveUnitExpression(base);

  return simplified
    .replace(/[()]/g, '')
    .replace(/\*\*/g, '^')
    .replace(/\s*\*\s*/g, '\u00B7')
    .replace(/\s+/g, ' ')
    .trim();
}
