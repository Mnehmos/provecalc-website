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
  // Anthropic
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', description: 'Anthropic fast + capable', supportsVision: true },
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', description: 'Anthropic flagship, strongest reasoning', supportsVision: true },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', description: 'Anthropic fast + affordable', supportsVision: true },
  // OpenAI
  { id: 'openai/gpt-5.4', name: 'GPT 5.4', description: 'OpenAI flagship', supportsVision: true },
  { id: 'openai/gpt-5.4-mini', name: 'GPT 5.4 Mini', description: 'OpenAI fast + affordable', supportsVision: true },
  { id: 'openai/gpt-5.4-nano', name: 'GPT 5.4 Nano', description: 'OpenAI fastest + cheapest', supportsVision: true },
  { id: 'openai/gpt-5.2-chat', name: 'GPT 5.2 Chat', description: 'OpenAI chat model', supportsVision: true },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: 'OpenAI open-source 20B', supportsVision: false },
  // Google
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Google flagship multimodal', supportsVision: true },
  { id: 'google/gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', description: 'Google fast + affordable', supportsVision: true },
  // Qwen
  { id: 'qwen/qwen3.5-plus-02-15', name: 'Qwen 3.5 Plus', description: 'Alibaba strong reasoning', supportsVision: false },
  // Z-AI
  { id: 'z-ai/glm-5', name: 'GLM-5', description: 'Z-AI flagship', supportsVision: true },
  { id: 'z-ai/glm-5-turbo', name: 'GLM-5 Turbo', description: 'Z-AI fast', supportsVision: true },
  // NVIDIA
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 120B (Free)', description: 'NVIDIA 120B free tier', supportsVision: false },
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
