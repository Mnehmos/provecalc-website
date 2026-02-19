/**
 * History slice — WEB VERSION
 *
 * Uses in-memory document snapshots for undo/redo.
 * No Tauri backend needed.
 */

import { logger, startTimer } from '../../utils/logger';
import type { WorksheetDocument } from '../../types/document';
import type { SliceCreator } from './types';

const MAX_HISTORY = 50;

// Module-level snapshot stacks (not part of Zustand state to avoid infinite loops)
let undoStack: string[] = [];
let redoStack: string[] = [];

export function pushSnapshot(doc: WorksheetDocument | null) {
  if (!doc) return;
  undoStack.push(JSON.stringify(doc));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = []; // Clear redo on new action
}

export interface HistorySlice {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export const createHistorySlice: SliceCreator<HistorySlice> = (set, get) => ({
  undo: async () => {
    const timer = startTimer('undo', 'store');
    logger.store.action('documentStore', 'undo');

    if (undoStack.length === 0) {
      timer.complete({ applied: false, reason: 'nothing to undo' });
      return;
    }

    // Save current state to redo stack
    const currentDoc = get().document;
    if (currentDoc) {
      redoStack.push(JSON.stringify(currentDoc));
    }

    const snapshot = undoStack.pop()!;
    const doc: WorksheetDocument = JSON.parse(snapshot);

    set((draft) => {
      draft.document = doc;
      draft.isDirty = true;
    });

    timer.complete({ applied: true });
  },

  redo: async () => {
    const timer = startTimer('redo', 'store');
    logger.store.action('documentStore', 'redo');

    if (redoStack.length === 0) {
      timer.complete({ applied: false, reason: 'nothing to redo' });
      return;
    }

    // Save current state to undo stack
    const currentDoc = get().document;
    if (currentDoc) {
      undoStack.push(JSON.stringify(currentDoc));
    }

    const snapshot = redoStack.pop()!;
    const doc: WorksheetDocument = JSON.parse(snapshot);

    set((draft) => {
      draft.document = doc;
      draft.isDirty = true;
    });

    timer.complete({ applied: true });
  },
});
