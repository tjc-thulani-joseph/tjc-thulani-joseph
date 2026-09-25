/**
 * TJC AI Server Provider Registry
 *
 * This registry connects TJC's provider-neutral gateway
 * to concrete provider adapters.
 *
 * Adding another provider should mean adding another adapter
 * and another registry entry — not rewriting the gateway.
 */

import {
  checkOpenAIHealth,
  generateWithOpenAI,
  listOpenAIModels,
} from "./adapters/openai.ts";

export type AIProviderId =
  | "openai";

export interface AIProviderAdapter {
  providerId: AIProviderId;
  label: string;

  generate(request: {
    messages: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string;
    }>;
    model?: string;
    maxOutputTokens?: number;
    temperature?: number;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;

  listModels(): Promise<unknown>;

  health(): Promise<unknown>;
}

export const AI_PROVIDER_ADAPTERS: Record<
  AIProviderId,
  AIProviderAdapter
> = {
  openai: {
    providerId: "openai",
    label: "OpenAI",
    generate: generateWithOpenAI,
    listModels: listOpenAIModels,
    health: checkOpenAIHealth,
  },
};

export function getAIProviderAdapter(
  providerId: AIProviderId,
): AIProviderAdapter | null {
  return AI_PROVIDER_ADAPTERS[providerId] ?? null;
}
