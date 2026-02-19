/**
 * File operations slice — WEB VERSION
 *
 * Uses localStorage for persistence and browser APIs for import/export.
 * No Tauri dependencies.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger, startTimer } from '../../utils/logger';
import type { WorksheetDocument, NodeId } from '../../types/document';
import type { SliceCreator } from './types';

const STORAGE_PREFIX = 'provecalc:doc:';
const STORAGE_INDEX = 'provecalc:docs:index';
const SCHEMA_VERSION = 1;

interface StoredDocument {
  schemaVersion: number;
  document: WorksheetDocument;
  savedAt: string;
}

function createEmptyDocument(name: string): WorksheetDocument {
  return {
    id: uuidv4(),
    name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: '1.0.0',
    nodes: [],
    assumptions: [],
    history: [],
    current_history_id: '',
    audit_trail: [],
    metadata: {},
  };
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface FileSlice {
  filePath: string | null;
  isDirty: boolean;

  saveDocument: () => Promise<boolean>;
  saveDocumentAs: () => Promise<boolean>;
  openDocument: () => Promise<boolean>;
  exportToJson: () => Promise<boolean>;
  exportToHtml: () => Promise<boolean>;
  exportToWord: () => Promise<boolean>;
  exportForAI: (options?: { compact?: boolean; focusNodeId?: NodeId }) => Promise<boolean>;
  markDirty: () => void;
  clearDirty: () => void;
  checkUnsavedChanges: () => Promise<boolean>;
  loadDocument: () => Promise<void>;
  createDocument: (name: string) => Promise<boolean>;
}

export const createFileSlice: SliceCreator<FileSlice> = (set, get) => {
  const saveToLocalStorage = (doc: WorksheetDocument) => {
    const stored: StoredDocument = {
      schemaVersion: SCHEMA_VERSION,
      document: doc,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${doc.id}`, JSON.stringify(stored));
      // Update index
      const indexStr = localStorage.getItem(STORAGE_INDEX);
      const index: Record<string, { name: string; savedAt: string }> = indexStr ? JSON.parse(indexStr) : {};
      index[doc.id] = { name: doc.name, savedAt: stored.savedAt };
      localStorage.setItem(STORAGE_INDEX, JSON.stringify(index));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Try deleting old documents.');
      }
      throw e;
    }
  };

  const loadFromLocalStorage = (docId: string): WorksheetDocument | null => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${docId}`);
      if (!raw) return null;
      const stored: StoredDocument = JSON.parse(raw);
      return stored.document;
    } catch {
      return null;
    }
  };

  return {
    filePath: null,
    isDirty: false,

    saveDocument: async () => {
      const timer = startTimer('saveDocument', 'store');
      const doc = get().document;
      if (!doc) {
        timer.complete({ skipped: 'no document' });
        return false;
      }

      try {
        // Touch metadata on save
        saveToLocalStorage(doc);
        set((draft) => { draft.isDirty = false; draft.filePath = doc.id; });
        timer.complete({ docId: doc.id });
        return true;
      } catch (e) {
        timer.error(e);
        set((draft) => { draft.error = String(e); });
        return false;
      }
    },

    saveDocumentAs: async () => {
      // For web, save == saveAs (localStorage)
      return get().saveDocument();
    },

    openDocument: async () => {
      const timer = startTimer('openDocument', 'store');
      logger.store.action('documentStore', 'openDocument');

      const canProceed = await get().checkUnsavedChanges();
      if (!canProceed) {
        timer.complete({ cancelled: true });
        return false;
      }

      return new Promise<boolean>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.pvc';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            timer.complete({ cancelled: true });
            resolve(false);
            return;
          }

          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            // Handle both raw document and StoredDocument wrapper
            const doc: WorksheetDocument = parsed.document || parsed;

            if (!doc.id || !doc.nodes) {
              throw new Error('Invalid document format');
            }

            set((draft) => {
              draft.document = doc;
              draft.filePath = doc.id;
              draft.isDirty = false;
              draft.selectedNodeId = null;
            });

            timer.complete({ nodeCount: doc.nodes.length });
            resolve(true);
          } catch (e) {
            timer.error(e);
            set((draft) => { draft.error = String(e); });
            resolve(false);
          }
        };
        input.click();
      });
    },

    exportToJson: async () => {
      const timer = startTimer('exportToJson', 'store');
      const doc = get().document;
      if (!doc) {
        timer.complete({ skipped: 'no document' });
        return false;
      }

      try {
        const json = JSON.stringify(doc, null, 2);
        downloadBlob(json, `${doc.name || 'Untitled'}.json`, 'application/json');
        timer.complete({});
        return true;
      } catch (e) {
        timer.error(e);
        return false;
      }
    },

    exportToHtml: async () => {
      const timer = startTimer('exportToHtml', 'store');
      const doc = get().document;
      if (!doc) {
        timer.complete({ skipped: 'no document' });
        return false;
      }

      try {
        const { exportToHtml: generateHtml } = await import('../../utils/htmlExport');
        const html = generateHtml(doc, {
          standalone: true,
          showVerification: true,
          showAssumptions: true,
          theme: 'light',
        });
        downloadBlob(html, `${doc.name || 'Untitled'}.html`, 'text/html');
        timer.complete({});
        return true;
      } catch (e) {
        timer.error(e);
        return false;
      }
    },

    exportToWord: async () => {
      const timer = startTimer('exportToWord', 'store');
      const doc = get().document;
      if (!doc) {
        timer.complete({ skipped: 'no document' });
        return false;
      }

      try {
        const { exportDocx } = await import('../../services/computeService');
        const result = await exportDocx(doc.name, doc.nodes, doc.assumptions);
        if (result.success && result.data) {
          // Download base64 docx
          const binary = atob(result.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${doc.name || 'Untitled'}.docx`;
          a.click();
          URL.revokeObjectURL(url);
          timer.complete({});
          return true;
        }
        throw new Error(result.error || 'Export failed');
      } catch (e) {
        timer.error(e);
        set((draft) => { draft.error = String(e); });
        return false;
      }
    },

    exportForAI: async (options) => {
      const timer = startTimer('exportForAI', 'store');
      const doc = get().document;
      if (!doc) {
        timer.complete({ skipped: 'no document' });
        return false;
      }

      try {
        const { buildAIContext, buildCompactAIContext } = await import('../../utils/aiContext');
        const focusNodeId = options?.focusNodeId ?? get().selectedNodeId ?? undefined;
        const context = options?.compact
          ? buildCompactAIContext(doc, { focusNodeId })
          : buildAIContext(doc, { focusNodeId, entryPoint: 'chat' });
        await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
        timer.complete({ compact: !!options?.compact });
        return true;
      } catch (e) {
        timer.error(e);
        return false;
      }
    },

    markDirty: () => {
      set((draft) => { draft.isDirty = true; });
    },

    clearDirty: () => {
      set((draft) => { draft.isDirty = false; });
    },

    checkUnsavedChanges: async () => {
      const state = get();
      if (!state.isDirty) return true;
      return window.confirm('You have unsaved changes. Continue without saving?');
    },

    loadDocument: async () => {
      const timer = startTimer('loadDocument', 'store');
      logger.store.action('documentStore', 'loadDocument');
      set((draft) => { draft.isLoading = true; draft.error = null; });

      try {
        // Try to load the most recently saved document from localStorage
        const indexStr = localStorage.getItem(STORAGE_INDEX);
        if (indexStr) {
          const index: Record<string, { name: string; savedAt: string }> = JSON.parse(indexStr);
          const entries = Object.entries(index).sort((a, b) =>
            new Date(b[1].savedAt).getTime() - new Date(a[1].savedAt).getTime()
          );
          if (entries.length > 0) {
            const doc = loadFromLocalStorage(entries[0][0]);
            if (doc) {
              set((draft) => {
                draft.document = doc;
                draft.filePath = doc.id;
                draft.isLoading = false;
              });
              timer.complete({ nodeCount: doc.nodes.length, loaded: true });
              return;
            }
          }
        }

        // No saved document — create a new one
        const doc = createEmptyDocument('Untitled');
        set((draft) => {
          draft.document = doc;
          draft.isLoading = false;
        });
        timer.complete({ nodeCount: 0, created: true });
      } catch (e) {
        timer.error(e);
        const doc = createEmptyDocument('Untitled');
        set((draft) => {
          draft.document = doc;
          draft.error = String(e);
          draft.isLoading = false;
        });
      }
    },

    createDocument: async (name: string) => {
      const timer = startTimer('createDocument', 'store');
      logger.store.action('documentStore', 'createDocument', { name });

      const canProceed = await get().checkUnsavedChanges();
      if (!canProceed) {
        timer.complete({ cancelled: true });
        return false;
      }

      const doc = createEmptyDocument(name);
      set((draft) => {
        draft.document = doc;
        draft.selectedNodeId = null;
        draft.filePath = null;
        draft.isDirty = false;
      });
      timer.complete({ name });
      return true;
    },
  };
};
