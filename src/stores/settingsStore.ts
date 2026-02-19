/**
 * Settings Store - Zustand store for application settings (WEB VERSION)
 *
 * Manages API keys, model selection, and other configuration.
 * Uses localStorage via zustand persist (no Tauri backend).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Available models from OpenRouter
export const AVAILABLE_MODELS = [
  // Frontier reasoning models
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', description: 'Anthropic flagship, strongest reasoning', supportsVision: true },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', description: 'Anthropic fast + capable', supportsVision: true },
  { id: 'openai/gpt-5.2', name: 'GPT 5.2', description: 'OpenAI flagship model', supportsVision: true },
  { id: 'openai/o3-pro', name: 'o3 Pro', description: 'OpenAI deep reasoning', supportsVision: true },
  { id: 'openai/o4-mini', name: 'o4 Mini', description: 'OpenAI fast reasoning', supportsVision: true },
  { id: 'google/gemini-3-pro-image-preview', name: 'Gemini 3 Pro', description: 'Google frontier, image generation + vision', supportsVision: true },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Google fast multimodal', supportsVision: true },
  // Mid-tier models
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', description: 'Anthropic fast + affordable', supportsVision: true },
  { id: 'openai/gpt-4.1-mini', name: 'GPT 4.1 Mini', description: 'OpenAI fast + affordable', supportsVision: true },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Google fast multimodal', supportsVision: true },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Excellent reasoning, cost-effective', supportsVision: false },
] as const;

const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;
const VALID_MODEL_IDS: Set<string> = new Set(AVAILABLE_MODELS.map(m => m.id));

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
        set({ openRouterApiKey: key, isConfigured: key.length > 0 });
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
          const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${state.openRouterApiKey}` },
          });
          const ok = response.ok;
          set({ isLoading: false, error: ok ? null : 'Invalid API key' });
          return ok;
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
