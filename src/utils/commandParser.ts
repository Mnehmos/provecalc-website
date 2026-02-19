/**
 * Command Parser - Extract and validate AI commands from chat responses
 *
 * Parses JSON code blocks from AI responses and validates them
 * against the command protocol schema.
 */

import type { WorksheetCommand, CommandBatch } from '../types/commands';

const VALID_ACTIONS = new Set([
  'add_given', 'add_equation', 'add_constraint', 'add_solve_goal',
  'add_text', 'add_annotation', 'update_node', 'delete_node',
  'add_assumption', 'remove_assumption', 'verify_node', 'verify_all',
]);

/** Extract JSON code blocks from markdown text */
function extractJsonBlocks(text: string): string[] {
  const blocks: string[] = [];
  const regex = /```(?:json)?\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

/** Validate a single command object has required fields */
function validateCommand(obj: Record<string, unknown>): WorksheetCommand | null {
  const action = obj.action;
  if (typeof action !== 'string' || !VALID_ACTIONS.has(action)) {
    return null;
  }

  switch (action) {
    case 'add_given':
      if (typeof obj.symbol !== 'string' || typeof obj.value !== 'number') return null;
      break;
    case 'add_equation':
      if (typeof obj.latex !== 'string' || typeof obj.lhs !== 'string' || typeof obj.rhs !== 'string') return null;
      break;
    case 'add_constraint':
      if (typeof obj.latex !== 'string' || typeof obj.sympy !== 'string') return null;
      break;
    case 'add_solve_goal':
      if (typeof obj.target !== 'string') return null;
      break;
    case 'add_text':
    case 'add_annotation':
      if (typeof obj.content !== 'string') return null;
      break;
    case 'update_node':
      if (typeof obj.node_id !== 'string' || typeof obj.updates !== 'object' || !obj.updates) return null;
      break;
    case 'delete_node':
      if (typeof obj.node_id !== 'string') return null;
      break;
    case 'add_assumption':
      if (typeof obj.statement !== 'string') return null;
      break;
    case 'remove_assumption':
      if (typeof obj.assumption_id !== 'string') return null;
      break;
    case 'verify_node':
      if (typeof obj.node_id !== 'string') return null;
      break;
    case 'verify_all':
      break;
  }

  return obj as unknown as WorksheetCommand;
}

/** Parse AI response text and extract valid commands */
export function parseCommands(responseText: string): CommandBatch {
  const jsonBlocks = extractJsonBlocks(responseText);
  const commands: WorksheetCommand[] = [];

  for (const block of jsonBlocks) {
    try {
      const parsed = JSON.parse(block);

      // Handle batch format: { commands: [...] }
      if (parsed.commands && Array.isArray(parsed.commands)) {
        for (const cmd of parsed.commands) {
          const valid = validateCommand(cmd);
          if (valid) commands.push(valid);
        }
        continue;
      }

      // Handle single command: { action: "..." }
      if (parsed.action) {
        const valid = validateCommand(parsed);
        if (valid) commands.push(valid);
        continue;
      }

      // Handle array of commands: [{ action: "..." }, ...]
      if (Array.isArray(parsed)) {
        for (const cmd of parsed) {
          const valid = validateCommand(cmd);
          if (valid) commands.push(valid);
        }
      }
    } catch {
      // Skip malformed JSON blocks
    }
  }

  return { commands };
}

/** Check if a response contains any commands */
export function hasCommands(responseText: string): boolean {
  return parseCommands(responseText).commands.length > 0;
}

/** Strip command blocks from response, leaving only explanation text */
export function stripCommandBlocks(text: string): string {
  return text.replace(/```(?:json)?\s*\n[\s\S]*?\n```/g, '').trim();
}
