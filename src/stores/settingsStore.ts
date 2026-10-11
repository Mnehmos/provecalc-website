/**
 * Settings Store - Zustand store for application settings (WEB VERSION)
 *
 * Manages API keys, model selection, and other configuration.
 * Uses localStorage via zustand persist (no Tauri backend).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AVAILABLE_MODELS, DEFAULT_MODEL, VALID_MODEL_IDS } from '@/lib/models';

// Models offered in the assistant (kept in a plain module so the chat route can share it).
export { AVAILABLE_MODELS };

export interface Settings {
  openRouterApiKey: string;
  selectedModel: string;
}

interface SettingsState {
  // State
  openRouterApiKey: string;
  selectedModel: string;
  isLoading: boolean;
  error: string | null;
  isSettingsOpen: boolean;

  // Computed
  isConfigured: boolean;

  // Actions
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
  testConnection: () => Promise<boolean>;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      openRouterApiKey: '',
      selectedModel: DEFAULT_MODEL,
      isLoading: false,
      error: null,
      isSettingsOpen: false,
      isConfigured: false,

      setApiKey: (key: string) => {
        const trimmed = key.trim();
        set({ openRouterApiKey: trimmed, isConfigured: trimmed.length > 0 });
      },

      setModel: (model: string) => {
        set({ selectedModel: model });
      },

      loadSettings: async () => {
        // Web version: settings are loaded from localStorage via persist middleware
        const state = get();
        set({
          isConfigured: state.openRouterApiKey.length > 0,
          selectedModel: VALID_MODEL_IDS.has(state.selectedModel) ? state.selectedModel : DEFAULT_MODEL,
        });
      },

      saveSettings: async () => {
        // Web version: persist middleware auto-saves to localStorage
        const state = get();
        set({ isConfigured: state.openRouterApiKey.length > 0 });
        return true;
      },

      testConnection: async () => {
        const state = get();
        if (!state.openRouterApiKey) {
          set({ error: 'API key is required' });
          return false;
        }

        set({ isLoading: true, error: null });
        try {
          // Validate through server-side proxy to avoid browser CORS issues
          const response = await fetch('/api/test-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: state.openRouterApiKey }),
          });
          const data = await response.json();
          if (data.valid) {
            set({ isLoading: false, error: null });
            return true;
          }
          set({ isLoading: false, error: data.error || 'Invalid API key' });
          return false;
        } catch (e) {
          set({ error: String(e), isLoading: false });
          return false;
        }
      },

      openSettings: () => {
        set({ isSettingsOpen: true });
      },

      closeSettings: () => {
        set({ isSettingsOpen: false, error: null });
      },
    }),
    {
      name: 'worksheet-settings',
      partialize: (state) => ({
        openRouterApiKey: state.openRouterApiKey,
        selectedModel: state.selectedModel,
        isConfigured: state.isConfigured,
      }),
    },
  ),
);
