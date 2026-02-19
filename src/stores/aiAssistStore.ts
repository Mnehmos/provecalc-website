/**
 * AI Assist Store - Cross-component AI query dispatch
 *
 * Allows any UI component to trigger an AI query in the AgentTray
 * with contextual pre-filled messages. The AgentTray consumes
 * pending queries and auto-submits them.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type AIAssistContext =
  | {
      type: 'node';
      nodeId: string;
      nodeType: string;
      nodeIndex?: number;
      symbol?: string;
      title?: string;
      latex?: string;
      rhs?: string;
      value?: number;
      unit?: string;
      excerpt?: string;
    }
  | { type: 'equation'; nodeId: string; nodeIndex?: number; latex: string; lhs?: string; rhs?: string }
  | { type: 'verification'; nodeId: string; nodeIndex?: number; status: string; reason?: string }
  | { type: 'unit'; expression: string }
  | { type: 'general' };

interface AIAssistState {
  /** Pending query to be consumed by AgentTray */
  pendingQuery: string | null;
  /** Context for the pending query */
  pendingContext: AIAssistContext | null;

  /** Dispatch an AI assist query from any component */
  askAI: (query: string, context?: AIAssistContext) => void;

  /** Consume the pending query (called by AgentTray) */
  consumeQuery: () => { query: string; context: AIAssistContext | null } | null;
}

export const useAIAssistStore = create<AIAssistState>()(immer((set, get) => ({
  pendingQuery: null,
  pendingContext: null,

  askAI: (query, context) => {
    set((draft) => {
      draft.pendingQuery = query;
      draft.pendingContext = context ?? null;
    });
  },

  consumeQuery: () => {
    const { pendingQuery, pendingContext } = get();
    if (!pendingQuery) return null;
    set((draft) => {
      draft.pendingQuery = null;
      draft.pendingContext = null;
    });
    return { query: pendingQuery, context: pendingContext };
  },
})));
