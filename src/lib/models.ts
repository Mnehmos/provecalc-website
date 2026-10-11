/**
 * Models offered in the web demo's AI assistant, by OpenRouter id.
 *
 * Checked against https://openrouter.ai/api/v1/models on 2026-10-11: every id below is listed
 * there. `supportsTemperature` follows that listing's `supported_parameters`; the chat route
 * leaves `temperature` out for models that do not take it. The desktop app keeps its own audited
 * catalog (contracts/openrouter-models.json); the default here matches it.
 */
export const AVAILABLE_MODELS = [
  // Anthropic
  { id: 'anthropic/claude-sonnet-5.5', name: 'Claude Sonnet 5.5', description: 'Anthropic fast + capable (recommended)', supportsVision: true, supportsTemperature: false },
  { id: 'anthropic/claude-opus-5.5', name: 'Claude Opus 5.5', description: 'Anthropic, highest capability', supportsVision: true, supportsTemperature: false },
  { id: 'anthropic/claude-fable-5.1', name: 'Claude Fable 5.1', description: 'Anthropic, long and careful work', supportsVision: true, supportsTemperature: false },
  { id: 'anthropic/claude-haiku-5.5', name: 'Claude Haiku 5.5', description: 'Anthropic fast + affordable', supportsVision: true, supportsTemperature: false },
  // OpenAI
  { id: 'openai/gpt-6.1-sol', name: 'GPT-6.1 Sol', description: 'OpenAI flagship', supportsVision: true, supportsTemperature: false },
  { id: 'openai/gpt-6-luna', name: 'GPT-6 Luna', description: 'OpenAI fast + affordable', supportsVision: true, supportsTemperature: false },
  // Google
  { id: 'google/gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Google fast multimodal', supportsVision: true, supportsTemperature: true },
  { id: 'google/gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Google fast + affordable', supportsVision: true, supportsTemperature: true },
  // DeepSeek
  { id: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', description: 'DeepSeek fast + affordable', supportsVision: true, supportsTemperature: true },
  // Qwen
  { id: 'qwen/qwen3.8-flash', name: 'Qwen 3.8 Flash', description: 'Alibaba fast + affordable', supportsVision: true, supportsTemperature: true },
  { id: 'qwen/qwen3.8-max-prime', name: 'Qwen 3.8 Max Prime', description: 'Alibaba strongest reasoning', supportsVision: true, supportsTemperature: true },
  // Z.ai
  { id: 'z-ai/glm-5.3', name: 'GLM 5.3', description: 'Z.ai general model', supportsVision: false, supportsTemperature: true },
  { id: 'z-ai/glm-5.3-flash', name: 'GLM 5.3 Flash', description: 'Z.ai fast', supportsVision: true, supportsTemperature: true },
  // NVIDIA (free tier; availability and rate limits vary)
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning (Free)', description: 'NVIDIA free tier', supportsVision: false, supportsTemperature: true },
] as const;

export const DEFAULT_MODEL: string = AVAILABLE_MODELS[0].id;

export const VALID_MODEL_IDS: ReadonlySet<string> = new Set(AVAILABLE_MODELS.map((m) => m.id));

/** True when the model takes a `temperature` setting. Unknown ids are treated as supporting it. */
export function modelSupportsTemperature(id: string): boolean {
  const known = AVAILABLE_MODELS.find((m) => m.id === id);
  return known ? known.supportsTemperature : true;
}
