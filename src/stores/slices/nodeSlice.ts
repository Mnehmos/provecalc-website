/**
 * Node operations slice — WEB VERSION
 *
 * All operations are pure Zustand mutations. No backend calls needed.
 * The document lives entirely in client memory + localStorage.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger, startTimer } from '../../utils/logger';
import type { WorksheetNode, NodeId, NodePosition, Provenance, VerificationStatus } from '../../types/document';
import type { SliceCreator } from './types';
import type { NodeType } from './helpers';
import {
  createTextNode,
  createGivenNode,
  createEquationNode,
  createConstraintNode,
  createSolveGoalNode,
  createPlotNode,
  handleDuplicateSymbol,
  requireLoadedDocument,
} from './helpers';

export interface NodeSlice {
  selectedNodeId: NodeId | null;

  addNode: (type: NodeType, position?: NodePosition) => Promise<void>;
  insertNode: (node: WorksheetNode, index?: number) => Promise<void>;
  updateNode: (nodeId: NodeId, updates: Partial<WorksheetNode>) => Promise<void>;
  deleteNode: (nodeId: NodeId) => Promise<void>;
  duplicateNode: (nodeId: NodeId) => Promise<void>;
  selectNode: (nodeId: NodeId | null) => void;
  updateNodePosition: (nodeId: NodeId, position: NodePosition) => void;
  updateDocumentName: (name: string) => void;
}

export const createNodeSlice: SliceCreator<NodeSlice> = (set, get) => ({
  selectedNodeId: null,

  addNode: async (type: NodeType, position?: NodePosition) => {
    const timer = startTimer('addNode', 'store');
    logger.store.action('documentStore', 'addNode', { type, position });
    let node: WorksheetNode;
    const pos = position || { x: 100, y: 100 };
    const currentDoc = get().document;
    let symbolRenames = new Map<string, string>();

    switch (type) {
      case 'text':
        node = createTextNode('Enter text...', pos);
        break;
      case 'given': {
        const { newSymbol, renames } = handleDuplicateSymbol(currentDoc, 'x');
        symbolRenames = renames;
        node = createGivenNode(newSymbol, 0, undefined, pos);
        break;
      }
      case 'equation':
        node = createEquationNode('y = mx + b', 'y', 'mx + b', pos);
        break;
      case 'constraint':
        node = createConstraintNode('x > 0', 'x > 0', pos);
        break;
      case 'solve_goal':
        node = createSolveGoalNode('x', 'auto', pos);
        break;
      case 'plot':
        node = createPlotNode('x^2', 'x', -10, 10, pos);
        break;
      default:
        return;
    }

    set((draft) => {
      if (!draft.document) return;

      // Apply symbol renames
      for (const [nodeId, newSymbol] of symbolRenames) {
        const existingNode = draft.document.nodes.find(n => n.id === nodeId);
        if (existingNode && existingNode.type === 'given') {
          (existingNode as { symbol: string }).symbol = newSymbol;
        }
      }

      // Insert node
      draft.document.nodes.push(node);
      draft.selectedNodeId = node.id;
      draft.isDirty = true;
    });

    logger.document.nodeAdded(node.id, type);
    timer.complete({ nodeId: node.id, type, renames: symbolRenames.size });
  },

  insertNode: async (node: WorksheetNode, index?: number) => {
    const timer = startTimer('insertNode', 'store');
    logger.store.action('documentStore', 'insertNode', { nodeType: node.type, index });

    set((draft) => {
      if (!draft.document) return;
      if (index !== undefined && index >= 0) {
        draft.document.nodes.splice(index, 0, node);
      } else {
        draft.document.nodes.push(node);
      }
      draft.isDirty = true;
    });

    timer.complete({ nodeId: node.id });
  },

  updateNode: async (nodeId: NodeId, updates: Partial<WorksheetNode>) => {
    const timer = startTimer('updateNode', 'store');
    logger.store.action('documentStore', 'updateNode', { nodeId, fields: Object.keys(updates) });
    if (!requireLoadedDocument(() => get().document, timer, { nodeId })) return;

    set((draft) => {
      if (!draft.document) return;
      const node = draft.document.nodes.find(n => n.id === nodeId);
      if (node) {
        Object.assign(node, updates);
        draft.isDirty = true;
      }
    });

    logger.document.nodeUpdated(nodeId, Object.keys(updates));
    timer.complete({ nodeId });
  },

  deleteNode: async (nodeId: NodeId) => {
    const timer = startTimer('deleteNode', 'store');
    logger.store.action('documentStore', 'deleteNode', { nodeId });

    const currentDoc = requireLoadedDocument(() => get().document, timer, { nodeId });
    if (!currentDoc) return;

    const nodeToDelete = currentDoc.nodes.find(n => n.id === nodeId);
    const dependentNodes = currentDoc.nodes.filter(n =>
      n.provenance?.type === 'computed' &&
      (n.provenance as { from_nodes?: string[] }).from_nodes?.includes(nodeId)
    );

    if (dependentNodes.length > 0) {
      const nodeSymbol = (nodeToDelete as { symbol?: string })?.symbol || 'this node';
      const dependentList = dependentNodes
        .map(n => (n as { symbol?: string }).symbol || n.id)
        .join(', ');

      const confirmed = window.confirm(
        `Deleting "${nodeSymbol}" will affect ${dependentNodes.length} computed node(s): ${dependentList}.\n\nThese computed values may become invalid. Do you want to continue?`
      );

      if (!confirmed) {
        timer.complete({ nodeId, cancelled: true });
        return;
      }
    }

    const dependentIds = new Set(dependentNodes.map(n => n.id));

    set((draft) => {
      if (!draft.document) return;
      draft.document.nodes = draft.document.nodes.filter(n => n.id !== nodeId);
      // Mark dependents as stale
      draft.document.nodes.forEach(n => {
        if (dependentIds.has(n.id)) {
          n.isStale = true;
        }
      });
      draft.isDirty = true;
      if (draft.selectedNodeId === nodeId) {
        draft.selectedNodeId = null;
      }
    });

    logger.document.nodeDeleted(nodeId);
    timer.complete({ nodeId });
  },

  duplicateNode: async (nodeId: NodeId) => {
    const timer = startTimer('duplicateNode', 'store');
    logger.store.action('documentStore', 'duplicateNode', { nodeId });
    const state = get();
    const node = state.document?.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newNode: WorksheetNode = {
      ...JSON.parse(JSON.stringify(node)),
      id: uuidv4(),
      position: {
        x: (node.position?.x || 100) + 40,
        y: (node.position?.y || 100) + 40,
      },
      provenance: { type: 'user', timestamp: new Date().toISOString() } as Provenance,
      verification: { status: 'unverified' } as VerificationStatus,
    };

    let symbolRenames = new Map<string, string>();
    if (newNode.type === 'given') {
      const { newSymbol, renames } = handleDuplicateSymbol(state.document, newNode.symbol);
      symbolRenames = renames;
      newNode.symbol = newSymbol;
    }

    set((draft) => {
      if (!draft.document) return;

      for (const [renameNodeId, newSymbol] of symbolRenames) {
        const existingNode = draft.document.nodes.find(n => n.id === renameNodeId);
        if (existingNode && existingNode.type === 'given') {
          (existingNode as { symbol: string }).symbol = newSymbol;
        }
      }

      draft.document.nodes.push(newNode);
      draft.selectedNodeId = newNode.id;
      draft.isDirty = true;
    });

    logger.document.nodeAdded(newNode.id, node.type);
    timer.complete({ originalId: nodeId, newId: newNode.id, renames: symbolRenames.size });
  },

  selectNode: (nodeId: NodeId | null) => {
    logger.trace('store', `selectNode: ${nodeId}`);
    if (nodeId === null) {
      set((draft) => { draft.selectedNodeId = null; });
      return;
    }

    const state = get();
    if (!state.document) {
      set((draft) => { draft.selectedNodeId = nodeId; });
      return;
    }

    const exists = !!state.document?.nodes.some((n) => n.id === nodeId);
    set((draft) => { draft.selectedNodeId = exists ? nodeId : null; });
  },

  updateNodePosition: (nodeId: NodeId, position: NodePosition) => {
    set((draft) => {
      if (draft.document) {
        const node = draft.document.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.position = position;
          draft.isDirty = true;
        }
      }
    });
  },

  updateDocumentName: (name: string) => {
    set((draft) => {
      if (draft.document) {
        draft.document.name = name;
        draft.isDirty = true;
      }
    });
  },
});
