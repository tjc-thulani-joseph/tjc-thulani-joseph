/**
 * TJC AI Provider Registry
 *
 * This registry describes AI providers from TJC's perspective.
 *
 * IMPORTANT:
 * - No API keys belong here.
 * - No provider SDK belongs here.
 * - No provider-specific request/response logic belongs here.
 * - Provider adapters are implemented behind the secure server-side AI layer.
 *
 * TJC AI talks to providers through the adapter contract.
 */

import type { AICapability } from "./types";

export type AIProviderId =
  | "openai"
  | "gemini"
  | "claude"
  | "openrouter";

export type AIProviderStatus =
  | "unconfigured"
  | "configured"
  | "disabled";

export interface AIProviderDefinition {
  /** Stable internal TJC identifier. */
  id: AIProviderId;

  /** Human-readable provider name. */
  label: string;

  /** Short explanation shown inside TJC AI. */
  description: string;

  /** Server-side adapter responsible for this provider. */
  adapterKey: string;

  /** Capabilities currently exposed through the reconciled adapter. */
  capabilities: AICapability[];

  /** Registry-level configuration state, not live health. */
  status: AIProviderStatus;
}

/**
 * Provider-neutral AI registry.
 *
 * Gemini is configured through the server-side TJC AI adapter layer.
 * The other providers remain future integrations until their adapters
 * and secure runtime configuration are actually implemented.
 */
export const AI_PROVIDERS: AIProviderDefinition[] = [
  {
    id: "openai",
    label: "OpenAI",
    description: "Future AI provider adapter for OpenAI services.",
    adapterKey: "openai",
    capabilities: [
      "text",
      "structured_output",
      "streaming",
      "vision",
      "embeddings",
      "image_generation",
      "audio",
      "speech",
      "transcription",
      "tool_calling",
      "reasoning",
    ],
    status: "unconfigured",
  },

  {
    id: "gemini",
    label: "Google Gemini",
    description:
      "Current server-side provider adapter used by TJC AI for text generation and streaming.",
    adapterKey: "gemini",
    capabilities: [
      "text",
      "streaming",
    ],
    status: "configured",
  },

  {
    id: "claude",
    label: "Anthropic Claude",
    description: "Future AI provider adapter for Anthropic Claude services.",
    adapterKey: "claude",
    capabilities: [
      "text",
      "structured_output",
      "streaming",
      "vision",
      "tool_calling",
      "reasoning",
    ],
    status: "unconfigured",
  },

  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Future provider gateway adapter for routed AI models.",
    adapterKey: "openrouter",
    capabilities: [
      "text",
      "structured_output",
      "streaming",
      "vision",
      "tool_calling",
      "reasoning",
    ],
    status: "unconfigured",
  },
];

/** Find one provider by its stable TJC identifier. */
export function getAIProvider(
  id: AIProviderId,
): AIProviderDefinition | null {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? null;
}

/**
 * Return only providers configured at the registry level.
 *
 * Runtime availability/health remains a server-side concern.
 */
export function getConfiguredAIProviders(): AIProviderDefinition[] {
  return AI_PROVIDERS.filter(
    (provider) => provider.status === "configured",
  );
}
