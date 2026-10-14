/**
 * AI Suggestion Parser
 *
 * Parses LLM responses to extract structured ProveCalc suggestions.
 * Suggestions are embedded in JSON code blocks within the response.
 *
 * Expected format in AI response:
 * ```provecalc
 * { "type": "node", "preview": {...}, "node": {...}, "confidence": 0.9 }
 * ```
 */

import { v4 as uuidv4 } from 'uuid';
import type { AISuggestion, ParsedAIResponse } from '../types/ai';

/** Regex to match provecalc-tagged code blocks */
const PROVECALC_BLOCK_RE = /```provecalc\s*\n([\s\S]*?)```/g;

/** Regex to match generic JSON code blocks as fallback */
const JSON_BLOCK_RE = /```json\s*\n([\s\S]*?)```/g;

/**
 * Parse an AI response string to extract text and structured suggestions.
 *
 * Looks for ```provecalc code blocks first, then falls back to ```json blocks
 * that contain ProveCalc suggestion objects.
 */
export function parseAIResponse(response: string): ParsedAIResponse {
  const suggestions: AISuggestion[] = [];
  let text = response;

  // Extract provecalc blocks
  const provecalcMatches = [...response.matchAll(PROVECALC_BLOCK_RE)];
  for (const match of provecalcMatches) {
    const parsed = tryParseSuggestion(match[1]);
    if (parsed) {
      suggestions.push(parsed);
      text = text.replace(match[0], '');
    }
  }

  // If no provecalc blocks, try json blocks
  if (suggestions.length === 0) {
    const jsonMatches = [...response.matchAll(JSON_BLOCK_RE)];
    for (const match of jsonMatches) {
      const parsed = tryParseSuggestion(match[1]);
      if (parsed) {
        suggestions.push(parsed);
        text = text.replace(match[0], '');
      }
    }
  }

  // Some models write the suggestion as bare JSON in the prose, without a code fence.
  if (suggestions.length === 0) {
    for (const raw of bareJsonObjects(text)) {
      const parsed = tryParseSuggestion(raw);
      if (parsed) {
        suggestions.push(parsed);
        text = text.replace(raw, '');
      }
    }
  }

  // Clean up extra whitespace from removed blocks
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return { text, suggestions };
}

/**
 * The JSON objects written straight into the text that look like suggestions (`{"type": ...`): each
 * from its opening brace to the matching closing one, braces inside strings ignored.
 */
export function bareJsonObjects(text: string): string[] {
  const found: string[] = [];
  const start = /\{\s*"type"\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = start.exec(text)) !== null) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = match.index; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          found.push(text.slice(match.index, index + 1));
          start.lastIndex = index + 1;
          break;
        }
      }
    }
  }
  return found;
}

/**
 * Try to parse a JSON string as an AISuggestion.
 * Returns null if the JSON is not a valid suggestion.
 */
function tryParseSuggestion(jsonStr: string): AISuggestion | null {
  try {
    const obj = JSON.parse(jsonStr.trim());

    // Must have a type field matching our suggestion types
    if (!obj || typeof obj !== 'object' || !obj.type) return null;

    const validTypes = ['node', 'node_group', 'assumption', 'explanation'];
    if (!validTypes.includes(obj.type)) return null;

    // Ensure it has an ID
    if (!obj.id) obj.id = uuidv4();
    // Default confidence
    if (typeof obj.confidence !== 'number') obj.confidence = 0.5;

    // Type-specific validation
    switch (obj.type) {
      case 'node':
        if (!obj.node || typeof obj.node !== 'object') return null;
        // A missing description should not throw the node away: name it after what it is.
        if (!obj.preview?.description) obj.preview = { ...(obj.preview ?? {}), description: `Add ${obj.node.type ?? 'a node'}` };
        break;
      case 'node_group':
        if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) return null;
        if (!obj.preview?.title) obj.preview = { ...(obj.preview ?? {}), title: 'Insert these nodes' };
        if (!Array.isArray(obj.preview.nodes)) obj.preview.nodes = obj.nodes.map((node: { type?: string }) => String(node?.type ?? 'node'));
        if (!obj.insertOrder) obj.insertOrder = 'sequential';
        break;
      case 'assumption':
        if (!obj.preview?.statement || !obj.assumption) return null;
        break;
      case 'explanation':
        if (typeof obj.content !== 'string') return null;
        break;
      default:
        return null;
    }

    return obj as AISuggestion;
  } catch {
    return null;
  }
}

/**
 * Check if a response contains any ProveCalc suggestions.
 * Useful for quick detection without full parsing.
 */
export function hasSuggestions(response: string): boolean {
  // Use non-global regexes for test() to avoid lastIndex state issues
  return /```provecalc\s*\n/.test(response) || /```json\s*\n/.test(response);
}
