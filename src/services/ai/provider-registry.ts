/**
 * TJC AI Provider Registry
 *
 * This registry describes AI providers from TJC's perspective.
 *
 * IMPORTANT:
 * - No API keys belong here.
 * - No provider SDK belongs here.
 * - No provider-specific request/response logic belongs here.
 * - Provider adapters will be added separately.
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
  /**
   * Stable internal TJC identifier.
   *
   * This should not change simply because a provider changes
   * its branding or API implementation.
   */
  id: AIProviderId;

  /**
   * Human-readable provider name.
   */
  label: string;

  /**
   * Short explanation shown inside TJC AI.
   */
  description: string;

  /**
   * Name of the adapter responsible for translating
   * the TJC AI contract to this provider.
   *
   * The adapter does not exist yet.
   * That is intentionally handled in 7A.3.
   */
  adapterKey: string;

  /**
   * Provider capabilities known to TJC.
   *
   * This is intentionally descriptive rather than a promise
   * that every model from the provider supports every capability.
   */
  capabilities: AICapability[];

  /**
   * Registry-level status.
   *
   * Actual credentials and runtime availability will be
   * handled by the secure server-side AI layer later.
   */
  status: AIProviderStatus;
}

/**
 * Provider-neutral AI registry.
 *
 * These entries describe the providers TJC is prepared to support.
 * They do not activate any provider.
 */
export const AI_PROVIDERS: AIProviderDefinition[] = [
  {
    id: "openai",
    label: "OpenAI",
    description: "AI provider adapter for OpenAI services.",
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
    description: "AI provider adapter for Google Gemini services.",
    adapterKey: "gemini",
    capabilities: [
      "text",
      "structured_output",
      "streaming",
      "vision",
      "embeddings",
      "image_generation",
      "audio",
      "transcription",
      "tool_calling",
      "reasoning",
    ],
    status: "unconfigured",
  },

  {
    id: "claude",
    label: "Anthropic Claude",
    description: "AI provider adapter for Anthropic Claude services.",
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
    description: "Provider gateway adapter for routed AI models.",
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

/**
 * Find one provider by its stable TJC identifier.
 */
export function getAIProvider(
  id: AIProviderId,
): AIProviderDefinition | null {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? null;
}

/**
 * Return only providers that are currently enabled at the
 * registry level.
 *
 * At this stage none are enabled.
 * Later the secure AI configuration layer will determine
 * runtime availability.
 */
export function getConfiguredAIProviders(): AIProviderDefinition[] {
  return AI_PROVIDERS.filter(
    (provider) => provider.status === "configured",
  );
    }
